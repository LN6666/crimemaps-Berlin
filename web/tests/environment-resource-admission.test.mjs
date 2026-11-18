import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// One bundle: the ledger, the page store and the environment admission share
// class identities exactly as they do in the product bundle.
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const entry=`export * from './environment-resource-budget';export {createResourceBudget,ResourceBudgetExceededError} from './render-runtime/resource-budget';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export {estimateRetainedBuildingPayload} from './building-payload-cost';`;
const built=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022',preserveSymlinks:true});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const MiB=1024*1024;
const cost=(bytes,category='construction')=>({category,bytes,precision:'estimate',identity:{}});

test('pre-read JSON bound covers the retained decode estimate for adversarial JSON shapes',()=>{
 const shapes=[
  '['+Array.from({length:4000},()=>'{}').join(',')+']',
  '['+Array.from({length:4000},()=>'[]').join(',')+']',
  '['+Array.from({length:3000},()=>'""').join(',')+']',
  '['+Array.from({length:3000},(_,i)=>String(i%10)).join(',')+']',
  '{'+Array.from({length:2000},(_,i)=>'"k'+i+'":{}').join(',')+'}',
  '{'+Array.from({length:2000},(_,i)=>'"'+String.fromCharCode(97+i%26)+'":[]').join(',')+'}',
  JSON.stringify({type:'FeatureCollection',features:Array.from({length:200},(_,i)=>({type:'Feature',id:'osm/way/'+(i+1),geometry:{type:'Polygon',coordinates:[[[13.1,52.1],[13.2,52.1],[13.2,52.2],[13.1,52.1]]]},properties:{kind:'green',osmTags:{landuse:'grass'},displayClip:false}}))}),
  '"'+'é'.repeat(5000)+'"','{}','[]','0','true','null','[['+'[],'.repeat(500)+'[]]]',
  '['+Array.from({length:39},()=>'[').join('')+Array.from({length:39},()=>']').join('')+']',
 ];
 for(const text of shapes){
  const bytes=Buffer.byteLength(text),costs=m.environmentJsonReadCosts({bytes},'fixture'),decoded=costs.find(c=>c.category==='decoded'),textCost=costs.find(c=>c.category==='normalize');
  const actual=m.estimateRetainedBuildingPayload(JSON.parse(text)).retainedPayloadEstimateBytes;
  assert.ok(decoded.bytes>=actual,`decoded bound ${decoded.bytes} must cover ${actual} for ${text.slice(0,24)}`);
  assert.equal(decoded.bytes,bytes*24+16,'bound is derived from the descriptor bytes, not a fixed guess');
  assert.ok(textCost.bytes>=text.length*2,'two-byte decoded text is covered');
 }
 const gz=m.environmentJsonReadCosts({bytes:1000,compression:'gzip',uncompressed_bytes:9000},'gz');
 assert.equal(gz.find(c=>c.category==='decoded').bytes,9000*24+16,'gzip bounds use the inflated size');
 assert.ok(gz.find(c=>c.category==='inflate').bytes>=1000+9000,'gzip input and output copies are charged');
});

test('admission refuses atomically: unfit above the limit, pending under pressure, never a partial claim',()=>{
 const budget=m.createResourceBudget({limitBytes:10*MiB,recentLimitBytes:MiB});
 assert.throws(()=>m.reserveEnvironmentCosts(budget,[cost(11*MiB)],'too large'),error=>error instanceof m.EnvironmentResourceUnfitError&&error.requiredBytes===11*MiB&&error.limitBytes===10*MiB);
 const blocker=budget.reserve(cost(8*MiB));
 assert.throws(()=>m.reserveEnvironmentCosts(budget,[cost(MiB),cost(2*MiB)],'blocked'),error=>error instanceof m.EnvironmentResourcePendingError&&error.requiredBytes===3*MiB&&error.pressure.capacity===10*MiB);
 assert.equal(budget.stats.bytes,8*MiB,'a refused multi-cost claim leaves no partial reservation');
 const shared={},claim=m.reserveEnvironmentCosts(budget,[{category:'gpu-buffer',bytes:MiB,precision:'estimate',identity:shared}],'fits');
 assert.equal(budget.stats.bytes,9*MiB);
 // Same identity transfers a pre-admitted claim without double counting.
 const transfer=m.reserveEnvironmentCosts(budget,[{category:'gpu-buffer',bytes:MiB,precision:'exact',identity:shared}],'transfer');
 assert.equal(budget.stats.bytes,9*MiB);claim.release();assert.equal(budget.stats.bytes,9*MiB);transfer.release();blocker.release();assert.equal(budget.stats.bytes,0);
 const exceeded=budget.tryReserve(cost(12*MiB));assert.equal(exceeded.ok,false);
 assert.ok(m.environmentAdmissionError(exceeded.error,'x') instanceof m.EnvironmentResourceUnfitError,'a ledger refusal larger than capacity is unfit');
 const busy=budget.reserve(cost(9*MiB)),refused=budget.tryReserve(cost(2*MiB));busy.release();
 assert.ok(m.environmentAdmissionError(refused.error,'x') instanceof m.EnvironmentResourcePendingError,'a refusal that fits an empty ledger waits');
 assert.equal(m.environmentAdmissionError(new Error('other'),'x'),undefined);
});

test('waiting uses only the ledger wake-up and the caller abort; no timer is created',async t=>{
 const saved={setTimeout:globalThis.setTimeout,setInterval:globalThis.setInterval};
 t.after(()=>{globalThis.setTimeout=saved.setTimeout;globalThis.setInterval=saved.setInterval;});
 const budget=m.createResourceBudget({limitBytes:4*MiB,recentLimitBytes:MiB}),blocker=budget.reserve(cost(4*MiB));
 let attempts=0;const observer=m.createEnvironmentAdmissionStats('fixture');
 globalThis.setTimeout=()=>{throw Error('admission created a timer');};globalThis.setInterval=()=>{throw Error('admission created an interval');};
 const controller=new AbortController();
 const pending=m.retryEnvironmentAdmission(budget,controller.signal,'leaf',()=>{attempts++;return m.reserveEnvironmentCosts(budget,[cost(MiB)],'leaf');},observer);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(attempts,1,'the refused attempt is not polled');assert.equal(budget.stats.availabilityListeners,1);
 assert.equal(observer.stats.activeWaits,1);assert.equal(observer.stats.pending.requiredBytes,MiB);assert.equal(observer.stats.pending.phase,'leaf');
 blocker.release();const claim=await pending;
 assert.equal(attempts,2,'one wake-up retries once');assert.equal(claim.bytes,MiB);assert.equal(observer.stats.activeWaits,0);assert.equal(observer.stats.pending,undefined);assert.equal(observer.stats.waits,1);
 claim.release();globalThis.setTimeout=saved.setTimeout;globalThis.setInterval=saved.setInterval;
 // Abort removes the waiter and returns nothing.
 const again=budget.reserve(cost(4*MiB)),abort=new AbortController(),waiting=m.waitForEnvironmentBudget(budget,abort.signal);
 assert.equal(budget.stats.availabilityListeners,1);abort.abort();
 await assert.rejects(waiting,error=>error.name==='AbortError');assert.equal(budget.stats.availabilityListeners,0);again.release();
 // A synchronous admitted attempt keeps ordering and does not wait.
 const sync=m.attemptEnvironmentAdmission(budget,new AbortController().signal,'sync',()=>'value');assert.deepEqual(sync,{admitted:true,value:'value'});
 assert.throws(()=>m.attemptEnvironmentAdmission(budget,new AbortController().signal,'unfit',()=>m.reserveEnvironmentCosts(budget,[cost(5*MiB)],'unfit')),m.EnvironmentResourceUnfitError);
});

function fenceGL(){
 let lost=false,signaled=false;const fences=[];
 return{fences,setLost(v){lost=v;},signal(){signaled=true;},isContextLost:()=>lost,SYNC_GPU_COMMANDS_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3,TIMEOUT_EXPIRED:4,WAIT_FAILED:5,
  fenceSync(){const fence={id:fences.length};fences.push(fence);return fence;},flush(){},deleteSync(){},clientWaitSync(){return signaled?2:4;}};
}
test('GPU claims retire behind the page fence, lost storage releases immediately, unused claims are abandoned',()=>{
 const budget=m.createResourceBudget({limitBytes:16*MiB,recentLimitBytes:MiB}),store=m.createChunkResourceStore({budget}),gl=fenceGL(),ledger=m.createEnvironmentGpuLedger('fixture');
 ledger.replace(store,gl,'fixed',[m.gpuBufferCost(MiB,{},'a')]);ledger.replace(store,gl,'water',[m.gpuBufferCost(2*MiB,{},'b')]);
 assert.equal(budget.stats.bytes,3*MiB);assert.deepEqual(ledger.stats.claims,{fixed:MiB,water:2*MiB});
 // A size change admits the new storage first; the old claim stays charged until its fence passes.
 ledger.replace(store,gl,'water',[m.gpuBufferCost(MiB/2,{},'c')]);
 assert.equal(budget.stats.bytes,3.5*MiB,'old storage remains charged while submitted work may use it');
 assert.equal(budget.stats.retiringBytes,2*MiB);store.collectRetired();assert.equal(budget.stats.bytes,3.5*MiB,'unsignaled fence keeps the retiring claim');
 gl.signal();store.collectRetired();assert.equal(budget.stats.bytes,1.5*MiB);
 assert.throws(()=>ledger.replace(store,gl,'huge',[m.gpuBufferCost(17*MiB,{},'d')]),m.EnvironmentResourceUnfitError);
 assert.equal(budget.stats.bytes,1.5*MiB,'a refused GPU claim allocates nothing');
 gl.setLost(true);ledger.release();assert.equal(budget.stats.bytes,0,'lost-context storage is released at once, not fenced');assert.equal(ledger.stats.lostReleases,2);
 gl.setLost(false);ledger.replace(store,gl,'fixed',[m.gpuBufferCost(MiB,{},'e')]);ledger.abandon();assert.equal(budget.stats.bytes,0,'never-allocated storage needs no fence');
 store.destroy();
});
