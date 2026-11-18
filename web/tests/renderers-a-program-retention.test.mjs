// Bremen and infill keep exact linked shared programs in the page's recent
// set on the two fallback paths (DECISIONS 2026-11-02 01:35; second-wave
// scheduler-program-retention fix CDR[0]/[1]; S2 managers CDR[7]):
//  - a readiness timeout: the manager's clearFailedHandoff calls
//    renderer.cancelCandidate(generation);
//  - an automatic 2D fallback: the manager sends setBatches([],generation,
//    {retainPrograms:true}).
// In production the manager calls setEnabled(false) before that empty batch
// (three-dimensional-map.ts clearFailedHandoff and requestMode('2d')), and
// setEnabled(false) itself discards the candidate, cancels shared preparation
// and detaches the facade programs; so the fallback marks both calls
// (setEnabled(false,{retainPrograms:true}) then the empty batch), and the
// production-order cases below replay exactly that sequence. The cancel above
// runs on any non-abort failed handoff, not only a timeout; each ends in the
// automatic 2D fallback.
// A plain empty batch (setBatches([],generation)), any other reason value and
// the renderer's own releases (context loss, replacement) keep the default
// deletion. The compositor releases the recent set per bound context on
// destroy (painted-map.ts releaseRecentPrograms). Production functions are
// evaluated in a fixture scope whose program owner records each call. Bremen
// explicit mode visits now carry retainMainPrograms:true; focused cases below
// check that separate main-only policy with the real shared program store.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceFile,install} from './support/renderers-a-scope.mjs';
import {budgets,driver,programs,stores,turns} from './support/core-stats-prepared-runtime.mjs';

const RETAIN={retainRecent:true};
function programOwner(){
 const calls=[];const option=rest=>rest.length?rest[0]:'default';
 return{calls,
  releaseProgram(_context,program,...rest){calls.push(['release',program.id,option(rest)]);},
  prune(...rest){calls.push(['prune',option(rest)]);},
  cancel(...rest){calls.push(['cancel',option(rest)]);},
  work(){},compile(){},acquireReadyProgram(){},
 };
}
const program=id=>({id});
const releases=calls=>calls.filter(([kind])=>kind==='release');
const options=calls=>[...new Set(calls.map(call=>JSON.stringify(call.at(-1))))].sort();

function bremenFixture({gl={isContextLost:()=>false},owner=programOwner()}={}){
 const file=sourceFile('bremen');
 const values={gl,map:{repaints:0,triggerRepaint(){this.repaints++;}},programPreparation:owner,destroyed:false,generation:0,candidateSequence:0,pendingCandidate:undefined,candidateFailureGeneration:undefined,
  candidateGrantHandoff:{clear(){},matches:()=>false,replace(){}},sceneChunks:[],captureDemands:new Map(),heldCaptureDemandKeys:new Set(),partitionFailures:new Map(),
  partitionVisibleKeys:['k1'],partitionPrograms:new Map([['k1',program('partition')]]),program:program('main'),texturedProgram:program('window'),diffuseProgram:program('diffuse'),
  enabled:false,facadeAttached:false,landmarkVisible:false,pageHidden:false,paintMode:()=>1,residentMaterialStyles:[],viewRevision:0};
 install(file,values,{variables:['retainProgramsRequested','retainMainProgramsRequested','releaseOwnedProgram','mainProgramRevisitEligible'],functions:['releaseInactivePaintProgram','prepareMainPrograms','geometryProgramConsumer','releaseMainProgramsForRevisit','forgetCaptureRole','releaseCandidatePrograms','discardPendingCandidate','cancelCandidate','clearResidentCPU','releaseGPU','syncFacadeResources'],methods:['setBatches','setEnabled']});
 const candidate=(generation=1,facadeWanted=false)=>({generation,context:gl,program:program('candidate-main'),windowProgram:program('candidate-window'),diffuseProgram:program('candidate-diffuse'),colourPrograms:new Map([['c1',program('candidate-colour')]]),plan:{release(){}},chunks:[],signal:undefined,abort(){},mainLandmark:facadeWanted});
 return{values,owner,candidate};
}
function infillFixture(){
 const file=sourceFile('infill'),gl={isContextLost:()=>false},owner=programOwner();
 const values={gl,map:{repaints:0,triggerRepaint(){this.repaints++;}},programPreparation:owner,destroyed:false,generation:0,pendingCandidate:undefined,candidateFailureGeneration:undefined,programHandoffRevision:0,
  clearProgramGrantHandoff(){return values.programHandoffRevision;},programGrantHandoff:{matches:()=>false},packingCandidate:undefined,residentProgramPlan:undefined,createRathausProxyMasks:()=>({configure(){},detach(){}}),
  sceneChunks:[],captureDemands:new Map(),heldCaptureDemandKeys:new Set(),partitionFailures:new Map(),
  partitionPrograms:new Map([['k1',program('partition')]]),program:program('main'),texturedProgram:program('window'),diffuseProgram:program('diffuse'),
  enabled:false,facadeAttached:false,landmarkVisible:false,pageHidden:false,paintMode:()=>1,viewRevision:0};
 install(file,values,{variables:['retainProgramsRequested','releaseOwnedProgram'],functions:['releaseCandidatePrograms','discardPendingCandidate','cancelCandidateGeneration','clearResidentBatches','releaseGPU','queueBatches','packBatches','syncFacadeResources'],methods:['setEnabled']});
 const candidate=(generation=1,facadeWanted=false)=>({generation,context:gl,program:program('candidate-geometry'),mainContext:gl,mainPrograms:new Map([['k1',program('candidate-colour')]]),plan:{release(){}},chunks:[],signal:undefined,abort(){},mainTextureWanted:facadeWanted});
 return{values,owner,candidate,setBatches:(...args)=>values.queueBatches(...args),cancelCandidate:generation=>values.cancelCandidateGeneration(generation)};
}
const FIXTURES={
 bremen:()=>{const f=bremenFixture();return{...f,setBatches:(...args)=>f.values.setBatches(...args),cancelCandidate:generation=>f.values.cancelCandidate(generation)};},
 infill:infillFixture,
};

for(const provider of ['bremen','infill']){
 test(`${provider}: a readiness-timeout cancel keeps the candidate's linked programs in the recent set`,()=>{
  const f=FIXTURES[provider]();f.values.pendingCandidate=f.candidate(3);
  f.cancelCandidate(3);
  assert.equal(f.values.pendingCandidate,undefined);
  const calls=f.owner.calls;
  assert.ok(releases(calls).length>=2,'every candidate program is released');
  assert.deepEqual(options(releases(calls)),[JSON.stringify(RETAIN)],'each with retainRecent');
  assert.deepEqual(calls.filter(([kind])=>kind==='prune'),[['prune',RETAIN]],'pending shared demands complete into the recent set');
  assert.equal(calls.some(([kind])=>kind==='cancel'),false);
 });

 test(`${provider}: a cancel for another generation releases nothing`,()=>{
  const f=FIXTURES[provider]();f.values.pendingCandidate=f.candidate(3);
  f.cancelCandidate(2);
  assert.ok(f.values.pendingCandidate);assert.deepEqual(f.owner.calls,[]);
 });

 test(`${provider}: the automatic 2D fallback (setBatches([],g,{retainPrograms:true})) retains resident and pending programs`,()=>{
  const f=FIXTURES[provider]();f.values.pendingCandidate=f.candidate(1);
  f.setBatches([],2,{retainPrograms:true});
  assert.equal(f.values.generation,2);assert.equal(f.values.pendingCandidate,undefined);
  const calls=f.owner.calls,released=releases(calls).map(([,id])=>id).sort();
  for(const id of ['partition','main','window','diffuse'])assert.ok(released.includes(id),id+' is released');
  assert.ok(released.some(id=>id.startsWith('candidate-')),'the pending candidate programs are released too');
  assert.deepEqual(options(calls),[JSON.stringify(RETAIN)],'every release, cancel and prune keeps exact linked programs');
  assert.ok(calls.some(([kind])=>kind==='cancel'),'resident preparation is cancelled into the recent set');
 });

 for(const [label,args] of [['an explicit 2D switch (setBatches([],g))',[]],['a reason without retainPrograms:true',[{retainPrograms:false}]],['a non-boolean reason',[{retainPrograms:'yes'}]]]){
  test(`${provider}: ${label} keeps the default deletion`,()=>{
   const f=FIXTURES[provider]();f.values.pendingCandidate=f.candidate(1);
   f.setBatches([],2,...args);
   assert.equal(f.values.generation,2);
   const calls=f.owner.calls,released=releases(calls).map(([,id])=>id);
   for(const id of ['partition','main','window','diffuse'])assert.ok(released.includes(id),id+' is released');
   assert.deepEqual(options(calls),[JSON.stringify('default')],'no call asks to retain');
  });
 }

 test(`${provider}: the renderer's own GPU release (context loss/replacement) keeps the default deletion`,()=>{
  const f=FIXTURES[provider]();
  f.values.releaseGPU();
  assert.deepEqual(options(f.owner.calls),[JSON.stringify('default')]);
  assert.ok(releases(f.owner.calls).length>=4);
 });

 // Production order (review RA-1/RA-3): the manager disables the renderer
 // before it sends the empty batch, so a fallback must reach setEnabled too.
 const attached=f=>{f.values.enabled=true;f.values.facadeAttached=true;return f;};
 const RETAINED_IDS=['partition','main','window','diffuse'];
 test(`${provider}: production-order automatic 2D fallback (setEnabled(false,{retainPrograms:true}) then setBatches) retains candidate, facade, resident and pending programs`,()=>{
  const f=attached(FIXTURES[provider]());f.values.pendingCandidate=f.candidate(1);
  f.values.setEnabled(false,{retainPrograms:true});
  assert.equal(f.values.enabled,false);assert.equal(f.values.facadeAttached,false);assert.equal(f.values.pendingCandidate,undefined);
  assert.equal(f.values.texturedProgram,undefined);assert.equal(f.values.diffuseProgram,undefined);
  f.setBatches([],2,{retainPrograms:true});
  const calls=f.owner.calls,released=releases(calls).map(([,id])=>id);
  for(const id of RETAINED_IDS)assert.ok(released.includes(id),id+' is released');
  assert.ok(released.some(id=>id.startsWith('candidate-')),'the pending candidate programs are released');
  assert.deepEqual(options(calls),[JSON.stringify(RETAIN)],'no step of the fallback deletes a program: '+JSON.stringify(calls));
  assert.ok(calls.some(([kind])=>kind==='cancel'),'shared preparation is cancelled into the recent set');
 });

 test(`${provider}: production-order failed handoff (cancelCandidate, setEnabled(false,{retainPrograms:true}), setBatches) retains every program`,()=>{
  const f=attached(FIXTURES[provider]());f.values.pendingCandidate=f.candidate(4);
  f.cancelCandidate(4);f.values.setEnabled(false,{retainPrograms:true});f.setBatches([],5,{retainPrograms:true});
  const calls=f.owner.calls,released=releases(calls).map(([,id])=>id);
  for(const id of RETAINED_IDS)assert.ok(released.includes(id),id+' is released');
  assert.ok(released.some(id=>id.startsWith('candidate-')));
  assert.deepEqual(options(calls),[JSON.stringify(RETAIN)],JSON.stringify(calls));
 });

 test(`${provider}: a failed-handoff cancel retains facade programs attached only for that candidate`,()=>{
  const f=attached(FIXTURES[provider]());f.values.pendingCandidate=f.candidate(6,true);
  f.cancelCandidate(6);
  assert.equal(f.values.facadeAttached,false,'the facade detaches once the candidate no longer wants it');
  const released=releases(f.owner.calls).map(([,id])=>id);
  assert.ok(released.includes('window')&&released.includes('diffuse'),JSON.stringify(f.owner.calls));
  assert.deepEqual(options(f.owner.calls),[JSON.stringify(RETAIN)],JSON.stringify(f.owner.calls));
 });

 for(const [label,disable,batch] of [
  ['production-order explicit 2D switch (setEnabled(false) then setBatches([],g))',[],[]],
  ['setEnabled(false,{retainPrograms:false}) then an explicit empty batch',[{retainPrograms:false}],[]],
  ['setEnabled(false) with a non-boolean reason',[{retainPrograms:'yes'}],[]],
 ]){
  test(`${provider}: ${label} keeps the default deletion`,()=>{
   const f=attached(FIXTURES[provider]());f.values.pendingCandidate=f.candidate(1);
   f.values.setEnabled(false,...disable);f.setBatches([],2,...batch);
   const calls=f.owner.calls,released=releases(calls).map(([,id])=>id);
   for(const id of RETAINED_IDS)assert.ok(released.includes(id),id+' is released');
   assert.deepEqual(options(calls),[JSON.stringify('default')],JSON.stringify(calls));
  });
 }

 test(`${provider}: page hide or suspend (setEnabled(false) alone) keeps the default deletion and ignores a retain reason on enable`,()=>{
  const f=attached(FIXTURES[provider]());f.values.pendingCandidate=f.candidate(1,true);
  f.values.setEnabled(false);
  assert.deepEqual(options(f.owner.calls),[JSON.stringify('default')],JSON.stringify(f.owner.calls));
  const before=f.owner.calls.length;f.values.setEnabled(true,{retainPrograms:true});
  assert.equal(f.values.enabled,true);
  assert.deepEqual(f.owner.calls.slice(before).filter(([kind])=>kind!=='work'),[],'enabling releases nothing');
 });
}


test('Bremen explicit short 2D visits retain only the last actual main roles, and cancel pending/capture roles normally',()=>{
 const f=bremenFixture();Object.assign(f.values,{enabled:true,facadeAttached:true,landmarkVisible:true,paintMode:()=>1});f.values.pendingCandidate=f.candidate(2);
 f.values.partitionPrograms.set('capture',program('capture-only'));
 f.values.setEnabled(false,{retainMainPrograms:true});f.values.setBatches([],3,{retainMainPrograms:true});
 const held=releases(f.owner.calls).filter(row=>row[2]!== 'default').map(row=>row[1]).sort();
 assert.deepEqual(held,['diffuse','main','partition','window']);
 const dropped=releases(f.owner.calls).filter(row=>row[2]=== 'default').map(row=>row[1]);
 assert(dropped.includes('capture-only'));assert(dropped.some(id=>id.startsWith('candidate-')));
 assert.ok(f.owner.calls.filter(row=>row[0]==='cancel'||row[0]==='prune').every(row=>row.at(-1)==='default'),'unfinished capture/producer work is cancelled without retention');
 assert.equal(f.values.partitionPrograms.size,0);assert.equal(f.values.program,undefined);
});

test('Bremen viewport retirement retains only linked programs that passed through actual main preparation',()=>{
 const f=bremenFixture(),v=f.values,main=program('visible-colour'),capture=program('capture-only'),target={plan:{partitionEnabled:true},program:program('base'),colourPrograms:new Map([['main',main],['capture',capture]])};
 Object.assign(v,{matrix:new Float64Array(16),candidateMainProjection:new Float64Array(16),paintMode:()=>2,mainPaintKeys:()=>new Set(['main']),capturePaintKeys:()=>new Set(['capture']),mainProgramRevisitEligible:v.mainProgramRevisitEligible,candidateMainViewStamp:()=>'view',prepareBremenMasks:()=>({ready:true}),sceneChunks:[],baseSurfaceFragment:'base helper'});
 assert.equal(v.prepareMainPrograms(target,v.gl,()=>true),true);assert(v.mainProgramRevisitEligible.has(main));assert.equal(v.mainProgramRevisitEligible.has(capture),false);
 v.mainPaintKeys=()=>new Set();v.capturePaintKeys=()=>new Set();assert.equal(v.prepareMainPrograms(target,v.gl,()=>true),true);
 assert.deepEqual(releases(f.owner.calls),[['release','visible-colour',RETAIN],['release','capture-only','default']]);assert.equal(target.colourPrograms.size,0);
});

test('Bremen current exact recipe separates live main demand from capture-only demand across candidate and resident',()=>{
 const f=bremenFixture(),v=f.values,authority={},plan={released:false,programSourceInputs:['city','bremen'],programSourceProvenance:[authority]},args=[plan.programSourceInputs,plan.programSourceProvenance,'main',false,[]];
 Object.assign(v,{enabled:true,paintMode:()=>2,partitionEnabled:true,residentProgramPlan:plan,currentDataScope:{stats:{disposed:false}},mainPaintKeys:()=>new Set(['main']),capturePaintKeys:()=>new Set(['capture']),pendingCandidate:undefined});
 assert.equal(v.geometryProgramConsumer(...args,true),plan);assert.equal(v.geometryProgramConsumer(...[...args.slice(0,2),'capture',false,[]],true),undefined);assert.equal(v.geometryProgramConsumer(...[...args.slice(0,2),'capture',false,[]]),plan);
 v.pendingCandidate={plan,scope:{stats:{disposed:false}},requiredKeys:new Set(['capture'])};assert.equal(v.geometryProgramConsumer(...[...args.slice(0,2),'capture',false,[]],true),plan,'an exact candidate main demand keeps capture polling visible');
 v.pendingCandidate.requiredKeys.clear();v.pendingCandidate.requiredCaptureKeys=new Set(['capture']);assert.equal(v.geometryProgramConsumer(...[...args.slice(0,2),'capture',false,[]],true),undefined,'only capture remains live after the candidate main role leaves');assert.equal(v.geometryProgramConsumer(...[...args.slice(0,2),'capture',false,[]]),plan);
});

test('Bremen main-only 2D exit and exact warm return reuse actual linked programs under the existing page recent budget',()=>{
 const t=turns(),d=driver(),budget=budgets.createResourceBudget({limitBytes:16*1024**2,recentLimitBytes:4*1024**2}),store=stores.createChunkResourceStore({budget});stores.bindChunkResourceContext(d.gl,store);
 const owner=programs.createProgramPreparationOwner('bremen recent fixture',()=>{}),f=bremenFixture({gl:d.gl,owner}),builds=new Map(),vertex='attribute vec3 a_position;void main(){gl_Position=vec4(a_position,1.);}',fragment='precision mediump float;void main(){gl_FragColor=vec4(1.);}',authority=programs.createProgramSourceAuthority({inputs:['bremen-main-only-recent-fixture-v1'],builders:[bremenFixture]});
 const recipe=key=>({resource:key,sharedKey:'bremen-main-only-recent-fixture',inputs:[key,vertex,fragment],provenance:[authority],budget:{sourceBytesUpperBound:2048},build(){builds.set(key,(builds.get(key)??0)+1);return{vertex,fragment,attributes:['a_position']};}});
 const compile=key=>{assert.throws(()=>owner.compile(d.gl,recipe(key)),programs.isProgramPreparationPending);t.all();return owner.compile(d.gl,recipe(key));};
 try{
  const base=compile('base'),colour=compile('main-colour'),capture=compile('capture-colour');
  Object.assign(f.values,{enabled:true,paintMode:()=>2,program:base,texturedProgram:undefined,diffuseProgram:undefined,partitionVisibleKeys:['main'],partitionPrograms:new Map([['main',colour],['capture',capture]])});
  f.values.setEnabled(false,{retainMainPrograms:true});f.values.setBatches([],2,{retainMainPrograms:true});t.all();store.collectRetired();
  assert.equal(owner.stats.recent.entries,2);assert.equal(owner.stats.recent.ownerDefault,false);assert.equal(owner.stats.shared.heldReferences,0);assert(d.deleted.includes(capture));assert(!d.deleted.includes(base)&&!d.deleted.includes(colour));
  assert(budget.stats.recentBytes<=budget.stats.recentLimitBytes);
  const a=owner.compile(d.gl,recipe('base')),b=owner.compile(d.gl,recipe('main-colour'));assert.equal(a,base);assert.equal(b,colour);assert.equal(builds.get('base'),1);assert.equal(builds.get('main-colour'),1);assert.equal(owner.stats.recent.ownerHits,2,'return consumes the exact linked cache without new work');
  owner.releaseProgram(d.gl,a,{retainRecent:true});owner.releaseProgram(d.gl,b,{retainRecent:true});t.all();
  // Ordinary pressure is still allowed to evict both revisit programs.
  const pressure=budget.tryReserve({category:'metadata',bytes:budget.stats.availableBytes+budget.stats.recentBytes,precision:'exact',identity:{}});assert.equal(owner.stats.recent.entries,0);t.all();store.collectRetired();if(pressure.ok)pressure.reservation.release();else assert.equal(pressure.error.name,'ResourceBudgetExceededError','retiring GPU allowances remain charged until their fence');
 }finally{owner.dispose();programs.releaseRecentPrograms(d.gl);t.all();store.destroy();store.collectRetired();t.restore();assert.equal(budget.stats.bytes,0);}
});
