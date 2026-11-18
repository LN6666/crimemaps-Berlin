import {countShaderSourceSyntax,deferredShaderSourcePart,normalizeShaderSourceBounds,type ShaderSourceBounds,type ShaderSourcePart,type ShaderSourceSyntaxBounds} from '../../../safety/render-runtime/shader-source-budget';
import {ResourceBudgetExceededError,type ResourceBudget,type ResourceBudgetCost,type ResourceBudgetReservation} from '../../../safety/render-runtime/resource-budget';
import {createPreparedSourceWorkspace,type PreparedSourceWorkspace,type PreparedSourceWorkspaceOptions} from '../../../safety/prepared-source';
import {programAllowanceBytes} from '../../../safety/render-runtime/program-preparation';
import type {PreparedSourceStats} from '../../../safety/prepared-source-contract';
import {f358Fragment604,F358_TOKEN604} from './f358-repair604';
import {f358Rose612} from './f358-rose612';
import {f342FoyerFragment615} from './f342-foyer615';
import {f342GrottoFragment617} from './f342-grotto617';
import {f342CascadeFragment618} from './f342-cascade618';
import {f244Fragment619,F244_TOKEN619} from './f244-corners619';
import {f244Fragment622,F244_TOKEN622} from './f244-main622';
import {f244Fragment627} from './f244-level627';
import {f235Fragment631} from './f235-upper631';
import {f285Fragment634} from './f285-restoration634';
import {f269Fragment640} from './f269-low-roof640';
import {f004Fragment645} from './f004-detail645';
import {f020Fragment652} from './f020-tower652';
import {f020ChapelFragment654} from './f020-chapel654';
import {f020ButtressFragment655} from './f020-buttress655';
import {f020ApseFragment656} from './f020-apse656';
import {f020NaveFragment657} from './f020-nave657';
import {f020AnnexFragment658} from './f020-annex658';
import {f020TurretFragment659} from './f020-turret659';
import {f020StoneFragment660} from './f020-stone660';
import {f025FigureFragment663} from './f025-figure663';
import {f236PlatformsFragment681} from './f236-platforms681';
import {berlinDistantPaintFragment} from './berlin-distant-paint';
import {BE_PAUL_LOBE_GLSL} from './be-paul-lobe-glsl';

/** One deterministic string transformation in delegated500's source chain.
 * The actual wrapper is the only implementation of its insertion text. Budget
 * description runs it on its anchor probe only, never on a paint source.
 * cities is its explicit first-statement gate: every other city returns the
 * same input string without splitting or copying it. textCopies is the number
 * of full-length strings its body may allocate while it applies (split pieces,
 * slice/concatenation results and each replace output), each counted at most
 * the size of its output; a logical allowance, not a heap measurement. */
export type DelegatedPaintWrapper=Readonly<{name:string;cities:readonly string[];apply:(source:string,city:string)=>string;probes:readonly string[];textCopies:number}>;
/** '*' marks a transform whose implementation ignores the city argument. */
export const delegatedWrapperApplies=(row:DelegatedPaintWrapper,city:string)=>row.cities.includes('*')||row.cities.includes(city);
const wrapper=(name:string,cities:readonly string[],apply:(source:string,city:string)=>string,probes:readonly string[],textCopies:number):DelegatedPaintWrapper=>Object.freeze({name,cities:Object.freeze([...cities]),apply,probes:Object.freeze([...probes]),textCopies});
// Anchors are the GLSL contracts each wrapper already requires exactly once.
const F020_ANCHOR='vec3 f020WholeNative321(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';
const F244_ANCHOR='vec3 f244BodelschwinghFull500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';
/** Application order equals the original innermost-first nested expression. */
export const DELEGATED_MATERIAL_SOURCE_WRAPPERS:readonly DelegatedPaintWrapper[]=Object.freeze([
 wrapper('f358Fragment604',['hannover'],f358Fragment604,['vec3 f358Details564(float role=frame.z;return c;}'],5),
 wrapper('f358Rose612',['hannover'],f358Rose612,[F358_TOKEN604+'return mix(vec3(.45,.22,.14),vec3(.66,.63,.53),edge);vec2(19.156313,16.300000)vec2(11.745687,16.300000)'],6),
 wrapper('f342FoyerFragment615',['hannover'],f342FoyerFragment615,['if(edge>98.){if(role<1.5)return vec3(.29,.32,.32);return vec3(.38,.40,.39);}'],2),
 wrapper('f342GrottoFragment617',['hannover'],f342GrottoFragment617,['vec2 q=frame.xy;\n if(role>3.5)'],2),
 wrapper('f342CascadeFragment618',['hannover'],f342CascadeFragment618,['if(role>4.5){'],2),
 wrapper('f244Fragment619',['dortmund'],f244Fragment619,[F244_ANCHOR],2),
 wrapper('f244Fragment622',['dortmund'],f244Fragment622,[F244_TOKEN619+'vec3 f244BodelschwinghFull500( float u=frame.x,v=frame.y,y=p.y;vec2 q=vec2(u,y);'],4),
 wrapper('f244Fragment627',['dortmund'],f244Fragment627,[F244_TOKEN622+F244_ANCHOR],2),
 wrapper('f235Fragment631',['dortmund'],f235Fragment631,['vec3 f235Native185(vec3 base,vec3 p,vec3 n,vec4 f,float family){'],3),
 wrapper('f285Fragment634',['essen'],f285Fragment634,['vec3 f285NativeEdge184(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){'],2),
 wrapper('f269Fragment640',['bremen'],f269Fragment640,['vec3 f269Roof575(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(normal.y<.99||abs(frame.z-575.)>.1)return base;'],3),
 wrapper('f004Fragment645',['berlin'],f004Fragment645,['vec3 f004Hbf238(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){'],2),
 wrapper('f020Fragment652',['berlin'],f020Fragment652,[F020_ANCHOR],2),
 wrapper('f020ChapelFragment654',['berlin'],f020ChapelFragment654,[F020_ANCHOR],2),
 wrapper('f020ButtressFragment655',['berlin'],f020ButtressFragment655,[F020_ANCHOR],2),
 wrapper('f020ApseFragment656',['berlin'],f020ApseFragment656,[F020_ANCHOR],2),
 wrapper('f020NaveFragment657',['berlin'],f020NaveFragment657,[F020_ANCHOR],2),
 wrapper('f020AnnexFragment658',['berlin'],f020AnnexFragment658,[F020_ANCHOR],2),
 wrapper('f020TurretFragment659',['berlin'],f020TurretFragment659,[F020_ANCHOR],2),
 wrapper('f020StoneFragment660',['berlin'],f020StoneFragment660,[F020_ANCHOR],2),
 // The current figure hook is the identity; it allocates nothing for any city.
 wrapper('f025FigureFragment663',[],f025FigureFragment663,[],0),
 wrapper('f236PlatformsFragment681',['dortmund'],f236PlatformsFragment681,['vec3 progressiveFeatureDispatchCity(','vec3 progressiveFeatureDispatch('],3),
]);
const wrapperByName=(name:string)=>{const value=DELEGATED_MATERIAL_SOURCE_WRAPPERS.find(row=>row.name===name);if(!value)throw Error('Unknown delegated500 wrapper '+name);return value;};
/** The original legacy partition chain: f004645 through f025663, in order. */
export const DELEGATED_LEGACY_PARTITION_WRAPPERS:readonly DelegatedPaintWrapper[]=Object.freeze(['f004Fragment645','f020Fragment652','f020ChapelFragment654','f020ButtressFragment655','f020ApseFragment656','f020NaveFragment657','f020AnnexFragment658','f020TurretFragment659','f020StoneFragment660','f025FigureFragment663'].map(wrapperByName));
/** Berlin's f004645 availability probe wraps one partition with this hook only. */
export const DELEGATED_F004_DETAIL_WRAPPERS:readonly DelegatedPaintWrapper[]=Object.freeze([wrapperByName('f004Fragment645')]);
/** Berlin packing reads its f020 1679 chapel flag through these two hooks, in
 * the original f020ChapelFragment654(f020Fragment652(partition)) order. */
export const DELEGATED_F020_CHAPEL_WRAPPERS:readonly DelegatedPaintWrapper[]=Object.freeze(['f020Fragment652','f020ChapelFragment654'].map(wrapperByName));
/** Berlin distant Paul-Löbe source: three contract splits and two replaces. */
export const DELEGATED_BERLIN_DISTANT_WRAPPERS:readonly DelegatedPaintWrapper[]=Object.freeze([wrapper('berlinDistantPaintFragment',['*'],source=>berlinDistantPaintFragment(source)??source,[BE_PAUL_LOBE_GLSL+'return bePaulLobe1(base,p,normal,frame,family);vec3 paintedFacade('],5)]);

/** Same strings, in the same order, as the original nested wrapper calls.
 * Reassigning the parameter drops this frame's reference to each earlier text;
 * the bound still allows a caller-held raw paint beside later wrappers. */
export function applyDelegatedPaintWrappers(source:string,city:string,wrappers:readonly DelegatedPaintWrapper[]):string{
 for(const row of wrappers)source=row.apply(source,city);return source;
}

type SyntaxKey=keyof ShaderSourceSyntaxBounds;
const SYNTAX_KEYS:readonly SyntaxKey[]=['functionRanges','callSites','statementNodes','guardTuples','identifierCharacters','parameterCharacters'];
type WrapperGrowth=Readonly<{characters:number;syntax:ShaderSourceSyntaxBounds}>;
const growthCache=new WeakMap<DelegatedPaintWrapper,Map<string,WrapperGrowth>>();
function safeSum(a:number,b:number){const value=a+b;if(!Number.isSafeInteger(value)||value<0)throw new RangeError('Delegated500 shader bound exceeds the safe integer range');return value;}
/** Exact local growth of one applying wrapper. A probe it no longer transforms
 * means its contract changed; the bound refuses rather than undercounting. */
export function delegatedWrapperGrowth(row:DelegatedPaintWrapper,city:string):WrapperGrowth{
 let byCity=growthCache.get(row);if(!byCity){byCity=new Map();growthCache.set(row,byCity);}
 const cached=byCity.get(city);if(cached)return cached;
 let characters=0;const syntax:Record<SyntaxKey,number>={functionRanges:0,callSites:0,statementNodes:0,guardTuples:0,identifierCharacters:0,parameterCharacters:0};
 for(const probe of row.probes){
  const output=row.apply(probe,city);
  if(typeof output!=='string'||output===probe)throw Error('Delegated500 wrapper '+row.name+' no longer matches its budget probe for '+city);
  characters=Math.max(characters,output.length-probe.length);
  const before=countShaderSourceSyntax(probe),after=countShaderSourceSyntax(output);
  for(const key of SYNTAX_KEYS)syntax[key]=Math.max(syntax[key],after[key]-before[key]);
 }
 const value=Object.freeze({characters,syntax:Object.freeze(syntax)});byCity.set(city,value);return value;
}
/** Bound of a raw paint after the selected wrappers. No wrapper reads source. */
export function describeDelegatedWrappedPaintBounds(raw:ShaderSourceBounds,city:string,wrappers:readonly DelegatedPaintWrapper[]):ShaderSourceBounds{
 let characters=raw.sourceCharactersUpperBound,assembly=raw.assemblyCharactersUpperBound,rawHeld=0;
 const syntax:Record<SyntaxKey,number>={...raw.syntaxUpperBound},trace=[...raw.authorityTrace];
 for(const row of wrappers){
  if(!delegatedWrapperApplies(row,city))continue;
  const growth=delegatedWrapperGrowth(row,city),input=characters;characters=safeSum(characters,growth.characters);
  for(const key of SYNTAX_KEYS)syntax[key]=safeSum(syntax[key],growth.syntax[key]);
  // Sequential phases, as in the shared workspace estimate: an earlier wrapper's
  // own temporaries are unreachable once it returns. While this body runs, its
  // input, every split piece/slice and each replace output coexist. After the
  // first applying wrapper, the raw paint the chain started from may still be
  // referenced by the caller's frame beside them, so it is counted once more.
  assembly=Math.max(assembly,safeSum(safeSum(rawHeld,input),row.textCopies*characters));rawHeld=raw.sourceCharactersUpperBound;trace.push('delegated500-wrapper:'+row.name);
 }
 assembly=Math.max(assembly,characters);
 return normalizeShaderSourceBounds({sourceCharactersUpperBound:characters,paintSourceCharactersUpperBound:characters,assemblyCharactersUpperBound:assembly,
  analysisTemporaryCharactersUpperBound:safeSum(safeSum(5*characters,syntax.identifierCharacters),syntax.parameterCharacters),
  assemblyMetadataBytesUpperBound:raw.assemblyMetadataBytesUpperBound,syntaxUpperBound:syntax,authorityTrace:trace,policy:raw.policy});
}
/** The same paint once its admitted owner already holds the text: no builder
 * runs, so its assembly envelope is only the existing characters. */
export function existingShaderTextBounds(bounds:ShaderSourceBounds):ShaderSourceBounds{
 return normalizeShaderSourceBounds({...bounds,assemblyCharactersUpperBound:bounds.sourceCharactersUpperBound,assemblyMetadataBytesUpperBound:0,authorityTrace:[...bounds.authorityTrace,'existing-paint-text']});
}
/** Descriptor for paint text that already exists: interpolating it emits only
 * its own length. It cannot emit; the real text is supplied after admission. */
export function existingShaderTextBoundPart(bounds:ShaderSourceBounds,authority:object):ShaderSourcePart{
 return deferredShaderSourcePart({charactersUpperBound:bounds.sourceCharactersUpperBound,emissionCharactersUpperBound:bounds.sourceCharactersUpperBound,syntaxUpperBound:bounds.syntaxUpperBound,authority,authorityTrace:[...bounds.authorityTrace,'existing-paint-text'],build(){throw Error('Delegated500 budget descriptor cannot emit paint source');}});
}

/** Deduplicated claim of a cost list, using the ledger's larger-claim rule. */
export function delegatedCostBytes(costs:readonly ResourceBudgetCost[]):number{
 const byIdentity=new Map<object|string,number>();let anonymous=0;
 for(const cost of costs){if(cost.identity===undefined){anonymous=safeSum(anonymous,Math.ceil(cost.bytes));continue;}byIdentity.set(cost.identity,Math.max(byIdentity.get(cost.identity)??0,Math.ceil(cost.bytes)));}
 let total=anonymous;for(const bytes of byIdentity.values())total=safeSum(total,bytes);return total;
}
/** A single source item that can never be admitted reports that explicitly. */
export class DelegatedShaderBudgetUnfitError extends Error{
 constructor(readonly label:string,readonly requiredBytes:number,readonly capacityBytes:number){super(label+' requires '+requiredBytes+' logical bytes, more than the '+capacityBytes+' byte page resource budget');this.name='DelegatedShaderBudgetUnfitError';}
}
// A ledger's limit is fixed by its policy; stats walks every claim, so read it once.
const capacities=new WeakMap<ResourceBudget,number>();
function capacityOf(budget:ResourceBudget){let value=capacities.get(budget);if(value===undefined){value=budget.stats.limitBytes;capacities.set(budget,value);}return value;}
/** heldBytes is already-claimed text this item reads and cannot release while
 * it waits (the retained material paint): item plus held never fitting is unfit. */
export function assertDelegatedCostsFit(budget:ResourceBudget,costs:readonly ResourceBudgetCost[],label:string,heldBytes=0):void{
 const required=safeSum(delegatedCostBytes(costs),heldBytes),capacity=capacityOf(budget);if(required>capacity)throw new DelegatedShaderBudgetUnfitError(label,required,capacity);
}
export function assertDelegatedProgramBudgetFits(budget:ResourceBudget,value:{sourceBytesUpperBound:number;submittedAllowanceBytes?:number;workspaceCosts?:readonly ResourceBudgetCost[]},label:string,heldBytes=0):void{
 const required=safeSum(safeSum(safeSum(value.sourceBytesUpperBound,programAllowanceBytes(value)),delegatedCostBytes(value.workspaceCosts??[])),heldBytes),capacity=capacityOf(budget);
 if(required>capacity)throw new DelegatedShaderBudgetUnfitError(label,required,capacity);
}

/** Retained source text plus, until it settles, its construction envelope. */
export type DelegatedSourceTextClaim={readonly active:boolean;readonly settled:boolean;readonly bytes:number;settle(text:string):void;release():void};
export type DelegatedSourceTextEstimate=Readonly<{retainedCharactersUpperBound:number;transientBytesUpperBound:number;label:string}>;
/** Allocation identities of one source text. A preflight that holds costs under
 * the same identities makes the later claim deduplicate instead of adding bytes. */
export type DelegatedSourceTextIdentities=Readonly<{retained:object;scratch:object}>;
export const newDelegatedSourceTextIdentities=():DelegatedSourceTextIdentities=>Object.freeze({retained:{},scratch:{}});
export function delegatedSourceTextCosts(estimate:DelegatedSourceTextEstimate,identities:DelegatedSourceTextIdentities):readonly ResourceBudgetCost[]{
 const costs:ResourceBudgetCost[]=[{category:'program-source',bytes:safeSum(estimate.retainedCharactersUpperBound,estimate.retainedCharactersUpperBound),precision:'estimate',identity:identities.retained,label:estimate.label+': retained logical UTF16 upper bound'}];
 if(estimate.transientBytesUpperBound>0)costs.push({category:'construction',bytes:estimate.transientBytesUpperBound,precision:'estimate',identity:identities.scratch,label:estimate.label+': assembly envelope'});
 return Object.freeze(costs);
}
function claimFrom(reservation:ResourceBudgetReservation,estimate:DelegatedSourceTextEstimate,identity:object):DelegatedSourceTextClaim{
 let released=false,settled=false;
 return{
  get active(){return !released&&reservation.active;},get settled(){return settled&&!released&&reservation.active;},get bytes(){return released?0:reservation.bytes;},
  settle(text){
   if(released||!reservation.active)throw new DOMException('Delegated500 source claim was released','AbortError');
   if(text.length>estimate.retainedCharactersUpperBound)throw new RangeError(estimate.label+' exceeded its pre-build bound: '+text.length+' > '+estimate.retainedCharactersUpperBound);
   // Shrinking to the observed retained text never needs new capacity.
   if(!reservation.adjust({category:'program-source',bytes:text.length*2,precision:'estimate',identity,label:estimate.label+': retained logical UTF16'}))throw Error(estimate.label+' could not settle its admitted claim');settled=true;
  },
  release(){if(released)return;released=true;settled=false;reservation.release();},
 };
}
export type DelegatedSourceTextAdmission={ok:true;claim:DelegatedSourceTextClaim}|{ok:false;error:ResourceBudgetExceededError};
/** mustFit=false is for optional retention: an unfit copy is simply not kept. */
export function tryAdmitDelegatedSourceText(budget:ResourceBudget,estimate:DelegatedSourceTextEstimate,mustFit=true,identities:DelegatedSourceTextIdentities=newDelegatedSourceTextIdentities()):DelegatedSourceTextAdmission{
 const costs=delegatedSourceTextCosts(estimate,identities);if(mustFit)assertDelegatedCostsFit(budget,costs,estimate.label);
 const result=budget.tryReserve(costs,{label:estimate.label.slice(0,256)});
 return result.ok?{ok:true,claim:claimFrom(result.reservation,estimate,identities.retained)}:result;
}
export function admitDelegatedSourceText(budget:ResourceBudget,estimate:DelegatedSourceTextEstimate,identities?:DelegatedSourceTextIdentities):DelegatedSourceTextClaim{
 const result=tryAdmitDelegatedSourceText(budget,estimate,true,identities);if(result.ok!==true)throw result.error;return result.claim;
}
/** Valid asynchronous work waits on ledger availability, never on a timer.
 * Abort removes the wake-up subscription and rejects the pending admission. */
export async function waitForDelegatedSourceText(budget:ResourceBudget,estimate:DelegatedSourceTextEstimate,signal:AbortSignal):Promise<DelegatedSourceTextClaim>{
 for(;;){
  signal.throwIfAborted();
  const result=tryAdmitDelegatedSourceText(budget,estimate);if(result.ok===true)return result.claim;
  await new Promise<void>((resolve,reject)=>{
   let off:(()=>void)|undefined;
   const abort=()=>{off?.();reject(signal.reason??new DOMException('Delegated500 source admission aborted','AbortError'));};
   off=budget.onAvailable(()=>{off?.();signal.removeEventListener('abort',abort);resolve();},signal);
   signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  });
 }
}

/** One wait gate per kind of source work. A refusal blocks only that kind, and
 * only for the exact request (key) that was refused, until the ledger next
 * reports released capacity; a different request still tries its own
 * admission. Availability is a wake-up hint: the woken work re-admits. No timer. */
export type DelegatedSourceBudgetGate={blockedFor(key:unknown):boolean;block(key:unknown,budget:ResourceBudget):void;clear():void;readonly blocked:boolean;readonly waiting:boolean};
export function createDelegatedSourceBudgetGate(wake:()=>void,signal:AbortSignal):DelegatedSourceBudgetGate{
 let blocked=false,refused:unknown,off:(()=>void)|undefined;
 const unsubscribe=()=>{const stop=off;off=undefined;stop?.();};
 return{
  blockedFor:key=>blocked&&Object.is(refused,key),
  block(key,budget){blocked=true;refused=key;if(off||signal.aborted)return;off=budget.onAvailable(()=>{unsubscribe();blocked=false;refused=undefined;wake();},signal);},
  clear(){blocked=false;refused=undefined;unsubscribe();},
  get blocked(){return blocked;},get waiting(){return !!off;},
 };
}

const unusedWorkspaceStats=(released:boolean):PreparedSourceStats=>Object.freeze({builds:0,analyses:0,hits:0,replacements:0,clears:0,sourceCharacters:0,released,budget:Object.freeze({accounting:'logical-shader-workspace-estimate' as const,physicalMemory:'unmeasured' as const,ownedBytesEstimate:0,sourceBytesEstimate:0,entryMetadataBytesEstimate:0,analysisBytesEstimate:0,scratchBytesEstimate:0,retiringBytesEstimate:0,policy:null,authorityTrace:Object.freeze([]),authorityTraceTruncated:false})});
/** The prepared-source workspace on the ledger of the renderer's own WebGL
 * context, the same store program tickets reserve in. It is created on first
 * use, never at renderer construction, and is replaced only if that context's
 * ledger changes. Reading stats or clearing never creates it. */
export function createContextPreparedSourceWorkspace(budget:()=>ResourceBudget,options:Omit<PreparedSourceWorkspaceOptions,'budget'>):PreparedSourceWorkspace{
 let current:{budget:ResourceBudget;workspace:PreparedSourceWorkspace}|undefined,released=false;
 function workspace(){
  if(released)throw new DOMException('Delegated500 source workspace was released','AbortError');
  const ledger=budget();if(current?.budget!==ledger){const previous=current;current=undefined;previous?.workspace.release();current={budget:ledger,workspace:createPreparedSourceWorkspace({...options,budget:ledger})};}
  return current.workspace;
 }
 return{
  prepareSource:(recipe,families)=>workspace().prepareSource(recipe,families),
  programBudget:(recipe,vertexSource,attributes,families)=>workspace().programBudget(recipe,vertexSource,attributes,families),
  clearPreparedSource(){current?.workspace.clearPreparedSource();},
  get preparedSourceStats(){return current?current.workspace.preparedSourceStats:unusedWorkspaceStats(released);},
  release(){if(released)return;released=true;current?.workspace.release();},
 };
}

/** Retained specialized caster sources hold one claim each. A refused claim
 * simply does not retain the text; every delete/clear path returns capacity. */
export class DelegatedPreparedSourceMap<V extends {readonly fragment:string}> extends Map<string,V>{
 private readonly claims=new Map<string,ResourceBudgetReservation>();
 constructor(private readonly budget:()=>ResourceBudget|undefined){super();}
 override set(key:string,value:V):this{
  this.delete(key);const budget=this.budget?.();
  if(!budget){super.set(key,value);return this;}
  const result=budget.tryReserve({category:'program-source',bytes:value.fragment.length*2,precision:'estimate',identity:value,label:'delegated500 specialized caster source: logical UTF16'});
  if(result.ok!==true)return this;
  this.claims.set(key,result.reservation);super.set(key,value);return this;
 }
 override delete(key:string):boolean{const claim=this.claims?.get(key);if(claim){this.claims.delete(key);claim.release();}return super.delete(key);}
 override clear():void{const claims=this.claims?[...this.claims.values()]:[];this.claims?.clear();super.clear();for(const claim of claims)claim.release();}
 get budgetBytes(){let total=0;for(const claim of this.claims.values())total+=claim.bytes;return total;}
}
