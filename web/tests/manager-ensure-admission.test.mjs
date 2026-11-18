import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,webcrypto} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// Page-level ingress admission shared by the seven painted 3D managers
// (web/src/safety/manager-ensure-admission.ts): one bootstrap production per page
// ledger, admissions made at once or waits holding nothing, the solar boundary
// index admitted before the renderer receives its boundary (and handed off again
// when evicted before the commit), the managers' caller-admitted asset reader and
// the City paint-initialization order. The shared module, ledger, chunk store,
// transport and solar admission are the actual sources; manager behaviour runs the
// managers' own source text. Only network bytes and the renderer sink are fixtures.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),src=(...parts)=>path.join(web,'src',...parts);
const families=['root500','infill','bremen','city','tier300','church','delegated500'];
// Optional negative control: <root>/<family>.ts replaces only the manager source.
const managerRoot=process.env.MANAGER_ADMISSION_SOURCE_ROOT;
const managerFile=family=>managerRoot?path.join(managerRoot,family+'.ts'):src('painted',family,'safety','three-dimensional-map.ts');
const MiB=1024**2;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const flush=async(rounds=8)=>{for(let i=0;i<rounds;i++)await tick();};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
// Bounded fixture wait (event-loop turns, no timer) for a state the fixture drives.
const until=async(predicate,rounds=400)=>{for(let i=0;i<rounds;i++){if(predicate())return;await tick();}assert.fail('bounded fixture event did not occur');};
async function outcomeOf(promise,rounds=400){let value='pending';promise.then(()=>{value='fulfilled';},error=>{value=error?.name??String(error);});for(let i=0;i<rounds&&value==='pending';i++)await tick();return value;}

// CommonJS view of the actual TypeScript runtime. A seeded loader shares the
// ledger module (and so its error classes) while giving a page its own solar and
// admission module instances, as one browser page has.
function loader(seed=new Map()){
 const cache=new Map(seed);
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  new Function('require','module','exports',compiled.outputText)(request=>{
   assert.ok(request.startsWith('.'),'runtime dependency must be local: '+request);
   const base=path.resolve(path.dirname(file),request);
   for(const candidate of [...(base.endsWith('.mjs')?[base]:[]),base+'.ts',path.join(base,'index.ts')])if(fs.existsSync(candidate))return load(candidate);
   throw Error('Unresolved '+request+' from '+file);
  },module,module.exports);
  return module.exports;
 }
 load.cache=cache;return load;
}
const load=loader(),budgetFile=src('safety','render-runtime','resource-budget.ts');
const {createResourceBudget,ResourceBudgetExceededError}=load(budgetFile);
const {createChunkResourceStore}=load(src('safety','render-runtime','chunk-resource-store.ts'));
const {createResourceByteTransport,resourceByteReadEnvelope,resourceByteAdmittedEnvelope}=load(src('safety','resource-byte-transport.ts'));
const {createRecoveryResidentReuse}=load(src('safety','recovery-resident-reuse.ts'));
const {createViewportRequestContinuation}=load(src('safety','viewport-request.ts'));
// The runtime readAsset callers' own pre-admission (environment manifest, boundary
// and leaves, vehicle scenery, the water profile).
const {environmentJsonReadCosts}=load(src('safety','environment-resource-budget.ts'));
const sum=costs=>costs.reduce((total,cost)=>total+cost.bytes,0);
function pageModules(){const fresh=loader(new Map([[budgetFile,load.cache.get(budgetFile)]]));return{admission:fresh(src('safety','manager-ensure-admission.ts')),solar:fresh(src('safety','solar-shadow-admission.ts'))};}
const view=budget=>{const s=budget.stats,c=name=>s.categories[name]?.bytes??0;return{bytes:s.bytes,read:c('read'),construction:c('construction'),inflate:c('inflate'),decoded:c('decoded'),metadata:c('metadata'),shadow:c('shadow'),recent:s.recentBytes,reservations:s.reservations,listeners:s.availabilityListeners};};
// No admission path may use a timer: every wait is an availability wave or an abort.
function withoutTimers(t,allowTimeout){
 const saved={setTimeout,setInterval};
 globalThis.setTimeout=(callback,delay,...args)=>{
  if(allowTimeout?.(delay))return saved.setTimeout(callback,delay,...args);
  throw Error('setTimeout is not allowed in admission waits');
 };
 globalThis.setInterval=()=>{throw Error('setInterval is not allowed in admission waits');};
 t.after(()=>{globalThis.setTimeout=saved.setTimeout;globalThis.setInterval=saved.setInterval;});
}

// ---------------------------------------------------------------- shared module
const ring=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
const solarValue=(hash,points=5)=>({boundarySHA256:hash,geometry:{type:'Polygon',coordinates:[points===5?ring(13.3,52.4,13.5,52.6):[...Array.from({length:points},(_,i)=>[13.3+(i%1000)*1e-4,52.4+Math.floor(i/1000)*1e-4]),[13.3,52.4]]]}});
let nextHash=0;const freshHash=()=>sha('admission fixture '+(++nextHash));

test('a refused admission waits holding nothing, wakes only on a wave that can hold it, and an abort leaves no listener',async t=>{
 withoutTimers(t);const {admission}=pageModules(),budget=createResourceBudget({limitBytes:10*MiB,recentLimitBytes:MiB});
 const blockers=[3,3,3].map(n=>budget.reserve({category:'construction',bytes:n*MiB,precision:'estimate'}));
 const wait=admission.awaitManagerCapacity(budget,6*MiB,new AbortController().signal);
 assert.equal(await outcomeOf(wait,8),'pending');assert.equal(budget.stats.availabilityListeners,1,'one registration');
 blockers[0].release();assert.equal(await outcomeOf(wait,8),'pending','4 MiB free cannot hold 6 MiB: the registration stays');assert.equal(budget.stats.availabilityListeners,1);
 blockers[1].release();assert.equal(await outcomeOf(wait),'fulfilled','7 MiB free holds the work');assert.equal(budget.stats.availabilityListeners,0);
 const controller=new AbortController(),aborted=admission.awaitManagerCapacity(budget,8*MiB,controller.signal);await tick();
 assert.equal(budget.stats.availabilityListeners,1);controller.abort();assert.equal(await outcomeOf(aborted),'AbortError');assert.equal(budget.stats.availabilityListeners,0);
 assert.equal(await outcomeOf(admission.awaitManagerCapacity(budget,7*MiB,new AbortController().signal)),'fulfilled','capacity already free is seen once at registration');
 blockers[2].release();assert.equal(budget.stats.bytes,0);
});

test('retryManagerAdmission reruns its work only after a fitting wave, and settles on any other outcome',async t=>{
 withoutTimers(t);const {admission}=pageModules(),budget=createResourceBudget({limitBytes:8*MiB,recentLimitBytes:MiB});
 const blocker=budget.reserve({category:'mask',bytes:7*MiB,precision:'estimate'});let runs=0;
 const work=async()=>{runs++;const admitted=budget.tryReserve({category:'construction',bytes:2*MiB,precision:'estimate'});if(!admitted.ok)throw new admission.ManagerAdmissionRetry(2*MiB,'fixture working set');admitted.reservation.release();return 'done';};
 const running=admission.retryManagerAdmission(budget,new AbortController().signal,work);
 assert.equal(await outcomeOf(running,8),'pending');assert.deepEqual([runs,budget.stats.bytes,budget.stats.availabilityListeners],[1,7*MiB,1],'the refused work holds nothing while it waits');
 blocker.release();assert.equal(await running,'done');assert.equal(runs,2);assert.equal(budget.stats.availabilityListeners,0);
 await assert.rejects(admission.retryManagerAdmission(budget,new AbortController().signal,async()=>{throw TypeError('not an admission');}),TypeError);
 const held=budget.reserve({category:'mask',bytes:7*MiB,precision:'estimate'}),controller=new AbortController(),waiting=admission.retryManagerAdmission(budget,controller.signal,work);
 await flush();controller.abort();assert.equal(await outcomeOf(waiting),'AbortError');assert.equal(budget.stats.availabilityListeners,0);held.release();assert.equal(budget.stats.bytes,0);
});

// A production fixture: it reserves its value's claim after a gate and returns it
// on abort, as the managers' productions do.
function production(budget,{bytes=MiB,gates=[]}={}){
 const calls=[];
 const produce=async signal=>{const call={signal,gate:gates.shift()};calls.push(call);if(call.gate)await new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});call.gate.promise.then(resolve,reject);});signal.throwIfAborted();const claim=budget.reserve({category:'metadata',bytes,precision:'estimate',label:'fixture bootstrap value'});return{value:{id:calls.length},claim};};
 return{calls,produce};
}
test('one production per page ledger and key: waiting managers hold nothing and every lease shares one claim',async t=>{
 withoutTimers(t);const {admission}=pageModules(),budget=createResourceBudget({limitBytes:64*MiB,recentLimitBytes:8*MiB}),gate=deferred(),fixture=production(budget,{gates:[gate]});
 const pending=Array.from({length:5},()=>admission.acquireManagerBootstrap({budget,key:'berlin',signal:new AbortController().signal,produce:fixture.produce}));
 await flush();assert.equal(fixture.calls.length,1,'one production for five managers');assert.deepEqual([budget.stats.bytes,budget.stats.reservations],[0,0],'no waiting manager holds a claim');
 gate.resolve();const leases=await Promise.all(pending);
 const value=leases[0].value;assert(leases.every(lease=>lease.value===value),'one shared value');assert(leases.every(lease=>lease.bytes===MiB),'every lease reports the one claim');
 assert.deepEqual([budget.stats.bytes,budget.stats.reservations],[MiB,1],'charged once');
 for(const lease of leases.slice(0,4))lease.release();assert.equal(budget.stats.bytes,MiB,'held while one manager still reads it');
 assert.throws(()=>leases[0].value,/released/,'a released lease no longer reads the value');
 const late=await admission.acquireManagerBootstrap({budget,key:'berlin',signal:new AbortController().signal,produce:fixture.produce});assert.equal(late.value,value);assert.equal(fixture.calls.length,1,'a ready value is leased without another production');
 leases[4].release();late.release();assert.equal(budget.stats.bytes,0,'the last lease returns the claim');assert.deepEqual(admission.managerBootstrapStats(budget).entries,[]);
 const other=createResourceBudget({limitBytes:64*MiB}),otherLease=await admission.acquireManagerBootstrap({budget:other,key:'berlin',signal:new AbortController().signal,produce:fixture.produce});
 const city=await admission.acquireManagerBootstrap({budget,key:'hamburg',signal:new AbortController().signal,produce:fixture.produce});
 assert.equal(fixture.calls.length,3,'another page ledger or key produces its own value');otherLease.release();city.release();assert.equal(other.stats.bytes+budget.stats.bytes,0);
});

test('a leaving producer hands the production to the next waiting manager; when nobody waits the production is cancelled',async t=>{
 withoutTimers(t);const {admission}=pageModules(),budget=createResourceBudget({limitBytes:64*MiB}),first=deferred(),second=deferred(),fixture=production(budget,{gates:[first,second]});
 const a=new AbortController(),b=new AbortController(),leaseA=admission.acquireManagerBootstrap({budget,key:'k',signal:a.signal,produce:fixture.produce}),leaseB=admission.acquireManagerBootstrap({budget,key:'k',signal:b.signal,produce:fixture.produce});
 await flush();assert.equal(fixture.calls.length,1);a.abort();
 assert.equal(await outcomeOf(leaseA),'AbortError');assert(fixture.calls[0].signal.aborted,'the abandoned attempt is aborted');await flush();
 assert.equal(fixture.calls.length,2,'the waiting manager produces anew');second.resolve();const lease=await leaseB;assert.equal(lease.value.id,2);
 assert.equal(admission.managerBootstrapStats(budget).entries[0].relays,1);lease.release();assert.equal(budget.stats.bytes,0);
 const gate=deferred(),cancelled=production(budget,{gates:[gate]}),controllers=[new AbortController(),new AbortController()];
 const both=controllers.map(controller=>admission.acquireManagerBootstrap({budget,key:'k',signal:controller.signal,produce:cancelled.produce}));await flush();
 for(const controller of controllers)controller.abort();assert.deepEqual(await Promise.all(both.map(p=>outcomeOf(p))),['AbortError','AbortError']);
 assert(cancelled.calls[0].signal.aborted,'nobody waits: the production is cancelled');gate.resolve();await flush();
 assert.deepEqual([budget.stats.bytes,budget.stats.availabilityListeners],[0,0]);assert.deepEqual(admission.managerBootstrapStats(budget).entries,[]);
});

test('a failed production rejects every waiting manager and a later request produces again',async t=>{
 withoutTimers(t);const {admission}=pageModules(),budget=createResourceBudget({limitBytes:64*MiB});let runs=0;
 const failing=async()=>{runs++;throw Error('fixture hash mismatch');};
 const all=[0,1,2].map(()=>admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce:failing}));
 for(const p of all)await assert.rejects(p,/fixture hash mismatch/);assert.equal(runs,1,'one failed production for every waiter');
 assert.deepEqual(admission.managerBootstrapStats(budget).entries,[]);await assert.rejects(admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce:failing}),/fixture hash mismatch/);assert.equal(runs,2);
});

test('a production refused by the ledger returns its claims and waits holding nothing until a wave can hold it',async t=>{
 withoutTimers(t);const {admission}=pageModules(),budget=createResourceBudget({limitBytes:16*MiB,recentLimitBytes:MiB}),blocker=budget.reserve({category:'mask',bytes:12*MiB,precision:'estimate'});let runs=0;
 const produce=async signal=>{runs++;const index=budget.reserve({category:'metadata',bytes:MiB,precision:'estimate'});try{const stage=budget.tryReserve({category:'construction',bytes:6*MiB,precision:'estimate'});if(!stage.ok)throw new admission.ManagerAdmissionRetry(7*MiB,'fixture boundary stage');stage.reservation.release();signal.throwIfAborted();return{value:'parsed',claim:budget.reserve({category:'metadata',bytes:2*MiB,precision:'estimate'})};}finally{index.release();}};
 const pending=admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce});await flush();
 assert.equal(runs,1);assert.deepEqual([budget.stats.bytes,budget.stats.availabilityListeners],[12*MiB,1],'the refused production holds nothing while it waits');
 assert.equal(admission.managerBootstrapStats(budget).entries[0].waitingForBytes,7*MiB);
 blocker.release();const lease=await pending;assert.equal(runs,2);assert.equal(lease.value,'parsed');assert.deepEqual([budget.stats.bytes,budget.stats.availabilityListeners],[2*MiB,0]);lease.release();
});

test('the solar boundary index is admitted before a lease returns; a refused index returns the lease and waits holding nothing',async t=>{
 withoutTimers(t);const {admission,solar}=pageModules(),budget=createResourceBudget({limitBytes:16*MiB,recentLimitBytes:MiB}),hash=freshHash(),value=solarValue(hash,4000);
 const index=solar.solarShadowBoundaryIndexBytes(value)+solar.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
 const fixture=production(budget,{bytes:MiB}),blocker=budget.reserve({category:'mask',bytes:16*MiB-MiB-index+1,precision:'estimate'});
 const pending=admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce:fixture.produce,solarBoundary:()=>value});await flush();
 assert.equal(await outcomeOf(pending,8),'pending');assert.equal(solar.currentSolarShadowBoundary(hash),undefined,'nothing is allocated before admission');
 assert.deepEqual([budget.stats.bytes,budget.stats.availabilityListeners],[blocker.bytes,1],'the refused index released the lease: the value claim is returned while it waits');
 blocker.release();const lease=await pending;assert.equal(fixture.calls.length,2,'the value is produced again after the wait');
 assert.ok(solar.currentSolarShadowBoundary(hash));assert.equal(view(budget).shadow,index,'exact index plus its wrapper estimate, charged once');
 const second=await admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce:fixture.produce,solarBoundary:()=>value});
 assert.equal(view(budget).shadow,index,'a later manager reaches the cached index');lease.release();second.release();
 const tight=createResourceBudget({limitBytes:MiB+index-1,recentLimitBytes:MiB}),other=solarValue(freshHash(),4000);
 await assert.rejects(admission.acquireManagerBootstrap({budget:tight,key:'k',signal:new AbortController().signal,produce:production(tight,{bytes:MiB}).produce,solarBoundary:()=>other}),error=>error instanceof ResourceBudgetExceededError);
 assert.deepEqual([tight.stats.bytes,tight.stats.availabilityListeners],[0,0],'an index that never fits beside its value is not-fit and returns the lease');
});

test('a manager joining a ready bootstrap whose solar index was evicted waits for the index alone, holding nothing',async t=>{
 withoutTimers(t);const {admission,solar}=pageModules(),budget=createResourceBudget({limitBytes:64*MiB,recentLimitBytes:8*MiB});
 const C=4*MiB,fixture=production(budget,{bytes:C}),hash=freshHash(),value=solarValue(hash,20000);
 const I=solar.solarShadowBoundaryIndexBytes(value)+solar.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
 const first=await admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce:fixture.produce,solarBoundary:()=>value});
 assert.ok(solar.currentSolarShadowBoundary(hash));
 solar.prepareSolarShadowBoundary(solarValue(freshHash()),{budget});solar.prepareSolarShadowBoundary(solarValue(freshHash()),{budget});
 assert.equal(solar.currentSolarShadowBoundary(hash),undefined,'two more boundary hashes evicted it from the two-entry cache');
 const blocker=budget.reserve({category:'mask',bytes:budget.stats.availableBytes-(I-1),precision:'estimate',label:'other holders'});
 const joining=admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce:fixture.produce,solarBoundary:()=>value});
 assert.equal(await outcomeOf(joining,50),'pending','the index does not fit yet');
 assert.deepEqual([budget.stats.availabilityListeners,admission.managerBootstrapStats(budget).entries[0].leases],[1,1],'the joiner returned its lease and waits holding nothing');
 assert(blocker.adjust({category:'mask',bytes:blocker.bytes-2*I,precision:'estimate',label:'other holders'}));
 const free=budget.stats.availableBytes;assert(free>=I&&free<C+I,'room for the index, not for the value and the index');
 assert.equal(await outcomeOf(joining),'fulfilled','the index alone is waited for');const lease=await joining;
 assert.equal(lease.value,first.value,'the shared value is leased again, not produced again');assert.equal(fixture.calls.length,1);
 assert.ok(solar.currentSolarShadowBoundary(hash));assert.equal(budget.stats.availabilityListeners,0);
 first.release();lease.release();blocker.release();
});

test('a joiner waiting for an evicted index ends its wait on a wave once another holder has cached that index',async t=>{
 withoutTimers(t);const {admission,solar}=pageModules(),budget=createResourceBudget({limitBytes:64*MiB,recentLimitBytes:8*MiB});
 const fixture=production(budget,{bytes:4*MiB}),hash=freshHash(),value=solarValue(hash,20000);
 const I=solar.solarShadowBoundaryIndexBytes(value)+solar.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
 const first=await admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce:fixture.produce,solarBoundary:()=>value});
 const older=solarValue(freshHash()),olderBytes=solar.solarShadowBoundaryIndexBytes(older)+solar.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
 solar.prepareSolarShadowBoundary(older,{budget});solar.prepareSolarShadowBoundary(solarValue(freshHash()),{budget});
 // The blocker leaves room for neither the index nor the index once the next
 // insertion evicts `older` from the two-entry cache.
 const blocker=budget.reserve({category:'mask',bytes:budget.stats.availableBytes-(I-2)+olderBytes,precision:'estimate',label:'other holders'});
 const joining=admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce:fixture.produce,solarBoundary:()=>value});
 assert.equal(await outcomeOf(joining,50),'pending');
 // Another holder's synchronous preparation caches the index (charged once room exists).
 solar.prepareSolarShadowBoundary(value,{budget});assert.ok(solar.currentSolarShadowBoundary(hash));assert.equal(solar.currentSolarShadowBoundary(older.boundarySHA256),undefined);
 assert(blocker.adjust({category:'mask',bytes:blocker.bytes-1,precision:'estimate',label:'other holders'}));
 assert.equal(budget.stats.availableBytes+budget.stats.recentBytes,I-1,'a one-byte wave: still no room for the index');
 assert.equal(await outcomeOf(joining),'fulfilled','the wave ends the wait: the index is cached');const lease=await joining;assert.equal(lease.value,first.value,'the cached index needs no admission of its own');
 first.release();lease.release();blocker.release();
});

test('room made reclaimable while a refused work unwinds is seen when its wait registers',async t=>{
 let releasingSource=false,expiryTimers=0;
 withoutTimers(t,delay=>{
  if(!releasingSource)return false;
  assert.ok(delay>0&&delay<=20_000,'the source cache schedules its idle expiry');
  expiryTimers++;return true;
 });
 const {admission}=pageModules(),budget=createResourceBudget({limitBytes:8*MiB,recentLimitBytes:4*MiB}),store=createChunkResourceStore({budget});
 const other=store.acquire({contentKey:'other holder',role:'source',allowRecent:true,estimate:{category:'read',bytes:3*MiB,precision:'exact'},produce:()=>({}),costs:()=>({category:'read',bytes:3*MiB,precision:'exact'})});
 await other.ready;const blocker=budget.reserve({category:'mask',bytes:4*MiB,precision:'estimate',label:'blocker'});let runs=0;
 const work=async()=>{runs++;const admitted=budget.tryReserve({category:'construction',bytes:2*MiB,precision:'estimate'});if(admitted.ok){admitted.reservation.release();return 'done';}
  if(runs===1){
   releasingSource=true;
   try{other.release();}finally{releasingSource=false;}
  }
  throw new admission.ManagerAdmissionRetry(2*MiB,'fixture working set');};
 const running=admission.retryManagerAdmission(budget,new AbortController().signal,work);
 assert.equal(await outcomeOf(running),'fulfilled','free plus reclaimable bytes held the work at registration');assert.equal(await running,'done');
 assert.equal(expiryTimers,1,'only the released cache entry sets an expiry timer');
 assert.deepEqual([runs,budget.stats.availabilityListeners],[2,0]);assert.equal(admission.managerBootstrapStats().waits.registrationWakeups>0,true);
 blocker.release();
});

test('a refusal right after a wait that ended at registration waits for a wave: no immediate retry loop',async t=>{
 withoutTimers(t);const {admission}=pageModules(),budget=createResourceBudget({limitBytes:8*MiB,recentLimitBytes:MiB});let runs=0;
 // A refusal that the ledger's free bytes do not explain (here: the work's own
 // condition). The fixture stops after 1000 runs so that a loop fails, not hangs.
 const work=async()=>{runs++;if(runs>=1000)return 'looped';throw new admission.ManagerAdmissionRetry(MiB,'fixture refusal beside free bytes');};
 const controller=new AbortController(),running=admission.retryManagerAdmission(budget,controller.signal,work);
 assert.equal(await outcomeOf(running,50),'pending');
 assert.deepEqual([runs,budget.stats.availabilityListeners],[2,1],'one retry at registration, then one registration waiting for a wave');
 budget.reserve({category:'mask',bytes:1024,precision:'estimate'}).release();await flush();
 assert.deepEqual([runs,budget.stats.availabilityListeners],[4,1],'a wave reruns it, room at the next registration once more, then it waits again');
 controller.abort();assert.equal(await outcomeOf(running),'AbortError');assert.equal(budget.stats.availabilityListeners,0);
});

// ------------------------------------------------------------ manager harness
// The managers' module helpers, their ledger helpers inside installThreeDimensionalMap,
// ensure() and the returned destroy()/readAsset() methods run verbatim.
const MODULE_NAMES=['HASH','pathValid','assetValid','bboxValid','parseManifest','parseBoundary','decoded','checkedBytes','checked','BOOTSTRAP_JSON_EXPANSION','bootstrapParseCosts','bootstrapRetainedCost'];
// fetchLifetime exists in some families only.
const INSTALL_NAMES=['fetchLifetime','queue','pump','scheduled','fetchBounded','bootstrapPressure','unfitBootstrap','admitBootstrap','acquireBounded','parseBootstrap','ensure'];
const declared=(node,names)=>ts.isFunctionDeclaration(node)?names.includes(node.name?.text):ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>ts.isIdentifier(item.name)&&names.includes(item.name.text));
const compile=code=>ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const sources=new Map();
for(const family of families){
 const file=managerFile(family),text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 const install=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='installThreeDimensionalMap');
 const parts=[...ast.statements.filter(node=>declared(node,MODULE_NAMES)),...install.body.statements.filter(node=>declared(node,INSTALL_NAMES))];
 for(const name of [...MODULE_NAMES,...INSTALL_NAMES.filter(name=>name!=='fetchLifetime')])assert(parts.some(node=>declared(node,[name])),family+' declares '+name);
 const returned=install.body.statements.findLast(node=>ts.isReturnStatement(node)&&node.expression&&ts.isObjectLiteralExpression(node.expression));
 const method=name=>returned.expression.properties.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(ast)===name);
 const loadShard=install.body.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='loadShard');
 sources.set(family,{text,ast,install,
  lifetime:parts.some(node=>declared(node,['fetchLifetime'])),readAssetText:method('readAsset').getText(ast),
  // readAsset runs beside the helpers it closes over; a family's fetch lifetime is
  // shared with its destroy().
  body:compile(parts.map(node=>node.getText(ast)).join('\n')+(parts.some(node=>declared(node,['fetchLifetime']))?'\nexposeLifetime(fetchLifetime);':'')+'\nconst methods=({'+method('readAsset').getText(ast)+'});\nreturn {ensure,readAsset:methods.readAsset,stats:()=>({active,peak,queued:queue.length})};'),
  destroy:compile('return ({'+method('destroy').getText(ast)+'}).destroy;'),
  loadShard:loadShard?compile(loadShard.getText(ast)+'\nreturn loadShard;'):undefined});
}
function familyModules(family){
 return{decodeBounded3DAssetJSON:load(src('painted',family,'safety','bounded-3d-gzip.ts')).decodeBounded3DAssetJSON,
  estimateRetainedBuildingPayload:load(src('painted',family,'safety','building-payload-cost.ts')).estimateRetainedBuildingPayload,
  validModelHeight:load(src('painted',family,'safety','three-dimensional-query.ts')).validModelHeight};
}
const strictScope=values=>new Proxy(values,{has:()=>true,get:(target,key)=>{if(key===Symbol.unscopables)return undefined;if(key in target)return target[key];if(key in globalThis)return globalThis[key];throw new ReferenceError('Missing manager fixture binding: '+String(key));},set:(target,key,value)=>(target[key]=value,true)});
const inert=new Proxy(function(){},{get:(_target,key)=>key===Symbol.toPrimitive?()=>0:key==='then'?undefined:inert,apply:()=>inert,construct:()=>inert});
const looseScope=values=>new Proxy(values,{has:()=>true,get:(target,key)=>{if(key===Symbol.unscopables)return undefined;if(key in target)return target[key];if(key in globalThis)return globalThis[key];return inert;},set:(target,key,value)=>(target[key]=value,true)});
const instruments=(events,budget)=>({
 crypto:{subtle:{digest:async(algorithm,data)=>{events.push(['digest',data.byteLength,view(budget)]);return webcrypto.subtle.digest(algorithm,data);}}},
 TextDecoder:class extends TextDecoder{decode(input,options){events.push(['decode',input.byteLength,view(budget)]);return super.decode(input,options);}},
 JSON:{parse:(text,reviver)=>{events.push(['parse',text.length,view(budget)]);return JSON.parse(text,reviver);},stringify:JSON.stringify},
});
const encode=value=>new TextEncoder().encode(JSON.stringify(value));
const SOURCE=sha('fixture source pbf');
function documents({shards=1,partitioned=false,boundaryPoints}={}){
 const points=boundaryPoints===undefined?ring(13.3,52.4,13.5,52.6):[...Array.from({length:boundaryPoints},(_,i)=>[13.3+(i%1000)*1e-4,52.4+Math.floor(i/1000)*1e-4]),[13.3,52.4]];
 const boundary=encode({type:'FeatureCollection',city:'berlin',source_pbf_sha256:SOURCE,features:[{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[points]}}]});
 const pageRaw=encode({schema_version:1,city:'berlin',source_pbf_sha256:SOURCE,city_boundary_sha256:sha(boundary),bbox_kind:'compiled-mesh-ground-envelope',shards:[{id:'leaf',tile_key:'leaf',path:'/safety/buildings3d/berlin/leaf.json',sha256:sha('leaf'),bytes:100,vertices:3,bbox:[13.3,52.4,13.4,52.5],lod:1}]});
 const page=new Uint8Array(gzipSync(pageRaw));
 const shardRows=Array.from({length:shards},(_,i)=>({id:'shard-'+i,tile_key:'tile-'+i,path:'/safety/buildings3d/berlin/shard-'+String(i).padStart(6,'0')+'.json',sha256:sha('shard '+i),bytes:1000+i,vertices:3,bbox:[13.3,52.4,13.31,52.41],lod:1}));
 const pageAsset={id:'partition-1',bbox:[13.3,52.4,13.5,52.6],path:'/safety/buildings3d/berlin/partition-1.json.gz',sha256:sha(page),bytes:page.byteLength,compression:'gzip',uncompressed_bytes:pageRaw.byteLength,uncompressed_sha256:sha(pageRaw)};
 const profileRaw=encode({schema_version:1,city:'berlin',profile:'fixture environment asset',values:Array.from({length:64},(_,i)=>i)}),profile=new Uint8Array(gzipSync(profileRaw));
 const profileAsset={path:'/safety/environment/water/profile.json.gz',sha256:sha(profile),bytes:profile.byteLength,compression:'gzip',uncompressed_bytes:profileRaw.byteLength,uncompressed_sha256:sha(profileRaw)};
 const index=encode({schema_version:1,city:'berlin',source_snapshot:'fixture snapshot',source_pbf_sha256:SOURCE,compiler_sha256:sha('compiler'),
  city_boundary:{path:'/safety/buildings3d/berlin/city-boundary.json',sha256:sha(boundary),bytes:boundary.byteLength},
  ...(partitioned?{index_type:'partitioned-city3d-v1',partitions:[pageAsset]}:{shards:shardRows})});
 return{index,boundary,page,pageRaw,pageAsset,profile,profileRaw,profileAsset,files:new Map([['/safety/buildings3d/index.json',index],['/safety/buildings3d/berlin/city-boundary.json',boundary],[pageAsset.path,page],[profileAsset.path,profile]])};
}
function network(budget,files,events,{hold=new Set()}={}){
 const calls=[];
 const read=(name,requestPath,signal,max)=>{
  const call={name,path:requestPath,signal,max,at:view(budget),gate:deferred()};calls.push(call);events.push(['read',requestPath,call.at]);
  const bytes=files.get(requestPath);if(!hold.has(requestPath))call.gate.resolve();
  return new Promise((resolve,reject)=>{
   const abort=()=>reject(signal.reason??new DOMException('Aborted','AbortError'));
   if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});
   call.gate.promise.then(()=>{signal.removeEventListener('abort',abort);if(signal.aborted)abort();else if(!bytes)reject(TypeError('Fixture network has no '+requestPath));else resolve(bytes.slice());},reject);
  });
 };
 return{calls,read,hold};
}
// One page: ledger, store, network, transport and the page's admission/solar modules.
function pageFixture({transport=false,limitBytes=64*MiB,shards,partitioned,hold,boundaryPoints,namespace='fixture-page'}={}){
 const events=[],budget=createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,8*MiB)}),store=createChunkResourceStore({budget});
 const docs=documents({shards,partitioned,boundaryPoints}),net=network(budget,docs.files,events,{hold}),modules=pageModules();
 const page=transport?createResourceByteTransport({namespace,resourceStore:store,read:(requestPath,signal,max)=>net.read('transport',requestPath,signal,max)}):undefined;
 return{events,budget,store,docs,net,page,modules};
}
function manager(family,{shared,partitionOwner,...settings}={}){
 const fixture=shared??pageFixture({...settings,namespace:'fixture-'+family}),{events,budget,store,docs,net,page,modules}=fixture,{solar,admission}=modules;
 const scope={events,
  renderer:{layer:{id:'fixture-'+family},destroy(){},setEnabled(){},setPageHidden(){},
   // The renderers' one-line setter: prepareSolarShadowBoundary(value). It records
   // whether the index was already admitted and cached for it.
   setSolarShadowBoundary(value){const cached=solar.currentSolarShadowBoundary(value.boundarySHA256),before=view(budget),prepared=solar.prepareSolarShadowBoundary(value,{budget});events.push(['solar-boundary',value.boundarySHA256,before,!!cached&&prepared===cached]);}},
  manifest:undefined,manifestSHA:undefined,boundary:undefined,partitions:undefined,partitionOptions:undefined,bootstrapRetained:undefined,facadeHelpers:undefined,
  destroyed:false,active:0,peak:0,city:'berlin',mobile:false,resources:store,resourceStore:store,ResourceBudgetExceededError,resourceByteReadEnvelope,resourceByteAdmittedEnvelope,
  acquireManagerBootstrap:admission.acquireManagerBootstrap,ManagerAdmissionRetry:admission.ManagerAdmissionRetry,retryManagerAdmission:admission.retryManagerAdmission,admitSolarShadowBoundary:solar.admitSolarShadowBoundary,currentSolarShadowBoundary:solar.currentSolarShadowBoundary,
  exposeLifetime(controller){scope.fetchLifetime=controller;},
  request:new AbortController(),preparingTicket:1,wantedMode:'3d',pageHidden:false,documentHidden:false,viewportVisible:true,suspended:false,
  cameraMotionTicket:undefined,ownCameraStartingTicket:undefined,visibleLoadsPending:0,s434Aggregate:{pending:false,clear(){}},
  recoveryResident:createRecoveryResidentReuse(()=>undefined),modeRequests:createViewportRequestContinuation(()=>false),
  installThreeDimensionalPartitions(options){scope.partitionOptions=options;return partitionOwner?partitionOwner(options):{fixture:'partition owner',clear(){}};}};
 Object.assign(scope,instruments(events,budget),familyModules(family));
 scope.options=page?{acquireBytes:page.acquireBytes,fetchBytes:(requestPath,signal,max)=>{events.push(['compat-read',requestPath]);return page.readBytes(requestPath,signal,max);}}:{fetchBytes:(requestPath,signal,max)=>net.read('raw',requestPath,signal,max)};
 const {body,destroy}=sources.get(family),api=new Function('env','with(env){'+body+'}')(strictScope(scope));
 scope.queue=[];
 const lifecycle=code=>new Function('env','with(env){'+code+'}')(looseScope(scope));
 return{family,fixture,events,budget,store,docs,net,scope,page,modules,
  ensure:signal=>api.ensure(signal),stats:api.stats,destroy:()=>lifecycle(destroy)(),
  readAsset:(asset,signal,max)=>api.readAsset(asset,signal,max)};
}
const kinds=events=>events.map(([kind,detail])=>kind==='read'||kind==='compat-read'?kind+' '+detail:kind);
const retained=(m,value)=>m.scope.estimateRetainedBuildingPayload(value).retainedPayloadEstimateBytes;
async function parsedEstimates(family,settings){
 const probe=manager(family,settings);await probe.ensure(new AbortController().signal);
 const value={manifest:retained(probe,probe.scope.manifest),boundary:retained(probe,probe.scope.boundary),boundaryBytes:probe.docs.boundary.byteLength,shadow:view(probe.budget).shadow};
 probe.destroy();probe.page?.destroy();return value;
}

test('every manager joins the page\'s shared bootstrap with one key and keeps the renderer branch first',()=>{
 for(const family of families){
  const {ast,install,text}=sources.get(family),ensure=install.body.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='ensure');
  assert(ts.isIfStatement(ensure.body.statements[0])&&ensure.body.statements[0].expression.getText(ast)==='!renderer',family);
  const body=ensure.getText(ast),commit=body.indexOf('manifest=value;renderer!.setSolarShadowBoundary({geometry:boundary,boundarySHA256:value.city_boundary.sha256});');
  assert(commit>0,family+' keeps the boundary commit');
  assert(body.indexOf("acquireManagerBootstrap({budget:")>0&&body.indexOf("key:JSON.stringify(['painted-3d-bootstrap-v1',city,'/safety/buildings3d/index.json'])")>0,family+' joins the one page bootstrap key');
  assert(/await admitSolarShadowBoundary\(\{geometry:shared\.value\.boundary,boundarySHA256:value\.city_boundary\.sha256\},\{budget:resources?(?:Store)?\.budget,signal\}\);signal\.throwIfAborted\(\);/.test(body.slice(0,commit)),family+' awaits the boundary index admission before the renderer receives the boundary');
  // The await and the commit each follow, in the same synchronous run, a check that
  // the index is still cached; an evicted index returns the lease and loops.
  assert(/for\(;;\)\{\s*const shared=await acquireManagerBootstrap\(/.test(body),family+' re-acquires the bootstrap after returning an evicted lease');
  assert(/if\(currentSolarShadowBoundary\(value\.city_boundary\.sha256\)\)\{\s*await admitSolarShadowBoundary\(/.test(body),family+' awaits the index only while it is cached');
  assert(body.includes('if(currentSolarShadowBoundary(value.city_boundary.sha256)){bootstrapRetained?.release();bootstrapRetained=shared;')&&body.indexOf('if(currentSolarShadowBoundary(value.city_boundary.sha256)){bootstrapRetained')<commit,family+' commits only while the index is cached');
  assert(/\}catch\(error\)\{if\(bootstrapRetained!==shared\)shared\.release\(\);throw error;\}\s*shared\.release\(\);\s*\}/.test(body),family+' returns an uncommitted lease before it loops');
  assert(!/page\.claim\.release\(\)/.test(text),family+' no longer returns a partition page claim inside read()');
  assert(!/budget\.onAvailable|setTimeout|setInterval/.test(sources.get(family).body),family+' manager ingress registers no wait of its own and no timer');
  // readAsset is caller-admitted: no admission, retry or wait of its own.
  assert(!/retryManagerAdmission|parseBootstrap|admitBootstrap|tryReserve|\.reserve\(|onAvailable|awaitManagerCapacity/.test(sources.get(family).readAssetText),family+' readAsset admits nothing beside its caller\'s claim');
 }
 assert.equal(new Set(families.map(family=>sources.get(family).readAssetText)).size,1,'one readAsset text in all seven managers');
});

test('F1: managers that would each hold a manifest while waiting for a boundary share one bootstrap and both complete',async()=>{
 const settings={shards:700,boundaryPoints:40_000},estimates=await Promise.all(['root500','infill'].map(family=>parsedEstimates(family,settings)));
 const B=estimates[0].boundaryBytes,work=28*B+64,held=estimates[0].manifest+estimates[1].manifest;
 // The interval in which two private copies deadlocked: either could proceed if the other let go.
 const limitBytes=held+B+work-Math.floor(Math.min(estimates[0].manifest,estimates[1].manifest)/2)+4096;
 for(const transport of [true,false]){
  const shared=pageFixture({transport,limitBytes,...settings}),pair=['root500','infill'].map(family=>manager(family,{shared}));
  const outcomes=await Promise.all(pair.map(m=>outcomeOf(m.ensure(m.scope.request.signal))));
  assert.deepEqual(outcomes,['fulfilled','fulfilled'],(transport?'transport':'raw')+' both managers complete; ledger '+JSON.stringify(view(shared.budget)));
  assert.deepEqual(shared.net.calls.map(call=>call.path),['/safety/buildings3d/index.json','/safety/buildings3d/berlin/city-boundary.json'],'one read per bootstrap file');
  assert.equal(pair[0].scope.manifest,pair[1].scope.manifest,'one parsed manifest');assert.equal(pair[0].scope.boundary,pair[1].scope.boundary,'one parsed boundary');
  const own=retained(pair[0],pair[0].scope.manifest)+retained(pair[0],pair[0].scope.boundary),settled=view(shared.budget);
  assert.deepEqual([settled.metadata,settled.construction,settled.decoded,settled.inflate,settled.listeners],[own,0,0,0,0],'the shared pair is charged once');
  assert(pair.every(m=>m.scope.bootstrapRetained.bytes===own));
  pair[0].destroy();assert.equal(view(shared.budget).metadata,own,'still read by the other manager');pair[1].destroy();assert.equal(view(shared.budget).metadata,0,'the last lease returns it');
  shared.page?.destroy();assert.equal(shared.budget.stats.bytes-view(shared.budget).shadow,0,'only the page\'s cached solar index remains');
 }
});

test('seven managers of a page wait holding nothing while one production reads, then all receive the one parsed value',async()=>{
 const shared=pageFixture({transport:true,shards:700,hold:new Set(['/safety/buildings3d/berlin/city-boundary.json'])}),all=families.map(family=>manager(family,{shared}));
 const running=Promise.all(all.map(m=>m.ensure(m.scope.request.signal)));
 await until(()=>shared.net.calls.length===2);
 const during=view(shared.budget),manifestCost=all[0].scope.estimateRetainedBuildingPayload(JSON.parse(new TextDecoder().decode(shared.docs.index))).retainedPayloadEstimateBytes;
 assert.equal(shared.page.stats.consumers,1,'one transport consumer: the producing manager');
 assert.deepEqual([during.metadata,during.construction,during.decoded],[manifestCost,0,0],'only the producer\'s one manifest estimate is held; six waiting managers hold nothing');
 shared.net.calls[1].gate.resolve();assert.equal(await outcomeOf(running),'fulfilled');
 assert(all.every(m=>m.scope.manifest===all[0].scope.manifest&&m.scope.manifestSHA===sha(shared.docs.index)),'one shared manifest and its own SHA');
 const own=retained(all[0],all[0].scope.manifest)+retained(all[0],all[0].scope.boundary);assert.equal(view(shared.budget).metadata,own,'charged once for seven managers');
 assert(shared.events.filter(([kind,,,hit])=>kind==='solar-boundary'&&hit).length===families.length,'every renderer reaches the admitted index');
 for(const m of all.slice(0,6))m.destroy();assert.equal(view(shared.budget).metadata,own);all[6].destroy();assert.equal(view(shared.budget).metadata,0);shared.page.destroy();
});

test('a producing manager destroyed mid-read hands the production to a waiting manager',async()=>{
 for(const transport of [true,false]){
  const label=transport?'transport':'raw',shared=pageFixture({transport,hold:new Set(['/safety/buildings3d/berlin/city-boundary.json'])}),[producer,waiter]=['root500','infill'].map(family=>manager(family,{shared}));
  const first=producer.ensure(producer.scope.request.signal),second=waiter.ensure(waiter.scope.request.signal);
  await until(()=>shared.net.calls.length===2);producer.destroy();
  assert.equal(await outcomeOf(first),'AbortError',label);await until(()=>shared.net.calls.length>=3&&shared.net.calls.at(-1).path.endsWith('city-boundary.json'));
  assert(shared.net.calls[1].signal.aborted,label+' the abandoned boundary read is cancelled');
  shared.net.hold.clear();shared.net.calls.at(-1).gate.resolve();assert.equal(await outcomeOf(second),'fulfilled',label+' the waiting manager produced the bootstrap itself');
  assert.ok(waiter.scope.manifest,label);const own=retained(waiter,waiter.scope.manifest)+retained(waiter,waiter.scope.boundary);assert.equal(view(shared.budget).metadata,own,label+' one claim');
  waiter.destroy();shared.page?.destroy();assert.equal(view(shared.budget).metadata,0,label);
 }
});

test('the boundary stage is admitted at once before its read, or waits holding nothing',async()=>{
 for(const transport of [false,true])for(const family of ['root500','city']){
  const label=family+(transport?' transport':' raw'),m=manager(family,{transport,limitBytes:32*MiB,boundaryPoints:40_000}),B=m.docs.boundary.byteLength,work=28*B+64,envelope=8*MiB;
  const gate=m.budget.reserve({category:'mask',bytes:20*MiB,precision:'estimate'},{label:'fixture gate'});
  const running=m.ensure(m.scope.request.signal);
  await until(()=>m.net.calls.length===1&&m.budget.stats.availabilityListeners===1);await flush();
  assert.deepEqual(kinds(m.events),['read /safety/buildings3d/index.json','digest','decode','parse'],label+': no boundary read while its stage cannot be admitted');
  const waiting=view(m.budget);
  assert.deepEqual([waiting.bytes-waiting.recent,waiting.metadata,waiting.construction,waiting.decoded],[20*MiB,0,0,0],label+': the manifest estimate is returned while it waits');
  gate.release();assert.equal(await outcomeOf(running),'fulfilled',label);
  const boundaryRead=m.net.calls.find(call=>call.path.endsWith('city-boundary.json')),beyond=B+work-envelope;
  assert.deepEqual([boundaryRead.at.read-(transport?boundaryRead.at.recent:0),boundaryRead.at.construction],[envelope,beyond],label+': the read envelope and the working set beyond it are one admission before the read');
  const digest=m.events.filter(([kind])=>kind==='digest').at(-1)[2];
  assert.deepEqual([digest.read-(transport?digest.recent:0),digest.construction,digest.decoded],[B,4*B,24*B+64],label+': the exact read and working set before the SHA copy');
  m.destroy();m.page?.destroy();assert.equal(m.budget.stats.bytes-view(m.budget).shadow,0,label);
 }
});

test('the boundary\'s solar index is charged before the renderer receives the boundary, which reaches the cached index',async()=>{
 for(const transport of [false,true])for(const family of families){
  const label=family+(transport?' transport':' raw'),m=manager(family,{transport,boundaryPoints:2_000});await m.ensure(m.scope.request.signal);
  const value={geometry:m.scope.boundary,boundarySHA256:m.scope.manifest.city_boundary.sha256},index=m.modules.solar.solarShadowBoundaryIndexBytes(value)+m.modules.solar.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
  const [kind,hash,before,hit]=m.events.at(-1);
  assert.deepEqual([kind,hash,hit],['solar-boundary',value.boundarySHA256,true],label+' the renderer\'s synchronous preparation hits the admitted index');
  assert.equal(before.shadow,index,label+' exact index bytes plus the wrapper estimate are charged before the renderer receives the boundary');
  const stats=m.modules.solar.solarShadowBoundaryCacheStats();assert.deepEqual([stats.overBudgetPreparations,stats.unchargedBytes,stats.pendingCharges],[0,0,0],label+' no allocate-then-charge preparation');
  m.destroy();m.page?.destroy();
 }
});

test('readAsset is caller-admitted: one parse working set beside the caller\'s claim, and the exact read lease held until decoding returns',async()=>{
 for(const transport of [true,false])for(const family of families){
  const label=family+(transport?' transport':' raw'),m=manager(family,{transport});await m.ensure(m.scope.request.signal);
  const {profile,profileRaw,profileAsset}=m.docs,manifestPath='/safety/environment/berlin/index.json',manifestBytes=encode({schema_version:1,city:'berlin',tiles:[]});
  m.docs.files.set(manifestPath,manifestBytes);
  // A verified descriptor (SHA copy before decoding) and a plain path (the
  // environment manifest, parsed by the manager's own decoder).
  for(const read of [{asset:profileAsset,max:profileAsset.bytes,costs:profileAsset,bytes:profile.byteLength,at:'digest',value:JSON.parse(new TextDecoder().decode(profileRaw))},{asset:manifestPath,max:MiB,costs:{bytes:MiB},bytes:manifestBytes.byteLength,at:'parse',value:{schema_version:1,city:'berlin',tiles:[]}}]){
   const name=label+' '+(typeof read.asset==='string'?'path':'descriptor');
   // The runtime callers pre-admit environmentJsonReadCosts before they call readAsset.
   const caller=m.budget.reserve(environmentJsonReadCosts(read.costs,'caller pre-admission'),{label:'caller pre-admission'}),before=view(m.budget);m.events.length=0;
   assert.deepEqual(await m.readAsset(read.asset,new AbortController().signal,read.max),read.value,name);
   assert(!m.events.some(([kind])=>kind==='compat-read'),name+' never the compatibility reader');
   const at=m.events.find(([event])=>event===read.at)[2];
   assert.deepEqual([at.construction,at.inflate,at.decoded,at.metadata,at.listeners],[before.construction,before.inflate,before.decoded,before.metadata,0],name+' '+read.at+': no working set beside the caller\'s, so one parse is charged once');
   assert.deepEqual([at.read-before.read,at.recent-before.recent],[transport?read.bytes:0,0],name+' '+read.at+(transport?': the exact transport lease is held, not recent':': a raw read charges nothing of its own'));
   const after=view(m.budget);
   assert.deepEqual([after.construction,after.inflate,after.decoded,after.metadata,after.listeners,after.read-after.recent],[before.construction,before.inflate,before.decoded,before.metadata,0,before.read-before.recent],name+' the read lease is returned after decoding; the value belongs to the caller');
   caller.release();
  }
  m.destroy();m.page?.destroy();
 }
});

test('a verified descriptor is read with its own byte count as the ceiling, so the transport envelope is sized by the asset',async()=>{
 for(const transport of [true,false])for(const family of families){
  const label=family+(transport?' transport':' raw'),m=manager(family,{transport});await m.ensure(m.scope.request.signal);
  const {profile,profileAsset}=m.docs,P=profile.byteLength,plain='/safety/environment/berlin/index.json',before=view(m.budget);
  m.docs.files.set(plain,encode({schema_version:1}));
  await m.readAsset(profileAsset,new AbortController().signal,MiB);
  const call=m.net.calls.find(row=>row.path===profileAsset.path);
  assert.equal(call.max,P,label+' the descriptor\'s byte count, not the caller\'s 1 MiB ceiling');
  assert.equal(call.at.read-before.read,transport?2*P:0,label+(transport?' a two-copy envelope of the asset, not of 1 MiB':' a raw read admits nothing'));
  assert.deepEqual(await m.readAsset(plain,new AbortController().signal,MiB),{schema_version:1},label);
  assert.equal(m.net.calls.find(row=>row.path===plain).max,MiB,label+' a plain path keeps the caller\'s ceiling');
  m.destroy();m.page?.destroy();
 }
});

test('two callers each holding their pre-admission both complete: beside them readAsset needs only the transport envelope',async()=>{
 for(const family of families){
  const m=manager(family,{transport:true});await m.ensure(m.scope.request.signal);
  const {profileAsset,profile,profileRaw}=m.docs,P=profile.byteLength,R=profileRaw.byteLength,costs=label=>environmentJsonReadCosts(profileAsset,label),X=sum(costs('x'));
  // The self-admitting reader needed the read and its whole parse working set again.
  m.page.clear();const stage=4*P+29*R+64,s=m.budget.stats;
  const blocker=m.budget.reserve({category:'mask',bytes:s.limitBytes-(s.bytes-s.recentBytes)-2*X-(stage-1),precision:'estimate',label:'other page holders'});
  const a=m.budget.reserve(costs('caller A')),b=m.budget.reserve(costs('caller B'));
  assert.equal(m.budget.stats.availableBytes+m.budget.stats.recentBytes,stage-1,family+' one byte short of the old stage');assert(2*P<=stage-1);
  const reads=[a,b].map(()=>m.readAsset(profileAsset,new AbortController().signal,profileAsset.bytes));
  assert.deepEqual(await Promise.all(reads.map(read=>outcomeOf(read))),['fulfilled','fulfilled'],family+' neither caller waits on the other');
  assert.equal(m.budget.stats.availabilityListeners,0,family);
  a.release();b.release();blocker.release();m.destroy();m.page.destroy();
 }
});

test('the only wait inside readAsset is the page transport\'s own envelope admission: the manager adds no claim or listener',async()=>{
 for(const family of families){
  const m=manager(family,{transport:true});await m.ensure(m.scope.request.signal);
  m.page.clear();const {profileAsset,profile}=m.docs,P=profile.byteLength,caller=m.budget.reserve(environmentJsonReadCosts(profileAsset,'caller')),s=m.budget.stats;
  const blocker=m.budget.reserve({category:'mask',bytes:s.limitBytes-(s.bytes-s.recentBytes)-(2*P-1),precision:'estimate',label:'other page holders'}),held=view(m.budget);
  assert.equal(m.budget.stats.availableBytes+m.budget.stats.recentBytes,2*P-1,family+' the envelope does not fit');
  const reading=m.readAsset(profileAsset,new AbortController().signal,profileAsset.bytes);
  assert.equal(await outcomeOf(reading,50),'pending',family);
  const waiting=view(m.budget);
  assert.deepEqual([waiting.bytes,waiting.reservations,waiting.listeners,m.page.stats.consumers],[held.bytes,held.reservations,1,1],family+' one transport registration; nothing charged by the manager while it waits');
  blocker.release();assert.equal(await outcomeOf(reading),'fulfilled',family);assert.equal(m.budget.stats.availabilityListeners,0);
  caller.release();m.destroy();m.page.destroy();
 }
});

test('destroy cancels a transport readAsset through the family\'s fetch lifetime, and no family decodes or keeps a lease after destroy',async()=>{
 for(const family of families){
  const m=manager(family,{transport:true,hold:new Set(['/safety/environment/water/profile.json.gz'])});await m.ensure(m.scope.request.signal);
  const {profileAsset}=m.docs,before=view(m.budget),caller=new AbortController();m.events.length=0;
  const reading=m.readAsset(profileAsset,caller.signal,profileAsset.bytes);
  await until(()=>m.net.calls.some(call=>call.path===profileAsset.path));
  const call=m.net.calls.find(call=>call.path===profileAsset.path);m.destroy();
  if(sources.get(family).lifetime){
   assert.equal(await outcomeOf(reading),'AbortError',family+' the fetch lifetime cancels the read at once');assert(call.signal.aborted,family+' the transport read is cancelled');
  }else{
   assert.equal(await outcomeOf(reading,20),'pending',family+' this family\'s destroy does not cancel active fetches');
   call.gate.resolve();assert.equal(await outcomeOf(reading),'AbortError',family+' a lease delivered after destroy is returned');
  }
  assert.equal(caller.signal.aborted,false,family+' the caller\'s controller is not aborted');
  assert(!m.events.some(([kind])=>kind==='digest'||kind==='parse'),family+' nothing is decoded after destroy');
  await flush();const after=view(m.budget);
  assert.deepEqual([m.page.stats.consumers,after.listeners,after.read-after.recent],[0,0,before.read-before.recent],family+' no transport consumer, listener or held read remains');
  call.gate.resolve();m.page.destroy();
 }
});

test('a read lease delivered to an abandoned readAsset is returned exactly once',async()=>{
 for(const family of families){
  const m=manager(family,{transport:true});await m.ensure(m.scope.request.signal);
  const {profile,profileAsset}=m.docs,controller=new AbortController();let released=0,delivered=0;
  // The caller aborts between the transport's delivery and the fetch queue's settlement.
  m.scope.options.acquireBytes=async()=>({get bytes(){delivered++;queueMicrotask(()=>controller.abort());return profile;},release(){released++;}});
  assert.equal(await outcomeOf(m.readAsset(profileAsset,controller.signal,profileAsset.bytes)),'AbortError',family);
  assert.deepEqual([delivered>0,released],[true,1],family+' the delivered lease is returned, once');
  assert.equal(m.stats().active,0,family+' the fetch slot is free');
  m.destroy();m.page.destroy();
 }
});

test('a manager whose solar index is evicted before its commit returns the lease and hands the index off again',async()=>{
 for(const point of ['before-await','after-await'])for(const family of ['city','bremen']){
  const label=family+' '+point,m=manager(family,{transport:true,boundaryPoints:2_000}),{solar}=m.modules,evict=()=>{for(let i=0;i<2;i++)solar.prepareSolarShadowBoundary(solarValue(freshHash()),{budget:m.budget});};
  const acquire=m.scope.acquireManagerBootstrap,admit=m.scope.admitSolarShadowBoundary;let acquisitions=0;const admits=[];
  m.scope.acquireManagerBootstrap=async options=>{const lease=await acquire(options);if(++acquisitions===1&&point==='before-await')evict();return lease;};
  m.scope.admitSolarShadowBoundary=async(value,options)=>{admits.push(!!solar.currentSolarShadowBoundary(value.boundarySHA256));const prepared=await admit(value,options);if(admits.length===1&&point==='after-await')evict();return prepared;};
  assert.equal(await outcomeOf(m.ensure(m.scope.request.signal)),'fulfilled',label);
  assert.equal(acquisitions,2,label+' the evicted lease was returned and the bootstrap acquired again');
  assert.deepEqual(admits,point==='before-await'?[true]:[true,true],label+' the index is awaited only while it is cached');
  const [kind,,,hit]=m.events.at(-1);assert.deepEqual([kind,hit],['solar-boundary',true],label+' the renderer reaches the charged index');
  assert.equal(solar.solarShadowBoundaryCacheStats().overBudgetPreparations,0,label);
  assert.deepEqual(m.modules.admission.managerBootstrapStats(m.budget).entries.map(entry=>entry.leases),[1],label+' one lease: the commit');
  assert.equal(m.budget.stats.availabilityListeners,0,label);
  m.destroy();m.page.destroy();
 }
});

test('City loadShard finishes its paint-initialization wait before it acquires a source lease or parent',async()=>{
 const {loadShard}=sources.get('city');assert.ok(loadShard,'city manager loadShard');
 const text=sources.get('city').text,start=text.indexOf('async function loadShard('),body=text.slice(start,text.indexOf('\n',start));
 assert.equal((body.match(/prepareInlineCityMaterials\(/g)??[]).length,1,'one paint-initialization wait');
 const wait=body.indexOf('await prepareInlineCityMaterials(city,signal,options.awaitPaintInitialization)');
 for(const acquire of ['acquireSelected(','sourceClient.acquire(','context.retainParent('])assert(wait>0&&wait<body.indexOf(acquire),'the wait precedes '+acquire);
 const events=[],gate=deferred(),controller=new AbortController();
 const scope={city:'munich',maxVertices:200000,signal:controller.signal,sourceContentKey:()=>'fixture-content',
  options:{awaitPaintInitialization:operation=>operation,detailRuntime:{acquireSelected:async()=>{events.push('acquireSelected');throw Error('fixture stop');}}},
  prepareInlineCityMaterials:async(city,signal,wait)=>{events.push(['inline',city,typeof wait]);await gate.promise;signal.throwIfAborted();},
  sourceClient:{acquire:async()=>{events.push('source acquire');throw Error('fixture stop after the ordering point');}}};
 const run=new Function('env','with(env){'+loadShard+'}')(looseScope(scope));
 const context={retainParent(){events.push('retainParent');},adjust(){return true;},budget:{stats:{}}};
 const pending=run({path:'/safety/buildings3d/munich/shard.json',sha256:'a'.repeat(64),bytes:5,tile_key:'t'},controller.signal,undefined,context);await flush();
 assert.deepEqual(events,[['inline','munich','function']],'no source lease or parent is held while paint initialization is awaited');
 gate.resolve();await assert.rejects(pending,/fixture stop after the ordering point/);assert.deepEqual(events.slice(1),['source acquire']);
 const aborted=new AbortController(),blocked=deferred();scope.prepareInlineCityMaterials=async(city,signal)=>{await blocked.promise;signal.throwIfAborted();};events.length=0;
 const cancelled=run({path:'/safety/buildings3d/munich/shard.json',sha256:'a'.repeat(64),bytes:5,tile_key:'t'},aborted.signal,undefined,context);aborted.abort();blocked.resolve();
 await assert.rejects(cancelled,{name:'AbortError'});assert.deepEqual(events,[],'a request cancelled during the wait acquires nothing');
});

test('a manager\'s partition read hands its page claim to the actual partition owner, which keeps only the rows\' estimate until clear()',async()=>{
 const owners=Object.fromEntries(families.map(family=>[family,load(src('painted',family,'safety','three-dimensional-partitions.ts'))]));
 for(const transport of [true,false])for(const family of families){
  const label=family+(transport?' transport':' raw'),m=manager(family,{transport,partitioned:true,partitionOwner:options=>owners[family].installThreeDimensionalPartitions(options)});
  await m.ensure(m.scope.request.signal);const bootstrap=view(m.budget),{page,pageRaw,pageAsset}=m.docs;m.events.length=0;
  const result=await m.scope.partitions.resolve(pageAsset.bbox,new AbortController().signal);
  assert.deepEqual(result.shards.map(row=>row.id),['leaf'],label);
  const digest=m.events.find(([kind])=>kind==='digest')[2];
  assert.deepEqual([digest.inflate-bootstrap.inflate,digest.construction-bootstrap.construction,digest.decoded-bootstrap.decoded],[page.byteLength+3*pageRaw.byteLength,2*page.byteLength+2*pageRaw.byteLength,24*pageRaw.byteLength+64],label+' the page working set is admitted before its SHA copy');
  const rows=m.scope.partitions.stats.retainedPayloadEstimateBytes,held=view(m.budget);
  assert(rows>0,label);
  assert.deepEqual([held.metadata-bootstrap.metadata,held.construction,held.inflate,held.decoded,held.read-held.recent,held.listeners],[rows,0,0,0,bootstrap.read-bootstrap.recent,0],label+' only the cached rows\' estimate stays beside the bootstrap; the raw page read is returned');
  m.scope.partitions.clear();assert.deepEqual([view(m.budget).metadata,view(m.budget).construction],[bootstrap.metadata,0],label+' clear() returns the page claim');
  m.destroy();m.page?.destroy();
 }
});
