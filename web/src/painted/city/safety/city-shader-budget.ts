import {FAMILY_PAINT_CONTAINER_POLICY,countShaderSourceSyntax,deferredShaderSourcePart,normalizeShaderSourceBounds,shaderSourceBounds,shaderSourceText,type ShaderSourceBounds,type ShaderSourcePart,type ShaderSourceSyntaxBounds} from '../../../safety/render-runtime/shader-source-budget';
import {describeShaderAssemblyBounds,shaderSourceBoundPart} from '../../../safety/render-runtime/shader-assembly-budget';
import type {ResourceBudget,ResourceBudgetCost,ResourceBudgetExceededError,ResourceBudgetReservation} from '../../../safety/render-runtime/resource-budget';
import {programAllowanceBytes,type ProgramPreparationBudget} from '../../../safety/render-runtime/program-preparation';
import type {PreparedSourceRecipe,PreparedSourceResult,PreparedSourceStats} from '../../../safety/prepared-source-contract';
import {createPreparedSourceWorkspace} from '../../../safety/prepared-source';
import {utf8ByteLength} from '../../../safety/utf8-byte-length';
import {c437MaterialFragment} from './c437-feature-glsl';
import {c438MaterialFragment} from './c438-feature-glsl';
import {c439MaterialFragment} from './c439-feature-glsl';
import {c442MaterialFragment} from './c442-feature-glsl';
import {c440MaterialFragment} from './c440-feature-glsl';
import {c441MaterialFragment} from './c441-feature-glsl';
import {c443MaterialFragment} from './c443-feature-glsl';
import {c444MaterialFragment} from './c444-feature-glsl';
import {c445MaterialFragment} from './c445-feature-glsl';
import {c446MaterialFragment} from './c446-feature-glsl';
import {c447MaterialFragment} from './c447-feature-glsl';
import {c448MaterialFragment} from './c448-feature-glsl';
import {c449MaterialFragment} from './c449-feature-glsl';
import {c450MaterialFragment} from './c450-feature-glsl';
import {c451MaterialFragment} from './c451-feature-glsl';
import {c452MaterialFragment} from './c452-feature-glsl';
import {c453MaterialFragment} from './c453-feature-glsl';
import {c455MaterialFragment} from './c455-feature-glsl';
import {c456MaterialFragment} from './c456-feature-glsl';
import {c457MaterialFragment} from './c457-feature-glsl';
import {c454MaterialFragment} from './c454-feature-glsl';
import {c459MaterialFragment} from './c459-feature-glsl';
import {c460MaterialFragment} from './c460-feature-glsl';
import {c461MaterialFragment} from './c461-feature-glsl';
import {c462MaterialFragment} from './c462-feature-glsl';
import {c463MaterialFragment} from './c463-feature-glsl';
import {c464MaterialFragment} from './c464-feature-glsl';
import {c465MaterialFragment} from './c465-feature-glsl';
import {c466MaterialFragment} from './c466-feature-glsl';
import {c467MaterialFragment} from './c467-feature-glsl';
import {c468MaterialFragment} from './c468-feature-glsl';
import {c471MaterialFragment} from './c471-feature-glsl';
import {c475MaterialFragment} from './c475-feature-glsl';
import {c474MaterialFragment} from './c474-feature-glsl';
import {c470MaterialFragment} from './c470-feature-glsl';
import {c472MaterialFragment} from './c472-feature-glsl';
import {c473MaterialFragment} from './c473-feature-glsl';
import {c476MaterialFragment} from './c476-feature-glsl';
import {c311MaterialFragment} from './c311-feature-glsl';
import {c312MaterialFragment} from './c312-feature-glsl';
import {c313MaterialFragment} from './c313-feature-glsl';
import {c318MaterialFragment} from './c318-feature-glsl';
import {c320MaterialFragment} from './c320-feature-glsl';
import {c321MaterialFragment} from './c321-feature-glsl';
import {c322MaterialFragment} from './c322-feature-glsl';
import {c323MaterialFragment} from './c323-feature-glsl';
import {c324MaterialFragment} from './c324-feature-glsl';
import {c325MaterialFragment} from './c325-feature-glsl';
import {c326MaterialFragment} from './c326-feature-glsl';
import {c327MaterialFragment} from './c327-feature-glsl';
import {c328MaterialFragment} from './c328-feature-glsl';
import {c329MaterialFragment} from './c329-feature-glsl';
import {c330MaterialFragment} from './c330-feature-glsl';
import {c331MaterialFragment} from './c331-feature-glsl';
import {c332MaterialFragment} from './c332-feature-glsl';
import {c333MaterialFragment} from './c333-feature-glsl';
import {c334MaterialFragment} from './c334-feature-glsl';
import {c335MaterialFragment} from './c335-feature-glsl';
import {c336MaterialFragment} from './c336-feature-glsl';
import {c337MaterialFragment} from './c337-feature-glsl';
import {c338MaterialFragment} from './c338-feature-glsl';
import {c339MaterialFragment} from './c339-feature-glsl';

/** One City text transform: an exact pattern insertion, or the unchanged input. */
export type CityTextWrapper=(source:string,city:string)=>string;

/** The 38 Dresden material dispatchers in the original application order
 * (innermost first). Each other city receives its input string unchanged. */
export const CITY_DRESDEN_DISPATCHERS:readonly CityTextWrapper[]=Object.freeze([
 c437MaterialFragment,c438MaterialFragment,c439MaterialFragment,c442MaterialFragment,c440MaterialFragment,c441MaterialFragment,c443MaterialFragment,c444MaterialFragment,c445MaterialFragment,c446MaterialFragment,
 c447MaterialFragment,c448MaterialFragment,c449MaterialFragment,c450MaterialFragment,c451MaterialFragment,c452MaterialFragment,c453MaterialFragment,c455MaterialFragment,c456MaterialFragment,c457MaterialFragment,
 c454MaterialFragment,c459MaterialFragment,c460MaterialFragment,c461MaterialFragment,c462MaterialFragment,c463MaterialFragment,c464MaterialFragment,c465MaterialFragment,c466MaterialFragment,c467MaterialFragment,
 c468MaterialFragment,c471MaterialFragment,c475MaterialFragment,c474MaterialFragment,c470MaterialFragment,c472MaterialFragment,c473MaterialFragment,c476MaterialFragment,
]);
/** C318 does not return before C320...C339 finish: every level calls the next
 * one from inside its own frame, so each level's input string stays reachable
 * until the innermost replacement returns. */
export const CITY_C318_NESTED_LEVELS:readonly CityTextWrapper[]=Object.freeze([
 c318MaterialFragment,c320MaterialFragment,c321MaterialFragment,c322MaterialFragment,c323MaterialFragment,c324MaterialFragment,c325MaterialFragment,c326MaterialFragment,c327MaterialFragment,c328MaterialFragment,c329MaterialFragment,
 c330MaterialFragment,c331MaterialFragment,c332MaterialFragment,c333MaterialFragment,c334MaterialFragment,c335MaterialFragment,c336MaterialFragment,c337MaterialFragment,c338MaterialFragment,c339MaterialFragment,
]);

export function cityDresdenMaterial(source:string,city:string):string{let value=source;for(const dispatch of CITY_DRESDEN_DISPATCHERS)value=dispatch(value,city);return value;}

/** The Dresden landmark materials whose built presence gates their colour
 * paths, in the original order (it is part of each chunk's recipe identity). */
export const CITY_DRESDEN_SOURCE_FEATURES:readonly string[]=Object.freeze([
 'c437Blockhaus','c438Bellevue','c439Finance','c440Cinemas','c441Zeuner','c442Schinkel','c443Altmarkt','c444Anton','c445Hilton','c446Campus',
 'c447Campus','c448Simmel','c449AltmarktWest','c450DeSaxe','c451NPone','c452Tillich','c453Industrial','c454Corner','c455Wilsdruffer','c456Hotels',
 'c457Ostra','c459Wils1416','c460Gewandhaus','c461SemperAnnex','c462Hof','c463Reichsbank','c464Kutzbach','c465Glass','c466Frieseneck','c467LandhausHoym',
 'c468QuartierIII1','c470Station','c471Schauspielhaus','c472StateMinistries','c473Landgericht','c474Petri','c476Wings',
]);
const DRESDEN_FEATURE_PREFIX='c4',dresdenFeaturesByHead=new Map<string,string[]>();
for(const name of CITY_DRESDEN_SOURCE_FEATURES){
 if(!name.startsWith(DRESDEN_FEATURE_PREFIX)||name.length<4)throw Error('Dresden feature names share one scan prefix');
 const head=name.slice(0,4),list=dresdenFeaturesByHead.get(head);if(list)list.push(name);else dresdenFeaturesByHead.set(head,[name]);
}
/** Which of those materials a built source contains: a few names, never the text.
 * Exactly CITY_DRESDEN_SOURCE_FEATURES.filter(name=>source.includes(name)): every
 * occurrence of a name starts at an occurrence of their shared prefix, and one
 * pass visits each such position instead of one full pass per name. */
export function cityDresdenSourceFeatures(source:string):ReadonlySet<string>{
 const found=new Set<string>();
 for(let at=source.indexOf(DRESDEN_FEATURE_PREFIX);at>=0&&found.size<CITY_DRESDEN_SOURCE_FEATURES.length;at=source.indexOf(DRESDEN_FEATURE_PREFIX,at+1)){
  const names=dresdenFeaturesByHead.get(source.slice(at,at+4));if(names)for(const name of names)if(!found.has(name)&&source.startsWith(name,at))found.add(name);
 }
 return new Set(CITY_DRESDEN_SOURCE_FEATURES.filter(name=>found.has(name)));
}

export type CityMaterialHook='c311'|'c313'|'c312'|'c318';
const MATERIAL_HOOKS:Readonly<Record<CityMaterialHook,CityTextWrapper>>=Object.freeze({c311:c311MaterialFragment,c313:c313MaterialFragment,c312:c312MaterialFragment,c318:c318MaterialFragment});
/** A material recipe is data: the same ordered hook list drives the real
 * builder and the pre-build bound, so neither can describe another recipe. */
export type CityMaterialBuilder=(()=>string)&Readonly<{city:string;hooks:readonly CityMaterialHook[];key:string}>;
export function createCityMaterialBuilder(city:string,hooks:readonly CityMaterialHook[],base:()=>string):CityMaterialBuilder{
 const stages=Object.freeze([...hooks]);
 if(stages.some((hook,index)=>!Object.prototype.hasOwnProperty.call(MATERIAL_HOOKS,hook)||stages.indexOf(hook)!==index))throw TypeError('Invalid City material hook recipe');
 const build=()=>{let value=base();for(const hook of stages)value=MATERIAL_HOOKS[hook](value,city);return value;};
 return Object.freeze(Object.assign(build,{city,hooks:stages,key:'city-material-v1:'+city+':'+stages.join('>')}));
}

export type CityShaderHookName='c018'|'cbt'|'c298'|'c311'|'c313'|'c312';
export type CityShaderHooks=Readonly<Record<CityShaderHookName,CityTextWrapper>>;
export type CityShaderHookFlags=Readonly<{c311:boolean;c313:boolean;c312:boolean}>;
/** Original program order: native displays, then the active C311, C313, C312 corrections. */
export function cityShaderHookStages(flags:CityShaderHookFlags):readonly CityShaderHookName[]{
 const stages:CityShaderHookName[]=['c018','cbt','c298'];if(flags.c311)stages.push('c311');if(flags.c313)stages.push('c313');if(flags.c312)stages.push('c312');return stages;
}
export function applyCityShaderHooks(source:string,city:string,hooks:CityShaderHooks,flags:CityShaderHookFlags):string{let value=source;for(const stage of cityShaderHookStages(flags))value=hooks[stage](value,city);return value;}

/* Pattern calibration. Every City wrapper replaces exactly one occurrence of a
 * fixed pattern (the material dispatcher header, or the first fragment main)
 * with text that does not depend on the rest of its input; the wrappers enforce
 * the single occurrence themselves. Applying a wrapper once to that bare
 * pattern therefore yields its exact insertion size and lexical counts. This
 * runs once per wrapper and city, never on program source: the allocation is
 * bounded by the wrapper's own constant insertion. Program and workspace bounds
 * later reuse these numbers without building any shader text. A MAIN regex
 * match is at least the 12-character calibration pattern, so a longer match can
 * only shrink the real growth. */
const MATERIAL_ANCHORS=Object.freeze(['vec3 progressiveFeatureDispatch(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){','vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){']);
const MATERIAL_PATTERN=MATERIAL_ANCHORS[0],MATERIAL_PATTERN_CHARACTERS=Math.max(...MATERIAL_ANCHORS.map(value=>value.length));
const MAIN_PATTERN='void main(){';
const SYNTAX_KEYS=['functionRanges','callSites','statementNodes','guardTuples','identifierCharacters','parameterCharacters'] as const;
const ZERO_SYNTAX:ShaderSourceSyntaxBounds=Object.freeze({functionRanges:0,callSites:0,statementNodes:0,guardTuples:0,identifierCharacters:0,parameterCharacters:0});
export type CityWrapperCalibration=Readonly<{identity:boolean;characters:number;patternCharacters:number;syntax:ShaderSourceSyntaxBounds}>;
const IDENTITY:CityWrapperCalibration=Object.freeze({identity:true,characters:0,patternCharacters:0,syntax:ZERO_SYNTAX});
const calibrations=new WeakMap<CityTextWrapper,Map<string,CityWrapperCalibration>>();
function safe(value:number,label:string){if(!Number.isSafeInteger(value)||value<0)throw RangeError('City shader '+label+' bound exceeds the safe integer range');return value;}
function addSyntax(a:ShaderSourceSyntaxBounds,b:ShaderSourceSyntaxBounds):ShaderSourceSyntaxBounds{const value={} as Record<typeof SYNTAX_KEYS[number],number>;for(const key of SYNTAX_KEYS)value[key]=safe(a[key]+b[key],'syntax');return Object.freeze(value);}
/* Declared material calibrations. The static material wrappers (the 38 Dresden
 * dispatchers and the C311/C313/C312/C318 material hooks) insert text that
 * depends on nothing but their city, so their calibrations are constants:
 * describing a material recipe for one of DECLARED_CITY_MATERIAL_CITIES runs no
 * wrapper and creates no text outside a reservation (measured before this
 * table: Munich's C318..C339 chain inserts 188,075 characters through its 21
 * nested levels, Dresden's dispatchers 152,366 in all). Each row is
 * [characters, functionRanges, callSites, statementNodes, guardTuples,
 * identifierCharacters, parameterCharacters] for every city whose insertion is
 * not the identity; a declared wrapper is the identity for every other declared
 * city. tests/renderers-cc-material-calibration.test.mjs measures every
 * wrapper and city against these rows (measureCityMaterialWrapper), so a
 * changed wrapper fails there instead of drifting. Another wrapper, another
 * pattern or a city outside the list is still measured once, as before. */
export const DECLARED_CITY_MATERIAL_CITIES:readonly string[]=Object.freeze(['berlin','hamburg','munich','cologne','frankfurt','dusseldorf','stuttgart','leipzig','dortmund','bremen','essen','dresden','hannover','nuremberg']);
type DeclaredCalibration=readonly [number,number,number,number,number,number,number];
const declaredMaterialCities=new Set(DECLARED_CITY_MATERIAL_CITIES);
const DECLARED_MATERIAL_CALIBRATIONS:ReadonlyMap<CityTextWrapper,Readonly<Partial<Record<string,DeclaredCalibration>>>>=new Map<CityTextWrapper,Readonly<Partial<Record<string,DeclaredCalibration>>>>([
 [c437MaterialFragment,{dresden:[2643,6,124,180,124,1798,2643]}],
 [c438MaterialFragment,{dresden:[1679,5,72,109,72,1147,1679]}],
 [c439MaterialFragment,{dresden:[1969,6,89,129,89,1302,1969]}],
 [c442MaterialFragment,{dresden:[1128,3,51,74,51,761,1128]}],
 [c440MaterialFragment,{dresden:[1918,10,91,134,91,1234,1918]}],
 [c441MaterialFragment,{dresden:[2281,8,84,128,84,1526,2281]}],
 [c443MaterialFragment,{dresden:[69308,303,3180,4429,3180,46419,69308]}],
 [c444MaterialFragment,{dresden:[1826,6,75,115,75,1235,1826]}],
 [c445MaterialFragment,{dresden:[1335,4,67,95,67,884,1335]}],
 [c446MaterialFragment,{dresden:[4353,13,230,304,230,2841,4353]}],
 [c447MaterialFragment,{dresden:[3000,8,149,197,149,1969,3000]}],
 [c448MaterialFragment,{dresden:[6891,10,505,602,505,4241,6891]}],
 [c449MaterialFragment,{dresden:[1406,5,73,102,73,926,1406]}],
 [c450MaterialFragment,{dresden:[1355,4,64,93,64,914,1355]}],
 [c451MaterialFragment,{dresden:[2718,7,163,213,163,1767,2718]}],
 [c452MaterialFragment,{dresden:[2316,7,87,134,87,1550,2316]}],
 [c453MaterialFragment,{dresden:[4595,12,273,350,273,3028,4595]}],
 [c455MaterialFragment,{dresden:[1634,6,76,107,76,1081,1634]}],
 [c456MaterialFragment,{dresden:[1657,5,69,103,69,1128,1657]}],
 [c457MaterialFragment,{dresden:[4669,9,320,388,320,2938,4669]}],
 [c454MaterialFragment,{dresden:[2886,9,119,178,119,1929,2886]}],
 [c459MaterialFragment,{dresden:[1813,7,88,122,88,1180,1813]}],
 [c460MaterialFragment,{dresden:[1536,6,68,103,68,1059,1536]}],
 [c461MaterialFragment,{dresden:[1039,3,39,61,39,723,1039]}],
 [c462MaterialFragment,{dresden:[1212,3,57,77,57,820,1212]}],
 [c463MaterialFragment,{dresden:[3801,5,234,284,234,2317,3801]}],
 [c464MaterialFragment,{dresden:[1322,4,58,84,58,920,1322]}],
 [c465MaterialFragment,{dresden:[817,4,24,42,24,597,817]}],
 [c466MaterialFragment,{dresden:[1143,4,50,73,50,790,1143]}],
 [c467MaterialFragment,{dresden:[1060,3,49,69,49,711,1060]}],
 [c468MaterialFragment,{dresden:[1332,4,59,82,59,900,1332]}],
 [c471MaterialFragment,{dresden:[1261,4,58,83,58,857,1261]}],
 [c475MaterialFragment,{dresden:[6412,19,269,395,269,4337,6412]}],
 [c474MaterialFragment,{dresden:[1978,6,83,127,83,1339,1978]}],
 [c470MaterialFragment,{dresden:[1840,8,73,116,73,1278,1840]}],
 [c472MaterialFragment,{dresden:[1793,5,82,120,82,1208,1793]}],
 [c473MaterialFragment,{dresden:[1476,4,66,95,66,1001,1476]}],
 [c476MaterialFragment,{dresden:[964,4,36,60,36,668,964]}],
 [c311MaterialFragment,{munich:[2760,13,110,170,110,1882,2760]}],
 [c313MaterialFragment,{leipzig:[11596,38,572,774,572,7071,11596]}],
 [c312MaterialFragment,{munich:[8469,38,369,537,369,5799,8469]}],
 [c318MaterialFragment,{munich:[188075,617,8656,12741,8656,126544,188075]}]
]);
let measuredCalibrations=0,declaredCalibrations=0;
/** How many calibrations ran their wrapper and how many came from the declared table. */
export function cityWrapperCalibrationStats(){return Object.freeze({measured:measuredCalibrations,declared:declaredCalibrations});}
function declaredCalibration(row:DeclaredCalibration|undefined,patternCharacters:number):CityWrapperCalibration{
 if(!row)return IDENTITY;
 const [characters,...counts]=row,syntax={} as Record<typeof SYNTAX_KEYS[number],number>;SYNTAX_KEYS.forEach((key,index)=>{syntax[key]=counts[index];});
 return Object.freeze({identity:false,characters,patternCharacters,syntax:Object.freeze(syntax)});
}
function calibrate(wrapper:CityTextWrapper,city:string,pattern:string,patternCharacters:number):CityWrapperCalibration{
 let byCity=calibrations.get(wrapper);if(!byCity){byCity=new Map();calibrations.set(wrapper,byCity);}
 const key=city+'\u0000'+pattern,known=byCity.get(key);if(known)return known;
 const declared=pattern===MATERIAL_PATTERN&&declaredMaterialCities.has(city)?DECLARED_MATERIAL_CALIBRATIONS.get(wrapper):undefined;
 const value=declared?declaredCalibration(declared[city],patternCharacters):measure(wrapper,city,pattern,patternCharacters);
 if(declared)declaredCalibrations++;else measuredCalibrations++;
 byCity.set(key,value);return value;
}
/** Apply a wrapper once to its bare pattern (the original calibration). */
function measure(wrapper:CityTextWrapper,city:string,pattern:string,patternCharacters:number):CityWrapperCalibration{
 const output=wrapper(pattern,city);if(typeof output!=='string')throw TypeError('City shader wrapper did not return source text');
 let value=IDENTITY;
 if(output!==pattern){
  if(output.length<pattern.length)throw RangeError('City shader wrapper removed its own calibration pattern');
  const before=countShaderSourceSyntax(pattern),after=countShaderSourceSyntax(output),syntax={} as Record<typeof SYNTAX_KEYS[number],number>;
  // A replacement may only add lexical items beyond its pattern; never let a
  // shrinking count lower the input's own envelope.
  for(const key of SYNTAX_KEYS)syntax[key]=Math.max(0,after[key]-before[key]);
  value=Object.freeze({identity:false,characters:output.length-pattern.length,patternCharacters,syntax:Object.freeze(syntax)});
 }
 return value;
}
/** Test seam: the original measurement of one material wrapper, uncached and
 * never from the declared table. */
export function measureCityMaterialWrapper(wrapper:CityTextWrapper,city:string){return measure(wrapper,city,MATERIAL_PATTERN,MATERIAL_PATTERN_CHARACTERS);}
export function calibrateCityMaterialWrapper(wrapper:CityTextWrapper,city:string){return calibrate(wrapper,city,MATERIAL_PATTERN,MATERIAL_PATTERN_CHARACTERS);}
export function calibrateCityShaderHook(wrapper:CityTextWrapper,city:string){return calibrate(wrapper,city,MAIN_PATTERN,MAIN_PATTERN.length);}
/** A sequential replace keeps its input, split/match pieces (at most the input),
 * the replacement text and the result alive together. */
function sequentialEnvelope(input:number,calibration:CityWrapperCalibration){return safe(3*input+2*calibration.characters+calibration.patternCharacters,'replace envelope');}
function splitContainers(policy:ShaderSourceBounds['policy'],count=1){const p=policy??FAMILY_PAINT_CONTAINER_POLICY;return safe(count*(p.arrayHeaderBytes+4*p.arrayElementBytes),'split containers');}

/** Bound of the complete material source for one recipe, from the raw facade
 * template bound: no material builder or wrapper runs on the facade source. */
export function describeCityMaterialBounds(builder:CityMaterialBuilder,base:ShaderSourceBounds):ShaderSourceBounds{
 const raw=normalizeShaderSourceBounds(base),city=builder.city,policy=raw.policy;
 let characters=raw.sourceCharactersUpperBound,envelope=raw.assemblyCharactersUpperBound,syntax=raw.syntaxUpperBound,metadata=raw.assemblyMetadataBytesUpperBound??0,inserted=0;
 const sequential=(wrapper:CityTextWrapper)=>{
  const calibration=calibrateCityMaterialWrapper(wrapper,city);if(calibration.identity)return;
  envelope=Math.max(envelope,sequentialEnvelope(characters,calibration));characters=safe(characters+calibration.characters,'material');
  syntax=addSyntax(syntax,calibration.syntax);metadata=safe(metadata+splitContainers(policy),'material metadata');inserted++;
 };
 for(const dispatch of CITY_DRESDEN_DISPATCHERS)sequential(dispatch);
 for(const hook of builder.hooks){
  if(hook!=='c318'){sequential(MATERIAL_HOOKS[hook]);continue;}
  const calibration=calibrateCityMaterialWrapper(c318MaterialFragment,city);if(calibration.identity)continue;
  // Levels C318..C339 hold their inputs (each at most the C318 result) while the
  // innermost level also holds its split pieces, replacement and result.
  const levels=CITY_C318_NESTED_LEVELS.length,result=safe(characters+calibration.characters,'C318 material');
  envelope=Math.max(envelope,safe((levels+2)*result+calibration.characters+calibration.patternCharacters,'C318 nested envelope'));
  characters=result;syntax=addSyntax(syntax,calibration.syntax);metadata=safe(metadata+splitContainers(policy,levels),'C318 metadata');inserted++;
 }
 return normalizeShaderSourceBounds({
  sourceCharactersUpperBound:characters,paintSourceCharactersUpperBound:characters,assemblyCharactersUpperBound:Math.max(envelope,characters),
  analysisTemporaryCharactersUpperBound:safe(5*characters+syntax.identifierCharacters+syntax.parameterCharacters,'material analysis'),
  assemblyMetadataBytesUpperBound:metadata,syntaxUpperBound:syntax,policy,
  authorityTrace:[...raw.authorityTrace,builder.key,'city-material-wrappers:'+inserted,'pattern-calibrated-insertions-v1',...(builder.hooks.includes('c318')?['c318-nested-frames:'+CITY_C318_NESTED_LEVELS.length]:[])],
 });
}

/** Descriptor of the hooked fragment around a shell part. It never emits. */
export function describeCityShaderHooks(shell:ShaderSourcePart,city:string,hooks:CityShaderHooks,flags:CityShaderHookFlags,authority:object):ShaderSourcePart{
 const shellEmission=shell.emissionCharactersUpperBound;if(shellEmission===undefined)throw Error('City hook shell requires the shell simultaneous-text envelope');
 let characters=shell.charactersUpperBound,envelope=shellEmission,syntax=shell.syntaxUpperBound;const applied:string[]=[];
 for(const stage of cityShaderHookStages(flags)){
  const calibration=calibrateCityShaderHook(hooks[stage],city);if(calibration.identity)continue;
  envelope=Math.max(envelope,sequentialEnvelope(characters,calibration));characters=safe(characters+calibration.characters,'hooked fragment');syntax=addSyntax(syntax,calibration.syntax);applied.push(stage);
 }
 if(!applied.length)return shell;
 return deferredShaderSourcePart({charactersUpperBound:characters,emissionCharactersUpperBound:Math.max(envelope,characters),syntaxUpperBound:syntax,authority,authorityTrace:[...shell.authorityTrace,'city-fragment-hooks:'+applied.join('>')],build(){throw Error('City hook shell descriptor cannot emit program source');}});
}

export type CityProgramSourceRecipe=PreparedSourceRecipe&Readonly<{white:boolean;material?:CityMaterialBuilder}>;
export type CityColourSourceRecipeOptions=Readonly<{
 helper:string;city:string;variant:string;vertexInput:string;material:CityMaterialBuilder;materialBounds:ShaderSourceBounds;
 hooks:CityShaderHooks;flags:CityShaderHookFlags;authority:object;
 fragmentParts:(helper:string,paint:string|ShaderSourcePart)=>ShaderSourcePart;fragment:(helper:string,paint:string)=>string;
}>;
/** One recipe for both the program preflight and the workspace claim. The
 * shell comes from the renderer's real tagged template around a bound part. */
export function cityColourSourceRecipe(options:CityColourSourceRecipeOptions):CityProgramSourceRecipe{
 const {helper,city,hooks,flags,fragment,material,materialBounds}=options;
 const paint=shaderSourceBoundPart(materialBounds,options.authority),shell=describeCityShaderHooks(options.fragmentParts(helper,paint),city,hooks,flags,options.authority);
 return Object.freeze({sourceKey:'base',inputs:Object.freeze([helper,city,options.variant,options.vertexInput,material]),sourceBounds:describeShaderAssemblyBounds(materialBounds,shell,{reflectionClip:true}),assemble:(paintSource:string)=>applyCityShaderHooks(fragment(helper,paintSource),city,hooks,flags),white:false,material});
}
const whiteBounds=new Map<string,ShaderSourceBounds>();
export function cityWhiteSourceRecipe(options:Readonly<{helper:string;city:string;variant:string;vertexInput:string;fragment:string;authority:object}>):CityProgramSourceRecipe{
 let raw=whiteBounds.get(options.fragment);if(!raw){raw=shaderSourceBounds(shaderSourceText(options.fragment,['city/hamburg-white-fragment']));if(whiteBounds.size>=4)whiteBounds.clear();whiteBounds.set(options.fragment,raw);}
 return Object.freeze({sourceKey:'white',inputs:Object.freeze([options.helper,options.city,options.variant,options.vertexInput]),sourceBounds:describeShaderAssemblyBounds(raw,shaderSourceBoundPart(raw,options.authority),{reflectionClip:true}),assemble:(paintSource:string)=>paintSource,white:true});
}

export class CityShaderBudgetUnfitError extends Error{
 constructor(readonly resource:string,readonly requiredBytes:number,readonly capacityBytes:number){
  super('City shader '+resource+' requires '+requiredBytes+' logical bytes, more than the whole page budget of '+capacityBytes+'; it cannot be admitted by waiting');
  this.name='CityShaderBudgetUnfitError';
 }
}
/** One allocation set's own logical size, independent of other live claims. */
export function cityProgramBudgetItemBytes(value:ProgramPreparationBudget){
 const allocations=new Map<unknown,number>();
 for(const cost of value.workspaceCosts??[]){const identity=cost.identity??cost;allocations.set(identity,Math.max(allocations.get(identity)??0,cost.bytes));}
 let bytes=value.sourceBytesUpperBound+programAllowanceBytes(value);for(const size of allocations.values())bytes+=size;return safe(bytes,'program item');
}
// A ledger's limit is fixed at creation; its stats getter recomputes all usage,
// so per-poll admission checks read the limit once per ledger.
const ledgerLimits=new WeakMap<ResourceBudget,number>();
function ledgerLimit(budget:ResourceBudget){let limit=ledgerLimits.get(budget);if(limit===undefined){limit=budget.stats.limitBytes;ledgerLimits.set(budget,limit);}return limit;}
/** A single item larger than the whole page ledger is reported, not queued. */
export function checkedCityProgramBudget(budget:ResourceBudget,value:ProgramPreparationBudget,resource:string):ProgramPreparationBudget{
 const bytes=cityProgramBudgetItemBytes(value),limit=ledgerLimit(budget);if(bytes>limit)throw new CityShaderBudgetUnfitError(resource,bytes,limit);return value;
}
export function isCityShaderBudgetUnfit(error:unknown):error is CityShaderBudgetUnfitError{return error instanceof Error&&error.name==='CityShaderBudgetUnfitError';}
/** Shared workspace/program checks that an actual text exceeded its declared bound. */
export function isCityShaderBoundViolation(error:unknown){const text=String(error);return /exceeded its (?:pre-build bound|declared program source bound|declared character bound|admitted bound|admitted reservation|lexical [A-Za-z]+ envelope)|Program source budget descriptor exceeded|Deferred shader source exceeded/.test(text);}

export function cityMaterialPreflightCosts(bounds:ShaderSourceBounds,identity:object):readonly ResourceBudgetCost[]{
 const value=normalizeShaderSourceBounds(bounds);
 return Object.freeze([Object.freeze({category:'construction' as const,bytes:safe(2*value.assemblyCharactersUpperBound+(value.assemblyMetadataBytesUpperBound??0),'material preflight'),precision:'estimate' as const,identity,label:'City material source build envelope: logical UTF16, not measured heap'})]);
}
export type CityMaterialAdmission=
 {status:'admitted';reservation:ResourceBudgetReservation;bytes:number}|
 {status:'waiting';bytes:number;error:ResourceBudgetExceededError}|
 {status:'unfit';bytes:number;error:CityShaderBudgetUnfitError};
/** Reserve the material build envelope before the builder can run. Waiting is
 * the caller's: it retries after its existing availability wake-up. Builds that
 * can never be live together may pass one allocation identity, so the ledger
 * charges their largest envelope once instead of their sum. */
export function admitCityMaterialPreflight(budget:ResourceBudget,bounds:ShaderSourceBounds,resource:string,identity:object={}):CityMaterialAdmission{
 const costs=cityMaterialPreflightCosts(bounds,identity),bytes=costs[0].bytes,limit=ledgerLimit(budget);
 if(bytes>limit)return{status:'unfit',bytes,error:new CityShaderBudgetUnfitError(resource,bytes,limit)};
 const result=budget.tryReserve(costs,{label:resource.slice(0,256)});
 return result.ok?{status:'admitted',reservation:result.reservation,bytes}:{status:'waiting',bytes,error:result.error};
}

export type CityProgramSourceStats=Readonly<{builds:number;analyses:number;hits:number;replacements:number;clears:number;sourceCharacters:number;sourceBytes:number;released:boolean;budget:PreparedSourceStats['budget']}>;
export interface CityProgramSourceOwner{
 programBudget(recipe:CityProgramSourceRecipe,vertexSource:string,attributes:readonly string[],families:readonly number[]):ProgramPreparationBudget;
 prepareSource(recipe:CityProgramSourceRecipe,families:readonly number[]):PreparedSourceResult;
 clearPreparedSource():void;
 release():void;
 readonly stats:CityProgramSourceStats;
}
export type CityProgramSourceOwnerOptions=Readonly<{
 metadataHintSafe?:true;
 budget:ResourceBudget;current:()=>boolean;clear?:()=>void;whiteFragment:string;
 /** Called only after this recipe's workspace claim has been admitted. */
 buildMaterial:(material:CityMaterialBuilder)=>string;
 /** Single-family specialization remains the default for ungrouped demands. */
 specialize:(source:string,family:number)=>string;
 specializeGroup?:(source:string,families:readonly number[])=>string;
}>;
/** One data plan's prepared source. The shared workspace keeps at most the
 * current recipe's assembled fragment; family outputs belong to programs. */
export function createCityProgramSourceOwner(options:CityProgramSourceOwnerOptions):CityProgramSourceOwner{
 let analyses=0,sourceBytes=0,released=false;
 const {buildMaterial,specialize,whiteFragment}=options;
 const workspace=createPreparedSourceWorkspace({
  metadataHintSafe:options.metadataHintSafe,
  budget:options.budget,current:options.current,clear:options.clear,
  bounds(recipe){if(!recipe.sourceBounds)throw Error('City prepared source requires its actual assembly bound');return recipe.sourceBounds;},
  build(recipe){const value=recipe as CityProgramSourceRecipe;if(value.white)return whiteFragment;if(!value.material)throw Error('City colour source recipe has no material builder');return buildMaterial(value.material);},
  specialize(source,families){
   if(families.length>1){
    if(!options.specializeGroup)throw Error('City specialization requires one family per program');
    analyses++;return {fragment:options.specializeGroup(source,families),depthEffects:false};
   }
   if(!families.length)return{fragment:source,depthEffects:false};
   analyses++;return{fragment:specialize(source,families[0]),depthEffects:false};
  },
 });
 return{
  programBudget(recipe,vertexSource,attributes,families){return workspace.programBudget(recipe,vertexSource,attributes,families);},
  prepareSource(recipe,families){
   let measured:number|undefined;
   try{const result=workspace.prepareSource({...recipe,assemble(paint){const source=recipe.assemble(paint);measured=utf8ByteLength(source);return source;}},families);if(measured!==undefined)sourceBytes=measured;return result;}
   catch(error){if(!workspace.preparedSourceStats.sourceCharacters)sourceBytes=0;throw error;}
  },
  clearPreparedSource(){workspace.clearPreparedSource();sourceBytes=0;},
  release(){if(released)return;released=true;sourceBytes=0;workspace.release();},
  get stats(){const value=workspace.preparedSourceStats;return Object.freeze({builds:value.builds,analyses,hits:value.hits,replacements:value.replacements,clears:value.clears,sourceCharacters:value.sourceCharacters,sourceBytes:value.sourceCharacters?sourceBytes:0,released:value.released,budget:value.budget});},
 };
}
