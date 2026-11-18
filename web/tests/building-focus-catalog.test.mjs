import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import {page,loadProductionModule} from './support/core3-runtime.mjs';
import {buildBuildingFocusIndex,paginateBuildingFocusIndex} from '../../scripts/render/building-focus-index.mjs';
const {createBuildingFocusIndexResolver}=loadProductionModule(new URL('../src/safety/building-focus-catalog.ts',import.meta.url));
const {createResourceByteTransport}=loadProductionModule(new URL('../src/safety/resource-byte-transport.ts',import.meta.url));
const index='c'.repeat(64),leaves=[{id:'roof',sha256:'a'.repeat(64),lod:1},{id:'base',sha256:'b'.repeat(64),lod:1}];
const keyOf=leaf=>JSON.stringify([leaf.id,leaf.sha256]);
const documentsFor=rows=>rows.map(leaf=>{
 const bytes=Buffer.from(JSON.stringify({schema:'crimemaps-building-detail-demand-v1',schemaVersion:1,city:'frankfurt',canonicalIndex:{sha256:index},canonicalLeaf:{id:leaf.id,sha256:leaf.sha256},components:[{objectId:leaf.objectId??'osm/way/1',partId:leaf.id,origin:[8.68,50.11],box:[-10,0,-10,10,100,10]}]}));
 return{bytes,asset:{path:'/safety/buildings3d/'+leaf.id+'.json',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}};
});
const documents=documentsFor(leaves);
const catalog=paginateBuildingFocusIndex(buildBuildingFocusIndex({city:'frankfurt',canonicalIndexSHA256:index,expectedLeaves:leaves,documents}));
// The same two leaves listed by two different index partitions.
const partitioned=paginateBuildingFocusIndex(buildBuildingFocusIndex({city:'frankfurt',canonicalIndexSHA256:index,expectedLeaves:[{leaf:leaves[0],indexChain:[{id:'p-north'}]},{leaf:leaves[1],indexChain:[{id:'p-south'}]}],documents}));
function fixture({limitBytes,read,sourceCatalog=catalog,pageOptions,discard=false}={}){
 const p=page(undefined,pageOptions??(limitBytes?{limitBytes,recentLimitBytes:0}:{})),reads=[];
 const resources=new Map(sourceCatalog.assets.map(row=>[row.asset.path,row.bytes]));
 const transport=createResourceByteTransport({namespace:'focus-test',resourceStore:p.store,read:async(path,signal,max)=>{reads.push(path);return read?read(path,signal,max,resources):new Uint8Array(resources.get(path));}});
 const resolver=createBuildingFocusIndexResolver({city:'frankfurt',canonicalIndexSHA256:index,root:sourceCatalog.root,resourceStore:p.store,acquireBytes:transport.acquireBytes,...(discard?{discardBytes:path=>transport.discardIdle(path)}:{})});
 return{...p,reads,resolver,transport,close(){transport.destroy();p.store.destroy();}};
}
test('real producer, reader, transport and store load only requested metadata and release it',async()=>{
 const f=fixture();try{
  const a=await f.resolver.acquireLeaf(leaves[0],new AbortController().signal);
  assert.equal(a.value.components[0].partId,'roof');assert.equal(a.value.sourceObjectDependencies[0].leafKeys.length,2);
  assert.deepEqual(a.value.dependencyLocators.map(row=>row.partition),[null,null],'flat manifest members carry explicit null locators');
  assert.equal(f.reads.length,3,'root, one lookup page, one leaf; no geometry fetch');
  const b=await f.resolver.acquireLeaf(leaves[0],new AbortController().signal);
  assert.equal(a.value,b.value);assert.equal(f.reads.length,3);
  a.release();b.release();f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('corrupt bytes and stale source requests fail closed without retained resources',async()=>{
 const f=fixture({read:async(path,signal,max,resources)=>{const data=new Uint8Array(resources.get(path));data[0]=32;return data;}});
 try{await assert.rejects(f.resolver.acquireLeaf(leaves[0],new AbortController().signal),/hash/);f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);}finally{f.close();}
 const g=fixture();try{await assert.rejects(g.resolver.acquireLeaf({...leaves[0],sha256:'d'.repeat(64)},new AbortController().signal),/missing source/);g.store.evictRecent();assert.equal(g.budget.stats.bytes,0);}finally{g.close();}
});
test('budget refusal happens before any physical read',async()=>{
 const f=fixture({limitBytes:100});try{await assert.rejects(f.resolver.acquireLeaf(leaves[0],new AbortController().signal),/budget/i);assert.equal(f.reads.length,0);assert.equal(f.budget.stats.bytes,0);}finally{f.close();}
});
test('cancelling the last reader cancels physical work and releases the ledger',async()=>{
 let started,aborted=false;const ready=new Promise(resolve=>started=resolve);
 const f=fixture({read:(path,signal)=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>{aborted=true;reject(signal.reason);},{once:true});started();})});
 try{const controller=new AbortController(),pending=f.resolver.acquireLeaf(leaves[0],controller.signal);await ready;controller.abort();await assert.rejects(pending);await new Promise(resolve=>setImmediate(resolve));assert(aborted);f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);}finally{f.close();}
});
test('one cancelled consumer cannot abort a shared read still needed by another',async()=>{
 let started,finish,aborts=0;const ready=new Promise(resolve=>started=resolve);
 const f=fixture({read:(path,signal,max,resources)=>{
  if(path!==catalog.root.path)return Promise.resolve(new Uint8Array(resources.get(path)));
  return new Promise((resolve,reject)=>{finish=()=>resolve(new Uint8Array(resources.get(path)));signal.addEventListener('abort',()=>{aborts++;reject(signal.reason);},{once:true});started();});
 }});
 try{
  const first=new AbortController(),second=new AbortController();
  const a=f.resolver.acquireLeaf(leaves[0],first.signal),b=f.resolver.acquireLeaf(leaves[0],second.signal);
  const rejected=assert.rejects(a);await ready;await new Promise(resolve=>setImmediate(resolve));first.abort();await rejected;
  assert.equal(aborts,0);finish();const result=await b;assert.equal(result.value.leaf.id,'roof');result.release();f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
const {acquireBuildingFocusClosure}=loadProductionModule(new URL('../src/safety/building-focus-closure.ts',import.meta.url));
test('a visible roof expands to its complete source closure before geometry admission',async()=>{
 const f=fixture();try{
  const closure=await acquireBuildingFocusClosure({resolver:f.resolver,candidates:[leaves[0]],canonicalLeaves:leaves,ownerCohorts:[],maxLeaves:2,signal:new AbortController().signal});
  assert.deepEqual(closure.documents.map(row=>row.leaf.id),['roof','base']);assert.equal(closure.dependencies.length,1);assert.equal(closure.dependencies[0].length,2);
  assert.deepEqual(closure.located,[],'every member already has a provider descriptor');
  assert(f.reads.every(path=>path.includes('/focus/')),'closure reads only metadata');closure.release();f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('a member outside the descriptor window is located by SHA-bound metadata, never guessed',async()=>{
 const f=fixture({sourceCatalog:partitioned});try{
  const closure=await acquireBuildingFocusClosure({resolver:f.resolver,candidates:[leaves[0]],canonicalLeaves:[leaves[0]],ownerCohorts:[],maxLeaves:2,signal:new AbortController().signal});
  assert.deepEqual(closure.located,[{key:keyOf(leaves[1]),id:'base',sha256:leaves[1].sha256,partition:'p-south'}]);
  assert.deepEqual(closure.documents.map(row=>[row.leaf.id,row.leaf.partition]),[['roof','p-north'],['base','p-south']]);
  assert(f.reads.every(path=>path.includes('/focus/')),'locating reads metadata only, no geometry');
  closure.release();f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('oversized or stale closure fails atomically, never accepting only the visible roof',async()=>{
 for(const spec of [{canonicalLeaves:leaves,maxLeaves:1,ownerCohorts:[]},{canonicalLeaves:leaves,maxLeaves:2,ownerCohorts:[[leaves[0],{...leaves[1],sha256:'d'.repeat(64)}]]},{canonicalLeaves:[leaves[0]],maxLeaves:1,ownerCohorts:[]}]){
  const f=fixture();try{await assert.rejects(acquireBuildingFocusClosure({resolver:f.resolver,candidates:[leaves[0]],signal:new AbortController().signal,...spec}),/closure|dependency/i);f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);}finally{f.close();}
 }
});
const {createBuildingFocusRegistry}=loadProductionModule(new URL('../src/safety/building-focus-registry.ts',import.meta.url));
test('runtime registry binds only the current city and canonical index',async()=>{
 const p=page();try{
  const registry={schema:'crimemaps-building-focus-registry-v2',schemaVersion:2,city:'frankfurt',indices:[{canonicalIndexSHA256:index,root:catalog.root}]};
  const make=value=>createBuildingFocusRegistry({city:'frankfurt',registry:value,resourceStore:p.store,acquireBytes:async()=>{throw Error('No read during source binding');}});
  const active=make(registry);assert(active.enabled);assert(active.forIndex(index));assert.throws(()=>active.forIndex('d'.repeat(64)),/Missing building focus/);
  assert.throws(()=>make({...registry,city:'berlin'}),/registry/);
  assert.throws(()=>make({...registry,schema:'crimemaps-building-focus-registry-v1',schemaVersion:1}),/registry/,'v1 metadata has no dependency locators');
  assert.equal(make(undefined).forIndex(index),undefined);
  assert.equal(p.budget.stats.bytes,0);
 }finally{p.store.destroy();}
});
const {selectBuildingFocusSources}=loadProductionModule(new URL('../src/safety/building-focus-selection.ts',import.meta.url));
const {createBuildingFocusWindow}=loadProductionModule(new URL('../src/safety/building-focus-window.ts',import.meta.url));
function focusFrame(x=0){const window=createBuildingFocusWindow();window.measure({width:1000,height:600});const mainMatrix=new Float64Array(16);mainMatrix[15]=1;mainMatrix[12]=x;return{revision:1,cameraKey:'test',mercator:true,mainMatrix,viewport:{cssWidth:4000,cssHeight:2400,drawingBufferWidth:4000,drawingBufferHeight:2400},buildingFocus:window.measure({width:4000,height:2400})};}
test('source selection expands dependencies before admission, then retires the complete offscreen group',async()=>{
 const f=fixture();try{
  const base={resolver:f.resolver,candidates:[leaves[0]],canonicalLeaves:leaves,ownerCohorts:[],maxVisible:10,maxBytes:1000,maxVertices:1000,coverageRatio:1,signal:new AbortController().signal,describe:async leaf=>{const cost={resourceKey:leaf.id,bytes:100,vertices:10,painted:false};return{detail:cost,coarse:cost};}};
  const core=await selectBuildingFocusSources({...base,frame:focusFrame()});assert.equal(core.sources.length,2);assert.equal(core.partial,false);
  const offscreen=await selectBuildingFocusSources({...base,frame:focusFrame(-2),previous:core.plan.admitted});assert.equal(offscreen.sources.length,0);assert.equal(offscreen.plan.retired.length,2);
  const tight=await selectBuildingFocusSources({...base,frame:focusFrame(),maxBytes:199});assert.equal(tight.sources.length,0,'cannot admit half the building to fit budget');
  const broad=await selectBuildingFocusSources({...base,frame:focusFrame(),coverageRatio:100});assert.equal(broad.sources.length,0);
  f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('a located cross-partition member is admitted only through its provider-validated descriptor',async()=>{
 const f=fixture({sourceCatalog:partitioned});try{
  const base={resolver:f.resolver,candidates:[leaves[0]],canonicalLeaves:[leaves[0]],ownerCohorts:[],frame:focusFrame(),maxVisible:10,maxBytes:1000,maxVertices:1000,coverageRatio:1,signal:new AbortController().signal,describe:async leaf=>{const cost={resourceKey:leaf.id,bytes:100,vertices:10,painted:true};return{detail:cost,coarse:cost};}};
  const requests=[];
  const resolved=await selectBuildingFocusSources({...base,resolveDescriptors:async rows=>{requests.push(...rows);return new Map(rows.map(row=>[row.key,{...leaves[1],path:'/safety/buildings3d/base.json',validated:true}]));}});
  assert.deepEqual(requests.map(row=>[row.id,row.partition]),[['base','p-south']]);
  assert.deepEqual(resolved.sources.map(row=>row.leaf.id).sort(),['base','roof']);assert(resolved.sources.find(row=>row.leaf.id==='base').leaf.validated,'the real descriptor is the one acquired');
  assert.equal(resolved.located,1);assert.equal(resolved.unresolved,0);assert.equal(resolved.partial,false);
  const bounded=await selectBuildingFocusSources({...base,resolveDescriptors:async()=>new Map()});
  assert.equal(bounded.sources.length,0,'an unresolved member defers its whole cohort, never the visible roof alone');assert.equal(bounded.unresolved,1);assert.equal(bounded.partial,true);
  const none=await selectBuildingFocusSources(base);assert.equal(none.sources.length,0);assert.equal(none.unresolved,1);
  await assert.rejects(selectBuildingFocusSources({...base,resolveDescriptors:async rows=>new Map(rows.map(row=>[row.key,{...leaves[1],sha256:'e'.repeat(64)}]))}),/located descriptor mismatch/);
  f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('an incomplete native recipe defers its matched leaves instead of failing the layer, and releases all metadata roles',async()=>{
 const f=fixture();try{
  const selected=await selectBuildingFocusSources({resolver:f.resolver,candidates:[leaves[0]],canonicalLeaves:leaves,ownerCohorts:[],ownerObjects:[[{objectId:'osm/way/1'},{objectId:'osm/way/999'}]],frame:focusFrame(),maxVisible:10,maxBytes:1000,maxVertices:1000,coverageRatio:1,signal:new AbortController().signal,describe:async()=>{throw Error('A blocked recipe leaf is never described or acquired');}});
  assert.equal(selected.sources.length,0,'never show one half of a recipe pair');assert.equal(selected.blocked,2);assert.equal(selected.partial,true);
  f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('a larger screen keeps the full central allowance under the shared resource ceiling',async()=>{
 const f=fixture();try{
  const selected=await selectBuildingFocusSources({resolver:f.resolver,candidates:[leaves[0]],canonicalLeaves:leaves,ownerCohorts:[],frame:focusFrame(),maxVisible:2,maxBytes:200,maxVertices:20,coverageRatio:1,signal:new AbortController().signal,describe:async leaf=>({detail:{resourceKey:leaf.id,bytes:100,vertices:10,painted:true}})});
  assert.equal(selected.sources.length,2,'do not reserve an arbitrary slice of core resources for the new edges');f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('a previous representation is reused only while the provider can still acquire it',async()=>{
 const f=fixture();try{
  let level='coarse';
  const describe=async(leaf,previous)=>{const near={resourceKey:leaf.id+'/near',bytes:100,vertices:10,painted:true,pin:'near'};const retained=previous?.resourceKey===leaf.id+'/'+level?{...previous}:undefined;return{detail:near,coarse:near,...(retained?{retained}:{})};};
  const base={resolver:f.resolver,candidates:[leaves[0]],canonicalLeaves:leaves,ownerCohorts:[],maxVisible:10,maxBytes:1000,maxVertices:1000,coverageRatio:1,signal:new AbortController().signal,describe};
  // An invalid matrix is the remaining genuinely unknown projection (a zero matrix
  // now reads as wholly behind the camera, i.e. outside).
  const unknownFrame={...focusFrame(),mainMatrix:new Float64Array(16).fill(NaN)};
  const previous=leaves.map(leaf=>({key:keyOf(leaf),region:'peripheral',cost:{resourceKey:leaf.id+'/coarse',bytes:10,vertices:1,painted:true,pin:'coarse'}}));
  const reused=await selectBuildingFocusSources({...base,frame:unknownFrame,previous});
  assert.deepEqual(reused.sources.map(row=>row.resourceKey).sort(),['base/coarse','roof/coarse'],'unknown projection keeps the exact loadable old representation');assert.equal(reused.plan.retired.length,0);
  level='mid';const cancelled=await selectBuildingFocusSources({...base,frame:unknownFrame,previous});
  assert.equal(cancelled.sources.length,0,'an unloadable old representation is cancelled, not replaced by a guessed source');assert.equal(cancelled.plan.retired.length,2);
  f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});

// Re-sign every affected asset so these cases exercise semantic source checks,
// not the already-covered byte-corruption guard.
function alteredCatalog(mutate,source=catalog){
 const assets=[], replacements=new Map();
 for(const row of source.assets){
  const gzip=row.asset.compression==='gzip',value=JSON.parse(gzip?gunzipSync(row.bytes):row.bytes);
  if(value.schema==='crimemaps-building-focus-page-v2')for(const entry of value.entries)entry.asset=replacements.get(entry.asset.path);
  if(value.schema==='crimemaps-building-focus-catalog-v2')for(const page of value.pages)page.asset=replacements.get(page.asset.path);
  mutate(value);
  const raw=Buffer.from(JSON.stringify(value)+'\n'),bytes=gzip?gzipSync(raw,{level:9}):raw,sha256=createHash('sha256').update(bytes).digest('hex');
  const asset=gzip?{...row.asset,path:row.asset.path.replace(/[^/]+$/,sha256+'.json.gz'),bytes:bytes.length,sha256,uncompressed_bytes:raw.length,uncompressed_sha256:createHash('sha256').update(raw).digest('hex')}:{...row.asset,path:row.asset.path.replace(/[^/]+$/,sha256+'.json'),bytes:bytes.length,sha256};
  replacements.set(row.asset.path,asset);assets.push({asset,bytes});
 }
 return{root:replacements.get(source.root.path),assets};
}
for(const [label,change] of [
 ['duplicate object declaration',doc=>doc.sourceObjectDependencies.push(structuredClone(doc.sourceObjectDependencies[0]))],
 ['duplicate leaf member',doc=>doc.sourceObjectDependencies[0].leafKeys.push(doc.leaf.key)],
 ['foreign object',doc=>doc.sourceObjectDependencies[0].objectId='osm/way/999'],
 ['two revisions of the same leaf',doc=>doc.sourceObjectDependencies[0].leafKeys.push(JSON.stringify([doc.leaf.id,'e'.repeat(64)]))],
 ['a missing dependency locator',doc=>doc.dependencyLocators.pop()],
 ['a locator for a non-member',doc=>doc.dependencyLocators.push({key:JSON.stringify(['elsewhere','f'.repeat(64)]),partition:null})],
 ['an own locator that disagrees with the leaf',doc=>{doc.dependencyLocators.find(row=>row.key===doc.leaf.key).partition='p-other';}],
])test('metadata rejects '+label+' before geometry selection',async()=>{
 const sourceCatalog=alteredCatalog(doc=>{if(doc.schema==='crimemaps-building-focus-leaf-v2')change(doc);});
 const f=fixture({sourceCatalog});try{
  await assert.rejects(acquireBuildingFocusClosure({resolver:f.resolver,candidates:[leaves[0]],canonicalLeaves:leaves,ownerCohorts:[],maxLeaves:2,signal:new AbortController().signal}),/source dependency|dependency locator/);
  f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('two leaves that disagree about one member partition fail closed',async()=>{
 const sourceCatalog=alteredCatalog(doc=>{if(doc.schema==='crimemaps-building-focus-leaf-v2'&&doc.leaf.id==='roof')doc.dependencyLocators.find(row=>row.key!==doc.leaf.key).partition='p-wrong';},partitioned);
 const f=fixture({sourceCatalog});try{
  await assert.rejects(acquireBuildingFocusClosure({resolver:f.resolver,candidates:[leaves[0]],canonicalLeaves:[leaves[0]],ownerCohorts:[],maxLeaves:2,signal:new AbortController().signal}),/Inconsistent focus dependency locator/);
  f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('a gzip leaf whose inflated bytes do not match its uncompressed SHA fails closed',async()=>{
 const forged=alteredCatalog(()=>{});
 // Keep every wire binding valid but declare a different uncompressed SHA for one leaf.
 const leaf=forged.assets.find(row=>row.asset.compression==='gzip'),declared={...leaf.asset,uncompressed_sha256:'f'.repeat(64)};
 const assets=forged.assets.map(row=>row===leaf?{asset:declared,bytes:row.bytes}:row);
 const relinked=alteredCatalog(value=>{if(value.schema==='crimemaps-building-focus-page-v2')for(const entry of value.entries)if(entry.asset.path===declared.path)entry.asset=declared;},{root:forged.root,assets});
 const f=fixture({sourceCatalog:relinked});try{
  const target=JSON.parse(gunzipSync(leaf.bytes)).leaf;
  await assert.rejects(f.resolver.acquireLeaf({id:target.id,sha256:target.sha256},new AbortController().signal),/hash mismatch/);
  f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('a positive leaf count cannot point to an empty catalog',async()=>{
 const sourceCatalog=alteredCatalog(doc=>{if(doc.schema==='crimemaps-building-focus-catalog-v2')doc.pages=[];});
 const f=fixture({sourceCatalog});try{
  await assert.rejects(f.resolver.acquireLeaf(leaves[0],new AbortController().signal),/focus catalog/);
  assert.equal(f.reads.length,1);f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('v1 leaf documents are rejected by the v2 reader',async()=>{
 const sourceCatalog=alteredCatalog(doc=>{if(doc.schema==='crimemaps-building-focus-leaf-v2'){doc.schema='crimemaps-building-focus-leaf-v1';doc.schemaVersion=1;}});
 const f=fixture({sourceCatalog});try{
  await assert.rejects(f.resolver.acquireLeaf(leaves[0],new AbortController().signal),/document context/);
  f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});

test('independent owner reconstruction joins the native building atomically without catalog impersonation',async()=>{
 const f=fixture(),patch={id:'owner-shape-roof',sha256:'d'.repeat(64)},described=[];
 try{
  const base={resolver:f.resolver,candidates:[patch],canonicalLeaves:leaves,externalSources:[{leaf:patch,bounds:{left:1900,top:1100,right:2100,bottom:1300}}],ownerCohorts:[[patch,leaves[0]]],frame:focusFrame(),maxVisible:10,maxBytes:300,maxVertices:30,coverageRatio:1,signal:new AbortController().signal,describe:async leaf=>{described.push(leaf.id);return{detail:{resourceKey:leaf.id,bytes:100,vertices:10,painted:true}};}};
  const selected=await selectBuildingFocusSources(base);
  assert.deepEqual(new Set(selected.sources.map(row=>row.leaf.id)),new Set(['roof','base',patch.id]));assert.equal(selected.partial,false);
  assert.equal(selected.plan.admitted.length,3,'native source closure plus the replacement travel together');
  assert.equal(f.reads.length,5,'root, two pages, two canonical leaves; owner source does not query the canonical catalog');
  const tight=await selectBuildingFocusSources({...base,maxBytes:299});assert.equal(tight.sources.length,0,'never admit a replacement without its native owner cohort');
  f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('a reconstruction requires the native leaf it displaces; the native leaf never requires it back',async()=>{
 const pair=[{id:'native',sha256:'1'.repeat(64),lod:1,objectId:'osm/way/7'},{id:'other',sha256:'2'.repeat(64),lod:1,objectId:'osm/way/8'}];
 const own=paginateBuildingFocusIndex(buildBuildingFocusIndex({city:'frankfurt',canonicalIndexSHA256:index,expectedLeaves:pair,documents:documentsFor(pair)}));
 const f=fixture({sourceCatalog:own}),patch={id:'owner-shape-7',sha256:'d'.repeat(64)},sibling={id:'owner-shape-7b',sha256:'e'.repeat(64)};
 const box={left:1900,top:1100,right:2100,bottom:1300};
 try{
  const base={resolver:f.resolver,canonicalLeaves:pair,ownerCohorts:[],frame:focusFrame(),maxVisible:10,maxBytes:1000,maxVertices:1000,coverageRatio:1,signal:new AbortController().signal,describe:async leaf=>({detail:{resourceKey:leaf.id,bytes:100,vertices:10,painted:true}})};
  const replaces=[{objectId:'osm/way/7',partId:'native'}];
  const roomy=await selectBuildingFocusSources({...base,candidates:[patch,...pair],externalSources:[{leaf:patch,bounds:box,replaces,objectId:'osm/way/7'}]});
  assert.deepEqual(roomy.sources.map(row=>row.leaf.id).sort(),['native','other','owner-shape-7']);
  const tight=await selectBuildingFocusSources({...base,candidates:[patch,pair[0]],externalSources:[{leaf:patch,bounds:box,replaces,objectId:'osm/way/7'}],maxBytes:199});
  assert.deepEqual(tight.sources.map(row=>row.leaf.id),['native'],'the unpatched native building may stand alone; the reconstruction never does');
  const alone=await selectBuildingFocusSources({...base,candidates:[patch],canonicalLeaves:pair,externalSources:[{leaf:patch,bounds:box,replaces:[{...replaces[0],nativeLeafSHA256:'1'.repeat(64)}],objectId:'osm/way/7'}]});
  assert.deepEqual(alone.sources.map(row=>row.leaf.id).sort(),['native','owner-shape-7'],'a native leaf bound by SHA is pulled into the closure for its reconstruction');
  const unrelated=await selectBuildingFocusSources({...base,candidates:[patch,...pair],externalSources:[{leaf:patch,bounds:box,replaces:[{...replaces[0],nativeLeafSHA256:'9'.repeat(64)}],objectId:'osm/way/7'}],maxBytes:200});
  assert.equal(unrelated.sources.length,2,'a replacesNative row bound to another native leaf revision requires nothing');
  const siblings=await selectBuildingFocusSources({...base,candidates:[patch,sibling,pair[0]],externalSources:[{leaf:patch,bounds:box,replaces,objectId:'osm/way/7'},{leaf:sibling,bounds:box,objectId:'osm/way/7'}],maxBytes:250});
  assert.deepEqual(siblings.sources.map(row=>row.leaf.id),['native'],'reconstructions of one object are one atomic cohort: no statue without its base');
  f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('external sources cannot shadow canonical identities or satisfy canonical dependency declarations',async()=>{
 for(const spec of [
  {canonicalLeaves:leaves,externalLeaves:[{...leaves[0],sha256:'d'.repeat(64)}]},
  {canonicalLeaves:[leaves[0]],externalLeaves:[leaves[1]]},
 ]){
  const f=fixture();try{
   await assert.rejects(acquireBuildingFocusClosure({resolver:f.resolver,candidates:[leaves[0]],ownerCohorts:[],maxLeaves:3,signal:new AbortController().signal,...spec}),/external source|source dependency/);
   f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
  }finally{f.close();}
 }
});
test('external owner closure is bounded and cancellable before describing geometry',async()=>{
 const f=fixture(),patch={id:'owner-patch',sha256:'d'.repeat(64)};
 try{
  await assert.rejects(acquireBuildingFocusClosure({resolver:f.resolver,candidates:[patch],canonicalLeaves:leaves,externalLeaves:[patch],ownerCohorts:[[patch,leaves[0]]],maxLeaves:1,signal:new AbortController().signal}),/leaf budget/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(acquireBuildingFocusClosure({resolver:f.resolver,candidates:[patch],canonicalLeaves:leaves,externalLeaves:[patch],ownerCohorts:[],maxLeaves:3,signal:controller.signal}),/abort/i);
  assert.equal(f.reads.length,0);assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});

// cm-grz self-review 2026-11-14: focus metadata must not live in, or push
// anything out of, the page's count-bounded recent cache, and a re-plan of the
// same view must not read its metadata again.
const many=Array.from({length:60},(_,i)=>({id:'leaf-'+String(i).padStart(3,'0'),sha256:createHash('sha256').update('leaf-'+i).digest('hex'),lod:1,objectId:'osm/way/'+(1000+i)}));
const manyCatalog=paginateBuildingFocusIndex(buildBuildingFocusIndex({city:'frankfurt',canonicalIndexSHA256:index,expectedLeaves:many,documents:documentsFor(many)}));
const idleGeometry=(store,count,produced)=>i=>store.acquire({contentKey:'idle-geometry-'+i,role:'source',allowRecent:true,cacheRetention:'rebuild',estimate:{category:'decoded',bytes:1000,precision:'estimate'},produce:async()=>{produced.count++;return{i};}});
test('a verified leaf descriptor is remembered: a later read needs neither the root nor its lookup page',async()=>{
 const f=fixture({discard:true});try{
  const signal=new AbortController().signal,a=await f.resolver.acquireLeaf(leaves[0],signal);assert.equal(f.reads.length,3);a.release();
  await new Promise(resolve=>setImmediate(resolve));assert.equal(f.store.stats.recent,0,'neither the documents nor their raw bytes stay in the recent cache');
  const b=await f.resolver.acquireLeaf(leaves[0],signal);assert.equal(f.reads.length,4,'only the leaf document itself is read again');
  assert.equal(f.reads[3],f.reads[2]);assert(f.resolver.knownLeafDescriptors>=1);
  b.release();f.store.collectRetired();assert.equal(f.budget.stats.bytes,0);
  // A stale identity is still refused after the page was remembered.
  await assert.rejects(f.resolver.acquireLeaf({...leaves[0],sha256:'d'.repeat(64)},signal),/missing source/);
 }finally{f.close();}
});
test('a retained leaf lease outlives its request; an ordinary one ends with it',async()=>{
 const f=fixture({discard:true});try{
  const first=new AbortController(),kept=await f.resolver.acquireLeaf(leaves[0],first.signal,{retain:true});
  first.abort();assert.equal(kept.released,false);assert.equal(kept.value.leaf.id,'roof','the caller still owns the document');
  const second=new AbortController(),plain=await f.resolver.acquireLeaf(leaves[1],second.signal);
  second.abort();assert.equal(plain.released,true,'an ordinary lease is released with its request');
  // Waiting for a retained read still stops with the request.
  let started,finish;const ready=new Promise(resolve=>started=resolve);
  const g=fixture({discard:true,read:(path,signal,max,resources)=>path.endsWith('.json.gz')?new Promise((resolve,reject)=>{finish=()=>resolve(new Uint8Array(resources.get(path)));signal.addEventListener('abort',()=>reject(signal.reason),{once:true});started();}):Promise.resolve(new Uint8Array(resources.get(path)))});
  try{const request=new AbortController(),pending=g.resolver.acquireLeaf(leaves[0],request.signal,{retain:true});await ready;request.abort();await assert.rejects(pending);await new Promise(resolve=>setImmediate(resolve));g.store.collectRetired();assert.equal(g.budget.stats.bytes,0);}finally{g.close();}
  kept.release();f.store.collectRetired();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
test('planning sixty leaves twice leaves every idle cache entry in place and reads nothing the second time',async()=>{
 const f=fixture({sourceCatalog:manyCatalog,discard:true,pageOptions:{limitBytes:64*1024**2,recentLimitBytes:8*1024**2}});try{
  assert.equal(f.store.stats.recentMaxEntries,128);
  const produced={count:0},geometry=idleGeometry(f.store,100,produced);
  for(let i=0;i<100;i++){const lease=geometry(i);await lease.ready;lease.release();}
  assert.equal(f.store.stats.recent,100);const cached=f.budget.stats.bytes;
  const first=new AbortController(),one=await acquireBuildingFocusClosure({resolver:f.resolver,candidates:many,canonicalLeaves:many,ownerCohorts:[],maxLeaves:256,signal:first.signal,retain:true});
  assert.equal(one.documents.length,60);assert.deepEqual(one.documents.map(doc=>doc.leaf.id),many.map(leaf=>leaf.id),'documents stay in candidate order');
  const reads=f.reads.length;assert(reads>60&&reads<=121,'root, lookup pages and leaves once each');
  assert.equal(f.store.stats.recent,100,'no focus document and no raw byte buffer entered the recent cache');
  // The next plan of the same view (its request replaces the first one).
  first.abort();const second=new AbortController(),two=await acquireBuildingFocusClosure({resolver:f.resolver,candidates:many,canonicalLeaves:many,ownerCohorts:[],maxLeaves:256,signal:second.signal,retain:true});
  one.release();assert.equal(f.reads.length,reads,'held metadata is not read again');assert.equal(two.documents.length,60);
  two.release();await new Promise(resolve=>setImmediate(resolve));f.store.collectRetired();
  assert.equal(f.store.stats.recent,100);assert.equal(f.budget.stats.bytes,cached,'released metadata leaves the ledger completely');
  const held=[];for(let i=0;i<100;i++){const lease=geometry(i);await lease.ready;held.push(lease);}
  assert.equal(produced.count,100,'every idle entry was still cached');for(const lease of held)lease.release();
 }finally{f.close();}
});
test('a failing or cancelled closure gives back every lease, including reads still running',async()=>{
 const target=manyCatalog.assets.filter(row=>row.asset.path.endsWith('.json.gz'))[40].asset.path;
 const f=fixture({sourceCatalog:manyCatalog,discard:true,pageOptions:{limitBytes:64*1024**2,recentLimitBytes:8*1024**2},read:async(path,signal,max,resources)=>{const data=new Uint8Array(resources.get(path));if(path===target)data[0]^=255;return data;}});
 try{
  await assert.rejects(acquireBuildingFocusClosure({resolver:f.resolver,candidates:many,canonicalLeaves:many,ownerCohorts:[],maxLeaves:256,signal:new AbortController().signal,retain:true}),/hash|gzip|inflate|header|invalid/i);
  for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));f.store.collectRetired();
  assert.equal(f.store.stats.recent,0);assert.equal(f.budget.stats.bytes,0,'a corrupt document releases the whole closure');
 }finally{f.close();}
 let reads=0,release;const gate=new Promise(resolve=>release=resolve);
 const g=fixture({sourceCatalog:manyCatalog,discard:true,pageOptions:{limitBytes:64*1024**2,recentLimitBytes:8*1024**2},read:async(path,signal,max,resources)=>{if(++reads>20)await new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});void gate.then(resolve);});return new Uint8Array(resources.get(path));}});
 try{
  const request=new AbortController(),pending=acquireBuildingFocusClosure({resolver:g.resolver,candidates:many,canonicalLeaves:many,ownerCohorts:[],maxLeaves:256,signal:request.signal,retain:true});
  while(reads<=20)await new Promise(resolve=>setImmediate(resolve));
  request.abort();await assert.rejects(pending,/abort/i);release();
  for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));g.store.collectRetired();
  assert.equal(g.store.stats.recent,0);assert.equal(g.budget.stats.bytes,0,'cancellation releases retained leases too');
 }finally{g.close();}
});

test('a dropped connection gets one more attempt, exactly like a geometry read; nothing else does',async()=>{
 const dropped=()=>new TypeError('Failed to fetch');
 // Every document of the chain (root, lookup page, leaf) is dropped once.
 const once=new Set(),f=fixture({discard:true,read:async(path,signal,max,resources)=>{if(!once.has(path)){once.add(path);throw dropped();}return new Uint8Array(resources.get(path));}});
 try{
  const lease=await f.resolver.acquireLeaf(leaves[0],new AbortController().signal);
  assert.equal(lease.value.leaf.id,'roof');assert.equal(f.reads.length,6,'three documents, each read twice');
  lease.release();await new Promise(resolve=>setImmediate(resolve));f.store.collectRetired();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
 // The same document dropped twice fails the read; nothing stays charged and nothing is remembered as failed.
 let failures=2;const g=fixture({discard:true,read:async(path,signal,max,resources)=>{if(path.endsWith('.json.gz')&&failures-->0)throw dropped();return new Uint8Array(resources.get(path));}});
 try{
  await assert.rejects(g.resolver.acquireLeaf(leaves[0],new AbortController().signal),error=>error?.name==='TypeError'&&/Failed to fetch/.test(error.message));
  assert.equal(g.reads.filter(path=>path.endsWith('.json.gz')).length,2,'two attempts, not three');
  await new Promise(resolve=>setImmediate(resolve));g.store.collectRetired();assert.equal(g.budget.stats.bytes,0);
  const later=await g.resolver.acquireLeaf(leaves[0],new AbortController().signal);assert.equal(later.value.leaf.id,'roof','the next plan reads it normally');later.release();
 }finally{g.close();}
 // A server error, a contract violation and a cancelled request are not tried again.
 for(const [label,make,expected] of [['server error',()=>new Error('HTTP 503'),/HTTP 503/],['contract violation',()=>Object.assign(new TypeError('Resource byte read envelope missing'),{code:'RESOURCE_CONTRACT_VIOLATION'}),/envelope/]]){
  const h=fixture({discard:true,read:async(path,signal,max,resources)=>{if(path.endsWith('.json.gz'))throw make();return new Uint8Array(resources.get(path));}});
  try{await assert.rejects(h.resolver.acquireLeaf(leaves[0],new AbortController().signal),expected);assert.equal(h.reads.filter(path=>path.endsWith('.json.gz')).length,1,label+': one attempt');}finally{h.close();}
 }
 const request=new AbortController(),k=fixture({discard:true,read:async(path,signal,max,resources)=>{if(path.endsWith('.json.gz')){request.abort();throw dropped();}return new Uint8Array(resources.get(path));}});
 try{await assert.rejects(k.resolver.acquireLeaf(leaves[0],request.signal));assert.equal(k.reads.filter(path=>path.endsWith('.json.gz')).length,1,'a cancelled request does not read again');}finally{k.close();}
});
test('a closure keeps two metadata reads in flight, never more',async()=>{
 const f=fixture({sourceCatalog:manyCatalog,discard:true,pageOptions:{limitBytes:64*1024**2,recentLimitBytes:8*1024**2}});try{
  // Every started read holds its parse reservation (40x the document) in the page ledger.
  let active=0,peak=0,peakBytes=0;const counted={async acquireLeaf(...args){active++;peak=Math.max(peak,active);peakBytes=Math.max(peakBytes,f.budget.stats.bytes);try{return await f.resolver.acquireLeaf(...args);}finally{active--;}}};
  const closure=await acquireBuildingFocusClosure({resolver:counted,candidates:many,canonicalLeaves:many,ownerCohorts:[],maxLeaves:256,signal:new AbortController().signal,retain:true});
  assert.equal(closure.documents.length,60);assert.equal(peak,2,'the byte transport runs two reads at once; more would only hold reservations');
  closure.release();await new Promise(resolve=>setImmediate(resolve));f.store.collectRetired();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});
