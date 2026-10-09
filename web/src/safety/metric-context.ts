import type {RemainingLimitationGate} from './remaining-limitation-gate';
import {appendOfficialElectionMethodNote} from './shared-election-loader';
import type {LISProjectionGate} from './lis-projection-gate';
import type {ReferenceMetric} from './reference-fallback';
import type {MetricShardReference} from './metric-shard-loader';
import {areaMetrics,datedMetricValue,metricCategories,type AreaMetric} from './area-metrics';
import {containsPosition} from './geography-position';
import {appendMetricVisual} from './metric-visualization';
type Locale='zh'|'en'|'de';
type Level={id:string;label:string;path:string;metrics_path?:string;metrics_shards?:MetricShardReference};
const COPY={
 zh:{title:'当前地图位置的其他统计范围',note:'以下是所选地图位置可对应的其他范围统计，数值仍属于标明的区域，不是当前街区的数据。仅凭该位置归属，不能认定两套分区边界完整包含。每项保留年份、来源和细分限制；分类相同也不代表指标定义相同。',loading:'正在核对对应统计范围…',failed:'部分统计范围加载失败；不能据此判断数据不存在。重新打开详情可重试。',empty:'尚无可核验的其他范围对应数据。',scope:'统计范围',limits:'仅代表以上范围；未换算或分配到当前分区。',source:'来源与口径'},
 en:{title:'Other statistical scopes at this map position',note:'These statistics belong to other verified scopes containing the selected map position, not the current neighbourhood. Point membership does not prove full containment between boundary systems. Each observation retains its period, source and subdivision limits; matching categories do not imply equivalent definitions.',loading:'Checking corresponding statistical scopes…',failed:'Some scopes could not be loaded; this does not establish that data are absent. Reopen details to retry.',empty:'No other verified matching scope is connected yet.',scope:'Statistical scope',limits:'Applies only to the scope above; not converted or allocated to the selected area.',source:'Source and definition'},
 de:{title:'Weitere Statistikräume am Kartenpunkt',note:'Diese Werte gehören zu anderen geprüften Gebieten mit dem gewählten Kartenpunkt, nicht zum aktuellen Stadtteil. Die Punktzuordnung belegt keine vollständige räumliche Verschachtelung. Jede Beobachtung behält Bezugszeit, Quelle und Grenzen der Untergliederung; gleiche Kategorien bedeuten keine gleichen Definitionen.',loading:'Passende Statistikräume werden geprüft…',failed:'Einige Gebiete konnten nicht geladen werden; daraus folgt nicht, dass Daten fehlen. Details zum Wiederholen erneut öffnen.',empty:'Noch kein weiterer geprüfter passender Bezugsraum angebunden.',scope:'Statistischer Bezugsraum',limits:'Nur für das oben genannte Gebiet; keine Umrechnung oder Verteilung auf das gewählte Gebiet.',source:'Quelle und Definition'}
};
/** Polygon footprint is used solely to rank overlapping scopes, never to allocate counts. */
export function footprint(geometry:any):number{
 const ring=(points:number[][])=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
 const polygons=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
 return polygons.reduce((sum:number,p:number[][][])=>sum+ring(p[0])-p.slice(1).reduce((n,r)=>n+ring(r),0),0);
}
export function metricContext(options:{city:string;locale:Locale;semanticProjection?:LISProjectionGate;remainingLimits?:RemainingLimitationGate;fetchJSON:(path:string,signal:AbortSignal)=>Promise<unknown>;loadAreaMetrics?:(level:Level,areaId:string,signal:AbortSignal)=>Promise<AreaMetric[]>}){
 let request:AbortController|undefined;
 return {append(host:HTMLElement,levels:Level[],current:string,point:number[]|undefined,rows:AreaMetric[],categoryNames:string[]){
  request?.abort();request=new AbortController();const signal=request.signal;if(!point)return;
  const c=COPY[options.locale],section=document.createElement('details'),heading=document.createElement('summary'),note=document.createElement('p'),content=document.createElement('div');heading.textContent=c.title;note.textContent=c.note;section.append(heading,note,content);host.append(section);let loaded=false;
  section.addEventListener('toggle',async()=>{if(!section.open||loaded||signal.aborted)return;loaded=true;content.textContent=c.loading;
   const candidates:{level:Level;feature:any;metrics:AreaMetric[];size:number}[]=[];let failed=false;
   for(const level of levels){if(signal.aborted||!section.isConnected)return;if(level.id===current||(!level.metrics_path&&!level.metrics_shards))continue;
    try{const raw=await options.fetchJSON(level.path,signal) as any;if(signal.aborted||!section.isConnected)return;if(raw?.type!=='FeatureCollection'||raw.city!==options.city||raw.available!==true||!Array.isArray(raw.features)||raw.features.length>2048)throw Error('Invalid boundary');
     const matches=raw.features.filter((f:any)=>f?.properties?.id&&containsPosition(f.geometry,point));if(matches.length!==1)continue;
     const feature=matches[0],metrics=options.loadAreaMetrics?await options.loadAreaMetrics(level,String(feature.properties.id),signal):(areaMetrics(await options.fetchJSON(level.metrics_path!,signal),options.city,level.id)[String(feature.properties.id)]??[]);if(signal.aborted||!section.isConnected)return;
     if(metrics.length)candidates.push({level,feature,metrics,size:footprint(feature.geometry)});
    }catch{if(!signal.aborted)failed=true;}
   }if(signal.aborted||!section.isConnected)return;content.replaceChildren();
   // A category can contain multiple distinct indicators: retain the original names and definitions.
   let displayed=0;
   for(const [i,category]of metricCategories.entries()){
    const key=(m:AreaMetric)=>JSON.stringify([m.label.en,m.year,m.reference_date,m.source_url,m.source_name,m.unit,m.definition.en]);
    const existing=new Set(rows.map(key));
    const matching=candidates.filter(x=>x.metrics.some(m=>m.category===category)).sort((a,b)=>a.size-b.size);
    for(const candidate of matching){
    const values=candidate.metrics.filter(m=>m.category===category&&!existing.has(key(m)));if(!values.length)continue;
    values.forEach(m=>existing.add(key(m)));
    const group=document.createElement('details'),title=document.createElement('summary');title.textContent=categoryNames[i]+' · '+candidate.level.label+' · '+String(candidate.feature.properties.name);group.append(title);
    const scope=document.createElement('p');scope.textContent=c.scope+': '+candidate.level.label+' · '+String(candidate.feature.properties.name)+'. '+c.limits;group.append(scope);
    for(const m of values){const semanticContext={city:options.city,level:candidate.level.id,nativeAreaId:String(candidate.feature.properties.id)};if(options.remainingLimits?.needs(semanticContext,m as unknown as ReferenceMetric)){try{await options.remainingLimits.ensure(semanticContext,m as unknown as ReferenceMetric,signal);}catch{}if(signal.aborted||!section.isConnected)return;}if(options.semanticProjection?.needs(semanticContext,m as unknown as ReferenceMetric)){try{await options.semanticProjection.ensure(signal);}catch{}if(signal.aborted||!section.isConnected)return;}const limitationState=options.remainingLimits?.render(group,semanticContext,m as unknown as ReferenceMetric,options.locale,(original,l)=>datedMetricValue(original as unknown as AreaMetric,l),'context');const semanticState=limitationState&&limitationState.status!=='regular'?limitationState:options.semanticProjection?.render(group,semanticContext,m as unknown as ReferenceMetric,options.locale,(original,l)=>datedMetricValue(original as unknown as AreaMetric,l));if(!semanticState||semanticState.status==='regular'){const value=document.createElement('p');value.textContent=m.label[options.locale]+': '+datedMetricValue(m,options.locale);group.append(value);appendMetricVisual(group,m,options.locale,{scope:'context'});}
     appendOfficialElectionMethodNote(group,m,options.locale);
     const source=document.createElement('a');source.textContent=c.source+': '+m.source_name;source.href=m.source_url;source.target='_blank';source.rel='noopener noreferrer';group.append(source);displayed++;
    }content.append(group);
    }
   }if(!displayed)content.textContent=c.empty;if(failed){const warning=document.createElement('p');warning.textContent=c.failed;content.append(warning);}
  });
 },destroy(){request?.abort();}};
}
