import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import ts from 'typescript';

// src-r3b (DECISIONS 2026-11-02 03:25 and "第三段第二轮结项"): the City manager
// imports the C358 material module from the city alone, before any source lease
// or metadata charge; only the synchronous rows binding follows the source read.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(web,'package.json')),{build}=require('esbuild');
const cityDir=path.join(web,'src/painted/city/safety');
const managerFile=path.join(cityDir,'three-dimensional-map.ts');
const managerText=fs.readFileSync(managerFile,'utf8'),managerAst=ts.createSourceFile(managerFile,managerText,ts.ScriptTarget.Latest,true);
function declaration(name){let found;(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node;ts.forEachChild(node,visit);})(managerAst);assert.ok(found,name+' is declared');return found.getText(managerAst);}

/** Evaluates the actual loadShard over tiny bindings; every hook records its event. */
function loadShardFixture({rows,events,city='munich',hold}){
 const releases=[],adjusted=[],context={retainParent(){},adjust(cost){adjusted.push(cost.category??'resource');return true;}};
 const values={city,maxVertices:200000,mobile:false,loadCount:0,options:{awaitPaintInitialization:operation=>operation},
  sourceClient:{async acquire(leaf,signal,_max,role){signal.throwIfAborted();assert.equal(role,'dependency');events.push('source');
   return{raw:{schema_version:1,city,components:rows,decodedPayloadCost:{retainedPayloadEstimateBytes:100}},verified:{fixture:true},physicalBytes:5,retainResource:()=>({release(){}}),release(){events.push('release');releases.push(leaf.tile_key);}};}},
  sourceContentKey:leaf=>'fixture-source:'+leaf.tile_key,resourceKey:key=>'fixture-resource:'+key,shadowMetadataReserve:()=>0,
  resourceStore:{budget:{stats:{lastPressure:undefined}}},ResourceBudgetExceededError:Error,
  async prepareInlineCityMaterials(actualCity,signal){assert.equal(actualCity,city);signal.throwIfAborted();events.push('inline');},
  async prepareC358MaterialModule(actualCity,signal){assert.equal(actualCity,city);signal.throwIfAborted();events.push('c358-module');if(hold)await hold;signal.throwIfAborted();},
  bindC358MaterialRows(actual){assert.equal(actual,rows);events.push('c358-bind');},
  ownerShapePatchProfile:()=>({number:'fixture'}),manifest:{source_pbf_sha256:'pbf',city_boundary:{sha256:'boundary'},compiler_sha256:'compiler',source_snapshot:'snapshot'},manifestSHA:'manifest',
  verifyOwnerShapePatchRows:()=>events.push('verify'),ownerProfileByComponent:new WeakMap(),retainedShardCost:new WeakMap(),
  recordSourceMetrics:()=>events.push('cache'),sourceResourceCosts:()=>({category:'resource'})};
 const scope=new Proxy(values,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
 const js=ts.transpileModule('('+declaration('loadShard')+')',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const loadShard=Function('scope','with(scope){return '+js+'}')(scope);
 return{loadShard:(leaf,signal)=>loadShard(leaf,signal,undefined,context),releases,adjusted,get loadCount(){return values.loadCount;}};
}

test('actual loadShard imports the C358 module before the source lease and metadata charge, and binds rows synchronously after the read',async()=>{
 const events=[],rows=[{city:'munich',objectId:'osm/way/1',partId:'osm/way/1/component/x'}];
 const f=loadShardFixture({rows,events});
 const value=await f.loadShard({tile_key:'t',path:'p',sha256:'a'.repeat(64),bytes:5},new AbortController().signal);
 assert.equal(value.components,rows);
 assert.deepEqual(events,['inline','c358-module','source','c358-bind','verify','cache']);
 assert.deepEqual(f.adjusted,['metadata','resource'],'metadata is charged after the module import, never while it is awaited');
 // No await sits between the bind and the owner verification: the binding is synchronous.
 assert.match(declaration('loadShard'),/bindC358MaterialRows\(raw\.components\);signal\.throwIfAborted\(\);/);
 assert.ok(!/await prepareC358MaterialBinding/.test(managerText),'the manager no longer awaits a C358 import after the source read');
});

test('an abort while the C358 module import is pending takes no source lease and charges nothing',async()=>{
 const events=[];let resume;const hold=new Promise(resolve=>resume=resolve),controller=new AbortController();
 const f=loadShardFixture({rows:[],events,hold});
 const pending=f.loadShard({tile_key:'t',path:'p',sha256:'a'.repeat(64),bytes:5},controller.signal);
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.deepEqual(events,['inline','c358-module'],'the import is awaited holding nothing');
 controller.abort();resume();
 await assert.rejects(pending,{name:'AbortError'});
 assert.deepEqual(events,['inline','c358-module']);assert.deepEqual(f.releases,[]);assert.deepEqual(f.adjusted,[]);assert.equal(f.loadCount,0);
});

test('visible() prepares the C358 module with the inline modules before its gate',()=>{
 const text=declaration('visible'),inline=text.indexOf('await prepareInlineCityMaterials('),c358=text.indexOf('await prepareC358MaterialModule(city,signal)'),gate=text.indexOf('runVisiblePreparation');
 assert.ok(inline>=0&&c358>inline&&gate>c358);
});

test('real C358 module: the city alone decides the import; the rows binding never imports and fails closed when unprepared',async()=>{
 const fixtureSource=await fsp.readFile(path.join(cityDir,'c358-fixture.ts'),'utf8');
 const overrides={name:'counted-c358-fixture',setup(b){b.onLoad({filter:/\/c358-fixture\.ts$/},()=>({contents:'globalThis.__r3bC358Loads=(globalThis.__r3bC358Loads??0)+1;\n'+fixtureSource,loader:'ts',resolveDir:cityDir}));}};
 const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'crimemaps-r3b-c358-'));
 try{
  const output=await build({entryPoints:[path.join(cityDir,'c358-display.ts')],bundle:true,splitting:true,write:true,outdir:dir,entryNames:'entry',chunkNames:'chunk-[hash]',outExtension:{'.js':'.mjs'},format:'esm',platform:'node',metafile:true,plugins:[overrides],logLevel:'silent'});
  const entry=Object.entries(output.metafile.outputs).find(([,value])=>value.entryPoint?.endsWith('c358-display.ts'));
  assert.ok(entry);assert.ok(!Object.keys(entry[1].inputs).some(p=>p.endsWith('c358-fixture.ts')),'the fixture stays out of the eager graph');
  globalThis.__r3bC358Loads=0;const api=await import(pathToFileURL(path.join(dir,'entry.mjs')).href);
  const literal=(()=>{const ast=ts.createSourceFile('f.ts',fixtureSource,ts.ScriptTarget.Latest,true);let text;(function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='JSON.parse'&&ts.isStringLiteral(n.arguments[0]))text=n.arguments[0].text;ts.forEachChild(n,visit);})(ast);return text;})();
  const fixture=JSON.parse(literal),owner=structuredClone(fixture.patch);
  // Binding the exact owner before its city module is prepared fails closed and imports nothing.
  assert.throws(()=>api.bindC358MaterialRows([owner]),/C358 material module was not prepared before its source lease/);
  api.bindC358MaterialRows([{...owner,partId:owner.partId+'-other'}]);
  assert.equal(globalThis.__r3bC358Loads,0);
  await api.prepareC358MaterialModule('berlin',new AbortController().signal);assert.equal(globalThis.__r3bC358Loads,0,'other cities never import it');
  const aborted=new AbortController();aborted.abort();await assert.rejects(api.prepareC358MaterialModule('munich',aborted.signal),{name:'AbortError'});assert.equal(globalThis.__r3bC358Loads,0);
  await api.prepareC358MaterialModule('munich',new AbortController().signal);assert.equal(globalThis.__r3bC358Loads,1);
  assert.equal(api.c358HasMaterialBinding(owner),false,'module import alone binds no rows');
  assert.equal(api.bindC358MaterialRows([owner]),undefined);assert.equal(api.c358HasMaterialBinding(owner),true);
  await api.prepareC358MaterialModule('munich',new AbortController().signal);assert.equal(globalThis.__r3bC358Loads,1,'imported once');
 }finally{delete globalThis.__r3bC358Loads;await fsp.rm(dir,{recursive:true,force:true});}
});
