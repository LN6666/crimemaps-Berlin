import type {BuildingComponent} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {ownerF029Identity} from './owner-f029-identities';
export {ownerF029Identity} from './owner-f029-identities';
type Builder=typeof import('./owner-f029-reconstruction');
type Wait=<T>(operation:Promise<T>)=>Promise<T>;
const identityWait:Wait=operation=>operation;
/** F029 only: preserve its synchronous renderer contract after a shard awaits preparation. */
export function createOwnerF029Loader(load:()=>Promise<Builder>=()=>import('./owner-f029-reconstruction')){
 let ready:Builder|undefined,pending:Promise<Builder>|undefined;
 const needed=(components:readonly BuildingComponent[])=>components.some(c=>c.city==='berlin'&&ownerF029Identity(c));
 async function prepare(components:readonly BuildingComponent[],signal:AbortSignal,wait:Wait=identityWait){
  signal.throwIfAborted();if(ready||!needed(components))return;
  if(!pending){const next=Promise.resolve().then(load);pending=next;void next.catch(()=>{if(pending===next)pending=undefined;});}
  const operation=wait(pending);
  const value=await new Promise<Builder>((resolve,reject)=>{
   let done=false;const cleanup=()=>{if(done)return false;done=true;signal.removeEventListener('abort',cancel);return true;};
   const cancel=()=>{if(cleanup())reject(signal.reason??new DOMException('Aborted','AbortError'));};
   signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
   operation.then(value=>{if(cleanup())resolve(value);},error=>{if(cleanup())reject(error);});
  });
  signal.throwIfAborted();ready=value;
 }
 function builder(components:readonly BuildingComponent[]){if(ready)return ready;if(needed(components))throw Error('F029 owner builder was not prepared for this shard');}
 return {prepare,
  reconstruct(components:BuildingComponent[]){const module=builder(components);if(module)return module.ownerF029Reconstruction(components);const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};return{components:components.map(c=>c),stats};},
  baseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){builder(components)?.ownerF029BaseMaterials(components,paint,frames);}
 };
}
const loader=createOwnerF029Loader();
export const prepareOwnerF029Reconstruction=loader.prepare;
export const ownerF029Reconstruction=loader.reconstruct;
export const ownerF029BaseMaterials=loader.baseMaterials;
