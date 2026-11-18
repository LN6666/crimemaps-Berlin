import type {FrozenDataIdentity,FrozenDataRef} from './frozen-data-lease-store';
import type {FrozenDataScope} from './frozen-data-scope';
import type {ChunkResourceLease} from './render-runtime/chunk-resource-types';

export type ReconstructionResource={ref:FrozenDataRef;memoKey?:never}|{memoKey:unknown;ref?:never};
const resources=new WeakMap<FrozenDataScope,WeakMap<object,ReconstructionResource>>();
const numericFields=['positions','normals','indices','color','frames','paint','triangleProvenance'] as const;
type ComponentArrays={origin:readonly number[];batches:readonly object[]};
type ReconstructionParents={parents:ChunkResourceLease<unknown>[];authority:string};
export const frozenResourceIdentityKey=(identity:FrozenDataIdentity)=>[identity.city,identity.profileSHA256,identity.resolvedRawSHA256,identity.canonicalSHA256,identity.file,identity.occurrence,identity.codec];

/** Weak ownership metadata only: no array, component, scope or lease is retained
 * by this registry. Register precisely the fields the named resource owns. */
export function registerReconstructionResourceArrays(scope:FrozenDataScope,values:readonly unknown[],owner:ReconstructionResource):void{
 for(const value of values)if(value&&typeof value==='object')registerReconstructionResourceObject(scope,value,owner);
}
export function registerReconstructionResourceObject(scope:FrozenDataScope,value:object,owner:ReconstructionResource):void{
 let rows=resources.get(scope);if(!rows){rows=new WeakMap();resources.set(scope,rows);}
 // A resource memo may borrow arrays already owned by a prepared table. Never
 // reassign those arrays to the newer container or lose their original parent.
 if(!rows.has(value))rows.set(value,owner);
 if(ArrayBuffer.isView(value)&&!rows.has(value.buffer))rows.set(value.buffer,owner);
}

/** Acquire only parents referenced by these actual packed rows. Inspection is
 * bounded to known batch fields and origin and never invokes a lazy getter.
 * The caller releases these temporary leases after the store has retained them. */
function reconstructionOwners(scope:FrozenDataScope,components:readonly ComponentArrays[]){
 const rows=resources.get(scope),owners=new Map<unknown,ReconstructionResource>();
 if(!rows)return owners;
 const inspect=(value:unknown)=>{if(!value||typeof value!=='object')return;const owner=rows.get(value)??(ArrayBuffer.isView(value)?rows.get(value.buffer):undefined);if(owner)owners.set(owner.ref??owner.memoKey,owner);};
 for(const component of components){
  const origin=Object.getOwnPropertyDescriptor(component,'origin');if(origin&&'value'in origin)inspect(origin.value);
  const batches=Object.getOwnPropertyDescriptor(component,'batches');if(!batches||!('value'in batches)||!Array.isArray(batches.value))continue;
  for(const batch of batches.value)for(const field of numericFields){const property=Object.getOwnPropertyDescriptor(batch,field);if(property&&'value'in property)inspect(property.value);}
 }
 return owners;
}

export function retainReconstructionResourceParents(scope:FrozenDataScope,components:readonly ComponentArrays[]):ReconstructionParents {
 const owners=reconstructionOwners(scope,components),leases:ChunkResourceLease<unknown>[]=[],authority:string[]=[];
 try{
  for(const owner of owners.values()){
   const lease=owner.ref?scope.retainResource(owner.ref,'dependency'):scope.retainMemoResource(owner.memoKey,'dependency');leases.push(lease);
   authority.push(owner.ref?JSON.stringify(['frozen',frozenResourceIdentityKey(scope.preparedResourceIdentity(owner.ref))]):JSON.stringify(['numeric',lease.contentKey]));
  }
  return{parents:leases,authority:JSON.stringify([...new Set(authority)].sort())};
 }
 catch(error){for(const lease of leases)lease.release();throw error;}
}

/** A replayable prepared result still contains these exact numeric arrays after
 * first publication. Keep only their named scope entries addressable until the
 * result is retired; packed chunks retain their own independent parents. */
export function retainReconstructionPreparedInputs(scope:FrozenDataScope,components:readonly ComponentArrays[]):()=>void{
 const owners=[...reconstructionOwners(scope,components).values()];
 if(!owners.length)return()=>{};
 // Validate the current ownership before pinning, including already retired
 // memo entries; a pin must not silently resurrect a missing preparation.
 const checked=retainReconstructionResourceParents(scope,components);
 try{return scope.retainPrepared(owners.flatMap(owner=>owner.ref?[owner.ref]:[]),owners.flatMap(owner=>owner.ref?[]:[owner.memoKey]));}
 finally{for(const parent of checked.parents)parent.release();}
}
