import {nullCityDataProfilePlugin} from './city-profile-test-plugin.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};

async function fixture(t,{city='berlin',initialFailure=true,onThreeD}={}){
 const savedDocument=globalThis.document,savedLocation=globalThis.location;
 globalThis.document={hidden:false};globalThis.location={hostname:'test.invalid'};
 const key='__paintedTransition'+Math.random().toString(16).slice(2),gate=deferred(),rollbackStarted=deferred(),states=[],rollbackSignals=[],threeDSignals=[],installed=[],cameraOwners=[];
 let failOnce=initialFailure;
 globalThis[key]=(provider,options)=>{
  installed.push(provider);if(options.manageCamera)cameraOwners.push(provider);let mode='2d',wantedMode='2d';
  return{
   async requestMode(next,signal){
    signal.throwIfAborted();wantedMode=next;
    if(next==='3d')threeDSignals.push(signal);
    if(next==='3d'&&provider==='city'&&failOnce){failOnce=false;throw Error('Fixture first 3D load failed');}
    if(next==='3d'&&onThreeD){await onThreeD(provider,signal);signal.throwIfAborted();}
    if(next==='2d'){
     rollbackSignals.push(signal);if(rollbackSignals.length===5)rollbackStarted.resolve();
     await gate.promise;signal.throwIfAborted();
    }
    mode=next;options.onState?.({mode,status:'ready'});return{mode,status:'ready'};
   },get mode(){return mode;},get wantedMode(){return wantedMode;},cacheStats:()=>({}),destroy(){},suspend(){},resume(){},
   setPageHidden(){},setReducedMotion(){},setOpacityContext(){},
  };
 };
 t.after(()=>{gate.resolve();globalThis.document=savedDocument;globalThis.location=savedLocation;delete globalThis[key];});
 const result=await build({entryPoints:[new URL('../src/safety/painted-map.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false,plugins:[nullCityDataProfilePlugin,{name:'bounded-transition-fixture',setup(build){
  build.onResolve({filter:/^\.\/planar-reflection-group$/},()=>({path:'reflection',namespace:'fixture'}));
  build.onResolve({filter:/^\.\/paint-ownership$/},()=>({path:'ownership',namespace:'fixture'}));
  build.onResolve({filter:/^\.\/paint-asset-registry\.json$/},()=>({path:'assets',namespace:'fixture'}));
  build.onResolve({filter:/^\.\/frozen-paint-tables$/},()=>({path:'frozen',namespace:'fixture'}));
  build.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:{
   reflection:'export const planarReflectionGroup=()=>({});',ownership:'export const paintOwner=()=>"city";',assets:'export default {};',
   frozen:'export const beginFrozenPaintTableInitialization=()=>({active:true,wait:p=>p,settled:()=>Promise.resolve(),close(){}});export const frozenPaintTableStats=()=>({});export const createFrozenDataResourceOwner=()=>({client:provider=>({provider,dispose(){}}),stats:{active:0,queued:0,waiters:0},destroy(){}});',
  }[path],loader:'js'}));
  build.onResolve({filter:/painted\/[^/]+\/safety\/(?:three-dimensional-map|building-mesh-renderer)$/},args=>({path:args.path,namespace:'provider'}));
  build.onLoad({filter:/.*/,namespace:'provider'},args=>({contents:`export const installThreeDimensionalMap=options=>globalThis[${JSON.stringify(key)}](${JSON.stringify(args.path.split('/painted/')[1].split('/')[0])},options);`,loader:'js'}));
 }}]});
 const {installThreeDimensionalMap}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 const manager=installThreeDimensionalMap({map:{on(){},off(){},triggerRepaint(){}},mobile:false,city,fetchBytes:async()=>new Uint8Array(),onState:state=>states.push(state)});
 t.after(()=>manager.destroy());
 return{manager,states,gate,rollbackStarted,rollbackSignals,threeDSignals,installed,cameraOwners};
}

test('Bremen prepares after the camera and before longer-budget providers with no concurrent preparation',async t=>{
 const entered=[],steps=new Map();let active=0,maxActive=0;
 const f=await fixture(t,{city:'bremen',initialFailure:false,onThreeD:async provider=>{
  entered.push(provider);active++;maxActive=Math.max(maxActive,active);const step=deferred();steps.set(provider,step);await step.promise;active--;
 }});
 const expected=['city','bremen','root500','delegated500','tier300','church'];
 const request=f.manager.requestMode('3d',new AbortController().signal);
 for(let i=0;i<expected.length;i++){
  for(let wait=0;wait<30&&entered.length<=i;wait++)await tick();
  assert.deepEqual(entered,expected.slice(0,i+1),'next provider waits for the current one');
  steps.get(expected[i]).resolve();
 }
 assert.deepEqual(await request,{mode:'3d',status:'ready'});assert.equal(maxActive,1);
 assert.deepEqual(f.installed,['root500','delegated500','tier300','church','city','bremen'],'installation/display order is unchanged');
 assert.deepEqual(f.cameraOwners,['city']);
});

test('cancelling while the early Bremen preparation waits does not start later providers',async t=>{
 const entered=[],waiting=deferred(),started=deferred();
 const f=await fixture(t,{city:'bremen',initialFailure:false,onThreeD:async provider=>{
  entered.push(provider);if(provider==='bremen'){started.resolve();await waiting.promise;}
 }});
 const own=new AbortController(),request=f.manager.requestMode('3d',own.signal),failed=assert.rejects(request,{name:'AbortError'});
 await started.promise;own.abort();waiting.resolve();await failed;
 assert.deepEqual(entered,['city','bremen']);assert(f.threeDSignals.every(signal=>signal.aborted));
 assert.notDeepEqual(f.states.at(-1),{mode:'3d',status:'ready'},'cancelled transition cannot publish ready');
});

test('actual ensureReady settlement permits a later completed 2D fallback recovery without reinstalling providers',async t=>{
 const f=await fixture(t);
 await f.manager.ensureReady(new AbortController().signal);
 assert.deepEqual(f.installed,['root500','delegated500','tier300','church','city']);
 assert.equal(f.manager.beginContextRecovery(),false,'initial 2D readiness is not a completed fallback');
 const request=f.manager.requestMode('3d',new AbortController().signal),failed=assert.rejects(request,/Fixture first 3D load failed/);
 await f.rollbackStarted.promise;
 assert.equal(f.manager.beginContextRecovery(),false,'a pending rollback cannot become the recovery baseline');
 f.gate.resolve();await failed;
 assert.match(f.manager.getDrawReadinessSnapshot().failure,/Fixture first 3D load failed/);
 assert.equal(f.manager.beginContextRecovery(),true,'the fulfilled initialization no longer counts as pending');
 assert.equal(f.manager.getDrawReadinessSnapshot().ready,true);assert.equal(f.manager.getDrawReadinessSnapshot().failure,undefined);
 assert.equal(f.installed.length,5,'ensure reuses the completed manager set');
 assert.deepEqual(f.states.at(-1),{mode:'2d',status:'error',fallback:{reason:'error',provider:'city'}},'the failure remains recorded in the original publication');
});

test('a superseding 3D request cancels an older failed transition rollback and retains the new result',async t=>{
 const f=await fixture(t),external=new AbortController();
 const first=f.manager.requestMode('3d',external.signal),failed=assert.rejects(first,/Fixture first 3D load failed/);
 await f.rollbackStarted.promise;
 const second=await f.manager.requestMode('3d',new AbortController().signal);assert.deepEqual(second,{mode:'3d',status:'ready'});
 external.abort();assert(f.threeDSignals.slice(-5).every(signal=>!signal.aborted),'old external cancellation must not abort the newer request');
 f.gate.resolve();await failed;await tick();
 assert.equal(f.manager.mode,'3d','old rollback must not replace a completed new 3D view');
 assert.deepEqual(f.states.at(-1),{mode:'3d',status:'ready'},'old error must not overwrite the new ready status');
 assert(f.rollbackSignals.every(signal=>signal.aborted));
});

test('destroy aborts an in-progress error rollback and prevents its late error status',async t=>{
 const f=await fixture(t);
 const first=f.manager.requestMode('3d',new AbortController().signal),failed=assert.rejects(first,/Fixture first 3D load failed/);
 await f.rollbackStarted.promise;f.manager.destroy();const count=f.states.length;
 f.gate.resolve();await failed;await tick();
 assert.equal(f.states.length,count,'destroyed manager must not publish old rollback status');
 assert(f.rollbackSignals.every(signal=>signal.aborted));
});

test('external cancellation during error rollback aborts that rollback and prevents late error status',async t=>{
 const f=await fixture(t),external=new AbortController();
 const first=f.manager.requestMode('3d',external.signal),failed=assert.rejects(first,/Fixture first 3D load failed/);
 await f.rollbackStarted.promise;external.abort();const count=f.states.length;
 f.gate.resolve();await failed;await tick();
 assert(f.rollbackSignals.every(signal=>signal.aborted),'the original external signal must cancel its recovery controller');
 assert.equal(f.states.length,count,'external cancellation must suppress the obsolete rollback status');
});
