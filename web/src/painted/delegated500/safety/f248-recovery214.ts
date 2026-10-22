import type {BuildingComponent} from './building-mesh-renderer';
import {ownerShapePatchProfile} from './owner-shape-patch-display';
import {nativePaintSignature} from './progressive-native-signature';
// Only separately labelled F248 display candidates; original native admissions remain unchanged.
const PINS = [{"number":"F248-Lohnhalle","city":"dortmund","objectId":"osm/way/83179304","partId":"osm/way/83179304/component/cae9f8b6cd8d14dcef79/owner-recovery214","sourcePartId":"osm/way/83179304/component/cae9f8b6cd8d14dcef79","id":"owner-shape-F248-Lohnhalle-214","path":"/safety/buildings3d/owner-shape-patches/F248-Lohnhalle-367.json","bytes":367497,"sha256":"24608c5babecd3dc397b3433288ba399cd9bdc71fe83cd2d7d141d84864d7217","bbox":[7.3334931552264155,51.51798621686936,7.333794306651742,51.518229233775024],"vertices":3687,"triangles":1229,"max_height_m":19.1,"tile_key":"owner-shape-F248-Lohnhalle-214","geometryRole":"owner-authorized-reconstruction","geometrySignature":"41823ec8"},{"number":"F248-ZollernII","city":"dortmund","objectId":"osm/node/8975884110","partId":"osm/node/8975884110/owner-recovery214","sourcePartId":"osm/node/8975884110/source-point","id":"owner-shape-F248-ZollernII-214","path":"/safety/buildings3d/owner-shape-patches/F248-ZollernII-214.json","bytes":170385,"sha256":"c2744168cc5f34e01143e30f11c49cb016978a3486db6d1eaf24098c6d83ec54","bbox":[7.334276944643211,51.51752693093889,7.334729401532285,51.51781432279529],"vertices":1638,"triangles":546,"max_height_m":38,"tile_key":"owner-shape-F248-ZollernII-214","geometryRole":"owner-authorized-reconstruction","geometrySignature":"e914d726"},{"number":"F248-ZollernIV","city":"dortmund","objectId":"osm/way/433077428","partId":"osm/way/433077428/component/440e6be340ee698f6b2a/headframe-node-8975884109-recovery214","sourcePartId":"osm/way/433077428/component/440e6be340ee698f6b2a","id":"owner-shape-F248-ZollernIV-214","path":"/safety/buildings3d/owner-shape-patches/F248-ZollernIV-214.json","bytes":168542,"sha256":"e1f2018f4e7ea1e8012e266efaaf9c5227bb534506732a7cff0aa61c6b796a38","bbox":[7.3349162828562875,51.51834705484361,7.335240992922403,51.5185021533023],"vertices":1638,"triangles":546,"max_height_m":40,"tile_key":"owner-shape-F248-ZollernIV-214","geometryRole":"owner-authorized-reconstruction","geometrySignature":"9746c653"}] as const;
export function isF248Recovery214(c:BuildingComponent){
 const m=c.sourceFeature?.properties?.owner_shape_patch as {number?:string;sourcePartId?:string;geometryRole?:string;descriptionFileSHA256?:string;sourceParent?:string}|undefined;
 const pin=PINS.find(p=>c.city==='dortmund'&&c.objectId===p.objectId&&c.partId===p.partId);
 if(!pin||m?.number!==pin.number||m?.sourcePartId!==pin.sourcePartId||m?.geometryRole!=='owner-authorized-reconstruction'||m?.sourceParent!=='osm/way/33627795'||m?.descriptionFileSHA256!=='ea9257f28ef1b86db20265364b0c94d714e0feae4b32e3904d55fed13a8178fa')return false;
 const profile=ownerShapePatchProfile(pin.path);
 return profile?.sha256===pin.sha256&&nativePaintSignature(c)===pin.geometrySignature;
}
export function applyF248Recovery214(components:BuildingComponent[],colors:Float32Array,frames:Float32Array){
 let at=0;
 for(const c of components){const admitted=isF248Recovery214(c);
  for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3,at++)if(admitted){colors.set([...b.color,2],at*4);frames.set([b.positions[j],b.positions[j+2],c.objectId==='osm/way/83179304'&&[1, 17].includes(c.batches.indexOf(b))?41:40,60,9008],at*5);}
 }
 return {colors,frames};
}
export const F248_RECOVERY_214_GLSL=`
vec3 f248Recovery214(vec3 base,vec3 p,vec3 n,vec4 frame){
 vec3 c=base;
 // dark pitched hall/porch roof only: tile seams, no false glass on cap surfaces.
 if(frame.z>40.5&&frame.z<41.5&&n.y>.18){float u=frame.x*.855235+frame.y*(-.518240);float v=frame.x*.518240+frame.y*.855235;float seam=max(1.-smoothstep(.018,.045,abs(fract(u/.34)-.5)),1.-smoothstep(.018,.045,abs(fract(v/.24)-.5)));c*=1.-.14*seam;}

 if(base.r>.45&&base.r>base.g*1.6){
  float u=abs(n.x)>abs(n.z)?frame.y:frame.x;
  float aa=max(fwidth(p.y),.012),row=floor(p.y/.22);
  float hj=1.-smoothstep(.012,.012+aa,abs(mod(p.y+.11,.22)-.11));
  float vj=1.-smoothstep(.012,.012+max(fwidth(u),.012),abs(mod(u+mod(row,2.)*.25+.25,.50)-.25));
  float lod=1.-smoothstep(.1,.35,max(fwidth(p.y),fwidth(u)));
  c*=1.-lod*.14*max(hj,vj);
 }
 return c;
}
`;

// Keep original source rows reachable through renderer source getters; suppress only exact resident duplicates at packing.
const SOURCE_PINS = [{"objectId":"osm/way/83179304","partId":"osm/way/83179304/component/cae9f8b6cd8d14dcef79","geometrySignature":"d5b0938d","replacementPartId":"osm/way/83179304/component/cae9f8b6cd8d14dcef79/owner-recovery214"},{"objectId":"osm/way/433077428","partId":"osm/way/433077428/component/440e6be340ee698f6b2a","geometrySignature":"1758640a","replacementPartId":"osm/way/433077428/component/440e6be340ee698f6b2a/headframe-node-8975884109-recovery214"}] as const;
export function f248RecoveryDisplay214(rows:BuildingComponent[]){
 const resident=new Set(rows.filter(isF248Recovery214).map(c=>c.partId));
 const held=rows.filter(c=>SOURCE_PINS.some(p=>c.city==='dortmund'&&c.objectId===p.objectId&&c.partId===p.partId&&resident.has(p.replacementPartId)&&nativePaintSignature(c)===p.geometrySignature));
 const suppressed=new Set(held);return {held,drawable:rows.filter(c=>!suppressed.has(c))};
}
