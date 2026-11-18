import test from 'node:test';
import assert from 'node:assert/strict';
import {budgets,driver,preparedSources,programs,shaderSources,stores,turns} from './support/core-stats-prepared-runtime.mjs';

// Budget descriptions are read-only with respect to the retained base/analysis.
// Actual production switches it; a real admission refusal may reclaim an idle
// entry before retrying that same admission. Active producer stacks stay pinned.
// The tight-capacity cases retain the old identity-rotation and larger-source
// counterexamples: neither is allowed to wait for its own reclaimable bytes.
const {createProgramPreparationOwner,createProgramSourceAuthority,isProgramPreparationPending}=programs;
// DECISIONS 2026-11-02 03:25: every budgeted program is admitted with its linked
// program's policy estimate and keeps it while the program is held. The margins
// below therefore count P once per admitted ticket and once per held program.
const P=programs.LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES;assert.equal(P,256*1024);
const {createResourceBudget}=budgets,{createChunkResourceStore,bindChunkResourceContext}=stores;
const {shaderSourceBounds,shaderSourceText}=shaderSources,{createPreparedSourceWorkspace}=preparedSources;

const VERTEX='attribute vec3 a_position;void main(){gl_Position=vec4(a_position,1.);}',ATTRIBUTES=Object.freeze(['a_position']);
const fragment=(letter,colour,length=3000)=>'precision mediump float;\n// '+letter.repeat(length)+'\nvoid main(){gl_FragColor=vec4('+colour+',1.);}\n';
// c is a recipe whose source bound is larger than b's (see the no-rotation case).
const SOURCES=Object.freeze({a:fragment('a','1.,0.,0.'),b:fragment('b','0.,1.,0.'),c:fragment('c','0.,0.,1.',24000)});
const BOUNDS=Object.freeze(Object.fromEntries(Object.entries(SOURCES).map(([key,text])=>[key,shaderSourceBounds(shaderSourceText(text,['core-stats/'+key]))])));
const sourceRecipe=key=>({sourceKey:key,inputs:[key,'core-stats-v1'],sourceBounds:BOUNDS[key],assemble:paint=>paint});
const AUTHORITY=createProgramSourceAuthority({inputs:['core-stats prepared-source retirement'],builders:[createPreparedSourceWorkspace]});
const pending=fn=>assert.throws(fn,error=>isProgramPreparationPending(error));
const ticketBytes=ticket=>ticket.sourceBytesUpperBound+ticket.workspaceCosts.reduce((total,cost)=>total+cost.bytes,0);
/** The whole admission of a ticket: its source and workspace bound plus its program estimate. */
const admissionBytes=ticket=>ticketBytes(ticket)+P;
const heldProgramBytes=budget=>budget.stats.categories.program?.bytes??0;
const workspaceRows=budget=>budget.holders(64).filter(row=>row.label?.startsWith('prepared source'));

/** One renderer-like owner: a metered workspace and a program owner on one
 * page ledger. compile() is one frame's poll: it describes the recipe, and so
 * its program ticket, anew, as the renderers do. */
function scene(limitBytes=64*1024*1024){
 const t=turns(),f=driver(),budget=createResourceBudget({limitBytes,recentLimitBytes:0}),store=createChunkResourceStore({budget});bindChunkResourceContext(f.gl,store);
 const counts={builds:0,clears:0,specializations:0},hooks={build:undefined,specialize:undefined,clear:undefined},pressureListeners=new Set(),onPressure=budget.onPressure;budget.onPressure=listener=>{pressureListeners.add(listener);const off=onPressure(listener);return()=>{pressureListeners.delete(listener);off();};};
 const take=name=>{const run=hooks[name];hooks[name]=undefined;run?.();};
 const workspace=createPreparedSourceWorkspace({budget,current:()=>true,
  build:recipe=>{counts.builds++;take('build');return SOURCES[recipe.sourceKey];},clear:()=>{counts.clears++;take('clear');},
  specialize(source){take('specialize');counts.specializations++;return{fragment:source,depthEffects:false};}});
 const owner=createProgramPreparationOwner('core-stats prepared-source',()=>{});
 const recipe=(key,families)=>({resource:'core-stats:'+key+':'+families.join(','),inputs:[key,families.join(',')],sharedKey:'core-stats-colour',provenance:[AUTHORITY],
  budget:workspace.programBudget(sourceRecipe(key),VERTEX,ATTRIBUTES,families),
  build:()=>({vertex:VERTEX,fragment:workspace.prepareSource(sourceRecipe(key),families).fragment,attributes:[...ATTRIBUTES]})});
 let closed=false;
 return{t,f,budget,store,workspace,owner,counts,hooks,pressureListeners,
  compile:(key,families=[1])=>owner.compile(f.gl,recipe(key,families)),
  /** Compiles key to a linked program through the real scheduler turns. */
  ready(key,families=[1]){pending(()=>this.compile(key,families));t.all();const program=this.compile(key,families);assert(program?.program,key+' links');return program;},
  ticket:(key,families=[1])=>workspace.programBudget(sourceRecipe(key),VERTEX,ATTRIBUTES,families),
  close(){if(!closed){closed=true;try{owner.dispose();t.all();store.collectRetired();workspace.release();store.destroy();store.collectRetired();}finally{t.restore();}}return budget.stats.bytes;},
 };
}
/** While entry A is in use, a ticket of recipe B rotates the workspace identities. */
function rotateDuringA(s,families=[1]){
 s.hooks.specialize=()=>{
  const before=s.workspace.preparedSourceStats;s.ticket('b');const after=s.workspace.preparedSourceStats;
  assert.equal(after.replacements,before.replacements,'an entry in use is never retired');assert.equal(after.sourceCharacters,SOURCES.a.length,'entry A stays while in use');
 };
 const program=s.ready('a',families);assert.equal(s.hooks.specialize,undefined,'the reentrant ticket ran');return program;
}
/** Sizes on an ample ledger: entry A's idle claim, and recipe B's whole admission
 * (ticket plus its program estimate). Program A stays held beside them (P). */
function measure(){
 const s=scene();
 try{rotateDuringA(s);assert.equal(heldProgramBytes(s.budget),P,'linked program A keeps its policy estimate');const idleEntry=s.budget.stats.bytes-P,ticket=admissionBytes(s.ticket('b'));assert(idleEntry>0&&ticket>idleEntry);return{idleEntry,ticket};}
 finally{s.close();}
}

test('actual admission pressure retires the rotated idle entry: ticket plus old entry exceed the ledger, each fits alone, and the program compiles in the same admission',()=>{
 const {idleEntry,ticket}=measure(),limit=P+ticket+Math.floor(idleEntry/2);
 assert(P+ticket<=limit&&P+idleEntry<=limit&&P+ticket+idleEntry>limit,'beside held program A each fits the ledger alone; together they do not');
 const s=scene(limit);
 try{
  rotateDuringA(s);
  assert.equal(s.budget.stats.bytes,P+idleEntry,'only the idle entry A (and held program A) stays charged');assert.equal(heldProgramBytes(s.budget),P);assert.equal(workspaceRows(s.budget).length>0,true);
  pending(()=>s.compile('b'));
  assert.equal(s.owner.stats.budget.waitingForAvailability,false,'the ticket was admitted instead of waiting for entry A');
  assert.equal(s.workspace.preparedSourceStats.sourceCharacters,0,'entry A was reclaimed by actual admission pressure');assert.equal(s.budget.stats.bytes,P+ticket,'the ledger holds only the ticket beside held program A');
  s.t.all();const program=s.compile('b');assert(program.program,'B links with no drain and no explicit clear');
  const stats=s.workspace.preparedSourceStats;
  assert.deepEqual([stats.builds,stats.replacements,stats.hits,stats.sourceCharacters],[2,1,0,SOURCES.b.length]);
  assert.deepEqual(workspaceRows(s.budget).map(row=>row.label),Array(workspaceRows(s.budget).length).fill('prepared source b'),'only entry B stays charged');
  assert(s.budget.stats.bytes<=limit);
  s.owner.releaseProgram(s.f.gl,program);
 }finally{assert.equal(s.close(),0,'every claim is returned');}
});

/** Without a rotation: an idle entry of the larger recipe c and recipe b's ticket
 * share the workspace identities, so the ledger charges the larger cost of each
 * shared allocation once. The bytes c's entry adds beyond b's ticket (excess) are
 * measured with no retirement: b's ticket is described on the empty workspace,
 * before entry c exists, so it names the identities c is then built on. */
function measureSharedExcess(){
 const s=scene();
 try{
  const ticket=s.ticket('b'),bytes=ticketBytes(ticket);
  s.ready('c');const withEntry=s.budget.stats.bytes,idleEntry=s.workspace.preparedSourceStats.budget.ownedBytesEstimate;
  const admitted=s.budget.reserve([{category:'program-source',bytes:ticket.sourceBytesUpperBound,precision:'estimate',identity:{}},...ticket.workspaceCosts],{label:'measure ticket'});
  const withBoth=s.budget.stats.bytes;admitted.release();
  assert.equal(s.workspace.preparedSourceStats.replacements,0,'measuring retires nothing');
  return{ticket:bytes,idleEntry,others:withEntry-idleEntry,withBoth:withBoth-(withEntry-idleEntry)};
 }finally{s.close();}
}

test('actual admission pressure reclaims a larger idle base even without rotation, and the smaller program compiles in the same admission',()=>{
 assert(BOUNDS.c.sourceCharactersUpperBound>BOUNDS.b.sourceCharactersUpperBound,'recipe c has the larger source bound');
 const {ticket,idleEntry,others,withBoth}=measureSharedExcess(),excess=withBoth-ticket;
 assert(withBoth<ticket+idleEntry,'b and the idle entry c share allocations (no rotation)');
 assert(excess>0,'the idle entry c adds an excess to b on the shared allocations');
 // others includes held program c (P); the ticket's admission adds b's own program estimate (P).
 assert(others>=P,'held program c stays charged at its estimate');
 const limit=4*1024*1024,blockerBytes=limit-others-ticket-P-Math.floor(excess/2);
 assert(others+ticket+P+blockerBytes<=limit&&others+withBoth+P+blockerBytes>limit,'the ticket fits beside the other holder alone; with entry c\'s excess it does not');
 const s=scene(limit);let blocker;
 try{
  s.ready('c');assert.equal(s.budget.stats.bytes,others+idleEntry);
  blocker=s.budget.reserve({category:'construction',bytes:blockerBytes,precision:'exact',identity:{}},{label:'other owner'});
  pending(()=>s.compile('b'));
  assert.equal(s.owner.stats.budget.waitingForAvailability,false,'the ticket was admitted instead of waiting for entry c\'s excess');
  assert.equal(s.workspace.preparedSourceStats.sourceCharacters,0,'entry c was reclaimed by actual admission pressure');
  s.t.all();const program=s.compile('b');assert(program.program,'b links with no drain and no explicit clear');
  const stats=s.workspace.preparedSourceStats;
  assert.deepEqual([stats.builds,stats.replacements,stats.hits,stats.sourceCharacters],[2,1,0,SOURCES.b.length]);
  assert(s.budget.stats.bytes<=limit);
  s.owner.releaseProgram(s.f.gl,program);
 }finally{blocker?.release();assert.equal(s.close(),0,'every claim is returned');}
});

test('a ticket refused for another holder waits holding nothing of the workspace, and its wake compiles it',()=>{
 const {idleEntry,ticket}=measure(),limit=P+ticket+Math.floor(idleEntry/2);
 const s=scene(limit);
 try{
  rotateDuringA(s);
  const blocker=s.budget.reserve({category:'construction',bytes:limit-P-ticket+1,precision:'exact',identity:{}},{label:'other owner'});
  pending(()=>s.compile('b'));
  assert.equal(s.owner.stats.budget.waitingForAvailability,true,'another owner keeps the ticket out');
  assert.equal(s.workspace.preparedSourceStats.budget.ownedBytesEstimate,0,'the waiting workspace holds nothing');assert.deepEqual(workspaceRows(s.budget),[]);
  assert.equal(s.budget.stats.bytes,blocker.bytes+P,'the ledger holds only the other owner beside held program A');assert.equal(heldProgramBytes(s.budget),P);
  blocker.release();assert.equal(s.owner.stats.budget.waitingForAvailability,false,'the release woke the waiting owner');
  pending(()=>s.compile('b'));s.t.all();assert(s.compile('b').program);
 }finally{assert.equal(s.close(),0);}
});

test('an entry in use is never retired: a reentrant ticket in its build or specialization leaves it, and later families reuse it',()=>{
 const s=scene();
 try{
  s.hooks.build=()=>{s.ticket('b');assert.equal(s.workspace.preparedSourceStats.replacements,0,'the building attempt is kept');};
  s.ready('a',[1]);assert.equal(s.hooks.build,undefined,'the reentrant ticket ran inside the build');
  rotateDuringA(s,[2]);
  s.ready('a',[3]);
  const stats=s.workspace.preparedSourceStats;
  assert.deepEqual([stats.builds,stats.hits,stats.replacements,stats.sourceCharacters],[1,2,0,SOURCES.a.length],'one build; both later families hit entry A');
 }finally{assert.equal(s.close(),0);}
});

test('a ticket of the matching recipe keeps its entry: repeated polls and later families reuse the one base',()=>{
 const s=scene();
 try{
  s.ready('a',[1]);
  for(let poll=0;poll<4;poll++)s.ticket('a',[2+poll%2]);
  s.ready('a',[2]);s.ready('a',[3]);
  const stats=s.workspace.preparedSourceStats;
  // counts.clears is the facade scratch cleanup after the one build.
  assert.deepEqual([stats.builds,stats.hits,stats.replacements,stats.clears,s.counts.clears],[1,2,0,0,1]);
 }finally{assert.equal(s.close(),0);}
});

test('describing other queued recipes preserves the current base and later matching families hit it',()=>{
 const s=scene();try{
  s.ready('a');const before=s.workspace.preparedSourceStats,bytes=s.budget.stats.bytes,clears=s.counts.clears;
  for(let poll=0;poll<32;poll++){s.ticket('b',[poll]);s.ticket('c',[poll]);s.ticket('a',[poll]);}
  assert.equal(s.budget.stats.bytes,bytes);assert.equal(s.counts.clears,clears);
  assert.deepEqual(s.workspace.preparedSourceStats,before,'polling neither clears, builds, nor changes the owned workspace');
  s.ready('a',[2]);assert.deepEqual([s.workspace.preparedSourceStats.builds,s.workspace.preparedSourceStats.hits,s.workspace.preparedSourceStats.replacements],[1,1,0]);
 }finally{assert.equal(s.close(),0);}
});

test('a real recipe switch retires the previous base only when prepareSource starts',()=>{
 const s=scene();try{
  s.ready('a');const idleEntry=s.budget.stats.bytes-P,before=s.workspace.preparedSourceStats,clears=s.counts.clears,controller=new AbortController();let woke=0;
  s.budget.onAvailable(()=>{woke++;},controller.signal);
  const ticket=s.ticket('b');assert(idleEntry>0);assert.equal(s.budget.stats.bytes,P+idleEntry);assert.equal(s.counts.clears,clears);assert.equal(woke,0);
  assert.deepEqual(s.workspace.preparedSourceStats,before);
  const admitted=s.budget.reserve([{category:'program-source',bytes:ticket.sourceBytesUpperBound,precision:'estimate',identity:{}},...ticket.workspaceCosts],{label:'test ticket'}),charged=s.budget.stats.bytes;
  const result=s.workspace.prepareSource(sourceRecipe('b'),[1]);assert.equal(result.fragment,SOURCES.b);assert.equal(s.budget.stats.bytes,charged,'the actual replacement shares its admitted allocation identities');
  admitted.release();controller.abort();const stats=s.workspace.preparedSourceStats;
  assert.deepEqual([stats.builds,stats.replacements,stats.clears],[2,1,1]);
 }finally{assert.equal(s.close(),0);}
});

test('release during actual replacement aborts production, not its earlier pure description',()=>{
 const s=scene();try{
  s.ready('a');const controller=new AbortController();s.budget.onAvailable(()=>{controller.abort();s.workspace.release();},controller.signal);
  s.ticket('b');assert.equal(s.workspace.preparedSourceStats.released,false);
  assert.throws(()=>s.workspace.prepareSource(sourceRecipe('b'),[1]),{name:'AbortError'});
  assert.equal(s.workspace.preparedSourceStats.released,true);assert.equal(s.budget.stats.bytes,P);assert.equal(heldProgramBytes(s.budget),P);
 }finally{assert.equal(s.close(),0);}
});

test('releasing a workspace unbinds its pressure listener and cleanup preserves reentrant newer entries',()=>{
 const s=scene();try{
  s.ready('a');const listeners=s.pressureListeners.size;assert(listeners>0);
  // clearState detaches the old entry before scratch cleanup. A callback may
  // synchronously install B; the retiring A claim must not clear or free B.
  s.hooks.clear=()=>s.workspace.prepareSource(sourceRecipe('b'),[1]);
  s.workspace.clearPreparedSource();assert.equal(s.workspace.preparedSourceStats.sourceCharacters,SOURCES.b.length);
  s.workspace.prepareSource(sourceRecipe('b'),[2]);assert.equal(s.workspace.preparedSourceStats.hits,1);
  s.workspace.release();assert.equal(s.pressureListeners.size,listeners-1);s.workspace.release();assert.equal(s.pressureListeners.size,listeners-1);
 }finally{assert.equal(s.close(),0);}
});

test('real pressure cannot reclaim an active source, and its last use wakes the blocked capacity boundary once',()=>{
 const s=scene(),waiting=new AbortController();s.budget.onAvailable(()=>{},waiting.signal);try{
  const before=s.budget.stats.reclaimableEvents;
  s.hooks.specialize=()=>{
   const stats=s.workspace.preparedSourceStats;
   const attempt=s.budget.tryReserve({category:'metadata',bytes:s.budget.stats.availableBytes+1,precision:'exact',identity:{},label:'blocked during source specialization'});
   assert.equal(attempt.ok,false);assert.equal(s.workspace.preparedSourceStats.sourceCharacters,SOURCES.a.length);assert.equal(s.workspace.preparedSourceStats.clears,stats.clears,'the active source is not pressure-evicted');
  };
  s.ready('a');assert.equal(s.budget.stats.reclaimableEvents,before+1);
  const idle=s.budget.stats.reclaimableEvents;for(let i=0;i<8;i++)s.ticket('b');assert.equal(s.budget.stats.reclaimableEvents,idle,'queued descriptions do not emit repeated availability wakes');
 }finally{waiting.abort();assert.equal(s.close(),0);}
});

test('an unmetered workspace still refuses program preflight and keeps its entry',()=>{
 const workspace=createPreparedSourceWorkspace({current:()=>true,build:recipe=>SOURCES[recipe.sourceKey],specialize:source=>({fragment:source,depthEffects:false})});
 try{
  workspace.prepareSource(sourceRecipe('a'),[1]);
  assert.throws(()=>workspace.programBudget(sourceRecipe('b'),VERTEX,ATTRIBUTES,[1]),/requires the page ResourceBudget/);
  assert.equal(workspace.preparedSourceStats.sourceCharacters,SOURCES.a.length);assert.equal(workspace.preparedSourceStats.replacements,0);
 }finally{workspace.release();}
});
