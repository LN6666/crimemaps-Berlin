import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {encodeCityTable,partitionCityTable} from '../../scripts/city-data-shards.mjs';

async function module(name){
 const result=await build({entryPoints:[new URL('../src/safety/'+name+'.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const {createFrozenDataScope}=await module('frozen-data-scope');
const {createFrozenDataLeaseStore}=await module('frozen-data-lease-store');
function fixture(){
 const payloads=['{"positions":[1,2,3],"paint":[0.25,0.5]}','{"positions":[4,5,6],"paint":[0.75,1]}'].map(text=>Buffer.from(text));
 const descriptors=payloads.map(bytes=>{const sha=createHash('sha256').update(bytes).digest('hex');return{path:'/safety/buildings3d/painted-tables/'+sha.slice(0,2)+'/'+sha+'.json',sha256:sha,bytes:bytes.length};});
 const refs=descriptors.map((value,i)=>({canonicalSHA256:value.sha256,file:'painted/test/recipe-'+i+'.ts',occurrence:0,codec:'json'}));
 const store=createFrozenDataLeaseStore(descriptors);let reads=0,corrupt=false;
 const client=store.client({city:'bremen',profileSHA256:null,provider:'test',selection:{tables:descriptors.map(d=>d.sha256),initializers:Object.fromEntries(refs.map(ref=>[ref.canonicalSHA256,{[ref.file]:1}]))},resolve:sha=>sha,async read(path){reads++;const index=descriptors.findIndex(d=>d.path===path);return corrupt&&index===1?Buffer.from('x'.repeat(payloads[index].length)):payloads[index];}});
 return{refs,store,client,get reads(){return reads;},corrupt(value){corrupt=value;}};
}

test('staged scopes load demanded resources once and preserve aliases until the last resident pin releases',async()=>{
 const f=fixture(),first=createFrozenDataScope(f.client),second=createFrozenDataScope(f.client),signal=new AbortController().signal,key={};
 try{
  assert.equal(f.reads,0);
  await Promise.all([first.prepare([f.refs[0]],signal),first.prepare([f.refs[0]],signal),second.prepare([f.refs[0]],signal)]);
  assert.equal(f.reads,1,'same verified resource can serve overlapping preparations without loading unrelated data');
  assert.equal(f.store.stats.valueCells,1);
  let builds=0;const recipe=first.memo(key,()=>{builds++;return first.borrow(f.refs[0],data=>({positions:data.positions}));});
  assert.equal(first.memo(key,()=>assert.fail('factory rebuilt')),recipe);assert.equal(builds,1);
  assert.equal(second.borrow(f.refs[0],data=>data.positions),recipe.positions,'existing source alias semantics are retained');
  const unpin=first.retain();first.release();second.release();
  assert.equal(f.store.stats.valueCells,1);assert.deepEqual(first.memo(key,()=>assert.fail('lost resident recipe')).positions,[1,2,3]);
  await first.prepare([f.refs[1]],signal);
  assert.equal(first.stats.ownerReleased,true);assert.equal(first.stats.pins,1);assert.equal(f.reads,2,'the live pinned consumer may prepare its next asynchronous resource after producer release');
  assert.deepEqual(first.borrow(f.refs[1],data=>data.positions),[4,5,6]);
  unpin();unpin();first.release();assert.equal(f.store.stats.valueCells,0);assert.equal(f.store.stats.leases,0);
  assert.throws(()=>first.borrow(f.refs[0],data=>data));assert.throws(()=>first.memo(key,()=>recipe));
  await assert.rejects(first.prepare([f.refs[0]],signal),{name:'AbortError'});
  const reentry=createFrozenDataScope(f.client);try{await reentry.prepare([f.refs[1]],signal);assert.equal(f.reads,3);assert.deepEqual(reentry.borrow(f.refs[1],data=>data.positions),[4,5,6]);}finally{reentry.release();}
 }finally{first.release();second.release();f.store.destroy();}
});

function selectedFixture(readOverride){
 const tables=[{kind:'object-rows',text:'[{"city":"bremen","objectId":"painted","partId":"roof"},{"city":"bremen","objectId":"other","partId":"base"},{"city":"bremen","objectId":"painted","partId":"wall"}]'},{kind:'record-keys',text:'{"family-a":"vec3 paint(){return vec3(.25);}","family-b":"void shade(){gl_FragDepth=.5;}"}'}];
 const products=tables.map(({kind,text})=>{const raw=Buffer.from(text);return{whole:encodeCityTable(raw),...partitionCityTable(raw,{kind,targetBytes:2})};});
 const refs=products.map(({whole},i)=>({canonicalSHA256:whole.descriptor.sha256,file:'painted/test/selected-'+i+'.ts',occurrence:0,codec:'json'})),descriptors=[...new Map(products.flatMap(p=>[p.whole,...p.assets]).map(a=>[a.descriptor.sha256,a.descriptor])).values()],payloads=new Map(products.flatMap(p=>p.assets).map(a=>[a.descriptor.transport.path,a.packed])),reads=[];
 const store=createFrozenDataLeaseStore(descriptors),client=store.client({city:'bremen',profileSHA256:null,provider:'test',selection:{tables:refs.map(r=>r.canonicalSHA256),initializers:Object.fromEntries(refs.map(r=>[r.canonicalSHA256,{[r.file]:1}]))},resolve:sha=>sha,partition:(sha,file,occurrence)=>{const index=refs.findIndex(r=>r.canonicalSHA256===sha&&r.file===file&&r.occurrence===occurrence);return products[index]?.partition;},async read(path,signal,max){const value=payloads.get(path);assert(value,'Selected scope must not read its complete original table');assert.equal(max,value.length);reads.push(path);return readOverride?readOverride(path,signal,value):value;}});
 return{refs,products,reads,store,client};
}

test('a scope fixes declared demand, reuses subsets without widening, and distinguishes unpainted coverage from unavailable data',async()=>{
 const f=selectedFixture(),signal=new AbortController().signal;
 try{
  for(const requested of [[],['bremen|unpainted']]){
   const scope=createFrozenDataScope(f.client);
   try{
    assert.throws(()=>scope.assertSelection(f.refs[0],requested),/not prepared/);
    await scope.prepareSelection(f.refs[0],requested,signal);assert.deepEqual(scope.borrow(f.refs[0],rows=>rows),[]);assert.equal(f.reads.length,0);
    scope.assertSelection(f.refs[0],requested);assert.throws(()=>scope.assertSelection(f.refs[0],['bremen|undeclared']),/not declared/);
    await scope.prepare([f.refs[0]],signal);assert.equal(f.reads.length,0,'default preparation cannot silently upgrade the fixed empty selection');
    await assert.rejects(scope.prepareSelection(f.refs[0],['bremen|painted'],signal),/cannot widen/);
   }finally{scope.release();}
  }
  const scope=createFrozenDataScope(f.client);
  try{
   await scope.prepareSelection(f.refs[0],['bremen|painted','bremen|other'],signal);assert.equal(f.reads.length,2);assert.deepEqual(scope.borrow(f.refs[0],rows=>rows.map(row=>row.partId)),['roof','base','wall']);
   const memo=scope.memo({},()=>scope.borrow(f.refs[0],rows=>rows));await scope.prepareSelection(f.refs[0],['bremen|painted'],signal);await scope.prepare([f.refs[0]],signal);
   assert.equal(f.reads.length,2);assert.equal(scope.borrow(f.refs[0],rows=>rows),memo,'a subset reuses the original declared interpretation and aliases');
   scope.assertSelection(f.refs[0],['bremen|painted']);assert.throws(()=>scope.assertSelection(f.refs[0],['bremen|undeclared']),/not declared/);
  }finally{scope.release();}
  assert.equal(f.store.stats.valueCells,0);assert.equal(f.store.stats.leases,0);
 }finally{f.store.destroy();}
});

test('a pinned consumer prepares its selected catalog after producer release and final-pin retirement cancels a later phase',async()=>{
 let releaseRead,readStarted;const began=new Promise(resolve=>readStarted=resolve);let delayedPath,readSignal;
 const f=selectedFixture(async(path,signal,value)=>{if(path!==delayedPath)return value;readSignal=signal;readStarted();await new Promise(resolve=>releaseRead=resolve);return value;}),scope=createFrozenDataScope(f.client),signal=new AbortController().signal;
 try{
  await scope.prepareSelection(f.refs[0],['bremen|painted'],signal);const unpin=scope.retain();scope.release();
  await scope.prepareSelection(f.refs[1],['family-a'],signal);assert.equal(scope.stats.ownerReleased,true);assert.equal(scope.stats.pins,1);scope.assertSelection(f.refs[1],['family-a']);
  assert.equal(scope.borrow(f.refs[1],catalog=>catalog['family-a']),'vec3 paint(){return vec3(.25);}');assert.throws(()=>scope.assertSelection(f.refs[1],['family-b']),/not declared/);
  const pendingScope=createFrozenDataScope(f.client),dropPending=pendingScope.retain();pendingScope.release();delayedPath=f.products[1].assets[1].descriptor.transport.path;
  const pending=pendingScope.prepareSelection(f.refs[1],['family-b'],signal),rejected=assert.rejects(pending,{name:'AbortError'});await began;dropPending();await rejected;assert.equal(readSignal.aborted,true);assert.equal(pendingScope.stats.disposed,true);releaseRead();await new Promise(resolve=>setImmediate(resolve));
  assert.throws(()=>pendingScope.borrow(f.refs[1],value=>value));await assert.rejects(pendingScope.prepare([f.refs[0]],signal),{name:'AbortError'});
  assert.equal(scope.borrow(f.refs[0],rows=>rows.length),2,'retiring another consumer does not release this live generation');unpin();unpin();assert.equal(scope.stats.disposed,true);
  const fresh=createFrozenDataScope(f.client);try{delayedPath=undefined;await fresh.prepareSelection(f.refs[1],['family-b'],signal);assert.equal(fresh.borrow(f.refs[1],catalog=>catalog['family-b']),'void shade(){gl_FragDepth=.5;}');}finally{fresh.release();}
  assert.equal(f.store.stats.valueCells,0);assert.equal(f.store.stats.leases,0);
 }finally{scope.release();f.store.destroy();}
});

test('aborted preparation rejects promptly and releases a late acquisition instead of publishing it',async()=>{
 let resolveLease,started,releaseCount=0;
 const began=new Promise(resolve=>started=resolve);
 const client={acquire(){started();return new Promise(resolve=>resolveLease=resolve);},dispose(){assert.fail('scope must not dispose its provider client');}};
 const scope=createFrozenDataScope(client),controller=new AbortController(),ref={canonicalSHA256:'a'.repeat(64),file:'recipe.ts',occurrence:0,codec:'json'};
 const preparing=scope.prepare([ref],controller.signal);await began;controller.abort();
 await assert.rejects(preparing,{name:'AbortError'});scope.release();
 resolveLease({borrow(){assert.fail('late data cannot be published');},release(){releaseCount++;}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(releaseCount,1);assert.equal(scope.stats.resources,0);assert.equal(scope.stats.disposed,true);assert.throws(()=>scope.borrow(ref,data=>data));
});

test('a failed later stage drops the earlier recipe on rollback and permits a clean reentry',async()=>{
 const f=fixture(),scope=createFrozenDataScope(f.client),signal=new AbortController().signal;
 try{
  await scope.prepare([f.refs[0]],signal);scope.memo({},()=>scope.borrow(f.refs[0],data=>new Map([['source',data]])));
  f.corrupt(true);await assert.rejects(scope.prepare([f.refs[1]],signal),/hash mismatch/);
  scope.release();assert.equal(f.store.stats.valueCells,0);assert.equal(f.store.stats.leases,0);
  f.corrupt(false);const next=createFrozenDataScope(f.client);
  try{await next.prepare(f.refs,signal);assert.deepEqual(next.borrow(f.refs[0],data=>data.positions),[1,2,3]);assert.deepEqual(next.borrow(f.refs[1],data=>data.positions),[4,5,6]);}finally{next.release();}
  assert.equal(f.store.stats.valueCells,0);
 }finally{scope.release();f.store.destroy();}
});
