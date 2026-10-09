import {createFinalPositiveMunicipalReferences} from './final-positive-municipal-references';
import {createNurembergMunicipalRentView} from './nuremberg-municipal-rent-view';
import {createEssenMunicipalMHView} from './essen-municipal-mh-view';
import {ESSEN_MH_LIMITED_RULES_REF} from './essen-mh-limited-descriptor';
import {createDusseldorfNeutralGate} from './dusseldorf-kv-neutral-view';
import {DUSSELDORF_NEUTRAL_VIEW_REF} from './dusseldorf-neutral-view-ref';
import {createRemainingLimitationGate} from './remaining-limitation-gate';
import {appendOfficialElectionMethodNote} from './shared-election-loader';
import {createSemanticRefresh} from './semantic-refresh';
import {reviewedSharedDescriptors} from './reviewed-descriptors';
import {createLISProjectionGate} from './lis-projection-gate';
import {dusseldorfMergedReferences} from './reference-merged-descriptor';
import {referenceFallbackController} from './reference-fallback-controller';
import type {ReferenceMetric} from './reference-fallback';
import {filterMunichScopeDisplay,munichScopeGuidance} from './munich-scope-display';
import {MetricShardLoader,type MetricShardReference} from './metric-shard-loader';
import {metricContext} from './metric-context';
import {metricCoverage,appendMetricCoverage,type MetricCoverage} from './metric-coverage';
import {floatingPosition} from './floating-position';
import {areaMetrics,metricCategories,datedMetricValue,observationPeriod,type AreaMetric} from './area-metrics';
import {officialScopeMetrics} from './official-scope-metrics';
import {appendMetricVisual,metricComparisonIndex,type ComparisonIndex} from './metric-visualization';
import {compactChoices} from './compact-choices';
import type {Map as MapView, GeoJSONSource} from 'maplibre-gl';
import {communityReference, type CommunityReference} from './community-boundaries';
import type {FC} from './model';
const empty=():FC=>({type:'FeatureCollection',features:[]});
import {createAreaLookup,overviewArea,containsPosition} from './geography-position';
type Level={id:string;label:string;path:string;overview_zoom:number;labels?:{zh:string;en:string;de:string};geometrySha256?:string;metrics_path?:string;metrics_shards?:MetricShardReference};
const COPY={
 zh:{base:'分区底座',details:'详细信息',none:'点击地图查看所属分区',outside:'点击位置不在当前分区资料覆盖范围内',loading:'正在加载分区…',missing:'当前层级资料尚不可用',close:'关闭',note:'分区是地理参考，与公告六边形和警方划定区域分别展示。远景悬停显示名称，点击定位；近景点击只更新下方信息。',source:'边界来源',date:'边界资料日期',metrics:'地区指标',gap:'尚未接入可核验的地区统计。',warning:'警方公告数量不能替代官方犯罪率；选区与社区边界不一致时，不按面积推算选票。',items:['犯罪统计','盗窃','袭击','租金中位数','失业统计','儿童贫困','人口统计','移民背景','年龄分布','选举结果','学校','福利救济','充电点','住户与家庭'],unavailable:'暂无匹配该分区、年份及口径的已核验数据'},
 en:{base:'Area boundaries',details:'Details',none:'Click the map to identify its area',outside:'This location is outside the available boundary coverage',loading:'Loading boundaries…',missing:'This boundary level is unavailable',close:'Close',note:'Geographic reference, separate from announcement hexagons and police zones. Hover at overview scale for names; click to zoom. At close range, clicks update the information bar.',source:'Boundary source',date:'Boundary date',metrics:'Area statistics',gap:'Verified local statistics have not been connected yet.',warning:'Announcement counts are not official crime rates. Votes are not estimated by area when electoral and neighbourhood boundaries differ.',items:['Crime statistics','Theft','Assault','Median rent','Unemployment','Child poverty','Population','Migration background','Age distribution','Election results','Schools','Welfare recipients','EV charging points','Households and families'],unavailable:'No verified data matching this area, year and definition'},
 de:{base:'Gebietsgrenzen',details:'Details',none:'Karte anklicken, um das Gebiet zu bestimmen',outside:'Dieser Ort liegt außerhalb der verfügbaren Gebietsabdeckung',loading:'Gebietsgrenzen werden geladen…',missing:'Diese Gebietsebene ist nicht verfügbar',close:'Schließen',note:'Geografische Referenz, getrennt von Meldungshexagonen und Polizeigebieten. In der Übersicht erscheinen beim Überfahren Namen; Anklicken zoomt. Im Nahbereich aktualisiert ein Klick die Informationsleiste.',source:'Grenzquelle',date:'Stand der Grenzen',metrics:'Gebietsstatistik',gap:'Verifizierte lokale Statistiken sind noch nicht angebunden.',warning:'Meldungszahlen sind keine amtlichen Kriminalitätsraten. Stimmen werden bei abweichenden Wahl- und Gebietsgrenzen nicht nach Fläche geschätzt.',items:['Kriminalitätsstatistik','Diebstahl','Körperverletzung','Medianmiete','Arbeitslosigkeit','Kinderarmut','Bevölkerung','Migrationshintergrund','Altersverteilung','Wahlergebnisse','Schulen','Sozialleistungen','Ladepunkte','Haushalte und Familien'],unavailable:'Keine verifizierten Daten für dieses Gebiet, Jahr und diese Definition'}
};
export function installGeographyBase(options:{map:MapView;host:HTMLElement;city:string;locale:'zh'|'en'|'de';fetchJSON:(path:string,signal:AbortSignal,policy?:'no-store')=>Promise<unknown>;fetchBytes?:(path:string,signal:AbortSignal,policy?:'no-store')=>Promise<Uint8Array>;onChange:(ref:CommunityReference)=>void}){
 const {map,host,city,locale}=options,c=COPY[locale],abort=new AbortController();
 let ref=communityReference(null,city),level:Level|undefined,levels:Level[]=[],selected:FC['features'][number]|undefined,lastPoint:number[]|undefined,enabled=true,revision=0;
 let areaLookup=createAreaLookup(ref.boundaries.features);
 const cache=new Map<string,CommunityReference>();
 const geometryHashByLevel=new Map<string,string>();
 let officialScopeMetricsPath:string|undefined;let officialMunicipalMetricsPath:string|undefined;let officialRegionalMetricsPath:string|undefined;
 let coverage:MetricCoverage|undefined,coveragePath:string|undefined='/safety/geography/metric-coverage.json',coverageLoading:Promise<void>|undefined;
 let metricState:'absent'|'loading'|'ready'|'error'='absent';
 let metrics:Record<string,AreaMetric[]>={},activeComparisons:ComparisonIndex|undefined,activeLayerCategories=new Set<string>();
 let metricRequest=new AbortController(),metricSelection=0,metricAttemptKey='';
 const shardLoader=new MetricShardLoader({fetchBytes:(path,signal)=>{if(!options.fetchBytes)throw Error('Metric bytes loader unavailable');return options.fetchBytes(path,signal);},legacy:(_city,id,signal)=>{const path=levels.find(l=>l.id===id)?.metrics_path;if(!path)return Promise.resolve(undefined);return options.fetchJSON(path,signal);}});
 const toolbar=document.createElement('nav');toolbar.className='geography-toolbar';toolbar.setAttribute('aria-label',c.base);
 const label=document.createElement('span');label.textContent=c.base;toolbar.append(label);
 const select=document.createElement('select');select.setAttribute('aria-label',c.base);select.disabled=true;toolbar.append(select);
 const choices=compactChoices(select);
 const modeCopy={zh:{label:'地图维度',pending:'3D'},en:{label:'Map dimension',pending:'3D'},de:{label:'Kartendimension',pending:'3D'}}[locale];
 const modes=document.createElement('div');modes.className='compact-choices geography-dimensions';modes.setAttribute('role','group');modes.setAttribute('aria-label',modeCopy.label);
 const flat=document.createElement('button');flat.type='button';flat.textContent='2D';flat.setAttribute('aria-pressed','true');
 const three=document.createElement('button');three.type='button';three.textContent='3D';three.disabled=true;three.setAttribute('aria-label',modeCopy.pending);three.setAttribute('aria-pressed','false');
 modes.append(flat,three);toolbar.append(modes);
 const hint=document.createElement('details');const summary=document.createElement('summary');summary.textContent='ⓘ';summary.setAttribute('aria-label',c.base);const note=document.createElement('p');note.textContent=c.note;hint.append(summary,note);toolbar.append(hint);host.prepend(toolbar);
 const bar=document.createElement('div');bar.className='geography-info';bar.setAttribute('aria-live','polite');
 const name=document.createElement('span');name.textContent=c.loading;const details=document.createElement('button');details.textContent=c.details;details.disabled=true;bar.append(name,details);host.append(bar);
 const panel=document.createElement('section');panel.className='geography-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label',c.details);
 const handle=document.createElement('header');handle.className='geography-drag';handle.tabIndex=0;
 const title=document.createElement('strong'),close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label',c.close);handle.append(title,close);const body=document.createElement('div');body.className='geography-panel-body';panel.append(handle,body);document.body.append(panel);
 close.onclick=()=>{cancelSemantic();references.cancel();context.destroy();metricRequest.abort();metricAttemptKey='';panel.hidden=true;details.focus();};panel.onkeydown=e=>{if(e.key==='Escape')close.click();};
 let drag:{x:number;y:number;left:number;top:number}|undefined;
 handle.onpointerdown=e=>{if((e.target as HTMLElement).closest('button'))return;const r=panel.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};handle.setPointerCapture(e.pointerId);};
 const visibleViewport=()=>{const v=window.visualViewport;return {left:v?.offsetLeft??0,top:v?.offsetTop??0,width:v?.width??innerWidth,height:v?.height??innerHeight};};
 const move=(left:number,top:number)=>{const v=visibleViewport();panel.style.maxWidth=Math.max(0,v.width-24)+'px';panel.style.maxHeight=Math.min(380,Math.max(0,v.height-24),v.width<=760?v.height*.55:Infinity)+'px';const position=floatingPosition(left,top,panel.offsetWidth,panel.offsetHeight,v);panel.style.left=position.left+'px';panel.style.top=position.top+'px';panel.style.right='auto';};
 const clampPanel=()=>{if(panel.hidden)return;const r=panel.getBoundingClientRect();move(r.left,r.top);};
 window.addEventListener('resize',clampPanel);window.visualViewport?.addEventListener('resize',clampPanel);window.visualViewport?.addEventListener('scroll',clampPanel);
 handle.onpointermove=e=>{if(drag)move(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);};handle.onpointerup=handle.onpointercancel=()=>{drag=undefined;};
 handle.onkeydown=e=>{const delta:Record<string,number[]>={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};if(delta[e.key]){e.preventDefault();const r=panel.getBoundingClientRect();move(r.left+delta[e.key][0],r.top+delta[e.key][1]);}};
 const fetchSemanticBytes=(path:string,signal:AbortSignal)=>{if(!options.fetchBytes)throw Error('Semantic bytes unavailable');return options.fetchBytes(path,signal);};
 const semanticProjection=city==='dusseldorf'?createDusseldorfNeutralGate(fetchSemanticBytes,DUSSELDORF_NEUTRAL_VIEW_REF):createLISProjectionGate(fetchSemanticBytes);
 const remainingLimits=createRemainingLimitationGate((path,signal)=>{if(!options.fetchBytes)throw Error('Limitation bytes unavailable');return options.fetchBytes(path,signal);});
 let limitRefreshKey='';
 const semanticRefresh=createSemanticRefresh(semanticProjection);
 const cancelSemantic=()=>{remainingLimits.cancel();limitRefreshKey='';semanticRefresh.cancel();};
 const context=metricContext({city,locale,semanticProjection,remainingLimits,fetchJSON:options.fetchJSON,loadAreaMetrics:(scope,areaId,signal)=>shardLoader.load({city,level:scope.id,areaId,manifest:scope.metrics_shards,signal}).then(r=>filterMunichScopeDisplay(city,scope.id,r.metrics))});
 const essenMunicipalMHView=city==='essen'?createEssenMunicipalMHView(ESSEN_MH_LIMITED_RULES_REF,(path,signal)=>{if(!options.fetchBytes)throw Error('Municipal proof bytes unavailable');return options.fetchBytes(path,signal);}):undefined;
 const nurembergMunicipalRentView=city==='nuremberg'?createNurembergMunicipalRentView((path,signal)=>{if(!options.fetchBytes)throw Error('Rent proof bytes unavailable');return options.fetchBytes(path,signal);}):undefined;
 const finalPositiveMunicipalReferences=['essen','nuremberg'].includes(city)?createFinalPositiveMunicipalReferences((path,signal)=>{if(!options.fetchBytes)throw Error('Municipal source proof unavailable');return options.fetchBytes(path,signal);},essenMunicipalMHView,nurembergMunicipalRentView):undefined;
 const references=referenceFallbackController({city,locale,finalPositiveMunicipalReferences,essenMunicipalMHView,nurembergMunicipalRentView,bremenOptionalCityReference:city==='bremen',frankfurtOfficialEstimatedElections:city==='frankfurt',semanticProjection,remainingLimits,reviewedSharedGroups:['dusseldorf','frankfurt'].includes(city)?[reviewedSharedDescriptors[city as 'dusseldorf'|'frankfurt']]:undefined,sourceQualifiedBroaderReferences:['hannover','cologne'].includes(city),fetchJSON:options.fetchJSON,
  fetchBytes:(path,signal,policy)=>{if(!options.fetchBytes)throw Error('Reference bytes loader unavailable');return options.fetchBytes(path,signal,policy);},
  loadAreaMetrics:(requested,areaId,signal)=>{
   const known=levels.find(item=>item.id===requested.id&&item.path===requested.path);
   if(!known||!known.metrics_shards)throw Error('Unknown reference source level');
   return shardLoader.load({city,level:known.id,areaId,manifest:known.metrics_shards,signal}).then(result=>{
    if(result.mode!=='shard'||!requested.geometrySha256||result.geometrySha256!==requested.geometrySha256)throw Error('Reference geometry differs from metric source geometry');
    return filterMunichScopeDisplay(city,known.id,result.metrics) as unknown as ReferenceMetric[];
   });
  },
  appendVisual:(host,metric,lang,scope,sourceKind)=>appendMetricVisual(host,metric as unknown as AreaMetric,lang,{scope:sourceKind==='police'?'police':scope==='regional'?'regional':scope==='municipal'?'municipal':'context'}),onResize:clampPanel});
 const appendMunicipalScopes=officialScopeMetrics({city,locale,signal:abort.signal,fetchJSON:options.fetchJSON,onResize:clampPanel,kind:'municipal',semanticProjection,essenMunicipalMHView,nurembergMunicipalRentView});
 const appendRegionalScopes=officialScopeMetrics({city,locale,signal:abort.signal,fetchJSON:async(path,signal)=>{if(!options.fetchBytes)return options.fetchJSON(path,signal);const bytes=await options.fetchBytes(path,signal);signal.throwIfAborted();if(bytes.byteLength>8*1024*1024)throw Error('Regional statistics exceed bound');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));},onResize:clampPanel,kind:'regional'});
 let coverageSourceSHA256:string|undefined;
 const appendOfficialScopes=officialScopeMetrics({city,locale,signal:abort.signal,fetchJSON:options.fetchJSON,onResize:clampPanel});
 const put=(tag:string,value:unknown)=>{const el=document.createElement(tag);el.textContent=String(value);body.append(el);return el;};
 function showDetails(id?:string){
  cancelSemantic();references.cancel();
  if(coveragePath&&!coverage&&!coverageLoading){coverageLoading=(city==='leipzig'&&options.fetchBytes?options.fetchBytes(coveragePath,abort.signal).then(async bytes=>{coverageSourceSHA256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer)),b=>b.toString(16).padStart(2,'0')).join('');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}):options.fetchJSON(coveragePath,abort.signal)).then(v=>{coverage=metricCoverage(v,city);if(coverage&&!panel.hidden)showDetails();}).catch(()=>{}).finally(()=>{coverageLoading=undefined;});} 
  if(id)selected=ref.boundaries.features.find(f=>f.properties.id===id);if(!selected)return;
  const metricArea=String(selected.properties.id),metricKey=(level?.id??'')+'|'+metricArea;
  if(level&&(level.metrics_path||level.metrics_shards)&&metricAttemptKey!==metricKey){
   metricRequest.abort();metricRequest=new AbortController();const signal=metricRequest.signal,ticket=++metricSelection,chosenLevel=level;metricAttemptKey=metricKey;metricState='loading';metrics={};activeComparisons=undefined;
   void shardLoader.load({city,level:chosenLevel.id,areaId:metricArea,manifest:chosenLevel.metrics_shards,signal}).then(result=>{
    if(signal.aborted||ticket!==metricSelection||level?.id!==chosenLevel.id||String(selected?.properties.id)!==metricArea)return;
    const actualGeometrySha256=geometryHashByLevel.get(chosenLevel.id);
    if(result.mode==='shard'&&actualGeometrySha256&&result.geometrySha256!==actualGeometrySha256)throw Error('Selected metric geometry differs from loaded boundary');
    metrics={[metricArea]:result.metrics};activeComparisons=result.comparisons;const checked=result.coverage?metricCoverage({city,levels:[result.coverage]},city)?.levels[0]:coverage?.levels.find(l=>l.id===chosenLevel.id);activeLayerCategories=new Set(checked?Object.keys(checked.categories):result.metrics.map(m=>m.category));metricState='ready';panel.dataset.metricsMode=result.mode;if(!panel.hidden)showDetails();
   }).catch(()=>{if(!signal.aborted&&ticket===metricSelection){metricState='error';if(!panel.hidden)showDetails();}});
  }
  title.textContent=String(selected.properties.name);body.replaceChildren();put('p',level?.label??ref.metadata.division_level??'');
  const source=selected.properties.source_url??ref.metadata.source_url;
  put('p',`${c.date}: ${ref.metadata.boundary_reference_year??ref.metadata.snapshot??({zh:'来源未注明',en:'Not stated by source',de:'Von der Quelle nicht angegeben'})[locale]}`);
  if(ref.metadata.retrieved)put('p',`${({zh:'获取日期（不代表边界年份）',en:'Retrieved (not the boundary year)',de:'Abgerufen (nicht der Gebietsstand)'})[locale]}: ${ref.metadata.retrieved}`);
  if(typeof source==='string'&&/^https:\/\//.test(source)){const a=put('a',`${c.source}: ${ref.metadata.source_name??source}`) as HTMLAnchorElement;a.href=source;a.target='_blank';a.rel='noopener noreferrer';}
  if(officialScopeMetricsPath)appendOfficialScopes(body,officialScopeMetricsPath);
  if(officialMunicipalMetricsPath)appendMunicipalScopes(body,officialMunicipalMetricsPath);
  if(officialRegionalMetricsPath)appendRegionalScopes(body,officialRegionalMetricsPath);
  const planningTarget=city==='munich'&&['level1','level2','level3'].includes(level?.id??'')?levels.find(l=>l.id===munichScopeGuidance.targetLevel):undefined;
  if(planningTarget){const guidance=munichScopeGuidance[locale];const section=put('section','');section.setAttribute('data-munich-scope-guidance','true');const explanation=document.createElement('p');explanation.textContent=guidance.text;const button=document.createElement('button');button.type='button';button.textContent=guidance.action;button.onclick=()=>{select.value=planningTarget.id;choices.synchronize();void change(planningTarget).then(()=>{if(level?.id===planningTarget.id&&selected)showDetails();});};section.append(explanation,button);}
  // Legacy aggregate coverage includes transferred source copies; do not present it as current display coverage.
  if(coverage&&!planningTarget)appendMetricCoverage(body,coverage,locale,level?.id??'',c.items,next=>{const target=levels.find(l=>l.id===next);if(target){select.value=target.id;choices.synchronize();void change(target).then(()=>{if(selected)showDetails();});}},coverageSourceSHA256);
  context.append(body,levels,level?.id??'',lastPoint&&containsPosition(selected.geometry,lastPoint)?lastPoint:undefined,filterMunichScopeDisplay(city,level?.id??'',metrics[String(selected.properties.id)]??[]),c.items);
  put('h3',c.metrics);
  put('p',({zh:'每类优先显示近期观测；不同定义和覆盖范围的数值分别保留，不能直接相加。接入某一类型不表示该类型的全部指标已经齐全。',en:'Recent observations appear first within each category. Different definitions and coverage remain separate and must not simply be added. A connected category does not mean every requested indicator in it is available.',de:'Neuere Beobachtungen stehen je Kategorie zuerst. Unterschiedliche Definitionen und Erhebungsumfänge bleiben getrennt und dürfen nicht einfach addiert werden. Eine angebundene Kategorie bedeutet nicht, dass alle gewünschten Kennzahlen darin vorliegen.'})[locale]);
  if(metricState==='loading'||metricState==='error'){put('p',metricState==='loading'?({zh:'正在加载此层级指标…',en:'Loading statistics for this level…',de:'Indikatoren dieser Ebene werden geladen…'})[locale]:({zh:'指标加载失败，请切换分区层级后重试。网络错误不代表没有统计数据。',en:'Statistics could not be loaded. Switch area levels to retry. A network error does not mean statistics are absent.',de:'Indikatoren konnten nicht geladen werden. Zum erneuten Versuch die Gebietsebene wechseln. Ein Netzwerkfehler bedeutet nicht, dass Statistiken fehlen.'})[locale]);panel.hidden=false;clampPanel();return;}
  const areaId=String(selected.properties.id),rows=filterMunichScopeDisplay(city,level?.id??'',metrics[areaId]??[]);if(!rows.length)put('p',c.gap);
  if(metricState==='ready')references.append(body,{levels,currentLevel:level?.id??'',currentGeometrySha256:geometryHashByLevel.get(level?.id??''),areaId,
   areaName:{zh:String(selected.properties.name),en:String(selected.properties.name),de:String(selected.properties.name)},
   point:lastPoint&&lastPoint.length===2&&containsPosition(selected.geometry,lastPoint)?[lastPoint[0],lastPoint[1]]:undefined,
   rows:rows as unknown as ReferenceMetric[],officialMunicipalMetricsPath});
  const semanticContext={city,level:level?.id??'',nativeAreaId:areaId};
  if(rows.some(m=>semanticProjection.peek(semanticContext,m as unknown as ReferenceMetric).status==='pending')&&!semanticRefresh.loading){const ticket=metricSelection,sourceArea=areaId,sourceLevel=level?.id;semanticRefresh.request(()=>ticket===metricSelection&&!panel.hidden&&level?.id===sourceLevel&&String(selected?.properties.id)===sourceArea,()=>showDetails());}
  const limitKey=metricSelection+'|'+semanticContext.level+'|'+areaId;
  const limitedRows=rows.filter(m=>remainingLimits.needs(semanticContext,m as unknown as ReferenceMetric));
  if(limitedRows.some(m=>remainingLimits.peek(semanticContext,m as unknown as ReferenceMetric).status==='pending')&&limitRefreshKey!==limitKey){const ticket=metricSelection,sourceArea=areaId,sourceLevel=level?.id,signal=metricRequest.signal;limitRefreshKey=limitKey;void Promise.all(limitedRows.map(m=>remainingLimits.ensure(semanticContext,m as unknown as ReferenceMetric,signal))).catch(()=>{}).finally(()=>{if(limitRefreshKey===limitKey)limitRefreshKey='';if(!signal.aborted&&ticket===metricSelection&&!panel.hidden&&level?.id===sourceLevel&&String(selected?.properties.id)===sourceArea)showDetails();});}
  const comparison=activeComparisons??metricComparisonIndex(metrics);
  const missing:string[]=[],areaGaps:string[]=[];
  const layerCategories=activeLayerCategories;
  for(const [index,category] of metricCategories.entries()){
   const matching=rows.filter(m=>m.category===category).sort((a,b)=>b.year-a.year||observationPeriod(b).localeCompare(observationPeriod(a)));
   if(!matching.length){(layerCategories.has(category)?areaGaps:missing).push(c.items[index]);continue;}
   put('h4',matching.every(m=>semanticProjection.needs(semanticContext,m as unknown as ReferenceMetric))?({zh:'来源专有指标（口径受限）',en:'Source-specific indicators (definition limited)',de:'Quellenspezifische Kennzahlen (Definition eingeschränkt)'})[locale]:c.items[index]);
   for(const metric of matching){const limitationState=remainingLimits.render(body,semanticContext,metric as unknown as ReferenceMetric,locale,(original,l)=>datedMetricValue(original as unknown as AreaMetric,l),'native');const semanticState=limitationState.status==='regular'?semanticProjection.render(body,semanticContext,metric as unknown as ReferenceMetric,locale,(original,l)=>datedMetricValue(original as unknown as AreaMetric,l),'native'):limitationState;
    if(semanticState.status==='regular'){put('p',metric.label[locale]+': '+datedMetricValue(metric,locale));appendMetricVisual(body,metric,locale,{index:comparison,areaId,scope:'native'});}
    appendOfficialElectionMethodNote(body,metric,locale);
    const more=put('details',''),summary=document.createElement('summary');summary.textContent=({zh:'来源与口径',en:'Source and definition',de:'Quelle und Definition'})[locale];more.append(summary);
    const definition=document.createElement('p');definition.textContent=metric.definition[locale];more.append(definition);
    const source=document.createElement('a');source.textContent=metric.source_name;source.href=metric.source_url;source.target='_blank';source.rel='noopener noreferrer';more.append(source);
   }
  }
  if(areaGaps.length){const gap=put('details',''),heading=document.createElement('summary');heading.textContent=({zh:'此分区缺少的指标',en:'Missing observations for this area',de:'Fehlende Werte für dieses Gebiet'})[locale]+` (${areaGaps.length})`;const list=document.createElement('p');list.textContent=areaGaps.join(' · ');const explanation=document.createElement('p');explanation.textContent=({zh:'同层级其他分区已有这些指标，此分区尚无可核验的对应值。可能涉及合并统计区、保密值或匹配缺口；缺失不等于零。',en:'These statistics are connected for other areas at this level, but no verified matching value is available here. Combined reporting areas, suppressed values or matching gaps may apply. Missing is not zero.',de:'Diese Indikatoren sind für andere Gebiete derselben Ebene angebunden, hier fehlt jedoch ein verifizierter passender Wert. Zusammengefasste Gebiete, Geheimhaltung oder Zuordnungslücken können zutreffen. Fehlend bedeutet nicht null.'})[locale];gap.append(heading,list,explanation);}
  if(missing.length){const gap=put('details',''),heading=document.createElement('summary');heading.textContent=({zh:'尚未接入的指标',en:'Not yet connected at this level',de:'Auf dieser Ebene noch nicht angebunden'})[locale]+` (${missing.length})`;const list=document.createElement('p');list.textContent=missing.join(' · ');const explanation=document.createElement('p');explanation.textContent=({zh:'当前层级尚未接入这些指标，不能据此认定官方没有数据。各层级独立匹配，不复制上级区域数值。',en:'These indicators have not yet been connected at this level; this does not establish that official data do not exist. Each level is matched independently, without copying values from larger areas.',de:'Diese Indikatoren sind auf dieser Ebene noch nicht angebunden; daraus folgt nicht, dass amtliche Daten fehlen. Jede Ebene wird eigenständig zugeordnet, ohne Werte größerer Gebiete zu übernehmen.'})[locale];gap.append(heading,list,explanation);}
  put('p',c.warning);
  panel.hidden=false;clampPanel();handle.focus();
 }
 details.onclick=()=>{if(metricState==='error')metricAttemptKey='';showDetails();};
 const set=(id:string,data:FC)=>(map.getSource(id) as GeoJSONSource|undefined)?.setData(data);
 let hoveredId:string|undefined;
 const clearHover=()=>{if(hoveredId===undefined)return;hoveredId=undefined;set('community-hover',empty());set('community-names',empty());};
 function locateAt(point:number[]){cancelSemantic();references.cancel();lastPoint=point;selected=areaLookup.find(point);name.textContent=selected?`${level?.label??ref.metadata.division_level??''} · ${selected.properties.name}`:ref.available?c.outside:c.missing;details.disabled=!selected;}
 function chooseAt(point:number[]){locateAt(point);if(!selected||map.getZoom()>=(level?.overview_zoom??13))return;
  let west=180,east=-180,south=90,north=-90;
  const scan=(v:any)=>{if(typeof v[0]==='number'){west=Math.min(west,v[0]);east=Math.max(east,v[0]);south=Math.min(south,v[1]);north=Math.max(north,v[1]);}else v.forEach(scan);};
  scan((selected.geometry as any).coordinates);map.fitBounds([[west,south],[east,north]],{padding:36,maxZoom:level?.overview_zoom??13,duration:650});
 }
 function visibility(value=enabled){enabled=value;for(const id of ['community-hit','community-line','community-label','community-hover'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',enabled&&ref.available?'visible':'none');if(!enabled)clearHover();}
 async function change(next:Level){cancelSemantic();references.cancel();context.destroy();metricRequest.abort();metricAttemptKey='';metricSelection++;activeComparisons=undefined;activeLayerCategories.clear();const ticket=++revision;level=next;name.textContent=c.loading;clearHover();panel.hidden=true;details.disabled=true;selected=undefined;metrics={};metricState='absent';ref=communityReference(null,city);areaLookup=createAreaLookup(ref.boundaries.features);set('communities',empty());visibility();
  let nextRef=cache.get(next.id);
  if(!nextRef){try{
   if(options.fetchBytes){
    const bytes=await options.fetchBytes(next.path,abort.signal);abort.signal.throwIfAborted();
    if(!bytes.byteLength||bytes.byteLength>8*1024*1024)throw Error('Boundary bytes exceed bound');
    const parsed=communityReference(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),city);
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer)),b=>b.toString(16).padStart(2,'0')).join('');
    abort.signal.throwIfAborted();if(ticket!==revision)return;
    nextRef=parsed;if(parsed.available){geometryHashByLevel.set(next.id,digest);next.geometrySha256=digest;}
   }else{const raw=await options.fetchJSON(next.path,abort.signal);abort.signal.throwIfAborted();if(ticket!==revision)return;nextRef=communityReference(raw,city);geometryHashByLevel.delete(next.id);next.geometrySha256=undefined;}
  }catch{if(ticket!==revision)return;nextRef=communityReference(null,city);geometryHashByLevel.delete(next.id);next.geometrySha256=undefined;}
  if(nextRef.available)cache.set(next.id,nextRef);
 }else next.geometrySha256=geometryHashByLevel.get(next.id);
  if(abort.signal.aborted||ticket!==revision)return;ref=nextRef;areaLookup=createAreaLookup(ref.boundaries.features);options.onChange(ref);set('communities',ref.boundaries);visibility();if(lastPoint)locateAt(lastPoint);else name.textContent=ref.available?c.none:c.missing;

 }
 select.onchange=()=>{const next=levels.find(l=>l.id===select.value);if(next)void change(next);};
 map.on('mousemove',e=>{if(!enabled||!ref.available||map.getZoom()>=(level?.overview_zoom??13)){clearHover();return;}const f=overviewArea(areaLookup,[e.lngLat.lng,e.lngLat.lat],map.getZoom(),level?.overview_zoom??13,enabled&&ref.available);if(f?.properties.id===hoveredId)return;hoveredId=f?.properties.id;set('community-hover',{type:'FeatureCollection',features:f?[f]:[]});set('community-names',{type:'FeatureCollection',features:f?ref.labels.features.filter(p=>p.properties.id===f.properties.id):[]});});
 map.getCanvas().addEventListener('mouseleave',clearHover);map.on('zoomstart',clearHover);
 async function load(){
  try{const manifest=await options.fetchJSON('/safety/geography/index.json',abort.signal) as any;
   if(manifest?.city===city&&manifest.metric_coverage_path==='/safety/geography/metric-coverage.json')coveragePath=manifest.metric_coverage_path;
   if(manifest?.city===city&&typeof manifest.official_scope_metrics_path==='string'&&/^\/safety\/geography\/[a-zA-Z0-9_-]+-metrics\.json$/.test(manifest.official_scope_metrics_path))officialScopeMetricsPath=manifest.official_scope_metrics_path;
   if(manifest?.city===city&&typeof manifest.official_municipal_metrics_path==='string'&&/^\/safety\/geography\/[a-zA-Z0-9_-]+-metrics\.json$/.test(manifest.official_municipal_metrics_path))officialMunicipalMetricsPath=manifest.official_municipal_metrics_path;
   if(manifest?.city===city&&manifest.official_regional_metrics_path==='/safety/geography/official-regional-scope-metrics.json')officialRegionalMetricsPath=manifest.official_regional_metrics_path;
   if(manifest?.city===city&&Array.isArray(manifest.levels))levels=manifest.levels.slice(0,4).filter((l:any)=>typeof l.id==='string'&&typeof l.path==='string'&&/^\/safety\/geography\/[a-zA-Z0-9_-]+\.geojson$/.test(l.path)&&Number.isFinite(l.overview_zoom)).map((l:any)=>({...l,label:typeof l.labels?.[locale]==='string'?l.labels[locale]:l.id}));
  }catch{/* Older city artifacts expose one explicitly named reference level. */}
  if(!levels.length)levels=[{id:'reference',label:c.base,path:'/safety/community-boundaries.geojson',overview_zoom:13}];
  select.replaceChildren(...levels.map(l=>{const o=document.createElement('option');o.value=l.id;o.textContent=l.label;return o;}));select.disabled=levels.length<2;await change(levels[0]);
 }
 map.resize();
 return {hasArea:()=>enabled&&Boolean(selected),isOverview:()=>map.getZoom()<(level?.overview_zoom??13),load,locateAt,chooseAt,showDetails,visibility,get metricsCacheStats(){return shardLoader.cacheStats;},destroy(){semanticRefresh.destroy();semanticProjection.destroy();geometryHashByLevel.clear();references.destroy();metricRequest.abort();context.destroy();abort.abort();choices.destroy();window.removeEventListener('resize',clampPanel);window.visualViewport?.removeEventListener('resize',clampPanel);window.visualViewport?.removeEventListener('scroll',clampPanel);panel.remove();toolbar.remove();bar.remove();}};
}
