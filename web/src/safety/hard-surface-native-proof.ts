import type {EnvironmentFeature} from './environment-scene-data';
import {hardSurfaceDisplayDecision} from './environment-hard-surface-display';
import {REVIEWED_HARD_SURFACES} from './hard-surface-display-policy';

/** Reproduce the cohort owner's groundOverviewJSON encoding, including sorted
 * object keys, array order and negative zero. The caller reserves the writer,
 * encoder and digest working set from the same page ResourceBudget first. A
 * failed, unsupported or over-bound proof never authorizes a native surface. */
export function hasHardSurfaceNativeCandidate(feature:EnvironmentFeature):boolean{
 return !!feature?.properties?.osmTags&&typeof feature.properties.osmTags==='object'&&hardSurfaceDisplayDecision(feature)==='declared-paving-ground';
}
export async function hardSurfaceNativeCanonicalDigest(value:unknown,capacity:number,signal:AbortSignal):Promise<string|undefined>{
 if(!Number.isSafeInteger(capacity)||capacity<1||capacity>4*1024**2||!globalThis.crypto?.subtle)return undefined;
 const encoder=new TextEncoder(),bytes=new Uint8Array(capacity);let written=0;
 function emit(text:string){const result=encoder.encodeInto(text,bytes.subarray(written));if(result.read!==text.length)throw Error('Native hard surface digest exceeds admitted bound');written+=result.written;}
 function write(input:unknown,depth:number):void{
  if(depth>40)throw Error('Native hard surface source nesting exceeds bound');
  if(input===null){emit('null');return;}
  if(typeof input==='number'){if(!Number.isFinite(input))throw Error('Non-finite native hard surface source');emit(Object.is(input,-0)?'-0':String(input));return;}
  if(typeof input==='string'||typeof input==='boolean'){emit(JSON.stringify(input));return;}
  if(Array.isArray(input)){emit('[');for(let i=0;i<input.length;i++){if(i)emit(',');write(input[i],depth+1);}emit(']');return;}
  if(input&&typeof input==='object'){emit('{');const object=input as Record<string,unknown>,keys=Object.keys(object).sort();for(let i=0;i<keys.length;i++){if(i)emit(',');emit(JSON.stringify(keys[i]));emit(':');write(object[keys[i]],depth+1);}emit('}');return;}
  throw Error('Non-JSON native hard surface source');
 }
 try{
  signal.throwIfAborted();write(value,0);const digest=await crypto.subtle.digest('SHA-256',bytes.subarray(0,written));signal.throwIfAborted();
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 }catch(error){if(signal.aborted)throw error;return undefined;}
}
export async function verifyHardSurfaceNativeFeature(feature:EnvironmentFeature,capacity:number,signal:AbortSignal):Promise<boolean>{
 const row=REVIEWED_HARD_SURFACES.find(item=>item.id===feature.id&&item.decision==='declared-paving-ground');
 if(!row||!hasHardSurfaceNativeCandidate(feature))return false;
 return await hardSurfaceNativeCanonicalDigest(feature,capacity,signal)===row.sourceFeatureSHA256;
}
