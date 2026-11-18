import {utf8ByteLength} from '../../../safety/utf8-byte-length';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {createPreparedSourceWorkspace} from '../../../safety/prepared-source';
import type {PreparedSourceOwner,PreparedSourceRecipe} from '../../../safety/prepared-source-contract';
import type {ProgramPreparationBudget,ProgramSourceAuthority} from '../../../safety/render-runtime/program-preparation';
import type {ResourceBudget} from '../../../safety/render-runtime/resource-budget';
import type {ShaderSourceBounds} from '../../../safety/render-runtime/shader-source-budget';
import {BREMEN_FACADE_PROGRAM_SOURCE_AUTHORITY,paintProgramPartitionEnabled,paintProgramFragment,facadePaintFragmentForCity,facadePaintSpecializationForCity,describeFacadePaintSource,describeFacadePaintSourceBounds,clearBremenPreparedProgramSources} from './facade-paint-fragment';

export type BremenPreparedProgramPlanOptions={
 scope:FrozenDataScope;
 city:string;
 generation:number;
 revision:number;
 /** Lightweight identity tokens only; no generated shader text or model copy. */
 profileInputs:readonly unknown[];
 sourceInputs:readonly unknown[];
 materialInputs:readonly unknown[];
 /** Runtime callers supply the page store's ledger; omitted legacy calls are unmetered. */
 budget?:ResourceBudget;
};
export type BremenPreparedProgramSpecialization=Readonly<ReturnType<typeof facadePaintSpecializationForCity>>;
export interface BremenPreparedProgramPlan extends PreparedSourceOwner {
 readonly sourceWorkingSetBytes:number;
 readonly identity:string;
 readonly inputs:readonly string[];
 /** Stable source content metadata; batch lifetime stays in identity/inputs. */
 readonly programSourceInputs:readonly string[];
 readonly programSourceProvenance:readonly ProgramSourceAuthority[];
 readonly partitionEnabled:boolean;
 readonly specialization:BremenPreparedProgramSpecialization|undefined;
 /** UTF-16 characters in the most recently emitted fragment, not bytes. */
 readonly sourceCharacters:number;
 readonly sourcesBuilt:number;
 readonly released:boolean;
 /** Raw selected paint bound. The caller's full shell must also be described. */
 describeSourceBounds(sourceKey?:string):ShaderSourceBounds;
 programBudget(recipe:PreparedSourceRecipe,vertexSource:string,attributes:readonly string[],families?:readonly number[]):ProgramPreparationBudget;
 fragment(sourceKey?:string):string;
 /** The renderer cancels its program demands first; scope pins stay external. */
 release():void;
}

const PREPARED_SOURCE_AUTHORITY:ProgramSourceAuthority=Object.freeze({
 kind:'immutable-program-source',
 inputs:Object.freeze(['bremen-prepared-source-abi-v1']),
 builders:Object.freeze([createPreparedSourceWorkspace]),
});
const PROGRAM_SOURCE_PROVENANCE:readonly ProgramSourceAuthority[]=Object.freeze([BREMEN_FACADE_PROGRAM_SOURCE_AUTHORITY,PREPARED_SOURCE_AUTHORITY]);

const objectTokens=new WeakMap<object,number>();
let nextObjectToken=0,nextPlan=0;
function objectToken(value:object){let id=objectTokens.get(value);if(id===undefined){id=++nextObjectToken;objectTokens.set(value,id);}return'object:'+id;}
function encodeInputs(options:BremenPreparedProgramPlanOptions,identity:string):readonly string[]{
 const symbols=new Map<symbol,number>();
 const token=(value:unknown):string=>{
  if(value===null)return'null';
  if(typeof value==='object'||typeof value==='function')return objectToken(value);
  if(typeof value==='symbol'){let id=symbols.get(value);if(id===undefined){id=symbols.size;symbols.set(value,id);}return'symbol:'+id;}
  if(typeof value==='number')return'number:'+(Object.is(value,-0)?'-0':String(value));
  return typeof value+':'+String(value);
 };
 return Object.freeze([identity,'scope',objectToken(options.scope),'city',options.city,'generation',token(options.generation),'revision',token(options.revision),
  'profile',String(options.profileInputs.length),...options.profileInputs.map(token),
  'source',String(options.sourceInputs.length),...options.sourceInputs.map(token),
  'material',String(options.materialInputs.length),...options.materialInputs.map(token)]);
}

/** A batch's deferred source demand. Frozen data preparation and pins belong to
 * the caller. Full sources are emitted only inside programPreparation.build. */
export function createBremenPreparedProgramPlan(options:BremenPreparedProgramPlanOptions):BremenPreparedProgramPlan {
 const identity='bremen-program-plan:'+ ++nextPlan;
 return createPlan(options.scope,options.city,identity,encodeInputs(options,identity),options.budget);
}
function createPlan(scope:FrozenDataScope|undefined,city:string,identity:string,inputs:readonly string[],budget:ResourceBudget|undefined):BremenPreparedProgramPlan {
 let programSourceInputs:readonly string[]|undefined;
 let partition:boolean|undefined,specialization:BremenPreparedProgramSpecialization|undefined,sourceCharacters=0,sourcesBuilt=0,released=false,usedFacade=false;
 const active=()=>{if(released||!scope||scope.stats.disposed)throw new DOMException('Bremen prepared program plan was released','AbortError');return scope;};
 const enabled=()=>{const current=active();usedFacade=true;return partition??(partition=paintProgramPartitionEnabled(city,current));};
 const clearScratch=()=>{if(scope&&usedFacade)clearBremenPreparedProgramSources(scope);};
 function readFragment(sourceKey='base'){
  const current=active(),fragment=enabled()?paintProgramFragment(sourceKey,city,current):facadePaintFragmentForCity(city,current);
  // Observe only this requested source. Unbuilt city/full source sizes remain
  // unknown; scalar metadata never assembles another recipe for measurement.
  specialization=Object.freeze({...describeFacadePaintSource(city,fragment,enabled()?'partition':'city',current)});
  sourceCharacters=fragment.length;sourcesBuilt++;return fragment;
 }
 let sourceWorkingSetBytes=0;
 const workspace=createPreparedSourceWorkspace({
  metadataHintSafe:true,
  budget,
  current:()=>!released&&!!scope&&!scope.stats.disposed,
  // The workspace assembles this raw source exactly once on a recipe miss.
  build:(recipe:PreparedSourceRecipe)=>readFragment(recipe.sourceKey),
  clear:clearScratch,
 });
 return{
  identity,
  get inputs(){return inputs;},
  get programSourceInputs(){const partitionEnabled=enabled();return programSourceInputs??(programSourceInputs=Object.freeze(['city',city,'partition',String(partitionEnabled)]));},
  get programSourceProvenance(){active();return PROGRAM_SOURCE_PROVENANCE;},
  get partitionEnabled(){return enabled();},
  get specialization(){return specialization;},
  get sourceCharacters(){return sourceCharacters;},
  get sourcesBuilt(){return sourcesBuilt;},
  get released(){return released;},
  describeSourceBounds(sourceKey='base'){return describeFacadePaintSourceBounds(city,enabled()?sourceKey:undefined,active());},
  programBudget(recipe,vertexSource,attributes,families=[]){return workspace.programBudget(recipe,vertexSource,attributes,families);},
  prepareSource(recipe,families){let measured:number|undefined;try{const result=workspace.prepareSource({...recipe,assemble(paint){const source=recipe.assemble(paint);measured=utf8ByteLength(source);return source;}},families);if(measured!==undefined)sourceWorkingSetBytes=measured;return result;}catch(error){if(!workspace.preparedSourceStats.sourceCharacters)sourceWorkingSetBytes=0;throw error;}},
  clearPreparedSource:()=>workspace.clearPreparedSource(),
  get sourceWorkingSetBytes(){return workspace.preparedSourceStats.sourceCharacters?sourceWorkingSetBytes:0;},
  get preparedSourceStats(){return workspace.preparedSourceStats;},
  fragment(sourceKey='base'){
   const current=active();
   const bounds=budget?describeFacadePaintSourceBounds(city,enabled()?sourceKey:undefined,current):undefined;
   const reservation=bounds?budget!.reserve({category:'program-source',bytes:bounds.assemblyCharactersUpperBound*2,precision:'estimate',identity:{},label:'Bremen direct raw-source assembly'}):undefined;
   try{return readFragment(sourceKey);}finally{try{clearBremenPreparedProgramSources(current);}finally{reservation?.release();}}
  },
  release(){
   if(released)return;
   try{workspace.release();}finally{
    released=true;scope=undefined;budget=undefined;city='';inputs=[];programSourceInputs=undefined;partition=undefined;specialization=undefined;sourceCharacters=0;sourcesBuilt=0;usedFacade=false;
   }
  },
 };
}
