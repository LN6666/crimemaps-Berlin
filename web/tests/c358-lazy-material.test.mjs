import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
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
test('actual city shard loader awaits C358 preparation before owner verification/cache and abort still prevents commit',async()=>{
 const source=await fs.readFile(path.join(candidate,'three-dimensional-map.ts'),'utf8'),ast=ts.createSourceFile('manager.ts',source,ts.ScriptTarget.Latest,true);let shard;
 function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='shard')shard=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.ok(shard);
 const names='cache,fetchBounded,checked,normalizeBuildingShard,city,maxVertices,prepareC358MaterialBinding,prepareInlineCityMaterials,options,ownerShapePatchProfile,manifest,manifestSHA,verifyOwnerShapePatchRows,ownerProfileByComponent,retainedShardCost,remember';
 const code=`export function scope(x){const {${names}}=x;let loadCount=0;${shard};return {shard,get loadCount(){return loadCount;}};}`;
 const built=await build({stdin:{contents:code,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});const {scope}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].contents).toString('base64'));
 for(const cancel of [false,true]){
  const awaitInitialization=operation=>operation;
  let resume;const wait=new Promise(resolve=>resume=resolve),events=[],controller=new AbortController(),rows=[structuredClone(fixture.patch)];
  const api=scope({cache:new Map(),fetchBounded:async()=>new Uint8Array(5),checked:async()=>({}),normalizeBuildingShard:()=>({components:rows,decodedPayloadCost:{retainedPayloadEstimateBytes:100}}),city:'munich',maxVertices:200000,prepareC358MaterialBinding:async(actual,signal)=>{assert.equal(actual,rows);assert.equal(signal,controller.signal);events.push('prepare');await wait;},options:{awaitPaintInitialization:awaitInitialization},prepareInlineCityMaterials:async(city,signal,waitForInitialization)=>{assert.equal(city,'munich');assert.equal(signal,controller.signal);assert.equal(waitForInitialization,awaitInitialization);signal.throwIfAborted();events.push('inline');await waitForInitialization(Promise.resolve());},ownerShapePatchProfile:()=>({number:'C358'}),verifyOwnerShapePatchRows:()=>events.push('verify'),ownerProfileByComponent:new WeakMap(),retainedShardCost:new WeakMap(),remember:()=>events.push('cache')});
  const pending=api.shard({tile_key:'target',path:'owner-shape-C358',sha256:'a'.repeat(64),bytes:5},controller.signal);for(let i=0;i<4;i++)await Promise.resolve();assert.deepEqual(events,['prepare']);assert.equal(api.loadCount,0);
  if(cancel)controller.abort();resume();if(cancel){await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(events,['prepare']);assert.equal(api.loadCount,0);}else{assert.equal(await pending,rows);assert.deepEqual(events,['prepare','inline','verify','cache']);assert.equal(api.loadCount,1);}
 }
});
