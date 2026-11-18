// Stage 3 round 6 (S6a, lineage A) directed checks for the root500, infill and
// Bremen renderers (DECISIONS 2026-11-03 01:15, round-6 source items).
//
// 1. Bremen: chunk production (packBremenChunkMaterials, bremenChunkDiagnosticCosts)
//    displaces the resident scope with the candidate scope while owner hooks run. A
//    scope release requested meanwhile (a synchronous candidate abort) waits for
//    the outermost switch to restore the resident scope and then runs once.
// 2. root500/infill: a replaced scene-level Rathaus mask that no chunk owns (the
//    initial or empty-scene scratch) is destroyed on publication and on an empty
//    reset, so every mask the renderer created is destroyed by renderer destroy.
// 3. root500/infill/Bremen: solar program preparation waits for growth, as in
//    church/delegated500 (capture itself is already blocked while growing), and
//    the first ready preparation after growth costs at most one extra round.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {residencyFixture,component} from './fixtures/painted-residency-harness.mjs';
import {tinyRathausProxyMasks} from './support/fixtures-managers-b-renderer-runtime.mjs';

const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(web+'package.json'),ts=require('typescript');
const RENDERER=provider=>`src/painted/${provider}/safety/building-mesh-renderer.ts`;
const text=file=>fs.readFileSync(web+file,'utf8');

function declarations(source,file,names){
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),found=new Map();
 (function visit(n){
  if(ts.isFunctionDeclaration(n)&&n.name&&names.includes(n.name.text)&&n.body)found.set(n.name.text,n.getText(ast));
  else if(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>ts.isIdentifier(d.name)&&names.includes(d.name.text)))for(const d of n.declarationList.declarations)found.set(d.name.getText(ast),n.getText(ast));
  ts.forEachChild(n,visit);
 })(ast);
 for(const name of names)assert(found.has(name),file+' declares '+name);
 return [...new Set(found.values())].join('\n');
}
const transpile=code=>ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;

// ---- 1. Bremen deferred scope release -------------------------------------
function bremenScopeRuntime(){
 const file=RENDERER('bremen'),js=transpile(declarations(text(file),file,['displacedDataScopes','deferredScopeRelease','enterBremenDataScope','exitBremenDataScope','releaseSupersededBatchScopes']));
 const released=[],env={residentScopePins:new Map(),currentDataScope:undefined,pendingCandidate:undefined,transientResidentScope:undefined};
 const pin=scope=>env.residentScopePins.set(scope,()=>released.push(scope));
 const api=Function('env',`with(env){${js}\nreturn{enter:enterBremenDataScope,exit:exitBremenDataScope,release:releaseSupersededBatchScopes,depth:()=>displacedDataScopes.length};}`)(env);
 return{env,api,pin,released};
}

test('Bremen: a candidate abort inside a temporary data-scope switch cannot release the displaced resident scope; the release runs once on restore',()=>{
 const {env,api,pin,released}=bremenScopeRuntime(),resident={name:'resident'},candidate={name:'candidate'};
 pin(resident);pin(candidate);env.currentDataScope=resident;env.pendingCandidate={scope:candidate};
 // packBremenChunkMaterials / bremenChunkDiagnosticCosts / batchIncluded / runs.
 const previous=api.enter(candidate);assert.equal(env.currentDataScope,candidate);
 // Synchronous abort listener -> discardPendingCandidate: pendingCandidate is
 // cleared first, then superseded scopes are released.
 env.pendingCandidate=undefined;api.release();
 assert.deepEqual(released,[],'no pin is released while a switch displaces the resident scope');
 assert(env.residentScopePins.has(resident)&&env.residentScopePins.has(candidate));
 api.exit(previous);
 assert.equal(env.currentDataScope,resident,'the switch restores the resident scope, which is still pinned');
 assert.deepEqual(released,[candidate],'the deferred release runs exactly once after the switch and retires only the abandoned candidate');
 assert(env.residentScopePins.has(resident));
 api.release();assert.deepEqual(released,[candidate],'a later release is idempotent');
});

test('Bremen: nested switches defer until the outermost restore; with no switch the release stays immediate',()=>{
 const {env,api,pin,released}=bremenScopeRuntime(),resident={name:'resident'},candidate={name:'candidate'},assembly={name:'assembly'};
 pin(resident);pin(candidate);pin(assembly);env.currentDataScope=resident;
 const outer=api.enter(candidate),inner=api.enter(assembly);api.release();assert.deepEqual(released,[]);
 api.exit(inner);assert.equal(api.depth(),1);assert.deepEqual(released,[],'still inside the outer switch');
 api.exit(outer);assert.equal(api.depth(),0);assert.deepEqual(released.map(s=>s.name).sort(),['assembly','candidate']);
 const next={name:'next'};pin(next);api.release();assert.deepEqual(released.at(-1),next,'outside any switch the release is immediate');
 assert(env.residentScopePins.has(resident));
 // A switch whose work throws still restores the scope and runs the deferred release.
 const failed={name:'failed'};pin(failed);const before=api.enter(failed);try{api.release();throw Error('producer failure');}catch{}finally{api.exit(before);}
 assert.equal(env.currentDataScope,resident);assert.deepEqual(released.at(-1),failed);
});

test('Bremen: a throwing deferred release never replaces the switched work\'s own error, and still propagates when that work succeeded',()=>{
 const {env,api,pin,released}=bremenScopeRuntime(),resident={name:'resident'},bad={name:'bad'},ok={name:'ok'};
 pin(resident);env.residentScopePins.set(bad,()=>{released.push(bad);throw Error('release failure');});env.currentDataScope=resident;
 const producerError=Error('producer failure');let thrown;
 const before=api.enter(bad);let failed=false;
 try{try{api.release();throw producerError;}catch(error){failed=true;throw error;}finally{api.exit(before,failed);}}catch(error){thrown=error;}
 assert.strictEqual(thrown,producerError,'the producer error propagates, not the release error');
 assert.equal(env.currentDataScope,resident);assert.equal(api.depth(),0);assert.deepEqual(released,[bad],'the deferred release still ran');
 env.residentScopePins.set(ok,()=>{released.push(ok);throw Error('release failure');});
 const again=api.enter(ok);api.release();
 assert.throws(()=>api.exit(again,false),/release failure/,'with successful work the release error is not swallowed');
 assert.equal(env.currentDataScope,resident);assert.equal(api.depth(),0);assert(env.residentScopePins.has(resident));
});

test('Bremen: the chunk-production switches that run owner hooks go through the deferring helpers',()=>{
 const source=text(RENDERER('bremen'));
 // packBremenChunkMaterials and bremenChunkDiagnosticCosts run owner hooks with
 // the candidate scope current (the abort path of R5 F5-bremen CDR[0]). The
 // other inline switches (batchIncluded, runs, assembly, program source,
 // uniforms) only wrap pure reads, and any outer helper switch still defers.
 for(const call of ['bremenChunkDiagnosticCosts','packBremenChunkMaterials']){
  const body=declarations(source,'bremen',[call]);
  const ast=ts.createSourceFile(call,body,ts.ScriptTarget.Latest,true),producer=ast.statements.find(ts.isFunctionDeclaration),synchronous=call==='packBremenChunkMaterials'?producer.body.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='scoped'):producer,work=synchronous.body.statements.find(ts.isTryStatement);
  if(call==='packBremenChunkMaterials')assert(!synchronous.getText(ast).includes('await'),'the displaced scope never crosses an await');
  assert(/const previous=enterBremenDataScope\(scope\);/.test(body),call+' enters the deferring scope');
  assert.equal(work.catchClause?.block.statements.map(node=>node.getText(ast)).join(''),'failed=true;throw error;',call+' preserves its work failure');
  // Existing F154 cleanup may precede the restore; the restore must still be
  // the final action of this producer's own finally block.
  assert.equal(work.finallyBlock?.statements.at(-1)?.getText(ast),'exitBremenDataScope(previous,failed);',call+' always restores through the deferring helper');
  assert(!/currentDataScope=/.test(body),call+' has no direct write of currentDataScope');
 }
 assert.equal((source.match(/enterBremenDataScope\(/g)??[]).length,3,'definition plus the two producer switches');
 assert.equal((source.match(/exitBremenDataScope\(/g)??[]).length,3,'every helper switch is restored');
});

// ---- 2. root500/infill scene-level scratch masks ---------------------------
const sha='b'.repeat(64);
const shadowFor=rows=>({verifiedBoundarySHA256:sha,profile:{schema_version:1,city:'leipzig',source_boundary_sha256:sha,status:'display-schematic',includes_growth_zero_to_one:true,swept_bbox_actual_city_covered:true,fixed_vector:[1,1]},components:[{...rows[0],triangleCount:19}]});
for(const provider of ['root500','infill'])test(`${provider}: publication and empty resets destroy the replaced unowned scene scratch mask, so destroy leaves no renderer-created mask`,async()=>{
 const live=new Set(),log=[];let created=0;
 // Counts only the masks the renderer creates through its own import (the
 // scene scratch and the transient packing owner); chunk masks are bindings.
 const createRathausProxyMasks=()=>{const masks=tinyRathausProxyMasks({}),destroy=masks.destroy;created++;live.add(masks);masks.destroy=()=>{live.delete(masks);destroy();};return masks;};
 const h=residencyFixture(provider,{dependencyOverrides:{'./facade-rathaus-proxy-mask':{createRathausProxyMasks}}});
 if(provider==='infill')h.overrideDependency('./owner-f018-completion',{infillProgressiveObjectDemand(rows){return rows.map(({city,objectId,partId})=>({city,objectId,partId}));}});
 await h.environment(async()=>{
  const r=h.create();assert.equal(live.size,1,'the initial scene scratch');const scratch=[...live][0];
  const rows=[component(1,true)],b=await h.prepareBatch(r,rows);h.commit(r,b,1,shadowFor(rows));r.setEnabled(true);r.layer.onAdd({},h.gl);await h.settle(r);
  assert.equal(r.getRevision().generation,1);
  assert(!live.has(scratch),'the initial scratch is destroyed once a chunk scene replaces it');assert.equal(live.size,0);
  const next=[component(2,true)],b2=await h.prepareBatch(r,next);h.commit(r,b2,2,shadowFor(next));await h.settle(r);
  assert.equal(r.getRevision().generation,2);assert.equal(live.size,0,'a chunk-owned mask is left to its chunk owner');
  r.setBatches([],3);h.frame(r);assert.equal(live.size,1,'the empty scene holds one scratch');const empty=[...live][0];
  r.setBatches([],4);h.frame(r);assert.equal(live.size,1,'a second empty reset replaces, not accumulates, the scratch');assert(!live.has(empty));
  r.destroy();assert.equal(live.size,0,'destroy leaves no renderer-created mask');assert(created>=5);
 });
});

// ---- 3. Solar program preparation waits for growth --------------------------
for(const provider of ['root500','infill','bremen'])test(`${provider}: prepareSolarPrograms has the church/delegated growth gate and keeps retention ungated`,()=>{
 const file=RENDERER(provider),source=text(file),body=declarations(source,file,['prepareSolarPrograms','solarProgramDemandActive']);
 assert(/if\(!solarProgramDemandActive\(\)\|\|needsBirth\|\|birth\.size\)return solarShadowPreparation\(\);/.test(body),'prepare returns idle while growing');
 const demand=body.slice(body.indexOf('function solarProgramDemandActive'));
 assert(!/needsBirth|birth\.size/.test(demand.slice(0,demand.indexOf('}'))),'retention (capturePaintKeys/candidate roles) does not drop solar programs during growth');
 for(const church of ['church','delegated500'])assert(/needsBirth\|\|birth\.size/.test(declarations(text(RENDERER(church)),church,['prepareSolarPrograms'])),church+' reference gate');
});

const {loadReflectionBridge,F3_REICHSTAG_RUNTIME_MODULES}=await import(new URL('./support/f3-reflection-bridge.mjs',import.meta.url).href);
const {installProgramGrantHandoff}=await import(new URL('./support/f5prog-renderer-deps.mjs',import.meta.url).href);
const bridge=await loadReflectionBridge({exports:['fixture','evaluate','binding','productionHelpers','recipeRuns','installAsyncProgramCompiler'],sourceURL:'r6a-lineage-a-fixture.mjs',runtimeModules:F3_REICHSTAG_RUNTIME_MODULES});
async function root500DepthFixture(ungated=false){
 const {fixture,evaluate,binding,productionHelpers,recipeRuns,installAsyncProgramCompiler}=bridge,f=await fixture('root500'),calls=[];
 Object.assign(f.values,{partitionEnabled:true,sceneEnvironment:{sunlight:true,shadows:true},sceneSun:{shadowVector:[1,1]},baseSurfaceFragment:'source helper',surfaceFragment:undefined,cityPaintFragment:'complete source with all hooks',paintProgramKey:n=>'owner'+n,preparedPaintSource:key=>'exact '+f.values.city+' '+key});
 f.values.partitionPrograms.clear();f.values.rathausProxyMasks.withMasks=(_gl,_p,draw)=>draw();
 for(const name of ['releaseSolarPrograms','solarResidentKeys','trimSolarPrograms','prepareSolarPrograms','prepareSolarShadow']){
  let code=binding(f.text,name);
  // Model the pre-gate preparation (HEAD) for the round comparison only.
  if(ungated&&name==='prepareSolarPrograms'){assert(code.includes('||needsBirth||birth.size'));code=code.replace('||needsBirth||birth.size','');}
  f.values[name]=await evaluate(code,f.values);
 }
 await installProgramGrantHandoff({evaluate,binding,productionHelpers},f);
 installAsyncProgramCompiler(f,calls);
 f.values.setCaptureDemand({kind:'solar',token:'root500-solar-r6a',active:true});
 f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:12,key:'owner-a'}]);
 return Object.assign(f,{calls});
}
async function growthToReady(ungated,growthFrames){
 const f=await root500DepthFixture(ungated);f.values.needsBirth=true;
 for(let i=0;i<growthFrames;i++){f.values.prepareSolarShadow();f.advancePreparation();}
 const duringGrowth=f.calls.length;f.values.needsBirth=false;
 let rounds=0,result;do{result=f.values.prepareSolarShadow();f.advancePreparation();rounds++;}while(result.status==='pending'&&rounds<100);
 return{duringGrowth,rounds,status:result.status,compiles:f.calls.length,coverage:f.values.solarCoverage()};
}
test('root500: no solar compile while growing; after growth the gated preparation is ready within one extra round of the pre-gate preparation',async t=>{
 for(const growthFrames of [1,4]){
  const gated=await growthToReady(false,growthFrames),before=await growthToReady(true,growthFrames);
  assert.equal(gated.duringGrowth,0,'gated: nothing is compiled while growing');
  assert(before.duringGrowth>0,'pre-gate: compile ran during growth (the gate is what defers it)');
  assert.equal(gated.status,'ready');assert.equal(before.status,'ready');
  assert.equal(gated.compiles,before.compiles,'the same programs are compiled, only later');
  assert(gated.rounds-before.rounds<=1,`growth end -> solar ready: gated ${gated.rounds} vs pre-gate ${before.rounds} rounds`);
  assert.deepEqual(gated.coverage,before.coverage,'identical solar coverage once ready');
  t.diagnostic(`growthFrames=${growthFrames}: gated ${gated.rounds} round(s), pre-gate ${before.rounds}`);
 }
});
