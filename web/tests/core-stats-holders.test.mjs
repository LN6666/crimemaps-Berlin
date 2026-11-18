import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBudgetModule,budgetSource} from './support/core-stats-budget.mjs';
import ts from 'typescript';

// ResourceBudget.holders(limit): a read-only diagnostic of who holds the page
// ledger right now. Rows group the live charge by the charging reservation's
// label and the allocation's category, use the ledger's own identity
// deduplication (one allocation counted once, in the row of the reservation
// whose cost the ledger counts), come largest first in a fixed order, and are
// bounded (16 by default, 64 at most). Calling it changes nothing.
const {createResourceBudget,RESOURCE_BUDGET_HOLDERS_DEFAULT,RESOURCE_BUDGET_HOLDERS_MAX}=loadBudgetModule();
const cost=(category,bytes,identity,precision='exact',label)=>({category,bytes,precision,...(identity!==undefined?{identity}:{}),...(label!==undefined?{label}:{})});
const sum=(rows,field)=>rows.reduce((total,row)=>total+row[field],0);
const row=(rows,label,category)=>rows.find(value=>value.label===label&&value.category===category);
const allRows=budget=>budget.holders(RESOURCE_BUDGET_HOLDERS_MAX);
/** Every number of a stats snapshot, plus the identity of its lastPressure. */
const snapshot=budget=>{const stats=budget.stats;return{json:JSON.stringify(stats),lastPressure:stats.lastPressure};};

test('rows group the live charge by reservation label and category, largest first, and sum to the ledger stats',()=>{
 const budget=createResourceBudget({limitBytes:1024*1024,recentLimitBytes:256*1024}),held=[];
 try{
  held.push(budget.reserve([cost('decoded',1000,{}),cost('gpu-buffer',500,{})],{label:'chunk A'}));
  held.push(budget.reserve(cost('decoded',300,{},'estimate'),{label:'chunk A'}));
  held.push(budget.reserve(cost('program',4000,{},'estimate'),{label:'program X'}));
  held.push(budget.reserve(cost('metadata',200,{},'exact','cost label')));
  held.push(budget.reserve(cost('construction',50,{},'estimate')));
  held.push(budget.reserve([cost('texture',64,{}),cost('texture',32,{})],{label:'two textures'}));
  held.push(budget.reserve(cost('decoded',700,{}),{label:'recent R',recent:true}));
  const retiring=budget.reserve(cost('gpu-buffer',900,{}),{label:'retiring Z'});held.push(retiring);retiring.markRetiring();
  const rows=budget.holders();
  assert.deepEqual(rows.map(value=>[value.label,value.category,value.bytes]),[
   ['program X','program',4000],['chunk A','decoded',1300],['retiring Z','gpu-buffer',900],['recent R','decoded',700],
   ['chunk A','gpu-buffer',500],['cost label','metadata',200],['two textures','texture',96],[undefined,'construction',50]],'largest first');
  assert.deepEqual([row(rows,'two textures','texture').count,row(rows,'two textures','texture').allocations],[1,2],'count is reservations, allocations are allocations');
  assert.deepEqual({...row(rows,'chunk A','decoded')},{label:'chunk A',labelSource:'reservation',category:'decoded',bytes:1300,exactBytes:1000,estimatedBytes:300,recentBytes:0,retiringBytes:0,count:2,allocations:2,precision:'mixed'});
  assert.deepEqual({...row(rows,'program X','program')},{label:'program X',labelSource:'reservation',category:'program',bytes:4000,exactBytes:0,estimatedBytes:4000,recentBytes:0,retiringBytes:0,count:1,allocations:1,precision:'estimate'});
  assert.equal(row(rows,'recent R','decoded').recentBytes,700);assert.equal(row(rows,'retiring Z','gpu-buffer').retiringBytes,900);
  assert.equal(row(rows,'cost label','metadata').labelSource,'cost','an unlabelled reservation is listed under its cost label');
  assert.equal(row(rows,undefined,'construction').labelSource,'none');assert.equal(row(rows,undefined,'construction').precision,'estimate');
  const stats=budget.stats;
  for(const field of ['bytes','exactBytes','estimatedBytes','recentBytes','retiringBytes'])assert.equal(sum(rows,field),stats[field],field+' over all rows is the ledger total');
  assert.equal(sum(rows,'allocations'),stats.allocations);
  for(const [category,value]of Object.entries(stats.categories)){
   const inCategory=rows.filter(item=>item.category===category);
   assert.equal(sum(inCategory,'bytes'),value.bytes,category);assert.equal(sum(inCategory,'exactBytes'),value.exactBytes,category);assert.equal(sum(inCategory,'estimatedBytes'),value.estimatedBytes,category);
  }
 }finally{for(const reservation of held)reservation.release();}
 assert.deepEqual(budget.holders(),[],'a released ledger has no holder');
});

test('a shared allocation is counted once, in the row of the reservation whose cost the ledger counts',()=>{
 const budget=createResourceBudget({limitBytes:1024*1024,recentLimitBytes:1024}),buffer=new ArrayBuffer(128),identity={};
 const view=budget.reserve(cost('decoded',buffer.byteLength,buffer),{label:'view'});
 const owner=budget.reserve([cost('decoded',buffer.byteLength,buffer),cost('metadata',16,{})],{label:'owner'});
 try{
  let rows=allRows(budget);
  assert.equal(row(rows,'view','decoded').bytes,128,'an equal cost keeps the first charging reservation');
  assert.equal(row(rows,'owner','decoded'),undefined,'the second view of one buffer adds no row bytes');
  assert.equal(row(rows,'owner','metadata').count,1,'owner still charges its own metadata');
  assert.equal(sum(rows,'bytes'),budget.stats.bytes);
  const estimate=budget.reserve(cost('packed',320,identity,'estimate'),{label:'estimate'}),exact=budget.reserve(cost('decoded',320,identity),{label:'exact'});
  rows=allRows(budget);
  assert.equal(row(rows,'estimate','packed'),undefined,'an exact observation of equal size is the counted cost');
  assert.deepEqual([row(rows,'exact','decoded').bytes,row(rows,'exact','decoded').precision],[320,'exact']);
  const larger=budget.reserve(cost('gpu-buffer',480,identity,'estimate'),{label:'larger'});
  rows=allRows(budget);assert.equal(row(rows,'exact','decoded'),undefined);assert.equal(row(rows,'larger','gpu-buffer').bytes,480,'the larger cost moves the allocation to its reservation');
  assert.equal(sum(rows,'bytes'),budget.stats.bytes);
  larger.release();rows=allRows(budget);assert.equal(row(rows,'exact','decoded').bytes,320,'release hands the allocation back');
  // A recent claim on a shared allocation marks it recent, whichever reservation is charged.
  const recent=budget.reserve(cost('decoded',buffer.byteLength,buffer),{label:'recent copy',recent:true});
  rows=allRows(budget);assert.equal(row(rows,'view','decoded').recentBytes,128);assert.equal(row(rows,'recent copy','decoded'),undefined);
  assert.equal(sum(rows,'recentBytes'),budget.stats.recentBytes);assert.equal(sum(rows,'bytes'),budget.stats.bytes);
  // A retiring claim on a shared allocation marks it retiring the same way.
  const retiring=budget.reserve(cost('decoded',buffer.byteLength,buffer),{label:'retiring copy'});retiring.markRetiring();
  rows=allRows(budget);assert.equal(row(rows,'view','decoded').retiringBytes,128);assert.equal(sum(rows,'retiringBytes'),budget.stats.retiringBytes);assert.equal(budget.stats.retiringBytes,128);
  retiring.release();
  view.release();rows=allRows(budget);assert.equal(row(rows,'owner','decoded').bytes,128,'the next live reservation is charged once the first leaves');
  recent.release();estimate.release();exact.release();
 }finally{view.release();owner.release();}
 assert.equal(budget.stats.bytes,0);assert.deepEqual(budget.holders(),[]);
});

test('limit bounds the rows: 16 by default, 64 at most, 0 returns none, and equal bytes come in a fixed order',()=>{
 assert.equal(RESOURCE_BUDGET_HOLDERS_DEFAULT,16);assert.equal(RESOURCE_BUDGET_HOLDERS_MAX,64);
 const build=order=>{const budget=createResourceBudget({limitBytes:64*1024*1024}),held=[];for(const i of order)held.push(budget.reserve(cost(i%3?'decoded':'texture',1000+(i%25)*10,{}),{label:'holder '+String(i).padStart(3,'0')}));return{budget,held};};
 const ascending=[...Array(100).keys()],{budget,held}=build(ascending),other=build([...ascending].reverse());
 try{
  const all=allRows(budget);
  assert.equal(budget.holders().length,16);assert.equal(budget.holders(5).length,5);assert.equal(all.length,64);
  assert.equal(budget.holders(1000).length,64,'a larger limit is capped');assert.equal(budget.holders(Infinity).length,64);
  assert.deepEqual(budget.holders(0),[]);assert.equal(budget.holders(2.9).length,2);
  for(const bad of [-1,Number.NaN,'3',null,{}])assert.throws(()=>budget.holders(bad),RangeError,String(bad));
  for(let i=1;i<all.length;i++){const a=all[i-1],b=all[i];assert(a.bytes>b.bytes||a.bytes===b.bytes&&`${a.labelSource}:${a.category}:${a.label}`<`${b.labelSource}:${b.category}:${b.label}`,'fixed order at '+i);}
  assert.deepEqual(budget.holders(5),all.slice(0,5),'a smaller limit is a prefix');
  assert.deepEqual(all,allRows(other.budget),'the order does not depend on reservation order');
  assert.deepEqual(all.map(value=>value.bytes),held.map(reservation=>reservation.bytes).sort((a,b)=>b-a).slice(0,64),'the 64 rows are the 64 largest');
 }finally{for(const reservation of [...held,...other.held])reservation.release();}
});

test('holders is read-only: it reserves, releases, evicts, counts and notifies nothing',()=>{
 const make=()=>{const budget=createResourceBudget({limitBytes:4096,recentLimitBytes:1024});const calls={evict:0,available:0};budget.onPressure(()=>{calls.evict++;});budget.onAvailable(()=>{calls.available++;});return{budget,calls};};
 const watched=make(),plain=make();
 // The same sequence on two ledgers; one is asked for holders after every step.
 const steps=[
  ({budget,held})=>{held.a=budget.reserve([cost('decoded',1000,{}),cost('metadata',24,{})],{label:'a'});},
  ({budget,held})=>{held.b=budget.reserve(cost('decoded',500,{},'estimate'),{label:'b'});},
  ({budget,held})=>{held.refused=budget.tryReserve(cost('construction',4000,{}),{label:'refused'}).ok;},
  ({held})=>{held.a.adjust([cost('decoded',800,{}),cost('metadata',24,{})]);},
  ({held})=>{held.b.setRecent(true);},
  ({held})=>{held.a.markRetiring();},
  ({held})=>{held.b.release();},
  ({budget})=>{budget.notifyReclaimable();},
  ({held})=>{held.a.release();},
 ];
 const watchedHeld={},plainHeld={};
 for(const [index,step]of steps.entries()){
  step({budget:watched.budget,held:watchedHeld});step({budget:plain.budget,held:plainHeld});
  const before=snapshot(watched.budget),evictBefore=watched.calls.evict,availableBefore=watched.calls.available;
  const first=watched.budget.holders(),second=watched.budget.holders(64);
  const after=snapshot(watched.budget);
  assert.equal(after.json,before.json,'step '+index+': no statistic changes');assert.equal(after.lastPressure,before.lastPressure,'step '+index+': lastPressure is the same object');
  assert.equal(watched.calls.evict,evictBefore,'no eviction');assert.equal(watched.calls.available,availableBefore,'no wake-up');
  assert.deepEqual(first,second.slice(0,first.length));
  assert.equal(snapshot(watched.budget).json,snapshot(plain.budget).json,'step '+index+': same ledger as without holders');
  assert.deepEqual(watched.calls,plain.calls,'step '+index+': same callbacks as without holders');
  assert(Object.isFrozen(first)&&first.every(Object.isFrozen),'rows are frozen');
 }
 assert.equal(watchedHeld.refused,false,'the refused admission was refused on both ledgers');assert(watched.budget.stats.lastPressure,'pressure was recorded');
 const rows=(()=>{const value=watched.budget.reserve(cost('decoded',10,{}),{label:'frozen'}),list=watched.budget.holders();value.release();return list;})();
 assert.throws(()=>{rows.push({});},TypeError);assert.throws(()=>{rows[0].bytes=0;},TypeError);
});

test('released, inactive and cost-free reservations leave no row; an adjustment moves the row',()=>{
 const budget=createResourceBudget({limitBytes:1024*1024}),empty=budget.reserve([],{label:'empty'}),value=budget.reserve(cost('decoded',100,{}),{label:'moving'});
 try{
  assert.deepEqual(budget.holders().map(item=>item.label),['moving'],'a reservation without costs has no row');
  assert(value.adjust([cost('texture',300,{})]));assert.deepEqual(budget.holders().map(item=>[item.label,item.category,item.bytes]),[['moving','texture',300]]);
  value.release();assert.deepEqual(budget.holders(),[]);assert.equal(value.adjust(cost('decoded',5,{})),false,'an inactive reservation stays out');assert.deepEqual(budget.holders(),[]);
  const zero=budget.reserve(cost('program',0,{},'estimate'),{label:'zero'});assert.deepEqual(budget.holders().map(item=>[item.label,item.bytes,item.count,item.allocations]),[['zero',0,1,1]],'a charged zero-byte allocation is still a holder');zero.release();
 }finally{empty.release();value.release();}
});

test('labels stay bounded, and an unlabelled cost label never merges into a reservation label of the same text',()=>{
 const budget=createResourceBudget({limitBytes:1024*1024}),long='x'.repeat(1000);
 const a=budget.reserve(cost('decoded',10,{}),{label:long}),b=budget.reserve(cost('decoded',20,{},'exact','same text')),c=budget.reserve(cost('decoded',30,{}),{label:'same text'});
 try{
  const rows=budget.holders();
  assert.equal(rows.find(item=>item.bytes===10).label.length,256,'the ledger cuts labels to 256 characters');
  assert.deepEqual(rows.filter(item=>item.label==='same text').map(item=>[item.labelSource,item.bytes]),[['reservation',30],['cost',20]]);
 }finally{a.release();b.release();c.release();}
});

test('holder reads project the charged rows without mutating admission or reservation state',()=>{
 const file=ts.createSourceFile('resource-budget.ts',budgetSource(),ts.ScriptTarget.Latest,true);
 const named=new Map();
 const visit=node=>{
  if((ts.isFunctionDeclaration(node)||ts.isMethodDeclaration(node)||ts.isPropertyAssignment(node)||ts.isVariableDeclaration(node))&&node.name&&ts.isIdentifier(node.name))named.set(node.name.text,[...(named.get(node.name.text)??[]),node.getText(file)]);
  ts.forEachChild(node,visit);
 };
 visit(file);
 const holders=named.get('holders');assert.equal(holders?.length,1,'one holders implementation');
 assert(!/states\.(add|delete|clear)|lastPressure\s*=|pressureEvents\s*\+\+|availability\w*\s*\+\+|\.release\(|\.reserve\(|evict|dispatchAvailable|notifyAvailable/.test(holders[0]),'holders only reads');
 assert(!/\b(states|allocations)\b|\.costs\b|\.claims\b/.test(holders[0].replace(/allocations:row\.exact\+row\.estimated/g,'')),'holder reads do not rebuild or scan allocation claims');
});
