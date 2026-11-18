import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {InfillDataModule} from './infill-data-contract';
import {countProgressiveFrameVertices,readProgressiveFrameBindings} from '../../../safety/progressive-frame-readback';
import {progressivePaintValidation} from './c121-original-validation';
import {nativePaintSignature} from './c121-original-signature';
import {FROZEN_PAINT_IDS} from './frozen-paint-ids';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {PROGRESSIVE_ADMISSIONS,PROGRESSIVE_INPUT_SHA} from './c121-original-admissions';
import {PROGRESSIVE_FEATURE_SHA} from './infill-c121-original-paint';
export const progressivePaintFingerprints={admissionsSHA256:PROGRESSIVE_INPUT_SHA,featuresSHA256:PROGRESSIVE_FEATURE_SHA};
export type PaintRGB=readonly[number,number,number];
export type ProgressiveAdmission={city:string;objectId:string;partId:string;origin:readonly[number,number];descriptionSHA256:string;tier:number;mode:string;family:number;geometrySignature:string;ownerSelectedMaterialPriority?:true;preserveUnboundNeutral?:true;surfaceFrames?:readonly{batchIndex:number;firstVertex:number;vertexCount:number;family:number;uAxis:readonly[number,number,number];vAxis:readonly[number,number,number];uOrigin:number;vOrigin:number;height:number;width:number}[];vertexRanges?:readonly{batchIndex:number;firstVertex:number;vertexCount:number;color:PaintRGB}[];wallColor?:PaintRGB;roofColor?:PaintRGB;batchColors?:Readonly<Record<string,PaintRGB>>};
export type FrameReadback={batchIndex:number;firstVertex:number;vertexCount:number;family:number;uRange:number[];vRange:number[];height:number;width:number;normal:number[]};
export type RenderRecord={city:string;objectId:string;partId:string;coloredVertices:number;sourceVertices:number;featureCarrierVertices:number;geometrySignature:string;batchColorBindings:Readonly<Record<string,PaintRGB>>;vertexRangeColors:readonly{batchIndex:number;firstVertex:number;vertexCount:number;color:PaintRGB}[];frameBindings:FrameReadback[]};
export type ProgressiveRenderView=readonly Readonly<RenderRecord>[];
/** Only detached diagnostics reach this function; native buffers remain privately readonly. */
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
export function validateProgressiveAdmissionRows(rows:readonly ProgressiveAdmission[]){
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
const originalAdmissionIndexKey=Object.freeze({}),originalPaintRuntimeKey=Object.freeze({});
function admissionIndex(scope:FrozenDataScope){return scope.memo(originalAdmissionIndexKey,()=>validateProgressiveAdmissionRows(PROGRESSIVE_ADMISSIONS as unknown as readonly ProgressiveAdmission[]));}
function createOriginalPaintRuntime(scope:FrozenDataScope){
const admissions=()=>admissionIndex(scope);

const rejectedPaintComponents=new WeakSet<BuildingComponent>();
const rejectedPaintRows=new Map<string,{city:string;objectId:string;partId:string;geometrySignature:string;reason:string}>();
const progressivePaintRejections=()=>[...rejectedPaintRows.values()];
const isRejectedProgressivePaint=(c:BuildingComponent)=>rejectedPaintComponents.has(c);
function progressiveAdmission(c:BuildingComponent){
 const k=c.city+'|'+c.objectId+'|'+c.partId,row=admissions().get(k);
 if(!row||!row.origin.every((v,i)=>Math.abs(v-c.origin[i])<1e-10)||row.geometrySignature!==nativePaintSignature(c))return undefined;
 const reason=progressivePaintValidation(c,row);
 if(reason){rejectedPaintComponents.add(c);rejectedPaintRows.set(k,{city:c.city,objectId:c.objectId,partId:c.partId,geometrySignature:row.geometrySignature,reason});return undefined;}
 return row;
}
/** Independent paint attribute: source colours and all native arrays remain untouched. */

function frameReadback(c:BuildingComponent,row:ProgressiveAdmission):FrameReadback[]{return readProgressiveFrameBindings(c,row.surfaceFrames);}
let renderRecords=EMPTY_RENDER_RECORDS;
const isProgressivelyPainted=(c:{city:string;objectId:string;partId:string})=>renderRecords.some(r=>r.city===c.city&&r.objectId===c.objectId&&r.partId===c.partId&&(r.coloredVertices>0||r.featureCarrierVertices>0));
const progressiveRenderStatus=()=>structuredClone(renderRecords);
const progressiveRenderView=():ProgressiveRenderView=>renderRecords;
function progressivePaintData(components:BuildingComponent[]):Float32Array<ArrayBuffer>{
 const nextRenderRecords:RenderRecord[]=[];const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0),out=new Float32Array(count*4);let at=0;
 for(const c of components){const row=progressiveAdmission(c),componentStart=at;c.batches.forEach((b,bi)=>{const color=row?.batchColors?.[String(bi)]??(b.faceRole==='wall'?row?.wallColor:b.faceRole==='roof'?row?.roofColor:undefined);const start=at;for(let j=0;j<b.positions.length;j+=3){if(color)out.set([...color,row?.ownerSelectedMaterialPriority?2:1],at);at+=4;}for(const range of row?.vertexRanges??[]){if(range.batchIndex!==bi)continue;if(!Number.isSafeInteger(range.firstVertex)||!Number.isSafeInteger(range.vertexCount)||range.firstVertex<0||range.vertexCount<1||range.firstVertex+range.vertexCount>b.positions.length/3||range.color.length!==3||!range.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('Invalid native paint range');for(let j=range.firstVertex;j<range.firstVertex+range.vertexCount;j++)out.set([...range.color,row?.ownerSelectedMaterialPriority?2:1],start+j*4);}});if(row){let coloredVertices=0;for(let j=componentStart+3;j<at;j+=4)if(out[j]>.5)coloredVertices++;nextRenderRecords.push({city:c.city,objectId:c.objectId,partId:c.partId,coloredVertices,sourceVertices:(at-componentStart)/4,featureCarrierVertices:countProgressiveFrameVertices(row.surfaceFrames),geometrySignature:row.geometrySignature,batchColorBindings:Object.fromEntries(Object.entries(row.batchColors??{}).map(([key,color])=>[key,[...color] as PaintRGB])),vertexRangeColors:structuredClone(row.vertexRanges??[]),frameBindings:frameReadback(c,row)});}}
 renderRecords=freezeRenderRecords(nextRenderRecords);return out;
}
const progressivePaintCount=()=>admissions().size;

function applyProgressiveFrames(components:BuildingComponent[],data:Float32Array){
 let componentStart=0;
 for(const c of components){const row=progressiveAdmission(c);let batchStart=componentStart;
  c.batches.forEach((b,bi)=>{for(const frame of row?.surfaceFrames??[]){if(frame.batchIndex!==bi)continue;
   if(!Number.isSafeInteger(frame.firstVertex)||!Number.isSafeInteger(frame.vertexCount)||frame.firstVertex<0||frame.vertexCount<1||frame.firstVertex+frame.vertexCount>b.positions.length/3||frame.family<1000||(frame.family>=5000&&frame.family<10000||frame.family>=1000000)||!Number.isInteger(frame.family)||frame.height<=0||frame.width<=0||![...frame.uAxis,...frame.vAxis,frame.uOrigin,frame.vOrigin,frame.height,frame.width].every(Number.isFinite))throw Error('Invalid progressive native surface frame');
   for(let j=frame.firstVertex;j<frame.firstVertex+frame.vertexCount;j++){const pos=b.positions.slice(j*3,j*3+3),u=frame.uAxis.reduce((a,v,k)=>a+v*pos[k],0)-frame.uOrigin,v=frame.vAxis.reduce((a,x,k)=>a+x*pos[k],0)-frame.vOrigin;data.set([u,v,frame.height,frame.width,frame.family],(batchStart+j)*5);}
  }batchStart+=b.positions.length/3;});componentStart=batchStart;
 }
 return data;
}

return {progressivePaintRejections,isRejectedProgressivePaint,progressiveAdmission,isProgressivelyPainted,progressiveRenderStatus,progressiveRenderView,progressivePaintData,progressivePaintCount,applyProgressiveFrames};
}

export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error('c121 original paint requires a prepared FrozenDataScope');return scope.memo(originalPaintRuntimeKey,()=>createOriginalPaintRuntime(scope));}
export function progressivePaintRejections(scope?:FrozenDataScope){return scope&&!scope.stats.disposed?structuredClone(getInfillData(scope).progressivePaintRejections()):[];}
export function isRejectedProgressivePaint(c:BuildingComponent,scope?:FrozenDataScope){return scope&&!scope.stats.disposed?getInfillData(scope).isRejectedProgressivePaint(c):false;}
export function progressiveAdmission(c:BuildingComponent,scope?:FrozenDataScope){return getInfillData(scope).progressiveAdmission(c);}
export function isProgressivelyPainted(c:{city:string;objectId:string;partId:string},scope?:FrozenDataScope){return scope&&!scope.stats.disposed?getInfillData(scope).isProgressivelyPainted(c):false;}
export function progressiveRenderView(scope?:FrozenDataScope):ProgressiveRenderView{return scope&&!scope.stats.disposed?getInfillData(scope).progressiveRenderView():EMPTY_RENDER_RECORDS;}
export function progressiveRenderStatus(scope?:FrozenDataScope){return scope&&!scope.stats.disposed?getInfillData(scope).progressiveRenderStatus():structuredClone(EMPTY_RENDER_RECORDS);}
export function progressivePaintData(components:BuildingComponent[],scope?:FrozenDataScope){if(!scope&&!components.length)return new Float32Array();return getInfillData(scope).progressivePaintData(components);}
export function progressivePaintCount(scope?:FrozenDataScope){return scope&&!scope.stats.disposed?getInfillData(scope).progressivePaintCount():undefined;}
export function applyProgressiveFrames(components:BuildingComponent[],data:Float32Array<ArrayBufferLike>,scope?:FrozenDataScope){if(!scope&&!components.length)return data;return getInfillData(scope).applyProgressiveFrames(components,data);}
export const infillDataRefs:readonly FrozenDataRef[]=[];
export const infillDataMemoKeys:readonly object[]=[originalAdmissionIndexKey];
export const infillProgressiveResidentMemoKeys:readonly object[]=[originalPaintRuntimeKey];
export const infillDataDependencies=():readonly InfillDataModule[]=>[];
export const infillDataFunctionArities={progressivePaintRejections:0,isRejectedProgressivePaint:1,progressiveAdmission:1,isProgressivelyPainted:1,progressiveRenderStatus:0,progressiveRenderView:0,progressivePaintData:1,progressivePaintCount:0,applyProgressiveFrames:2} as const;

export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();if(!components.length)return;
 if(infillDataRefs.length)await scope.prepare(infillDataRefs,signal);
 signal.throwIfAborted();admissionIndex(scope);signal.throwIfAborted();
}
