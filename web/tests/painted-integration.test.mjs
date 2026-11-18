import {nullCityDataProfilePlugin} from './city-profile-test-plugin.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import ts from 'typescript';

async function bundle(entry, plugins=[]) {
  const result=await build({entryPoints:[new URL('../src/safety/'+entry,import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false,plugins:[nullCityDataProfilePlugin,...plugins]});
  return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const {paintOwner,acceptPaintComponent}=await bundle('paint-ownership.ts');
const {createFrozenTableStore}=await bundle('frozen-paint-tables.ts');
const registry=JSON.parse(await readFile(new URL('../src/safety/paint-ownership-registry.json',import.meta.url)));
const finalBatch=JSON.parse(await readFile(new URL('../src/safety/final-batch-ownership.json',import.meta.url)));
const supplementalContracts=Object.assign({},...await Promise.all([
  'delegated500/safety/supplement-ownership-batch1.json',
  'tier300/safety/supplement-tier300-ownership.json',
  'tier300/safety/supplement-orangerie-ownership.json',
  'root500/safety/supplement-tv-base-ownership.json',
  'delegated500/safety/supplement-hc70-ownership.json',
].map(async path=>JSON.parse(await readFile(new URL('../src/painted/'+path,import.meta.url))))),finalBatch);
const component=(city,objectId,partId)=>({city,objectId,partId,origin:[0,0],batches:[],sourceFeature:{properties:{}},componentGeometry:{type:'Polygon',coordinates:[]}});

test('all frozen native parts select exactly one accepted renderer',()=>{
  for(const [key,row]of Object.entries(registry.parts)){
    const [city,objectId,partId]=key.split('|'),c=component(city,objectId,partId);
    assert.equal(paintOwner(c),supplementalContracts[`${city}|${objectId}`]??row.provider,key);
    assert.equal(['root500','delegated500','tier300','city','church','infill','bremen'].filter(p=>acceptPaintComponent(p,c)).length,1,key);
  }
});
test('final station and Bremen repairs supersede old copies without taking unrelated cities',()=>{
  assert.equal(paintOwner(component('frankfurt','osm/way/1419585196','roof')),'infill');
  assert.equal(paintOwner(component('frankfurt','osm/way/293717947','facade')),'infill');
  assert.equal(paintOwner(component('bremen','osm/relation/2173872','central-front')),'bremen');
  assert.equal(paintOwner(component('berlin','osm/way/1419585196','roof')),'city');
  assert.equal(paintOwner(component('frankfurt','osm/way/999999999999','ordinary')),'city');
});
test('derived detail inherits the frozen source owner, while unrelated buildings stay in the base renderer',()=>{
  for(const provider of ['root500','delegated500','tier300']){
    const [key]=Object.entries(registry.parts).find(([,r])=>r.provider===provider);
    const [city,objectId,partId]=key.split('|');
    assert.equal(paintOwner(component(city,objectId,partId+'/additional-accepted-detail')),provider);
  }
  assert.equal(paintOwner(component('berlin','osm/way/999999999999','unrelated')),'city');
});
test('the final St Agnes native roof and tower repairs retain the church shader',()=>{
  assert.equal(paintOwner(component('cologne','osm/way/691070120','native-tower')),'church');
  assert.equal(paintOwner(component('cologne','osm/way/691070113','native-wall')),'church');
});
test('frozen table reads verify bytes and preserve independent JSON initializer values',async()=>{
  const text='{"positions":[-0,0.1234567890123456,19.125],"color":[0.62,0.59,0.51]}';
  const bytes=new TextEncoder().encode(text),sha=createHash('sha256').update(bytes).digest('hex');
  const descriptor={path:`/safety/buildings3d/painted-tables/${sha.slice(0,2)}/${sha}.json`,sha256:sha,bytes:bytes.length};
  const store=createFrozenTableStore([descriptor]);assert.throws(()=>store.read(sha),/not been verified/);
  await store.prepare(async(path,signal,max)=>{assert.equal(path,descriptor.path);assert.equal(max,bytes.length);return bytes;},new AbortController().signal);
  const first=store.read(sha),second=store.read(sha);assert.notEqual(first,second);assert(Object.is(first.positions[0],-0));
  assert.equal(first.positions[1],0.1234567890123456);first.color[0]=1;assert.equal(second.color[0],0.62);
  const bad=createFrozenTableStore([descriptor]);await assert.rejects(bad.prepare(async()=>new Uint8Array(bytes.length),new AbortController().signal),/hash mismatch/);assert.throws(()=>bad.read(sha),/not been verified/);
  const cancel=new AbortController();cancel.abort();let reads=0;await assert.rejects(bad.prepare(async()=>{reads++;return bytes;},cancel.signal),/abort/i);assert.equal(reads,0);
});
// FrozenDataRef literals ({canonicalSHA256,file,occurrence,codec}) declared by
// a module or by the modules it re-exports from; a hash may name a same-file
// string constant. Parsed with TypeScript, never evaluated.
const refCache=new Map();
async function frozenRefs(url,seen=new Set()){
  if(seen.has(url.href))return[];seen.add(url.href);
  if(!refCache.has(url.href)){
    const sf=ts.createSourceFile(url.pathname,await readFile(url,'utf8'),ts.ScriptTarget.Latest,false),constants=new Map(),objects=[],reexports=[];
    (function visit(node){
      if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer&&ts.isStringLiteralLike(node.initializer))constants.set(node.name.text,node.initializer.text);
      if(ts.isObjectLiteralExpression(node))objects.push(node);
      if(ts.isExportDeclaration(node)&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text.startsWith('.'))reexports.push(node.moduleSpecifier.text);
      ts.forEachChild(node,visit);
    })(sf);
    const value=node=>ts.isStringLiteralLike(node)?node.text:ts.isNumericLiteral(node)?Number(node.text):ts.isIdentifier(node)?constants.get(node.text):undefined,refs=[];
    for(const object of objects){
      const fields=new Map(object.properties.filter(ts.isPropertyAssignment).map(property=>[property.name.text,property.initializer]));
      if(['canonicalSHA256','file','occurrence','codec'].every(name=>fields.has(name)))refs.push(Object.fromEntries(['canonicalSHA256','file','occurrence','codec'].map(name=>[name,value(fields.get(name))])));
    }
    refCache.set(url.href,{refs,reexports});
  }
  const {refs,reexports}=refCache.get(url.href),nested=[];
  for(const specifier of reexports)nested.push(...await frozenRefs(new URL(specifier+'.ts',url),seen));
  return[...refs,...nested];
}
test('packed geometry/material tables retain every original byte of numeric data',async()=>{
  const rows=JSON.parse(await readFile(new URL('../../reports/building-textures/packed-table-integrity.json',import.meta.url)));
  for(const row of rows){
    const source=await readFile(new URL('../../'+row.path,import.meta.url),'utf8');
    if(row.external){
      let initializerPath=row.path;
      if(row.sharedInitializer){
        assert(source.includes("from '"+row.reexportSpecifier+"'")||source.includes('from '+JSON.stringify(row.reexportSpecifier)));
        // A scope-owned table is re-exported as its resource ref and getter.
        const exported=name=>new RegExp('export\\s*\\{[^}]*\\b'+name+'\\b').test(source);
        assert(exported(row.variable)||exported(row.variable+'_RESOURCE')&&exported('get'+row.variable),row.path+' re-exports '+row.variable+' or both its scoped resource and getter');
        initializerPath=row.sharedInitializer;
      }
      // The initializer binds the table by content address: either a legacy
      // module read (readFrozenTable[Async]("<sha>")) or a FrozenDataRef whose
      // canonical hash is this table and whose file is this initializer, the
      // allowlisted key the frozen lease store resolves and verifies.
      const initializer=await readFile(new URL('../../'+initializerPath,import.meta.url),'utf8');
      const legacy=initializer.includes('readFrozenTable("'+row.sha256+'")')||initializer.includes('readFrozenTableAsync("'+row.sha256+'",');
      if(!legacy){
        const refs=await frozenRefs(new URL('../../'+initializerPath,import.meta.url));
        assert(refs.some(ref=>ref.canonicalSHA256===row.sha256&&ref.file===initializerPath.replace(/^web\/src\//,'')&&Number.isSafeInteger(ref.occurrence)&&ref.occurrence>=0&&ref.codec==='json'),initializerPath+' binds '+row.variable+' by content address ('+row.sha256+')');
      }
      assert(row.assetPath.endsWith('/'+row.sha256+'.json'));
      continue;
    }
    const at=source.indexOf('JSON.parse(',source.indexOf('const '+row.variable));
    assert(at>=0,row.path+' '+row.variable);
    // JSON strings are decoded by the same native parser used by the browser.
    const start=at+11;assert.equal(source[start],'"',row.path);
    let end=start+1;while(end<source.length){if(source[end]==='\\'){end+=2;continue;}if(source[end++]==='"')break;}
    const literal=JSON.parse(source.slice(start,end));
    // Embedded JSON may carry public provenance labels. The original source
    // fingerprint remains recorded separately from the exact bytes shipped.
    const expected=row.publicLiteral??{sha256:row.sha256,bytes:row.literalBytes};
    assert.equal(Buffer.byteLength(literal),expected.bytes,row.path+' '+row.variable+' length');
    assert.equal(createHash('sha256').update(literal).digest('hex'),expected.sha256,row.path+' '+row.variable);
  }
});
test('pinned final assets use immutable content addresses within each implementation',async()=>{
  const assets=JSON.parse(await readFile(new URL('../src/safety/paint-asset-registry.json',import.meta.url)));
  const resolution=JSON.parse(await readFile(new URL('../../reports/building-textures/asset-resolution.json',import.meta.url)));
  assert.equal(resolution.missing.length,0);
  for(const row of resolution.found){
    assert.equal(assets[row.provider][row.path],row.resolvedPath);
    assert(row.resolvedPath.includes('/'+row.sha256+'.'));
  }
  assert.equal(new Set(resolution.found.map(r=>r.resolvedPath)).size,resolution.uniqueFiles);
});

const providerPlugin={name:'frozen-provider-test-double',setup(build){
  build.onResolve({filter:/\/frozen-paint-tables$/},()=>({path:'frozen-tables',namespace:'test-store'}));
  build.onLoad({filter:/.*/,namespace:'test-store'},()=>({contents:'export const preloadFrozenPaintTables=async()=>()=>{}; export const beginFrozenPaintTableInitialization=()=>({active:true,wait:p=>p,settled:()=>Promise.resolve(),close(){}}); export const frozenPaintTableStats=()=>({}); export const createFrozenDataResourceOwner=options=>globalThis.__frozenDataOwner(options);',loader:'js'}));
  build.onResolve({filter:/painted\/[^/]+\/safety\/(?:three-dimensional-map|building-mesh-renderer)$/},args=>({path:args.path,namespace:'provider'}));
  build.onLoad({filter:/.*/,namespace:'provider'},args=>({contents:`export const installThreeDimensionalMap=options=>globalThis.__paintProvider(${JSON.stringify(args.path.split('/painted/')[1].split('/')[0])},options);`,loader:'js'}));
}};
const {installThreeDimensionalMap}=await bundle('painted-map.ts',[providerPlugin]);

test('one camera owner, shared bounded reads, all layers exposed for recovery, and complete disposal',async t=>{
  const previousDocument=globalThis.document,previousFactory=globalThis.__paintProvider,previousOwner=globalThis.__frozenDataOwner;
  globalThis.document={hidden:false};
  t.after(()=>{globalThis.document=previousDocument;globalThis.__paintProvider=previousFactory;globalThis.__frozenDataOwner=previousOwner;});
  const calls=[],managers=[],preparations=new Map();let active=0,peak=0,reads=0,fullStatsReads=0,cacheReads=0;
  let cachedReadiness={ticket:1,inspections:3,phase:'waiting',recordedAtMs:17,performanceTimeOriginMs:1000};
  const owners=[],clients=[],resourceStats={active:0,queued:0,waiters:0,leases:1};
  globalThis.__frozenDataOwner=options=>{owners.push(options);return{client(provider){const client={provider,dispose(){}};clients.push(client);return client;},get stats(){return {...resourceStats};},destroy(){calls.push(['resources','destroy']);}};};
  globalThis.__paintProvider=(provider,options)=>{
    assert.equal(options.frozenData,clients.find(client=>client.provider===provider));
    const preparation={schemaVersion:1,pending:1,failed:0,ready:0};preparations.set(provider,preparation);
    const r={layer:{id:'source-building-meshes-'+provider},get stats(){fullStatsReads++;return{vertices:3,components:1};},getProgramPreparationStats:()=>[{provider,...preparation}],setPageHidden(){},setReducedMotion(){},setOpacityContext(){},getRevision:()=>({generation:1,viewRevision:1}),isPickReady:()=>true,diagnosticScreenSamples:()=>[],destroy(){}};
    let mode='2d'; const visibility={provider,hidden:undefined,viewport:true};
    const m={getModelViewProjection:options.getModelViewProjection,runVisiblePreparation:options.runVisiblePreparation,async requestMode(next,signal){calls.push([provider,options.manageCamera,next]);await options.fetchBytes('/safety/shared.json',signal,64);mode=next;options.onRenderer?.(r);return{mode,status:'ready'};},get mode(){return mode;},getDrawReadinessDiagnostic:provider==='root500'?()=>cachedReadiness:undefined,cacheStats:()=>{cacheReads++;return{};},visibility,setPageHidden(value){visibility.hidden=value;},...(provider==='root500'?{setViewportVisible(value){visibility.viewport=value;}}:{}),setReducedMotion(){},setOpacityContext(){},suspend(){},resume(){},destroy(){calls.push([provider,'destroy']);}};
    managers.push(m);return m;
  };
  const camera={zoom:17,projection:undefined},canvas={clientWidth:800,clientHeight:600,width:1600,height:1200};
  const renderListeners=new Set();let frameRequests=0;
  const map={on:(type,fn)=>{assert.equal(type,"render");renderListeners.add(fn);},off:(_type,fn)=>renderListeners.delete(fn),triggerRepaint:()=>{frameRequests++;},getCenter:()=>({lng:13,lat:52}),getPadding:()=>({top:0,right:0,bottom:0,left:0}),getCanvas:()=>canvas,getZoom:()=>camera.zoom,getBearing:()=>0,getPitch:()=>45,getRoll:()=>0,getVerticalFieldOfView:()=>36.87,getCenterElevation:()=>0,getProjection:()=>camera.projection};
  // The device profile is explicit (no matchMedia in Node); it only selects the page ledger profile.
  const manager=installThreeDimensionalMap({map,city:'berlin',mobile:false,fetchBytes:async()=>{active++;peak=Math.max(peak,active);reads++;await new Promise(r=>setTimeout(r,5));active--;return new Uint8Array([1,2,3]);}});
  assert.equal(owners.length,1);assert.equal(owners[0].city,'berlin');assert.equal(owners[0].profileSHA256,null);assert.equal(typeof owners[0].read,'function');
  // The compositor keeps one render subscription for retired GPU/CPU resource
  // collection from install to destroy; the assertions below count one-frame
  // camera waiters separately from it.
  const collectors=new Set(renderListeners);assert.equal(collectors.size,1,'install registers exactly one retired-resource collector');
  const frameWaiters=()=>[...renderListeners].filter(listener=>!collectors.has(listener)).length;
  manager.setViewportVisible(false);
  assert.equal(managers.length,0,'visibility setters keep the 3D modules lazy');
  await manager.requestMode('3d',new AbortController().signal);
  const rootVisibility=managers[0].visibility;
  assert.deepEqual(rootVisibility,{provider:'root500',hidden:false,viewport:false});
  assert(managers.slice(1).every(m=>m.visibility.hidden===true),'legacy providers inherit merged visibility before their first request');
  manager.setPageHidden(true);manager.setPageHidden(false);
  assert.equal(rootVisibility.viewport,false);assert.equal(rootVisibility.hidden,false);
  assert(managers.slice(1).every(m=>m.visibility.hidden===true),'document show does not resume offscreen providers');
  manager.setViewportVisible(true);
  assert(managers.every(m=>m.visibility.hidden===false));
  assert.equal(managers[0].getModelViewProjection(),undefined,'first preparation has a conservative unknown snapshot');
  const cityLayer=manager.paintLayers.find(layer=>layer.id==='source-building-meshes-city');
  assert(manager.paintLayers.filter(layer=>layer!==cityLayer).every(layer=>!layer.prerender),'only the camera owner publishes the shared matrix');
  const matrix=new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  const frame=()=>cityLayer.prerender({drawingBufferWidth:1600,drawingBufferHeight:1200},{defaultProjectionData:{mainMatrix:matrix,projectionTransition:0}});
  frame();const projected=managers[0].getModelViewProjection();
  assert(projected);assert(managers.every(m=>m.getModelViewProjection()===projected));
  camera.projection={type:'mercator'};
  assert.equal(managers[0].getModelViewProjection(),projected,'omitted style projection uses the same Mercator camera as an explicit setting');
  matrix[0]=2;assert.equal(projected.mainMatrix[0],1,'the published snapshot does not alias MapLibre scratch storage');
  camera.zoom=18;assert.equal(managers[0].getModelViewProjection(),undefined,'a moved camera cannot reuse the prior render projection');
  let admission;
  const preparation=managers[0].runVisiblePreparation(new AbortController().signal,async()=>{admission=managers[0].getModelViewProjection();});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(admission,undefined);assert.equal(frameRequests,1);assert.equal(frameWaiters(),1);
  frame();for(const listener of [...renderListeners])listener();await preparation;
  assert.equal(admission.mainMatrix[0],2,'a cached read still admits against the newly rendered camera');
  assert.equal(frameWaiters(),0);assert.deepEqual([...renderListeners],[...collectors],'the frame waiter left; the collector stays');
  camera.zoom=19;const canceled=new AbortController();
  const pending=managers[0].runVisiblePreparation(canceled.signal,async()=>{throw Error('canceled admission ran');});
  const rejected=assert.rejects(pending,{name:'AbortError'});
  await new Promise(resolve=>setImmediate(resolve));canceled.abort();await rejected;
  assert.equal(frameWaiters(),0,'cancellation removes the one-frame waiter');
  frame();
  manager.setViewportVisible(false);manager.setViewportVisible(true);assert.equal(managers[0].getModelViewProjection(),undefined);
  frame();manager.suspend();manager.resume();assert.equal(managers[0].getModelViewProjection(),undefined,'recovery needs a newly rendered matrix');
  frame();assert(managers[0].getModelViewProjection());
  assert.equal(calls.filter(c=>c[1]===true).length,1);
  assert.equal(calls[0][0],'city');assert(peak<=2);
  assert(reads<=2,'supplemental providers must share pending reads');
  assert.equal(manager.paintLayers.length,5);
  assert.equal(manager.renderer.stats.vertices,15);
  const expensiveReads=fullStatsReads,first=manager.renderer.getProgramPreparationStats();
  assert.deepEqual(first.map(row=>row.provider),['root500','delegated500','tier300','church','city']);
  assert(first.every(row=>row.pending===1));preparations.get('city').pending=0;
  assert.equal(manager.renderer.getProgramPreparationStats().find(row=>row.provider==='city').pending,0);
  assert.equal(first.find(row=>row.provider==='city').pending,1,'prior scalar snapshot stays unchanged');
  assert.equal(fullStatsReads,expensiveReads,'live preparation never reads full projection-heavy statistics');
  const firstResources=manager.getFrozenDataResourceStats();resourceStats.leases=0;
  assert.equal(firstResources.leases,1);assert.equal(manager.getFrozenDataResourceStats().leases,0);
  assert.equal(fullStatsReads,expensiveReads,'resource ownership does not read projection-heavy statistics');
  const previousCacheReads=cacheReads,firstReadiness=manager.getManagerDrawReadiness();
  assert.deepEqual(firstReadiness,[{provider:'root500',record:cachedReadiness}]);
  cachedReadiness={...cachedReadiness,phase:'timeout',recordedAtMs:29};
  assert.equal(manager.getManagerDrawReadiness()[0].record.phase,'timeout');
  assert.equal(firstReadiness[0].record.phase,'waiting','the prior cached record stays intact');
  assert.equal(manager.getManagerDrawReadiness()[0].record.recordedAtMs,29,'publication retains the actual cache clock');
  assert.equal(cacheReads,previousCacheReads,'readiness never invokes the full manager cache projection');
  assert.equal(fullStatsReads,expensiveReads,'readiness never reads full renderer statistics');
  assert.deepEqual(clients.map(client=>client.provider),['root500','delegated500','tier300','church','city']);
  manager.destroy();manager.destroy();assert.equal(calls.filter(c=>c[1]==='destroy').length,6);
  assert.equal(renderListeners.size,0,'destroy removes the retired-resource collector');
  assert.deepEqual(calls.at(-1),['resources','destroy'],'shared resources release after every consumer');
});
