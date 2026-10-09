import {datedMetricValue,localizedMetricUnit,observationPeriod,type AreaMetric} from './area-metrics';

type Locale='zh'|'en'|'de';
type Scope='native'|'municipal'|'regional'|'police'|'context';
export type ComparisonIndex=Map<string,Map<string,number|null>>;
export type MetricChartModel={kind:'share'|'range'|'single'|'category';value:number|string;low:number;high:number;minimum:number;maximum:number;count:number};
const COPY={
 zh:{single:'单值；暂无经核实的同口径分区对比',range:'同级、同年、同来源及完整定义的有值分区',share:'独立比例，刻度0–100%；不将多项比例归一化',category:'类别值，不推算数量或得票率',unit:'来源未注明单位',context:'其他统计范围；不代表当前分区',native:'本原生分区',municipal:'仅全市；不代表所选分区',regional:'仅来源指定较大区域；不是全市或所选分区',police:'仅警方统计辖区；不代表所选分区',scope:'口径与局限（原说明）'},
 en:{single:'Single observation; no verified comparable-area comparison',range:'Areas with values at the same level, year, source and full definition',share:'Individual share, 0–100%; values are not normalized together',category:'Categorical value; no count or vote share inferred',unit:'Unit not stated by source',context:'Other statistical scope; not the selected area',native:'This native area',municipal:'Whole municipality only; not the selected area',regional:'Explicitly sourced larger region only; not municipality or selected area',police:'Police statistical jurisdiction only; not the selected area',scope:'Definition and limitations (source description)'},
 de:{single:'Einzelwert; kein verifizierter Vergleich mit gleich definierten Gebieten',range:'Gebiete mit Werten derselben Ebene, desselben Jahres, derselben Quelle und vollständigen Definition',share:'Einzelner Anteil, Skala 0–100 %; keine gemeinsame Normierung',category:'Kategorialer Wert; keine abgeleitete Fallzahl oder Stimmenquote',unit:'Einheit von der Quelle nicht angegeben',context:'Anderer Statistikraum; nicht das gewählte Gebiet',native:'Dieses native Gebiet',municipal:'Nur Gesamtstadt; nicht das gewählte Gebiet',regional:'Nur belegte Region/Kreis; nicht Gesamtstadt oder gewähltes Gebiet',police:'Nur polizeilicher Bezugsraum; nicht das gewählte Gebiet',scope:'Definition und Einschränkungen (Quellenbeschreibung)'}
};

/** Conservative matching: area-specific definitions or distinct batches never get silently pooled. */
export function comparisonKey(metric:AreaMetric):string|undefined{
 if(typeof metric.integration_batch!=='string'||!metric.integration_batch.trim()||typeof metric.value!=='number')return;
 return JSON.stringify([metric.integration_batch,metric.metric_id??'',metric.category,metric.label.en,metric.unit,metric.year,
  observationPeriod(metric),metric.source_name,metric.source_url,metric.source_series??'',metric.source_platform??'',metric.definition.en]);
}
export function metricComparisonIndex(areas:Record<string,AreaMetric[]>):ComparisonIndex{
 const index:ComparisonIndex=new Map();
 for(const [id,metrics] of Object.entries(areas))for(const metric of metrics){
  const key=comparisonKey(metric);if(!key||typeof metric.value!=='number')continue;
  let values=index.get(key);if(!values){values=new Map();index.set(key,values);}
  // Multiple observations for an area/key are ambiguous, not independent samples.
  values.set(id,values.has(id)?null:metric.value);
 }
 return index;
}
function niceMagnitude(value:number):number{
 if(!Number.isFinite(value)||value<=0)return 1;
 const power=10**Math.floor(Math.log10(value));
 return Math.ceil(value/power)*power;
}
export function metricChartModel(metric:AreaMetric,index?:ComparisonIndex,areaId?:string):MetricChartModel{
 const value=metric.value;
 if(typeof value!=='number')return {kind:'category',value,low:0,high:1,minimum:0,maximum:1,count:1};
 // Explicitly labelled fractions only. Frequencies, densities, dependency ratios
 // and percentage changes never become probability/proportion bars.
 const nonShare=/(变化|增长|增幅|增长率|变动|百分点|涨跌|抚养比|负担比|change|growth|percentage.point|dependency|Veränderung|Wachstum|Prozentpunkt|Abhängigkeits)/iu.test(Object.values(metric.label).join(' '));
 const fractionalWording=/(占比|比例|份额|得票率|投票率|失业率|百分比)/u.test(metric.label.zh+' '+metric.definition.zh);
 const electionVotes=metric.category==='elections'&&/(第一票|第二票|有效.{0,8}票|first votes|second votes|valid.{0,12}votes|Erststimmen|Zweitstimmen)/iu.test(Object.values(metric.label).join(' ')+' '+Object.values(metric.definition).join(' '));
 const isShare=!nonShare&&metric.unit==='%'&&value>=0&&value<=100&&(fractionalWording||electionVotes);
 if(isShare)return {kind:'share',value,low:0,high:100,minimum:0,maximum:100,count:1};
 const key=comparisonKey(metric),cohort=key&&index?.get(key);
 const comparable=cohort&&areaId&&cohort.get(areaId)===value?[...cohort.values()].filter((v):v is number=>typeof v==='number'&&Number.isFinite(v)):[];
 const values=comparable.length>=2?comparable:[value];
 const minimum=Math.min(...values),maximum=Math.max(...values);
 return {kind:comparable.length>=2?'range':'single',value,low:minimum<0?-niceMagnitude(-minimum):0,
  high:maximum>0?niceMagnitude(maximum):minimum<0?0:1,minimum,maximum,count:values.length};
}

/** Literal source sentences, without generated summaries or hidden truncation. */
export function visibleMetricDefinition(metric:AreaMetric,locale:Locale):string{
 return metric.definition[locale].trim();
}
const NS='http://www.w3.org/2000/svg';
function svgElement(tag:string,attrs:Record<string,string|number>,text?:string):SVGElement{
 const element=document.createElementNS(NS,tag);
 for(const [name,value] of Object.entries(attrs))element.setAttribute(name,String(value));
 if(text!==undefined)element.textContent=text;
 return element;
}
export function appendMetricVisual(host:HTMLElement,metric:AreaMetric,locale:Locale,options:{index?:ComparisonIndex;areaId?:string;scope?:Scope;singleValue?:boolean}={}):void{
 const c=COPY[locale],scope=options.scope??'native';const ordinary=metricChartModel(metric,options.index,options.areaId);const model:MetricChartModel=options.singleValue&&typeof metric.value==='number'&&Number.isFinite(metric.value)?{kind:'single',value:metric.value,low:metric.value<0?-niceMagnitude(-metric.value):0,high:metric.value>0?niceMagnitude(metric.value):metric.value<0?0:1,minimum:metric.value,maximum:metric.value,count:1}:ordinary;
 const note=document.createElement('p');note.className='metric-visible-definition';
 note.textContent=c[scope]+' · '+c.scope+': '+visibleMetricDefinition(metric,locale);host.append(note);
 const figure=document.createElement('figure');figure.className='metric-mini-chart';figure.dataset.chartKind=model.kind;
 const caption=document.createElement('figcaption');
 const number=(n:number)=>new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(n);
 const rangeLabel={zh:'实际范围',en:'Observed range',de:'Beobachteter Wertebereich'}[locale];
 const rangeUnit=localizedMetricUnit(metric,locale)||metric.label[locale];
 caption.textContent=model.kind==='range'?`${c.range} · n=${model.count} · ${rangeLabel}: ${number(model.minimum)}–${number(model.maximum)} ${rangeUnit}`:c[model.kind];
 const svg=svgElement('svg',{viewBox:'0 0 260 56',role:'img','aria-label':metric.label[locale]+': '+datedMetricValue(metric,locale)+'. '+caption.textContent,preserveAspectRatio:'xMidYMid meet'});
 svg.append(svgElement('title',{},metric.label[locale]+': '+datedMetricValue(metric,locale)));
 if(model.kind==='category'){
  svg.append(svgElement('path',{d:'M14 8 L22 16 L14 24 L6 16 Z',fill:'currentColor'}));
  // The actual text remains above; this is a categorical marker, not a magnitude.
  svg.append(svgElement('text',{x:30,y:20,fill:'currentColor','font-size':11},c.category));
 }else{
  const left=8,right=252,y=16,x=(n:number)=>left+(n-model.low)/(model.high-model.low)*(right-left);
  svg.append(svgElement('line',{x1:left,y1:y,x2:right,y2:y,stroke:'currentColor','stroke-opacity':.6,'stroke-width':2}));
  if(model.kind==='range'){
   svg.append(svgElement('line',{x1:x(model.minimum),y1:y,x2:x(model.maximum),y2:y,stroke:'currentColor','stroke-width':4}));
   for(const end of [model.minimum,model.maximum])svg.append(svgElement('line',{x1:x(end),y1:y-5,x2:x(end),y2:y+5,stroke:'currentColor','stroke-width':1}));
  }else{
   const zero=x(0),value=x(model.value as number);
   svg.append(svgElement('rect',{x:Math.min(zero,value),y:y-4,width:Math.abs(value-zero),height:8,fill:'currentColor','fill-opacity':.65}));
  }
  svg.append(svgElement('circle',{cx:x(model.value as number),cy:y,r:4,fill:'var(--metric-marker,#f2c779)',stroke:'currentColor','stroke-width':1.5}));
  // Empty unit fields often encode counts in the original metric label. Retain
  // that exact measure rather than inventing a unit or calling it unspecified.
  const unit=localizedMetricUnit(metric,locale)||metric.label[locale];
  const measure=document.createElement('div');measure.className='metric-chart-measure';measure.textContent=unit;
  figure.append(measure);
  svg.append(svgElement('text',{x:left,y:43,fill:'currentColor','font-size':12},number(model.low)));
  svg.append(svgElement('text',{x:right,y:43,fill:'currentColor','font-size':12,'text-anchor':'end'},number(model.high)));

  if(model.low<0&&model.high>0)svg.append(svgElement('line',{x1:x(0),y1:7,x2:x(0),y2:25,stroke:'currentColor','stroke-dasharray':'2 2'}));
 }
 figure.prepend(svg);figure.append(caption);host.append(figure);
}
