import type {BuildingComponent} from "../../../safety/building-mesh-types";
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {InfillDataModule} from './infill-data-contract';
import * as B084 from './infill-frankfurt-bockenheimer084-data';
import * as J088 from './infill-frankfurt-junghof088-data';
import * as Marriott from './infill-frankfurt-jw-marriott-data';
import * as JapanCenter from './infill-frankfurt-japan-center';
/** Separate finite credit for the exact previously prepared owners newly connected in 055. Native and legacy-owner caps are unchanged. */
const count=(batches:any[],key:'vertices'|'indices')=>batches.reduce((n,b)=>n+(key==='vertices'?b.positions.length/3:b.indices.length),0);
const delta=(m:any,key:'vertices'|'indices')=>Math.max(0,count(m.display,key)-count(m.source.batches,key));
const bulkModels=(data:any)=>data.groups.filter((g:any)=>g.geometryReadyForPreview).flatMap((g:any)=>g.models);
const catalogues=[
 {name:'Bockenheimer084',marker:'infillFrankfurtBockenheimer084',patchSHA256:B084.LOW_OFFICE_SHA,models:(scope:FrozenDataScope)=>bulkModels(B084.getLOW_OFFICE_DATA(scope)),prepare:(signal:AbortSignal,scope:FrozenDataScope)=>B084.prepareInfillDataPayload(signal,scope)},
 {name:'Junghof088',marker:'infillFrankfurtJunghof088',patchSHA256:J088.LOW_OFFICE_SHA,models:(scope:FrozenDataScope)=>bulkModels(J088.getLOW_OFFICE_DATA(scope)),prepare:(signal:AbortSignal,scope:FrozenDataScope)=>J088.prepareInfillDataPayload(signal,scope)},
 {name:'JW Marriott',marker:'infillFrankfurtJwMarriottExterior',patchSHA256:Marriott.JW_MARRIOTT_SHA,models:(scope:FrozenDataScope)=>Marriott.getJW_MARRIOTT_DATA(scope).models,prepare:(signal:AbortSignal,scope:FrozenDataScope)=>Marriott.prepareInfillDataPayload(signal,scope)},
 // Credit can only borrow the DISPLAY already admitted by this scope's original SOURCE gate.
 {name:'Japan Center',marker:'infillJapanCenterExterior',patchSHA256:JapanCenter.INFILL_JAPAN_CENTER_SHA,models:(scope:FrozenDataScope)=>JapanCenter.getINFILL_JAPAN_CENTER_BUDGET_MODELS(scope),prepare:(signal:AbortSignal,scope:FrozenDataScope)=>{signal.throwIfAborted();JapanCenter.getINFILL_JAPAN_CENTER_BUDGET_MODELS(scope);signal.throwIfAborted();}}
] as const;
const infillDataMemoKey=Object.freeze({});
type PreparedCatalogue={models:ReadonlyArray<any>;summary:{name:string;patchSHA256:string;models:number;vertices:number;indices:number}};
function preparedCatalogues(scope:FrozenDataScope){return scope.memo(infillDataMemoKey,()=>new Map<number,PreparedCatalogue>());}
function catalogue(index:number,scope:FrozenDataScope|undefined):PreparedCatalogue{
 if(!scope)throw Error('infill-owner055-budget-credit.ts requires a prepared FrozenDataScope');
 const prepared=preparedCatalogues(scope),previous=prepared.get(index);if(previous)return previous;
 const g=catalogues[index],models:ReadonlyArray<any>=g.models(scope),value={models,summary:{name:g.name,patchSHA256:g.patchSHA256,models:models.length,vertices:models.reduce((n,m)=>n+delta(m,'vertices'),0),indices:models.reduce((n,m)=>n+delta(m,'indices'),0)}};
 prepared.set(index,value);return value;
}
/** Diagnostics observe only catalogues already required by an actual marker. */
export function getINFILL_OWNER055_BUDGET_CATALOGUE(scope?:FrozenDataScope){
 if(!scope)return null;const prepared=preparedCatalogues(scope);
 return Object.freeze(catalogues.map((g,i)=>{const summary=prepared.get(i)?.summary;return Object.freeze({name:g.name,patchSHA256:g.patchSHA256,models:summary?.models??null,vertices:summary?.vertices??null,indices:summary?.indices??null});}));
}
export function infillOwner055BudgetCredit(components:BuildingComponent[],scope?:FrozenDataScope){
 const seen=new Set<string>(),byOwner=catalogues.map(g=>({name:g.name,patchSHA256:g.patchSHA256,models:null as number|null,vertices:0,indices:0,rows:0}));let vertices=0,indices=0,rows=0;
 for(const c of components)for(const[gi,descriptor]of catalogues.entries()){
  const marker=c.displayEstimates?.[descriptor.marker] as {patchSHA?:string}|undefined;if(!marker)continue;
  const key=c.objectId+'|'+c.partId;
  if(c.city!=='frankfurt'||marker.patchSHA!==descriptor.patchSHA256||seen.has(key))throw new Error('Unattested owner055 display budget credit');
  const g=catalogue(gi,scope),m=g.models.find((m:any)=>m.identity.objectId===c.objectId&&m.identity.partId===c.partId);
  if(!m)throw new Error('Unattested owner055 display budget credit');seen.add(key);byOwner[gi].models=g.summary.models;
  if(!['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(m.source[k]))||c.batches.length!==m.display.length||!c.batches.every((b,bi)=>['positions','normals','indices','color','paint','frames'].every(k=>{const a=(b as any)[k],e=m.display[bi][k];return a&&e&&a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));})))throw new Error('Changed owner055 display budget credit geometry');
  const v=delta(m,'vertices'),i=delta(m,'indices');vertices+=v;indices+=i;rows++;byOwner[gi].vertices+=v;byOwner[gi].indices+=i;byOwner[gi].rows++;
 }
 const prepared=scope?preparedCatalogues(scope):undefined;
 for(const [i,g]of byOwner.entries()){const limit=prepared?.get(i)?.summary;if(limit&&(g.vertices>limit.vertices||g.indices>limit.indices))throw new Error('Owner055 display reserve exceeded');}
 const observed=getINFILL_OWNER055_BUDGET_CATALOGUE(scope),total=(key:'vertices'|'indices')=>observed&&observed.every(g=>g[key]!==null)?observed.reduce((n,g)=>n+g[key]!,0):null;
 return{vertices,indices,rows,catalogueVertices:total('vertices'),catalogueIndices:total('indices'),byOwner};
}
export const infillDataRefs:readonly FrozenDataRef[]=[];
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export const infillDataFunctionArities={infillOwner055BudgetCredit:1,getINFILL_OWNER055_BUDGET_CATALOGUE:0} as const;
export const infillDataMetadataFunctions=['getINFILL_OWNER055_BUDGET_CATALOGUE'] as const;
export const infillDataDependencies=():readonly InfillDataModule[]=>[B084,J088,Marriott,JapanCenter];
// Repacking a cached display reruns its full credit proof against these models.
export const infillDataResidentRefs:readonly FrozenDataRef[]=[...B084.infillDataRefs,...J088.infillDataRefs,...Marriott.infillDataRefs,...JapanCenter.infillDataRefs];
export const infillDataResidentMemoKeys:readonly object[]=[infillDataMemoKey,...B084.infillDataMemoKeys,...J088.infillDataMemoKeys,...Marriott.infillDataMemoKeys,...JapanCenter.infillDataMemoKeys];
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();
 for(const g of catalogues){
  const active=components.filter(c=>!!c.displayEstimates?.[g.marker]);if(!active.length)continue;
  if(active.some(c=>c.city!=='frankfurt'||(c.displayEstimates?.[g.marker] as {patchSHA?:string}).patchSHA!==g.patchSHA256))throw new Error('Unattested owner055 display budget credit');
  await g.prepare(signal,scope);signal.throwIfAborted();
 }
}
