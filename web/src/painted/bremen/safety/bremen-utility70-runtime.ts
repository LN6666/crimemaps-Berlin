import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {UTILITY70_DATA,UTILITY70_SHA} from './utility-data';
const MODELS:any[]=UTILITY70_DATA.models;
const exact=(c:BuildingComponent,r:any)=>c.city==='bremen'&&c.objectId===r.objectId&&c.partId===r.partId&&nativePaintSignature(c)===r.signature;
export const utility70Identity=(c:Identity)=>MODELS.some(m=>m.requiredNativeGroup.some((r:any)=>r.objectId===c.objectId&&r.partId===c.partId));
export function utility70Reconstruction(components:BuildingComponent[],selectedTargetIds?:string[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const ready=MODELS.filter(m=>(!selectedTargetIds||selectedTargetIds.includes(m.targetId))&&m.requiredNativeGroup.every((r:any)=>components.filter(c=>exact(c,r)).length===1));
 const result:BuildingComponent[]=components.map(c=>{const m=ready.find(m=>m.requiredNativeGroup.some((r:any)=>r.objectId===c.objectId&&r.partId===c.partId));if(!m)return c;
 const d=m.displays.find((d:any)=>d.objectId===c.objectId&&d.partId===c.partId);
 if(!d)return {...c,batches:[],displayEstimates:{...c.displayEstimates,utility70Suppressed:{patchSHA256:UTILITY70_SHA,sourceRetained:true,reason:'Exact guarded native component covered by official whole-group DISPLAY'}}};
 const batches=d.batches.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],paint:[...b.paint],frames:[...b.frames],color:[...b.color]}));
 const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);
 if(d.inScope){stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n:number,b:any)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:UTILITY70_SHA,vertices,triangles,geometryRole:'official-whole-building-shape-with-source-supported-material-detail-pending'});}
 return {...c,origin:[...d.origin] as [number,number],batches,displayEstimates:{...c.displayEstimates,utility70:{patchSHA256:UTILITY70_SHA,sourceRetained:true,inScope:d.inScope,officialLoD2Shape:!!d.officialLoD2Shape,detailTarget:.7,detail70Ready:false,actualVisualAccepted:false}}};});
 return {components:result,stats};
}
export function utility70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='bremen'&&(c.displayEstimates?.utility70 as {inScope?:unknown}|undefined)?.inScope===true;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
