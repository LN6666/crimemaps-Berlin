import {infillResourceHeaderCount} from './infill-resource-header-metadata';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {decodeBuildingShard} from './building-mesh-codec';

const SOURCE_SHARD:any={"schema_version":1,"city":"frankfurt","encoding":"packed-json-v2","position_precision_m":0.01,"components":[{"objectId":"osm/way/611609332","partId":"osm/way/611609332/component/ec51d31e034bebd542b0","city":"frankfurt","origin":[8.6536693,50.11026615],"component_geometry":{"type":"Polygon","coordinate_layout":[[2,2,2,2,2]],"coordinate_type":"i32-e7","coordinates_base64":"rWAoBWYx3h3XdSgFEUXeHT2DKAUtP94dIG4oBXor3h2tYCgFZjHeHQ==","extra":{}},"source_same_geometry":true,"flat_mesh":{"top_indices":"AQAAAAMAAQADAAIA","i_type":"u16","min_height_m":0,"height_m":185,"wall_color":[0.74,0.72,0.69],"roof_color":[0.55,0.53,0.51],"metric_rounding_m":0.001},"displayEstimates":{"geometry_detail_lod":1,"height":{"status":"source-tag-metres","method":"OSM height tag parsed with explicit units"},"minimum":{"status":"display-ground-default"},"roof":{"source":"flat","display":"source-shape-flat","status":"source-shape"},"window_pattern":"display-schematic; does not establish floors or tenants"},"properties":{"addr:city":"Frankfurt am Main","addr:country":"DE","addr:housenumber":"1","addr:postcode":"60327","addr:street":"Br\u00fcsseler Stra\u00dfe","building":"commercial","building:levels":"49","height":"185","name":"ONE","roof:shape":"flat","source":"http://www.caimmo.com/de/portfolio/projekt/one","wikidata":"Q42000797","wikimedia_commons":"Category:One (Frankfurt am Main)","wikipedia":"de:One (Frankfurt am Main)"}}]};
// Never decoded at module evaluation (a cold registry/renderer import decodes no model
// data, infill-scope-data) and never kept resident outside the page budget: identity
// reads only the inline literal's ids; the source guard decodes transiently per call.
const original=()=>decodeBuildingShard(SOURCE_SHARD,"frankfurt").components;
export const INFILL_ONE_SHA="7f8dd1671f98e5f66ddb7a4d70c938fee3cb3c37ccd2d9c0989895fa694cfbc3";
export const infillOneIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&SOURCE_SHARD.components.some((s:any)=>s.objectId===c.objectId&&s.partId===c.partId);
const equalSource=(c:BuildingComponent,s:BuildingComponent)=>JSON.stringify(c.origin)===JSON.stringify(s.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(s.componentGeometry)&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=(s.batches[bi] as any)[k];return a?.length===e?.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));

export function infillOneBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillOneExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}

const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"7f8dd1671f98e5f66ddb7a4d70c938fee3cb3c37ccd2d9c0989895fa694cfbc3",file:"painted/infill/safety/infill-frankfurt-one.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-one.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_DISPLAY_LIST=scopedInfillValue<any[]>(()=>scope.borrow<any[],any[]>(infillOwnDataRefs[0],value=>value));
function infillOneReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 if(!components.some(infillOneIdentity))return{components,stats};
 const loaded=components.filter(infillOneIdentity);
 if(loaded.length===infillResourceHeaderCount(infillOwnDataRefs[0])&&loaded.every(c=>(c.displayEstimates?.infillOneExterior as {patchSHA?:string;sourceAbsent?:boolean}|undefined)?.patchSHA===INFILL_ONE_SHA))return{components,stats};
 if(!original().every(s=>loaded.filter(c=>c.objectId===s.objectId&&c.partId===s.partId).length===1&&loaded.some(c=>c.objectId===s.objectId&&c.partId===s.partId&&equalSource(c,s)))){stats.error='One requires complete unchanged real native source group';return{components,stats};}
 const replacements=__infillRead_DISPLAY_LIST().map((display:any)=>{const batches=display.batches.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],frames:[...b.frames],paint:[...b.paint]}));const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.components.push({objectId:display.objectId,partId:display.partId,sourcePartId:display.partId,patchSHA256:INFILL_ONE_SHA,vertices,triangles,geometryRole:'owner-authorized-reconstruction-per-real-source-identity'});return{...display,batches,displayEstimates:{...display.displayEstimates,infillOneExterior:{...display.displayEstimates.infillOneExterior,patchSHA:INFILL_ONE_SHA}}} as BuildingComponent;});
 stats.originalVertices=loaded.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
 return{components:[...components.filter(c=>!infillOneIdentity(c)),...replacements],stats};
}

function infillDisplaySourceReady(components:readonly BuildingComponent[]):boolean{
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 if(!components.some(infillOneIdentity))return false;
 const loaded=components.filter(infillOneIdentity);
 if(loaded.length===infillResourceHeaderCount(infillOwnDataRefs[0])&&loaded.every(c=>(c.displayEstimates?.infillOneExterior as {patchSHA?:string;sourceAbsent?:boolean}|undefined)?.patchSHA===INFILL_ONE_SHA))return false;
 if(!original().every(s=>loaded.filter(c=>c.objectId===s.objectId&&c.partId===s.partId).length===1&&loaded.some(c=>c.objectId===s.objectId&&c.partId===s.partId&&equalSource(c,s)))){stats.error='One requires complete unchanged real native source group';return false;}

return true;
}
return {infillDisplaySourceReady,get DISPLAY_LIST(){return __infillRead_DISPLAY_LIST();},infillOneReconstruction};
});}
function getDISPLAY_LIST(scope:FrozenDataScope|undefined){return getInfillData(scope).DISPLAY_LIST;}
export function infillOneReconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['infillOneReconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;return getInfillData(scope).infillOneReconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['infillOneReconstruction']>);}
export const infillDataFunctionArities={"infillOneReconstruction":1} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** DISPLAY is admitted only after the original complete SOURCE guard. */
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();const ready=getInfillData(scope).infillDisplaySourceReady(components);
 signal.throwIfAborted();if(!ready)return;
 await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
