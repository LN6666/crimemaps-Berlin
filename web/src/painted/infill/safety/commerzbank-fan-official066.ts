import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity,MeshBatch} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {commerzbankExactOriginalMatches} from './commerzbank-parent-display';
import {COMMERZBANK_PARENT_MEMBERS} from './commerzbank-parent-display-data';
import {commerzbankParent053Reconstruction} from './commerzbank-parent053-reconstruction';
import {COMMERZBANK_FAN_OFFICIAL_SHA066 as SHA,getCOMMERZBANK_FAN_OFFICIAL_DATA066 as __infillDataDependency0} from './commerzbank-fan-official066-data';

const ID='osm/way/1071608175',PART=ID+'/component/ebe76a7236b273a68192';
const pin=COMMERZBANK_PARENT_MEMBERS.find(p=>p.objectId===ID&&p.partId===PART)!;
type Owned={source:BuildingComponent;fingerprint:string;paint:Float32Array;frames:Float32Array};

const stats=():OwnerReconstructionStats=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
export const commerzbankFan066Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&c.objectId===ID&&c.partId===PART;



/** One matched fan only. Original SOURCE, original23 guard and all other components stay intact.
 * Original HVBG LoD2 is clipped to this SOURCE; only the separately marked small registration
 * margin extends its nearest measured roof plane. This margin is not original survey geometry.
 * Absolute roof heights109.433/114.227 use adjacentKaiser datum98.701, not a uniform height raise.
 * No additional facade details, relatives, displaced outline or sibling211773080 are introduced. */


/** Replace only the old parent053 stage reference with this composition.
 * Re-entrant input may contain our private fan DISPLAY: validate it first, restore only its
 * original SOURCE, run the UNCHANGED exact23 parent function, then derive the fan after it.
 * A public clone or altered private output cannot authorize SOURCE recovery or bypass that guard. */


/** Reuse existing c137 roof11376/wall11378 and its registered metre UVs. No shader changes. */


import * as __infillResourceDependency0 from './commerzbank-fan-official066-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("commerzbank-fan-official066.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_DATA=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,Owned>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,BuildingComponent>());
function exactOwned(c:BuildingComponent){const r=__infillRead_owned().get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint&&commerzbankExactOriginalMatches(r.source,pin);}catch{return false;}}
const commerzbankFan066OriginalSource=(c:BuildingComponent)=>exactOwned(c)?__infillRead_owned().get(c)?.source:undefined;
function commerzbankFan066Reconstruction(components:BuildingComponent[]){
 const s=stats(),targets=components.filter(c=>commerzbankFan066Identity(c));
 if(!targets.length)return{components,stats:s};
 if(targets.length!==1){s.error='Fan066 duplicate exact identity; original components retained';return{components,stats:s};}
 const c=targets[0],record=__infillRead_owned().get(c);
 if(record){if(!exactOwned(c)){s.error='Fan066 privately owned DISPLAY or original SOURCE changed';return{components,stats:s};}return{components,stats:s};}
 let valid=false;try{valid=c.city==='frankfurt'&&commerzbankExactOriginalMatches(c,pin);}catch{}
 if(!valid){s.error='Fan066 unchanged exact original SOURCE required';return{components,stats:s};}
 let clone=__infillRead_cache().get(c);
 if(clone&&!exactOwned(clone)){s.error='Fan066 cached private DISPLAY changed';return{components,stats:s};}
 if(!clone){
  const batches:MeshBatch[]=__infillRead_DATA().batches.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color] as [number,number,number],materialName:b.geometryRole}));
  clone={...c,batches,displayEstimates:{...c.displayEstimates,commerzbankFanOfficial066:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,officialBuildingIds:__infillRead_DATA().bodies.map(b=>b.officialBuildingId),absoluteDatumM:__infillRead_DATA().datumAbsoluteM,absoluteRoofHeightsM:[109.433,114.227],displayRoofHeightsM:[10.732,15.526],geometrySource:'Original HVBG INSPIRE geometry3DLoD2 clipped only to exact fan1071608175 SOURCE',registrationMargin:'Approximately0.888% root-authorized DISPLAY registration margin extends nearest verified upper roof plane. Separately marked approximation, not original survey; two-plane boundary subdivisions and actual preview remain explicit.',nearGroundUpwardFaceExcluded:'GEOMETRY_130f696c-aaab-4c5f-8601-cfe94b47e7c8 H99.258 is not an upper fan roof.',inheritedDatumBoundary:'Kaiser18/20=98.701m; existing banklong=97.710m and banksmall=98.638m are unchanged independent old datums. No common absolute display plane is asserted.',groundFacesOmitted:true,actualVisualAccepted:false}}};
  const paint=new Float32Array(__infillRead_DATA().batches.flatMap(b=>[...b.paint])),frames=new Float32Array(__infillRead_DATA().batches.flatMap(b=>[...b.frames]));
  __infillRead_owned().set(clone,{source:c,fingerprint:ownerDisplayFingerprint(clone).fingerprint,paint,frames});__infillRead_cache().set(c,clone);
 }
 s.objects=1;s.vertices=clone.batches.reduce((n,b)=>n+b.positions.length/3,0);s.triangles=clone.batches.reduce((n,b)=>n+b.indices.length/3,0);s.originalVertices=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
 s.components.push({objectId:ID,partId:PART,sourcePartId:PART,patchSHA256:SHA,vertices:s.vertices,triangles:s.triangles,geometryRole:'matched-official-two-height-fan-with-separate-registration-margin'});
 return{components:components.map(c=>c===targets[0]?clone!:c),stats:s};
}
function commerzbankFan066AfterParent053Reconstruction(components:BuildingComponent[]){
 for(const c of components)if(__infillRead_owned().has(c)&&!exactOwned(c)){const s=stats();s.error='Fan066 private DISPLAY changed before original23 parent guard';return{components,stats:s};}
 const recovered=components.map(c=>__infillRead_owned().get(c)?.source??c);
 const parent=commerzbankParent053Reconstruction(recovered),fan=commerzbankFan066Reconstruction(parent.components);
 const s:OwnerReconstructionStats={...parent.stats,components:[...parent.stats.components,...fan.stats.components]};
 for(const key of ['objects','vertices','triangles','originalVertices'] as const)s[key]=(s[key]??0)+(fan.stats[key]??0);
 s.error=parent.stats.error||fan.stats.error;
 return{components:fan.components,stats:s};
}
function commerzbankFan066BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((k,b)=>k+b.positions.length/3,0),0);
 if(paint.length!==total*4||frames.length!==total*5)throw Error('Fan066 exact packed attribute lengths required');
 for(const c of components)if(__infillRead_owned().has(c)&&!exactOwned(c))throw Error('Fan066 changed private DISPLAY or original SOURCE before materials');
 let at=0,objects=0,vertices=0;
 for(const c of components){const n=c.batches.reduce((k,b)=>k+b.positions.length/3,0),r=__infillRead_owned().get(c);if(r){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}
 return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}

return {get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},commerzbankFan066OriginalSource,commerzbankFan066Reconstruction,commerzbankFan066AfterParent053Reconstruction,commerzbankFan066BaseMaterials};
});}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
export function commerzbankFan066OriginalSource(...args:[...Parameters<ReturnType<typeof getInfillData>['commerzbankFan066OriginalSource']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return commerzbankFan066OriginalSourceCold(args[0],scope);return getInfillData(scope).commerzbankFan066OriginalSource(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['commerzbankFan066OriginalSource']>);}
export function commerzbankFan066Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['commerzbankFan066Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return commerzbankFan066ReconstructionCold(args[0],scope);return getInfillData(scope).commerzbankFan066Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['commerzbankFan066Reconstruction']>);}
export function commerzbankFan066AfterParent053Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['commerzbankFan066AfterParent053Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return commerzbankFan066AfterParent053ReconstructionCold(args[0],scope);return getInfillData(scope).commerzbankFan066AfterParent053Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['commerzbankFan066AfterParent053Reconstruction']>);}
export function commerzbankFan066BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['commerzbankFan066BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return commerzbankFan066BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).commerzbankFan066BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['commerzbankFan066BaseMaterials']>);}
export const infillDataFunctionArities={"commerzbankFan066OriginalSource":1,"commerzbankFan066Reconstruction":1,"commerzbankFan066AfterParent053Reconstruction":1,"commerzbankFan066BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function commerzbankFan066OriginalSourceCold(c:BuildingComponent,scope?:FrozenDataScope){
return undefined;}

function commerzbankFan066ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){
return {components,stats:stats()};}

function commerzbankFan066AfterParent053ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){
const recovered=components.map(component=>component),parent=commerzbankParent053Reconstruction(recovered),fan=commerzbankFan066Reconstruction(parent.components,scope);const s:OwnerReconstructionStats={...parent.stats,components:[...parent.stats.components,...fan.stats.components]};for(const key of ['objects','vertices','triangles','originalVertices'] as const)s[key]=(s[key]??0)+(fan.stats[key]??0);s.error=parent.stats.error||fan.stats.error;return {components:fan.components,stats:s};}

function commerzbankFan066BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const total=components.reduce((n,c)=>n+c.batches.reduce((k,b)=>k+b.positions.length/3,0),0);
if(paint.length!==total*4||frames.length!==total*5)throw Error('Fan066 exact packed attribute lengths required');
return {objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(c.city==='frankfurt')&&(infillResourceIdentityCandidate("commerzbank-fan-official066.ts",c)||COMMERZBANK_PARENT_MEMBERS.some(member=>member.objectId===c.objectId||member.partId===c.partId)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
