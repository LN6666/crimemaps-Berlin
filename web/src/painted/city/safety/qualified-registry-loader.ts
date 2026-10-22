import {matchesSourceRule,referenceObservation,type SourceContext,type SourceRule} from './reference-registry-matcher';
import {verifyDecodeReferenceRules,type ReferenceRuleRef} from './reference-rules-decoder';
import {verifyQualifiedEvidence,type EvidenceRef} from './qualified-ordinary-evidence';
import {createCanonicalMatcher,expandCanonicalBrowser,type PackedCanonicalRegistry,type CanonicalMatcher} from './qualified-western-adapter';
import {qualifiedEvidenceRefs,qualifiedWesternRefs} from './qualified-registry-descriptors';
import type {ReferenceMetric,Observation,Text} from './reference-fallback';
const LIMIT=1_000_000;
function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
function fail():never{throw Error('Qualified registry unavailable');}
function abort(signal?:AbortSignal){if(signal?.aborted)throw new DOMException('Qualified registry cancelled','AbortError');}
function isCompact(rule:SourceRule){return record(rule.sourceEvidence)&&rule.sourceEvidence.format==='sha-bound-evidence-v1';}
function ordered(v:unknown):unknown{return Array.isArray(v)?v.map(ordered):record(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;}
function unique(rules:readonly SourceRule[]):SourceRule[]{const seen=new Set<string>();return rules.filter(r=>{const key=JSON.stringify(ordered(r));if(seen.has(key))return false;seen.add(key);return true;});}
async function hash(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer)),x=>x.toString(16).padStart(2,'0')).join('');}
/** A controller holds one city. No construction fetch or hash, no whole-city metric hashes,
 * no synthetic method fields. Cache sizes are serialized source bytes, not heap estimates. */
export function createQualifiedRegistryLoader(options:{city:string;fetchBytes:(path:string,signal:AbortSignal)=>Promise<Uint8Array>}){
 let core:SourceRule[]=[],coreBytes=0,compact=false,disposed=false,western:CanonicalMatcher|undefined,westernBytes=0;
 const chunks=new Map<string,{values:Record<string,unknown>[];bytes:number}>(),titles=new Map<string,{conceptId:string;title:Text}>(),westernTitles=new Map<string,Text>();
 const refs=(qualifiedEvidenceRefs as Record<string,readonly EvidenceRef[]>)[options.city]??[];
 const westRef=(qualifiedWesternRefs as Record<string,{path:string;sha256:string;bytes:number}>)[options.city];
 const cacheBytes=()=>coreBytes+westernBytes+[...chunks.values()].reduce((n,v)=>n+v.bytes,0);
 const room=(bytes:number)=>{while(chunks.size&&cacheBytes()+bytes>LIMIT)chunks.delete(chunks.keys().next().value!);if(cacheBytes()+bytes>LIMIT)fail();};
 const proof=async(rule:SourceRule,signal:AbortSignal):Promise<SourceRule>=>{
  const e=rule.sourceEvidence;if(!record(e)||e.format!=='sha-bound-evidence-v1'||typeof e.path!=='string'||typeof e.sha256!=='string'||!Number.isSafeInteger(e.index))fail();
  const ref=refs.find(r=>r.path===e.path&&r.sha256===e.sha256);if(!ref||Number(e.index)<0||Number(e.index)>=ref.evidenceCount)fail();
  let cached=chunks.get(ref.path);if(cached){chunks.delete(ref.path);chunks.set(ref.path,cached);}else{room(ref.bytes);const b=await options.fetchBytes(ref.path,signal);abort(signal);if(disposed)fail();const values=await verifyQualifiedEvidence(b,options.city,ref,signal);abort(signal);if(disposed)fail();room(ref.bytes);cached={values,bytes:b.byteLength};chunks.set(ref.path,cached);}
  return{...rule,sourceEvidence:cached.values[Number(e.index)]};
 };
 const canonical=async(signal:AbortSignal)=>{
  if(western||!westRef||!compact)return;room(westRef.bytes);const b=await options.fetchBytes(westRef.path,signal);abort(signal);if(disposed)fail();if(b.byteLength!==westRef.bytes||b.byteLength>400000||!/^[a-f0-9]{64}$/.test(westRef.sha256)||westRef.path!==`/safety/geography/reference-qualified/${options.city}-${westRef.sha256}-western.json`||await hash(b)!==westRef.sha256)fail();abort(signal);
  let raw:unknown;try{raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));}catch{fail();}if(!record(raw)||raw.city!==options.city)fail();const registry=raw as unknown as PackedCanonicalRegistry;const expanded=expandCanonicalBrowser(registry);if(!expanded.length||expanded.some(r=>r.base.city!==options.city))fail();room(b.byteLength);westernBytes=b.byteLength;western=createCanonicalMatcher(registry,options.city);for(const r of expanded)if(!westernTitles.has(r.base.conceptId))westernTitles.set(r.base.conceptId,r.base.title);
 };
 return{
  async setCore(bytes:Uint8Array,ref:ReferenceRuleRef,signal?:AbortSignal){abort(signal);if(disposed||bytes.byteLength>LIMIT)fail();const decoded=await verifyDecodeReferenceRules(bytes,options.city,ref);abort(signal);if(disposed)fail();const count=decoded.filter(isCompact).length;if(count&&count!==decoded.length)fail();core=decoded;compact=count>0;coreBytes=bytes.byteLength;chunks.clear();titles.clear();westernTitles.clear();western=undefined;westernBytes=0;return core;},
  async observe(context:SourceContext,metric:ReferenceMetric,extraRules:readonly SourceRule[],signal:AbortSignal):Promise<Observation|undefined>{
   abort(signal);if(disposed||context.city!==options.city)fail();const possible=core.filter(r=>matchesSourceRule(r,context,metric)),full:SourceRule[]=[];
   for(const r of possible)full.push(compact?await proof(r,signal):r);abort(signal);
   const external=extraRules.filter(r=>!isCompact(r)&&!core.includes(r));const ordinary=unique([...full,...external]);
   let canonicalObservation:Observation|undefined;
   if(compact&&context.scope==='local'&&westRef){await canonical(signal);abort(signal);canonicalObservation=await western?.select(context,metric,signal);abort(signal);}
   const matching=ordinary.filter(r=>matchesSourceRule(r,context,metric));if(matching.length>1||matching.length&&canonicalObservation)fail();
   const original=matching.length?referenceObservation(context,metric,matching):canonicalObservation;
   if(canonicalObservation){const title=westernTitles.get(canonicalObservation.conceptId);if(title)titles.set(canonicalObservation.conceptId,{conceptId:canonicalObservation.conceptId,title});}if(original){if(original.metric!==metric)fail();if(context.level)original.sourceNativeLevel=context.level;}
   return original;
  },
  selectedTitles(){return [...titles.values()];},
  cancel(){titles.clear();},
  destroy(){disposed=true;core=[];coreBytes=0;chunks.clear();titles.clear();westernTitles.clear();western=undefined;westernBytes=0;},
  get serializedCacheBytes(){return cacheBytes();}
 };
}
