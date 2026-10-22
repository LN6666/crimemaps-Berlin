import type {SourceRule} from './reference-registry-matcher';
export type {SourceRule};
export const REFERENCE_RULE_BYTES_LIMIT = 8 * 1024 * 1024;
const cities = new Set(['berlin','bremen','cologne','dortmund','dresden','dusseldorf','essen','frankfurt','hamburg','hannover','leipzig','munich','nuremberg','stuttgart']);
export interface ReferenceRuleRef {path:string;sha256:string;bytes:number;ruleCount:number;}
export class ReferenceRulesError extends Error {readonly code:string;constructor(code:string){super(`Reference rules unavailable: ${code}`);this.code=code;this.name='ReferenceRulesError';}}
function fail(code:string):never{throw new ReferenceRulesError(code);}
function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
function integer(v:unknown,min:number,max:number):v is number{return typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;}
function text(v:unknown):v is string{return typeof v==='string'&&v.length>0&&v.length<=262144;}
function stringList(v:unknown):v is string[]{return Array.isArray(v)&&v.length<=4096&&v.every(text);}
function fieldPath(v:string):boolean{return v.split('.').every(k=>!!k&&!['__proto__','prototype','constructor'].includes(k));}
/** Lossless pool decoding, no normalization, no inferred rule or geography membership. */
export function decodeReferenceRules(bytes:Uint8Array,expectedCity:string):SourceRule[]{
 if(!cities.has(expectedCity))fail('city');
 if(bytes.byteLength===0||bytes.byteLength>REFERENCE_RULE_BYTES_LIMIT)fail('byte-limit');
 let raw:unknown;try{raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('json');}
 if(!record(raw)||raw.schemaVersion!==1||raw.format!=='civiflux-reference-rules-pool-v1'||raw.city!==expectedCity)fail('envelope');
 if(!integer(raw.ruleCount,1,4096)||!Array.isArray(raw.rules)||raw.rules.length!==raw.ruleCount||!Array.isArray(raw.strings)||raw.strings.length>65536)fail('counts');
 const pool=raw.strings;if(!pool.every(v=>typeof v==='string'&&v.length<=262144)||new Set(pool).size!==pool.length)fail('string-pool');
 const stringAt=(i:unknown):string=>integer(i,0,pool.length-1)?pool[i] as string:fail('pool-index');
 let nodes=0;
 const decode=(v:unknown,depth:number):unknown=>{
  if(++nodes>200000||depth>32)fail('structure-limit');
  if(v===null||typeof v==='boolean')return v;
  if(typeof v==='number'){if(!Number.isFinite(v))fail('number');return v;}
  if(!Array.isArray(v)||v.length<1)fail('encoded-value');
  if(v[0]===0){if(v.length!==2)fail('string-tuple');return stringAt(v[1]);}
  if(v[0]===1)return v.slice(1).map(x=>decode(x,depth+1));
  if(v[0]===2){const obj:Record<string,unknown>={};for(const entry of v.slice(1)){
   if(!Array.isArray(entry)||entry.length!==2)fail('object-entry');
   const key=stringAt(entry[0]);if(Object.hasOwn(obj,key)||['__proto__','constructor','prototype'].includes(key))fail('object-key');
   Object.defineProperty(obj,key,{value:decode(entry[1],depth+1),writable:true,enumerable:true,configurable:true});
  }return obj;}
  return fail('encoded-tag');
 };
 const rules=raw.rules.map(v=>decode(v,0));
 for(const v of rules){
  if(!record(v)||v.city!==expectedCity||!['local','merged','municipal','regional'].includes(String(v.scope))||!text(v.conceptId))fail('rule-identity');
  if(!record(v.title)||!['zh','en','de'].every(k=>text((v.title as Record<string,unknown>)[k])))fail('title');
  if(!record(v.equals)||Object.keys(v.equals).length===0||Object.keys(v.equals).length>128||!Object.entries(v.equals).every(([key,value])=>fieldPath(key)&&(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))))fail('equals');
  if(!stringList(v.requiredAbsent)||!v.requiredAbsent.every(fieldPath)||!stringList(v.levels))fail('field-lists');
  if(Object.hasOwn(v,'scopeId')&&v.scopeId!==null&&!text(v.scopeId))fail('scope-id');
  if(!record(v.sourceEvidence)||Object.keys(v.sourceEvidence).length===0)fail('source-evidence');
 }
 return rules as unknown as SourceRule[];
}
/** SHA/length gate belongs to loader; malformed input produces a controlled error. No fetch here. */
export async function verifyDecodeReferenceRules(bytes:Uint8Array,city:string,ref:ReferenceRuleRef):Promise<SourceRule[]>{
 if(!integer(ref.bytes,1,REFERENCE_RULE_BYTES_LIMIT)||bytes.byteLength!==ref.bytes||!integer(ref.ruleCount,1,4096)||!/^\/[a-zA-Z0-9_./-]+$/.test(ref.path)||!ref.path.startsWith('/safety/geography/reference-rules/')||!/^[a-f0-9]{64}$/.test(ref.sha256)||!ref.path.endsWith(`${city}-${ref.sha256}.json`))fail('reference');
 const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer);
 if(Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')!==ref.sha256)fail('sha256');
 const rules=decodeReferenceRules(bytes,city);if(rules.length!==ref.ruleCount)fail('rule-count');return rules;
}
/** Resolve only the requested city from a small mutable manifest; city payloads stay immutable. */
export function referenceRuleManifestRef(value:unknown,city:string):ReferenceRuleRef{
 if(!cities.has(city)||!record(value)||value.schemaVersion!==1||value.format!=='civiflux-reference-rules-manifest-v1'||typeof value.sourceRegistrySha256!=='string'||!/^[a-f0-9]{64}$/.test(value.sourceRegistrySha256)||!record(value.cities)||Object.keys(value.cities).length!==cities.size)fail('manifest');
 let total=0;
 for(const [name,r] of Object.entries(value.cities)){
  if(!cities.has(name)||!record(r)||!integer(r.bytes,1,REFERENCE_RULE_BYTES_LIMIT)||!integer(r.ruleCount,1,4096)||typeof r.sha256!=='string'||!/^[a-f0-9]{64}$/.test(r.sha256)||r.path!==`/safety/geography/reference-rules/${name}-${r.sha256}.json`)fail('manifest-reference');
  total+=r.ruleCount;
 }
 if(value.totalRules!==total)fail('manifest-total');
 const r=value.cities[city] as unknown as ReferenceRuleRef;
 return {path:r.path,sha256:r.sha256,bytes:r.bytes,ruleCount:r.ruleCount};
}
