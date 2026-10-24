import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {WESTHAFEN_ORIGINAL_SHA102 as SHA,WESTHAFEN_ORIGINAL_DATA102 as DATA} from './westhafen-original102-data';
type Pin=typeof DATA[number];
type Record102={source:BuildingComponent;pin:Pin;snapshot:unknown};
const owned=new WeakMap<BuildingComponent,Record102>(),cache=new WeakMap<BuildingComponent,BuildingComponent>();
function copy(v:unknown):unknown{if(Array.isArray(v)||ArrayBuffer.isView(v))return Array.from(v as ArrayLike<unknown>,copy);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,copy(x)]));return v;}
function same(a:unknown,b:unknown):boolean{if(Object.is(a,b))return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;const aa=Array.isArray(a)||ArrayBuffer.isView(a),bb=Array.isArray(b)||ArrayBuffer.isView(b);if(aa||bb){if(!aa||!bb)return false;const x=a as ArrayLike<unknown>,y=b as ArrayLike<unknown>;return x.length===y.length&&Array.from(x).every((v,i)=>same(v,y[i]));}const x=a as Record<string,unknown>,y=b as Record<string,unknown>,k=Object.keys(x);return k.length===Object.keys(y).length&&k.every(s=>Object.prototype.hasOwnProperty.call(y,s)&&same(x[s],y[s]));}
const pin=(c:Identity&{city?:string})=>c.city===undefined||c.city==='frankfurt'?DATA.find(p=>p.objectId===c.objectId&&p.partId===c.partId):undefined;
export const westhafenOriginal102Identity=(c:Identity&{city?:string})=>!!pin(c);
function unchanged(c:BuildingComponent,r:Record102){return same(r.source,r.pin.source)&&same(c,r.snapshot);}
/** Material migration only: independent exact SOURCE admissions preserve the old
 * streamed behavior. A missing lower alias does not suppress an arrived parent.
 * No vertex, array, roof color, source relation or outline is changed. */
export function westhafenOriginal102Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const targets=components.filter(westhafenOriginal102Identity);if(!targets.length)return{components,stats};
 for(const c of targets){const r=owned.get(c),p=pin(c)!;if(targets.filter(x=>x.objectId===c.objectId&&x.partId===c.partId).length!==1||r&&!unchanged(c,r)||!r&&!same(c,p.source)){stats.error='Westhafen102 exact unchanged SOURCE/private output required';return{components,stats};}}
 const replacements=new Map<BuildingComponent,BuildingComponent>();
 for(const source of targets){const existing=owned.get(source);if(existing)continue;const p=pin(source)!;let out=cache.get(source);if(out&&!unchanged(out,owned.get(out)!)){stats.error='Westhafen102 cached private output changed';return{components,stats};}
  if(!out){out={...source,batches:source.batches,displayEstimates:{...source.displayEstimates,westhafenOriginal102:{patchSHA:SHA,originalLocalTarget:'T187',geometryChanged:false,sourceRetained:true,sourceGeometryAltered:false,originalDiamondMaterialRestored:true,roofNativeBaseRetained:true,roofSourceRGBRestoredToPacked:true,actualVisualAccepted:false}}};owned.set(out,{source,pin:p,snapshot:copy(out)});cache.set(source,out);}
  replacements.set(source,out);const v=p.sourceFingerprint.vertices,t=p.sourceFingerprint.indices/3;stats.objects++;stats.vertices+=v;stats.triangles+=t;stats.originalVertices+=v;stats.components.push({objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:v,triangles:t,geometryRole:'unchanged-native-geometry-original-T187-material-restoration-only'});
 }
 return{components:replacements.size?components.map(c=>replacements.get(c)??c):components,stats};
}
/** Private output only. Roofs regain exact original batchRGB without frame changes. */
export function westhafenOriginal102BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const n=components.reduce((s,c)=>s+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(paint.length!==n*4||frames.length!==n*5)throw Error('Westhafen102 exact packed lengths required');let at=0,objects=0,vertices=0;
 for(const c of components){const count=c.batches.reduce((s,b)=>s+b.positions.length/3,0),r=owned.get(c);if(r){if(!unchanged(c,r))throw Error('Westhafen102 SOURCE/private output changed before materials');for(const w of r.pin.walls){paint.set(w.paint,(at+w.vertex)*4);frames.set(w.frame,(at+w.vertex)*5);}for(const roof of r.pin.roofs)paint.set(roof.paint,(at+roof.vertex)*4);objects++;vertices+=r.pin.walls.length+r.pin.roofs.length;}at+=count;}return{objects,vertices,geometryChanged:false,sourceRetained:true,actualVisualAccepted:false};
}
