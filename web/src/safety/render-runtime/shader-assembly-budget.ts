import {RESIDENT_REFLECTION_CLIP_BODY,RESIDENT_REFLECTION_CLIP_DECLARATIONS} from '../resident-planar-reflection';
import {deferredShaderSourcePart,joinShaderSourceParts,markShaderSourceDescriptor,normalizeShaderSourceBounds,shaderSourceBounds,shaderSourcePartInterpolates,type ShaderSourceBounds,type ShaderSourcePart} from './shader-source-budget';

// One provenance marker per raw bound object. Joins concatenate authority
// traces and trace-preserving wrappers (City's hook descriptor) keep them, so
// a wrapped shell still names the raw descriptor it was built around.
const RAW_DESCRIPTOR_MARKER='raw-paint-descriptor#';
const rawDescriptorMarkers=new WeakMap<ShaderSourceBounds,string>();let rawDescriptorSequence=0;
function rawDescriptorMarker(bounds:ShaderSourceBounds){
 let marker=rawDescriptorMarkers.get(bounds);if(!marker){marker=RAW_DESCRIPTOR_MARKER+String(++rawDescriptorSequence);rawDescriptorMarkers.set(bounds,marker);}return marker;
}

/** Descriptor only. Reading a bound must never emit the deferred paint source. */
export function shaderSourceBoundPart(bounds:ShaderSourceBounds,authority:object):ShaderSourcePart{
 const part=deferredShaderSourcePart({charactersUpperBound:bounds.sourceCharactersUpperBound,emissionCharactersUpperBound:bounds.assemblyCharactersUpperBound,syntaxUpperBound:bounds.syntaxUpperBound,authority,authorityTrace:[...bounds.authorityTrace,rawDescriptorMarker(bounds)],build(){throw Error('Shader budget descriptor cannot emit paint source');}});
 markShaderSourceDescriptor(part,bounds);return part;
}

/** How the shell's declared emission envelope relates to raw's assembly:
 * - 'joined': a tagged template/join interpolates shaderSourceBoundPart(raw)
 *   (possibly through nested joins). Its envelope is its result, literals and
 *   every interpolated part's own envelope, so raw.assembly is already in it.
 * - 'wrapped': an opaque descriptor whose trace still names that raw
 *   descriptor and whose envelope covers raw.assembly (City's hooks). Its
 *   envelope covers the wrapped shell, but during the wrapper's own stages the
 *   caller may still hold the paint text (<= raw source) and the wrapper's
 *   driver the wrapped shell's output F0 (applyCityShaderHooks keeps its source
 *   parameter through every later stage, outside each stage's own envelope).
 * - 'opaque': nothing proves containment; raw.assembly is added as before. */
function shellRawContainment(raw:ShaderSourceBounds,shell:ShaderSourcePart):'joined'|'wrapped'|'opaque'{
 const emission=shell.emissionCharactersUpperBound;
 if(emission===undefined||emission<raw.assemblyCharactersUpperBound)return 'opaque';
 if(shaderSourcePartInterpolates(shell,raw))return 'joined';
 const marker=rawDescriptorMarkers.get(raw);
 return marker!==undefined&&shell.authorityTrace.includes(marker)?'wrapped':'opaque';
}

/** shell comes from the same tagged template that emits the real fragment.
 * Clipping only inserts these two literal strings; dead-function pruning only
 * removes ranges. Neither transformation runs while describing this budget. */
export function describeShaderAssemblyBounds(raw:ShaderSourceBounds,shell:ShaderSourcePart,options:{prune?:boolean;reflectionClip?:boolean}={}):ShaderSourceBounds{
 const paint=shaderSourceBoundPart(raw,raw),assembled=options.reflectionClip?joinShaderSourceParts([shell,RESIDENT_REFLECTION_CLIP_DECLARATIONS,RESIDENT_REFLECTION_CLIP_BODY]):shell;
 const size=shell.charactersUpperBound,finalSize=assembled.charactersUpperBound,containment=shellRawContainment(raw,shell);
 // Raw emission and shell interpolation coexist. The paint builder's own
 // temporaries end before the shell emits; a shell around this raw descriptor
 // already counts raw.assembly once next to its literals and joined result, so
 // it is added only for an opaque shell. A replace may retain the input,
 // prefix/suffix slices and result. The pruner additionally holds two
 // comment-cleaning strings, outside text, body/range slices and result text.
 // A wrapped shell's envelope covers the wrapped joined shell, whose own
 // envelope is at least its output F0 plus raw.assembly; so emission minus
 // raw.assembly bounds the F0 its driver keeps, without relying on the clip.
 const wrappedOutput=containment==='wrapped'?shell.emissionCharactersUpperBound!-raw.assemblyCharactersUpperBound:0;
 const shellEnvelope=containment==='joined'?shell.emissionCharactersUpperBound!:containment==='wrapped'?shell.emissionCharactersUpperBound!+raw.sourceCharactersUpperBound+wrappedOutput:raw.assemblyCharactersUpperBound+(shell.emissionCharactersUpperBound??size);
 const assembly=shellEnvelope+(options.prune?7*size:0)+(options.reflectionClip?3*finalSize:0);
 const base=shaderSourceBounds(paint,{assembled,assemblyCharactersUpperBound:assembly,authorityTrace:[...raw.authorityTrace,'renderer-tagged-shell-v1',...(containment==='joined'?['shell-envelope-counts-raw-assembly-once']:containment==='wrapped'?['wrapped-shell-envelope-plus-raw-text-and-held-shell-output']:[]),...(options.prune?['owner-pruner-removes-ranges']:[]),...(options.reflectionClip?['resident-reflection-literal-insertion']:[])],policy:raw.policy});
 const policy=base.policy!;
 // clean.split('') creates one array slot and a logical one-character string
 // per input character. This is a logical allowance, not measured engine heap.
 const prunerArray=options.prune?policy.arrayHeaderBytes+size*(policy.arrayElementBytes+2):0;
 return normalizeShaderSourceBounds({...base,authorityTrace:base.authorityTrace.filter(value=>!value.startsWith(RAW_DESCRIPTOR_MARKER)),assemblyMetadataBytesUpperBound:(raw.assemblyMetadataBytesUpperBound??0)+prunerArray});
}
