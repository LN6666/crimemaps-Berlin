export type Locale='zh'|'en'|'de';
export type Scope='local'|'merged'|'context'|'municipal'|'regional';
export type Text=Record<Locale,string>;
export interface ReferenceMetric{value:number|string;year:number;reference_date?:string;label:Text;definition:Text;source_name:string;source_url:string;unit:string;}
/** conceptId is source-reviewed, never inferred from category, label or nearby location. */
export interface Observation{conceptId:string;city:string;scope:Scope;scopeId:string;scopeName:Text;metric:ReferenceMetric;sourceEvidence:string;sourceQualifiedLimitation?:Text;sourceNativeLevel?:string;nativeAreaId?:string;memberAreaIds?:readonly string[];membershipEvidence?:string;observedThrough?:string;contextPoint?:readonly [number,number];contextGeometrySha256?:string;contextBoundaryAreaM2?:number;contextContainsPointVerified?:boolean;}
export interface PublicationEvidence{conceptId:string;city:string;areaId:string;status:'verified_unpublished'|'pending';sourceUrl?:string;checkedAt?:string;note:Text;}
export interface Request{conceptId:string;city:string;areaId:string;title:Text;point?:readonly [number,number];}
export interface Selection{request:Request;status:Scope|'unpublished'|'pending';observation?:Observation;evidence?:PublicationEvidence;referenceOnly:boolean;includeInNativeStatistics:false;contextAmbiguous?:boolean;}
function rank(o:Observation){
 const through=o.observedThrough??o.metric.reference_date??String(o.metric.year);
 let m=/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(through);
 if(m){const y=Number(m[1]),month=Number(m[2]??0),day=Number(m[3]??0);if(month<=12&&(!m[2]||month>=1)&&(!m[3]||(day>=1&&day<=new Date(Date.UTC(y,month,0)).getUTCDate())))return y*10000+month*100+day;}
 m=/^(\d{4}) H([12])$/.exec(through);if(m&&Number(m[1])===o.metric.year)return o.metric.year*10000+(m[2]==='1'?600:1200);
 return o.metric.year*10000;
}
function validWGS84Point(point:unknown):point is readonly [number,number]{
 return Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&Math.abs(point[0])<=180&&Math.abs(point[1])<=90;
}
export function selectReference(request:Request,observations:readonly Observation[],evidence:readonly PublicationEvidence[]=[]):Selection{
 const valid=observations.filter(o=>o.city===request.city&&o.conceptId===request.conceptId&&o.sourceEvidence.trim()&&/^https:\/\//.test(o.metric.source_url)&&Number.isFinite(o.metric.year));
 const newest=(rows:Observation[])=>rows.sort((a,b)=>rank(b)-rank(a)||a.scopeId.localeCompare(b.scopeId))[0];
 const local=newest(valid.filter(o=>o.scope==='local'&&o.nativeAreaId===request.areaId));
 const shared=newest(valid.filter(o=>o.scope==='merged'&&o.memberAreaIds?.includes(request.areaId)&&o.membershipEvidence?.trim()));
 // A point context identifies only the clicked location, never containment of the whole selected area.
 const point=request.point;
 const contexts=valid.filter(o=>o.scope==='context'&&validWGS84Point(point)&&validWGS84Point(o.contextPoint)&&o.contextPoint[0]===point[0]&&o.contextPoint[1]===point[1]&&o.contextContainsPointVerified===true&&/^[a-f0-9]{64}$/.test(o.contextGeometrySha256??'')&&Number.isFinite(o.contextBoundaryAreaM2)&&o.contextBoundaryAreaM2!>0).sort((a,b)=>a.contextBoundaryAreaM2!-b.contextBoundaryAreaM2!||rank(b)-rank(a)||a.scopeId.localeCompare(b.scopeId));
 const first=contexts[0];
 const tied=first?contexts.filter(o=>o.contextBoundaryAreaM2===first.contextBoundaryAreaM2&&rank(o)===rank(first)):[];
 const contextAmbiguous=!local&&!shared&&new Set(tied.map(o=>o.scopeId)).size>1;
 // An unresolved smallest-scope tie falls through to a qualified city/regional reference.
 // A larger context cannot stand in for an ambiguous smaller one.
 const contextual=contextAmbiguous?undefined:first;
 const ambiguity=contextAmbiguous?{contextAmbiguous:true}:{};
 const city=newest(valid.filter(o=>o.scope==='municipal'));
 // Regional values remain separately labelled; membership is not guessed from a city name.
 const region=newest(valid.filter(o=>o.scope==='regional'&&o.memberAreaIds?.includes(request.areaId)&&o.membershipEvidence?.trim()));
 const observation=local??shared??contextual??city??region;
 if(observation)return {request,status:observation.scope,observation,referenceOnly:observation.scope!=='local',includeInNativeStatistics:false,...ambiguity};
 const proof=evidence.find(e=>e.city===request.city&&e.areaId===request.areaId&&e.conceptId===request.conceptId&&e.status==='verified_unpublished'&&e.checkedAt&&e.sourceUrl&&/^https:\/\//.test(e.sourceUrl));
 return {request,status:proof?'unpublished':'pending',evidence:proof,referenceOnly:false,includeInNativeStatistics:false,...ambiguity};
}
const COPY={zh:{local:'本分区数据／历史值',merged:'多区共同统计值',context:'点击位置所属统计区域参考值 · 非本分区实测',municipal:'全市参考值 · 非本分区实测',regional:'较大区域参考值 · 非本分区实测',unpublished:'无公布',pending:'待查找／核实',source:'来源与口径'},en:{local:'Local observation / history',merged:'Shared combined-area observation',context:'Statistical-area reference at the clicked point · not a local measurement',municipal:'City reference · not a local measurement',regional:'Wider-region reference · not a local measurement',unpublished:'Not published',pending:'Research / verification pending',source:'Source and definition'},de:{local:'Lokaler Messwert / historische Daten',merged:'Gemeinsamer Wert zusammengefasster Gebiete',context:'Referenz des Statistikgebiets am angeklickten Ort · kein lokaler Messwert',municipal:'Stadtreferenz · kein lokaler Messwert',regional:'Überregionale Referenz · kein lokaler Messwert',unpublished:'Nicht veröffentlicht',pending:'Recherche / Prüfung ausstehend',source:'Quelle und Definition'}};
/** View only: no mutation, derived numbers, comparison cohort or map-count writes. */
export function appendReferenceFallback(host:HTMLElement,selections:readonly Selection[],locale:Locale,options:{formatValue:(m:ReferenceMetric,l:Locale)=>string;appendVisual?:(host:HTMLElement,m:ReferenceMetric,l:Locale,scope:Scope)=>void;onResize?:()=>void}){
 const section=document.createElement('section');section.className='reference-fallback';section.style.cssText='font:inherit;overflow-wrap:anywhere;max-width:100%';
 for(const item of selections){const row=document.createElement('section'),heading=document.createElement('h4'),badge=document.createElement('p');heading.textContent=item.request.title[locale];badge.textContent=COPY[locale][item.status];row.append(heading,badge);
  if(item.observation){const o=item.observation,value=document.createElement('p'),scope=document.createElement('p');value.textContent=o.metric.label[locale]+': '+options.formatValue(o.metric,locale);scope.textContent=o.scopeName[locale];row.append(value,scope);if(o.sourceQualifiedLimitation){const limitation=document.createElement('p');limitation.className='source-qualified-limitation';limitation.textContent=o.sourceQualifiedLimitation[locale];row.append(limitation);}options.appendVisual?.(row,o.metric,locale,o.scope);
   const details=document.createElement('details'),summary=document.createElement('summary'),definition=document.createElement('p'),source=document.createElement('a');summary.textContent=COPY[locale].source;definition.textContent=o.metric.definition[locale];source.textContent=o.metric.source_name;source.href=o.metric.source_url;source.target='_blank';source.rel='noopener noreferrer';details.append(summary,definition,source);details.addEventListener('toggle',()=>options.onResize?.());row.append(details);
  }else if(item.evidence){const note=document.createElement('p');note.textContent=item.evidence.note[locale];row.append(note);}
  section.append(row);
 }host.append(section);options.onResize?.();return section;
}
