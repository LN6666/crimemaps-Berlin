import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {katharinen149Edge075Identity,katharinen149Edge075BaseMaterials as __infillFunctionDependency0} from './katharinen149-edge075';
import {KATHARINEN149_FACADES_DATA078 as DATA} from './katharinen149-facades078-data';

const metres=40075016.686,rad=Math.PI/180,lat0=DATA.commonOrigin[1]*rad;
function count(c:BuildingComponent){return c.batches.reduce((n,b)=>n+b.positions.length/3,0);}
function same(a:Float32Array,b:Float32Array){return a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));}

/** Final packed frames only, after every existing owner material writer.
 * The original unchanged075 writer authenticates all six private outputs in
 * this module instance. Matching public IDs, metadata and copied arrays alone
 * never authorize this correction. Neither geometry nor component metadata,
 * CPU paintRGB, SOURCE, owner receipts or finite fingerprints change.
 */


import * as __infillResourceDependency0 from './katharinen149-edge075';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("katharinen149-facades078.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const katharinen149Edge075BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],args[1],args[2],scope);


function katharinen149Facades078MaterialFrames(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+count(c),0);
 if(paint.length!==total*4||frames.length!==total*5)throw Error('FRA149 facade078 exact packed lengths required');
 const targets=components.filter(katharinen149Edge075Identity);
 if(targets.length!==6)return{objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};
 for(const p of DATA.models){
  const matches=targets.filter(c=>c.objectId===p.objectId&&c.partId===p.partId);
  if(matches.length!==1)return{objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};
  const f=ownerDisplayFingerprint(matches[0]);
  if(f.fingerprint!==p.fingerprint||f.vertices!==p.vertices||f.indices!==p.indices)throw Error('FRA149 facade078 immutable073 DISPLAY certificate changed');
  if(JSON.stringify(matches[0].displayEstimates)!==JSON.stringify(p.displayEstimates)||JSON.stringify(matches[0].batches.map(b=>[b.faceRole??null,b.materialName??null]))!==JSON.stringify(p.batchTags))throw Error('FRA149 facade078 immutable073 receipt/material role changed');
 }
 const n=targets.reduce((s,c)=>s+count(c),0),oldPaint=new Float32Array(n*4),oldFrames=new Float32Array(n*5);
 const admitted=katharinen149Edge075BaseMaterials(targets,oldPaint,oldFrames,scope);
 if(admitted.objects!==6||admitted.vertices!==12260)return{objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};
 const candidate=oldFrames.slice();let targetAt=0,marked=0,objects=0;
 for(const c of targets){
  const p=DATA.models.find(p=>p.objectId===c.objectId&&p.partId===c.partId)!;
  const scale=Math.cos(lat0)/Math.cos(c.origin[1]*rad);
  const dx=(c.origin[0]-DATA.commonOrigin[0])*metres*Math.cos(lat0)/360;
  const dz=(Math.log(Math.tan(Math.PI/4+c.origin[1]*rad/2))-Math.log(Math.tan(Math.PI/4+lat0/2)))*metres*Math.cos(lat0)/(2*Math.PI);
  if(p.bindings.length)objects++;
  for(const binding of p.bindings){
   const b=c.batches[binding.batch],batchAt=c.batches.slice(0,binding.batch).reduce((n,b)=>n+b.positions.length/3,0);
   for(const v of binding.vertices){
    const x=b.positions[v*3]*scale+dx,z=b.positions[v*3+2]*scale+dz;
    const at=(targetAt+batchAt+v)*5;
    candidate[at]=(x-binding.A[0])*binding.u[0]+(z-binding.A[2])*binding.u[2];
    candidate[at+1]=b.positions[v*3+1];candidate[at+2]=binding.lengthM;candidate[at+3]=binding.face;candidate[at+4]=binding.family;marked++;
   }
  }
  targetAt+=count(c);
 }
 // Validate the full six existing packed records before the first mutation.
 // A complete prior application is allowed; a partially written/mutated
 // record is rejected atomically. Paint never changes in either case.
 let at=0,tAt=0,isOld=true,isCandidate=true;
 for(const c of components){const v=count(c);if(targets.includes(c)){
  if(!same(paint.subarray(at*4,(at+v)*4),oldPaint.subarray(tAt*4,(tAt+v)*4)))throw Error('FRA149 facade078 packed paint differs from private075');
  isOld=isOld&&same(frames.subarray(at*5,(at+v)*5),oldFrames.subarray(tAt*5,(tAt+v)*5));
  isCandidate=isCandidate&&same(frames.subarray(at*5,(at+v)*5),candidate.subarray(tAt*5,(tAt+v)*5));tAt+=v;
 }at+=v;}
 if(!isOld&&!isCandidate)throw Error('FRA149 facade078 packed frames differ from complete private075/candidate records');
 if(!isCandidate){at=0;tAt=0;for(const c of components){const v=count(c);if(targets.includes(c)){frames.set(candidate.subarray(tAt*5,(tAt+v)*5),at*5);tAt+=v;}at+=v;}}
 return{objects,vertices:marked,authenticatedObjects:6,sourceRetained:true,geometryChanged:false,paintRGBChanged:false,photoProportionsApproximate:true,actualVisualAccepted:false};
}

return {katharinen149Facades078MaterialFrames};
});}
export function katharinen149Facades078MaterialFrames(...args:[...Parameters<ReturnType<typeof getInfillData>['katharinen149Facades078MaterialFrames']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent]))return katharinen149Facades078MaterialFramesCold(args[0],args[1],args[2],scope);return getInfillData(scope).katharinen149Facades078MaterialFrames(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['katharinen149Facades078MaterialFrames']>);}
export const infillDataFunctionArities={"katharinen149Facades078MaterialFrames":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function katharinen149Facades078MaterialFramesCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const total=components.reduce((n,c)=>n+count(c),0);
if(paint.length!==total*4||frames.length!==total*5)throw Error('FRA149 facade078 exact packed lengths required');
const targets=components.filter(katharinen149Edge075Identity);
if(targets.length!==6)return{objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};
for(const p of DATA.models){
  const matches=targets.filter(c=>c.objectId===p.objectId&&c.partId===p.partId);
  if(matches.length!==1)return{objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};
  const f=ownerDisplayFingerprint(matches[0]);
  if(f.fingerprint!==p.fingerprint||f.vertices!==p.vertices||f.indices!==p.indices)throw Error('FRA149 facade078 immutable073 DISPLAY certificate changed');
  if(JSON.stringify(matches[0].displayEstimates)!==JSON.stringify(p.displayEstimates)||JSON.stringify(matches[0].batches.map(b=>[b.faceRole??null,b.materialName??null]))!==JSON.stringify(p.batchTags))throw Error('FRA149 facade078 immutable073 receipt/material role changed');
 }
const n=targets.reduce((s,c)=>s+count(c),0),oldPaint=new Float32Array(n*4),oldFrames=new Float32Array(n*5);
const admitted=__infillFunctionDependency0(targets,oldPaint,oldFrames,scope);
if(admitted.objects!==6||admitted.vertices!==12260)return{objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};
const candidate=oldFrames.slice();
let targetAt=0,marked=0,objects=0;
for(const c of targets){
  const p=DATA.models.find(p=>p.objectId===c.objectId&&p.partId===c.partId)!;
  const scale=Math.cos(lat0)/Math.cos(c.origin[1]*rad);
  const dx=(c.origin[0]-DATA.commonOrigin[0])*metres*Math.cos(lat0)/360;
  const dz=(Math.log(Math.tan(Math.PI/4+c.origin[1]*rad/2))-Math.log(Math.tan(Math.PI/4+lat0/2)))*metres*Math.cos(lat0)/(2*Math.PI);
  if(p.bindings.length)objects++;
  for(const binding of p.bindings){
   const b=c.batches[binding.batch],batchAt=c.batches.slice(0,binding.batch).reduce((n,b)=>n+b.positions.length/3,0);
   for(const v of binding.vertices){
    const x=b.positions[v*3]*scale+dx,z=b.positions[v*3+2]*scale+dz;
    const at=(targetAt+batchAt+v)*5;
    candidate[at]=(x-binding.A[0])*binding.u[0]+(z-binding.A[2])*binding.u[2];
    candidate[at+1]=b.positions[v*3+1];candidate[at+2]=binding.lengthM;candidate[at+3]=binding.face;candidate[at+4]=binding.family;marked++;
   }
  }
  targetAt+=count(c);
 }
let at=0,tAt=0,isOld=true,isCandidate=true;
for(const c of components){const v=count(c);if(targets.includes(c)){
  if(!same(paint.subarray(at*4,(at+v)*4),oldPaint.subarray(tAt*4,(tAt+v)*4)))throw Error('FRA149 facade078 packed paint differs from private075');
  isOld=isOld&&same(frames.subarray(at*5,(at+v)*5),oldFrames.subarray(tAt*5,(tAt+v)*5));
  isCandidate=isCandidate&&same(frames.subarray(at*5,(at+v)*5),candidate.subarray(tAt*5,(tAt+v)*5));tAt+=v;
 }at+=v;}
if(!isOld&&!isCandidate)throw Error('FRA149 facade078 packed frames differ from complete private075/candidate records');
if(!isCandidate){at=0;tAt=0;for(const c of components){const v=count(c);if(targets.includes(c)){frames.set(candidate.subarray(tAt*5,(tAt+v)*5),at*5);tAt+=v;}at+=v;}}
return{objects,vertices:marked,authenticatedObjects:6,sourceRetained:true,geometryChanged:false,paintRGBChanged:false,photoProportionsApproximate:true,actualVisualAccepted:false};
return {objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(infillResourceIdentityCandidate("katharinen149-facades078.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
