import {prepareInfillDataResources,infillMetadataCandidate} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import {infillFrankfurtJunghof088Metadata} from './bremen-infill-owner-metadata';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {nativePaintSignature} from './progressive-native-signature';
import {getLOW_OFFICE_DATA as __infillDataDependency0,LOW_OFFICE_SHA} from './infill-frankfurt-junghof088-data';
type LowGroup={queueId:string;models:any[];requiredNativeGroup:string[];geometryReadyForPreview:boolean;materialsComplete:boolean;detail50Implemented?:boolean;proof?:any};

// Private provenance only: public ids/receipts or copied DISPLAY arrays grant no access.

const unchanged=(c:BuildingComponent,s:any,sig:string)=>nativePaintSignature(c)===sig&&['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(s[k]))&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=s.batches[bi][k];return a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));


export function infillFrankfurtJunghof088BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillFrankfurtJunghof088;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}

/** Only final packed frame attributes change. SOURCE, private DISPLAY arrays, RGBA,
 * owner SHA and finite output fingerprints are unchanged. Call after all materials. */


import * as __infillResourceDependency0 from './infill-frankfurt-junghof088-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-junghof088.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_LOW_OFFICE_DATA=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_GROUPS=scopedInfillValue<LowGroup[]>(()=>__infillRead_LOW_OFFICE_DATA().groups);
const __infillRead_roof062Owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,{source:BuildingComponent;model:any;fingerprint:string}>());
const infillFrankfurtJunghof088Identity=(c:Identity)=>infillFrankfurtJunghof088Metadata.infillFrankfurtJunghof088Identity(c);
function infillFrankfurtJunghof088Reconstruction(components:BuildingComponent[],selectedQueueIds?:string[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 // Each independent group fails closed. An absent/changed sibling can never remove its SOURCE.
 const ready=__infillRead_GROUPS().filter(g=>(!selectedQueueIds||selectedQueueIds.includes(g.queueId))&&g.geometryReadyForPreview&&g.models.length===g.requiredNativeGroup.length&&g.models.every(m=>{const rows=components.filter(c=>c.city==='frankfurt'&&c.objectId===m.identity.objectId&&c.partId===m.identity.partId);return rows.length===1&&unchanged(rows[0],m.source,m.identity.signature);}));
 const mapped=components.map(c=>{if(c.city!=='frankfurt')return c;const group=ready.find(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));if(!group)return c;const m=group.models.find(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId)!;
 const batches:any[]=m.display.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]}));const vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:LOW_OFFICE_SHA,vertices,triangles,geometryRole:'source-bound-junghof088-officialouter+DOP-recess+photo-canopy'});
 const out:BuildingComponent={...c,batches,displayEstimates:{...c.displayEstimates,infillFrankfurtJunghof088:{queueId:group.queueId,patchSHA:LOW_OFFICE_SHA,sourceRetained:true,officialGeometry:false,mixedOfficialAndObservedDOPRoof:true,inferredMissingRoofDimensions:true,verifiedPhysicalUnitPlaneClip:true,protectedNeighborsFrozen:true,geometryProof:group.proof,actualVisualAccepted:false,materialsComplete:group.materialsComplete,detail50Complete:!!group.detail50Implemented,detail70Complete:!!(group as any).detail70Implemented}}};
 __infillRead_roof062Owned().set(out,{source:c,model:m,fingerprint:ownerDisplayFingerprint(out).fingerprint});return out;
 });return {components:mapped,stats};
}
function infillFrankfurtJunghof088RoofMaterialFrames062(components:BuildingComponent[],frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
 if(frames.length!==total*5)throw Error('Junghof062 packed frame length mismatch');
 const empty={objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};
 const group=__infillRead_GROUPS().find(g=>g.queueId==='FRA-LOW-088');if(!group)return empty;
 const complete=group.models.every(m=>{const rows=components.filter(c=>c.city==='frankfurt'&&c.objectId===m.identity.objectId&&c.partId===m.identity.partId);
  if(rows.length!==1)return false;const c=rows[0],r=__infillRead_roof062Owned().get(c);if(!r||r.model!==m)return false;
  try{return unchanged(r.source,m.source,m.identity.signature)&&ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}});
 if(!complete)return empty;
 // Reject an unrelated material override atomically before writing any marker.
 let offset=0;
 for(const c of components)for(const b of c.batches){const n=b.positions.length/3;
  if(__infillRead_roof062Owned().has(c)){const own=(b as unknown as {frames:number[]}).frames;
   for(let j=0;j<n*5;j++)if(!Object.is(frames[offset*5+j],Math.fround(own[j])))return empty;}
  offset+=n;}
 const origin=[8.6743334,50.11330495],merc=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
 const unit=40075016.686*Math.cos(origin[1]*Math.PI/180);let at=0,objects=0,vertices=0;
 for(const c of components){const family=c.objectId==='osm/way/72897066'?45210:c.objectId==='osm/way/247834199'?45211:0;
  const owned=__infillRead_roof062Owned().has(c);let count=0;
  for(const b of c.batches){const n=b.positions.length/3,own=(b as unknown as {frames:number[]}).frames;
   if(owned&&family){const marks=new Set<number>();
    for(let t=0;t<b.indices.length;t+=3){const ix=Array.from(b.indices.slice(t,t+3));
     const exact=ix.every(i=>Math.abs(b.normals[i*3])<1e-6&&b.normals[i*3+1]>.999999&&Math.abs(b.normals[i*3+2])<1e-6&&own[i*5+4]===34349&&
       (Math.abs(b.positions[i*3+1]-34.857)<1e-5||Math.abs(b.positions[i*3+1]-34.370)<1e-5));
     if(exact)for(const i of ix)marks.add(i);}
    const localUnit=40075016.686*Math.cos(c.origin[1]*Math.PI/180),scale=unit/localUnit;
    const east=(c.origin[0]-origin[0])/360*unit,north=(merc(c.origin[1])-merc(origin[1]))/(2*Math.PI)*unit;
    for(const i of marks){const j=(at+i)*5;frames[j]=own[i*5]*scale+east;frames[j+2]=own[i*5+2]*scale+north;frames[j+4]=family;count++;}
   }at+=n;
  }if(count){objects++;vertices+=count;}
 }return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}

return {get GROUPS(){return __infillRead_GROUPS();},get roof062Owned(){return __infillRead_roof062Owned();},infillFrankfurtJunghof088Identity,infillFrankfurtJunghof088Reconstruction,infillFrankfurtJunghof088RoofMaterialFrames062};
});}
function getGROUPS(scope:FrozenDataScope|undefined){return getInfillData(scope).GROUPS;}
function getroof062Owned(scope:FrozenDataScope|undefined){return getInfillData(scope).roof062Owned;}
export function infillFrankfurtJunghof088Identity(...args:[...Parameters<ReturnType<typeof getInfillData>['infillFrankfurtJunghof088Identity']>,scope?:FrozenDataScope]){return infillFrankfurtJunghof088Metadata.infillFrankfurtJunghof088Identity(args[0]);}
export function infillFrankfurtJunghof088Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['infillFrankfurtJunghof088Reconstruction']>,scope?:FrozenDataScope]){const scope=args[2] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return infillFrankfurtJunghof088ReconstructionCold(...args.slice(0,2) as Parameters<typeof infillFrankfurtJunghof088ReconstructionCold>);return getInfillData(scope).infillFrankfurtJunghof088Reconstruction(...args.slice(0,2) as Parameters<ReturnType<typeof getInfillData>['infillFrankfurtJunghof088Reconstruction']>);}
export function infillFrankfurtJunghof088RoofMaterialFrames062(...args:[...Parameters<ReturnType<typeof getInfillData>['infillFrankfurtJunghof088RoofMaterialFrames062']>,scope?:FrozenDataScope]){const scope=args[2] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return infillFrankfurtJunghof088RoofMaterialFrames062Cold(...args.slice(0,2) as Parameters<typeof infillFrankfurtJunghof088RoofMaterialFrames062Cold>);return getInfillData(scope).infillFrankfurtJunghof088RoofMaterialFrames062(...args.slice(0,2) as Parameters<ReturnType<typeof getInfillData>['infillFrankfurtJunghof088RoofMaterialFrames062']>);}
export const infillDataFunctionArities={"infillFrankfurtJunghof088Identity":1,"infillFrankfurtJunghof088Reconstruction":2,"infillFrankfurtJunghof088RoofMaterialFrames062":2} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function infillFrankfurtJunghof088ReconstructionCold(components:BuildingComponent[],selectedQueueIds?:string[]){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
return {components:components.map(component=>component),stats};}

function infillFrankfurtJunghof088RoofMaterialFrames062Cold(components:BuildingComponent[],frames:Float32Array){const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
if(frames.length!==total*5)throw Error('Junghof062 packed frame length mismatch');
const empty={objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};
return empty;}

const infillPreparationPairs=[["osm/way/72897065","osm/way/72897065/component/9adda723c85fa78c2615"],["osm/way/72897066","osm/way/72897066/component/78cf11002bbc4836a7fc"],["osm/way/247834199","osm/way/247834199/component/988a99ce631eaccdaa38"],["osm/way/247834200","osm/way/247834200/component/5b45b8028071bde616ee"]] as const;
export function mayMatchInfillData(components:readonly BuildingComponent[]){return infillMetadataCandidate(components,infillFrankfurtJunghof088Metadata.infillFrankfurtJunghof088Identity,infillPreparationPairs);}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=["infillFrankfurtJunghof088Identity"] as const;

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).roof062Owned.has(c));}
