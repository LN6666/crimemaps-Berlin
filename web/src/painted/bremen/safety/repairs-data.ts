import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {BREMEN_DEMAND_METADATA} from './bremen-demand-metadata';
export const BREMEN_OLDTOWN_REPAIRS_SHA="b40c1ec6557093160bf7624960966ed6e4f15810ec28f6598a0de638e56a5a6f";
export const BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE={"canonicalSHA256":"b40c1ec6557093160bf7624960966ed6e4f15810ec28f6598a0de638e56a5a6f","file":"painted/bremen/safety/repairs-data.ts","occurrence":0,"codec":"json"} as const;
const REPAIRS_DEMAND_KEY={};
type RepairsDemand={targets:Set<string>|undefined;wholeObserved:boolean};
function repairsDemand(scope:FrozenDataScope):RepairsDemand{return scope.memo(REPAIRS_DEMAND_KEY,()=>({targets:undefined,wholeObserved:false}));}
export function getBREMEN_OLDTOWN_REPAIRS_DATA(scope?:FrozenDataScope){
 if(!scope)throw Error('Frozen data scope required for BREMEN_OLDTOWN_REPAIRS_DATA');
 scope.assertSelection(BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE,[]);
 const demand=repairsDemand(scope);
 return scope.borrow<any,any>(BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE,value=>{
  if(demand.targets===undefined){demand.wholeObserved=true;return value;}
  scope.assertSelection(BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE,[...demand.targets]);
  // A no-profile client may physically read the canonical envelope. Its value
  // must still obey the selected semantic demand and preserve original order.
  return {...value,models:(value.models??[]).filter((model:any)=>demand.targets!.has(model.targetId))};
 });
}

/** Each target is a complete authored model/native cohort, never a row slice. */
export function bremenRepairsResourceTargets(components:readonly {city?:string;objectId?:string;partId?:string}[]):string[]{
 const pairs=new Set(components.filter(c=>c.city==='bremen').map(c=>c.objectId+'|'+c.partId));
 return BREMEN_DEMAND_METADATA.repairs.models.filter((model:any)=>[...model.requiredNativeGroup,...model.displays,model.sourceBinding].some((row:any)=>pairs.has(row.objectId+'|'+row.partId))).map((model:any)=>model.targetId);
}
export async function prepareBremenRepairsData(components:readonly {city?:string;objectId?:string;partId?:string}[],signal:AbortSignal,scope:FrozenDataScope){
 return prepareBremenRepairsTargets(bremenRepairsResourceTargets(components),signal,scope);
}

/** All selected preparation entries share this hand-off, including certificates.
 * The memo contains only declared target strings, not a parsed value. It stays
 * with the scope's immutable selection across data retirement/re-preparation. */
export async function prepareBremenRepairsTargets(targets:readonly string[],signal:AbortSignal,scope:FrozenDataScope){
 signal.throwIfAborted();if(!targets.length)return;
 await scope.prepareSelection(BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE,targets,signal);signal.throwIfAborted();
 const demand=repairsDemand(scope);if(demand.wholeObserved)return;
 demand.targets??=new Set();for(const target of targets)demand.targets.add(target);
}
