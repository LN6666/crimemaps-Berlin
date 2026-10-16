import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import * as esbuildModule from 'esbuild';
const {build}=esbuildModule.default??esbuildModule;
const root=new URL('../src/safety/',import.meta.url);
async function bundle(name){
 const result=await build({entryPoints:[new URL(name,root).pathname],bundle:true,platform:'node',format:'esm',target:'node22',write:false});
 return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const {DynamicTranslations,textHash}=await bundle('dynamic-translations.ts');
const {reportSummaryPresentation}=await bundle('report-summary.ts');

function event(overrides={}){
 return {
  id:'example:fixture-001',source_id:'fixture-001',source_sha256:'a'.repeat(64),
  title:'Beispielmeldung zu einem Vorfall am Beispielort',location_label:'Beispielort',
  source_summary:'Am Beispielort wurde am Morgen ein Vorfall gemeldet. Die Umstände und die beteiligten Personen sind noch nicht abschließend geklärt. Die Polizei ermittelt und bittet mögliche Zeuginnen und Zeugen um Hinweise.',
  upstream_provider:'EXAMPLE PROVIDER',category:'example',month:'2026-01',event_date:'2026-01-01',
  coordinates:[10,50],location_precision:'locality',source_url:'https://example.invalid/munich/fixture',
  feed_url:'https://example.invalid/provider/fixture',poi_mentions:[],incidents:[],scene_locations:[],...overrides,
 };
}
async function loadSummary(targetLocale,sourceEvent,translated,candidateSourceSha=sourceEvent.source_sha256){
 const fields=[];
 for(const [field,value] of [['/title',sourceEvent.title],['/location_label',sourceEvent.location_label],['/source_summary',sourceEvent.source_summary]]){
  fields.push({city:'munich',source_id:'fixture-001',source_sha256:candidateSourceSha,field,text_sha256:await textHash(value),translated_text:translated[field]});
 }
 const path=`translations/${targetLocale}/2026-01.json`;
 const pack={schema_version:1,locale:targetLocale,city:'munich',month:'2026-01',source_generation:'munich-fixture-generation',texts:{},fields};
 const manifest={city:'munich',generation:'munich-fixture-generation',metadata:{},translations:{[targetLocale]:{'2026-01':path}}};
 const consumer=new DynamicTranslations();
 await consumer.load([sourceEvent],manifest,{base:'fixture',json:async url=>url===`fixture/${path}`?structuredClone(pack):undefined},'2026-01',targetLocale,new AbortController().signal,'munich');
 return consumer;
}

test('synthetic source_summary is collected and translated through its own exact source-hash field in English and Chinese',async()=>{
 const original=event();
 for(const locale of ['en','zh']){
  const localized=locale==='en'?{
   '/title':'Example report about an incident at the example location',
   '/location_label':'Example location',
   '/source_summary':'An incident was reported at the example location in the morning. The circumstances and the people involved have not yet been conclusively established. Police are investigating and ask potential witnesses to come forward.',
  }:{
   '/title':'示例地点一起事件的情况通报',
   '/location_label':'示例地点',
   '/source_summary':'当天上午，示例地点报告发生一起事件。具体情况及相关人员尚未最终查明。警方正在调查，并请可能的目击者提供线索。',
  };
  const consumer=await loadSummary(locale,original,localized);
  const display=consumer.displayRows([original])[0];
  assert.equal(consumer.field(original,'/source_summary',original.source_summary),localized['/source_summary']);
  assert.equal(display.source_summary,localized['/source_summary']);
  assert.equal(display.summary,undefined);
  assert.equal(consumer.matched,3);
  assert.equal(consumer.missing,0);
  assert.equal(original.source_summary,'Am Beispielort wurde am Morgen ein Vorfall gemeldet. Die Umstände und die beteiligten Personen sind noch nicht abschließend geklärt. Die Polizei ermittelt und bittet mögliche Zeuginnen und Zeugen um Hinweise.','the canonical provider summary stays unchanged');
 }
});

test('a mismatched source SHA cannot translate source_summary',async()=>{
 const sourceEvent=event();
 const consumer=await loadSummary('en',sourceEvent,{
  '/title':'Wrong-version title','/location_label':'Wrong-version place','/source_summary':'Wrong-version summary',
 },'0'.repeat(64));
 const display=consumer.displayRows([sourceEvent])[0];
 assert.equal(display.source_summary,sourceEvent.source_summary);
 assert.equal(consumer.matched,0);
});

test('reviewed summary wins; provider summary is explicitly distinguished from the full article',async()=>{
 assert.deepEqual(reportSummaryPresentation('Reviewed summary','Provider source summary'),{text:'Reviewed summary',kind:'summary'});
 assert.deepEqual(reportSummaryPresentation(undefined,'Provider source summary'),{text:'Provider source summary',kind:'provider_summary'});
 assert.equal(reportSummaryPresentation(undefined,'   '),undefined);
 const locales=new URL('../src/safety/locales/',import.meta.url);
 const labels={};
 for(const lang of ['en','de','zh'])labels[lang]=JSON.parse(await readFile(new URL(`${lang}.json`,locales),'utf8'))['report.providerSummary'];
 assert.match(labels.en,/not the full police announcement/i);
 assert.match(labels.de,/keine vollständige Polizeimeldung/i);
 assert.match(labels.zh,/非警方公告全文/);
 const main=await readFile(new URL('../src/safety/main.ts',import.meta.url),'utf8');
 assert.match(main,/reportSummaryPresentation\(e\.summary,e\.source_summary\)/);
 assert.match(main,/report\.providerSummary/);
});
