import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';

const source=await readFile(new URL('../src/safety/capture-resource-demand.ts',import.meta.url),'utf8');
const {code}=await transform(source,{loader:'ts',format:'esm',target:'es2022'});
const {createCaptureResourceDemand}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

test('capture demand refreshes its current token and acquires the next source before retiring the previous source',()=>{
 const demand=createCaptureResourceDemand('reflection'),events=[],held=new Set();
 const receiver=name=>({setCaptureDemand(change){
  events.push({source:name,...change});
  const key=name+':'+change.token;
  if(change.active){if(name==='second')assert(held.has('first:matrix-a'),'old demand remains live while the next source acquires');held.add(key);}
  else held.delete(key);
 }}),first=receiver('first'),second=receiver('second');
 demand.activate(first,'matrix-a');demand.activate(first,'matrix-a');
 assert.deepEqual(events,[{source:'first',kind:'reflection',token:'matrix-a',active:true},{source:'first',kind:'reflection',token:'matrix-a',active:true}],'same-token activation reaches the source again for late providers');
 demand.activate(second,'matrix-b');
 assert.deepEqual(events.slice(-2),[{source:'second',kind:'reflection',token:'matrix-b',active:true},{source:'first',kind:'reflection',token:'matrix-a',active:false}]);
 assert.deepEqual([...held],['second:matrix-b']);demand.clear();demand.clear();
 assert.deepEqual(events.at(-1),{source:'second',kind:'reflection',token:'matrix-b',active:false});assert.equal(events.length,5);assert.equal(held.size,0);
});

test('capture demand retires the original receiver on replacement failure and clears the failed receiver exactly once',()=>{
 const demand=createCaptureResourceDemand('solar'),events=[],first={setCaptureDemand:change=>events.push({source:'first',...change})},failed={setCaptureDemand(change){events.push({source:'failed',...change});if(change.active)throw Error('tiny demand acquisition failure');}};
 demand.activate(first,'same-token');
 assert.throws(()=>demand.activate(failed,'same-token'),/tiny demand acquisition failure/);
 assert.deepEqual(events,[{source:'first',kind:'solar',token:'same-token',active:true},{source:'failed',kind:'solar',token:'same-token',active:true},{source:'first',kind:'solar',token:'same-token',active:false}]);
 demand.clear();demand.clear();
 assert.deepEqual(events.at(-1),{source:'failed',kind:'solar',token:'same-token',active:false});assert.equal(events.length,4);
 demand.activate({},'optional-receiver');demand.clear();assert.equal(events.length,4);
});
