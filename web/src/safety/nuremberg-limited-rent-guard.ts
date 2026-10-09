import {createLimitationContract,type QualifiedObservation,type Locale} from './limitation-contract';
import {referenceObservation,type SourceContext,type SourceRule} from './reference-registry-matcher';
import type {ReferenceMetric} from './reference-fallback';
import {datedMetricValue,type AreaMetric} from './area-metrics';
import {appendMetricVisual,metricChartModel} from './metric-visualization';
const ID='root-nuremberg-rent-median-fresh-followup-bnp-value-h12025';
const CODE='nuremberg.bnp-value.city.source-published-netcold-asking.median-eur-m2.existing40-120.h12025.interpolation-unresolved';
/** Owner invokes only the selected source-qualified municipal reference; no citywide scan/cache. */
export async function createNurembergLimitedRentGuard(ruleText:string,acceptedRuleSHA256:string){
 const contract=createLimitationContract({loadSidecar:async()=>{throw Error('No unreviewed sidecar allowed');},maxCachedSidecars:1});
 const trusted=await contract.loadVerifiedRules(ruleText,acceptedRuleSHA256,'nuremberg');
 const rent=trusted.filter(r=>r.conceptId===CODE);if(rent.length!==1||rent[0].scope!=='municipal'||rent[0].requireVisibleLimitation!==true)throw Error('Missing exact rent qualification');
 const rule=rent[0] as unknown as SourceRule;
 const needs=(context:SourceContext,metric:ReferenceMetric)=>context.city==='nuremberg'&&(metric as unknown as {metric_id?:string}).metric_id===ID;
 return {needs,async qualifiedReference(context:SourceContext,metric:ReferenceMetric,signal?:AbortSignal){signal?.throwIfAborted();if(!needs(context,metric))return undefined;const original=referenceObservation(context,metric,[rule]);if(!original)return undefined;const q=await contract.qualify(rent[0],original,context.level);signal?.throwIfAborted();return q.status==='qualified'?{rule,observation:q.observation}:undefined;},async qualify(context:SourceContext,metric:ReferenceMetric,signal?:AbortSignal){
  signal?.throwIfAborted();if(!needs(context,metric))return {status:'not-target'} as const;
  const obs=referenceObservation(context,metric,[rule]);if(!obs)return {status:'withheld',knownValueNotUnpublished:true} as const;
  const result=await contract.qualify(rent[0],obs,context.level);signal?.throwIfAborted();return result;
 },render(host:HTMLElement,observation:QualifiedObservation,locale:Locale){
  return contract.render(host,observation,locale,(detached,o)=>{
   const original=o.metric as unknown as AreaMetric;if(metricChartModel(original).kind!=='single')return false;
   const title=document.createElement('h4');title.textContent=o.metric.label[locale];detached.append(title);
   const value=document.createElement('p');value.textContent=datedMetricValue(original,locale);detached.append(value);
   appendMetricVisual(detached,original,locale,{scope:'municipal'}); // no peer index, no cloning, no median replacement
   const source=document.createElement('a');source.textContent=o.metric.source_name;source.href=o.metric.source_url;source.rel='noopener noreferrer';source.target='_blank';detached.append(source);return true;
  });
 }};
}
