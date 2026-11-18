import type {BuildingComponent} from "../../../safety/building-mesh-types";
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
export type {InfillDataModule} from './infill-data-contract';

type OwnerModule=InfillDataModule&{
 readonly root500DataRefs?:readonly FrozenDataRef[];
 readonly root500DataFunctionArities?:Readonly<Record<string,number>>;
 prepareRoot500Data?:(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope)=>Promise<void>;
 prepareInfillDataForFunction?:(name:string,components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope)=>Promise<void>;
};
type FunctionOwner={module:OwnerModule;name:string};
// Only immutable code namespaces and function identities are registered here.
// Resource values, scopes, components and prepared results never enter this map.
const functions=new WeakMap<Function,FunctionOwner>();
const registered=new WeakSet<object>();
function preparationPriority(owner:FunctionOwner):number{
 const module=owner.module;
 if(module.prepareInfillDataForFunction)return 4;
 const scoped=module.infillDataFunctionArities?.[owner.name]!==undefined||module.root500DataFunctionArities?.[owner.name]!==undefined;
 if(scoped&&(module.prepareInfillData||module.prepareRoot500Data))return 3;
 if(module.prepareInfillData||module.prepareRoot500Data)return 2;
 return scoped?1:0;
}
export function registerInfillOwnerModule(module:InfillDataModule):void{
 if(registered.has(module))return;registered.add(module);
 for(const[name,value]of Object.entries(module))if(typeof value==='function'){const next={module:module as OwnerModule,name},previous=functions.get(value);if(!previous||preparationPriority(next)>preparationPriority(previous))functions.set(value,next);}
 for(const dependency of module.infillDataDependencies?.()??[])registerInfillOwnerModule(dependency);
}
export function registerInfillOwnerModules(modules:readonly InfillDataModule[]):void{for(const module of modules)registerInfillOwnerModule(module);}

/** Preparation follows the original module's own guard and ordering. In
 * particular a thin root500 route keeps its SOURCE -> exact guard -> DISPLAY
 * protocol; a namespace with refs but no preparation hook cannot fake ready. */
export async function prepareInfillOwnerModule(module:InfillDataModule,components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext):Promise<void>{
 signal.throwIfAborted();const owner=module as OwnerModule,call=context??{visiting:new Set<InfillDataModule>(),completed:new Set<InfillDataModule>()};
 if(call.completed.has(module)||call.visiting.has(module))return;
 call.visiting.add(module);
 try{
  if(owner.prepareInfillData)await owner.prepareInfillData(components,signal,scope,call);
  else if(owner.prepareRoot500Data)await owner.prepareRoot500Data(components,signal,scope);
  else if(owner.prepareInfillDataPayload)await owner.prepareInfillDataPayload(signal,scope);
  else if(owner.infillDataRefs?.length||owner.root500DataRefs?.length||owner.infillDataDependencies?.().length)throw Error('Infill data module is missing its preparation hook');
  signal.throwIfAborted();call.completed.add(module);
 }finally{call.visiting.delete(module);}
}

/** Only an already guarded consumer chooses this dependency/payload phase.
 * Back edges stop recursion, while the outer await still owns completion of
 * every module on the path before any original computation is resumed. */
export async function prepareInfillDataResources(module:InfillDataModule,components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext):Promise<void>{
 signal.throwIfAborted();const call=context??{visiting:new Set<InfillDataModule>(),completed:new Set<InfillDataModule>()};
 for(const dependency of module.infillDataDependencies?.()??[])await prepareInfillOwnerModule(dependency,components,signal,scope,call);
 if(module.infillDataRefs?.length)await scope.prepare(module.infillDataRefs,signal);
 signal.throwIfAborted();
}

/** The aggregate supplies initialized namespaces lazily to avoid an owner /
 * preparation import cycle. Each invocation uses its actual predecessor rows. */
export async function prepareInfillOwnerFunction(recipe:Function,components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,modules:()=>readonly InfillDataModule[]):Promise<void>{
 signal.throwIfAborted();registerInfillOwnerModules(modules());
 const owner=functions.get(recipe);if(!owner)throw Error('Infill owner preparation has no registered module for '+(recipe.name||'<anonymous>'));
 if(owner.module.infillDataMetadataFunctions?.includes(owner.name))return;
 if(owner.module.prepareInfillDataForFunction)await owner.module.prepareInfillDataForFunction(owner.name,components,signal,scope);
 else await prepareInfillOwnerModule(owner.module,components,signal,scope);
 signal.throwIfAborted();
}

/** Original arity excludes the final data scope, including optional arguments. */
export function infillOwnerFunctionArity(module:InfillDataModule,name:string):number|undefined{
 const owner=module as OwnerModule;return owner.infillDataFunctionArities?.[name]??owner.root500DataFunctionArities?.[name];
}

/** Preserve the original metadata predicate's city/marker guards, while a
 * same-object wrong/missing part still enters its original collision checks. */
export function infillMetadataCandidate(components:readonly BuildingComponent[],predicate:(component:BuildingComponent)=>boolean,pairs:readonly(readonly[string,string])[]):boolean{
 return components.some(component=>predicate(component)||pairs.some(([objectId,partId])=>(component.objectId===objectId||component.partId===partId)&&predicate({...component,objectId,partId})));
}
