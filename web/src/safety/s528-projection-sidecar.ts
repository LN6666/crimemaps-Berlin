import type {BuildingComponent} from './building-mesh-renderer';
import {makeAdapter,type ProjectionResult} from './s528-projection-math.mjs';
import {S528_PROJECTION_PINS} from './s528-projection-pins';
import {boundedBufferSHA256} from './s528-projection-sha256';
export type S528ProjectionBinding={leafSHA:(c:BuildingComponent)=>string|undefined;frozen?:(c:BuildingComponent)=>boolean};
const derive=makeAdapter(S528_PROJECTION_PINS),ids=new Set<string>(S528_PROJECTION_PINS.map(p=>p.partId));
export function s528ProjectionCandidate(c:BuildingComponent){return ids.has(c.partId);}
export function assertNoS528RawConsumerBindings(consumers:unknown){
 const objects=new Set<string>(S528_PROJECTION_PINS.map(p=>p.objectId)),seen=new Set<object>();let budget=0;
 function walk(v:unknown,depth:number){if(++budget>50000||depth>20)throw Error('S528 consumer inspection bound');if(typeof v==='string'){if(ids.has(v)||objects.has(v))throw Error('S528 raw consumer binding collision');return;}if(!v||typeof v!=='object'||ArrayBuffer.isView(v)||seen.has(v))return;seen.add(v);for(const x of Object.values(v))walk(x,depth+1);}
 walk(consumers,0);
}
export function prepareS528Packing(components:readonly BuildingComponent[],binding:S528ProjectionBinding|undefined,consumers:unknown){
 const entries=new Map<BuildingComponent,ProjectionResult>();const active=components.filter(c=>s528ProjectionCandidate(c)&&!binding?.frozen?.(c));if(!active.length)return entries;
 if(!binding)throw Error('S528 verified native leaf binding required');assertNoS528RawConsumerBindings(consumers);
 for(const c of active){const result=derive(c,{sourceLeafSHA256:binding.leafSHA(c),hashBytes:boundedBufferSHA256});if(!result.optedIn)throw Error('S528 optin unexpectedly omitted');entries.set(c,result);}
 return entries;
}
export function s528ProjectionProvenance(entries:ReturnType<typeof prepareS528Packing>){return [...entries.values()].map(r=>({objectId:r.raw.objectId,partId:r.raw.partId,rawSignature:r.rawSignature,derivedSignature:r.derivedSignature,sourceLeafSHA256:r.sourceLeafSHA256,projection:r.projection,rawArraysRetained:true}));}
export function snapshotS528Paint(components:readonly BuildingComponent[],progressive:Float32Array,paint:Float32Array){let offset=0;const windows:{offset:number;count:number;progressive:Float32Array;paint:Float32Array}[]=[];for(const c of components){const count=c.batches.reduce((n,b)=>n+b.positions.length/3,0);if(s528ProjectionCandidate(c))windows.push({offset,count,progressive:progressive.slice(offset*4,(offset+count)*4),paint:paint.slice(offset*5,(offset+count)*5)});offset+=count;}return windows;}
export function assertS528PaintUnmasked(windows:ReturnType<typeof snapshotS528Paint>,progressive:Float32Array,paint:Float32Array){for(const w of windows){if(!w.progressive.every((v,i)=>Object.is(v,progressive[w.offset*4+i]))||!w.paint.every((v,i)=>Object.is(v,paint[w.offset*5+i])))throw Error('S528 raw paint/coface mask collision');}}
