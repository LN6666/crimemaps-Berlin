/** UI-only formatter. Never use this localized text for comparison or cache keys. */
type PeriodMetric={year:number;reference_date?:string;source_observation_period?:string;reference_period?:string;observation_period?:string};
export function displayedObservationPeriod(metric:PeriodMetric,locale:string):string{
 const language=/^zh(?:-|$)/i.test(locale)?'zh':/^de(?:-|$)/i.test(locale)?'de':'en';
 const y=metric.year;
 const validDate=(year:number,month:number,day?:number)=>Number.isInteger(year)&&year>=1900&&month>=1&&month<=12&&(day===undefined||(day>=1&&day<=new Date(Date.UTC(year,month,0)).getUTCDate()));
 const yearMatches=(a:number,b=a)=>y===a||y===b;
 const words=(zh:string,en:string,de:string)=>({zh,en,de}[language]);
 function format(raw:unknown):string|undefined{
  if(typeof raw!=='string'||raw.length>100)return;
  const s=raw.trim();let m:RegExpMatchArray|null;
  if((m=s.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/))){
   const year=Number(m[1]);if(year!==y)return;
   if(!m[2])return String(y);
   if(validDate(year,Number(m[2]),m[3]?Number(m[3]):undefined))return s;
   return;
  }
  if((m=s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/))){const year=Number(m[3]);if(year===y&&validDate(year,Number(m[2]),Number(m[1])))return `${m[3]}-${m[2]}-${m[1]}`;return;}
  if((m=s.match(/^(\d{4}) H([12])$/))&&Number(m[1])===y){return words(`${y}${m[2]==='1'?'上半年':'下半年'}`,`${y} H${m[2]}`,`${y} · ${m[2]}. Halbjahr`);}
  if((m=s.match(/^(\d{4}) calendar year$/))&&Number(m[1])===y)return words(`${y}全年`,`${y} · full year`,`${y} · Kalenderjahr`);
  if((m=s.match(/^(\d{4}) annual average$/))&&Number(m[1])===y)return words(`${y}年均`,`${y} · annual average`,`${y} · Jahresdurchschnitt`);
  if((m=s.match(/^Schuljahr (\d{4})\/(\d{4})$/))){const a=Number(m[1]),b=Number(m[2]);if(b===a+1&&yearMatches(a,b))return words(`${a}/${b}学年`,`school year ${a}/${b}`,`Schuljahr ${a}/${b}`);return;}
  if((m=s.match(/^(\d{4})-(\d{2})\/(\d{4})-(\d{2})$/))){const a=Number(m[1]),b=Number(m[3]),am=Number(m[2]),bm=Number(m[4]);if(validDate(a,am)&&validDate(b,bm)&&b>=a&&b<=a+1&&(b>a||bm>=am)&&yearMatches(a,b))return `${m[1]}-${m[2]}–${m[3]}-${m[4]}`;return;}
  if((m=s.match(/^(\d{4})\/(\d{4}) pooled observation period$/))){const a=Number(m[1]),b=Number(m[2]);if(b===a+1&&yearMatches(a,b))return words(`${a}–${b} · 合并期`,`${a}–${b} · pooled`,`${a}–${b} · gemeinsamer Zeitraum`);return;}
  const months=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  if((m=s.match(/^([A-Za-zÄÖÜäöüß]+) (\d{4})$/))){const month=months.indexOf(m[1])+1;if(month&&Number(m[2])===y)return `${y}-${String(month).padStart(2,'0')}`;}
 }
 // Observation fields only. Publication/acquisition timestamps never enter this list.
 for(const raw of [metric.reference_date,metric.source_observation_period,metric.reference_period,metric.observation_period]){const out=format(raw);if(out!==undefined)return out;}
 return String(y);
}
