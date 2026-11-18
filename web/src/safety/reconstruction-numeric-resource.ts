import type {FrozenDataRef} from './frozen-data-lease-store';
import type {FrozenDataScope} from './frozen-data-scope';
import type {ChunkResourceLease} from './render-runtime/chunk-resource-types';
import type {ResourceBudgetCost} from './render-runtime/resource-budget';
import {frozenResourceIdentityKey} from './reconstruction-resource-parents';

type RowIdentity={objectId:string;partId:string|null};
type NumericBatch={positions:ArrayLike<number>;normals:ArrayLike<number>;indices:ArrayLike<number>;color?:ArrayLike<number>;paint?:ArrayLike<number>;frames?:ArrayLike<number>};
type NumericCopy={positions:Float32Array|number[];normals:Float32Array|number[];indices:Uint32Array|number[];color?:number[];paint?:number[];frames?:number[]};
export type ReconstructionNumericLayout='typed-geometry'|'typed-empty-alias'|'typed-owned-color-origin'|'number-geometry-color'|'number-geometry-materials';
type NumericPayload={batches:NumericCopy[];origin?:[number,number];metadataBytes:number};
type NumericRequest={recipeSHA256:string;rowAuthority:readonly unknown[];sourceRefs:readonly FrozenDataRef[];aliasRefs?:readonly FrozenDataRef[];batches:readonly NumericBatch[];layout:ReconstructionNumericLayout;origin?:readonly number[]};
const fields=['positions','normals','indices','color','paint','frames'] as const;
const refKey=(ref:FrozenDataRef)=>JSON.stringify([ref.canonicalSHA256,ref.file,ref.occurrence,ref.codec]);

/** Fixed recipe identities only. Neither the map nor the tokens retain rows. */
export function reconstructionNumericMemoKeys(rows:readonly RowIdentity[]){
 const keys=new Map(rows.map(row=>[row.objectId+'|'+row.partId,Object.freeze({})]));
 return{all:[...keys.values()],forRow(row:RowIdentity):object{const key=keys.get(row.objectId+'|'+row.partId);if(!key)throw Error('Reconstruction numeric row has no verified identity');return key;}};
}

function numericCosts(value:NumericPayload):ResourceBudgetCost[]{
 const costs:ResourceBudgetCost[]=[{category:'metadata',bytes:value.metadataBytes,precision:'estimate',identity:value}];
 const add=(data:Float32Array|Uint32Array|number[])=>costs.push(ArrayBuffer.isView(data)?{category:'decoded',bytes:data.buffer.byteLength,precision:'exact',identity:data.buffer}:{category:'decoded',bytes:32+data.length*8,precision:'estimate',identity:data});
 for(const batch of value.batches)for(const field of fields){const data=batch[field];if(data)add(data);}
 if(value.origin)add(value.origin);return costs;
}
function numericEstimate(batches:readonly NumericBatch[],layout:ReconstructionNumericLayout,metadataBytes:number):ResourceBudgetCost[]{
 let typedBytes=0,arrayBytes=0;const array=(length:number)=>{arrayBytes+=32+length*8;};
 for(const batch of batches){
  if(layout==='number-geometry-color'||layout==='number-geometry-materials'){
   for(const field of ['positions','normals','indices','color'] as const)array(batch[field]!.length);
   if(layout==='number-geometry-materials'){array(batch.paint!.length);array(batch.frames!.length);}
  }else{
   typedBytes+=(batch.positions.length+batch.normals.length+(layout==='typed-empty-alias'?0:batch.indices.length))*4;
   if(layout==='typed-empty-alias'){array(batch.positions.length/3*4);array(batch.positions.length/3*5);}
   if(layout==='typed-owned-color-origin')array(batch.color!.length);
  }
 }
 if(layout==='typed-owned-color-origin')array(2);
 return[{category:'decoded',bytes:typedBytes,precision:'exact'},{category:'decoded',bytes:arrayBytes,precision:'estimate'},{category:'metadata',bytes:metadataBytes,precision:'estimate'}];
}
function produceNumeric(batches:readonly NumericBatch[],layout:ReconstructionNumericLayout,origin:readonly number[]|undefined,metadataBytes:number):NumericPayload{
 const copies=batches.map((batch):NumericCopy=>{
  if(layout==='number-geometry-color'||layout==='number-geometry-materials')return{positions:Array.from(batch.positions),normals:Array.from(batch.normals),indices:Array.from(batch.indices),color:Array.from(batch.color!),...(layout==='number-geometry-materials'?{paint:Array.from(batch.paint!),frames:Array.from(batch.frames!)}:{})};
  return{positions:new Float32Array(batch.positions),normals:new Float32Array(batch.normals),indices:layout==='typed-empty-alias'?new Uint32Array():new Uint32Array(batch.indices),...(layout==='typed-empty-alias'?{paint:Array(batch.positions.length/3*4).fill(0),frames:Array(batch.positions.length/3*5).fill(0)}:{}),...(layout==='typed-owned-color-origin'?{color:Array.from(batch.color!)}:{})};
 });
 return{batches:copies,metadataBytes,...(layout==='typed-owned-color-origin'?{origin:[origin![0],origin![1]] as [number,number]}:{})};
}

/** Synchronous admission precedes every numeric allocation. Only new numeric
 * payloads enter the shared store; verified alias parents are independent
 * leases. Selection/composition keys never enter a row's stable identity. */
export function createReconstructionNumericResource(scope:FrozenDataScope,memoKey:object,request:NumericRequest):NumericPayload{
 const {batches,layout,origin}=request,held:ChunkResourceLease<unknown>[]=[],parents:ChunkResourceLease<unknown>[]=[],identities:unknown[]=[],aliases=new Set((request.aliasRefs??[]).map(refKey));
 const refs=new Map([...request.sourceRefs,...(request.aliasRefs??[])].map(ref=>[refKey(ref),ref]));
 try{
  for(const [key,ref]of refs){const identity=scope.preparedResourceIdentity(ref),parent=scope.retainResource(ref,'dependency');held.push(parent);identities.push(frozenResourceIdentityKey(identity));if(aliases.has(key))parents.push(parent);}
  const contentKey=JSON.stringify(['reconstruction-numeric-v1',layout,request.recipeSHA256,request.rowAuthority,identities]),metadataBytes=128+batches.length*256+contentKey.length*2;
  return scope.resourceMemo(memoKey,{contentKey,parents,estimate:numericEstimate(batches,layout,metadataBytes),produce:()=>produceNumeric(batches,layout,origin,metadataBytes),costs:numericCosts});
 }finally{for(const parent of held)parent.release();}
}
