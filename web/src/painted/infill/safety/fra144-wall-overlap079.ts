import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {frankfurtGroups144146Official073BaseMaterials as __infillFunctionDependency0} from './frankfurt-groups144146-official073';
import {fra145Return087Reconstruction as __infillFunctionDependency1} from './fra145-return087';
import {FRA144_WALL_OVERLAP_SHA079 as SHA,FRA144_WALL_OVERLAP_DATA079 as DATA} from './fra144-wall-overlap079-data';
type Pin=typeof DATA.pins[number];
type Owned={source:BuildingComponent;pin:Pin};

export const fra144WallOverlap079Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&DATA.pins.some(p=>p.objectId===c.objectId&&p.partId===c.partId);
function equal(a:unknown,b:unknown):boolean{if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&a===b;if(b===null||typeof b!=='object')return a===b;if(Array.isArray(b)){if(!(Array.isArray(a)||ArrayBuffer.isView(a))||a instanceof DataView)return false;const q=a as ArrayLike<unknown>;return q.length===b.length&&b.every((v,i)=>equal(q[i],v));}if(!a||typeof a!=='object'||Array.isArray(a)||ArrayBuffer.isView(a))return false;const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ak=Object.keys(x).sort(),bk=Object.keys(y).sort();return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&equal(x[k],y[k]));}
function exactSource(c:BuildingComponent,p:Pin){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&c.objectId===p.objectId&&c.partId===p.partId&&nativePaintSignature(c)===p.signature&&equal(c.origin,p.origin)&&JSON.stringify(c.componentGeometry)===p.geometryJSON&&JSON.stringify(c.sourceFeature)===p.sourceFeatureJSON&&c.batches.length===p.batches.length&&c.batches.every((b,i)=>(b.faceRole??null)===(p.batches[i].faceRole??null)&&(['positions','normals','indices','color']as const).every(k=>equal(b[k],p.batches[i][k])))&&f.fingerprint===p.fingerprint&&f.vertices===p.vertices&&f.indices===p.indices;}catch{return false;}}
function exactOwned(c:BuildingComponent,r:Owned){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&c.objectId===r.pin.objectId&&c.partId===r.pin.partId&&c.sourceFeature===r.source.sourceFeature&&c.componentGeometry===r.source.componentGeometry&&equal(c.origin,r.source.origin)&&exactSource(r.source,r.pin)&&f.fingerprint===r.pin.output.fingerprint&&f.vertices===r.pin.output.vertices&&f.indices===r.pin.output.indices&&(c.displayEstimates?.fra144WallOverlap079 as{patchSHA?:string}|undefined)?.patchSHA===SHA;}catch{return false;}}

/** Calls the unchanged073 provider once, then clips only approved duplicate wall
 * regions of present exact184/186/187 SOURCE parts. The private073 parent3903v,
 * all roofs and all unique faces remain. Only186 source north edge5 has the
 * separately documented <=9.382mm chord-registration allowance; no global2cm rule.
 * Each child is independent. Missing/drifted parent restores its original SOURCE;
 * public fingerprints/serialized metadata never authorize clipping. */


import * as __infillResourceDependency0 from './frankfurt-groups144146-official073';
import * as __infillResourceDependency1 from './fra145-return087';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("fra144-wall-overlap079.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const frankfurtGroups144146Official073BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],args[1],args[2],scope);
const frankfurtGroups144146Official073Reconstruction=(...args:Parameters<typeof __infillFunctionDependency1>)=>__infillFunctionDependency1(args[0],scope);


const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,Owned>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,BuildingComponent>());
function privateParent(c:BuildingComponent){try{const p=DATA.parent,f=ownerDisplayFingerprint(c);if(c.city!=='frankfurt'||c.objectId!==p.objectId||c.partId!==p.partId||!equal(c.origin,p.origin)||JSON.stringify(c.componentGeometry)!==p.geometryJSON||JSON.stringify(c.sourceFeature)!==p.sourceFeatureJSON||f.fingerprint!==p.fingerprint||f.vertices!==p.vertices||f.indices!==p.indices)return false;return frankfurtGroups144146Official073BaseMaterials([c],new Float32Array(f.vertices*4),new Float32Array(f.vertices*5),scope).objects===1;}catch{return false;}}
function fra144WallOverlap079Reconstruction(components:BuildingComponent[]){
 const original=frankfurtGroups144146Official073Reconstruction(components,scope),stats:OwnerReconstructionStats={...original.stats,components:[...original.stats.components]},outputs=new Map<BuildingComponent,BuildingComponent>(),parents=original.components.filter(c=>c.objectId===DATA.parent.objectId&&c.partId===DATA.parent.partId),ready=parents.length===1&&privateParent(parents[0]);
 for(const p of DATA.pins){const targets=original.components.filter(c=>c.objectId===p.objectId&&c.partId===p.partId);if(targets.length!==1)continue;const c=targets[0],previous=__infillRead_owned().get(c);
  if(previous){if(!exactOwned(c,previous)){stats.error='FRA144079 changed private DISPLAY restored retained SOURCE';if(exactSource(previous.source,p))outputs.set(c,previous.source);continue;}if(!ready){outputs.set(c,previous.source);continue;}}
  if(!ready||(!previous&&!exactSource(c,p)))continue;
  let out=previous?c:__infillRead_cache().get(c);if(out&&!exactOwned(out,__infillRead_owned().get(out)!)){stats.error='FRA144079 cached private DISPLAY changed';continue;}
  if(!out){const batches=c.batches.map((b,bi)=>{const e=p.edits.find(e=>e.batch===bi);return e?{...b,positions:Float32Array.from([...b.positions,...e.appendPositions]),normals:Float32Array.from([...b.normals,...e.appendNormals]),indices:Uint32Array.from(e.indices),color:[...b.color] as [number,number,number]}:{...b,positions:Float32Array.from(b.positions),normals:Float32Array.from(b.normals),indices:Uint32Array.from(b.indices),color:[...b.color] as [number,number,number]};});out={...c,origin:[...c.origin] as [number,number],batches,displayEstimates:{...c.displayEstimates,fra144WallOverlap079:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,geometryRole:'approved-parent-coincident-wall-fragments-clipped-in-original-child-plane',parentObjectId:DATA.parent.objectId,parentPatchSHA256:DATA.original073PatchSHA256,allRoofAndSourceVerticesRetained:true,parentGeometryAndPackedUnchanged:true,registrationException:c.objectId==='osm/way/1476776186'?{sourceEdge:5,batch:1,sourceTriangles:[10,11],maxNormalOffsetM:.009382}:undefined,actualVisualAccepted:false,quality500Accepted:false}}};__infillRead_owned().set(out,{source:c,pin:p});__infillRead_cache().set(c,out);}
  outputs.set(c,out);stats.objects++;stats.vertices+=p.output.vertices;stats.triangles+=p.output.indices/3;stats.originalVertices+=p.vertices;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:SHA,vertices:p.output.vertices,triangles:p.output.indices/3,geometryRole:'approved-parent-coincident-wall-fragments-clipped-in-original-child-plane'});
 }
 return{components:outputs.size?original.components.map(c=>outputs.get(c)??c):original.components,stats};
}

return {get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},fra144WallOverlap079Reconstruction};
});}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
export function fra144WallOverlap079Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['fra144WallOverlap079Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return fra144WallOverlap079ReconstructionCold(args[0],scope);return getInfillData(scope).fra144WallOverlap079Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['fra144WallOverlap079Reconstruction']>);}
export const infillDataFunctionArities={"fra144WallOverlap079Reconstruction":1} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,__infillResourceDependency1];

function fra144WallOverlap079ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const original=__infillFunctionDependency1(components,scope),stats:OwnerReconstructionStats={...original.stats,components:[...original.stats.components]};return{components:original.components,stats};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(c.city==='frankfurt')&&(infillResourceIdentityCandidate("fra144-wall-overlap079.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
