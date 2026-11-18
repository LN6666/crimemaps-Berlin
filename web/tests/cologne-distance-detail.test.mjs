import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';

const web=fileURLToPath(new URL('../',import.meta.url)),runtime=createRuntimeLoader(web);
const root=path.join(web,'src/painted/delegated500/safety');
const {KO_RAIL_COHORT70:E}=runtime.load(path.join(root,'ko-rail-connection-budget70.ts'));
const {prepareKORailConnectionResidency70:prepare}=runtime.load(path.join(root,'ko-rail-connection-residency70.ts'));
const catalog=E.leaves.map(row=>({...row.descriptor}));
const context={city:E.city,sourcePBF:E.sourcePBF,boundarySHA:E.boundarySHA,sourceSnapshot:E.sourceSnapshot,
 bounds:[...E.triggerBBox],camera:{pitch:30,verticalFieldOfView:36.87,aspectRatio:1.9},lod:1,
 maxVisible:128,maxBytes:8*1024**2,vertexCap:200000,retainedCap:64*1024**2,
 maxCache:24,maxCacheBytes:12*1024**2,cacheRetainedCap:64*1024**2};

test('Cologne distant railway retains native fallback and existing bridge members without pulling the complete detail cohort',()=>{
 const detailed=new Set(E.members.filter(row=>row.connectionOwner).map(row=>row.sha256));
 const native=E.members.find(row=>!row.owner&&!row.sourceOnly);
 assert(native,'the existing native fallback remains declared');
 const fallback=catalog.find(row=>row.sha256===native.sha256);
 assert(fallback,'fallback has an authoritative source leaf');
 const detail=catalog.find(row=>detailed.has(row.sha256));
 const existing=catalog.find(row=>E.members.some(member=>member.owner&&!member.connectionOwner&&member.sha256===row.sha256));
 const far=prepare([fallback,detail,existing],catalog,{...context,detailEnabled:false});
 assert.equal(far.deferred,true);assert.equal(far.enabled,false);
 assert.deepEqual(far.candidates,[fallback,existing]);
 assert.deepEqual(far.requiredLeafIds,[]);assert.equal(far.budgets.maxBytes,context.maxBytes);
 const owner=E.members.find(row=>row.connectionOwner);
 assert.deepEqual(far.viewportRows([native,owner],[native,owner]),[native]);
 const close=prepare([fallback,detail,existing],catalog,{...context,detailEnabled:true});
 assert.equal(close.enabled,true);assert.equal(close.requiredLeafIds.length,E.leaves.length);
 assert(close.candidates.some(row=>row.sha256===detail.sha256));
 assert(close.budgets.maxBytes>far.budgets.maxBytes);
});

test('distance policy cannot alter another city or mismatched source lineage',()=>{
 const base=catalog.slice(0,3);
 for(const change of [{city:'berlin'},{sourcePBF:'different-source'}]){
  const result=prepare(base,catalog,{...context,...change,detailEnabled:false});
  assert.equal(result.deferred,false);assert.deepEqual(result.candidates,base);
 }
});
