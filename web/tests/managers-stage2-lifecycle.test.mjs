import test from 'node:test';
import assert from 'node:assert/strict';
import v8 from 'node:v8';
import vm from 'node:vm';
import {harness,providers,tick,deferred,createVisiblePreparationGate} from './support/managers-stage2-harness.mjs';

// The real manager factories (lifecycle harness shared with recovery-resident-reuse):
// draining of aborted CPU preparation before the visible gate is released, the
// visible() order (lazy modules, then the page's paint initialization, then the
// gate and the sources), the automatic 2D fallback reason, and that a manager
// keeps no prepared batch alive once a newer one, a cancellation or a failure
// replaced it.
const waitFor=async(predicate,label,limit=400)=>{for(let i=0;i<limit;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,1));}throw Error('Missing fixture event: '+label);};
v8.setFlagsFromString('--expose-gc');const gc=vm.runInNewContext('gc');
async function collect(){for(let i=0;i<6;i++){await new Promise(resolve=>setImmediate(resolve));gc();}}
const LINEAGE_B=['city','tier300','church','delegated500'],LINEAGE_A=['root500','infill','bremen'];

for(const provider of LINEAGE_B)test(`${provider}: a failed reader drains the staged CPU preparation before the visible gate admits another provider`,async()=>{
 const gate=createVisiblePreparationGate(),h=harness(provider,{runVisiblePreparation:(signal,work)=>gate.run(provider,signal,work)}),prepared=deferred(),prepareStarted=deferred();let rejectReader,next;
 const secondReader=new Promise((_,reject)=>{rejectReader=reject;});void secondReader.catch(()=>{});
 try{
  await h.start();const packs=h.counts.packs;h.fixture.manifest.shards.push({...h.fixture.manifest.shards[0],id:'slow',tile_key:'slow'});
  h.fixture.readOverride=async(asset,_signal,rows)=>asset.id==='slow'?secondReader:rows;
  const prepareBatches=h.renderer.prepareBatches;h.renderer.prepareBatches=async(...args)=>{prepareStarted.resolve();await prepared.promise;return prepareBatches(...args);};
  let preparationStarted=false;void prepareStarted.promise.then(()=>{preparationStarted=true;});
  h.view.bounds[0]+=.001;h.map.emit('movestart');h.map.emit('moveend');
  await waitFor(()=>preparationStarted,provider+' staged CPU preparation while the second reader is pending');
  rejectReader(Error('staged source failure'));await tick();let entered=false;
  next=gate.run(provider==='city'?'church':'city',new AbortController().signal,async()=>{entered=true;});await tick();await tick();
  assert.equal(entered,false,'the aborted staged preparation still runs: the gate is not released');assert.equal(gate.stats.active,1);
  prepared.resolve();await next;await h.settle();
  assert.equal(entered,true);assert.equal(h.counts.packs,packs,'the failed request publishes nothing late');assert(h.states.some(s=>s.status==='error'));assert(gate.idle);
 }finally{prepared.resolve();rejectReader?.(Error('cleanup'));h.manager.destroy();gate.destroy();await next;}
});

for(const provider of LINEAGE_A)test(`${provider}: a request invalidated during its final staged preparation drains it before the visible gate admits another provider`,async()=>{
 const gate=createVisiblePreparationGate(),h=harness(provider,{runVisiblePreparation:(signal,work)=>gate.run(provider,signal,work)}),prepared=deferred(),prepareStarted=deferred();let next;
 try{
  await h.start();const packs=h.counts.packs;
  const prepareBatches=h.renderer.prepareBatches;h.renderer.prepareBatches=async(...args)=>{prepareStarted.resolve();await prepared.promise;return prepareBatches(...args);};
  let preparationStarted=false;void prepareStarted.promise.then(()=>{preparationStarted=true;});
  // A different admission (the view bounds) needs a new CPU preparation; lineage A
  // stages the whole cohort once every leaf is read.
  h.view.bounds[0]+=.001;h.map.emit('movestart');h.map.emit('moveend');
  await waitFor(()=>preparationStarted,provider+' final staged CPU preparation');
  h.map.emit('movestart');await tick();let entered=false;
  next=gate.run('church',new AbortController().signal,async()=>{entered=true;});await tick();await tick();
  assert.equal(entered,false,'the aborted final preparation still runs: the gate is not released');assert.equal(gate.stats.active,1);
  prepared.resolve();await next;await h.settle();
  assert.equal(entered,true);assert.equal(h.counts.packs,packs,'the invalidated request publishes nothing late');assert(gate.idle);
 }finally{prepared.resolve();h.manager.destroy();gate.destroy();await next;}
});

for(const provider of ['root500','infill','bremen','city'])test(`${provider}: visible() completes its lazy modules and the page's paint initialization before the gate and any source read`,async()=>{
 const events=[],gate=createVisiblePreparationGate(),release=deferred();
 const planners=provider==='bremen'?{prepareBremenInfillOwnerRouteModules:async rows=>{events.push('modules:infill:'+rows.map(row=>row.city).join());},prepareNonBerlinOwnerRoutes:async rows=>{events.push('modules:routes:'+rows.map(row=>row.city).join());}}:provider==='city'?{prepareInlineCityMaterials:async city=>{events.push('modules:materials:'+city);}}:{};
 const h=harness(provider,{
  runVisiblePreparation:(signal,work)=>{events.push('gate');return gate.run(provider,signal,work);},
  paintInitializationSettled:signal=>new Promise((resolve,reject)=>{events.push('settled');signal.addEventListener('abort',()=>reject(signal.reason),{once:true});release.promise.then(()=>{events.push('settled:end');resolve();});}),
 },{planners});
 try{
  const starting=h.start();await waitFor(()=>events.includes('settled'),'settled wait');await tick();
  assert.equal(events.includes('gate'),false,'the gate is not entered while paint initialization settles');
  assert.equal(h.counts.reads,0,'no source is read before it settles');
  const modules=events.filter(event=>event.startsWith('modules:'));
  if(provider==='bremen')assert.deepEqual(modules,['modules:infill:bremen','modules:routes:bremen'],'route modules first, by city');
  if(provider==='city')assert.deepEqual(modules,['modules:materials:berlin'],'material modules first, by city');
  if(modules.length)assert(events.indexOf(modules.at(-1))<events.indexOf('settled'),'modules before settled');
  release.resolve();await starting;
  assert(events.indexOf('settled:end')<events.indexOf('gate'),'the gate follows the settled wait');
  const warmups=events.filter(event=>event.startsWith('modules:')).length;h.view.bounds[0]+=.001;h.map.emit('movestart');h.map.emit('moveend');await h.settle();
  assert.equal(events.filter(event=>event.startsWith('modules:')).length,warmups,'the city-selected modules are prepared once');
 }finally{release.resolve();h.manager.destroy();gate.destroy();}
});

for(const provider of ['root500','city'])test(`${provider}: an abort while paint initialization settles reads nothing and never enters the gate`,async()=>{
 const gate=createVisiblePreparationGate(),h=harness(provider,{runVisiblePreparation:(signal,work)=>gate.run(provider,signal,work),paintInitializationSettled:signal=>new Promise((_,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason??new DOMException('Aborted','AbortError')),{once:true});})});
 try{
  const external=new AbortController(),starting=h.manager.requestMode('3d',external.signal);await tick();await tick();
  external.abort();await assert.rejects(starting,{name:'AbortError'});
  assert.deepEqual([h.counts.reads,gate.stats.peakActive,gate.stats.queued],[0,0,0]);
 }finally{h.manager.destroy();gate.destroy();}
});

for(const provider of providers)test(`${provider}: an automatic 2D fallback passes {retainPrograms:true} with its empty batch; explicit 2D preserves its main-program retention policy`,async()=>{
 const h=harness(provider),calls=[],setBatches=h.renderer.setBatches;
 h.renderer.setBatches=(...args)=>{calls.push(args);return setBatches(...args);};
 const empty=()=>calls.filter(args=>args[0].length===0);
 try{
  await h.start();
  await h.manager.requestMode('2d',new AbortController().signal);
  assert.deepEqual(empty().at(-1)?.[2],provider==='bremen'?{retainMainPrograms:true}:undefined,'explicit 2D');
  await h.manager.requestMode('3d',new AbortController().signal);
  await h.manager.requestMode('2d',new AbortController().signal,{retainPrograms:true});
  assert.deepEqual(empty().at(-1)?.[2],{retainPrograms:true},'the page rollback');
  const before=empty().length;h.fixture.readOverride=async()=>{throw Error('fixture source failure');};
  await assert.rejects(h.manager.requestMode('3d',new AbortController().signal),/fixture source failure/);
  assert.equal(h.manager.mode,'2d');assert(empty().length>before,'the failed request empties the batches');
  assert.deepEqual(empty().at(-1)?.[2],{retainPrograms:true},'the failed request\'s own fallback');
 }finally{h.manager.destroy();}
});

for(const provider of providers)test(`${provider}: published, cancelled and failed preparations leave no prepared batch alive in the manager`,async()=>{
 const h=harness(provider),refs=[];let gateNext,failNext=false;
 const prepareBatches=h.renderer.prepareBatches;
 h.renderer.prepareBatches=async(...args)=>{const hold=gateNext;gateNext=undefined;if(hold)await hold.promise;const value=await prepareBatches(...args);refs.push(new WeakRef(value));return value;};
 const setBatches=h.renderer.setBatches;h.renderer.setBatches=(...args)=>{if(failNext&&args[0].length){failNext=false;throw Error('fixture publication failure');}return setBatches(...args);};
 const move=async()=>{h.view.bounds[0]+=.001;h.map.emit('movestart');h.map.emit('moveend');await h.settle();};
 try{
  await h.start();await move();await move();
  // Cancelled: the request is invalidated while its preparation is held.
  const hold=deferred();gateNext=hold;h.view.bounds[0]+=.001;h.map.emit('movestart');h.map.emit('moveend');
  await waitFor(()=>!gateNext,'held preparation');h.map.emit('movestart');hold.resolve();await h.settle();await move();
  // Failed: the publication of a prepared batch throws.
  failNext=true;await move().catch(()=>{});await move();
  assert(refs.length>=4,'several preparations ran ('+refs.length+')');
  await collect();
  const alive=refs.slice(0,-1).filter(ref=>ref.deref()!==undefined).length;
  assert.equal(alive,0,'only the resident preparation may stay alive; '+alive+' of '+(refs.length-1)+' earlier ones are still referenced');
  // An explicit 2D switch releases the resident one as well.
  await h.manager.requestMode('2d',new AbortController().signal);await collect();
  assert.equal(refs.filter(ref=>ref.deref()!==undefined).length,0,'no prepared batch survives the 2D switch');
 }finally{h.manager.destroy();}
});
