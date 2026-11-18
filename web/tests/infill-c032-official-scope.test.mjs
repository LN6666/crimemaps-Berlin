import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';
const base='painted/infill/safety/';
function fixture(){
 const prepared=new Set(),memo=new Map(),reads=[];
 const scope={stats:{disposed:false},memo(key,fn){if(this.stats.disposed)throw Error('disposed');if(!memo.has(key))memo.set(key,fn());return memo.get(key);}};
 const batch={positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.3,.4,.5],frames:Array(15).fill(0),paint:Array(12).fill(0)};
 const main={city:'essen',objectId:'osm/relation/2181079',partId:'accepted',batches:[batch]};
 const provider={async prepareInfillData(c,s,actual){s.throwIfAborted();assert.equal(actual,scope);prepared.add('admissions');},progressiveAdmission(c,actual){assert.equal(actual,scope,'admission receives the owning scope');assert(prepared.has('admissions'),'admissions prepared before use');reads.push(c);return c.reject?undefined:{family:26101,batchColors:{}};}};
 const data={async prepareInfillData(c,s,actual){s.throwIfAborted();assert.equal(actual,scope);prepared.add('official');},getC032_OFFICIAL_BATCH(actual){assert.equal(actual,scope);assert(prepared.has('official'));return batch;}};
 const api=createSourceModules({overrides:{[base+'c032-original-provider']:provider,[base+'c032-official-data']:data,[base+'bremen-infill-owner-metadata']:{infillC032OfficialRuntimeMetadata:{infillC032OfficialIdentity:c=>c.city==='essen'&&c.objectId===main.objectId&&c.partId==='accepted'}}},allow:id=>[base+'infill-c032-official-runtime',base+'infill-owner-preparation',base+'infill-data-contract'].includes(id)}).load(base+'infill-c032-official-runtime');
 return{api,scope,main,prepared,reads,batch};
}
test('official shell prepares admissions and reconstructs using its owning scope',async()=>{
 const f=fixture();await f.api.prepareInfillData([f.main],new AbortController().signal,f.scope);
 const out=f.api.infillC032OfficialReconstruction([f.main],f.scope);
 assert.equal(out.stats.objects,1);assert.equal(out.stats.vertices,3);assert.equal(out.components[0].displayEstimates.infillC032Official.patchSHA,f.api.INFILL_C032_OFFICIAL_SHA);
 assert.notEqual(out.components[0].batches[0].positions,f.batch.positions);
});
test('rejected original admission preserves source geometry',async()=>{
 const f=fixture(),rows=[{...f.main,reject:true}];await f.api.prepareInfillData(rows,new AbortController().signal,f.scope);
 const out=f.api.infillC032OfficialReconstruction(rows,f.scope);assert.equal(out.components,rows);assert.equal(out.stats.objects,0);
});
test('noncandidate same object stays cold without touching admissions',async()=>{
 const f=fixture(),rows=[{...f.main,partId:'not-accepted'}];await f.api.prepareInfillData(rows,new AbortController().signal,f.scope);
 const out=f.api.infillC032OfficialReconstruction(rows);assert.equal(out.components,rows);assert.equal(out.stats.objects,0);assert.equal(f.prepared.size,0);assert.equal(f.reads.length,0);
});
test('candidate still requires a live scope and aborted preparation fails',async()=>{
 const f=fixture();assert.throws(()=>f.api.infillC032OfficialReconstruction([f.main]),/prepared FrozenDataScope/);
 const controller=new AbortController();controller.abort();await assert.rejects(f.api.prepareInfillData([f.main],controller.signal,f.scope));
 f.scope.stats.disposed=true;assert.throws(()=>f.api.infillC032OfficialReconstruction([f.main],f.scope),/disposed/);
});
