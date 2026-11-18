import type {PlanarReflectionPass,PlanarReflectionResult,PlanarReflectionSource,ReflectionBudgetOmission,SolarShadowCoverage} from './planar-building-reflection';
import {createSolarShadowPreparationBudget,solarShadowPreparation,type SolarShadowPreparationResult} from './solar-shadow-preparation';

// Defined beside the capture contract; documented there.
export type {ReflectionBudgetOmission} from './planar-building-reflection';
export type PlanarReflectionGroupResult=PlanarReflectionResult&{budgetOmissions?:ReflectionBudgetOmission[]};
/** Last planar reflection capture through this group (solar depth passes are
 * not counted). pending=true means later providers were not rendered, so the
 * omission list may be incomplete. */
export type ReflectionBudgetStats={captures:number;pending:boolean;omissions:ReflectionBudgetOmission[]};
// Same registry key as RESIDENT_REFLECTION_BUDGET_TALLY in resident-planar-reflection.ts.
const BUDGET_TALLY=Symbol.for('crimemaps.resident-reflection.budget-omission-tally');
const MAX_BUDGET_OMISSION_ROWS=16;
type BudgetTally={components:number;triangles:number;draws:number};
const countValue=(value:unknown):value is number=>Number.isSafeInteger(value)&&(value as number)>=0;
/** A provider's held ledger waits (budgetWaiting) add up like its other counts.
 * Each provider counts at most its own pending demands, so one provider's held
 * waits never cover another provider's ordinary pending, which still needs the
 * caller's frame. A required provider not yet created is ordinary pending. */
const heldWaits=(result:SolarShadowPreparationResult)=>countValue(result.budgetWaiting)&&countValue(result.pending)?Math.min(result.budgetWaiting,result.pending):0;
/** Collects only the plans made synchronously inside `run`; nested groups install
 * their own tally per provider, so every omission lands in exactly one tally. */
function withBudgetTally<T>(run:()=>T):{value:T;tally:BudgetTally}{
 const registry=globalThis as unknown as Record<symbol,BudgetTally|undefined>,had=Object.prototype.hasOwnProperty.call(registry,BUDGET_TALLY),previous=registry[BUDGET_TALLY],tally={components:0,triangles:0,draws:0};
 registry[BUDGET_TALLY]=tally;
 try{return{value:run(),tally};}
 finally{if(had)registry[BUDGET_TALLY]=previous;else delete registry[BUDGET_TALLY];}
}

/** Ordered sources share one capture budget. An accepted dedicated replacement
 * comes first, so the original hidden source cannot consume its draw allowance. */
export function planarReflectionGroup(sources:()=>readonly (PlanarReflectionSource|undefined)[],options:{labels?:readonly string[];requireAll?:boolean}={}):PlanarReflectionSource&{renderPlanarReflection(pass:PlanarReflectionPass):PlanarReflectionGroupResult;readonly reflectionBudgetStats:ReflectionBudgetStats} {
 const label=(index:number)=>options.labels?.[index]?`source[${index}/${options.labels[index].replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)}]`:`source[${index}]`;
 const demands=new Map<string,Set<PlanarReflectionSource>>();
 const publicationSources=new Set<PlanarReflectionSource>();
 let captures=0,lastPending=false,lastOmissions:ReflectionBudgetOmission[]=[];
 /** Nested group rows keep their own labels under this source; a resident
  * provider reports its planner tally; an all-or-nothing source (dedicated
  * mesh) that drew nothing because its declared cost exceeded the remaining
  * allowance counts as one whole omitted component. */
 function budgetOmissions(index:number,source:PlanarReflectionSource,result:PlanarReflectionGroupResult,tally:BudgetTally,remainingTriangles:number,remainingDraws:number):ReflectionBudgetOmission[]{
  if(Array.isArray(result.budgetOmissions)&&result.budgetOmissions.length)return result.budgetOmissions.flatMap(row=>row&&typeof row.source==='string'&&countValue(row.components)&&row.components>0&&countValue(row.triangles)&&countValue(row.draws)?[{source:`${label(index)}:${row.source.slice(0,256)}`,components:row.components,triangles:row.triangles,draws:row.draws}]:[]);
  if(tally.components>0)return[{source:label(index),components:tally.components,triangles:tally.triangles,draws:tally.draws}];
  if(result.complete||result.triangles!==0||result.draws!==0||!source.getPlanarReflectionCost)return[];
  const cost=source.getPlanarReflectionCost();
  return cost&&countValue(cost.triangles)&&countValue(cost.draws)&&cost.draws>0&&(cost.triangles>remainingTriangles||cost.draws>remainingDraws)?[{source:label(index),components:1,triangles:cost.triangles,draws:cost.draws}]:[];
 }
 return {
  setSolarShadowPublication(publication){
   const current=sources(),revisions=publication?current.map(source=>source?(source.getSolarShadowRevision?.()??source.getPlanarReflectionRevision()):null):undefined;
   // Compare the complete captured revision before forwarding any child proof.
   // Never relabel an old capture with a child's newly changed revision.
   const valid=!!publication&&publication.sourceRevision===JSON.stringify(revisions);
   if(!valid){
    for(const source of new Set([...publicationSources,...current]))source?.setSolarShadowPublication?.(undefined);
    publicationSources.clear();return;
   }
   for(const source of publicationSources)if(!valid||!current.includes(source))source.setSolarShadowPublication?.(undefined);
   publicationSources.clear();
   for(const [index,source]of current.entries())if(source?.setSolarShadowPublication){
    source.setSolarShadowPublication(Object.freeze({...publication!,sourceRevision:revisions![index]!}));
    if(valid)publicationSources.add(source);
   }
  },
  setPlanarReflectionState(state){for(const source of sources())source?.setPlanarReflectionState?.(state);},
  setPlanarReflectionProjection(projection){for(const source of sources())source?.setPlanarReflectionProjection?.(projection);},
  setCaptureDemand(change){
   const key=change.kind+'|'+change.token,previous=demands.get(key);
   if(!change.active){demands.delete(key);for(const source of previous??[])source.setCaptureDemand?.(change);return;}
   const current=new Set(sources().filter((source):source is PlanarReflectionSource=>!!source));
   demands.set(key,current);
   // Revisit current children: nested groups may have installed a provider
   // since the previous pending preparation visit.
   for(const source of current)source.setCaptureDemand?.(change);
   for(const source of previous??[])if(!current.has(source))source.setCaptureDemand?.({...change,active:false});
  },
  preparePlanarReflection(pass,budget=createSolarShadowPreparationBudget()){
   let ready=0,pending=0,failed=0,budgetWaiting=0,plannedTriangles=0,plannedDraws=0;
   for(const [index,source]of sources().entries()){
    if(!source){if(options.requireAll)pending++;continue;}
    const remainingTriangles=Math.max(0,pass.maxTriangles-plannedTriangles),remainingDraws=Math.max(0,pass.maxDraws-plannedDraws);
    const result=source.preparePlanarReflection?.({...pass,maxTriangles:remainingTriangles,maxDraws:remainingDraws},budget);
    // Already-resident dedicated sources have a single all-or-nothing draw.
    // Reserve its existing cost before preparing later providers in the tree.
    const cost=result?{triangles:result.plannedTriangles,draws:result.plannedDraws}:source.getPlanarReflectionCost?.();
    if(cost){
     if(!Number.isSafeInteger(cost.triangles)||cost.triangles<0||!Number.isSafeInteger(cost.draws)||cost.draws<0)throw Error(`${label(index)}:Invalid reflection preparation cost`);
     if(result&&(cost.triangles>remainingTriangles||cost.draws>remainingDraws))throw Error(`${label(index)}:Reflection preparation exceeded its capture budget`);
     if(cost.triangles<=remainingTriangles&&cost.draws<=remainingDraws){plannedTriangles+=cost.triangles;plannedDraws+=cost.draws;}
    }
    if(result){ready+=result.ready;pending+=result.pending;failed+=result.failed;budgetWaiting+=heldWaits(result);}
   }
   return{...solarShadowPreparation(ready,pending,failed,budgetWaiting),plannedTriangles,plannedDraws};
  },
  prepareSolarShadow(budget=createSolarShadowPreparationBudget()){
   let ready=0,pending=0,failed=0,budgetWaiting=0;
   let pendingReason:string|undefined,failedReason:string|undefined;
   for(const [index,source] of sources().entries()){
    if(!source&&options.requireAll){pending++;continue;}
    const result=source?.prepareSolarShadow?.(budget);
    if(!result)continue;
    ready+=result.ready;pending+=result.pending;failed+=result.failed;budgetWaiting+=heldWaits(result);
    if(result.reason){
     if(result.status==='pending')pendingReason??=label(index)+':'+result.reason;
     if(result.status==='failed')failedReason??=label(index)+':'+result.reason;
    }
   }
   const summary=solarShadowPreparation(ready,pending,failed,budgetWaiting);
   const reason=failed?failedReason:pendingReason;
   if(reason)summary.reason=reason.slice(0,512);
   return summary;
  },
  getSolarShadowRevision(){return JSON.stringify(sources().map(source=>source?(source.getSolarShadowRevision?.()??source.getPlanarReflectionRevision()):null));},
  getSolarShadowCoverage(){
   const bounds:[number,number,number,number,number,number]=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];let triangles=0,draws=0,complete=true,any=false;const reasons:string[]=[];
   for(const [index,source] of sources().entries()){const reason=(value:string)=>{if(reasons.length<8)reasons.push(`${label(index)}:${value.slice(0,512)}`);};if(!source){if(options.requireAll){complete=false;reason('provider-not-created');}continue;}if(!source.getSolarShadowCoverage){complete=false;reason('coverage-unavailable');continue;}const value=source.getSolarShadowCoverage();if(!value)continue;any=true;
    if(value.bounds.length!==6||!value.bounds.every(Number.isFinite)||value.bounds.some((n,i)=>i<3&&n>value.bounds[i+3])||!Number.isSafeInteger(value.triangles)||value.triangles<0||!Number.isSafeInteger(value.draws)||value.draws<0){complete=false;reason('invalid-bounds-or-cost');continue;}
    for(let i=0;i<3;i++){bounds[i]=Math.min(bounds[i],value.bounds[i]);bounds[i+3]=Math.max(bounds[i+3],value.bounds[i+3]);}triangles+=value.triangles;draws+=value.draws;complete&&=value.complete;if(!value.complete)reason(value.reason??'source-incomplete');
   }
   if(!any&&complete)return;return {bounds:bounds.every(Number.isFinite)?bounds:[0,0,0,0,0,0],triangles,draws,complete:complete&&Number.isSafeInteger(triangles)&&Number.isSafeInteger(draws),...(reasons.length?{reason:reasons.join(';')}:!Number.isSafeInteger(triangles)||!Number.isSafeInteger(draws)?{reason:'invalid-total-cost'}:{})} as SolarShadowCoverage;
  },
  getPlanarReflectionRevision(){return JSON.stringify(sources().map(source=>source?.getPlanarReflectionRevision()??null));},
  renderPlanarReflection(pass:PlanarReflectionPass):PlanarReflectionGroupResult {
   let triangles=0,draws=0,complete=true,pending=false;const reasons:string[]=[];
   // Omission accounting observes planar reflection captures only. It never
   // changes a provider's allowance, selection, result or the reason text.
   const accounting=pass.purpose!=='solar-depth',omissions:ReflectionBudgetOmission[]=[];
   for(const [index,source] of sources().entries()){
    if(!source){if(options.requireAll){complete=false;pending=true;if(reasons.length<8)reasons.push(`${label(index)}:provider-not-created`);break;}continue;}
    const remainingTriangles=Math.max(0,pass.maxTriangles-triangles),remainingDraws=Math.max(0,pass.maxDraws-draws);
    let result:PlanarReflectionGroupResult,tally:BudgetTally|undefined;
    const render=()=>source.renderPlanarReflection({...pass,maxTriangles:remainingTriangles,maxDraws:remainingDraws});
    try{if(accounting)({value:result,tally}=withBudgetTally(render));else result=render();}
    catch(error){throw Error(`${label(index)}:capture-exception:${String(error).slice(0,768)}`);}
    if(!Number.isSafeInteger(result.triangles)||result.triangles<0||result.triangles>remainingTriangles||!Number.isSafeInteger(result.draws)||result.draws<0||result.draws>remainingDraws)throw Error(`${label(index)}:Resident reflection exceeded its capture budget: returned ${result.triangles}/${result.draws}, allowed ${remainingTriangles}/${remainingDraws}`);
    triangles+=result.triangles;draws+=result.draws;complete&&=result.complete;
    if(!result.complete&&reasons.length<8)reasons.push(`${label(index)}:${typeof result.reason==='string'?result.reason.slice(0,768):'capture-incomplete'}`);
    if(tally)for(const row of budgetOmissions(index,source,result,tally,remainingTriangles,remainingDraws))if(omissions.length<MAX_BUDGET_OMISSION_ROWS)omissions.push(row);
    // Preparation reserved this provider's full selected cost. Missing draws
    // cannot give later providers a larger, unprepared allowance.
    if(!result.complete&&result.pending){pending=true;break;}
   }
   if(accounting){captures++;lastPending=pending;lastOmissions=omissions;}
   return{triangles,draws,complete,...(reasons.length?{reason:reasons.join(';').slice(0,1024)}:{}),...(pending?{pending:true}:{}),...(omissions.length?{budgetOmissions:omissions.map(row=>({...row}))}:{})};
  },
  get reflectionBudgetStats(){return{captures,pending:lastPending,omissions:lastOmissions.map(row=>({...row}))};},
 };
}
