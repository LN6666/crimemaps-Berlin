// The shared resident chunk scene (support/resident-chunk-scene.mjs) as the
// F3 suites load it through support/f3-reflection-bridge.mjs.
//
// City chunk materials now also carry per-chunk shader sidecars
// (`material.value.sidecars`, read by sceneSidecarBytes and the sidecar
// uploads). The fixture scene publishes no sidecar data, which the renderer
// represents as an empty sidecar record. This wrapper adds exactly that empty,
// frozen record to each published chunk material that has none; everything
// else is the shared module unchanged. (The same one-line addition belongs in
// resident-chunk-scene.mjs itself; that file is also used by other fixture
// lines, so it is not edited here.)
//
// Chunk state, CPU and material roles (F5-programs): the current renderers
// read per-vertex growth/selection state from the chunk that owns a component
// (`chunk.state.value`, or the delegated/church `chunk.stateData` record) and
// move chunk resources between roles with counted leases
// (`chunk.material.retain('source')`, `chunk.cpu.retain('candidate')`,
// `chunk.state.retain('main')`, each later released). The shared scene
// publishes plain ready records without those role methods and an empty state
// array. This wrapper gives each published chunk:
//
// - `state`: a ready counted lease whose value is the fixture's current
//   `values.stateData` (the canonical per-vertex state array a test installs),
//   or the chunk's own empty array when the fixture has none. It reads the
//   current binding exactly as the shared scene's mask pins read the current
//   `values.rathausProxyMasks`, so a test assigning `values.stateData` after
//   the fixture was built is seen by every chunk role;
// - `stateData`: the same array for the renderers that read the plain record;
// - `retain(role)`/`release()` on the existing `cpu` and `material` records,
//   with the same counted semantics (the record stays the same value; every
//   retain returns its own idempotent release).
//
// - `material.value.maskRecipe`: City clones a chunk's material role together
//   with its immutable Rathaus mask CPU recipe and creates the clone's own
//   mask binding from it (`maskRecipe.createBinding()`). The fixture chunk's
//   masks are the shared scene's pins over the fixture's current
//   `values.rathausProxyMasks`; the recipe's bindings are views of those same
//   pins whose destroy/detach end only that binding (never the fixture's own
//   mask owner), and its retain/release are counted like the other roles.
//
// Every lease a renderer takes here (each retain on a chunk role or on the
// mask recipe) is counted (`f3ChunkLeases` on the returned scene: issued,
// returned, outstanding), so a suite could assert that a renderer returns every
// role it took; no suite asserts it yet. The chunk's own published state role
// belongs to the scene and is not counted. A mask binding whose destroy/detach
// ended it rejects every later read, so a renderer reading an ended binding
// fails visibly. The recipe's retain returns only a release handle, as the
// production RathausProxyMaskRecipe.retain does. No renderer function is
// substituted; the scene's publication, geometry lease and mask pins are still
// the shared module's.
import * as shared from './resident-chunk-scene.mjs';

export * from './resident-chunk-scene.mjs';

const NO_SIDECARS=Object.freeze({});

/**
 * A counted, ready chunk-resource lease over `read()`. Each retain(role)
 * returns a new lease on the same record; release() is idempotent per lease.
 */
function countedLease(contentKey,role,read,counter,context,epoch,own=false){
 if(!own){counter.issued++;counter.outstanding++;}let released=false;
 return{
  contentKey,role,state:'ready',ready:Promise.resolve(),context,epoch,
  get value(){return released?undefined:read();},
  get released(){return released;},
  retain(nextRole){if(released)throw Error('f3-chunk-scene: retained a released chunk lease '+contentKey);return countedLease(contentKey,nextRole,read,counter,context,epoch);},
  release(){if(released)return;released=true;if(!own){counter.outstanding--;counter.returned++;}},
 };
}

/** A mask CPU recipe whose bindings view the chunk's shared mask pins. */
function fixtureMaskRecipe(chunk,contentKey,counter){
 const masks=()=>chunk.masks;
 const binding=()=>{let ended=false;const end=()=>{ended=true;};return new Proxy({},{get(_target,key){
  if(key==='destroy'||key==='detach')return end;if(key==='fixtureBindingEnded')return ended;
  if(ended&&typeof key==='string')throw Error('f3-chunk-scene: read '+key+' of an ended mask binding '+contentKey);
  const current=masks(),value=current?.[key];return typeof value==='function'?value.bind(current):value;}});};
 return{
  get words(){return masks()?.words??new Float32Array();},get masks(){return masks()?.masks??[];},get origin(){return masks()?.origin;},costs:[],
  retain(){const lease=countedLease(contentKey,'source',()=>undefined,counter);return{release(){lease.release();}};},
  release(){},createBinding:binding,
 };
}

/** Adds counted role methods to an existing ready record (cpu/material). */
function leaseRecord(record,contentKey,counter){
 if(!record||typeof record!=='object'||typeof record.retain==='function')return;
 const read=()=>record.value;
 Object.defineProperties(record,{
  role:{configurable:true,enumerable:false,value:record.role??'main'},
  ready:{configurable:true,enumerable:false,value:Promise.resolve()},
  retain:{configurable:true,enumerable:false,value(nextRole){return countedLease(contentKey,nextRole,read,counter,record.context,record.epoch);}},
  // The published record is the scene's own role; the scene ends it.
  release:{configurable:true,enumerable:false,value(){}},
 });
}

export function installResidentChunkScene(values,options){
 const scene=shared.installResidentChunkScene(values,options);
 const counter={issued:0,returned:0,outstanding:0},wrapped=new WeakSet();
 const wrap=chunk=>{
  if(!chunk||typeof chunk!=='object'||wrapped.has(chunk))return;wrapped.add(chunk);
  const value=chunk.material?.value;if(value&&typeof value==='object'&&!('sidecars' in value))value.sidecars=NO_SIDECARS;
  if(value&&typeof value==='object'&&!('maskRecipe' in value))value.maskRecipe=fixtureMaskRecipe(chunk,(chunk.contentKey??'f3-chunk')+'/mask-recipe',counter);
  const key=chunk.contentKey??'f3-chunk',own=chunk.stateData instanceof Float32Array?chunk.stateData:new Float32Array();let assigned;
  const readState=()=>assigned??(values.stateData instanceof Float32Array?values.stateData:own);
  leaseRecord(chunk.cpu,key+'/cpu',counter);leaseRecord(chunk.material,key+'/material',counter);
  // The chunk's own published state role; renderers retain further roles from it.
  if(!chunk.state)chunk.state=countedLease(key+'/state','main',readState,counter,chunk.geometry?.context,chunk.geometry?.epoch,true);
  Object.defineProperty(chunk,'stateData',{configurable:true,enumerable:true,get:readState,set(next){assigned=next;}});
 };
 const descriptor=Object.getOwnPropertyDescriptor(values,'sceneChunks');
 if(descriptor?.get)Object.defineProperty(values,'sceneChunks',{configurable:true,enumerable:true,
  get(){const chunks=descriptor.get.call(values);for(const chunk of chunks??[])wrap(chunk);return chunks;},
  set(value){descriptor.set.call(values,value);}});
 Object.defineProperty(scene,'f3ChunkLeases',{configurable:true,enumerable:false,value:counter});
 return scene;
}
