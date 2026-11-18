// shared-core-3 (1): every budgeted linked executable is charged at the policy
// estimate (DECISIONS 2026-11-02 03:25), moved, not added, into the recent
// role, and refunded on every release path.
import test from 'node:test';
import assert from 'node:assert/strict';
import {preparation,driver,turns,page,linked,pending,recipe,programCategory,MiB,KiB} from './support/core3-runtime.mjs';

const {createProgramPreparationOwner,releaseRecentPrograms,getRecentProgramStats,LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES:P,RECENT_PROGRAM_ALLOWANCE_BYTES,programAllowanceBytes,isProgramBudgetUnfitFailure,isProgramPreparationBudgetWait}=preparation;

test('the policy estimate is 256 KiB, the same single-entry estimate as the recent set, and the helper applies it only without an explicit allowance',()=>{
 assert.equal(P,256*KiB);assert.equal(RECENT_PROGRAM_ALLOWANCE_BYTES,P);
 assert.equal(programAllowanceBytes({sourceBytesUpperBound:10}),P);
 assert.equal(programAllowanceBytes({sourceBytesUpperBound:10,submittedAllowanceBytes:128}),128);
});

test('a budgeted program without its own allowance is admitted with the estimate, charged as linked once, retired at its fence and fully refunded',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('core3',()=>{});
 try{
  const r=recipe('base');
  pending(()=>owner.compile(f.gl,r));
  // Admitted before any source build or driver call: estimate in 'program-submitted'.
  assert.equal(budget.stats.categories['program-submitted']?.bytes,P,'admission reserves the estimate before the compile');
  assert.equal(budget.stats.categories['program-submitted']?.estimatedBytes,P,'precision estimate');
  t.all();const program=owner.compile(f.gl,r);assert(program.program);
  assert.equal(programCategory(budget),P,'the linked executable is charged once at the estimate');
  assert.equal(budget.stats.categories.program.estimatedBytes,P);
  assert.equal(budget.stats.categories['program-submitted'],undefined,'the submitted charge moved, it was not added');
  assert.equal(budget.stats.categories['program-source'],undefined,'source text was refunded at submission');
  const s=owner.stats.budget;
  assert.equal(s.budgetedRecipes,1);assert.equal(s.driverAllowanceRecipes,1);assert.equal(s.policyAllowanceRecipes,1);assert.equal(s.unmeasuredDriverRecipes,0);
  assert.equal(s.heldDriverAllowancePrograms,1);assert.equal(s.heldDriverAllowanceBytes,P);assert.equal(s.policyAllowanceBytes,P);
  owner.releaseProgram(f.gl,program);
  assert.equal(program.deleted,true,'the executable is deleted at release, not deferred');
  assert.equal(budget.stats.retiringBytes,P,'its estimate stays charged as retiring until the deletion fence');
  assert.equal(budget.stats.categories['program-retiring']?.bytes,P);
  store.collectRetired();
  assert.equal(budget.stats.bytes,0,'the fence returns the whole estimate');
 }finally{owner.dispose();t.all();store.destroy();t.restore();}
});

test('the ledger labels say the estimate is a policy value with driver-side bytes unmeasured; an explicit allowance keeps its own label and size',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('core3',()=>{});
 // Observe every cost the program owner hands the ledger (admission and each adjustment).
 const seen=[],tryReserve=budget.tryReserve;
 budget.tryReserve=(cost,options)=>{const result=tryReserve(cost,options);seen.push(...[cost].flat());if(result.ok){const adjust=result.reservation.adjust.bind(result.reservation);result.reservation.adjust=(next,o)=>{seen.push(...[next].flat());return adjust(next,o);};}return result;};
 try{
  const policy=linked(t,owner,f,recipe('policy'));
  const policyCosts=seen.splice(0).filter(cost=>cost.category!=='program-source');
  assert.deepEqual([...new Set(policyCosts.map(cost=>cost.category))],['program-submitted','program']);
  for(const cost of policyCosts){assert.equal(cost.bytes,P);assert.equal(cost.precision,'estimate');assert.match(cost.label,/policy estimate 262144 B; driver-side bytes unmeasured/);}
  const explicit=linked(t,owner,f,recipe('explicit',undefined,{budget:{sourceBytesUpperBound:4*KiB,submittedAllowanceBytes:128}}));
  const explicitCosts=seen.splice(0).filter(cost=>cost.category!=='program-source');
  for(const cost of explicitCosts){assert.equal(cost.bytes,128);assert.match(cost.label,/driver bytes remain unmeasured/);assert.doesNotMatch(cost.label,/policy estimate/);}
  assert.equal(programCategory(budget),P+128,'explicit allowance unchanged; the policy one adds the estimate');
  assert.equal(owner.stats.budget.policyAllowanceRecipes,1);assert.equal(owner.stats.budget.driverAllowanceRecipes,2);
  owner.releaseProgram(f.gl,policy);
  const retiring=seen.splice(0);assert.equal(retiring.length,1);assert.equal(retiring[0].category,'program-retiring');assert.match(retiring[0].label,/^Retiring executable: policy estimate 262144 B; driver-side bytes unmeasured$/);
  owner.releaseProgram(f.gl,explicit);store.collectRetired();
  assert.equal(budget.stats.bytes,0);
 }finally{budget.tryReserve=tryReserve;owner.dispose();t.all();store.destroy();t.restore();}
});

test('retained in the recent set, the same estimate only changes role: total bytes stay one estimate, and a hit moves it back',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('core3',()=>{}),counter={builds:0},r=recipe('kept',counter);
 try{
  const program=linked(t,owner,f,r);
  owner.releaseProgram(f.gl,program,{retainRecent:true});
  assert.equal(program.deleted,false,'kept linked');
  assert.equal(budget.stats.bytes,P,'not charged twice');assert.equal(budget.stats.recentBytes,P,'the same claim is now recent');
  assert.equal(getRecentProgramStats(f.gl).entries,1);assert.equal(getRecentProgramStats(f.gl).bytes,P);
  const again=owner.compile(f.gl,r);assert.equal(again,program,'an exact hit reuses the executable');assert.equal(counter.builds,1,'no second build');
  assert.equal(budget.stats.bytes,P);assert.equal(budget.stats.recentBytes,0,'back in use: no longer recent, still one estimate');
  owner.releaseProgram(f.gl,again,{retainRecent:true});assert.equal(budget.stats.recentBytes,P);
  assert.equal(releaseRecentPrograms(store),1);
  assert.equal(program.deleted,true);assert.equal(budget.stats.retiringBytes,P,'teardown retires it like any deletion');
  store.collectRetired();assert.equal(budget.stats.bytes,0);
 }finally{owner.dispose();t.all();store.destroy();t.restore();}
});

test('recent pressure evicts a retained charged executable and its estimate returns at the fence',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f,{limitBytes:4*MiB,recentLimitBytes:2*MiB}),owner=createProgramPreparationOwner('core3',()=>{});
 try{
  const program=linked(t,owner,f,recipe('evicted'));owner.releaseProgram(f.gl,program,{retainRecent:true});
  assert.equal(budget.stats.recentBytes,P);
  // A claim that needs every byte but half of the retained executable's.
  const refused=budget.tryReserve({category:'decoded',bytes:4*MiB-P/2,precision:'estimate'});
  assert.equal(refused.ok,false,'eviction only starts retirement; the bytes return at the fence');
  assert.equal(program.deleted,true,'pressure evicted the retained executable');
  assert.equal(getRecentProgramStats(f.gl).evictedPressure,1);
  assert.equal(budget.stats.recentBytes,0);assert.equal(budget.stats.retiringBytes,P,'the same estimate, now retiring');
  store.collectRetired();assert.equal(budget.stats.bytes,0,'the fence refunds it');
  const admitted=budget.tryReserve({category:'decoded',bytes:4*MiB-P/2,precision:'estimate'});assert.equal(admitted.ok,true,'the retry fits');admitted.reservation.release();
 }finally{owner.dispose();t.all();store.destroy();t.restore();}
});

test('two owners sharing one exact recipe are charged one estimate, refunded only when the last holder releases',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),a=createProgramPreparationOwner('core3-a',()=>{}),b=createProgramPreparationOwner('core3-b',()=>{});
 try{
  const r=recipe('shared'),pa=linked(t,a,f,r),pb=b.compile(f.gl,r);
  assert.equal(pa,pb,'one executable');assert.equal(programCategory(budget),P,'one estimate for the shared executable');
  a.releaseProgram(f.gl,pa);assert.equal(programCategory(budget),P,'still held by b');assert.equal(pa.deleted,false);
  b.releaseProgram(f.gl,pb);assert.equal(pa.deleted,true);store.collectRetired();assert.equal(budget.stats.bytes,0);
 }finally{a.dispose();b.dispose();t.all();store.destroy();t.restore();}
});

test('a legacy (non-shared) budgeted program is charged the same estimate and refunded on release',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('core3',()=>{});
 try{
  const program=linked(t,owner,f,recipe('legacy',undefined,{shared:false}));
  assert.equal(programCategory(budget),P);
  owner.releaseProgram(f.gl,program);store.collectRetired();assert.equal(budget.stats.bytes,0);
 }finally{owner.dispose();t.all();store.destroy();t.restore();}
});

test('an unbudgeted recipe stays uncharged (no driver estimate without a budget descriptor)',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('core3',()=>{});
 try{
  const program=linked(t,owner,f,recipe('free',undefined,{unbudgeted:true}));
  assert.equal(budget.stats.bytes,0);assert.equal(owner.stats.budget.unmeasuredDriverRecipes,1);assert.equal(owner.stats.budget.policyAllowanceRecipes,0);
  owner.releaseProgram(f.gl,program);assert.equal(program.deleted,true);
 }finally{owner.dispose();t.all();store.destroy();t.restore();}
});

test('the estimate is part of the recipe: a ledger smaller than source plus estimate reports unfit instead of waiting',()=>{
 const t=turns(),f=driver(),{store}=page(f,{limitBytes:P,recentLimitBytes:P/2}),owner=createProgramPreparationOwner('core3',()=>{});
 try{
  assert.throws(()=>owner.compile(f.gl,recipe('large')),error=>isProgramBudgetUnfitFailure(error)&&/requires 26\d{4} logical bytes; capacity 262144/.test(error.message));
  assert.equal(owner.waitingForBudget,false,'nothing waits for an unfit recipe');
  assert.equal(store.budget.stats.bytes,0);
 }finally{owner.dispose();t.all();store.destroy();t.restore();}
});

test('a refused admission waits holding nothing and its wake admits the estimate; cancelling before submission refunds everything',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f,{limitBytes:2*MiB,recentLimitBytes:MiB});let repaints=0;
 const owner=createProgramPreparationOwner('core3',()=>{repaints++;});
 try{
  const blocker=budget.reserve({category:'decoded',bytes:2*MiB-P,precision:'estimate'});
  assert.throws(()=>owner.compile(f.gl,recipe('waits')),error=>isProgramPreparationBudgetWait(error)&&error.waiting===true);
  assert.equal(budget.stats.bytes,2*MiB-P,'the refused demand holds no bytes');
  blocker.release();assert.equal(owner.waitingForBudget,false,'the release woke the owner');assert(repaints>0,'the wake repaints');
  pending(()=>owner.compile(f.gl,recipe('waits')));
  assert.equal(budget.stats.categories['program-submitted']?.bytes,P);
  owner.cancel();t.all();
  assert.equal(budget.stats.bytes,0,'cancelled before submission: source and estimate refunded at once');
 }finally{owner.dispose();t.all();store.destroy();t.restore();}
});

test('context loss releases the estimate of every linked executable without a GL call',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('core3',()=>{});
 try{
  const program=linked(t,owner,f,recipe('lost'));assert.equal(programCategory(budget),P);
  f.gl.lost=true;owner.contextLost();
  assert.equal(budget.stats.bytes,0,'a lost incarnation returns its charge');assert.equal(program.deleted,false,'no delete on a lost context');
 }finally{owner.dispose();t.all();store.destroy();t.restore();}
});
