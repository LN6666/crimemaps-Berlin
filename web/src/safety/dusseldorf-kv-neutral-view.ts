import {matchesSourceRule,type SourceRule} from './reference-registry-matcher';
import type {Context,Metric,ProjectedView,Locale,Text} from './lis-semantic-projection';
import type {LISProjectionGate,ProjectionState} from './lis-projection-gate';
import type {ReferenceMetric} from './reference-fallback';
export interface PacketRef {path:string;sha256:string;bytes:number;}
interface Packet {schemaVersion:number;city:string;context:Context;scopeName:Text;rule:SourceRule;canonicalOriginalMetric:string;displayLabel:Text;originalSourceTitle:string;visibleLimitations:Text[];expectedValue:number;observationYear:number;}
const COPY={zh:{scope:'杜塞尔多夫全市 · 来源特定类别',single:'单值；完整类别范围未核，不作同类分区对比',source:'来源原题名及原记录（保留供追溯，原分类表述未获本次核实）',withheld:'该来源观测与已核实显示投影不符，暂不显示；不能据此判断无公布。'},en:{scope:'Düsseldorf municipality · source-specific class',single:'Single value; full class unverified, no comparable-area comparison',source:'Original source title and record (retained for traceability; original classification not verified here)',withheld:'Observation does not match the reviewed view and is withheld; this does not establish non-publication.'},de:{scope:'Stadt Düsseldorf · quellenbezogene Klasse',single:'Einzelwert; Gesamtklasse ungeprüft, kein Teilgebietsvergleich',source:'Originaler Quelltitel und Datensatz (zur Nachverfolgung; ursprüngliche Klassifikation hier nicht bestätigt)',withheld:'Der Quellwert entspricht nicht der geprüften Darstellung und bleibt verborgen; dies belegt keine Nichtveröffentlichung.'}};
const EXPECTED_ID='dusseldorf-official-city-pks2025-assault';
function object(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
function ordered(v:unknown):unknown{if(Array.isArray(v))return v.map(ordered);if(object(v))return Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])]));return v;}
const canonical=(v:unknown)=>JSON.stringify(ordered(v));
function text(v:unknown):v is Text{return object(v)&&(['zh','en','de']as const).every(l=>typeof v[l]==='string'&&(v[l]as string).trim().length>0);}
function freeze<T>(v:T):T{if(v&&typeof v==='object'){for(const child of Object.values(v))freeze(child);Object.freeze(v);}return v;}
async function hash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function loadDusseldorfNeutralView(dataText:string,expectedHash:string){
 if(!/^[a-f0-9]{64}$/.test(expectedHash)||await hash(dataText)!==expectedHash)throw Error('Neutral view source packet hash mismatch');
 const p=JSON.parse(dataText)as Packet;
 if(p.schemaVersion!==1||p.city!=='dusseldorf'||p.context.city!=='dusseldorf'||p.context.level!==''||p.context.nativeAreaId!=='municipality/dusseldorf/05111000'||p.expectedValue!==6756||p.observationYear!==2025||p.rule.city!=='dusseldorf'||p.rule.scope!=='municipal'||p.rule.scopeId!==p.context.nativeAreaId||p.rule.equals.metric_id!==EXPECTED_ID||p.rule.requireVisibleLimitation!==true||!text(p.displayLabel)||!text(p.scopeName)||!Array.isArray(p.visibleLimitations)||!p.visibleLimitations.length||!p.visibleLimitations.every(text)||p.originalSourceTitle!=='Körperverletzungsdelikte')throw Error('Neutral view reviewed contract invalid');
 freeze(p);const views=new WeakMap<ProjectedView,string>();
 const stamp=(c:Context,m:Metric)=>canonical([c,m]);
 const project=(context:Context,metric:Metric):{status:'not-applicable'}|{status:'projected';view:ProjectedView}=>{
  if(context.city!==p.context.city||context.level!==p.context.level||context.nativeAreaId!==p.context.nativeAreaId||canonical(metric)!==p.canonicalOriginalMetric||!matchesSourceRule(p.rule,{city:context.city,scope:'municipal',scopeId:context.nativeAreaId,scopeName:p.scopeName,level:context.level},metric as Metric & ReferenceMetric))return {status:'not-applicable'};
  const view:ProjectedView=Object.freeze({metric,context:Object.freeze({...context}),conceptId:p.rule.conceptId,stage:'neutral-label',displayLabel:p.displayLabel,originalViewLabel:metric.label,originalSourceTitle:p.originalSourceTitle,originalSourceTitleLanguage:'de',originalSourceURL:metric.source_url,originalSourceSHA256:metric.source_sha256!,visibleLimitations:p.visibleLimitations,requireVisibleLimitation:true,genericAllBodilyInjuryConceptAllowed:false});views.set(view,stamp(context,metric));return {status:'projected',view};
 };
 const render=(host:HTMLElement,view:ProjectedView,locale:Locale,format:(m:Metric,l:Locale)=>string):{status:'rendered'|'withheld'}=>{
  if(!views.has(view)||views.get(view)!==stamp(view.context,view.metric)||!(['zh','en','de']as string[]).includes(locale))return {status:'withheld'};
  const section=document.createElement('section');section.className='dusseldorf-kv-neutral-view';
  const put=(tag:string,s:string,parent:HTMLElement=section)=>{const el=document.createElement(tag);el.textContent=s;parent.append(el);return el;};
  try{
   put('h4',view.displayLabel[locale]);put('p',COPY[locale].scope);const note=put('aside','');note.style.display='block';note.style.visibility='visible';for(const limit of view.visibleLimitations)put('p',limit[locale],note);
   const formatted=format(view.metric,locale);put('p',formatted);put('p','2025');
   // A display-only single marker: no raw metric clone, derived scale or comparison cohort.
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 260 40');svg.setAttribute('role','img');svg.setAttribute('aria-label',view.displayLabel[locale]+': '+formatted+'. '+COPY[locale].single);
   const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=view.displayLabel[locale]+': '+formatted;svg.append(title);const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx','14');circle.setAttribute('cy','18');circle.setAttribute('r','4');circle.setAttribute('fill','currentColor');svg.append(circle);const label=document.createElementNS('http://www.w3.org/2000/svg','text');label.setAttribute('x','25');label.setAttribute('y','22');label.setAttribute('fill','currentColor');label.setAttribute('font-size','12');label.textContent=formatted;svg.append(label);section.append(svg);put('p',COPY[locale].single);
   const details=put('details','');put('summary',COPY[locale].source,details);put('p',view.originalSourceTitle,details);put('p','Hierzu zählen die gefährliche und schwere Körperverletzung sowie die vorsätzlichen einfachen KV-Delikte.',details);
   const raw=view.metric as unknown as {definition:Text;source_name:string};put('p',view.originalViewLabel[locale],details);put('p',raw.definition[locale],details);const a=put('a',raw.source_name,details)as HTMLAnchorElement;a.href=view.originalSourceURL;a.target='_blank';a.rel='noopener noreferrer';put('p',view.originalSourceSHA256,details);
   if(views.get(view)!==stamp(view.context,view.metric)||!view.visibleLimitations.every(x=>note.textContent?.includes(x[locale])))return {status:'withheld'};host.append(section);if(section.parentNode!==host)return {status:'withheld'};return {status:'rendered'};
  }catch{if(section.parentNode===host)host.removeChild(section);return {status:'withheld'};}
 };
 return {project,render,sourcePacketSHA256:expectedHash,rule:p.rule};
}
/** Same actual gate contract as LIS; separate source packet, never relabels a Leipzig rule. */
export function createDusseldorfNeutralGate(fetchBytes:(path:string,signal:AbortSignal)=>Promise<Uint8Array>,ref:PacketRef):LISProjectionGate{
 let projection:Awaited<ReturnType<typeof loadDusseldorfNeutralView>>|undefined,destroyed=false;
 const needs=(c:Context,m:Metric)=>c.city==='dusseldorf'&&((m as unknown as Record<string,unknown>).metric_id===EXPECTED_ID||m.label.en==='Whole-city intentional simple and dangerous/serious bodily injury');
 const peek=(c:Context,m:Metric):ProjectionState=>{if(!needs(c,m))return {status:'regular'};if(!projection)return {status:'pending'};const out=projection.project(c,m);return out.status==='projected'?out:{status:'withheld'};};
 return {needs,peek,async ensure(signal){if(destroyed)throw Error('Neutral gate destroyed');signal.throwIfAborted();if(projection)return;const bytes=await fetchBytes(ref.path,signal);signal.throwIfAborted();if(bytes.byteLength!==ref.bytes||bytes.byteLength>32768)throw Error('Neutral packet bytes invalid');const candidate=await loadDusseldorfNeutralView(new TextDecoder('utf-8',{fatal:true}).decode(bytes),ref.sha256);signal.throwIfAborted();if(destroyed)throw Error('Neutral gate destroyed');projection=candidate;},render(host,c,m,locale,format){const state=peek(c,m);if(state.status==='regular')return state;if(state.status==='projected'&&projection?.render(host,state.view,locale,format).status==='rendered')return state;const note=document.createElement('p');note.className='dusseldorf-kv-neutral-withheld';note.textContent=COPY[locale].withheld;host.append(note);return {status:state.status==='pending'?'pending':'withheld'};},destroy(){destroyed=true;projection=undefined;}};
}
