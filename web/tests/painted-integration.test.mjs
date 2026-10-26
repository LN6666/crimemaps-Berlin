import {nullCityDataProfilePlugin} from './city-profile-test-plugin.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';

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
test('packed geometry/material tables retain every original byte of numeric data',async()=>{
  const rows=JSON.parse(await readFile(new URL('../../reports/building-textures/packed-table-integrity.json',import.meta.url)));
  for(const row of rows){
    const source=await readFile(new URL('../../'+row.path,import.meta.url),'utf8');
    if(row.external){
      let initializer=source;
      if(row.sharedInitializer){
        assert(source.includes("from '"+row.reexportSpecifier+"'")||source.includes('from '+JSON.stringify(row.reexportSpecifier)));
        assert(new RegExp('export\\s*\\{[^}]*\\b'+row.variable+'\\b').test(source));
        initializer=await readFile(new URL('../../'+row.sharedInitializer,import.meta.url),'utf8');
      }
      assert(initializer.includes('readFrozenTable("'+row.sha256+'")')||initializer.includes('readFrozenTableAsync("'+row.sha256+'",'));
      assert(row.assetPath.endsWith('/'+row.sha256+'.json'));
      continue;
    }
    const at=source.indexOf('JSON.parse(',source.indexOf('const '+row.variable));
    assert(at>=0,row.path+' '+row.variable);
    // JSON strings are decoded by the same native parser used by the browser.
    const start=at+11;assert.equal(source[start],'"',row.path);
    let end=start+1;while(end<source.length){if(source[end]==='\\'){end+=2;continue;}if(source[end++]==='"')break;}
    const literal=JSON.parse(source.slice(start,end));
    assert.equal(createHash('sha256').update(literal).digest('hex'),row.sha256,row.path+' '+row.variable);
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
  build.onLoad({filter:/.*/,namespace:'test-store'},()=>({contents:'export const preloadFrozenPaintTables=async()=>()=>{}; export const beginFrozenPaintTableInitialization=()=>({active:true,wait:p=>p,close(){}}); export const frozenPaintTableStats=()=>({});',loader:'js'}));
  build.onResolve({filter:/painted\/[^/]+\/safety\/(?:three-dimensional-map|building-mesh-renderer)$/},args=>({path:args.path,namespace:'provider'}));
  build.onLoad({filter:/.*/,namespace:'provider'},args=>({contents:`export const installThreeDimensionalMap=options=>globalThis.__paintProvider(${JSON.stringify(args.path.split('/painted/')[1].split('/')[0])},options);`,loader:'js'}));
}};
const {installThreeDimensionalMap}=await bundle('painted-map.ts',[providerPlugin]);

test('one camera owner, shared bounded reads, all layers exposed for recovery, and complete disposal',async t=>{
  const previousDocument=globalThis.document,previousFactory=globalThis.__paintProvider;
  globalThis.document={hidden:false};
  t.after(()=>{globalThis.document=previousDocument;globalThis.__paintProvider=previousFactory;});
  const calls=[],managers=[];let active=0,peak=0,reads=0;
  globalThis.__paintProvider=(provider,options)=>{
    const r={layer:{id:'source-building-meshes-'+provider},stats:{vertices:3,components:1},setPageHidden(){},setReducedMotion(){},setOpacityContext(){},getRevision:()=>({generation:1,viewRevision:1}),isPickReady:()=>true,diagnosticScreenSamples:()=>[],destroy(){}};
    let mode='2d';
    const m={async requestMode(next,signal){calls.push([provider,options.manageCamera,next]);await options.fetchBytes('/safety/shared.json',signal,64);mode=next;options.onRenderer?.(r);return{mode,status:'ready'};},get mode(){return mode;},cacheStats:()=>({}),setPageHidden(){},setReducedMotion(){},setOpacityContext(){},suspend(){},resume(){},destroy(){calls.push([provider,'destroy']);}};
    managers.push(m);return m;
  };
  const manager=installThreeDimensionalMap({map:{},city:'berlin',fetchBytes:async()=>{active++;peak=Math.max(peak,active);reads++;await new Promise(r=>setTimeout(r,5));active--;return new Uint8Array([1,2,3]);}});
  await manager.requestMode('3d',new AbortController().signal);
  assert.equal(calls.filter(c=>c[1]===true).length,1);
  assert.equal(calls[0][0],'city');assert(peak<=2);
  assert(reads<=2,'supplemental providers must share pending reads');
  assert.equal(manager.paintLayers.length,5);
  assert.equal(manager.renderer.stats.vertices,15);
  manager.destroy();assert.equal(calls.filter(c=>c[1]==='destroy').length,5);
});
