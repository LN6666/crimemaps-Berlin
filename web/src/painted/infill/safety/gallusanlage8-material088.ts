import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {GALLUSANLAGE8_SOURCE088 as SOURCE,GALLUSANLAGE8_SIGNATURE088 as SIGNATURE,GALLUSANLAGE8_MATERIAL_SHA088 as SHA,GALLUSANLAGE8_PAINT088 as PAINT,GALLUSANLAGE8_FRAMES088 as FRAMES} from './gallusanlage8-material088-data';
const slot='gallusanlage8Material088';
function same(a:unknown,b:unknown):boolean{
 if(typeof a==='number'||typeof b==='number')return typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b)&&Object.is(a,b);
 if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
 const aa=Array.isArray(a)||ArrayBuffer.isView(a),bb=Array.isArray(b)||ArrayBuffer.isView(b);
 if(aa||bb){if(!aa||!bb||a instanceof DataView||b instanceof DataView)return false;const x=a as ArrayLike<unknown>,y=b as ArrayLike<unknown>;if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(!same(x[i],y[i]))return false;return true;}
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ka=Object.keys(x).filter(k=>x[k]!==undefined).sort(),kb=Object.keys(y).filter(k=>y[k]!==undefined).sort();return ka.length===kb.length&&ka.every((k,i)=>k===kb[i]&&same(x[k],y[k]));
}
function view(c:BuildingComponent,owned=false){const estimates={...c.displayEstimates};if(owned)delete estimates[slot];return{city:c.city,objectId:c.objectId,partId:c.partId,origin:c.origin,componentGeometry:c.componentGeometry,sourceFeature:c.sourceFeature,displayEstimates:estimates,batches:c.batches};}
function exactNative(c:BuildingComponent){try{return !c.displayEstimates?.[slot]&&same(view(c),SOURCE)&&nativePaintSignature(c)===SIGNATURE;}catch{return false;}}
type Owned={source:BuildingComponent;marker:object};
const owned=new WeakMap<BuildingComponent,Owned>(),cache=new WeakMap<BuildingComponent,BuildingComponent>();
function exactOwned(c:BuildingComponent){const r=owned.get(c);return !!r&&c.displayEstimates?.[slot]===r.marker&&exactNative(r.source)&&same(view(c,true),SOURCE);}
export const gallusanlage8Material088Identity=(c:Identity&{city?:string})=>c.city==='frankfurt'&&c.objectId===SOURCE.objectId&&c.partId===SOURCE.partId;
/** Material ownership only. Every original vertex/normal/index/color is copied
 * exactly; estimated25m/flat topology is retained, not interpreted as surveyed. */
export function gallusanlage8Material088Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},targets=components.filter(gallusanlage8Material088Identity);
 if(targets.length!==1)return{components,stats};const source=targets[0];
 if(owned.has(source)){if(exactOwned(source))return{components,stats};const r=owned.get(source)!;return{components:components.map(c=>c===source?r.source:c),stats};}
 if(!exactNative(source))return{components,stats};let out=cache.get(source);if(out&&!exactOwned(out))out=undefined;
 if(!out){
  const marker={patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,geometryRole:'original-native-topology-photo-material-only',originalHeightM:25,heightRole:'original10levels-times2.5m-display-estimate-not-measured',roofDetailRole:'photo-approximate-UV-shading-only-no-new-volume-or-hole',FRA030AnnexRosterOmission:true,newPrincipalCount:0,actualVisualAccepted:false,quality500Accepted:false};
  const batches:MeshBatch[]=source.batches.map(b=>({...b,positions:b.positions.slice(),normals:b.normals.slice(),indices:b.indices.slice(),color:[...b.color] as [number,number,number]}));
  out={...source,batches,displayEstimates:{...source.displayEstimates,[slot]:marker}};owned.set(out,{source,marker});cache.set(source,out);
 }
 stats.objects=1;stats.vertices=150;stats.triangles=88;stats.originalVertices=150;stats.components.push({objectId:SOURCE.objectId,partId:SOURCE.partId,sourcePartId:SOURCE.partId,patchSHA256:SHA,vertices:150,triangles:88,geometryRole:'original-native-topology-photo-material-only'});
 return{components:components.map(c=>c===source?out!:c),stats};
}
const expectedPaint=new Float32Array(PAINT),expectedFrames=new Float32Array(FRAMES);
/** Only a genuine private original clone may acquire the new private programme.
 * Full serialized/public clones, duplicate IDs, changed arrays and packed writes
 * cannot authorize materials. Unknown returns receive no window/door pattern. */
export function gallusanlage8Material088BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Ga8 exact packed lengths required');
 const targets=components.filter(gallusanlage8Material088Identity);if(targets.length!==1||!exactOwned(targets[0]))return{objects:0,vertices:0};const target=targets[0];let at=0;for(const c of components){if(c===target)break;at+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);}
 let pZero=true,pExpected=true,fZero=true,fExpected=true;for(let i=0;i<600;i++){pZero=pZero&&Object.is(paint[at*4+i],0);pExpected=pExpected&&Object.is(paint[at*4+i],expectedPaint[i]);}for(let i=0;i<750;i++){fZero=fZero&&Object.is(frames[at*5+i],0);fExpected=fExpected&&Object.is(frames[at*5+i],expectedFrames[i]);}
 if(!(pZero||pExpected)||!(fZero||fExpected))return{objects:0,vertices:0};paint.set(expectedPaint,at*4);frames.set(expectedFrames,at*5);return{objects:1,vertices:150,sourceRetained:true,geometryChanged:false,actualVisualAccepted:false};
}
