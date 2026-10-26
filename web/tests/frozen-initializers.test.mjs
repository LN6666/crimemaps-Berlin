import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const web=fileURLToPath(new URL('../',import.meta.url)),source=path.join(web,'src/safety');
const require=createRequire(new URL('../package.json',import.meta.url));
const {build:esbuild}=require('esbuild');
const core=await readFile(path.join(source,'frozen-paint-initializer-store.ts'),'utf8');
const built=await esbuild({stdin:{contents:core,resolveDir:source,sourcefile:'frozen-paint-initializer-store.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false});
const {createFrozenInitializerStore}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixture=(value)=>{const bytes=new TextEncoder().encode(value),sha256=sha(bytes);return{bytes,d:{path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:bytes.length}};};
const file=n=>`painted/root500/safety/owner-test${n}.ts`,signal=()=>new AbortController().signal;
const selection=rows=>({tables:[...new Set(rows.map(r=>r.f.d.sha256))],initializers:rows.reduce((out,{f,file})=>{const row=out[f.d.sha256]??={};row[file]=(row[file]??0)+1;return out;},{})});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deadline=(promise)=>{let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Initializer deadline: possible deadlock')),2000))]).finally(()=>clearTimeout(timer));};

test('independent ready initializers consume at most two module inputs and parse each exactly once',async()=>{
 const fixtures=Array.from({length:24},(_,i)=>fixture(JSON.stringify({id:i,value:'x'.repeat(4000+i)}))),rows=fixtures.map((f,i)=>({f,file:file(i)})),store=createFrozenInitializerStore(fixtures.map(f=>f.d));
 const session=store.begin(async(p,s)=>{await tick();s.throwIfAborted();return fixtures.find(f=>f.d.path===p).bytes;},signal(),selection(rows));
 const values=await deadline(session.wait(Promise.all(rows.map(({f,file})=>store.read(f.d.sha256,file)))));assert.equal(values.length,24);assert.equal(values[23].id,23);assert.equal(store.stats.parses,24);assert.equal(store.stats.reads,24);assert.equal(store.stats.peakConcurrentModules,2);assert.equal(store.stats.retainedBytes,0);assert(store.stats.peakLiveRawInputBytes<=fixtures.at(-1).d.bytes+fixtures.at(-2).d.bytes);assert.equal(store.stats.ownedTimers,0);session.close();
});

test('two independent initializers sharing a table get separate native JSON values and one physical read',async()=>{
 const f=fixture('{"n":-0,"p":0.1234567890123456,"array":[1,2,3]}'),store=createFrozenInitializerStore([f.d]),rows=[{f,file:file('a')},{f,file:file('b')}];
 const session=store.begin(async()=>f.bytes,signal(),selection(rows));const a=store.read(f.d.sha256,rows[0].file),b=store.read(f.d.sha256,rows[1].file),[one,two]=await session.wait(Promise.all([a,b]));one.array[0]=99;assert.equal(two.array[0],1);assert(Object.is(two.n,-0));assert.equal(two.p,0.1234567890123456);assert.equal(store.stats.reads,1);assert.equal(store.stats.parses,2);assert.equal(store.stats.retainedBytes,0);session.close();
});

test('cancellation parks pending module work without poisoning it and explicit retry completes each initializer once',async()=>{
 const f=fixture('{"ready":true}'),store=createFrozenInitializerStore([f.d]),rows=[{f,file:file('cancel')}],controller=new AbortController();let started=false;
 const first=store.begin(async(_p,s)=>{started=true;await new Promise((_,reject)=>s.addEventListener('abort',()=>reject(s.reason),{once:true}));return f.bytes;},controller.signal,selection(rows));
 const value=store.read(f.d.sha256,rows[0].file),waiting=assert.rejects(first.wait(value),/abort/i);await tick();assert(started);controller.abort();await waiting;await tick();assert.equal(store.stats.sessionActive,false);assert.equal(store.stats.active,0);assert.equal(store.stats.retainedBytes,0);assert.equal(store.stats.parses,0);
 const retry=store.begin(async()=>f.bytes,signal(),selection(rows));assert.deepEqual(await deadline(retry.wait(value)),{ready:true});assert.equal(store.stats.parses,1);retry.close();
});

test('hash failure rejects the owner request but the identical parked initializer resumes after a valid retry',async()=>{
 const f=fixture('{"ok":true}'),store=createFrozenInitializerStore([f.d]),rows=[{f,file:file('retry')}];
 const bad=store.begin(async()=>new Uint8Array(f.bytes.length),signal(),selection(rows)),value=store.read(f.d.sha256,rows[0].file);await assert.rejects(bad.wait(value),/hash mismatch/);await tick();assert.equal(store.stats.parses,0);assert.equal(store.stats.active,0);
 const good=store.begin(async()=>f.bytes,signal(),selection(rows));assert.deepEqual(await deadline(good.wait(value)),{ok:true});assert.equal(store.stats.parses,1);assert.equal(store.stats.failures,1);good.close();
});

async function esmFixture(t,{retry=false,vite=false}={}){
 const dir=await mkdtemp(path.join(tmpdir(),'crimemaps-stream-esm-'));t.after(()=>rm(dir,{recursive:true,force:true}));await writeFile(path.join(dir,'package.json'),'{"type":"module"}');
 const a=fixture('{"name":"a","n":-0}'),b=fixture('{"name":"b"}'),rows=[{f:a,file:file('esm-a')},{f:b,file:file('esm-b')}],store=createFrozenInitializerStore([a.d,b.d]);
 const key='__crimemapsStream'+Math.random().toString(16).slice(2);globalThis[key]=(hash,file)=>store.read(hash,file);t.after(()=>delete globalThis[key]);
 await writeFile(path.join(dir,'a.mjs'),`import {b} from './b.mjs'; export function getB(){return b;} export const a=await globalThis[${JSON.stringify(key)}](${JSON.stringify(a.d.sha256)},${JSON.stringify(rows[0].file)});`);
 await writeFile(path.join(dir,'b.mjs'),`import {getB} from './a.mjs'; export function aHelper(){return getB;} export const b=await globalThis[${JSON.stringify(key)}](${JSON.stringify(b.d.sha256)},${JSON.stringify(rows[1].file)});`);
 let entry=path.join(dir,'a.mjs');
 if(vite){const {build}=await import(pathToFileURL(require.resolve('vite')).href);await build({root:dir,configFile:false,logLevel:'silent',build:{target:'es2022',minify:false,write:true,outDir:path.join(dir,'dist'),rollupOptions:{input:entry,treeshake:false,preserveEntrySignatures:'strict',output:{entryFileNames:'entry.mjs',chunkFileNames:'[name].mjs',onlyExplicitManualChunks:true,manualChunks:id=>id.endsWith('/b.mjs')?'cycle-b':undefined}}}});entry=path.join(dir,'dist/entry.mjs');const code=await readFile(entry,'utf8');assert(code.includes('await'));}
 const read=async(p,s)=>{await tick();s.throwIfAborted();return (p===a.d.path?a:b).bytes;};
 const first=store.begin(retry?async p=>new Uint8Array((p===a.d.path?a:b).bytes.length):read,signal(),selection(rows)),importing=import(pathToFileURL(entry).href);
 if(retry){await assert.rejects(first.wait(importing),/hash mismatch/);await tick();const again=store.begin(read,signal(),selection(rows));const mod=await deadline(again.wait(importing));assert.equal(mod.a.name,'a');assert(Object.is(mod.a.n,-0));assert.equal(mod.getB().name,'b');assert.equal(store.stats.parses,2);again.close();}
 else{const mod=await deadline(first.wait(importing));assert.equal(mod.a.name,'a');assert.equal(mod.getB().name,'b');assert.equal(store.stats.parses,2);first.close();}
}

test('native ESM static dependency cycle completes without a held module permit',async t=>esmFixture(t));
test('native ESM evaluation survives transient input failure and the same import promise resumes',async t=>esmFixture(t,{retry:true}));
test('Vite ES2022 output with manual chunks preserves top-level-await cycle evaluation',async t=>esmFixture(t,{vite:true}));

test('manual bucket groups can create a false async chunk cycle; one chunk per async dependency preserves the source DAG',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'crimemaps-tla-chunks-'));t.after(()=>rm(dir,{recursive:true,force:true}));await writeFile(path.join(dir,'package.json'),'{"type":"module"}');
 const key='__crimemapsDag'+Math.random().toString(16).slice(2);globalThis[key]=async value=>({value});t.after(()=>delete globalThis[key]);
 const call=value=>`(await globalThis[${JSON.stringify(key)}](${value})).value`;
 await writeFile(path.join(dir,'a.mjs'),`import {b} from './b.mjs';export const a=${call(1)}+b;`);await writeFile(path.join(dir,'b.mjs'),`export const b=${call(2)};`);
 await writeFile(path.join(dir,'c.mjs'),`import {d} from './d.mjs';export const c=${call(3)}+d;`);await writeFile(path.join(dir,'d.mjs'),`export const d=${call(4)};`);await writeFile(path.join(dir,'entry.mjs'),"export {a} from './a.mjs';export {c} from './c.mjs';");
 const {build}=await import(pathToFileURL(require.resolve('vite')).href);
 const buildAt=async(name,manualChunks)=>{await build({root:dir,configFile:false,logLevel:'silent',build:{target:'es2022',minify:false,outDir:path.join(dir,name),rollupOptions:{input:path.join(dir,'entry.mjs'),treeshake:false,preserveEntrySignatures:'strict',output:{entryFileNames:'entry.mjs',chunkFileNames:'[name].mjs',onlyExplicitManualChunks:true,manualChunks}}}});return import(pathToFileURL(path.join(dir,name,'entry.mjs')).href);};
 await assert.rejects(buildAt('buckets',id=>/[ad]\.mjs$/.test(id)?'x':/[bc]\.mjs$/.test(id)?'y':undefined),/before initialization|circular|deadlock|not defined/i);
 const good=await deadline(buildAt('exact',id=>/[abcd]\.mjs$/.test(id)?path.basename(id,'.mjs'):undefined));assert.equal(good.a,3);assert.equal(good.c,7);
});

test('close cancels an owner wait even if its reader ignores abort, and retry is not blocked by that old promise',async()=>{
 const f=fixture('{"late":true}'),rows=[{f,file:file('ignores-abort')}],store=createFrozenInitializerStore([f.d]);
 const first=store.begin(()=>new Promise(()=>{}),signal(),selection(rows)),value=store.read(f.d.sha256,rows[0].file),rejected=assert.rejects(first.wait(value),/abort/i);await tick();first.close();await rejected;await tick();assert.equal(store.stats.active,0);assert.equal(store.stats.declaredInFlightRawBytes,0);const retry=store.begin(async()=>f.bytes,signal(),selection(rows));assert.deepEqual(await deadline(retry.wait(value)),{late:true});retry.close();
});

test('later module initializers remain supported after the initial import wait finishes and after suspension/resume',async()=>{
 const f=fixture('{"later":true}'),rows=[{f,file:file('initial')},{f,file:file('later')}],store=createFrozenInitializerStore([f.d]);
 const first=store.begin(async()=>f.bytes,signal(),selection(rows));assert.deepEqual(await first.wait(store.read(f.d.sha256,rows[0].file)),{later:true});assert.equal(first.active,true);assert.equal(store.stats.retainedBytes,f.bytes.length);first.close();assert.equal(store.stats.retainedBytes,0);
 const later=store.read(f.d.sha256,rows[1].file);await tick();assert.equal(store.stats.active,0);const resumed=store.begin(async()=>f.bytes,signal(),selection(rows));assert.deepEqual(await deadline(resumed.wait(later)),{later:true});assert.equal(store.stats.parses,2);assert.equal(store.stats.retainedBytes,0);resumed.close();
});

test('painted-map cancels cold import ownership, retries the same import, and maintains late-reader sessions through 2D/suspend/resume/destroy',async t=>{
 const names={begin:'__begin'+Math.random().toString(16).slice(2),factory:'__factory'+Math.random().toString(16).slice(2),gate:'__gate'+Math.random().toString(16).slice(2)};
 const savedDocument=globalThis.document,savedLocation=globalThis.location;globalThis.document={hidden:false};globalThis.location={hostname:'test.invalid'};t.after(()=>{globalThis.document=savedDocument;globalThis.location=savedLocation;for(const key of Object.values(names))delete globalThis[key];});
 const store=createFrozenInitializerStore([]),sessions=[],calls=[];let releaseGate,created=0;globalThis[names.gate]=new Promise(resolve=>releaseGate=resolve);
 globalThis[names.begin]=(read,signal,_providers,onFailure)=>{const session=store.begin(read,signal,{tables:[],initializers:{}},onFailure);sessions.push(session);return session;};
 globalThis[names.factory]=(provider,options)=>{created++;let mode='2d';const renderer={layer:{id:provider},stats:{vertices:3,components:1},getRevision:()=>({generation:1,viewRevision:1}),setPageHidden(){},setReducedMotion(){},setOpacityContext(){},diagnosticScreenSamples:()=>[],isPickReady:()=>true};return{async requestMode(next,signal){signal.throwIfAborted();calls.push([provider,next,options.manageCamera]);mode=next;options.onRenderer?.(renderer);return{mode,status:'ready'};},get mode(){return mode;},setPageHidden(){},setReducedMotion(){},setOpacityContext(){},cacheStats:()=>({}),suspend(){},resume(){},destroy(){calls.push([provider,'destroy']);}};};
 const contents=await readFile(path.join(source,'painted-map.ts'),'utf8');
 const result=await esbuild({stdin:{contents,resolveDir:source,sourcefile:'painted-map.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,plugins:[{name:'stream-map-lifecycle',setup(build){build.onResolve({filter:/^\.\/frozen-paint-tables$/},()=>({path:'store',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const beginFrozenPaintTableInitialization=(...args)=>globalThis[${JSON.stringify(names.begin)}](...args);export const frozenPaintTableStats=()=>({});`,loader:'js'}));build.onResolve({filter:/painted\/[^/]+\/safety\/(?:three-dimensional-map|building-mesh-renderer)$/},args=>({path:args.path,namespace:'provider'}));build.onLoad({filter:/.*/,namespace:'provider'},args=>({contents:`await globalThis[${JSON.stringify(names.gate)}]; export const installThreeDimensionalMap=options=>globalThis[${JSON.stringify(names.factory)}](${JSON.stringify(args.path.split('/painted/')[1].split('/')[0])},options);`,loader:'js'}));}}]});
 const {installThreeDimensionalMap}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));const manager=installThreeDimensionalMap({map:{},city:'berlin',fetchBytes:async()=>new Uint8Array([1])});
 const first=manager.requestMode('3d',signal()),canceled=assert.rejects(first,/abort/i);await tick();await manager.requestMode('2d',signal());await canceled;assert.equal(created,0);assert.equal(store.stats.sessionActive,false);
 const retry=manager.requestMode('3d',signal());releaseGate();await deadline(retry);assert.equal(created,5);assert.equal(store.stats.sessionActive,true);assert.equal(calls.filter(row=>row[2]===true).length,1);
 manager.suspend();assert.equal(store.stats.sessionActive,false);manager.resume();assert.equal(store.stats.sessionActive,true);await manager.requestMode('2d',signal());assert.equal(store.stats.sessionActive,false);await manager.requestMode('3d',signal());assert.equal(store.stats.sessionActive,true);assert.equal(created,5);manager.destroy();assert.equal(store.stats.sessionActive,false);assert.equal(calls.filter(row=>row[1]==='destroy').length,5);
});
