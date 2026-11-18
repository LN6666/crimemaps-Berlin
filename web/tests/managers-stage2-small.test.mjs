import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {src,load,families,createChunkResourceStore,createResourceBudget} from './support/managers-stage2-ingress.mjs';
import {harness} from './support/managers-stage2-harness.mjs';
import {isBulk70PreimportRows,bulk70PreimportIdentityCount} from './support/f5bremen-bulk70-preimport.mjs';

// Stage-2 managers small items: the Bremen Frankfurt Bulk70 loader forwards the
// batch scope; the managers' fallback page store is configured with the device
// profile; the former partition copy re-exports the one implementation.

test('the Bulk70 loader prepares the original modules\' data in the batch scope and reads it through that scope',async()=>{
 const lazy=load(src('painted','bremen','safety','infill-frankfurt-low-office-bulk70-lazy.ts'));
 const {BULK70_IDENTITY_GROUPS}=load(src('painted','infill','safety','infill-frankfurt-low-office-bulk70-identities.ts'));
 const group=BULK70_IDENTITY_GROUPS[0],rows=group.identities.map(identity=>({city:'frankfurt',objectId:identity.objectId,partId:identity.partId,batches:[]}));
 const calls=[];let imports=0;
 const original={INFILL_BULK_BUDGET_CATALOGUE:lazy.INFILL_BULK_BUDGET_CATALOGUE,
  prepareInfillData:async(components,signal,scope)=>{signal.throwIfAborted();calls.push(['builder data',components,scope]);},
  prepareBudgetInfillData:async(components,signal,scope)=>{signal.throwIfAborted();calls.push(['budget data',components,scope]);},
  infillFrankfurtLowOfficeBulk70Reconstruction:(components,selected,scope)=>{calls.push(['reconstruct',selected,scope]);return{components,stats:{objects:0}};},
  infillBulkBudgetCredit:(components,scope)=>{calls.push(['credit',scope]);return{rows:0};}};
 const loader=lazy.createInfillFrankfurtLowOfficeBulk70Loader(async()=>{imports++;return original;});
 const first={id:'first batch scope'},second={id:'second batch scope'};
 await loader.prepare(rows,new AbortController().signal,undefined,first);
 loader.reconstruct(rows,[group.queueId],first);loader.budgetCredit(rows,first);
 assert.deepEqual(calls.map(([name])=>name),['builder data','budget data','reconstruct','credit']);
 assert.equal(calls[0][2],first);assert.equal(calls[1][2],first);assert.equal(calls[2][2],first);assert.equal(calls[3][1],first,'every call carries the batch scope');
 await loader.prepare(rows,new AbortController().signal,undefined,second);
 assert.equal(imports,1,'one import for every batch');assert.deepEqual(calls.slice(4).map(call=>[call[0],call[2]]),[['builder data',second],['budget data',second]],'a later batch prepares its own scope');
 const before=calls.length;await loader.prepare(rows,new AbortController().signal);assert.equal(calls.length,before,'without a scope the import alone is prepared');
 await loader.prepare([{city:'bremen',objectId:'x',partId:'y',batches:[]}],new AbortController().signal,undefined,first);assert.equal(calls.length,before,'rows the route does not need prepare nothing');
});

test('the Bremen manager prepares Bulk70 data in the batch scope it hands its renderer, before that renderer prepares',async()=>{
 const calls=[],scopes=[];
 const h=harness('bremen',{},{planners:{prepareInfillFrankfurtLowOfficeBulk70Reconstruction:async(components,signal,wait,scope)=>{calls.push({components:[...components],signal,wait,scope,prepares:h.counts.prepares,reads:h.counts.reads});}}});
 const prepareBatches=h.renderer.prepareBatches;
 h.renderer.prepareBatches=function(next,signal,wait,admission,scope,...rest){scopes.push(scope);return prepareBatches.call(this,next,signal,wait,admission,scope,...rest);};
 await h.start();
 const scoped=calls.filter(call=>call.scope!==undefined),unscoped=calls.filter(call=>call.scope===undefined);
 // visible() first pre-imports the builder with the city's complete catalogue
 // identities (the manager's actual bulk70PreimportRows), before any source read;
 // the leaf then still imports the modules without a scope with its own rows.
 const preimports=unscoped.filter(call=>isBulk70PreimportRows(call.components,'bremen')),leaf=unscoped.filter(call=>!isBulk70PreimportRows(call.components,'bremen'));
 assert.equal(preimports.length,1,'visible() pre-imports once with the catalogue identities');
 assert.equal(preimports[0].components.length,bulk70PreimportIdentityCount,'every catalogue identity');
 assert.equal(preimports[0].reads,0,'the pre-import precedes every source read');
 assert.equal(calls.indexOf(preimports[0]),0,'the pre-import is the first Bulk70 call');
 assert.equal(leaf.length,1,'the leaf still imports the modules without a scope');
 assert.deepEqual(leaf[0].components.map(row=>row.objectId),['osm/way/1'],'the unscoped leaf call carries the leaf components');
 assert.equal(scoped.length,1,'one scoped preparation for the one batch');
 assert.equal(scopes.length,1);assert.strictEqual(scoped[0].scope,scopes[0],'the same FrozenDataScope the renderer receives');
 assert.equal(scoped[0].prepares,0,'prepared before the renderer prepares the batch');
 assert.deepEqual(scoped[0].components.map(row=>row.objectId),['osm/way/1'],'with the batch components');
 h.manager.destroy();
});

test('every manager configures its fallback page store with the device profile',()=>{
 for(const family of families){
  const text=fs.readFileSync(src('painted',family,'safety','three-dimensional-map.ts'),'utf8');
  const calls=[...text.matchAll(/getPageChunkResourceStore\(([^)]*)\)/g)].map(match=>match[1]);
  assert.deepEqual(calls,["{profile:mobile?'mobile':'desktop'}"],family);
 }
});

for(const family of ['root500','infill','bremen'])test(`${family}: a mobile manager that installs first configures the page store as mobile`,()=>{
 const seen=[],store=createChunkResourceStore({budget:createResourceBudget({profile:'mobile'})});
 const h=harness(family,{mobile:true,resourceStore:undefined,nativeSources:undefined,frozenData:undefined},{planners:{getPageChunkResourceStore:options=>{seen.push(options);return store;}}});
 assert.deepEqual(seen,[{profile:'mobile'}],'the page budget is configured as mobile, so a later mobile caller is not refused');
 h.manager.destroy();
});

test('the former partition copy is a re-export of the one implementation',()=>{
 const text=fs.readFileSync(src('safety','three-dimensional-partitions.ts'),'utf8').replace(/^\/\/.*$/mg,'').trim();
 assert.equal(text,"export * from '../painted/root500/safety/three-dimensional-partitions';");
 const copy=load(src('safety','three-dimensional-partitions.ts')),owner=load(src('painted','root500','safety','three-dimensional-partitions.ts'));
 assert.equal(copy.installThreeDimensionalPartitions,owner.installThreeDimensionalPartitions);
});
