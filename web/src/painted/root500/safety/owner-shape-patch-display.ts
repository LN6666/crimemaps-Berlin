import {nativePaintSignature} from './progressive-native-signature';
import {OWNER_SHAPE_PATCH_PROFILES} from './owner-shape-patch-profiles';
import type {BuildingComponent} from './building-mesh-renderer';
export type OwnerShapePatchProfile=typeof OWNER_SHAPE_PATCH_PROFILES[number];
export const ownerShapePatchProfiles=(city:string)=>OWNER_SHAPE_PATCH_PROFILES.filter(p=>p.city===city);
export const ownerShapePatchProfile=(path:string)=>OWNER_SHAPE_PATCH_PROFILES.find(p=>p.path===path);
export function verifyOwnerShapePatchRows(rows:BuildingComponent[],profile:OwnerShapePatchProfile){
 if(rows.length!==1)throw Error('Owner shape patch component count mismatch');const c=rows[0],meta=c.sourceFeature?.properties?.owner_shape_patch as any;
 if(c.city!==profile.city||c.objectId!==profile.objectId||c.partId!==profile.partId||meta?.number!==profile.number||meta?.sourcePartId!==profile.sourcePartId||meta?.geometryRole!=='owner-authorized-reconstruction')throw Error('Owner shape patch identity mismatch');
 const vertices=c.batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=c.batches.reduce((n,b)=>n+b.indices.length/3,0);
 if(vertices!==profile.vertices||triangles!==profile.triangles)throw Error('Owner shape patch mesh count mismatch');
 for(const b of c.batches)for(let i=1;i<b.positions.length;i+=3)if(b.positions[i]<0||b.positions[i]>profile.max_height_m+1e-5)throw Error('Owner shape patch height mismatch');
 return rows;
}
/** Never remove a native body until its separately pinned replacement is resident in this commit. */
export function ownerShapePatchDisplayRows(rows:BuildingComponent[],profileOf:(c:BuildingComponent)=>OwnerShapePatchProfile|undefined,nativeLeaf:(c:BuildingComponent)=>string|undefined){
 const active=rows.map(profileOf).filter((p):p is OwnerShapePatchProfile=>!!p&&p.number!=="F036-WestFold70"&&!p.number.startsWith("F071-")&&!p.number.startsWith("F061-")&&!p.number.startsWith("F063-")&&p.number!=="F058-Upper311");
 const f058Ready=rows.some(c=>c.city==='hamburg'&&c.objectId==='osm/way/37785744'&&c.partId==='osm/way/37785744/component/2128d951c12116d7ea0d'&&nativeLeaf(c)==='1cc6474e7a83182fabc375a839bbc57fa883caf19ed3386fad90e2be21889908'&&nativePaintSignature(c)==='c30412a0');
 return rows.filter(c=>(c.partId!=='osm/way/37785744/component/2128d951c12116d7ea0d/owner-source-recovery311-upper'||f058Ready)&&!active.some(p=>c.objectId===p.objectId&&c.partId===p.sourcePartId||('replacesNative'in p&&p.replacesNative.some(r=>c.objectId===r.objectId&&c.partId===r.partId&&nativeLeaf(c)===r.nativeLeafSHA256))));
}
export function ownerShapePatchMetadata(rows:BuildingComponent[],profileOf:(c:BuildingComponent)=>OwnerShapePatchProfile|undefined){const components=rows.flatMap(c=>{const p=profileOf(c);return p?[{number:p.number,objectId:c.objectId,partId:c.partId,sourcePartId:p.sourcePartId,patchSHA256:p.sha256,vertices:p.vertices,triangles:p.triangles,geometryRole:'owner-authorized-reconstruction' as const}]:[];});return {components,geometryAdded:components.reduce((n,c)=>n+c.vertices,0),notNative:true as const};}
