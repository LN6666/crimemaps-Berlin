import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent} from "../../../safety/building-mesh-types";

export type InfillDataPreparationContext={visiting:Set<InfillDataModule>;completed:Set<InfillDataModule>};
export type InfillDataIdentity={city:string;objectId:string;partId:string};
export type InfillDataDemandInput=InfillDataIdentity&{readonly componentGeometry?:BuildingComponent['componentGeometry'];readonly origin?:BuildingComponent['origin']};

/** The module describes its own construction state. Dependencies are read only
 * after module initialization, including existing cyclic recipe imports. */
export interface InfillDataModule {
 readonly [name:string]:unknown;
 readonly infillDataRefs?:readonly FrozenDataRef[];
 readonly infillDataMemoKeys?:readonly object[];
 readonly infillDataFunctionArities?:Readonly<Record<string,number>>;
 readonly infillDataMetadataFunctions?:readonly string[];
 readonly infillDataResidentRefs?:readonly FrozenDataRef[];
 readonly infillDataResidentMemoKeys?:readonly object[];
 readonly infillDataConstructionRetirement?:{readonly refs:readonly FrozenDataRef[];readonly memoKeys:readonly object[]};
 infillProgressiveObjectDemand?:(components:readonly InfillDataDemandInput[])=>readonly InfillDataIdentity[];
 infillDataDependencies?:()=>readonly InfillDataModule[];
 mayMatchInfillData?:(components:readonly BuildingComponent[])=>boolean;
 prepareInfillData?:(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext)=>Promise<void>;
 /** A parent has already selected this payload and its preparation phase. */
 prepareInfillDataPayload?:(signal:AbortSignal,scope:FrozenDataScope)=>Promise<void>;
}
/** A factory-local cell, owned and retired with that factory's scope memo. */
export function scopedInfillValue<T>(read:()=>T):()=>T{
 let cell:{value:T}|undefined;
 return()=>{if(!cell)cell={value:read()};return cell.value;};
}
export function collectInfillDataConstruction(module:InfillDataModule){
 const seen=new Set<InfillDataModule>(),refs=new Map<string,FrozenDataRef>(),memoKeys=new Set<object>();
 const visit=(value:InfillDataModule)=>{
  if(seen.has(value))return;seen.add(value);
  for(const ref of value.infillDataRefs??[])refs.set(JSON.stringify([ref.canonicalSHA256,ref.file,ref.occurrence,ref.codec]),ref);
  for(const key of value.infillDataMemoKeys??[])memoKeys.add(key);
  for(const dependency of value.infillDataDependencies?.()??[])visit(dependency);
 };
 visit(module);return{refs:[...refs.values()],memoKeys:[...memoKeys]};
}
