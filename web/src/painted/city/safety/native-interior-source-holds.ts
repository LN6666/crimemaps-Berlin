import type {BuildingComponent} from './building-mesh-renderer';
/** Hold a verified underground source out of exterior drawing; original decoded arrays remain intact.
 * No interior depth/vault dimensions are inferred and no replacement mesh is generated. */
export function verifiedInteriorSourceHolds(components:readonly BuildingComponent[],leafSHA:(c:BuildingComponent)=>string|undefined):BuildingComponent[]{
 return components.filter(c=>{const p=c.sourceFeature.properties;return (c.city==='hannover'&&c.objectId==='osm/way/346586274'&&c.partId==='osm/way/346586274/component/88e6723c8020106156a8'&&leafSHA(c)==='d5882d41563f7952cbc68d5a0745fd87548f2445485e41976aace431efaba5ea'&&p?.['building:part']==='yes'&&p.indoor==='corridor'&&p.tunnel==='yes'&&String(p.level)==='-1'&&p.description==='Niki-de-Saint-Phalle-Promenade')||c.city==='bremen'&&c.objectId==='osm/way/305444732'&&c.partId==='osm/way/305444732/component/1af73a56cfa1a3132ea1'&&leafSHA(c)==='91147b5d0c8e4a8aebf13196e72e9068fb40a1be7a7dcd0273ddab14bb30cbba'&&p?.building==='cellar'&&p.indoor==='room'&&p.location==='underground'&&String(p.layer)==='-1'&&String(p.level)==='-1';});
}
