import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function moduleFor(name){const r=await build({entryPoints:[new URL('../src/safety/'+name,import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));}
const {berlinLocalInstant,berlinClock,berlinNoon,berlinDayRange}=await moduleFor('scene-time.ts');
const {scenePixelRatio}=await moduleFor('scene-render-quality.ts');
test('German civil time follows seasonal offsets and rejects the spring gap',()=>{
  assert.equal(berlinLocalInstant('2026-01-15','12:00'),'2026-01-15T11:00:00.000Z');
  assert.equal(berlinLocalInstant('2026-07-15','12:00'),'2026-07-15T10:00:00.000Z');
  assert.equal(berlinLocalInstant('2026-03-29','02:30'),undefined);
  assert.equal(berlinLocalInstant('2026-10-25','02:30'),'2026-10-25T00:30:00.000Z');
  assert.equal(berlinClock('2026-10-25T00:30:00Z').offsetMinutes,120);
  assert.equal(berlinClock('2026-10-25T01:30:00Z').offsetMinutes,60);
  assert.equal(berlinNoon(new Date('2026-10-25T08:00:00Z')),'2026-10-25T11:00:00.000Z');
});
test('invalid calendar days and time values cannot silently normalize',()=>{
  for(const [date,time] of [['2026-02-30','12:00'],['2026-13-01','12:00'],['2026-10-25','24:00'],['2026-10-25','12:60'],['1999-12-31','12:00']])assert.equal(berlinLocalInstant(date,time),undefined);
});
test('pixel budgets preserve detail at normal size and bound large render targets',()=>{
  assert.equal(scenePixelRatio('detail',2,1280,720),2);
  assert.equal(scenePixelRatio('balanced',2,1280,720),1.5);
  assert.equal(scenePixelRatio('balanced',2,1280,720,true),1.25);
  assert.equal(scenePixelRatio('economy',3,1280,720),1);
  assert.equal(scenePixelRatio('detail',1,1280,720),1);
  const ratio=scenePixelRatio('detail',3,3840,2160);
  assert(ratio>1&&3840*2160*ratio*ratio<=12_000_001);
  assert.equal(scenePixelRatio('balanced',NaN,1280,720),1);
});

test('day playback includes the entire German civil day at DST transitions',()=>{assert.equal(berlinDayRange('2026-03-29').durationMs,23*3600000);assert.equal(berlinDayRange('2026-10-25').durationMs,25*3600000);assert.equal(berlinDayRange('2026-06-21').durationMs,24*3600000);});
