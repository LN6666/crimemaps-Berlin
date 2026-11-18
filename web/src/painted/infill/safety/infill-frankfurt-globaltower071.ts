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
import {GLOBAL_TOWER_NATIVE_DATA067} from './infill-frankfurt-globaltower067-data';
import {getGLOBAL_TOWER_OFFICIAL_DATA071 as __infillDataDependency0,GLOBAL_TOWER_OFFICIAL_PATCH_SHA071} from './infill-frankfurt-globaltower071-data';
export {GLOBAL_TOWER_OFFICIAL_PATCH_SHA071} from './infill-frankfurt-globaltower071-data';
type Row=(typeof GLOBAL_TOWER_NATIVE_DATA067)[number];
type PaintedBatch=MeshBatch&{paint:number[];frames:number[]};
const key=(c:Identity)=>c.objectId+'|'+c.partId;


const physical=GLOBAL_TOWER_NATIVE_DATA067.filter(r=>!r.parent);


function exactValue(a:unknown,b:unknown):boolean{
 if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&Object.is(a,b);
 if(b===null||typeof b!=='object')return a===b;
 if(Array.isArray(b)){if(!(Array.isArray(a)||ArrayBuffer.isView(a))||a instanceof DataView)return false;const q=a as ArrayLike<unknown>;return q.length===b.length&&b.every((v,i)=>exactValue(q[i],v));}
 if(!a||typeof a!=='object'||Array.isArray(a)||ArrayBuffer.isView(a))return false;
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ak=Object.keys(x).sort(),bk=Object.keys(y).sort();return ak.length===bk.length&&ak.every((v,i)=>v===bk[i]&&exactValue(x[v],y[v]));
}
function exactNative(c:BuildingComponent,r:Row):boolean{
 if(c.city!=='frankfurt'||!exactValue(c.origin,r.origin)||!exactValue(c.componentGeometry,r.componentGeometry)||!exactValue(c.sourceFeature,r.sourceFeature)||c.batches.length!==r.batches.length)return false;
 if(!c.batches.every((b,i)=>(b.faceRole??null)===r.batches[i].faceRole&&(['positions','normals','indices','color'] as const).every(k=>exactValue(b[k],r.batches[i][k]))))return false;
 try{return nativePaintSignature(c)===r.signature;}catch{return false;}
}


/** Each exact present physical SOURCE receives only measured official DISPLAY clipped to its own original footprint.
 * Only the duplicate aggregate parent is held when all3 physical parts are exact
 * and ready. Missing/duplicate/drift restores the parent; no absent body is made. */

/** Final packed RGB/alpha and five frame fields; never encode family into RGB. */


import * as __infillResourceDependency0 from './infill-frankfurt-globaltower071-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-globaltower071.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_GLOBAL_TOWER_OFFICIAL_DATA071=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_pins=scopedInfillValue(()=>new Map(GLOBAL_TOWER_NATIVE_DATA067.map(r=>[key(r),r])));
const __infillRead_displayPins=scopedInfillValue(()=>new Map(__infillRead_GLOBAL_TOWER_OFFICIAL_DATA071().map(r=>[key(r),r])));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,{source:BuildingComponent;fingerprint:string;parentHeld:boolean}>());
function globalTowerOfficial071Identity(c:Identity):boolean{return __infillRead_pins().has(key(c));}
function exactOwned(c:BuildingComponent):boolean{const p=__infillRead_owned().get(c);if(!p)return false;try{return ownerDisplayFingerprint(c).fingerprint===p.fingerprint&&exactNative(p.source,__infillRead_pins().get(key(c))!);}catch{return false;}}
function makeDisplay(source:BuildingComponent,r:Row,parentHeld:boolean):BuildingComponent{
 const official=__infillRead_displayPins().get(key(r));
 let batches:PaintedBatch[]=[];
 if(!parentHeld&&r.parent){
  batches=source.batches.map(b=>({...b,positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices),color:Array.from(b.color) as [number,number,number],paint:[],frames:[]}));
  for(let bi=0;bi<batches.length;bi++){const b=batches[bi];for(let v=0;v<b.positions.length/3;v++){const p=b.positions.slice(v*3,v*3+3),roof=Math.abs(b.normals[v*3+1])>.1;b.paint.push(...(roof?[.48,.51,.50]:[.66,.63,.56]),2);b.frames.push(p[0],p[1],60,0,11489);}}
 }else if(!parentHeld){
  if(!official)throw Error('Missing exact GlobalTower official DISPLAY');
  batches=official.batches.map(b=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color] as [number,number,number],paint:[...b.paint],frames:[...b.frames]}));
 }
 const origin=r.parent?source.origin:official!.origin as [number,number];
 const result:BuildingComponent={...source,origin,batches,displayEstimates:{...source.displayEstimates,infillGlobalTowerOfficial071:{patchSHA:GLOBAL_TOWER_OFFICIAL_PATCH_SHA071,sourceRetained:true,sourceGeometryAltered:false,sourceOnlyAlias:parentHeld,aggregateParentOnly:r.parent,parentHeldOnlyWithAllThreeExactPhysicalParts:parentHeld,originalDescriptionSHA256:'4bf5530bcfb737c5097c5747bbc330f7b80bc30db01f6496e00ace53aaeb07e3',originalNativeFrameHemisphereRetained:true,independentPresentSourceOnly:true,noSourceRecovery:true,displayGeometryReconstructed:!r.parent,officialBodies:12,absoluteVerticalDatumM:98.109,datumCRS:'EPSG7423 ETRS89+EVRF2007 gravity H',coordinates:'renderer East/Up/North; one common measured datum',originalSourceHeightM:r.parent?60:r.objectId==='osm/way/174487249'?12.5:60,roofOfficialAbsoluteRangesM:[118.983,122.061,188.952,189.449,193.209,205.473,206.496,207.554],sourceBoundaryCaps:'Boolean clipping closure only, upper and lower edges on measured roof and ground planes; unknown solid material',remainingSourceOutlineDisagreement:'Retained SOURCE-only edge regions: short1.2267758876m2 within.233504m; Forum39.0623677233m2 within1.623950m. No high strip or roof invented.',unknownFacades:'Opposite/return faces, small roof core and Forum glazing retain related base; original operator photo-bound SW ribbons and SE solid ends only.',crownProfiles:'New local100.6m tall /83.9m short louver base PHOTO estimate; original54m rule is not stretched. Every measured roof height stays distinct.',actualVisualAccepted:false,detail70Accepted:false,quality500Accepted:false}}};
 __infillRead_owned().set(result,{source,fingerprint:ownerDisplayFingerprint(result).fingerprint,parentHeld});return result;
}
function globalTowerOfficial071Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const grouped=new Map<string,BuildingComponent[]>();for(const c of components)if(c.city==='frankfurt'&&globalTowerOfficial071Identity(c)){const a=grouped.get(key(c))??[];a.push(c);grouped.set(key(c),a);}
 const valid=new Map<string,BuildingComponent>(),rejected:string[]=[];for(const [k,a]of grouped){const c=a[0],r=__infillRead_pins().get(k)!;if(a.length===1&&(__infillRead_owned().has(c)?exactOwned(c):exactNative(c,r)))valid.set(k,c);else rejected.push(k);}
 const allReady=physical.every(r=>valid.has(key(r)));let changed=false;
 const out=components.map(c=>{if(valid.get(key(c))!==c)return c;const r=__infillRead_pins().get(key(c))!,previous=__infillRead_owned().get(c),parentHeld=r.parent&&allReady;
  if(previous&&previous.parentHeld===parentHeld)return c;
  const source=previous?.source??c,result=makeDisplay(source,r,parentHeld),vertices=result.batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=result.batches.reduce((n,b)=>n+b.indices.length/3,0);changed=true;stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=source.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:GLOBAL_TOWER_OFFICIAL_PATCH_SHA071,vertices,triangles,geometryRole:parentHeld?'owner-authorized-globaltower-aggregate-source-only':r.parent?'original-native-globaltower-parent-fallback':'owner-authorized-official-globaltower-12-measured-bodies-source-clipped'});return result;
 });return{components:changed?out:components,stats,rejected};
}
function globalTowerOfficial071BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Invalid official GlobalTower packed lengths');let at=0,objects=0,vertices=0;
 for(const c of components){if(__infillRead_owned().has(c)&&!exactOwned(c))throw Error('Mutated private official GlobalTower DISPLAY');const match=__infillRead_owned().has(c);if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){const p=b as PaintedBatch;paint.set(p.paint,at*4);frames.set(p.frames,at*5);vertices+=n;}at+=n;}}return{objects,vertices,actualVisualAccepted:false};
}

return {get pins(){return __infillRead_pins();},get displayPins(){return __infillRead_displayPins();},get owned(){return __infillRead_owned();},globalTowerOfficial071Identity,globalTowerOfficial071Reconstruction,globalTowerOfficial071BaseMaterials};
});}
function getpins(scope:FrozenDataScope|undefined){return getInfillData(scope).pins;}
function getdisplayPins(scope:FrozenDataScope|undefined){return getInfillData(scope).displayPins;}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
export function globalTowerOfficial071Identity(...args:[...Parameters<ReturnType<typeof getInfillData>['globalTowerOfficial071Identity']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return globalTowerOfficial071IdentityCold(args[0],scope);return getInfillData(scope).globalTowerOfficial071Identity(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['globalTowerOfficial071Identity']>);}
export function globalTowerOfficial071Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['globalTowerOfficial071Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return globalTowerOfficial071ReconstructionCold(args[0],scope);return getInfillData(scope).globalTowerOfficial071Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['globalTowerOfficial071Reconstruction']>);}
export function globalTowerOfficial071BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['globalTowerOfficial071BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return globalTowerOfficial071BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).globalTowerOfficial071BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['globalTowerOfficial071BaseMaterials']>);}
export const infillDataFunctionArities={"globalTowerOfficial071Identity":1,"globalTowerOfficial071Reconstruction":1,"globalTowerOfficial071BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function globalTowerOfficial071IdentityCold(c:Identity,scope?:FrozenDataScope){
return false;}

function globalTowerOfficial071ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
const grouped=new Map<string,BuildingComponent[]>();
for(const c of components)if(c.city==='frankfurt'&&globalTowerOfficial071Identity(c)){const a=grouped.get(key(c))??[];a.push(c);grouped.set(key(c),a);}
const valid=new Map<string,BuildingComponent>(),rejected:string[]=[];
return {components:components.map(component=>component),stats};}

function globalTowerOfficial071BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Invalid official GlobalTower packed lengths');
let at=0,objects=0,vertices=0;
return {objects:0,vertices:0,actualVisualAccepted:false};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(infillResourceIdentityCandidate("infill-frankfurt-globaltower071.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
