import type {BuildingComponent} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {BULK70_IDENTITY_GROUPS} from '../../infill/safety/infill-frankfurt-low-office-bulk70-identities';
import {LOW_OFFICE_SHA} from '../../infill/safety/infill-frankfurt-low-office-bulk70-metadata';
import {INFILL_BULK_BUDGET_CATALOGUE,infillBulkBudgetIdentity} from '../../infill/safety/infill-frankfurt-low-office-bulk70-budget-metadata';
export {infillFrankfurtLowOfficeBulk70Identity} from '../../infill/safety/infill-frankfurt-low-office-bulk70-identities';
export {infillFrankfurtLowOfficeBulk70BaseMaterials} from '../../infill/safety/infill-frankfurt-low-office-bulk70-materials';
export {INFILL_BULK_BUDGET_CATALOGUE} from '../../infill/safety/infill-frankfurt-low-office-bulk70-budget-metadata';

type ReconstructionModule=typeof import('../../infill/safety/infill-frankfurt-low-office-bulk70');
type BudgetModule=typeof import('../../infill/safety/infill-bulk-budget-credit');
/** The original builder and budget modules merged. Each prepares its own scoped
 * data: prepareInfillData is the builder's, prepareBudgetInfillData the budget's
 * (a loader that supplies only prepareInfillData prepares the builder's alone). */
type Builder=Omit<ReconstructionModule&BudgetModule,'prepareInfillData'>&Pick<ReconstructionModule,'prepareInfillData'>&{prepareBudgetInfillData?:BudgetModule['prepareInfillData']};
type Wait=<T>(operation:Promise<T>)=>Promise<T>;
const identityWait:Wait=operation=>operation;

/** The identity predicate remains city-agnostic. Only reconstruction demand is
 * city/identity gated, matching the original builder's explicit Frankfurt guard.
 * The original material writer is independent from this loader and its data.
 * The batch's FrozenDataScope travels with every call (DECISIONS 2026-11-02 01:35,
 * fix one): prepare(components, signal, wait, scope) loads the original modules
 * once and then prepares their frozen data in that scope, and reconstruct and
 * budgetCredit read it through the same scope. Without a scope they keep the
 * import-only behaviour, so an original builder that reads scoped data fails as
 * it always has. */
export function createInfillFrankfurtLowOfficeBulk70Loader(loadModules:()=>Promise<Builder>=async()=>{
 const [builder,budget]=await Promise.all([import('../../infill/safety/infill-frankfurt-low-office-bulk70'),import('../../infill/safety/infill-bulk-budget-credit')]);
 return{...builder,...budget,prepareInfillData:builder.prepareInfillData,prepareBudgetInfillData:budget.prepareInfillData,infillDataFunctionArities:{...builder.infillDataFunctionArities,...budget.infillDataFunctionArities}};
}){
 let ready:Builder|undefined,pending:Promise<Builder>|undefined;
 const needed=(components:readonly BuildingComponent[],selectedQueueIds?:readonly string[])=>BULK70_IDENTITY_GROUPS.some(group=>(!selectedQueueIds||selectedQueueIds.includes(group.queueId))&&group.identities.some(identity=>components.some(component=>component.city==='frankfurt'&&component.objectId===identity.objectId&&component.partId===identity.partId)));
 async function prepare(components:readonly BuildingComponent[],signal:AbortSignal,wait:Wait=identityWait,scope?:FrozenDataScope){
  signal.throwIfAborted();if(!needed(components))return;
  if(!ready)await load(signal,wait);
  if(scope){const module=ready!;await module.prepareInfillData(components,signal,scope);signal.throwIfAborted();await module.prepareBudgetInfillData?.(components,signal,scope);signal.throwIfAborted();}
 }
 async function load(signal:AbortSignal,wait:Wait){
  if(!pending){const next=Promise.resolve().then(loadModules).then(module=>{
   for(const key of ['patchSHA256','models','vertices','indices']as const)if(module.INFILL_BULK_BUDGET_CATALOGUE?.[key]!==INFILL_BULK_BUDGET_CATALOGUE[key])throw Error('Bulk70 budget catalogue identity mismatch');
   return module;
  });pending=next;void next.catch(()=>{if(pending===next)pending=undefined;});}
  const operation=pending;
  const module=await new Promise<Builder>((resolve,reject)=>{
   let done=false;const cleanup=()=>{if(done)return false;done=true;signal.removeEventListener('abort',cancel);return true;};
   const cancel=()=>{if(cleanup())reject(signal.reason??new DOMException('Aborted','AbortError'));};
   signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
   Promise.resolve().then(()=>wait(operation)).then(value=>{if(cleanup())resolve(value);},error=>{if(cleanup())reject(error);});
  });
  signal.throwIfAborted();ready=module;
 }
 function reconstruct(components:BuildingComponent[],selectedQueueIds?:string[],scope?:FrozenDataScope){
  if(ready)return ready.infillFrankfurtLowOfficeBulk70Reconstruction(components,selectedQueueIds,scope);
  if(needed(components,selectedQueueIds))throw Error('Frankfurt bulk70 builder was not prepared for these components');
  const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
  // The original implementation always maps to a fresh array, even on no match.
  return{components:components.map(component=>component),stats};
 }
 function budgetCredit(components:BuildingComponent[],scope?:FrozenDataScope){
  if(ready)return ready.infillBulkBudgetCredit(components,scope);
  const marked=components.find(component=>component.displayEstimates?.infillFrankfurtLowOfficeBulk70);
  if(marked){
   const marker=marked.displayEstimates!.infillFrankfurtLowOfficeBulk70 as {patchSHA?:string};
   if(marked.city!=='frankfurt'||!infillBulkBudgetIdentity(marked)||marker.patchSHA!==LOW_OFFICE_SHA)throw Error('Unattested bulk display budget credit');
   throw Error('Frankfurt bulk70 budget was not prepared for these components');
  }
  return{vertices:0,indices:0,rows:0,catalogueVertices:INFILL_BULK_BUDGET_CATALOGUE.vertices,catalogueIndices:INFILL_BULK_BUDGET_CATALOGUE.indices,patchSHA256:LOW_OFFICE_SHA};
 }
 return{prepare,reconstruct,budgetCredit};
}
const loader=createInfillFrankfurtLowOfficeBulk70Loader();
export const prepareInfillFrankfurtLowOfficeBulk70Reconstruction=loader.prepare;
export const infillFrankfurtLowOfficeBulk70Reconstruction=loader.reconstruct;
export const infillBulkBudgetCredit=loader.budgetCredit;
