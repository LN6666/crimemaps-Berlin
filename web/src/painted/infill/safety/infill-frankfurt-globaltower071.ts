import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {GLOBAL_TOWER_NATIVE_DATA067} from './infill-frankfurt-globaltower067-data';
import {GLOBAL_TOWER_OFFICIAL_DATA071,GLOBAL_TOWER_OFFICIAL_PATCH_SHA071} from './infill-frankfurt-globaltower071-data';
export {GLOBAL_TOWER_OFFICIAL_PATCH_SHA071} from './infill-frankfurt-globaltower071-data';
type Row=(typeof GLOBAL_TOWER_NATIVE_DATA067)[number];
type PaintedBatch=MeshBatch&{paint:number[];frames:number[]};
const key=(c:Identity)=>c.objectId+'|'+c.partId;
const pins=new Map(GLOBAL_TOWER_NATIVE_DATA067.map(r=>[key(r),r]));
const displayPins=new Map(GLOBAL_TOWER_OFFICIAL_DATA071.map(r=>[key(r),r]));
const physical=GLOBAL_TOWER_NATIVE_DATA067.filter(r=>!r.parent);
const owned=new WeakMap<BuildingComponent,{source:BuildingComponent;fingerprint:string;parentHeld:boolean}>();
export function globalTowerOfficial071Identity(c:Identity):boolean{return pins.has(key(c));}
function exactValue(a:unknown,b:unknown):boolean{
 if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&Object.is(a,b);
 if(b===null||typeof b!=='object')return a===b;
 if(Array.isArray(b)){if(!(Array.isArray(a)||ArrayBuffer.isView(a))||a instanceof DataView)return false;const q=a as ArrayLike<unknown>;return q.length===b.length&&b.every((v,i)=>exactValue(q[i],v));}
 if(!a||typeof a!=='object'||Array.isArray(a)||ArrayBuffer.isView(a))return false;
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ak=Object.keys(x).sort(),bk=Object.keys(y).sort();return ak.length===bk.length&&ak.every((v,i)=>v===bk[i]&&exactValue(x[v],y[v]));
}
function exactNative(c:BuildingComponent,r:Row):boolean{
 if(c.city!=='frankfurt'||!exactValue(c.origin,r.origin)||!exactValue(c.componentGeometry,r.componentGeometry)||!exactValue(c.sourceFeature,r.sourceFeature)||c.batches.length!==r.batches.length)return false;
 if(!c.batches.every((b,i)=>(b.faceRole??null)===r.batches[i].faceRole&&(['positions','normals','indices','color'] as const).every(k=>exactValue(b[k],r.batches[i][k]))))return false;
 try{return nativePaintSignature(c)===r.signature;}catch{return false;}
}
function exactOwned(c:BuildingComponent):boolean{const p=owned.get(c);if(!p)return false;try{return ownerDisplayFingerprint(c).fingerprint===p.fingerprint&&exactNative(p.source,pins.get(key(c))!);}catch{return false;}}
function makeDisplay(source:BuildingComponent,r:Row,parentHeld:boolean):BuildingComponent{
 const official=displayPins.get(key(r));
 let batches:PaintedBatch[]=[];
 if(!parentHeld&&r.parent){
  batches=source.batches.map(b=>({...b,positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices),color:Array.from(b.color) as [number,number,number],paint:[],frames:[]}));
  for(let bi=0;bi<batches.length;bi++){const b=batches[bi];for(let v=0;v<b.positions.length/3;v++){const p=b.positions.slice(v*3,v*3+3),roof=Math.abs(b.normals[v*3+1])>.1;b.paint.push(...(roof?[.48,.51,.50]:[.66,.63,.56]),2);b.frames.push(p[0],p[1],60,0,11489);}}
 }else if(!parentHeld){
  if(!official)throw Error('Missing exact GlobalTower official DISPLAY');
  batches=official.batches.map(b=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color] as [number,number,number],paint:[...b.paint],frames:[...b.frames]}));
 }
 const origin=r.parent?source.origin:official!.origin as [number,number];
 const result:BuildingComponent={...source,origin,batches,displayEstimates:{...source.displayEstimates,infillGlobalTowerOfficial071:{patchSHA:GLOBAL_TOWER_OFFICIAL_PATCH_SHA071,sourceRetained:true,sourceGeometryAltered:false,sourceOnlyAlias:parentHeld,aggregateParentOnly:r.parent,parentHeldOnlyWithAllThreeExactPhysicalParts:parentHeld,originalDescriptionSHA256:'4bf5530bcfb737c5097c5747bbc330f7b80bc30db01f6496e00ace53aaeb07e3',originalNativeFrameHemisphereRetained:true,independentPresentSourceOnly:true,noSourceRecovery:true,displayGeometryReconstructed:!r.parent,officialBodies:12,absoluteVerticalDatumM:98.109,datumCRS:'EPSG7423 ETRS89+EVRF2007 gravity H',coordinates:'renderer East/Up/North; one common measured datum',originalSourceHeightM:r.parent?60:r.objectId==='osm/way/174487249'?12.5:60,roofOfficialAbsoluteRangesM:[118.983,122.061,188.952,189.449,193.209,205.473,206.496,207.554],sourceBoundaryCaps:'Boolean clipping closure only, upper and lower edges on measured roof and ground planes; unknown solid material',remainingSourceOutlineDisagreement:'Retained SOURCE-only edge regions: short1.2267758876m2 within.233504m; Forum39.0623677233m2 within1.623950m. No high strip or roof invented.',unknownFacades:'Opposite/return faces, small roof core and Forum glazing retain related base; original operator photo-bound SW ribbons and SE solid ends only.',crownProfiles:'New local100.6m tall /83.9m short louver base PHOTO estimate; original54m rule is not stretched. Every measured roof height stays distinct.',actualVisualAccepted:false,detail70Accepted:false,quality500Accepted:false}}};
 owned.set(result,{source,fingerprint:ownerDisplayFingerprint(result).fingerprint,parentHeld});return result;
}
/** Each exact present physical SOURCE receives only measured official DISPLAY clipped to its own original footprint.
 * Only the duplicate aggregate parent is held when all3 physical parts are exact
 * and ready. Missing/duplicate/drift restores the parent; no absent body is made. */
export function globalTowerOfficial071Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const grouped=new Map<string,BuildingComponent[]>();for(const c of components)if(c.city==='frankfurt'&&globalTowerOfficial071Identity(c)){const a=grouped.get(key(c))??[];a.push(c);grouped.set(key(c),a);}
 const valid=new Map<string,BuildingComponent>(),rejected:string[]=[];for(const [k,a]of grouped){const c=a[0],r=pins.get(k)!;if(a.length===1&&(owned.has(c)?exactOwned(c):exactNative(c,r)))valid.set(k,c);else rejected.push(k);}
 const allReady=physical.every(r=>valid.has(key(r)));let changed=false;
 const out=components.map(c=>{if(valid.get(key(c))!==c)return c;const r=pins.get(key(c))!,previous=owned.get(c),parentHeld=r.parent&&allReady;
  if(previous&&previous.parentHeld===parentHeld)return c;
  const source=previous?.source??c,result=makeDisplay(source,r,parentHeld),vertices=result.batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=result.batches.reduce((n,b)=>n+b.indices.length/3,0);changed=true;stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=source.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:GLOBAL_TOWER_OFFICIAL_PATCH_SHA071,vertices,triangles,geometryRole:parentHeld?'owner-authorized-globaltower-aggregate-source-only':r.parent?'original-native-globaltower-parent-fallback':'owner-authorized-official-globaltower-12-measured-bodies-source-clipped'});return result;
 });return{components:changed?out:components,stats,rejected};
}
/** Final packed RGB/alpha and five frame fields; never encode family into RGB. */
export function globalTowerOfficial071BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Invalid official GlobalTower packed lengths');let at=0,objects=0,vertices=0;
 for(const c of components){if(owned.has(c)&&!exactOwned(c))throw Error('Mutated private official GlobalTower DISPLAY');const match=owned.has(c);if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){const p=b as PaintedBatch;paint.set(p.paint,at*4);frames.set(p.frames,at*5);vertices+=n;}at+=n;}}return{objects,vertices,actualVisualAccepted:false};
}
