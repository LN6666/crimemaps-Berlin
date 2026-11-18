import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setImmediate as nextTask} from 'node:timers/promises';
import ts from 'typescript';

const source=await readFile(new URL('../src/safety/render-runtime/resource-budget.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function runtime(MapType=Map,SetType=Set){
 const module={exports:{}};
 Function('module','exports','require','Map','Set',compiled)(module,module.exports,id=>assert.fail('Unexpected budget dependency '+id),MapType,SetType);
 return module.exports;
}
const {createResourceBudget}=runtime();
const cost=(bytes,identity,category='decoded',precision='exact',label)=>({bytes,identity,category,precision,label});
const numericFields=['bytes','exactBytes','estimatedBytes','recentBytes','retiringBytes','allocations','reservations'];
const totals=budget=>{const stats=budget.stats;return Object.fromEntries([...numericFields.map(key=>[key,stats[key]]),['categories',stats.categories]]);};

// Independent full reduction used only as an oracle. It sorts all live claims
// by size, precision and reservation order, without an incremental index.
function oracle(states){
 const groups=new Map(),rows=new Map(),result={bytes:0,exactBytes:0,estimatedBytes:0,recentBytes:0,retiringBytes:0,allocations:0,reservations:states.filter(state=>state.active).length,categories:{}};
 for(const [order,state]of states.entries())if(state.active)for(const value of state.costs){
  const list=groups.get(value.identity)??[];list.push({state,value,order});groups.set(value.identity,list);
 }
 for(const claims of groups.values()){
  claims.sort((a,b)=>b.value.bytes-a.value.bytes||Number(b.value.precision==='exact')-Number(a.value.precision==='exact')||a.order-b.order);
  const {state,value}=claims[0],recent=claims.some(claim=>claim.state.recent),retiring=claims.some(claim=>claim.state.retiring),exact=value.precision==='exact';
  result.allocations++;result.bytes+=value.bytes;result[exact?'exactBytes':'estimatedBytes']+=value.bytes;if(recent)result.recentBytes+=value.bytes;if(retiring)result.retiringBytes+=value.bytes;
  const category=result.categories[value.category]??={bytes:0,exactBytes:0,estimatedBytes:0};category.bytes+=value.bytes;category[exact?'exactBytes':'estimatedBytes']+=value.bytes;
  const labelSource=state.label!==undefined?'reservation':value.label!==undefined?'cost':'none',label=state.label??value.label,key=labelSource+':'+value.category+':'+(label??'');
  const row=rows.get(key)??{key,label,labelSource,category:value.category,bytes:0,exactBytes:0,estimatedBytes:0,recentBytes:0,retiringBytes:0,allocations:0,owners:new Set(),precisions:new Set()};
  row.bytes+=value.bytes;row[exact?'exactBytes':'estimatedBytes']+=value.bytes;if(recent)row.recentBytes+=value.bytes;if(retiring)row.retiringBytes+=value.bytes;row.allocations++;row.owners.add(state);row.precisions.add(value.precision);rows.set(key,row);
 }
 const holders=[...rows.values()].sort((a,b)=>b.bytes-a.bytes||(a.key<b.key?-1:a.key>b.key?1:0)).slice(0,64).map(({key,owners,precisions,...row})=>({...row,count:owners.size,precision:precisions.size===2?'mixed':[...precisions][0]}));
 return{totals:result,holders};
}
const modelCosts=costs=>costs.map(value=>({...value,bytes:Math.ceil(value.bytes),identity:value.identity??Symbol(),label:value.label?.slice(0,256)}));
function verify(budget,states,label){const expected=oracle(states);assert.deepEqual(totals(budget),expected.totals,label);assert.deepEqual(budget.holders(64),expected.holders,label+' holders');}

test('incremental claims agree with a full reduction across shared, anonymous, zero, recent, retiring and rejected transitions',()=>{
 const budget=createResourceBudget({limitBytes:240,recentLimitBytes:90}),identities=[{},'shared string',{},{}],states=[];
 let seed=9173;
 const random=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;};
 const input=()=>Array.from({length:1+random(3)},()=>cost(random(70),random(6)<4?identities[random(4)]:undefined,['decoded','metadata','packed'][random(3)],random(2)?'exact':'estimate',random(2)?'cost-label':undefined));
 const fits=states=>{const value=oracle(states).totals;return value.bytes<=240&&value.recentBytes<=90;};
 for(let step=0;step<120;step++){
  const kind=random(5),index=states.length?random(states.length):-1,state=states[index];
  if(kind===0||!state){
   const costs=input(),proposed={active:true,costs:modelCosts(costs),recent:!!random(2),retiring:false,label:'owner '+random(5)},expected=fits([...states,proposed]),value=budget.tryReserve(costs,{label:proposed.label,recent:proposed.recent,evict:false});
   assert.equal(value.ok,expected,'reserve '+step);if(value.ok)states.push({...proposed,api:value.reservation});
  }else if(kind===1){
   const costs=input(),next=modelCosts(costs),proposed=states.map((value,i)=>i===index?{...value,costs:next}:value),expected=state.active&&fits(proposed);
   assert.equal(state.api.adjust(costs,{evict:false}),expected,'adjust '+step);if(expected)state.costs=next;
  }else if(kind===2){
   const recent=!!random(2),proposed=states.map((value,i)=>i===index?{...value,recent}:value),expected=state.active&&!(recent&&state.retiring)&&fits(proposed);
   assert.equal(state.api.setRecent(recent,{evict:false}),expected,'recent '+step);if(expected)state.recent=recent;
  }else if(kind===3){
   const retiring=!!random(2);state.api.setRetiring(retiring);if(state.active){state.retiring=retiring;if(retiring)state.recent=false;}
  }else{state.api.release();state.active=false;state.costs=[];state.recent=state.retiring=false;}
  verify(budget,states,'transition '+step);
 }
 for(const state of states){state.api.release();state.active=false;state.costs=[];}verify(budget,states,'all released');
});

test('equal winners keep original reservation order through adjustment and absent-then-readded claims',()=>{
 const budget=createResourceBudget({limitBytes:200,recentLimitBytes:100}),shared={},a=budget.reserve(cost(40,shared,'decoded'),{label:'first'}),b=budget.reserve(cost(40,shared,'packed'),{label:'second',recent:true}),c=budget.reserve(cost(10,shared,'metadata'),{label:'retiring'});c.markRetiring();
 const check=label=>{const rows=budget.holders();assert.equal(rows.length,1);assert.equal(rows[0].label,label);assert.equal(rows[0].bytes,40);assert.equal(rows[0].recentBytes,40);assert.equal(rows[0].retiringBytes,40);};
 check('first');assert(a.adjust(cost(20,shared)));check('second');assert(a.adjust(cost(40,shared)));check('first');assert(a.adjust([]));check('second');assert(a.adjust(cost(40,shared)));check('first');
 a.release();check('second');b.release();assert.equal(budget.stats.bytes,10);assert.equal(budget.stats.recentBytes,0);assert.equal(budget.stats.retiringBytes,10);c.release();assert.deepEqual(budget.holders(),[]);
});

test('pressure reentrancy recomputes adjusted identities and role flags before committing the outer proposal',()=>{
 const budget=createResourceBudget({limitBytes:100,recentLimitBytes:80}),first={},replacement={},a=budget.reserve(cost(40,first),{label:'adjusted'}),b=budget.reserve(cost(40,{})),events=[];let nested;
 const off=budget.onPressure(pressure=>{events.push(pressure.required);b.release();assert(a.adjust(cost(10,replacement)));assert(a.setRecent(true));nested=budget.reserve(cost(20,{},'metadata'),{label:'nested'});});
 assert(a.adjust(cost(70,first)));assert.deepEqual(events,[110]);assert.equal(a.bytes,70);assert.equal(budget.stats.bytes,90);assert.equal(budget.stats.recentBytes,70);assert.equal(budget.stats.allocations,2);assert.equal(budget.holders().find(row=>row.label==='adjusted').recentBytes,70);
 off();a.release();nested.release();assert.equal(budget.stats.bytes,0);
});

test('a callback-created equal claim precedes the outer reserve, and a released adjustment cannot resurrect',()=>{
 const budget=createResourceBudget({limitBytes:100}),shared={},filler=budget.reserve(cost(90,{}));let nested;
 const off=budget.onPressure(()=>{filler.release();nested=budget.reserve(cost(30,shared),{label:'admitted inside pressure'});});
 const outer=budget.reserve(cost(30,shared),{label:'outer'});assert.equal(budget.holders()[0].label,'admitted inside pressure');assert.equal(budget.stats.reservations,2);off();outer.release();nested.release();
 const a=budget.reserve(cost(70,{})),b=budget.reserve(cost(20,{}));const stop=budget.onPressure(()=>a.release());
 assert.equal(a.adjust(cost(90,{})),false);assert.equal(a.active,false);assert.equal(budget.stats.bytes,20);assert.equal(budget.stats.allocations,1);stop();b.release();
});

test('a failed reentrant adjustment keeps callback changes but never publishes its own rejected claims',()=>{
 const budget=createResourceBudget({limitBytes:100}),shared={},rejected={},a=budget.reserve(cost(40,shared),{label:'a'}),b=budget.reserve(cost(50,{}),{label:'b'});let nested;
 const off=budget.onPressure(()=>{assert(b.adjust(cost(70,shared)));nested=budget.reserve(cost(30,{}),{label:'nested'});});
 assert.equal(a.adjust(cost(80,rejected)),false);assert.equal(a.bytes,40);assert.equal(budget.stats.bytes,100);assert.equal(budget.stats.allocations,2);assert.deepEqual(budget.holders().map(row=>[row.label,row.bytes]),[['b',70],['nested',30]]);assert.equal(budget.stats.lastPressure.required,180);
 off();a.release();b.release();nested.release();assert.equal(budget.stats.allocations,0);
});

test('pressure that retires a state prevents an otherwise fitting recent proposal from changing its role',()=>{
 const budget=createResourceBudget({limitBytes:100,recentLimitBytes:30}),identity={},held=budget.reserve(cost(40,identity));
 const off=budget.onPressure(()=>{held.markRetiring();assert(held.adjust(cost(20,identity)));});
 assert.equal(held.setRecent(true),false);assert.equal(held.recent,false);assert.equal(budget.stats.bytes,20);assert.equal(budget.stats.recentBytes,0);assert.equal(budget.stats.retiringBytes,20);
 off();held.release();assert.equal(budget.stats.bytes,0);
});

test('safe integer swaps remove old charges first and failed overflow leaves the ledger intact',()=>{
 const max=Number.MAX_SAFE_INTEGER,budget=createResourceBudget({limitBytes:max,recentLimitBytes:max}),a={},b={},held=budget.reserve([cost(max-10,a,'metadata'),cost(10,b)]);
 assert(held.adjust([cost(10,a),cost(max-10,b,'metadata')]));assert.equal(budget.stats.bytes,max);const before=totals(budget),holders=budget.holders();
 assert.throws(()=>budget.reserve(cost(1,{})),RangeError);assert.deepEqual(totals(budget),before);assert.deepEqual(budget.holders(),holders);held.release();assert.equal(budget.stats.bytes,0);
});

test('unchanged stats and holders do not iterate claims; one-identity proposals do not traverse unrelated allocations',()=>{
 const meter={visited:0,maps:0};
 const observed=iterator=>({next(){const row=iterator.next();if(!row.done)meter.visited++;return row;},[Symbol.iterator](){return this;}});
 class CountedMap extends Map{constructor(...args){super(...args);meter.maps++;}[Symbol.iterator](){return observed(super[Symbol.iterator]());}values(){return observed(super.values());}keys(){return observed(super.keys());}entries(){return observed(super.entries());}}
 class CountedSet extends Set{[Symbol.iterator](){return observed(super[Symbol.iterator]());}values(){return observed(super.values());}keys(){return observed(super.keys());}entries(){return observed(super.entries());}}
 const {createResourceBudget}=runtime(CountedMap,CountedSet),budget=createResourceBudget({limitBytes:1024,recentLimitBytes:512}),held=[];
 for(let i=0;i<512;i++)held.push(budget.reserve(cost(1,{}),{label:'row '+i}));budget.holders(64);meter.visited=meter.maps=0;
 for(let i=0;i<40;i++){assert.equal(budget.stats.bytes,512);assert.equal(budget.holders(i%2?16:64).length,i%2?16:64);}
 assert.equal(meter.visited,0,'no Map/Set claims or holder rows are revisited without a commit');assert.equal(meter.maps,0,'unchanged diagnostics create no reduction maps');
 const identity={},extra=budget.reserve(cost(2,identity));assert(extra.adjust(cost(3,identity)));assert.equal(budget.tryReserve(cost(2000,{}),{evict:false}).ok,false);extra.release();
 assert(meter.visited<40,'one-identity changes visit only their claims, not the other 512 allocations: '+meter.visited);
 for(const reservation of held)reservation.release();assert.equal(budget.stats.allocations,0);assert.deepEqual(budget.holders(),[]);
});

function observingSets(refs){return class extends Set{add(value){if(value&&typeof value==='object'&&'active'in value&&'costs'in value)refs.state=new WeakRef(value);return super.add(value);}};}
function releasedWitnesses(){
 const refs={}, {createResourceBudget}=runtime(Map,observingSets(refs)),budget=createResourceBudget(),identity={payload:new Uint8Array(1024)},reservation=budget.reserve(cost(1024,identity),{label:'released holder'});
 refs.identity=new WeakRef(identity);const snapshot=budget.holders();reservation.release();
 // Do not reread holders here: commit itself must invalidate any cache that
 // could keep the old charging state; the ledger and old scalar view stay live.
 return{budget,snapshot,refs};
}
test('release drops identities and charging states while the ledger and old holder snapshot remain alive',async()=>{
 assert.equal(typeof global.gc,'function','run this suite with node --expose-gc');
 const {budget,snapshot,refs}=releasedWitnesses();assert(refs.state,'observed the actual admitted state');
 for(let i=0;i<8;i++){await nextTask();global.gc();await nextTask();}
 assert.equal(refs.identity.deref(),undefined);assert.equal(refs.state.deref(),undefined);assert.equal(snapshot[0].bytes,1024);assert.equal(budget.stats.reservations,0);assert.deepEqual(budget.holders(),[]);
});


test('role-only transitions retain holder membership while preserving shared claim totals',()=>{
 let maps=0;
 class CountedMap extends Map{constructor(...args){super(...args);maps++;}}
 const {createResourceBudget}=runtime(CountedMap),budget=createResourceBudget({limitBytes:100,recentLimitBytes:100}),identity={};
 const main=budget.reserve(cost(60,identity,'gpu-buffer'),{label:'main'});
 const smaller=budget.reserve(cost(20,identity,'gpu-buffer'),{label:'smaller'});
 const baseline=budget.holders()[0];
 for(const operation of [()=>main.setRecent(true),()=>main.markRetiring(),()=>smaller.markRetiring(),()=>main.setRetiring(false),()=>smaller.setRetiring(false)]){
  maps=0;operation();
  assert.equal(maps,1,'role transition allocates only its proposal map, never a replacement holder membership map');
  const row=budget.holders()[0];
  assert.equal(row.bytes,baseline.bytes);assert.equal(row.count,baseline.count);assert.equal(row.allocations,baseline.allocations);assert.equal(row.label,'main');
 }
 assert.equal(budget.stats.bytes,60);assert.equal(budget.stats.recentBytes,0);assert.equal(budget.stats.retiringBytes,0);
 main.release();assert.equal(budget.holders()[0].label,'smaller');assert.equal(budget.stats.bytes,20);
 smaller.release();assert.deepEqual(budget.holders(),[]);
});
