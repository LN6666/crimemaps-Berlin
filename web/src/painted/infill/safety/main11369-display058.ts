import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity,MeshBatch} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {MAIN11369_SOURCE057 as SOURCES} from './main11369-source057';
import {MAIN11369_DISPLAY_SHA058 as SHA,getMAIN11369_DISPLAY_DATA058 as __infillDataDependency0} from './main11369-display-data058';
type Record058={source:BuildingComponent;snapshot:BuildingComponent;frames:Float32Array;selected:{vertex:number;family:number}[];geometryChanged:boolean};

const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const exact=(a:BuildingComponent,b:BuildingComponent)=>a.city==='frankfurt'&&a.objectId===b.objectId&&a.partId===b.partId&&same(a.origin,b.origin)&&same(a.componentGeometry,b.componentGeometry)&&same(a.sourceFeature,b.sourceFeature)&&a.batches.length===b.batches.length&&a.batches.every((x,bi)=>['positions','normals','indices','color'].every(k=>{const u=(x as any)[k]as ArrayLike<number>,v=(b.batches[bi]as any)[k]as ArrayLike<number>;return u?.length===v?.length&&Array.from(u).every((n,i)=>Object.is(n,v[i]));}));
const snapshot=(c:BuildingComponent):BuildingComponent=>({...c,origin:[...c.origin],componentGeometry:JSON.parse(JSON.stringify(c.componentGeometry)),sourceFeature:JSON.parse(JSON.stringify(c.sourceFeature)),batches:c.batches.map(b=>({...b,positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices),color:Array.from(b.color)}))});


/** Actual triangle removal/clipping of30 proven duplicate intervals. SOURCE arrays are never edited.
 * All unproven193m planes and all native roofs remain. No shader discard or height-based silhouette edit. */

/** Rebind current metre frames on the two exact derived carriers, then override only surviving11369 walls.
 * Other941 materials, all roof buffers and every unrelated object's attributes remain untouched. */


import * as __infillResourceDependency0 from './main11369-display-data058';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("main11369-display058.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_PLANS=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,Record058>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,BuildingComponent>());
const main11369Display058Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&__infillRead_PLANS().some(p=>p.geometryChanged&&p.objectId===c.objectId&&p.partId===c.partId);
const main11369Display058OriginalSource=(c:BuildingComponent)=>__infillRead_owned().get(c)?.geometryChanged?__infillRead_owned().get(c)?.source:undefined;
function main11369Display058Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const fail=(reason:string)=>{stats.error=reason;return{components,stats};};
 for(const c of components){const o=__infillRead_owned().get(c);if(o&&!exact(c,o.snapshot))return fail('Main058 privately owned DISPLAY arrays altered');}
 const sourceRows=components.map(c=>__infillRead_owned().get(c)?.source??c),targets=new Map<string,BuildingComponent>();
 const unchangedSources=()=>sourceRows.every((c,i)=>c===components[i])?components:sourceRows;
 for(const s of SOURCES){const rows=sourceRows.filter(c=>c.objectId===s.objectId&&c.partId===s.partId);if(rows.length>1||rows.length===1&&!exact(rows[0],s)){stats.error='Main058 exact native SOURCE duplicated or altered';return{components:unchangedSources(),stats};}if(rows.length===1)targets.set(s.objectId,rows[0]);}
 // A streamed view may omit this unrelated group. Derive nothing until all three exact SOURCE members are resident.
 if(targets.size!==SOURCES.length)return{components:unchangedSources(),stats};
 const replacements=new Map<BuildingComponent,BuildingComponent>();
 for(const p of __infillRead_PLANS()){const source=targets.get(p.objectId)!;let display=__infillRead_cache().get(source);if(display){const prior=__infillRead_owned().get(display);if(!prior||!exact(display,prior.snapshot))return fail('Main058 cached DISPLAY arrays altered');}else{
   const batches:MeshBatch[]=p.geometryChanged?p.batches.map((b,bi)=>bi===0?source.batches[0]:{...source.batches[bi],positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:source.batches[bi].color}):source.batches;
   display=p.geometryChanged?{...source,batches,displayEstimates:{...source.displayEstimates,main11369Display058:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,geometryRole:'proved-native-coface-interval-retirement-only',unverifiedHighGlassPlanes:'retained full native193m; not photo-accepted',actualVisualAccepted:false}}}:{...source};
   __infillRead_owned().set(display,{source,snapshot:snapshot(display),frames:new Float32Array(p.frames),selected:p.selected,geometryChanged:p.geometryChanged});__infillRead_cache().set(source,display);
  }
  replacements.set(source,display);
  if(p.geometryChanged){const n=display.batches.reduce((n,b)=>n+b.positions.length/3,0),t=display.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=n;stats.triangles+=t;stats.originalVertices+=source.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:n,triangles:t,geometryRole:'proved-native-coface-interval-retirement-only'});}
 }
 return{components:sourceRows.map(c=>replacements.get(c)??c),stats};
}
function main11369Display058BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 let total=0;for(const c of components)total+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
 if(paint.length!==total*4||frames.length!==total*5)throw Error('Main058 complete material buffers required');
 const records=components.map(c=>({c,o:__infillRead_owned().get(c)})).filter(x=>x.o);
 if(records.length===0)return{objects:0,vertices:0,selectedVertices:0};
 // Reconstruction creates these private records only after validating the
 // complete three-source group. Material packing receives one resident chunk,
 // which may contain only a subset of those already admitted carriers.
 const identities=new Set(records.map(({c})=>JSON.stringify([c.objectId,c.partId])));
 if(identities.size!==records.length||records.some(({c})=>!__infillRead_PLANS().some(p=>p.objectId===c.objectId&&p.partId===c.partId)))throw Error('Main058 duplicate or unknown privately validated carriers');
 for(const {c,o}of records)if(!exact(c,o!.snapshot))throw Error('Main058 privately owned DISPLAY changed before materials');
 let at=0,objects=0,vertices=0,selectedVertices=0;
 for(const c of components){const n=c.batches.reduce((n,b)=>n+b.positions.length/3,0),o=__infillRead_owned().get(c);if(o){
   if(o.geometryChanged)frames.set(o.frames,at*5);
   for(const s of o.selected){const i=at+s.vertex,frame=s.vertex*5;frames.set(o.frames.subarray(frame,frame+5),i*5);paint.set(s.family===45150?[.40,.52,.56,2]:[.60,.61,.55,2],i*4);selectedVertices++;}
   objects++;vertices+=n;
  }at+=n;}
 return{objects,vertices,selectedVertices,sourceRetained:true,actualVisualAccepted:false};
}

return {get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},main11369Display058Identity,main11369Display058OriginalSource,main11369Display058Reconstruction,main11369Display058BaseMaterials};
});}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
export function main11369Display058Identity(...args:[...Parameters<ReturnType<typeof getInfillData>['main11369Display058Identity']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return main11369Display058IdentityCold(args[0],scope);return getInfillData(scope).main11369Display058Identity(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['main11369Display058Identity']>);}
export function main11369Display058OriginalSource(...args:[...Parameters<ReturnType<typeof getInfillData>['main11369Display058OriginalSource']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return main11369Display058OriginalSourceCold(args[0],scope);return getInfillData(scope).main11369Display058OriginalSource(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['main11369Display058OriginalSource']>);}
export function main11369Display058Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['main11369Display058Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return main11369Display058ReconstructionCold(args[0],scope);return getInfillData(scope).main11369Display058Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['main11369Display058Reconstruction']>);}
export function main11369Display058BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['main11369Display058BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return main11369Display058BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).main11369Display058BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['main11369Display058BaseMaterials']>);}
export const infillDataFunctionArities={"main11369Display058Identity":1,"main11369Display058OriginalSource":1,"main11369Display058Reconstruction":1,"main11369Display058BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function main11369Display058IdentityCold(c:Identity&{city?:string},scope?:FrozenDataScope){
return false;}

function main11369Display058OriginalSourceCold(c:BuildingComponent,scope?:FrozenDataScope){
return undefined;}

function main11369Display058ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
return {components:components.map(component=>component),stats};}

function main11369Display058BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){let total=0;
for(const c of components)total+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
if(paint.length!==total*4||frames.length!==total*5)throw Error('Main058 complete material buffers required');
return {objects:0,vertices:0,selectedVertices:0};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(infillResourceIdentityCandidate("main11369-display058.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
