import {metricCategories} from './area-metrics';
type Locale='zh'|'en'|'de';
type CategoryCoverage={area_count:number;observation_count:number;periods:string[];labels:Record<Locale,string[]>;by_period:Record<string,number>};
export type MetricCoverage={city:string;levels:{id:string;labels:Record<Locale,string>;native_area_count:number;status:string;categories:Partial<Record<typeof metricCategories[number],CategoryCoverage>>}[]};
const COPY={
 zh:{title:'各层级数据覆盖与细分限制',note:'数据保留在来源实际支持且已核验的地图层级；不把区级值复制到片区或街区。下列是已接入的分类覆盖，不表示分类内每项指标都齐全，也不证明官方无法提供更细数据。不同层级、年份、指标名称与定义不能直接等同。全市和警方辖区统计在独立栏目查看。',here:'当前层级',missing:'本层尚无已核验的对应观测；缺失不等于零。',elsewhere:'其他层级可查看的同类统计',unknown:'覆盖尚未核验',names:'已接入指标名称',period:'观测期及有值分区数',view:'查看',areas:'个分区；各指标覆盖可能不同'},
 en:{title:'Data coverage and limits by map level',note:'Observations stay at the verified map level supported by their source; district values are not copied to quarters or neighbourhoods. This is connected category coverage, not completeness of every indicator or proof that finer official data do not exist. Levels, periods, indicator names and definitions are not interchangeable. Municipality and police jurisdictions remain in separate sections.',here:'Current level',missing:'No verified matching observation is connected at this level; missing is not zero.',elsewhere:'Related statistics available at other levels',unknown:'Coverage not yet verified',names:'Connected indicator names',period:'Observation periods and areas with values',view:'View',areas:'areas; individual indicators may cover different areas'},
 de:{title:'Datenabdeckung und Grenzen nach Kartenebene',note:'Werte bleiben auf der geprüften, von der Quelle unterstützten Kartenebene; Bezirkswerte werden nicht auf kleinere Gebiete kopiert. Dies beschreibt angebundene Kategorien, weder die Vollständigkeit jeder Kennzahl noch das Fehlen feinerer amtlicher Daten. Ebenen, Zeiträume, Kennzahlennamen und Definitionen sind nicht gleichzusetzen. Gesamtstadt und Polizeibezirke bleiben in getrennten Abschnitten.',here:'Aktuelle Ebene',missing:'Auf dieser Ebene ist kein geprüfter passender Wert angebunden; fehlend bedeutet nicht null.',elsewhere:'Verwandte Statistiken auf anderen Ebenen',unknown:'Abdeckung noch nicht geprüft',names:'Angebundene Kennzahlen',period:'Bezugszeiten und Gebiete mit Werten',view:'Ansehen',areas:'Gebiete; einzelne Kennzahlen können abweichende Gebiete abdecken'}
};
export function metricCoverage(value:unknown,city:string):MetricCoverage|undefined{
 const v=value as MetricCoverage;if(v?.city!==city||!Array.isArray(v.levels)||v.levels.length>4)return;
 for(const l of v.levels){if(!l||typeof l.id!=='string'||!Number.isInteger(l.native_area_count)||l.native_area_count<1||!l.categories||!['zh','en','de'].every(lang=>typeof l.labels?.[lang as Locale]==='string'))return;
  for(const [key,c]of Object.entries(l.categories)){if(!metricCategories.includes(key as any)||!c||!Number.isInteger(c.area_count)||c.area_count<1||c.area_count>l.native_area_count||!c.by_period||!Object.entries(c.by_period).every(([p,n])=>/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(p)&&Number.isInteger(n)&&n>0&&n<=c.area_count)||!['zh','en','de'].every(lang=>Array.isArray(c.labels?.[lang as Locale])&&c.labels[lang as Locale].every(s=>typeof s==='string'&&s.length<5000)))return;}
 }return v;
}
export function appendMetricCoverage(host:HTMLElement,coverage:MetricCoverage,locale:Locale,current:string,categoryNames:string[],choose:(level:string)=>void,sourceSHA256?:string){
 const c=COPY[locale],section=document.createElement('details'),heading=document.createElement('summary'),note=document.createElement('p');heading.textContent=c.title;note.textContent=c.note;section.append(heading,note);
 for(const [i,category]of metricCategories.entries()){
  const group=document.createElement('details'),title=document.createElement('summary');title.textContent=categoryNames[i];group.append(title);
  for(const level of coverage.levels){
   const entry=level.categories[category],p=document.createElement('p');
   p.textContent=(level.id===current?c.here+': ':'')+level.labels[locale]+': '+(entry?`${entry.area_count}/${level.native_area_count} ${c.areas}`:level.status==='connected'?c.missing:c.unknown);group.append(p);
   if(!entry)continue;
   const period=document.createElement('p');period.textContent=c.period+': '+Object.entries(entry.by_period).map(([date,n])=>`${date}: ${n}/${level.native_area_count}`).join(' · ');group.append(period);
   if(level.id!==current){const button=document.createElement('button');button.type='button';button.textContent=c.view+' · '+level.labels[locale];button.onclick=()=>choose(level.id);group.append(button);}
   const names=document.createElement('details'),label=document.createElement('summary'),text=document.createElement('p');label.textContent=c.names;const limited=coverage.city==='leipzig'&&['level1','level2'].includes(level.id)&&category==='assault';
   const qualified=sourceSHA256==='604b8701b60dc3b7013261dd28de2dcbe85a5f4763e8e7339347a2c896805f23';
   text.textContent=limited?(qualified?({zh:'LIS原发布字段（原题名：身体伤害；口径未核实）',en:'Original LIS field (source title: bodily injury; scope unverified)',de:'LIS-Originalfeld (Quelltitel: Körperverletzung; Umfang ungeklärt)'})[locale]:({zh:'来源字段口径正在核对',en:'Source field scope awaiting qualification',de:'Quellumfang wird geprüft'})[locale]):entry.labels[locale].join(' · ');
   if(limited){const limitation=document.createElement('p');limitation.className='coverage-source-limitation';limitation.textContent=({zh:'上述覆盖数仅表示已收录的LIS原字段，不证明已核实完整身体伤害类别；保留原覆盖数与年份，详情展示原值及口径冲突。',en:'Coverage counts describe the connected original LIS field, not verified coverage of the full bodily-injury class. Original counts and years remain; details retain values and the scope conflict.',de:'Abdeckungszahlen betreffen das angebundene LIS-Originalfeld, keine geprüfte Abdeckung der gesamten Körperverletzungsklasse. Originalzahlen und Jahre bleiben erhalten; Details zeigen Werte und Umfangskonflikt.'})[locale];group.append(limitation);}
   names.append(label,text);group.append(names);
  }section.append(group);
 }host.append(section);
}
