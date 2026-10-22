import type {BuildingComponent} from './building-mesh-renderer';
import {ownerShapePatchProfile} from './owner-shape-patch-display';
import {nativePaintSignature} from './progressive-native-signature';
const PIN = {"number":"F355-Tower","city":"hannover","objectId":"osm/way/501351791","partId":"osm/way/501351791/component/d014e41d8f56b770cad6/owner-hip-recovery220","sourcePartId":"osm/way/501351791/component/d014e41d8f56b770cad6","id":"owner-shape-F355-Tower-220","path":"/safety/buildings3d/owner-shape-patches/F355-Tower-220.json","bytes":5731,"sha256":"94f972b5a452e8a3032505b8a84353d91b6f727b08b0d922673eb3c92bcb731f","bbox":[9.7210721,52.3873405,9.7212666,52.3874366],"vertices":42,"triangles":14,"max_height_m":33,"tile_key":"owner-shape-F355-Tower-220","geometryRole":"owner-authorized-reconstruction","geometrySignature":"39feff37"} as const;
const FRAME = {"batchIndex":0,"firstVertex":0,"vertexCount":30,"family":4091,"uAxis":[0.36901927104344867,0,-0.9293049266119949],"vAxis":[0.9293049266119949,0,0.36901927104344867],"uOrigin":-401.1391702735018,"vOrigin":435.57862446801664,"width":65,"height":33} as const;
export function isF355Tower220(c:BuildingComponent){
 const m=c.sourceFeature?.properties?.owner_shape_patch as {number?:string;sourcePartId?:string;geometryRole?:string;photoSHA256?:string;descriptionFileSHA256?:string}|undefined;
 return c.city==='hannover'&&c.objectId===PIN.objectId&&c.partId===PIN.partId&&m?.number==='F355-Tower'&&m?.sourcePartId===PIN.sourcePartId&&m?.geometryRole==='owner-authorized-reconstruction'&&m?.photoSHA256==='62146e2a1e6e1aea335f9beda74010a03bb46c95d9870b7c8705c9d30296974a'&&m?.descriptionFileSHA256==='73f5d5edda5579101c0911bebf12105d689418f45ee1ccf8f6b327aa96c73a58'&&String(ownerShapePatchProfile(PIN.path)?.sha256)===PIN.sha256&&nativePaintSignature(c)===PIN.geometrySignature;
}
export function f355TowerDisplay220(rows:BuildingComponent[]){
 const resident=rows.some(isF355Tower220);
 const held=resident?rows.filter(c=>c.city==='hannover'&&c.objectId===PIN.objectId&&c.partId===PIN.sourcePartId&&nativePaintSignature(c)==='edf93b44'):[];
 const hidden=new Set(held);return {held,drawable:rows.filter(c=>!hidden.has(c))};
}
export function applyF355Tower220(rows:BuildingComponent[],colors:Float32Array,frames:Float32Array){
 let at=0;
 for(const c of rows){const admitted=isF355Tower220(c);
  for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3,at++)if(admitted){
   const u=b.positions[j]*FRAME.uAxis[0]+b.positions[j+1]*FRAME.uAxis[1]+b.positions[j+2]*FRAME.uAxis[2]-FRAME.uOrigin;
   const v=b.positions[j]*FRAME.vAxis[0]+b.positions[j+1]*FRAME.vAxis[1]+b.positions[j+2]*FRAME.vAxis[2]-FRAME.vOrigin;
   colors.set([...b.color,2],at*4);frames.set([u,v,33,65,4091],at*5);
  }
 }
 return {colors,frames};
}
