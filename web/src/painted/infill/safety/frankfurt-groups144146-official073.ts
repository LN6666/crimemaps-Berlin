import {infillResourceIdentityCandidate,infillResourceHeaderIdentities} from './infill-resource-header-metadata';
import * as frankfurtGroupsData from './frankfurt-groups144146-official073-data';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity,MeshBatch} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {getFRANKFURT_GROUPS144146_NATIVE073 as __infillDataDependency0,getFRANKFURT_GROUPS144146_DATA073 as __infillDataDependency1,FRANKFURT_GROUPS144146_SHA073 as SHA} from './frankfurt-groups144146-official073-data';
export {FRANKFURT_GROUPS144146_SHA073} from './frankfurt-groups144146-official073-data';
type NativePin=ReturnType<typeof __infillDataDependency0>[number];
type PackedBatch=MeshBatch&{paint:Float32Array;frames:Float32Array;geometryRole:string};
const key=(c:Identity)=>c.objectId+'|'+c.partId;




function equal(a:unknown,b:unknown):boolean{
 if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&a===b;
 if(b===null||typeof b!=='object')return a===b;
 if(Array.isArray(b)){if(!(Array.isArray(a)||ArrayBuffer.isView(a))||a instanceof DataView)return false;const q=a as ArrayLike<unknown>;return q.length===b.length&&b.every((v,i)=>equal(q[i],v));}
 if(!a||typeof a!=='object'||Array.isArray(a)||ArrayBuffer.isView(a))return false;
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ak=Object.keys(x).sort(),bk=Object.keys(y).sort();return ak.length===bk.length&&ak.every((v,i)=>v===bk[i]&&equal(x[v],y[v]));
}


/** Nine independent exact present SOURCE carriers. Missing neighbours never create
 * absent objects or a global error. Each original SOURCE header/profile/arrays
 * remains authoritative; official solids are clipped to that SOURCE only.
 * The Volksbank arcade and pavilion roof are explicitly photo-derived geometry.
 * Other known photo planes receive their own industrial/bank/retail materials;
 * undocumented faces keep related base material and no fabricated openings. */

/** Only this module's private unchanged outputs can bind packed RGB and frame
 * families45350..45365/45368. Public IDs or serialized metadata grant no access. */


import * as __infillResourceDependency0 from './frankfurt-groups144146-official073-data';
import * as __infillResourceDependency1 from './frankfurt-groups144146-official073-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("frankfurt-groups144146-official073.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_NATIVE=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_DATA=scopedInfillValue(()=>__infillDataDependency1(scope));
const __infillRead_pins=scopedInfillValue(()=>new Map(__infillRead_NATIVE().map(c=>[key(c),c]))),__infillRead_models=scopedInfillValue(()=>new Map(__infillRead_DATA().map(c=>[key(c),c])));
const __infillRead_sourceGeometry=scopedInfillValue(()=>new Map(__infillRead_NATIVE().map(c=>[key(c),JSON.parse(c.geometryJSON) as unknown]))),__infillRead_sourceFeature=scopedInfillValue(()=>new Map(__infillRead_NATIVE().map(c=>[key(c),JSON.parse(c.sourceFeatureJSON) as unknown])));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,{source:BuildingComponent;fingerprint:string;paint:Float32Array;frames:Float32Array}>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,BuildingComponent>());
function frankfurtGroups144146Official073Identity(c:Identity&{city?:string}):boolean{return(c.city===undefined||c.city==='frankfurt')&&__infillRead_pins().has(key(c));}
function exactSource(c:BuildingComponent,r:NativePin):boolean{try{
 if(c.city!=='frankfurt'||!equal(c.origin,r.origin)||!equal(c.componentGeometry,__infillRead_sourceGeometry().get(key(r)))||!equal(c.sourceFeature,__infillRead_sourceFeature().get(key(r)))||c.batches.length!==r.batches.length)return false;
 if(!c.batches.every((b,i)=>(b.faceRole??null)===r.batches[i].faceRole&&(['positions','normals','indices','color'] as const).every(f=>equal(b[f],r.batches[i][f]))))return false;
 const f=ownerDisplayFingerprint(c);return nativePaintSignature(c)===r.signature&&f.fingerprint===r.fingerprint&&f.vertices===r.vertices&&f.indices===r.indices;
}catch{return false;}}
function exactOwned(c:BuildingComponent):boolean{const r=__infillRead_owned().get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint&&exactSource(r.source,__infillRead_pins().get(key(c))!);}catch{return false;}}

function infillSourceReadyForDisplay(components:BuildingComponent[]):boolean{
const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
const grouped=new Map<string,BuildingComponent[]>();
for(const c of components)if(c.city==='frankfurt'&&__infillRead_pins().has(key(c))){const a=grouped.get(key(c))??[];a.push(c);grouped.set(key(c),a);}
const valid=new Set<BuildingComponent>(),rejected:string[]=[];
for(const[k,a]of grouped){const c=a[0];if(a.length===1&&(__infillRead_owned().has(c)?exactOwned(c):exactSource(c,__infillRead_pins().get(k)!)))valid.add(c);else rejected.push(k);}
return valid.size>0;
}
function frankfurtGroups144146Official073Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const grouped=new Map<string,BuildingComponent[]>();for(const c of components)if(c.city==='frankfurt'&&__infillRead_pins().has(key(c))){const a=grouped.get(key(c))??[];a.push(c);grouped.set(key(c),a);}
 const valid=new Set<BuildingComponent>(),rejected:string[]=[];
 for(const[k,a]of grouped){const c=a[0];if(a.length===1&&(__infillRead_owned().has(c)?exactOwned(c):exactSource(c,__infillRead_pins().get(k)!)))valid.add(c);else rejected.push(k);}
 let changed=false;
 const out=components.map(c=>{
  if(!valid.has(c)||__infillRead_owned().has(c))return c;
  let result=__infillRead_cache().get(c);if(result&&!exactOwned(result)){rejected.push(key(c));return c;}
  const model=__infillRead_models().get(key(c))!;
  if(!result){
   const batches:PackedBatch[]=model.batches.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color] as [number,number,number],faceRole:b.faceRole,geometryRole:b.geometryRole,paint:new Float32Array(b.paint),frames:new Float32Array(b.frames)}));
   result={...c,origin:[...model.origin] as [number,number],batches,displayEstimates:{...c.displayEstimates,frankfurtGroups144146Official073:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,group:model.group,independentExactPresentSource:true,noSourceRecovery:true,coordinates:'renderer East/Up/North; original native origin retained',absoluteDatumM:model.datumAbsoluteM,datumCRS:'EPSG7423 ETRS89 latitude/longitude and EVRF2007 gravity H',officialGeometry:'original roof/ground planes clipped to exact SOURCE; coincident internal interfaces removed',photoArcade:c.objectId==='osm/way/174636083'?{soffitHeightM:7.2,uncertaintyM:1,recessDepthM:2.5,depthUncertaintyM:.5,longBays:6,shortBays:4,pierWidthM:.72,pierDepthM:.8,sourceClipped:true,curvedShopfrontApproximatedByStraightSourceParallelPlanes:true}:undefined,photoPavilion:c.objectId==='osm/way/69748618'?{officialMaximumRoofAbsoluteM:104.572,dropM:.4,dropUncertaintyM:.2,slabThicknessM:.1,frontGlassInsetM:.55,returnInsetM:.4,fourThinPosts:true}:undefined,roofMaterials:'continuous metric coordinates on real roof planes; no per-triangle DOP colours',unmatchedSourceDomains:'not height-filled; three tiny measured lower-domain gaps remain explicit in C proof',unknownFacades:'related base only; no borrowed church windows or generic office grid',actualVisualAccepted:false,quality500Accepted:false}}};
   __infillRead_owned().set(result,{source:c,fingerprint:ownerDisplayFingerprint(result).fingerprint,paint:new Float32Array(batches.flatMap(b=>Array.from(b.paint))),frames:new Float32Array(batches.flatMap(b=>Array.from(b.frames)))});__infillRead_cache().set(c,result);
  }
  changed=true;const vertices=result.batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=result.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=__infillRead_pins().get(key(c))!.vertices;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:SHA,vertices,triangles,geometryRole:'SOURCE-clipped-official-body-with-explicit-photo-arcade-or-canopy-and-plane-bound-material'});return result;
 });return{components:changed?out:components,stats,rejected};
}
function frankfurtGroups144146Official073BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('FRA144–146 exact packed lengths required');
 for(const c of components)if(__infillRead_owned().has(c)&&!exactOwned(c))throw Error('FRA144–146 private DISPLAY or SOURCE changed');
 let at=0,objects=0,vertices=0;for(const c of components){const n=c.batches.reduce((m,b)=>m+b.positions.length/3,0),r=__infillRead_owned().get(c);if(r){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}

return {infillSourceReadyForDisplay,get pins(){return __infillRead_pins();},get models(){return __infillRead_models();},get sourceGeometry(){return __infillRead_sourceGeometry();},get sourceFeature(){return __infillRead_sourceFeature();},get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},frankfurtGroups144146Official073Identity,frankfurtGroups144146Official073Reconstruction,frankfurtGroups144146Official073BaseMaterials};
});}
function getpins(scope:FrozenDataScope|undefined){return getInfillData(scope).pins;}
function getmodels(scope:FrozenDataScope|undefined){return getInfillData(scope).models;}
function getsourceGeometry(scope:FrozenDataScope|undefined){return getInfillData(scope).sourceGeometry;}
function getsourceFeature(scope:FrozenDataScope|undefined){return getInfillData(scope).sourceFeature;}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
export function frankfurtGroups144146Official073Identity(...args:[...Parameters<ReturnType<typeof getInfillData>['frankfurtGroups144146Official073Identity']>,scope?:FrozenDataScope]){const c=args[0];return(c.city===undefined||c.city==='frankfurt')&&infillResourceHeaderIdentities(frankfurtGroupsData.infillDataRefs[0]).some(row=>key(row)===key(c));}
export function frankfurtGroups144146Official073Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['frankfurtGroups144146Official073Reconstruction']>,scope?:FrozenDataScope]){if(!mayMatchInfillData(args[0])){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};return{components:args[0],stats,rejected:[] as string[]};}const scope=args[1] as FrozenDataScope|undefined;return getInfillData(scope).frankfurtGroups144146Official073Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['frankfurtGroups144146Official073Reconstruction']>);}
export function frankfurtGroups144146Official073BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['frankfurtGroups144146Official073BaseMaterials']>,scope?:FrozenDataScope]){if(!mayMatchInfillData(args[0])&&(!args[3]||!args[0].some(c=>getInfillData(args[3]).owned.has(c)))){const [components,paint,frames]=args;const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('FRA144–146 exact packed lengths required');return{objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};}const scope=args[3] as FrozenDataScope|undefined;return getInfillData(scope).frankfurtGroups144146Official073BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['frankfurtGroups144146Official073BaseMaterials']>);}
export const infillDataFunctionArities={"frankfurtGroups144146Official073Identity":1,"frankfurtGroups144146Official073Reconstruction":1,"frankfurtGroups144146Official073BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,__infillResourceDependency1];

export const infillDataMetadataFunctions=['frankfurtGroups144146Official073Identity'] as const;
export const mayMatchInfillData=(components:readonly BuildingComponent[]):boolean=>components.some(c=>c.city==='frankfurt'&&infillResourceIdentityCandidate('frankfurt-groups144146-official073.ts',c));
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();if(!mayMatchInfillData(components))return;
 await frankfurtGroupsData.prepareFrankfurtGroups144146Native(signal,scope);signal.throwIfAborted();
 if(getInfillData(scope).infillSourceReadyForDisplay(components as BuildingComponent[]))await frankfurtGroupsData.prepareFrankfurtGroups144146Display(signal,scope);
 signal.throwIfAborted();
}
