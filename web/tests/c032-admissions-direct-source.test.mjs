import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
const plugins=process.env.CRIMEMAPS_C032_ADMISSIONS_SOURCE?[{name:'captured-admissions-source',setup(builder){builder.onLoad({filter:/[\/]c032-original-admissions\.ts$/},async args=>({contents:await readFile(process.env.CRIMEMAPS_C032_ADMISSIONS_SOURCE,'utf8'),loader:'ts',resolveDir:new URL('../src/painted/infill/safety/',import.meta.url).pathname}));}}]:[];
const built=await build({plugins,stdin:{contents:`export * from './src/painted/infill/safety/c032-original-admissions';export {createFrozenDataScope} from './src/safety/frozen-data-scope';export {createResourceBudget} from './src/safety/render-runtime/resource-budget';`,resolveDir:new URL('../',import.meta.url).pathname,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('C032 admission accessor avoids nested whole-scope reservation at captured Frankfurt pressure',async()=>{
 const budget=api.createResourceBudget({limitBytes:1500000000});
 const held=budget.reserve({category:'metadata',bytes:1217218692,precision:'estimate'});
 const rows=[{city:'frankfurt',objectId:'osm/way/1'}];let releases=0;
 const scope=api.createFrozenDataScope({resources:{budget},async acquire(ref,signal){signal.throwIfAborted();assert.deepEqual(ref,api.infillDataRefs[0]);return{logicalBytes:160093578,borrow:read=>read(rows),release(){releases++;}};}});
 try{
  assert.throws(()=>api.getPROGRESSIVE_ADMISSIONS(scope));
  await api.prepareInfillDataPayload(new AbortController().signal,scope);
  assert.throws(()=>scope.memo({},()=>({})),error=>error.name==='ResourceBudgetExceededError');
  assert.equal(budget.stats.lastPressure.additionalBytes,320191252);
  assert.equal(budget.stats.lastPressure.shortfallBytes,37409944);
  assert.equal(api.getPROGRESSIVE_ADMISSIONS(scope),rows);
  assert.deepEqual(api.infillDataMemoKeys,[]);
  assert.equal(budget.stats.bytes,1217218692);
 }finally{scope.release();held.release();}
 assert.equal(releases,1);assert.equal(budget.stats.bytes,0);
 assert.throws(()=>api.getPROGRESSIVE_ADMISSIONS(scope));
});

const providerBuilt=await build({plugins,stdin:{contents:`export {progressivePaintCount,validateProgressiveAdmissionRows,infillDataRefs} from './src/painted/infill/safety/c032-original-provider';export {createFrozenDataScope} from './src/safety/frozen-data-scope';export {createResourceBudget} from './src/safety/render-runtime/resource-budget';`,resolveDir:new URL('../',import.meta.url).pathname,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const provider=await import('data:text/javascript;base64,'+Buffer.from(providerBuilt.outputFiles[0].text).toString('base64'));
test('actual C032 provider builds the validated index under pressure and releases it',async()=>{
 const budget=provider.createResourceBudget({limitBytes:1500000000});
 const held=budget.reserve({category:'metadata',bytes:897027440,precision:'estimate'});
 const rows=[{city:'frankfurt',objectId:'osm/way/1',partId:'osm/way/1/component/0',origin:[8.6,50.1],descriptionSHA256:'a'.repeat(64)}];let releases=0;
 const scope=provider.createFrozenDataScope({resources:{budget},async acquire(){return{logicalBytes:160093578,borrow:read=>read(rows),release(){releases++;}};}});
 try{
  await scope.prepare(provider.infillDataRefs,new AbortController().signal);
  assert.equal(provider.progressivePaintCount(scope),1);
  assert.equal(provider.progressivePaintCount(scope),1);
  assert.equal(budget.stats.pressureEvents,0,'nested accessor reservation is eliminated');
  assert.throws(()=>provider.validateProgressiveAdmissionRows([rows[0],rows[0]]),/Invalid progressive paint admission/);
  assert.throws(()=>provider.validateProgressiveAdmissionRows([{...rows[0],wallColor:[2,0,0]}]),/Invalid progressive paint colour/);
 }finally{scope.release();held.release();}
 assert.equal(releases,1);assert.equal(budget.stats.bytes,0);
 assert.equal(provider.progressivePaintCount(scope),undefined);
});
