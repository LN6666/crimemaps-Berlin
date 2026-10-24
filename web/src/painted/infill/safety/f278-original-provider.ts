const isExplicitStLorenzRepair104=(_row?:unknown)=>false;
import {progressivePaintValidation} from './f278-original-validation';
import {nativePaintSignature} from './f278-original-signature';
const FROZEN_PAINT_IDS=new Set<string>();
import type {BuildingComponent} from './building-mesh-renderer';
import {PROGRESSIVE_ADMISSIONS,PROGRESSIVE_INPUT_SHA} from './f278-original-admissions';
const PROGRESSIVE_FEATURE_SHA='original-bounded-F278';
export const progressivePaintFingerprints={admissionsSHA256:PROGRESSIVE_INPUT_SHA,featuresSHA256:PROGRESSIVE_FEATURE_SHA};
export type PaintRGB=readonly[number,number,number];
export type ProgressiveAdmission={city:string;objectId:string;partId:string;origin:readonly[number,number];descriptionSHA256:string;tier:number;mode:string;family:number;geometrySignature:string;ownerSelectedMaterialPriority?:true;preserveUnboundNeutral?:true;surfaceFrames?:readonly{batchIndex:number;firstVertex:number;vertexCount:number;family:number;uAxis:readonly[number,number,number];vAxis:readonly[number,number,number];uOrigin:number;vOrigin:number;height:number;width:number}[];vertexRanges?:readonly{batchIndex:number;firstVertex:number;vertexCount:number;color:PaintRGB}[];wallColor?:PaintRGB;roofColor?:PaintRGB;batchColors?:Readonly<Record<string,PaintRGB>>};
const admissions=new Map<string,ProgressiveAdmission>();
for(const row of PROGRESSIVE_ADMISSIONS as unknown as readonly ProgressiveAdmission[]){
 if(row.preserveUnboundNeutral!==undefined&&row.preserveUnboundNeutral!==true)throw Error('Invalid unbound neutral preservation');
 if(row.ownerSelectedMaterialPriority!==undefined&&row.ownerSelectedMaterialPriority!==true)throw Error('Invalid owner material priority');
 const key=row.city+'|'+row.objectId+'|'+row.partId;
 if(FROZEN_PAINT_IDS.has(row.objectId)&&!isExplicitStLorenzRepair104(row))throw Error('Frozen test object cannot receive progressive paint');
 if(admissions.has(key)||!/^osm\/(way|relation|node)\/[1-9]\d*$/.test(row.objectId)||!row.origin.every(Number.isFinite)||!/^([a-f0-9]{64})$/.test(row.descriptionSHA256))throw Error('Invalid progressive paint admission');
 for(const color of [row.wallColor,row.roofColor,...Object.values(row.batchColors??{})])if(color&&(!color.every(v=>Number.isFinite(v)&&v>=0&&v<=1)||color.length!==3))throw Error('Invalid progressive paint colour');
 admissions.set(key,row);
}
const rejectedPaintComponents=new WeakSet<BuildingComponent>();
const rejectedPaintRows=new Map<string,{city:string;objectId:string;partId:string;geometrySignature:string;reason:string}>();
export const progressivePaintRejections=()=>[...rejectedPaintRows.values()];
export const isRejectedProgressivePaint=(c:BuildingComponent)=>rejectedPaintComponents.has(c);
export function progressiveAdmission(c:BuildingComponent){
 const k=c.city+'|'+c.objectId+'|'+c.partId,row=admissions.get(k);
 if(!row||!row.origin.every((v,i)=>Math.abs(v-c.origin[i])<1e-10)||row.geometrySignature!==nativePaintSignature(c))return undefined;
 const reason=progressivePaintValidation(c,row);
 if(reason){rejectedPaintComponents.add(c);rejectedPaintRows.set(k,{city:c.city,objectId:c.objectId,partId:c.partId,geometrySignature:row.geometrySignature,reason});return undefined;}
 return row;
}
/** Independent paint attribute: source colours and all native arrays remain untouched. */
type FrameReadback={batchIndex:number;firstVertex:number;vertexCount:number;family:number;uRange:number[];vRange:number[];height:number;width:number;normal:number[]};
function frameReadback(c:BuildingComponent,row:ProgressiveAdmission):FrameReadback[]{return (row.surfaceFrames??[]).map(f=>{const b=c.batches[f.batchIndex],us:number[]=[],vs:number[]=[];for(let j=f.firstVertex;j<f.firstVertex+f.vertexCount;j++){const p=b.positions.slice(j*3,j*3+3);us.push(f.uAxis.reduce((a,v,k)=>a+v*p[k],0)-f.uOrigin);vs.push(f.vAxis.reduce((a,v,k)=>a+v*p[k],0)-f.vOrigin);}return {batchIndex:f.batchIndex,firstVertex:f.firstVertex,vertexCount:f.vertexCount,family:f.family,uRange:[Math.min(...us),Math.max(...us)],vRange:[Math.min(...vs),Math.max(...vs)],height:f.height,width:f.width,normal:Array.from(b.normals.slice(f.firstVertex*3,f.firstVertex*3+3))};});}
let renderRecords:{city:string;objectId:string;partId:string;coloredVertices:number;sourceVertices:number;featureCarrierVertices:number;geometrySignature:string;batchColorBindings:Readonly<Record<string,PaintRGB>>;vertexRangeColors:readonly{batchIndex:number;firstVertex:number;vertexCount:number;color:PaintRGB}[];frameBindings:FrameReadback[]}[]=[];
export const isProgressivelyPainted=(c:{city:string;objectId:string;partId:string})=>renderRecords.some(r=>r.city===c.city&&r.objectId===c.objectId&&r.partId===c.partId&&(r.coloredVertices>0||r.featureCarrierVertices>0));
export const progressiveRenderStatus=()=>renderRecords.map(r=>({...r}));
export function progressivePaintData(components:BuildingComponent[]):Float32Array<ArrayBuffer>{
 renderRecords=[];const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0),out=new Float32Array(count*4);let at=0;
 for(const c of components){const row=progressiveAdmission(c),componentStart=at;c.batches.forEach((b,bi)=>{const color=row?.batchColors?.[String(bi)]??(b.faceRole==='wall'?row?.wallColor:b.faceRole==='roof'?row?.roofColor:undefined);const start=at;for(let j=0;j<b.positions.length;j+=3){if(color)out.set([...color,row?.ownerSelectedMaterialPriority?2:1],at);at+=4;}for(const range of row?.vertexRanges??[]){if(range.batchIndex!==bi)continue;if(!Number.isSafeInteger(range.firstVertex)||!Number.isSafeInteger(range.vertexCount)||range.firstVertex<0||range.vertexCount<1||range.firstVertex+range.vertexCount>b.positions.length/3||range.color.length!==3||!range.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('Invalid native paint range');for(let j=range.firstVertex;j<range.firstVertex+range.vertexCount;j++)out.set([...range.color,row?.ownerSelectedMaterialPriority?2:1],start+j*4);}});if(row){let coloredVertices=0;for(let j=componentStart+3;j<at;j+=4)if(out[j]>.5)coloredVertices++;renderRecords.push({city:c.city,objectId:c.objectId,partId:c.partId,coloredVertices,sourceVertices:(at-componentStart)/4,featureCarrierVertices:new Set((row.surfaceFrames??[]).flatMap(f=>Array.from({length:f.vertexCount},(_,j)=>f.batchIndex+'|'+(f.firstVertex+j)))).size,geometrySignature:row.geometrySignature,batchColorBindings:row.batchColors??{},vertexRangeColors:row.vertexRanges??[],frameBindings:frameReadback(c,row)});}}
 return out;
}
export const progressivePaintCount=admissions.size;

export function applyProgressiveFrames(components:BuildingComponent[],data:Float32Array<ArrayBuffer>){
 let componentStart=0;
 for(const c of components){const row=progressiveAdmission(c);let batchStart=componentStart;
  c.batches.forEach((b,bi)=>{for(const frame of row?.surfaceFrames??[]){if(frame.batchIndex!==bi)continue;
   if(!Number.isSafeInteger(frame.firstVertex)||!Number.isSafeInteger(frame.vertexCount)||frame.firstVertex<0||frame.vertexCount<1||frame.firstVertex+frame.vertexCount>b.positions.length/3||frame.family<1000||frame.family>=5000||!Number.isInteger(frame.family)||frame.height<=0||frame.width<=0||![...frame.uAxis,...frame.vAxis,frame.uOrigin,frame.vOrigin,frame.height,frame.width].every(Number.isFinite))throw Error('Invalid progressive native surface frame');
   for(let j=frame.firstVertex;j<frame.firstVertex+frame.vertexCount;j++){const pos=b.positions.slice(j*3,j*3+3),u=frame.uAxis.reduce((a,v,k)=>a+v*pos[k],0)-frame.uOrigin,v=frame.vAxis.reduce((a,x,k)=>a+x*pos[k],0)-frame.vOrigin;data.set([u,v,frame.height,frame.width,frame.family],(batchStart+j)*5);}
  }batchStart+=b.positions.length/3;});componentStart=batchStart;
 }
 return data;
}
