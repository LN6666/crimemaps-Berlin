import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {BOUNDARY70_DATA,BOUNDARY70_SHA} from './boundary-data';
const MODELS:any[]=BOUNDARY70_DATA.models;
const same=(a:any,b:any):boolean=>Array.isArray(a)||ArrayBuffer.isView(a)?(Array.isArray(b)||ArrayBuffer.isView(b))&&(a as any).length===(b as any).length&&Array.from(a as ArrayLike<number>).every((v,i)=>Object.is(v,(b as any)[i])):JSON.stringify(a)===JSON.stringify(b);
function originalArray(value:string,uint=false){const raw=Uint8Array.from(atob(value),c=>c.charCodeAt(0)),v=new DataView(raw.buffer);return Array.from({length:raw.length/4},(_,i)=>uint?v.getUint32(i*4,true):v.getFloat32(i*4,true));}
function originalColor(value:string){const raw=Uint8Array.from(atob(value),c=>c.charCodeAt(0)),v=new DataView(raw.buffer);return Array.from({length:raw.length/8},(_,i)=>v.getFloat64(i*8,true));}
const exact=(c:BuildingComponent,r:any,leaf:((c:BuildingComponent)=>string|undefined)|undefined)=>{const s=MODELS.flatMap(m=>m.nativeSourceComponents).find((s:any)=>s.objectId===r.objectId&&s.partId===r.partId);return !!leaf&&leaf(c)===r.sourceLeafSHA256&&!!s&&c.city==='bremen'&&c.objectId===r.objectId&&c.partId===r.partId&&nativePaintSignature(c)===r.signature&&['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],s[k]))&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>(['positions','normals','indices','color']as const).every(k=>same(b[k],s.batches[bi]._nativeArraysBase64?.[k]?originalArray(s.batches[bi]._nativeArraysBase64[k],k==='indices'):(k==='color'&&s.batches[bi]._nativeColorFloat64Base64?originalColor(s.batches[bi]._nativeColorFloat64Base64):s.batches[bi][k]))));};
export const boundary70Identity=(c:Identity)=>MODELS.some(m=>m.requiredNativeGroup.some((r:any)=>r.objectId===c.objectId&&r.partId===c.partId));
export function boundary70Reconstruction(components:BuildingComponent[],selectedTargetIds?:string[],nativeLeafSHA?:(c:BuildingComponent)=>string|undefined){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const ready=MODELS.filter(m=>(!selectedTargetIds||selectedTargetIds.includes(m.targetId))&&m.requiredNativeGroup.every((r:any)=>components.filter(c=>exact(c,r,nativeLeafSHA)).length===1));
 const result:BuildingComponent[]=components.map(c=>{const m=ready.find(m=>m.requiredNativeGroup.some((r:any)=>r.objectId===c.objectId&&r.partId===c.partId));if(!m)return c;
 const d=m.displays.find((d:any)=>d.objectId===c.objectId&&d.partId===c.partId);
 if(!d)return {...c,batches:[],displayEstimates:{...c.displayEstimates,boundary70Suppressed:{patchSHA256:BOUNDARY70_SHA,sourceRetained:true,reason:'Exact guarded native component covered by official whole-group DISPLAY'}}};
 const batches=d.batches.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],paint:[...b.paint],frames:[...b.frames],color:[...b.color]}));
 const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);
 if(d.inScope){stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n:number,b:any)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:BOUNDARY70_SHA,vertices,triangles,geometryRole:'official-whole-group-with-photo-specific-detail'});}
 return {...c,origin:[...d.origin] as [number,number],batches,displayEstimates:{...c.displayEstimates,boundary70:{patchSHA256:BOUNDARY70_SHA,sourceRetained:true,inScope:d.inScope,officialLoD2Shape:!!d.officialLoD2Shape,detailTarget:.7,actualVisualAccepted:false,detail70Ready:false}}};});
 return {components:result,stats};
}
export function boundary70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='bremen'&&(c.displayEstimates?.boundary70 as {inScope?:unknown}|undefined)?.inScope===true;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
