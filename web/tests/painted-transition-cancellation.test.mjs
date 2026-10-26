import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};

async function fixture(t){
 const savedDocument=globalThis.document,savedLocation=globalThis.location;
 globalThis.document={hidden:false};globalThis.location={hostname:'test.invalid'};
 const key='__paintedTransition'+Math.random().toString(16).slice(2),gate=deferred(),rollbackStarted=deferred(),states=[],rollbackSignals=[],threeDSignals=[];
 let failOnce=true;
 globalThis[key]=(provider,options)=>{
  let mode='2d';
  return{
   async requestMode(next,signal){
    signal.throwIfAborted();
    if(next==='3d')threeDSignals.push(signal);
    if(next==='3d'&&provider==='city'&&failOnce){failOnce=false;throw Error('Fixture first 3D load failed');}
    if(next==='2d'){
     rollbackSignals.push(signal);if(rollbackSignals.length===5)rollbackStarted.resolve();
     await gate.promise;signal.throwIfAborted();
    }
    mode=next;options.onState?.({mode,status:'ready'});return{mode,status:'ready'};
   },get mode(){return mode;},cacheStats:()=>({}),destroy(){},suspend(){},resume(){},
   setPageHidden(){},setReducedMotion(){},setOpacityContext(){},
  };
 };
 t.after(()=>{gate.resolve();globalThis.document=savedDocument;globalThis.location=savedLocation;delete globalThis[key];});
 const result=await build({entryPoints:[new URL('../src/safety/painted-map.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'bounded-transition-fixture',setup(build){
  build.onResolve({filter:/^\.\/planar-reflection-group$/},()=>({path:'reflection',namespace:'fixture'}));
  build.onResolve({filter:/^\.\/paint-ownership$/},()=>({path:'ownership',namespace:'fixture'}));
  build.onResolve({filter:/^\.\/paint-asset-registry\.json$/},()=>({path:'assets',namespace:'fixture'}));
  build.onResolve({filter:/^\.\/frozen-paint-tables$/},()=>({path:'frozen',namespace:'fixture'}));
  build.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:{
   reflection:'export const planarReflectionGroup=()=>({});',ownership:'export const paintOwner=()=>"city";',assets:'export default {};',
   frozen:'export const beginFrozenPaintTableInitialization=()=>({active:true,wait:p=>p,close(){}});export const frozenPaintTableStats=()=>({});',
  }[path],loader:'js'}));
  build.onResolve({filter:/painted\/[^/]+\/safety\/(?:three-dimensional-map|building-mesh-renderer)$/},args=>({path:args.path,namespace:'provider'}));
  build.onLoad({filter:/.*/,namespace:'provider'},args=>({contents:`export const installThreeDimensionalMap=options=>globalThis[${JSON.stringify(key)}](${JSON.stringify(args.path.split('/painted/')[1].split('/')[0])},options);`,loader:'js'}));
 }}]});
 const {installThreeDimensionalMap}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 const manager=installThreeDimensionalMap({map:{},city:'berlin',fetchBytes:async()=>new Uint8Array(),onState:state=>states.push(state)});
 t.after(()=>manager.destroy());
 return{manager,states,gate,rollbackStarted,rollbackSignals,threeDSignals};
}

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
