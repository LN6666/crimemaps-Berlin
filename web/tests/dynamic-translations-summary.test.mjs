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

test('copies only changed public translation branches and shares unchanged review trees', async () => {
  const event = {
    id:'berlin:copy-on-write',source_id:'copy-on-write',source_sha256:'b'.repeat(64),
    title:'Source title',location_label:'Source place',summary:'Short summary',source_summary:'Source overview',
    category:'fixture',month:'2026-01',source_url:'https://invalid.example/copy',
    public_display_fields:['source_supporting_materials'],
    source_supporting_materials:[
      {details:'Public details',nested:[{note:'Public nested note',evidence:{hash:'immutable'}}],metadata:{ids:['source-1']}},
      {details:'Untranslated details',nested:[{note:'Untranslated note'}]},
    ],
    // This root has no public-display permission, even though it has text-like keys.
    historical_source_reviews:[{note:'Private review',evidence:{ids:['review-1']}}],
    source_incidents:[{incident_id:'unplaced',details:'Unplaced details',event_time:{display:'Unplaced time',precision:'day'},evidence:{ids:['stage-1']}}],
    scene_locations:[{
      label:'Scene label',details:'Scene details',public_display_fields:['public_reference_note'],public_reference_note:'Public reference',
      geometry:{type:'Polygon',coordinates:[[[13,52],[14,52],[14,53],[13,52]]]},
      geometry_review:{verdict:'accepted',note:'Public nested note',evidence:[{ids:['geometry-1'],metadata:{sha:'unchanged'}}]},
      poi_review:{evidence:[{source_ids:['poi-1']}]},transit_review:{route:{ids:['route-1']}},source_relations:[{ids:['relation-1']}],
      event_time:{display:'Scene time',precision:'day'},
      incidents:[{incident_id:'placed',details:'Placed details',event_time:{display:'Placed time',precision:'day'}}],
    }],
  };
  const original=structuredClone(event);
  const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}};
  freeze(event);
  const manifest={city:'berlin',generation:'fixture-generation',metadata:{},translations:{zh:{'2026-01':'translations/zh/2026-01.json'}}};
  const translations=new Map([
    ['/summary','短摘要'],['/source_summary','来源概要'],
    ['/source_supporting_materials/0/details','公开细节'],['/source_supporting_materials/0/nested/0/note','公开多层说明'],
    ['/source_incidents/0/details','未定位阶段'],['/source_incidents/0/event_time/display','未定位时间'],
    ['/scene_locations/0/public_reference_note','公开地点说明'],['/scene_locations/0/label','地点名称'],
    ['/scene_locations/0/details','地点细节'],['/scene_locations/0/event_time/display','地点时间'],
    ['/scene_locations/0/incidents/0/details','已定位阶段'],['/scene_locations/0/incidents/0/event_time/display','已定位时间'],
  ]);
  const at=(object,field)=>field.slice(1).split('/').reduce((value,key)=>value[key],object);
  const fields=await Promise.all([...translations].map(async([field,translated_text])=>({city:'berlin',source_id:event.source_id,source_sha256:event.source_sha256,field,text_sha256:await textHash(at(event,field)),translated_text})));
  const consumer=new DynamicTranslations();
  await consumer.load([event],manifest,{base:'private',json:async()=>({schema_version:1,locale:'zh',city:'berlin',month:'2026-01',source_generation:'fixture-generation',texts:{},fields})},'2026-01','zh',new AbortController().signal,'berlin');
  const displayed=consumer.displayRows([event])[0];
  for(const [field,expected]of translations)assert.equal(at(displayed,field),expected,field);
  assert.notEqual(displayed.source_supporting_materials,event.source_supporting_materials);
  assert.notEqual(displayed.source_supporting_materials[0].nested,event.source_supporting_materials[0].nested);
  assert.equal(displayed.source_supporting_materials[0].nested[0].evidence,event.source_supporting_materials[0].nested[0].evidence,'unchanged sibling keeps identity');
  assert.equal(displayed.source_supporting_materials[0].metadata,event.source_supporting_materials[0].metadata);
  assert.equal(displayed.source_supporting_materials[1],event.source_supporting_materials[1],'public but untranslated branch keeps identity');
  assert.equal(displayed.historical_source_reviews,event.historical_source_reviews,'non-public restored root is not copied');
  assert.equal(displayed.source_incidents[0].evidence,event.source_incidents[0].evidence);
  for(const key of ['geometry_review','poi_review','transit_review','source_relations','geometry'])assert.equal(displayed.scene_locations[0][key],event.scene_locations[0][key],key);
  assert.equal(displayed.scene_locations[0].geometry.coordinates,event.scene_locations[0].geometry.coordinates);
  assert.equal(displayed.scene_locations[0].geometry_review.note,'Public nested note','same text in an unaddressed review is untouched');
  const unchanged=new DynamicTranslations().displayRows([event])[0];
  for(const key of ['source_supporting_materials','historical_source_reviews','source_incidents'])assert.equal(unchanged[key],event[key],`${key}: no changed text needs no deep copy`);
  assert.deepEqual(event,original,'frozen canonical source remains byte-content equivalent');
});
