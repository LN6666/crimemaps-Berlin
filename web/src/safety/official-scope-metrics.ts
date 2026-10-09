import {isNurembergLimitedRentScope,appendNurembergRentWithheld,type createNurembergMunicipalRentView} from './nuremberg-municipal-rent-view';
import type {createEssenMunicipalMHView} from './essen-municipal-mh-view';
import {isEssenMHLimitedScope,formatEssenMHValue,appendEssenMHSingleGraphic,appendEssenMHWithheld} from './essen-mh-limited-descriptor';
import type {LISProjectionGate} from './lis-projection-gate';
import type {Metric} from './lis-semantic-projection';
import {officialPoliceScopes,officialMunicipalScopes,officialRegionalScopes,datedMetricValue,type OfficialPoliceScope,type OfficialRegionalScope} from './area-metrics';
import {appendMetricVisual} from './metric-visualization';
const COPY={
 zh:{title:'警方统计范围 · 独立查看',note:'这些统计属于警方辖区，不是上方所选街区或市辖区的指标，也不代表所选位置一定属于某个分局。PI 1–6 为科隆警方分局；PP Köln 包括科隆与勒沃库森。尚未接入可核验的警方辖区边界，不在地图上补画或按行政区分配。',loading:'正在加载警方统计…',error:'警方统计加载失败；收起后重新展开可重试。',source:'来源与口径',choice:'选择警方统计范围'},
 en:{title:'Police statistical scopes · separate view',note:'These figures describe police jurisdictions, not the selected neighbourhood or administrative district. No police jurisdiction is inferred for the selected location. PI 1–6 are Cologne police inspectorates; PP Köln includes Cologne and Leverkusen. Verified police boundaries are not connected; no boundaries are invented or values assigned to administrative areas.',loading:'Loading police statistics…',error:'Police statistics could not be loaded. Close and reopen to retry.',source:'Source and definition',choice:'Choose a police statistical scope'},
 de:{title:'Polizeiliche Bezugsräume · separate Ansicht',note:'Diese Werte gelten für Polizeibezirke, nicht für den oben gewählten Stadtteil oder Stadtbezirk. Für den ausgewählten Ort wird keine Polizeiinspektion abgeleitet. PI 1–6 sind Kölner Polizeiinspektionen; PP Köln umfasst Köln und Leverkusen. Verifizierte Polizeigrenzen sind noch nicht angebunden; keine erfundenen Grenzen oder Zuordnung zu Verwaltungsgebieten.',loading:'Polizeistatistik wird geladen…',error:'Polizeistatistik konnte nicht geladen werden. Zum Wiederholen zuklappen und erneut öffnen.',source:'Quelle und Definition',choice:'Polizeilichen Bezugsraum wählen'}
};
const MUNICIPAL_COPY={
 zh:{title:'全市统计 · 独立查看',note:'以下数值描述整个城市，不属于上方选中的街区、片区或市辖区；不能据此推断某个小区的数值。各指标分别标明年份、来源和口径。',loading:'正在加载全市统计…',error:'全市统计加载失败；收起后重新展开可重试。',source:'来源与口径',choice:'选择全市统计范围'},
 en:{title:'Whole-city statistics · separate view',note:'These values describe the entire municipality, not the selected neighbourhood, quarter or district. They cannot be used to infer values for smaller areas. Each observation states its own period, source and definition.',loading:'Loading municipality statistics…',error:'Municipality statistics could not be loaded. Close and reopen to retry.',source:'Source and definition',choice:'Choose municipality scope'},
 de:{title:'Gesamtstädtische Statistik · separate Ansicht',note:'Diese Werte beschreiben das gesamte Stadtgebiet, nicht den gewählten Stadtteil oder Stadtbezirk. Daraus werden keine Werte für kleinere Gebiete abgeleitet. Bezugszeit, Quelle und Definition stehen bei jeder Kennzahl.',loading:'Stadtstatistik wird geladen…',error:'Stadtstatistik konnte nicht geladen werden. Zum Wiederholen zuklappen und erneut öffnen.',source:'Quelle und Definition',choice:'Gesamtstädtischen Bezugsraum wählen'}
};
const REGIONAL_COPY={
 zh:{title:'较大区域统计 · Region/Kreis · 独立查看',note:'以下数值属于来源明确指定的Region或Kreis较大范围，不是全市或上方所选街区、片区和市辖区。不能推断手动选点属于该范围，不向原生分区分配数值；本栏目没有接入区域几何。各指标保留实际日期和来源。',loading:'正在加载较大区域统计…',error:'较大区域统计加载失败；收起后重新展开可重试。',source:'来源与口径',choice:'选择较大统计范围'},
 en:{title:'Larger-region statistics · Region/Kreis · separate view',note:'These figures belong to the explicitly sourced Region or Kreis, not the municipality or selected neighbourhood, quarter or district. No membership of a manually selected point is inferred and no values are allocated to native areas. No regional geometry is connected. Each observation retains its actual date and source.',loading:'Loading larger-region statistics…',error:'Regional statistics could not be loaded. Close and reopen to retry.',source:'Source and definition',choice:'Choose larger statistical scope'},
 de:{title:'Überregionaler Bezugsraum · Region/Kreis · separate Ansicht',note:'Diese Werte gelten für die ausdrücklich belegte Region oder den Kreis, nicht für das gesamte Stadtgebiet oder den gewählten Stadtteil/Stadtbezirk. Keine räumliche Zugehörigkeit eines manuell gewählten Kartenpunkts und keine Werteverteilung auf native Gebiete werden abgeleitet. Regionale Geometrie ist nicht angebunden. Jede Beobachtung behält Bezugsdatum und Quelle.',loading:'Regionale Statistik wird geladen…',error:'Regionale Statistik konnte nicht geladen werden. Zum Wiederholen zuklappen und erneut öffnen.',source:'Quelle und Definition',choice:'Überregionalen Bezugsraum wählen'}
};
/** Lazily loaded, bounded, independent section inside the existing compact area popup. */
export function officialScopeMetrics(options:{city:string;locale:'zh'|'en'|'de';signal:AbortSignal;fetchJSON:(path:string,signal:AbortSignal)=>Promise<unknown>;onResize:()=>void;kind?:'police'|'municipal'|'regional';semanticProjection?:LISProjectionGate;nurembergMunicipalRentView?:ReturnType<typeof createNurembergMunicipalRentView>;essenMunicipalMHView?:ReturnType<typeof createEssenMunicipalMHView>}){
 const {city,locale,signal}=options,c=(options.kind==='regional'?REGIONAL_COPY:options.kind==='municipal'?MUNICIPAL_COPY:COPY)[locale];let cached:Promise<OfficialPoliceScope[]>|undefined,selected='';
 return function append(host:HTMLElement,path:string){
  if(!/^\/safety\/geography\/[a-zA-Z0-9_-]+-metrics\.json$/.test(path))return;
  const section=document.createElement('details'),summary=document.createElement('summary'),content=document.createElement('div');
  section.className='official-scope-metrics';summary.textContent=c.title;section.append(summary,content);host.append(section);
  section.style.cssText='border-top:1px solid currentColor;margin-top:8px;padding-top:6px;overflow-wrap:anywhere';
  let loaded=false,renderEpoch=0,renderRequest:AbortController|undefined;
  const cancelRender=()=>{renderEpoch++;renderRequest?.abort();renderRequest=undefined;};
  section.addEventListener('toggle',async()=>{
   options.onResize();if(!section.open){cancelRender();loaded=false;return;}if(loaded||signal.aborted)return;loaded=true;const opening=++renderEpoch;content.textContent=c.loading;
   try{
    cached??=options.fetchJSON(path,signal).then(v=>{const scopes=(options.kind==='regional'?officialRegionalScopes:options.kind==='municipal'?officialMunicipalScopes:officialPoliceScopes)(v,city);if(!scopes.length)throw new Error('Invalid police statistics');return scopes;});
    const scopes=await cached;if(signal.aborted||!section.open||!section.isConnected||opening!==renderEpoch)return;
    content.replaceChildren();const note=document.createElement('p');note.textContent=c.note;content.append(note);
    const choices=document.createElement('div'),values=document.createElement('div');choices.setAttribute('role','group');choices.setAttribute('aria-label',c.choice);
    choices.style.cssText='display:flex;flex-wrap:wrap;gap:4px;max-width:100%';values.setAttribute('aria-live','polite');content.append(choices,values);
    const buttons:HTMLButtonElement[]=[];
    const render=async(scope:OfficialPoliceScope)=>{
     cancelRender();const token=renderEpoch,local=new AbortController();renderRequest=local;
     const active=()=>!signal.aborted&&!local.signal.aborted&&section.open&&section.isConnected&&renderEpoch===token&&selected===scope.id;
     selected=scope.id;if(!active())return;values.replaceChildren();buttons.forEach((b,i)=>{const active=scopes[i].id===selected;b.setAttribute('aria-pressed',String(active));b.style.background=active?'#294b68':'#172c3f';b.style.color='#eef2f5';b.style.border=active?'1px solid #8ac5ec':'1px solid #607080';});
     const heading=document.createElement('h4');heading.textContent=scope.name[locale];values.append(heading);if(options.kind==='regional'){const attribution=document.createElement('p');attribution.textContent=(scope as OfficialRegionalScope).source_name[locale];values.append(attribution);}
     const semanticContext={city,level:'',nativeAreaId:scope.id},projection=options.kind==='municipal'?options.semanticProjection:undefined;
     if(projection&&scope.metrics.some(m=>projection.needs(semanticContext,m as unknown as Metric))){
      const abortLocal=()=>local.abort();signal.addEventListener('abort',abortLocal,{once:true});
      try{await projection.ensure(local.signal);}catch{/* The gate keeps unqualified rows withheld. */}finally{signal.removeEventListener('abort',abortLocal);}
      if(!active())return;
     }
     if(!active())return;
     const mhOpening=options.essenMunicipalMHView?.begin(local.signal,active);
     const rentOpening=options.nurembergMunicipalRentView?.begin(local.signal,active);
     for(const metric of scope.metrics){
      if(options.kind==='municipal'&&isNurembergLimitedRentScope({city,scopeId:scope.id})){const result=await rentOpening?.render(values,{city,scopeId:scope.id,scopeName:scope.name as any},metric as any,locale);if(!active())return;if(result!=='rendered')appendNurembergRentWithheld(values,locale);continue;}
      if(options.kind==='municipal'&&isEssenMHLimitedScope({city,scopeId:scope.id})){const result=await mhOpening?.render(values,{city,scopeId:scope.id,scopeName:scope.name as any},metric as unknown as any,locale,formatEssenMHValue,appendEssenMHSingleGraphic);if(!active())return;if(result!=='rendered')appendEssenMHWithheld(values,locale);continue;}
      if(projection&&projection.peek(semanticContext,metric as unknown as Metric).status!=='regular'){projection.render(values,semanticContext,metric as unknown as Metric,locale,(m,l)=>datedMetricValue(m as unknown as typeof metric,l),'context');continue;}
      const row=document.createElement('p');row.textContent=metric.label[locale]+': '+datedMetricValue(metric,locale);values.append(row);
      appendMetricVisual(values,metric,locale,{scope:options.kind==='regional'?'regional':options.kind==='municipal'?'municipal':'police'});
      const more=document.createElement('details'),label=document.createElement('summary'),definition=document.createElement('p'),source=document.createElement('a');
      label.textContent=c.source;definition.textContent=metric.definition[locale];source.textContent=metric.source_name;source.href=metric.source_url;source.target='_blank';source.rel='noopener noreferrer';more.append(label,definition,source);more.addEventListener('toggle',options.onResize);values.append(more);
     }options.onResize();
    };
    scopes.forEach(scope=>{const button=document.createElement('button');button.type='button';button.textContent=scope.name[locale];button.style.cssText='font:inherit;font-size:11px;line-height:1.25;padding:4px 6px;min-height:0;min-width:0;max-width:100%;white-space:normal;border-radius:8px';button.addEventListener('click',()=>{void render(scope);});buttons.push(button);choices.append(button);});
    await render(scopes.find(s=>s.id===selected)??scopes[0]);
   }catch{if(opening===renderEpoch){cached=undefined;loaded=false;if(!signal.aborted&&section.open&&section.isConnected)content.textContent=c.error;options.onResize();}}
  });
 };
}
