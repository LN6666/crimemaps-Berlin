import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const web=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(new URL('../package.json',import.meta.url));
const {transform}=require('esbuild');
const esm=async(contents)=>'data:text/javascript;base64,'+Buffer.from((await transform(contents,{loader:'ts',format:'esm',target:'es2022'})).code).toString('base64');
const vectorSource=await readFile(path.join(web,'src/safety/vector-basemap.ts'),'utf8');
const vectorURL=await esm(vectorSource.replace("import {locale} from './i18n';","const locale='en';"));
const {addVectorBasemap,removeVectorBasemap,VECTOR_SOURCE}=await import(vectorURL);
const basemapsSource=await readFile(path.join(web,'src/safety/basemaps.ts'),'utf8');
const {Basemaps}=await import(await esm(basemapsSource.replace('from "./vector-basemap"',`from ${JSON.stringify(vectorURL)}`).replace('import {t} from "./i18n";',"const t=(key:string)=>key;")));

class TestMap {
  sources=new Map(['roads','police','pois','base-shop-label-source'].map(id=>[id,{type:'geojson'}]));
  layers=[{id:'background',type:'background'},{id:'roads-line',type:'line',source:'roads'},
    {id:'scene-point',type:'circle',source:'police'},{id:'poi-point',type:'circle',source:'pois'},
    {id:'base-shop-labels',type:'symbol',source:'base-shop-label-source'}];
  camera={center:[13.3762,52.5186],zoom:18,bearing:-25,pitch:50};
  calls=[];layouts=new Map();errors=new Set();
  getStyle(){return{layers:this.layers};}
  getLayer(id){return this.layers.find(layer=>layer.id===id);}
  getSource(id){return this.sources.get(id);}
  addSource(id,value){assert.ok(!this.sources.has(id),'duplicate source '+id);this.sources.set(id,value);}
  removeSource(id){
    const dependent=this.layers.find(layer=>layer.source===id);
    assert.equal(dependent,undefined,`Source "${id}" cannot be removed while layer "${dependent?.id}" is using it.`);
    this.calls.push(['source',id]);this.sources.delete(id);
  }
  addLayer(layer,before){assert.equal(this.getLayer(layer.id),undefined);const at=this.layers.findIndex(item=>item.id===before);if(at<0)this.layers.push(layer);else this.layers.splice(at,0,layer);}
  removeLayer(id){this.calls.push(['layer',id]);this.layers=this.layers.filter(layer=>layer.id!==id);}
  setGlyphs(){}
  setLayoutProperty(id,key,value){this.layouts.set(id+':'+key,value);}
  on(name,listener){assert.equal(name,'error');this.errors.add(listener);}
  off(name,listener){assert.equal(name,'error');this.errors.delete(listener);}
  fail(sourceId){for(const listener of this.errors)listener({sourceId,error:new Error('ERR_NETWORK_CHANGED')});}
}
const addRecords=map=>map.addLayer({id:'base-shop-records',type:'circle',source:VECTOR_SOURCE,'source-layer':'pois'});

test('actual removal drops every direct vector-source layer before its source, preserving unrelated layers and camera',()=>{
  const map=new TestMap(),originalLayers=[...map.layers],originalSources=new Map(map.sources),camera=structuredClone(map.camera);
  addVectorBasemap(map);addRecords(map);
  map.addLayer({id:'another-vector-consumer',type:'line',source:VECTOR_SOURCE});
  map.addLayer({id:'basemap-vector-unrelated',type:'line',source:'police'});
  const extra=map.getLayer('basemap-vector-unrelated');removeVectorBasemap(map);
  assert.equal(map.getSource(VECTOR_SOURCE),undefined);assert.deepEqual(map.layers,[...originalLayers,extra]);
  for(const [id,source] of originalSources)assert.equal(map.getSource(id),source);
  assert.deepEqual(map.camera,camera);assert.deepEqual(map.calls.at(-1),['source',VECTOR_SOURCE]);
  assert.ok(map.calls.find(call=>call[0]==='layer'&&call[1]==='base-shop-records'));
  assert.ok(map.calls.find(call=>call[0]==='layer'&&call[1]==='another-vector-consumer'));
});

test('missing source/style/layer list and repeated removal are harmless',()=>{
  const map=new TestMap();map.getStyle=()=>{throw Error('no style should be inspected without the source');};
  assert.doesNotThrow(()=>removeVectorBasemap(map));assert.equal(map.calls.length,0);
  for(const style of [undefined,{},{layers:[]}]){
    const empty=new TestMap();empty.layers=[];empty.sources.set(VECTOR_SOURCE,{type:'vector'});empty.getStyle=()=>style;
    assert.doesNotThrow(()=>removeVectorBasemap(empty));assert.equal(empty.getSource(VECTOR_SOURCE),undefined);
    assert.doesNotThrow(()=>removeVectorBasemap(empty));assert.equal(empty.calls.length,1);
  }
});

test('stale style entries for an already removed dependent layer are tolerated',()=>{
  const map=new TestMap();map.sources.set(VECTOR_SOURCE,{type:'vector'});
  const live=map.layers;map.getStyle=()=>({layers:[...live,{id:'already-gone',type:'circle',source:VECTOR_SOURCE}]});
  removeVectorBasemap(map);assert.deepEqual(map.calls,[['source',VECTOR_SOURCE]]);assert.deepEqual(map.layers,live);
});

test('real Basemaps switches and repeated source errors remove records before fallback and allow vector retry',()=>{
  const map=new TestMap(),originalLayers=[...map.layers],originalSources=new Map(map.sources),camera=structuredClone(map.camera),failures=[];
  let changes=0;const basemaps=new Basemaps(map,()=>{changes++;},id=>failures.push(id));
  basemaps.select('vector');addRecords(map);
  // The network error path does not first call baseShopLabels.setBasemapActive(false).
  map.fail(VECTOR_SOURCE);map.fail(VECTOR_SOURCE);
  assert.equal(basemaps.selected,'vector');assert.equal(basemaps.rendered,'local');assert.deepEqual(failures,['vector']);assert.equal(changes,2);
  assert.equal(map.getSource(VECTOR_SOURCE),undefined);assert.equal(map.getLayer('base-shop-records'),undefined);
  assert.equal(map.layouts.get('roads-line:visibility'),'visible');assert.deepEqual(map.layers,originalLayers);
  basemaps.select('vector');addRecords(map);assert.equal(basemaps.rendered,'vector');
  basemaps.select('street');assert.equal(map.getSource(VECTOR_SOURCE),undefined);assert.equal(map.getLayer('base-shop-records'),undefined);
  map.fail(VECTOR_SOURCE);assert.equal(basemaps.rendered,'street');assert.deepEqual(failures,['vector']);
  basemaps.select('vector');addRecords(map);basemaps.select('local');basemaps.select('local');
  assert.deepEqual(map.layers,originalLayers);for(const [id,source] of originalSources)assert.equal(map.getSource(id),source);assert.deepEqual(map.camera,camera);
  basemaps.dispose();assert.equal(map.errors.size,0);
});
