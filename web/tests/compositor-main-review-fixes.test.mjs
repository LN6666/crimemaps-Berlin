import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompositorHarness,page,mapStub,controller,deferred,settle,until,providers} from './support/compositor-main-harness.mjs';

// The compositor-main review fixes (F1 held detail demand, F2 rollback reason,
// F4 destroy races) on the real painted-map compositor, the real page ledger
// and store, the real building detail runtime and planar reflection group.
const detailCatalog={city:'berlin',schema:'crimemaps-building-detail-catalog-v2',schemaVersion:2,entryCount:1,pages:[]};
const loadDetail=await createCompositorHarness({detailCatalog}),loadPlain=await createCompositorHarness();
const asset={path:'/safety/environment/berlin/a.json',sha256:'a'.repeat(64),bytes:10};
const demand=(manager,pending,held)=>{Object.defineProperty(manager,'detailDemandPending',{get:()=>pending,configurable:true});if(held===undefined)delete manager.detailDemandHeld;else Object.defineProperty(manager,'detailDemandHeld',{get:()=>held,configurable:true});};

test('detail demand reaches the captures as a held ledger wait only when every manager with demand holds its wake and the compositor has no refresh of its own',async t=>{
  const {api,fixture}=await loadDetail(t);const p=page(api),map=mapStub(fixture);
  const compositor=api.installCompositor({map,city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  await compositor.requestMode('3d',controller().signal);
  const captures=()=>({shadow:compositor.renderer.prepareSolarShadow(),reflection:compositor.renderer.preparePlanarReflection('water')});
  const city=fixture.captured.get('city').manager,root=fixture.captured.get('root500').manager;
  assert.equal(captures().shadow.status,'ready','no demand: the providers answer');
  // A manager without the field (every manager today): plain pending, the captures keep requesting frames.
  demand(city,true);
  let {shadow,reflection}=captures();
  assert.deepEqual(shadow,{status:'pending',ready:0,pending:1,failed:0},'unchanged plain pending');
  assert.deepEqual(reflection,{status:'pending',ready:0,pending:1,failed:0,plannedTriangles:0,plannedDraws:0});
  assert.equal(api.solarShadowPreparationNeedsFrame(shadow),true);assert.equal(api.solarShadowPreparationNeedsFrame(reflection),true);
  demand(city,true,false);assert.equal(api.solarShadowPreparationNeedsFrame(captures().shadow),true,'detailDemandHeld false: plain pending');
  // Every manager with demand holds its wake: a held wait, no frame of the captures' own.
  demand(city,true,true);
  ({shadow,reflection}=captures());
  assert.deepEqual(shadow,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1});
  assert.deepEqual(reflection,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1,plannedTriangles:0,plannedDraws:0});
  assert.equal(api.solarShadowPreparationNeedsFrame(shadow),false);assert.equal(api.solarShadowPreparationHeldWait(shadow),true);
  assert.equal(api.solarShadowPreparationHeldWait(reflection),true);
  assert.equal(compositor.renderer.renderPlanarReflection({purpose:'reflection',maxTriangles:100,maxDraws:10}).pending,true,'the capture itself still reports pending');
  // A held manager does not make another manager's demand held.
  demand(root,true);assert.equal(api.solarShadowPreparationNeedsFrame(captures().shadow),true,'one manager without a held wake: plain pending');
  demand(root,true,true);assert.equal(api.solarShadowPreparationHeldWait(captures().shadow),true);
  demand(root,false,false);assert.equal(api.solarShadowPreparationHeldWait(captures().shadow),true,'a manager without demand does not count');
  // The compositor's own refresh is consumed by the next render: plain pending until then.
  compositor.renderer.setPlanarReflectionState({enabled:true,planeWorldZ:2});
  assert.equal(api.solarShadowPreparationNeedsFrame(captures().shadow),true,'a compositor refresh pending: the next frame consumes it');
  for(const listener of [...map.listeners])listener();
  assert.equal(api.solarShadowPreparationHeldWait(captures().shadow),true,'consumed by render: held again');
  demand(city,false);demand(root,false);assert.equal(captures().shadow.status,'ready');
  compositor.destroy();
});

test('without a configured detail catalog a held field changes nothing',async t=>{
  const {api,fixture}=await loadPlain(t);const p=page(api);
  const compositor=api.installCompositor({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  await compositor.requestMode('3d',controller().signal);
  demand(fixture.captured.get('city').manager,true,true);
  assert.equal(compositor.renderer.prepareSolarShadow().status,'ready','detail demand only gates captures when detail is configured');
  compositor.destroy();
});

test('the automatic 2D rollback of a timed-out or failed 3D request passes every provider {retainPrograms:true}; an explicit 2D switch passes no reason',async t=>{
  const {api,fixture}=await loadPlain(t);const p=page(api);
  const compositor=api.installCompositor({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  await compositor.ensureReady(controller().signal);
  const rollback=()=>fixture.modeCalls.filter(row=>row.args[0]==='2d');
  for(const [message,reason] of [['3D draw readiness timed out','readiness-timeout'],['tier300 failed','error']]){
    fixture.modeCalls.length=0;fixture.failMode={provider:'tier300',message};
    await assert.rejects(compositor.requestMode('3d',controller().signal),new RegExp(message));
    assert.equal(compositor.cacheStats().threeDFallback?.reason,reason);
    const calls=rollback();assert.deepEqual(calls.map(row=>row.provider).sort(),[...providers].sort(),'every provider is rolled back');
    for(const row of calls){assert.equal(row.args.length,3,row.provider+' receives the reason');assert.deepEqual(row.args[2],{retainPrograms:true});}
  }
  fixture.failMode=undefined;await compositor.requestMode('3d',controller().signal);
  fixture.modeCalls.length=0;await compositor.requestMode('2d',controller().signal);
  const explicit=rollback();assert.equal(explicit.length,providers.length);
  for(const row of explicit)assert.equal(row.args.length,2,'an explicit 2D switch passes no third argument');
  compositor.destroy();
});

test('the rollback of a failed 2D request passes no reason',async t=>{
  const {api,fixture}=await loadPlain(t);const p=page(api);
  const compositor=api.installCompositor({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  await compositor.requestMode('3d',controller().signal);
  const church=fixture.captured.get('church').manager,original=church.requestMode;let failed=false;
  church.requestMode=async(...args)=>{if(args[0]==='2d'&&!failed){failed=true;fixture.modeCalls.push({provider:'church',args});throw Error('church 2D failed');}return original(...args);};
  fixture.modeCalls.length=0;
  await assert.rejects(compositor.requestMode('2d',controller().signal),/church 2D failed/);
  assert.equal(compositor.cacheStats().threeDFallback,undefined,'no 3D fallback');
  const calls=fixture.modeCalls.filter(row=>row.args[0]==='2d');assert(calls.length>providers.length,'the failed 2D request was rolled back');
  for(const row of calls)assert.equal(row.args.length,2,row.provider+': no reason');
  compositor.destroy();
});

test('destroy racing a three-argument readAsset or the provider loop rejects with AbortError, never a TypeError',async t=>{
  const {api,fixture}=await loadPlain(t);const p=page(api);
  const compositor=api.installCompositor({map:mapStub(fixture),city:'berlin',mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  await compositor.requestMode('3d',controller().signal);
  // The readiness already resolved; destroy lands before the continuation.
  const reading=compositor.readAsset(asset,controller().signal,10);compositor.destroy();
  await assert.rejects(reading,{name:'AbortError'});assert.equal(fixture.assetReads.length,0,'nothing reaches a destroyed manager');
  // root500 resolves its requestMode after destroy, ignoring the abort.
  const {api:api2,fixture:fixture2}=await loadPlain(t);const q=page(api2);
  const other=api2.installCompositor({map:mapStub(fixture2),city:'berlin',mobile:false,resourceStore:q.resourceStore,fetchBytes:q.read});
  await other.ensureReady(controller().signal);
  const gate=deferred();fixture2.hold={provider:'root500',next:'3d',gate};
  const mode=other.requestMode('3d',controller().signal);
  await until(()=>fixture2.hold===undefined,'root500 holds its 3D request');
  other.destroy();gate.resolve();
  await assert.rejects(mode,{name:'AbortError'});
  for(let i=0;i<3;i++)await settle();
  assert.equal(fixture2.modeCalls.filter(row=>row.provider==='delegated500').length,0,'the loop stops before the next provider');
});
