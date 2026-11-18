import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity,MeshBatch} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {progressiveAdmission as __infillFunctionDependency0} from './progressive-paint';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {getGARDEN_AGGREGATE086_ROWS as __infillDataDependency0,GARDEN_AGGREGATE086_SHA as SHA} from './garden-aggregate086-data';
export {GARDEN_AGGREGATE086_SHA} from './garden-aggregate086-data';
type Row=ReturnType<typeof __infillDataDependency0>[number];
const slot='infillGardenAggregate086',key=(c:Identity)=>c.objectId+'|'+c.partId;


function exactValue(a:unknown,b:unknown):boolean{
 if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&Object.is(a,b);
 if(b===null||typeof b!=='object')return a===b;
 if(Array.isArray(b)){if(!(Array.isArray(a)||ArrayBuffer.isView(a))||a instanceof DataView)return false;const v=a as ArrayLike<unknown>;return v.length===b.length&&b.every((x,i)=>exactValue(v[i],x));}
 if(!a||typeof a!=='object'||Array.isArray(a)||ArrayBuffer.isView(a))return false;const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ak=Object.keys(x).sort(),bk=Object.keys(y).sort();return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&exactValue(x[k],y[k]));
}
function header(c:BuildingComponent,r:Row){return c.city==='frankfurt'&&key(c)===key(r)&&exactValue(c.origin,r.origin)&&exactValue(c.componentGeometry,r.componentGeometry)&&exactValue(c.sourceFeature,r.sourceFeature);}
function exactNative(c:BuildingComponent,r:Row,scope?:FrozenDataScope){
 try{if(c.displayEstimates?.[slot]||!header(c,r)||c.batches.length!==r.batches.length)return false;
  if(!c.batches.every((b,i)=>(b.faceRole??null)===((r.batches[i]as unknown as{faceRole?:string}).faceRole??null)&&(['positions','normals','indices']as const).every(k=>exactValue(b[k],r.batches[i][k]))&&b.color.length===3&&r.batches[i].color.every((v,j)=>Number.isFinite(b.color[j])&&Object.is(Math.fround(b.color[j]),Math.fround(v)))&&(['paint','frames','writeMask']as const).every(k=>(b as unknown as Record<string,unknown>)[k]===undefined)))return false;
  ownerDisplayFingerprint(c);return nativePaintSignature(c)===r.signature&&exactValue(__infillFunctionDependency0(c,scope),r.admission);
 }catch{return false;}
}

function batchesCopy(bs:BuildingComponent['batches']):MeshBatch[]{return bs.map(b=>({...b,positions:b.positions.slice(),normals:b.normals.slice(),indices:b.indices.slice(),color:[...b.color]as[number,number,number]}));}
function markerRemoved(c:BuildingComponent){const estimates={...c.displayEstimates};delete estimates[slot];return estimates;}


/** Independent C candidate. Only the complete exact five-SOURCE cohort may create
 * four privately owned original-part clones and retire the duplicate parent DISPLAY.
 * All native SOURCE stay external/unchanged. Missing, duplicate, drift or public
 * DISPLAY clones restore the parent's original display; no global error/credit. */






import * as __infillResourceDependency0 from './garden-aggregate086-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("garden-aggregate086.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const progressiveAdmission=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],scope);

const __infillRead_ROWS=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_pins=scopedInfillValue(()=>new Map(__infillRead_ROWS().map(r=>[key(r),r])));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,{source:BuildingComponent;fingerprint:string;marker:object;masked:boolean}>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,BuildingComponent>());
function gardenAggregate086Identity(c:Identity&{city?:string}){return(c.city===undefined||c.city==='frankfurt')&&__infillRead_pins().has(key(c));}
function exactOwned(c:BuildingComponent){const p=__infillRead_owned().get(c),r=__infillRead_pins().get(key(c));if(!p||!r||c.displayEstimates?.[slot]!==p.marker)return false;try{return ownerDisplayFingerprint(c).fingerprint===p.fingerprint&&exactNative(p.source,r,scope);}catch{return false;}}
function restore(c:BuildingComponent,r:Row):BuildingComponent{
 const p=__infillRead_owned().get(c);if(p)return p.source;
 // A public serialization of our source-only parent has lost private ownership.
 // Its exact native header identifies the already-present parent; restore only its
 // stored original mesh, never grant readiness or reconstruct an absent SOURCE.
 if(r.parent&&header(c,r)&&c.batches.length===0&&c.displayEstimates?.[slot])return{...c,batches:batchesCopy(r.batches as unknown as MeshBatch[]),displayEstimates:markerRemoved(c)};
 return c;
}
function make(source:BuildingComponent,r:Row):BuildingComponent{
 const prior=__infillRead_cache().get(source);if(prior&&exactOwned(prior))return prior;
 const marker={patchSHA:SHA,sourceRetained:true,sourceOnlyAlias:r.parent,geometryRole:r.parent?'duplicate-Garden-aggregate-source-only':'unchanged-original-Garden-part-private-readiness',allFourOriginalPartsRequired:true,originalParentHeightM:62.5,parentHeightWasLevelsEstimate:true,originalFourPartTagHeightsM:[60,127,76,100],originalSOURCEGeographicPlanUnionExactlyEqualsParent:true,geometryAndMaterialUpgradeClaimed:false,actualVisualAccepted:false,quality500Accepted:false};
 const result:BuildingComponent={...source,batches:r.parent?[]:batchesCopy(source.batches),displayEstimates:{...source.displayEstimates,[slot]:marker}};
 __infillRead_owned().set(result,{source,fingerprint:ownerDisplayFingerprint(result).fingerprint,marker,masked:r.parent});__infillRead_cache().set(source,result);return result;
}
function gardenAggregate086Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const grouped=new Map<string,BuildingComponent[]>();for(const c of components)if(gardenAggregate086Identity(c)){const a=grouped.get(key(c))??[];a.push(c);grouped.set(key(c),a);}
 const complete=__infillRead_ROWS().every(r=>{const a=grouped.get(key(r));return a?.length===1&&(__infillRead_owned().has(a[0])?exactOwned(a[0]):exactNative(a[0],r,scope));});
 const replacements=new Map<BuildingComponent,BuildingComponent>();
 if(complete){
  for(const r of __infillRead_ROWS().filter(r=>!r.parent)){const c=grouped.get(key(r))![0],p=__infillRead_owned().get(c),out=p?c:make(c,r);if(!exactOwned(out))throw Error('Garden original-part private readiness failed');replacements.set(c,out);}
  const fourPrivate=__infillRead_ROWS().filter(r=>!r.parent).every(r=>exactOwned(replacements.get(grouped.get(key(r))![0])!));
  if(fourPrivate){const r=__infillRead_ROWS().find(r=>r.parent)!,c=grouped.get(key(r))![0],p=__infillRead_owned().get(c);replacements.set(c,p?c:make(c,r));}
 }else for(const c of components){const r=__infillRead_pins().get(key(c));if(c.city==='frankfurt'&&r)replacements.set(c,restore(c,r));}
 let changed=false;const output=components.map(c=>{const out=replacements.get(c)??c;if(out===c)return c;changed=true;const r=__infillRead_pins().get(key(c))!,vertices=out.batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=out.batches.reduce((n,b)=>n+b.indices.length/3,0),original=__infillRead_owned().get(out)?.source??out;stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=original.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:SHA,vertices,triangles,geometryRole:complete?(r.parent?'duplicate-Garden-aggregate-source-only':'unchanged-original-Garden-part-private-readiness'):'original-Garden-display-restored-incomplete-cohort'});return out;});
 return{components:changed?output:components,stats,completeExactCohort:complete};
}

return {get pins(){return __infillRead_pins();},get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},gardenAggregate086Identity,gardenAggregate086Reconstruction};
});}
function getpins(scope:FrozenDataScope|undefined){return getInfillData(scope).pins;}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
export function gardenAggregate086Identity(...args:[...Parameters<ReturnType<typeof getInfillData>['gardenAggregate086Identity']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return gardenAggregate086IdentityCold(args[0],scope);return getInfillData(scope).gardenAggregate086Identity(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['gardenAggregate086Identity']>);}
export function gardenAggregate086Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['gardenAggregate086Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return gardenAggregate086ReconstructionCold(args[0],scope);return getInfillData(scope).gardenAggregate086Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['gardenAggregate086Reconstruction']>);}
export const infillDataFunctionArities={"gardenAggregate086Identity":1,"gardenAggregate086Reconstruction":1} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function gardenAggregate086IdentityCold(c:Identity&{city?:string},scope?:FrozenDataScope){
return false;}

function gardenAggregate086ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
const grouped=new Map<string,BuildingComponent[]>();
for(const c of components)if(gardenAggregate086Identity(c)){const a=grouped.get(key(c))??[];a.push(c);grouped.set(key(c),a);}
return {components,stats,completeExactCohort:false};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(c.city===undefined||c.city==='frankfurt')&&(infillResourceIdentityCandidate("garden-aggregate086.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
