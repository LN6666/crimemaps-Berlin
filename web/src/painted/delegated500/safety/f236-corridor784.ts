import type{BuildingComponent}from'./building-mesh-renderer';
import{f236Ready524}from'./f236-source-display524';
import{nativePaintSignature}from'./progressive-native-signature';
const PIN={"city":"dortmund","objectId":"osm/way/320802117","partId":"osm/way/320802117/component/08a5084739aac409da4b","origin":[7.459547949999999,51.5179462],"geometrySignature":"51607bce","geometryProof":{"leafPath":"/Users/liangjuanning/Documents/ChatGPT/CrimeMaps/.runtime/review/public-launch-20261003/migration/geography-base-20261008-0001/non-data-engineering/three-dimensional/browser-root/crimemaps-Dortmund/safety/buildings3d/dortmund/flat-00269.json.gz","leafSHA256":"1adcbf463a5af80db1c32ca21d6853252f3519b05b8b282003efbd38a48e69b3"}} as const;
const COPY='osm/way/320802117/component/08a5084739aac409da4b/owner-source-display524';
type Receipt=(c:BuildingComponent)=>string|undefined;
export function f236CorridorHold784(c:BuildingComponent,rows:readonly BuildingComponent[],leaf:Receipt|undefined,owner:Receipt|undefined){
 if(c.city!==PIN.city||c.objectId!==PIN.objectId||(c.partId!==PIN.partId&&c.partId!==COPY))return false;
 if(!f236Ready524(rows,leaf,owner))return false;
 const ns=rows.filter(n=>n.city===PIN.city&&n.objectId===PIN.objectId&&n.partId===PIN.partId);if(ns.length!==1)return false;const n=ns[0],p=n.sourceFeature?.properties;
 return JSON.stringify(n.origin)===JSON.stringify(PIN.origin)&&nativePaintSignature(n)===PIN.geometrySignature&&leaf?.(n)===PIN.geometryProof.leafSHA256&&String(p?.layer)==='-1'&&p?.indoor==='corridor'&&p?.tunnel==='yes'&&String(p?.level)==='0';
}
