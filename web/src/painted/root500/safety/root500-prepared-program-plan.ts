import {utf8ByteLength} from '../../../safety/utf8-byte-length';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {createPreparedSourceWorkspace} from '../../../safety/prepared-source';
import type {PreparedSourceOwner,PreparedSourceRecipe} from '../../../safety/prepared-source-contract';
import type {ProgramSourceAuthority} from '../../../safety/render-runtime/program-preparation';
import type {ResourceBudget,ResourceBudgetReservation} from '../../../safety/render-runtime/resource-budget';
import type {ShaderSourceBounds} from '../../../safety/render-runtime/shader-source-budget';
import {ROOT500_FACADE_PROGRAM_SOURCE_AUTHORITY,paintProgramPartitionEnabled,paintProgramFragment,facadePaintFragmentForCity,facadePaintSpecializationForCity,describeFacadePaintSource,describeFacadePaintSourceBounds,clearRoot500PaintSources,prepareRoot500ProgramData} from './facade-paint-fragment';

export type Root500PreparedProgramPlanOptions={identity:string;scope:FrozenDataScope;city:string;budget?:ResourceBudget};
export type Root500PreparedProgramSpecialization=ReturnType<typeof facadePaintSpecializationForCity>;
export interface Root500PreparedProgramPlan extends PreparedSourceOwner {
 readonly sourceWorkingSetBytes:number;
 readonly programSourceInputs:readonly string[];
 readonly programSourceProvenance:readonly ProgramSourceAuthority[];
 readonly identity:string;
 readonly scope:FrozenDataScope;
 readonly city:string;
 readonly legacy:boolean;
 readonly repairReady:boolean;
 readonly specialization:Root500PreparedProgramSpecialization|undefined;
 /** Query lightweight metadata without constructing a facade source. */
 prepareMetadata():void;
 /** Preserve the strict repair check in the original admitted candidate phase. */
 prepareRepair(prepare:()=>boolean):void;
 /** Once CPU packing has established every resident material recipe. The
  * caller waits in the same candidate deadline before geometry/colour compile. */
 preparePrograms(sourceKeys:readonly string[],signal:AbortSignal):Promise<void>;
 /** Raw selected paint recipe only; the renderer adds its actual assembly
  * descriptor before asking programBudget or preparing a source. */
 describeSourceBounds(sourceKey:string):ShaderSourceBounds;
 describeAssemblyBounds(sourceKey:string,helper:string,prune:boolean,build:(raw:ShaderSourceBounds)=>ShaderSourceBounds):ShaderSourceBounds;
}

const PREPARED_SOURCE_AUTHORITY:ProgramSourceAuthority=Object.freeze({
 kind:'immutable-program-source',
 inputs:Object.freeze(['root500-prepared-source-abi-v1']),
 builders:Object.freeze([createPreparedSourceWorkspace]),
});
const PROGRAM_SOURCE_PROVENANCE:readonly ProgramSourceAuthority[]=Object.freeze([ROOT500_FACADE_PROGRAM_SOURCE_AUTHORITY,PREPARED_SOURCE_AUTHORITY]);

/** Source ownership only; batch scope pins remain with the renderer and manager. */
export function createRoot500PreparedProgramPlan(options:Root500PreparedProgramPlanOptions):Root500PreparedProgramPlan{
 const identity=options.identity,city=options.city;
 let programSourceInputs:readonly string[]|undefined;
 let scope:FrozenDataScope|undefined=options.scope,released=false,metadataPrepared=false,repairPrepared=false,legacy=false,repairReady=false,specialization:Root500PreparedProgramSpecialization|undefined;
 const current=()=>!released&&!!scope&&!scope.stats.disposed;
 function active(){const value=scope;if(released||!value||value.stats.disposed)throw new DOMException('Root500 prepared program plan was released','AbortError');return value;}
 function prepareMetadata(){
  const value=active();if(metadataPrepared)return;
  const nextLegacy=paintProgramPartitionEnabled(city,value),nextSpecialization=facadePaintSpecializationForCity(city,value);
  active();legacy=nextLegacy;specialization=nextSpecialization;metadataPrepared=true;
 }
 function prepareRepair(prepare:()=>boolean){
  const value=active();if(repairPrepared)return;
  try{const ready=city==='berlin'&&prepare();active();repairReady=ready;repairPrepared=true;}
  finally{clearAssembly();clearBound();clearRoot500PaintSources(value);}
 }
 async function preparePrograms(sourceKeys:readonly string[],signal:AbortSignal){
  const value=active();if(!metadataPrepared)throw Error('Root500 program metadata was not prepared');
  clearAssembly();clearBound();
  try{await prepareRoot500ProgramData(sourceKeys,city,signal,value);active();signal.throwIfAborted();}
  finally{clearAssembly();clearBound();}
 }
 let sourceWorkingSetBytes=0;
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
 function describeSourceBounds(sourceKey:string){
  const value=active();if(!metadataPrepared)throw Error('Root500 program metadata was not prepared');const key=legacy?sourceKey:undefined;
  if(lastBound&&lastBound.key===key)return lastBound.value;
  clearBound();const description=describeFacadePaintSourceBounds(city,key,value);active();
  const claim=options.budget?.tryReserve({category:'metadata',bytes:128+boundMetadataBytes(key)+boundMetadataBytes(description),precision:'estimate',label:'root500 single source-bound descriptor'},{evict:false});
  if(claim?.ok)lastBound={key,value:description,reservation:claim.reservation};
  return description;
 }
 // The Root500 colour assembly is immutable within a plan. Family selection
 // affects later specialization, not this envelope. Retain only its last
 // source/helper/pruning descriptor; never retain the assembly closure/text.
 let lastAssembly:{sourceKey:string;helper:string;prune:boolean;value:ShaderSourceBounds;reservation:ResourceBudgetReservation}|undefined;
 function clearAssembly(){const held=lastAssembly;lastAssembly=undefined;held?.reservation.release();}
 function describeAssemblyBounds(sourceKey:string,helper:string,prune:boolean,build:(raw:ShaderSourceBounds)=>ShaderSourceBounds){
  active();
  if(lastAssembly&&lastAssembly.sourceKey===sourceKey&&lastAssembly.helper===helper&&lastAssembly.prune===prune)return lastAssembly.value;
  clearAssembly();const description=build(describeSourceBounds(sourceKey));active();
  const claim=options.budget?.tryReserve({category:'metadata',bytes:160+boundMetadataBytes(sourceKey)+boundMetadataBytes(helper)+boundMetadataBytes(description),precision:'estimate',label:'root500 single assembly-bound descriptor'},{evict:false});
  if(claim?.ok)lastAssembly={sourceKey,helper,prune,value:description,reservation:claim.reservation};
  return description;
 }
 const workspace=createPreparedSourceWorkspace({
  metadataHintSafe:true,
  current,
  budget:options.budget,
  bounds(recipe){
   const raw=describeSourceBounds(recipe.sourceKey),complete=recipe.sourceBounds;
   if(!complete)throw Error('Root500 prepared source requires its actual assembly bound');
   if(complete.paintSourceCharactersUpperBound<raw.paintSourceCharactersUpperBound)throw RangeError('Root500 assembly bound omits selected paint input');
   return complete;
  },
  build(recipe:PreparedSourceRecipe){
   const value=active();if(!metadataPrepared)throw Error('Root500 program metadata was not prepared');
   const source=legacy?paintProgramFragment(recipe.sourceKey,city,value):facadePaintFragmentForCity(city,value);
   specialization=describeFacadePaintSource(city,source,legacy?'partition':'city',value);return source;
  },
  clear(){if(scope)clearRoot500PaintSources(scope);},
 });
 return{
  identity,city,get scope(){return active();},get legacy(){return legacy;},get repairReady(){return repairReady;},get specialization(){return specialization;},
  get programSourceInputs(){prepareMetadata();active();return programSourceInputs??(programSourceInputs=Object.freeze(['city',city,'partition',String(legacy)]));},
  get programSourceProvenance(){active();return PROGRAM_SOURCE_PROVENANCE;},
  prepareMetadata,prepareRepair,preparePrograms,describeSourceBounds,describeAssemblyBounds,
  programBudget(recipe,vertexSource,attributes,families=[]){return workspace.programBudget(recipe,vertexSource,attributes,families);},
  prepareSource(recipe,families){let measured:number|undefined;try{const result=workspace.prepareSource({...recipe,assemble(paint){const source=recipe.assemble(paint);measured=utf8ByteLength(source);return source;}},families);if(measured!==undefined)sourceWorkingSetBytes=measured;return result;}catch(error){if(!workspace.preparedSourceStats.sourceCharacters)sourceWorkingSetBytes=0;throw error;}},
  clearPreparedSource(){workspace.clearPreparedSource();},
  get sourceWorkingSetBytes(){return workspace.preparedSourceStats.sourceCharacters?sourceWorkingSetBytes:0;},
  get preparedSourceStats(){return workspace.preparedSourceStats;},
  release(){if(released)return;released=true;try{workspace.release();}finally{clearAssembly();clearBound();scope=undefined;programSourceInputs=undefined;metadataPrepared=false;repairPrepared=false;legacy=false;repairReady=false;specialization=undefined;}},
 };
}
