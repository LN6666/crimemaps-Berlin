import {S767_EXPECTED as E} from './s767-display-proof-constants';
type ArrayLikeNumbers={readonly length:number;readonly [index:number]:number};
export type S767Component={city:string;objectId:string;partId:string;origin:readonly number[];componentGeometry:unknown;sourceFeature:{properties?:Record<string,unknown>|null};batches:readonly {positions:ArrayLikeNumbers;normals:ArrayLikeNumbers;indices:ArrayLikeNumbers}[]};
export type S767Attestation={sourceLeafSHA256:string;parentSourceLine:string;preferredPartSourceLine:string};
export type S767DisplayProfile={readonly objectId:string;readonly partId:string;readonly signature:string;readonly excludedBatchIndices:readonly [2,3];readonly preferredBatchIndices:readonly [0,1];readonly reason:'specific-original-building-part-over-parent-roof';readonly geometryArraysModified:false};
const encoder=new TextEncoder();
async function sha(bytes:Uint8Array){const digest=await crypto.subtle.digest('SHA-256',bytes.slice().buffer);return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');}
function arrayBytes(b:S767Component['batches'][number]){const fields=['positions','normals','indices'] as const;const length=fields.reduce((n,k)=>n+encoder.encode(k).length+b[k].length*4,0),bytes=new Uint8Array(length);let o=0;const view=new DataView(bytes.buffer);for(const k of fields){const label=encoder.encode(k);bytes.set(label,o);o+=label.length;for(let i=0;i<b[k].length;i++){if(k==='indices')view.setUint32(o,b[k][i],true);else view.setFloat32(o,b[k][i],true);o+=4;}}return bytes;}
function signature(c:S767Component){let h=2166136261;const add=(bs:Uint8Array)=>{for(const x of bs)h=Math.imul(h^x,16777619)>>>0;};add(encoder.encode(JSON.stringify([c.origin,c.componentGeometry])));for(const b of c.batches)add(arrayBytes(b));return h.toString(16).padStart(8,'0');}
/** Load-time only. Fail closed to the unchanged original display. A caller must
 * use the returned batch exclusions consistently for draw, pick and display bounds.
 * The leaf SHA comes from the builder's verified original-gzip manifest, not a
 * guessed URL. The raw source lines are hashed here and their roles checked. */
export async function prepareS767DisplayProfile(c:S767Component,a:S767Attestation):Promise<S767DisplayProfile|null>{
 if(c.city!==E.city||c.objectId!==E.objectId||c.partId!==E.partId||c.batches.length!==4||a.sourceLeafSHA256!==E.sourceLeafSHA256)return null;
 if(signature(c)!==E.nativeSignature)return null;
 const parentSHA=await sha(encoder.encode(a.parentSourceLine)),partSHA=await sha(encoder.encode(a.preferredPartSourceLine));if(parentSHA!==E.parentSourceSHA256||partSHA!==E.preferredPartSourceSHA256)return null;
 let parent,part;try{parent=JSON.parse(a.parentSourceLine);part=JSON.parse(a.preferredPartSourceLine);}catch{return null;}
 if(parent.objectId!==E.objectId||parent.partId!==E.partId||parent.osmTags?.height!=='44'||parent.osmTags?.['roof:height']!=='43'||parent.osmTags?.['roof:shape']!=='pyramidal')return null;
 if(part.objectId!=='osm/way/311500783'||part.osmTags?.['building:part']!=='tower'||part.osmTags?.height!=='44'||part.osmTags?.['roof:height']!=='9'||part.osmTags?.['roof:colour']!=='#8c6950')return null;
 const tags=c.sourceFeature.properties;if(tags?.height!=='44'||tags?.['roof:height']!=='43'||tags?.['roof:shape']!=='pyramidal')return null;
 for(let i=0;i<4;i++){if(c.batches[i].positions.length/3!==E.batchVertices[i]||await sha(arrayBytes(c.batches[i]))!==E.batchArraySHA256[i])return null;}
 return Object.freeze({objectId:E.objectId,partId:E.partId,signature:E.nativeSignature,excludedBatchIndices:Object.freeze([2,3] as const),preferredBatchIndices:Object.freeze([0,1] as const),reason:'specific-original-building-part-over-parent-roof' as const,geometryArraysModified:false as const});
}
export function s767DisplayBatchIncluded(profile:S767DisplayProfile|null,batchIndex:number){return !profile||!profile.excludedBatchIndices.some(i=>i===batchIndex);}
