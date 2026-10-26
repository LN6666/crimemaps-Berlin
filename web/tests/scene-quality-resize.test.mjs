import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

// Promoted location: web/tests. Private runs point at the same installed dependency.
const webRoot=process.env.CRIMEMAPS_QUALITY_WEB_ROOT??fileURLToPath(new URL('../',import.meta.url));
const modulePath=process.env.CRIMEMAPS_QUALITY_MODULE??path.join(webRoot,'src/safety/scene-render-quality.ts');
const source=await fs.readFile(modulePath,'utf8');
const {installSceneRenderQuality,scenePixelRatio}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'strip'})).toString('base64'));
const mapSource=await fs.readFile(path.join(webRoot,'node_modules/maplibre-gl/src/ui/map.ts'),'utf8');
function method(signature,source=mapSource,bodyMarker='{'){
 const start=source.indexOf(signature);assert(start>=0,'actual method exists: '+signature);
 const marker=source.indexOf(bodyMarker,start),open=marker+bodyMarker.length-1;assert(marker>=0);
 let depth=1,end=open+1;
 for(;depth&&end<source.length;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
 assert.equal(depth,0);return source.slice(start,end);
}
const resize=method('resize(eventData?: any, constrainTransform = true): this {');
const setPixelRatio=method('setPixelRatio(pixelRatio: number): void {');
// Execute both real MapLibre method bodies, with only GPU/camera plumbing stubbed.
const MapFixture=new Function(stripTypeScriptTypes(`
 class MapMovementEvent {constructor(type,eventData){this.type=type;}}
 class MapLibreEvent {constructor(type,eventData){this.type=type;}}
 class MapFixture {
  constructor(){this._camera={_moving:false};this._lostContextStyle={style:null};this._overridePixelRatio=undefined;this.handlers=new Map();this.ratios=[];this.depth=0;this.maxDepth=0;this.width=1280;this.height=720;}
  on(type,fn){const rows=this.handlers.get(type)??new Set();rows.add(fn);this.handlers.set(type,rows);}
  off(type,fn){this.handlers.get(type)?.delete(fn);}
  fire(event){for(const fn of [...this.handlers.get(event.type)??[]])fn(event);return this;}
  stop(){return this;}
  _resizeInternal(){this.ratios.push(this.getPixelRatio());}
  getPixelRatio(){return this._overridePixelRatio??globalThis.devicePixelRatio;}
  getCanvas(){return{width:this.width*this.getPixelRatio(),height:this.height*this.getPixelRatio(),getBoundingClientRect:()=>({width:this.width,height:this.height})};}
  ${resize}
  ${setPixelRatio}
 }`,{mode:'strip'})+'\nreturn MapFixture;')();
function fixture(){
 const previousWindow=globalThis.window,previousRatio=globalThis.devicePixelRatio;
 const resizeListeners=new Set();globalThis.devicePixelRatio=2;globalThis.window={addEventListener(type,fn){assert.equal(type,'resize');resizeListeners.add(fn);},removeEventListener(type,fn){resizeListeners.delete(fn);}};
 const map=new MapFixture(),actualSet=map.setPixelRatio;
 map.setPixelRatio=function(value){this.depth++;this.maxDepth=Math.max(this.maxDepth,this.depth);try{return actualSet.call(this,value);}finally{this.depth--;}};
 return{map,resize(){for(const fn of [...resizeListeners])fn();},cleanup(){globalThis.window=previousWindow;globalThis.devicePixelRatio=previousRatio;},listeners:resizeListeners};
}
test('balanced installation cannot recurse through MapLibre synthetic movement events',()=>{
 const f=fixture();try{const q=installSceneRenderQuality(f.map);assert.deepEqual(f.map.ratios,[1.5]);assert.equal(f.map.maxDepth,1);assert.equal(q.stats.moving,false);q.destroy();}finally{f.cleanup();}
});
test('camera movement keeps the selected DPR without creating resize movement events',()=>{
 const f=fixture();try{const q=installSceneRenderQuality(f.map);f.map._camera._moving=true;f.map.fire({type:'movestart'});assert.equal(f.map.getPixelRatio(),1.5);assert.equal(q.stats.moving,true);f.map._camera._moving=false;f.map.fire({type:'moveend'});assert.equal(f.map.getPixelRatio(),1.5);assert.equal(q.stats.moving,false);assert.deepEqual(f.map.ratios,[1.5]);assert.equal(f.map.maxDepth,1);q.destroy();}finally{f.cleanup();}
});
test('quality selection and window resize preserve pixel budgets with bounded updates',()=>{
 const f=fixture();try{const q=installSceneRenderQuality(f.map);f.map._camera._moving=true;f.map.fire({type:'movestart'});q.setQuality('detail');assert.equal(f.map.getPixelRatio(),2);assert.equal(q.stats.moving,true);f.map._camera._moving=false;f.map.fire({type:'moveend'});assert.equal(f.map.getPixelRatio(),2);q.setQuality('economy');assert.equal(f.map.getPixelRatio(),1);q.setQuality('balanced');assert.equal(f.map.getPixelRatio(),1.5);const before=f.map.ratios.length;q.setQuality('balanced');assert.equal(f.map.ratios.length,before);f.map.width=4000;f.map.height=2000;f.resize();assert.equal(f.map.getPixelRatio(),scenePixelRatio('balanced',2,4000,2000,false));assert.equal(q.stats.moving,false);assert.equal(f.map.maxDepth,1);q.destroy();}finally{f.cleanup();}
});
test('an exception clears the write guard and destroy removes all quality listeners',()=>{
 const f=fixture();try{const q=installSceneRenderQuality(f.map);const setter=f.map.setPixelRatio;let fail=true;f.map.setPixelRatio=function(value){if(fail){fail=false;throw Error('fixture GPU resize failure');}return setter.call(this,value);};assert.throws(()=>q.setQuality('detail'),/fixture GPU resize failure/);f.resize();assert.equal(f.map.getPixelRatio(),2);assert.equal(f.map.maxDepth,1);q.destroy();q.destroy();assert.equal(f.listeners.size,0);assert.equal(f.map.handlers.get('movestart').size,0);assert.equal(f.map.handlers.get('moveend').size,0);const before=f.map.ratios.length;f.map.fire({type:'movestart'});f.resize();q.setQuality('economy');assert.equal(f.map.ratios.length,before);}finally{f.cleanup();}
});

const cameraSource=await fs.readFile(path.join(webRoot,'node_modules/maplibre-gl/src/ui/camera.ts'),'utf8');
const citySource=await fs.readFile(path.join(webRoot,'src/painted/city/safety/three-dimensional-map.ts'),'utf8');
const CameraFixture=new Function(stripTypeScriptTypes(`
 class MapMovementEvent {constructor(type,eventData){this.type=type;}}
 class CameraFixture {
  constructor(map){this.map=map;this._moving=false;}
  fire(event){this.map.fire(event);return this;}
  _stopHandlers(){}
  _cancelRenderFrame(){}
  ${method('_prepareEase(eventData: any, noMoveStart: boolean,',cameraSource,'): void {')}
  ${method('_afterEase(eventData?: Record<string, unknown>, easeId?: string): void {',cameraSource)}
  ${method('stop(allowGestures?: boolean): this {',cameraSource)}
  ${method('_stop(allowGestures?: boolean, easeId?: string): this {',cameraSource)}
 }`,{mode:'strip'})+'\nreturn CameraFixture;')();
// Use the actual city request, camera completion and movement cancellation code.
// Only asset/GPU readiness and the clock are stubs; no fixture abort is injected.
const residentSource=await fs.readFile(path.join(webRoot,'src/safety/recovery-resident-reuse.ts'),'utf8');
const {createRecoveryResidentReuse}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(residentSource,{mode:'strip'})).toString('base64'));
const cityTransition=new Function('createRecoveryResidentReuse',stripTypeScriptTypes(`
function cityTransition(map){
 let destroyed=false,suspended=false,revision=0,request=new AbortController(),
     mode='2d',wantedMode='2d',preparingTicket,ownCameraStartingTicket,cameraMotionTicket,lastError;
 const recoveryResident=createRecoveryResidentReuse(()=>undefined);
 const stages=[],announcements=[],options={manageCamera:true,onState:value=>announcements.push(value)};
 const renderer={setEnabled(){},suspendSelection(){}};
 const pageIsHidden=()=>false,visibleReadinessDeadline=()=>()=>{};
 const ensure=async()=>{};
 const visible=async(signal,ticket,bootstrap)=>{current(signal,ticket);stages.push(bootstrap===true?'before-camera':'after-camera');return{status:'ready'};};
 ${method('function current(signal:AbortSignal,ticket:number)',citySource)}
 ${method('function moveCamera(signal:AbortSignal,ticket:number)',citySource)}
 ${method("function announce(status:ThreeDControlState['status'])",citySource)}
 ${method('async function requestMode(next:ThreeDViewMode,external:AbortSignal)',citySource)}
 ${method('const moveStarted=()=>{',citySource)};
 ${method('const moved=()=>{',citySource)};
 map.on('movestart',moveStarted);map.on('moveend',moved);
 return{requestMode,stages,announcements,get aborted(){return request.signal.aborted;},get revision(){return revision;}};
}
`,{mode:'strip'})+'\nreturn cityTransition;')(createRecoveryResidentReuse);
test('actual city camera transition is not aborted by a DPR-generated nested movement cycle',async()=>{
 const f=fixture(),previousMatchMedia=globalThis.matchMedia,trace=[];
 try{
  globalThis.matchMedia=()=>({matches:false});
  f.map._camera=new CameraFixture(f.map);
  const fire=f.map.fire;f.map.fire=function(event){trace.push({event:event.type,moving:this._camera._moving,ratio:this.getPixelRatio()});return fire.call(this,event);};
  f.map.stop=function(){trace.push({event:'stop',moving:this._camera._moving});this._camera.stop();return this;};
  f.map.easeTo=function(){this._camera._prepareEase(undefined,false,{});this.finishCamera=()=>this._camera._afterEase();return this;};
  f.map.isMoving=()=>f.map._camera._moving;f.map.getZoom=()=>16;f.map.triggerRepaint=()=>{};
  const q=installSceneRenderQuality(f.map);trace.length=0;
  const manager=cityTransition(f.map);
  const outcome=manager.requestMode('3d',new AbortController().signal).then(value=>({value}),error=>({error}));
  for(let i=0;i<4&&!f.map.finishCamera;i++)await Promise.resolve();
  assert.equal(typeof f.map.finishCamera,'function');f.map.finishCamera();
  const result=await outcome;
  if(process.env.CRIMEMAPS_QUALITY_TRACE)await fs.writeFile(process.env.CRIMEMAPS_QUALITY_TRACE,JSON.stringify({error:result.error?.name??null,value:result.value,stages:manager.stages,trace},null,2)+'\n');
  assert.equal(result.error,undefined,JSON.stringify({error:result.error?.name,trace}));
  assert.deepEqual(result.value,{mode:'3d',status:'ready'});
  assert.deepEqual(manager.stages,['before-camera','after-camera']);
  assert.deepEqual(trace.map(row=>row.event),['movestart','moveend']);
  assert.equal(manager.revision,1);assert.equal(q.stats.moving,false);
  assert.deepEqual(f.map.ratios,[1.5]);q.destroy();
 }finally{globalThis.matchMedia=previousMatchMedia;f.cleanup();}
});
