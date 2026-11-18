// Retention fixtures for the two packing producers (root500
// acquirePackedMeshChunk and delegated500 acquirePackedChunk). One esbuild
// graph carries the production producers, the page ledger, the chunk store
// and the shared context scheduler, so all class/registry identities match.
//
// A renderer's packing callbacks are made in one finish-time scope (City
// buildBatches, Tier300 packBatches, Church packBatches). Here every callback
// a fixture hands to a producer is made in one function whose scope also holds
// a sentinel object, so the sentinel is reachable exactly while any of those
// callbacks is. Values that a produced chunk legitimately keeps (its arrays,
// rows, runs, auxiliary, auxiliary release, mask recipe) are made outside that
// scope, the way the production renderers keep their releases module-level.
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

export const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const PACKING_FILES=Object.freeze({
 root500:path.join(web,'src/painted/root500/safety/chunk-mesh-packing.ts'),
 delegated500:path.join(web,'src/painted/delegated500/safety/renderer-packed-chunks.ts'),
});
const entry=[
 "export {acquirePackedMeshChunk} from '../painted/root500/safety/chunk-mesh-packing';",
 "export {acquirePackedChunk,packChunkGeometry} from '../painted/delegated500/safety/renderer-packed-chunks';",
 "export {createChunkResourceStore} from './render-runtime/chunk-resource-store';",
 "export {createResourceBudget} from './render-runtime/resource-budget';",
].join('\n');
const built=await build({stdin:{contents:entry,resolveDir:path.join(web,'src/safety'),sourcefile:'packing-retention-entry.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent'});
export const runtime=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=packing-retention-runtime.mjs').toString('base64'));

const MiB=1024*1024;
export const tick=()=>new Promise(resolve=>setImmediate(resolve));
/** Full collections on later turns: a WeakRef target made or read in the
 * current job stays alive until that job ends. */
export async function collect(rounds=8){
 assert.equal(typeof globalThis.gc,'function','Run this suite with node --expose-gc');
 for(let round=0;round<rounds;round++){await tick();globalThis.gc();}
 await tick();
}
/** Names of the WeakRef targets that are still reachable. */
export const alive=refs=>Object.entries(refs).filter(([,ref])=>ref.deref()!==undefined).map(([name])=>name).sort();
/** The shared cooperative scheduler needs a context identity and loss state only. */
export const context=()=>({isContextLost:()=>false});
/** A context the test loses while work is still queued on its scheduler. */
export const lossyContext=()=>({lost:false,isContextLost(){return this.lost;}});
export const category=(budget,name)=>({...(budget.stats.categories[name]??{bytes:0,exactBytes:0,estimatedBytes:0})});

/** Three face roles, an excluded batch and two latitudes, so packing walks the
 * included, excluded, roof, wall and mixed branches. */
export function component(id,{vertices=6,origin=[13.4+id/1000,52.5]}={}){
 const batch=(face,offset)=>{const positions=Array.from({length:vertices*3},(_,i)=>(i*7+offset+id)%11-5),indices=Array.from({length:(vertices-2)*3},(_,i)=>(i+offset)%vertices);
  return{positions,normals:positions.map((_,i)=>i%3===1?(face==='roof'?1:.1):.5),indices,color:[.2+id/100,.4,.6],faceRole:face};};
 return{objectId:'o'+id,partId:'p'+id,origin,batches:[batch('wall',0),batch('roof',1),batch('mixed',2)]};
}

/** A page ledger and store with one ready CPU source parent. */
export function setup(limitBytes=64*MiB){
 const budget=createBudget(limitBytes),store=runtime.createChunkResourceStore({budget});
 const components=[component(1),component(2,{origin:[13.5,52.4]}),component(3,{vertices:9})];
 const source=store.acquire({contentKey:'retention-source',role:'source',estimate:{category:'decoded',bytes:4096,precision:'exact'},produce:()=>({components})});
 const group={contentKey:'retention-group',components,parents:[source],frame:{origin:[13.4,52.5],unit:1e7,authority:'retention-frame'},cohortKeys:[],materialAuthority:'m',recipeAuthority:'r',selectedLOD:'near'};
 const events={materials:0,retains:0,releases:0,auxiliary:0,produced:0,masks:0};
 return{budget,store,source,group,components,events,close(){source.release();store.evictRecent();}};
}
function createBudget(limitBytes){return runtime.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,8*MiB)});}

// Kept by produced values; made here, never in a sentinel scope.
const auxiliaryRelease=events=>()=>{events.auxiliary++;};
const maskRecipe=events=>({costs:[{category:'mask',bytes:2048,precision:'exact'}],release(){events.masks++;}});
const sourceRelease=events=>()=>{events.releases++;};

/** root500 ChunkMeshPackOptions whose callbacks share one scope with
 * `sentinel`. `fail` names a callback that throws during packing; `extraRuns`
 * adds run metadata beyond the estimate; `onRuns`, made by the caller outside
 * this scope, is called from runs, after the packing loop. */
export function meshPackOptions(f,{fail,provider='root500:retention',extraRuns=0,onRuns}={}){
 const sentinel={label:'renderer finish scope',payload:new Uint8Array(1<<16),disposed:false},events=f.events;
 const options={group:f.group,components:f.group.components,provider,
  batchIncluded:(_component,index)=>sentinel.payload.length>0&&index!==1,
  materials(rows){events.materials++;if(fail==='materials')throw Error('fixture materials failed');const n=rows.reduce((sum,row)=>sum+row.batches.reduce((v,b)=>v+b.positions.length/3,0),0);
   return{paint:new Float32Array(n*5).fill(sentinel.payload.length%7),progressive:new Float32Array(n*4),auxiliary:{rows:rows.length},release:auxiliaryRelease(events)};},
  auxiliaryEstimate:[{category:'mask',bytes:2048,precision:'exact'}],
  auxiliaryCosts:auxiliary=>[{category:'mask',bytes:2048,precision:'exact',identity:auxiliary}],
  styles:component=>({wall:sentinel.disposed?0:1,roof:2,landmark:component.objectId==='o2',sourceGlassRoof:false}),
  runs(indices){if(fail==='runs')throw Error('fixture runs failed');onRuns?.();const out=[{key:'base',firstIndex:0,indexCount:indices.length-3},{key:'tail',firstIndex:indices.length-3,indexCount:3}];for(let i=0;i<extraRuns;i++)out.push({key:'extra'+i,firstIndex:0,indexCount:3});return out;},
  progressivePainted:component=>sentinel.payload.length>0&&component.objectId==='o3',
  sourceCurrent(){if(sentinel.disposed)throw Error('fixture source retired');},
  retainSource(){events.retains++;void sentinel;return sourceRelease(events);},
 };
 return{options,refs:{options:new WeakRef(options),sentinel:new WeakRef(sentinel),batchIncluded:new WeakRef(options.batchIncluded),materials:new WeakRef(options.materials),runs:new WeakRef(options.runs),retainSource:new WeakRef(options.retainSource)}};
}
/** Acquire through the production root500 producer; the caller keeps only
 * the lease and WeakRefs, never the options. */
export function acquireMesh(f,gl,{signal,fail,provider,store=f.store,extraRuns,onRuns}={}){
 const {options,refs}=meshPackOptions(f,{fail,provider,extraRuns,onRuns});
 return{lease:runtime.acquirePackedMeshChunk(store,gl,options,signal,()=>{}),refs};
}

/** delegated500 producer callbacks (Church passes ()=>buildChurchPackedGroup)
 * sharing one scope with `sentinel`. `onProduced`, made by the caller outside
 * this scope, is called just before the producer returns its value. */
export function chunkProduction(f,{fail,onProduced}={}){
 const sentinel={label:'church packBatches scope',payload:new Uint8Array(1<<16)},events=f.events,components=f.group.components;
 const vertices=components.reduce((sum,c)=>sum+c.batches.reduce((v,b)=>v+b.positions.length/3,0),0);
 const produce=()=>{events.produced++;if(fail)throw Error('fixture chunk packing failed');
  const packed=runtime.packChunkGeometry(components,f.group.frame,new Float32Array(vertices*5),new Float32Array(vertices*4),{merc:p=>[(p[0]+180)/360,.3+p[1]/1000],unit:latitude=>1e7*Math.cos(latitude*Math.PI/180),included:(_c,batch)=>sentinel.payload.length>0&&batch!==1,style:(c,_b,vertex)=>c.objectId==='o2'?2+vertex%2:1,progressivePainted:c=>c.objectId==='o3',landmark:c=>c.objectId==='o2',indexedPick:true});
  const value={...packed,maskRecipe:maskRecipe(events)};onProduced?.();return value;};
 const retainProduction=()=>{events.retains++;void sentinel;return sourceRelease(events);};
 const estimate=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3*76+b.indices.length*4+48,0),0);
 return{produce,retainProduction,estimate,refs:{produce:new WeakRef(produce),retainProduction:new WeakRef(retainProduction),sentinel:new WeakRef(sentinel)}};
}
/** Acquire through the production delegated500 producer: with `gl` the work
 * runs on the shared scheduler, without it synchronously in the store.
 * `estimate` replaces the fixture's packed estimate. */
export function acquireChunk(f,{gl,signal,fail,contentKey='retention-packed',store=f.store,estimate,onProduced}={}){
 const {produce,retainProduction,estimate:packedEstimate,refs}=chunkProduction(f,{fail,onProduced});
 return{lease:runtime.acquirePackedChunk(store,contentKey,estimate??packedEstimate,produce,signal,gl,retainProduction,f.group.components.length,f.group.parents),refs};
}

/** The real store behind a view whose acquire passes each request through
 * `acquire(target,request)`; everything else is the store's own. */
function storeView(store,acquire){
 return new Proxy(store,{get(target,key){if(key==='acquire')return request=>acquire(target,request);const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
}
/** A view that keeps every request object it is given (the store itself does
 * not). Only a producer that hands its options to the production and drops
 * them when no production starts frees them then. */
export function requestKeepingStore(store){
 const requests=[];
 return{requests,store:storeView(store,(target,request)=>{requests.push(request);return target.acquire(request);})};
}
/** A view that counts the store's dispose calls, each still made through the
 * request's own dispose. */
export function disposeCountingStore(store){
 const view={disposed:0};
 view.store=storeView(store,(target,request)=>target.acquire({...request,dispose(value){view.disposed++;request.dispose(value);}}));
 return view;
}
/** A view that starts each production from a later microtask, as a store that
 * deferred produce past acquire would. */
export function deferredProduceStore(store){
 return storeView(store,(target,request)=>target.acquire({...request,produce:production=>Promise.resolve().then(()=>request.produce(production))}));
}
/** A view that calls each request's produce a second time inside acquire and
 * keeps the first result; a second call that starts anything is counted. */
export function doubleProduceStore(store){
 const view={errors:[],starts:0};
 view.store=storeView(store,(target,request)=>target.acquire({...request,produce(production){
  const first=request.produce(production);
  try{const second=request.produce(production);view.starts++;void Promise.resolve(second).catch(()=>{});}catch(error){view.errors.push(error);}
  return first;
 }}));
 return view;
}
