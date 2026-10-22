import type {S767Component} from './s767-display-profile';
import {C281_INDOOR_EXPECTED} from './c281-indoor-display-constants';
function nativePaintSignature(c:S767Component){let h=2166136261;const add=(v:Uint8Array)=>{for(const n of v)h=Math.imul(h^n,16777619)>>>0},enc=new TextEncoder();add(enc.encode(JSON.stringify([c.origin,c.componentGeometry])));for(const b of c.batches)for(const k of ['positions','normals','indices']as const){add(enc.encode(k));const v=new Uint8Array(b[k].length*4),d=new DataView(v.buffer);for(let j=0;j<b[k].length;j++)if(k==='indices')d.setUint32(j*4,b[k][j],true);else d.setFloat32(j*4,b[k][j],true);add(v)}return h.toString(16).padStart(8,'0');}
type Expected=typeof C281_INDOOR_EXPECTED[number];
export type C281IndoorDisplayProfile={readonly objectId:string;readonly partId:string;readonly signature:string;readonly excludedBatchIndices:readonly number[];readonly preferredBatchIndices:readonly number[];readonly reason:'exact-negative-level-indoor-platform-default-shell';readonly geometryArraysModified:false;readonly sourceLeafSHA256:string};
const verified=new WeakMap<S767Component,{expected:Expected;profile:C281IndoorDisplayProfile}>();
const matching=(c:S767Component,e:Expected)=>c.city===e.city&&c.objectId===e.objectId&&c.partId===e.partId;
function roleMatches(c:S767Component,e:Expected){const t=c.sourceFeature?.properties;return t?.indoor==='yes'&&t.level===e.properties.level&&Number(t.level)<0&&t.levelpart==='elevator_platform'&&Object.entries(e.properties).every(([k,v])=>t[k]===v);}
function shapeMatches(c:S767Component,e:Expected){try{return matching(c,e)&&roleMatches(c,e)&&c.batches.length===e.batches.length&&JSON.stringify(c.origin)===JSON.stringify(e.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(e.geometry)&&nativePaintSignature(c)===e.signature;}catch{return false}}
async function sha(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer)),x=>x.toString(16).padStart(2,'0')).join('');}
export async function prepareC281IndoorDisplay(c:S767Component,sourceLeafSHA256:string,signal:AbortSignal):Promise<C281IndoorDisplayProfile|null>{
 verified.delete(c);const e=C281_INDOOR_EXPECTED.find(e=>matching(c,e));if(!e||sourceLeafSHA256!==e.sourceLeafSHA256||!shapeMatches(c,e))return null;
 signal.throwIfAborted();for(const [i,b]of c.batches.entries()){
  if(b.positions.length/3!==e.batches[i].vertexCount||b.indices.length!==e.batches[i].indexCount)return null;
  for(const k of ['positions','normals','indices'] as const){const bytes=new Uint8Array(b[k].length*4),dv=new DataView(bytes.buffer);for(let j=0;j<b[k].length;j++)if(k==='indices')dv.setUint32(j*4,b[k][j],true);else dv.setFloat32(j*4,b[k][j],true);if(await sha(bytes)!==e.batches[i][`${k}SHA256`])return null;signal.throwIfAborted();}
 }
 if(!shapeMatches(c,e))return null;
 const profile=Object.freeze({objectId:e.objectId,partId:e.partId,signature:e.signature,excludedBatchIndices:Object.freeze(c.batches.map((_,i)=>i)),preferredBatchIndices:Object.freeze([]),reason:'exact-negative-level-indoor-platform-default-shell' as const,geometryArraysModified:false as const,sourceLeafSHA256});verified.set(c,{expected:e,profile});return profile;
}
export function c281IndoorDisplayProfile(c:S767Component){const p=verified.get(c);if(!p)return null;if(!shapeMatches(c,p.expected)){verified.delete(c);return null}return p.profile;}
export function c281IndoorBatchIncluded(c:S767Component,index:number){const p=c281IndoorDisplayProfile(c);return !p||!p.excludedBatchIndices.includes(index);}
