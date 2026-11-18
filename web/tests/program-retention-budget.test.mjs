import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// Real production modules and real relative dependencies; the program owner,
// its context scheduler, the chunk store and the page ledger are one graph.
const productionModules=new Map();
function loadProductionModule(file){
 const filename=file instanceof URL?fileURLToPath(file):file,previous=productionModules.get(filename);if(previous)return previous.exports;
 const module={exports:{}};productionModules.set(filename,module);
 try{const code=ts.transpileModule(readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  Function('module','exports','require',code+'\n//# sourceURL='+filename)(module,module.exports,name=>{assert(name.startsWith('.'),'only real local production dependencies');const target=path.resolve(path.dirname(filename),name);return loadProductionModule(path.extname(target)?target:target+'.ts');});return module.exports;
 }catch(error){productionModules.delete(filename);throw error;}
}
const core=loadProductionModule(new URL('../src/safety/render-runtime/program-preparation.ts',import.meta.url));
const {createProgramPreparationOwner,createProgramSourceAuthority,isProgramPreparationPending,releaseRecentPrograms,getRecentProgramStats,RECENT_PROGRAM_ALLOWANCE_BYTES,RECENT_PROGRAM_RECENT_SHARE}=core;
const {createResourceBudget}=loadProductionModule(new URL('../src/safety/render-runtime/resource-budget.ts',import.meta.url));
const {createChunkResourceStore,bindChunkResourceContext}=loadProductionModule(new URL('../src/safety/render-runtime/chunk-resource-store.ts',import.meta.url));
const A=RECENT_PROGRAM_ALLOWANCE_BYTES,MiB=1024*1024;
// Retention bookkeeping has its own bounded metadata claim. Program accounting
// assertions isolate executable/source claims; teardown still requires TOTAL zero.
function programBytes(budget){const stats=budget.stats;assert.equal(stats.bytes,Object.values(stats.categories).reduce((n,row)=>n+row.bytes,0));assert((stats.categories.metadata?.bytes??0)<=64*1024,'bounded retention metadata');return Object.entries(stats.categories).filter(([name])=>name==='program'||name.startsWith('program-')).reduce((n,[,row])=>n+row.bytes,0);}


function driver({parallel=false}={}){
 let id=0;const calls=[],created=[],deleted=[],completion=new Map();
 const gl={lost:false,complete:true,fenceComplete:true,linked:true,VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,COMPILE_STATUS:4,SYNC_GPU_COMMANDS_COMPLETE:6,ALREADY_SIGNALED:7,CONDITION_SATISFIED:8,TIMEOUT_EXPIRED:9,WAIT_FAILED:10,isContextLost(){return this.lost;}};
 const call=(name,fn)=>(...args)=>{assert(!gl.lost,name+' after context loss');calls.push({name,args});return fn?.(...args);};
 Object.assign(gl,{
  createShader:call('createShader',type=>{const value={type,id:++id,attached:new Set()};created.push(value);return value;}),shaderSource:call('shaderSource'),compileShader:call('compileShader'),
  createProgram:call('createProgram',()=>{const value={program:true,id:++id,shaders:new Set(),deleted:false};created.push(value);return value;}),
  attachShader:call('attachShader',(program,shader)=>{program.shaders.add(shader);shader.attached.add(program);}),detachShader:call('detachShader',(program,shader)=>{assert(program.shaders.delete(shader));shader.attached.delete(program);}),
  bindAttribLocation:call('bindAttribLocation'),linkProgram:call('linkProgram'),getExtension:call('getExtension',()=>parallel?{COMPLETION_STATUS_KHR:5}:null),
  getProgramParameter:call('getProgramParameter',(program,parameter)=>parameter===5?(completion.get(program)??gl.complete):gl.linked),getProgramInfoLog:call('getProgramInfoLog',()=>''),
  getShaderParameter:call('getShaderParameter',(shader,parameter)=>parameter===5?(completion.get(shader)??gl.complete):true),getShaderInfoLog:call('getShaderInfoLog',()=>''),
  deleteShader:call('deleteShader',value=>deleted.push(value)),deleteProgram:call('deleteProgram',value=>{assert(!value.deleted,'one delete per executable');value.deleted=true;deleted.push(value);}),
  useProgram:call('useProgram',value=>assert(value.program&&!value.deleted,'a reused executable is still linked and live')),
  fenceSync:call('fenceSync',()=>({sync:++id})),flush:call('flush'),clientWaitSync:call('clientWaitSync',()=>gl.fenceComplete?gl.ALREADY_SIGNALED:gl.TIMEOUT_EXPIRED),deleteSync:call('deleteSync'),
 });
 return{gl,calls,created,deleted,programs:()=>created.filter(value=>value.program),links:()=>calls.filter(value=>value.name==='linkProgram').length,setCompletion(value,state=true){completion.set(value,state);}};
}
function turns(){
 const queue=[],previous=globalThis.setTimeout,performanceDescriptor=Object.getOwnPropertyDescriptor(globalThis,'performance');let now=0;
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{timeOrigin:0,now:()=>now}});
 globalThis.setTimeout=fn=>(queue.push(fn),queue.length);
 return{queue,advance(ms){now+=ms;},one(){assert(queue.length,'a scheduled turn');queue.shift()();},all(){let n=0;while(queue.length){assert(++n<1000,'bounded turns');queue.shift()();}},until(ready){let n=0;while(!ready()){assert(++n<200,'bounded turns');this.one();}},
  restore(){globalThis.setTimeout=previous;if(performanceDescriptor)Object.defineProperty(globalThis,'performance',performanceDescriptor);else delete globalThis.performance;}};
}
// recent subset 2 MiB: retained executables may use half of it (four default allowances).
function page(f,{limitBytes=8*MiB,recentLimitBytes=2*MiB}={}){const budget=createResourceBudget({limitBytes,recentLimitBytes}),store=createChunkResourceStore({budget});bindChunkResourceContext(f.gl,store);return{budget,store};}
function finish(t,f,store,owners){f.gl.complete=true;f.gl.fenceComplete=true;for(const owner of owners)owner.dispose();t.all();releaseRecentPrograms(store);store.collectRetired();store.destroy();store.collectRetired();assert.equal(store.budget.stats.bytes,0,'every claim returns at teardown');}
const authority=createProgramSourceAuthority({inputs:['retention ABI'],builders:[function build(){}]});
function exact(resource,counter,extra={}){return{sharedKey:'retention-abi',resource,inputs:['vertex:v1','helper:'+resource],provenance:[authority],priority:'visible',build(){counter.builds++;return{vertex:'v '+resource,fragment:'f '+resource,attributes:['a_position']};},...extra};}
const pending=(fn,status='pending')=>assert.throws(fn,error=>isProgramPreparationPending(error)&&error.status===status);
function linked(t,owner,f,r){pending(()=>owner.compile(f.gl,r));t.all();const program=owner.compile(f.gl,r);assert(program.program);return program;}

test('default ownership is unchanged: the last release deletes and a later identical demand compiles again',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('default',()=>{}),counter={builds:0},r=exact('base',counter);
 try{
  const program=linked(t,owner,f,r);owner.releaseProgram(f.gl,program);assert.equal(program.deleted,true);
  assert.equal(owner.acquireReadyProgram(f.gl,r),undefined);assert.equal(getRecentProgramStats(f.gl).entries,0);assert.equal(budget.stats.categories.program,undefined);
  const again=linked(t,owner,f,r);assert.notEqual(again,program);assert.equal(counter.builds,2);owner.releaseProgram(f.gl,again);
 }finally{finish(t,f,store,[owner]);t.restore();}
});

test('a retained linked executable is charged once as recent program bytes and the exact recipe reuses it without compiling',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),first=createProgramPreparationOwner('retaining renderer',()=>{},{retainRecent:true}),counter={builds:0},r=exact('base',counter);
 try{
  const program=linked(t,first,f,r);assert.equal(programBytes(budget),0,'an in-use executable without a policy allowance stays unmeasured');
  first.releaseProgram(f.gl,program);assert.equal(program.deleted,false);
  assert.equal(programBytes(budget),A);assert.equal(budget.stats.recentBytes,A);assert.equal(budget.stats.categories.program.bytes,A);
  let recent=first.stats.recent;assert.equal(recent.entries,1);assert.equal(recent.bytes,A);assert.equal(recent.retained,1);assert.equal(recent.shareLimitBytes,Math.floor(2*MiB*RECENT_PROGRAM_RECENT_SHARE));
  first.dispose();t.all();assert.equal(program.deleted,false,'a later owner teardown does not discard the page entry');
  // A fresh renderer owner (the retry after a 2D fallback) asks for the same recipe.
  const retry=createProgramPreparationOwner('retry renderer',()=>{}),links=f.links();
  assert.equal(retry.acquireReadyProgram(f.gl,r),program,'ready-only acquisition takes the retained executable');assert.equal(f.links(),links);assert.equal(counter.builds,1);assert.equal(t.queue.length,0);
  f.gl.useProgram(program);assert.equal(programBytes(budget),0,'back in use: the recent-only charge ends');assert.equal(getRecentProgramStats(f.gl).entries,0);assert.equal(retry.stats.recent.ownerHits,1);assert.equal(retry.stats.shared.heldReferences,1);
  assert.equal(retry.compile(f.gl,r),program,'a second grant shares the same executable');retry.releaseProgram(f.gl,program);retry.releaseProgram(f.gl,program);assert.equal(program.deleted,true,'the default owner deletes it at its last release');
  recent=getRecentProgramStats(f.gl);assert.equal(recent.hits,1);assert.equal(recent.entries,0);retry.dispose();
 }finally{finish(t,f,store,[first]);t.restore();}
});

test('only the exact context incarnation and sharedKey/resource/inputs/provenance identity can take a retained executable',()=>{
 const t=turns(),f=driver(),{store}=page(f),owner=createProgramPreparationOwner('identity',()=>{},{retainRecent:true}),counter={builds:0},r=exact('base',counter);
 try{
  const program=linked(t,owner,f,r);owner.releaseProgram(f.gl,program);
  const other=createProgramSourceAuthority({inputs:['retention ABI'],builders:[function build(){}]});
  for(const variant of [{sharedKey:'other-abi'},{resource:'other'},{inputs:['vertex:v1','helper:other']},{inputs:['vertex:v1']},{provenance:[other]},{provenance:[]},{sharedKey:undefined}])assert.equal(owner.acquireReadyProgram(f.gl,{...r,...variant}),undefined,JSON.stringify(Object.keys(variant)));
  assert.equal(getRecentProgramStats(f.gl).entries,1,'a miss leaves the entry in place');assert.equal(program.deleted,false);
  assert.equal(owner.acquireReadyProgram(f.gl,r),program);owner.releaseProgram(f.gl,program,{retainRecent:false});assert.equal(program.deleted,true,'a per-call option overrides the owner default');
 }finally{finish(t,f,store,[owner]);t.restore();}
});

test('an executable with its own policy claim flips that claim to recent: the same bytes are never charged twice',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('claimed',()=>{}),counter={builds:0},r=exact('claimed',counter,{budget:{sourceBytesUpperBound:4096,submittedAllowanceBytes:4096}});
 try{
  const program=linked(t,owner,f,r);assert.equal(programBytes(budget),4096);assert.equal(budget.stats.recentBytes,0);
  owner.releaseProgram(f.gl,program,{retainRecent:true});assert.equal(program.deleted,false);assert.equal(programBytes(budget),4096,'no second charge');assert.equal(budget.stats.recentBytes,4096);assert.equal(budget.stats.categories.program.bytes,4096);assert.equal(getRecentProgramStats(f.gl).bytes,4096);
  const held=owner.compile(f.gl,r);assert.equal(held,program);assert.equal(counter.builds,1);assert.equal(programBytes(budget),4096,'its own claim stays charged while in use');assert.equal(budget.stats.recentBytes,0);
  owner.releaseProgram(f.gl,held);assert.equal(program.deleted,true);assert.equal(programBytes(budget),4096,'retiring until its fence');store.collectRetired();assert.equal(programBytes(budget),0);
 }finally{finish(t,f,store,[owner]);t.restore();}
});

test('cancellation with retention: a link-submitted program completes into the recent set, unsubmitted work is cancelled and refunded',()=>{
 const t=turns(),f=driver({parallel:true}),{budget,store}=page(f),owner=createProgramPreparationOwner('timed-out candidate',()=>{},{retainRecent:true}),counter={builds:0};f.gl.complete=false;
 const linkedRecipe=exact('linked',counter),queued=exact('queued',counter,{budget:{sourceBytesUpperBound:4096}}),third=exact('third',counter);
 try{
  pending(()=>owner.compile(f.gl,linkedRecipe));t.until(()=>f.links()===1);pending(()=>owner.compile(f.gl,queued));assert.equal(programBytes(budget),4096+A,'the queued recipe holds its admitted source bound beside the linked program\'s policy estimate (DECISIONS 2026-11-02 03:25)');
  const program=f.programs()[0];owner.cancel();
  assert.equal(owner.stats.context.retiring,0,'the linked execution is held, not abandoned');assert.equal(getRecentProgramStats(f.gl).draining,1);assert.equal(programBytes(budget),0,'unsubmitted work returns its admission');
  for(let i=0;i<4;i++)t.one();assert.equal(counter.builds,1,'the cancelled queued recipe never builds');assert.equal(program.deleted,false);assert.equal(getRecentProgramStats(f.gl).entries,0);
  f.setCompletion(program);t.all();assert.equal(program.deleted,false);assert.equal(getRecentProgramStats(f.gl).entries,1);assert.equal(getRecentProgramStats(f.gl).draining,0);assert.equal(budget.stats.recentBytes,A);
  assert.equal(f.calls.filter(call=>call.name==='detachShader').length,2,'the completed link detaches both shaders like any linked result');
  // The retry: the retained one answers at once, the rest compiles.
  const retry=createProgramPreparationOwner('retry',()=>{});assert.equal(retry.compile(f.gl,linkedRecipe),program);pending(()=>retry.compile(f.gl,third));f.gl.complete=true;t.all();assert(retry.compile(f.gl,third).program);assert.equal(f.links(),2);retry.dispose();
 }finally{finish(t,f,store,[owner]);t.restore();}
});

test('cancellation with retention: a partial shader submission still drains and is deleted, never kept',()=>{
 const t=turns(),f=driver({parallel:true}),{store}=page(f),owner=createProgramPreparationOwner('partial',()=>{},{retainRecent:true}),peer=createProgramPreparationOwner('peer',()=>{}),counter={builds:0};f.gl.complete=false;
 const compile=f.gl.compileShader;let first=true;f.gl.compileShader=(...args)=>{compile(...args);if(first){first=false;t.advance(4);}};
 try{
  pending(()=>owner.compile(f.gl,exact('partial',counter)));pending(()=>peer.compile(f.gl,exact('peer',counter)));t.until(()=>f.calls.some(call=>call.name==='compileShader'));
  const shader=f.calls.find(call=>call.name==='compileShader').args[0];owner.cancel();assert.equal(getRecentProgramStats(f.gl).draining,0);assert.equal(owner.stats.context.retiring,1);
  f.setCompletion(shader);f.gl.complete=true;t.all();assert.equal(getRecentProgramStats(f.gl).entries,0);assert(f.deleted.includes(shader));
 }finally{finish(t,f,store,[owner,peer]);t.restore();}
});

test('prune with retention keeps a linked but unconsumed exact result; teardown releases it with one delete request',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('stale candidate',()=>{}),counter={builds:0};let live=true;
 const r=exact('unconsumed',counter,{current:()=>live});
 try{
  pending(()=>owner.compile(f.gl,r));t.all();const program=f.programs()[0];live=false;owner.prune({retainRecent:true});
  assert.equal(program.deleted,false);assert.equal(getRecentProgramStats(f.gl).entries,1);assert.equal(budget.stats.recentBytes,A);
  assert.equal(releaseRecentPrograms(store),1);assert.equal(program.deleted,true);assert.equal(programBytes(budget),A,'retiring until its fence');store.collectRetired();assert.equal(programBytes(budget),0);assert.equal(getRecentProgramStats(f.gl).released,1);
 }finally{finish(t,f,store,[owner]);t.restore();}
});

test('ledger pressure evicts the least recently retained executables first and only for the shortfall; time alone never evicts',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f,{limitBytes:3*MiB}),owner=createProgramPreparationOwner('lru',()=>{},{retainRecent:true}),counter={builds:0};
 try{
  const programs=['p1','p2','p3','p4'].map(name=>linked(t,owner,f,exact(name,counter)));for(const program of programs)owner.releaseProgram(f.gl,program);
  assert.equal(getRecentProgramStats(f.gl).entries,4);assert.equal(programBytes(budget),4*A);
  t.advance(10*60*1000);store.collectRetired();assert.equal(getRecentProgramStats(f.gl).entries,4,'ten idle minutes alone evict nothing');
  // Needs 1.5 allowances beyond capacity: the two oldest go, the newest stay.
  const blocked=budget.tryReserve({category:'decoded',bytes:3*MiB-4*A+A+A/2,precision:'exact'});assert.equal(blocked.ok,false,'eviction moves bytes to retiring until their fences');
  assert.deepEqual(programs.map(program=>program.deleted),[true,true,false,false]);assert.equal(getRecentProgramStats(f.gl).evictedPressure,2);
  store.collectRetired();const admitted=budget.tryReserve({category:'decoded',bytes:3*MiB-4*A+A+A/2,precision:'exact'});assert.equal(admitted.ok,true,'the waiting admission fits after the fences');admitted.reservation.release();
  assert.equal(owner.acquireReadyProgram(f.gl,exact('p4',counter)),programs[3]);assert.equal(owner.acquireReadyProgram(f.gl,exact('p1',counter)),undefined);
  const recentPressure=budget.tryReserve({category:'decoded',bytes:2*MiB-A/2,precision:'exact'},{recent:true});assert.equal(recentPressure.ok,true,'a recent-subset shortfall evicts retained executables synchronously');assert.equal(programs[2].deleted,true);recentPressure.reservation.release();
 }finally{finish(t,f,store,[owner]);t.restore();}
});

test('the retained share and count are bounded: a newer retention displaces the oldest, an unfit one deletes as before',()=>{
 const t=turns(),f=driver(),{store}=page(f,{recentLimitBytes:4*A}),owner=createProgramPreparationOwner('bounded',()=>{},{retainRecent:true}),counter={builds:0};
 try{
  const programs=['a','b','c'].map(name=>linked(t,owner,f,exact(name,counter)));for(const program of programs)owner.releaseProgram(f.gl,program);
  const stats=getRecentProgramStats(f.gl);assert.equal(stats.shareLimitBytes,2*A);assert.equal(stats.entries,2);assert.equal(stats.evictedCapacity,1);assert.deepEqual(programs.map(program=>program.deleted),[true,false,false]);
  const tiny=driver(),small=page(tiny,{recentLimitBytes:A}),other=createProgramPreparationOwner('no room',()=>{},{retainRecent:true}),program=linked(t,other,tiny,exact('x',counter));
  other.releaseProgram(tiny.gl,program);assert.equal(program.deleted,true,'a share smaller than one allowance retains nothing');assert.equal(getRecentProgramStats(tiny.gl).refused,1);finish(t,tiny,small.store,[other]);
 }finally{finish(t,f,store,[owner]);t.restore();}
});

test('the retained count is bounded per page ledger even when every executable carries a small own claim',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('count',()=>{},{retainRecent:true}),counter={builds:0},limit=core.RECENT_PROGRAM_MAX_ENTRIES;
 try{
  assert.equal(limit,128);const programs=[];
  for(let i=0;i<=limit;i++){const program=linked(t,owner,f,exact('n'+i,counter,{budget:{sourceBytesUpperBound:4096,submittedAllowanceBytes:1024}}));programs.push(program);owner.releaseProgram(f.gl,program);}
  const stats=getRecentProgramStats(f.gl);assert.equal(stats.entries,limit);assert.equal(stats.evictedCapacity,1);assert.equal(programs[0].deleted,true,'the least recently retained one goes');assert.equal(programs.slice(1).some(program=>program.deleted),false);
  store.collectRetired();assert.equal(programBytes(budget),limit*1024,'each retained executable keeps exactly its own claim');assert.equal(budget.stats.recentBytes,limit*1024);
 }finally{finish(t,f,store,[owner]);t.restore();}
});

test('context loss drops retained executables without GL calls and returns their claims; a restored incarnation compiles fresh',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('loss',()=>{},{retainRecent:true}),counter={builds:0},r=exact('base',counter);
 try{
  const program=linked(t,owner,f,r);owner.releaseProgram(f.gl,program);assert.equal(programBytes(budget),A);
  const before=f.calls.length;f.gl.lost=true;owner.contextLost();assert.equal(f.calls.length,before,'no delete on a lost context');assert.equal(getRecentProgramStats(f.gl).entries,0);assert.equal(getRecentProgramStats(f.gl).lost,1);assert.equal(programBytes(budget),0);
  f.gl.lost=false;assert.equal(owner.acquireReadyProgram(f.gl,r),undefined);const fresh=linked(t,owner,f,r);assert.notEqual(fresh,program);assert.equal(counter.builds,2);owner.releaseProgram(f.gl,fresh,{retainRecent:false});
 }finally{finish(t,f,store,[owner]);t.restore();}
});

test('dispose retains only when asked, and context-scoped teardown ends retention drains as ordinary cleanup',()=>{
 const t=turns(),f=driver({parallel:true}),{budget,store}=page(f),counter={builds:0};
 try{
  const a=createProgramPreparationOwner('teardown',()=>{},{retainRecent:true}),pa=linked(t,a,f,exact('a',counter));a.dispose();assert.equal(pa.deleted,true,'dispose is teardown by default');
  const b=createProgramPreparationOwner('kept',()=>{}),pb=linked(t,b,f,exact('b',counter));b.dispose({retainRecent:true});assert.equal(pb.deleted,false);assert.equal(getRecentProgramStats(f.gl).entries,1);
  const c=createProgramPreparationOwner('draining',()=>{},{retainRecent:true});f.gl.complete=false;pending(()=>c.compile(f.gl,exact('c',counter)));t.until(()=>f.links()===3);c.cancel();assert.equal(getRecentProgramStats(f.gl).draining,1);
  assert.equal(releaseRecentPrograms(f.gl),1);assert.equal(pb.deleted,true);assert.equal(getRecentProgramStats(f.gl).draining,0);assert.equal(c.stats.context.retiring,1,'the linked submission now drains as abandoned work');
  const pc=f.programs()[2];f.setCompletion(pc);t.all();assert.equal(pc.deleted,true);assert.equal(getRecentProgramStats(f.gl).entries,0);store.collectRetired();assert.equal(programBytes(budget),0);c.dispose();
 }finally{finish(t,f,store,[]);t.restore();}
});

test('recent statistics are numbers and fixed labels only, with no executable, input or source text',()=>{
 const t=turns(),f=driver(),{store}=page(f),owner=createProgramPreparationOwner('stats',()=>{},{retainRecent:true}),counter={builds:0},r=exact('private-resource',counter);
 try{
  const program=linked(t,owner,f,r);owner.releaseProgram(f.gl,program);const stats=owner.stats,text=JSON.stringify(stats.recent);
  assert(!text.includes('helper:')&&!text.includes('f private'),'no inputs or source text');for(const key of Object.keys(stats.recent))assert(!['program','inputs','job','build','work'].includes(key));
  assert.equal(stats.recent.ownerDefault,true);assert.equal(stats.recent.eviction,'ledger-pressure-least-recently-retained-first; never by time');
  assert.throws(()=>owner.releaseProgram(f.gl,program,{retainRecent:'yes'}),TypeError);assert.throws(()=>createProgramPreparationOwner('bad',()=>{},{retainRecent:1}),TypeError);
 }finally{finish(t,f,store,[owner]);t.restore();}
});

test('a resumed abandoned link wakes a waiter whose refusal counted on its retiring bytes; the retry evicts the shortfall',()=>{
 const t=turns(),f=driver({parallel:true}),{budget,store}=page(f,{limitBytes:3*MiB}),keeper=createProgramPreparationOwner('keeper',()=>{}),candidate=createProgramPreparationOwner('cancelled candidate',()=>{}),counter={builds:0},S=512*1024;
 const submitted=exact('submitted',counter,{budget:{sourceBytesUpperBound:4096,submittedAllowanceBytes:S}}),wanted={category:'decoded',bytes:3*MiB-2*A-S/2,precision:'exact'};let woken=0,off;
 try{
  const kept=['k1','k2'].map(name=>linked(t,keeper,f,exact(name,counter)));for(const program of kept)keeper.releaseProgram(f.gl,program,{retainRecent:true});
  assert.equal(getRecentProgramStats(f.gl).entries,2);assert.equal(programBytes(budget),2*A);wanted.bytes-=budget.stats.categories.metadata?.bytes??0;
  f.gl.complete=false;pending(()=>candidate.compile(f.gl,submitted));t.until(()=>f.links()===3);assert.equal(programBytes(budget),2*A+S);
  candidate.cancel();assert.equal(budget.stats.retiringBytes,S,'the abandoned link keeps its allowance charged as retiring');
  const refused=budget.tryReserve(wanted);assert.equal(refused.ok,false);assert.equal(getRecentProgramStats(f.gl).evictedPressure,0,'its retiring bytes covered the shortfall');
  off=budget.onAvailable(()=>{woken++;});
  // The exact successor resumes the linked submission: those bytes no longer return.
  pending(()=>candidate.compile(f.gl,submitted));assert.equal(budget.stats.retiringBytes,0);assert.equal(programBytes(budget),2*A+S);
  assert.equal(woken,1,'the resume wakes the waiter instead of leaving it silent');
  const retry=budget.tryReserve(wanted);assert.equal(retry.ok,false,'an eviction moves bytes to retiring until their fence');
  assert.equal(getRecentProgramStats(f.gl).evictedPressure,1);assert.deepEqual(kept.map(program=>program.deleted),[true,false],'least recently retained first, only the shortfall');
  store.collectRetired();const admitted=budget.tryReserve(wanted);assert.equal(admitted.ok,true,'the waiter fits after the fence');admitted.reservation.release();
  const program=f.programs()[2];f.setCompletion(program);t.all();assert.equal(candidate.compile(f.gl,submitted),program);candidate.releaseProgram(f.gl,program);
 }finally{off?.();finish(t,f,store,[keeper,candidate]);t.restore();}
});

test('a retention that even every retained row could not make room for evicts none of them and deletes as before',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('crowded',()=>{}),counter={builds:0};let outside;
 try{
  const claimed=['s1','s2','s3','s4'].map(name=>linked(t,owner,f,exact(name,counter,{budget:{sourceBytesUpperBound:4096,submittedAllowanceBytes:1024}})));
  for(const program of claimed)owner.releaseProgram(f.gl,program,{retainRecent:true});
  assert.equal(getRecentProgramStats(f.gl).entries,4);assert.equal(budget.stats.recentBytes,4096);
  // Another cache holds almost all of the 2 MiB recent subset.
  outside=budget.tryReserve({category:'decoded',bytes:2*MiB-4096-1000,precision:'exact'},{recent:true});assert.equal(outside.ok,true);
  const program=linked(t,owner,f,exact('claimless',counter));owner.releaseProgram(f.gl,program,{retainRecent:true});
  const stats=getRecentProgramStats(f.gl);assert.equal(program.deleted,true,'not retained: deleted as before');assert.equal(stats.refused,1);
  assert.equal(stats.evictedCapacity,0,'no retained row is discarded for nothing');assert.equal(stats.entries,4);assert.equal(claimed.some(value=>value.deleted),false);
 }finally{if(outside?.ok)outside.reservation.release();finish(t,f,store,[owner]);t.restore();}
});

test('a listener that compiles the exact recipe inside the retention wave takes the recent row; no row eviction deletes a granted executable',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('releasing',()=>{}),peer=createProgramPreparationOwner('reentrant peer',()=>{}),counter={builds:0},r=exact('claimed',counter,{budget:{sourceBytesUpperBound:4096,submittedAllowanceBytes:4096}});
 let granted,off;
 try{
  const program=linked(t,owner,f,r);
  // Its own claim becomes evictable, so retention sends one synchronous reclaimable wave.
  off=budget.onAvailable(()=>{off();granted=peer.compile(f.gl,r);});
  owner.releaseProgram(f.gl,program,{retainRecent:true});
  assert.equal(granted,program,'the synchronous listener gets the same linked executable');assert.equal(counter.builds,1);
  const recent=getRecentProgramStats(f.gl);assert.equal(recent.entries,0,'it took the recent row');assert.equal(recent.hits,1);assert.equal(budget.stats.recentBytes,0);assert.equal(programBytes(budget),4096);
  assert.equal(releaseRecentPrograms(store),0);assert.equal(program.deleted,false,'a granted executable is never deleted by a row eviction');
  f.gl.useProgram(program);peer.releaseProgram(f.gl,program);assert.equal(program.deleted,true,'its holder releases it once');
 }finally{off?.();finish(t,f,store,[owner,peer]);t.restore();}
});

test('beside chunk recent entries the chunk store clears its own recent cache first and retained executables give only the shortfall left (current order; cross-cache priority undecided)',()=>{
 const t=turns(),f=driver(),{budget,store}=page(f),owner=createProgramPreparationOwner('cross-cache',()=>{}),counter={builds:0},KiB=1024,disposed=[];
 const chunk=key=>{const lease=store.acquire({contentKey:'cross-cache/'+key,role:'source',estimate:{category:'decoded',bytes:300*KiB,precision:'exact'},allowRecent:true,produce:()=>({key}),dispose:value=>disposed.push(value.key)});lease.release();};
 let wanted;
 try{
  const programs=['p1','p2','p3','p4'].map(name=>linked(t,owner,f,exact(name,counter)));for(const program of programs)owner.releaseProgram(f.gl,program,{retainRecent:true});
  assert.equal(budget.stats.recentBytes,4*A,'the retained share is full: 1 MiB of the 2 MiB recent subset');
  for(const key of ['c1','c2','c3'])chunk(key);assert.equal(store.stats.recent,3);assert.equal(budget.stats.recentBytes,4*A+900*KiB);
  // A fourth idle chunk entry exceeds the recent subset. The chunk store's
  // listener (registered with the store) runs first and clears its own recent
  // entries; no shortfall is left for the retained executables.
  chunk('c4');
  assert.deepEqual(disposed,['c1','c2','c3']);assert.equal(store.stats.recent,1);assert.equal(getRecentProgramStats(f.gl).entries,4);assert.equal(getRecentProgramStats(f.gl).evictedPressure,0);
  // A recent admission larger than the chunk store can still give: the
  // retained set gives the rest, least recently retained first.
  wanted=budget.tryReserve({category:'decoded',bytes:MiB+A/2,precision:'exact'},{recent:true});assert.equal(wanted.ok,true,'a recent-subset shortfall is met synchronously');
  assert.deepEqual(disposed,['c1','c2','c3','c4']);assert.deepEqual(programs.map(program=>program.deleted),[true,false,false,false]);assert.equal(getRecentProgramStats(f.gl).evictedPressure,1);
 }finally{if(wanted?.ok)wanted.reservation.release();finish(t,f,store,[owner]);t.restore();}
});
