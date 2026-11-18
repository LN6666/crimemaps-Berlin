import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import type{FrozenDataRef}from'../../../safety/frozen-data-lease-store';
import{bremenIdentityCandidate}from'./bremen-identity-metadata';
import{bremenProgressiveObjectDemand}from'./bremen-recipe-demand';
import{PROGRESSIVE_ADMISSIONS_RESOURCE}from'./progressive-paint-admissions';
import{F260_ACCEPTED_RESTORE_SCOPE_RESOURCES as f260_accepted_restore_runtime_RESOURCES}from'./f260-accepted-restore-runtime';
import{f260AcceptedRestoreAdmission}from'./f260-accepted-restore-runtime';
import{F260_ACCEPTED_RESTORE_SHA}from'./f260-accepted-restore-data';
import {validProgressiveNativeFamily} from './progressive-merged-tower-family';
import {progressivePaintValidation} from './progressive-paint-validation';
import {nativePaintSignature} from './progressive-native-signature';
import {FROZEN_PAINT_IDS} from './frozen-paint-ids';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {getPROGRESSIVE_ADMISSIONS,PROGRESSIVE_INPUT_SHA} from './progressive-paint-admissions';
import {PROGRESSIVE_FEATURE_SHA} from './progressive-feature-glsl';
export const progressivePaintFingerprints={admissionsSHA256:PROGRESSIVE_INPUT_SHA,featuresSHA256:PROGRESSIVE_FEATURE_SHA};
export type PaintRGB=readonly[number,number,number];
export type ProgressiveAdmission={city:string;objectId:string;partId:string;origin:readonly[number,number];descriptionSHA256:string;tier:number;mode:string;family:number;geometrySignature:string;ownerSelectedMaterialPriority?:true;preserveUnboundNeutral?:true;surfaceFrames?:readonly{batchIndex:number;firstVertex:number;vertexCount:number;family:number;uAxis:readonly[number,number,number];vAxis:readonly[number,number,number];uOrigin:number;vOrigin:number;height:number;width:number}[];vertexRanges?:readonly{batchIndex:number;firstVertex:number;vertexCount:number;color:PaintRGB}[];wallColor?:PaintRGB;roofColor?:PaintRGB;batchColors?:Readonly<Record<string,PaintRGB>>};
type FrameReadback={batchIndex:number;firstVertex:number;vertexCount:number;family:number;uRange:number[];vRange:number[];height:number;width:number;normal:number[]};
function frameReadback(c:BuildingComponent,row:ProgressiveAdmission):FrameReadback[]{return (row.surfaceFrames??[]).map(f=>{const b=c.batches[f.batchIndex],us:number[]=[],vs:number[]=[];for(let j=f.firstVertex;j<f.firstVertex+f.vertexCount;j++){const p=b.positions.slice(j*3,j*3+3);us.push(f.uAxis.reduce((a,v,k)=>a+v*p[k],0)-f.uOrigin);vs.push(f.vAxis.reduce((a,v,k)=>a+v*p[k],0)-f.vOrigin);}return {batchIndex:f.batchIndex,firstVertex:f.firstVertex,vertexCount:f.vertexCount,family:f.family,uRange:[Math.min(...us),Math.max(...us)],vRange:[Math.min(...vs),Math.max(...vs)],height:f.height,width:f.width,normal:Array.from(b.normals.slice(f.firstVertex*3,f.firstVertex*3+3))};});}

/** Full original recipe resources; city demand is deliberately coarse. */
export const PROGRESSIVE_PAINT_SCOPE_RESOURCES=[PROGRESSIVE_ADMISSIONS_RESOURCE,...f260_accepted_restore_runtime_RESOURCES] as const;
export const PROGRESSIVE_PAINT_SCOPE_CITIES=[] as const;
export const MODULE_SCOPE_RESOURCES=PROGRESSIVE_PAINT_SCOPE_RESOURCES;
export function MODULE_SCOPE_RESOURCES_FOR_COMPONENTS(components:readonly Pick<BuildingComponent,'objectId'|'partId'>[]):readonly FrozenDataRef[]{return[PROGRESSIVE_ADMISSIONS_RESOURCE,...(components.some(c=>bremenIdentityCandidate('f260-accepted-restore-runtime',c))?f260_accepted_restore_runtime_RESOURCES:[])];}
export const MODULE_SCOPE_CITIES=PROGRESSIVE_PAINT_SCOPE_CITIES;
export const MODULE_SCOPE_METADATA_FUNCTIONS=['progressivePaintRejections','progressiveRenderStatus','isProgressivelyPainted','isRejectedProgressivePaint'] as const;
export const MODULE_SCOPE_ARITY={"progressivePaintRejections":0,"isRejectedProgressivePaint":1,"progressiveAdmission":1,"isProgressivelyPainted":1,"progressiveRenderStatus":0,"progressivePaintData":1,"applyProgressiveFrames":2} as const;
export type ProgressivePaintDiagnostics={
 state:'unprepared'|'available'|'unavailable';
 admissions?:number;
 appliedComponents:{city:string;objectId:string;partId:string;coloredVertices:number;sourceVertices:number;featureCarrierVertices:number;geometrySignature:string;batchColorBindings:Readonly<Record<string,PaintRGB>>;vertexRangeColors:readonly{batchIndex:number;firstVertex:number;vertexCount:number;color:PaintRGB}[];frameBindings:FrameReadback[]}[];
 rejectedAdmissions:{city:string;objectId:string;partId:string;geometrySignature:string;reason:string}[];
};
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
const DIAGNOSTICS_KEY={};
const emptyDiagnostics=(state:ProgressivePaintDiagnostics['state']):ProgressivePaintDiagnostics=>({state,appliedComponents:[],rejectedAdmissions:[]});
/** Internal readers share metadata without copying records or creating a recipe. */
function progressivePaintDiagnosticView(scope?:FrozenDataScope):Readonly<ProgressivePaintDiagnostics>|undefined{
 if(!scope||scope.stats.disposed)return undefined;
 return scope.memo(DIAGNOSTICS_KEY,()=>emptyDiagnostics('unprepared'));
}
/** Internal consumer view. The record arrays are isolated/frozen on publication;
 * public diagnostics below retain their independent-copy contract. */
export function getProgressivePaintDiagnosticsView(scope?:FrozenDataScope):Readonly<ProgressivePaintDiagnostics>|undefined{return progressivePaintDiagnosticView(scope);}
/** Pure diagnostics never initialize a recipe or borrow a frozen resource. */
export function getProgressivePaintDiagnostics(scope?:FrozenDataScope):ProgressivePaintDiagnostics{
 const current=progressivePaintDiagnosticView(scope);
 return current?structuredClone(current):emptyDiagnostics(scope?'unavailable':'unprepared');
}
function freezeDiagnosticRecords(value:unknown):void{if(!value||typeof value!=='object'||Object.isFrozen(value))return;for(const child of Object.values(value))freezeDiagnosticRecords(child);Object.freeze(value);}
const RECIPE_KEY={};
const progressive_paint_admissions_KEY={};
const progressive_paint_rejectedPaintComponents_KEY={};
const progressive_paint_rejectedPaintRows_KEY={};
const progressive_paint_progressivePaintCount_KEY={};
function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('progressive-paint requires a prepared frozen data scope');return scope;}
function diagnostics(){return scopeValue().memo(DIAGNOSTICS_KEY,()=>emptyDiagnostics('unprepared'));}
function _scope_admissions(){const admissions=scopeValue().memo(progressive_paint_admissions_KEY,()=>validateProgressiveAdmissionRows(getPROGRESSIVE_ADMISSIONS(scope)));const current=diagnostics();current.admissions=admissions.size;current.state='available';return admissions;}
function _scope_rejectedPaintComponents(){return scopeValue().memo(progressive_paint_rejectedPaintComponents_KEY,()=>(new WeakSet<BuildingComponent>()));}
function _scope_rejectedPaintRows(){return scopeValue().memo(progressive_paint_rejectedPaintRows_KEY,()=>(new Map<string,{city:string;objectId:string;partId:string;geometrySignature:string;reason:string}>()));}
const progressivePaintRejections=()=>[..._scope_rejectedPaintRows().values()];
const isRejectedProgressivePaint=(c:BuildingComponent)=>_scope_rejectedPaintComponents().has(c);
function progressiveAdmission(c:BuildingComponent):ProgressiveAdmission|undefined{
 const restored=f260AcceptedRestoreAdmission(c,scope);if(restored){const batchColors:Record<string,PaintRGB>={};c.batches.forEach((b,i)=>{const p=(b as any).paint;batchColors[String(i)]=[p[0],p[1],p[2]];});return{...restored,descriptionSHA256:F260_ACCEPTED_RESTORE_SHA,ownerSelectedMaterialPriority:true as const,batchColors} satisfies ProgressiveAdmission;}

 scopeValue().assertSelection(PROGRESSIVE_ADMISSIONS_RESOURCE,[c.city+'|'+c.objectId]);
 const k=c.city+'|'+c.objectId+'|'+c.partId,row=_scope_admissions().get(k);
 if(!row||!row.origin.every((v,i)=>Math.abs(v-c.origin[i])<1e-10)||row.geometrySignature!==nativePaintSignature(c))return undefined;
 const reason=progressivePaintValidation(c,row);
 if(reason){_scope_rejectedPaintComponents().add(c);_scope_rejectedPaintRows().set(k,{city:c.city,objectId:c.objectId,partId:c.partId,geometrySignature:row.geometrySignature,reason});const current=diagnostics();current.rejectedAdmissions=[..._scope_rejectedPaintRows().values()].map(row=>({...row}));freezeDiagnosticRecords(current.rejectedAdmissions);return undefined;}
 return row;
}
let renderRecords:ProgressivePaintDiagnostics['appliedComponents']=[];
const isProgressivelyPainted=(c:{city:string;objectId:string;partId:string})=>renderRecords.some(r=>r.city===c.city&&r.objectId===c.objectId&&r.partId===c.partId&&(r.coloredVertices>0||r.featureCarrierVertices>0));
const progressiveRenderStatus=()=>renderRecords.map(r=>({...r}));
function progressivePaintData(components:BuildingComponent[]):Float32Array<ArrayBuffer>{
 renderRecords=[];const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0),out=new Float32Array(count*4);let at=0;
 for(const c of components){const row=progressiveAdmission(c),componentStart=at;c.batches.forEach((b,bi)=>{const color=row?.batchColors?.[String(bi)]??(b.faceRole==='wall'?row?.wallColor:b.faceRole==='roof'?row?.roofColor:undefined);const start=at;for(let j=0;j<b.positions.length;j+=3){if(color)out.set([...color,row?.ownerSelectedMaterialPriority?2:1],at);at+=4;}for(const range of row?.vertexRanges??[]){if(range.batchIndex!==bi)continue;if(!Number.isSafeInteger(range.firstVertex)||!Number.isSafeInteger(range.vertexCount)||range.firstVertex<0||range.vertexCount<1||range.firstVertex+range.vertexCount>b.positions.length/3||range.color.length!==3||!range.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('Invalid native paint range');for(let j=range.firstVertex;j<range.firstVertex+range.vertexCount;j++)out.set([...range.color,row?.ownerSelectedMaterialPriority?2:1],start+j*4);}});if(row){let coloredVertices=0;for(let j=componentStart+3;j<at;j+=4)if(out[j]>.5)coloredVertices++;renderRecords.push({city:c.city,objectId:c.objectId,partId:c.partId,coloredVertices,sourceVertices:(at-componentStart)/4,featureCarrierVertices:new Set((row.surfaceFrames??[]).flatMap(f=>Array.from({length:f.vertexCount},(_,j)=>f.batchIndex+'|'+(f.firstVertex+j)))).size,geometrySignature:row.geometrySignature,...structuredClone({batchColorBindings:row.batchColors??{},vertexRangeColors:row.vertexRanges??[]}),frameBindings:frameReadback(c,row)});}}
 if(scope){const current=diagnostics();current.appliedComponents=renderRecords;freezeDiagnosticRecords(current.appliedComponents);current.state='available';}
 return out;
}
function _scope_progressivePaintCount(){return scopeValue().memo(progressive_paint_progressivePaintCount_KEY,()=>(_scope_admissions().size));}
function applyProgressiveFrames(components:BuildingComponent[],data:Float32Array<ArrayBuffer>){
 let componentStart=0;
 for(const c of components){const row=progressiveAdmission(c);let batchStart=componentStart;
  c.batches.forEach((b,bi)=>{for(const frame of row?.surfaceFrames??[]){if(frame.batchIndex!==bi)continue;
   if(!Number.isSafeInteger(frame.firstVertex)||!Number.isSafeInteger(frame.vertexCount)||frame.firstVertex<0||frame.vertexCount<1||frame.firstVertex+frame.vertexCount>b.positions.length/3||!validProgressiveNativeFamily(frame.family,row!)||frame.height<=0||frame.width<=0||![...frame.uAxis,...frame.vAxis,frame.uOrigin,frame.vOrigin,frame.height,frame.width].every(Number.isFinite))throw Error('Invalid progressive native surface frame');
   for(let j=frame.firstVertex;j<frame.firstVertex+frame.vertexCount;j++){const pos=b.positions.slice(j*3,j*3+3),u=frame.uAxis.reduce((a,v,k)=>a+v*pos[k],0)-frame.uOrigin,v=frame.vAxis.reduce((a,x,k)=>a+x*pos[k],0)-frame.vOrigin;data.set([u,v,frame.height,frame.width,frame.family],(batchStart+j)*5);}
  }batchStart+=b.positions.length/3;});componentStart=batchStart;
 }
 return data;
}
return{progressivePaintRejections,isRejectedProgressivePaint,progressiveAdmission,isProgressivelyPainted,progressiveRenderStatus,progressivePaintData,applyProgressiveFrames,_scope_admissions,_scope_rejectedPaintComponents,_scope_rejectedPaintRows,_scope_progressivePaintCount};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function getProgressivePaintCount(scope?:FrozenDataScope){return progressivePaintDiagnosticView(scope)?.admissions;}
export function progressivePaintRejections(scope?:FrozenDataScope){const current=progressivePaintDiagnosticView(scope);return current?structuredClone(current.rejectedAdmissions):[];}
export function isRejectedProgressivePaint(c:BuildingComponent,scope?:FrozenDataScope){return recipe(scope).isRejectedProgressivePaint(c);}
export function progressiveAdmission(c:BuildingComponent,scope?:FrozenDataScope){return recipe(scope).progressiveAdmission(c);}
export function isProgressivelyPainted(c:{city:string;objectId:string;partId:string},scope?:FrozenDataScope){return progressivePaintDiagnosticView(scope)?.appliedComponents.some(r=>r.city===c.city&&r.objectId===c.objectId&&r.partId===c.partId&&(r.coloredVertices>0||r.featureCarrierVertices>0))??false;}
export function progressiveRenderStatus(scope?:FrozenDataScope){const current=progressivePaintDiagnosticView(scope);return current?structuredClone(current.appliedComponents):[];}
export function progressivePaintData(components:BuildingComponent[],scope?:FrozenDataScope){return recipe(scope).progressivePaintData(components);}
export function applyProgressiveFrames(components:BuildingComponent[],data:Float32Array<ArrayBuffer>,scope?:FrozenDataScope){return recipe(scope).applyProgressiveFrames(components,data);}

/** Declare the complete immutable object demand before the first admission map. */
export async function prepareBremenProgressiveAdmissions(components:readonly {city?:string;objectId?:string;partId?:string}[],signal:AbortSignal,scope:FrozenDataScope){
 signal.throwIfAborted();
 const keys=bremenProgressiveObjectDemand(components);if(!keys.length)return;
 await scope.prepareSelection(PROGRESSIVE_ADMISSIONS_RESOURCE,keys,signal);
 signal.throwIfAborted();
}
