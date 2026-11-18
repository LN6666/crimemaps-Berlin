import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {infillC032OfficialReconstruction as __infillFunctionDependency0} from './infill-c032-official-runtime';
import {getHANDELSHOF_BALCONIES103_DATA as __infillDataDependency0} from './handelshof-balconies103-data';

function encode(v:any):any {
 if(v===undefined)return ['undefined'];
 if(typeof v==='number')return ['number',Object.is(v,-0)?'-0':String(v)];
 if(v===null||typeof v!=='object')return v;
 if(Array.isArray(v)||ArrayBuffer.isView(v))return ['array',...Array.from(v as ArrayLike<any>,encode)];
 return ['object',...Object.keys(v).sort().map(k=>[k,encode(v[k])])];
}




/** Replaces only the original C032 reconstruction slot and delegates it exactly once. */

/** Final packed-only override. SOURCE, component arrays, original receipt and geometry stay untouched. */


import * as __infillResourceDependency0 from './infill-c032-official-runtime';
import * as __infillResourceDependency1 from './handelshof-balconies103-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("handelshof-balconies103.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const infillC032OfficialReconstruction=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],scope);

const __infillRead_D=scopedInfillValue(()=>__infillDataDependency0(scope));
function snapshot(c:BuildingComponent){return JSON.stringify(__infillRead_D().sourceKeys.map(k=>[k,Object.prototype.hasOwnProperty.call(c,k),encode((c as any)[k])]));}
const identity=(c:BuildingComponent)=>c.city===__infillRead_D().city&&c.objectId===__infillRead_D().objectId&&c.partId===__infillRead_D().partId;
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,{source:BuildingComponent;displaySnapshot:string;vertices:ReadonlyArray<number>}>());
function exactTriangles(c:BuildingComponent):number[]|undefined {
 const found:number[]=[];let offset=0;
 for(const b of c.batches){
  for(let t=0;t<b.indices.length;t+=3){
   const ids=[b.indices[t],b.indices[t+1],b.indices[t+2]];
   const xyz=ids.map(v=>[...Array.from(b.positions.slice(v*3,v*3+3)),...Array.from(b.normals.slice(v*3,v*3+3))]);
   if(__infillRead_D().groups.some(g=>g.triangles.some(tri=>tri.every((v,k)=>v.every((x,j)=>x===xyz[k][j])))))found.push(...ids.map(v=>v+offset));
  }
  offset+=b.positions.length/3;
 }
 return found.length===12&&new Set(found).size===12?found:undefined;
}
function handelshofBalconies103Reconstruction(components:BuildingComponent[]){
 const sources=components.filter(identity),source=sources.length===1?sources[0]:undefined;
 const valid=source&&snapshot(source)===__infillRead_D().sourceSnapshot;
 const result=infillC032OfficialReconstruction(components,scope);
 if(valid){
  const displays=result.components.filter(identity),display=displays.length===1?displays[0]:undefined;
  if(display&&display!==source){const vertices=exactTriangles(display);if(vertices)__infillRead_owned().set(display,{source,vertices,displaySnapshot:snapshot(display)});}
 }
 return result;
}
function handelshofBalconies103BaseMaterials(components:BuildingComponent[],_paint:Float32Array,frames:Float32Array){
 let offset=0,objects=0,vertices=0;
 for(const c of components){
  const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),record=__infillRead_owned().get(c);
  if(record&&snapshot(record.source)===__infillRead_D().sourceSnapshot&&snapshot(c)===record.displaySnapshot){
   // The original material writer must already have produced exactly its known street frame.
   const valid=record.vertices.every(v=>frames[(offset+v)*5+4]===26103&&frames[(offset+v)*5+3]===1);
   if(valid){for(const v of record.vertices){frames[(offset+v)*5+3]=__infillRead_D().marker;frames[(offset+v)*5+4]=__infillRead_D().family;}objects++;vertices+=record.vertices.length;}
  }
  offset+=n;
 }
 return {objects,vertices};
}

return {get owned(){return __infillRead_owned();},handelshofBalconies103Reconstruction,handelshofBalconies103BaseMaterials};
});}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
export function handelshofBalconies103Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['handelshofBalconies103Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return handelshofBalconies103ReconstructionCold(args[0],scope);return getInfillData(scope).handelshofBalconies103Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['handelshofBalconies103Reconstruction']>);}
export function handelshofBalconies103BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['handelshofBalconies103BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return handelshofBalconies103BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).handelshofBalconies103BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['handelshofBalconies103BaseMaterials']>);}
export const infillDataFunctionArities={"handelshofBalconies103Reconstruction":1,"handelshofBalconies103BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,__infillResourceDependency1];

function handelshofBalconies103ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){
return __infillFunctionDependency0(components,scope);}

function handelshofBalconies103BaseMaterialsCold(components:BuildingComponent[],_paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){let offset=0,objects=0,vertices=0;
return {objects:0,vertices:0};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(infillResourceIdentityCandidate("handelshof-balconies103.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
