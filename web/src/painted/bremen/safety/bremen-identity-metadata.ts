import type {Identity} from "../../../safety/building-mesh-types";
import {BREMEN_IDENTITY_PROJECTIONS,BREMEN_IDENTITY_CANDIDATES,BREMEN_IDENTITY_PROVENANCE} from './bremen-identity-projections';
import {EDGE70_IDENTITIES} from './bremen-ag70-identities';
import {BREMEN_DEMAND_METADATA} from './bremen-demand-metadata';

/** Complete boolean answers from verified scalar metadata, including hits.
 * City acceptance and comparison are the original predicate's per-row domain.
 * Reconstruction, admission and certificates still validate the real models.
 */
export function bremenIdentityMatches(name:string,c:Identity&{city?:string}):boolean{
 const projection=BREMEN_IDENTITY_PROJECTIONS[name];
 if(!projection)throw Error('Unknown Bremen identity projection: '+name);
 return projection.rows.some(row=>{
  if(row.cities&&(c.city===undefined?!row.allowUndefined:!row.cities.includes(c.city)))return false;
  return row.comparison==='key'?row.objectId+'|'+row.partId===c.objectId+'|'+c.partId:row.objectId===c.objectId&&row.partId===c.partId;
 });
}
export function bremenIdentityIsPure(name:string):boolean{
 return Object.hasOwn(BREMEN_IDENTITY_PROJECTIONS,name)||name==='infillEurotowerIdentity';
}
/** Exact scalar fields already projected from the original inline source. */
export function bremenInlineIdentity(module:string,getter:string):Readonly<Identity&{city?:string}>{
 const input=BREMEN_IDENTITY_PROVENANCE.inlineInputs.find(input=>input.file==='painted/bremen/safety/'+module+'.ts'&&input.function===getter);
 if(!input)throw Error('Unknown Bremen inline identity metadata: '+module+':'+getter);
 return input.fields;
}
/** Conservative negative candidate guard only; it never grants admission. */
export function bremenIdentityCandidate(module:string,c:Identity):boolean{
 const rows=BREMEN_IDENTITY_CANDIDATES[module];
 if(!rows)throw Error('Unknown Bremen identity candidate module: '+module);
 return rows.some(row=>row.objectId+'|'+row.partId===c.objectId+'|'+c.partId);
}
/** The complete certificate unit is prepared on a candidate, then its original
 * model/array verification proves membership. Unknown identities need no graph.
 */
export function bremenCertificateCandidate(components:readonly (Identity&{city?:string})[]):boolean{
 return components.some(c=>c.city==='bremen'&&bremenCertificateIdentityCandidate(c));
}
// These generated scalar catalogs are immutable inputs. Build the negative
// guard's key union once, rather than rescanning every catalog for every scene
// component. Preserve the original delimiter-key equivalence (including its
// collisions); EDGE70 retains its separate strict pair comparison below.
let certificateCandidateKeys:ReadonlySet<string>|undefined;
function certificateKeys():ReadonlySet<string>{
 if(certificateCandidateKeys)return certificateCandidateKeys;
 const keys=new Set<string>();
 for(const model of BREMEN_DEMAND_METADATA.f260.models as readonly {sourceCarrier?:Identity}[]){
  const row=model.sourceCarrier;if(row)keys.add(row.objectId+'|'+row.partId);
 }
 for(const module of Object.keys(BREMEN_IDENTITY_CANDIDATES)){
  if(!(module.startsWith('bremen-')||module.endsWith('-runtime')||module==='office7a70-materials'||module==='utility-official-materials'))continue;
  for(const row of BREMEN_IDENTITY_CANDIDATES[module])keys.add(row.objectId+'|'+row.partId);
 }
 certificateCandidateKeys=keys;return keys;
}
export function bremenCertificateIdentityCandidate(c:Identity):boolean{
 return EDGE70_IDENTITIES.some(row=>row.objectId===c.objectId&&row.partId===c.partId)||certificateKeys().has(c.objectId+'|'+c.partId);
}
