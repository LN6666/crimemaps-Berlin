import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
const source=path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
async function bundle(name){const r=await build({entryPoints:[path.join(source,'web/src/safety',name)],bundle:true,write:false,platform:'node',format:'esm',target:'es2022'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));}
const {savedPublicationMonths,publicationPeriodIncludes}=await bundle('publication-period.ts');
const {loadSelectedPeriod}=await bundle('selected-period.ts');
const {DynamicTranslations,textHash}=await bundle('dynamic-translations.ts');
const {monthEvents,styledPois,sourcePoiReferences,countableEventIds}=await bundle('model.ts');
const {requestedMonth,cityDestination}=await bundle('deployment.ts');
const generation='0123456789abcdef-20261025T000000';
const monthValue=events=>({events,event_ids:events.map(e=>e.id),links:[],hex:{overview:{type:'FeatureCollection',features:[]},detail:{type:'FeatureCollection',features:[]}}});
const row=(id,month,extra={})=>({id,month,title:'Gleicher Titel',location_label:'Ort',summary:'Kurz',category:'theft',source_url:'https://example.test/'+id,source_sha256:id.padEnd(64,'a'),event_date:'2025-01-01',coordinates:[13.4,52.5],location_precision:'point',...extra});
const manifest=(months,translations={})=>({city:'berlin',generation,metadata:{},months:Object.fromEntries(months.map(m=>[m,{count:1}])),translations});
function client(values,packs={}){const calls=[];let active=0,peak=0;return {base:'/safety/'+generation,calls,get peak(){return peak;},async month(key,signal){signal.throwIfAborted();calls.push(key);active++;peak=Math.max(peak,active);try{await new Promise(resolve=>setImmediate(resolve));signal.throwIfAborted();return values[key];}finally{active--;}},async json(url,signal){signal.throwIfAborted();calls.push(url);return packs[url];}};}
test('selected year uses only saved valid publication months, never an occurrence year',()=>{
 assert.deepEqual(savedPublicationMonths('2026-all',['2026-10','2025-12','2026-03','2026-01','2026-03','2026-00','2026-13','2026-all']),['2026-01','2026-03','2026-10']);
 assert.equal(publicationPeriodIncludes('2026-all',null),false);assert.equal(publicationPeriodIncludes('2026-all','2026'),false);
 const pub=row('1','2026-01',{event_date:'2025-01-01'}),occurrence=row('2','2025-12',{event_date:'2026-01-01'}),unknown=row('3',null,{event_date:'2026-01-01'});
 assert.deepEqual(monthEvents({events:[pub,occurrence,unknown]},'2026-all','all'),[pub]);
});
test('year-all URL selection and city/language navigation round-trip',()=>{
 assert.equal(requestedMonth('?month=2026-all',['2026-01','2026-10'],'2026-10'),'2026-all');
 assert.equal(requestedMonth('?month=2027-all',['2026-10'],'2026-10'),'2026-10');
 assert.equal(requestedMonth('?month=all',['2026-10'],'2026-10'),'2026-10');
 const url=new URL(cityDestination('frankfurt','?lang=zh','2026-all',{origin:'https://example.test',portalPath:'/',berlinMapPath:'/crimemaps-Berlin/map/'}));assert.equal(url.searchParams.get('month'),'2026-all');assert.equal(url.searchParams.get('lang'),'zh');
});
test('two-worker year load keeps original publication months and source/provider fields',async()=>{
 const a=row('1','2026-01'),b=row('2','2026-03',{event_date:'2027-01-01'}),provider=row('4',null,{upstream_provider:'POLIZEIKARTE',time_basis:'polizeikarte_listing_display_metadata_only',provider_display_month:'2026-10'});
 const values={'2026-01':monthValue([a]),'2026-03':monthValue([b]),'2026-10':monthValue([row('3',null,{event_date:'2026-02-01'}),row('5','2025-12',{event_date:'2026-01-01'}),provider])},before=JSON.stringify(values),c=client(values),m=manifest(Object.keys(values));
 const got=await loadSelectedPeriod('2026-all',m,c,'en',new AbortController().signal);
 assert.deepEqual(got.events,[a,b,provider]);assert.deepEqual(got.events.map(e=>e.month),['2026-01','2026-03',null]);assert.equal(provider.provider_display_month,'2026-10');assert.equal(JSON.stringify(values),before);assert.equal(c.peak,2);assert.deepEqual(c.calls.sort(),Object.keys(values).sort());assert.deepEqual(got.month.event_ids,['1','2','4']);
});
test('each monthly translation snapshot remains attached to its event, including identical text',async()=>{
 const a=row('1','2026-01'),b=row('2','2026-02'),months=['2026-01','2026-02'],translations={en:Object.fromEntries(months.map(m=>[m,'translations/en/'+m+'.json']))},m=manifest(months,translations),packs={};
 for(const [month,event,title]of [['2026-01',a,'January title'],['2026-02',b,'February title']])packs['/safety/'+generation+'/translations/en/'+month+'.json']={schema_version:1,city:'berlin',locale:'en',month,source_generation:generation,texts:{[await textHash('Ort')]:'Place',[await textHash('Kurz')]:'Summary'},fields:[{city:'berlin',source_id:event.id,source_sha256:event.source_sha256,field:'/title',text_sha256:await textHash(event.title),translated_text:title}]};
 const got=await loadSelectedPeriod('2026-all',m,client({'2026-01':monthValue([a]),'2026-02':monthValue([b])},packs),'en',new AbortController().signal),language=new DynamicTranslations();language.mergeLoadedMonths(got.snapshots);
 assert.deepEqual(language.displayRows(got.events).map(e=>e.title),['January title','February title']);assert.deepEqual(language.displayRows(got.events).map(e=>e.month),months);assert.equal(language.missing,0);assert.equal(language.matched,6);
});
test('year POI intensity counts distinct announcements across months, preserves native references',async()=>{
 const a=row('1','2026-01'),b=row('2','2026-02'),one=monthValue([a]),two=monthValue([b]);one.links=[{event_id:'1',poi_id:'p',status:'context_exact',source_url:a.source_url,mention_basis:'source'}, {event_id:'1',poi_id:'p',status:'context_other',source_url:a.source_url,mention_basis:'source'}];two.links=[{event_id:'2',poi_id:'p',status:'context_exact',source_url:b.source_url,mention_basis:'source'}];
 const feature=id=>({type:'Feature',id:'native-'+id,geometry:{type:'Point',coordinates:[13.4,52.5]},properties:{source_id:id,native_object_id:'osm/node/'+id,context_only:true,counts_as_crime_point:false,event_count_point:false,association_radius_m:0}});one.source_poi_reference_features={type:'FeatureCollection',features:[feature('1')]};two.source_poi_reference_features={type:'FeatureCollection',features:[feature('2')]};
 const got=await loadSelectedPeriod('2026-all',manifest(['2026-01','2026-02']),client({'2026-01':one,'2026-02':two}),'zh',new AbortController().signal),data={events:got.events,pois:{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[13.4,52.5]},properties:{id:'p',kind:'bar',center:[13.4,52.5],geometry_mode:'point'}}]},catalog:{poi_types:{bar:{color:'#996644'}}}};
 const pois=styledPois(data,got.month.links,new Set(got.events.map(e=>e.id)),new Set(['bar']),true);assert.equal(pois.features[0].properties.association_announcement_count,2);assert.equal(sourcePoiReferences(got.events,got.month.source_poi_reference_features).features.length,2);assert.equal(countableEventIds(got.events).size,2);
});
test('missing or failed translation month retains original rows with explicit missing fields',async()=>{
 const e=row('1','2026-01'),m=manifest(['2026-01'],{zh:{'2026-01':'translations/zh/2026-01.json'}}),c=client({'2026-01':monthValue([e])});c.json=async()=>{throw Error('fixture failed language file');};
 const got=await loadSelectedPeriod('2026-all',m,c,'zh',new AbortController().signal),language=new DynamicTranslations();language.mergeLoadedMonths(got.snapshots);assert.equal(got.events[0],e);assert.equal(language.displayRows(got.events)[0].title,e.title);assert.equal(language.missingFor(e),3);
});
test('cancellation aborts both pending month loads and starts no subsequent month',async()=>{
 const controller=new AbortController(),calls=[],c={base:'/safety/'+generation,month(key,signal){calls.push(key);return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}},promise=loadSelectedPeriod('2026-all',manifest(['2026-01','2026-02','2026-03','2026-04']),c,'en',controller.signal);await new Promise(resolve=>setImmediate(resolve));controller.abort();await assert.rejects(promise);assert.equal(calls.length,2);
});
test('a missing saved month fails the whole selection and duplicate source identities cannot merge months',async()=>{
 const a=row('1','2026-01');await assert.rejects(loadSelectedPeriod('2026-all',manifest(['2026-01','2026-02']),client({'2026-01':monthValue([a])}),'en',new AbortController().signal),/Missing saved/);
 await assert.rejects(loadSelectedPeriod('2026-all',manifest(['2026-01','2026-02']),client({'2026-01':monthValue([a]),'2026-02':monthValue([row('1','2026-02')])}),'en',new AbortController().signal),/several publication months/);
});
test('single month and empty month still work without fetching unrelated months',async()=>{
 const e=row('1','2026-01'),c=client({'2026-01':monthValue([e])}),m=manifest(['2026-01','2026-02']);assert.deepEqual((await loadSelectedPeriod('2026-01',m,c,'de',new AbortController().signal)).events,[e]);assert.deepEqual(c.calls,['2026-01']);const empty=await loadSelectedPeriod('2026-03',m,c,'de',new AbortController().signal);assert.equal(empty.month,undefined);assert.deepEqual(c.calls,['2026-01']);
});
test('candidate main and methods wire atomic period snapshots, true report months and real metric scope',async()=>{
 const main=await fs.readFile(path.join(source,'web/src/safety/main.ts'),'utf8'),methods=await fs.readFile(path.join(source,'web/src/safety/methods.ts'),'utf8');
 assert.ok(main.includes('loadSelectedPeriod(key,manifest,client,locale,signal,currentCity)'));assert.ok(main.includes('if (signal.aborted || key !== monthKey()) return;'));assert.ok(main.includes('dynamicText.mergeLoadedMonths(value.snapshots)'));assert.ok(main.includes('month:String(displayMonth(event)??""),'));assert.ok(main.includes('new Option(t("filter.yearToDate"),"all")'));assert.ok(main.includes('.value = latest.slice(5)'));assert.ok(methods.includes('selected_months: current.selectedMonths ?? [current.month]'));
 for(const locale of ['de','en','zh']){const values=JSON.parse(await fs.readFile(path.join(source,'web/src/safety/locales',locale+'.json'),'utf8'));assert.ok(values['filter.yearToDate']);assert.ok(!values['coverage.countPoints'].includes('This month:'));}
});

test('completed month grids and closed dialog scene owners are collectible; output and reopening survive',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'crimemaps-period-retention-'));
 try{
  await build({entryPoints:[path.join(source,'web/src/safety/selected-period.ts')],bundle:true,platform:'node',format:'esm',target:'es2022',outfile:path.join(directory,'period.mjs')});
  const main=await fs.readFile(path.join(source,'web/src/safety/main.ts'),'utf8'),start=main.indexOf('function clearClosedReportDialog()'),end=main.indexOf('function externalMapsDialog()',start);
  assert(start>=0&&end>start);assert(main.includes('addEventListener("close",clearClosedReportDialog)'));
  await build({stdin:{contents:'export function bind(el,abortPendingReportBodyLoads,text){'+main.slice(start,end)+'return{clearClosedReportDialog,openDialog};}',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',outfile:path.join(directory,'dialog.mjs')});
  const check=String.raw`
import assert from 'node:assert/strict';
import {loadSelectedPeriod} from './period.mjs';
import {bind} from './dialog.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const collect=async()=>{for(let i=0;i<8;i++){await tick();global.gc();}};
const months=['2026-01','2026-02','2026-03','2026-04'],weakGrids=[],links=[],references=[],calls=[];
let releaseLater;const later=new Promise(resolve=>releaseLater=resolve);
const manifest={city:'berlin',generation:'0123456789abcdef-20261025T000000',metadata:{},months:Object.fromEntries(months.map(m=>[m,{count:1}]))};
const client={base:'/safety/test',async month(month,signal){
 calls.push(month);if(month.endsWith('03')||month.endsWith('04'))await later;signal.throwIfAborted();
 const id=month,event={id,month,title:'Title '+month,location_label:'Place',summary:'Summary',category:'theft',source_url:'https://example.test/'+month,source_sha256:'a'.repeat(64),event_date:null,coordinates:[13.4,52.5],location_precision:'point'},link={event_id:id,poi_id:'p',status:'context_exact'},reference={type:'Feature',geometry:{type:'Point',coordinates:[13.4,52.5]},properties:{source_id:id}};
 const hex={overview:{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[Array.from({length:4096},(_,i)=>[13+i/1e6,52])]},properties:{}}]},detail:{type:'FeatureCollection',features:[]}};
 if(month.endsWith('01')||month.endsWith('02'))weakGrids.push(new WeakRef(hex));links.push(link);references.push(reference);
 return{events:[event],event_ids:[id],links:[link],hex,source_poi_reference_features:{type:'FeatureCollection',features:[reference]}};
}};
const pending=loadSelectedPeriod('2026-all',manifest,client,'en',new AbortController().signal);
await tick();assert.equal(calls.length,4);assert.equal(weakGrids.length,2);await collect();
assert(weakGrids.every(ref=>ref.deref()===undefined),'earlier monthly hex must be collectible while later months are still pending');
releaseLater();const result=await pending;
assert.deepEqual(result.months,months);assert.deepEqual(result.events.map(e=>e.id),months);assert.deepEqual(result.month.event_ids,months);assert.equal(result.month.links.length,4);assert.equal(result.month.source_poi_reference_features.features.length,4);assert.equal(result.snapshots.length,4);
for(const link of result.month.links)assert(links.includes(link));for(const ref of result.month.source_poi_reference_features.features)assert(references.includes(ref));
assert.deepEqual(result.month.hex,{overview:{type:'FeatureCollection',features:[]},detail:{type:'FeatureCollection',features:[]}});
const content={children:[],replaceChildren(...children){this.children=children;}},drawer={open:false,attributes:{},setAttribute(key,value){this.attributes[key]=value;},showModal(){this.open=true;}};
let request=new AbortController(),abortCalls=0;
const api=bind(id=>id==='drawer'?drawer:content,()=>{abortCalls++;request.abort();},(tag,value,parent)=>{const item={tag,value};parent.children.push(item);return item;});
api.openDialog('All year');assert(drawer.open);request=new AbortController();
function addCards(){const weak=[];for(let i=0;i<1000;i++){const scene={geometry:{type:'Polygon',coordinates:[[i,1],[i,2],[i+1,2]]}};weak.push(new WeakRef(scene));content.children.push({onclick:()=>scene.geometry});}return weak;}
const weakScenes=addCards();assert.equal(content.children.length,1001);assert.equal(request.signal.aborted,false);
drawer.open=false;api.clearClosedReportDialog();assert(request.signal.aborted);assert.equal(content.children.length,0);await collect();assert(weakScenes.every(ref=>ref.deref()===undefined),'closed drawer must not keep its scene closures reachable');
api.openDialog('Reopened');request=new AbortController();assert.equal(content.children.length,1);assert.equal(content.children[0].value,'Reopened');const before=abortCalls;
api.clearClosedReportDialog();assert.equal(abortCalls,before,'late close event must not abort a reopened drawer');assert.equal(content.children.length,1);assert.equal(request.signal.aborted,false);
drawer.open=false;api.clearClosedReportDialog();assert(request.signal.aborted);assert.equal(content.children.length,0);
console.log('period and dialog retained owners released; complete period and reopen preserved');
`;
  await fs.writeFile(path.join(directory,'check.mjs'),check);
  const output=execFileSync(process.execPath,['--expose-gc',path.join(directory,'check.mjs')],{encoding:'utf8',timeout:15000});
  assert.match(output,/retained owners released/);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
