import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// Compositor-side integration of the page ledger. The real painted-map
// compositor and the real lazy adapter run with the real page ledger, chunk
// store, byte transport, page asset registry, building detail catalogue
// resolver, detail runtime and demand selector. Fixtures: the null-profile
// development inputs (virtual city data with a one-entry Berlin detail
// catalogue, deployment, frozen table manifest and dependencies), the painted
// provider modules (inert managers that drive the options they are handed) and
// the network bytes.
const web=fileURLToPath(new URL('../',import.meta.url)),source=path.join(web,'src/safety');
// Optional negative controls: substitute source text for either module under test.
const substitutes={'painted-map.ts':process.env.COMPOSITOR_INTEGRATION_PAINTED_MAP,'three-dimensional-lazy.ts':process.env.COMPOSITOR_INTEGRATION_LAZY};
const registry=JSON.parse(await readFile(path.join(source,'paint-asset-registry.json'),'utf8'));
const MiB=1024**2;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sha=digit=>digit.repeat(64);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
// Bounded fixture wait (event-loop turns, no timer).
async function until(predicate,label){for(let i=0;i<200;i++){if(predicate())return;await settle();}assert.fail(label);}
const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return{promise,resolve};};

// One Berlin detail leaf with a real demand document behind a real v1 catalogue entry.
const bindings={sourcePBFSHA256:sha('3'),boundarySHA256:sha('4'),compilerSHA256:sha('5'),sourceSnapshot:'compositor-fixture',materialSHA256:sha('6'),producerSHA256:sha('7'),protectionSHA256:sha('8'),sourceEquivalenceSHA256:sha('9')};
const leaf={id:'compositor-leaf-1',path:'/safety/buildings3d/compositor-leaf-1.json',bytes:100,sha256:sha('2')};
const origin=[13,52];
const demandDocument={schema:'crimemaps-building-detail-demand-v1',schemaVersion:1,city:'berlin',canonicalIndex:{path:'/safety/buildings3d/index.json',bytes:100,sha256:sha('1')},canonicalLeaf:{...leaf},bindings,
  components:[{objectId:'osm/way/1',partId:'component/1',origin,box:[0,0,0,1,1,0],protected:false}],
  near:{level:'near',asset:{path:leaf.path,bytes:leaf.bytes,sha256:leaf.sha256},geometrySHA256:sha('a'),vertices:8,triangles:6},
  variants:[{level:'coarse',asset:{path:'/safety/buildings3d/detail/compositor-leaf-1-coarse.json.gz',bytes:321,sha256:sha('d'),compression:'gzip',uncompressed_bytes:654,uncompressed_sha256:sha('e')},
    geometrySHA256:sha('c'),vertices:4,triangles:2,errors:[{componentIndex:0,errorM:.01,normalDeviationRad:0}]}]};
const demandBytes=new TextEncoder().encode(JSON.stringify(demandDocument));
const demandAsset={path:'/safety/buildings3d/detail/compositor-demand-leaf-1.json',sha256:hash(demandBytes),bytes:demandBytes.length};
const catalog={schema:'crimemaps-building-detail-catalog-v1',schemaVersion:1,city:'berlin',entries:[{canonicalIndexSHA256:sha('1'),canonicalLeafSHA256:leaf.sha256,leafId:leaf.id,demandIndex:demandAsset}]};
const allProviders=['root500','delegated500','tier300','church','city','infill','bremen'];
const dependencies={schema_version:1,providers:Object.fromEntries(allProviders.map(p=>[p,[]])),initializers:Object.fromEntries(allProviders.map(p=>[p,{}]))};
const expectedProviders={berlin:['root500','delegated500','tier300','church','city'],bremen:['root500','delegated500','tier300','church','city','bremen'],essen:['root500','delegated500','tier300','church','city','infill']};

const factory='__compositorIntegrationFactory'+Math.random().toString(16).slice(2);
const fixtureModules={
  'virtual:crimemaps-city-data':`export const profileSHA256=null;export const buildingFocusRegistry=undefined;export const buildingDetailCatalog=${JSON.stringify(catalog)};export default null;`,
  './deployment':"export const repositoryCity='berlin';",
  './frozen-paint-table-manifest.json':'export default [];',
  './frozen-paint-table-dependencies.json':'export default '+JSON.stringify(dependencies)+';',
};
const entry=[
  "export {installThreeDimensionalMap as installCompositor} from './painted-map';",
  "export {installThreeDimensionalMap as installLazy} from './three-dimensional-lazy';",
  "export {createChunkResourceStore,getPageChunkResourceStore} from './render-runtime/chunk-resource-store';",
  "export {createResourceBudget} from './render-runtime/resource-budget';",
].join('\n');
const built=await build({stdin:{contents:entry,resolveDir:source,sourcefile:'compositor-integration-entry.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,logLevel:'silent',plugins:[{name:'compositor-integration-inputs',setup(builder){
  builder.onResolve({filter:/^(?:virtual:crimemaps-city-data|\.\/deployment|\.\/frozen-paint-table-(?:manifest|dependencies)\.json)$/},args=>({path:args.path,namespace:'compositor-fixture'}));
  builder.onLoad({filter:/.*/,namespace:'compositor-fixture'},args=>({loader:'js',contents:fixtureModules[args.path]}));
  builder.onResolve({filter:/painted\/[^/]+\/safety\/(?:three-dimensional-map|building-mesh-renderer)$/},args=>({path:args.path,namespace:'compositor-provider'}));
  builder.onLoad({filter:/.*/,namespace:'compositor-provider'},args=>({loader:'js',contents:args.path.endsWith('building-mesh-renderer')?'export const inertRenderer=true;':
    `export const installThreeDimensionalMap=options=>globalThis[${JSON.stringify(factory)}](${JSON.stringify(args.path.split('painted/')[1].split('/')[0])},options);`}));
  builder.onLoad({filter:/[\\/]safety[\\/](?:painted-map|three-dimensional-lazy)\.ts$/},async args=>{const file=substitutes[path.basename(args.path)];return file?{contents:await readFile(file,'utf8'),loader:'ts',resolveDir:path.dirname(args.path)}:undefined;});
}}]});
const text=built.outputFiles[0].text;

// A network read rejects when its consumer is cancelled, like fetch. `held`
// paths wait until released; every read is recorded with its ceiling.
function network(files){
  const reads=[],held=new Set();
  function read(target,signal,max){
    const row={path:target,max,signal,gate:deferred()};reads.push(row);
    if(!held.has(target))row.gate.resolve();
    return new Promise((resolve,reject)=>{
      const abort=()=>reject(signal.reason??new DOMException('Aborted','AbortError'));
      if(signal.aborted){abort();return;}
      signal.addEventListener('abort',abort,{once:true});
      void row.gate.promise.then(()=>{signal.removeEventListener('abort',abort);if(signal.aborted){abort();return;}const bytes=files.get(target);if(bytes)resolve(bytes.slice());else reject(TypeError('Fixture network has no '+target));});
    });
  }
  return{reads,held,files,read,count:target=>reads.filter(row=>row.path===target).length,
    release(target){held.delete(target);for(const row of reads)if(row.path===target)row.gate.resolve();}};
}
function mapStub(counters){
  return{on(){},off(){},triggerRepaint(){counters.repaints++;},stop(){},easeTo(){},
    getCenter:()=>({lng:13.4,lat:52.5}),getPadding:()=>({top:0,right:0,bottom:0,left:0}),getCanvas:()=>({clientWidth:100,clientHeight:100,width:200,height:200}),
    getZoom:()=>16,getBearing:()=>0,getPitch:()=>45,getRoll:()=>0,getVerticalFieldOfView:()=>36.87,getCenterElevation:()=>0,getProjection:()=>({type:'mercator'})};
}
let instance=0;
// Each case is a fresh module instance (page store singleton, initializer state).
async function load(t){
  const saved={document:globalThis.document,location:globalThis.location};
  globalThis.document={hidden:false};globalThis.location={hostname:'test.invalid'};
  const fixture={captured:new Map(),rendererless:new Set(),counters:{selected:0,repaints:0},
    generations:{root500:101,delegated500:202,tier300:303,church:404,city:505,infill:606,bremen:707}};
  // Inert managers: each publishes one renderer on requestMode and keeps the options it was handed.
  globalThis[factory]=(provider,options)=>{
    let mode='2d';
    const renderer={layer:{id:'compositor-'+provider},stats:{vertices:0,components:0},
      get selected(){fixture.counters.selected++;return undefined;},
      getRevision:()=>({generation:fixture.generations[provider],viewRevision:1}),
      setPageHidden(){},setReducedMotion(){},setOpacityContext(){},setSceneEnvironment(){},clearSelection(){},
      diagnosticScreenSamples:()=>[],isPickReady:()=>true,getDrawReadiness:()=>undefined};
    fixture.captured.set(provider,{options,renderer});
    return{async requestMode(next,signal){signal.throwIfAborted();mode=next;if(!fixture.rendererless.has(provider))options.onRenderer?.(renderer);return{mode,status:'ready'};},
      get mode(){return mode;},get wantedMode(){return mode;},async readAsset(_asset,signal){signal.throwIfAborted();return 'asset';},
      setPageHidden(){},setReducedMotion(){},setOpacityContext(){},cacheStats:()=>({}),suspend(){},resume(){},destroy(){}};
  };
  t.after(()=>{globalThis.document=saved.document;globalThis.location=saved.location;delete globalThis[factory];});
  const api=await import('data:text/javascript;base64,'+Buffer.from(text+'\n// compositor integration '+(++instance)).toString('base64'));
  return{api,fixture};
}
function page(api,files=new Map()){
  const budget=api.createResourceBudget({limitBytes:64*MiB,recentLimitBytes:1024}),resourceStore=api.createChunkResourceStore({budget});
  return{budget,resourceStore,baseline:budget.stats.bytes,net:network(files)};
}
const materialKeys=provider=>Object.keys(registry[provider]).filter(key=>/^\/assets\/3d-materials\/[^/]+\.png$/.test(key)).sort();

test('every provider\'s byte leases resolve facade material paths through the page asset registry like fetchBytes, on one shared transport entry per mapped asset',async t=>{
  const {api,fixture}=await load(t);
  const MAX=4096,bootstrap='/safety/buildings3d/index.json';
  assert(Object.values(registry).every(table=>!Object.hasOwn(table,bootstrap)),'the bootstrap index path is not remapped by any provider');
  for(const city of ['berlin','bremen','essen']){
    fixture.captured.clear();
    const {budget,resourceStore,baseline,net}=page(api);
    const compositor=api.installCompositor({map:mapStub(fixture.counters),city,mobile:false,resourceStore,fetchBytes:net.read});
    await compositor.requestMode('3d',new AbortController().signal);
    const providers=[...fixture.captured.keys()];
    assert.deepEqual(providers,expectedProviders[city],city+': provider set');
    // Detail runtimes exist only where the catalogue names this city.
    const detailRecords=compositor.getBuildingDetailSelectionSnapshots();
    assert(Object.isFrozen(detailRecords),city+': the detail record list is frozen');
    if(city==='berlin')assert.deepEqual(detailRecords.map(row=>row.provider),providers,city+': its catalogue gives every provider a detail record');
    else{
      assert.deepEqual(detailRecords,[],city+': the Berlin catalogue configures no detail runtime here');
      for(const provider of providers)assert.equal(fixture.captured.get(provider).options.detailRuntime,undefined,city+': '+provider+' receives no detail runtime');
    }
    // These inert managers create no texture: this case covers the option each
    // manager is handed; its manager -> source-material-texture use is read from code.
    const keys=materialKeys('city');assert.equal(keys.length,3,'three facade material PNGs');
    const mapped=new Map(keys.map(key=>[key,registry.city[key]]));
    for(const provider of providers){
      assert.deepEqual(materialKeys(provider),keys,provider+' registers the same facade materials');
      for(const key of keys)assert.equal(registry[provider][key],mapped.get(key),provider+' maps '+key+' like every provider');
    }
    // The served body names the URL that was actually read. A development
    // server may still answer the unmapped source path; a lease must not read it.
    for(const [key,target] of mapped){net.files.set(target,new TextEncoder().encode(target));net.files.set(key,new TextEncoder().encode(key));}
    net.files.set(bootstrap,new TextEncoder().encode(bootstrap));
    const controller=new AbortController(),settled=[];let exact=0;
    for(const key of keys){
      const target=mapped.get(key),before=net.reads.length;net.held.add(target);
      const rows=providers.map(provider=>({provider,key,lease:fixture.captured.get(provider).options.acquireBytes(key,controller.signal,MAX)}));
      await until(()=>net.reads.length===before+1,city+': '+key+' starts one physical read');
      assert.equal(net.reads.at(-1).path,target,city+': '+key+' is read at its registry-mapped URL');
      assert.equal(net.count(key),0,city+': the unmapped path '+key+' is never requested');
      assert.equal(budget.stats.bytes-baseline,exact+2*MAX,city+': one read envelope for '+target+' is on the page ledger before the read, not one per provider lease');
      assert.equal(compositor.cacheStats().sharedTransport.consumers,settled.length+providers.length,city+': every lease is a consumer of the shared transport');
      net.release(target);
      for(const row of rows){const lease=await row.lease;assert.equal(new TextDecoder().decode(lease.bytes),target,city+': '+row.provider+' leases the registry-mapped bytes of '+key);settled.push({...row,lease});}
      assert.equal(net.count(target),1,city+': '+target+' is read once for every provider');
      exact+=new TextEncoder().encode(target).byteLength;
      assert.equal(budget.stats.bytes-baseline,exact,city+': completion keeps exactly one copy of '+target);
    }
    assert(net.reads.every(row=>row.max===MAX),city+': each read keeps the caller ceiling');
    // fetchBytes resolves the same path to the same live transport entry.
    for(const key of keys){
      const bytes=await fixture.captured.get('city').options.fetchBytes(key,controller.signal,MAX);
      assert.equal(new TextDecoder().decode(bytes),mapped.get(key));assert.equal(net.count(mapped.get(key)),1,city+': fetchBytes and acquireBytes share one read of '+key);
    }
    for(const row of settled)row.lease.release();
    assert.equal(compositor.cacheStats().sharedTransport.consumers,0,city+': released leases leave no consumer');
    resourceStore.evictRecent();assert.equal(budget.stats.bytes,baseline,city+': released leases return to the baseline');
    // A path the registry does not map passes through unchanged.
    const passed=await fixture.captured.get('root500').options.acquireBytes(bootstrap,controller.signal,MAX);
    assert.equal(net.count(bootstrap),1);assert.equal(new TextDecoder().decode(passed.bytes),bootstrap);passed.release();
    // A cancelled lease returns its whole claim while its read is pending.
    const [firstKey]=keys,firstTarget=mapped.get(firstKey);resourceStore.evictRecent();net.held.add(firstTarget);
    const cancel=new AbortController(),pending=fixture.captured.get('church').options.acquireBytes(firstKey,cancel.signal,MAX);
    await until(()=>net.count(firstTarget)===2,city+': a new read starts after eviction');
    assert.equal(budget.stats.bytes-baseline,2*MAX,city+': the pending read envelope is admitted before the read');
    cancel.abort();
    await assert.rejects(pending,error=>error.name==='AbortError');
    assert(net.reads.at(-1).signal.aborted,city+': the cancelled lease cancels its read');
    await settle();resourceStore.evictRecent();
    assert.equal(budget.stats.bytes,baseline,city+': cancellation returns every claim');assert.equal(budget.stats.availabilityListeners,0);
    assert.equal(compositor.cacheStats().sharedTransport.consumers,0);
    compositor.destroy();resourceStore.destroy();
  }
});

test('getBuildingDetailSelectionSnapshots reports each provider\'s own runtime decisions beside that provider\'s renderer generation, read-only',async t=>{
  const {api,fixture}=await load(t);
  const {budget,resourceStore,baseline,net}=page(api,new Map([[demandAsset.path,demandBytes]]));
  const compositor=api.installCompositor({map:mapStub(fixture.counters),city:'berlin',mobile:false,resourceStore,fetchBytes:net.read});
  assert.deepEqual(compositor.getBuildingDetailSelectionSnapshots(),[],'no runtime exists before the providers are installed');
  fixture.rendererless.add('church');
  await compositor.requestMode('3d',new AbortController().signal);
  const providers=expectedProviders.berlin,runtimes=providers.map(provider=>fixture.captured.get(provider).options.detailRuntime);
  assert(runtimes.every(Boolean),'a configured Berlin catalogue gives every provider a detail runtime');
  assert.equal(new Set(runtimes).size,providers.length,'each provider owns a separate runtime');
  const read=()=>compositor.getBuildingDetailSelectionSnapshots();
  let snapshots=read();
  assert(Object.isFrozen(snapshots)&&snapshots.every(Object.isFrozen),'the records are frozen');
  assert.deepEqual(snapshots.map(row=>row.provider),providers,'provider order');
  assert.deepEqual(snapshots.map(row=>row.rendererGeneration),[101,202,303,null,505],'each provider\'s own renderer generation; null before its renderer exists');
  snapshots.forEach((row,index)=>{
    assert.deepEqual(row.snapshot,runtimes[index].getBuildingDetailSelectionSnapshot(),row.provider+': the runtime\'s own snapshot');
    assert.equal(row.snapshot.schema,'crimemaps-building-detail-selection-snapshot-v1');assert.equal(row.snapshot.city,'berlin');assert.deepEqual(row.snapshot.leaves,[]);
    assert.equal(row.snapshot.publishedGeneration,undefined);
  });

  // The city provider resolves its leaf through the compositor's catalogue resolver and transport.
  const runtime=runtimes[providers.indexOf('city')],indexRequest=new AbortController();
  const index=await runtime.resolveDetailIndex(sha('1'),leaf,{signal:indexRequest.signal});
  assert(index,'the catalogue entry resolves');assert.equal(net.count(demandAsset.path),1);assert.equal(net.reads[0].max,demandAsset.bytes);
  // Without a scene environment the compositor forces canonical shadow demand.
  assert.equal(runtime.select(index).resource.level,'near');
  let city=read().find(row=>row.provider==='city');
  assert.equal(city.snapshot.leaves.length,1);assert.equal(city.snapshot.leaves[0].selectedLevel,'near');assert.equal(city.snapshot.leaves[0].reason,'forced');assert.equal(city.snapshot.leaves[0].published,false);
  // A distant public camera without sun shadows or reflection: the coarse variant fits.
  compositor.renderer.setSceneEnvironment({instantISO:'2026-06-21T12:00:00+02:00',sunlight:false,shadows:false,motion:false,quality:'balanced'});
  compositor.renderer.setPlanarReflectionState({enabled:false,planeWorldZ:Number.NaN});
  const unit=2*Math.PI*6378137*Math.cos(origin[1]*Math.PI/180),ox=(origin[0]+180)/360;
  fixture.captured.get('city').renderer.layer.prerender({drawingBufferWidth:200,drawingBufferHeight:200},{defaultProjectionData:{mainMatrix:[.01*unit,0,0,0,0,0,0,0,0,.01*unit,0,0,-.01*unit*ox,0,0,1],projectionTransition:0}});
  const selection=runtime.select(index);
  assert.equal(selection.resource.level,'coarse','selection reason '+selection.reason);
  // A session publication adopted at the city renderer's generation.
  const session=runtime.openSession({requestId:1,signal:new AbortController().signal});
  session.registerCached(index,selection.resource);session.validateBeforeAdopt();session.adopt({generation:505});session.settleReady({generation:505,ready:true});session.finish();
  snapshots=read();city=snapshots.find(row=>row.provider==='city');
  assert.deepEqual(city.snapshot,runtime.getBuildingDetailSelectionSnapshot());
  assert.equal(city.rendererGeneration,505);assert.equal(city.snapshot.publishedGeneration,city.rendererGeneration,'the published LOD belongs to the renderer\'s current generation');
  const shown=city.snapshot.leaves[0];
  assert.equal(shown.selectedLevel,'coarse');assert.equal(shown.reason,'coarse');assert.equal(shown.resourceKey,selection.resource.key);
  assert.equal(shown.published,true);assert.equal(shown.publishedBy,'session');assert.equal(shown.publishedLevel,'coarse');assert.equal(shown.publishedGeneration,505);
  for(const row of snapshots.filter(row=>row.provider!=='city'))assert.deepEqual([row.snapshot.leaves.length,row.snapshot.publishedGeneration],[0,undefined],row.provider+' keeps its own runtime record');

  // Reading never evaluates demand, selects, repaints, reads or changes the ledger.
  const before={selected:fixture.counters.selected,repaints:fixture.counters.repaints,reads:net.reads.length,bytes:budget.stats.bytes,selections:shown.selections,observed:city.snapshot.observedLeaves};
  for(let i=0;i<3;i++)read();
  city=read().find(row=>row.provider==='city');
  assert.deepEqual({selected:fixture.counters.selected,repaints:fixture.counters.repaints,reads:net.reads.length,bytes:budget.stats.bytes,selections:city.snapshot.leaves[0].selections,observed:city.snapshot.observedLeaves},before);
  // A renderer change outside a detail session shows as a newer renderer generation.
  fixture.generations.city=506;
  city=read().find(row=>row.provider==='city');
  assert.equal(city.rendererGeneration,506);assert.equal(city.snapshot.publishedGeneration,505);

  compositor.destroy();
  assert.deepEqual(read(),[],'a destroyed compositor reports no live runtime');
  indexRequest.abort();await settle();resourceStore.evictRecent();
  assert.equal(budget.stats.bytes,baseline,'the resolved descriptors and their read return to the baseline');assert.equal(budget.stats.availabilityListeners,0);
  resourceStore.destroy();
});

test('the lazy adapter exposes the page store it hands the 3D owner before loading it, and forwards the owner\'s detail snapshots',async t=>{
  const {api,fixture}=await load(t);
  const {resourceStore,net}=page(api);
  const owners=[];let loads=0;
  const loadModule=async()=>{loads++;return{installThreeDimensionalMap:options=>{const owner=api.installCompositor(options);owners.push({options,owner});return owner;}};};
  const lazy=api.installLazy({map:mapStub(fixture.counters),city:'berlin',mobile:false,resourceStore,fetchBytes:net.read},loadModule);
  assert.equal(lazy.resourceStore,resourceStore,'the explicit page store is available before the 3D owner loads');
  assert.equal(loads,0);assert.deepEqual(lazy.getBuildingDetailSelectionSnapshots(),[]);
  assert(Object.isFrozen(lazy.getBuildingDetailSelectionSnapshots()),'the empty list before the owner loads is frozen like the owner\'s');
  await lazy.requestMode('3d',new AbortController().signal);
  assert.equal(loads,1);assert.equal(owners[0].options.resourceStore,resourceStore,'the 3D owner receives the same store');
  for(const [provider,{options}] of fixture.captured)assert.equal(options.resourceStore,resourceStore,provider+' manager shares the page store');
  assert.equal(lazy.resourceStore,resourceStore);
  const forwarded=lazy.getBuildingDetailSelectionSnapshots();
  assert.deepEqual(forwarded,owners[0].owner.getBuildingDetailSelectionSnapshots(),'the adapter forwards the owner\'s records');
  assert.deepEqual(forwarded.map(row=>[row.provider,row.rendererGeneration]),expectedProviders.berlin.map(provider=>[provider,fixture.generations[provider]]));
  lazy.destroy();assert.deepEqual(lazy.getBuildingDetailSelectionSnapshots(),[]);assert(Object.isFrozen(lazy.getBuildingDetailSelectionSnapshots()));

  // Without an explicit store the adapter resolves the page store once and hands it on.
  fixture.captured.clear();
  const pageStore=api.getPageChunkResourceStore({profile:'desktop'});
  const implicit=api.installLazy({map:mapStub(fixture.counters),city:'berlin',mobile:false,fetchBytes:net.read},loadModule);
  assert.equal(implicit.resourceStore,pageStore,'the page store before load');
  assert.deepEqual(implicit.getBuildingDetailSelectionSnapshots(),[]);assert(Object.isFrozen(implicit.getBuildingDetailSelectionSnapshots()));
  await implicit.requestMode('3d',new AbortController().signal);
  assert.equal(owners[1].options.resourceStore,pageStore);assert.equal(fixture.captured.get('city').options.resourceStore,pageStore);
  implicit.destroy();resourceStore.destroy();
});
