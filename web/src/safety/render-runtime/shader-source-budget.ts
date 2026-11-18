import type {ResourceBudgetCost} from './resource-budget';

/** Upper bounds, not measurements of the engine's parser heap. Static pieces
 * can be counted before a full shader exists; comments are deliberately counted. */
export type ShaderSourceSyntaxBounds=Readonly<{
 functionRanges:number;callSites:number;statementNodes:number;guardTuples:number;
 identifierCharacters:number;parameterCharacters:number;
}>;
export type ShaderSourceContainerPolicy=Readonly<{
 id:string;objectHeaderBytes:number;propertySlotBytes:number;arrayHeaderBytes:number;arrayElementBytes:number;
 mapHeaderBytes:number;mapEntryBytes:number;setHeaderBytes:number;setEntryBytes:number;
}>;
/** Configurable logical 64-bit container allowances, not a V8/JSC heap sample. */
export const FAMILY_PAINT_CONTAINER_POLICY:ShaderSourceContainerPolicy=Object.freeze({id:'family-paint-logical-containers-v1',objectHeaderBytes:64,propertySlotBytes:8,arrayHeaderBytes:32,arrayElementBytes:8,mapHeaderBytes:64,mapEntryBytes:48,setHeaderBytes:64,setEntryBytes:32});
export type ShaderSourcePart=Readonly<{
 charactersUpperBound:number;
 /** All text outputs simultaneously live while this tree emits, including its
  * final output. Opaque deferred producers must declare their own envelope. */
 emissionCharactersUpperBound?:number;
 syntaxUpperBound:ShaderSourceSyntaxBounds;authorityTrace:readonly string[];authority?:object;
 emit():string;
}>;
export type ShaderSourceValue=string|number|boolean|null|undefined|ShaderSourcePart;
export type ShaderSourceBounds=Readonly<{
 sourceCharactersUpperBound:number;paintSourceCharactersUpperBound:number;
 assemblyCharactersUpperBound:number;analysisTemporaryCharactersUpperBound:number;
 /** Non-text assembly scratch, e.g. the source-pruner character array. */
 assemblyMetadataBytesUpperBound?:number;
 syntaxUpperBound:ShaderSourceSyntaxBounds;authorityTrace:readonly string[];policy?:ShaderSourceContainerPolicy;
}>;
export type ShaderSourceBoundsOptions={assembled?:ShaderSourcePart;assemblyCharactersUpperBound?:number;analysisTemporaryCharactersUpperBound?:number;authorityTrace?:readonly string[];policy?:ShaderSourceContainerPolicy};
export type ShaderSourceBudgetIdentities=Readonly<{text:object;metadata:object;scratch:object}>;
/** Logical bytes live in each phase of one current-paint-program call: the
 * analysis it keeps across phases is in every phase value. */
export type CurrentPaintProgramPhaseEstimate=Readonly<{analysis:number;functions:number;calls:number;dispatch:number;narrow:number;fragment:number;depth:number;peak:number;model:string}>;
export type ShaderSourceWorkspaceEstimate=Readonly<{sourceBytesEstimate:number;entryMetadataBytesEstimate:number;analysisBytesEstimate:number;scratchBytesEstimate:number;retainedBytesEstimate:number;peakBytesEstimate:number;policy:string;customPhases?:CurrentPaintProgramPhaseEstimate}>;
export type ShaderSourceWorkspaceEstimateOptions=Readonly<{
 /** 'custom' is the current-paint-program specializer that the delegated500,
  * church, City and tier300 workspaces pass (current-paint-program.ts). It
  * keeps its own parser, analyses inside each specialization call and retains
  * nothing; its transient allowance is the largest phase live set of one
  * analysis, not a sum. */
 analysis?:'family'|'custom';familyValues?:number;inputValues?:number;
 /** Exact assembled base already exists. Generic analysis is retained too;
  * a custom specializer still pays for its complete per-call parser. */
 prepared?:boolean;
}>;
export const CURRENT_PAINT_PROGRAM_ANALYSIS_MODEL='current-paint-program-phase-max-v1';

// Structural composition only: the bound descriptors a joined part interpolates,
// directly or through nested joins. An opaque deferred part never inherits it;
// its declared envelope is taken as it stands.
const descriptorKeys=new WeakMap<ShaderSourcePart,object>(),joinedDescriptors=new WeakMap<ShaderSourcePart,ReadonlySet<object>>();
/** Registers part as the descriptor of key (its raw bounds); a later join that
 * interpolates part records that its envelope contains part's envelope. */
export function markShaderSourceDescriptor(part:ShaderSourcePart,key:object):void{if(!part||typeof part!=='object'||!key||typeof key!=='object')throw new TypeError('Shader source descriptor requires a part and its key');descriptorKeys.set(part,key);}
/** True when part is, or joins (possibly nested), the descriptor of key. */
export function shaderSourcePartInterpolates(part:ShaderSourcePart,key:object):boolean{return descriptorKeys.get(part)===key||joinedDescriptors.get(part)?.has(key)===true;}
function count(value:number,label:string){if(!Number.isSafeInteger(value)||value<0)throw new RangeError('Invalid shader source '+label);return value;}
function sum(values:readonly number[]){let result=0;for(const value of values){result+=value;count(result,'total');}return result;}
function product(a:number,b:number){return count(a*b,'estimate');}
function trace(values:readonly string[]){if(values.some(value=>typeof value!=='string'))throw new TypeError('Shader source authority trace must contain strings');return Object.freeze([...values]);}
function syntax(value:ShaderSourceSyntaxBounds):ShaderSourceSyntaxBounds{return Object.freeze({functionRanges:count(value.functionRanges,'functions'),callSites:count(value.callSites,'calls'),statementNodes:count(value.statementNodes,'statements'),guardTuples:count(value.guardTuples,'guards'),identifierCharacters:count(value.identifierCharacters,'identifier text'),parameterCharacters:count(value.parameterCharacters,'parameter text')});}
export function countShaderSourceSyntax(source:string):ShaderSourceSyntaxBounds{
 let braces=0,parens=0,semicolons=0,identifiers=0;
 for(let i=0;i<source.length;i++){const code=source.charCodeAt(i);if(code===123)braces++;if(code===40)parens++;if(code===59)semicolons++;if(code===95||code>=48&&code<=57||code>=65&&code<=90||code>=97&&code<=122)identifiers++;}
 // functions() consumes one opening brace per range; callsIn() one opening
 // parenthesis per call; statements() consumes ';', block '{' or control '('.
 return syntax({functionRanges:braces,callSites:parens,statementNodes:sum([semicolons,braces,parens]),guardTuples:parens,identifierCharacters:identifiers,parameterCharacters:source.length});
}
export function shaderSourceText(source:string,authorityTrace:readonly string[]=[]):ShaderSourcePart{
 if(typeof source!=='string')throw new TypeError('Shader source text must already be a string');
 return Object.freeze({charactersUpperBound:source.length,emissionCharactersUpperBound:source.length,syntaxUpperBound:countShaderSourceSyntax(source),authorityTrace:trace(authorityTrace),emit:()=>source});
}
function part(value:ShaderSourceValue):ShaderSourcePart{
 if(value&&typeof value==='object'){if(typeof value.emit!=='function')throw new TypeError('Shader source interpolation must be a bounded part');return value;}
 if(value!==null&&!['string','number','boolean','undefined'].includes(typeof value))throw new TypeError('Shader source interpolation cannot coerce an object');
 return shaderSourceText(String(value));
}
export function emitShaderSource(value:ShaderSourcePart|string):string{
 if(typeof value==='string')return value;
 const result=value.emit();if(typeof result!=='string'||result.length>value.charactersUpperBound)throw new RangeError('Shader source part exceeded its declared character bound');return result;
}
function joined(parts:readonly ShaderSourcePart[]):ShaderSourcePart{
 const charactersUpperBound=sum(parts.map(value=>value.charactersUpperBound)),emissions=parts.map(value=>value.emissionCharactersUpperBound);
 const emissionCharactersUpperBound=emissions.every(value=>value!==undefined)?sum([charactersUpperBound,...emissions.map(value=>value!)]):undefined;
 const keys=['functionRanges','callSites','statementNodes','guardTuples','identifierCharacters','parameterCharacters'] as const;
 const totals={} as Record<typeof keys[number],number>;for(const key of keys)totals[key]=sum(parts.map(value=>value.syntaxUpperBound[key]));
 const held=Object.freeze([...parts]),result:ShaderSourcePart=Object.freeze({charactersUpperBound,emissionCharactersUpperBound,syntaxUpperBound:syntax(totals),authorityTrace:trace(parts.flatMap(value=>value.authorityTrace)),emit:()=>held.map(emitShaderSource).join('')});
 const descriptors=new Set<object>();for(const value of held){const key=descriptorKeys.get(value);if(key)descriptors.add(key);for(const nested of joinedDescriptors.get(value)??[])descriptors.add(nested);}
 if(descriptors.size)joinedDescriptors.set(result,descriptors);
 return result;
}
export function shaderSourceParts(strings:TemplateStringsArray,...values:ShaderSourceValue[]):ShaderSourcePart{
 if(strings.length!==values.length+1)throw new TypeError('Invalid shader source template');
 const parts:ShaderSourcePart[]=[];for(let i=0;i<strings.length;i++){parts.push(shaderSourceText(strings[i]));if(i<values.length)parts.push(part(values[i]));}return joined(parts);
}
export function joinShaderSourceParts(values:Iterable<ShaderSourceValue>,separator=''):ShaderSourcePart{
 const parts:ShaderSourcePart[]=[];for(const value of values){if(parts.length)parts.push(shaderSourceText(separator));parts.push(part(value));}return joined(parts);
}
export function deferredShaderSourcePart(options:{charactersUpperBound:number;emissionCharactersUpperBound?:number;syntaxUpperBound?:ShaderSourceSyntaxBounds;authority:object;authorityTrace:readonly string[];build:()=>string}):ShaderSourcePart{
 const size=count(options.charactersUpperBound,'deferred characters');if(!options.authority||typeof options.authority!=='object'||typeof options.build!=='function')throw new TypeError('Deferred shader source requires its real authority and builder');
 const emission=options.emissionCharactersUpperBound===undefined?undefined:count(options.emissionCharactersUpperBound,'deferred emission');if(emission!==undefined&&emission<size)throw new RangeError('Deferred shader emission cannot be smaller than its result');
 const bounds=options.syntaxUpperBound??{functionRanges:size,callSites:size,statementNodes:size,guardTuples:size,identifierCharacters:size,parameterCharacters:size},build=options.build;
 return Object.freeze({charactersUpperBound:size,emissionCharactersUpperBound:emission,syntaxUpperBound:syntax(bounds),authority:options.authority,authorityTrace:trace([...options.authorityTrace,...(options.syntaxUpperBound?[]:['conservative-character-token-upper-bound'])]),emit(){const value=build();if(typeof value!=='string'||value.length>size)throw new RangeError('Deferred shader source exceeded its declared character bound');return value;}});
}
export function normalizeShaderSourceBounds(value:ShaderSourceBounds):ShaderSourceBounds{
 const source=count(value.sourceCharactersUpperBound,'assembled characters'),paint=count(value.paintSourceCharactersUpperBound,'paint characters'),assembly=count(value.assemblyCharactersUpperBound,'assembly envelope');
 if(assembly<source||assembly<paint)throw new RangeError('Shader assembly envelope omits its source result');
 const policy=value.policy??FAMILY_PAINT_CONTAINER_POLICY;
 for(const [key,bytes]of Object.entries(policy))if(key!=='id')count(bytes as number,'container policy '+key);
 if(typeof policy.id!=='string'||!policy.id)throw new TypeError('Shader container policy requires an authority label');
 return Object.freeze({sourceCharactersUpperBound:source,paintSourceCharactersUpperBound:paint,assemblyCharactersUpperBound:assembly,assemblyMetadataBytesUpperBound:count(value.assemblyMetadataBytesUpperBound??0,'assembly metadata'),analysisTemporaryCharactersUpperBound:count(value.analysisTemporaryCharactersUpperBound,'analysis temporary text'),syntaxUpperBound:syntax(value.syntaxUpperBound),authorityTrace:trace(value.authorityTrace),policy:Object.freeze({...policy})});
}
export function shaderSourceBounds(raw:ShaderSourcePart,options:ShaderSourceBoundsOptions={}):ShaderSourceBounds{
 const assembled=options.assembled??raw,size=assembled.charactersUpperBound,s=assembled.syntaxUpperBound;
 const automatic=raw.emissionCharactersUpperBound===undefined||assembled.emissionCharactersUpperBound===undefined?undefined:assembled===raw?raw.emissionCharactersUpperBound:sum([raw.emissionCharactersUpperBound,assembled.emissionCharactersUpperBound]);
 const assembly=options.assemblyCharactersUpperBound??automatic;if(assembly===undefined)throw new Error('Opaque shader builders require an explicit simultaneous-text envelope');
 // prepare(): comment replacement, outside concatenation, body slice/mask,
 // regexp spelling/capture and signature/split text. These are distinct logical
 // text roles, not an empirical source-size multiplier or physical heap claim.
 const temporary=options.analysisTemporaryCharactersUpperBound??sum([size,size,size,size,size,s.identifierCharacters,s.parameterCharacters]);
 return normalizeShaderSourceBounds({sourceCharactersUpperBound:size,paintSourceCharactersUpperBound:raw.charactersUpperBound,assemblyCharactersUpperBound:assembly,analysisTemporaryCharactersUpperBound:temporary,syntaxUpperBound:s,authorityTrace:[...raw.authorityTrace,...(assembled===raw?[]:assembled.authorityTrace),...(options.authorityTrace??[])],policy:options.policy});
}
export function validateShaderSourceSyntax(source:string,bounds:ShaderSourceSyntaxBounds):ShaderSourceSyntaxBounds{
 const observed=countShaderSourceSyntax(source);
 for(const key of Object.keys(observed) as (keyof ShaderSourceSyntaxBounds)[])if(observed[key]>bounds[key])throw new RangeError('Shader source exceeded its lexical '+key+' envelope');
 return observed;
}

export function estimateShaderSourceWorkspace(bounds:ShaderSourceBounds,sourceCharacters=bounds.sourceCharactersUpperBound,options:ShaderSourceWorkspaceEstimateOptions={}):ShaderSourceWorkspaceEstimate{
 count(sourceCharacters,'observed source');if(sourceCharacters>bounds.sourceCharactersUpperBound)throw new RangeError('Assembled shader exceeded its declared character bound');
 const s=bounds.syntaxUpperBound,p=bounds.policy??FAMILY_PAINT_CONTAINER_POLICY,F=s.functionRanges,C=s.callSites,T=s.statementNodes,G=s.guardTuples,N=count(options.familyValues??0,'specialization family values'),I=count(options.inputValues??0,'recipe input values');
 const object=(fields:number,n=1)=>product(sum([p.objectHeaderBytes,product(fields,p.propertySlotBytes)]),n),array=(headers:number,slots:number)=>sum([product(headers,p.arrayHeaderBytes),product(slots,p.arrayElementBytes)]),map=(headers:number,entries:number)=>sum([product(headers,p.mapHeaderBytes),product(entries,p.mapEntryBytes)]),set=(headers:number,entries:number)=>sum([product(headers,p.setHeaderBytes),product(entries,p.setEntryBytes)]);
 // FamilyPaintSourceAnalysis{source,prepared}; Prepared's 9 fields; each
 // FunctionRange has 5 fields and Statement has 6. Collections correspond to
 // ranges/names/byName/calls/param/readOnly/statements/order and guard tuples.
 const containers=sum([object(2),object(9),object(5,F),object(6,T),array(sum([2,F,F,F,G]),sum([F,F,C,T,F,product(G,2)])),map(5,product(F,5)),set(1,F)]);
 const sourceBytesEstimate=product(sourceCharacters,2);
 const analysisText=product(sum([sourceCharacters,s.parameterCharacters,s.identifierCharacters,s.identifierCharacters,s.identifierCharacters]),2);
 const genericAnalysisBytes=sum([analysisText,containers]),analysisBytesEstimate=options.analysis==='custom'?0:genericAnalysisBytes;
 // Entry's five fields and its independent input-reference array. Input model
 // payloads are borrowed, not copied or counted again by this source owner.
 const entryMetadataBytesEstimate=sum([object(5),array(1,I)]);
 // Transient signatures + DFS maps, regex match/call arrays, split parameter
 // arrays, paintedFacadeCalls and the statements().map freeze-array copy.
 const temporaryContainers=sum([map(2,sum([F,F,C])),set(1,C),array(sum([4,F,C,C]),sum([F,F,F,F,C,C,C,C,C,C,C,C,T])),product(product(C,3),p.propertySlotBytes)]);
 const analysisScratch=sum([product(bounds.analysisTemporaryCharactersUpperBound,2),temporaryContainers]);
 // narrowed(): values/incoming/bodies/narrowCalls Maps, reachable/called Sets,
 // forwarded per-call family arrays, edits, reach() stacks and output chunks.
 // These are explicit logical container allowances, not a measured heap upper
 // bound: forwarding through the call DAG may merge/expand value sets. The real
 // family count is included rather than inferred from source syntax.
 const familySlots=product(N,sum([F,C,1]));
 const specializationContainers=sum([map(4,sum([F,F,F,F,C])),set(4,sum([F,F,F,C])),array(sum([8,F,C,T]),sum([familySlots,familySlots,C,C,F,F,product(F,2),product(T,3),1])),object(3)]);
 // Simultaneous bodies, current body/mask, edit concatenation and chunk slices;
 // returned joined fragment is the program ticket's allocation, never cached.
 const specializationText=product(sum([sourceCharacters,sourceCharacters,sourceCharacters,sourceCharacters,sourceCharacters,s.parameterCharacters,s.identifierCharacters]),2);
 const specializationScratch=sum([specializationText,specializationContainers]);
 const assemblyExtra=sum([product(Math.max(0,bounds.assemblyCharactersUpperBound-sourceCharacters),2),bounds.assemblyMetadataBytesUpperBound??0]);
 // The generic family parser/specializer above never runs for 'custom'; the
 // assembly phase precedes that call and ends before it starts.
 const customPhases=options.analysis==='custom'?currentPaintProgramPhases(sourceCharacters,s,{object,array,map,set,slot:p.propertySlotBytes},N):undefined;
 const scratchBytesEstimate=options.prepared
  ?customPhases?.peak??specializationScratch
  :customPhases?Math.max(assemblyExtra,customPhases.peak):Math.max(analysisScratch,specializationScratch,assemblyExtra);
 const retainedBytesEstimate=sum([sourceBytesEstimate,entryMetadataBytesEstimate,analysisBytesEstimate]);
 return Object.freeze({sourceBytesEstimate,entryMetadataBytesEstimate,analysisBytesEstimate,scratchBytesEstimate,retainedBytesEstimate,peakBytesEstimate:sum([retainedBytesEstimate,scratchBytesEstimate]),policy:p.id,...(customPhases?{customPhases}:{})});
}
type ContainerAllowance={object:(fields:number,n?:number)=>number;array:(headers:number,slots:number)=>number;map:(headers:number,entries:number)=>number;set:(headers:number,entries:number)=>number;slot:number};
/** One current-paint-program analysis on an assembled source of L characters
 * (current-paint-program.ts). Its phases run strictly in order and every
 * phase's temporaries are locals of a function that has returned before the
 * next phase starts; only the analysis R crosses phases. A caller may hold one
 * earlier fragment of the same source (<= L) meanwhile: tier300 builds its
 * fragment, then runs paintedFacadeDepthEffects as a second analysis.
 *  functions(): the masked copy plus one signature match and its captures, or
 *    the comment-mask builder with one comment and its replacement: 3L.
 *  prepare() callsIn, one range at a time: body slice, its mask (or the mask
 *    builder) and the matched call spellings/captures: 4b <= 4L, <= C matches.
 *  dispatchContexts(), one verified caller at a time: the masked body with one
 *    argument slice and its stripped copy, or slice plus mask builder: 4L.
 *  narrowed(), one wrapper at a time: narrowBody holds the body and its mask
 *    plus one guard or statement x with at most four derived texts (replaced
 *    spelling, tokens, joined and stripped copies; or the mask builder and the
 *    trimmed slices): 2b+5x <= 7L, <= one token per guard character. callsIn on
 *    the narrowed body runs after narrowBody returned (the callsIn phase size).
 *  specializedFragment(): chunk copies (<= L) plus one wrapper header,
 *    header+body and closed concatenation (<= 2L): 3L.
 *  depthEffects(): the joined fragment (<= L) while one body is masked: 5L,
 *    with that fragment as the held one.
 * Every other phase adds the held fragment: functions 4L, calls 5L, dispatch
 * 5L, narrow 8L, fragment 4L.
 * R is the ranges, names, byName groups, call lists, dispatch contexts,
 * narrowed bodies (<= L), narrowed call lists and the result/closure objects:
 * L+3 identifier texts. It is charged in every phase. Without a family value
 * every custom caller returns the assembled source itself (tier300 refuses)
 * and runs no phase. */
function currentPaintProgramPhases(L:number,s:ShaderSourceSyntaxBounds,c:ContainerAllowance,familyValues:number):CurrentPaintProgramPhaseEstimate{
 const F=s.functionRanges,C=s.callSites,id=s.identifierCharacters,text=(characters:number)=>product(characters,2);
 if(!familyValues)return Object.freeze({analysis:0,functions:0,calls:0,dispatch:0,narrow:0,fragment:0,depth:0,peak:0,model:CURRENT_PAINT_PROGRAM_ANALYSIS_MODEL});
 const analysis=sum([text(sum([L,id,id,id])),c.object(4,F),c.object(4,2),c.object(3),c.array(sum([1,F,F,F]),sum([F,F,C,C])),c.map(5,product(F,5)),c.set(1,F)]);
 // matchAll spread array, <= C exec arrays (two elements each plus index,
 // input and groups), map and filter arrays and the deduplicating Set; prepare
 // also maps the ranges to their names once.
 const callContainers=sum([c.array(sum([3,C]),product(C,5)),c.set(1,C),product(product(C,3),c.slot),c.array(1,F)]);
 const held=text(L);
 const functions=sum([analysis,held,text(product(L,3)),c.array(1,4),product(3,c.slot)]);
 const calls=sum([analysis,held,text(product(L,4)),callContainers]);
 // Chain tuples, incoming/definition filters and one RegExp with its exec array.
 const dispatch=sum([analysis,held,text(product(L,4)),c.array(13,sum([product(F,2),48])),product(3,c.slot),c.object(8)]);
 // Guard tokens, the precedence table, the parser closures and the wrapper filter.
 const narrow=sum([analysis,held,text(product(L,7)),c.array(1,L),c.object(12),c.object(4,2),c.array(1,F)]);
 const fragment=sum([analysis,held,text(product(L,3)),c.set(1,F),c.array(1,sum([C,1])),c.array(1,sum([product(F,2),1]))]);
 const depth=sum([analysis,text(product(L,5)),c.set(1,F),c.array(1,sum([C,1]))]);
 return Object.freeze({analysis,functions,calls,dispatch,narrow,fragment,depth,peak:Math.max(functions,calls,dispatch,narrow,fragment,depth),model:CURRENT_PAINT_PROGRAM_ANALYSIS_MODEL});
}
export function shaderSourceWorkspaceCosts(bounds:ShaderSourceBounds,identities:ShaderSourceBudgetIdentities,options:ShaderSourceWorkspaceEstimateOptions&{sourceCharacters?:number;retained?:boolean}={}):readonly ResourceBudgetCost[]{
 const estimate=estimateShaderSourceWorkspace(bounds,options.sourceCharacters,options);
 return Object.freeze([
  Object.freeze({category:'program-source' as const,bytes:estimate.sourceBytesEstimate,precision:'estimate' as const,identity:identities.text,label:'workspace assembled source: logical UTF16'}),
  Object.freeze({category:'metadata' as const,bytes:sum([estimate.entryMetadataBytesEstimate,estimate.analysisBytesEstimate]),precision:'estimate' as const,identity:identities.metadata,label:options.analysis==='custom'?'source entry only; custom analysis is transient':('source entry, masked text and parser containers: '+estimate.policy)}),
  Object.freeze({category:'construction' as const,bytes:options.retained?0:estimate.scratchBytesEstimate,precision:'estimate' as const,identity:identities.scratch,label:'workspace assembly/analysis transient envelope'}),
 ]);
}
