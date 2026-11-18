import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import v8 from 'node:v8';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// Compositor-main adoption of the stage-1 core interfaces. The real painted-map
// compositor and the real lazy adapter run with the real page ledger, chunk
// store, byte transport, program-preparation module and planar reflection
// group. Fixtures: the null-profile city data, the painted provider modules
// (inert managers that keep the options they are handed), a controllable Frozen
// initializer session, and the network bytes. program-preparation is the actual
// module; only the compositor's releaseRecentPrograms import is observed.
const web=fileURLToPath(new URL('../',import.meta.url)),source=path.join(web,'src/safety');
const substitutes={'painted-map.ts':process.env.COMPOSITOR_MAIN_PAINTED_MAP,'three-dimensional-lazy.ts':process.env.COMPOSITOR_MAIN_LAZY};
const registry=JSON.parse(await readFile(path.join(source,'paint-asset-registry.json'),'utf8'));
const MiB=1024**2;
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate,label){for(let i=0;i<200;i++){if(predicate())return;await settle();}assert.fail(label);}
const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return{promise,resolve};};
v8.setFlagsFromString('--expose_gc');const gc=vm.runInNewContext('gc');

const slot='__compositorMainFixture'+Math.random().toString(16).slice(2);
const fixtureModules={
  'virtual:crimemaps-city-data':'export const profileSHA256=null;export const buildingFocusRegistry=undefined;export const buildingDetailCatalog=undefined;export default null;',
  // The compositor's Frozen session: a controllable stand-in (only the latest begun session is active).
  'frozen-paint-tables':`export const beginFrozenPaintTableInitialization=(...args)=>globalThis[${JSON.stringify(slot)}].begin(...args);export const frozenPaintTableStats=()=>({});export const createFrozenDataResourceOwner=()=>({client:provider=>({provider,dispose(){}}),stats:{active:0,queued:0,waiters:0},destroy(){}});`,
  'program-preparation':`import * as actual from ${JSON.stringify(path.join(source,'render-runtime/program-preparation.ts'))};export * from ${JSON.stringify(path.join(source,'render-runtime/program-preparation.ts'))};export function releaseRecentPrograms(scope){globalThis[${JSON.stringify(slot)}].events.push(['releaseRecentPrograms',scope]);return actual.releaseRecentPrograms(scope);}`,
};
const entry=[
  "export {installThreeDimensionalMap as installCompositor} from './painted-map';",
  "export {installThreeDimensionalMap as installLazy} from './three-dimensional-lazy';",
  "export {createChunkResourceStore} from './render-runtime/chunk-resource-store';",
  "export {createResourceBudget} from './render-runtime/resource-budget';",
  "export {resourceByteAdmittedEnvelope} from './resource-byte-transport';",
  "export {getRecentProgramStats} from './render-runtime/program-preparation';",
].join('\n');
const text=(await build({stdin:{contents:entry,resolveDir:source,sourcefile:'compositor-main-entry.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,logLevel:'silent',plugins:[{name:'compositor-main-inputs',setup(builder){
  builder.onResolve({filter:/^virtual:crimemaps-city-data$/},()=>({path:'virtual:crimemaps-city-data',namespace:'compositor-main-fixture'}));
  builder.onResolve({filter:/^\.\/frozen-paint-tables$/},args=>args.importer.endsWith('painted-map.ts')?{path:'frozen-paint-tables',namespace:'compositor-main-fixture'}:undefined);
  builder.onResolve({filter:/^\.\/render-runtime\/program-preparation$/},args=>args.importer.endsWith('painted-map.ts')?{path:'program-preparation',namespace:'compositor-main-fixture'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'compositor-main-fixture'},args=>({loader:'js',contents:fixtureModules[args.path],resolveDir:source}));
  builder.onResolve({filter:/painted\/[^/]+\/safety\/(?:three-dimensional-map|building-mesh-renderer)$/},args=>({path:args.path,namespace:'compositor-main-provider'}));
  builder.onLoad({filter:/.*/,namespace:'compositor-main-provider'},args=>({loader:'js',contents:args.path.endsWith('building-mesh-renderer')?'export const inertRenderer=true;':
    `export const installThreeDimensionalMap=options=>globalThis[${JSON.stringify(slot)}].provider(${JSON.stringify(args.path.split('painted/')[1].split('/')[0])},options);`}));
  builder.onLoad({filter:/[\\/]safety[\\/](?:painted-map|three-dimensional-lazy)\.ts$/},async args=>{const file=substitutes[path.basename(args.path)];return file?{contents:await readFile(file,'utf8'),loader:'ts',resolveDir:path.dirname(args.path)}:undefined;});
}}]})).outputFiles[0].text;

function session(gate){
  let active=true,ended;const waiters=new Set();
  const end=error=>{if(!active)return;active=false;ended=error;endSession(error);for(const waiter of [...waiters]){waiters.delete(waiter);waiter.reject(error);}};
  // Like the actual session: wait races the operation with this session's end.
  let endSession;const ending=new Promise((_resolve,reject)=>{endSession=reject;});void ending.catch(()=>{});
  return{get active(){return active;},wait:operation=>Promise.race([gate?gate.promise.then(()=>operation):operation,ending]),
    settled(signal){
      if(!active)return Promise.reject(ended);
      return new Promise((resolve,reject)=>{const waiter={resolve,reject:error=>{signal.removeEventListener('abort',abort);reject(error);}};const abort=()=>{waiters.delete(waiter);reject(signal.reason);};waiters.add(waiter);signal.addEventListener('abort',abort,{once:true});waiter.resolve=()=>{signal.removeEventListener('abort',abort);resolve();};});
    },
    close(){end(new DOMException('Session closed','AbortError'));},
    settle(){for(const waiter of [...waiters]){waiters.delete(waiter);waiter.resolve();}},fail:end,get waiters(){return waiters.size;}};
}
let instance=0;
async function load(t,{location={hostname:'test.invalid'},weak=false}={}){
  const saved={document:globalThis.document,location:globalThis.location};
  globalThis.document={hidden:false};globalThis.location=location;
  const fixture={captured:new Map(),weakRefs:[],sessions:[],events:[],assetReads:[],gate:undefined,repaints:0,failMode:undefined,readiness:{}};
  globalThis[slot]={events:fixture.events,
    begin(_ingress,signal){fixture.sessions.at(-1)?.fail(new DOMException('Session replaced','AbortError'));const value=session(fixture.gate);signal.addEventListener('abort',()=>value.fail(new DOMException('Session aborted','AbortError')),{once:true});fixture.sessions.push(value);return value;},
    provider(provider,options){
      let mode='2d';
      const renderer={layer:{id:'compositor-main-'+provider,onAdd(){}},stats:{vertices:0,components:0},selected:undefined,
        getRevision:()=>({generation:1,viewRevision:1}),setPageHidden(){},setReducedMotion(){},setOpacityContext(){},setSceneEnvironment(){},clearSelection(){},
        diagnosticScreenSamples:()=>[],isPickReady:()=>true,getDrawReadiness:()=>({ready:true,preparing:false}),getPlanarReflectionRevision:()=>'r',
        renderPlanarReflection:()=>({triangles:0,draws:0,complete:true}),
        getProgramPreparationStats:()=>[{provider,pendingResources:[{resource:'x'}],failures:[],budget:{waitingForAvailability:provider==='tier300',budgetWaits:3,refusedRecipes:1,unfitFailures:0,lastPressure:{capacity:10,required:12,current:9,recentCapacity:1,recentRequired:0,recentCurrent:0,shortfallBytes:2,recentShortfallBytes:0,additionalBytes:3,constraint:'total',label:'program '+provider,rows:[1,2]},scope:'s'},recent:{scope:'page',entries:2,contextEntries:1,bytes:524288,shareLimitBytes:1048576,maxEntries:128,draining:0,drainsStarted:1,retained:2,hits:1,evictedPressure:0,evictedCapacity:0,released:0,refused:0,lost:0,ownerHits:1,ownerDefault:false},context:{pending:4,dispatch:{turns:9,yieldReasons:{slice:2},visibleStartsTotal:5,captureStartsTotal:2,deadlineCaptureStarts:1,deferredCaptures:3,deferredCaptureJobs:2,visibleDeadlineActive:true,longestTurn:{elapsedMs:12,steps:3,yieldReason:'slice',source:'s',resource:'r',priority:'visible',phase:'link-submit',stepMs:9}}}}]};
      const manager={async requestMode(next,signal){signal.throwIfAborted();if(next==='3d'&&fixture.failMode?.provider===provider)throw Error(fixture.failMode.message);if(next==='2d'&&fixture.readiness[provider])fixture.readiness[provider]={phase:'idle'};mode=next;if(next==='3d')options.onRenderer?.(renderer);return{mode,status:'ready'};},
        get mode(){return mode;},get wantedMode(){return mode;},
        async readAsset(...args){fixture.assetReads.push({provider,args});return 'asset';},
        getDrawReadinessDiagnostic:()=>fixture.readiness[provider],
        setPageHidden(){},setReducedMotion(){},setOpacityContext(){},cacheStats:()=>({}),suspend(){},resume(){},destroy(){}};
      if(weak)fixture.weakRefs.push(new WeakRef(manager),new WeakRef(renderer));else fixture.captured.set(provider,{options,renderer,manager});
      return manager;
    }};
  t.after(()=>{globalThis.document=saved.document;globalThis.location=saved.location;delete globalThis[slot];});
  const api=await import('data:text/javascript;base64,'+Buffer.from(text+'\n// compositor main '+(++instance)).toString('base64'));
  return{api,fixture};
}
function page(api,fixture,files=new Map()){
  const budget=api.createResourceBudget({limitBytes:64*MiB,recentLimitBytes:1024}),actual=api.createChunkResourceStore({budget}),registrations=[];
  // The actual page store, observed: its retirement-frame registrations and collections.
  const resourceStore=new Proxy(actual,{get(target,key){
    if(key==='onRetirementPending')return(request,signal)=>{registrations.push({request,signal});return target.onRetirementPending(request,signal);};
    if(key==='collectRetired')return()=>{fixture.events.push(['collectRetired']);return target.collectRetired();};
    return Reflect.get(target,key);}});
  const reads=[],held=new Set(),gates=new Map();
  const read=(target,signal,max)=>{reads.push({path:target,max});return new Promise((resolve,reject)=>{
    const abort=()=>reject(signal.reason??new DOMException('Aborted','AbortError'));if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});
    const gate=deferred();gates.set(target,gate);if(!held.has(target))gate.resolve();
    void gate.promise.then(()=>{signal.removeEventListener('abort',abort);const bytes=files.get(target);if(bytes)resolve(bytes.slice());else reject(TypeError('Fixture network has no '+target));});});};
  return{budget,actual,resourceStore,registrations,files,reads,held,release(target){held.delete(target);gates.get(target)?.resolve();},read};
}
function mapStub(fixture){
  const listeners=new Set();
  return{listeners,on(_type,fn){listeners.add(fn);},off(_type,fn){listeners.delete(fn);},triggerRepaint(){fixture.repaints++;},stop(){},easeTo(){},
    getCenter:()=>({lng:13.4,lat:52.5}),getPadding:()=>({top:0,right:0,bottom:0,left:0}),getCanvas:()=>({clientWidth:100,clientHeight:100,width:200,height:200}),
    getZoom:()=>16,getBearing:()=>0,getPitch:()=>45,getRoll:()=>0,getVerticalFieldOfView:()=>36.87,getCenterElevation:()=>0,getProjection:()=>({type:'mercator'})};
}
const providers=['root500','delegated500','tier300','church','city'];
const controller=()=>new AbortController();

test('every manager\'s acquireBytes passes the caller-admitted {admitted, envelope, keep} unchanged to the page transport at the registry-mapped path',async t=>{
  const {api,fixture}=await load(t);
  const key=Object.keys(registry.church).find(value=>/^\/assets\/3d-materials\/.+\.png$/.test(value)),target=registry.church[key];
  const body=new Uint8Array(3000).fill(7),p=page(api,fixture,new Map([[target,body]]));
  const compositor=api.installCompositor({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  await compositor.requestMode('3d',controller().signal);
  const acquire=fixture.captured.get('church').options.acquireBytes,MAX=4096;
  const keep=[{category:'decoded',bytes:1000,precision:'estimate',identity:{},label:'decode working set'}];
  const envelope=api.resourceByteAdmittedEnvelope(key,MAX),admitted=p.budget.tryReserve([...keep,...envelope],{label:'caller claim'}).reservation;
  const baseline=p.budget.stats.bytes;assert.equal(admitted.bytes,1000+2*MAX);
  p.held.add(target);
  const lease=acquire(key,controller().signal,MAX,{admitted,envelope,keep});
  await until(()=>p.reads.length===1,'the read starts');
  assert.equal(p.reads[0].path,target,'the mapped asset path is read');assert.equal(p.reads[0].max,MAX);
  assert.equal(p.budget.stats.bytes,baseline,'the transport reads under the caller\'s claim: no byte is added');
  assert.equal(p.budget.stats.availabilityListeners,0,'and nothing waits');
  p.release(target);const delivered=await lease;
  assert(delivered.cost,'a caller-admitted delivery: the fourth argument reached the transport');
  assert.equal(admitted.bytes,1000+delivered.bytes.buffer.byteLength,'the claim shrank in place to keep plus the delivered buffer');
  const compat=await acquire(key,controller().signal,MAX);
  assert.equal(compat.cost,undefined,'without a fourth argument the three-argument path is unchanged');assert.equal(compat.bytes.length,body.length);
  compat.release();delivered.release();admitted.release();p.actual.evictRecent();
  assert.equal(p.budget.stats.bytes,0);compositor.destroy();
});

test('readAsset forwards the fourth argument through the lazy adapter and the compositor to the City manager; a caller-admitted read never waits for readiness',async t=>{
  const {api,fixture}=await load(t);const p=page(api,fixture);let loads=0;
  const lazy=api.installLazy({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read},async()=>{loads++;return{installThreeDimensionalMap:api.installCompositor};});
  const asset={path:'/safety/environment/berlin/a.json',sha256:'a'.repeat(64),bytes:10},claim=p.budget.reserve({category:'read',bytes:64,precision:'estimate'}),admission={admitted:claim,envelope:[],keep:[]};
  await assert.rejects(lazy.readAsset(asset,controller().signal,10,admission),/ensureReady/,'before readiness the admitted read fails at once');
  assert.equal(loads,0,'it did not load the 3D owner while holding the claim');assert.equal(claim.active,true);assert.equal(claim.bytes,64);
  assert.equal(lazy.getNativeSourceDiagnostics(),undefined);assert.equal(loads,0,'diagnostics do not load the lazy owner');
  await lazy.ensureReady(controller().signal);
  assert.equal(loads,1);assert.deepEqual([...fixture.captured.keys()],providers,'readiness installed every provider manager');
  assert.equal(p.reads.length,0,'readiness read nothing');assert.equal(p.budget.stats.bytes,64,'and charged nothing');assert.equal(p.budget.stats.availabilityListeners,0);
  const ledgerBefore=JSON.stringify(p.budget.stats),native=lazy.getNativeSourceDiagnostics();assert.equal(native.retryWaitingCount,0);assert.deepEqual(native.retryWaitDiagnostics,[]);assert.equal(JSON.stringify(p.budget.stats),ledgerBefore,'lazy diagnostic forwarding is read only');
  const signal=controller().signal;
  assert.equal(await lazy.readAsset(asset,signal,10,admission),'asset');
  const [row]=fixture.assetReads;assert.equal(row.provider,'city');assert.equal(row.args[0],asset);assert.equal(row.args[1],signal);assert.equal(row.args[2],10);assert.equal(row.args[3],admission,'the same admission object reaches the City manager');
  await lazy.readAsset(asset,signal,10);assert.equal(fixture.assetReads[1].args.length,4);assert.equal(fixture.assetReads[1].args[3],undefined,'undefined stays undefined');
  claim.release();lazy.destroy();
  // The compositor alone: an admitted read before its managers exist fails without installing them.
  fixture.captured.clear();const q=page(api,fixture),compositor=api.installCompositor({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:q.resourceStore,fetchBytes:q.read});
  await assert.rejects(compositor.readAsset(asset,controller().signal,10,admission),/ensureReady/);assert.equal(fixture.captured.size,0);
  await compositor.ensureReady(controller().signal);assert.equal(await compositor.readAsset(asset,controller().signal,10,admission),'asset');assert.equal(fixture.assetReads.at(-1).args[3],admission);
  compositor.destroy();await assert.rejects(compositor.ensureReady(controller().signal),{name:'AbortError'},'a destroyed compositor is never ready');
});

test('ensureReady holds and reads nothing; its caller\'s abort rejects at once while the initialization is still pending',async t=>{
  const {api,fixture}=await load(t);const p=page(api,fixture),gate=deferred();fixture.gate=gate;
  const compositor=api.installCompositor({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  // A caller that joins the initialization a 3D request started.
  const mode=compositor.requestMode('3d',controller().signal);
  const first=controller(),waiting=compositor.ensureReady(first.signal);let settled=false;void waiting.then(()=>settled=true,()=>settled=true);
  for(let i=0;i<5;i++)await settle();
  assert.equal(settled,false,'readiness waits for the provider modules');assert.equal(p.budget.stats.bytes,0);assert.equal(p.budget.stats.availabilityListeners,0);assert.equal(p.reads.length,0);
  first.abort();await assert.rejects(waiting,{name:'AbortError'},'the joiner\'s abort rejects at once while the modules are still pending');
  const second=compositor.ensureReady(controller().signal);let secondSettled=false;void second.then(()=>secondSettled=true,()=>secondSettled=true);
  for(let i=0;i<5;i++)await settle();assert.equal(secondSettled,false,'another caller still waits for the same initialization');assert.equal(fixture.captured.size,0);
  gate.resolve();await second;await mode;
  assert.deepEqual([...fixture.captured.keys()],providers);assert.equal(p.budget.stats.bytes,0);assert.equal(p.reads.length,0);
  compositor.destroy();
  // A caller that starts the initialization itself.
  fixture.captured.clear();const own=deferred();fixture.gate=own;const r=page(api,fixture);
  const solo=api.installCompositor({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:r.resourceStore,fetchBytes:r.read});
  const starter=controller(),started=solo.ensureReady(starter.signal);for(let i=0;i<3;i++)await settle();starter.abort();
  await assert.rejects(started,{name:'AbortError'});own.resolve();for(let i=0;i<3;i++)await settle();assert.equal(fixture.captured.size,0,'its aborted initialization installs nothing');
  await solo.ensureReady(controller().signal);assert.deepEqual([...fixture.captured.keys()],providers);
  const compositorAfter=solo;
  await compositorAfter.ensureReady(controller().signal);
  const aborted=controller();aborted.abort();await assert.rejects(compositorAfter.ensureReady(aborted.signal),{name:'AbortError'});
  compositorAfter.destroy();
  // The lazy adapter loads and installs the owner for readiness, abortable while the module loads.
  fixture.captured.clear();fixture.gate=undefined;const q=page(api,fixture),module=deferred();
  const lazy=api.installLazy({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:q.resourceStore,fetchBytes:q.read},()=>module.promise);
  const loading=controller(),pending=lazy.ensureReady(loading.signal);loading.abort();await assert.rejects(pending,{name:'AbortError'});
  module.resolve({installThreeDimensionalMap:api.installCompositor});await lazy.ensureReady(controller().signal);assert.deepEqual([...fixture.captured.keys()],providers);lazy.destroy();
});

test('paintInitializationSettled follows the compositor\'s newest session: settles, follows a replacement, rejects a failure and the caller\'s abort, and resolves when inactive',async t=>{
  const {api,fixture}=await load(t);const p=page(api,fixture);
  const compositor=api.installCompositor({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  await compositor.requestMode('3d',controller().signal);
  const handles=new Set(providers.map(provider=>fixture.captured.get(provider).options.paintInitializationSettled));
  assert.equal(handles.size,1,'every manager receives the one handle');const [settled]=handles;assert.equal(typeof settled,'function');
  const s1=fixture.sessions.at(-1);assert.equal(s1.active,true);
  let done=false;const a=settled(controller().signal).then(()=>done=true);await settle();assert.equal(done,false,'pending while the session has pending initializers');
  s1.settle();await a;
  const b=settled(controller().signal);await settle();assert.equal(s1.waiters,1);
  compositor.resume();const s2=fixture.sessions.at(-1);assert.notEqual(s2,s1);assert.equal(s1.active,false,'the new session replaced the old one');
  await settle();assert.equal(s2.waiters,1,'the waiter followed the replacement instead of resolving');
  s2.settle();await b;
  const c=settled(controller().signal);await settle();const failure=Error('frozen table hash mismatch');s2.fail(failure);
  await assert.rejects(c,error=>error===failure,'a session failure rejects with that failure');
  await settled(controller().signal);
  compositor.resume();const s3=fixture.sessions.at(-1),cancel=controller(),d=settled(cancel.signal);await settle();cancel.abort();
  await assert.rejects(d,{name:'AbortError'});assert.equal(s3.waiters,0,'the cancelled waiter is removed');
  await compositor.requestMode('2d',controller().signal);assert.equal(s3.active,false);
  await settled(controller().signal);
  compositor.destroy();
});

test('one retirement-frame registration repaints the map, and destroy removes it',async t=>{
  const {api,fixture}=await load(t);const p=page(api,fixture),map=mapStub(fixture);
  const compositor=api.installCompositor({map,city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  assert.equal(p.registrations.length,1,'registered once at install');assert.equal(p.actual.stats.retirementFrameRequesters,1);
  const [{request,signal}]=p.registrations;assert.equal(signal.aborted,false);
  const before=fixture.repaints;request();assert.equal(fixture.repaints,before+1,'a retirement frame request is one map repaint');
  await compositor.requestMode('3d',controller().signal);await compositor.requestMode('2d',controller().signal);
  assert.equal(p.registrations.length,1,'mode changes add no registration');assert.equal(map.listeners.size,1,'the render collector stays the only map listener');
  compositor.destroy();
  assert.equal(signal.aborted,true);assert.equal(p.actual.stats.retirementFrameRequesters,0,'destroy withdraws the registration');assert.equal(map.listeners.size,0);
});

test('destroy releases the retained executables of exactly its bound GL contexts before collecting, and drops its owners',async t=>{
  const {api,fixture}=await load(t);const p=page(api,fixture),map=mapStub(fixture);
  const compositor=api.installCompositor({map,city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  await compositor.requestMode('3d',controller().signal);
  const gl1={isContextLost:()=>false},gl2={isContextLost:()=>false};
  fixture.captured.get('city').renderer.layer.onAdd(map,gl1);fixture.captured.get('root500').renderer.layer.onAdd(map,gl2);fixture.captured.get('church').renderer.layer.onAdd(map,gl1);
  const diagnostics=compositor.getResourceDiagnostics();
  assert.deepEqual(diagnostics.recentPrograms,[api.getRecentProgramStats(gl1),api.getRecentProgramStats(gl2)],'one retained-executable record per bound context');
  fixture.events.length=0;compositor.destroy();
  const releases=fixture.events.filter(row=>row[0]==='releaseRecentPrograms');
  assert.deepEqual(releases.map(row=>row[1]),[gl1,gl2],'context scope: each bound GL context once, never the page store or ledger');
  assert.equal(fixture.events.at(-1)[0],'collectRetired','retirement collection runs after the releases');
  assert(fixture.events.findIndex(row=>row[0]==='releaseRecentPrograms')<fixture.events.length-1);
  assert.equal(compositor.renderer,undefined);assert.deepEqual(compositor.paintLayers,[]);assert.equal(compositor.mode,'2d');
  assert.deepEqual(compositor.getResourceDiagnostics().recentPrograms,[]);assert.deepEqual(compositor.getResourceDiagnostics().providers,[]);
});

test('a destroyed compositor no longer keeps its managers and renderers reachable',async t=>{
  const {api,fixture}=await load(t,{weak:true});const p=page(api,fixture);
  const compositor=api.installCompositor({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  await compositor.requestMode('3d',controller().signal);
  assert.equal(fixture.weakRefs.length,2*providers.length);
  for(let i=0;i<3;i++){await settle();gc();}
  assert(fixture.weakRefs.every(ref=>ref.deref()!==undefined),'a live compositor keeps its owners');
  compositor.destroy();
  for(let i=0;i<3;i++){await settle();gc();}
  assert.deepEqual(fixture.weakRefs.map(ref=>ref.deref()===undefined),fixture.weakRefs.map(()=>true),'after destroy the owners can be collected');
  assert.equal(typeof compositor.cacheStats,'function');
});

test('diagnostics: reflection budget stats, bounded program digests and a readiness-timeout snapshot only on a local diagnostics page',async t=>{
  const {api,fixture}=await load(t,{location:{hostname:'127.0.0.1',search:'?diagnostics=1'}});const p=page(api,fixture);
  const compositor=api.installCompositor({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  await compositor.requestMode('3d',controller().signal);
  assert.deepEqual(compositor.cacheStats().reflectionBudget,{captures:0,pending:false,omissions:[]});
  const capture=compositor.renderer.renderPlanarReflection({purpose:'reflection',maxTriangles:100,maxDraws:10});assert.equal(capture.complete,true);
  assert.equal(compositor.cacheStats().reflectionBudget.captures,1,'the inner painted group\'s capture count');
  const digest=compositor.getResourceDiagnostics();
  assert.deepEqual(digest.providers.map(row=>row.provider),providers);
  const city=digest.providers.find(row=>row.provider==='city');
  assert.deepEqual(Object.keys(city).sort(),['budget','dispatch','provider','recent']);
  assert.deepEqual(city.budget,{waitingForAvailability:false,budgetWaits:3,refusedRecipes:1,unfitFailures:0,lastPressure:{capacity:10,required:12,current:9,recentCapacity:1,recentRequired:0,recentCurrent:0,shortfallBytes:2,recentShortfallBytes:0,additionalBytes:3,constraint:'total',label:'program city'}});
  assert.deepEqual(city.dispatch,{visibleStartsTotal:5,captureStartsTotal:2,deferredCaptures:3,deferredCaptureJobs:2,deadlineCaptureStarts:1,visibleDeadlineActive:true,longestTurn:{elapsedMs:12,steps:3,yieldReason:'slice',source:'s',resource:'r',priority:'visible',phase:'link-submit',stepMs:9}});
  assert.equal(city.recent.entries,2);assert.equal(city.recent.scope,undefined,'only the listed scalar fields');
  assert(!JSON.stringify(digest).includes('pendingResources'),'no row arrays are copied');
  assert.equal(compositor.getResourceDiagnostics(Array.from({length:40},(_,i)=>({provider:'p'+i}))).providers.length,16,'at most 16 rows');
  assert.equal(digest.readinessTimeout,undefined);
  // A readiness timeout: the snapshot is taken before the 2D rollback.
  await compositor.requestMode('2d',controller().signal);
  fixture.failMode={provider:'tier300',message:'3D draw readiness timed out'};
  fixture.readiness.tier300={ticket:4,phase:'timeout',stage:'drawing',inspections:7,timing:{startedAtMs:100,observedAtMs:8200,elapsedWallMs:8100,visibleBudgetMs:8000},reason:'deadline',renderer:{programPreparation:{rows:[1,2,3]}}};
  await assert.rejects(compositor.requestMode('3d',controller().signal),/readiness timed out/);
  assert.equal(compositor.cacheStats().threeDFallback?.reason,'readiness-timeout');
  const snapshot=compositor.getResourceDiagnostics().readinessTimeout;
  assert.equal(snapshot.provider,'tier300');assert.equal(snapshot.message,'3D draw readiness timed out');assert(Object.isFrozen(snapshot));
  assert.deepEqual(snapshot.providers.map(row=>row.provider),['root500','delegated500','tier300','church','city']);
  const tier=snapshot.providers.find(row=>row.provider==='tier300');
  assert.deepEqual(tier.readiness,{ticket:4,phase:'timeout',stage:'drawing',inspections:7,reason:'deadline',expectedGeneration:undefined,registered:undefined,published:undefined,mainReady:undefined,recordedAtMs:undefined,timing:{startedAtMs:100,observedAtMs:8200,elapsedWallMs:8100,visibleBudgetMs:8000}});
  assert.equal(tier.programs[0].budget.waitingForAvailability,true,'its held program wait at the timeout');
  assert.equal(snapshot.ledger.limitBytes,64*MiB);assert.equal(typeof snapshot.ledger.bytes,'number');
  assert(JSON.stringify(snapshot).length<16*1024,'the snapshot is bounded');
  compositor.destroy();assert.equal(compositor.getResourceDiagnostics().readinessTimeout,undefined);
  // Without the local diagnostics page the same timeout records nothing.
  const quiet=await load(t);const q=page(quiet.api,quiet.fixture);
  const other=quiet.api.installCompositor({map:mapStub(quiet.fixture),city:'berlin',mobile:false,resourceStore:q.resourceStore,fetchBytes:q.read});
  quiet.fixture.failMode={provider:'tier300',message:'3D draw readiness timed out'};
  await assert.rejects(other.requestMode('3d',controller().signal),/readiness timed out/);
  assert.equal(other.getResourceDiagnostics().readinessTimeout,undefined);other.destroy();
});

test('the compositor\'s unmapped byte users stay consistent: no provider registry remaps frozen tables, detail assets or the bootstrap index',()=>{
  const unmapped=key=>key.startsWith('/safety/buildings3d/painted-tables/')||key.startsWith('/safety/buildings3d/detail/')||key==='/safety/buildings3d/index.json'||key.startsWith('/safety/buildings3d/building-detail');
  for(const [provider,table] of Object.entries(registry))assert.deepEqual(Object.keys(table).filter(unmapped),[],provider+' maps none of the paths its frozen data owner, detail resolver/runtime and initializer ingress read unmapped');
});
