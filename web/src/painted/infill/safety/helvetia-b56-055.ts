import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {HELVETIA_B56_SOURCE055 as SOURCE} from './helvetia-b56-source055';
export const HELVETIA_B56_SHA055='3a341ca9a1a2003bc4dadf007de2a79392608dee014a04eb68b0f780e8269fb6';
export const helvetiaB56Identity055=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&c.objectId===SOURCE.objectId&&c.partId===SOURCE.partId;
type Owned={source:BuildingComponent;paint:Float32Array;frames:Float32Array;signature:string};
const owned=new WeakMap<BuildingComponent,Owned>(),cache=new WeakMap<BuildingComponent,BuildingComponent>();
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const exact=(c:BuildingComponent)=>c.city==='frankfurt'&&same(c.origin,SOURCE.origin)&&same(c.componentGeometry,SOURCE.componentGeometry)&&same(c.sourceFeature,SOURCE.sourceFeature)&&nativePaintSignature(c)==='195c9b27'&&c.batches.length===SOURCE.batches.length&&c.batches.every((b,i)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k] as ArrayLike<number>,s=(SOURCE.batches[i]as any)[k] as ArrayLike<number>;return a?.length===s?.length&&Array.from(a).every((v,j)=>Object.is(v,s[j]));}));
export const helvetiaB56OriginalSource055=(c:BuildingComponent)=>owned.get(c)?.source;
/** Paint-only private DISPLAY clone. Original SOURCE geometry and buffers are retained. */
export function helvetiaB56Reconstruction055(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const targets=components.filter(helvetiaB56Identity055);if(!targets.length)return{components,stats};
 if(targets.length!==1){stats.error='B56 exact one SOURCE required';return{components,stats};}
 const current=targets[0],source=owned.get(current)?.source??current;
 if(!exact(source)){stats.error='B56 exact native SOURCE identity, metadata, geometry and arrays required';return{components:components.map(c=>c===current?source:c),stats};}
 let clone=cache.get(source);if(clone&&owned.get(clone)?.signature!==nativePaintSignature(clone))clone=undefined;
 if(!clone){const paint:number[]=[],frames:number[]=[];let eastArc=0;
  for(const [bi,b]of source.batches.entries())for(let v=0;v<b.positions.length/3;v++){
   if(bi===0){paint.push(.49,.50,.49,2);frames.push(b.positions[v*3],b.positions[v*3+2],17.5,0,45101);continue;}
   const edge=Math.floor(v/4),j=edge*4,a=[b.positions[j*3],b.positions[j*3+2]],z=[b.positions[(j+1)*3],b.positions[(j+1)*3+2]],width=Math.hypot(z[0]-a[0],z[1]-a[1]),t=v%4,u=t===1||t===2?width:0;
   if(edge>=1&&edge<=3&&t===0)eastArc+=edge===1?0:Math.hypot(b.positions[j*3]-b.positions[(j-4)*3],b.positions[j*3+2]-b.positions[(j-4)*3+2]);
   const mode=edge===0?0:edge<=3?1:edge===4?2:3;
   paint.push(.86,.86,.83,2);frames.push(u+(mode===1?eastArc:0),b.positions[v*3+1],17.5,mode,45100);
  }
  clone={...source,displayEstimates:{...source.displayEstimates,helvetiaB56055:{patchSHA:HELVETIA_B56_SHA055,geometryRole:'complete-original-native-envelope-paint-only',sourceRetained:true,sourceGeometryAltered:false,reference:'https://hms-architekten.de/projekte/Helvetia_Frankfurt/',front:'white folded architectural concrete, six office rows, dark inset windows, bronze first-bay vents, ground glazing',unknown:'north and west not photographed: restrained concrete only; roof cover schematic neutral grey, no invented plant',actualVisualAccepted:false}}};
  owned.set(clone,{source,paint:new Float32Array(paint),frames:new Float32Array(frames),signature:nativePaintSignature(clone)});cache.set(source,clone);
 }
 const vertices=35,triangles=19;stats.objects=1;stats.vertices=vertices;stats.originalVertices=vertices;stats.triangles=triangles;stats.components.push({objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:HELVETIA_B56_SHA055,vertices,triangles,geometryRole:'complete-original-native-envelope-paint-only'});
 return{components:components.map(c=>c===current?clone!:c),stats};
}
export function helvetiaB56BaseMaterials055(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),o=owned.get(c);if(o){if(!exact(o.source)||nativePaintSignature(c)!==o.signature)throw Error('B56 owned DISPLAY changed');if((offset+n)*4>paint.length||(offset+n)*5>frames.length)throw Error('B56 material buffers too short');paint.set(o.paint,offset*4);frames.set(o.frames,offset*5);objects++;vertices+=n;}offset+=n;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};}
