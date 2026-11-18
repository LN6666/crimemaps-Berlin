import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import {fra144WallOverlap079Reconstruction as __infillFunctionDependency0} from './fra144-wall-overlap079';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {FRA144_RESIDUAL_DATA086} from './fra144-residual-materials086-data';
type View={city:string;objectId:string;partId:string;origin:unknown;componentGeometry:unknown;sourceFeature:unknown;displayEstimates:unknown;batches:unknown};
type Pin={objectId:string;partId:string;source:View;currentOutputFingerprint:string;currentVertices:number;currentTriangles:number;independent107:boolean};
const pins=FRA144_RESIDUAL_DATA086 as unknown as readonly Pin[];
const key=(c:Identity)=>c.objectId+'|'+c.partId;
// The runtime codec emits optional properties such as position_cm:undefined;
// JSON SOURCE pins omit those same properties. Only absence/undefined is
// canonicalized. Every defined value, signed zero and buffer value stays exact.
function canonical(value:unknown):unknown{if(!value||typeof value!=='object'||ArrayBuffer.isView(value))return value;if(Array.isArray(value))return value.map(canonical);return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,canonical(v)]));}
const view=(c:BuildingComponent):View=>canonical({city:c.city,objectId:c.objectId,partId:c.partId,origin:c.origin,componentGeometry:c.componentGeometry,sourceFeature:c.sourceFeature,displayEstimates:c.displayEstimates,batches:c.batches}) as View;
function equal(a:unknown,b:unknown):boolean{
 if(typeof a==='number'||typeof b==='number')return typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b)&&Object.is(a,b);
 if(a===b)return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;
 const aa=Array.isArray(a)||ArrayBuffer.isView(a),bb=Array.isArray(b)||ArrayBuffer.isView(b);
 if(aa||bb){if(!aa||!bb)return false;const x=a as unknown as ArrayLike<unknown>,y=b as unknown as ArrayLike<unknown>;if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(!equal(x[i],y[i]))return false;return true;}
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ka=Object.keys(x).sort(),kb=Object.keys(y).sort();if(ka.length!==kb.length)return false;for(let i=0;i<ka.length;i++)if(ka[i]!==kb[i]||!equal(x[ka[i]],y[kb[i]]))return false;return true;
}
const exactSource=(c:BuildingComponent,p:Pin)=>equal(view(c),p.source);
type Owned={source:BuildingComponent;sourceSnapshot:View;displaySnapshot:View;pin:Pin};
function exactOwned(c:BuildingComponent,p:Owned){return equal(view(c),p.displaySnapshot)&&equal(view(p.source),p.sourceSnapshot)&&exactSource(p.source,p.pin);}

/** Replace only the old079 late slot. Its authentic073/079 reconstruction runs
 * once, unchanged; this wrapper only records private material ownership. */

/** Related concrete/stone base on undocumented walls and registered grey service
 * roof colour; no new opening, roof, height or geometry claim. Existing073 key. */


import * as __infillResourceDependency0 from './fra144-wall-overlap079';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("fra144-residual-materials086.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const fra144WallOverlap079Reconstruction=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],scope);


const __infillRead_by=scopedInfillValue(()=>new Map(pins.map(p=>[p.objectId+'|'+p.partId,p])));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,Owned>());
const fra144ResidualMaterials086Identity=(c:Identity&{city?:string})=>c.city==='frankfurt'&&__infillRead_by().has(key(c));
function fra144ResidualMaterials086Reconstruction(components:BuildingComponent[]){
 const source=new Map<string,BuildingComponent>(),counts=new Map<string,number>(),blocked=new Set<string>();
 for(const c of components){const p=__infillRead_by().get(key(c));if(!p)continue;const k=key(c);counts.set(k,(counts.get(k)??0)+1);const previous=__infillRead_owned().get(c);if(previous){if(exactOwned(c,previous))source.set(k,previous.source);else blocked.add(k);}else if(exactSource(c,p))source.set(k,c);}
 const result=fra144WallOverlap079Reconstruction(components,scope);
 for(const c of result.components){const p=__infillRead_by().get(key(c)),s=source.get(key(c));if(!p||!s||blocked.has(key(c))||counts.get(key(c))!==1||!exactSource(s,p))continue;
  // Native variants are valid independent SOURCE carriers. The three clipped
  // variants can arise only from the unchanged079 private reconstruction above.
  const native=exactSource(c,p);if(!native){try{if(ownerDisplayFingerprint(c).fingerprint!==p.currentOutputFingerprint)continue;}catch{continue;}}
  __infillRead_owned().set(c,{source:s,sourceSnapshot:structuredClone(view(s)),displaySnapshot:structuredClone(view(c)),pin:p});
 }
 return result;
}
function fra144ResidualMaterials086MaterialFrames(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 let vertices=0;for(const c of components){if(!c||!Array.isArray(c.batches))return{objects:0,vertices:0};for(const b of c.batches){if(!b||!b.positions||!Number.isSafeInteger(b.positions.length/3))return{objects:0,vertices:0};vertices+=b.positions.length/3;}}if(paint.length!==vertices*4||frames.length!==vertices*5)return{objects:0,vertices:0};
 const counts=new Map<string,number>();for(const c of components)if(__infillRead_by().has(key(c)))counts.set(key(c),(counts.get(key(c))??0)+1);
 const common:[number,number]=[8.6810828,50.1158923],unit=40075016.686*Math.cos(common[1]*Math.PI/180),merc=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));let offset=0,objects=0,written=0;
 for(const c of components){const n=c.batches.reduce((m,b)=>m+b.positions.length/3,0),record=__infillRead_owned().get(c);if(!record||counts.get(key(c))!==1||!exactOwned(c,record)){offset+=n;continue;}
  let clean=true;for(let i=0;i<n*4;i++)if(!Object.is(paint[offset*4+i],0)){clean=false;break;}if(clean)for(let i=0;i<n*5;i++)if(!Object.is(frames[offset*5+i],0)){clean=false;break;}if(!clean){offset+=n;continue;}
  const ratio=unit/(40075016.686*Math.cos(c.origin[1]*Math.PI/180)),east=(c.origin[0]-common[0])*unit/360,north=(merc(c.origin[1])-merc(common[1]))*unit/(2*Math.PI);let at=offset;
  for(const b of c.batches){for(let i=0;i<b.positions.length/3;i++,at++){const ny=b.normals[i*3+1],roof=Math.abs(ny)>.9,family=roof?45353:45352,color=roof?[.51,.52,.49]:[.77,.77,.72];paint.set([...color,2],at*4);frames[at*5]=east+b.positions[i*3]*ratio;frames[at*5+1]=roof?north+b.positions[i*3+2]*ratio:b.positions[i*3+1];frames[at*5+2]=0;frames[at*5+3]=0;frames[at*5+4]=family;}}
  objects++;written+=n;offset+=n;
 }
 return{objects,vertices:written};
}

return {get by(){return __infillRead_by();},get owned(){return __infillRead_owned();},fra144ResidualMaterials086Identity,fra144ResidualMaterials086Reconstruction,fra144ResidualMaterials086MaterialFrames};
});}
function getby(scope:FrozenDataScope|undefined){return getInfillData(scope).by;}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
export function fra144ResidualMaterials086Identity(...args:[...Parameters<ReturnType<typeof getInfillData>['fra144ResidualMaterials086Identity']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return fra144ResidualMaterials086IdentityCold(args[0],scope);return getInfillData(scope).fra144ResidualMaterials086Identity(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['fra144ResidualMaterials086Identity']>);}
export function fra144ResidualMaterials086Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['fra144ResidualMaterials086Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return fra144ResidualMaterials086ReconstructionCold(args[0],scope);return getInfillData(scope).fra144ResidualMaterials086Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['fra144ResidualMaterials086Reconstruction']>);}
export function fra144ResidualMaterials086MaterialFrames(...args:[...Parameters<ReturnType<typeof getInfillData>['fra144ResidualMaterials086MaterialFrames']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return fra144ResidualMaterials086MaterialFramesCold(args[0],args[1],args[2],scope);return getInfillData(scope).fra144ResidualMaterials086MaterialFrames(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['fra144ResidualMaterials086MaterialFrames']>);}
export const infillDataFunctionArities={"fra144ResidualMaterials086Identity":1,"fra144ResidualMaterials086Reconstruction":1,"fra144ResidualMaterials086MaterialFrames":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function fra144ResidualMaterials086IdentityCold(c:Identity&{city?:string},scope?:FrozenDataScope){
return false;}

function fra144ResidualMaterials086ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){
return __infillFunctionDependency0(components,scope);}

function fra144ResidualMaterials086MaterialFramesCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){let vertices=0;
for(const c of components){if(!c||!Array.isArray(c.batches))return{objects:0,vertices:0};for(const b of c.batches){if(!b||!b.positions||!Number.isSafeInteger(b.positions.length/3))return{objects:0,vertices:0};vertices+=b.positions.length/3;}}
if(paint.length!==vertices*4||frames.length!==vertices*5)return{objects:0,vertices:0};
const counts=new Map<string,number>();
return {objects:0,vertices:0};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(c.city==='frankfurt')&&(infillResourceIdentityCandidate("fra144-residual-materials086.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
