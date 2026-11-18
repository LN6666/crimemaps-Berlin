import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {harness,tick,webRoot} from './support/managers3-harness.mjs';
import {network,shard,until} from './support/managers3-fixtures.mjs';

async function scenario(city,{cancel=false,pressure=false}={}){
 const net=network(),a=shard('coalesce-a',{city,fixture:true}),b=shard('coalesce-b',{city}),c=shard('coalesce-c',{city});
 let pool,blocker,foreign;
 const h=harness('tier300',{}, {city,nativeSources({runtime,page,component}){
  pool=runtime.load(path.join(webRoot,'src/safety/shared-native-source.ts')).createSharedNativeSourcePool({read:net.read,resourceStore:page.store});
  return pool.client(component.city);
 }});
 const controller=new AbortController();
 try{
  h.fixture.manifest={...h.fixture.manifest,shards:[a.leaf]};
  const start=h.manager.requestMode('3d',controller.signal);
  await until(()=>net.pending(a.leaf.path).length,'initial source');net.deliver(a.leaf.path,a.bytes);await start;
  const initialPacks=h.counts.packs,initialIds=h.loaded.map(row=>row.objectId);
  h.fixture.manifest.shards=[a.leaf,b.leaf,c.leaf];
  h.view.bounds[0]+=.001;h.map.emit('movestart');h.map.emit('moveend');
  await until(()=>net.pending(b.leaf.path).length,'next viewport first new source');
  net.deliver(b.leaf.path,b.bytes);
  await until(()=>net.pending(c.leaf.path).length,'last source is delayed');
  await new Promise(resolve=>setTimeout(resolve,120));
  const intermediatePacks=h.counts.packs-initialPacks;
  if(city==='cologne'){
   assert.equal(intermediatePacks,0,'arriving partial sources do not rebuild the same Cologne view');
   assert.deepEqual(h.loaded.map(row=>row.objectId),initialIds,'old published geometry stays visible');
  }else assert(intermediatePacks>0,'other cities retain progressive publication');
  if(pressure){
   blocker=h.page.budget.reserve({category:'construction',bytes:h.page.budget.stats.availableBytes,precision:'estimate'});
   const claim=h.page.budget.tryReserve({category:'construction',bytes:64,precision:'estimate'});if(claim.ok)foreign=claim.reservation;
   await until(()=>pool.stats.cohortWaits>0,'pending source batch yields under pressure');
   assert.deepEqual(h.loaded.map(row=>row.objectId),initialIds,'pressure does not remove the previous published view');
   blocker.release();foreign?.release();
   for(let step=0;step<600&&h.counts.packs===initialPacks;step++){
    for(const source of [a,b,c])if(net.pending(source.leaf.path).length)net.deliver(source.leaf.path,source.bytes);
    await tick();
   }
   await h.settle();
   assert.equal(h.counts.packs-initialPacks,1,'reclaimed batch completes once after capacity returns');
   assert.equal(h.loaded.length,9,'all three sources survive the pressure retry');
  }else if(cancel){h.map.emit('movestart');await tick();assert.equal(h.counts.packs,initialPacks);}
  else{
   net.deliver(c.leaf.path,c.bytes);await h.settle();
   if(city==='cologne')assert.equal(h.counts.packs-initialPacks,1,'complete selected batch publishes once');
   for(const source of [a,b,c])assert(h.loaded.some(row=>row.sourceFeature.properties.name===JSON.parse(new TextDecoder().decode(source.bytes)).components[0].sourceFeature.properties.name));
  }
 }finally{controller.abort();h.manager.destroy();blocker?.release();foreign?.release();pool.destroy();for(let i=0;i<20;i++)await tick();}
}

test('Cologne coalesces partial source arrivals without dropping final geometry',()=>scenario('cologne'));
test('Berlin retains progressive source publication',()=>scenario('berlin'));
test('superseding a Cologne viewport does not publish its incomplete batch',()=>scenario('cologne',{cancel:true}));

test('Cologne coalesced publication recovers when pending sources yield to budget pressure',()=>scenario('cologne',{pressure:true}));
