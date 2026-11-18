import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const output=await build({entryPoints:[new URL('../src/safety/viewport-request.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const {createViewportRequestContinuation}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const publication=()=>createViewportRequestContinuation(()=>false).publication(new AbortController().signal,()=>{});

test('closing during final publication cooldown prevents a late restart',{timeout:3000},async()=>{
 const p=publication(),calls=[];
 const final=p.finish(()=>calls.push('late'));
 const rejected=assert.rejects(final,{name:'AbortError'});
 await p.close();await rejected;
 assert.deepEqual(calls,[]);
});

test('staged updates retain only the latest callback while a publication is active',{timeout:3000},async()=>{
 const p=publication(),started=deferred(),release=deferred(),last=deferred(),calls=[];
 p.stage(async attempt=>{calls.push('first');started.resolve();await release.promise;assert.equal(attempt.signal.aborted,false);});
 await started.promise;
 p.stage(()=>calls.push('obsolete'));
 p.stage(()=>{calls.push('latest');last.resolve();});
 await tick();assert.deepEqual(calls,['first']);release.resolve();await last.promise;await p.close();
 assert.deepEqual(calls,['first','latest']);
});

test('failed draw aborts its producer and drains cleanup before a staged successor',{timeout:3000},async()=>{
 const p=publication(),started=deferred(),fail=deferred(),aborted=deferred(),cleanup=deferred(),reported=deferred(),next=deferred();
 const failure=Error('draw deadline'),calls=[];
 p.stage(async attempt=>{
  const producer=new Promise(resolve=>attempt.signal.addEventListener('abort',async()=>{aborted.resolve();await cleanup.promise;calls.push('cleanup');resolve();},{once:true}));
  p.trackPreparation(attempt,producer);started.resolve();await fail.promise;throw failure;
 },error=>{assert.equal(error,failure);reported.resolve();});
 await started.promise;p.stage(()=>{calls.push('next');next.resolve();});fail.resolve();
 await Promise.all([aborted.promise,reported.promise]);await tick();assert.deepEqual(calls,[]);
 cleanup.resolve();await next.promise;await p.close();assert.deepEqual(calls,['cleanup','next']);
});

test('final publication waits for superseded work to release its resources',{timeout:3000},async()=>{
 const p=publication(),started=deferred(),aborted=deferred(),cleanup=deferred(),calls=[];
 p.stage(async attempt=>{
  const producer=new Promise(resolve=>attempt.signal.addEventListener('abort',async()=>{aborted.resolve();await cleanup.promise;calls.push('cleanup');resolve();},{once:true}));
  p.trackPreparation(attempt,producer);started.resolve();await producer;
 });
 await started.promise;const final=p.finish(()=>{calls.push('final');});
 await aborted.promise;await tick();assert.deepEqual(calls,[]);cleanup.resolve();await final;await p.close();
 assert.deepEqual(calls,['cleanup','final']);
});
