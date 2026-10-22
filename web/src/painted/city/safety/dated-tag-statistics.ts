import {CONTENT_TAGS, CONTENT_TAG_CITIES, type ContentTag} from "./content-tags";
import {ALL_MACRO_TAGS, MACRO_TAGS, HATE_FACETS, type MacroTag} from "./macro-tags";
import {BRIEF_PERIODS, type BriefPeriod} from "./cached-city-briefs";
import {CONTENT_TAG_COPY} from "./content-tag-copy";
import {MACRO_COPY} from "./macro-tag-copy";

export interface DatedTagCounts {
  supported:number;no_support:number;uncertain:number;not_evaluated:number;
}
export interface DatedOrdinaryTag {
  tag:ContentTag;counts:DatedTagCounts;content_index:number|null;
  documented_share:{numerator:number;denominator:number;value:number|null};
}
export interface DatedMacroTag {
  tag:MacroTag;counts:DatedTagCounts;police_category_stated:number;narrative_lead:number;
  share:number|null;content_index:number|null;
}
export interface DatedTagWindow {
  period:BriefPeriod;start:string;end:string;records:number;fully_evaluated_records:number;
  records_with_any_evaluation:number;
  ordinary:{records:number;tags:readonly DatedOrdinaryTag[]};
  macro:{records:number;tags:readonly DatedMacroTag[]};
}
export interface DatedTagScope {
  key:string;total_selected_records:number;unknown_publication_dates:number;windows:readonly DatedTagWindow[];
}
export interface DatedTagCatalogue {
  schema:"current14-dated-tag-statistics-v1";source_versions:DatedTagBindings;
  as_of:string;timezone:"Europe/Berlin";
  date_basis:"official police announcement publication day";inclusive_calendar_days:true;
  unknown_publication_dates_excluded_from_dated_windows_but_retained_in_all_selected_denominators:true;
  layers:{ordinary_dimensions:20;macro_dimensions:12;total_tag_dimensions:32};
  scopes:readonly DatedTagScope[];
}
export interface DatedTagBindings {
  mapping_sha256:string;selected_identity_catalogue_sha256:string;ordinary_overlay_sha256:string;
  macro_overlay_sha256:string;publication_dates_sha256:string;
}

interface StatisticsCopy {
  title:string;period:string;periods:readonly [string,string,string,string];
  dateBasis:string;summary:string;missingDates:string;noRecords:string;
  ordinaryTitle:string;macroTitle:string;facetsTitle:string;label:string;supported:string;
  share:string;index:string;noSupport:string;uncertain:string;notEvaluated:string;
  police:string;lead:string;formula:string;overlap:string;location:string;unavailable:string;
  cities:Record<string,string>;
}

/** Public wording is deliberately plain: these are report-content counts, not city crime rates. */
export const DATED_TAG_STATISTICS_COPY:Record<"en"|"de"|"zh",StatisticsCopy>={
  zh:{title:"按时间范围查看标签统计",period:"时间范围",periods:["2026年至今","最近7天","最近30天","最近90天"],
    dateBasis:"按警方公告发布日期统计，日期采用德国当地时间。",
    summary:"本期计入 {dated} 条有发布日期的公告；所选数据共 {selected} 条记录。",
    missingDates:"另有 {unknown} 条记录缺少公告发布日期，因此不计入这些时间范围。它们仍保留在全部月份的统计中。",
    noRecords:"这个时间范围没有可按发布日期统计的公告，指数暂不可用。",
    ordinaryTitle:"公告行为类别",macroTitle:"社会背景标签",facetsTitle:"仇恨与歧视细分标签",
    label:"标签",supported:"有内容支持的公告",share:"占本期公告比例",index:"内容指数",
    noSupport:"公告中无支持证据",uncertain:"不确定",notEvaluated:"未评估",
    police:"警方明确表述",lead:"公告内容线索",
    formula:"内容指数 = 100 × 有内容支持的公告数 ÷ 本期全部有发布日期的所选公告数。",
    overlap:"一条公告可以有多个标签，各标签比例不必合计为 100%。不确定和未评估的公告仍计入分母。",
    location:"没有精确地点的公告也计入。这里的数字反映所选公告内容，不是城市犯罪率或真实风险指数。",
    unavailable:"该来源版本的标签统计暂不可用。",
    cities:{all14:"14城合计",berlin:"柏林",hamburg:"汉堡",munich:"慕尼黑",cologne:"科隆",frankfurt:"法兰克福",dusseldorf:"杜塞尔多夫",stuttgart:"斯图加特",leipzig:"莱比锡",dortmund:"多特蒙德",bremen:"不来梅",essen:"埃森",dresden:"德累斯顿",hannover:"汉诺威",nuremberg:"纽伦堡"}},
  en:{title:"Report labels by time period",period:"Time period",periods:["2026 to date","Last 7 days","Last 30 days","Last 90 days"],
    dateBasis:"Based on police announcement publication dates in Berlin local time.",
    summary:"This period includes {dated} announcements with a publication date; the selection contains {selected} records.",
    missingDates:"Another {unknown} records have no publication date and are left out of these periods. They remain in the all-month statistics.",
    noRecords:"No announcements with a publication date fall in this period. The index is unavailable.",
    ordinaryTitle:"Reported conduct",macroTitle:"Social context",facetsTitle:"Hate and discrimination subcategories",
    label:"Label",supported:"Reports supporting the label",share:"Share of this period",index:"Content index",
    noSupport:"No support in report",uncertain:"Uncertain",notEvaluated:"Not evaluated",
    police:"Explicit police wording",lead:"Lead from report text",
    formula:"Index = 100 × announcements supporting the label ÷ all selected announcements with a publication date in this period.",
    overlap:"An announcement can have several labels, so percentages need not add to 100%. Uncertain and unevaluated records remain in the denominator.",
    location:"Announcements without a precise location are included. These figures describe selected report content; they are not a crime rate or a measure of a city's risk.",
    unavailable:"Label statistics are unavailable for this source version.",
    cities:{all14:"All 14 cities",berlin:"Berlin",hamburg:"Hamburg",munich:"Munich",cologne:"Cologne",frankfurt:"Frankfurt",dusseldorf:"Düsseldorf",stuttgart:"Stuttgart",leipzig:"Leipzig",dortmund:"Dortmund",bremen:"Bremen",essen:"Essen",dresden:"Dresden",hannover:"Hanover",nuremberg:"Nuremberg"}},
  de:{title:"Merkmale nach Zeitraum",period:"Zeitraum",periods:["2026 bis heute","Letzte 7 Tage","Letzte 30 Tage","Letzte 90 Tage"],
    dateBasis:"Grundlage sind die Veröffentlichungsdaten der Polizeimeldungen in deutscher Ortszeit.",
    summary:"Dieser Zeitraum umfasst {dated} Meldungen mit Veröffentlichungsdatum; die Auswahl umfasst {selected} Einträge.",
    missingDates:"Für weitere {unknown} Einträge fehlt das Veröffentlichungsdatum. Sie bleiben in der Monatsstatistik, sind aber nicht Teil dieser Zeiträume.",
    noRecords:"In diesem Zeitraum gibt es keine Meldungen mit bekanntem Veröffentlichungsdatum. Der Index ist nicht verfügbar.",
    ordinaryTitle:"Berichtetes Verhalten",macroTitle:"Gesellschaftlicher Kontext",facetsTitle:"Untergruppen von Hass und Diskriminierung",
    label:"Merkmal",supported:"Meldungen mit Beleg für das Merkmal",share:"Anteil im Zeitraum",index:"Inhaltsindex",
    noSupport:"Kein Beleg im Bericht",uncertain:"Unklar",notEvaluated:"Nicht geprüft",
    police:"Ausdrückliche Polizeiangabe",lead:"Hinweis im Berichtstext",
    formula:"Inhaltsindex = 100 × Meldungen, die das Merkmal belegen ÷ alle ausgewählten Meldungen mit Veröffentlichungsdatum in diesem Zeitraum.",
    overlap:"Eine Meldung kann mehrere Merkmale tragen; die Anteile müssen sich nicht zu 100 % summieren. Unklare und nicht geprüfte Meldungen bleiben im Nenner.",
    location:"Meldungen ohne genauen Ort sind enthalten. Die Zahlen beschreiben ausgewählte Meldungen, keine Kriminalitätsrate und kein Stadtrisiko.",
    unavailable:"Für diese Quellenversion sind keine Merkmalsstatistiken verfügbar.",
    cities:{all14:"Alle 14 Städte",berlin:"Berlin",hamburg:"Hamburg",munich:"München",cologne:"Köln",frankfurt:"Frankfurt",dusseldorf:"Düsseldorf",stuttgart:"Stuttgart",leipzig:"Leipzig",dortmund:"Dortmund",bremen:"Bremen",essen:"Essen",dresden:"Dresden",hannover:"Hannover",nuremberg:"Nürnberg"}},
};

const SHA=/^[a-f0-9]{64}$/;
const VERDICTS=["supported","no_support","uncertain","not_evaluated"] as const;
const PRIVATE_KEYS=new Set(["path","source_url","source_id","source_sha256","content_sha256","source_text","raw_text","body","text_scope","reviewer","evidence_quotes","incident_id","location"]);
const isCount=(n:number)=>Number.isSafeInteger(n)&&n>=0;
const same=(actual:readonly string[],expected:readonly string[])=>actual.length===expected.length&&expected.every(value=>actual.includes(value));
const periods=BRIEF_PERIODS;
const windowStart=(period:BriefPeriod,asOf:string)=>period==="ytd2026"?"2026-01-01":
  new Date(Date.parse(`${asOf}T12:00:00Z`)-({last7:6,last30:29,last90:89}[period])*86400000).toISOString().slice(0,10);
const assertPublicAggregate=(value:unknown)=>{
  if(typeof value==="string"&&/(?:\.runtime\/|\/Users\/|file:\/\/)/i.test(value))throw Error("Local source path in public statistics");
  if(Array.isArray(value)){for(const item of value)assertPublicAggregate(item);return;}
  if(value&&typeof value==="object")for(const [key,item] of Object.entries(value)){
    if(PRIVATE_KEYS.has(key))throw Error("Private source metadata in public statistics");
    assertPublicAggregate(item);
  }
};

export function validateDatedTagCatalogue(source:DatedTagCatalogue,expected:DatedTagBindings){
  assertPublicAggregate(source);
  if(source.schema!=="current14-dated-tag-statistics-v1"||source.timezone!=="Europe/Berlin"||
    source.date_basis!=="official police announcement publication day"||!source.inclusive_calendar_days||
    !source.unknown_publication_dates_excluded_from_dated_windows_but_retained_in_all_selected_denominators||
    !/^2026-\d{2}-\d{2}$/.test(source.as_of)||!SHA.test(source.source_versions.mapping_sha256)||
    source.source_versions.mapping_sha256!==expected.mapping_sha256||
    source.source_versions.selected_identity_catalogue_sha256!==expected.selected_identity_catalogue_sha256||
    source.source_versions.ordinary_overlay_sha256!==expected.ordinary_overlay_sha256||
    source.source_versions.macro_overlay_sha256!==expected.macro_overlay_sha256||
    source.source_versions.publication_dates_sha256!==expected.publication_dates_sha256||
    Object.values(source.source_versions).some(value=>!SHA.test(value))||source.layers.ordinary_dimensions!==20||
    source.layers.macro_dimensions!==12||source.layers.total_tag_dimensions!==32)throw Error("Stale or malformed dated label catalogue");
  const allowed=[...CONTENT_TAG_CITIES,"all14"];
  if(source.scopes.length!==15||new Set(source.scopes.map(scope=>scope.key)).size!==15||
    !same(source.scopes.map(scope=>scope.key),allowed))throw Error("Expected fourteen cities and their total");
  const checkTags=(tags:readonly {tag:string;counts:DatedTagCounts;content_index:number|null}[],expectedTags:readonly string[],records:number)=>{
    if(tags.length!==expectedTags.length||!same(tags.map(tag=>tag.tag),expectedTags))throw Error("Unexpected dated label set");
    for(const tag of tags){
      if(VERDICTS.some(verdict=>!isCount(tag.counts[verdict]))||
        VERDICTS.reduce((sum,verdict)=>sum+tag.counts[verdict],0)!==records||
        tag.content_index!==(records?100*tag.counts.supported/records:null))throw Error("Dated label denominator or formula mismatch");
    }
  };
  for(const scope of source.scopes){
    if(!isCount(scope.total_selected_records)||!isCount(scope.unknown_publication_dates)||
      scope.unknown_publication_dates>scope.total_selected_records||scope.windows.length!==4||
      new Set(scope.windows.map(window=>window.period)).size!==4)throw Error("Invalid dated city scope");
    for(const period of periods){
      const window=scope.windows.find(item=>item.period===period);
      if(!window||window.start!==windowStart(period,source.as_of)||window.end!==source.as_of||!isCount(window.records)||
        window.records>scope.total_selected_records-scope.unknown_publication_dates||window.ordinary.records!==window.records||
        window.macro.records!==window.records||!isCount(window.fully_evaluated_records)||
        !isCount(window.records_with_any_evaluation)||window.fully_evaluated_records>window.records||
        window.fully_evaluated_records>window.records_with_any_evaluation||
        window.records_with_any_evaluation>window.records)throw Error("Invalid dated window");
      checkTags(window.ordinary.tags,CONTENT_TAGS,window.records);checkTags(window.macro.tags,ALL_MACRO_TAGS,window.records);
      for(const tag of window.ordinary.tags){
        const counts=tag.counts;
        if(tag.documented_share.denominator!==window.records||tag.documented_share.numerator!==counts.supported||
          tag.documented_share.value!==(window.records?counts.supported/window.records:null))throw Error("Ordinary label share mismatch");
      }
      for(const tag of window.macro.tags){
        if(tag.police_category_stated+tag.narrative_lead!==tag.counts.supported||
          tag.share!==(window.records?tag.counts.supported/window.records:null))throw Error("Macro attribution mismatch");
      }
      const parent=window.macro.tags.find(item=>item.tag==="hate_discrimination")!;
      if(window.macro.tags.filter(item=>HATE_FACETS.includes(item.tag as typeof HATE_FACETS[number]))
        .some(item=>item.counts.supported>parent.counts.supported))throw Error("Hate facet exceeds parent");
    }
  }
  const total=source.scopes.find(scope=>scope.key==="all14")!,cities=source.scopes.filter(scope=>scope.key!=="all14");
  for(const field of ["total_selected_records","unknown_publication_dates"] as const)
    if(cities.reduce((sum,scope)=>sum+scope[field],0)!==total[field])throw Error("City publication-date counts do not sum");
  for(const period of periods){
    const totalWindow=total.windows.find(window=>window.period===period)!;
    for(const field of ["records","fully_evaluated_records","records_with_any_evaluation"] as const)
      if(cities.reduce((sum,scope)=>sum+scope.windows.find(window=>window.period===period)![field],0)!==totalWindow[field])
        throw Error("Dated city denominators do not sum");
    for(const layer of ["ordinary","macro"] as const){
      const totalTags=totalWindow[layer].tags;
      for(const tag of totalTags)for(const verdict of VERDICTS)
        if(cities.reduce((sum,scope)=>sum+scope.windows.find(window=>window.period===period)![layer].tags
          .find(item=>item.tag===tag.tag)!.counts[verdict],0)!==tag.counts[verdict])throw Error("Dated city tag counts do not sum");
      if(layer==="macro")for(const tag of totalWindow.macro.tags)for(const basis of ["police_category_stated","narrative_lead"] as const)
        if(cities.reduce((sum,scope)=>sum+scope.windows.find(window=>window.period===period)!.macro.tags
          .find(item=>item.tag===tag.tag)![basis],0)!==tag[basis])throw Error("Dated attribution sums do not match");
    }
  }
}

const scopeNames=(copy:StatisticsCopy)=>copy.cities;
export function mountDatedTagStatistics(parent:HTMLElement,options:{locale:"zh"|"en"|"de"}){
  const copy=DATED_TAG_STATISTICS_COPY[options.locale],ordinaryCopy=CONTENT_TAG_COPY[options.locale],macroCopy=MACRO_COPY[options.locale];
  const root=document.createElement("section"),title=document.createElement("h3"),periodLabel=document.createElement("label");
  root.className="content-tag-panel dated-tag-statistics";title.textContent=copy.title;periodLabel.textContent=copy.period;
  const select=document.createElement("select");select.setAttribute("aria-label",copy.period);
  periods.forEach((period,i)=>{const option=document.createElement("option");option.value=period;option.textContent=copy.periods[i];select.append(option);});
  periodLabel.append(select);
  const scopeLabel=document.createElement("label"),scopeSelect=document.createElement("select");
  const scopeCaption={zh:"统计范围",en:"Statistics scope",de:"Statistikbereich"}[options.locale];
  scopeLabel.textContent=scopeCaption;scopeSelect.setAttribute("aria-label",scopeCaption);
  for(const key of ["all14",...CONTENT_TAG_CITIES]){const option=document.createElement("option");option.value=key;option.textContent=copy.cities[key];scopeSelect.append(option);}
  scopeLabel.append(scopeSelect);
  const scopeText=document.createElement("p"),dateText=document.createElement("p"),summary=document.createElement("p"),missing=document.createElement("p");
  const ordinaryDetails=document.createElement("details"),ordinarySummary=document.createElement("summary");ordinarySummary.textContent=copy.ordinaryTitle;ordinaryDetails.append(ordinarySummary);
  const macroDetails=document.createElement("details"),macroSummary=document.createElement("summary");macroSummary.textContent=copy.macroTitle;macroDetails.append(macroSummary);
  const facets=document.createElement("details"),facetsSummary=document.createElement("summary");facetsSummary.textContent=copy.facetsTitle;facets.append(facetsSummary);
  const method=document.createElement("details"),methodSummary=document.createElement("summary");methodSummary.textContent=ordinaryCopy.methodInfo;method.append(methodSummary);
  for(const text of [copy.formula,copy.overlap,copy.location]){const p=document.createElement("p");p.textContent=text;method.append(p);}
  const unavailable=document.createElement("p");unavailable.textContent=copy.unavailable;unavailable.hidden=true;
  root.append(title,scopeLabel,periodLabel,scopeText,dateText,summary,missing,ordinaryDetails,macroDetails,facets,method,unavailable);
  parent.append(root);root.hidden=true;summary.setAttribute("aria-live","polite");
  let catalogue:DatedTagCatalogue|null=null,scopeKey="all14";
  const number=new Intl.NumberFormat(options.locale,{maximumFractionDigits:1});
  const percent=new Intl.NumberFormat(options.locale,{style:"percent",maximumFractionDigits:1});
  const counts=(values:DatedTagCounts)=>[
    String(values.supported),String(values.no_support),String(values.uncertain),String(values.not_evaluated)];
  const table=(tags:readonly (DatedOrdinaryTag|DatedMacroTag)[],kind:"ordinary"|"macro",target:HTMLElement)=>{
    target.querySelectorAll(".dated-tag-table").forEach(node=>node.remove());
    const wrap=document.createElement("div");wrap.className="dated-tag-table";wrap.style.overflowX="auto";wrap.tabIndex=0;
    wrap.setAttribute("role","region");wrap.setAttribute("aria-label",kind==="ordinary"?copy.ordinaryTitle:copy.macroTitle);
    const table=document.createElement("table"),caption=document.createElement("caption"),head=document.createElement("thead"),tr=document.createElement("tr"),body=document.createElement("tbody");
    caption.textContent=kind==="ordinary"?copy.ordinaryTitle:copy.macroTitle;table.append(caption,head,body);head.append(tr);
    const headings=kind==="ordinary"?[copy.label,copy.supported,copy.share,copy.index,copy.noSupport,copy.uncertain,copy.notEvaluated]:
      [copy.label,copy.supported,copy.police,copy.lead,copy.share,copy.index,copy.noSupport,copy.uncertain,copy.notEvaluated];
    for(const value of headings){const th=document.createElement("th");th.scope="col";th.textContent=value;tr.append(th);}
    for(const item of tags){
      const ordinary=item as DatedOrdinaryTag,macro=item as DatedMacroTag,tagName=kind==="ordinary"?ordinaryCopy.tags[ordinary.tag]:macroCopy.tags[macro.tag];
      const row=document.createElement("tr"),label=document.createElement("th");label.scope="row";label.textContent=tagName;row.append(label);
      const share=kind==="ordinary"?ordinary.documented_share.value:macro.share;
      const cells=kind==="ordinary"?[String(item.counts.supported),share===null?ordinaryCopy.unknown:percent.format(share),
        item.content_index===null?ordinaryCopy.unknown:number.format(item.content_index),String(item.counts.no_support),
        String(item.counts.uncertain),String(item.counts.not_evaluated)]:
        [String(item.counts.supported),String(macro.police_category_stated),String(macro.narrative_lead),
        share===null?ordinaryCopy.unknown:percent.format(share),item.content_index===null?ordinaryCopy.unknown:number.format(item.content_index),
        String(item.counts.no_support),String(item.counts.uncertain),String(item.counts.not_evaluated)];
      for(const value of cells){const td=document.createElement("td");td.textContent=value;row.append(td);}body.append(row);
    }
    wrap.append(table);target.append(wrap);
  };
  const clearForUnavailable=()=>{
    catalogue=null;root.hidden=false;scopeText.textContent="";dateText.textContent="";summary.textContent="";missing.hidden=true;
    ordinaryDetails.replaceChildren(ordinarySummary);macroDetails.replaceChildren(macroSummary);facets.replaceChildren(facetsSummary);
    ordinaryDetails.hidden=true;macroDetails.hidden=true;facets.hidden=true;method.hidden=true;unavailable.hidden=false;
  };
  const render=()=>{
    const scope=catalogue?.scopes.find(item=>item.key===scopeKey),window=scope?.windows.find(item=>item.period===select.value);
    root.hidden=!scope||!window;ordinaryDetails.hidden=!scope||!window;macroDetails.hidden=!scope||!window;facets.hidden=!scope||!window;method.hidden=!scope||!window;
    unavailable.hidden=true;
    if(!scope||!window)return;
    scopeText.textContent=scopeNames(copy)[scope.key]??scope.key;
    dateText.textContent=`${window.start} – ${window.end} · ${copy.dateBasis}`;
    summary.textContent=copy.summary.replace("{dated}",number.format(window.records)).replace("{selected}",number.format(scope.total_selected_records));
    missing.hidden=!scope.unknown_publication_dates;
    missing.textContent=copy.missingDates.replace("{unknown}",number.format(scope.unknown_publication_dates));
    if(!window.records){
      ordinaryDetails.replaceChildren();macroDetails.replaceChildren();facets.replaceChildren();
      for(const target of [ordinaryDetails,macroDetails,facets]){const p=document.createElement("p");p.textContent=copy.noRecords;target.append(p);}
      return;
    }
    ordinaryDetails.replaceChildren(ordinarySummary);macroDetails.replaceChildren(macroSummary);facets.replaceChildren(facetsSummary);
    table(window.ordinary.tags,"ordinary",ordinaryDetails);
    table(window.macro.tags.filter(item=>MACRO_TAGS.includes(item.tag as typeof MACRO_TAGS[number])),"macro",macroDetails);
    table(window.macro.tags.filter(item=>HATE_FACETS.includes(item.tag as typeof HATE_FACETS[number])),"macro",facets);
  };
  select.addEventListener("change",render);
  scopeSelect.addEventListener("change",()=>{scopeKey=scopeSelect.value;render();});
  return{
    setCatalogue(source:DatedTagCatalogue,bindings:DatedTagBindings){
      catalogue=null;root.hidden=true;
      try{validateDatedTagCatalogue(source,bindings);}catch{clearForUnavailable();return false;}
      catalogue=source;render();return true;
    },
    setScope(key:string){if(!scopeNames(copy)[key])throw Error("Unknown city scope");scopeKey=key;scopeSelect.value=key;render();},
    invalidate(){clearForUnavailable();},destroy(){root.remove();},
  };
}
