import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

const web=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(web,'src/safety');
const ts=createRequire(new URL('../package.json',import.meta.url))('typescript');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function evaluate(text,require,bindings={}){
 const exports={};
 const code=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('require','exports',...Object.keys(bindings),code)(require,exports,...Object.values(bindings));
 return exports;
}
const gzip=evaluate(fs.readFileSync(path.join(source,'bounded-3d-gzip.ts'),'utf8'),name=>{throw Error(name);});
const {createFrozenInitializerStore}=evaluate(fs.readFileSync(path.join(source,'frozen-paint-initializer-store.ts'),'utf8'),name=>{
 assert.equal(name,'./bounded-3d-gzip');return gzip;
});
const main=fs.readFileSync(path.join(source,'main.ts'),'utf8');
const ast=ts.createSourceFile('main.ts',main,ts.ScriptTarget.Latest,true);
const names=new Set(['buildingInformation','buildingInformationPending','waitForBuildingInformation','ensureBuildingInformation']);
const helperNodes=ast.statements.filter(n=>ts.isFunctionDeclaration(n)?names.has(n.name?.text):ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>names.has(d.name.getText(ast))));
assert.equal(helperNodes.length,4,'Use the actual metadata helpers and cache declarations from main.ts');
const helperSource=helperNodes.map(n=>n.getText(ast)).join('\n')+'\nexports.ensure=ensureBuildingInformation;';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deadline(operation){let timer;return Promise.race([operation,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Metadata initialization stalled')),3000))]).finally(()=>clearTimeout(timer));}

function fixture(){
 const raw=Buffer.from('[{"same":"metadata"}]'),sha=hash(raw);
 const row={path:`/safety/buildings3d/painted-tables/${sha.slice(0,2)}/${sha}.json`,sha256:sha,bytes:raw.length};
 const initializer='painted/city/safety/progressive-paint-admissions.ts';
 const selection={tables:[sha],initializers:{[sha]:{[initializer]:1}}};
 const store=createFrozenInitializerStore([row]),events=[];
 let reads=0,begins=0,imports=0,mode='blocked',release,infoImport;
 const gate=new Promise(resolve=>release=resolve),info={actual:true};
 const begin=(read,signal,providers)=>{assert.deepEqual(providers,['city']);events.push('begin');begins++;return store.begin(read,signal,selection);};
 const module=evaluate(helperSource,name=>{
  imports++;
  if(name==='./frozen-paint-tables')return {beginFrozenPaintTableInitialization:begin};
  assert.equal(name,'./building-3d-information');events.push('information-import');
  return infoImport??=store.read(sha,initializer).then(()=>info);
 },{
  assetPath:p=>'/test-map'+p,
  boundedDataBytes:async(p,signal,max,policy)=>{
   assert.equal(p,'/test-map'+row.path);assert.equal(max,raw.length);assert.equal(policy,'default');
   reads++;events.push('read');if(mode==='blocked')await gate;signal.throwIfAborted();
   return mode==='bad'?new Uint8Array(raw.length):raw;
  }
 });
 return {ensure:module.ensure,store,info,events,release,set mode(value){mode=value;},get reads(){return reads;},get begins(){return begins;},get imports(){return imports;}};
}

test('ordinary 2D does not import metadata or read tables; metadata session precedes TLA and closes before renderer startup',async()=>{
 const f=fixture();await tick();assert.equal(f.imports,0);assert.equal(f.reads,0);assert.equal(f.begins,0);
 f.mode='ok';assert.equal(await deadline(f.ensure(new AbortController().signal)),f.info);
 assert(f.events.indexOf('begin')<f.events.indexOf('information-import'));
 assert.equal(f.store.stats.parses,1);assert.equal(f.store.stats.retainedBytes,0);assert.equal(f.store.stats.sessionActive,false);
 f.events.push('renderer-start');assert.equal(f.begins,1);
 assert.equal(await f.ensure(new AbortController().signal),f.info);assert.equal(f.begins,1,'Cached metadata never replaces a renderer session');
});

test('concurrent metadata callers share one pending import while each subscriber can abort promptly',async()=>{
 const f=fixture(),owner=new AbortController(),subscriber=new AbortController();
 const first=f.ensure(owner.signal),second=f.ensure(subscriber.signal);await tick();assert.equal(f.begins,1);
 const canceled=assert.rejects(second,{name:'AbortError'});subscriber.abort();await deadline(canceled);
 assert.equal(f.store.stats.sessionActive,true,'A subscriber abort leaves the owner operation alive');
 f.mode='ok';f.release();assert.equal(await deadline(first),f.info);assert.equal(f.store.stats.parses,1);assert.equal(f.store.stats.sessionActive,false);
});

test('owner cancellation permits immediate retry before stale cleanup without publishing or clearing the new operation',async()=>{
 const f=fixture(),owner=new AbortController(),first=f.ensure(owner.signal),canceled=assert.rejects(first,{name:'AbortError'});
 await tick();owner.abort();f.mode='ok';const retry=f.ensure(new AbortController().signal);f.release();
 await deadline(canceled);assert.equal(await deadline(retry),f.info);assert.equal(f.begins,2);assert.equal(f.store.stats.parses,1);assert.equal(f.store.stats.sessionActive,false);
 assert.equal(await f.ensure(new AbortController().signal),f.info);assert.equal(f.begins,2);
});

test('a failed verified input rejects the request and resumes the same parked initializer on explicit retry',async()=>{
 const f=fixture();f.mode='bad';await assert.rejects(deadline(f.ensure(new AbortController().signal)),/hash mismatch/);
 assert.equal(f.store.stats.parses,0);assert.equal(f.store.stats.sessionActive,false);
 f.mode='ok';assert.equal(await deadline(f.ensure(new AbortController().signal)),f.info);assert.equal(f.store.stats.parses,1);assert.equal(f.store.stats.failures,1);assert.equal(f.begins,2);
});

test('the real 3D control and explicit review entry wait for metadata before importing dependent code',()=>{
 assert(main.includes("if(mode==='3d'){await ensureBuildingInformation(signal);signal.throwIfAborted();dedicatedAppearance?.retry();}const result=await threeDimensional!.requestMode(mode,signal);"));
 assert(main.includes("has('review303'))void ensureBuildingInformation(new AbortController().signal).then(()=>import('./white-review-export'))"));
 assert(main.includes('finally{session.close();}'));
 const start=ast.statements.filter(n=>ts.isExpressionStatement(n)&&n.getText(ast).includes('ensureBuildingInformation('));
 assert.equal(start.length,0,'No unconditional metadata initialization at module top level');
});
