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
  if(relative.endsWith('.json')){
   if(overrides[relative])return overrides[relative];
   const location=fs.existsSync(path.join(C,relative))?path.join(C,relative):path.join(S,relative);
   return{default:JSON.parse(fs.readFileSync(location,'utf8'))};
  }
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
// The normalize coefficients come from the real module, so a recalibration changes one constant.
const load=loader(),{createSharedNativeSourcePool,NATIVE_SOURCE_EXPANSION,NATIVE_SOURCE_VERTEX_BYTES}=load('web/src/safety/shared-native-source.ts');
assert.ok(NATIVE_SOURCE_EXPANSION>0&&NATIVE_SOURCE_VERTEX_BYTES===48,'shared-native-source exports its calibrated normalize coefficients');
const {createChunkResourceStore}=load('web/src/safety/render-runtime/chunk-resource-store.ts'),{createResourceBudget}=load('web/src/safety/render-runtime/resource-budget.ts');
const codec=load('web/src/safety/building-mesh-codec.ts');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function component(city='berlin',id='osm/way/1',part='osm/way/1/component/test'){
 const geometry={type:'Polygon',coordinates:[[[13,52],[13.001,52],[13.001,52.001],[13,52]]]};
 return{city,objectId:id,partId:part,origin:[13,52],componentGeometry:geometry,sourceFeature:{type:'Feature',id,geometry,properties:{name:'native',nested:{value:1}}},displayEstimates:{nested:{value:2}},batches:[{positions:[0,100,0,1,100,0,0,100,1],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.4,.5,.6]}]};
}
function asset(raw){const bytes=new TextEncoder().encode(JSON.stringify(raw));return{bytes,descriptor:{path:'/safety/buildings3d/test.json',bytes:bytes.length,sha256:hash(bytes)}};}
function source(city='berlin',components=[component(city)]){return{schema_version:1,city,components,shadow_profile:{schema_version:1,city,status:'display-schematic'},shadow_admitted_component_indices:[0],discarded_top_level_payload:['must not survive ingress']};}

const ownerTransports='web/src/safety/painted-owner-geometry-transports.json';
const ownerResolver='web/src/safety/painted-owner-geometry-transport.ts';
const paintedPath=sha=>'/safety/buildings3d/painted-assets/'+sha.slice(0,2)+'/'+sha+'.json';

test('all published owner routes retain the signed profile identity and select their listed physical byte count and hash',()=>{
 const mapping=load(ownerTransports).default,{paintedOwnerGeometryTransport}=load(ownerResolver);
 const providers=load('web/src/safety/paint-asset-registry.json').default;
 const routes=new Map(Object.entries(providers).flatMap(([provider,paths])=>Object.entries(paths).map(([logical,physical])=>[physical,{provider,logical}])));
 const counts={city:0,delegated500:0};
 for(const [sha,entry] of Object.entries(mapping)){
  const physical=paintedPath(entry.publicSHA256),registered=routes.get(physical);
  assert.ok(registered,'missing published owner asset '+physical);counts[registered.provider]++;
  const owner={path:registered.logical,sha256:sha,bytes:entry.sourceBytes};
  assert.deepEqual(paintedOwnerGeometryTransport(owner,physical),{path:physical,sha256:entry.publicSHA256,bytes:entry.publicBytes});
  assert.equal(paintedOwnerGeometryTransport(owner,paintedPath(sha)),owner,'the historical URL retains its declared source');
  assert.equal(owner.sha256,sha,'the focus, material and proof identity is unchanged');
  assert.throws(()=>paintedOwnerGeometryTransport({...owner,bytes:owner.bytes+1},physical),/declared source descriptor/);
 }
 assert.deepEqual(counts,{city:57,delegated500:12});
});

test('old and publicly projected owner bytes in one pool have independent verified identities, leases and read ceilings',async()=>{
 const row=component(),oldBody=source('berlin',[row]),previous=asset(oldBody);
 const publicBody=structuredClone(oldBody);publicBody.components[0].sourceFeature.properties.reference='portable-evidence';
 const published=asset(publicBody),oldSHA=previous.descriptor.sha256,newSHA=published.descriptor.sha256;
 const oldPath=paintedPath(oldSHA),newPath=paintedPath(newSHA);
 const owner={...previous.descriptor,path:'/safety/buildings3d/owner-shape-patches/fixture.json'};
 const mapping={[oldSHA]:{sourceBytes:previous.bytes.length,publicBytes:published.bytes.length,publicSHA256:newSHA}};
 const {paintedOwnerGeometryTransport:resolve}=loader({[ownerTransports]:{default:mapping}})(ownerResolver);
 const requests=[],signal=new AbortController().signal;
 const pool=createSharedNativeSourcePool({read:async(path,signal,max)=>{
  signal.throwIfAborted();requests.push([path,max]);return path===newPath?published.bytes:previous.bytes;
 }});
 const historical=pool.client('berlin',()=>oldPath,resolve),current=pool.client('berlin',()=>newPath,resolve);
 const first=await historical.read(owner,signal,200000),second=await current.read(owner,signal,200000);
 try{
  assert.equal(first.contentKey,historical.contentKey(owner));assert.equal(second.contentKey,current.contentKey(owner));
  assert.notEqual(first.contentKey,second.contentKey,'two verified payloads cannot share a canonical entry');
  assert.deepEqual(requests,[[oldPath,previous.bytes.length],[newPath,published.bytes.length]]);
  assert.deepEqual(Array.from(first.raw.components[0].batches[0].positions),Array.from(second.raw.components[0].batches[0].positions));
  assert.equal(first.raw.components[0].sourceFeature.properties.reference,undefined);
  assert.equal(second.raw.components[0].sourceFeature.properties.reference,'portable-evidence');
  assert.equal(first.physicalBytes,previous.bytes.length);assert.equal(second.physicalBytes,published.bytes.length);
  await assert.rejects(current.read({...owner,compression:'gzip'},signal,200000),/declared source descriptor/);
  assert.equal(requests.length,2,'an invalid descriptor cannot hit or issue a read');
 }finally{first.release();second.release();pool.destroy();}
 const broken=published.bytes.slice();broken[broken.length-1]^=1;
 const corrupt=createSharedNativeSourcePool({read:async()=>broken});
 try{await assert.rejects(corrupt.client('berlin',()=>newPath,resolve).read(owner,signal,200000),/hash\/size mismatch/);}
 finally{corrupt.destroy();}
});

test('the compositor installs the projected descriptors on both owner managers and its generic asset reader',async t=>{
 const {createCompositorHarness,page,mapStub}=await import('./support/compositor-main-harness.mjs');
 const {api,fixture}=await (await createCompositorHarness())(t);
 const mapping=load(ownerTransports).default,providers=load('web/src/safety/paint-asset-registry.json').default;
 for(const [provider,city,name] of [['city','munich','C370'],['delegated500','nuremberg','F363-EastSourceCopy518']]){
  const logical='/safety/buildings3d/owner-shape-patches/'+name+'.json',p=page(api),signal=new AbortController().signal;
  const physical=providers[provider][logical],pair=Object.entries(mapping).find(([,row])=>paintedPath(row.publicSHA256)===physical);assert.ok(pair);
  const [sourceSHA,entry]=pair,owner={path:logical,sha256:sourceSHA,bytes:entry.sourceBytes};
  const projected={path:physical,sha256:entry.publicSHA256,bytes:entry.publicBytes};
  const compositor=api.installCompositor({map:mapStub(fixture),city,mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  try{
   await compositor.ensureReady(signal);
   const manager=fixture.captured.get(provider).options.nativeSources;
   assert.equal(manager.contentKey(owner),manager.contentKey(projected),'ordinary owner acquisition and its pressure key see the physical descriptor');
   const admit={admitted:{},envelope:[],keep:[]};
   await compositor.readAsset(owner,signal,owner.bytes,admit);
   assert.deepEqual(fixture.assetReads.at(-1).args,[projected,signal,owner.bytes,admit]);
   assert.deepEqual(owner,{path:logical,sha256:sourceSHA,bytes:entry.sourceBytes});
  }finally{compositor.destroy();}
 }
});

test('ready native reads avoid completion objects and release their final parent after a throwing callback',async()=>{
 const budget=createResourceBudget(),resources=createChunkResourceStore({budget,recentMaxEntries:0}),a=asset(source());
 const pool=createSharedNativeSourcePool({resourceStore:resources,read:async()=>a.bytes}),client=pool.client('berlin'),view=await client.read(a.descriptor,new AbortController().signal,200000);
 const baseline=budget.stats.bytes,OriginalPromise=globalThis.Promise,OriginalException=globalThis.DOMException;let completions=0,exceptions=0;
 globalThis.Promise=new Proxy(OriginalPromise,{construct(target,args,newTarget){completions++;return Reflect.construct(target,args,newTarget);}});
 globalThis.DOMException=new Proxy(OriginalException,{construct(target,args,newTarget){exceptions++;return Reflect.construct(target,args,newTarget);}});
 try{for(let i=0;i<8;i++)assert.equal(view.borrow(value=>value.raw.components[0].batches[0].positions[1]),100);}
 finally{globalThis.Promise=OriginalPromise;globalThis.DOMException=OriginalException;}
 assert.equal(completions,0);assert.equal(exceptions,0);assert.equal(budget.stats.bytes,baseline);
 const cause=Error('native reader failed');
 assert.throws(()=>view.borrow(value=>{view.release();client.destroy();resources.evictRecent();assert.equal(value.raw.components[0].batches[0].positions[1],100);assert.equal(budget.stats.bytes,baseline);throw cause;}),error=>error===cause);
 assert.equal(budget.stats.bytes,0);assert.equal(pool.stats.holders,0);assert.equal(pool.stats.entries,0);assert.throws(()=>view.raw,/released/);
 pool.destroy();resources.destroy();
});

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
 assert.equal(pool.stats.uniqueTypedBufferBytes,3*3*4*2+3*4);l.release();r.release();pool.resources.evictRecent();assert.equal(pool.stats.entries,0);pool.destroy();
});

test('page recent retention is evictable; visible subsets can outlive canonical eviction',async()=>{
 const a=asset(source('berlin',[component(),component('berlin','osm/way/2','p2')]));let reads=0;
 const pool=createSharedNativeSourcePool({read:async()=>{reads++;return a.bytes;}}),client=pool.client('berlin'),signal=new AbortController().signal;
 const view=await client.read(a.descriptor,signal,200000),first=view.raw.components[0];client.setCached([view.raw.components]);view.release();assert.equal(pool.stats.entries,1);
 client.setCached([]);pool.resources.evictRecent();assert.equal(pool.stats.entries,0);assert.equal(pool.stats.uniqueTypedBufferBytes,0);assert.equal(first.batches[0].positions[1],100);
 const reread=await client.read(a.descriptor,signal,200000);assert.equal(reads,2);assert.notEqual(reread.raw.components[0].batches[0].positions,first.batches[0].positions);reread.release();pool.destroy();
});

test('a retained visible component/released handle cannot retain unused neighbours through Entry or its fulfilled Promise',async()=>{
 assert.equal(typeof global.gc,'function','Run this focused suite with node --expose-gc');
 const a=asset(source('berlin',[component(),component('berlin','osm/way/2','p2')]));const pool=createSharedNativeSourcePool({read:async()=>a.bytes}),client=pool.client('berlin');
 let view=await client.read(a.descriptor,new AbortController().signal,200000);
 const visible=view.raw.components[0],unused=new WeakRef(view.raw.components[1].batches[0].positions),releasedHandle=view.release;
 client.setCached([view.raw.components]);view.release();client.setCached([]);pool.resources.evictRecent();view=undefined;
 for(let i=0;i<8;i++){await tick();global.gc();}
 assert.equal(unused.deref(),undefined,'an evicted neighbour must not survive via the retained component or release closure');
 assert.equal(visible.batches[0].positions[1],100);releasedHandle();assert.equal(pool.stats.entries,0);pool.destroy();
});

test('old cancellation cannot abort another subscribed provider',async()=>{
 const a=asset(source());let deliver,readSignal;const pool=createSharedNativeSourcePool({read:(_path,signal)=>{readSignal=signal;return new Promise(resolve=>deliver=resolve);}}),left=pool.client('berlin'),right=pool.client('berlin'),x=new AbortController(),y=new AbortController();
 const l=left.read(a.descriptor,x.signal,200000),r=right.read(a.descriptor,y.signal,200000);await tick();x.abort();await assert.rejects(l,{name:'AbortError'});assert.equal(readSignal.aborted,false);
 deliver(a.bytes);const view=await r;right.setCached([view.raw.components]);view.release();assert.equal(pool.stats.entries,1);assert.equal(pool.stats.decodes,1);right.setCached([]);pool.resources.evictRecent();assert.equal(pool.stats.entries,0);pool.destroy();
});

test('one ingress at a time; aborting a queued request avoids its network and decode',async()=>{
 const a=asset(source()),b=asset(source('berlin',[component('berlin','osm/way/2','p2')]));let deliver,reads=0;
 const pool=createSharedNativeSourcePool({read:async()=>{reads++;return new Promise(resolve=>deliver=resolve);}}),client=pool.client('berlin'),x=new AbortController(),y=new AbortController();
 const first=client.read(a.descriptor,x.signal,200000),second=client.read(b.descriptor,y.signal,200000);await tick();assert.equal(reads,1);
 assert.equal(pool.resources.budget.stats.categories.normalize.bytes,a.bytes.length*NATIVE_SOURCE_EXPANSION+200000*NATIVE_SOURCE_VERTEX_BYTES,'queued leaf owns a descriptor, not a second future normalize peak');
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
 const a=asset(source()),pool=createSharedNativeSourcePool({read:async()=>a.bytes}),client=pool.client('berlin');const result=await client.read(a.descriptor,new AbortController().signal,200000),visible=result.raw.components[0];client.setCached([result.raw.components]);client.destroy();pool.resources.evictRecent();assert.equal(pool.stats.entries,0);assert.throws(()=>result.raw,/released/);assert.equal(visible.batches[0].positions[1],100);result.release();assert.equal(pool.stats.holders,0);pool.destroy();
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

// The former remember/syncNativeCache LRU functions no longer exist. This is
// the actual stable-authority callback boundary, not a complete manager test.
test('all seven actual content keys exclude request/view state and retain material/source authority',()=>{
 for(const provider of ['root500','delegated500','tier300','church','city','bremen','infill']){
  const manifest={source_pbf_sha256:'b'.repeat(64),city_boundary:{sha256:'c'.repeat(64)},compiler_sha256:'d'.repeat(64),source_snapshot:'snapshot',actual_geometry_lod:1},leaf={tile_key:'tile',sha256:'e'.repeat(64),bytes:100,lod:1};
  const key=new Function('city','manifestSHA','manifest',managerFunction(provider,'sourceContentKey'))('berlin','a'.repeat(64),manifest),base=key(leaf);
  assert.equal(key({...leaf,id:'new-id',requestGeneration:99,cameraRevision:120,view:'moved'}),base);
  assert.notEqual(key({...leaf,sha256:'f'.repeat(64)}),base);
  const resource={descriptor:leaf,level:'near',geometrySHA256:'geometry',bindings:{materialSHA256:'material',producerSHA256:'producer',protectionSHA256:'protected',sourceEquivalenceSHA256:'equivalent'}};
  assert.notEqual(key(leaf,{resource}),base);const detail=key(leaf,{resource});
  assert.notEqual(key(leaf,{resource:{...resource,bindings:{...resource.bindings,materialSHA256:'changed'}}}),detail);
  assert.notEqual(key(leaf,{resource:{...resource,bindings:{...resource.bindings,protectionSHA256:'changed'}}}),detail);
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
 await assert.rejects(client.read({...descriptor,uncompressed_sha256:'0'.repeat(64)},new AbortController().signal,200000),/hash mismatch/);await assert.rejects(client.read({...descriptor,uncompressed_bytes:1024**2+1},new AbortController().signal,200000),/Invalid bounded/);pool.resources.evictRecent();assert.equal(pool.stats.entries,0);pool.destroy();
});

test('published gzip descriptors without a raw hash retain verified transport identity and bounded decoding',async()=>{
 const a=asset(source()),other=source();other.components[0].sourceFeature.properties.name='second';const b=asset(other);
 const gzip=(a,path)=>{const bytes=zlib.gzipSync(a.bytes);return{bytes,descriptor:{path,bytes:bytes.length,sha256:hash(bytes),compression:'gzip',uncompressed_bytes:a.bytes.length}};};
 const left=gzip(a,'/safety/buildings3d/berlin/flat-00000.json.gz'),right=gzip(b,'/safety/buildings3d/berlin/flat-00001.json.gz');
 assert.equal(left.descriptor.uncompressed_bytes,right.descriptor.uncompressed_bytes,'same-length leaves must not collapse to an absent raw hash');
 let reads=0;const pool=createSharedNativeSourcePool({read:async path=>{reads++;return path===right.descriptor.path?right.bytes:left.bytes;}}),client=pool.client('berlin'),signal=new AbortController().signal;
 try{
  const first=await client.acquire(left.descriptor,signal,200000),again=await client.acquire({...left.descriptor,path:'/another/verified-location.json.gz'},signal,200000),second=await client.acquire(right.descriptor,signal,200000);
  assert.equal(first.contentKey,again.contentKey);assert.equal(first.raw,again.raw);assert.notEqual(first.contentKey,second.contentKey);assert.equal(reads,2);
  assert.equal(first.raw.components[0].sourceFeature.properties.name,'native');assert.equal(second.raw.components[0].sourceFeature.properties.name,'second');
  const known={...left.descriptor,uncompressed_sha256:hash(a.bytes)};
  assert.equal(client.contentKey(known),client.contentKey(a.descriptor),'declared raw identity still shares with plain transport');assert.notEqual(first.contentKey,client.contentKey(known));
  first.release();again.release();second.release();pool.resources.evictRecent();
  await assert.rejects(client.acquire({...left.descriptor,sha256:'0'.repeat(64)},signal,200000),/hash\/size/);
  await assert.rejects(client.acquire({...left.descriptor,uncompressed_bytes:left.descriptor.uncompressed_bytes+1},signal,200000),/length mismatch/);
  const before=reads;
  await assert.rejects(client.acquire({...left.descriptor,uncompressed_bytes:1024**2+1},signal,200000),/Invalid bounded/);
  await assert.rejects(client.acquire({...left.descriptor,uncompressed_sha256:'invalid'},signal,200000),/Invalid bounded/);
  assert.equal(reads,before,'invalid bounds or an explicitly invalid raw hash never reach transport');
 }finally{pool.destroy();}
});


test('provider wrappers preserve source field insertion order used by exact pinned comparisons',async()=>{
 const c=component();c.sourceFeature={type:'Feature',properties:c.sourceFeature.properties,geometry:c.sourceFeature.geometry,id:c.objectId,bbox:[13,52,14,53]};
 const raw=source('berlin',[c]),a=asset(raw),expected=codec.normalizeBuildingShard(raw,'berlin'),pool=createSharedNativeSourcePool({read:async()=>a.bytes}),client=pool.client('berlin');
 const value=await client.read(a.descriptor,new AbortController().signal,200000);assert.equal(JSON.stringify(value.raw.components[0].sourceFeature),JSON.stringify(expected.components[0].sourceFeature));assert.deepEqual(Object.keys(value.raw.components[0]),Object.keys(expected.components[0]));
 value.raw.components[0].sourceFeature.bbox[0]=0;assert.equal(expected.components[0].sourceFeature.bbox[0],13);value.release();pool.destroy();
});


test('stable native identity reuses one private view per client and independent roles survive owner destroy',async()=>{
 const a=asset(source()),budget=createResourceBudget(),resources=createChunkResourceStore({budget}),pool=createSharedNativeSourcePool({read:async()=>a.bytes,resourceStore:resources}),client=pool.client('berlin'),controller=new AbortController();
 const first=await client.acquire(a.descriptor,controller.signal,200000),again=await client.acquire({...a.descriptor,path:'/another/path.json'},new AbortController().signal,200000);
 assert.equal(first.contentKey,again.contentKey);assert.equal(first.raw,again.raw);assert.equal(pool.stats.reads,1);
 const selected=first.retain('selected');first.transfer('main');again.release();controller.abort();client.destroy();pool.destroy();
 assert.equal(first.raw.components[0].batches[0].positions[1],100);assert.equal(selected.raw,first.raw);assert(budget.stats.bytes>0);
 first.release();selected.borrow(value=>{selected.release();resources.evictRecent();assert.equal(value.raw.components[0].batches[0].positions[1],100);assert(budget.stats.bytes>0,'synchronous borrow owns a dependency through reentrant release');});
 resources.evictRecent();assert.equal(budget.stats.bytes,0);assert.equal(pool.stats.holders,0);resources.destroy();
});

test('native admission precedes transport and byte leases release after parse with full backing identity',async()=>{
 const a=asset(source()),backing=new Uint8Array(a.bytes.length+64),bytes=backing.subarray(32,32+a.bytes.length);bytes.set(a.bytes);
 const budget=createResourceBudget(),resources=createChunkResourceStore({budget});let releases=0;
 const transport=budget.reserve({category:'read',bytes:backing.byteLength,precision:'exact',identity:backing.buffer});
 const pool=createSharedNativeSourcePool({resourceStore:resources,read:async()=>assert.fail('borrowed bytes take priority'),acquireBytes:async()=>{
  assert(budget.stats.categories.normalize.bytes>0,'expansion admitted before transport');
  return{bytes,release(){releases++;assert.equal(budget.stats.categories.read.bytes,backing.byteLength,'same transport/source backing allocation counts once');transport.release();}};
 }}),client=pool.client('berlin');
 const value=await client.acquire(a.descriptor,new AbortController().signal,200000);assert.equal(releases,1);assert.equal(budget.stats.categories.read?.bytes??0,0);value.release();resources.evictRecent();assert.equal(budget.stats.bytes,0);pool.destroy();resources.destroy();
 const small=createResourceBudget({limitBytes:1024,recentLimitBytes:0}),bounded=createChunkResourceStore({budget:small});let reads=0;
 const refused=createSharedNativeSourcePool({resourceStore:bounded,read:async()=>{reads++;return a.bytes;}});
 await assert.rejects(refused.client('berlin').read(a.descriptor,new AbortController().signal,200000),/Resource budget/);assert.equal(reads,0);assert.equal(small.stats.bytes,0);refused.destroy();bounded.destroy();
});

test('native opaque parent exposes the canonical ancestor to the page recent envelope',async()=>{
 const raw=source();raw.shadow_profile.rows=Array.from({length:128},(_,i)=>({i,proof:'verified canonical header retained independently'}));
 const a=asset(raw),budget=createResourceBudget(),resources=createChunkResourceStore({budget}),pool=createSharedNativeSourcePool({read:async()=>a.bytes,resourceStore:resources}),client=pool.client('berlin');
 const result=await client.acquire(a.descriptor,new AbortController().signal,200000),parent=result.retainResource();
 const headerCost=load('web/src/safety/building-payload-cost.ts').estimateRetainedBuildingPayload(result.verified).retainedPayloadEstimateBytes;
 assert.equal(pool.stats.uniqueSourcePayloadEstimateBytes,result.raw.decodedPayloadCost.retainedPayloadEstimateBytes+headerCost,'canonical header clone has its own metadata claim');
 assert.equal(parent.role,'dependency');assert.equal(parent.context,undefined);assert.equal(parent.epoch,undefined);
 const child=resources.acquire({contentKey:'native-parent-envelope-boundary',role:'main',parents:[parent],allowRecent:true,estimate:{category:'metadata',bytes:1,precision:'estimate'},produce:()=>({boundary:true}),costs:value=>({category:'metadata',bytes:1,precision:'estimate',identity:value})});
 await child.ready;result.release();parent.release();client.destroy();pool.destroy();assert.equal(child.state,'ready');assert(budget.stats.bytes>pool.stats.uniqueTypedBufferBytes);
 child.release();assert(budget.stats.recentBytes>0);assert.equal(budget.stats.recentBytes,budget.stats.bytes,'the cache envelope includes private metadata and its entire canonical payload once');
 resources.evictRecent();assert.equal(budget.stats.bytes,0);assert.throws(()=>result.retainResource(),/released/);resources.destroy();
});

// Observe the real ledger result without registering another budget listener.
// The native source releases both parent leases and registers its wait in the
// same synchronous turn as the refused adjustment.
function observeConsumerRefusal(){
 const refused=Promise.withResolvers();
 return {
  context(production){
   return {...production,adjust(cost){
    const accepted=production.adjust(cost);
    if(!accepted)refused.resolve(true);
    return accepted;
   }};
  },
  async wait(lease,client,descriptor){
   const observed=await Promise.race([refused.promise,lease.ready.then(()=>false)]);
   assert.equal(observed,true,'consumer preparation unexpectedly completed before a refusal');
   assert(client.parkedNeed(descriptor)>0,'consumer must park only after its actual refusal');
  }
 };
}

test('consumer preparation refusal releases native parents before waiting and retries after real capacity returns',async()=>{
 const refusal=observeConsumerRefusal();
 const budget=createResourceBudget({limitBytes:32*1024*1024,recentLimitBytes:0}),resources=createChunkResourceStore({budget,recentMaxEntries:0}),a=asset(source());
 const pool=createSharedNativeSourcePool({resourceStore:resources,read:async()=>a.bytes}),client=pool.client('berlin');let blocker,checks=0;
 const owned=resources.acquire({contentKey:'provider-admission',role:'source',estimate:{category:'metadata',bytes:256,precision:'estimate'},
  async produce(context){const result=await client.acquire(a.descriptor,context.signal,200000,'dependency',{context:refusal.context(context),costs(value){checks++;assert.equal(value.raw.components[0].objectId,'osm/way/1');if(checks===1)blocker=budget.reserve({category:'metadata',bytes:budget.stats.availableBytes-50,precision:'estimate'});return{category:'metadata',bytes:10000,precision:'estimate'};}});const parent=result.retainResource();try{context.retainParent(parent);}finally{parent.release();}return result;},
  costs:()=>({category:'metadata',bytes:10000,precision:'estimate'}),dispose:value=>value.release()});
 try{
  await refusal.wait(owned,client,a.descriptor);assert(blocker);
  assert.equal(owned.state,'preparing');assert.equal(pool.stats.holders,0,'no consumer result retained while parked');
  assert.equal(pool.stats.entries,0,'no canonical payload retained by provider preparation');
  assert.equal(budget.stats.categories.decoded?.bytes??0,0);assert(client.parkedNeed(a.descriptor)>0);
  blocker.release();await owned.ready;assert.equal(owned.state,'ready');assert(checks>=2);assert.equal(owned.value.raw.components[0].objectId,'osm/way/1');assert.equal(client.parkedNeed(a.descriptor),undefined);
 }finally{blocker?.release();owned.release();client.destroy();pool.destroy();resources.destroy();}
 assert.equal(budget.stats.bytes,0);
});

test('cancelled consumer preparation drops its wait and never produces a native handle',async()=>{
 const refusal=observeConsumerRefusal();
 const budget=createResourceBudget({limitBytes:32*1024*1024,recentLimitBytes:0}),resources=createChunkResourceStore({budget,recentMaxEntries:0}),a=asset(source());
 const pool=createSharedNativeSourcePool({resourceStore:resources,read:async()=>a.bytes}),client=pool.client('berlin');let blocker;
 const owned=resources.acquire({contentKey:'cancel-provider-admission',role:'source',estimate:{category:'metadata',bytes:256,precision:'estimate'},produce:context=>client.acquire(a.descriptor,context.signal,200000,'dependency',{context:refusal.context(context),costs(){blocker??=budget.reserve({category:'metadata',bytes:budget.stats.availableBytes-50,precision:'estimate'});return{category:'metadata',bytes:10000,precision:'estimate'};}}),dispose:value=>value.release()});
 try{await refusal.wait(owned,client,a.descriptor);assert(blocker);const ready=owned.ready;owned.release();await assert.rejects(ready,{name:'AbortError'});await tick();assert.equal(client.parkedNeed(a.descriptor),undefined);assert.equal(pool.stats.holders,0);assert.equal(pool.stats.entries,0);}
 finally{blocker?.release();client.destroy();pool.destroy();resources.destroy();}
 assert.equal(budget.stats.bytes,0);
});

test('consumer preparation that cannot fit the whole page fails without a permanent wait',async()=>{
 const budget=createResourceBudget({limitBytes:32*1024*1024,recentLimitBytes:0}),resources=createChunkResourceStore({budget,recentMaxEntries:0}),a=asset(source());
 const pool=createSharedNativeSourcePool({resourceStore:resources,read:async()=>a.bytes}),client=pool.client('berlin');
 const owned=resources.acquire({contentKey:'unfit-provider-admission',role:'source',estimate:{category:'metadata',bytes:256,precision:'estimate'},produce:context=>client.acquire(a.descriptor,context.signal,200000,'dependency',{context,costs:()=>({category:'metadata',bytes:budget.stats.limitBytes+1,precision:'estimate'})}),dispose:value=>value.release()});
 try{await assert.rejects(owned.ready,error=>error.name==='ResourceBudgetExceededError'&&error.message.includes('capacity'));assert.equal(client.parkedNeed(a.descriptor),undefined);assert.equal(pool.stats.holders,0);assert.equal(pool.stats.entries,0);}
 finally{owned.release();client.destroy();pool.destroy();resources.destroy();}assert.equal(budget.stats.bytes,0);
});

test('consumer preparation cancellation does not revoke another client using the same canonical source',async()=>{
 const refusal=observeConsumerRefusal();
 const budget=createResourceBudget({limitBytes:32*1024*1024,recentLimitBytes:0}),resources=createChunkResourceStore({budget,recentMaxEntries:0}),a=asset(source());
 const pool=createSharedNativeSourcePool({resourceStore:resources,read:async()=>a.bytes}),left=pool.client('berlin'),right=pool.client('berlin'),stable=await right.read(a.descriptor,new AbortController().signal,200000);let blocker;
 const owned=resources.acquire({contentKey:'independent-provider-admission',role:'source',estimate:{category:'metadata',bytes:256,precision:'estimate'},produce:context=>left.acquire(a.descriptor,context.signal,200000,'dependency',{context:refusal.context(context),costs(){blocker??=budget.reserve({category:'metadata',bytes:budget.stats.availableBytes-50,precision:'estimate'});return{category:'metadata',bytes:10000,precision:'estimate'};}}),dispose:value=>value.release()});
 try{await refusal.wait(owned,left,a.descriptor);assert(blocker);const ready=owned.ready;owned.release();await assert.rejects(ready,{name:'AbortError'});await tick();assert.equal(stable.raw.components[0].batches[0].positions[1],100);assert.equal(stable.released,false);assert.equal(pool.stats.holders,1);assert.equal(left.parkedNeed(a.descriptor),undefined);}
 finally{owned.release();blocker?.release();stable.release();left.destroy();right.destroy();pool.destroy();resources.destroy();}assert.equal(budget.stats.bytes,0);
});

test('tier300 actual native acquisition admits the unchanged component and shadow preparation cost',async()=>{
 const text=fs.readFileSync(path.join(C,'web/src/painted/tier300/safety/three-dimensional-map.ts'),'utf8'),ast=ts.createSourceFile('tier.ts',text,ts.ScriptTarget.Latest,true),calls=[];
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='sourceClient.acquire')calls.push(n);ts.forEachChild(n,visit);}visit(ast);assert.equal(calls.length,1);
 const expression=ts.transpileModule('('+calls[0].getText(ast)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const signal=new AbortController().signal,context={},s={id:'leaf'},raw={components:[{},{}]},verified={},captured=[];
 const result=await Function('sourceClient','s','signal','maxVertices','context','detail','shadowMetadataReserve','resourceKey','sourceContentKey','return '+expression)({acquire(...args){captured.push(args);return 'native-result';}},s,signal,200000,context,undefined,v=>{assert.strictEqual(v,verified);return 1234;},k=>'resource:'+k,()=> 'content');
 assert.equal(result,'native-result');const args=captured[0];assert.strictEqual(args[0],s);assert.strictEqual(args[1],signal);assert.equal(args[3],'dependency');assert.strictEqual(args[4].context,context);
 assert.deepEqual(args[4].costs({raw,verified}),{category:'metadata',bytes:512+2*512+1234,precision:'estimate',identity:'resource:content'});
});

for(const dropResident of [false,true])test('cohort pending consumer retry tracks canonical residency: '+(dropResident?'disposed':'independently held'),async()=>{
 const refusal=observeConsumerRefusal();
 const budget=createResourceBudget({limitBytes:32*1024*1024,recentLimitBytes:0}),resources=createChunkResourceStore({budget,recentMaxEntries:0}),a=asset(source());
 const pool=createSharedNativeSourcePool({resourceStore:resources,read:async()=>a.bytes}),client=pool.client('berlin'),resident=pool.client('berlin'),controller=new AbortController();
 const stable=await resident.read(a.descriptor,controller.signal,200000),privateBytes=stable.reacquireCost.privateBytes;
 const ready=budget.reserve({category:'metadata',bytes:10000,precision:'estimate'});let armed=false,blocker,owned;
 const cohort=client.cohort(),attempt=cohort.attempt({metadataHintSafe:true,metadataHintMaxPending:1,held:()=>armed?10000:0,retryHeld:()=>10000,pending:()=>[{asset:a.descriptor}]},controller.signal);
 try{
  owned=resources.acquire({contentKey:'pending-shared-canonical-retry',role:'source',estimate:{category:'metadata',bytes:256,precision:'estimate'},produce:context=>client.acquire(a.descriptor,context.signal,200000,'dependency',{context:refusal.context(context),costs(){blocker??=budget.reserve({category:'metadata',bytes:budget.stats.availableBytes-50,precision:'estimate'});return{category:'metadata',bytes:10000,precision:'estimate'};}}),costs:()=>({category:'metadata',bytes:10000,precision:'estimate'}),dispose:value=>value.release()});
  void owned.ready.catch(()=>{});
  await refusal.wait(owned,client,a.descriptor);
  assert(client.parkedNeed(a.descriptor)>0);armed=true;attempt.check();assert.equal(attempt.yielded,true);
  owned.release();ready.release();for(let i=0;i<10;i++)await tick();
  if(dropResident){stable.release();for(let i=0;i<10;i++)await tick();assert.equal(pool.stats.entries,0);}
  const desiredFree=10000+privateBytes+10000+1024;
  assert(blocker.adjust({category:'metadata',bytes:blocker.bytes+budget.stats.availableBytes-desiredFree,precision:'estimate'}));
  let result='pending';const retry=cohort.retry(attempt.signal.reason,controller.signal);assert(retry);retry.then(()=>{result='fulfilled';},()=>{result='rejected';});
  for(let i=0;i<30;i++)await tick();
  if(dropResident){assert.equal(result,'pending','disposed canonical parent must be included again');blocker.release();for(let i=0;i<30;i++)await tick();}
  assert.equal(result,'fulfilled','resident parents are not charged twice; disposed parents wait for enough room');
 }finally{controller.abort();attempt.close();owned?.release();ready.release();blocker?.release();stable.release();client.destroy();resident.destroy();pool.destroy();resources.destroy();}
 assert.equal(budget.stats.bytes,0);
});

test('a separately reclaimed cohort can retry at unchanged headroom after an earlier retry',async()=>{
 const budget=createResourceBudget({limitBytes:32*1024*1024,recentLimitBytes:0}),resources=createChunkResourceStore({budget,recentMaxEntries:0});
 const pool=createSharedNativeSourcePool({resourceStore:resources,read:async()=>{throw Error('no transport in pressure lifecycle test');}}),client=pool.client('berlin'),controller=new AbortController(),cohort=client.cohort();
 let blocker,held,foreign,attempt;
 try{
  for(let cycle=0;cycle<20;cycle++){
   held=budget.reserve({category:'metadata',bytes:10000,precision:'estimate'});
   attempt=cohort.attempt({metadataHintSafe:true,metadataHintMaxPending:1,held:()=>held?.bytes??0,retryHeld:()=>10000,pending:()=>[{label:'own-pending-source'}]},controller.signal);
   attempt.signal.addEventListener('abort',()=>{held?.release();held=undefined;},{once:true});
   blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes,precision:'estimate'});
   const admitted=budget.tryReserve({category:'metadata',bytes:128,precision:'estimate'},{label:'independent-other-provider'});
   if(admitted.ok)foreign=admitted.reservation;
   assert.equal(attempt.yielded,true,'independent admission returns this batch');
   foreign?.release();foreign=undefined;
   assert(blocker.adjust({category:'construction',bytes:blocker.bytes+budget.stats.availableBytes-50000,precision:'estimate'}));
   let state='pending';const retry=cohort.retry(attempt.signal.reason,controller.signal);assert(retry);retry.then(()=>{state='fulfilled';},()=>{state='rejected';});
   for(let i=0;i<20;i++)await tick();
   assert.equal(state,'fulfilled','a foreign reclaim is not a repeated self-refusal: cycle '+cycle);
   blocker.release();blocker=undefined;
  }
  assert.equal(pool.stats.cohortReclaims,20);
  const history=pool.stats.retryAttemptHistory;
  assert.equal(history.length,16);assert.equal(pool.stats.retryAttemptHistoryDropped,4);
  assert(history.every(row=>row.state==='resumed'&&row.reclaimed&&row.finishedAtMs!==null));
  assert.equal(history[0].sequence,5);assert.equal(history.at(-1).sequence,20);
  const before=JSON.stringify(budget.stats);history[0].requiredBytes=-1;
  assert.notEqual(pool.stats.retryAttemptHistory[0].requiredBytes,-1,'history is detached');
  assert.equal(JSON.stringify(budget.stats),before,'reading history changes no ledger or scheduling state');
 }finally{controller.abort();attempt?.close();held?.release();foreign?.release();blocker?.release();client.destroy();pool.destroy();resources.destroy();}
 assert.equal(budget.stats.bytes,0);
});

test('a repeated own-source refusal still waits for genuinely greater headroom',async()=>{
 const budget=createResourceBudget({limitBytes:32*1024*1024,recentLimitBytes:0}),resources=createChunkResourceStore({budget,recentMaxEntries:0});
 const pool=createSharedNativeSourcePool({resourceStore:resources,read:async()=>{throw Error('no transport in pressure lifecycle test');}}),client=pool.client('berlin'),controller=new AbortController(),cohort=client.cohort();
 let blocker,held,foreign,attempt;
 try{
  for(let cycle=0;cycle<2;cycle++){
   held=budget.reserve({category:'metadata',bytes:10000,precision:'estimate'});
   attempt=cohort.attempt({metadataHintSafe:true,metadataHintMaxPending:1,held:()=>held?.bytes??0,retryHeld:()=>10000,pending:()=>[{label:'own-pending-source'}]},controller.signal);
   attempt.signal.addEventListener('abort',()=>{held?.release();held=undefined;},{once:true});
   blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes,precision:'estimate'});
   const admitted=budget.tryReserve({category:'metadata',bytes:128,precision:'estimate'},{label:'own-pending-source'});
   if(admitted.ok)foreign=admitted.reservation;
   assert.equal(attempt.yielded,true,'own refused admission returns this batch');
   foreign?.release();foreign=undefined;
   assert(blocker.adjust({category:'construction',bytes:blocker.bytes+budget.stats.availableBytes-50000,precision:'estimate'}));
   let state='pending';const retry=cohort.retry(attempt.signal.reason,controller.signal);assert(retry);retry.then(()=>{state='fulfilled';},()=>{state='rejected';});
   for(let i=0;i<20;i++)await tick();
   if(cycle===1){assert.equal(state,'pending','unchanged own-refusal headroom cannot spin');blocker.release();blocker=undefined;for(let i=0;i<20;i++)await tick();}
   assert.equal(state,'fulfilled','retry resumes only after sufficient progress: cycle '+cycle);
   blocker?.release();blocker=undefined;
  }
  assert.equal(pool.stats.cohortReclaims,0);
 }finally{controller.abort();attempt?.close();held?.release();foreign?.release();blocker?.release();client.destroy();pool.destroy();resources.destroy();}
 assert.equal(budget.stats.bytes,0);
});

test('strictly advancing completed-source count permits retry but equal count still parks',async()=>{
 const budget=createResourceBudget({limitBytes:32*1024*1024,recentLimitBytes:0}),resources=createChunkResourceStore({budget,recentMaxEntries:0});
 const pool=createSharedNativeSourcePool({resourceStore:resources,read:async()=>{throw Error('no transport in pressure lifecycle test');}}),client=pool.client('berlin'),controller=new AbortController(),cohort=client.cohort();
 let blocker,held,foreign,attempt;
 try{
  for(let cycle=0;cycle<3;cycle++){
   held=budget.reserve({category:'metadata',bytes:10000,precision:'estimate'});
   attempt=cohort.attempt({metadataHintSafe:true,metadataHintMaxPending:2,retryProgress:()=>Math.min(cycle+1,2),held:()=>held?.bytes??0,retryHeld:()=>10000,pending:()=>[{label:'own-pending-source'}]},controller.signal);
   attempt.signal.addEventListener('abort',()=>{held?.release();held=undefined;},{once:true});
   blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes,precision:'estimate'});
   const admitted=budget.tryReserve({category:'metadata',bytes:128,precision:'estimate'},{label:'own-pending-source'});
   if(admitted.ok)foreign=admitted.reservation;
   assert.equal(attempt.yielded,true,'own refused admission returns this batch');
   foreign?.release();foreign=undefined;
   assert(blocker.adjust({category:'construction',bytes:blocker.bytes+budget.stats.availableBytes-50000,precision:'estimate'}));
   let state='pending';const retry=cohort.retry(attempt.signal.reason,controller.signal);assert(retry);retry.then(()=>{state='fulfilled';},()=>{state='rejected';});
   for(let i=0;i<20;i++)await tick();
   if(cycle===2){assert.equal(state,'pending','unchanged own-refusal headroom cannot spin');blocker.release();blocker=undefined;for(let i=0;i<20;i++)await tick();}
   assert.equal(state,'fulfilled','retry resumes only after sufficient progress: cycle '+cycle);
   blocker?.release();blocker=undefined;
  }
  assert.equal(pool.stats.cohortReclaims,0);
 }finally{controller.abort();attempt?.close();held?.release();foreign?.release();blocker?.release();client.destroy();pool.destroy();resources.destroy();}
 assert.equal(budget.stats.bytes,0);
});
