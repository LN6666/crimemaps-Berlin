import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {cityLoadShard} from './support/fixtures3-city-load-shard.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(path.join(root,'web/package.json')),{build}=require('esbuild'),ts=require('typescript');
const original=path.join(root,'web/src/painted/city/safety'),candidate=original;
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fixtureSource=await fs.readFile(path.join(original,'c358-fixture.ts'),'utf8');
// Decode this bounded, unchanged sample independently; never run the complete map or frozen initializer graph.
const fixtureAst=ts.createSourceFile('fixture.ts',fixtureSource,ts.ScriptTarget.Latest,true);
let literal;function findLiteral(n){if(ts.isCallExpression(n)&&n.expression.getText(fixtureAst)==='JSON.parse'&&ts.isStringLiteral(n.arguments[0]))literal=n.arguments[0].text;ts.forEachChild(n,findLiteral);}findLiteral(fixtureAst);assert.ok(literal);
const fixture=JSON.parse(literal),identity={city:fixture.patch.city,objectId:fixture.patch.objectId,partId:fixture.patch.partId};
const overrides={name:'private-c358-source',setup(b){b.onLoad({filter:/\/c358-fixture\.ts$/},()=>({contents:'globalThis.__c358Loads=(globalThis.__c358Loads??0)+1;\n'+fixtureSource,loader:'ts',resolveDir:original}));}};
test('C358 fixture is absent from the eager module graph, loads only for its exact visible owner, and keeps every material/geometry value',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'crimemaps-c358-'));
 try{
  const output=await build({entryPoints:[path.join(original,'c358-display.ts')],bundle:true,splitting:true,write:true,outdir:dir,entryNames:'entry',chunkNames:'chunk-[hash]',outExtension:{'.js':'.mjs'},format:'esm',platform:'node',metafile:true,plugins:[overrides],logLevel:'silent'});
  const entry=Object.entries(output.metafile.outputs).find(([,value])=>value.entryPoint?.endsWith('c358-display.ts'));
  assert.ok(entry);assert.ok(entry[1].imports.some(i=>i.kind==='dynamic-import'));assert.ok(!Object.keys(entry[1].inputs).some(p=>p.endsWith('c358-fixture.ts')));
  globalThis.__c358Loads=0;const api=await import(pathToFileURL(path.join(dir,'entry.mjs')).href);assert.equal(globalThis.__c358Loads,0);
  await api.prepareC358MaterialBinding([{...identity,city:'berlin'}],new AbortController().signal);
  await api.prepareC358MaterialBinding([{...identity,partId:identity.partId+'-other'}],new AbortController().signal);
  assert.equal(globalThis.__c358Loads,0);const aborted=new AbortController();aborted.abort();await assert.rejects(api.prepareC358MaterialBinding([identity],aborted.signal),{name:'AbortError'});assert.equal(globalThis.__c358Loads,0);
  const component=structuredClone(fixture.patch),before=digest(component);await api.prepareC358MaterialBinding([component],new AbortController().signal);assert.equal(globalThis.__c358Loads,1);assert.equal(api.c358HasMaterialBinding(component),true);
  const count=component.batches.reduce((n,b)=>n+b.positions.length/3,0),colors=new Float32Array(count*4),frames=new Float32Array(count*5),context={city:'munich',indexSHA:fixture.indexSHA,sourcePBF:fixture.sourcePBF,boundarySHA:fixture.boundarySHA,sourceSnapshot:fixture.sourceSnapshot,pathsReady:{color:true},materialReady:()=>true};
  const result=api.applyC358MaterialFrames([component],colors,frames,context);
  assert.deepEqual(colors,new Float32Array(fixture.patchColors.flat()));assert.deepEqual(frames,new Float32Array(fixture.patchFrames.flat()));assert.equal(result.geometryAdded,fixture.newGeometryVertices);assert.equal(digest(component),before);
  await api.prepareC358MaterialBinding([component],new AbortController().signal);assert.equal(globalThis.__c358Loads,1);
  assert.equal(api.c358HasMaterialBinding({...component,origin:[0,0]}),false);
 }finally{delete globalThis.__c358Loads;await fs.rm(dir,{recursive:true,force:true});}
});
// The City manager's source production is loadShard: its inline materials and paint-initialization
// wait run first, then the C358 material module import chosen by the city alone -- both before any
// source lease or metadata charge (src-r3b; DECISIONS 2026-11-02 03:25 and "第三段第二轮结项") --
// then the source, then the synchronous C358 rows binding, owner verification and the published value
// ("cache"). An abort during the module import prevents the source lease and the commit: the stub
// import only awaits (it never throws), so the AbortError and the missing acquire attempt prove that
// loadShard's own abort check after the import stops it before the source is even requested.
test('actual city shard loader awaits C358 preparation before owner verification/cache and abort still prevents commit',async()=>{
 for(const cancel of [false,true]){
  const awaitInitialization=operation=>operation;
  let resume;const wait=new Promise(resolve=>resume=resolve),events=[],controller=new AbortController(),rows=[structuredClone(fixture.patch)];
  const api=cityLoadShard({rows,events,ownerProfile:{number:'C358'},awaitPaintInitialization:awaitInitialization,
   prepareC358MaterialModule:async(city,signal)=>{assert.equal(city,'munich');assert.equal(signal,controller.signal);events.push('c358-module');await wait;},
   bindC358MaterialRows:actual=>{assert.equal(actual,rows,'the binding receives the very rows the source produced');events.push('c358-bind');},
   prepareInlineCityMaterials:async(city,signal,waitForInitialization)=>{assert.equal(city,'munich');assert.equal(signal,controller.signal);assert.equal(waitForInitialization,awaitInitialization);signal.throwIfAborted();events.push('inline');await waitForInitialization(Promise.resolve());}});
  const pending=api.loadShard({tile_key:'target',path:'owner-shape-C358',sha256:'a'.repeat(64),bytes:5},controller.signal);for(let i=0;i<8;i++)await Promise.resolve();assert.deepEqual(events,['inline','c358-module'],'the C358 module import is awaited before any source lease');assert.equal(api.loadCount,0);assert.deepEqual(api.adjusted,[],'nothing is charged while the import is awaited');
  if(cancel)controller.abort();resume();if(cancel){await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(events,['inline','c358-module']);assert.equal(api.acquireAttempts,0,'loadShard itself stops after the import, before requesting the source');assert.equal(api.loadCount,0);assert.deepEqual(api.releases,[],'the aborted production never took a source lease, so it has none to return');assert.deepEqual(api.adjusted,[]);}else{assert.equal((await pending).components,rows);assert.deepEqual(events,['inline','c358-module','source','c358-bind','verify','cache']);assert.equal(api.acquireAttempts,1);assert.equal(api.loadCount,1);assert.deepEqual(api.releases,[],'a published value keeps its source lease');}
 }
});
