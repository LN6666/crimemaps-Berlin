import type {BuildingComponent} from '../../../safety/building-mesh-types';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
type Materials={objects:number;vertices:number;actualVisualAccepted:boolean};
type Builder={
 reconstruct(components:BuildingComponent[],scope?:FrozenDataScope):{components:BuildingComponent[];stats:OwnerReconstructionStats};
 baseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope):Materials;
 /** The original module's batch-scope data preparation, when it has one. */
 prepareData?(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>|void;
};
export type OwnerInitializationWait=<T>(operation:Promise<T>)=>Promise<T>;
const identityWait:OwnerInitializationWait=operation=>operation;
type ScopedOwnerModule={readonly root500DataFunctionArities?:Readonly<Record<string,number>>;prepareRoot500Data?:(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope)=>Promise<void>|void;readonly [name:string]:unknown};
/** A loaded original builder module with its batch scope: the scope follows the
 * original arguments at the position its root500DataFunctionArities names
 * (exactly as the canonical aggregate passes it), and data preparation is the
 * module's own prepareRoot500Data. */
export function scopedOwnerBuilder(loaded:object,reconstruct:string,materials:string):Builder{
 const module=loaded as ScopedOwnerModule,target=(name:string)=>{const value=module[name];if(typeof value!=='function')throw Error(name+' original module does not export its builder');return value as (...values:unknown[])=>any;};
 const builders={[reconstruct]:target(reconstruct),[materials]:target(materials)},prepareData=module.prepareRoot500Data;
 function call(name:string,args:unknown[],scope:FrozenDataScope|undefined){const arity=module.root500DataFunctionArities?.[name];if(arity!==undefined){while(args.length<arity)args.push(undefined);args.push(scope);}return builders[name](...args);}
 return{
  reconstruct:(components,scope)=>call(reconstruct,[components],scope),
  baseMaterials:(components,paint,frames,scope)=>call(materials,[components,paint,frames],scope),
  ...(prepareData?{prepareData:(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope)=>prepareData(components,signal,scope)}:{})
 };
}
/** Only certified no-match contracts use this facade; matched builders stay unchanged.
 * A batch scope, when given, reaches the loaded builder; prepareScope loads the
 * original only for rows that need it and then prepares that scope's data. */
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
 /** Module only, no data: undefined when loaded already or when no row needs it. */
 function prepareModule(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait):Promise<void>|undefined{
  signal.throwIfAborted();return ready||!components.some(needed)?undefined:prepare(signal,wait);
 }
 async function prepareScope(components:readonly BuildingComponent[],signal:AbortSignal,scope?:FrozenDataScope){
  signal.throwIfAborted();
  if(!ready){if(!components.some(needed))return;await prepare(signal);}
  const module=ready;if(scope&&module?.prepareData)await module.prepareData(components,signal,scope);
  signal.throwIfAborted();
 }
 function builder(components:readonly BuildingComponent[]){if(ready)return ready;if(components.some(needed))throw Error(name+' owner route was not prepared for this city');}
 return {prepare,prepareModule,prepareScope,
  reconstruct(components:BuildingComponent[],scope?:FrozenDataScope){const module=builder(components);if(module)return scope===undefined?module.reconstruct(components):module.reconstruct(components,scope);const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};return{components:copyNoMatch?components.map(c=>c):components,stats};},
  baseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const module=builder(components);return module?(scope===undefined?module.baseMaterials(components,paint,frames):module.baseMaterials(components,paint,frames,scope)):{objects:0,vertices:0,actualVisualAccepted:false};}
 };
}
