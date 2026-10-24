import type {BuildingComponent} from './building-mesh-renderer';
import {infillC032OfficialReconstruction} from './infill-c032-official-runtime';
import {HANDELSHOF_BALCONIES103_DATA as D} from './handelshof-balconies103-data';

function encode(v:any):any {
 if(v===undefined)return ['undefined'];
 if(typeof v==='number')return ['number',Object.is(v,-0)?'-0':String(v)];
 if(v===null||typeof v!=='object')return v;
 if(Array.isArray(v)||ArrayBuffer.isView(v))return ['array',...Array.from(v as ArrayLike<any>,encode)];
 return ['object',...Object.keys(v).sort().map(k=>[k,encode(v[k])])];
}
function snapshot(c:BuildingComponent){return JSON.stringify(D.sourceKeys.map(k=>[k,Object.prototype.hasOwnProperty.call(c,k),encode((c as any)[k])]));}
const identity=(c:BuildingComponent)=>c.city===D.city&&c.objectId===D.objectId&&c.partId===D.partId;
const owned=new WeakMap<BuildingComponent,{source:BuildingComponent;displaySnapshot:string;vertices:ReadonlyArray<number>}>();
function exactTriangles(c:BuildingComponent):number[]|undefined {
 const found:number[]=[];let offset=0;
 for(const b of c.batches){
  for(let t=0;t<b.indices.length;t+=3){
   const ids=[b.indices[t],b.indices[t+1],b.indices[t+2]];
   const xyz=ids.map(v=>[...Array.from(b.positions.slice(v*3,v*3+3)),...Array.from(b.normals.slice(v*3,v*3+3))]);
   if(D.groups.some(g=>g.triangles.some(tri=>tri.every((v,k)=>v.every((x,j)=>x===xyz[k][j])))))found.push(...ids.map(v=>v+offset));
  }
  offset+=b.positions.length/3;
 }
 return found.length===12&&new Set(found).size===12?found:undefined;
}
/** Replaces only the original C032 reconstruction slot and delegates it exactly once. */
export function handelshofBalconies103Reconstruction(components:BuildingComponent[]){
 const sources=components.filter(identity),source=sources.length===1?sources[0]:undefined;
 const valid=source&&snapshot(source)===D.sourceSnapshot;
 const result=infillC032OfficialReconstruction(components);
 if(valid){
  const displays=result.components.filter(identity),display=displays.length===1?displays[0]:undefined;
  if(display&&display!==source){const vertices=exactTriangles(display);if(vertices)owned.set(display,{source,vertices,displaySnapshot:snapshot(display)});}
 }
 return result;
}
/** Final packed-only override. SOURCE, component arrays, original receipt and geometry stay untouched. */
export function handelshofBalconies103BaseMaterials(components:BuildingComponent[],_paint:Float32Array,frames:Float32Array){
 let offset=0,objects=0,vertices=0;
 for(const c of components){
  const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),record=owned.get(c);
  if(record&&snapshot(record.source)===D.sourceSnapshot&&snapshot(c)===record.displaySnapshot){
   // The original material writer must already have produced exactly its known street frame.
   const valid=record.vertices.every(v=>frames[(offset+v)*5+4]===26103&&frames[(offset+v)*5+3]===1);
   if(valid){for(const v of record.vertices){frames[(offset+v)*5+3]=D.marker;frames[(offset+v)*5+4]=D.family;}objects++;vertices+=record.vertices.length;}
  }
  offset+=n;
 }
 return {objects,vertices};
}
