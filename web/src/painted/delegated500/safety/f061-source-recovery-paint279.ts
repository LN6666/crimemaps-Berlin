import type {BuildingComponent} from './building-mesh-renderer';
import {ownerShapePatchProfile} from './owner-shape-patch-display';
import {nativePaintSignature} from './progressive-native-signature';
const PIN={"number":"F061-Tower","city":"hamburg","objectId":"osm/way/45574500","partId":"osm/way/45574500/component/0e5473b3818ee68de406/owner-source-recovery828-tower","sourcePartId":"osm/way/45574500/component/0e5473b3818ee68de406","id":"owner-shape-F061-Tower-828","path":"/safety/buildings3d/owner-shape-patches/F061-Tower-828.json","bytes":35607,"sha256":"08c7c81054294980e408a3dc3f3fd715ccfbc45a669c1e2cdf4543cdbecb9496","bbox":[9.9899145,53.5809809,9.9902258,53.5811633],"vertices":333,"triangles":111,"max_height_m":86,"tile_key":"owner-shape-F061-Tower-828","geometryRole":"owner-authorized-reconstruction","geometrySignature":"42c75210"} as const;
export function applyF061RecoveryPaint279(rows:BuildingComponent[],colors:Float32Array,frames:Float32Array,profileOf=ownerShapePatchProfile){
 const p=profileOf(PIN.path),valid=!!p&&Object.entries(PIN).every(([k,v])=>JSON.stringify((p as any)[k])===JSON.stringify(v));
 const nativeSource=rows.find(c=>c.city===PIN.city&&c.objectId===PIN.objectId&&c.partId===PIN.sourcePartId&&nativePaintSignature(c)==='4fc8b401');
 const derived=valid&&nativeSource?rows.find(c=>c.city===PIN.city&&c.objectId===PIN.objectId&&c.partId===PIN.partId&&nativePaintSignature(c)===PIN.geometrySignature&&(c.sourceFeature?.properties?.owner_shape_patch as any)?.sourcePartId===PIN.sourcePartId&&(c.sourceFeature?.properties?.owner_shape_patch as any)?.number===PIN.number&&(c.sourceFeature?.properties?.owner_shape_patch as any)?.geometryRole===PIN.geometryRole):undefined;
 let at=0,nativeEnabled=false;for(const c of rows){const native=!!derived&&c.city===PIN.city&&c.objectId===PIN.objectId&&c.partId===PIN.sourcePartId&&nativePaintSignature(c)==="4fc8b401";if(native)nativeEnabled=true;for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3,at++)if(c===derived||native){colors.set([...b.color,2],at*4);frames.set([b.positions[j],b.positions[j+2],86,native?0:1,1647],at*5);}}
 return{derived:derived?1:0,nativeEnabled};
}
