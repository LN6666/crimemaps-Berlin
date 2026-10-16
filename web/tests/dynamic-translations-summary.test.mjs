import assert from 'node:assert/strict';
import test from 'node:test';
import * as esbuildModule from 'esbuild';
const {build} = esbuildModule.default ?? esbuildModule;

const source = new URL('../src/safety/dynamic-translations.ts', import.meta.url).pathname;
const compiled = await build({entryPoints:[source],bundle:true,platform:'node',format:'esm',target:'node22',write:false});
const {DynamicTranslations,textHash} = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);

test('translates the short summary on locale switch while leaving full body to its separate lazy loader', async () => {
  const sourceSha = 'a'.repeat(64);
  const event = {
    id:'berlin:synthetic-summary', source_id:'synthetic-summary', source_sha256:sourceSha,
    title:'Synthetic title', location_label:'Synthetic place', summary:'Synthetic source summary',
    body:'Synthetic full body outside the month pack', category:'fixture', month:'2026-01', event_date:null,
    coordinates:null, location_precision:'unknown', source_url:'https://invalid.example/synthetic',
    feed_url:'https://invalid.example/feed', poi_mentions:[], incidents:[], scene_locations:[],
  };
  const original = structuredClone(event);
  const manifest = {
    city:'berlin', generation:'fixture-generation',
    metadata:{transport_source_generation:'fixture-generation',translation_source_generation:'fixture-generation'},
    translations:{en:{'2026-01':'translations/en/2026-01.json'},zh:{'2026-01':'translations/zh/2026-01.json'}},
  };
  const localized = {
    en:{title:'Synthetic English title',location_label:'Synthetic English place',summary:'Synthetic English summary'},
    zh:{title:'合成中文标题',location_label:'合成中文地点',summary:'合成中文摘要'},
  };
  const packs = new Map();
  for (const locale of ['en','zh']) {
    const fields=[];
    for (const field of ['/title','/location_label','/summary']) {
      const key=field.slice(1), value=event[key];
      fields.push({city:'berlin',source_id:event.source_id,source_sha256:sourceSha,field,text_sha256:await textHash(value),translated_text:localized[locale][key]});
    }
    const relativePath=manifest.translations[locale]['2026-01'];
    packs.set(`private/${relativePath}`,{schema_version:1,locale,city:'berlin',month:'2026-01',source_generation:'fixture-generation',texts:{},fields});
  }

  const consumer=new DynamicTranslations();
  for (const locale of ['en','zh']) {
    await consumer.load([event],manifest,{base:'private',json:async url=>packs.get(url)},'2026-01',locale,new AbortController().signal,'berlin');
    const displayed=consumer.displayRows([event])[0];
    for (const field of ['/title','/location_label','/summary']) {
      const key=field.slice(1),expected=localized[locale][key];
      assert.equal(consumer.field(event,field,event[key]),expected,`${locale} addressed ${field}`);
      assert.equal(displayed[key],expected,`${locale} displayed ${field}`);
    }
    assert.equal(displayed.body,event.body,'full report body stays with its separate lazy loader');
    assert.equal(consumer.matched,3);
    assert.equal(consumer.missing,0);
  }
  assert.deepEqual(event,original,'translation creates a display copy and does not mutate the source event');
});
