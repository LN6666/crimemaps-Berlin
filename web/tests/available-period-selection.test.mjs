import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const built=await build({stdin:{contents:"export {selectAvailablePeriod} from './available-period-selection';",resolveDir:new URL('../src/safety/',import.meta.url).pathname},bundle:true,platform:'node',format:'esm',write:false});
const {selectAvailablePeriod}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

test('year 2000 with only November replaces an unavailable October without inventing a package',()=>{
  const months=Object.freeze({'2026-10':Object.freeze({count:20}),'2000-11':Object.freeze({count:1})});
  assert.deepEqual(selectAvailablePeriod(months,'2000','10'),{
    available:true,year:'2000',month:'11',key:'2000-11',months:['11'],
  });
  assert.deepEqual(Object.keys(months),['2026-10','2000-11']);
});

test('an available current month survives year changes and restored selections, including an empty saved package',()=>{
  const months={'2026-10':{count:10},'2000-11':{count:0},'2000-12':{count:1}};
  const before=JSON.stringify(months);
  const selection=selectAvailablePeriod(months,'2000','11');
  assert.deepEqual(selection,{available:true,year:'2000',month:'11',key:'2000-11',months:['11','12']});
  assert.deepEqual(selectAvailablePeriod(months,selection.year,selection.month),selection);
  assert.equal(JSON.stringify(months),before);
});

test('sparse saved months sort chronologically and fall back to the latest actual package',()=>{
  const months={'2026-09':{},'2025-12':{},'2026-01':{},'2026-12':{},
    '2026-00':{},'2026-13':{},'2026-all':{},'2026-1':{}};
  assert.deepEqual(selectAvailablePeriod(months,'2026','03'),{
    available:true,year:'2026',month:'12',key:'2026-12',months:['01','09','12'],
  });
});

test('all-year means the saved months of that year and stays explicit',()=>{
  const months={'2026-10':{},'2026-03':{},'2000-11':{}};
  assert.deepEqual(selectAvailablePeriod(months,'2026','all'),{
    available:true,year:'2026',month:'all',key:'2026-all',months:['03','10'],
  });
  assert.equal(selectAvailablePeriod(months,'2000','all').key,'2000-all');
  assert.equal(selectAvailablePeriod(months,'2026','all',{allowAll:false}).key,'2026-10');
  assert.equal(selectAvailablePeriod(months,'2026','invalid').key,'2026-10');
});

test('a year with no saved package is unavailable even when all-year was requested',()=>{
  const unavailable={available:false,year:'2000',month:undefined,key:undefined,months:[]};
  assert.deepEqual(selectAvailablePeriod({'2026-10':{}},'2000','10'),unavailable);
  assert.deepEqual(selectAvailablePeriod({'2026-10':{}},'2000','all'),unavailable);
  assert.deepEqual(selectAvailablePeriod({},'2000','all'),unavailable);
  assert.deepEqual(selectAvailablePeriod({'2000-all':{},'2000-00':{},'2000-13':{}},'2000','all'),unavailable);
});
