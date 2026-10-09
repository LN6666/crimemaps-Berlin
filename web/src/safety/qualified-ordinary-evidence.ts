import {verifyDecodeReferenceRules,type ReferenceRuleRef} from './reference-rules-decoder';
import type {SourceRule}from './reference-registry-matcher';
export interface EvidenceRef{path:string;sha256:string;bytes:number;evidenceCount:number;}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function fail():never{throw Error('Qualified source evidence unavailable');}
const aborted=(signal?:AbortSignal)=>{if(signal?.aborted)throw new DOMException('Qualified evidence cancelled','AbortError');};
export async function verifyQualifiedEvidence(bytes:Uint8Array,city:string,ref:EvidenceRef,signal?:AbortSignal):Promise<Record<string,unknown>[]>{
 aborted(signal);if(!Number.isSafeInteger(ref.bytes)||ref.bytes<1||ref.bytes>400000||bytes.byteLength!==ref.bytes||!Number.isSafeInteger(ref.evidenceCount)||ref.evidenceCount<1||ref.evidenceCount>4096||ref.path!==`/safety/geography/reference-qualified/${city}-${ref.sha256}-evidence.json`||!/^[a-f0-9]{64}$/.test(ref.sha256))fail();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer)),x=>x.toString(16).padStart(2,'0')).join('');aborted(signal);if(digest!==ref.sha256)fail();
 let raw:unknown;try{raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail();}
 if(!record(raw)||raw.schemaVersion!==1||raw.format!=='civiflux-reference-evidence-pool-v1'||raw.city!==city||raw.evidenceCount!==ref.evidenceCount||!Array.isArray(raw.strings)||raw.strings.length>65536)fail();const strings=raw.strings;if(!strings.every(s=>typeof s==='string'&&s.length<=262144)||new Set(strings).size!==strings.length)fail();let nodes=0;
 const stringAt=(i:unknown):string=>Number.isInteger(i)&&Number(i)>=0&&Number(i)<strings.length?strings[Number(i)]as string:fail();
 const decode=(v:unknown,depth:number):unknown=>{if(++nodes>200000||depth>32)fail();if(v===null||typeof v==='boolean')return v;if(typeof v==='number')return Number.isFinite(v)?v:fail();if(!Array.isArray(v)||!v.length)fail();if(v[0]===0)return v.length===2?stringAt(v[1]):fail();if(v[0]===1)return v.slice(1).map(x=>decode(x,depth+1));if(v[0]===2){const o:Record<string,unknown>={};for(const e of v.slice(1)){if(!Array.isArray(e)||e.length!==2)fail();const k=stringAt(e[0]);if(Object.hasOwn(o,k)||['__proto__','constructor','prototype'].includes(k))fail();Object.defineProperty(o,k,{value:decode(e[1],depth+1),enumerable:true,writable:true,configurable:true});}return o;}return fail();};
 const evidence=decode(raw.evidence,0);if(!Array.isArray(evidence)||evidence.length!==ref.evidenceCount||!evidence.every(e=>record(e)&&Object.keys(e).length))fail();aborted(signal);return evidence as Record<string,unknown>[];
}
/** No fetch and no runtime mutation. Verify only requested rule evidence; the caller owns
 * selected-city loading, source-predicate preselection, bounded caches and cancellation.
 * Never pass compact rules to a matcher as a substitute for this full-proof hydration. */
export async function hydrateOrdinaryRules(ruleBytes:Uint8Array,city:string,ref:ReferenceRuleRef,evidenceRefs:readonly EvidenceRef[],files:ReadonlyMap<string,Uint8Array>,indices?:readonly number[],signal?:AbortSignal):Promise<SourceRule[]>{
 aborted(signal);const compact=await verifyDecodeReferenceRules(ruleBytes,city,ref);aborted(signal);const chosen=indices??compact.map((_,i)=>i);if(new Set(chosen).size!==chosen.length||!chosen.every(i=>Number.isSafeInteger(i)&&i>=0&&i<compact.length)||evidenceRefs.length>16)fail();const refs=new Map(evidenceRefs.map(r=>[r.path,r]));if(refs.size!==evidenceRefs.length)fail();const needed=new Map<string,EvidenceRef>();for(const i of chosen){const e=compact[i].sourceEvidence;if(!record(e)||e.format!=='sha-bound-evidence-v1'||typeof e.path!=='string'||typeof e.sha256!=='string'||!Number.isSafeInteger(e.index))fail();const r=refs.get(e.path);if(!r||r.sha256!==e.sha256||Number(e.index)<0||Number(e.index)>=r.evidenceCount)fail();needed.set(e.path,r);}
 const decoded=new Map<string,Record<string,unknown>[]>();for(const[p,r]of needed){const b=files.get(p);if(!b)fail();decoded.set(p,await verifyQualifiedEvidence(b,city,r,signal));}aborted(signal);return chosen.map(i=>{const rule=compact[i],e=rule.sourceEvidence as {path:string;index:number};return{...rule,sourceEvidence:decoded.get(e.path)![e.index]};});
}
