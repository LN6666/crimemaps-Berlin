import type {BuildingComponent} from './building-mesh-renderer';
import {nativePaintSignature} from './progressive-native-signature';
import {MARIENTURM050_DATA as M,MARIENTURM050_SHA as SHA} from './marienturm-specific-data';
import {MARIENTURM054_DUPLICATES as DUPLICATES} from './infill-marienturm054-duplicate-data';

const same=(a:ArrayLike<number>|undefined,b:ArrayLike<number>|undefined)=>!!a&&!!b&&a.length===b.length&&Array.from(a).every((v,i)=>Object.is(v,b[i]));
const metadataExact=(c:BuildingComponent,s:any)=>['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(s[k]));
const batchesExact=(c:BuildingComponent,expected:any[],fields:string[])=>c.batches.length===expected.length&&c.batches.every((b,i)=>fields.every(k=>same((b as any)[k],expected[i][k])));

/** Omit only three unchanged duplicate DISPLAY carriers after the exact parent DISPLAY exists.
 * The renderer records original sourceLoaded before owner reconstruction; SOURCE getters retain
 * these original native records. The independent osm/way/1073205488 canopy is never selected. */
export function infillMarienturm054RemoveDuplicateNativeParts(components:BuildingComponent[]){
 const parents=components.filter(c=>c.city==='frankfurt'&&c.objectId===M.identity.objectId&&c.partId===M.identity.partId);
 if(parents.length!==1)return components;
 const parent=parents[0];
 if(parent.displayEstimates?.marienturm050!==SHA||nativePaintSignature(parent)!=='f78109c2'||!metadataExact(parent,M.source)||!batchesExact(parent,M.display,['positions','normals','indices','color','paint','frames']))return components;
 const targets=components.filter(c=>c.city==='frankfurt'&&DUPLICATES.some(r=>c.objectId===r.objectId&&c.partId===r.partId));
 if(targets.length!==DUPLICATES.length||!DUPLICATES.every(s=>{
  const rows=targets.filter(c=>c.objectId===s.objectId&&c.partId===s.partId);
  return rows.length===1&&nativePaintSignature(rows[0])===s.geometrySignature&&metadataExact(rows[0],s)&&batchesExact(rows[0],s.batches,['positions','normals','indices','color']);
 }))return components;
 const exact=new Set(targets);
 return components.filter(c=>!exact.has(c));
}
