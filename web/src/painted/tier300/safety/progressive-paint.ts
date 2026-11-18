import {countProgressiveFrameVertices,readProgressiveFrameBindings} from '../../../safety/progressive-frame-readback';
import {progressivePaintValidation} from './progressive-paint-validation';
import {nativePaintSignature} from './progressive-native-signature';
import {FROZEN_PAINT_IDS} from './frozen-paint-ids';
import type {BuildingComponent} from './building-mesh-renderer';
import {getPROGRESSIVE_ADMISSIONS,PROGRESSIVE_INPUT_SHA,getPROGRESSIVE_ADMISSION_COUNTS,PROGRESSIVE_ADMISSIONS_RESOURCE} from './progressive-paint-admissions';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {PROGRESSIVE_FEATURE_SHA} from './progressive-feature-glsl';
export const progressivePaintFingerprints={admissionsSHA256:PROGRESSIVE_INPUT_SHA,featuresSHA256:PROGRESSIVE_FEATURE_SHA};
export type PaintRGB=readonly[number,number,number];
export type ProgressiveAdmission={city:string;objectId:string;partId:string;origin:readonly[number,number];descriptionSHA256:string;tier:number;mode:string;family:number;geometrySignature:string;ownerSelectedMaterialPriority?:true;preserveUnboundNeutral?:true;surfaceFrames?:readonly{batchIndex:number;firstVertex:number;vertexCount:number;family:number;uAxis:readonly[number,number,number];vAxis:readonly[number,number,number];uOrigin:number;vOrigin:number;height:number;width:number}[];vertexRanges?:readonly{batchIndex:number;firstVertex:number;vertexCount:number;color:PaintRGB}[];wallColor?:PaintRGB;roofColor?:PaintRGB;batchColors?:Readonly<Record<string,PaintRGB>>};
/** This receives only newly owned diagnostic values, never borrowed admissions.
 * Native buffers stay privately owned under the internal readonly contract;
 * JavaScript cannot freeze nonempty TypedArray elements. */
function freezeDiagnosticValue(value:unknown):boolean{
 if(value===null||typeof value!=='object')return false;
 if(ArrayBuffer.isView(value))return true;
 const array=Array.isArray(value),prototype=Object.getPrototypeOf(value),native=!array&&prototype!==Object.prototype&&prototype!==null;
 if(Object.isFrozen(value))return native;
 Object.freeze(value);let hasNative=native;
 if(array){for(const child of value)if(freezeDiagnosticValue(child))hasNative=true;}
 else for(const key in value)if(Object.hasOwn(value,key)&&freezeDiagnosticValue((value as Record<string,unknown>)[key]))hasNative=true;
 return hasNative;
}
function freezeRenderRecords(records:RenderRecord[]):RenderRecord[]{freezeDiagnosticValue(records);return records;}
const EMPTY_RENDER_RECORDS=freezeRenderRecords([]);
export function validateProgressiveAdmissionRows(rows:readonly ProgressiveAdmission[]):Map<string,ProgressiveAdmission>{
const admissions=new Map<string,ProgressiveAdmission>();
for(const row of rows){
 if(row.preserveUnboundNeutral!==undefined&&row.preserveUnboundNeutral!==true)throw Error('Invalid unbound neutral preservation');
 if(row.ownerSelectedMaterialPriority!==undefined&&row.ownerSelectedMaterialPriority!==true)throw Error('Invalid owner material priority');
 const key=row.city+'|'+row.objectId+'|'+row.partId;
 if(FROZEN_PAINT_IDS.has(row.objectId))throw Error('Frozen test object cannot receive progressive paint');
 if(admissions.has(key)||!/^osm\/(way|relation|node)\/[1-9]\d*$/.test(row.objectId)||!row.origin.every(Number.isFinite)||!/^([a-f0-9]{64})$/.test(row.descriptionSHA256))throw Error('Invalid progressive paint admission');
 for(const color of [row.wallColor,row.roofColor,...Object.values(row.batchColors??{})])if(color&&(!color.every(v=>Number.isFinite(v)&&v>=0&&v<=1)||color.length!==3))throw Error('Invalid progressive paint colour');
 admissions.set(key,row);
}
return admissions;
}
export type FrameReadback={batchIndex:number;firstVertex:number;vertexCount:number;family:number;uRange:number[];vRange:number[];height:number;width:number;normal:number[]};
export type RenderRecord={city:string;objectId:string;partId:string;coloredVertices:number;sourceVertices:number;featureCarrierVertices:number;geometrySignature:string;batchColorBindings:Readonly<Record<string,PaintRGB>>;vertexRangeColors:readonly{batchIndex:number;firstVertex:number;vertexCount:number;color:PaintRGB}[];frameBindings:FrameReadback[]};
export type ProgressiveRenderView=readonly Readonly<RenderRecord>[];
const DATA_KEY=Object.freeze({}),ADMISSIONS_KEY=Object.freeze({});
function createData(scope:FrozenDataScope){
const admissions=()=>scope.memo(ADMISSIONS_KEY,()=>validateProgressiveAdmissionRows(getPROGRESSIVE_ADMISSIONS(scope)));
const rejectedPaintComponents=new WeakSet<BuildingComponent>();
const rejectedPaintRows=new Map<string,{city:string;objectId:string;partId:string;geometrySignature:string;reason:string}>();
const progressivePaintRejections=()=>[...rejectedPaintRows.values()];
const isRejectedProgressivePaint=(c:BuildingComponent)=>rejectedPaintComponents.has(c);
function progressiveAdmission(c:BuildingComponent){
 const k=c.city+'|'+c.objectId+'|'+c.partId;scope.assertSelection(PROGRESSIVE_ADMISSIONS_RESOURCE,[c.city+'|'+c.objectId]);const row=admissions().get(k);
 if(!row||!row.origin.every((v,i)=>Math.abs(v-c.origin[i])<1e-10)||row.geometrySignature!==nativePaintSignature(c))return undefined;
 const reason=progressivePaintValidation(c,row);
 if(reason){rejectedPaintComponents.add(c);rejectedPaintRows.set(k,{city:c.city,objectId:c.objectId,partId:c.partId,geometrySignature:row.geometrySignature,reason});return undefined;}
 return row;
}
/** Independent paint attribute: source colours and all native arrays remain untouched. */
function frameReadback(c:BuildingComponent,row:ProgressiveAdmission):FrameReadback[]{return readProgressiveFrameBindings(c,row.surfaceFrames);}
let renderRecords:{city:string;objectId:string;partId:string;coloredVertices:number;sourceVertices:number;featureCarrierVertices:number;geometrySignature:string;batchColorBindings:Readonly<Record<string,PaintRGB>>;vertexRangeColors:readonly{batchIndex:number;firstVertex:number;vertexCount:number;color:PaintRGB}[];frameBindings:FrameReadback[]}[]=EMPTY_RENDER_RECORDS;
const isProgressivelyPainted=(c:{city:string;objectId:string;partId:string})=>renderRecords.some(r=>r.city===c.city&&r.objectId===c.objectId&&r.partId===c.partId&&(r.coloredVertices>0||r.featureCarrierVertices>0));
const progressiveRenderStatus=()=>renderRecords.map(r=>({...r}));
function progressivePaintData(components:BuildingComponent[]):Float32Array<ArrayBuffer>{
 const nextRenderRecords:RenderRecord[]=[];const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0),out=new Float32Array(count*4);let at=0;
 for(const c of components){const row=progressiveAdmission(c),componentStart=at;c.batches.forEach((b,bi)=>{const color=row?.batchColors?.[String(bi)]??(b.faceRole==='wall'?row?.wallColor:b.faceRole==='roof'?row?.roofColor:undefined);const start=at;for(let j=0;j<b.positions.length;j+=3){if(color)out.set([...color,row?.ownerSelectedMaterialPriority?2:1],at);at+=4;}for(const range of row?.vertexRanges??[]){if(range.batchIndex!==bi)continue;if(!Number.isSafeInteger(range.firstVertex)||!Number.isSafeInteger(range.vertexCount)||range.firstVertex<0||range.vertexCount<1||range.firstVertex+range.vertexCount>b.positions.length/3||range.color.length!==3||!range.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('Invalid native paint range');for(let j=range.firstVertex;j<range.firstVertex+range.vertexCount;j++)out.set([...range.color,row?.ownerSelectedMaterialPriority?2:1],start+j*4);}});if(row){let coloredVertices=0;for(let j=componentStart+3;j<at;j+=4)if(out[j]>.5)coloredVertices++;nextRenderRecords.push({city:c.city,objectId:c.objectId,partId:c.partId,coloredVertices,sourceVertices:(at-componentStart)/4,featureCarrierVertices:countProgressiveFrameVertices(row.surfaceFrames),geometrySignature:row.geometrySignature,batchColorBindings:Object.fromEntries(Object.entries(row.batchColors??{}).map(([key,color])=>[key,[...color] as PaintRGB])),vertexRangeColors:structuredClone(row.vertexRanges??[]),frameBindings:frameReadback(c,row)});}}
 renderRecords=freezeRenderRecords(nextRenderRecords);return out;
}



function applyProgressiveFrames(components:BuildingComponent[],data:Float32Array<ArrayBuffer>){
 let componentStart=0;
 for(const c of components){const row=progressiveAdmission(c);let batchStart=componentStart;
  c.batches.forEach((b,bi)=>{for(const frame of row?.surfaceFrames??[]){if(frame.batchIndex!==bi)continue;
   if(!Number.isSafeInteger(frame.firstVertex)||!Number.isSafeInteger(frame.vertexCount)||frame.firstVertex<0||frame.vertexCount<1||frame.firstVertex+frame.vertexCount>b.positions.length/3||frame.family<1000||frame.family>=5000||!Number.isInteger(frame.family)||frame.height<=0||frame.width<=0||![...frame.uAxis,...frame.vAxis,frame.uOrigin,frame.vOrigin,frame.height,frame.width].every(Number.isFinite))throw Error('Invalid progressive native surface frame');
   for(let j=frame.firstVertex;j<frame.firstVertex+frame.vertexCount;j++){const pos=b.positions.slice(j*3,j*3+3),u=frame.uAxis.reduce((a,v,k)=>a+v*pos[k],0)-frame.uOrigin,v=frame.vAxis.reduce((a,x,k)=>a+x*pos[k],0)-frame.vOrigin;data.set([u,v,frame.height,frame.width,frame.family],(batchStart+j)*5);}
  }batchStart+=b.positions.length/3;});componentStart=batchStart;
 }
 return data;
}

 return{progressivePaintRejections,isRejectedProgressivePaint,progressiveAdmission,isProgressivelyPainted,progressiveRenderStatus,progressiveRenderView:()=>renderRecords,progressivePaintData,applyProgressiveFrames};
}
function data(scope:FrozenDataScope){if(!scope)throw Error('Tier300 paint consumers require a prepared FrozenDataScope');return scope.memo(DATA_KEY,()=>createData(scope));}
export const progressivePaintRejections=(scope?:FrozenDataScope)=>scope?data(scope).progressivePaintRejections():[];
export const isRejectedProgressivePaint=(c:BuildingComponent,scope:FrozenDataScope)=>data(scope).isRejectedProgressivePaint(c);
export const progressiveAdmission=(c:BuildingComponent,scope:FrozenDataScope)=>{if(!scope)throw Error('Tier300 paint consumers require a prepared FrozenDataScope');scope.assertSelection(PROGRESSIVE_ADMISSIONS_RESOURCE,[c.city+'|'+c.objectId]);return data(scope).progressiveAdmission(c);};
export const isProgressivelyPainted=(c:{city:string;objectId:string;partId:string},scope?:FrozenDataScope)=>scope?data(scope).isProgressivelyPainted(c):false;
export const progressiveRenderView=(scope?:FrozenDataScope):ProgressiveRenderView=>scope&&!scope.stats.disposed?data(scope).progressiveRenderView():EMPTY_RENDER_RECORDS;
export const progressiveRenderStatus=(scope?:FrozenDataScope)=>structuredClone(scope&&!scope.stats.disposed?data(scope).progressiveRenderView():EMPTY_RENDER_RECORDS);
export const progressivePaintData=(components:BuildingComponent[],scope:FrozenDataScope)=>!scope&&!components.length?new Float32Array(0):data(scope).progressivePaintData(components);
export const applyProgressiveFrames=(components:BuildingComponent[],value:Float32Array<ArrayBuffer>,scope:FrozenDataScope)=>!scope&&!components.length?value:data(scope).applyProgressiveFrames(components,value);
export const progressivePaintCount=(scope?:FrozenDataScope)=>getPROGRESSIVE_ADMISSION_COUNTS(scope)?.global;
export const progressivePaintCityCount=(scope?:FrozenDataScope)=>getPROGRESSIVE_ADMISSION_COUNTS(scope)?.retained;
