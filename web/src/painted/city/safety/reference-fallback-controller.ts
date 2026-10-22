import type {createFinalPositiveMunicipalReferences} from './final-positive-municipal-references';
import {isNurembergLimitedRentScope,appendNurembergRentWithheld,type createNurembergMunicipalRentView} from './nuremberg-municipal-rent-view';
import type {createEssenMunicipalMHView} from './essen-municipal-mh-view';
import {isEssenMHLimitedScope,formatEssenMHValue,appendEssenMHSingleGraphic,appendEssenMHWithheld} from './essen-mh-limited-descriptor';
import {createBremenOptionalReference,renderBremenOptionalReference} from './bremen2023-reference';
import {createQualifiedRegistryLoader} from './qualified-registry-loader';
import {createRemainingLimitationGate,type RemainingLimitationGate} from './remaining-limitation-gate';
import {createSharedElectionLoader,appendOfficialElectionMethodNote} from './shared-election-loader';
import {frankfurtSharedElectionManifest} from './shared-election-descriptor';
import {createLISProjectionGate,type LISProjectionGate} from './lis-projection-gate';
import {loadSourceQualifiedBroaderReferences,type BroaderReferences} from './source-qualified-broader-references';
import {loadReviewedSharedGroup,type ReviewedSharedDescriptor,type SharedFileRef as MergedFileRef} from './reviewed-shared-groups';
import {reviewedSharedDescriptors} from './reviewed-descriptors';
import {type SourceRule} from './reference-registry-matcher';
import {selectReference,type ReferenceMetric,type Observation,type Locale,type Text,type Scope} from './reference-fallback';
import {referenceRuleManifestRef} from './reference-rules-decoder';
import {filterMunichScopeDisplay,type MunichScopeRow} from './munich-scope-display';
import {containsPosition} from './geography-position';
import {officialMunicipalScopes,datedMetricValue,type AreaMetric} from './area-metrics';
const LIMIT=8*1024*1024;
export interface ReferenceLevel {id:string;label:string;labels?:Text;path:string;geometrySha256?:string;metrics_path?:string;metrics_shards?:unknown;}
export interface ReferenceAppend {levels:readonly ReferenceLevel[];currentLevel:string;areaId:string;areaName:Text;point?:readonly [number,number];rows:readonly (ReferenceMetric& MunichScopeRow)[];officialMunicipalMetricsPath?:string;currentGeometrySha256?:string;mergedReferences?:{metricsRef:MergedFileRef;registryRef:MergedFileRef};reviewedSharedGroups?:readonly ReviewedSharedDescriptor[];}
export interface ReferenceControllerOptions {city:string;finalPositiveMunicipalReferences?:ReturnType<typeof createFinalPositiveMunicipalReferences>;nurembergMunicipalRentView?:ReturnType<typeof createNurembergMunicipalRentView>;essenMunicipalMHView?:ReturnType<typeof createEssenMunicipalMHView>;locale:Locale;bremenOptionalCityReference?:boolean;frankfurtOfficialEstimatedElections?:boolean;sourceQualifiedBroaderReferences?:boolean;rulesManifestPath?:string;mergedReferences?:{metricsRef:MergedFileRef;registryRef:MergedFileRef};reviewedSharedGroups?:readonly ReviewedSharedDescriptor[];fetchJSON:(path:string,signal:AbortSignal,policy?:'no-store')=>Promise<unknown>;fetchBytes:(path:string,signal:AbortSignal,policy?:'no-store')=>Promise<Uint8Array>;loadAreaMetrics:(level:ReferenceLevel,areaId:string,signal:AbortSignal,requestedGeometrySha256?:string)=>Promise<readonly (ReferenceMetric& MunichScopeRow)[]>;appendVisual?:(host:HTMLElement,metric:ReferenceMetric,locale:Locale,scope:Scope,sourceKind?:'regional'|'police')=>void;onResize?:()=>void;onLocalLimitation?:(metric:ReferenceMetric,limitation:Text)=>void;semanticProjection?:LISProjectionGate;remainingLimits?:RemainingLimitationGate;}
const COPY={zh:{title:'受限指标的其他统计范围参考',note:'仅在原指标口径准确对应时提供参考。位置归属不代表整个分区边界包含；参考值保留来源和年份，不计入本分区统计。',loading:'正在核对来源与统计范围…',partial:'部分来源加载或核对失败，已显示的参考可能不是可获取的最细统计范围，不能据此判断无公布；重新展开可重试。',pending:'待查找／核实',context:'点击位置所属统计区域参考值 · 非本分区实测',municipal:'全市参考值 · 非本分区实测',source:'来源与口径',cap:'参考指标超过显示上限，部分项目尚未显示。',empty:'已匹配的本分区指标已在详情中显示；暂无其他合格参考。'},en:{title:'Other statistical-scope references for limited indicators',note:'References require exact source-qualified indicator definitions. Point membership does not prove containment of the entire selected area. Original periods and sources remain; reference values do not enter local statistics.',loading:'Checking sources and statistical scopes…',partial:'Some sources could not be loaded or verified; displayed references may not be the finest available statistical scope. This does not establish non-publication. Reopen to retry.',pending:'Research / verification pending',context:'Statistical-area reference at this point · not a local measurement',municipal:'City reference · not a local measurement',source:'Source and definition',cap:'The reference display limit was reached; some concepts are not shown.',empty:'Matched local indicators already appear in details; no other qualified reference is available.'},de:{title:'Weitere Statistikräume für eingeschränkte Kennzahlen',note:'Referenzen erfordern exakt geprüfte Quellen und Kennzahlendefinitionen. Punktzuordnung belegt keine vollständige Gebietsverschachtelung. Bezugszeiten und Quellen bleiben erhalten; Referenzwerte gehen nicht in lokale Statistiken ein.',loading:'Quellen und Statistikräume werden geprüft…',partial:'Einige Quellen konnten nicht geladen oder geprüft werden; angezeigte Referenzen sind möglicherweise nicht der feinste verfügbare Statistikraum. Das belegt keine Nichtveröffentlichung. Zum Wiederholen erneut öffnen.',pending:'Recherche / Prüfung ausstehend',context:'Statistikgebietsreferenz am Kartenpunkt · kein lokaler Messwert',municipal:'Stadtreferenz · kein lokaler Messwert',source:'Quelle und Definition',cap:'Die Anzeigegrenze wurde erreicht; einige Kennzahlen werden nicht angezeigt.',empty:'Passende lokale Kennzahlen stehen bereits in den Details; keine weitere geprüfte Referenz verfügbar.'}};
function safeURL(s:string):string|undefined{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:undefined;}catch{return undefined;}}
async function sha(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer)),x=>x.toString(16).padStart(2,'0')).join('');}
function boundedJSON(bytes:Uint8Array):any{if(!bytes.byteLength||bytes.byteLength>LIMIT)throw Error('byte limit');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
export function sphericalBoundaryAreaM2(g:any):number {
 const polygons=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
 if(!Array.isArray(polygons)||!polygons.length)throw Error('geometry');let total=0,points=0;
 const ring=(r:any)=>{if(!Array.isArray(r)||r.length<4)throw Error('ring');let sum=0;for(let i=0;i<r.length;i++){
  const p=r[i],q=r[(i+1)%r.length];if(++points>500000||!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90)throw Error('coordinate');
  const delta=(q[0]-p[0])*Math.PI/180;if(!Number.isFinite(delta)||Math.abs(delta)>Math.PI)throw Error('edge');sum+=delta*(2+Math.sin(p[1]*Math.PI/180)+Math.sin(q[1]*Math.PI/180));
 }if(r[0][0]!==r.at(-1)[0]||r[0][1]!==r.at(-1)[1])throw Error('closure');return Math.abs(sum*6371008.8**2/2);};
 for(const p of polygons){if(!Array.isArray(p)||!p.length)throw Error('polygon');const area=ring(p[0])-p.slice(1).reduce((n:number,r:any)=>n+ring(r),0);if(!Number.isFinite(area)||area<=0)throw Error('area');total+=area;}
 if(!Number.isFinite(total)||total<=0)throw Error('area');return total;
}
export class ReferenceGeometryError extends Error {readonly code:string;constructor(code:string){super(`Reference geometry unavailable: ${code}`);this.code=code;this.name='ReferenceGeometryError';}}
export function qualifiedPointFeature(raw:any,city:string,point:readonly [number,number]) {
 if(raw?.type!=='FeatureCollection'||raw.city!==city||raw.available!==true||!Array.isArray(raw.features)||raw.features.length>2048)throw Error('boundary envelope');
 const ids=new Set<string>();const matches:any[]=[];
 for(const f of raw.features){if(f?.type!=='Feature'||typeof f.properties?.id!=='string'||!f.properties.id||ids.has(f.properties.id)||typeof f.properties.name!=='string')throw Error('feature identity');ids.add(f.properties.id);const area=sphericalBoundaryAreaM2(f.geometry);if(containsPosition(f.geometry,[...point]))matches.push({feature:f,area});}
 if(matches.length>1)throw new ReferenceGeometryError('ambiguous-point');
 return matches[0];
}
/** Candidate orchestration only. Source rows, cohorts, raw files and map counts are untouched. */
export function referenceFallbackController(options:ReferenceControllerOptions){
 const qualifiedRegistry=createQualifiedRegistryLoader({city:options.city,fetchBytes:options.fetchBytes});
 const bremenHistory=options.city==='bremen'&&options.bremenOptionalCityReference?createBremenOptionalReference(options.fetchBytes):undefined;
 const electionShared=options.city==='frankfurt'&&options.frankfurtOfficialEstimatedElections?createSharedElectionLoader({manifest:frankfurtSharedElectionManifest,fetchBytes:options.fetchBytes}):undefined;
 const ownsProjection=!options.semanticProjection,semanticProjection=options.semanticProjection??createLISProjectionGate(options.fetchBytes);
 const ownsLimits=!options.remainingLimits,remainingLimits=options.remainingLimits??createRemainingLimitationGate(options.fetchBytes);
 let epoch=0,request:AbortController|undefined,currentSection:HTMLDetailsElement|undefined,destroyed=false;
 let rules:SourceRule[]|undefined;const geo=new Map<string,{raw:any;sha:string}>();let municipal:{path:string;raw:any}|undefined;
 const stop=()=>{qualifiedRegistry.cancel();epoch++;request?.abort();request=undefined;};
 return {append(host:HTMLElement,input:ReferenceAppend){stop();if(destroyed)return;const c=COPY[options.locale],section=document.createElement('details'),heading=document.createElement('summary'),note=document.createElement('p'),content=document.createElement('div');heading.textContent=c.title;note.textContent=c.note;section.style.cssText='font:inherit;overflow-wrap:anywhere;max-width:100%';section.append(heading,note,content);host.append(section);currentSection=section;
  let ready=false;
  section.addEventListener('toggle',()=>{if(currentSection!==section)return;if(!section.open){stop();ready=false;return;}if(ready||destroyed||currentSection!==section)return;ready=true;request=new AbortController();const signal=request.signal,token=++epoch;
   const active=()=>!destroyed&&!signal.aborted&&epoch===token&&section.open&&section.isConnected&&currentSection===section;
   const put=(tag:string,value:string,parent:HTMLElement=content)=>{const el=document.createElement(tag);el.textContent=value;parent.append(el);return el;};
   content.textContent=c.loading;
   void(async()=>{let partial=false;let broader:BroaderReferences|undefined;
    try{
     if(!rules){const manifest=await options.fetchJSON(options.rulesManifestPath??'/safety/geography/reference-rules/manifest.json',signal,'no-store');if(!active())return;const ref=referenceRuleManifestRef(manifest,options.city);const bytes=await options.fetchBytes(ref.path,signal);const decoded=await qualifiedRegistry.setCore(bytes,ref,signal);if(!active())return;rules=decoded;}
     if(!active())return;if(input.rows.length>128)throw Error('metric limit');const observations:Observation[]=[];let activeRules=rules;
     const explicitGroups=input.reviewedSharedGroups??options.reviewedSharedGroups;
     const legacyRefs=input.mergedReferences??options.mergedReferences;
     let groups:readonly ReviewedSharedDescriptor[]=explicitGroups??[];
     // Retain the existing Düsseldorf raw-ref API; Frankfurt requires explicit reviewed opt-in.
     if(!explicitGroups&&legacyRefs&&options.city==='dusseldorf'){
      const base=reviewedSharedDescriptors.dusseldorf;
      if(legacyRefs.metricsRef.sha256===base.metricsRef.sha256&&legacyRefs.metricsRef.bytes===base.metricsRef.bytes&&legacyRefs.registryRef.sha256===base.registryRef.sha256&&legacyRefs.registryRef.bytes===base.registryRef.bytes)groups=[{...base,metricsRef:legacyRefs.metricsRef,registryRef:legacyRefs.registryRef}];else partial=true;
     }
     const sharedLabels=new Map<string,ReviewedSharedDescriptor>();
     if(groups.length>8)partial=true;
     for(const descriptor of groups.slice(0,8)){
      if(descriptor.city!==options.city||descriptor.nativeLevel!==input.currentLevel||!descriptor.memberAreaIds.includes(input.areaId))continue;
      try{const currentGeometrySha256=input.currentGeometrySha256??input.levels.find(l=>l.id===input.currentLevel)?.geometrySha256??'';
       const merged=await loadReviewedSharedGroup({descriptor,selection:{city:options.city,nativeLevel:input.currentLevel,selectedNativeAreaId:input.areaId,currentGeometrySha256},fetchBytes:options.fetchBytes,signal});if(!active())return;
       observations.push(...merged.observations);activeRules=[...activeRules,...merged.rules];sharedLabels.set(descriptor.scopeId,descriptor);
      }catch{if(active())partial=true;}
     }
     if(options.sourceQualifiedBroaderReferences&&['hannover','cologne'].includes(options.city)){
      try{broader=await loadSourceQualifiedBroaderReferences({selection:{city:options.city,nativeLevel:input.currentLevel,selectedNativeAreaId:input.areaId,currentGeometrySha256:input.currentGeometrySha256??''},signal,fetchBytes:options.fetchBytes});if(!active())return;observations.push(...broader.observations);activeRules=[...activeRules,...broader.rules];}catch{if(active())partial=true;}
     }
     let electionScopeCaption:Text|undefined;
     if(electionShared){try{const loaded=await electionShared.load({city:options.city,nativeLevel:input.currentLevel,nativeAreaId:input.areaId,geometrySha256:input.currentGeometrySha256??''},signal);if(!active())return;observations.push(...loaded.observations);electionScopeCaption=loaded.scopeCaption;
      for(const rule of loaded.rules){const literal=JSON.stringify(rule);if(!activeRules.some(existing=>JSON.stringify(existing)===literal))activeRules=[...activeRules,rule];}
     }catch{if(active())partial=true;}}
     let bremenLoaded:Awaited<ReturnType<ReturnType<typeof createBremenOptionalReference>['load']>>;
     if(bremenHistory){try{bremenLoaded=await bremenHistory.load(options.city,signal);if(!active())return;if(bremenLoaded){observations.push(...bremenLoaded.observations);for(const rule of bremenLoaded.rules)if(!activeRules.some(r=>JSON.stringify(r)===JSON.stringify(rule)))activeRules=[...activeRules,rule];}}catch{if(active())partial=true;}}
     const finalPositiveOpening=options.finalPositiveMunicipalReferences?.begin(signal,active);
     const collect=async(rows:readonly (ReferenceMetric& MunichScopeRow)[],scope:'local'|'municipal',scopeId:string,scopeName:Text,level?:string,areaId?:string)=>{
      for(const metric of filterMunichScopeDisplay(options.city,level??'municipal_scopes',rows)){
       if(!safeURL(metric.source_url))continue;
       if(scope==='municipal'&&finalPositiveOpening?.needs({city:options.city,scopeId})){const accepted=await finalPositiveOpening.observe({city:options.city,scopeId,scopeName},metric);if(!active())return;if(accepted){observations.push(accepted.observation as unknown as Observation);if(!activeRules.some(r=>JSON.stringify(r)===JSON.stringify(accepted.rule)))activeRules=[...activeRules,accepted.rule];}else partial=true;continue;}
       const sourceContext={city:options.city,level:level??'',nativeAreaId:areaId??scopeId,scopeName};
       if(scope==='local'&&remainingLimits.needs(sourceContext,metric)){
        try{await remainingLimits.ensure(sourceContext,metric,signal);}catch{if(active())partial=true;}if(!active())return;
        const approved=remainingLimits.qualifiedReference(sourceContext,metric);if(approved){observations.push(approved.observation);if(!activeRules.some(r=>JSON.stringify(r)===JSON.stringify(approved.rule)))activeRules=[...activeRules,approved.rule];}else partial=true;
        continue; // Known limited family never bypasses the qualified-only view path.
       }
       if(!active())return;try{const o=await qualifiedRegistry.observe({city:options.city,scope,scopeId,scopeName,level,nativeAreaId:areaId},metric,activeRules,signal);if(!active())return;if(o)observations.push(o);}catch{if(active())partial=true;}
      }
     };
     await collect(input.rows,'local',input.areaId,input.areaName,input.currentLevel,input.areaId);
     const point=input.point;
     if(point&&point.every(Number.isFinite)&&Math.abs(point[0])<=180&&Math.abs(point[1])<=90){
      for(const level of input.levels.slice(0,4)){
       if(!active())return;if(level.id===input.currentLevel||!level.metrics_shards)continue;
       try{
        if(!/^\/safety\/geography\/[a-zA-Z0-9_-]+\.geojson$/.test(level.path))throw Error('path');
        const cacheKey=level.path+'|'+(level.geometrySha256??'');let cached=geo.get(cacheKey),match:ReturnType<typeof qualifiedPointFeature>;
        if(!cached){const bytes=await options.fetchBytes(level.path,signal);if(!active())return;if(!bytes.byteLength||bytes.byteLength>LIMIT)throw Error('byte limit');const digest=await sha(bytes);if(level.geometrySha256&&digest!==level.geometrySha256)throw Error('sha');const raw=boundedJSON(bytes);match=qualifiedPointFeature(raw,options.city,point);if(!active())return;cached={raw,sha:digest};geo.set(cacheKey,cached);while(geo.size>2)geo.delete(geo.keys().next().value!);}
        else match=qualifiedPointFeature(cached.raw,options.city,point);if(!match)continue;
        const sourceId=String(match.feature.properties.id),rows=await options.loadAreaMetrics({...level,geometrySha256:cached.sha},sourceId,signal,cached.sha);if(!active())return;if(rows.length>128)throw Error('metric limit');
        for(const metric of filterMunichScopeDisplay(options.city,level.id,rows)){
         if(!safeURL(metric.source_url))continue;const sourceName={zh:(level.labels?.zh??level.label)+' · '+match.feature.properties.name,en:(level.labels?.en??level.label)+' · '+match.feature.properties.name,de:(level.labels?.de??level.label)+' · '+match.feature.properties.name};
         const sourceContext={city:options.city,level:level.id,nativeAreaId:sourceId,scopeName:sourceName};
         let original:Observation|undefined;
         if(remainingLimits.needs(sourceContext,metric)){
          try{await remainingLimits.ensure(sourceContext,metric,signal);}catch{if(active())partial=true;}if(!active())return;
          const approved=remainingLimits.qualifiedReference(sourceContext,metric);if(approved){original=approved.observation;if(!activeRules.some(r=>JSON.stringify(r)===JSON.stringify(approved.rule)))activeRules=[...activeRules,approved.rule];}else partial=true;
         }else original=await qualifiedRegistry.observe({city:options.city,scope:'local',scopeId:sourceId,scopeName:sourceName,level:level.id,nativeAreaId:sourceId},metric,activeRules,signal);if(!active())return;
         if(original)observations.push({...original,scope:'context',nativeAreaId:undefined,contextPoint:[...point],contextGeometrySha256:cached.sha,contextBoundaryAreaM2:match.area,contextContainsPointVerified:true});
        }
       }catch{if(active())partial=true;}
      }
     }
     const municipalPath=input.officialMunicipalMetricsPath;
     if(municipalPath){try{
      if(!/^\/safety\/geography\/[a-zA-Z0-9_-]+-metrics\.json$/.test(municipalPath))throw Error('municipal path');
      if(municipal?.path!==municipalPath){const bytes=await options.fetchBytes(municipalPath,signal,'no-store');if(!active())return;const raw=boundedJSON(bytes);if(raw?.city!==options.city||raw?.level!=='municipal_scopes')throw Error('municipal envelope');const parsed=officialMunicipalScopes(raw,options.city);if(!parsed.length||parsed.length!==raw.areas?.length)throw Error('municipal parser');municipal={path:municipalPath,raw};}
      for(const scope of officialMunicipalScopes(municipal.raw,options.city))await collect(scope.metrics as unknown as (ReferenceMetric& MunichScopeRow)[],'municipal',scope.id,scope.name as Text);
     }catch{if(active())partial=true;}}
     if(!active())return;if(observations.some(o=>semanticProjection.needs({city:options.city,level:o.sourceNativeLevel??'',nativeAreaId:o.scopeId},o.metric))){try{await semanticProjection.ensure(signal);}catch{if(active())partial=true;}}if(!active())return;await Promise.all(observations.filter(o=>remainingLimits.needs({city:options.city,level:o.sourceNativeLevel??'',nativeAreaId:o.scopeId},o.metric)).map(o=>remainingLimits.ensure({city:options.city,level:o.sourceNativeLevel??'',nativeAreaId:o.scopeId},o.metric,signal))).catch(()=>{if(active())partial=true;});if(!active())return;content.replaceChildren();const concepts=new Map<string,Pick<SourceRule,'conceptId'|'title'>>();for(const rule of activeRules)if(!concepts.has(rule.conceptId))concepts.set(rule.conceptId,rule);for(const title of qualifiedRegistry.selectedTitles())if(!concepts.has(title.conceptId))concepts.set(title.conceptId,title);let displayed=0;
     const visibleItems=[...concepts.values()].map(rule=>{
      const selection=selectReference({conceptId:rule.conceptId,city:options.city,areaId:input.areaId,title:rule.title,point:input.point},observations);
      const projectionState=selection.observation?semanticProjection.peek({city:options.city,level:selection.observation.sourceNativeLevel??'',nativeAreaId:selection.observation.scopeId},selection.observation.metric):{status:'regular' as const};
      const limitationState=selection.observation?remainingLimits.peek({city:options.city,level:selection.observation.sourceNativeLevel??'',nativeAreaId:selection.observation.scopeId},selection.observation.metric):{status:'regular' as const};
      if(selection.status==='local'&&!selection.observation?.sourceQualifiedLimitation&&projectionState.status==='regular'&&limitationState.status==='regular')return undefined;
      return {rule,selection,projectionState,limitationState};
     }).filter((item):item is NonNullable<typeof item>=>!!item).sort((a,b)=>Number(!!b.selection.observation)-Number(!!a.selection.observation));
     // Qualified observations must not be hidden behind unmatched citywide families.
     const mhOpening=options.essenMunicipalMHView?.begin(signal,active);
     const rentOpening=options.nurembergMunicipalRentView?.begin(signal,active);
     for(const {rule,selection,projectionState,limitationState} of visibleItems.slice(0,128)){
      if(selection.contextAmbiguous)partial=true;const row=document.createElement('section');if(projectionState.status==='regular')put('h4',rule.title[options.locale],row);
      const o=selection.observation;if(o?.scope==='municipal'&&isNurembergLimitedRentScope({city:o.city,scopeId:o.scopeId})){const result=await rentOpening?.render(row,{city:o.city,scopeId:o.scopeId,scopeName:o.scopeName},o.metric,options.locale);if(!active())return;if(result!=='rendered')appendNurembergRentWithheld(row,options.locale);content.append(row);displayed++;continue;}if(o?.scope==='municipal'&&isEssenMHLimitedScope({city:o.city,scopeId:o.scopeId})){const result=await mhOpening?.render(row,{city:o.city,scopeId:o.scopeId,scopeName:o.scopeName},o.metric,options.locale,formatEssenMHValue,appendEssenMHSingleGraphic);if(!active())return;if(result!=='rendered')appendEssenMHWithheld(row,options.locale);content.append(row);displayed++;continue;}if(o&&bremenLoaded&&bremenLoaded.observations.some(x=>x.scopeId===o.scopeId)){renderBremenOptionalReference(row,o,bremenLoaded.rules.find(r=>r.conceptId===o.conceptId)!,options.locale);content.append(row);displayed++;continue;}if(o){const shared=sharedLabels.get(o.scopeId);put('p',o.scope==='local'?({zh:'本分区来源专有数据 · 口径受限',en:'Source-specific local observation · definition limited',de:'Quellenspezifischer lokaler Wert · Definition eingeschränkt'})[options.locale]:o.scope==='merged'?(o.scopeId.startsWith('merged/frankfurt/atlas2025/')?(electionScopeCaption?.[options.locale]??({zh:'官方转换估计共同统计组',en:'Official-converted estimate shared scope',de:'Gemeinsamer amtlich umgerechneter Schätzraum'})[options.locale]):shared?.badge[options.locale]??({zh:'共同统计值',en:'Joint-area observation',de:'Gemeinsamer Statistikwert'})[options.locale]):o.scope==='regional'?(broader?.caption[options.locale]??c.municipal):o.scope==='context'?c.context:c.municipal,row);if(o.scope==='merged'&&shared)put('p',shared.note[options.locale],row);if(o.scope==='regional'&&broader)put('p',broader.limitation[options.locale],row);put('p',o.scopeName[options.locale],row);if(projectionState.status!=='regular'){const rendered=semanticProjection.render(row,{city:options.city,level:o.sourceNativeLevel??'',nativeAreaId:o.scopeId},o.metric,options.locale,(m,l)=>datedMetricValue(m as unknown as AreaMetric,l),o.scope==='local'?'native':'context');if(rendered.status==='projected'&&o.scope==='local')for(const note of rendered.view.visibleLimitations)options.onLocalLimitation?.(o.metric,note);}else if(limitationState.status!=='regular'){remainingLimits.render(row,{city:options.city,level:o.sourceNativeLevel??'',nativeAreaId:o.scopeId},o.metric,options.locale,(m,l)=>datedMetricValue(m as unknown as AreaMetric,l),o.scope==='local'?'native':'context');}else{put('p',o.metric.label[options.locale]+': '+datedMetricValue(o.metric as unknown as AreaMetric,options.locale),row);if(o.sourceQualifiedLimitation){if(o.scope==='local')options.onLocalLimitation?.(o.metric,o.sourceQualifiedLimitation);const warning=put('p',o.sourceQualifiedLimitation[options.locale],row);warning.className='source-qualified-limitation';}options.appendVisual?.(row,o.metric,options.locale,o.scope,o.scope==='regional'?broader?.sourceKind:undefined);}appendOfficialElectionMethodNote(row,o.metric,options.locale);if(projectionState.status==='regular'){const detail=document.createElement('details');put('summary',c.source,detail);put('p',o.metric.definition[options.locale],detail);const url=safeURL(o.metric.source_url);if(url){const a=document.createElement('a');a.textContent=o.metric.source_name;a.href=url;a.target='_blank';a.rel='noopener noreferrer';detail.append(a);}row.append(detail);}
      }else put('p',c.pending,row);content.append(row);displayed++;
     }
     if(!displayed)put('p',c.empty);if(visibleItems.length>128)put('p',c.cap);if(partial)put('p',c.partial);options.onResize?.();
    }catch{if(active()){content.replaceChildren();put('p',c.partial);ready=false;options.onResize?.();}}
   })();
  });return section;
 },cancel(){stop();currentSection=undefined;if(ownsLimits)remainingLimits.cancel();},destroy(){qualifiedRegistry.destroy();if(ownsLimits)remainingLimits.destroy();bremenHistory?.destroy();electionShared?.destroy();stop();destroyed=true;rules=undefined;geo.clear();municipal=undefined;currentSection=undefined;if(ownsProjection)semanticProjection.destroy();}};
}
