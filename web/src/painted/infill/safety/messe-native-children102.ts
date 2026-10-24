import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {MESSE_CHILD_SOURCES102 as ROWS,MESSE_CHILD_MATERIAL_PATCH102 as SHA,MESSE_PARENT_ORIGIN102 as ORIGIN} from './messe-native-children102-data';
export {MESSE_CHILD_MATERIAL_PATCH102} from './messe-native-children102-data';
type Pin=(typeof ROWS)[number];
const pins=new Map<string,Pin>(ROWS.map(r=>[r.objectId+'|'+r.partId,r]));
const owned=new WeakMap<BuildingComponent,{source:BuildingComponent;pin:Pin}>();
const key=(c:Identity)=>c.objectId+'|'+c.partId;
function exact(a:unknown,b:unknown):boolean{
 if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&Object.is(a,b);
 if(b===null||typeof b!=='object')return a===b;
 if(Array.isArray(b)){if(!(Array.isArray(a)||ArrayBuffer.isView(a))||a instanceof DataView)return false;const v=a as ArrayLike<unknown>;return v.length===b.length&&b.every((x,i)=>exact(v[i],x));}
 if(!a||typeof a!=='object'||Array.isArray(a)||ArrayBuffer.isView(a))return false;
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ax=Object.keys(x).sort(),by=Object.keys(y).sort();return ax.length===by.length&&ax.every((k,i)=>k===by[i]&&exact(x[k],y[k]));
}
function sourceExact(c:BuildingComponent,r:Pin):boolean{
 if(c.city!=='frankfurt'||c.objectId!==r.objectId||c.partId!==r.partId||!exact(c.origin,r.source.origin)||!exact(c.componentGeometry,r.source.componentGeometry)||!exact(c.sourceFeature,r.source.sourceFeature)||c.batches.length!==r.source.batches.length)return false;
 if(!c.batches.every((b,i)=>(b.faceRole??null)===((r.source.batches[i] as unknown as {faceRole?:string}).faceRole??null)&&(['positions','normals','indices','color'] as const).every(k=>exact(b[k],r.source.batches[i][k]))))return false;
 try{return nativePaintSignature(c)===r.signature;}catch{return false;}
}
export function messeNativeChildren102Identity(c:Identity):boolean{return pins.has(key(c));}
/** Independent exact present SOURCE only. Keep every original geometry array and parent; no new body or absence error. */
export function messeNativeChildren102Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const counts=new Map<string,number>();for(const c of components)if(c.city==='frankfurt'&&pins.has(key(c)))counts.set(key(c),(counts.get(key(c))??0)+1);
 let changed=false;const out=components.map(c=>{const r=pins.get(key(c));if(!r||c.city!=='frankfurt'||counts.get(key(c))!==1)return c;const prior=owned.get(c);if(prior)return sourceExact(c,r)&&sourceExact(prior.source,r)?c:prior.source;if(!sourceExact(c,r))return c;
  const display:BuildingComponent={...c,displayEstimates:{...c.displayEstimates,messeNativeChildren102:{patchSHA:SHA,sourceRetained:true,geometryChanged:false,materialOnly:true,parentUnchanged:true,actualVisualAccepted:false}}};owned.set(display,{source:c,pin:r});changed=true;const vertices=c.batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=c.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.originalVertices+=vertices;stats.triangles+=triangles;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:SHA,vertices,triangles,geometryRole:'exact-native-messeturm-child-material-only'});return display;});
 return{components:changed?out:components,stats};
}
/** Use the already registered26600 programme; common East/Up/North metre frames, no shader or geometry edits. */
export function messeNativeChildren102BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((k,b)=>k+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Messe102 complete packed lengths required');
 const count=new Map<string,number>();for(const c of components)if(c.city==='frankfurt'&&pins.has(key(c)))count.set(key(c),(count.get(key(c))??0)+1);
 for(const c of components){const o=owned.get(c);if(o&&(count.get(key(c))!==1||!sourceExact(c,o.pin)||!sourceExact(o.source,o.pin)))throw Error('Messe102 owned SOURCE/output changed');}
 const merc=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360)),unit=40075016.686*Math.cos(ORIGIN[1]*Math.PI/180);let at=0,objects=0,vertices=0;
 for(const c of components){const o=owned.get(c);if(o)objects++;const cu=40075016.686*Math.cos(c.origin[1]*Math.PI/180),scale=unit/cu,east=(c.origin[0]-ORIGIN[0])/360*unit,north=(merc(c.origin[1])-merc(ORIGIN[1]))/(2*Math.PI)*unit;
  for(const b of c.batches){const n=b.positions.length/3;if(o)for(let v=0;v<n;v++){const rgb=b.normals[v*3+1]>.40?o.pin.roofRGB:o.pin.wallRGB;paint.set([rgb[0],rgb[1],rgb[2],2],(at+v)*4);frames.set([b.positions[v*3]*scale+east,b.positions[v*3+1],b.positions[v*3+2]*scale+north,0,26600],(at+v)*5);vertices++;}at+=n;}
 }
 return{objects,vertices,sourceRetained:true,geometryChanged:false,actualVisualAccepted:false};
}
