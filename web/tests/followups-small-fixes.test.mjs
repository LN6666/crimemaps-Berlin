import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {nullCityDataProfilePlugin} from './city-profile-test-plugin.mjs';
import {shard,cohortManager,until,outcome,tick} from './support/managers3-fixtures.mjs';

// followups (DECISIONS 2026-11-02 08:56), the second-round source fixes:
// - Bremen fitOwnerDisplayBudget takes the batch FrozenDataScope as an optional
//   fourth argument and hands it to infillBulkBudgetCredit (S3 renderers-a CDR[1]);
// - the City lazy adapter forwards detailDemandHeld and the City manager exposes
//   it (S3 managers-3 CDR[0]);
// - the City and delegated500 unfit preflights add programAllowanceBytes(value),
//   the allowance the program ticket is admitted with, not the bare field
//   (S3 shared-core-3 CDR[2]).
const web=fileURLToPath(new URL('../',import.meta.url)),safety=path.join(web,'src/safety');
const slot='__followupsFixture'+Math.random().toString(16).slice(2);
globalThis[slot]={credit:[]};
const bundle=async(contents,resolveDir,plugins=[])=>{
 const text=(await build({stdin:{contents,resolveDir,sourcefile:'followups-entry.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,logLevel:'error',plugins:[nullCityDataProfilePlugin,...plugins]})).outputFiles[0].text;
 return import('data:text/javascript;base64,'+Buffer.from(text+'\n// followups '+Math.random()).toString('base64'));
};
const stub=(name,filter,contents)=>({name,setup(b){b.onResolve({filter},()=>({path:name,namespace:name}));b.onLoad({filter:/.*/,namespace:name},()=>({contents,loader:'js'}));}});

// --- (4) Bremen owner display budget scope --------------------------------
const budgetModule=await bundle("export {fitOwnerDisplayBudget} from './owner-display-budget';",path.join(web,'src/painted/bremen/safety'),[
 stub('followups-bulk-credit',/^\.\/infill-bulk-budget-credit$/,`export function infillBulkBudgetCredit(components,scope){globalThis[${JSON.stringify(slot)}].credit.push({components,scope,arity:arguments.length});return{vertices:0,indices:0,rows:0,catalogueVertices:0,catalogueIndices:0,patchSHA256:'stub'};}`),
]);
const component=(objectId,triangles)=>({city:'bremen',objectId,partId:objectId+'/part',batches:[{positions:new Float32Array(9*triangles),indices:Uint32Array.from({length:3*triangles},(_,i)=>i)}]});
const budgetOptions=components=>{const v=components.reduce((n,c)=>n+c.batches[0].positions.length/3,0),i=components.reduce((n,c)=>n+c.batches[0].indices.length,0);return{vertices:v,indices:i,originalSourceVertices:v,originalSourceIndices:i,ownerDeltaVertices:0,ownerDeltaIndices:0,protected:()=>false,batchIncluded:()=>true};};

test('Bremen fitOwnerDisplayBudget hands its optional batch scope to infillBulkBudgetCredit; without one the credit call is unchanged',()=>{
 const {credit}=globalThis[slot];credit.length=0;
 const rows=[component('osm/way/fu-1',2),component('osm/way/fu-2',3)],scope={label:'batch scope'};
 const plain=budgetModule.fitOwnerDisplayBudget(rows,200000,budgetOptions(rows));
 const scoped=budgetModule.fitOwnerDisplayBudget(rows,200000,budgetOptions(rows),scope);
 assert.equal(credit.length,2);
 assert.equal(credit[0].scope,undefined,'a three-argument caller passes no scope');assert.equal(credit[0].components,rows);
 assert.equal(credit[1].scope,scope,'the batch scope reaches the credit as its second argument');assert.equal(credit[1].components,rows);
 assert.deepEqual(scoped,plain,'non-Frankfurt rows: the fit result is identical with and without the scope');
 assert.equal(scoped.components,rows);assert.equal(scoped.diagnostic,undefined);
});

// --- (5) City lazy adapter and manager detailDemandHeld ---------------------
const lazyModule=await bundle("export {installThreeDimensionalMap} from './three-dimensional-lazy';",path.join(web,'src/painted/city/safety'),[
 stub('followups-city-map',/^\.\/three-dimensional-map$/,"export const installThreeDimensionalMap=()=>{throw Error('the test supplies loadModule');};"),
]);

test('City lazy adapter: detailDemandHeld is false before the manager loads, then forwards the manager value (strictly true)',async t=>{
 // The adapter reads its appearance reservation from the page location (none for Munich).
 const hadLocation='location' in globalThis;if(!hadLocation){globalThis.location={search:'',hostname:'example.invalid'};t.after(()=>{delete globalThis.location;});}
 let held,pending=false;const map={stop(){},easeTo(){},getBounds(){return{toArray:()=>[[0,0],[1,1]]};},triggerRepaint(){}};
 const actual={requestMode:async mode=>({mode,status:'ready'}),get detailDemandPending(){return pending;},get detailDemandHeld(){return held;},setOpacityContext(){},setPageHidden(){},setReducedMotion(){},destroy(){},suspend(){},resume(){}};
 const adapter=lazyModule.installThreeDimensionalMap({map,city:'munich',mobile:false},async()=>({installThreeDimensionalMap:()=>actual}));
 assert.equal(adapter.detailDemandHeld,false,'no manager yet');assert.equal(adapter.detailDemandPending,false);
 await adapter.requestMode('3d',new AbortController().signal);
 pending=true;held=true;assert.equal(adapter.detailDemandHeld,true);assert.equal(adapter.detailDemandPending,true);
 held=false;assert.equal(adapter.detailDemandHeld,false);
 held=undefined;assert.equal(adapter.detailDemandHeld,false,'an absent value reads false');
 adapter.destroy();
});

test('City manager: detailDemandHeld is true only while every pending load is parked for capacity, false once a read is back on the network',async()=>{
 const a=shard('a',{city:'berlin',fixture:true}),b=shard('b',{city:'berlin'});
 const m=cohortManager('city',[a,b]),{budget,net,manager,pool}=m;
 assert.equal(manager.detailDemandHeld,false,'idle');
 const blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes-64*1024,precision:'estimate',label:'followups page holder'});
 const run=manager.requestMode('3d',new AbortController().signal);void run.catch(()=>{});
 try{
  await until(()=>pool.stats.parkedSources>=1&&manager.detailDemandPending,'the city read parks for capacity');
  for(let i=0;i<40;i++)await tick();
  assert.equal(manager.detailDemandPending,true);assert.equal(manager.detailDemandHeld,true,'parked on a page-ledger wake');
  // Review F6: while it reads true the compositor requests no frames of its
  // own; nothing else repaints the parked map, and the wake repaints it.
  const parkedRepaints=m.counts.repaints;
  for(let i=0;i<40;i++)await tick();
  assert.equal(m.counts.repaints,parkedRepaints,'a parked map is quiet: no frame loop, no timer');
  assert.equal(manager.detailDemandHeld,true);
  blocker.release();
  await until(()=>net.pending().length>=1,'a read goes to the network once room returns');
  assert.equal(manager.detailDemandHeld,false,'network work is not a parked wait');
  assert(m.counts.repaints>parkedRepaints,'the end of the reported park repaints the map at least once (detailDemand.clear; removing that repaint fails this check)');
  for(let round=0;round<40&&await outcome(run,2)==='pending';round++){for(const leaf of [a,b])if(net.pending(leaf.leaf.path).length)net.deliver(leaf.leaf.path,leaf.bytes);for(let i=0;i<10;i++)await tick();}
  assert.equal((await run).mode,'3d');
  assert.equal(manager.detailDemandPending,false);assert.equal(manager.detailDemandHeld,false);
 }finally{manager.destroy();if(blocker.active)blocker.release();}
});

// --- (6) unfit preflights add the admitted program allowance ----------------
const programs=await bundle([
 "export {cityProgramBudgetItemBytes,checkedCityProgramBudget,isCityShaderBudgetUnfit} from '../painted/city/safety/city-shader-budget';",
 "export {assertDelegatedProgramBudgetFits} from '../painted/delegated500/safety/delegated-shader-budget';",
 "export {programAllowanceBytes,LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES} from './render-runtime/program-preparation';",
 "export {createResourceBudget} from './render-runtime/resource-budget';",
].join('\n'),safety,[{name:'followups-city-stubs',setup(b){b.onResolve({filter:/^\.\/c\d{3}-(?:fixture|display)$/},args=>['c311-display','c312-display','c313-display','c318-display'].includes(args.path.slice(2))?undefined:{path:args.path,namespace:'followups-city-stub'});b.onLoad({filter:/.*/,namespace:'followups-city-stub'},()=>({contents:'module.exports={};',loader:'js'}));}}]);

test('City and delegated500 unfit preflights add programAllowanceBytes(value): the policy allowance when the field is absent',()=>{
 const P=programs.LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES,source=4096,cost={category:'construction',bytes:1000,precision:'estimate',identity:{}};
 assert.equal(programs.programAllowanceBytes({}),P);
 assert.equal(programs.cityProgramBudgetItemBytes({sourceBytesUpperBound:source,workspaceCosts:[cost]}),source+P+1000,'absent field: the policy allowance the ticket is admitted with');
 assert.equal(programs.cityProgramBudgetItemBytes({sourceBytesUpperBound:source,submittedAllowanceBytes:0,workspaceCosts:[cost]}),source+1000,'an explicit allowance is used as given');
 // A ledger that holds the source and workspace but not the policy allowance beside them.
 const ledger=programs.createResourceBudget({limitBytes:source+1000+P-1,recentLimitBytes:0});
 assert.throws(()=>programs.checkedCityProgramBudget(ledger,{sourceBytesUpperBound:source,workspaceCosts:[cost]},'followups city'),error=>programs.isCityShaderBudgetUnfit(error)&&error.requiredBytes===source+P+1000&&error.capacityBytes===source+1000+P-1);
 const fits={sourceBytesUpperBound:source,submittedAllowanceBytes:0,workspaceCosts:[cost]};
 assert.equal(programs.checkedCityProgramBudget(ledger,fits,'followups city'),fits,'reported only when the admitted item cannot fit');
 assert.throws(()=>programs.assertDelegatedProgramBudgetFits(ledger,{sourceBytesUpperBound:source,workspaceCosts:[cost]},'followups delegated'),error=>error.name==='DelegatedShaderBudgetUnfitError');
 assert.doesNotThrow(()=>programs.assertDelegatedProgramBudgetFits(ledger,fits,'followups delegated'));
 assert.throws(()=>programs.assertDelegatedProgramBudgetFits(ledger,fits,'followups delegated',P),error=>error.name==='DelegatedShaderBudgetUnfitError','held bytes still count');
});
