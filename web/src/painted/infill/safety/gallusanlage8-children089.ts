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
import {gallusanlage8Material088BaseMaterials,gallusanlage8Material088Reconstruction} from './gallusanlage8-material088';
import {getGALLUSANLAGE8_CHILDREN_ROWS089 as __infillDataDependency0,GALLUSANLAGE8_CHILDREN_SHA089 as SHA} from './gallusanlage8-children089-data';
export {GALLUSANLAGE8_CHILDREN_SHA089} from './gallusanlage8-children089-data';
type Row=ReturnType<typeof __infillDataDependency0>[number];
const slot='gallusanlage8Children089',key=(c:Identity)=>c.objectId+'|'+c.partId;

function same(a:unknown,b:unknown):boolean{
 if(typeof a==='number'||typeof b==='number')return typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b)&&Object.is(a,b);
 if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
 const aa=Array.isArray(a)||ArrayBuffer.isView(a),bb=Array.isArray(b)||ArrayBuffer.isView(b);
 if(aa||bb){if(!aa||!bb||a instanceof DataView||b instanceof DataView)return false;const x=a as ArrayLike<unknown>,y=b as ArrayLike<unknown>;if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(!same(x[i],y[i]))return false;return true;}
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ka=Object.keys(x).filter(k=>x[k]!==undefined).sort(),kb=Object.keys(y).filter(k=>y[k]!==undefined).sort();return ka.length===kb.length&&ka.every((k,i)=>k===kb[i]&&same(x[k],y[k]));
}
function view(c:BuildingComponent){return{city:c.city,objectId:c.objectId,partId:c.partId,origin:c.origin,componentGeometry:c.componentGeometry,sourceFeature:c.sourceFeature,displayEstimates:c.displayEstimates,batches:c.batches};}
function exactNative(c:BuildingComponent,r:Row){try{return same(view(c),r.source)&&nativePaintSignature(c)===r.signature;}catch{return false;}}
function parentPrivate(c:BuildingComponent){try{return gallusanlage8Material088BaseMaterials([c],new Float32Array(600),new Float32Array(750)).vertices===150;}catch{return false;}}


function copy(bs:BuildingComponent['batches']):MeshBatch[]{return bs.map(b=>({...b,positions:b.positions.slice(),normals:b.normals.slice(),indices:b.indices.slice(),color:[...b.color]as[number,number,number]}));}



/** Runs after088. Full exact SOURCE hierarchy and eight genuinely private,
 * material-ready child clones are mandatory before retiring only parent DISPLAY.
 * Missing/drift/duplicate/public serialization restores its original display. */



import * as __infillResourceDependency0 from './gallusanlage8-children089-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("gallusanlage8-children089.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_ROWS=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_pins=scopedInfillValue(()=>new Map(__infillRead_ROWS().map(r=>[key(r.source),r])));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,{source:BuildingComponent;marker:object;estimates:unknown;fingerprint:string}>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,BuildingComponent>());
function exactOwned(c:BuildingComponent){const p=__infillRead_owned().get(c),r=__infillRead_pins().get(key(c));if(!p||!r||c.displayEstimates?.[slot]!==p.marker||!same(c.displayEstimates,p.estimates))return false;try{return ownerDisplayFingerprint(c).fingerprint===p.fingerprint&&(r.parent?parentPrivate(p.source):exactNative(p.source,r));}catch{return false;}}
function gallusanlage8Children089Identity(c:Identity&{city?:string}){return c.city==='frankfurt'&&__infillRead_pins().has(key(c));}
function make(source:BuildingComponent,r:Row){let out=__infillRead_cache().get(source);if(out&&exactOwned(out))return out;
 const marker={patchSHA:SHA,sourceRetained:true,sourceOnlyAlias:r.parent,geometryRole:r.parent?'exact-native-aggregate-source-only-eight-parts-ready':'unchanged-exact-native-child-common-photo-material',allEightExactPrivatePartsRequired:true,parentPlanCoveredByChildren:1,parentPlanMissingM2:0,originalNativeHeightAndRaisedIntervalsRetained:true,heightRole:'original-OSM-height-tags-or-level-estimates-not-surveyed',newPrincipalCount:0,actualVisualAccepted:false,quality500Accepted:false};
 out={...source,batches:r.parent?[]:copy(source.batches),displayEstimates:{...source.displayEstimates,[slot]:marker}};__infillRead_owned().set(out,{source,marker,estimates:JSON.parse(JSON.stringify(out.displayEstimates)),fingerprint:ownerDisplayFingerprint(out).fingerprint});__infillRead_cache().set(source,out);return out;
}
function restore(c:BuildingComponent,r:Row):BuildingComponent{const p=__infillRead_owned().get(c);if(p)return p.source;
 if(r.parent&&c.batches.length===0&&c.displayEstimates?.[slot]&&same(c.origin,r.source.origin)&&same(c.componentGeometry,r.source.componentGeometry)&&same(c.sourceFeature,r.source.sourceFeature)){
  // Restoration of a public source-only copy grants no child readiness.
  const source={...r.source,batches:copy(r.source.batches as unknown as MeshBatch[])}as unknown as BuildingComponent;return gallusanlage8Material088Reconstruction([source]).components[0];
 }return c;
}
function complete(components:BuildingComponent[],requireOwned:boolean){const groups=new Map<string,BuildingComponent[]>();for(const c of components)if(gallusanlage8Children089Identity(c)){const a=groups.get(key(c))??[];a.push(c);groups.set(key(c),a);}return __infillRead_ROWS().every(r=>{const a=groups.get(key(r.source));if(a?.length!==1)return false;const c=a[0];return requireOwned?exactOwned(c):__infillRead_owned().has(c)?exactOwned(c):r.parent?parentPrivate(c):exactNative(c,r);});}
function gallusanlage8Children089Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},ready=complete(components,false),replacements=new Map<BuildingComponent,BuildingComponent>();
 if(ready){
  for(const c of components){const r=__infillRead_pins().get(key(c));if(gallusanlage8Children089Identity(c)&&r)replacements.set(c,__infillRead_owned().has(c)?c:make(c,r));}
  const tentative=components.map(c=>replacements.get(c)??c),targets=tentative.filter(gallusanlage8Children089Identity),pp=new Float32Array(340*4),ff=new Float32Array(340*5);
  if(gallusanlage8Children089BaseMaterials(targets,pp,ff).vertices!==340)replacements.clear();
 }
 if(!ready||replacements.size===0)for(const c of components){const r=__infillRead_pins().get(key(c));if(gallusanlage8Children089Identity(c)&&r)replacements.set(c,restore(c,r));}
 let changed=false;const output=components.map(c=>{const out=replacements.get(c)??c;if(out===c)return c;changed=true;const r=__infillRead_pins().get(key(c))!,n=out.batches.reduce((a,b)=>a+b.positions.length/3,0),t=out.batches.reduce((a,b)=>a+b.indices.length/3,0),source=__infillRead_owned().get(out)?.source??out;stats.objects++;stats.vertices+=n;stats.triangles+=t;stats.originalVertices+=source.batches.reduce((a,b)=>a+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:SHA,vertices:n,triangles:t,geometryRole:ready?(r.parent?'exact-native-aggregate-source-only-eight-parts-ready':'unchanged-exact-native-child-common-photo-material'):'original-display-restored-incomplete-cohort'});return out;});return{components:changed?output:components,stats,completeExactCohort:ready};
}
function gallusanlage8Children089BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const n=components.reduce((a,c)=>a+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(n)||paint.length!==n*4||frames.length!==n*5)throw Error('Ga8 children exact packed lengths required');
 if(!complete(components,true))return{objects:0,vertices:0};let at=0;const writes:{at:number;row:Row}[]=[];
 for(const c of components){const r=__infillRead_pins().get(key(c));if(gallusanlage8Children089Identity(c)&&r&&!r.parent){let pZero=true,pSame=true,fZero=true,fSame=true;for(let i=0;i<r.paint.length;i++){pZero=pZero&&Object.is(paint[at*4+i],0);pSame=pSame&&Object.is(paint[at*4+i],Math.fround(r.paint[i]));}for(let i=0;i<r.frames.length;i++){fZero=fZero&&Object.is(frames[at*5+i],0);fSame=fSame&&Object.is(frames[at*5+i],Math.fround(r.frames[i]));}if(!(pZero||pSame)||!(fZero||fSame))return{objects:0,vertices:0};writes.push({at,row:r});}at+=c.batches.reduce((a,b)=>a+b.positions.length/3,0);}
 for(const w of writes){paint.set(w.row.paint,w.at*4);frames.set(w.row.frames,w.at*5);}return{objects:8,vertices:340,sourceRetained:true,geometryChanged:false,actualVisualAccepted:false};
}

return {get pins(){return __infillRead_pins();},get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},gallusanlage8Children089Identity,gallusanlage8Children089Reconstruction,gallusanlage8Children089BaseMaterials};
});}
function getpins(scope:FrozenDataScope|undefined){return getInfillData(scope).pins;}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
export function gallusanlage8Children089Identity(...args:[...Parameters<ReturnType<typeof getInfillData>['gallusanlage8Children089Identity']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return gallusanlage8Children089IdentityCold(args[0],scope);return getInfillData(scope).gallusanlage8Children089Identity(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['gallusanlage8Children089Identity']>);}
export function gallusanlage8Children089Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['gallusanlage8Children089Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return gallusanlage8Children089ReconstructionCold(args[0],scope);return getInfillData(scope).gallusanlage8Children089Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['gallusanlage8Children089Reconstruction']>);}
export function gallusanlage8Children089BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['gallusanlage8Children089BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return gallusanlage8Children089BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).gallusanlage8Children089BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['gallusanlage8Children089BaseMaterials']>);}
export const infillDataFunctionArities={"gallusanlage8Children089Identity":1,"gallusanlage8Children089Reconstruction":1,"gallusanlage8Children089BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function gallusanlage8Children089IdentityCold(c:Identity&{city?:string},scope?:FrozenDataScope){
return false;}

function gallusanlage8Children089ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
return {components:components.map(component=>component),stats};}

function gallusanlage8Children089BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const n=components.reduce((a,c)=>a+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
if(!Number.isSafeInteger(n)||paint.length!==n*4||frames.length!==n*5)throw Error('Ga8 children exact packed lengths required');
return {objects:0,vertices:0};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(c.city==='frankfurt')&&(infillResourceIdentityCandidate("gallusanlage8-children089.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
