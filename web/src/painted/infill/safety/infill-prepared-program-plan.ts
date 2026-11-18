import {utf8ByteLength} from '../../../safety/utf8-byte-length';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {createPreparedSourceWorkspace} from '../../../safety/prepared-source';
import type {PreparedSourceOwner,PreparedSourceRecipe} from '../../../safety/prepared-source-contract';
import type {ProgramSourceAuthority} from '../../../safety/render-runtime/program-preparation';
import type {ResourceBudget,ResourceBudgetReservation} from '../../../safety/render-runtime/resource-budget';
import type {ShaderSourceBounds} from '../../../safety/render-runtime/shader-source-budget';
import {INFILL_FACADE_PROGRAM_SOURCE_AUTHORITY,paintProgramPartitionEnabled,paintProgramFragment,facadePaintFragmentForCity,facadePaintSpecializationForCity,describeFacadePaintSource,describeFacadePaintSourceBounds,clearInfillPaintSources} from './facade-paint-fragment';

export type InfillPreparedProgramPlanOptions={id:number;scope:FrozenDataScope;city:string;budget?:ResourceBudget};
export type InfillPreparedProgramSpecialization=ReturnType<typeof facadePaintSpecializationForCity>;
export interface InfillPreparedProgramPlan extends PreparedSourceOwner {
 readonly sourceWorkingSetBytes:number;
 readonly programSourceInputs:readonly string[];
 readonly programSourceProvenance:readonly ProgramSourceAuthority[];
 readonly id:number;
 readonly scope:FrozenDataScope;
 readonly legacy:boolean;
 readonly specialization:InfillPreparedProgramSpecialization|undefined;
 readonly baseFragmentCharacters:number;
 prepareMetadata():void;
 describeSourceBounds(sourceKey:string):ShaderSourceBounds;
 describeAssemblyBounds(sourceKey:string,helper:string,prune:boolean,build:(raw:ShaderSourceBounds)=>ShaderSourceBounds):ShaderSourceBounds;
}

const PREPARED_SOURCE_AUTHORITY:ProgramSourceAuthority=Object.freeze({
 kind:'immutable-program-source',
 inputs:Object.freeze(['infill-prepared-source-abi-v1']),
 builders:Object.freeze([createPreparedSourceWorkspace]),
});
const PROGRAM_SOURCE_PROVENANCE:readonly ProgramSourceAuthority[]=Object.freeze([INFILL_FACADE_PROGRAM_SOURCE_AUTHORITY,PREPARED_SOURCE_AUTHORITY]);

/** Partition selection and metadata are light; generated source stays admitted. */
export function createInfillPreparedProgramPlan(options:InfillPreparedProgramPlanOptions):InfillPreparedProgramPlan{
 const id=options.id,city=options.city;
 let programSourceInputs:readonly string[]|undefined;
 let scope:FrozenDataScope|undefined=options.scope,released=false,metadataPrepared=false,legacy=paintProgramPartitionEnabled(city,scope),specialization:InfillPreparedProgramSpecialization|undefined,baseFragmentCharacters=0;
 const current=()=>!released&&!!scope&&!scope.stats.disposed;
 function active(){const value=scope;if(released||!value||value.stats.disposed)throw new DOMException('Infill prepared program plan was released','AbortError');return value;}
 function prepareMetadata(){
  const value=active();if(metadataPrepared)return;
  const next=facadePaintSpecializationForCity(city,value);active();specialization=next;metadataPrepared=true;
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
  const value=active(),key=legacy?sourceKey:undefined;
  if(lastBound&&lastBound.key===key)return lastBound.value;
  clearBound();const description=describeFacadePaintSourceBounds(city,key,value);active();
  const claim=options.budget?.tryReserve({category:'metadata',bytes:128+boundMetadataBytes(key)+boundMetadataBytes(description),precision:'estimate',label:'infill single source-bound descriptor'},{evict:false});
  if(claim?.ok)lastBound={key,value:description,reservation:claim.reservation};
  return description;
 }
 // The Infill colour assembly is immutable within a plan. Family selection
 // affects later specialization, not this envelope. Retain only its last
 // source/helper/pruning descriptor; never retain the assembly closure/text.
 let lastAssembly:{sourceKey:string;helper:string;prune:boolean;value:ShaderSourceBounds;reservation:ResourceBudgetReservation}|undefined;
 function clearAssembly(){const held=lastAssembly;lastAssembly=undefined;held?.reservation.release();}
 function describeAssemblyBounds(sourceKey:string,helper:string,prune:boolean,build:(raw:ShaderSourceBounds)=>ShaderSourceBounds){
  active();
  if(lastAssembly&&lastAssembly.sourceKey===sourceKey&&lastAssembly.helper===helper&&lastAssembly.prune===prune)return lastAssembly.value;
  clearAssembly();const description=build(describeSourceBounds(sourceKey));active();
  const claim=options.budget?.tryReserve({category:'metadata',bytes:160+boundMetadataBytes(sourceKey)+boundMetadataBytes(helper)+boundMetadataBytes(description),precision:'estimate',label:'infill single assembly-bound descriptor'},{evict:false});
  if(claim?.ok)lastAssembly={sourceKey,helper,prune,value:description,reservation:claim.reservation};
  return description;
 }
 const workspace=createPreparedSourceWorkspace({
  metadataHintSafe:true,
  current,
  budget:options.budget,
  bounds(recipe){
   const raw=describeSourceBounds(recipe.sourceKey),complete=recipe.sourceBounds;
   if(!complete)throw Error('Infill prepared source requires its actual assembly bound');
   if(complete.paintSourceCharactersUpperBound<raw.paintSourceCharactersUpperBound)throw RangeError('Infill assembly bound omits selected paint input');
   return complete;
  },
  build(recipe:PreparedSourceRecipe){
   const value=active(),paintSource=legacy?paintProgramFragment(recipe.sourceKey,city,value):facadePaintFragmentForCity(city,value);
   prepareMetadata();active();specialization=describeFacadePaintSource(city,paintSource,legacy?'partition':'city',value);if(recipe.sourceKey==='base')baseFragmentCharacters=paintSource.length;
   return paintSource;
  },
  clear(){if(scope)clearInfillPaintSources(scope);},
 });
 return{
  id,get scope(){return active();},get legacy(){return legacy;},get specialization(){return specialization;},get baseFragmentCharacters(){return baseFragmentCharacters;},
  get programSourceInputs(){active();return programSourceInputs??(programSourceInputs=Object.freeze(['city',city,'partition',String(legacy)]));},
  get programSourceProvenance(){active();return PROGRAM_SOURCE_PROVENANCE;},
  prepareMetadata,describeSourceBounds,describeAssemblyBounds,
  programBudget(recipe,vertexSource,attributes,families=[]){return workspace.programBudget(recipe,vertexSource,attributes,families);},
  prepareSource(recipe,families){let measured:number|undefined;try{const result=workspace.prepareSource({...recipe,assemble(paint){const source=recipe.assemble(paint);measured=utf8ByteLength(source);return source;}},families);if(measured!==undefined)sourceWorkingSetBytes=measured;return result;}catch(error){if(!workspace.preparedSourceStats.sourceCharacters)sourceWorkingSetBytes=0;throw error;}},
  clearPreparedSource(){workspace.clearPreparedSource();},
  get sourceWorkingSetBytes(){return workspace.preparedSourceStats.sourceCharacters?sourceWorkingSetBytes:0;},
  get preparedSourceStats(){return workspace.preparedSourceStats;},
  release(){if(released)return;released=true;try{workspace.release();}finally{clearAssembly();clearBound();scope=undefined;programSourceInputs=undefined;metadataPrepared=false;legacy=false;specialization=undefined;baseFragmentCharacters=0;}},
 };
}
