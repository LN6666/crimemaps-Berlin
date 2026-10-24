import type {BuildingComponent} from './building-mesh-renderer';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {COMMERZBANK_PODIUM_NATIVE060} from './commerzbank-podium-native060-data';
const pins=new Map<string,(typeof COMMERZBANK_PODIUM_NATIVE060)[number]>(COMMERZBANK_PODIUM_NATIVE060.map(r=>[r.objectId+'|'+r.partId,r]));
export function commerzbankPodiumExactNative060(c:BuildingComponent):boolean{
 const r=pins.get(c.objectId+'|'+c.partId);if(!r||c.city!=='frankfurt'||c.origin.length!==2||!r.origin.every((v,i)=>Object.is(v,c.origin[i]))||JSON.stringify(c.componentGeometry)!==r.geometryJSON||JSON.stringify(c.sourceFeature)!==r.sourceFeatureJSON||c.batches.length!==r.batchRoles.length||c.batches.some((b,i)=>(b.faceRole??null)!==r.batchRoles[i]))return false;
 try{const f=ownerDisplayFingerprint(c);return f.vertices===r.vertices&&f.indices===r.indices&&f.fingerprint===r.fingerprint;}catch{return false;}
}
