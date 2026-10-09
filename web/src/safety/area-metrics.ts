import {displayedObservationPeriod} from './displayed-observation-period';
export const metricCategories=['crime','theft','assault','rent','unemployment','child_poverty','population','migration','age','elections','schools','welfare','ev_charging','households'] as const;
export type AreaMetric={category:typeof metricCategories[number];label:Record<string,string>;value:number|string;unit:string;year:number;reference_date?:string;source_platform?:string;definition:Record<string,string>;source_name:string;source_url:string;integration_batch?:string;metric_id?:string;source_series?:string};
export function areaMetrics(value:unknown,city:string,level:string):Record<string,AreaMetric[]>{
 const v=value as any,out:Record<string,AreaMetric[]>={};
 if(!v||v.city!==city||v.level!==level||!Array.isArray(v.areas)||v.areas.length>2048)return out;
 const localized=(o:any)=>o&&['zh','en','de'].every(l=>typeof o[l]==='string'&&o[l].trim()&&o[l].length<5000);
 for(const area of v.areas){
  if(typeof area?.id!=='string'||!area.id||Object.hasOwn(out,area.id)||!Array.isArray(area.metrics)||area.metrics.length>128)continue;
  out[area.id]=area.metrics.filter((m:any)=>metricCategories.includes(m?.category)&&localized(m.label)&&localized(m.definition)&&
   ((typeof m.value==='number'&&Number.isFinite(m.value))||(typeof m.value==='string'&&m.value.trim()&&m.value.length<1000))&&
   (m.source_platform===undefined||(typeof m.source_platform==='string'&&m.source_platform.trim().length>0&&m.source_platform.length<=60))&&
   typeof m.unit==='string'&&m.unit.length<80&&Number.isInteger(m.year)&&m.year>=1900&&m.year<=new Date().getUTCFullYear()&&
   typeof m.source_name==='string'&&m.source_name.trim()&&typeof m.source_url==='string'&&/^https:\/\//.test(m.source_url));
 }return out;
}
/** Exact ISO observation dates must agree with the series year. */
export function observationPeriod(metric:AreaMetric){
 const date=metric.reference_date;
 if(typeof date!=='string'||!/^\d{4}-\d{2}(?:-\d{2})?$/.test(date)||Number(date.slice(0,4))!==metric.year)return String(metric.year);
 const month=Number(date.slice(5,7));if(month<1||month>12)return String(metric.year);
 if(date.length===10){const day=Number(date.slice(8,10)),days=new Date(Date.UTC(metric.year,month,0)).getUTCDate();if(day<1||day>days)return String(metric.year);}
 return date;
}
/** Every displayed observation carries its own reference year, even for the newest series. */
export function datedMetricValue(metric:AreaMetric,locale:string){
 const value=typeof metric.value==='number'?new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(metric.value):metric.value;
 const period=displayedObservationPeriod(metric,locale);
 const attribution=metric.source_platform?.trim();
 const datedSource=attribution?`${period} · ${attribution}`:period;
 const year=/^zh(?:-|$)/i.test(locale)?`（${datedSource}）`:` (${datedSource})`;
 return `${value}${localizedMetricUnit(metric,locale)?' '+localizedMetricUnit(metric,locale):''}${year}`;
}

export function localizedMetricUnit(metric:AreaMetric,locale:string):string{
 const language=/^zh(?:-|$)/i.test(locale)?'zh':/^de(?:-|$)/i.test(locale)?'de':'en';
 const personUnit=/^(?:persons?|people|residents|Personen)(\/km²|\/ha)?$/.exec(metric.unit);
 const translatedUnits:Record<string,Record<'zh'|'en'|'de',string>>={
  years:{zh:'岁',en:'years',de:'Jahre'},schools:{zh:'所',en:'schools',de:'Schulen'},
  cases:{zh:'起',en:'cases',de:'Fälle'},
  '1000 persons':{zh:'千人',en:'thousand persons',de:'Tausend Personen'},
  'thousand persons':{zh:'千人',en:'thousand persons',de:'Tausend Personen'},
  'per100,000 residents':{zh:'每10万居民',en:'per 100,000 residents',de:'je 100.000 Einwohner'},
  '/100,000 residents':{zh:'每10万居民',en:'per 100,000 residents',de:'je 100.000 Einwohner'},
  '€/m²/month':{zh:'欧元/平方米/月',en:'€/m²/month',de:'€/m²/Monat'},
  '€/m²/Monat':{zh:'欧元/平方米/月',en:'€/m²/month',de:'€/m²/Monat'},
  '€/m²':{zh:'欧元/平方米',en:'€/m²',de:'€/m²'},
  'EUR/m²':{zh:'欧元/平方米',en:'EUR/m²',de:'EUR/m²'},
  '€/month':{zh:'欧元/月',en:'€/month',de:'€/Monat'},
  per100:{zh:'每百',en:'per 100',de:'je 100'},
  per1000:{zh:'每千',en:'per 1,000',de:'je 1.000'},
  'je 100.000':{zh:'每10万',en:'per 100,000',de:'je 100.000'},
  '/100,000':{zh:'/10万',en:'/100,000',de:'/100.000'},
  '/100000':{zh:'/10万',en:'/100,000',de:'/100.000'},
  '/100k':{zh:'/10万',en:'/100,000',de:'/100.000'},
  'offences/month':{zh:'起/月',en:'offences/month',de:'Straftaten/Monat'}
 };
 const unit=personUnit?({zh:'人',en:'persons',de:'Personen'}[language]+(personUnit[1]||'')):(translatedUnits[metric.unit]?.[language]??metric.unit);
 return unit;
}

export type OfficialPoliceScope={id:string;name:Record<string,string>;metrics:AreaMetric[]};
/** Police scopes remain independent; their values cannot be inherited by native areas. */
export function officialPoliceScopes(value:unknown,city:string):OfficialPoliceScope[]{
 const v=value as any;
 if(!v||v.city!==city||v.level!=='police_scopes'||v.native_geography_inheritance!==false||!Array.isArray(v.areas)||v.areas.length>64)return [];
 const parsed=areaMetrics(v,city,'police_scopes'),seen=new Set<string>();
 return v.areas.filter((a:any)=>{
  if(typeof a?.id!=='string'||!a.id.startsWith(`police/${city}/`)||seen.has(a.id)||a.native_level_match!==false||a.geometry_available!==false||
   !['Polizeiinspektion','Polizeipräsidium'].includes(a.scope_type)||!a.name||!['zh','en','de'].every(l=>typeof a.name[l]==='string'&&a.name[l].trim()&&a.name[l].length<300)||
   !parsed[a.id]?.length||parsed[a.id].length!==a.metrics.length)return false;
  seen.add(a.id);return true;
 }).map((a:any)=>({id:a.id,name:a.name,metrics:parsed[a.id]}));
}

/** Whole-city official observations remain separate from all native subdivisions. */
export function officialMunicipalScopes(value:unknown,city:string):OfficialPoliceScope[]{
 const v=value as any;
 if(!v||v.city!==city||v.level!=='municipal_scopes'||v.native_geography_inheritance!==false||!Array.isArray(v.areas)||v.areas.length>8)return [];
 const parsed=areaMetrics(v,city,'municipal_scopes'),seen=new Set<string>();
 return v.areas.filter((a:any)=>{
  if(typeof a?.id!=='string'||!a.id.startsWith(`municipality/${city}/`)||seen.has(a.id)||a.native_level_match!==false||a.geometry_available!==false||a.scope_type!=='Municipality'||!a.name||!['zh','en','de'].every(l=>typeof a.name[l]==='string'&&a.name[l].trim()&&a.name[l].length<300)||!parsed[a.id]?.length||parsed[a.id].length!==a.metrics.length)return false;
  seen.add(a.id);return true;
 }).map((a:any)=>({id:a.id,name:a.name,metrics:parsed[a.id]}));
}

export type OfficialRegionalScope=OfficialPoliceScope&{scope_type:'Region'|'Kreis';source_name:Record<string,string>};
/** Larger Region/Kreis scopes never become municipality or native-area observations. */
export function officialRegionalScopes(value:unknown,city:string):OfficialRegionalScope[]{
 const v=value as any;
 if(!v||v.city!==city||v.level!=='regional_scopes'||v.native_geography_inheritance!==false||!Array.isArray(v.areas)||v.areas.length>8)return [];
 try{if(new TextEncoder().encode(JSON.stringify(v)).byteLength>8*1024*1024)return [];}catch{return [];}
 const parsed=areaMetrics(v,city,'regional_scopes'),seen=new Set<string>(),out:OfficialRegionalScope[]=[];
 const localized=(x:any)=>x&&['zh','en','de'].every(l=>typeof x[l]==='string'&&x[l].trim()&&x[l].length<300);
 for(const a of v.areas){
  if(typeof a?.id!=='string'||!a.id.startsWith(`region/${city}/`)||!/^\d{8}\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(a.id.slice(`region/${city}/`.length))||seen.has(a.id)||a.native_level_match!==false||a.geometry_available!==false||a.geometry!==undefined||!['Region','Kreis'].includes(a.scope_type)||!localized(a.name)||!localized(a.source_name)||!parsed[a.id]?.length||parsed[a.id].length!==a.metrics.length)return [];
  seen.add(a.id);out.push({id:a.id,name:a.name,source_name:a.source_name,scope_type:a.scope_type,metrics:parsed[a.id]});
 }return out;
}
