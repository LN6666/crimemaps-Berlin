import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const bundle=await build({entryPoints:[path.join(safety,'scene-solar-shadow-layer.ts')],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'core-observer',setup(b){b.onResolve({filter:/^\.\/scene-solar-shadow$/},()=>({path:'core',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export function createSceneSolarShadow(options){const log=globalThis.__solarLayerFixture;log.created.push(options);let source;return{setSource(value){source=value;log.sources.push(value);},capture(gl,settings){log.captures.push({gl,settings,revision:source.getPlanarReflectionRevision()});if(log.fail)throw Error('fixture capture');},resetGPU(){log.resets++;},destroy(){log.destroyed++;},get stats(){return{fixture:true};}}}` }));}}]});
const {installSceneSolarShadowLayer}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const solarBundle=await build({entryPoints:[path.join(safety,'scene-solar-light.ts')],bundle:true,write:false,platform:'node',format:'esm'});
const {sceneSolarLight}=await import('data:text/javascript;base64,'+Buffer.from(solarBundle.outputFiles[0].text).toString('base64'));
const initial={instantISO:'2026-06-21T12:00:00+02:00',sunlight:true,shadows:true,motion:true,quality:'balanced'};
function fixture(){
 const log={created:[],sources:[],captures:[],resets:0,destroyed:0,fail:false};globalThis.__solarLayerFixture=log;
 const events=new Map(),layers=new Map();let loaded=true,available=true,adds=0,repaints=0,revision='native1',light=sceneSolarLight(13.4,52.5,initial.instantISO);
 const emit=name=>{for(const fn of [...events.get(name)??[]])fn();};
 const map={getCenter:()=>({lng:13.4,lat:52.5}),isStyleLoaded:()=>loaded,getLayer:id=>layers.get(id),addLayer(layer){adds++;emit('styledata');layers.set(layer.id,layer);layer.onAdd?.();},removeLayer(id){const layer=layers.get(id);layers.delete(id);layer?.onRemove?.();emit('styledata');},on(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},off(name,fn){events.get(name)?.delete(fn);},triggerRepaint(){repaints++;}};
 const source={getPlanarReflectionRevision:()=>revision,renderPlanarReflection:()=>({triangles:0,draws:0,complete:true})};
 const owner=installSceneSolarShadowLayer({map,source,initial,solarLight:()=>light,mobile:true,available:()=>available}),gl={createVertexArray(){}};
 return{owner,map,source,log,gl,events,layers,emit,get adds(){return adds;},get repaints(){return repaints;},setLoaded:v=>loaded=v,setAvailable:v=>available=v,setRevision:v=>revision=v,setLight:v=>light=v,frame(){owner.customLayer?.prerender(gl);}};
}
test('only eligible prerender captures; initial2D and render never allocate GPU/core, source remains live',()=>{
 const f=fixture();try{assert.equal(f.owner.customLayer,undefined);assert.equal(f.adds,0);assert.equal(f.log.created.length,0);f.owner.setMode(true);assert.equal(f.adds,1);assert.equal(f.log.created.length,0);f.owner.customLayer.render();assert.equal(f.log.captures.length,0);f.frame();assert.equal(f.log.created.length,1);assert.equal(f.log.sources[0],f.source);assert.equal(f.log.captures.length,1);assert.equal(f.log.captures[0].settings.enabled,true);assert.equal(f.log.captures[0].settings.quality,'balanced');assert.ok(f.log.captures[0].settings.direction[1]>Math.sin(.5*Math.PI/180));f.setRevision('dedicated2+native3');f.frame();assert.equal(f.log.captures[1].revision,'dedicated2+native3');assert.equal(f.log.sources.length,1);assert.equal(f.owner.customLayer.renderingMode,'3d');}finally{f.owner.destroy();}
});
test('hidden, unavailable, suspended,2D, night, sunlight-off and shadow-off forbid capture and reset publication',()=>{
 const f=fixture();try{f.owner.setMode(true);f.frame();const count=()=>f.log.captures.length;let n=count();
  f.owner.setPageHidden(true);f.frame();assert.equal(count(),n);f.emit('styledata');assert.equal(f.adds,1);f.owner.setPageHidden(false);f.frame();n=count();
  f.setAvailable(false);f.frame();assert.equal(count(),n);f.setAvailable(true);f.owner.suspend();f.frame();assert.equal(count(),n);f.owner.resume();f.frame();n=count();
  for(const state of [{...initial,sunlight:false},{...initial,shadows:false},{...initial,instantISO:'2026-06-21T00:00:00+02:00'}]){const resets=f.log.resets;f.owner.setSceneEnvironment(state);f.frame();assert.equal(count(),n);assert.ok(f.log.resets>resets);}
  f.owner.setSceneEnvironment({...initial,quality:'economy'});f.frame();assert.equal(f.log.captures.at(-1).settings.quality,'economy');n=count();f.owner.setMode(false);f.frame();assert.equal(count(),n);assert.equal(f.owner.customLayer,undefined);
 }finally{f.owner.destroy();}
});
test('ordinary style reload readds only its layer, is reentrant, and central context registration stays idempotent',()=>{
 const f=fixture();try{f.owner.setMode(true);f.frame();const creates=f.log.created.length,resets=f.log.resets,layer=f.owner.customLayer;f.setLoaded(false);f.map.removeLayer(layer.id);assert.ok(f.log.resets>resets);f.emit('styledata');assert.equal(f.adds,1);f.setLoaded(true);f.emit('style.load');assert.equal(f.adds,2);assert.equal(f.log.created.length,creates);f.frame();assert.equal(f.log.captures.length,2);
  f.setAvailable(false);f.owner.suspend();f.map.removeLayer(layer.id);f.emit('style.load');assert.equal(f.adds,2);f.setAvailable(true);f.map.addLayer(f.owner.customLayer);assert.equal(f.adds,3);f.owner.resume();f.emit('styledata');assert.equal(f.adds,3);f.frame();assert.equal(f.log.captures.length,3);
 }finally{f.owner.destroy();}
});
test('BFcache suspend/resume keeps the owner; permanent destroy removes listeners and destroys core once',()=>{
 const f=fixture();f.owner.setMode(true);f.frame();const layer=f.owner.customLayer;f.owner.suspend();assert.equal(f.log.destroyed,0);layer.prerender(f.gl);assert.equal(f.log.captures.length,1);f.owner.resume();f.frame();assert.equal(f.log.captures.length,2);assert.equal(f.log.created.length,1);f.owner.destroy();f.owner.destroy();assert.equal(f.log.destroyed,1);assert.equal(f.layers.size,0);assert.ok([...f.events.values()].every(set=>set.size===0));f.emit('style.load');layer.prerender(f.gl);assert.equal(f.log.captures.length,2);assert.equal(f.owner.stats.destroyed,true);
});
test('unexpected capture exceptions latch without retrying every frame; explicit resume can retry',()=>{
 const f=fixture();try{f.owner.setMode(true);f.log.fail=true;f.frame();f.frame();assert.equal(f.log.captures.length,1);assert.equal(f.owner.stats.faulted,true);f.log.fail=false;f.owner.resume();f.frame();assert.equal(f.log.captures.length,2);}finally{f.owner.destroy();}
});
test('main wires every owner transition and keeps the single stable dedicated+aggregate source',async()=>{
 const main=await fs.readFile(path.join(safety,'main.ts'),'utf8');assert.equal((main.match(/buildingSolarShadow=installSceneSolarShadowLayer\(/g)??[]).length,1);assert.match(main,/source:planarReflectionGroup\(\(\)=>\[dedicatedAppearance,threeDimensional\?\.renderer\]\)/);assert.match(main,/buildingSolarShadow\?\.setMode\(state.mode==='3d'\)/);assert.match(main,/mapGPUUnavailable=true;buildingSolarShadow\?\.suspend\(\)/);assert.match(main,/threeDimensional\?\.resume\(\{contextRecovery:true\}\);buildingSolarShadow\?\.setPageHidden\(document.hidden\);buildingSolarShadow\?\.resume\(\)/);assert.match(main,/threeDimensional\?\.resume\(\);buildingSolarShadow\?\.setPageHidden\(document.hidden\);buildingSolarShadow\?\.resume\(\)/);assert.match(main,/buildingSolarShadow\?\.suspend\(\);statisticsRequest.abort/);assert.match(main,/buildingSolarShadow\?\.destroy\(\)/);assert.match(main,/solarShadow:buildingSolarShadow\?\.stats/);
});

test('resident sunlight is stable across pan and missing or stale-instant light forbids capture',()=>{const f=fixture();try{f.owner.setMode(true);f.frame();const before=f.log.captures[0].settings.direction;f.map.getCenter=()=>{throw Error('camera must not choose solar origin');};f.frame();assert.deepEqual(f.log.captures.at(-1).settings.direction,before);f.setLight(undefined);f.frame();assert.equal(f.log.captures.length,2);f.setLight(sceneSolarLight(13.4,52.5,'2026-06-20T12:00:00+02:00'));f.frame();assert.equal(f.log.captures.length,2);}finally{f.owner.destroy();}});
