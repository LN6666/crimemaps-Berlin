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
test('all current and legacy requests use the sole economy pixel budget',()=>{
  for(const quality of ['economy','balanced','detail']){
    for(const device of [1,2,3,NaN])assert.equal(scenePixelRatio(quality,device,1280,720),.75);
    assert.equal(scenePixelRatio(quality,2,1280,720,true),.75);
    const ratio=scenePixelRatio(quality,3,3840,2160);
    assert(ratio<=.75&&3840*2160*ratio*ratio<=3_000_001);
  }
});

test('day playback includes the entire German civil day at DST transitions',()=>{assert.equal(berlinDayRange('2026-03-29').durationMs,23*3600000);assert.equal(berlinDayRange('2026-10-25').durationMs,25*3600000);assert.equal(berlinDayRange('2026-06-21').durationMs,24*3600000);});

test('economy reduces drawing pixels at DPR 1 and both policies agree',async()=>{
 const {sceneDrawingPixelRatio}=await moduleFor('scene-environment-quality.ts');
 for(const device of [1,2,3])for(const quality of ['economy','balanced','detail']){
  const ratio=scenePixelRatio(quality,device,866,401);
  assert.equal(ratio,sceneDrawingPixelRatio(866,401,device,quality));
 }
 assert.equal(scenePixelRatio('economy',1,866,401)**2,.5625);
 assert.equal(scenePixelRatio('balanced',1,866,401),.75);
});

test('desktop, mobile and legacy environment states normalize to economy',async()=>{
 const {defaultSceneEnvironment,checkedSceneEnvironment}=await moduleFor('scene-environment-state.ts');
 for(const mobile of [false,true])assert.equal(defaultSceneEnvironment(mobile).quality,'economy');
 for(const quality of ['economy','balanced','detail'])assert.equal(checkedSceneEnvironment({...defaultSceneEnvironment(),quality}).quality,'economy');
 assert.throws(()=>checkedSceneEnvironment({...defaultSceneEnvironment(),quality:'invalid'}),/Invalid scene/);
});

test('8K and ultrawide viewports obey the pixel cap in both rendering policies',async()=>{
 const {sceneDrawingPixelRatio}=await moduleFor('scene-environment-quality.ts');
 for(const [width,height] of [[7680,4320],[4320,7680],[15360,4320],[5120,2880]]){
  for(const device of [1,2,3]){
   const ratio=scenePixelRatio('economy',device,width,height);
   assert(ratio>0&&ratio<=.75);
   assert(width*height*ratio*ratio<=3_000_001,`${width}x${height} exceeds drawing budget`);
   assert.equal(ratio,sceneDrawingPixelRatio(width,height,device,'economy'));
  }
 }
});
