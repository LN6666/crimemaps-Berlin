import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {page,driver,stores,loadProductionModule} from './support/core3-runtime.mjs';

function clock(t){
 let now=0,id=0;const timers=new Map();
 t.mock.method(performance,'now',()=>now);
 t.mock.method(globalThis,'setTimeout',(run,delay=0)=>{const key=++id;timers.set(key,{run,at:now+delay});return key;});
 t.mock.method(globalThis,'clearTimeout',key=>timers.delete(key));
 return{timers,advance(ms){now+=ms;let turns=0;for(;;){const next=[...timers].find(([,v])=>v.at<=now);if(!next)break;assert(++turns<100,'deadline processing stays bounded');timers.delete(next[0]);next[1].run();}}};
}
const cost=bytes=>({category:'decoded',bytes,precision:'exact'});
const acquire=(p,key,extra={})=>p.store.acquire({contentKey:key,role:'source',allowRecent:true,estimate:cost(16),produce:()=>new Uint8Array(16),...extra});

// Execute the real page factory with a separate page identity. This catches a
// page-level override even when the store's default-expiry tests still pass.
const {cityCacheIdleTiers}=loadProductionModule(new URL('../src/safety/city-cache-retention.ts',import.meta.url));
for(const city of ['berlin','cologne','frankfurt'])for(const mobile of [false,true])test(`actual ${city} ${mobile?'mobile':'desktop'} page factory expires unused resources at its city deadline`,async t=>{
 const source=readFileSync(new URL('../src/safety/main.ts',import.meta.url),'utf8');
 const ast=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true);
 const factory=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='pageResourceStore');
 const profile=ast.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='pageResourceProfile'));
 assert(factory&&profile,'use the actual page factory and profile state');
 const code=ts.transpileModule(profile.getText(ast)+'\n'+factory.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const owner={},c=clock(t);let narrow=mobile,frames=0;
 const makeStore=Function('matchMedia','getPageChunkResourceStore','cityCacheIdleTiers','currentCity',code+'\nreturn pageResourceStore;')(
  query=>{assert.equal(query,'(max-width:760px)');return{matches:narrow};},
  options=>stores.getPageChunkResourceStore(options,owner),cityCacheIdleTiers,city);
 const store=makeStore(),off=store.onRetirementPending(()=>frames++);
 try{
  assert.equal(store.stats.recentMaxIdleMs,20000);
  assert.equal(store.budget.stats.profile,mobile?'mobile':'desktop');
  narrow=!mobile;assert.equal(makeStore(),store,'resizing keeps the existing page owner');
  const lease=acquire({store},'page-factory/idle');await lease.ready;lease.release();
  const expiry=city==='berlin'?20000:14000;
  assert.deepEqual(Object.values(store.stats.cacheIdleTiersMs),city==='berlin'?[10000,13000,17000,20000]:[7000,9000,12000,14000]);
  c.advance(expiry-1);assert.equal(frames,0);assert.equal(store.stats.recent,1);
  c.advance(1);assert.equal(frames,0);
  assert.equal(store.stats.recent,0);assert.equal(store.budget.stats.bytes,0);
 }finally{off();store.destroy();}
});

test('one earliest deadline disposes idle CPU resources without waiting for a painted frame',async t=>{
 const c=clock(t),p=page();let frames=0;const off=p.store.onRetirementPending(()=>frames++);
 try{
  const a=acquire(p,'expiry/a');await a.ready;a.release();c.advance(1000);
  const b=acquire(p,'expiry/b');await b.ready;b.release();
  assert.equal(c.timers.size,1);
  c.advance(18999);assert.equal(p.store.stats.recent,2);
  c.advance(1);assert.equal(p.store.stats.recent,1);assert.equal(p.budget.stats.bytes,16);
  assert.equal(frames,0,'CPU expiry does not render or wait for a render');
  assert.equal(c.timers.size,1);c.advance(1000);
  assert.equal(p.store.stats.recent,0);assert.equal(p.budget.stats.bytes,0);assert.equal(c.timers.size,0);
 }finally{off();p.store.destroy();}
});

test('actual reuse refreshes expiry and a functional lease survives cache expiry',async t=>{
 const c=clock(t),p=page();let frames=0;const off=p.store.onRetirementPending(()=>frames++);
 try{
  const a=acquire(p,'expiry/reused');await a.ready;a.release();c.advance(19000);
  const live=acquire(p,'expiry/reused');await live.ready;assert.equal(c.timers.size,0,'active resource has no idle deadline');
  const cached=live.retain('cache');assert.equal(c.timers.size,1);
  c.advance(19999);assert.equal(frames,0);assert(live.value);c.advance(1);assert.equal(frames,0);
  p.store.collectRetired();assert.equal(cached.released,true);assert.equal(p.store.stats.recent,0);
  assert.equal(live.value.byteLength,16,'expiry removes cache ownership, never a live owner');assert.equal(p.budget.stats.bytes,16);
  live.release();assert.equal(c.timers.size,0,'expired cache does not restart after the protected consumer leaves');p.store.evictRecent();assert.equal(c.timers.size,0);assert.equal(p.budget.stats.bytes,0);
 }finally{off();p.store.destroy();}
});

test('idle GPU expiry retains its budget until the normal nonblocking fence passes',async t=>{
 const c=clock(t),d=driver(),p=page(d);d.gl.fenceComplete=false;let frames=0,disposed=0;const off=p.store.onRetirementPending(()=>frames++);
 try{
  const lease=p.store.acquireGpu({contentKey:'expiry/gpu',role:'main',context:d.gl,epoch:p.store.contextEpoch(d.gl),allowRecent:true,estimate:{category:'gpu-buffer',bytes:32,precision:'exact'},create:()=>({}),dispose:()=>disposed++});
  lease.release();c.advance(16999);assert.equal(disposed,0);c.advance(1);assert.equal(frames,1);assert.equal(disposed,1);assert.equal(p.budget.stats.bytes,32);
  p.store.collectRetired();assert.equal(disposed,1);assert.equal(p.store.stats.retiring,1);assert.equal(p.budget.stats.bytes,32);
  assert.equal(c.timers.size,0,'retirement uses existing bounded frame requests, not a new poll timer');
  d.gl.fenceComplete=true;await Promise.resolve();p.store.collectRetired();assert.equal(p.store.stats.retiring,0);assert.equal(p.budget.stats.bytes,0);
 }finally{off();p.store.destroy();}
});

test('idle expiry survives detaching the last frame owner; destroy cancels the deadline',async t=>{
 const c=clock(t),p=page();let frames=0;const a=acquire(p,'expiry/lifecycle');await a.ready;a.release();
 assert.equal(c.timers.size,1,'CPU cache expiry does not require a rendering owner');
 const signal=new AbortController(),off=p.store.onRetirementPending(()=>frames++,signal.signal);
 signal.abort();assert.equal(c.timers.size,1);c.advance(20000);assert.equal(frames,0);
 assert.equal(p.budget.stats.bytes,0);assert.equal(c.timers.size,0);
 const b=acquire(p,'expiry/destroy');await b.ready;b.release();assert.equal(c.timers.size,1);
 p.store.destroy();assert.equal(c.timers.size,0);c.advance(21000);assert.equal(frames,0);off();
});

test('reload tiers expire independently in deadline order, not insertion order',async t=>{
 const c=clock(t),p=page(),off=p.store.onRetirementPending(()=>{}),disposed=[];
 try{
  for(const [tier,time] of [['rebuild',20000],['reupload',17000],['redecode',13000],['refetch',10000]]){
   const a=acquire(p,tier,{cacheRetention:tier,dispose:()=>disposed.push([tier,performance.now()])});await a.ready;a.release();
  }
  assert.equal(c.timers.size,1);
  c.advance(9999);assert.deepEqual(disposed,[]);c.advance(1);assert.deepEqual(disposed,[['refetch',10000]]);
  c.advance(3000);assert.deepEqual(disposed.at(-1),['redecode',13000]);
  c.advance(4000);assert.deepEqual(disposed.at(-1),['reupload',17000]);
  c.advance(3000);assert.deepEqual(disposed.at(-1),['rebuild',20000]);
  assert.equal(p.budget.stats.bytes,0);assert.equal(c.timers.size,0);
 }finally{off();p.store.destroy();}
});

test('expired GPU child releases cache-only CPU ancestry without another idle period',async t=>{
 const c=clock(t),d=driver(),p=page(d),off=p.store.onRetirementPending(()=>{});d.gl.fenceComplete=false;
 let sourceDisposals=0;
 try{
  const source=acquire(p,'ancestry/source',{cacheRetention:'redecode',dispose:()=>sourceDisposals++});await source.ready;
  const cache=source.retain('cache');
  const gpu=p.store.acquireGpu({contentKey:'ancestry/gpu',role:'main',context:d.gl,epoch:p.store.contextEpoch(d.gl),parents:[source],allowRecent:true,estimate:{category:'gpu-buffer',bytes:32,precision:'exact'},create:()=>({}),dispose(){}});
  source.release();gpu.release();c.advance(17000);
  assert.equal(sourceDisposals,0,'in-flight GPU dependency is protected');assert.equal(p.store.stats.retiring,1);
  d.gl.fenceComplete=true;p.store.collectRetired();
  assert.equal(sourceDisposals,1);assert.equal(cache.released,true);assert.equal(p.budget.stats.bytes,0);
  assert.equal(p.store.stats.recent,0,'no cascading 17s + 13s wait');
 }finally{off();p.store.destroy();}
});

test('tier eviction protects shared active consumers and reacquisition can refetch',async t=>{
 const c=clock(t),p=page(),off=p.store.onRetirementPending(()=>{});let loads=0,disposed=0;
 const request={cacheRetention:'refetch',produce:()=>{loads++;return new Uint8Array(16);},dispose:()=>disposed++};
 try{
  const a=acquire(p,'reload',request),b=acquire(p,'reload',request);await a.ready;await b.ready;
  a.release();c.advance(21000);assert.equal(loads,1);assert.equal(disposed,0);assert(b.value);
  b.release();c.advance(10000);assert.equal(disposed,1);
  const again=acquire(p,'reload',request);await again.ready;assert.equal(loads,2);assert(again.value);
  again.release();c.advance(10000);assert.equal(disposed,2);assert.equal(p.budget.stats.bytes,0);
 }finally{off();p.store.destroy();}
});

test('configured retention cannot extend a cache past the 20s ceiling',async t=>{
 const c=clock(t),store=stores.createChunkResourceStore({limitBytes:1024,recentLimitBytes:256,recentMaxIdleMs:60000});
 const off=store.onRetirementPending(()=>{});
 try{
  assert.equal(store.stats.recentMaxIdleMs,20000);
  const lease=acquire({store},'ceiling',{cacheRetention:'rebuild'});await lease.ready;lease.release();
  c.advance(20000);assert.equal(store.budget.stats.bytes,0);
 }finally{off();store.destroy();}
});


test('read-only expiry receipts preserve the original deadline and report delayed collection honestly',async t=>{
 const c=clock(t),p=page();
 try{
  const a=acquire(p,'receipt/early',{cacheRetention:'refetch'});await a.ready;a.release();
  c.advance(5000);const before=p.store.stats.idleCache;
  assert.equal(before.deadlines.find(row=>row.limitMs===10000).earliestDeadline,10000);
  for(let i=0;i<4;i++)p.store.stats;
  c.advance(5000);let after=p.store.stats.idleCache;
  assert.equal(after.expiryCount,1);assert.deepEqual(after.lastExpiries[0],{key:'receipt/early',idleSince:0,deadline:10000,collectedAt:10000,idleLimitMs:10000,stateAfter:'released',functionalLeasesAfter:0});
  const b=acquire(p,'receipt/late');await b.ready;b.release();c.advance(25000);
  after=p.store.stats.idleCache;assert.equal(after.expiryCount,2);
  assert.equal(after.lastExpiries.at(-1).deadline,30000);assert.equal(after.lastExpiries.at(-1).collectedAt,35000,'a suspended event loop cannot be reported as on-time');
 }finally{p.store.destroy();}
});

test('memory pressure reclaims all idle tiers before their deadlines while protecting visible data',async t=>{
 const c=clock(t),{store}=page(undefined,{limitBytes:1024,recentLimitBytes:512});
 const disposed=[];let visible,claim;
 try{
  visible=acquire({store},'pressure/visible');await visible.ready;
  for(const tier of ['refetch','redecode','reupload','rebuild']){
   const lease=acquire({store},'pressure/'+tier,{cacheRetention:tier,dispose:()=>disposed.push(tier)});
   await lease.ready;lease.release();
  }
  assert.equal(store.stats.recent,4);c.advance(1000);
  claim=store.budget.reserve(cost(1000));
  assert.deepEqual(disposed,['refetch','redecode','reupload','rebuild']);
  assert.equal(store.stats.recent,0);assert.equal(c.timers.size,0);
  assert.equal(visible.value.byteLength,16);assert.equal(store.budget.stats.bytes,1016);
  assert.equal(store.stats.idleCache.expiryCount,0,'pressure reclamation is not reported as timed expiry');
 }finally{claim?.release();visible?.release();store.destroy();}
 assert.equal(store.budget.stats.bytes,0);assert.equal(c.timers.size,0);
});

for(const city of ['cologne','frankfurt'])test(`${city} expires all four accelerated tiers at the owner-selected times`,async t=>{
 const c=clock(t),store=stores.createChunkResourceStore({limitBytes:1024,recentLimitBytes:256,cacheIdleTiersMs:cityCacheIdleTiers(city)}),disposed=[];
 try{
  for(const tier of ['rebuild','reupload','redecode','refetch']){
   const lease=acquire({store},tier,{cacheRetention:tier,dispose:()=>disposed.push(tier)});await lease.ready;lease.release();
  }
  let elapsed=0;
  for(const [tier,deadline] of [['refetch',7000],['redecode',9000],['reupload',12000],['rebuild',14000]]){
   c.advance(deadline-elapsed-1);assert(!disposed.includes(tier));
   c.advance(1);assert.equal(disposed.at(-1),tier);elapsed=deadline;
  }
  assert.equal(store.budget.stats.bytes,0);
 }finally{store.destroy();}
});

test('focus exit uses 8/11/14/16 seconds, preserves active resources and leaves greenery policy unchanged',async t=>{
 const {BUILDING_FOCUS_EXIT_IDLE_MS:tiers}=loadProductionModule(new URL('../src/safety/building-focus-window.ts',import.meta.url));
 assert.deepEqual(Object.values(tiers),[8000,11000,14000,16000]);
 const c=clock(t),store=stores.createChunkResourceStore({limitBytes:1024,recentLimitBytes:256,cacheIdleTiersMs:cityCacheIdleTiers('cologne')}),disposed=[];
 try{
  const held=[];
  for(const tier of ['refetch','redecode','reupload','rebuild']){
   const lease=acquire({store},'building/'+tier,{cacheRetention:tier,dispose:()=>disposed.push(tier)});await lease.ready;held.push(lease);
  }
  const green=acquire({store},'greenery',{cacheRetention:'refetch',dispose:()=>disposed.push('greenery')});await green.ready;
  store.setIdleRetention(held.map(x=>x.contentKey),tiers);
  c.advance(20000);assert.deepEqual(disposed,[],'focus exit cannot evict still-used payloads');
  for(const lease of held)lease.release();green.release();
  let elapsed=0;
  for(const [name,deadline] of [['greenery',7000],['refetch',8000],['redecode',11000],['reupload',14000],['rebuild',16000]]){
   c.advance(deadline-elapsed-1);assert(!disposed.includes(name));c.advance(1);assert.equal(disposed.at(-1),name);elapsed=deadline;
  }
  assert.equal(store.budget.stats.bytes,0);
 }finally{store.destroy();}
});

test('returning during focus grace reuses the cached payload',async t=>{
 const c=clock(t),p=page();let loads=0;
 const options={cacheRetention:'refetch',produce:()=>{loads++;return new Uint8Array(16);}};
 const lease=acquire(p,'building/return',options);await lease.ready;
 p.store.setIdleRetention([lease.contentKey],{refetch:8000,redecode:11000,reupload:14000,rebuild:16000});lease.release();
 c.advance(7999);const returned=acquire(p,'building/return',options);await returned.ready;
 c.advance(16000);assert.equal(loads,1);assert.equal(returned.value.byteLength,16);
 returned.release();p.store.destroy();
});

test('focus GPU grace ends at 14 seconds but source release waits for the existing GPU fence',async t=>{
 const c=clock(t),d=driver(),p=page(d);d.gl.fenceComplete=false;
 const {BUILDING_FOCUS_EXIT_IDLE_MS:tiers}=loadProductionModule(new URL('../src/safety/building-focus-window.ts',import.meta.url));
 let sourceDisposals=0,meshDisposals=0;
 const off=p.store.onRetirementPending(()=>{});
 try{
  const source=acquire(p,'focus/source',{cacheRetention:'redecode',dispose:()=>sourceDisposals++});await source.ready;
  const green=acquire(p,'greenery/unrelated',{cacheRetention:'rebuild'});await green.ready;
  const mesh=p.store.acquireGpu({contentKey:'focus/gpu',role:'main',context:d.gl,epoch:p.store.contextEpoch(d.gl),parents:[source],allowRecent:false,estimate:{category:'gpu-buffer',bytes:32,precision:'exact'},create:()=>({}),dispose:()=>meshDisposals++});
  source.release();green.release();p.store.setIdleRetention([mesh.contentKey],tiers);mesh.release();
  c.advance(13999);assert.equal(meshDisposals,0);assert.equal(sourceDisposals,0);
  const deadline=p.store.stats.idleCache.deadlines.find(row=>row.limitMs===14000);assert.equal(deadline.entries,1);
  c.advance(1);assert.equal(meshDisposals,1);assert.equal(sourceDisposals,0);assert.equal(p.budget.stats.bytes,64);
  p.store.collectRetired();assert.equal(sourceDisposals,0,'still waiting for the GPU completion fence');
  d.gl.fenceComplete=true;await Promise.resolve();p.store.collectRetired();
  assert.equal(sourceDisposals,1);assert.equal(p.budget.stats.bytes,16);assert.equal(p.store.stats.recent,1,'greenery keeps its original 20-second grace');
  c.advance(6000);assert.equal(p.budget.stats.bytes,0);
 }finally{off();p.store.destroy();}
});

test('focus source grace reaches exclusive packing/GPU descendants but never mixed greenery resources',async t=>{
 const c=clock(t),d=driver(),p=page(d),disposed=[];d.gl.fenceComplete=false;
 const tiers={refetch:8000,redecode:11000,reupload:14000,rebuild:16000},off=p.store.onRetirementPending(()=>{});
 try{
  const source=acquire(p,'focus/ancestor',{allowRecent:false,cacheRetention:'refetch',dispose:()=>disposed.push('source')});await source.ready;
  const packed=acquire(p,'focus/packed',{allowRecent:false,parents:[source],cacheRetention:'redecode',dispose:()=>disposed.push('packed')});await packed.ready;
  const green=acquire(p,'greenery/independent',{cacheRetention:'redecode',dispose:()=>disposed.push('green')});await green.ready;
  const mixed=acquire(p,'shared/mixed',{allowRecent:false,parents:[source,green],dispose:()=>disposed.push('mixed')});await mixed.ready;
  const gpu=p.store.acquireGpu({contentKey:'focus/gpu-descendant',role:'main',context:d.gl,epoch:p.store.contextEpoch(d.gl),parents:[packed,source],allowRecent:false,estimate:{category:'gpu-buffer',bytes:32,precision:'exact'},create:()=>({}),dispose:()=>disposed.push('gpu')});
  p.store.setIdleRetention([source.contentKey],tiers,{exclusiveDependents:true});
  mixed.release();source.release();packed.release();green.release();gpu.release();
  assert.deepEqual(disposed,['mixed'],'mixed-parent resource keeps its original no-cache policy');
  c.advance(12999);assert(!disposed.includes('green'));c.advance(1);assert(disposed.includes('green'),'unrelated greenery retains its original 13-second policy');
  c.advance(999);assert(!disposed.includes('gpu'));c.advance(1);assert(disposed.includes('gpu'));assert(!disposed.includes('packed'));
  p.store.collectRetired();assert(!disposed.includes('packed'),'GPU fence still owns its packing parents');
  d.gl.fenceComplete=true;await Promise.resolve();p.store.collectRetired();
  assert(disposed.includes('packed'));assert(disposed.includes('source'));assert.equal(p.budget.stats.bytes,0,'expired GPU family must not restart idle clocks on its ancestors');
 }finally{off();p.store.destroy();}
});

test('exclusive dependent grace cannot bypass a zero recent-cache budget',async t=>{
 clock(t);const {store}=page(undefined,{limitBytes:1024,recentLimitBytes:0}),disposed=[];
 try{
  const root=acquire({store},'focus/root',{allowRecent:false,dispose:()=>disposed.push('root')});await root.ready;
  const packed=acquire({store},'focus/child',{parents:[root],allowRecent:false,dispose:()=>disposed.push('packed')});await packed.ready;
  store.setIdleRetention([root.contentKey],{refetch:8000,redecode:11000,reupload:14000,rebuild:16000},{exclusiveDependents:true});root.release();packed.release();
  assert.deepEqual(disposed,['packed','root']);assert.equal(store.stats.recent,0);assert.equal(store.budget.stats.bytes,0);
 }finally{store.destroy();}
});

for(const [tier,ordinary] of [['refetch',7000],['redecode',9000],['reupload',12000],['rebuild',14000]])test(`reusing focus ${tier} restores Frankfurt ordinary ${ordinary}ms policy`,async t=>{
 const c=clock(t),p=page(),store=stores.createChunkResourceStore({budget:p.budget,cacheIdleTiersMs:cityCacheIdleTiers('frankfurt')});let loads=0,disposed=0;
 const request={cacheRetention:tier,produce:()=>{loads++;return new Uint8Array(16);},dispose:()=>disposed++};
 try{
  const a=acquire({store},'focus/reuse/'+tier,request);await a.ready;
  const grace={refetch:8000,redecode:11000,reupload:14000,rebuild:16000};store.setIdleRetention([a.contentKey],grace);store.setIdleRetention([a.contentKey],grace);a.release();c.advance(1000);
  const b=acquire({store},a.contentKey,request);await b.ready;assert.equal(loads,1);b.release();
  c.advance(ordinary-1);assert.equal(disposed,0);c.advance(1);assert.equal(disposed,1);assert.equal(store.budget.stats.bytes,0);
 }finally{store.destroy();p.store.destroy();}
});

test('temporary focus retention does not permanently enable caching for a no-cache source',async t=>{
 const c=clock(t),p=page();let loads=0,disposed=0;
 const request={allowRecent:false,produce:()=>{loads++;return new Uint8Array(16);},dispose:()=>disposed++};
 try{
  const a=acquire(p,'focus/transient',request);await a.ready;p.store.setIdleRetention([a.contentKey],{refetch:8000,redecode:11000,reupload:14000,rebuild:16000});a.release();c.advance(1000);
  const b=acquire(p,a.contentKey,request);await b.ready;assert.equal(loads,1);b.release();assert.equal(disposed,1);assert.equal(p.budget.stats.bytes,0);
 }finally{p.store.destroy();}
});

test('a cache-only touch keeps focus grace, but a functional GPU reuse restores the city tier',async t=>{
 const c=clock(t),d=driver(),p=page(),store=stores.createChunkResourceStore({budget:p.budget,cacheIdleTiersMs:cityCacheIdleTiers('frankfurt')});let uploads=0,disposed=0;
 const request={contentKey:'focus/reused-gpu',role:'main',context:d.gl,epoch:store.contextEpoch(d.gl),allowRecent:true,estimate:{category:'gpu-buffer',bytes:32,precision:'exact'},create:()=>{uploads++;return{};},dispose:()=>disposed++};
 const off=store.onRetirementPending(()=>{});
 try{
  const first=store.acquireGpu(request);store.setIdleRetention([first.contentKey],{refetch:8000,redecode:11000,reupload:14000,rebuild:16000});first.release();c.advance(1000);
  const cached=store.acquireGpu({...request,role:'cache'});cached.release();assert(store.stats.idleCache.deadlines.some(row=>row.limitMs===14000&&row.entries===1));
  const returned=store.acquireGpu(request);assert.equal(uploads,1);returned.release();
  c.advance(11999);assert.equal(disposed,0);c.advance(1);assert.equal(disposed,1);await Promise.resolve();store.collectRetired();assert.equal(store.budget.stats.bytes,0);
 }finally{off();store.destroy();p.store.destroy();}
});
