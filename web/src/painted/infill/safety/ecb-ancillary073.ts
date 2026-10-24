import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {ECB_ANCILLARY_SHA073,ECB_ANCILLARY_NATIVE073,ECB_ANCILLARY_DATA073} from './ecb-ancillary073-data';
export {ECB_ANCILLARY_SHA073} from './ecb-ancillary073-data';
type Native=(typeof ECB_ANCILLARY_NATIVE073)[number];
type PaintedBatch=MeshBatch&{paint:number[];frames:number[]};
const key=(c:Identity)=>c.objectId+'|'+c.partId;
const pins=new Map(ECB_ANCILLARY_NATIVE073.map(r=>[key(r),r]));
const displays=new Map(ECB_ANCILLARY_DATA073.map(r=>[key(r),r]));
const owned=new WeakMap<BuildingComponent,{source:BuildingComponent;fingerprint:string}>();
export const ecbAncillary073Identity=(c:Identity)=>pins.has(key(c));
function equal(a:unknown,b:unknown):boolean{
 if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&Object.is(a,b);
 if(b===null||typeof b!=='object')return a===b;
 if(Array.isArray(b)){if(!(Array.isArray(a)||ArrayBuffer.isView(a))||a instanceof DataView)return false;const q=a as ArrayLike<unknown>;return q.length===b.length&&b.every((v,i)=>equal(q[i],v));}
 if(!a||typeof a!=='object'||Array.isArray(a)||ArrayBuffer.isView(a))return false;const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ak=Object.keys(x).sort(),bk=Object.keys(y).sort();return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&equal(x[k],y[k]));
}
function exactNative(c:BuildingComponent,r:Native):boolean{
 try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&equal(c.origin,r.origin)&&equal(c.componentGeometry,r.componentGeometry)&&equal(c.sourceFeature,r.sourceFeature)&&c.batches.length===r.batches.length&&c.batches.every((b,i)=>(b.faceRole??null)===r.batches[i].faceRole&&(['positions','normals','indices','color'] as const).every(k=>equal(b[k],r.batches[i][k])))&&nativePaintSignature(c)===r.signature&&f.fingerprint===r.fingerprint&&f.vertices===r.vertices&&f.indices===r.indices;}catch{return false;}
}
function exactOwned(c:BuildingComponent):boolean{
 const p=owned.get(c);if(!p)return false;try{return c.city==='frankfurt'&&ownerDisplayFingerprint(c).fingerprint===p.fingerprint&&exactNative(p.source,pins.get(key(c))!)&&(c.displayEstimates?.infillEcbAncillary073 as {patchSHA?:string}|undefined)?.patchSHA===ECB_ANCILLARY_SHA073;}catch{return false;}
}
/** Seven independently present exact SOURCEs. Main ECB, accepted hall and press are never claimed.
 * Open roof SOURCEs retain an open lower volume; their0.20m fascia is labelled a photo estimate.
 * The small unmeasured booth retains its original native arrays/7.5m display estimate.
 */
export function ecbAncillary073Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const groups=new Map<string,BuildingComponent[]>();for(const c of components)if(c.city==='frankfurt'&&ecbAncillary073Identity(c)){const a=groups.get(key(c))??[];a.push(c);groups.set(key(c),a);}
 const valid=new Set<BuildingComponent>(),rejected:string[]=[];for(const[k,cs]of groups){const c=cs[0];if(cs.length===1&&(owned.has(c)?exactOwned(c):exactNative(c,pins.get(k)!)))valid.add(c);else rejected.push(k);}
 let changed=false;const out=components.map(c=>{
  if(!valid.has(c)||owned.has(c))return c;const d=displays.get(key(c))!,r=pins.get(key(c))!;
  const batches:PaintedBatch[]=d.batches.map(b=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color]as[number,number,number],paint:[...b.paint],frames:[...b.frames],faceRole:'mixed' as const}));
  const result:BuildingComponent={...c,origin:d.origin as [number,number],batches,displayEstimates:{...c.displayEstimates,infillEcbAncillary073:{patchSHA:ECB_ANCILLARY_SHA073,sourceRetained:true,sourceGeometryAltered:false,noSourceRecovery:true,independentPresentSOURCEOnly:true,geometryRole:d.role,officialBody:d.measuredBodySuffix,absoluteVerticalDatumM:98.601,datumCRS:'EPSG7423 ETRS89+EVRF2007 gravity H',coordinates:'renderer East/Up/North',originalHeightUnmeasured:d.originalHeightUnmeasured,smallBoothNativePositionsNormalsAndOriginUnchanged:d.originalHeightUnmeasured,smallBoothDisplayWindingOnlyCorrected:d.originalHeightUnmeasured,openCanopyThicknessPhotoEstimateM:d.role.startsWith('open-')?.2:undefined,unknownOpeningsNotInvented:true,acceptedHallAndMainAndPressExcluded:true,actualVisualAccepted:false,detail70Accepted:false,quality500Accepted:false}}};
  owned.set(result,{source:c,fingerprint:ownerDisplayFingerprint(result).fingerprint});changed=true;stats.objects++;stats.vertices+=d.vertices;stats.triangles+=d.indices/3;stats.originalVertices+=r.vertices;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:ECB_ANCILLARY_SHA073,vertices:d.vertices,triangles:d.indices/3,geometryRole:'owner-authorized-ECB-ancillary-'+d.role});return result;
 });return{components:changed?out:components,stats,rejected};
}
/** Private exact output only. Families occupy frame[4], separate from RGB and alpha. */
export function ecbAncillary073BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const n=components.reduce((s,c)=>s+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(n)||paint.length!==n*4||frames.length!==n*5)throw Error('Invalid ECB ancillary packed lengths');let at=0,objects=0,vertices=0;
 for(const c of components){if(owned.has(c)&&!exactOwned(c))throw Error('Mutated private ECB ancillary DISPLAY');const yes=owned.has(c);if(yes)objects++;for(const b of c.batches){const n=b.positions.length/3;if(yes){const q=b as PaintedBatch;paint.set(q.paint,at*4);frames.set(q.frames,at*5);vertices+=n;}at+=n;}}return{objects,vertices,actualVisualAccepted:false};
}
