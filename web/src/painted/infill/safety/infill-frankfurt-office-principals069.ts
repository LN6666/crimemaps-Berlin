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
import {getFRANKFURT_OFFICE_PRINCIPALS_DATA069 as __infillDataDependency0,FRANKFURT_OFFICE_PRINCIPALS_SHA069} from './infill-frankfurt-office-principals069-data';
export {FRANKFURT_OFFICE_PRINCIPALS_SHA069} from './infill-frankfurt-office-principals069-data';
type Row=(ReturnType<typeof __infillDataDependency0>)[number];
type PaintedBatch=MeshBatch&{paint:number[];frames:number[]};
const key=(c:Identity)=>c.objectId+'|'+c.partId;



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

function rgb(family:number,name:string):[number,number,number]{
 if(family===45243||family===45247)return[.40,.43,.44];
 if(family===45251)return name==='Portico'?[.37,.39,.39]:[.45,.49,.51];
 if(family===45250)return name==='Portico'?[.55,.52,.46]:[.61,.64,.65];
 if(family===45241||family===45242||family===45245||family===45246)return[.71,.73,.71];
 return family===45249?[.315,.43,.47]:[.255,.365,.435];
}

/** Four exact independent SOURCE carriers for three originalselected principals.
 * Missing/duplicate/drift never generates a body or globalabsence error. No
 * neighbour/frozenprovider is replaced, no source geometry or height is fitted. */



import * as __infillResourceDependency0 from './infill-frankfurt-office-principals069-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-office-principals069.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_FRANKFURT_OFFICE_PRINCIPALS_DATA069=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_pins=scopedInfillValue(()=>new Map(__infillRead_FRANKFURT_OFFICE_PRINCIPALS_DATA069().map(r=>[key(r),r])));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,{source:BuildingComponent;fingerprint:string}>());
function frankfurtOfficePrincipals069Identity(c:Identity):boolean{return __infillRead_pins().has(key(c));}
function exactOwned(c:BuildingComponent):boolean{const p=__infillRead_owned().get(c);if(!p)return false;try{return ownerDisplayFingerprint(c).fingerprint===p.fingerprint&&exactNative(p.source,__infillRead_pins().get(key(c))!);}catch{return false;}}
function makeDisplay(source:BuildingComponent,r:Row):BuildingComponent{
 const batches:PaintedBatch[]=source.batches.map(b=>({...b,positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices),color:Array.from(b.color) as [number,number,number],paint:new Array(b.positions.length/3*4).fill(0),frames:new Array(b.positions.length/3*5).fill(0)}));
 const covered=batches.map(b=>new Uint8Array(b.positions.length/3));for(const f of r.admission.surfaceFrames){const b=batches[f.batchIndex];if(!b||!Number.isSafeInteger(f.firstVertex)||!Number.isSafeInteger(f.vertexCount)||f.firstVertex<0||f.vertexCount<1||f.firstVertex+f.vertexCount>b.positions.length/3||!Number.isSafeInteger(f.family)||f.family<45240||f.family>45251)throw Error('Invalid office069 exact surface frame');
  for(let j=f.firstVertex;j<f.firstVertex+f.vertexCount;j++){if(covered[f.batchIndex][j]++)throw Error('Duplicate office069 surface frame');const p=b.positions.slice(j*3,j*3+3),u=f.uAxis.reduce((n,a,k)=>n+a*p[k],0)-f.uOrigin,v=f.vAxis.reduce((n,a,k)=>n+a*p[k],0)-f.vOrigin;b.frames.splice(j*5,5,u,v,f.height,f.width,f.family);b.paint.splice(j*4,4,...rgb(f.family,r.name),2);}}
 if(covered.some(a=>a.some(v=>v!==1)))throw Error('Incomplete office069 surface frames');
 const limits=r.name==='Kastor'?'Native95m/22levels/flatroof retained despite authorcaption55m. Photographic angledblade/crown silhouette unmodeled; curvedNWback/NEend remain relatedbase. Lowerpier rhythm is photo-derived approximate floorallocation, not surveyed.':r.name==='Pollux'?'Native130m/33levels/flatroof retained. CurvedSEglass/planarNWspine material supported by authorphoto; smallunknownends/returns baseonly. Exactbay and crown geometry remain unverified.':r.name==='Eurotheum'?'Native110m/31levels, sloping111roofvertices and fullheight roundliftcolumn preserved. Historicalroof localtangent projection numericallyidentified; no coordinateadapter applied. Photo-specific curtainwall material is approximate; deepfacadevoid/precisefloordetail not rebuilt.':'Native7.5m lowPortico is unknown-height schematic SOURCE, while operator describes sixstoreys/26mlobby. Relatedstone/metal baseonly, no compressed sixfloor windowgrid, new doors or fabricated lobbygeometry.';
 const result:BuildingComponent={...source,batches,displayEstimates:{...source.displayEstimates,infillFrankfurtOfficePrincipals069:{patchSHA:FRANKFURT_OFFICE_PRINCIPALS_SHA069,name:r.name,sourceRetained:true,sourceOnlyAlias:false,noSourceRecovery:true,newGeometry:false,sourceArraysUnchanged:true,photoSpecificFaceRoles:true,independentPresentSourceOnly:true,originalSelectedPrincipal:true,actualVisualAccepted:false,detail70Accepted:false,quality500Accepted:false,remainingLimits:limits}}};
 __infillRead_owned().set(result,{source,fingerprint:ownerDisplayFingerprint(result).fingerprint});return result;
}
function frankfurtOfficePrincipals069Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},grouped=new Map<string,BuildingComponent[]>();
 for(const c of components)if(c.city==='frankfurt'&&frankfurtOfficePrincipals069Identity(c)){const a=grouped.get(key(c))??[];a.push(c);grouped.set(key(c),a);}
 const valid=new Map<string,BuildingComponent>(),rejected:string[]=[];for(const [k,a]of grouped){const c=a[0],r=__infillRead_pins().get(k)!;if(a.length===1&&(__infillRead_owned().has(c)?exactOwned(c):exactNative(c,r)))valid.set(k,c);else rejected.push(k);}let changed=false;
 const out=components.map(c=>{if(valid.get(key(c))!==c||__infillRead_owned().has(c))return c;const result=makeDisplay(c,__infillRead_pins().get(key(c))!),vertices=result.batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=result.batches.reduce((n,b)=>n+b.indices.length/3,0);changed=true;stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=vertices;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:FRANKFURT_OFFICE_PRINCIPALS_SHA069,vertices,triangles,geometryRole:'owner-authorized-original-selected-office-native-material069'});return result;});return{components:changed?out:components,stats,rejected};
}
function frankfurtOfficePrincipals069BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Invalid office069 packed lengths');let at=0,objects=0,vertices=0;
 for(const c of components){if(__infillRead_owned().has(c)&&!exactOwned(c))throw Error('Mutated private office069 DISPLAY');const match=__infillRead_owned().has(c);if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){const p=b as PaintedBatch;paint.set(p.paint,at*4);frames.set(p.frames,at*5);vertices+=n;}at+=n;}}return{objects,vertices,actualVisualAccepted:false};
}

return {get pins(){return __infillRead_pins();},get owned(){return __infillRead_owned();},frankfurtOfficePrincipals069Identity,frankfurtOfficePrincipals069Reconstruction,frankfurtOfficePrincipals069BaseMaterials};
});}
function getpins(scope:FrozenDataScope|undefined){return getInfillData(scope).pins;}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
export function frankfurtOfficePrincipals069Identity(...args:[...Parameters<ReturnType<typeof getInfillData>['frankfurtOfficePrincipals069Identity']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return frankfurtOfficePrincipals069IdentityCold(args[0],scope);return getInfillData(scope).frankfurtOfficePrincipals069Identity(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['frankfurtOfficePrincipals069Identity']>);}
export function frankfurtOfficePrincipals069Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['frankfurtOfficePrincipals069Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return frankfurtOfficePrincipals069ReconstructionCold(args[0],scope);return getInfillData(scope).frankfurtOfficePrincipals069Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['frankfurtOfficePrincipals069Reconstruction']>);}
export function frankfurtOfficePrincipals069BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['frankfurtOfficePrincipals069BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return frankfurtOfficePrincipals069BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).frankfurtOfficePrincipals069BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['frankfurtOfficePrincipals069BaseMaterials']>);}
export const infillDataFunctionArities={"frankfurtOfficePrincipals069Identity":1,"frankfurtOfficePrincipals069Reconstruction":1,"frankfurtOfficePrincipals069BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function frankfurtOfficePrincipals069IdentityCold(c:Identity,scope?:FrozenDataScope){
return false;}

function frankfurtOfficePrincipals069ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},grouped=new Map<string,BuildingComponent[]>();
for(const c of components)if(c.city==='frankfurt'&&frankfurtOfficePrincipals069Identity(c)){const a=grouped.get(key(c))??[];a.push(c);grouped.set(key(c),a);}
const valid=new Map<string,BuildingComponent>(),rejected:string[]=[];
return {components:components.map(component=>component),stats};}

function frankfurtOfficePrincipals069BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Invalid office069 packed lengths');
let at=0,objects=0,vertices=0;
return {objects:0,vertices:0,actualVisualAccepted:false};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(infillResourceIdentityCandidate("infill-frankfurt-office-principals069.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
