import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {residencyFixture,component,evaluate} from './fixtures/painted-residency-harness.mjs';
import {constructionHarness,component as bremenComponent} from './fixtures/bremen-renderer-construction-harness.mjs';
import {resourceContentKeys} from './support/resource-content-key.mjs';

const key=row=>row.objectId+'|'+row.partId;
const signal=()=>new AbortController().signal;
for(const provider of ['root500','infill','bremen'])test(provider+' keeps one complete physical group across A -> overlapping B -> A and publishes only admitted members',async()=>{
 const bremen=provider==='bremen',h=bremen?constructionHarness():residencyFixture(provider);
 await h.environment(async()=>{
  const rows=[1,2,3].map(id=>bremen?bremenComponent(id):component(id)),r=h.create(),views=[[rows[0],rows[1]],[rows[1],rows[2]],[rows[0],rows[1]]];
  const input=bremen?h.chunkInput(rows):{store:h.chunkStore,groups:[{contentKey:'physical-source-complete-v1',components:rows,parents:[],frame:h.chunkInputs.rendererChunkFrame(rows[0].origin,'physical-source-frame'),cohortKeys:[],materialAuthority:'physical-material',recipeAuthority:'physical-recipe',selectedLOD:'canonical'}],cohorts:[]};
  const store=bremen?h.page.store:h.chunkStore;
  let originalGeometry,originalIndices,originalBuffers,originalCompiles,originalProductions;
  for(const [index,view]of views.entries()){
   const batch=bremen?await r.prepareBatches(view,signal(),undefined,undefined,undefined,rows,input):await h.prepareBatch(r,view,signal(),rows,input);
   assert.deepEqual(batch.input,view,'request receipt retains the exact visible input');
   assert.deepEqual((batch.source??batch.sourceComponents).map(key),rows.map(key),'existing owner/data preparation receives the whole admitted physical group');
   assert.deepEqual(batch.visibleDisplayKeys,view.map(key));
   h.commit(r,batch,index+1);batch.release?.();batch.scope.release();r.setEnabled(true);r.setReducedMotion(true);
   if(index===0)r.layer.onAdd({},h.gl);
   if(bremen)await h.flush(r);else await h.settle(r);
   assert.equal(r.getRevision().generation,index+1);
   assert.equal(r.stats.components,2);assert.equal(r.stats.triangles,2,'scene spans use only two visible components');assert.equal(r.stats.sourceComponents,2);
   for(const row of rows){assert.equal(!!r.getComponent(row),view.includes(row));assert.equal(!!r.getSourceComponent(row),view.includes(row),'offscreen physical rows are absent from the canonical public source view');}
   if(bremen)h.render(r);else h.renderVisible(r);
   const capture=r.renderPlanarReflection({});assert.equal(capture.status,'active');
   try{assert.deepEqual(capture.chunks.flatMap(chunk=>chunk.components).map(key),view.map(key));assert.equal(capture.chunks.flatMap(chunk=>chunk.runs).reduce((sum,run)=>sum+run.indexCount,0),6);}finally{capture.release();}
   if(index===0){
    originalGeometry=h.uploads.find(row=>row.data instanceof Float32Array&&row.data.length===81)?.data;
    originalIndices=h.uploads.find(row=>row.data instanceof Uint32Array&&row.data.length===9)?.data;
    assert(originalGeometry,'all three components were packed before the first view upload');assert(originalIndices);
    originalBuffers=[...h.buffers.keys()];originalCompiles=h.compileRequests.length;originalProductions=store.stats.productions;r.setSelection(rows[0]);
   }else{
    assert.strictEqual(h.uploads.findLast(row=>row.data instanceof Float32Array&&row.data.length===81)?.data,originalGeometry);
    assert.strictEqual(h.uploads.findLast(row=>row.data instanceof Uint32Array&&row.data.length===9)?.data,originalIndices);
    assert.deepEqual([...h.buffers.keys()],originalBuffers,'viewport membership changes preserve physical GPU identity');
    assert.equal(h.compileRequests.length,originalCompiles,'the same exact program remains resident');
    assert.equal(store.stats.productions,originalProductions,'membership changes create no new physical production');
    assert.equal(r.selected.objectId,rows[0].objectId,'offscreen selection keeps its identity without making its row visible');
   }
  }
  r.setEnabled(false);r.suspendSelection();r.setBatches([],4);assert.equal(r.stats.components,0);assert.equal(r.stats.sourceComponents,0);r.destroy();
  if(bremen)h.drainPage();else{store.collectRetired();store.destroy();}
 });
});

const helpers=evaluate(fs.readFileSync(new URL('../src/painted/root500/safety/chunk-mesh-packing.ts',import.meta.url),'utf8'),id=>id==='../../../safety/resource-content-key'?resourceContentKeys:{});
test('complete physical source preparation and verified display ancestry preserve request visibility and order',()=>{
 const [a,b,c]=[1,2,3].map(id=>component(id)),derived={...c,objectId:'derived',partId:'surface'},explicit={...a,objectId:'explicit',partId:'surface'};
 const physical=helpers.completeChunkSourceRows({groups:[{components:[a,b,c]}]},[c,a]);assert.deepEqual(physical,[a,b,c]);assert.throws(()=>helpers.completeChunkSourceRows(undefined,[a,a]),/Duplicate component identity/);
 const keys=helpers.visibleChunkDisplayKeys([c,a],physical,[a,b,derived,explicit],[{objectId:'derived',partId:'surface',sourcePartId:c.partId,sourceCarrier:{objectId:c.objectId}}],row=>row===explicit);
 assert.deepEqual(keys,[key(derived),key(a),key(explicit)]);assert.deepEqual(helpers.orderVisibleChunkRows([a,b,derived,explicit],keys),[derived,a,explicit]);
});
test('mask binding owners reuse only equal preferred activity and release each publication independently',()=>{
 let creates=0,destroys=0;const a={objectId:'a',partId:'surface'},b={objectId:'b',partId:'surface'},seen=[];
 const recipe={wordMasks:[{preferred:a}],createBinding(visible){creates++;seen.push(visible);return{destroy(){destroys++;},get residentRevision(){return 'live';}};}};
 const first=helpers.retainChunkMaskBinding(recipe,[a],'owner'),same=helpers.retainChunkMaskBinding(recipe,[a,b],'owner'),changed=helpers.retainChunkMaskBinding(recipe,[b],'owner');
 assert.equal(creates,2);assert.deepEqual(seen,[[a],[b]]);assert.equal(first.residentRevision,same.residentRevision);
 first.destroy();first.destroy();assert.equal(destroys,0,'the adjacent publication still owns the shared binding');same.destroy();assert.equal(destroys,1);changed.destroy();assert.equal(destroys,2);
 const fresh=helpers.retainChunkMaskBinding(recipe,[a],'owner');assert.equal(creates,3,'retired binding owners are removed rather than cached');fresh.destroy();assert.equal(destroys,3);
});
