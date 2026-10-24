import type {BuildingComponent} from './building-mesh-renderer';
import {infillFrankfurtLowOfficeBulk70Reconstruction} from './infill-frankfurt-low-office-bulk70';
import {LOW_OFFICE_DATA,LOW_OFFICE_SHA} from './infill-frankfurt-low-office-bulk70-data';
import {nativePaintSignature} from './progressive-native-signature';
import {ML61_ENTRY092 as P} from './ml61-entry092-data';
const MODEL=LOW_OFFICE_DATA.groups.find((g:any)=>g.queueId===P.queueId).models[0];
const fields=['objectId','partId','city','origin','componentGeometry','sourceFeature','displayEstimates','batches'];
function canonical(v:any):any{if(ArrayBuffer.isView(v))return Array.from(v as unknown as ArrayLike<number>,canonical);if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).map(([k,x])=>[k,canonical(x)]));return v;}
function equal(a:any,b:any):boolean{if(Object.is(a,b))return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;if(ArrayBuffer.isView(a)||ArrayBuffer.isView(b)||Array.isArray(a)||Array.isArray(b)){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!equal(a[i],b[i]))return false;return true;}const ka=Object.keys(a).filter(k=>a[k]!==undefined),kb=Object.keys(b).filter(k=>b[k]!==undefined);return ka.length===kb.length&&ka.every(k=>kb.includes(k)&&equal(a[k],b[k]));}
const identity=(c:BuildingComponent)=>c.city==='frankfurt'&&c.objectId===P.objectId&&c.partId===P.partId;
const view=(c:any)=>Object.fromEntries(fields.map(k=>[k,c[k]]));
const sameNative=(c:BuildingComponent)=>LOW_OFFICE_SHA===P.requiredBulkSHA&&identity(c)&&Object.keys(c).every(k=>fields.includes(k))&&nativePaintSignature(c)===P.nativeSignature&&equal(view(c),view(MODEL.source));
const arrays=['positions','normals','indices','color','paint','frames'];
function sameDisplay(c:BuildingComponent){return identity(c)&&c.batches.length===MODEL.display.length&&c.batches.every((b,bi)=>Object.keys(b).every(k=>arrays.includes(k))&&arrays.every(k=>equal((b as any)[k],MODEL.display[bi][k])));}
const header=(c:BuildingComponent)=>Object.fromEntries(Object.entries(c).filter(([k])=>k!=='batches'));
type Receipt={source:BuildingComponent;header:any};const owned=new WeakMap<BuildingComponent,Receipt>();
function unchanged(c:BuildingComponent,r:Receipt){return sameNative(r.source)&&sameDisplay(c)&&equal(header(c),r.header);}
/** Replace the sole bulk70 reconstruction call, preserving its original optional
 * selection. Re-entry unwraps only this module's complete, unchanged own clone.
 * No public metadata or public copied DISPLAY can grant the entrance marker. */
export function ml61Entry092Reconstruction(components:BuildingComponent[],selectedQueueIds?:string[]){
 const input=components.map(c=>{const r=owned.get(c);return r&&unchanged(c,r)?r.source:c;});
 const rows=input.filter(identity),source=rows.length===1&&sameNative(rows[0])?rows[0]:undefined;
 const result=infillFrankfurtLowOfficeBulk70Reconstruction(input,selectedQueueIds);
 if(source){const matches=result.components.filter(identity);if(matches.length===1&&matches[0]!==source&&sameDisplay(matches[0]))owned.set(matches[0],{source,header:canonical(header(matches[0]))});}
 return result;
}
/** Final packed-only writer. Whole own DISPLAY + all prior packed values are
 * checked before any write. Geometry, paint, family and owner receipts stay exact. */
export function ml61Entry092MaterialFrames(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 let at=0,vertices=0,objects=0;for(const c of components){const n=c.batches.reduce((a,b)=>a+b.positions.length/3,0),r=owned.get(c);if(r&&unchanged(c,r)){
  let local=0,valid=true;for(let bi=0;bi<c.batches.length;bi++){const expected=MODEL.display[bi];for(let v=0;v<expected.positions.length/3;v++,local++){
   for(let k=0;k<4;k++)if(!Object.is(paint[(at+local)*4+k],Math.fround(expected.paint[v*4+k])))valid=false;
   for(let k=0;k<5;k++){const isMarker=bi===P.batch&&P.vertices.includes(local as never)&&k===3,got=frames[(at+local)*5+k],old=Math.fround(expected.frames[v*5+k]);if(!(Object.is(got,old)||(isMarker&&got===P.marker)))valid=false;}
  }}if(valid){for(const v of P.vertices)frames[(at+v)*5+3]=P.marker;vertices+=P.vertices.length;objects++;}
 }at+=n;}return{objects,vertices,geometryChanged:false,paintChanged:false,familyChanged:false,actualVisualAccepted:false};
}
