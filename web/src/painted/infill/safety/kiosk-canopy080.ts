import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity,MeshBatch} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {frankfurtGroups144146Official073BaseMaterials as __infillFunctionDependency0} from './frankfurt-groups144146-official073';
import {KIOSK_CANOPY080_SHA as SHA,KIOSK_CANOPY080_SOURCE as SOURCE,KIOSK_CANOPY080_SOURCE_PIN as PIN,KIOSK_CANOPY080_PAVILION_PIN as PAVILION,KIOSK_CANOPY080_BATCHES as DATA} from './kiosk-canopy080-data';
export {KIOSK_CANOPY080_SHA} from './kiosk-canopy080-data';
type Batch=MeshBatch&{paint:Float32Array;frames:Float32Array;geometryRole:string;sourceEvidence:string};

const key=(c:Identity)=>c.objectId+'|'+c.partId;
export function kioskCanopy080Identity(c:Identity&{city?:string}){return(c.city===undefined||c.city==='frankfurt')&&key(c)===key(PIN);}
function equal(a:unknown,b:unknown):boolean{if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&a===b;if(b===null||typeof b!=='object')return a===b;if(Array.isArray(b)){if(!(Array.isArray(a)||ArrayBuffer.isView(a))||a instanceof DataView)return false;const q=a as ArrayLike<unknown>;return q.length===b.length&&b.every((v,i)=>equal(q[i],v));}if(!a||typeof a!=='object'||Array.isArray(a)||ArrayBuffer.isView(a))return false;const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ak=Object.keys(x).sort(),bk=Object.keys(y).sort();return ak.length===bk.length&&ak.every((v,i)=>v===bk[i]&&equal(x[v],y[v]));}
function exactSource(c:BuildingComponent){try{if(c.city!=='frankfurt'||!kioskCanopy080Identity(c)||!equal(c.origin,SOURCE.origin)||!equal(c.componentGeometry,SOURCE.componentGeometry)||!equal(c.sourceFeature,SOURCE.sourceFeature)||c.batches.length!==SOURCE.batches.length)return false;if(!c.batches.every((b,i)=>(b.faceRole??null)===((SOURCE.batches[i] as MeshBatch).faceRole??null)&&(['positions','normals','indices','color']as const).every(f=>equal(b[f],SOURCE.batches[i][f]))))return false;const f=ownerDisplayFingerprint(c);return nativePaintSignature(c)===PIN.signature&&f.fingerprint===PIN.fingerprint&&f.vertices===PIN.vertices&&f.indices===PIN.indices;}catch{return false;}}

/** Public marker/count/serialized clones cannot authorize a canopy. The existing
 * 073 writer has its own private WeakMap and validates its actual native SOURCE.
 * Allocate only the fixed537-vertex probe; no change to that frozen provider. */

/** Run after existing 073 and all other owners. Only exact existing roof107 is
 * replaced. Missing/changed kiosk or invalid/duplicate107 leaves/restores its real
 * native reference; no SOURCE is generated and no unrelated component changes. */

/** Exact private outputs plus a genuinely present private073 pavilion only.
 * Reconstructed107 alone/public copies receive no material authority. */


import * as __infillResourceDependency0 from './frankfurt-groups144146-official073';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("kiosk-canopy080.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const frankfurtGroups144146Official073BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],args[1],args[2],scope);


const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,{source:BuildingComponent;fingerprint:string;paint:Float32Array;frames:Float32Array}>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,BuildingComponent>());
function exactOwned(c:BuildingComponent){const r=__infillRead_owned().get(c);if(!r)return false;try{return exactSource(r.source)&&c.city==='frankfurt'&&kioskCanopy080Identity(c)&&(c.displayEstimates?.kioskCanopy080 as{patchSHA?:string}|undefined)?.patchSHA===SHA&&ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}}
function privatePavilion(components:BuildingComponent[]):boolean{const a=components.filter(c=>c.city==='frankfurt'&&key(c)===key(PAVILION));if(a.length!==1)return false;const c=a[0];try{const f=ownerDisplayFingerprint(c);if(f.fingerprint!==PAVILION.fingerprint||f.vertices!==PAVILION.vertices||f.indices!==PAVILION.indices||(c.displayEstimates?.frankfurtGroups144146Official073 as{patchSHA?:string}|undefined)?.patchSHA!==PAVILION.patchSHA256)return false;const r=frankfurtGroups144146Official073BaseMaterials([c],new Float32Array(PAVILION.vertices*4),new Float32Array(PAVILION.vertices*5),scope);return r.objects===1&&r.vertices===PAVILION.vertices;}catch{return false;}}
function kioskCanopy080Reconstruction(components:BuildingComponent[]){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},present=components.filter(c=>c.city==='frankfurt'&&kioskCanopy080Identity(c)),ready=present.length===1&&privatePavilion(components),rejected:string[]=[];let changed=false;const out=components.map(c=>{if(!kioskCanopy080Identity(c)||c.city!=='frankfurt')return c;const prior=__infillRead_owned().get(c),source=prior?.source??c;if(!ready||!exactSource(source)||prior&&!exactOwned(c)){if(prior)changed=true;rejected.push(key(c));return source;}if(prior)return c;let result=__infillRead_cache().get(source);if(result&&!exactOwned(result)){rejected.push(key(c));return source;}if(!result){const batches:Batch[]=DATA.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color] as[number,number,number],faceRole:b.faceRole as'roof'|'wall',geometryRole:b.geometryRole,sourceEvidence:b.sourceEvidence,paint:new Float32Array(b.paint),frames:new Float32Array(b.frames)}));result={...source,batches,displayEstimates:{...source.displayEstimates,kioskCanopy080:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,independentOriginalRoofSOURCE:true,dependentOnExactPrivate073Pavilion:true,pavilionPatchSHA:PAVILION.patchSHA256,roofHeightBasis:'photo-derived continuation of existing073 roof plane, not surveyed height',slabThicknessM:.1,originalXZUnchanged:true,newSoffitAtOriginalRoofXZ:true,displayOnlyWindingRepair:true,coordinates:'actual renderer East/Up/North with all-axis origin scale',family:45364,acceptedChurchAndMainPavilionUnmodified:true,noNewSourceOrFormalGroup:true,actualVisualAccepted:false,quality500Accepted:false}}};__infillRead_owned().set(result,{source,fingerprint:ownerDisplayFingerprint(result).fingerprint,paint:new Float32Array(batches.flatMap(b=>Array.from(b.paint))),frames:new Float32Array(batches.flatMap(b=>Array.from(b.frames)))});__infillRead_cache().set(source,result);}changed=true;stats.objects++;stats.vertices+=48;stats.triangles+=28;stats.originalVertices+=40;stats.components.push({objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:48,triangles:28,geometryRole:'original-roof-strip-photo-thin-canopy-with-private073-pavilion-context'});return result;});return{components:changed?out:components,stats,rejected};}
function kioskCanopy080BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Kiosk080 exact packed lengths required');for(const c of components)if(__infillRead_owned().has(c)&&!exactOwned(c))throw Error('Kiosk080 private DISPLAY or SOURCE changed');if(!privatePavilion(components))return{objects:0,vertices:0,actualVisualAccepted:false};let at=0,objects=0,vertices=0;for(const c of components){const n=c.batches.reduce((m,b)=>m+b.positions.length/3,0),r=__infillRead_owned().get(c);if(r){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};}

return {get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},kioskCanopy080Reconstruction,kioskCanopy080BaseMaterials};
});}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
export function kioskCanopy080Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['kioskCanopy080Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return kioskCanopy080ReconstructionCold(args[0],scope);return getInfillData(scope).kioskCanopy080Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['kioskCanopy080Reconstruction']>);}
export function kioskCanopy080BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['kioskCanopy080BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return kioskCanopy080BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).kioskCanopy080BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['kioskCanopy080BaseMaterials']>);}
export const infillDataFunctionArities={"kioskCanopy080Reconstruction":1,"kioskCanopy080BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function kioskCanopy080ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
return {components:components.map(component=>component),stats};}

function kioskCanopy080BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Kiosk080 exact packed lengths required');
return {objects:0,vertices:0,actualVisualAccepted:false};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(c.city==='frankfurt')&&(infillResourceIdentityCandidate("kiosk-canopy080.ts",c)||c.displayEstimates?.kioskCanopy080||c.displayEstimates?.frankfurtGroups144146Official073));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
