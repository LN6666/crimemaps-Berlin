import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/safety/visible-preparation-gate.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {createVisiblePreparationGate}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const tick=()=>new Promise(r=>setImmediate(r));
const observe=p=>p.then(value=>({value}),error=>({error}));
test('one active preparation, at most one latest pending job per each of seven providers',async()=>{
 const g=createVisiblePreparationGate(),hold=deferred(),first=g.run('city',new AbortController().signal,()=>hold.promise);await tick();
 const keys=['city','root500','tier300','delegated500','church','bremen','infill'],started=[],old=[];
 const latest=keys.map(key=>{old.push(observe(g.run(key,new AbortController().signal,async()=>{throw Error('superseded job entered');})));return g.run(key,new AbortController().signal,async()=>{started.push(key);assert.equal(g.stats.active,1);return key;});});
 assert.equal(g.stats.queued,7);assert.equal(g.stats.peakQueued,7);assert.equal(started.length,0);
 assert((await Promise.all(old)).every(r=>r.error?.name==='AbortError'));
 hold.resolve();await first;assert.deepEqual(await Promise.all(latest),keys);assert.deepEqual(started,keys);assert(g.idle);assert.equal(g.stats.peakActive,1);g.destroy();
});
test('queued abort removes work immediately without admission',async()=>{
 const g=createVisiblePreparationGate(),hold=deferred(),a=g.run('city',new AbortController().signal,()=>hold.promise);await tick();
 const c=new AbortController();let entered=false;const b=observe(g.run('root500',c.signal,async()=>{entered=true;}));c.abort();
 assert.equal((await b).error.name,'AbortError');assert.equal(g.stats.queued,0);assert.equal(entered,false);hold.resolve();await a;g.destroy();
});
test('active abort does not release slot until owner cleanup has really settled',async()=>{
 const g=createVisiblePreparationGate(),hold=deferred(),c=new AbortController();let cleaned=false,entered=false;
 const a=observe(g.run('city',c.signal,async()=>{try{await hold.promise;}finally{cleaned=true;}}));await tick();
 const b=g.run('church',new AbortController().signal,async()=>{entered=true;assert(cleaned);});c.abort();await tick();assert.equal(entered,false);assert.equal(g.stats.active,1);
 hold.resolve();assert.equal((await a).error.name,'AbortError');await b;assert(g.idle);g.destroy();
});
test('original failure survives cleanup; next provider still runs',async()=>{
 const g=createVisiblePreparationGate(),failure=new Error('original source failure'),hold=deferred(),a=observe(g.run('city',new AbortController().signal,async()=>{try{throw failure;}finally{await hold.promise;}}));await tick();
 let entered=false;const b=g.run('infill',new AbortController().signal,async()=>{entered=true;});await tick();assert.equal(entered,false);hold.resolve();assert.equal((await a).error,failure);await b;g.destroy();
});
test('destroy rejects queued jobs but active owner retains slot through its drain',async()=>{
 const g=createVisiblePreparationGate(),hold=deferred(),owner=new AbortController(),a=observe(g.run('city',owner.signal,()=>hold.promise));await tick();let entered=false;
 const b=observe(g.run('bremen',new AbortController().signal,async()=>{entered=true;}));g.destroy();owner.abort();assert.equal((await b).error.name,'AbortError');assert.equal(g.stats.active,1);assert.equal(g.stats.queued,0);
 hold.resolve();assert.equal((await a).error.name,'AbortError');assert.equal(entered,false);assert(g.idle);assert.equal((await observe(g.run('city',new AbortController().signal,async()=>0))).error.name,'AbortError');
});
