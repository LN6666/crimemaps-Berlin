import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const built=await build({stdin:{contents:"export {resolvePoiDisplayStyle} from './poi-display-style';",resolveDir:new URL('../src/safety/',import.meta.url).pathname},bundle:true,platform:'node',format:'esm',write:false});
const {resolvePoiDisplayStyle}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

test('all thirteen original kinds plus context have distinct display colors and undimmed centers',()=>{
  const kinds=['airport','attraction','bar','cafe','fast_food','hotel','marketplace','nightclub','park','parking','restaurant','shop','station','context'];
  const styles=kinds.map(kind=>resolvePoiDisplayStyle(kind,'#000000'));
  assert.equal(new Set(styles.map(style=>style.color)).size,kinds.length,'no two category tokens share the same display color');
  for(const style of styles){assert.match(style.color,/^#[0-9a-f]{6}$/i);assert.equal(style.centerColor,style.color,'a solid marker is not darkened into a tiny near-black center');}
  // Token uniqueness is a code invariant, not a native visual/color-vision PASS.
});

test('known display kinds override frozen catalog colors; a mixed scope is not substituted for its original kind',()=>{
  assert.deepEqual(resolvePoiDisplayStyle('airport','#475569'),{color:'#78a6c8',centerColor:'#78a6c8'});
  assert.deepEqual(resolvePoiDisplayStyle('context'),{color:'#777f87',centerColor:'#777f87'});
  assert.deepEqual(resolvePoiDisplayStyle('station','#2563eb'),{color:'#2469e8',centerColor:'#2469e8'});
  assert.notEqual(resolvePoiDisplayStyle('context').color,resolvePoiDisplayStyle('parking','#64748b').color);
  assert.notEqual(resolvePoiDisplayStyle('context').color,resolvePoiDisplayStyle('station').color);
  assert.deepEqual(resolvePoiDisplayStyle('source_linked_context','#475569'),{color:'#475569',centerColor:'#475569'},'filter scopes do not masquerade as actual-kind palette entries');
});

test('unknown kinds keep supplied catalog colors and explicit missing/non-hex center fallbacks',()=>{
  assert.deepEqual(resolvePoiDisplayStyle('future-kind','#123456'),{color:'#123456',centerColor:'#123456'});
  assert.deepEqual(resolvePoiDisplayStyle('future-kind'),{color:'#64748b',centerColor:'#64748b'});
  assert.deepEqual(resolvePoiDisplayStyle('future-kind','rgb(1, 2, 3)'),{color:'rgb(1, 2, 3)',centerColor:'#64748b'});
  assert.deepEqual(resolvePoiDisplayStyle('constructor'),{color:'#64748b',centerColor:'#64748b'},'unknown names cannot resolve inherited object properties');
});
