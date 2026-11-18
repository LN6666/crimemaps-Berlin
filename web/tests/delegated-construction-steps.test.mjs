import test from 'node:test';
import assert from 'node:assert/strict';
import {delegatedPreflightFixture} from './support/fixtures-renderer-leftovers-delegated.mjs';

// Actual prepareBatches, advance/close construction iterators, material-source
// generator, page store, source-text admission and scheduler run here. The
// existing fixture's opaque CPU packing recorder remains a declared boundary;
// actual packing bits/SOURCE/material contracts belong to the affected resident
// geometry and shader-assembly suites, not this cancellation fixture.
const tokenNames=['F004_TOKEN645','F269_TOKEN640','F285_TOKEN634','F235_TOKEN631','F244_TOKEN627',
 'F244_TOKEN622','F244_TOKEN619','F358_TOKEN604','F238_BODY595_GLSL','F358_NORMAL579_TOKEN',
 'F346_ANNEX562_CLIP','F346_ANNEX562_GLSL','F355_HIP559_CLIP'];
const fixtureSource=tokenNames.join('|')+'|?f238Body595(|s166|repairs';
const packedFields=['published','generation','indices','loaded','solarShadowAdmittedKeys','rathausProxyMasks',
 'cityPaintFragment','cityPaintFragmentBytes','materialSourceSettled','materialRecipeRevision','materialSourceWorkRevision',
 'residentDataPlan','publishedDataPlan','sceneChunks','sceneSpans','residentChunkInput'];

async function fixture(t,{blockAdmission=false}={}){
 const f=await delegatedPreflightFixture(t,'berlin',{fixtureSource,tokenNames,packedFields}),S=f.ctx;
 const baseScope=S.preparedScope,warm=new AbortController(),rows=f.args()[0];
 await S.prepareDelegated500Data(rows,'berlin',warm.signal,baseScope,rows);
 await S.prepareDelegated500Programs(rows,'berlin',warm.signal,baseScope);
 const baseline=f.store.budget.stats.bytes,pins=baseScope.stats.pins;
 const events={steps:[],claims:[],scopePins:[],productionSettlements:[],waiting:0,clock:0,turn:0,blocker:undefined};
 const scope=new Proxy(baseScope,{get(target,key){
  if(key==='retain')return()=>{const release=target.retain(),record={releases:0};events.scopePins.push(record);
   return()=>{record.releases++;assert.equal(record.releases,1,'a construction scope pin returns once');release();};};
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
 const wait=S.waitForDelegatedSourceText;
 S.waitForDelegatedSourceText=(budget,estimate,signal)=>{
  events.waiting++;
  if(blockAdmission&&!events.blocker){
   const required=S.delegatedSourceTextCosts(estimate,S.newDelegatedSourceTextIdentities()).reduce((n,cost)=>n+cost.bytes,0);
   const stats=budget.stats,bytes=stats.limitBytes-stats.bytes-Math.max(1,Math.floor(required/2));
   assert(bytes>0,'the fixture source fits individually but cannot overlap its blocker');
   events.blocker=budget.reserve({category:'construction',bytes,precision:'exact',label:'fixture overlapping admission'});
  }
  return wait(budget,estimate,signal).then(claim=>{
   const record={releases:0,claim:undefined};events.claims.push(record);
   const observed=new Proxy(claim,{get(target,key){
    if(key==='release')return()=>{record.releases++;assert.equal(record.releases,1,'the actual admitted material claim returns once');target.release();};
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
   }});
   record.claim=observed;return observed;
  });
 };
 const clock=work=>{
  const previous=Object.getOwnPropertyDescriptor(performance,'now');
  Object.defineProperty(performance,'now',{configurable:true,value:()=>events.clock});
  try{return f.turns.turn(work);}finally{if(previous)Object.defineProperty(performance,'now',previous);else delete performance.now;}
 };
 const live=()=>({published:S.published,generation:S.generation,loaded:S.loaded,sourceLoaded:S.sourceLoaded,
  sceneChunks:S.sceneChunks,sceneChunkBindings:S.sceneChunkBindings,residentPreparedData:S.residentPreparedData,
  packingChunkInput:S.packingChunkInput,preparingChunkProduction:S.preparingChunkProduction,
  currentChunkConstruction:S.currentChunkConstruction});
 const initial=live();
 const acquire=request=>f.store.acquire({...request,produce(context){
  const produced=request.produce({...context,scheduleSteps(gl,step,options){
   assert.equal(options.phase,'source-build');
   return clock(()=>context.scheduleSteps(gl,()=>{
    const done=step();
    events.steps.push({turn:events.turn,done});
    // Consuming >4ms on a real step makes the scheduler's own turn budget
    // expire. A false result is not replaced with a synthetic frame boundary.
    events.clock+=5;
    assert.equal(S.packingChunkInput,initial.packingChunkInput,'packing control cannot escape a step');
    assert.equal(S.preparingChunkProduction,initial.preparingChunkProduction);
    assert.equal(S.currentChunkConstruction,initial.currentChunkConstruction);
    if(!S.destroyed){assert.equal(S.published,initial.published);assert.equal(S.loaded,initial.loaded);
     assert.equal(S.sourceLoaded,initial.sourceLoaded);assert.equal(S.generation,initial.generation);}
    return done;
   },options));
  }});
  // Register before the store attaches complete/fail to this same producer
  // promise. Awaiting this void child resumes after that already-queued store
  // reaction has finished the CPU entry and returned its reservation. Neither
  // the observer nor its fulfilled value retains the construction payload.
  events.productionSettlements.push(Promise.resolve(produced).then(()=>{},()=>{}));
  return produced;
 }});
 const observedStore=new Proxy(f.store,{get(target,key){return key==='acquire'?acquire:Reflect.get(target,key);}});
 // Keep the pre-existing packing recorder boundary, with one observable yield
 // after it has installed scratch identity/state and spent a full CPU slice.
 // A cheap yield may be coalesced by the bounded construction runner.
 // The production construction
 // runner must restore live state at this boundary and retire scratch on cancel.
 const actualPackSteps=f.actualPackingSteps,actualFilter=S.filterConstructionComponents,pack=S.packResidentBatches;
 S.packResidentBatchesSteps=function*(...args){
  S.sourceLoaded=new Map(args[0].map(row=>[row.objectId+'|'+row.partId,row]));
  const value=pack(...args);events.clock+=5;yield;return value;
 };
 let sequence=0;
 function start(label='batch',generation=6){
  const args=f.args(label,generation),controller=new AbortController();
  const origin=[13.4,52.5],frame={origin,unit:2*Math.PI*6378137*Math.cos(origin[1]*Math.PI/180),authority:'fixture-source-frame'};
  const chunkInput={store:observedStore,groups:[{contentKey:'construction-steps-source:'+ ++sequence,
   components:args[0],parents:[],frame,cohortKeys:[],materialAuthority:'fixture-material',recipeAuthority:'fixture-recipe',selectedLOD:0}],cohorts:[]};
  const preparation={nextGeneration:generation,shadowAdmission:args[2],nativeDisplay:args[3],partialGatePlan:args[4],
   s402Plan:args[5],s434Plan:args[6],s036Plan:args[7],s240Plan:args[8],f151Plan:args[9]};
  const row={args,controller,settled:false,receipt:undefined,error:undefined};
  row.promise=S.prepareBatches(args[0],controller.signal,scope,undefined,chunkInput,preparation).then(value=>{
   row.settled=true;row.receipt=value;return value;
  },error=>{row.settled=true;row.error=error;throw error;});
  row.promise.catch(()=>{});return row;
 }
 function tick(){events.turn++;return clock(()=>f.turns.drain({one:true}));}
 async function until(predicate){
  for(let count=0;count<300&&!predicate();count++){
   await Promise.resolve();if(f.turns.queue.length)tick();
  }
  assert(predicate(),'bounded actual construction/scheduler continuation did not settle');
 }
 async function beforeFirstStep(row){
  for(let count=0;count<100&&!f.turns.queue.length&&!row.settled;count++)await Promise.resolve();
  assert.equal(row.settled,false);assert(f.turns.queue.length>0);assert.equal(events.steps.length,0);
 }
 async function retired(){await until(()=>events.scopePins.every(pin=>pin.releases===1)&&events.claims.every(claim=>claim.releases===1));}
 async function productionSettled(){
  assert(events.productionSettlements.length>0,'the actual shared construction producer was observed');
  await Promise.all(events.productionSettlements);
 }
 async function close(){
  events.blocker?.release();events.blocker=undefined;
  S.destroy();
  await until(()=>events.scopePins.every(pin=>pin.releases===1)&&events.claims.every(claim=>claim.releases===1));
 }
 return {f,S,events,baseline,pins,scope,initial,live,start,tick,until,beforeFirstStep,retired,productionSettled,close,actualPackSteps,actualFilter};
}

test('actual packing validation and component filtering yield before traversing an entire batch',async t=>{
 const f=await fixture(t),validated=[],originalValidate=f.S.validate;
 try{
  const rows=Array.from({length:41},(_,index)=>({city:'berlin',objectId:'osm/way/'+index,partId:'tiny/'+index,index,batches:[]}));
  f.S.validate=(row,city)=>{assert.equal(city,'berlin');validated.push(row);};
  const previous=f.S.currentChunkConstruction,steps=f.actualPackSteps(rows,6),first=steps.next();
  assert.equal(first.done,false);assert(validated.length>0&&validated.length<rows.length,
   'the actual packing generator yields inside its component-validation loop');
  const checked=validated.length;steps.return();assert.equal(steps.next().done,true);
  assert.equal(validated.length,checked,'return cancels the validation continuation');
  assert.equal(f.S.currentChunkConstruction,previous,'early cancellation creates no partial construction');
  const keep=row=>row.index%3!==0,filter=f.actualFilter(rows,keep);let yields=0,result;
  for(;;){const next=filter.next();if(next.done){result=next.value;break;}yields++;}
  assert(yields>=2,'the actual filter exposes bounded continuations');
  const expected=rows.filter(keep);assert.equal(result.length,expected.length);
  result.forEach((row,index)=>assert.strictEqual(row,expected[index],'filter preserves source identity and order'));
 }finally{f.S.validate=originalValidate;await f.close();}
});

test('actual delegated construction spans scheduler turns and restores the published resident between source steps',async t=>{
 const f=await fixture(t);let receipt;
 try{
  const row=f.start();await f.beforeFirstStep(row);
  assert.equal(f.events.claims.length,1);assert.equal(f.events.claims[0].claim.active,true);
  f.tick();await Promise.resolve();
  assert.equal(row.settled,false);assert(f.events.steps.length>0);
  assert.equal(f.S.preparedChunkConstructions.has(row.receipt),false);
  await f.until(()=>row.settled);receipt=await row.promise;
  assert(new Set(f.events.steps.map(step=>step.turn)).size>=2,'actual scheduler tick budget yields this one construction');
  assert(f.events.steps.length>=2,'the construction advances through multiple scheduled slices');
  assert.equal(f.events.steps.at(-1).done,true);
  const construction=f.S.preparedChunkConstructions.get(receipt);
  assert(construction&&!construction.closed);assert.strictEqual(construction.components,row.args[0]);
  assert.equal(f.S.published,f.initial.published,'a complete preparation is still not a published model');
  receipt.release();receipt.release();
  await f.retired();
  assert.equal(f.S.preparedScope.stats.pins,f.pins);
  assert.equal(f.f.store.budget.stats.bytes,f.baseline);
 }finally{receipt?.release();await f.close();}
});

test('waiting admission and cancellation before the first real step return their claim and scope without publication',async t=>{
 for(const when of ['admission','first-step']){
  const f=await fixture(t,{blockAdmission:when==='admission'});
  try{
   const row=f.start(when),rejection=assert.rejects(row.promise,error=>error.name==='AbortError');
   if(when==='admission'){
    for(let count=0;count<100&&!f.events.waiting;count++)await Promise.resolve();
    assert.equal(f.events.waiting,1);assert.equal(f.events.claims.length,0);assert.equal(f.events.steps.length,0);
   }else await f.beforeFirstStep(row);
   row.controller.abort();await rejection;await f.retired();await f.productionSettled();
   assert.equal(f.S.published,f.initial.published);assert.equal(f.events.steps.length,0);
   f.events.blocker?.release();f.events.blocker=undefined;
   assert.equal(f.f.store.budget.stats.bytes,f.baseline);
   assert.equal(f.S.preparedScope.stats.pins,f.pins);
  }finally{await f.close();}
 }
});

test('abort and a newer generation between real turns retire scratch once and never publish the old identity',async t=>{
 for(const action of ['abort','new-generation']){
  const f=await fixture(t);let latestReceipt;
  try{
   const first=f.start('old-identity',6),rejected=assert.rejects(first.promise,error=>error.name==='AbortError');
   await f.beforeFirstStep(first);f.tick();await Promise.resolve();
   assert.equal(first.settled,false);assert.equal(f.events.steps.at(-1).done,false);
   if(action==='abort')first.controller.abort();
   else{
    const latest=f.start('new-identity',7);await f.until(()=>latest.settled);latestReceipt=await latest.promise;
    const construction=f.S.preparedChunkConstructions.get(latestReceipt);
    assert.strictEqual(construction.components,latest.args[0]);
    assert.notStrictEqual(construction.components,first.args[0]);
    assert.equal(construction.state.generation,7);
    latestReceipt.release();
   }
   await rejected;await f.retired();await f.productionSettled();
   assert.equal(f.S.published,f.initial.published);
   assert.equal(first.receipt,undefined);assert.equal(f.S.preparedScope.stats.pins,f.pins);
   assert.equal(f.f.store.budget.stats.bytes,f.baseline);
  }finally{latestReceipt?.release();await f.close();}
 }
});

test('destroy between construction turns preserves destroyed live identity while scratch groups claims and scope retire',async t=>{
 const f=await fixture(t);
 try{
  const row=f.start('destroyed-scratch',6),rejected=assert.rejects(row.promise,error=>error.name==='AbortError');
  await f.until(()=>f.f.packs.length===1&&!row.settled);
  assert.equal(f.events.steps.at(-1).done,false,'packing scratch is paused at a real continuation boundary');
  f.S.destroy();
  assert.equal(f.S.destroyed,true);
  const destroyed=f.live();
  await rejected;await f.retired();
  for(const key of ['sourceLoaded','loaded','sceneChunks','sceneChunkBindings','residentPreparedData','generation','published'])
   assert.strictEqual(f.live()[key],destroyed[key],'async close must preserve destroyed live '+key);
  assert.equal(row.receipt,undefined);
  assert.equal(f.S.preparedScope.stats.pins,f.pins);
 }finally{await f.close();}
});
