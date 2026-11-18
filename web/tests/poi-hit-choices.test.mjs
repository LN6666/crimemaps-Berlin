import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const built=await build({stdin:{contents:"export {collectPoiHitChoices,poiHitChoiceLabels} from './poi-hit-choices';",resolveDir:new URL('../src/safety/',import.meta.url).pathname},bundle:true,platform:'node',format:'esm',write:false});
const {collectPoiHitChoices,poiHitChoiceLabels}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const hit=(layer,id,name)=>({layer:{id:layer},properties:{id,...(name===undefined?{}:{name})}});
const poi=(id,name)=>({properties:{id,name}});

test('same-named Essen station source point and outline are distinguishable before selection',()=>{
  const name='Essen Hauptbahnhof',point='osm/node/3948583064',area='osm/way/325067654';
  const pois=[{...poi(point,name),geometry:{type:'Point'}},{...poi(area,name),geometry:{type:'Polygon'}}];
  const choices=collectPoiHitChoices([hit('poi-center',area,name),hit('poi-point',point,name)],pois).choices;
  const before=JSON.stringify({choices,pois});
  const labels=poiHitChoiceLabels(choices,pois,kind=>({point:'地图点位',area:'地图轮廓'})[kind]);
  assert.equal(labels.get(point),`${name} — 地图点位`);
  assert.equal(labels.get(area),`${name} — 地图轮廓`,'a polygon hit via its center is still an outline');
  assert.equal(JSON.stringify({choices,pois}),before);
});

test('same geometry or unknown outlines retain distinct original IDs; unique names stay concise',()=>{
  const pois=[poi('a','Station'),poi('b','Station'),poi('c','Park')];
  const choices=collectPoiHitChoices(pois.map(p=>hit('poi-center',p.properties.id,p.properties.name)),pois).choices;
  const labels=poiHitChoiceLabels(choices,pois,kind=>kind);
  assert.equal(labels.get('a'),'Station — unknown · a');
  assert.equal(labels.get('b'),'Station — unknown · b');
  assert.equal(labels.get('c'),'Park');
  assert.deepEqual(poiHitChoiceLabels([...choices].reverse(),pois,kind=>kind),labels);
});

test('one center retains a different POI hit through each native fill, line, circle or point layer',()=>{
  for(const layer of ['poi-fill','poi-line','poi-circle','poi-point']){
    const hits=[hit(layer,'other','tile other'),hit('poi-center','center','tile center')];
    const pois=[poi('center','Z center'),poi('other','A other'),poi('not-hit','Unrelated loaded POI')];
    const before=JSON.stringify({hits,pois}),result=collectPoiHitChoices(hits,pois);
    assert.deepEqual(result.choices,[{id:'center',name:'Z center',centerHit:true},{id:'other',name:'A other',centerHit:false}],layer);
    assert.equal(result.centerPrimary,result.choices[0],'the unique center remains the preferred original ID');
    assert.equal(JSON.stringify({hits,pois}),before,'selection never mutates source or rendered properties');
  }
});

test('multiple layers and tile duplicates of one original ID produce one choice and one center',()=>{
  const result=collectPoiHitChoices([
    hit('poi-fill','same','tile name'),hit('poi-line','same','tile name'),hit('poi-center','same','tile name'),
    hit('poi-association-label','same','tile name'),hit('poi-circle','same','tile name'),hit('poi-point','same','tile name'),
    hit('poi-center','same','tile name'),
  ],[poi('same','Original source name')]);
  assert.deepEqual(result.choices,[{id:'same',name:'Original source name',centerHit:true}]);
  assert.equal(result.centerPrimary,result.choices[0]);
});

test('distinct center and association-label IDs remain ambiguous and sort before non-center choices',()=>{
  const hits=[hit('poi-fill','area','A area'),hit('poi-association-label','b','B center'),hit('poi-center','a','A center'),hit('poi-point','point','A area')];
  const first=collectPoiHitChoices(hits,[]),reversed=collectPoiHitChoices([...hits].reverse(),[]);
  assert.deepEqual(first.choices.map(choice=>choice.id),['a','b','area','point']);
  assert.equal(first.centerPrimary,undefined,'two independent center IDs require a choice');
  assert.deepEqual(reversed,first,'layer and tile traversal order do not change the available choices');
});

test('only original IDs in semantic POI hits are choices; unloaded names retain rendered name or ID',()=>{
  const result=collectPoiHitChoices([
    hit('poi-point','named','Rendered native point'),hit('poi-line','unnamed'),
    hit('poi-center-halo','decorative'),hit('source-poi-reference-point','report-reference'),hit('scene-point','announcement'),
    hit('poi-fill',42),hit('poi-center',''),{layer:{id:'poi-point'},properties:null},
  ],[poi('not-hit','Loaded only')]);
  assert.deepEqual(result.choices,[{id:'named',name:'Rendered native point',centerHit:false},{id:'unnamed',name:'unnamed',centerHit:false}]);
  assert.equal(result.centerPrimary,undefined);
  assert.deepEqual(collectPoiHitChoices([],[]),{choices:[],centerPrimary:undefined});
});
