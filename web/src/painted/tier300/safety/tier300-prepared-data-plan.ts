import type {RendererChunkInput} from '../../../safety/renderer-chunk-input';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {PreparedSourceOwner,PreparedSourceRecipe} from '../../../safety/prepared-source-contract';
import {createPreparedSourceWorkspace} from '../../../safety/prepared-source';
import type {ResourceBudget,ResourceBudgetReservation} from '../../../safety/render-runtime/resource-budget';
import type {ShaderSourceBounds} from '../../../safety/render-runtime/shader-source-budget';
import type {ProgramPreparationBudget} from '../../../safety/render-runtime/program-preparation';
import {specializeCurrentPaintProgram} from '../../delegated500/safety/current-paint-program';
import {utf8ByteLength} from '../../../safety/utf8-byte-length';
import type {BuildingComponent} from './building-mesh-renderer';
import {S434_COHORT} from './s434-cohort-constants';
import {S020_RELATION_OUTLINE_PROFILES} from './s020-relation-outline-profile';
import {partialGateAdmissionDemand} from './source-partial-gate-display';
import {PROGRESSIVE_ADMISSIONS_RESOURCE} from './progressive-paint-admissions';
import {PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE,PROGRESSIVE_CITY_SOURCE_FULL_SHA} from './progressive-feature-cities';
import {PROGRESSIVE_FEATURE_SHA} from './progressive-feature-glsl';
import {facadePaintFragmentForCity,facadePaintSpecializationForCity,describeFacadePaintSource,describeFacadePaintSourceBounds,clearTier300PaintSources} from './facade-paint-fragment';

export type Tier300DataIdentity={city:string;objectId:string;partId:string};
/** Selection keys identify whole objects. The shared selected reader retains
 * every original row/part in source order; this never filters an admission row. */
export function tier300AdmissionKeys(components:readonly Tier300DataIdentity[],city:string):readonly string[]{
 const keys=new Set(components.map(c=>c.city+'|'+c.objectId)),same=(a:Tier300DataIdentity,b:{objectId:string;partId:string})=>a.objectId===b.objectId&&a.partId===b.partId;
 const add=(members:readonly {objectId:string;partId:string}[])=>{for(const m of members)keys.add(city+'|'+m.objectId);};
 if(city==='frankfurt'&&components.some(c=>S434_COHORT.members.some(m=>same(c,m))))add(S434_COHORT.members);
 for(const profile of S020_RELATION_OUTLINE_PROFILES){const members=[profile.outline,...profile.parts];if(city===profile.city&&components.some(c=>same(c,members[0])||members.slice(1).some(m=>same(c,m))))add(members);}
 for(const c of partialGateAdmissionDemand(components))keys.add(c.city+'|'+c.objectId);
 return [...keys];
}
/** One complete resident/shadow/cohort demand must precede any scope memo read.
 * Repeating the same or a subset of this selection uses the existing leases. */
export async function prepareTier300Data(components:readonly Tier300DataIdentity[],city:string,signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();if(!components.length)return;
 if(components.some(c=>c.city!==city))throw Error('Tier300 preparation city mismatch');
 await scope.prepareSelection(PROGRESSIVE_ADMISSIONS_RESOURCE,tier300AdmissionKeys(components,city),signal);signal.throwIfAborted();
 if(PROGRESSIVE_CITY_SOURCE_FULL_SHA===PROGRESSIVE_FEATURE_SHA)await scope.prepare([PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE],signal);signal.throwIfAborted();
}
export type Tier300PreparedBatches={input:readonly BuildingComponent[];scope:FrozenDataScope;programPlan:Tier300PreparedDataPlan;signal?:AbortSignal;chunkInput?:RendererChunkInput<BuildingComponent>;refreshChunkInput(input:RendererChunkInput<BuildingComponent>):void;releaseChunkDependencies():void};
export interface Tier300PreparedDataPlan extends PreparedSourceOwner{
 readonly id:number;
 readonly scope:FrozenDataScope;
 readonly legacy:false;
 readonly specialization:ReturnType<typeof facadePaintSpecializationForCity>|undefined;
 readonly baseFragmentCharacters:number;
 readonly materialSourceCharacters:number;
 readonly materialSourceBytes:number;
 readonly preparedSourceBytes:number;
 prepareMetadata():void;
 prepareMaterialSource():string;
 prepareFragment(recipe:PreparedSourceRecipe,family:number):string;
 describeSourceBounds(sourceKey?:string):ShaderSourceBounds;
 describeAssemblyBounds(helper:string,build:(raw:ShaderSourceBounds)=>ShaderSourceBounds):ShaderSourceBounds;
 programBudget(recipe:PreparedSourceRecipe,vertexSource:string,attributes:readonly string[],families?:readonly number[]):ProgramPreparationBudget;
}
let nextPlan=0;
export function createTier300PreparedDataPlan(options:{scope:FrozenDataScope;city:string;id?:number;budget?:ResourceBudget}):Tier300PreparedDataPlan{
 const city=options.city,id=options.id??++nextPlan;
 let budget=options.budget;
 let scope:FrozenDataScope|undefined=options.scope,released=false,specialization:ReturnType<typeof facadePaintSpecializationForCity>|undefined,baseFragmentCharacters=0,materialSource:string|undefined,materialSourceBytes=0,preparedSourceBytes=0;
 const current=()=>!released&&!!scope&&!scope.stats.disposed;
 function active(){if(!current())throw new DOMException('Tier300 prepared data plan was released','AbortError');return scope!;}
 function prepareMetadata(){const value=active();if(!specialization)specialization=facadePaintSpecializationForCity(city,value);}
 // One scalar descriptor per live plan, not generated shader text. Repeated
 // pending family requests use the same immutable scope/source description.
 // Optional retention is metered; a quiet refusal simply recomputes next time.
 let lastBound:{key:string|undefined;value:ShaderSourceBounds;reservation:ResourceBudgetReservation}|undefined;
 function clearBound(){const held=lastBound;lastBound=undefined;held?.reservation.release();}
 function boundMetadataBytes(value:unknown):number{
  if(typeof value==='string')return 32+2*value.length;
  if(Array.isArray(value))return 32+8*value.length+value.reduce((sum,item)=>sum+boundMetadataBytes(item),0);
  if(value&&typeof value==='object')return 32+Object.entries(value).reduce((sum,[key,item])=>sum+16+2*key.length+boundMetadataBytes(item),0);
  return 8;
 }
 function describeSourceBounds(){
  const value=active(),key=undefined;
  if(lastBound&&lastBound.key===key)return lastBound.value;
  clearBound();const description=describeFacadePaintSourceBounds(city,key,value);active();
  const claim=budget?.tryReserve({category:'metadata',bytes:128+boundMetadataBytes(key)+boundMetadataBytes(description),precision:'estimate',label:'tier300 single source-bound descriptor'},{evict:false});
  if(claim?.ok)lastBound={key,value:description,reservation:claim.reservation};
  return description;
 }
 // The Tier300 colour assembly is immutable within a plan. Family selection
 // affects later specialization, not this envelope. Retain only its last
 // helper descriptor; never retain the assembly closure/text.
 let lastAssembly:{helper:string;value:ShaderSourceBounds;reservation:ResourceBudgetReservation}|undefined;
 function clearAssembly(){const held=lastAssembly;lastAssembly=undefined;held?.reservation.release();}
 function describeAssemblyBounds(helper:string,build:(raw:ShaderSourceBounds)=>ShaderSourceBounds){
  active();
  if(lastAssembly&&lastAssembly.helper===helper)return lastAssembly.value;
  clearAssembly();const description=build(describeSourceBounds());active();
  const claim=budget?.tryReserve({category:'metadata',bytes:128+boundMetadataBytes(helper)+boundMetadataBytes(description),precision:'estimate',label:'tier300 single assembly-bound descriptor'},{evict:false});
  if(claim?.ok)lastAssembly={helper,value:description,reservation:claim.reservation};
  return description;
 }
 let workspaceBuild=false,materialReservation:ResourceBudgetReservation|undefined;
 function prepareMaterialSource(){
  const value=active();
  if(materialSource===undefined){
   if(budget&&!workspaceBuild){
    const bounds=describeSourceBounds();
    materialReservation=budget.reserve({category:'program-source',bytes:bounds.assemblyCharactersUpperBound*2,precision:'estimate',identity:{},label:'Tier direct paint-source assembly'});
   }
   try{materialSource=facadePaintFragmentForCity(city,value);baseFragmentCharacters=materialSource.length;const metadata=describeFacadePaintSource(city,materialSource,'city',value);materialSourceBytes=metadata.fragmentBytes;specialization=metadata;}
   catch(error){materialReservation?.release();materialReservation=undefined;throw error;}
  }
  return materialSource;
 }
 function clearScratch(){materialSource=undefined;materialSourceBytes=preparedSourceBytes=0;materialReservation?.release();materialReservation=undefined;if(scope)clearTier300PaintSources(scope);}
 const workspace=createPreparedSourceWorkspace({
  metadataHintSafe:true,
  budget,current,
  build(){workspaceBuild=true;try{return prepareMaterialSource();}finally{workspaceBuild=false;}},
  clear:clearScratch,
  // Retain the original current-family algorithm, including depth effects.
  specialize(source,families){return specializeCurrentPaintProgram(source,families.length===1?families[0]:families);},
 });
 function prepareSource(recipe:PreparedSourceRecipe,families:readonly number[]){
  if(!families.length)throw Error('Tier300 programs require at least one paint family');
  let measured:number|undefined;
  try{const result=workspace.prepareSource({...recipe,assemble(paint){const source=recipe.assemble(paint);measured=utf8ByteLength(source);return source;}},families);if(measured!==undefined)preparedSourceBytes=measured;return result;}
  catch(error){if(!workspace.preparedSourceStats.sourceCharacters)preparedSourceBytes=0;throw error;}
 }
 function clearPreparedSource(){workspace.clearPreparedSource();}
 function prepareFragment(recipe:PreparedSourceRecipe,family:number){return prepareSource(recipe,[family]).fragment;}
 return{id,get scope(){return active();},legacy:false,get specialization(){return specialization;},get baseFragmentCharacters(){return baseFragmentCharacters;},get materialSourceCharacters(){return materialSource?.length??0;},get materialSourceBytes(){return materialSourceBytes;},get preparedSourceBytes(){return preparedSourceBytes;},prepareMetadata,prepareMaterialSource,
  prepareFragment,prepareSource,clearPreparedSource,
  describeSourceBounds,describeAssemblyBounds,
  programBudget(recipe,vertexSource,attributes,families=[]){return workspace.programBudget(recipe,vertexSource,attributes,families);},
  get preparedSourceStats(){return workspace.preparedSourceStats;},
  release(){if(released)return;released=true;try{workspace.release();}finally{clearAssembly();clearBound();scope=undefined;budget=undefined;specialization=undefined;baseFragmentCharacters=0;}},
 };
}
