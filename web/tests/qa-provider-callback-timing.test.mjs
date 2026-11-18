import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const main=readFileSync(new URL('../src/safety/painted-map.ts',import.meta.url),'utf8');
const timing=readFileSync(new URL('../src/safety/qa-custom-layer-render-timing.ts',import.meta.url),'utf8');
const ast=ts.createSourceFile('painted-map.ts',main,ts.ScriptTarget.Latest,true);
let bind,bindProjection,onRenderer;
(function visit(node){
 if(ts.isFunctionDeclaration(node)&&node.name?.text==='bindResourceContext')bind=node.getText(ast);
 if(ts.isFunctionDeclaration(node)&&node.name?.text==='bindModelViewProjection')bindProjection=node.getText(ast);
 if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='onRenderer'&&ts.isArrowFunction(node.initializer))onRenderer=node.initializer.getText(ast);
 ts.forEachChild(node,visit);
})(ast);
assert(bind,'exercise the actual compositor provider binding');
const compile=code=>ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup(hostname='127.0.0.1',search='?diagnostics=compact&qaPerf=1'){
 let clock=0,bindings=0;
 const context=vm.createContext({exports:{},URLSearchParams,location:{hostname,search},performance:{now:()=>clock},resourceLayers:new WeakSet(),boundContexts:new Set(),resourceStore:{},bindChunkResourceContext:()=>bindings++,
  provider:'city',pickRevisions:new Map(),pickGeneration:0,pickViewRevision:0,renderers:new Map(),hidden:false,viewportVisible:true,reduced:false,opacityContext:'normal',renderer:{},
  options:{map:{getCanvas:()=>({clientWidth:800,clientHeight:400})}},projectionActive:()=>true,modelViewKey:()=> 'camera',modelViewProjection:{publish(){clock+=7;},invalidate(){}},
 });
 vm.runInContext(compile(timing),context);
 context.withQaCustomLayerRenderTiming=context.exports.withQaCustomLayerRenderTiming;
 vm.runInContext(compile(bind+';'+bindProjection+';globalThis.install=bindResourceContext;globalThis.onRenderer='+onRenderer+';'),context);
 return{install:context.install,onRenderer:context.onRenderer,api:context.exports,advance:ms=>clock+=ms,bindings:()=>bindings,read:()=>JSON.parse(JSON.stringify(context.exports.qaCustomLayerRenderTiming()))};
}

test('the actual city onRenderer hookup times the projection prerender it adds',()=>{
 const f=setup(),layer={render(){}},engine={layer,setPageHidden(){},setReducedMotion(){},setOpacityContext(){}};
 f.onRenderer(engine);
 layer.prerender({drawingBufferWidth:600,drawingBufferHeight:300},{defaultProjectionData:{mainMatrix:new Float64Array(16),projectionTransition:0}});
 const d=f.read();assert.equal(d.totals[2].samples,1);assert.equal(d.totals[2].maxElapsedMs,7);
 assert.equal(d.totals[0].samples,0,'prerender is not mislabeled as a draw callback');
});

test('the compositor times actual provider render and prerender once while preserving arguments and this',()=>{
 const f=setup(),gl={},input={},map={},seen=[];
 const layer={
  onAdd(...args){assert.equal(this,layer);seen.push(['add',...args]);},
  render(...args){assert.equal(this,layer);seen.push(['render',...args]);f.advance(25);return 'draw-result';},
  prerender(...args){assert.equal(this,layer);seen.push(['prepare',...args]);f.advance(650);return 'prepare-result';},
 };
 f.install(layer);const render=layer.render,prerender=layer.prerender;f.install(layer);
 assert.equal(layer.render,render);assert.equal(layer.prerender,prerender);
 layer.onAdd(map,gl);assert.equal(f.bindings(),1);
 assert.equal(layer.prerender(gl,input),'prepare-result');assert.equal(layer.render(gl,input),'draw-result');
 assert.deepEqual(seen,[['add',map,gl],['prepare',gl,input],['render',gl,input]]);
 const d=f.read();assert.equal(d.totals[0].samples,1);assert.equal(d.totals[1].samples,0);assert.equal(d.totals[2].samples,1);
 assert.deepEqual(d.longest[2],[1,2,0,650,650,0]);assert.deepEqual(d.longest[0],[2,0,650,675,25,0]);
});

test('a longest callback survives ring eviction and failed callbacks rethrow the original error',()=>{
 const f=setup(),error=new Error('provider failed');
 const layer={render(){f.advance(800);throw error;}};f.install(layer);
 assert.throws(()=>layer.render(),value=>value===error);
 const fast=f.api.withQaCustomLayerRenderTiming(0,()=>f.advance(1));
 for(let i=0;i<100;i++)fast();
 const d=f.read();assert.equal(d.rows.length,64);assert.equal(d.evictedRows,37);
 assert.equal(d.totals[0].samples,101);assert.equal(d.totals[0].failed,1);assert.equal(d.totals[0].maxElapsedMs,800);
 assert.deepEqual(d.longest[0],[1,0,0,800,800,1]);
 d.longest[0][4]=0;assert.equal(f.read().longest[0][4],800,'diagnostic readers cannot alter the retained maximum');
});

test('ordinary and non-local pages keep original callbacks and allocate no timing records',()=>{
 for(const [host,search]of [['127.0.0.1','?diagnostics=compact'],['example.org','?diagnostics&qaPerf=1'],['localhost','?qaPerf=1']]){
  const f=setup(host,search),render=()=>42,prerender=()=>21,layer={render,prerender};
  f.install(layer);assert.equal(layer.render,render);assert.equal(layer.prerender,prerender);
  assert.equal(layer.render(),42);assert.equal(f.api.qaCustomLayerRenderTiming(),undefined);
 }
});


test('provider attribution survives ring eviction without merging distinct building callbacks',()=>{
 const f=setup(),city={render(){f.advance(900);}},infill={render(){f.advance(12);}};
 f.install(city,'city');f.install(infill,'infill');city.render();infill.render();
 for(let i=0;i<70;i++)infill.render();
 const d=f.read();assert.ok(d.providerTimings,'provider attribution is available');
 const a=d.providerTimings.find(x=>x.provider==='city'),b=d.providerTimings.find(x=>x.provider==='infill');
 assert.equal(a.totals[0].samples,1);assert.equal(a.longest[0][4],900);
 assert.equal(b.totals[0].samples,71);assert.equal(b.longest[0][4],12);
 assert.equal(d.rows[0].length,6,'retain existing numeric row schema');
 a.longest[0][4]=0;assert.equal(f.read().providerTimings.find(x=>x.provider==='city').longest[0][4],900);
});

test('actual city onRenderer binds provider attribution and unknown labels stay bounded',()=>{
 const f=setup(),layer={render(){f.advance(9);}},engine={layer,setPageHidden(){},setReducedMotion(){},setOpacityContext(){}};
 f.onRenderer(engine);layer.render();
 assert.ok(f.read().providerTimings,'provider attribution is available');
 assert.equal(f.read().providerTimings.find(x=>x.provider==='city').longest[0][4],9);
 for(let i=0;i<100;i++)f.api.withQaCustomLayerRenderTiming(0,()=>f.advance(1),'untrusted-'+i)();
 const d=f.read();assert.equal(d.providerTimings.length,2);assert.equal(d.providerTimings.find(x=>x.provider==='unknown').totals[0].samples,100);
});
