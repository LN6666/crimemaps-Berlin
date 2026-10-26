import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const C=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const S=process.env.SHARED_SOURCE_TEST_BASE??C;
const ts=createRequire(S+'/web/package.json')('typescript');
function loader(overrides={}){
 const loaded=new Map();
 function load(relative){
  const file=relative.endsWith('.ts')?relative:relative+'.ts';if(loaded.has(file))return loaded.get(file);
  if(overrides[file])return overrides[file];
  const location=fs.existsSync(path.join(C,file))?path.join(C,file):path.join(S,file),source=fs.readFileSync(location,'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
  assert.equal((compiled.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,file);
  const module={exports:{}};loaded.set(file,module.exports);
  new Function('require','module','exports',compiled.outputText)(spec=>load(path.posix.normalize(path.posix.join(path.posix.dirname(file),spec))),module,module.exports);
  loaded.set(file,module.exports);return module.exports;
 }return load;
}
const load=loader(),{createSharedNativeSourcePool}=load('web/src/safety/shared-native-source.ts');
const codec=load('web/src/safety/building-mesh-codec.ts');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function component(city='berlin',id='osm/way/1',part='osm/way/1/component/test'){
 const geometry={type:'Polygon',coordinates:[[[13,52],[13.001,52],[13.001,52.001],[13,52]]]};
 return{city,objectId:id,partId:part,origin:[13,52],componentGeometry:geometry,sourceFeature:{type:'Feature',id,geometry,properties:{name:'native',nested:{value:1}}},displayEstimates:{nested:{value:2}},batches:[{positions:[0,100,0,1,100,0,0,100,1],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.4,.5,.6]}]};
}
function asset(raw){const bytes=new TextEncoder().encode(JSON.stringify(raw));return{bytes,descriptor:{path:'/safety/buildings3d/test.json',bytes:bytes.length,sha256:hash(bytes)}};}
function source(city='berlin',components=[component(city)]){return{schema_version:1,city,components,shadow_profile:{schema_version:1,city,status:'display-schematic'},shadow_admitted_component_indices:[0],discarded_top_level_payload:['must not survive ingress']};}

test('same verified content decodes once; mutable metadata stays private and buffers share',async()=>{
 const raw=source(),a=asset(raw);let reads=0;const pool=createSharedNativeSourcePool({read:async()=>{reads++;return a.bytes;}}),left=pool.client('berlin'),right=pool.client('berlin'),x=new AbortController(),y=new AbortController();
 const [l,r]=await Promise.all([left.read(a.descriptor,x.signal,200000),right.read(a.descriptor,y.signal,200000)]);
 assert.equal(reads,1);assert.equal(pool.stats.decodes,1);assert.equal(pool.stats.peakConcurrency,1);assert.deepEqual(l.raw.components,codec.normalizeBuildingShard(raw,'berlin').components);
 const lc=l.raw.components[0],rc=r.raw.components[0];assert.notEqual(lc,rc);assert.notEqual(lc.batches[0],rc.batches[0]);
 for(const key of ['positions','normals','indices'])assert.equal(lc.batches[0][key],rc.batches[0][key]);
 assert.equal(lc.componentGeometry,rc.componentGeometry);assert.equal(lc.sourceFeature.geometry,rc.sourceFeature.geometry);
 lc.sourceFeature.properties.nested.value=99;lc.displayEstimates.nested.value=98;lc.batches[0].color[0]=0;lc.origin[0]=14;
 assert.equal(rc.sourceFeature.properties.nested.value,1);assert.equal(rc.displayEstimates.nested.value,2);assert.equal(rc.batches[0].color[0],.4);assert.equal(rc.origin[0],13);
 assert.deepEqual(Object.keys(l.raw).sort(),['city','components','decodedPayloadCost','schema_version']);assert.deepEqual(Object.keys(l.verified).sort(),['shadow_admitted_component_indices','shadow_profile']);
 assert.equal(pool.stats.uniqueTypedBufferBytes,3*3*4*2+3*4);l.release();r.release();assert.equal(pool.stats.entries,0);pool.destroy();
});

test('only full-leaf cache/read holders retain canonical data; visible subsets can outlive eviction',async()=>{
 const a=asset(source('berlin',[component(),component('berlin','osm/way/2','p2')]));let reads=0;
 const pool=createSharedNativeSourcePool({read:async()=>{reads++;return a.bytes;}}),client=pool.client('berlin'),signal=new AbortController().signal;
 const view=await client.read(a.descriptor,signal,200000),first=view.raw.components[0];client.setCached([view.raw.components]);view.release();assert.equal(pool.stats.entries,1);
 client.setCached([]);assert.equal(pool.stats.entries,0);assert.equal(pool.stats.uniqueTypedBufferBytes,0);assert.equal(first.batches[0].positions[1],100);
 const reread=await client.read(a.descriptor,signal,200000);assert.equal(reads,2);assert.notEqual(reread.raw.components[0].batches[0].positions,first.batches[0].positions);reread.release();pool.destroy();
});

test('a retained visible component/released handle cannot retain unused neighbours through Entry or its fulfilled Promise',async()=>{
 assert.equal(typeof global.gc,'function','Run this focused suite with node --expose-gc');
 const a=asset(source('berlin',[component(),component('berlin','osm/way/2','p2')]));const pool=createSharedNativeSourcePool({read:async()=>a.bytes}),client=pool.client('berlin');
 let view=await client.read(a.descriptor,new AbortController().signal,200000);
 const visible=view.raw.components[0],unused=new WeakRef(view.raw.components[1].batches[0].positions),releasedHandle=view.release;
 client.setCached([view.raw.components]);view.release();client.setCached([]);view=undefined;
 for(let i=0;i<8;i++){await tick();global.gc();}
 assert.equal(unused.deref(),undefined,'an evicted neighbour must not survive via the retained component or release closure');
 assert.equal(visible.batches[0].positions[1],100);releasedHandle();assert.equal(pool.stats.entries,0);pool.destroy();
});

test('old cancellation cannot abort another subscribed provider',async()=>{
 const a=asset(source());let deliver,readSignal;const pool=createSharedNativeSourcePool({read:(_path,signal)=>{readSignal=signal;return new Promise(resolve=>deliver=resolve);}}),left=pool.client('berlin'),right=pool.client('berlin'),x=new AbortController(),y=new AbortController();
 const l=left.read(a.descriptor,x.signal,200000),r=right.read(a.descriptor,y.signal,200000);await tick();x.abort();await assert.rejects(l,{name:'AbortError'});assert.equal(readSignal.aborted,false);
 deliver(a.bytes);const view=await r;right.setCached([view.raw.components]);view.release();assert.equal(pool.stats.entries,1);assert.equal(pool.stats.decodes,1);right.setCached([]);assert.equal(pool.stats.entries,0);pool.destroy();
});

test('one ingress at a time; aborting a queued request avoids its network and decode',async()=>{
 const a=asset(source()),b=asset(source('berlin',[component('berlin','osm/way/2','p2')]));let deliver,reads=0;
 const pool=createSharedNativeSourcePool({read:async()=>{reads++;return new Promise(resolve=>deliver=resolve);}}),client=pool.client('berlin'),x=new AbortController(),y=new AbortController();
 const first=client.read(a.descriptor,x.signal,200000),second=client.read(b.descriptor,y.signal,200000);await tick();assert.equal(reads,1);
 y.abort();await assert.rejects(second,{name:'AbortError'});deliver(a.bytes);const result=await first;await tick();assert.equal(reads,1);assert.equal(pool.stats.peakConcurrency,1);result.release();pool.destroy();
});

test('failed hash is not cached and a fresh request retries',async()=>{
 const a=asset(source());let reads=0;const pool=createSharedNativeSourcePool({read:async()=>++reads===1?new Uint8Array(a.bytes.length):a.bytes}),client=pool.client('berlin'),x=new AbortController();
 await assert.rejects(client.read(a.descriptor,x.signal,200000),/hash\/size/);const value=await client.read(a.descriptor,new AbortController().signal,200000);assert.equal(reads,2);assert.equal(pool.stats.decodes,1);value.release();pool.destroy();
});

test('validation limits and city remain part of the verified identity',async()=>{
 const a=asset(source()),pool=createSharedNativeSourcePool({read:async()=>a.bytes}),client=pool.client('berlin'),signal=new AbortController().signal;
 const first=await client.read(a.descriptor,signal,200000);await assert.rejects(client.read(a.descriptor,signal,1),/budget/);const other=pool.client('hamburg');await assert.rejects(other.read(a.descriptor,signal,200000),/Invalid plain building shard/);
 assert.equal(pool.stats.decodes,1);first.release();pool.destroy();
});

test('client destroy releases cache/read ownership while existing rendered arrays stay valid',async()=>{
 const a=asset(source()),pool=createSharedNativeSourcePool({read:async()=>a.bytes}),client=pool.client('berlin');const result=await client.read(a.descriptor,new AbortController().signal,200000);client.setCached([result.raw.components]);client.destroy();assert.equal(pool.stats.entries,0);assert.equal(result.raw.components[0].batches[0].positions[1],100);result.release();assert.equal(pool.stats.holders,0);pool.destroy();
});

test('actual F133 writer copies its display mesh and leaves the shared normalized source exact',async()=>{
 const file='web/src/painted/root500/safety/owner-f133-reconstruction.ts',sourceText=fs.readFileSync(path.join(S,file),'utf8'),pins=JSON.parse(sourceText.match(/export const F133_IDS=(\[.*?\]);/s)[1]);
 const ids=['osm/way/645732604','osm/way/207377045','osm/way/416846388'],rows=ids.map(id=>component('cologne',id,pins.find(p=>p.objectId===id).partId));
 const a=asset(source('cologne',rows)),pool=createSharedNativeSourcePool({read:async()=>a.bytes}),client=pool.client('cologne'),x=new AbortController(),view=await client.read(a.descriptor,x.signal,200000),before=view.raw.components.map(c=>Array.from(c.batches[0].positions));
 const f133=loader({'web/src/painted/root500/safety/progressive-native-signature.ts':{nativePaintSignature:c=>pins.find(p=>p.objectId===c.objectId&&p.partId===c.partId).signature}})(file);
 const result=f133.ownerF133Reconstruction(view.raw.components);assert.equal(result.stats.objects,3);assert.equal(result.components[0].batches[0].positions[1],Math.fround(70.8));assert.deepEqual(view.raw.components.map(c=>Array.from(c.batches[0].positions)),before);assert.notEqual(result.components[0].batches[0].positions,view.raw.components[0].batches[0].positions);view.release();pool.destroy();
});

function managerFunction(provider,name){
 const file=`web/src/painted/${provider}/safety/three-dimensional-map.ts`,text=fs.readFileSync(path.join(C,file),'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);let fn;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)fn=node;ts.forEachChild(node,visit);}visit(ast);assert(fn,file+' '+name);
 assert.equal(ast.parseDiagnostics.length,0,file);return ts.transpileModule(fn.getText(ast)+'\nreturn '+name+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
}

test('all five actual shard functions keep cache-hit leases and release acquisition on processing failure',async()=>{
 for(const provider of ['root500','delegated500','tier300','church','city']){
  const code=managerFunction(provider,'shard'),rows=[component()],cache=new Map([['tile',{sha:'match',components:rows}]]);let reads=0,releases=0,syncs=0;
  const options={nativeSources:{read:async()=>{reads++;return{physicalBytes:1,verified:{},get raw(){throw Error('processing-failed');},release:()=>releases++};}}};
  const shard=new Function('options','cache','maxVertices','syncNativeCache',code)(options,cache,200000,()=>syncs++);
  assert.equal(await shard({tile_key:'tile',sha256:'match'},new AbortController().signal),rows);assert.equal(reads,0);assert.equal(syncs,0,'LRU touch must not transiently evict its canonical lease');
  await assert.rejects(shard({tile_key:'new',sha256:'new'},new AbortController().signal),/processing-failed/);assert.equal(reads,1);assert.equal(releases,1);
 }
});

test('actual remember/trim routines publish only final cache membership, including refusal and eviction',()=>{
 for(const provider of ['root500','delegated500','tier300','church','city']){
  const code=managerFunction(provider,'remember'),trimCode=['root500','delegated500'].includes(provider)?managerFunction(provider,'trimAppearanceCache70'):'return ()=>{};',cache=new Map(),cost=new WeakMap(),rows=[component()];cost.set(rows,8);const calls=[];
  // Run each provider's actual cache routines
  // against a one-entry bound so both acceptance and rejection exercise leases.
  const factory=new Function('cache','retainedShardCost','syncNativeCache','estimateRetainedBuildingPayload',`let cacheBytes=0,cacheRetainedEstimateBytes=0;const coChurchCohort70=undefined,koRailCohort70=undefined,messeturmCohort70=undefined,mobile=false,THREE_D_DECODED_PAYLOAD_LIMITS={desktop:10,mobile:10},maxCache=1,maxCacheBytes=10;const trimAppearanceCache70=(function(){${trimCode}})();return (function(){${code}})();`);
  const remember=factory(cache,cost,()=>calls.push([...cache.keys()]),()=>({retainedPayloadEstimateBytes:8}));remember('a','sha',rows,1,1);assert.deepEqual([...cache.keys()],['a']);assert(calls.every(keys=>keys.length===1),'no transient empty publication during insertion');
  calls.length=0;remember('a','sha',rows,11,11);assert.deepEqual([...cache.keys()],[]);assert.deepEqual(calls,[[]],'refused replacement releases old canonical lease');
  remember('a','sha',rows,1,1);calls.length=0;remember('b','sha',rows,1,1);assert.deepEqual([...cache.keys()],['b']);assert(calls.every(keys=>keys.join(',')==='b'),'eviction publishes final retained membership');
 }
});


test('shared ingress preserves exactly two TypeError transport attempts and never retries abort or validation',async()=>{
 const a=asset(source());let attempts=0;const pool=createSharedNativeSourcePool({read:async()=>{if(++attempts===1)throw new TypeError('network');return a.bytes;}}),client=pool.client('berlin');const result=await client.read(a.descriptor,new AbortController().signal,200000);assert.equal(attempts,2);assert.equal(pool.stats.transportAttempts,2);result.release();pool.destroy();
 let failures=0;const failed=createSharedNativeSourcePool({read:async()=>{failures++;throw new TypeError('network');}});await assert.rejects(failed.client('berlin').read(a.descriptor,new AbortController().signal,200000),/3D asset.*network/);assert.equal(failures,2);failed.destroy();
 let abortedAttempts=0;const stop=new AbortController(),cancelled=createSharedNativeSourcePool({read:async()=>{abortedAttempts++;stop.abort();throw new TypeError('cancelled transport');}});await assert.rejects(cancelled.client('berlin').read(a.descriptor,stop.signal,200000),{name:'AbortError'});assert.equal(abortedAttempts,1);cancelled.destroy();
});

test('shared gzip keeps native one-MiB default bound and physical/raw SHA checks',async()=>{
 const a=asset(source()),packed=zlib.gzipSync(a.bytes),descriptor={...a.descriptor,bytes:packed.length,sha256:hash(packed),compression:'gzip',uncompressed_bytes:a.bytes.length,uncompressed_sha256:hash(a.bytes)};const pool=createSharedNativeSourcePool({read:async()=>packed}),client=pool.client('berlin');
 const result=await client.read(descriptor,new AbortController().signal,200000);assert.deepEqual(result.raw.components,codec.normalizeBuildingShard(source(),'berlin').components);result.release();
 await assert.rejects(client.read({...descriptor,uncompressed_sha256:'0'.repeat(64)},new AbortController().signal,200000),/hash mismatch/);await assert.rejects(client.read({...descriptor,uncompressed_bytes:1024**2+1},new AbortController().signal,200000),/Invalid bounded/);assert.equal(pool.stats.entries,0);pool.destroy();
});


test('provider wrappers preserve source field insertion order used by exact pinned comparisons',async()=>{
 const c=component();c.sourceFeature={type:'Feature',properties:c.sourceFeature.properties,geometry:c.sourceFeature.geometry,id:c.objectId,bbox:[13,52,14,53]};
 const raw=source('berlin',[c]),a=asset(raw),expected=codec.normalizeBuildingShard(raw,'berlin'),pool=createSharedNativeSourcePool({read:async()=>a.bytes}),client=pool.client('berlin');
 const value=await client.read(a.descriptor,new AbortController().signal,200000);assert.equal(JSON.stringify(value.raw.components[0].sourceFeature),JSON.stringify(expected.components[0].sourceFeature));assert.deepEqual(Object.keys(value.raw.components[0]),Object.keys(expected.components[0]));
 value.raw.components[0].sourceFeature.bbox[0]=0;assert.equal(expected.components[0].sourceFeature.bbox[0],13);value.release();pool.destroy();
});
