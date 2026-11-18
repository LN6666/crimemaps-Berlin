import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// A refused program admission is an explicit budget wait: the owner keeps one
// onAvailable subscription, answers the same exact recipe without another
// admission or pressure eviction until that wake, and its callers stop
// repainting for it. A recipe larger than the whole ledger is no wait: it is
// reported as an unfit failure. The real owner, ledger and store run on a fake
// context; delegated500's two callers and its material gate are their own
// declarations evaluated in a scope.
const modules=new Map();
function load(file){
 const filename=file instanceof URL?fileURLToPath(file):file,previous=modules.get(filename);if(previous)return previous.exports;
 const module={exports:{}};modules.set(filename,module);
 const code=ts.transpileModule(readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 Function('module','exports','require',code)(module,module.exports,name=>{assert(name.startsWith('.'),'only local production dependencies');const target=path.resolve(path.dirname(filename),name);return load(path.extname(target)?target:target+'.ts');});
 return module.exports;
}
const core=load(new URL('../src/safety/render-runtime/program-preparation.ts',import.meta.url));
const {createResourceBudget}=load(new URL('../src/safety/render-runtime/resource-budget.ts',import.meta.url));
const {createChunkResourceStore,bindChunkResourceContext}=load(new URL('../src/safety/render-runtime/chunk-resource-store.ts',import.meta.url));
const solar=load(new URL('../src/safety/solar-shadow-preparation.ts',import.meta.url));
const {createProgramPreparationOwner,createProgramSourceAuthority,isProgramPreparationPending,isProgramPreparationBudgetWait,isProgramBudgetUnfitFailure,programPreparationNeedsFrame,ProgramPreparationPending,ProgramPreparationFailure}=core;

function fakeGL(){
 let id=0;const linked=[];
 const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,COMPILE_STATUS:4,SYNC_GPU_COMMANDS_COMPLETE:6,ALREADY_SIGNALED:7,CONDITION_SATISFIED:8,TIMEOUT_EXPIRED:9,WAIT_FAILED:10,
  isContextLost:()=>false,getExtension:()=>null,createShader:type=>({id:++id,type}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,getShaderInfoLog:()=>'',
  createProgram:()=>({id:++id,program:true}),attachShader(){},detachShader(){},deleteShader(){},bindAttribLocation(){},linkProgram(program){linked.push(program);},getProgramParameter:()=>true,getProgramInfoLog:()=>'',
  deleteProgram(program){program.deleted=true;},fenceSync:()=>({}),flush(){},clientWaitSync:()=>7,deleteSync(){}};
 return{gl,linked};
}
function turns(){
 const queue=[],previous=globalThis.setTimeout;globalThis.setTimeout=fn=>(queue.push(fn),queue.length);
 return{all(){let n=0;while(queue.length){assert(++n<1000);queue.shift()();}},restore(){globalThis.setTimeout=previous;},queue};
}
function fixture(limitBytes=1000){
 const budget=createResourceBudget({limitBytes,recentLimitBytes:0}),store=createChunkResourceStore({budget}),{gl,linked}=fakeGL();bindChunkResourceContext(gl,store);
 const spy={calls:0};const original=budget.tryReserve;budget.tryReserve=(...args)=>{spy.calls++;return original(...args);};
 return{budget,store,gl,linked,spy};
}
const programRecipe=(resource,bytes=512,allowance=128,build=()=>({vertex:'vertex '+resource,fragment:'fragment '+resource,attributes:['a_position']}))=>({resource,priority:'visible',inputs:['input:'+resource],budget:{sourceBytesUpperBound:bytes,submittedAllowanceBytes:allowance},build});
const budgetWait=fn=>{let thrown;assert.throws(fn,error=>{thrown=error;return isProgramPreparationPending(error)&&error.status==='pending'&&isProgramPreparationBudgetWait(error)&&error instanceof ProgramPreparationPending;});return thrown;};
const plainPending=fn=>assert.throws(fn,error=>isProgramPreparationPending(error)&&error.status==='pending'&&!isProgramPreparationBudgetWait(error));

for(const shared of [false,true])test((shared?'shared':'private')+' recipe: a budget refusal waits once; the same recipe is answered without readmission until the wake',()=>{
 const t=turns(),f=fixture();let repaints=0,builds=0;
 const owner=createProgramPreparationOwner('core budget wait',()=>{repaints++;}),authority=createProgramSourceAuthority({inputs:['core-budget-wait'],builders:[fakeGL]});
 const recipe=(resource,bytes,allowance)=>{const value=programRecipe(resource,bytes,allowance,()=>{builds++;return{vertex:'vertex',fragment:'fragment '+resource,attributes:[]};});return shared?{...value,sharedKey:'core-budget-wait-abi',provenance:[authority]}:value;};
 try{
  const blocker=f.budget.reserve({category:'construction',bytes:900,precision:'exact'});
  const big=recipe('big',512,128);
  const first=budgetWait(()=>owner.compile(f.gl,big));
  assert.equal(first.waiting,true,'the owner holds the wake');assert.equal(owner.waitingForBudget,true);assert.equal(owner.budgetWaits,1);assert.equal(builds,0);
  assert.equal(f.budget.stats.availabilityListeners,1);assert.equal(owner.stats.budget.refusedRecipes,1);
  const attempts=f.spy.calls,pressure=f.budget.stats.pressureEvents;
  for(let i=0;i<5;i++)budgetWait(()=>owner.compile(f.gl,big));
  assert.equal(f.spy.calls,attempts,'no further admission attempt for the refused recipe');assert.equal(f.budget.stats.pressureEvents,pressure,'and no pressure eviction');
  assert.equal(owner.budgetWaits,6);assert.equal(f.budget.stats.availabilityListeners,1,'still one subscription');assert.equal(repaints,0);
  // A different recipe that fits is admitted at once: waiting gates only the refused identity.
  plainPending(()=>owner.compile(f.gl,recipe('small',40,10)));assert.equal(f.spy.calls,attempts+1);assert.equal(owner.budgetWaits,6);
  t.all();const small=owner.compile(f.gl,recipe('small',40,10));assert(small.program);assert.equal(builds,1);
  // The wake repaints once and reopens admission for the refused recipe.
  blocker.release();assert.equal(repaints>=1,true);assert.equal(owner.waitingForBudget,false);assert.equal(owner.stats.budget.refusedRecipes,0);
  plainPending(()=>owner.compile(f.gl,big));t.all();const program=owner.compile(f.gl,big);assert(program.program);assert.equal(builds,2);
  owner.releaseProgram(f.gl,small);owner.releaseProgram(f.gl,program);
 }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
 assert.equal(f.budget.stats.bytes,0);
});

const unfit=(fn,required,capacity)=>assert.throws(fn,error=>isProgramBudgetUnfitFailure(error)&&error instanceof ProgramPreparationFailure&&!isProgramPreparationPending(error)&&error.diagnostic.status==='failed'&&error.message.includes('requires '+required+' logical bytes; capacity '+capacity));

for(const shared of [false,true])test((shared?'shared':'private')+' recipe larger than the whole ledger is an unfit failure: no wait, no admission attempt, no pressure eviction',()=>{
 const t=turns(),f=fixture(1000);let repaints=0,builds=0;
 const owner=createProgramPreparationOwner('core budget unfit',()=>{repaints++;}),authority=createProgramSourceAuthority({inputs:['core-budget-unfit'],builders:[fakeGL]});
 const recipe=(resource,bytes,allowance)=>{const value=programRecipe(resource,bytes,allowance,()=>{builds++;return{vertex:'vertex',fragment:'fragment '+resource,attributes:[]};});return shared?{...value,sharedKey:'core-budget-unfit-abi',provenance:[authority]}:value;};
 try{
  const big=recipe('too-big',4000,100);
  for(let frame=0;frame<3;frame++)unfit(()=>owner.compile(f.gl,big),4100,1000);
  assert.equal(f.spy.calls,0,'no admission attempt');assert.equal(f.budget.stats.pressureEvents,0,'and no pressure eviction');
  assert.equal(owner.waitingForBudget,false);assert.equal(owner.budgetWaits,0);assert.equal(f.budget.stats.availabilityListeners,0,'nothing subscribes for a recipe that can never fit');assert.equal(repaints,0);assert.equal(builds,0);
  assert.equal(owner.stats.budget.unfitFailures,3);assert.match(owner.stats.budget.lastUnfit.reason,/requires 4100 logical bytes; capacity 1000/);assert.equal(owner.needsFrameAfter(0),true,'a failure is not a ledger wait');
  // Exactly the capacity fits once the ledger is free; above the current use it waits.
  const blocker=f.budget.reserve({category:'construction',bytes:900,precision:'exact'});
  const later=budgetWait(()=>owner.compile(f.gl,recipe('whole-ledger',900,100)));assert.equal(later.waiting,true);assert.equal(f.budget.stats.availabilityListeners,1);
  blocker.release();assert.equal(owner.waitingForBudget,false);plainPending(()=>owner.compile(f.gl,recipe('whole-ledger',900,100)));t.all();
  const program=owner.compile(f.gl,recipe('whole-ledger',900,100));assert(program.program);owner.releaseProgram(f.gl,program);
 }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
 assert.equal(f.budget.stats.bytes,0);
});

for(const shared of [false,true])test((shared?'shared':'private')+' build refused by more than the whole ledger fails as unfit instead of waiting',()=>{
 const t=turns(),f=fixture(1000);const owner=createProgramPreparationOwner('core budget unfit build',()=>{}),authority=createProgramSourceAuthority({inputs:['core-budget-unfit-build'],builders:[fakeGL]});
 const refused=f.budget.tryReserve({category:'construction',bytes:5000,precision:'exact'});assert.equal(refused.ok,false);assert.equal(refused.error.details.additionalBytes,5000);
 const base=programRecipe('unfit-build',100,10,()=>{throw refused.error;}),recipe=shared?{...base,sharedKey:'core-budget-unfit-build-abi',provenance:[authority]}:base;
 try{
  plainPending(()=>owner.compile(f.gl,recipe));t.all();
  unfit(()=>owner.compile(f.gl,recipe),5000,1000);
  assert.equal(owner.waitingForBudget,false);assert.equal(f.budget.stats.availabilityListeners,0);assert.equal(owner.stats.budget.unfitFailures,1);
 }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
 assert.equal(f.budget.stats.bytes,0);
});

test('one frame judgement: only a budget wait of this attempt whose wake the owner holds skips the caller frame',()=>{
 assert.equal(programPreparationNeedsFrame({waitingForBudget:true,budgetWaits:3},2),false);
 assert.equal(programPreparationNeedsFrame({waitingForBudget:true,budgetWaits:3},3),true,'an earlier wait does not cover this attempt');
 assert.equal(programPreparationNeedsFrame({waitingForBudget:false,budgetWaits:3},2),true,'no wake is held');
 assert.equal(programPreparationNeedsFrame({},undefined),true,'an owner without the wait surface keeps the original frame');
});

test('cancel and dispose drop the wake; a refusal after dispose cannot leave a waiting owner',()=>{
 const t=turns(),f=fixture();let repaints=0;const owner=createProgramPreparationOwner('core budget cancel',()=>{repaints++;});
 try{
  const blocker=f.budget.reserve({category:'construction',bytes:900,precision:'exact'}),r=programRecipe('cancelled');
  budgetWait(()=>owner.compile(f.gl,r));assert.equal(owner.waitingForBudget,true);
  owner.cancel();assert.equal(owner.waitingForBudget,false);assert.equal(f.budget.stats.availabilityListeners,0);
  const attempts=f.spy.calls;budgetWait(()=>owner.compile(f.gl,r));assert.equal(f.spy.calls,attempts+1,'after cancel the recipe is admitted afresh');
  owner.dispose();assert.equal(owner.waitingForBudget,false);assert.equal(f.budget.stats.availabilityListeners,0);
  blocker.release();assert.equal(repaints,0,'a disposed owner is not repainted');
 }finally{t.all();t.restore();f.store.destroy();}
});

test('a waiting owner takes the store follow-up frames, so retiring bytes are collected on a still map',()=>{
 const t=turns(),f=fixture();let repaints=0,signaled=false;const owner=createProgramPreparationOwner('core budget retirement',()=>{repaints++;});
 f.gl.clientWaitSync=()=>signaled?f.gl.ALREADY_SIGNALED:f.gl.TIMEOUT_EXPIRED;
 try{
  // Deleted GPU work still holds most of the page until its fence passes.
  const held=f.budget.reserve({category:'program-retiring',bytes:900,precision:'estimate'});
  f.store.retireGpu({context:f.gl,epoch:f.store.contextEpoch(f.gl),reservation:held,dispose(){},label:'retiring fixture'});assert.equal(f.budget.stats.bytes,900);
  const r=programRecipe('after-retirement');budgetWait(()=>owner.compile(f.gl,r));
  assert.equal(repaints,1,'the wait asks for one frame because a retirement is pending');assert.equal(f.store.stats.retirementFrameRequesters,1);
  f.store.collectRetired();assert.equal(repaints,2,'each frame boundary while the fence is pending asks for the next');
  signaled=true;f.store.collectRetired();assert.equal(f.budget.stats.bytes,0);
  assert.equal(owner.waitingForBudget,false,'the release wakes the owner');assert.equal(repaints,3);assert.equal(f.store.stats.retirementFrameRequesters,0,'and ends its frame requests');
  f.store.collectRetired();assert.equal(repaints,3);
  plainPending(()=>owner.compile(f.gl,r));t.all();const program=owner.compile(f.gl,r);assert(program.program);owner.releaseProgram(f.gl,program);
 }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
});

// delegated500's own prepareGeometryUpload/prepareFamilyCasters, evaluated
// against fixture renderer state with the real owner as programPreparation.
const rendererPath=fileURLToPath(new URL('../src/painted/delegated500/safety/building-mesh-renderer.ts',import.meta.url)),rendererText=readFileSync(rendererPath,'utf8'),ast=ts.createSourceFile(rendererPath,rendererText,ts.ScriptTarget.Latest,true);
function declaration(name){const found=[];(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found.push(node.getText(ast));ts.forEachChild(node,visit);})(ast);assert.equal(found.length,1,name);return found[0];}
const scope=state=>new Proxy(state,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
function evaluate(name,state){const js=ts.transpileModule('('+declaration(name)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'');return Function('scope','with(scope){return '+js+'}')(scope(state));}
// delegated500's own material-preflight gate; its declaration has no imports.
const gatePath=fileURLToPath(new URL('../src/painted/delegated500/safety/delegated-shader-budget.ts',import.meta.url)),gateAst=ts.createSourceFile(gatePath,readFileSync(gatePath,'utf8'),ts.ScriptTarget.Latest,true);
const createDelegatedSourceBudgetGate=(()=>{const found=[];(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='createDelegatedSourceBudgetGate')found.push(node.getText(gateAst).replace(/^export\s+/,''));ts.forEachChild(node,visit);})(gateAst);assert.equal(found.length,1);return Function('return '+ts.transpileModule('('+found[0]+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,''))();})();

test('delegated500 geometry upload repaints for its own non-budget pending but not for a program waiting on the ledger',()=>{
 const t=turns(),f=fixture();const owner=createProgramPreparationOwner('delegated500 core wiring',()=>{});
 try{
  const blocker=f.budget.reserve({category:'construction',bytes:900,precision:'exact'});let repaints=0,mode='budget';
  const S={gl:f.gl,geometryUploadPending:true,pendingGeometry:undefined,programPreparation:owner,map:{triggerRepaint(){repaints++;}},isProgramPreparationPending,materialSourceFailure:undefined,materialSourceGate:createDelegatedSourceBudgetGate(()=>{},new AbortController().signal),materialSourceWorkRevision:1,
   prepareResidentMain(){if(mode==='budget'){try{owner.compile(f.gl,programRecipe('delegated-main'));}catch(error){if(!isProgramPreparationPending(error))throw error;}}return false;}};
  const prepareGeometryUpload=evaluate('prepareGeometryUpload',S);
  prepareGeometryUpload();assert.equal(repaints,0,'the refused program is woken by the ledger, not by polling frames');assert.equal(owner.waitingForBudget,true);
  prepareGeometryUpload();assert.equal(repaints,0,'a gated retry of the same recipe still waits for the wake');
  // Pending for any other reason in this attempt keeps the original repaint,
  // even while an earlier refusal of this owner waits on the ledger.
  mode='other';prepareGeometryUpload();assert.equal(repaints,1);
  blocker.release();assert.equal(owner.waitingForBudget,false);prepareGeometryUpload();assert.equal(repaints,2,'without a ledger wait the original repaint remains');
  // A fixture owner without the wait surface keeps the original behaviour.
  const legacy=evaluate('prepareGeometryUpload',{...S,programPreparation:{compile(){throw new ProgramPreparationPending();}},prepareResidentMain:()=>false});legacy();assert.equal(repaints,3);
 }finally{owner.dispose();t.all();t.restore();f.store.destroy();}
});

test('delegated500 geometry upload leaves a resident material preflight refused for this revision to its gate wake',()=>{
 const t=turns(),f=fixture();const owner=createProgramPreparationOwner('delegated500 material gate',()=>{});let repaints=0,gateWakes=0;
 try{
  const signal=new AbortController(),gate=createDelegatedSourceBudgetGate(()=>{gateWakes++;},signal.signal);
  const S={gl:f.gl,geometryUploadPending:true,pendingGeometry:undefined,programPreparation:owner,map:{triggerRepaint(){repaints++;}},isProgramPreparationPending,materialSourceFailure:undefined,materialSourceGate:gate,materialSourceWorkRevision:4,
   // prepareMaterialSource returns false at its gate; no program is compiled.
   prepareResidentMain:()=>false,sceneIndexCount:()=>1,prepareMainPrograms:()=>false};
  const prepareGeometryUpload=evaluate('prepareGeometryUpload',S);
  prepareGeometryUpload();assert.equal(repaints,1,'without a gate refusal the original repaint remains');
  gate.block(4,f.budget);assert.equal(gate.waiting,true);
  prepareGeometryUpload();assert.equal(repaints,1,'the gate refused this revision: its wake, not a polling frame, retries');
  S.materialSourceWorkRevision=5;prepareGeometryUpload();assert.equal(repaints,2,'a refusal of an older revision does not stop the frame');S.materialSourceWorkRevision=4;
  S.materialSourceFailure=new Error('fixture material failure');prepareGeometryUpload();assert.equal(repaints,3,'a recorded failure is not a gate wait');S.materialSourceFailure=undefined;
  S.pendingGeometry={state:{sceneChunks:[{}]}};prepareGeometryUpload();assert.equal(repaints,4,'a candidate does not read the resident material gate');S.pendingGeometry=undefined;
  // The ledger wake clears the gate and repaints through it.
  const drop=f.budget.reserve({category:'construction',bytes:10,precision:'exact'});drop.release();
  assert.equal(gateWakes,1);assert.equal(gate.waiting,false);prepareGeometryUpload();assert.equal(repaints,5);
  signal.abort();
 }finally{owner.dispose();t.all();t.restore();f.store.destroy();}
});

test('delegated500 family casters skip the repaint only when their one attempt is waiting on the ledger',()=>{
 const t=turns(),f=fixture();const owner=createProgramPreparationOwner('delegated500 caster wiring',()=>{});
 try{
  const blocker=f.budget.reserve({category:'construction',bytes:900,precision:'exact'});let repaints=0,classification=true;
  const S={gl:f.gl,programPreparation:owner,map:{triggerRepaint(){repaints++;}},isProgramPreparationPending,ProgramPreparationPending,solarShadowPreparation:solar.solarShadowPreparation,
   trimSolarCasterState:()=>['current-family:7'],casterAnalysisPending:new Set(),partitionPrograms:new Map(),casterFailures:new Map(),casterPreparedSources:new Map(),casterVisibleKnown:true,casterCompileFrame:-1,drawFrame:1,materialRecipeRevision:3,
   casterIsBase:()=>false,prepareCasterClassification:()=>classification,compilePartitionProgram:()=>owner.compile(f.gl,programRecipe('delegated-caster')),casterRetry:false,city:'berlin',solarDepthRevision:0,
   partitionRuns:[{key:'current-family:7'}],programOverrideKey:()=>undefined,currentPaintProgramKey:family=>'current-family:'+family};
  const prepareFamilyCasters=evaluate('prepareFamilyCasters',S);
  let result=prepareFamilyCasters('helper',solar.createSolarShadowPreparationBudget());
  assert.equal(result.status,'pending');assert.equal(S.casterRetry,true);assert.equal(repaints,0,'the ledger wake, not a polling frame, retries this caster');
  // A spent per-visit budget is not a ledger wait: the next visit needs a frame.
  const spent=solar.createSolarShadowPreparationBudget();spent.compile('other','0',()=>undefined);
  result=prepareFamilyCasters('helper',spent);assert.equal(result.status,'pending');assert.equal(repaints,1);
  // A classification still preparing is pending for its own gate: unchanged.
  classification=false;prepareFamilyCasters('helper',solar.createSolarShadowPreparationBudget());assert.equal(repaints,2);
  classification=true;blocker.release();prepareFamilyCasters('helper',solar.createSolarShadowPreparationBudget());assert.equal(repaints,3,'admitted and queued: pending with the original repaint');
 }finally{owner.dispose();t.all();t.restore();f.store.destroy();}
});
