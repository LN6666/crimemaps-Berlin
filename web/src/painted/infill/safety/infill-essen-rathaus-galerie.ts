import {readFrozenTable} from '../../../safety/frozen-paint-tables';
import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {decodeBuildingShard} from './building-mesh-codec';
const DISPLAY_LIST:any[]=readFrozenTable("fbf21988fd24e9d63197feeaf15da5f3085bb7e331546adadff2ffdbad45215a");
const SOURCE_SHARD:any=readFrozenTable("ef6aa3af04f88158d20d51e6dad903876e4f6895f14dca1388533bc0667bbb26");
const ORIGINAL=decodeBuildingShard(SOURCE_SHARD,"essen").components;
export const INFILL_GALERIE_SHA="fbf21988fd24e9d63197feeaf15da5f3085bb7e331546adadff2ffdbad45215a";
export const infillGalerieIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='essen')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const equalSource=(c:BuildingComponent,s:BuildingComponent)=>JSON.stringify(c.origin)===JSON.stringify(s.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(s.componentGeometry)&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=(s.batches[bi] as any)[k];return a?.length===e?.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));
export function infillGalerieReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 if(!components.some(infillGalerieIdentity))return{components,stats};
 const loaded=components.filter(infillGalerieIdentity);
 if(loaded.length===DISPLAY_LIST.length&&loaded.every(c=>(c.displayEstimates?.infillGalerieExterior as {patchSHA?:string}|undefined)?.patchSHA===INFILL_GALERIE_SHA))return{components,stats};
 // Streaming can expose a proper subset before the remaining real carriers arrive. Do not admit DISPLAY or report a geometry failure during that state.
 if(ORIGINAL.some(s=>!loaded.some(c=>c.objectId===s.objectId&&c.partId===s.partId)))return{components,stats};
 if(!ORIGINAL.every(s=>loaded.filter(c=>c.objectId===s.objectId&&c.partId===s.partId).length===1&&loaded.some(c=>c.objectId===s.objectId&&c.partId===s.partId&&equalSource(c,s)))){stats.error='Galerie requires complete unchanged real native source group';return{components,stats};}
 const replacements=DISPLAY_LIST.map((display:any)=>{const batches=display.batches.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],frames:[...b.frames],paint:[...b.paint]}));const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.components.push({objectId:display.objectId,partId:display.partId,sourcePartId:display.partId,patchSHA256:INFILL_GALERIE_SHA,vertices,triangles,geometryRole:'owner-authorized-reconstruction-per-real-source-identity'});const source=loaded.find(c=>c.objectId===display.objectId&&c.partId===display.partId)!;return{...source,...display,batches,sourceFeature:source.sourceFeature,displayEstimates:{...display.displayEstimates,infillGalerieExterior:{...display.displayEstimates.infillGalerieExterior,patchSHA:INFILL_GALERIE_SHA}}} as BuildingComponent;});
 stats.originalVertices=loaded.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
 return{components:[...components.filter(c=>!infillGalerieIdentity(c)),...replacements],stats};
}
export function infillGalerieBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='essen'&&!!c.displayEstimates?.infillGalerieExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
