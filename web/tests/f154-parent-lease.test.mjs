import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';
import {managerF154Binding,f154ManifestFor} from './support/f2-f154-manager.mjs';

// cm-8yh / p0-audit M2: the F154 recovered SOURCE is one resourceMemo entry of the
// page store, and each manager's group parent is exactly that memo lease. Real
// modules only: frozen-data-scope, the page chunk store and ledger, renderer chunk
// input, the actual owner-f154 reconstruction/source-data modules and the actual
// manager bindDerivedChunkInput. No renderer, browser, GPU or network is involved.
const RUNTIME=new Set(['safety/frozen-data-scope','safety/reconstruction-resource-parents','safety/resource-content-key','safety/renderer-chunk-input','painted/root500/safety/owner-f154-reconstruction','painted/root500/safety/owner-f154-source-data','painted/root500/safety/progressive-native-signature']);
const F154={objectId:'osm/way/384153099',partId:'osm/way/384153099/component/83cb7aff2638e3f41f2b'};
const MEMO_LABEL='frozen scope memo construction';
const isF154Entry=row=>String(row.label).startsWith('["f154-exact-recovered-source-v1"');

function page({limitBytes=64*1024**2}={}){
 const modules=createSourceModules({allow:id=>RUNTIME.has(id)||id.startsWith('safety/render-runtime/')});
 const scopes=modules.load('safety/frozen-data-scope'),stores=modules.load('safety/render-runtime/chunk-resource-store'),budgets=modules.load('safety/render-runtime/resource-budget');
 const chunkInputs=modules.load('safety/renderer-chunk-input'),f154=modules.load('painted/root500/safety/owner-f154-reconstruction'),sourceData=modules.load('painted/root500/safety/owner-f154-source-data'),{nativePaintSignature}=modules.load('painted/root500/safety/progressive-native-signature');
 const budget=budgets.createResourceBudget({limitBytes,recentLimitBytes:0}),store=stores.createChunkResourceStore({budget,recentMaxEntries:0,recentMaxIdleMs:0});
 // Every reservation and adjustment of this page ledger, in order (observation only).
 // A test may also inject one adjust failure (faults) or act at admission (admitted);
 // both are empty unless that test registers an entry.
 const events=[],faults=[],admitted=[],reserve=budget.reserve.bind(budget);
 budget.reserve=(cost,options)=>{const reservation=reserve(cost,options),row={op:'reserve',label:options?.label??(Array.isArray(cost)?cost[0]?.label:cost.label),costs:[cost].flat(),reservation,adjusted:[]};events.push(row);for(const hook of admitted)hook(row);const adjust=reservation.adjust.bind(reservation);reservation.adjust=(next,adjustOptions)=>{const fault=faults.findIndex(entry=>entry.matches(row));if(fault>=0){const [entry]=faults.splice(fault,1);events.push({op:'adjust-fault',label:row.label,row});throw entry.error;}const ok=adjust(next,adjustOptions);const costs=[next].flat();row.adjusted.push(costs);events.push({op:'adjust',label:row.label,costs,ok,row});return ok;};return reservation;};
 const client={resources:store,async acquire(ref){throw Error('the F154 SOURCE needs no frozen model read: '+ref.file);},dispose(){}};
 return{modules,scopes,store,budget,budgets,chunkInputs,f154,sourceData,nativePaintSignature,client,events,faults,admitted,createScope:()=>scopes.createFrozenDataScope(client)};
}
const bytes=p=>p.budget.stats.bytes,roles=p=>p.store.stats.roles,ready=p=>p.store.stats.ready;
const sum=costs=>costs.reduce((n,c)=>n+c.bytes,0);
const nearby=(id=1)=>({city:'frankfurt',objectId:'osm/way/'+id,partId:'osm/way/'+id+'/part',origin:[8.67198,50.116035],sourceFeature:{type:'Feature',properties:{}},componentGeometry:{type:'Polygon',coordinates:[[[8.6719,50.116],[8.672,50.116],[8.6719,50.1161],[8.6719,50.116]]]},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.3,.4,.5]}]});
function graph(root){const seen=new Set(),visit=value=>{if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);if(ArrayBuffer.isView(value))return;for(const item of Object.values(value))visit(item);};visit(root);return seen;}
/** One manager preparation: recovered SOURCE rows, the actual reconstruction for
 * DISPLAY, and the prepared shape bindDerivedChunkInput receives. */
async function prepareF154(p,scope,signal=new AbortController().signal,{sourceOnly=false}={}){
 const rows=[nearby()];await p.f154.prepareOwnerF154RecoveredSources(rows,signal,undefined,scope);signal.throwIfAborted();
 const sourceComponents=p.f154.ownerF154RecoveredSources(rows,scope),display=sourceOnly?sourceComponents:p.f154.ownerF154Reconstruction(sourceComponents,scope).components;
 const prepared={scope,sourceComponents,displayComponents:display,chunkInput:undefined,released:0,releaseChunkDependencies(){prepared.released++;}};return prepared;
}
function binding(p,provider,manifest){return managerF154Binding({provider,f154:p.f154,nativePaintSignature:p.nativePaintSignature,store:p.store,chunkInputs:p.chunkInputs,manifest});}
function recordOf(p){const scope=p.createScope();try{return structuredClone(p.sourceData.getRoot500Data(scope).F154_SOURCE_RECORD);}finally{scope.release();}}

test('resourceMemo reserves the complete estimate before production, then adjusts to measured costs',async()=>{
 const p=page(),record=recordOf(p),base=bytes(p);assert.equal(base,0,'the source-data memo is returned with its scope');
 const scope=p.createScope(),start=p.events.length;await prepareF154(p,scope);
 const key=JSON.stringify(['f154-exact-recovered-source-v1',p.f154.F154_RECONSTRUCTION_SHA,record]),vertices=record.componentGeometry.coordinates[0].length-1,metadata=key.length*2+JSON.stringify(record).length*2+vertices*64+1024;
 const events=p.events.slice(start),reservation=events.find(row=>row.op==='reserve'&&row.label===key);assert(reservation,'the memo entry is admitted under its exact content key');
 assert.deepEqual(reservation.costs.map(c=>[c.category,c.bytes,c.precision]),[['decoded',vertices*39*8,'estimate'],['metadata',metadata,'estimate'],['construction',vertices*96,'estimate']],'the whole estimate, including construction scratch, is reserved before producing');
 const {recovered,record:memoRecord}=p.f154.getRoot500Data(scope),decoded=recovered.batches.reduce((n,b)=>n+(b.positions.length+b.normals.length+b.indices.length+b.color.length)*8,0);
 const adjust=events.findIndex(row=>row.op==='adjust'&&row.row===reservation);assert(adjust>events.indexOf(reservation),'measured costs replace the estimate only after admission');
 assert.deepEqual(events[adjust].costs.map(c=>[c.category,c.bytes,c.identity]),[['decoded',decoded,recovered],['metadata',metadata,memoRecord]]);assert.equal(events[adjust].ok,true);
 assert.equal(reservation.reservation.bytes,decoded+metadata,'the construction scratch is not retained by the entry');assert(decoded<=vertices*39*8&&decoded+metadata<=sum(reservation.costs),'measured costs never grow past the admitted estimate');
 scope.release();assert.equal(bytes(p),base);assert.equal(ready(p),0);
});

for(const provider of ['infill','root500','bremen'])test(provider+' manager group parent is exactly the F154 memo lease; local parents end, the retained input owns the rest',async()=>{
 const p=page(),record=recordOf(p),scope=p.createScope(),prepared=await prepareF154(p,scope),memo=p.f154.getRoot500Data(scope),before=roles(p);
 binding(p,provider,f154ManifestFor(record))(prepared,prepared.displayComponents);
 const groups=prepared.chunkInput.groups.filter(group=>group.selectedLOD==='explicit-recovered-source');assert.equal(groups.length,1);const [group]=groups;
 assert.equal(group.parents.length,1,'one parent: the memo lease, never the scope or another source');const [parent]=group.parents;
 const memoKey=JSON.stringify(['f154-exact-recovered-source-v1',p.f154.F154_RECONSTRUCTION_SHA,record]);assert.equal(parent.contentKey,memoKey);assert.equal(parent.role,'dependency');
 assert.strictEqual(parent.value.recovered,memo.recovered);assert.strictEqual(parent.value.record,memo.record);assert.deepEqual(group.components,[memo.recovered]);
 assert.equal(JSON.parse(group.contentKey)[2],memoKey,'group authority binds the memo content key');
 assert.equal(roles(p),before+1,'the manager-local parent was released; only the retained input pin remains');
 const entry=p.events.find(row=>row.op==='reserve'&&row.label===memoKey).reservation;scope.release();assert.equal(scope.stats.disposed,true);assert.equal(entry.active,true);assert(bytes(p)>=entry.bytes,'the memo entry stays charged while the input holds it');
 assert.equal(parent.released,false,'the retained input keeps the memo entry after the scope ends');assert.strictEqual(parent.value.recovered,memo.recovered);
 assert.equal(prepared.released,1,'the earlier (empty) dependency release ran once');prepared.releaseChunkDependencies();assert.equal(bytes(p),0,'releasing the last consumer returns every F154 byte');assert.equal(ready(p),0);assert.equal(roles(p),0);
});

test('a selected F154 SOURCE holder keeps the memo entry charged until it releases',async()=>{
 const p=page(),scope=p.createScope();await prepareF154(p,scope);
 const memo=p.f154.getRoot500Data(scope),selected=p.f154.retainF154RecoveredSourceResource(scope,'selected'),charged=p.events.find(row=>row.op==='reserve'&&String(row.label).startsWith('["f154-exact-recovered-source-v1"')).reservation;
 scope.release();assert.equal(scope.stats.disposed,true);
 assert.equal(selected.released,false);assert.equal(charged.active,true,'no refund while selected holds it');assert.strictEqual(selected.value.recovered,memo.recovered);assert(bytes(p)>=charged.bytes);
 selected.release();assert.equal(charged.active,false);assert.equal(bytes(p),0);assert.equal(ready(p),0);
});

for(const provider of ['infill','root500','bremen'])test(provider+' authority mismatch fails closed and releases the local parent',async()=>{
 const p=page(),record=recordOf(p),scope=p.createScope(),prepared=await prepareF154(p,scope),before=roles(p);
 for(const manifest of [{...f154ManifestFor(record),source_snapshot:'another-snapshot'},{...f154ManifestFor(record),source_pbf_sha256:'0'.repeat(64)},{...f154ManifestFor(record),city_boundary:{sha256:'1'.repeat(64)}}]){
  assert.throws(()=>binding(p,provider,manifest)(prepared,prepared.displayComponents),/F154 recovered SOURCE authority mismatch/);assert.equal(prepared.chunkInput,undefined);assert.equal(roles(p),before);
 }
 // The DISPLAY check runs after the parent is retained: the finally releases it.
 const forged=prepared.displayComponents.map(row=>row.objectId===F154.objectId&&row.partId===F154.partId?{...row,displayEstimates:{F154PhotoEstimate:{...row.displayEstimates.F154PhotoEstimate,sourceSignature:'forged'}}}:row);
 assert.throws(()=>binding(p,provider,f154ManifestFor(record))(prepared,forged),/F154 recovered display does not match its exact SOURCE/);assert.equal(prepared.chunkInput,undefined);assert.equal(prepared.released,0);assert.equal(roles(p),before,'no parent survives a refused binding');
 scope.release();assert.equal(bytes(p),0);assert.equal(ready(p),0);
});

test('abort leaves no ready F154 memo and no retained parent',async()=>{
 const p=page(),controller=new AbortController(),scope=p.createScope();controller.abort();
 await assert.rejects(prepareF154(p,scope,controller.signal),{name:'AbortError'});
 assert.throws(()=>scope.retainMemoResource(p.f154.F154_SOURCE_RESOURCE_MEMO_KEY,'dependency'),/unprepared frozen resource memo/);assert.equal(ready(p),0);assert.equal(bytes(p),0);
 scope.release();assert.throws(()=>p.f154.retainF154RecoveredSourceResource(scope,'dependency'),{name:'AbortError'});assert.equal(ready(p),0);assert.equal(bytes(p),0);assert.equal(roles(p),0);
 // A completed memo whose scope ends with no other consumer is not left ready either.
 const later=p.createScope();await prepareF154(p,later);assert(ready(p)>0);later.release();assert.equal(ready(p),0);assert.equal(bytes(p),0);
});

test('abort or scope release while the SOURCE preparation is in flight admits no F154 entry',async()=>{
 for(const interrupt of ['abort','release']){
  const p=page(),controller=new AbortController(),scope=p.createScope(),pending=prepareF154(p,scope,controller.signal);
  // The preparation has passed its synchronous checks and awaits the scope prepare.
  assert.equal(ready(p),0);assert.equal(p.events.some(isF154Entry),false,'nothing of F154 is admitted before preparation completes');
  if(interrupt==='abort')controller.abort();else scope.release();
  await assert.rejects(pending,{name:'AbortError'},interrupt+' rejects the in-flight preparation');
  assert.equal(p.events.some(isF154Entry),false,interrupt+' admits no F154 memo entry');assert.equal(ready(p),0);assert.equal(bytes(p),0);
  if(interrupt==='abort')assert.throws(()=>scope.retainMemoResource(p.f154.F154_SOURCE_RESOURCE_MEMO_KEY,'dependency'),/unprepared frozen resource memo/);
  scope.release();assert.equal(scope.stats.disposed,true);assert.equal(bytes(p),0);assert.equal(ready(p),0);assert.equal(roles(p),0);
 }
});

test('an interruption after F154 admission and before measured costs returns the claim and leaves nothing ready',async()=>{
 const p=page(),scope=p.createScope();await p.f154.prepareOwnerF154RecoveredSources([nearby()],new AbortController().signal,undefined,scope);
 p.faults.push({matches:isF154Entry,error:Error('tiny interruption before measured costs')});
 assert.throws(()=>p.f154.getRoot500Data(scope),/tiny interruption before measured costs/);
 const entry=p.events.find(row=>row.op==='reserve'&&isF154Entry(row));assert(entry,'the complete estimate was admitted before production');assert(p.events.some(row=>row.op==='adjust-fault'&&row.row===entry),'the interruption hit that admitted entry');
 assert.equal(entry.reservation.active,false,'the admitted claim is returned');assert.equal(ready(p),0);assert.equal(roles(p),0);
 assert.throws(()=>scope.retainMemoResource(p.f154.F154_SOURCE_RESOURCE_MEMO_KEY,'dependency'),/unprepared frozen resource memo/);
 const record=p.events.filter(row=>row.op==='reserve'&&row.label===MEMO_LABEL&&row.reservation.active);assert.equal(bytes(p),record.reduce((n,row)=>n+row.reservation.bytes,0),'only the committed source-data record memo stays charged, by its scope');
 // The failure is not cached: the same live scope admits the entry again and completes.
 const memo=p.f154.getRoot500Data(scope);assert.equal(memo.recovered.batches.length>0,true);assert.equal(ready(p),1);
 scope.release();assert.equal(bytes(p),0);assert.equal(ready(p),0);assert.equal(roles(p),0);
});

test('an abort that lands at F154 admission is observed at the next await point; the scope returns every byte',async()=>{
 // Production is synchronous: no await exists between admission, produce and the
 // measured adjustment, so the signal is first observed by the caller afterwards.
 const p=page(),controller=new AbortController(),scope=p.createScope();
 p.admitted.push(row=>{if(isF154Entry(row))controller.abort();});
 const rows=[nearby()];await p.f154.prepareOwnerF154RecoveredSources(rows,controller.signal,undefined,scope);
 p.f154.getRoot500Data(scope);assert.equal(controller.signal.aborted,true);const entry=p.events.find(row=>row.op==='reserve'&&isF154Entry(row)).reservation;assert.equal(entry.active,true);
 await assert.rejects(p.f154.prepareOwnerF154RecoveredSources(rows,controller.signal,undefined,scope),{name:'AbortError'},'the next preparation step observes the abort');
 scope.release();assert.equal(entry.active,false,'no consumer remains, so the entry is refunded');assert.equal(ready(p),0);assert.equal(bytes(p),0);assert.equal(roles(p),0);
});

test('R1: outer F154 memo does not charge the recovered SOURCE graph again',async()=>{
 const p=page(),scope=p.createScope(),start=p.events.length;// This case measures recovered SOURCE ownership only. DISPLAY construction
 // has its own admitted private memo and f154-construction-budget regressions.
 await prepareF154(p,scope,undefined,{sourceOnly:true});
 const memo=p.f154.getRoot500Data(scope),recovered=graph(memo.recovered),batches=graph(memo.recovered.batches),record=graph(memo.record),entry=p.events.find(row=>row.op==='reserve'&&String(row.label).startsWith('["f154-exact-recovered-source-v1"')),memoRows=p.events.slice(start).filter(row=>row.op==='reserve'&&row.label===MEMO_LABEL);
 assert(memoRows.length>=2,'the outer F154 memo and its source-data memo are both admitted');
 for(const row of memoRows)for(const costs of row.adjusted)for(const cost of costs){
  assert(!batches.has(cost.identity),'no array or batch under recovered.batches is charged as scope construction');
  // Bounded registered exception (DECISIONS 22:06, p0-audit R1(b)): only record
  // sub-objects shared by the recovered row stay charged by the source-data memo.
  if(recovered.has(cost.identity))assert(record.has(cost.identity),'a recovered SOURCE object is charged only as the shared record sub-object');
 }
 for(const costs of memoRows[0].adjusted)for(const cost of costs)assert(!recovered.has(cost.identity),'the outer F154 memo charges nothing of the recovered SOURCE');
 const outer=memoRows[0],outerBytes=sum(outer.adjusted.at(-1));assert(outerBytes<=4096,'the outer wrapper costs only its own small object: '+outerBytes);
 const source=memoRows[1],sourceBytes=sum(source.adjusted.at(-1));
 assert(bytes(p)<=entry.reservation.bytes+sourceBytes+outerBytes,'page usage is the memo costs, the source-data record and the small wrapper');
 scope.release();assert.equal(bytes(p),0);
});

test('M3: a memo that does not fit is refused synchronously without a leak, and a woken retry completes',async()=>{
 const p=page({limitBytes:256*1024}),record=recordOf(p),vertices=record.componentGeometry.coordinates[0].length-1,estimate=vertices*39*8+vertices*96;
 const filler=p.budget.reserve({category:'metadata',bytes:p.budget.stats.limitBytes-estimate,precision:'exact',label:'other page work'}),base=bytes(p);
 const scope=p.createScope();await p.f154.prepareOwnerF154RecoveredSources([nearby()],new AbortController().signal,undefined,scope);
 assert.throws(()=>p.f154.getRoot500Data(scope),error=>error instanceof p.budgets.ResourceBudgetExceededError);
 const refused=p.events.find(row=>row.op==='reserve'&&String(row.label).startsWith('["f154-exact-recovered-source-v1"'));assert.equal(refused?.reservation.active??false,false,'the refused F154 entry holds no claim');assert.equal(ready(p),0);
 assert.throws(()=>scope.retainMemoResource(p.f154.F154_SOURCE_RESOURCE_MEMO_KEY,'dependency'),/unprepared/);scope.release();assert.equal(bytes(p),base,'the scope returns its committed source-data memo; nothing of the refusal remains');
 // Retry the same recovered SOURCE operation under the unchanged 256 KiB cap;
 // generating DISPLAY here would add a different construction envelope.
 // The refused work waits empty-handed: it holds no claim, and only the wake starts the retry.
 let woke=0;const retries=[],retried=new Promise((resolve,reject)=>{const stop=p.budget.onAvailable(()=>{woke++;stop();const retry=p.createScope();retries.push(retry);prepareF154(p,retry,undefined,{sourceOnly:true}).then(prepared=>resolve({retry,prepared}),reject);});});
 assert.equal(retries.length,0,'no retry starts while the other holder still holds the budget');assert.equal(bytes(p),base);
 filler.release();assert.equal(woke,1,'releasing the other holder wakes the waiter once');assert.equal(retries.length,1,'the wake itself starts the retry');
 const {retry,prepared}=await retried;assert.equal(prepared.sourceComponents.at(-1).objectId,F154.objectId);assert.strictEqual(prepared.scope,retries[0]);assert.equal(p.f154.getRoot500Data(retry).recovered.batches.length>0,true);assert(ready(p)>0);
 retry.release();assert.equal(woke,1,'the waiter unsubscribed after its wake');assert.equal(bytes(p),0);
});

test('R6: the product frozen client always carries its page resource store',()=>{
 const p=page(),leaseStores=createSourceModules({allow:id=>id.startsWith('safety/render-runtime/')||['safety/frozen-data-lease-store','safety/clone-frozen-json','safety/bounded-3d-gzip','safety/building-payload-cost','safety/resource-byte-transport'].includes(id)});
 let store;try{store=leaseStores.load('safety/frozen-data-lease-store');}catch(error){if(/Unexpected production dependency/.test(error.message))throw Error('frozen-data-lease-store gained a new runtime dependency: '+error.message);throw error;}
 const owned=store.createFrozenDataLeaseStore([],{resourceStore:p.store}),client=owned.client({city:'frankfurt',profileSHA256:null,provider:'infill',selection:{tables:[]},resolve:()=>{throw Error('no descriptor is read');},read:async()=>{throw Error('no read');}});
 assert.strictEqual(client.resources,p.store,'the client exposes the very store its lease store charges');client.dispose();owned.destroy?.();
 // The product owner forwards the page store into that lease store, and every
 // provider client is minted by it (frozen-paint-tables imports virtual data, so
 // its wiring is checked on the actual source text rather than evaluated).
 const text=fs.readFileSync(new URL('../src/safety/frozen-paint-tables.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('frozen-paint-tables.ts',text,ts.ScriptTarget.Latest,true);
 const owner=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createFrozenDataResourceOwner');assert(owner,'createFrozenDataResourceOwner exists');const body=owner.getText(ast);
 assert.match(body,/createFrozenDataLeaseStore\([^)]*\{resourceStore:options\.resourceStore\}\)/,'the owner forwards the page store');assert.match(body,/client\(provider:string\)\{return resources\.client\(/,'provider clients are minted by that lease store');
 const map=fs.readFileSync(new URL('../src/safety/painted-map.ts',import.meta.url),'utf8');assert.match(map,/createFrozenDataResourceOwner\(\{[^}]*resourceStore\}\)/,'the painted map supplies its page store');
});
