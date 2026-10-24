import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {progressiveAdmission} from './progressive-paint';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {GARDEN_AGGREGATE086_ROWS as ROWS,GARDEN_AGGREGATE086_SHA as SHA} from './garden-aggregate086-data';
export {GARDEN_AGGREGATE086_SHA} from './garden-aggregate086-data';
type Row=(typeof ROWS)[number];
const slot='infillGardenAggregate086',key=(c:Identity)=>c.objectId+'|'+c.partId,pins=new Map(ROWS.map(r=>[key(r),r]));
const owned=new WeakMap<BuildingComponent,{source:BuildingComponent;fingerprint:string;marker:object;masked:boolean}>(),cache=new WeakMap<BuildingComponent,BuildingComponent>();
export function gardenAggregate086Identity(c:Identity&{city?:string}){return(c.city===undefined||c.city==='frankfurt')&&pins.has(key(c));}
function exactValue(a:unknown,b:unknown):boolean{
 if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&Object.is(a,b);
 if(b===null||typeof b!=='object')return a===b;
 if(Array.isArray(b)){if(!(Array.isArray(a)||ArrayBuffer.isView(a))||a instanceof DataView)return false;const v=a as ArrayLike<unknown>;return v.length===b.length&&b.every((x,i)=>exactValue(v[i],x));}
 if(!a||typeof a!=='object'||Array.isArray(a)||ArrayBuffer.isView(a))return false;const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ak=Object.keys(x).sort(),bk=Object.keys(y).sort();return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&exactValue(x[k],y[k]));
}
function header(c:BuildingComponent,r:Row){return c.city==='frankfurt'&&key(c)===key(r)&&exactValue(c.origin,r.origin)&&exactValue(c.componentGeometry,r.componentGeometry)&&exactValue(c.sourceFeature,r.sourceFeature);}
function exactNative(c:BuildingComponent,r:Row){
 try{if(c.displayEstimates?.[slot]||!header(c,r)||c.batches.length!==r.batches.length)return false;
  if(!c.batches.every((b,i)=>(b.faceRole??null)===((r.batches[i]as unknown as{faceRole?:string}).faceRole??null)&&(['positions','normals','indices']as const).every(k=>exactValue(b[k],r.batches[i][k]))&&b.color.length===3&&r.batches[i].color.every((v,j)=>Number.isFinite(b.color[j])&&Object.is(Math.fround(b.color[j]),Math.fround(v)))&&(['paint','frames','writeMask']as const).every(k=>(b as unknown as Record<string,unknown>)[k]===undefined)))return false;
  ownerDisplayFingerprint(c);return nativePaintSignature(c)===r.signature&&exactValue(progressiveAdmission(c),r.admission);
 }catch{return false;}
}
function exactOwned(c:BuildingComponent){const p=owned.get(c),r=pins.get(key(c));if(!p||!r||c.displayEstimates?.[slot]!==p.marker)return false;try{return ownerDisplayFingerprint(c).fingerprint===p.fingerprint&&exactNative(p.source,r);}catch{return false;}}
function batchesCopy(bs:BuildingComponent['batches']):MeshBatch[]{return bs.map(b=>({...b,positions:b.positions.slice(),normals:b.normals.slice(),indices:b.indices.slice(),color:[...b.color]as[number,number,number]}));}
function markerRemoved(c:BuildingComponent){const estimates={...c.displayEstimates};delete estimates[slot];return estimates;}
function restore(c:BuildingComponent,r:Row):BuildingComponent{
 const p=owned.get(c);if(p)return p.source;
 // A public serialization of our source-only parent has lost private ownership.
 // Its exact native header identifies the already-present parent; restore only its
 // stored original mesh, never grant readiness or reconstruct an absent SOURCE.
 if(r.parent&&header(c,r)&&c.batches.length===0&&c.displayEstimates?.[slot])return{...c,batches:batchesCopy(r.batches as unknown as MeshBatch[]),displayEstimates:markerRemoved(c)};
 return c;
}
function make(source:BuildingComponent,r:Row):BuildingComponent{
 const prior=cache.get(source);if(prior&&exactOwned(prior))return prior;
 const marker={patchSHA:SHA,sourceRetained:true,sourceOnlyAlias:r.parent,geometryRole:r.parent?'duplicate-Garden-aggregate-source-only':'unchanged-original-Garden-part-private-readiness',allFourOriginalPartsRequired:true,originalParentHeightM:62.5,parentHeightWasLevelsEstimate:true,originalFourPartTagHeightsM:[60,127,76,100],originalSOURCEGeographicPlanUnionExactlyEqualsParent:true,geometryAndMaterialUpgradeClaimed:false,actualVisualAccepted:false,quality500Accepted:false};
 const result:BuildingComponent={...source,batches:r.parent?[]:batchesCopy(source.batches),displayEstimates:{...source.displayEstimates,[slot]:marker}};
 owned.set(result,{source,fingerprint:ownerDisplayFingerprint(result).fingerprint,marker,masked:r.parent});cache.set(source,result);return result;
}
/** Independent C candidate. Only the complete exact five-SOURCE cohort may create
 * four privately owned original-part clones and retire the duplicate parent DISPLAY.
 * All native SOURCE stay external/unchanged. Missing, duplicate, drift or public
 * DISPLAY clones restore the parent's original display; no global error/credit. */
export function gardenAggregate086Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const grouped=new Map<string,BuildingComponent[]>();for(const c of components)if(gardenAggregate086Identity(c)){const a=grouped.get(key(c))??[];a.push(c);grouped.set(key(c),a);}
 const complete=ROWS.every(r=>{const a=grouped.get(key(r));return a?.length===1&&(owned.has(a[0])?exactOwned(a[0]):exactNative(a[0],r));});
 const replacements=new Map<BuildingComponent,BuildingComponent>();
 if(complete){
  for(const r of ROWS.filter(r=>!r.parent)){const c=grouped.get(key(r))![0],p=owned.get(c),out=p?c:make(c,r);if(!exactOwned(out))throw Error('Garden original-part private readiness failed');replacements.set(c,out);}
  const fourPrivate=ROWS.filter(r=>!r.parent).every(r=>exactOwned(replacements.get(grouped.get(key(r))![0])!));
  if(fourPrivate){const r=ROWS.find(r=>r.parent)!,c=grouped.get(key(r))![0],p=owned.get(c);replacements.set(c,p?c:make(c,r));}
 }else for(const c of components){const r=pins.get(key(c));if(c.city==='frankfurt'&&r)replacements.set(c,restore(c,r));}
 let changed=false;const output=components.map(c=>{const out=replacements.get(c)??c;if(out===c)return c;changed=true;const r=pins.get(key(c))!,vertices=out.batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=out.batches.reduce((n,b)=>n+b.indices.length/3,0),original=owned.get(out)?.source??out;stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=original.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:SHA,vertices,triangles,geometryRole:complete?(r.parent?'duplicate-Garden-aggregate-source-only':'unchanged-original-Garden-part-private-readiness'):'original-Garden-display-restored-incomplete-cohort'});return out;});
 return{components:changed?output:components,stats,completeExactCohort:complete};
}
