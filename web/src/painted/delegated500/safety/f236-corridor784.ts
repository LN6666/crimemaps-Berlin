import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type{BuildingComponent}from'../../../safety/building-mesh-types';
import{f236Ready524}from'./f236-source-display524';
import{nativePaintSignature}from'./progressive-native-signature';
const PIN={"city":"dortmund","objectId":"osm/way/320802117","partId":"osm/way/320802117/component/08a5084739aac409da4b","origin":[7.459547949999999,51.5179462],"geometrySignature":"51607bce","geometryProof":{"leafPath":"source-evidence/84297323898ac6e94fef/safety/buildings3d/dortmund/flat-00269.json.gz","leafSHA256":"1adcbf463a5af80db1c32ca21d6853252f3519b05b8b282003efbd38a48e69b3"}} as const;
const COPY='osm/way/320802117/component/08a5084739aac409da4b/owner-source-display524';
type Receipt=(c:BuildingComponent)=>string|undefined;
export function f236CorridorHold784(c:BuildingComponent,rows:readonly BuildingComponent[],leaf:Receipt|undefined,owner:Receipt|undefined,scope?:FrozenDataScope){
 if(c.city!==PIN.city||c.objectId!==PIN.objectId||(c.partId!==PIN.partId&&c.partId!==COPY))return false;
 if(!f236Ready524(rows,leaf,owner,scope))return false;
 const ns=rows.filter(n=>n.city===PIN.city&&n.objectId===PIN.objectId&&n.partId===PIN.partId);if(ns.length!==1)return false;const n=ns[0],p=n.sourceFeature?.properties;
 return JSON.stringify(n.origin)===JSON.stringify(PIN.origin)&&nativePaintSignature(n)===PIN.geometrySignature&&leaf?.(n)===PIN.geometryProof.leafSHA256&&String(p?.layer)==='-1'&&p?.indoor==='corridor'&&p?.tunnel==='yes'&&String(p?.level)==='0';
}

export const delegated500DataFunctionArities={"f236CorridorHold784":4} as const;
