import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadProductionModule,preparation,driver,turns,page,recipe,pending,KiB} from './support/core3-runtime.mjs';

// The helper and every store/private worker/public owner use the same real
// module graph, including its store -> preparation -> store cycle.
const runtime=process.env.CORE3_SAFETY_DIR?pathToFileURL(resolve(process.env.CORE3_SAFETY_DIR,'render-runtime')+'/'):new URL('../src/safety/render-runtime/',import.meta.url);
const {withRenderDiagnosticSnapshot:scope,readRenderDiagnosticSnapshot:read}=loadProductionModule(new URL('diagnostic-snapshot.ts',runtime));
const {createProgramPreparationOwner}=preparation;
const cost=bytes=>({category:'decoded',bytes,precision:'exact'});
function pendingState(owner,count){
 assert.equal(owner.stats.pending,count);
 assert.equal(owner.hasPending,count>0);
}

test('explicit synchronous scopes reuse projections, nest safely and release after return or throw',()=>{
 let reads=0,undefinedReads=0;
 const project=()=>({read:++reads}),empty=()=>{undefinedReads++;return undefined;};
 assert.notStrictEqual(read(project),read(project),'outside a scope each read projects again');
 const first=scope(()=>{
  const value=read(project);
  assert.strictEqual(scope(()=>read(project)),value);
  const failure=new Error('nested diagnostic failure');
  assert.throws(()=>scope(()=>{assert.strictEqual(read(project),value);throw failure;}),error=>error===failure);
  assert.strictEqual(read(project),value,'a nested throw restores the outer snapshot');
  assert.equal(read(empty),undefined);assert.equal(read(empty),undefined);assert.equal(undefinedReads,1);
  return value;
 });
 assert.equal(first.read,3);assert.equal(read(project).read,4);
 const failure=new Error('outer diagnostic failure');let failed;
 assert.throws(()=>scope(()=>{failed=read(project);throw failure;}),error=>error===failure);
 assert.equal(failed.read,5);assert.equal(read(project).read,6);
 assert.equal(scope(()=>read(project)).read,7,'a later scope starts a fresh snapshot');
});

test('real stores reuse complete projections without mixing owners or retaining a failed read scope',async()=>{
 const a=page(),b=page();let lease;
 try{
  lease=a.store.acquire({contentKey:'snapshot/source',role:'source',estimate:cost(16),produce:()=>new Uint8Array(16)});
  await lease.ready;
  const first=scope(()=>{
   const value=a.store.stats,other=b.store.stats;
   assert.strictEqual(a.store.stats,value);assert.strictEqual(b.store.stats,other);
   assert.notStrictEqual(value,other);assert.equal(value.resources,1);assert.equal(other.resources,0);
   assert.equal(value.budget.bytes,16);return value;
  });
  assert.notStrictEqual(a.store.stats,first);
  const failure=new Error('proof read failed');let failed;
  assert.throws(()=>scope(()=>{failed=a.store.stats;assert.strictEqual(a.store.stats,failed);throw failure;}),error=>error===failure);
  lease.release();
  const next=scope(()=>a.store.stats);
  assert.notStrictEqual(next,failed);assert.equal(next.resources,0);assert.equal(next.budget.bytes,0);
  assert.equal(failed.resources,1,'the completed projection retains its original values');
 }finally{lease?.release();a.store.destroy();b.store.destroy();}
});

test('shared real private workers project once across distinct public owner diagnostics',()=>{
 const t=turns(),f=driver(),p=page(f),a=createProgramPreparationOwner('snapshot a',()=>{}),b=createProgramPreparationOwner('snapshot b',()=>{}),r=recipe('shared-snapshot');
 try{
  pending(()=>a.compile(f.gl,r));pending(()=>b.compile(f.gl,r));pendingState(a,1);pendingState(b,1);
  let workerTiming;
  scope(()=>{
   const first=a.stats,second=b.stats;
   assert.strictEqual(a.stats,first);assert.strictEqual(b.stats,second);assert.notStrictEqual(first,second);
   const rowA=first.pendingResources[0],rowB=second.pendingResources[0];
   assert.equal(rowA.source,'snapshot a');assert.equal(rowB.source,'snapshot b');
   assert.equal(rowA.sharedExecution,rowB.sharedExecution);
   assert.ok(rowA.timing);assert.strictEqual(rowA.timing,rowB.timing,'the same real private worker supplies both projections');
   workerTiming=rowA.timing;
  });
  assert.notStrictEqual(a.stats.pendingResources[0].timing,workerTiming);
  t.all();pendingState(a,0);pendingState(b,0);assert.equal(a.stats.ready,1);assert.equal(b.stats.ready,1);
  const linked=a.compile(f.gl,r);assert.strictEqual(b.compile(f.gl,r),linked);
  assert.equal(f.programs().length,1,'snapshot reads do not change shared preparation or ownership');
 }finally{a.dispose();b.dispose();t.all();p.store.destroy();t.restore();}
});

test('private preparation and work keep hasPending equivalent through completion, consumption and cancellation',()=>{
 const t=turns(),f=driver(),p=page(f),owner=createProgramPreparationOwner('snapshot private',()=>{}),r=recipe('private-snapshot',{builds:0},{shared:false});
 try{
  pendingState(owner,0);pending(()=>owner.compile(f.gl,r));pendingState(owner,1);
  const before=scope(()=>owner.stats);assert.equal(before.pending,1);
  t.all();pendingState(owner,0);
  const ready=scope(()=>owner.stats);assert.notStrictEqual(ready,before);assert.equal(ready.ready,1);assert.equal(before.pending,1);
  const program=owner.compile(f.gl,r);assert.ok(program.program);pendingState(owner,0);assert.equal(owner.stats.ready,0);
  let uploads=0;
  assert.equal(owner.work(f.gl,{resource:'cancelled-upload',revision:1,current:()=>true,work(){uploads++;}}),false);
  pendingState(owner,1);owner.cancel();pendingState(owner,0);t.all();assert.equal(uploads,0);
 }finally{owner.dispose();t.all();p.store.destroy();t.restore();}
});

test('budget refusal is pending without a queued job and becomes fresh after the real availability wake',()=>{
 const t=turns(),f=driver(),p=page(f,{limitBytes:512*KiB,recentLimitBytes:128*KiB}),owner=createProgramPreparationOwner('snapshot budget',()=>{}),counter={builds:0},r=recipe('budget-snapshot',counter);
 const blocker=p.budget.reserve(cost(512*KiB));
 try{
  assert.throws(()=>owner.compile(f.gl,r),error=>preparation.isProgramPreparationBudgetWait(error)&&error.waiting);
  pendingState(owner,1);assert.equal(owner.waitingForBudget,true);assert.equal(counter.builds,0);assert.equal(t.queue.length,0);
  const waiting=scope(()=>owner.stats);assert.equal(waiting.budget.waitingForAvailability,true);assert.equal(waiting.pendingResources[0].phase,'budget-admission');
  blocker.release();pendingState(owner,0);assert.equal(owner.waitingForBudget,false);
  const awake=scope(()=>owner.stats);assert.notStrictEqual(awake,waiting);assert.equal(awake.budget.waitingForAvailability,false);assert.equal(waiting.pending,1);
  pending(()=>owner.compile(f.gl,r));pendingState(owner,1);t.all();pendingState(owner,0);
  assert.ok(owner.compile(f.gl,r).program);assert.equal(counter.builds,1);
 }finally{blocker.release();owner.dispose();t.all();p.store.destroy();t.restore();}
});
