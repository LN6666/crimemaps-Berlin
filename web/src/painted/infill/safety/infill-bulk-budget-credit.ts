import type {BuildingComponent} from "../../../safety/building-mesh-types";
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {InfillDataModule} from './infill-data-contract';
import {getLOW_OFFICE_DATA,LOW_OFFICE_SHA} from './infill-frankfurt-low-office-bulk70-data';
import * as bulkData from './infill-frankfurt-low-office-bulk70-data';
import {INFILL_BULK_BUDGET_CATALOGUE,infillBulkBudgetIdentity} from './infill-frankfurt-low-office-bulk70-budget-metadata';
export {INFILL_BULK_BUDGET_CATALOGUE} from './infill-frankfurt-low-office-bulk70-budget-metadata';
/** A finite separate reserve for the 80 added groups; no reserve for unknown or altered geometry. */
const modelsKey={};
function budgetModels(scope:FrozenDataScope|undefined):any[]{if(!scope)throw Error('Bulk budget credit requires a prepared FrozenDataScope');return scope.memo(modelsKey,()=>getLOW_OFFICE_DATA(scope).groups.filter((g:any)=>g.geometryReadyForPreview).flatMap((g:any)=>g.models));}
const count=(batches:any[],key:'vertices'|'indices')=>batches.reduce((n,b)=>n+(key==='vertices'?b.positions.length/3:b.indices.length),0);
const delta=(m:any,key:'vertices'|'indices')=>Math.max(0,count(m.display,key)-count(m.source.batches,key));
export function infillBulkBudgetCredit(components:BuildingComponent[],scope?:FrozenDataScope){
 let vertices=0,indices=0,rows=0;const seen=new Set<string>();
 for(const c of components){const marker=c.displayEstimates?.infillFrankfurtLowOfficeBulk70 as {patchSHA?:string}|undefined;if(!marker)continue;
  if(c.city!=='frankfurt'||marker.patchSHA!==LOW_OFFICE_SHA||!infillBulkBudgetIdentity(c))throw new Error('Unattested bulk display budget credit');
  const m=budgetModels(scope).find(m=>m.identity.objectId===c.objectId&&m.identity.partId===c.partId),key=c.objectId+'|'+c.partId;
  if(c.city!=='frankfurt'||!m||marker.patchSHA!==LOW_OFFICE_SHA||seen.has(key))throw new Error('Unattested bulk display budget credit');seen.add(key);
  if(!['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(m.source[k]))||c.batches.length!==m.display.length||!c.batches.every((b,bi)=>['positions','normals','indices','color','paint','frames'].every(k=>{const a=(b as any)[k],e=m.display[bi][k];return a&&e&&a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));})))throw new Error('Changed bulk display budget credit geometry');
  vertices+=delta(m,'vertices');indices+=delta(m,'indices');rows++;
 }
 if(vertices>INFILL_BULK_BUDGET_CATALOGUE.vertices||indices>INFILL_BULK_BUDGET_CATALOGUE.indices)throw new Error('Bulk display reserve exceeded');
 return {vertices,indices,rows,catalogueVertices:INFILL_BULK_BUDGET_CATALOGUE.vertices,catalogueIndices:INFILL_BULK_BUDGET_CATALOGUE.indices,patchSHA256:LOW_OFFICE_SHA};
}

export const infillDataRefs=[] as const;
export const infillDataMemoKeys=[modelsKey] as const;
export const infillDataResidentRefs=bulkData.infillDataRefs;
export const infillDataResidentMemoKeys=infillDataMemoKeys;
export const infillDataDependencies=():readonly InfillDataModule[]=>[bulkData];
export const infillDataFunctionArities={infillBulkBudgetCredit:1} as const;
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();const rows=components.filter(c=>!!c.displayEstimates?.infillFrankfurtLowOfficeBulk70);if(!rows.length)return;
 for(const c of rows){const marker=c.displayEstimates?.infillFrankfurtLowOfficeBulk70 as {patchSHA?:string}|undefined;if(c.city!=='frankfurt'||marker?.patchSHA!==LOW_OFFICE_SHA||!infillBulkBudgetIdentity(c))throw new Error('Unattested bulk display budget credit');}
 await bulkData.prepareInfillData(components,signal,scope);signal.throwIfAborted();
}
