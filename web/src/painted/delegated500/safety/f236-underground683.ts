import type{BuildingComponent}from'./building-mesh-renderer';
import{nativePaintSignature}from'./progressive-native-signature';
const PIN={"city":"dortmund","objectId":"osm/relation/4465799","partId":"osm/relation/4465799/component/3c990eef20863b8b6d21","origin":[7.4602699999999995,51.5183178],"leafSHA256":"f75b0122affdadb9f9332487e8aab9d2d661fe559e196cb3219f708ff2126fa0"} as const;
export function f236UndergroundHold683(c:BuildingComponent,leaf:((c:BuildingComponent)=>string|undefined)|undefined):boolean{if(!leaf||c.city!==PIN.city||c.objectId!==PIN.objectId||c.partId!==PIN.partId||JSON.stringify(c.origin)!==JSON.stringify(PIN.origin)||leaf(c)!==PIN.leafSHA256)return false;const p=c.sourceFeature?.properties;if(!p||String(p.layer)!=='-1'||String(p.level)!=='-1'||p.indoor!=='corridor'||p.description!=='Verteilerebene zur Stadtbahn')return false;return nativePaintSignature(c)===SIGNATURE;}
const SIGNATURE="5b6078f9";
