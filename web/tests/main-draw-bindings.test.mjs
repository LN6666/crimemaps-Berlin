import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const read=file=>fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
const compilerOptions={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS};
const bindingModule={exports:{}};
Function('module','exports','require',ts.transpileModule(read('safety/render-runtime/main-draw-bindings.ts'),{compilerOptions}).outputText)(bindingModule,bindingModule.exports,id=>assert.fail('Unexpected main-draw-bindings dependency '+id));
const {captureMainDrawBindings,sameMainDrawBindings}=bindingModule.exports;

function declarations(file,names){
 const text=read(file),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),found=new Map();
 (function visit(node){if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text)){assert(!found.has(node.name.text),file+' has one '+node.name.text);found.set(node.name.text,node.getText(ast).replace(/^export\s+/,''));}ts.forEachChild(node,visit);})(ast);
 return Object.fromEntries(names.map(name=>{assert(found.has(name),file+' declares '+name);return[name,ts.transpileModule('('+found.get(name)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText];}));
}

const entryNames=['mainBindingStamp','mainRolePrograms','hasRequiredMainFailure','mainWitnessCurrent','mainFrameCurrent','captureMainFrameWitness','recordCompleteMainFrame'];
const entries=Object.fromEntries(['delegated500','church'].map(provider=>[provider,declarations('painted/'+provider+'/safety/building-mesh-renderer.ts',entryNames)]));
const paintKeyCode=declarations('painted/delegated500/safety/current-paint-program.ts',['currentPaintProgramKey']).currentPaintProgramKey;
const currentPaintProgramKey=Function('return '+paintKeyCode)();
const longKey='verified-source:'+('authority:"\\|,:\u0000').repeat(20000);
const chunk=(contentKey,maskRevision='7:1')=>({contentKey,masks:{residentRevision:maskRevision},geometry:{owner:'must not enter the bindings snapshot'}});

// Observe the allocation boundary, not source spelling: the old renderer fed
// complete authorities to an inner join and then joined that result again.
// This synchronous check does not measure heap allocation or physical RAM.
function withoutLongStringJoin(work){
 const original=Array.prototype.join;let largest=0;
 Array.prototype.join=function(separator){
  for(let i=0;i<this.length;i++)if(typeof this[i]==='string'){
   largest=Math.max(largest,this[i].length);
   assert(this[i].length<1024,'a draw-binding join must only receive short scalar state, not a resource authority');
  }
  return Reflect.apply(original,this,[separator]);
 };
 try{return work();}finally{Array.prototype.join=original;assert(largest<1024);}
}

function assertPrimitiveBindings(value,expectedKeys){
 assert.deepEqual(Reflect.ownKeys(value),['state','resources']);
 assert.equal(Object.getPrototypeOf(value),Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(value);
 assert.equal(typeof descriptors.state.value,'string');
 assert(Array.isArray(descriptors.resources.value));
 assert(value.state.length<1024,'the joined state does not contain an authority');
 assert.equal(value.resources.length,expectedKeys.length);
 assert.deepEqual(Reflect.ownKeys(value.resources),[...expectedKeys.map((_,i)=>String(i)),'length']);
 value.resources.forEach((resource,index)=>{
  assert.equal(Object.getPrototypeOf(resource),Object.prototype);
  assert.deepEqual(Reflect.ownKeys(resource),['contentKey','maskRevision']);
  const fields=Object.getOwnPropertyDescriptors(resource);
  assert.equal(typeof fields.contentKey.value,'string');
  assert.equal(typeof fields.maskRevision.value,'string');
  assert(resource.contentKey===expectedKeys[index],'the full authority is preserved at its original ordered position');
 });
}

function fixture(provider,{empty=false,material=false}={}){
 const control={lost:false,gpuReady:true,emptyReady:empty},programs=new Map(),failures=new Map();
 const state={captureMainDrawBindings,sameMainDrawBindings,currentPaintProgramKey,
  destroyed:false,pageHidden:false,enabled:true,gl:{isContextLost:()=>control.lost},
  mainGPUIncarnation:3,generation:4,geometryPublishedRevision:5,viewRevision:6,
  mainWorldMatrix:Float64Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),matrix:new Float64Array(16),
  residentMainMasksReady:true,mainFrameWitness:undefined,pendingMainFrame:undefined,
  mode:material?1:2,override:undefined,opacity:1,opacityContext:'normal',sceneSun:{instantISO:'2026-11-04T11:00:00Z'},sceneEnvironment:{sunlight:true},facadeAttached:true,
  windowTexture:{stats:{residentRevision:7,ready:true,textureObjects:1}},
  diffuseTexture:{stats:{plaster:{residentRevision:8,ready:true},brick:{residentRevision:9,ready:true},totalTextureObjects:2}},
  sceneChunks:empty?[]:[chunk(longKey),chunk(longKey+'|second','8:1')],
  program:{role:'base'},texturedProgram:{role:'window'},diffuseProgram:{role:'diffuse'},
  partitionPrograms:programs,familyPrograms:programs,partitionFailures:failures,familyFailures:failures,
  requiredKeys:new Set(empty||material?[]:[currentPaintProgramKey(7)]),landmarkVisible:true,surfaceFragment:'window fragment',diffuseFragment:'diffuse fragment',
  textureShaderFailure:undefined,diffuseShaderFailure:undefined,geometryUploadFailure:undefined,geometryUploadPending:false,
  mainGeometryProgramFailure:undefined,mainProgramFailure:undefined,mainDrawFailure:undefined,batchPreparationFailure:undefined,materialSourceFailure:undefined,contextRecoveryFailure:undefined,
  queueOnlyProgram:false,fullProgramUpgradeFailure:undefined,unsupportedQueue:false,
  pendingGeometry:undefined,pendingMaterialBatches:undefined,dataPreparationPending:undefined,
  contextRecoveryPending:false,contextRecoverySuccesses:0,indexCount:empty?0:6,
 };
 programs.set(currentPaintProgramKey(7),{role:'family-7'});
 // These are controlled outside inputs to the real witness functions. The
 // program-role and failure decisions themselves are the renderer's source.
 Object.assign(state,{paintMode:()=>state.mode,paintOverride:()=>state.override,mainPaintProgramKeys:()=>state.requiredKeys,
  gpuReady:()=>control.gpuReady,residentGPU:{isEmptyReady:()=>control.emptyReady},sceneIndexCount:()=>state.indexCount,
  hasVisibleUnsupportedQueueComponent:()=>state.unsupportedQueue});
 const scope=new Proxy(state,{has:()=>true,get(target,name){if(name===Symbol.unscopables)return undefined;if(name in target)return target[name];if(name in globalThis)return globalThis[name];throw new ReferenceError('Unbound witness fixture input '+String(name));},set:(target,name,value)=>(target[name]=value,true)});
 for(const [name,code]of Object.entries(entries[provider]))state[name]=Function('scope','with(scope){return '+code+'}')(scope);
 return{state,control};
}

test('shared bindings preserve long authority boundaries and retain only primitive resource fields',()=>{
 const resources=[chunk(longKey),chunk(longKey+'|second','8:1')];
 const captured=withoutLongStringJoin(()=>captureMainDrawBindings(['main',3,true],resources));
 assertPrimitiveBindings(captured,resources.map(value=>value.contentKey));
 const identical=resources.map(value=>chunk(value.contentKey,value.masks.residentRevision));
 assert(sameMainDrawBindings(captured,captureMainDrawBindings(['main',3,true],identical)),'new wrapper objects with the same complete content remain equal');
 resources[0].masks.residentRevision='99:1';resources[0].contentKey='replacement';resources[0].geometry.owner='retired';
 assert(captured.resources[0].contentKey===longKey);assert.equal(captured.resources[0].maskRevision,'7:1','the witness is a value snapshot, not a retained mask getter');
 const a=captureMainDrawBindings([], [chunk('authority:mask','revision')]),b=captureMainDrawBindings([], [chunk('authority','mask:revision')]);
 assert.equal(sameMainDrawBindings(a,b),false,'delimiter placement cannot merge content and mask identity');
 const c=captureMainDrawBindings([], [chunk('a','b,c:d')]),d=captureMainDrawBindings([], [chunk('a','b'),chunk('c','d')]);
 assert.equal(sameMainDrawBindings(c,d),false,'one resource cannot alias two ordered resources');
});

for(const provider of ['delegated500','church']){
 test(provider+' real main-frame capture and validation never join complete resource authorities',()=>{
  const {state}=fixture(provider),keys=state.sceneChunks.map(value=>value.contentKey);
  const witness=withoutLongStringJoin(()=>{
   const bindings=state.mainBindingStamp();assertPrimitiveBindings(bindings,keys);
   const value=state.captureMainFrameWitness();assert(value);assert(state.mainWitnessCurrent(value));
   state.recordCompleteMainFrame(false,value);assert(state.mainFrameCurrent());return value;
  });
  assertPrimitiveBindings(witness.bindings,keys);
  state.sceneChunks=state.sceneChunks.map(value=>chunk(value.contentKey,value.masks.residentRevision));
  assert(withoutLongStringJoin(()=>state.mainWitnessCurrent(witness)),'same content survives replacement of temporary chunk wrappers');
  const original=state.sceneChunks;
  for(const [label,changed]of [
   ['key suffix',[chunk(keys[0]+'|changed'),original[1]]],
   ['chunk order',[original[1],original[0]]],
   ['mask revision',[chunk(keys[0],'7:0'),original[1]]],
   ['chunk removal',[original[0]]],
  ]){
   state.sceneChunks=changed;
   assert.equal(withoutLongStringJoin(()=>state.mainWitnessCurrent(witness)),false,label+' invalidates the old successful frame');
   state.sceneChunks=original;assert(state.mainWitnessCurrent(witness),label+' restoration matches the complete original identity');
  }
 });

 test(provider+' resource bindings retain scalar, texture, context, projection and program invalidation',()=>{
  const changes=[
   ['opacity',state=>{state.opacity=.5;}],
   ['window texture replacement',state=>{state.windowTexture.stats.residentRevision++;}],
   ['generation',state=>{state.generation++;}],
   ['projection',state=>{state.mainWorldMatrix[12]=.25;}],
   ['context loss',(_state,control)=>{control.lost=true;}],
   ['context restoration',state=>{state.gl={isContextLost:()=>false};state.mainGPUIncarnation++;}],
   ['program replacement',state=>{state.partitionPrograms.set(currentPaintProgramKey(7),{role:'replacement'});}],
  ];
  for(const [label,change]of changes){
   const {state,control}=fixture(provider),witness=state.captureMainFrameWitness();assert(state.mainWitnessCurrent(witness),label+' baseline');
   change(state,control);assert.equal(state.mainWitnessCurrent(witness),false,label+' cannot inherit the previous successful frame');
   state.recordCompleteMainFrame(false,witness);assert.equal(state.mainFrameWitness,undefined,label+' cannot be published again');
  }
  const {state}=fixture(provider,{material:true}),witness=state.captureMainFrameWitness();assert(state.mainWitnessCurrent(witness));
  state.diffuseProgram={role:'replacement diffuse'};assert.equal(state.mainWitnessCurrent(witness),false,'material program object replacement invalidates unchanged textures and geometry');
 });

 test(provider+' empty-frame witnesses keep failure and publication gates with primitive bindings',()=>{
  const {state,control}=fixture(provider,{empty:true}),witness=state.captureMainFrameWitness(true);assert(witness);
  assertPrimitiveBindings(witness.bindings,[]);assert(state.mainWitnessCurrent(witness));
  state.pendingGeometry={};state.recordCompleteMainFrame(true,witness);assert.equal(state.mainFrameWitness,undefined,'a pending publication is not an empty completed scene');
  state.pendingGeometry=undefined;state.mainDrawFailure='controlled failure';
  assert.equal(state.mainWitnessCurrent(witness),false);state.recordCompleteMainFrame(true,witness);assert.equal(state.mainFrameWitness,undefined,'a terminal draw failure blocks the empty witness too');
  state.mainDrawFailure=undefined;control.emptyReady=false;assert.equal(state.mainWitnessCurrent(witness),false);
  control.emptyReady=true;state.recordCompleteMainFrame(true,witness);assert.strictEqual(state.mainFrameWitness,witness);assert(state.mainFrameCurrent());
 });
}
