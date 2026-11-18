import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const built=await build({entryPoints:[new URL('../src/safety/resident-draw-readiness.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm'});
const {waitForResidentDraw}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

async function controlled(run){
 const descriptors=Object.fromEntries(['performance','document'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const previousTimeout=globalThis.setTimeout,previousClear=globalThis.clearTimeout;
 let now=0,sequence=0,state={ready:false,preparing:true},reads=0;
 const timers=new Map(),renders=new Set(),visibility=new Set(),observations=[],controller=new AbortController();
 const document={hidden:false,addEventListener:(_event,fn)=>visibility.add(fn),removeEventListener:(_event,fn)=>visibility.delete(fn)};
 Object.defineProperty(globalThis,'document',{configurable:true,value:document});
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
 globalThis.setTimeout=(fn,ms)=>{const id=++sequence;timers.set(id,{at:now+ms,fn});return id;};
 globalThis.clearTimeout=id=>timers.delete(id);
 const map={on:(_event,fn)=>renders.add(fn),off:(_event,fn)=>renders.delete(fn),isMoving:()=>false,triggerRepaint(){}};
 const h={
  start(overrides={}){return waitForResidentDraw({map,signal:controller.signal,current(){},renderer:()=>({getDrawReadiness(){reads++;return state;}}),drawTimeoutMs:8000,observe:value=>observations.push(value),...overrides}).then(()=>({ready:true}),error=>({error}));},
  state(value){state=value;},render(){for(const fn of [...renders])fn();},
  advance(ms){const end=now+ms;for(;;){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;timers.delete(next[0]);now=next[1].at;next[1].fn();}now=end;},
  hidden(value){document.hidden=value;for(const fn of [...visibility])fn();},
  controller,observations,reads:()=>reads,
  cleaned(){assert.equal(timers.size,0);assert.equal(renders.size,0);assert.equal(visibility.size,0);},
 };
 try{await run(h);}finally{
  controller.abort();globalThis.setTimeout=previousTimeout;globalThis.clearTimeout=previousClear;
  for(const [key,value]of Object.entries(descriptors))if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];
 }
}

for(const budget of [8000,15000])test('unfinished compilation continues beyond the original threshold '+budget+'ms, with its preparation stage',()=>controlled(async h=>{
 const result=h.start({drawTimeoutMs:budget});h.advance(budget-1);assert.equal(h.observations.at(-1).phase,'waiting');
 h.advance(1);assert.equal(h.observations.at(-1).phase,'threshold-exceeded');
 assert.equal(h.observations.at(-1).stage,'preparing');
 assert.deepEqual(h.observations.at(-1).timing,{startedAtMs:0,observedAtMs:budget,elapsedWallMs:budget,visibleBudgetMs:budget});
 h.advance(2345);h.state({ready:true,preparing:false});h.render();assert.deepEqual(await result,{ready:true});
 assert.equal(h.observations.at(-1).threshold.visibleOverrunMs,2345);h.cleaned();
}));

test('phase changes never reset or extend the original readiness budget',()=>controlled(async h=>{
 h.advance(1234);const result=h.start();
 assert.deepEqual(h.observations.at(-1).timing,{startedAtMs:1234,observedAtMs:1234,elapsedWallMs:0,visibleBudgetMs:8000});
 h.advance(6000);h.state({ready:false,preparing:false});h.render();
 assert.deepEqual(h.observations.at(-1).timing,{startedAtMs:1234,observedAtMs:7234,elapsedWallMs:6000,visibleBudgetMs:8000});
 h.advance(500);h.state({ready:false,preparing:true});h.render();
 h.advance(500);h.state({ready:false,preparing:false});h.render();
 h.advance(1000);assert.equal(h.observations.at(-1).phase,'threshold-exceeded');
 assert.equal(h.observations.at(-1).stage,'drawing');
 assert.deepEqual(h.observations.at(-1).timing,{startedAtMs:1234,observedAtMs:9234,elapsedWallMs:8000,visibleBudgetMs:8000});
 assert(h.observations.every(value=>value.timing.startedAtMs===1234),'stage transitions retain this attempt start');h.advance(125);h.state({ready:true,preparing:false});h.render();assert.deepEqual(await result,{ready:true});h.cleaned();
}));

test('hidden time preserves the remaining budget and readiness can finish on resume',()=>controlled(async h=>{
 const result=h.start();h.advance(7000);h.hidden(true);const reads=h.reads();h.advance(12000);h.render();assert.equal(h.reads(),reads);
 assert.deepEqual(h.observations.at(-1).timing,{startedAtMs:0,observedAtMs:19000,elapsedWallMs:19000,visibleBudgetMs:8000});
 assert.equal(h.observations.at(-1).snapshot.pageVisible,false);
 h.state({ready:true,preparing:false});h.hidden(false);assert.deepEqual(await result,{ready:true});
 assert.deepEqual(h.observations.at(-1).timing,{startedAtMs:0,observedAtMs:19000,elapsedWallMs:19000,visibleBudgetMs:8000});h.cleaned();
}));

test('hidden wall time remains diagnostic while only the original visible budget is spent',()=>controlled(async h=>{
 h.advance(250);const result=h.start({drawTimeoutMs:15000});let settled=false;result.then(()=>{settled=true;});
 h.advance(14000);h.hidden(true);h.advance(12000);h.render();
 assert.deepEqual(h.observations.at(-1).timing,{startedAtMs:250,observedAtMs:26250,elapsedWallMs:26000,visibleBudgetMs:15000});
 h.hidden(false);h.advance(999);await Promise.resolve();assert.equal(settled,false);
 h.advance(1);assert.equal(h.observations.at(-1).phase,'threshold-exceeded');
 assert.deepEqual(h.observations.at(-1).timing,{startedAtMs:250,observedAtMs:27250,elapsedWallMs:27000,visibleBudgetMs:15000});
 h.hidden(true);h.advance(5000);h.state({ready:true,preparing:false});h.hidden(false);assert.deepEqual(await result,{ready:true});assert.equal(h.observations.at(-1).threshold.visibleOverrunMs,0);h.cleaned();
}));

test('successive waits record their own attempt clocks without rewriting an earlier observation',()=>controlled(async h=>{
 h.advance(1000);h.state({ready:true,preparing:false});assert.deepEqual(await h.start(),{ready:true});
 const first=h.observations.at(-1);h.cleaned();
 h.advance(500);h.state({ready:false,preparing:true});const second=h.start();
 assert.deepEqual(h.observations.at(-1).timing,{startedAtMs:1500,observedAtMs:1500,elapsedWallMs:0,visibleBudgetMs:8000});
 h.advance(250);h.state({ready:true,preparing:false});h.render();assert.deepEqual(await second,{ready:true});
 assert.deepEqual(first.timing,{startedAtMs:1000,observedAtMs:1000,elapsedWallMs:0,visibleBudgetMs:8000});
 assert.deepEqual(h.observations.at(-1).timing,{startedAtMs:1500,observedAtMs:1750,elapsedWallMs:250,visibleBudgetMs:8000});h.cleaned();
}));

test('an old pickable view cannot complete the current main readiness wait',()=>controlled(async h=>{
 let current={ready:false,preparing:true},legacyPickReads=0;
 const renderer={isPickReady(){legacyPickReads++;return true;},getDrawReadiness:()=>current};
 const result=h.start({renderer:()=>renderer});
 assert.equal(h.observations.at(-1).phase,'waiting');assert.equal(h.observations.at(-1).snapshot.pickReady,false);
 h.advance(7000);h.render();assert.equal(h.observations.at(-1).phase,'waiting');assert.equal(legacyPickReads,0);
 current={ready:true,preparing:false};h.render();assert.deepEqual(await result,{ready:true});
 assert.equal(h.observations.at(-1).timing.elapsedWallMs,7000);assert.equal(legacyPickReads,0);h.cleaned();
}));

test('current failures and cancellation end the wait and release its listeners',async()=>{
 await controlled(async h=>{h.state({ready:false,preparing:false,failure:'bremen colour:6277 fragment-submit: driver failure'});const result=await h.start();assert.match(result.error.message,/colour:6277 fragment-submit: driver failure/);h.cleaned();});
 await controlled(async h=>{const result=h.start(),reason=Error('superseded viewport');h.controller.abort(reason);assert.equal((await result).error,reason);h.cleaned();});
 await controlled(async h=>{h.state({ready:true,preparing:false});const failure=Error('diagnostic callback failed'),result=await h.start({observe(){throw failure;}});assert.equal(result.error,failure);h.cleaned();});
});

test('cancellation after the threshold remains terminal and retains slow-load evidence',()=>controlled(async h=>{const result=h.start();h.advance(9000);h.controller.abort(Error('owner cancelled'));assert.match((await result).error.message,/owner cancelled/);assert.equal(h.observations.at(-1).threshold.visibleOverrunMs,1000);h.cleaned();}));

test('camera motion can exceed its 2s threshold and completes only after movement stops',()=>controlled(async h=>{
 let moving=true,settled=false;h.state({ready:true,preparing:false});
 const listeners=new Set(),map={on:(_event,fn)=>listeners.add(fn),off:(_event,fn)=>listeners.delete(fn),isMoving:()=>moving,triggerRepaint(){}};
 const result=h.start({map,drawTimeoutMs:2000});result.then(()=>{settled=true;});
 h.advance(62000);await Promise.resolve();assert.equal(settled,false);assert.equal(h.observations.at(-1).phase,'threshold-exceeded');
 moving=false;for(const fn of [...listeners])fn();assert.deepEqual(await result,{ready:true});
 assert.equal(h.observations.at(-1).timing.elapsedWallMs,62000);assert.equal(h.observations.at(-1).threshold.visibleOverrunMs,60000);assert.equal(listeners.size,0);h.cleaned();
}));
