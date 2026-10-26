import {readFrozenTableAsync} from '../../../safety/frozen-paint-tables';
import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {decodeBuildingShard} from './building-mesh-codec';
const DISPLAY:any=(await readFrozenTableAsync("884a5230c8385146354e876296f429bc1d5e99da2f7f58a977eaa8a53d362ecc","painted/infill/safety/infill-synagoge-reconstruction.ts",0));
const SOURCE_SHARD:any=(await readFrozenTableAsync("430157f3e3cca56f8100e852ba513f4e492392c2c281f68cd25813ce178542ce","painted/infill/safety/infill-synagoge-reconstruction.ts",0));
const ORIGINAL=decodeBuildingShard(SOURCE_SHARD,"essen").components;
export const INFILL_SYNAGOGE_SHA="884a5230c8385146354e876296f429bc1d5e99da2f7f58a977eaa8a53d362ecc";
export const infillSynagogeIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='essen')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const equalSource=(c:BuildingComponent,s:BuildingComponent)=>JSON.stringify(c.origin)===JSON.stringify(s.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(s.componentGeometry)&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=(s.batches[bi] as any)[k];return a?.length===e?.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));
export function infillSynagogeReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 if(!components.some(infillSynagogeIdentity)||components.some(c=>c.displayEstimates?.infillSynagogeExterior))return{components,stats};
 const loaded=components.filter(infillSynagogeIdentity);
 if(!ORIGINAL.every(s=>loaded.filter(c=>c.objectId===s.objectId&&c.partId===s.partId).length===1&&loaded.some(c=>c.objectId===s.objectId&&c.partId===s.partId&&equalSource(c,s)))){stats.error='Alte Synagoge requires all19 unchanged real native source carriers';return{components,stats};}
 const batches=DISPLAY.batches.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],frames:[...b.frames],paint:[...b.paint]}));
 const source=loaded.find(c=>c.objectId===DISPLAY.objectId&&c.partId===DISPLAY.partId)!;
 const replacement={...source,...DISPLAY,batches,sourceFeature:source.sourceFeature,displayEstimates:{...DISPLAY.displayEstimates,infillSynagogeExterior:{...DISPLAY.displayEstimates.infillSynagogeExterior,patchSHA:INFILL_SYNAGOGE_SHA}}} as BuildingComponent;
 const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);
 stats.objects=1;stats.vertices=vertices;stats.triangles=triangles;stats.originalVertices=loaded.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);stats.components.push({objectId:DISPLAY.objectId,partId:DISPLAY.partId,sourcePartId:DISPLAY.partId,patchSHA256:INFILL_SYNAGOGE_SHA,vertices,triangles,geometryRole:'owner-authorized-reconstruction'});
 return{components:[...components.filter(c=>!infillSynagogeIdentity(c)),replacement],stats};
}
export function infillSynagogeBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='essen'&&!!c.displayEstimates?.infillSynagogeExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
