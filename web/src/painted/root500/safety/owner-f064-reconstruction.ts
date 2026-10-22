import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
type MutableBatch=MeshBatch&{positions:number[];normals:number[];indices:number[];color:number[]};
export const F064_ID={city:'munich',objectId:'osm/way/28026817',partId:'osm/way/28026817/component/b880d807a746deae9497',signature:'c6293afc',selectedObjectId:'osm/node/11099726845'};
export const F064_A=[.39056,.920578],F064_E=[.920578,-.39056];
export function reconstructF064Component(source:BuildingComponent,signature:(c:BuildingComponent)=>string){
 const id=F064_ID;
 if(source.city!==id.city||source.objectId!==id.objectId||source.partId!==id.partId)return {component:source,applied:false};
 if(signature(source)!==id.signature)return {component:source,applied:false,reason:'changed-source-signature'};
 const batches:MeshBatch[]=source.batches.map(b=>({...b,positions:Array.from(b.positions,(v,i)=>i%3===1?v*17/7.5:v),normals:Array.from(b.normals),indices:Array.from(b.indices),color:Array.from(b.color)}));
 // Head polygon uses the exact frozen outline vertices at its identifiable east kink,
 // north edge, and NW entrance recess; no new XZ vertex or invented extension.
 const original=source.batches[0].positions,ring=[0,35,36,37,38,39].map(v=>[original[v*3],original[v*3+2]]);
 const cap:MutableBatch={positions:[],normals:[],indices:[],color:[.54,.55,.52]},walls:MutableBatch={positions:[],normals:[],indices:[],color:[.78,.72,.64]};
 for(const [x,z]of ring){cap.positions.push(x,23,z);cap.normals.push(0,1,0);}
 // This six-node polygon is concave at the NW foyer recess. Ear clipping preserves it.
 let ids=[0,1,2,3,4,5];const cross=(a:number[],b:number[],c:number[])=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const inside=(p:number[],a:number[],b:number[],c:number[])=>cross(a,b,p)>=-1e-8&&cross(b,c,p)>=-1e-8&&cross(c,a,p)>=-1e-8;
 while(ids.length>3){let found=false;for(let j=0;j<ids.length;j++){const a=ids[(j+ids.length-1)%ids.length],b=ids[j],c=ids[(j+1)%ids.length];if(cross(ring[a],ring[b],ring[c])<=1e-8)continue;if(ids.some(i=>i!==a&&i!==b&&i!==c&&inside(ring[i],ring[a],ring[b],ring[c])))continue;cap.indices.push(a,c,b);ids.splice(j,1);found=true;break;}if(!found)throw Error('F064 head triangulation failed');}cap.indices.push(ids[0],ids[2],ids[1]);
 for(let j=0;j<ring.length;j++){const a=ring[j],b=ring[(j+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),o=walls.positions.length/3;walls.positions.push(a[0],17,a[1],b[0],17,b[1],b[0],23,b[1],a[0],23,a[1]);for(let k=0;k<4;k++)walls.normals.push(dz/l,0,-dx/l);walls.indices.push(o,o+2,o+1,o,o+3,o+2);}
 batches.push(cap,walls);
 const component={...source,batches,displayEstimates:{...source.displayEstimates,ownerAuthorizedReconstruction:{selectedObjectId:id.selectedObjectId,sourceFootprintRetained:true,originalHeightM:7.5,longHeightM:17,headHeightM:23,sourceArraysRetained:true,dimensions:'Architect-published17m/23m; head split follows frozen east kink and NW foyer recess; XZ source retained, not surveyed',actualVisualAccepted:false}}};
 return {component,sourceOriginal:source,applied:true,geometryChanges:{originalVertices:200,displayVertices:230,originalFootprintRetained:true,operation:'Source-wide17m body;6-node northern head17..23m; original source object retained separately'}};
}
function kindForEdge(e:number){return e<=30?1:e<=32?2:e<=35?3:e<=37?4:5;}
export function f064Frames(c:BuildingComponent,family:number){
 if(c.city!=='munich'||c.objectId!==F064_ID.objectId||c.partId!==F064_ID.partId||!c.displayEstimates?.ownerAuthorizedReconstruction)throw Error('Exact F064 display required');
 if(!Number.isInteger(family)||family<=0)throw Error('Integrator must allocate family');
 return c.batches.map((b,bi)=>{const row:number[]=[];for(let v=0;v<b.positions.length/3;v++){const x=b.positions[v*3],y=b.positions[v*3+1],z=b.positions[v*3+2],u=x*F064_A[0]+z*F064_A[1],e=x*F064_E[0]+z*F064_E[1];let k=0;if(bi===1)k=kindForEdge(Math.floor(v/4));if(bi===3)k=[6,3,4,4,5,5][Math.floor(v/4)];row.push(u,k===0?e:y,k===0?y:e,k,family);}return row;});
}
export function applyF064Paint(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,family:number){let offset=0,objects=0,vertices=0;for(const c of components){const selected=c.city==='munich'&&c.objectId===F064_ID.objectId&&c.partId===F064_ID.partId&&c.displayEstimates?.ownerAuthorizedReconstruction;const rows=selected?f064Frames(c,family):null;if(selected)objects++;for(const [bi,b]of c.batches.entries()){const n=b.positions.length/3;if(selected){for(let v=0;v<n;v++)paint.set([...b.color,2],(offset+v)*4);frames.set(rows![bi],offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}

export const ownerF064Identity=(c:Identity)=>c.objectId===F064_ID.objectId&&c.partId===F064_ID.partId;
export const F064_RECONSTRUCTION_SHA='6b6f81a528ecb95e05c2573e9ec210884fa81191140b8a6854fe3bf6e8bc56f0';
export function ownerF064Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const drawable=components.map(c=>{
  if(c.city!==F064_ID.city||!ownerF064Identity(c))return c;
  const result=reconstructF064Component(c,nativePaintSignature);
  if(!result.applied){stats.error='Original F064 source signature changed; reconstruction withheld';return c;}
  const display=result.component,vertices=display.batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=display.batches.reduce((n,b)=>n+b.indices.length/3,0);
  stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
  stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:F064_RECONSTRUCTION_SHA,vertices,triangles,geometryRole:'owner-authorized-reconstruction'});
  return display;
 });return{components:drawable,stats};
}
export function ownerF064BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){return applyF064Paint(components,paint,frames,6203);}
