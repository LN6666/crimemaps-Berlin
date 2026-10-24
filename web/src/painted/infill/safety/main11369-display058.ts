import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {MAIN11369_SOURCE057 as SOURCES} from './main11369-source057';
import {MAIN11369_DISPLAY_SHA058 as SHA,MAIN11369_DISPLAY_DATA058 as PLANS} from './main11369-display-data058';
type Record058={source:BuildingComponent;snapshot:BuildingComponent;frames:Float32Array;selected:{vertex:number;family:number}[];geometryChanged:boolean};
const owned=new WeakMap<BuildingComponent,Record058>(),cache=new WeakMap<BuildingComponent,BuildingComponent>();
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const exact=(a:BuildingComponent,b:BuildingComponent)=>a.city==='frankfurt'&&a.objectId===b.objectId&&a.partId===b.partId&&same(a.origin,b.origin)&&same(a.componentGeometry,b.componentGeometry)&&same(a.sourceFeature,b.sourceFeature)&&a.batches.length===b.batches.length&&a.batches.every((x,bi)=>['positions','normals','indices','color'].every(k=>{const u=(x as any)[k]as ArrayLike<number>,v=(b.batches[bi]as any)[k]as ArrayLike<number>;return u?.length===v?.length&&Array.from(u).every((n,i)=>Object.is(n,v[i]));}));
const snapshot=(c:BuildingComponent):BuildingComponent=>({...c,origin:[...c.origin],componentGeometry:JSON.parse(JSON.stringify(c.componentGeometry)),sourceFeature:JSON.parse(JSON.stringify(c.sourceFeature)),batches:c.batches.map(b=>({...b,positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices),color:Array.from(b.color)}))});
export const main11369Display058Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&PLANS.some(p=>p.geometryChanged&&p.objectId===c.objectId&&p.partId===c.partId);
export const main11369Display058OriginalSource=(c:BuildingComponent)=>owned.get(c)?.geometryChanged?owned.get(c)?.source:undefined;
/** Actual triangle removal/clipping of30 proven duplicate intervals. SOURCE arrays are never edited.
 * All unproven193m planes and all native roofs remain. No shader discard or height-based silhouette edit. */
export function main11369Display058Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const fail=(reason:string)=>{stats.error=reason;return{components,stats};};
 for(const c of components){const o=owned.get(c);if(o&&!exact(c,o.snapshot))return fail('Main058 privately owned DISPLAY arrays altered');}
 const sourceRows=components.map(c=>owned.get(c)?.source??c),targets=new Map<string,BuildingComponent>();
 const unchangedSources=()=>sourceRows.every((c,i)=>c===components[i])?components:sourceRows;
 for(const s of SOURCES){const rows=sourceRows.filter(c=>c.objectId===s.objectId&&c.partId===s.partId);if(rows.length>1||rows.length===1&&!exact(rows[0],s)){stats.error='Main058 exact native SOURCE duplicated or altered';return{components:unchangedSources(),stats};}if(rows.length===1)targets.set(s.objectId,rows[0]);}
 // A streamed view may omit this unrelated group. Derive nothing until all three exact SOURCE members are resident.
 if(targets.size!==SOURCES.length)return{components:unchangedSources(),stats};
 const replacements=new Map<BuildingComponent,BuildingComponent>();
 for(const p of PLANS){const source=targets.get(p.objectId)!;let display=cache.get(source);if(display){const prior=owned.get(display);if(!prior||!exact(display,prior.snapshot))return fail('Main058 cached DISPLAY arrays altered');}else{
   const batches:MeshBatch[]=p.geometryChanged?p.batches.map((b,bi)=>bi===0?source.batches[0]:{...source.batches[bi],positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:source.batches[bi].color}):source.batches;
   display=p.geometryChanged?{...source,batches,displayEstimates:{...source.displayEstimates,main11369Display058:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,geometryRole:'proved-native-coface-interval-retirement-only',unverifiedHighGlassPlanes:'retained full native193m; not photo-accepted',actualVisualAccepted:false}}}:{...source};
   owned.set(display,{source,snapshot:snapshot(display),frames:new Float32Array(p.frames),selected:p.selected,geometryChanged:p.geometryChanged});cache.set(source,display);
  }
  replacements.set(source,display);
  if(p.geometryChanged){const n=display.batches.reduce((n,b)=>n+b.positions.length/3,0),t=display.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=n;stats.triangles+=t;stats.originalVertices+=source.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:n,triangles:t,geometryRole:'proved-native-coface-interval-retirement-only'});}
 }
 return{components:sourceRows.map(c=>replacements.get(c)??c),stats};
}
/** Rebind current metre frames on the two exact derived carriers, then override only surviving11369 walls.
 * Other941 materials, all roof buffers and every unrelated object's attributes remain untouched. */
export function main11369Display058BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 let total=0;for(const c of components)total+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
 if(paint.length!==total*4||frames.length!==total*5)throw Error('Main058 complete material buffers required');
 const records=components.map(c=>({c,o:owned.get(c)})).filter(x=>x.o);
 if(records.length===0)return{objects:0,vertices:0,selectedVertices:0};
 if(records.length!==3||!PLANS.every(p=>records.some(x=>x.c.objectId===p.objectId&&x.c.partId===p.partId)))throw Error('Main058 all3 privately validated carriers required');
 for(const {c,o}of records)if(!exact(c,o!.snapshot))throw Error('Main058 privately owned DISPLAY changed before materials');
 let at=0,objects=0,vertices=0,selectedVertices=0;
 for(const c of components){const n=c.batches.reduce((n,b)=>n+b.positions.length/3,0),o=owned.get(c);if(o){
   if(o.geometryChanged)frames.set(o.frames,at*5);
   for(const s of o.selected){const i=at+s.vertex,frame=s.vertex*5;frames.set(o.frames.subarray(frame,frame+5),i*5);paint.set(s.family===45150?[.40,.52,.56,2]:[.60,.61,.55,2],i*4);selectedVertices++;}
   objects++;vertices+=n;
  }at+=n;}
 return{objects,vertices,selectedVertices,sourceRetained:true,actualVisualAccepted:false};
}
