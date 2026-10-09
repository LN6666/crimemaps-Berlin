import {referenceObservation,type SourceRule} from './reference-registry-matcher';
import type {Observation,ReferenceMetric,Text} from './reference-fallback';
export const MERGED_BYTES_LIMIT=8*1024*1024;
export const REVIEWED_MERGED_REFS={metrics:{sha256:'287119dc75f99c4049cf9e046a395993d4cb43bda9742f4a6be19179d41a76c1',bytes:34692},registry:{sha256:'e9a31e00e56f94e3db166317e4e9085d092827154b4cd792cfad43772f1571ad',bytes:15415}} as const;
export interface MergedFileRef {path:string;sha256:string;bytes:number;}
export interface MergedSelection {city:string;nativeLevel:string;selectedNativeAreaId:string;currentGeometrySha256:string;}
export interface MergedReferences {observations:Observation[];rules:SourceRule[];}
export class MergedReferenceError extends Error {readonly code:string;constructor(code:string){super(`Joint reference unavailable: ${code}`);this.code=code;this.name='MergedReferenceError';}}
function fail(code:string):never{throw new MergedReferenceError(code);}
const AREA='merged/dusseldorf/032-033',PDF='7c9ac2f2c5eb2328a5e24de6fbcbc4291d8efd61dcce9eeeff206837fc432afe',RENT='985aa492d900e4eded1be0176a380141d3dc38e049fdf6e80e8fa0ab93442c42',GEOMETRY='f22f53b9c2e21120d17c8ddb550d1d4eb644d9d58f4d146e8424ec46c496f53a',BINDING='061238801586f2af2e27ac5fb34258062567f073d906ef3fb37f68cc41482b87',URL='https://statistik.duesseldorf.de/sites/download/Stadtteilprofile/Unterbilk032.pdf#page=3';
const MEMBERS=['osm/relation/92375','osm/relation/92377'];
const SPECS:Readonly<Record<string,readonly [number,string,string]>>={bg:[570,'','sgbii_benefit_community_count'],pers:[811,'persons','sgbii_benefit_community_person_count'],pers_share:[4.9,'%','sgbii_benefit_community_person_share_under65_residents'],xii:[310,'persons','sgbxii_oldage_reducedcapacity_recipient_count'],wohngeld:[321,'','housing_allowance_household_count'],wohngeld_share:[2,'%','housing_allowance_share_private_households'],'child-under15':[107,'persons','sgbii_benefit_community_under15_child_count'],'rent-median2025':[16.045,'€/m²/month','median_advertised_net_cold_multifamily_annual']};
const obj=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function localized(v:unknown):v is Text{return obj(v)&&['zh','en','de'].every(l=>typeof v[l]==='string'&&v[l].trim()&&v[l].length<5000);}
function selection(s:MergedSelection){if(s.city!=='dusseldorf')fail('city');if(s.nativeLevel!=='level1')fail('native-level');if(s.currentGeometrySha256!==GEOMETRY)fail('geometry-version');}
function evidence(e:any){if(!obj(e)||e.source_url!==URL||e.source_sha256!==PDF||e.source_pdf_page!==3||e.explicit_source_text!=='Die Stadtteile Hafen und Unterbilk werden daher zusammen dargestellt.'||e.current_geometry_sha256!==GEOMETRY||e.native_code_binding_metrics_sha256!==BINDING||e.allocation!=='none; one shared observation per measure, not two native copies'||!same(e.members,[{nativeCode:'032',nativeName:'Unterbilk',areaId:MEMBERS[0]},{nativeCode:'033',nativeName:'Hafen',areaId:MEMBERS[1]}]))fail('membership-evidence');}
/** Only the reviewed explicit membership is eligible. No point or geometry inference occurs here. */
export function parseMergedReferences(metricsRaw:unknown,registryRaw:unknown,s:MergedSelection):MergedReferences {
 selection(s);if(!obj(metricsRaw)||metricsRaw.city!==s.city||metricsRaw.level!=='merged'||metricsRaw.native_geography_inheritance!==false||!Array.isArray(metricsRaw.areas)||metricsRaw.areas.length!==1)fail('container');
 const area=metricsRaw.areas[0];if(!obj(area)||area.id!==AREA||area.scope!=='merged'||!localized(area.scopeName)||!same(area.memberAreaIds,MEMBERS)||area.geometry!==undefined||!Array.isArray(area.metrics)||area.metrics.length!==8)fail('joint-scope');evidence(area.membershipEvidence);
 if(!obj(registryRaw)||registryRaw.schemaVersion!==1||!Array.isArray(registryRaw.rules)||registryRaw.rules.length!==8)fail('registry');const rules=registryRaw.rules as SourceRule[];
 const seen=new Set<string>();
 for(const m of area.metrics){
  if(!obj(m)||typeof m.metric_id!=='string')fail('metric');const suffix=m.metric_id.replace('dusseldorf-merged-Unterbilk-Hafen2025-',''),spec=SPECS[suffix];
  if(!spec||seen.has(suffix)||m.metric_id!==`dusseldorf-merged-Unterbilk-Hafen2025-${suffix}`||m.value!==spec[0]||(Object.hasOwn(m,'source_cell_value')&&m.source_cell_value!==spec[0])||m.unit!==spec[1]||m.conceptId!==spec[2]||m.year!==2025||(suffix==='rent-median2025'?(m.reference_date!==undefined||m.reference_kind!=='calendar_year'||m.source_sheet!=='2025'||m.source_cell!=='H25'||m.source_sample_cell!=='G25'||m.sample_size!==466):m.reference_date!=='2025-12-31')||m.integration_batch!=='dusseldorf-merged-Unterbilk-Hafen2025'||m.scope!=='merged'||m.source_sha256!==(suffix==='rent-median2025'?RENT:PDF)||!localized(m.label)||!localized(m.definition)||typeof m.source_name!=='string'||!m.source_name||!same(m.memberAreaIds,MEMBERS)||!same(m.source_native_codes,['032','033'])||(suffix!=='rent-median2025'&&!same(m.membershipEvidence,area.membershipEvidence)))fail('source-metric');seen.add(suffix);evidence(m.membershipEvidence);
  let source:URL;try{source=new globalThis.URL(m.source_url);}catch{fail('source-url');}if(source.protocol!=='https:'||source.username||source.password||(suffix!=='rent-median2025'&&m.source_url!==URL))fail('source-url');
  const matching=rules.filter(r=>r?.conceptId===spec[2]);if(matching.length!==1)fail('rule-identity');const r=matching[0];
  if(r.city!==s.city||r.scope!=='merged'||r.scopeId!==AREA||!localized(r.title)||!Array.isArray(r.levels)||r.levels.length!==0||!Array.isArray(r.requiredAbsent)||r.requiredAbsent.length!==0||!obj(r.equals)||r.equals.integration_batch!==m.integration_batch||r.equals.metric_id!==m.metric_id||r.equals.source_sha256!==m.source_sha256||r.equals['label.en']!==m.label.en||r.equals.year!==2025||r.equals.unit!==m.unit)fail('rule-source');evidence(r.sourceEvidence);
  if(suffix==='rent-median2025'){if(!same(m.membershipEvidence,r.sourceEvidence))fail('rent-membership');const e=r.sourceEvidence as any;if(e.rent_source_sha256!==RENT||e.source_sheet!=='2025'||e.explicit_combined_cell!=='A25'||e.explicit_combined_value!=='032 Unterbilk / 033 Hafen'||e.rent_source_url!==m.source_url)fail('rent-evidence');}
 }
 if(!MEMBERS.includes(s.selectedNativeAreaId))return {observations:[],rules:[]};
 const membershipEvidence=JSON.stringify(area.membershipEvidence),observations:Observation[]=[];
 for(const metric of area.metrics){const original=referenceObservation({city:s.city,scope:'merged',scopeId:AREA,scopeName:area.scopeName},metric as ReferenceMetric,rules);if(!original)fail('source-match');observations.push({...original,memberAreaIds:area.memberAreaIds,membershipEvidence});}
 return {observations,rules};
}
async function verifiedJSON(ref:MergedFileRef,expected:Readonly<{sha256:string;bytes:number}>,fetchBytes:(path:string,signal:AbortSignal)=>Promise<Uint8Array>,signal:AbortSignal){
 if(signal.aborted)fail('aborted');if(ref.sha256!==expected.sha256||ref.bytes!==expected.bytes||ref.bytes<1||ref.bytes>MERGED_BYTES_LIMIT||!/^\/safety\/geography\/(?:reference-merged|merged-references)\/[a-zA-Z0-9_.-]+\.json$/.test(ref.path))fail('reference');
 const bytes=await fetchBytes(ref.path,signal);if(signal.aborted)fail('aborted');if(bytes.byteLength!==ref.bytes||bytes.byteLength>MERGED_BYTES_LIMIT)fail('byte-limit');const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer)),x=>x.toString(16).padStart(2,'0')).join('');if(digest!==ref.sha256)fail('sha256');if(signal.aborted)fail('aborted');try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return fail('json');}
}
/** Loader owns no cache and mutates no controller. Caller supplies its active cancellation signal. */
export async function loadMergedReferences(options:{selection:MergedSelection;metricsRef:MergedFileRef;registryRef:MergedFileRef;fetchBytes:(path:string,signal:AbortSignal)=>Promise<Uint8Array>;signal:AbortSignal}):Promise<MergedReferences>{
 selection(options.selection);if(!MEMBERS.includes(options.selection.selectedNativeAreaId))return {observations:[],rules:[]};
 const metrics=await verifiedJSON(options.metricsRef,REVIEWED_MERGED_REFS.metrics,options.fetchBytes,options.signal),registry=await verifiedJSON(options.registryRef,REVIEWED_MERGED_REFS.registry,options.fetchBytes,options.signal);return parseMergedReferences(metrics,registry,options.selection);
}
export const mergedReferenceCopy={zh:{badge:'共同统计值 · 非任一成员街区单独数值',note:'此值属于Unterbilk与Hafen官方共同范围；不拆分、不分摊，也不重复计入成员街区统计。'},en:{badge:'Joint-area observation · not either member neighbourhood alone',note:'This value belongs to the official joint Unterbilk / Hafen scope. It is not divided, allocated or duplicated in member-area statistics.'},de:{badge:'Gemeinsamer Statistikwert · kein Einzelwert eines Mitgliedsstadtteils',note:'Der Wert gehört zum amtlichen gemeinsamen Bereich Unterbilk / Hafen. Keine Aufteilung, Verteilung oder doppelte Aufnahme in die Statistik der einzelnen Stadtteile.'}} as const;
