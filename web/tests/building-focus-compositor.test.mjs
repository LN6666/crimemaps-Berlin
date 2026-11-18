import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompositorHarness,page,mapStub,controller} from './support/compositor-main-harness.mjs';
const index='a'.repeat(64),hash='b'.repeat(64);
for(const city of ['frankfurt','bremen']){
 const focusRegistry={schema:'crimemaps-building-focus-registry-v2',schemaVersion:2,city,indices:[{canonicalIndexSHA256:index,root:{path:`/safety/buildings3d/focus/${city}/${index}/${hash}.json`,sha256:hash,bytes:100}}]};
 const load=await createCompositorHarness({focusRegistry});
 test(`actual ${city} compositor shares the bound resolver with every building provider`,async t=>{
  const {api,fixture}=await load(t),p=page(api);
  const compositor=api.installCompositor({map:mapStub(fixture),city,mobile:false,resourceStore:p.resourceStore,fetchBytes:p.read});
  try{
   await compositor.requestMode('3d',controller().signal);
   assert.deepEqual([...fixture.captured.keys()],['root500','delegated500','tier300','church','city',city==='frankfurt'?'infill':'bremen']);
   const bindings=[...fixture.captured.values()].map(row=>row.options.buildingFocus);
   assert(bindings.every(binding=>binding===bindings[0]&&binding.enabled));
   assert(bindings.every(binding=>binding.forIndex(index)===bindings[0].forIndex(index)));
   assert.throws(()=>bindings[0].forIndex('c'.repeat(64)),/Missing building focus/);
   assert.equal(fixture.assetReads.length,0,'installing descriptors does not load geometry');
  }finally{compositor.destroy();p.resourceStore.destroy();}
 });
}
