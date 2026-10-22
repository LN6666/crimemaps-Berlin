import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
export const F078_ID={city:'munich',objectId:'osm/way/150797531',partId:'osm/way/150797531/component/0bccb31e9c1a3f1e5381',signature:'f2280ab4'};
const A=[.9587584129625707,-.2842222819792505],E=[.2842222819792505,.9587584129625707];
export function f078Frames(c:BuildingComponent,signature:(c:BuildingComponent)=>string,family:number){if(c.city!==F078_ID.city||c.objectId!==F078_ID.objectId||c.partId!==F078_ID.partId||(signature(c)!==F078_ID.signature&&!((c.displayEstimates?.F078PhotoEstimate as {sourceSignature?:string}|undefined)?.sourceSignature===F078_ID.signature&&Math.max(...c.batches[0].positions.filter((_,i)=>i%3===1))===18)))return null;if(!Number.isInteger(family)||family<=0)throw Error('Integrator allocates family');return c.batches.map((b,bi)=>{const f:number[]=[];for(let i=0;i<b.positions.length/3;i++){const x=b.positions[i*3],y=b.positions[i*3+1],z=b.positions[i*3+2],u=x*A[0]+z*A[1]+.7898848865156598,v=x*E[0]+z*E[1],edge=Math.floor(i/4);let kind=0;if(bi===1)kind=edge<=1?1:edge>=11&&edge<=14?2:edge===6?3:edge===19?4:5;f.push(u,kind===0?v:y*(c.displayEstimates?.F078PhotoEstimate?7.5/18:1),kind===0?y:v,kind,family);}return f;});}
export function applyF078Paint(components:BuildingComponent[],signature:(c:BuildingComponent)=>string,paint:Float32Array,frames:Float32Array,family:number){let offset=0,objects=0,vertices=0;for(const c of components){const rows=f078Frames(c,signature,family);if(rows)objects++;for(const [bi,b]of c.batches.entries()){const n=b.positions.length/3;if(rows){frames.set(rows[bi],offset*5);for(let i=0;i<n;i++)paint.set([...b.color,2],(offset+i)*4);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
// Photo estimate: central 107.51m frontage spans about880px, plinth-to-cornice150px =>18.3m; rounded18m.
export function reconstructF078Component(source:BuildingComponent,signature:(c:BuildingComponent)=>string){if(source.city!==F078_ID.city||source.objectId!==F078_ID.objectId||source.partId!==F078_ID.partId||signature(source)!==F078_ID.signature)return{component:source,applied:false};const batches=source.batches.map(b=>({...b,positions:Array.from(b.positions,(v,i)=>i%3===1?v*18/7.5:v),normals:Array.from(b.normals),indices:Array.from(b.indices),color:Array.from(b.color)}));const component={...source,batches,displayEstimates:{...source.displayEstimates,F078PhotoEstimate:{sourceSignature:F078_ID.signature,sourceHeightM:7.5,displayHeightM:18,method:'107.51m native central frontage × approximately150/880 image ratio =18.3m; rounded18m, photo approximation not survey',roof:'Four projected long glazing bands on retained flat native roof; raised shed cross-section remains unmodeled',sourceArraysRetained:true}}};return{component,sourceOriginal:source,applied:true,geometryChanges:{originalVertices:120,displayVertices:120,XZChanges:0,heightEstimateM:18}};}

export const ownerF078Identity=(c:Identity)=>c.objectId===F078_ID.objectId&&c.partId===F078_ID.partId;
export const F078_RECONSTRUCTION_SHA='35ba537f4adcb5bd29c5eb0132b4acf509dcc8f5e492acb8a94d08880a549793';
export function ownerF078Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const drawable=components.map(c=>{
  if(c.city!==F078_ID.city||!ownerF078Identity(c))return c;
  const result=reconstructF078Component(c,nativePaintSignature);
  if(!result.applied){stats.error='Original F078 source signature changed; reconstruction withheld';return c;}
  const display=result.component,vertices=display.batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=display.batches.reduce((n,b)=>n+b.indices.length/3,0);
  stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
  stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:F078_RECONSTRUCTION_SHA,vertices,triangles,geometryRole:'owner-authorized-reconstruction'});
  return {...display,displayEstimates:{...display.displayEstimates,ownerAuthorizedReconstruction:{sourceFootprintRetained:true,sourceArraysRetained:true,originalHeightM:7.5,displayHeightM:18,dimensions:'Photo-estimated18m; no added volumes; original source retained separately',actualVisualAccepted:false}}};
 });return{components:drawable,stats};
}
export function ownerF078BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){return applyF078Paint(components,nativePaintSignature,paint,frames,6204);}
