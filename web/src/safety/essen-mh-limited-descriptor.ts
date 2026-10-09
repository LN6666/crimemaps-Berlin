import {datedMetricValue,type AreaMetric} from './area-metrics';
import {appendMetricVisual} from './metric-visualization';
import type {Metric,Locale} from './limitation-contract';
export const ESSEN_MH_LIMITED_RULES_REF={
  "path": "/safety/geography/reference-limits/essen-municipal-mh-f6263f2be34e00351f81c7764bdc9f765e214a38ca8c51f7db79c177b938f1c2.json",
  "sha256": "f6263f2be34e00351f81c7764bdc9f765e214a38ca8c51f7db79c177b938f1c2",
  "bytes": 22965
} as const;
export const isEssenMHLimitedScope=(c:{city:string;scopeId:string})=>c.city==='essen'&&c.scopeId==='municipality/essen/nrw-mikrozensus-migration2021';
const UNITS={zh:'千人',en:'thousand persons',de:'Tausend Personen'};
export function formatEssenMHValue(m:Metric,l:Locale){const value=datedMetricValue(m as unknown as AreaMetric,l);return m.unit==='1000 persons'?value.replace('1000 persons',UNITS[l]):value;}
/** Qualified Essen callback only; the source metric stays unchanged. */
export function essenMHGraphicMetric(m:Metric):Metric{
 if((m as Metric&{metric_id?:string}).metric_id!=='root-essen-mh-allage-followup-nrw-privatehouseholds2021-count-thousands'||m.value!==176||m.year!==2021||m.unit!=='1000 persons'||m.source_sha256!=='c888ebd1a6ee88173c852e16fb566fc6374f544b8880e5ddbb719dac71d36ecb')return m;
 const replacements={zh:['1761000 persons','176（单位：千人）'],en:['176 1000 persons','176 (unit: thousand persons)'],de:['176 1000 persons','176 (Einheit: Tausend Personen)']} as const;
 if(!(['zh','en','de'] as const).every(l=>m.definition[l].split(replacements[l][0]).length===2))return m;
 return {...m,definition:{zh:m.definition.zh.replace(...replacements.zh),en:m.definition.en.replace(...replacements.en),de:m.definition.de.replace(...replacements.de)}};
}
export function appendEssenMHSingleGraphic(h:HTMLElement,m:Metric,l:Locale){const display=essenMHGraphicMetric(m);appendMetricVisual(h,display as unknown as AreaMetric,l,{scope:'municipal',singleValue:true});if(display!==m){const trace=document.createElement('details'),summary=document.createElement('summary'),original=document.createElement('p');summary.textContent={zh:'原始单位文本（来源说明原文）',en:'Original unit text (source definition verbatim)',de:'Ursprünglicher Einheitentext (Quelldefinition im Wortlaut)'}[l];original.textContent=m.definition[l];trace.append(summary,original);h.append(trace);}return !!h.querySelector('figure.metric-mini-chart[data-chart-kind="single"] svg rect');}
export function appendEssenMHWithheld(h:HTMLElement,l:Locale){const p=document.createElement('p');p.className='essen-mh-limited-withheld';p.textContent={zh:'此来源已公布数值尚未通过必要限制／来源核对，暂不显示；这不表示无公布。',en:'This published source value has not passed required limitation/source checks and is withheld; this does not establish non-publication.',de:'Dieser veröffentlichte Quellenwert hat die erforderliche Einschränkungs-/Quellenprüfung nicht bestanden und bleibt verborgen; kein Beleg fehlender Veröffentlichung.'}[l];h.append(p);}
