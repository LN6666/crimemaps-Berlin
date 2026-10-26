import type {BuildingComponent} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
type Materials={objects:number;vertices:number;actualVisualAccepted:boolean};
type Builder={reconstruct(components:BuildingComponent[]):{components:BuildingComponent[];stats:OwnerReconstructionStats};baseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array):Materials};
export type OwnerInitializationWait=<T>(operation:Promise<T>)=>Promise<T>;
const identityWait:OwnerInitializationWait=operation=>operation;
/** Only certified no-match contracts use this facade; matched builders stay unchanged. */
export function createLazyOwnerRoute(name:string,needed:(c:BuildingComponent)=>boolean,copyNoMatch:boolean,load:()=>Promise<Builder>){
 let ready:Builder|undefined,pending:Promise<Builder>|undefined;
 async function prepare(signal:AbortSignal,wait:OwnerInitializationWait=identityWait){
  signal.throwIfAborted();if(ready)return;
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
 function builder(components:readonly BuildingComponent[]){if(ready)return ready;if(components.some(needed))throw Error(name+' owner route was not prepared for this city');}
 return {prepare,
  reconstruct(components:BuildingComponent[]){const module=builder(components);if(module)return module.reconstruct(components);const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};return{components:copyNoMatch?components.map(c=>c):components,stats};},
  baseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){const module=builder(components);return module?module.baseMaterials(components,paint,frames):{objects:0,vertices:0,actualVisualAccepted:false};}
 };
}
