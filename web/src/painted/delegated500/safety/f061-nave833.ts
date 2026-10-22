import type {BuildingComponent} from './building-mesh-renderer';
import {ownerShapePatchProfile} from './owner-shape-patch-display';
import {nativePaintSignature} from './progressive-native-signature';
const PIN={"number":"F061-Nave834","id":"F061-Nave834","tile_key":"F061-Nave834","city":"hamburg","objectId":"osm/way/45574500","partId":"osm/way/45574500/component/0e5473b3818ee68de406/owner-photoapprox-curved-nave834","sourcePartId":"osm/way/45574500/component/0e5473b3818ee68de406","origin":[9.990259949999999,53.58115765],"path":"/safety/buildings3d/owner-shape-patches/F061-Nave834.json","bytes":448689,"sha256":"bdc29c024c04c16aca93bb41a7fe6fa40209089a4bc905325395759bff18fbcf","vertices":4956,"triangles":1652,"max_height_m":16.8,"bbox":[9.9900879,53.5810265,9.9906054,53.5813344],"geometryRole":"owner-authorized-reconstruction","owner_authorized":true,"enabled":true,"family":1647,"additiveOnly":true,"holdNative":false,"geometrySignature":"514e9cfe"} as const;
/** Exact resident nave patch only. Native source geometry and all cap indices remain unchanged. */
export function applyF061Nave833(rows:BuildingComponent[],colors:Float32Array,frames:Float32Array,profileOf=ownerShapePatchProfile){
 const profile=profileOf(PIN.path),valid=!!profile&&Object.entries(PIN).every(([k,v])=>JSON.stringify((profile as any)[k])===JSON.stringify(v));
 const ns=rows.filter(c=>c.city===PIN.city&&c.objectId===PIN.objectId&&c.partId===PIN.sourcePartId&&nativePaintSignature(c)==='4fc8b401');
 const ds=valid&&ns.length===1?rows.filter(c=>c.city===PIN.city&&c.objectId===PIN.objectId&&c.partId===PIN.partId&&nativePaintSignature(c)===PIN.geometrySignature&&(c.sourceFeature?.properties?.owner_shape_patch as any)?.number===PIN.number&&(c.sourceFeature?.properties?.owner_shape_patch as any)?.sourcePartId===PIN.sourcePartId&&(c.sourceFeature?.properties?.owner_shape_patch as any)?.geometryRole===PIN.geometryRole):[];
 const derived=ds.length===1?ds[0]:undefined,native=derived?ns[0]:undefined;let at=0,nativeWallVertices=0;for(const c of rows)for(let k=0;k<c.batches.length;k++){const b=c.batches[k];for(let j=0;j<b.positions.length;j+=3,at++){
  const lowerNave=c===native&&k===1&&Math.floor(j/12)>=4;
  if(c===derived||lowerNave){colors.set([...b.color,2],at*4);frames.set([b.positions[j],b.positions[j+2],86,c===derived?(k===0?8331:8332):8332,1647],at*5);if(lowerNave)nativeWallVertices++;}
 }}return{derived:derived?1:0,nativeWallVertices,nativeCapHeld:false};
}
