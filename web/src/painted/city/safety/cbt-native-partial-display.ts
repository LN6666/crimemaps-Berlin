import type {BuildingComponent} from './building-mesh-renderer';
import {nativePaintSignature} from './progressive-native-signature';
import {CBT_DOMAIN_PROFILE as P} from './cbt-partial-domain-fixture';
export type CBTContext={signal?:AbortSignal;city:string;indexSHA:string;sourcePBF:string;boundarySHA:string;sourceSnapshot:string;leafSHA:(c:BuildingComponent)=>string|undefined;materialReady:(c:BuildingComponent)=>boolean};
export type CBTPlan={enabled:boolean;reason:string;parent?:BuildingComponent;all?:BuildingComponent[];context?:CBTContext};
function equal(a:ArrayLike<number>,b:readonly number[]):boolean{return a.length===b.length&&b.every((v,i)=>a[i]===v);}
export function cbtDisplayPlan(components:readonly BuildingComponent[],context:CBTContext):CBTPlan{
 const no=(reason:string):CBTPlan=>({enabled:false,reason});
 if(context.signal?.aborted)return no('cancelled');
 if(context.city!==P.city||context.indexSHA!==P.indexSHA||context.sourcePBF!==P.sourcePBF||context.boundarySHA!==P.boundarySHA||context.sourceSnapshot!==P.sourceSnapshot)return no('source context mismatch');
 const all:BuildingComponent[]=[];
 for(const pin of P.requiredSources){const cc=components.filter(c=>c.city===pin.city&&c.objectId===pin.objectId&&c.partId===pin.partId);if(cc.length!==1)return no('source absent/ambiguous '+pin.objectId);const c=cc[0];
  if(context.leafSHA(c)!==pin.proof.sourceSHA256||nativePaintSignature(c)!==pin.proof.geometrySignature||!equal(c.origin,pin.origin)||JSON.stringify(c.componentGeometry)!==JSON.stringify(pin.componentGeometry)||c.batches.length!==pin.batches.length)return no('source identity/hash/geometry mismatch '+pin.objectId);
  for(let i=0;i<c.batches.length;i++){const a=c.batches[i],b=pin.batches[i];if(!equal(a.positions,b.positions)||!equal(a.normals,b.normals)||!equal(a.indices,b.indices))return no('original full array mismatch '+pin.objectId);}
  if(context.materialReady(c)!==true)return no('material not ready '+pin.objectId);all.push(c);
 }
 return{enabled:true,reason:'all10 exact native arrays/leaf hashes/materials ready',parent:all[0],all,context};
}
function segmentDistance(q:readonly number[],a:readonly number[],b:readonly number[]){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(q[0]-a[0]-t*dx,q[1]-a[1]-t*dy);}
export function cbtSuppressed(q:readonly number[],role:number):boolean{
 if(role>1.5)return true; // Only the exact source-identical shared wall quad receives role2.
 if(role<.5)return false;let inside=false;const poly=P.sourcePolygonParentLocal;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(segmentDistance(q,a,b)<=P.roofBoundaryRetainM)return false;if((a[1]>q[1])!==(b[1]>q[1])&&q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;
}
export function cbtDisplaySidecar(components:readonly BuildingComponent[],plan?:CBTPlan,batchIncluded:(c:BuildingComponent,bi:number)=>boolean=()=>true){
 const count=components.reduce((n,c)=>n+c.batches.reduce((s,b)=>s+b.positions.length/3,0),0),attributes=new Float32Array(count*3);
 const valid=plan?.enabled&&plan.context&&plan.all&&plan.parent&&plan.all.every(c=>components.includes(c)&&plan.context!.materialReady(c)===true&&c.batches.every((_,i)=>batchIncluded(c,i)));
 // Revalidate all immutable source buffers/context at packing, not only initial planning.
 const ready=valid?cbtDisplayPlan(components,plan!.context!):{enabled:false,reason:plan?.reason??'no plan'};
 let at=0;if(ready.enabled)for(const c of components)for(let bi=0;bi<c.batches.length;bi++){const b=c.batches[bi];for(let v=0;v<b.positions.length/3;v++){if(c===plan!.parent){let role=0;if(bi===0&&b.normals[v*3+1]>.999&&b.positions[v*3+1]===7.5)role=1;if(bi===1&&v>=P.sharedWall.parentWallFirstVertex&&v<P.sharedWall.parentWallFirstVertex+P.sharedWall.parentWallVertexCount)role=2;attributes.set([b.positions[v*3],b.positions[v*3+2],role],at*3);}at++;}}
 return{enabled:!!ready.enabled,reason:ready.reason,attributes,wholeParentHidden:false};
}
export function cbtPickDiscard(data:ArrayLike<number>,ids:readonly number[],bary:readonly number[]){const role=data[ids[0]*3+2];return ids.every(id=>data[id*3+2]===role)&&cbtSuppressed([0,1].map(axis=>ids.reduce((s,id,k)=>s+data[id*3+axis]*bary[k],0)),role);}
const MASK="bool cbtSuppressed(highp vec2 q,highp float role){if(role>1.5)return true;if(role<.5)return false;bool hit=false;{highp vec2 a=vec2(4.802357769299523,3.9518434286503594),b=vec2(6.289720584630091,-5.877665778620558);highp vec2 d=b-a;highp float t=clamp(dot(q-a,d)/dot(d,d),0.,1.);if(length(q-a-t*d)<=.001)return false;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}{highp vec2 a=vec2(14.561422279360173,5.432393999909755),b=vec2(4.802357769299523,3.9518434286503594);highp vec2 d=b-a;highp float t=clamp(dot(q-a,d)/dot(d,d),0.,1.);if(length(q-a-t*d)<=.001)return false;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}{highp vec2 a=vec2(16.048785094690743,-4.408249960156421),b=vec2(14.561422279360173,5.432393999909755);highp vec2 d=b-a;highp float t=clamp(dot(q-a,d)/dot(d,d),0.,1.);if(length(q-a-t*d)<=.001)return false;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}{highp vec2 a=vec2(6.289720584630091,-5.877665778620558),b=vec2(16.048785094690743,-4.408249960156421);highp vec2 d=b-a;highp float t=clamp(dot(q-a,d)/dot(d,d),0.,1.);if(length(q-a-t*d)<=.001)return false;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}";
export function cbtVertexShader(source:string,city:string){return city!=='cologne'?source:source.replace('void main(){','in highp vec3 a_cbt_display;out highp vec3 v_cbt_display;void main(){v_cbt_display=a_cbt_display;');}
export function cbtFragmentShader(source:string,city:string){return city!=='cologne'?source:source.replace('void main(){','in highp vec3 v_cbt_display;\n'+MASK+'\nvoid main(){if(cbtSuppressed(v_cbt_display.xy,v_cbt_display.z))discard;');}
