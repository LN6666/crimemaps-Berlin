import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {infillFrankfurtLowOfficeBulk70Reconstruction as __infillFunctionDependency0} from './infill-frankfurt-low-office-bulk70';
import {getLOW_OFFICE_DATA as __infillDataDependency0,LOW_OFFICE_SHA} from './infill-frankfurt-low-office-bulk70-data';
import {nativePaintSignature} from './progressive-native-signature';
import {ML61_ENTRY092 as P} from './ml61-entry092-data';

const fields=['objectId','partId','city','origin','componentGeometry','sourceFeature','displayEstimates','batches'];
function canonical(v:any):any{if(ArrayBuffer.isView(v))return Array.from(v as unknown as ArrayLike<number>,canonical);if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).map(([k,x])=>[k,canonical(x)]));return v;}
function equal(a:any,b:any):boolean{if(Object.is(a,b))return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;if(ArrayBuffer.isView(a)||ArrayBuffer.isView(b)||Array.isArray(a)||Array.isArray(b)){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!equal(a[i],b[i]))return false;return true;}const ka=Object.keys(a).filter(k=>a[k]!==undefined),kb=Object.keys(b).filter(k=>b[k]!==undefined);return ka.length===kb.length&&ka.every(k=>kb.includes(k)&&equal(a[k],b[k]));}
const identity=(c:BuildingComponent)=>c.city==='frankfurt'&&c.objectId===P.objectId&&c.partId===P.partId;
const view=(c:any)=>Object.fromEntries(fields.map(k=>[k,c[k]]));

const arrays=['positions','normals','indices','color','paint','frames'];

const header=(c:BuildingComponent)=>Object.fromEntries(Object.entries(c).filter(([k])=>k!=='batches'));
type Receipt={source:BuildingComponent;header:any};

/** Replace the sole bulk70 reconstruction call, preserving its original optional
 * selection. Re-entry unwraps only this module's complete, unchanged own clone.
 * No public metadata or public copied DISPLAY can grant the entrance marker. */

/** Final packed-only writer. Whole own DISPLAY + all prior packed values are
 * checked before any write. Geometry, paint, family and owner receipts stay exact. */


import * as __infillResourceDependency0 from './infill-frankfurt-low-office-bulk70';
import * as __infillResourceDependency1 from './infill-frankfurt-low-office-bulk70-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("ml61-entry092.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const infillFrankfurtLowOfficeBulk70Reconstruction=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],args[1],scope);

const __infillRead_LOW_OFFICE_DATA=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_MODEL=scopedInfillValue(()=>__infillRead_LOW_OFFICE_DATA().groups.find((g:any)=>g.queueId===P.queueId).models[0]);
const sameNative=(c:BuildingComponent)=>LOW_OFFICE_SHA===P.requiredBulkSHA&&identity(c)&&Object.keys(c).every(k=>fields.includes(k))&&nativePaintSignature(c)===P.nativeSignature&&equal(view(c),view(__infillRead_MODEL().source));
function sameDisplay(c:BuildingComponent){return identity(c)&&c.batches.length===__infillRead_MODEL().display.length&&c.batches.every((b,bi)=>Object.keys(b).every(k=>arrays.includes(k))&&arrays.every(k=>equal((b as any)[k],__infillRead_MODEL().display[bi][k])));}
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,Receipt>());
function unchanged(c:BuildingComponent,r:Receipt){return sameNative(r.source)&&sameDisplay(c)&&equal(header(c),r.header);}
function ml61Entry092Reconstruction(components:BuildingComponent[],selectedQueueIds?:string[]){
 const input=components.map(c=>{const r=__infillRead_owned().get(c);return r&&unchanged(c,r)?r.source:c;});
 const rows=input.filter(identity),source=rows.length===1&&sameNative(rows[0])?rows[0]:undefined;
 const result=infillFrankfurtLowOfficeBulk70Reconstruction(input,selectedQueueIds,scope);
 if(source){const matches=result.components.filter(identity);if(matches.length===1&&matches[0]!==source&&sameDisplay(matches[0]))__infillRead_owned().set(matches[0],{source,header:canonical(header(matches[0]))});}
 return result;
}
function ml61Entry092MaterialFrames(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 let at=0,vertices=0,objects=0;for(const c of components){const n=c.batches.reduce((a,b)=>a+b.positions.length/3,0),r=__infillRead_owned().get(c);if(r&&unchanged(c,r)){
  let local=0,valid=true;for(let bi=0;bi<c.batches.length;bi++){const expected=__infillRead_MODEL().display[bi];for(let v=0;v<expected.positions.length/3;v++,local++){
   for(let k=0;k<4;k++)if(!Object.is(paint[(at+local)*4+k],Math.fround(expected.paint[v*4+k])))valid=false;
   for(let k=0;k<5;k++){const isMarker=bi===P.batch&&P.vertices.includes(local as never)&&k===3,got=frames[(at+local)*5+k],old=Math.fround(expected.frames[v*5+k]);if(!(Object.is(got,old)||(isMarker&&got===P.marker)))valid=false;}
  }}if(valid){for(const v of P.vertices)frames[(at+v)*5+3]=P.marker;vertices+=P.vertices.length;objects++;}
 }at+=n;}return{objects,vertices,geometryChanged:false,paintChanged:false,familyChanged:false,actualVisualAccepted:false};
}

return {get MODEL(){return __infillRead_MODEL();},get owned(){return __infillRead_owned();},ml61Entry092Reconstruction,ml61Entry092MaterialFrames};
});}
function getMODEL(scope:FrozenDataScope|undefined){return getInfillData(scope).MODEL;}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
export function ml61Entry092Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['ml61Entry092Reconstruction']>,scope?:FrozenDataScope]){const scope=args[2] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return ml61Entry092ReconstructionCold(args[0],args[1],scope);return getInfillData(scope).ml61Entry092Reconstruction(...args.slice(0,2) as Parameters<ReturnType<typeof getInfillData>['ml61Entry092Reconstruction']>);}
export function ml61Entry092MaterialFrames(...args:[...Parameters<ReturnType<typeof getInfillData>['ml61Entry092MaterialFrames']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return ml61Entry092MaterialFramesCold(args[0],args[1],args[2],scope);return getInfillData(scope).ml61Entry092MaterialFrames(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['ml61Entry092MaterialFrames']>);}
export const infillDataFunctionArities={"ml61Entry092Reconstruction":2,"ml61Entry092MaterialFrames":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,__infillResourceDependency1];

function ml61Entry092ReconstructionCold(components:BuildingComponent[],selectedQueueIds?:string[],scope?:FrozenDataScope){
return __infillFunctionDependency0(components.map(component=>component),selectedQueueIds,scope);}

function ml61Entry092MaterialFramesCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){let at=0,vertices=0,objects=0;
return {objects:0,vertices:0,geometryChanged:false,paintChanged:false,familyChanged:false,actualVisualAccepted:false};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(infillResourceIdentityCandidate("ml61-entry092.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
