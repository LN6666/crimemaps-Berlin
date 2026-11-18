import {infillResourceHeaderCount} from './infill-resource-header-metadata';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {decodeBuildingShard} from './building-mesh-codec';

const JAPAN_CENTER_SOURCE_IDENTITIES=[{"objectId":"osm/way/11527497","partId":"osm/way/11527497/component/c1e26125ca1afa30584b","city":"frankfurt"}] as const;
const japanSourceMemoKey=Object.freeze({});
function createJapanCenterSource(){const SOURCE_SHARD={"schema_version":1,"city":"frankfurt","encoding":"packed-json-v2","position_precision_m":0.01,"components":[{"objectId":"osm/way/11527497","partId":"osm/way/11527497/component/c1e26125ca1afa30584b","city":"frankfurt","origin":[8.672421,50.1112891],"component_geometry":{"type":"Polygon","coordinate_layout":[[2,2,2,2,2,2,2,2]],"coordinate_type":"i32-e7","coordinates_base64":"SVwrBetd3h3iSisFWlfeHeRJKwVuWN4dqUkrBa9Y3h3fRSsF01zeHZtAKwWGYt4dBVIrBRxp3h1JXCsF613eHQ==","extra":{}},"source_same_geometry":true,"flat_mesh":{"top_indices":"AQAAAAYABgAFAAQABgAEAAMABgADAAIABgACAAEA","i_type":"u16","min_height_m":0,"height_m":115,"wall_color":[0.6470588235294118,0.16470588235294117,0.16470588235294117],"roof_color":[0.55,0.53,0.51],"metric_rounding_m":0.001},"displayEstimates":{"geometry_detail_lod":1,"height":{"status":"source-tag-metres","method":"OSM height tag parsed with explicit units"},"minimum":{"status":"display-ground-default"},"roof":{"source":"unknown","display":"unknown-roof-flat-schematic","status":"display-estimate"},"window_pattern":"display-schematic; does not establish floors or tenants"},"properties":{"addr:city":"Frankfurt am Main","addr:country":"DE","addr:housenumber":"2","addr:postcode":"60311","addr:street":"Taunustor","building":"office","building:colour":"brown","building:levels":"27","height":"115","name":"Japan Center","start_date":"1996","wikidata":"Q266965","wikimedia_commons":"Category:Japan-Center","wikipedia":"de:Japan Center"}}]};return decodeBuildingShard(SOURCE_SHARD,"frankfurt").components;}
function japanSourceCell(scope:FrozenDataScope){return scope.memo(japanSourceMemoKey,()=>({current:undefined as {value:ReturnType<typeof createJapanCenterSource>}|undefined}));}
function getJapanCenterSource(scope:FrozenDataScope|undefined){if(!scope)throw Error('Japan Center SOURCE requires a prepared FrozenDataScope');const current=japanSourceCell(scope).current;if(!current)throw Error('Japan Center SOURCE was not prepared');return current.value;}
async function prepareJapanCenterSource(signal:AbortSignal,scope:FrozenDataScope){signal.throwIfAborted();const cell=japanSourceCell(scope);if(!cell.current){const value=createJapanCenterSource();signal.throwIfAborted();cell.current={value};}signal.throwIfAborted();}

export const INFILL_JAPAN_CENTER_SHA="d73f3946c6787edabc9b0efb944e8455eaa9fd70617e336d7cc38150a4bb129b";
export const infillJapanCenterIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&JAPAN_CENTER_SOURCE_IDENTITIES.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const equalSource=(c:BuildingComponent,s:BuildingComponent)=>JSON.stringify(c.origin)===JSON.stringify(s.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(s.componentGeometry)&&JSON.stringify(c.sourceFeature)===JSON.stringify(s.sourceFeature)&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=(s.batches[bi] as any)[k];return a?.length===e?.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));

export function infillJapanCenterBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillJapanCenterExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}

/** Exact existing SOURCE/DISPLAY catalogue for finite budget attestation; geometry and material arrays are unchanged. */


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"d73f3946c6787edabc9b0efb944e8455eaa9fd70617e336d7cc38150a4bb129b",file:"painted/infill/safety/infill-frankfurt-japan-center.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-japan-center.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_DISPLAY_LIST=scopedInfillValue<any[]>(()=>scope.borrow<any[],any[]>(infillOwnDataRefs[0],value=>value));
function infillJapanCenterReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 if(!components.some(infillJapanCenterIdentity))return{components,stats};
 const loaded=components.filter(infillJapanCenterIdentity);
 if(loaded.length===infillResourceHeaderCount(infillOwnDataRefs[0])&&loaded.every(c=>(c.displayEstimates?.infillJapanCenterExterior as {patchSHA?:string}|undefined)?.patchSHA===INFILL_JAPAN_CENTER_SHA))return{components,stats};
 if(!getJapanCenterSource(scope).every(s=>loaded.filter(c=>c.objectId===s.objectId&&c.partId===s.partId).length===1&&loaded.some(c=>c.objectId===s.objectId&&c.partId===s.partId&&equalSource(c,s)))){stats.error='JapanCenter requires complete unchanged real native source group';return{components,stats};}
 const replacements=__infillRead_DISPLAY_LIST().map((display:any)=>{const batches=display.batches.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],frames:[...b.frames],paint:[...b.paint]}));const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.components.push({objectId:display.objectId,partId:display.partId,sourcePartId:display.partId,patchSHA256:INFILL_JAPAN_CENTER_SHA,vertices,triangles,geometryRole:'owner-authorized-reconstruction-per-real-source-identity'});return{...display,batches,displayEstimates:{...display.displayEstimates,infillJapanCenterExterior:{...display.displayEstimates.infillJapanCenterExterior,patchSHA:INFILL_JAPAN_CENTER_SHA}}} as BuildingComponent;});
 stats.originalVertices=loaded.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
 return{components:[...components.filter(c=>!infillJapanCenterIdentity(c)),...replacements],stats};
}
const __infillRead_INFILL_JAPAN_CENTER_BUDGET_MODELS=scopedInfillValue(()=>Object.freeze(__infillRead_DISPLAY_LIST().map((d:any)=>Object.freeze({identity:{objectId:d.objectId,partId:d.partId},source:getJapanCenterSource(scope).find(s=>s.objectId===d.objectId&&s.partId===d.partId)!,display:d.batches}))));

function infillDisplaySourceReady(components:readonly BuildingComponent[]):boolean{
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 if(!components.some(infillJapanCenterIdentity))return false;
 const loaded=components.filter(infillJapanCenterIdentity);
 if(loaded.length===infillResourceHeaderCount(infillOwnDataRefs[0])&&loaded.every(c=>(c.displayEstimates?.infillJapanCenterExterior as {patchSHA?:string}|undefined)?.patchSHA===INFILL_JAPAN_CENTER_SHA))return false;
 if(!getJapanCenterSource(scope).every(s=>loaded.filter(c=>c.objectId===s.objectId&&c.partId===s.partId).length===1&&loaded.some(c=>c.objectId===s.objectId&&c.partId===s.partId&&equalSource(c,s)))){stats.error='JapanCenter requires complete unchanged real native source group';return false;}

return true;
}
return {infillDisplaySourceReady,get DISPLAY_LIST(){return __infillRead_DISPLAY_LIST();},get INFILL_JAPAN_CENTER_BUDGET_MODELS(){return __infillRead_INFILL_JAPAN_CENTER_BUDGET_MODELS();},infillJapanCenterReconstruction};
});}
function getDISPLAY_LIST(scope:FrozenDataScope|undefined){return getInfillData(scope).DISPLAY_LIST;}
export function getINFILL_JAPAN_CENTER_BUDGET_MODELS(scope:FrozenDataScope|undefined){return getInfillData(scope).INFILL_JAPAN_CENTER_BUDGET_MODELS;}
export function infillJapanCenterReconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['infillJapanCenterReconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;return getInfillData(scope).infillJapanCenterReconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['infillJapanCenterReconstruction']>);}
export const infillDataFunctionArities={"getINFILL_JAPAN_CENTER_BUDGET_MODELS":0,"infillJapanCenterReconstruction":1} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** DISPLAY is admitted only after the original complete SOURCE guard. */
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();const loaded=components.filter(infillJapanCenterIdentity);signal.throwIfAborted();if(!loaded.length)return;
 const alias=loaded.length===infillResourceHeaderCount(infillOwnDataRefs[0])&&loaded.every(c=>(c.displayEstimates?.infillJapanCenterExterior as {patchSHA?:string}|undefined)?.patchSHA===INFILL_JAPAN_CENTER_SHA);signal.throwIfAborted();if(alias)return;
 await prepareJapanCenterSource(signal,scope);signal.throwIfAborted();
 const ready=getInfillData(scope).infillDisplaySourceReady(components);
 signal.throwIfAborted();if(!ready)return;
 await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}

export const infillDataResidentMemoKeys=[japanSourceMemoKey] as const;
