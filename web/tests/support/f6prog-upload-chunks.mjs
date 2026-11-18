// Uploadable resident chunks for program-preparation's actual renderer block.
//
// The shared reflection fixture publishes each resident chunk through its
// chunk scene (support/resident-chunk-scene.mjs, through f3-chunk-scene.mjs)
// with only the data capture reads: a plain packed record ({contentKey,
// anchor, indices, frame}) and plain CPU/state handles. The actual upload
// path (allocateChunkMeshView for Tier300, the packed-chunk upload for church)
// allocates its static and per-view geometry with those chunk records as
// borrowed-buffer parents, which the page chunk store accepts only when they
// are its own live leases on the same store and context epoch.
//
// This wrapper keeps the shared scene's publication (its owner, versions,
// spans and masks) and gives each published chunk, once, real leases on that
// same store:
// - cpu: the packed record extended with the fixture's own vertex, paint,
//   progressive and base-state arrays (the renderer fixture's typed arrays);
//   those shared arrays are one store entry charged once and named as the
//   CPU lease's parent, the chunk's own exact estimate is its index range;
// - state (also `dynamic`, with `stateData` its value): the chunk's dynamic
//   selection/growth state, a copy of the base state produced like
//   acquireChunkMeshState does, with the CPU lease as its parent.
// The wrapper leases are held until release() (a candidate may still upload
// from a chunk the scene has since republished; the fixture is small); chunks the renderer packed itself already hold store leases and
// are left as they are (they carry packed vertex data). Nothing here substitutes a renderer function.

/**
 * @param {Record<string,any>} values renderer fixture values (sceneChunks is
 *   the shared scene's accessor)
 * @param {{acquire:Function}} store the page chunk store the scene publishes on
 * @param {{vertices:Float32Array,paint:Float32Array,progressive:Float32Array,baseState:Float32Array}} arrays
 * @param {{createMasks?:()=>{destroy():void},packedRecord?:(chunk:any,packed:any)=>Record<string,unknown>}} [options]
 *   per-chunk mask owner factory; provider-specific packed fields (City: its
 *   per-component rows and local runs) derived from the published chunk
 */
// Store content keys name the fixture's typed arrays by identity, so one
// array is one store entry however many chunks or shadow passes lease it.
const arrayKeys=new WeakMap();let arraySerial=0;
const arrayKey=array=>{let key=arrayKeys.get(array);if(key===undefined)arrayKeys.set(array,key=++arraySerial);return key;};

export function installUploadableChunks(values,store,arrays,{createMasks,packedRecord}={}){
 const descriptor=Object.getOwnPropertyDescriptor(values,'sceneChunks');
 if(!descriptor?.get)throw Error('f6prog-upload-chunks: the shared chunk scene accessor is not installed');
 const owned=new Map(),chunkMasks=[];let released=false;
 const bytes=value=>value.byteLength;
 // Same bytes are charged once: the fixture's vertex/paint/progressive/base
 // state arrays are one shared store entry (store entries dedupe by
 // contentKey) that every chunk CPU lease names as its parent; a chunk's own
 // estimate is only its own index range.
 let sharedArrays;
 const arraysLease=()=>{
  if(sharedArrays)return sharedArrays;
  const lease=store.acquire({contentKey:'f6prog-upload-arrays:'+arrayKey(arrays.vertices)+':'+arrayKey(arrays.paint)+':'+arrayKey(arrays.progressive)+':'+arrayKey(arrays.baseState),role:'source',estimate:{category:'packed',bytes:bytes(arrays.vertices)+bytes(arrays.paint)+bytes(arrays.progressive)+bytes(arrays.baseState),precision:'exact'},produce:()=>arrays});
  if(lease.state!=='ready'){lease.release();throw Error('f6prog-upload-chunks: synchronous shared-array lease did not settle');}
  return sharedArrays=lease;
 };
 function adopt(chunk){
  // Only the shared scene's capture records (packed without vertex data;
  // f3-chunk-scene gives them counted, not store, leases); chunks the renderer
  // packed itself carry their vertex data in store leases already.
  const packed=chunk.cpu?.value;if(!packed||owned.has(chunk)||packed.vertices)return;
  if(released)throw Error('f6prog-upload-chunks: chunk published after release');
  const value={...packed,vertices:arrays.vertices,paint:arrays.paint,progressive:arrays.progressive,baseState:arrays.baseState,...packedRecord?.(chunk,packed)};
  const cpu=store.acquire({contentKey:'f6prog-upload-cpu:'+chunk.contentKey,role:'source',parents:[arraysLease()],estimate:{category:'packed',bytes:bytes(value.indices),precision:'exact'},produce:()=>value});
  let state;try{state=store.acquire({contentKey:'f6prog-upload-state:'+chunk.contentKey,role:'source',parents:[cpu],estimate:{category:'packed',bytes:bytes(value.baseState),precision:'exact'},produce:()=>value.baseState.slice()});}
  catch(error){cpu.release();throw error;}
  if(cpu.state!=='ready'||state.state!=='ready'){state.release();cpu.release();throw Error('f6prog-upload-chunks: synchronous chunk leases did not settle');}
  owned.set(chunk,{cpu,state});
  // A renderer chunk owns its mask owner (releasing the chunk destroys it, as
  // Tier300 releaseTierChunks does), so each adopted chunk gets its own from
  // createMasks instead of the scene's wrapper over the renderer-level owner.
  const masks=createMasks?.();if(masks)chunkMasks.push(masks);
  Object.assign(chunk,{cpu,state,dynamic:state,stateData:state.value,...(masks?{masks}:{})});
 }
 Object.defineProperty(values,'sceneChunks',{configurable:true,enumerable:true,
  get(){const chunks=descriptor.get.call(values);if(Array.isArray(chunks)&&!released){for(const chunk of chunks)adopt(chunk);}return chunks;},
  set(value){descriptor.set.call(values,value);}});
 const shadows=new Map();
 return{
  get chunks(){return owned.size;},
  /** Projected-shadow indices of every current resident chunk, with the
   * chunk's shadow CPU record as a live store lease (the shadow allocation
   * names it as a borrowed parent beside the main geometry). One indices
   * array is one store entry (charged once) that each chunk leases; a later
   * call returns the chunk's previous wrapper lease once the new one is
   * installed (a shadow allocation already built on it holds its own
   * dependency retain, so it stays valid). */
  shadow(indices){
   if(released)throw Error('f6prog-upload-chunks: shadow after release');
   for(const chunk of values.sceneChunks??[]){
    const lease=store.acquire({contentKey:'f6prog-upload-shadow:'+arrayKey(indices),role:'source',estimate:{category:'packed',bytes:indices.byteLength,precision:'exact'},produce:()=>indices});
    if(lease.state!=='ready'){lease.release();throw Error('f6prog-upload-chunks: synchronous shadow lease did not settle');}
    const previous=shadows.get(chunk);shadows.set(chunk,lease);Object.assign(chunk,{shadowIndices:indices,shadowCPU:lease});previous?.release();
   }
  },
  release(){if(released)return;released=true;for(const lease of shadows.values())lease.release();shadows.clear();for(const {cpu,state}of owned.values()){state.release();cpu.release();}owned.clear();sharedArrays?.release();sharedArrays=undefined;for(const masks of chunkMasks.splice(0))masks.destroy();Object.defineProperty(values,'sceneChunks',descriptor);},
 };
}
