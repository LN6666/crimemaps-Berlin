import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Execute the production candidate and manager boundaries. Tiny resident data
// replaces asset construction; no browser, driver, provider graph or model runs.
// These AST callbacks prove candidate/manager boundaries, not a complete main
// draw or recovery witness; whole-module renderer tests own that positive proof.
function production(relative,names){
 const path=new URL('../src/'+relative,import.meta.url),text=fs.readFileSync(path,'utf8'),ast=ts.createSourceFile(path.pathname,text,ts.ScriptTarget.Latest,true),found=new Map();
 assert.equal(ast.parseDiagnostics.length,0);
 (function visit(node){if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))found.set(node.name.text,node.getText(ast).replace(/^export\s+/,''));if(ts.isVariableDeclaration(node)&&names.includes(node.name?.text)&&node.initializer)found.set(node.name.text,'const '+node.name.text+'='+node.initializer.getText(ast)+';');ts.forEachChild(node,visit);})(ast);
 for(const name of names)assert(found.has(name),name+' exists in production');
 const code=ts.transpileModule([...found.values()].join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 return env=>Function('env','with(env){'+code+';return {'+names.join(',')+'};}')(new Proxy(env,{has:()=>true,get(target,key){if(key===Symbol.unscopables)return undefined;if(key in target)return target[key];if(key in globalThis)return globalThis[key];throw Error('Missing candidate fixture binding: '+String(key));},set:(target,key,value)=>(target[key]=value,true)}));
}
// releaseOwnedProgram, releaseBremenChunks and prepareBremenMasks are the actual chunk-residency helpers
// these candidate paths now call (renderers-a CDR[3]); they run as production code too.
const renderer=production('painted/bremen/safety/building-mesh-renderer.ts',['releaseOwnedProgram','mainProgramRevisitEligible','releaseInactivePaintProgram','releaseBremenChunks','prepareBremenMasks','candidateCurrent','candidateMainViewStamp','prepareMainPrograms','prepareCandidateMain','prepareCandidate','releaseCandidatePrograms','discardPendingCandidate','cancelCandidate','clearAbandonedCandidateFailure']);
const manager=production('painted/bremen/safety/three-dimensional-map.ts',['clearRequiredSolarCoverage','restoreReadyHandoff','clearFailedHandoff']);
// Keep the entire exported handoff factory and its actual lexical initialization.
// Renderer factory initialization is exercised separately by the complete-factory suite.
const createProgramGrantHandoff=production('safety/render-runtime/program-grant-handoff.ts',['createProgramGrantHandoff'])({}).createProgramGrantHandoff;
const identity=()=>new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const pending=Error('pending program');
function fixture({deferUpload=false}={}){
 const old={anchor:[9,8],anchorUnit:3,matrix:identity(),residentMaterialStyles:[0],landmarkVisible:false,rathausProxyMasks:{old:true},sceneChunks:[]},candidateMasks={prepare:()=>({ready:true}),cancelPending(){this.cancelled=(this.cancelled??0)+1;},detach(){this.detached=true;},destroy(){this.destroyed=true;}},queued=[],released=[],calls={upload:0,publish:0,mask:0,repaint:0,compileKeys:[]};
 const context={isContextLost:()=>false},candidate={id:2,generation:2,scope:{stats:{disposed:false}},plan:{identity:'new-plan',partitionEnabled:true,release(){this.released=true;}},sourcePrepared:true,indexCount:3,geometry:{indices:new Uint32Array([0,1,2])},program:{base:true},context};
 const env={...old,pendingCandidate:candidate,candidateFailure:undefined,candidateFailureGeneration:undefined,mainGeometryProgramFailure:undefined,partitionCompileAttempt:undefined,transientResidentScope:undefined,destroyed:false,pageHidden:false,gl:context,candidateMainProjection:identity(),required:['one','two'],captureKeys:[],readyCapture:new Map(),blocked:'two',windowTexture:undefined,diffuseTexture:undefined,surfaceFragment:undefined,diffuseFragment:undefined,baseSurfaceFragment:'base',map:{triggerRepaint(){calls.repaint++;}},paintMode:()=>2,paintOverride:()=>0,
  snapshotResident(){const saved=Object.fromEntries(Object.keys(old).map(key=>[key,env[key]]));return{restore(){Object.assign(env,saved);}};},
  multiply(a,b){const out=new Float64Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;},
  mainPaintKeys(){assert.equal(env.matrix[12],.1,'candidate uses its anchor, never the old local matrix');return new Set(env.required);},capturePaintKeys:()=>new Set(env.captureKeys),solarResidentKeys:()=>new Set([...env.required,...env.captureKeys]),familySource:key=>({sourceKey:key,families:[1]}),pruneFamilySource:()=>false,
  compileGeometryProgram(_helper,key){calls.compileKeys.push(key);if(key===env.blocked)throw pending;return{key};},isProgramPreparationPending:error=>error===pending,
  acquireGeometryProgram(_helper,key){calls.acquire=(calls.acquire??0)+1;return env.readyCapture.get(key);},
  syncFacadeResources(){},clearSettledProgramSources(){},releaseSupersededBatchScopes(){},paintSelection(){},retireShadowGeometry(){},
  geometryOwner:{currentGeometries:[{vao:{}}],upload(){calls.upload++;return{vao:{}};},contextLost(){calls.lost=(calls.lost??0)+1;}},publishBremenGeometry(_context,program,chunks){assert.equal(program,candidate.program);assert.equal(chunks,candidate.chunks);calls.upload++;},shadowGeometryOwner:{contextLost(){}},geometryResidentUploaded:true,publishCandidate(value){assert.equal(value,candidate);calls.publish++;},
  // The owner surface the production paths read: budget waits and the frame policy forward the
  // fixture owner's state (no held ledger wait in these cases).
  programPreparation:{budgetWaits:0,waitingForBudget:false,needsFrameAfter(before){return this.budgetWaits===before;},releaseProgram(_gl,value){released.push(value);},prune(){},work(_gl,request){if(deferUpload)queued.push(request.work);else request.work();return true;}},
 };
 env.candidateGrantHandoff=createProgramGrantHandoff((context,program)=>env.programPreparation.releaseProgram(context,program));
// Chunk residency: the candidate's masks belong to its packed chunk. The current production reads
// candidate.indexCount (set by finishPack; HEAD read candidate.geometry.indices.length, so a candidate
// without it is an empty candidate that publishes at once), the scene chunks its state restores
// (prepareBremenMasks walks sceneChunks) and uploads through publishBremenGeometry (src-r3b, R2
// fixtures CDR[8](3): an adaptation of this fixture, not a source change).
 candidate.chunks=[{masks:candidateMasks,cpu:{release(){}},state:{release(){}}}];
 candidate.state={masks:candidateMasks,chunks:candidate.chunks,restore(){Object.assign(env,{anchor:[.1,.2],anchorUnit:2,matrix:undefined,residentMaterialStyles:[1],landmarkVisible:false,rathausProxyMasks:candidateMasks,sceneChunks:candidate.chunks});}};
 const prepare=candidateMasks.prepare;candidateMasks.prepare=(...args)=>{calls.mask++;return prepare(...args);};
 const actual=renderer(env);Object.assign(env,actual);
 return{env,candidate,old,calls,queued,released,actual};
}

test('replacing an adjacent handoff retires older roles and preserves repeated references',()=>{
 const released=[],firstContext={},nextContext={},shared={},other={},next={},programs=[shared,shared,undefined,other];
 const holder=createProgramGrantHandoff((context,program)=>released.push([context,program]));
 holder.replace(firstContext,programs);assert.deepEqual(released,[]);programs.length=0;
 holder.replace(nextContext,[next]);assert.deepEqual(released,[[firstContext,shared],[firstContext,shared],[firstContext,other]]);
 holder.clear();holder.clear();assert.deepEqual(released,[[firstContext,shared],[firstContext,shared],[firstContext,other],[nextContext,next]]);
});

test('handoff cleanup reentry retires the new holder once without double-releasing old roles',()=>{
 const released=[],context={},old={},next={};let reentered=false,holder;
 holder=createProgramGrantHandoff((_context,program)=>{released.push(program);if(program===old&&!reentered){reentered=true;holder.clear();}});
 holder.replace(context,[old,old]);holder.replace(context,[next,next]);holder.clear();
 assert.equal(released.filter(value=>value===old).length,2);assert.equal(released.filter(value=>value===next).length,2);
});

test('unready main colour keeps the complete old resident and never uploads a replacement',()=>{
 const f=fixture();f.actual.prepareCandidate();
 assert.equal(f.calls.upload,0);assert.equal(f.calls.publish,0);assert.equal(f.calls.mask,0);
 assert.equal(f.env.anchor,f.old.anchor);assert.equal(f.env.matrix,f.old.matrix);assert.equal(f.env.rathausProxyMasks,f.old.rathausProxyMasks);
 assert.deepEqual([...f.candidate.colourPrograms.keys()],['one']);assert.equal(f.released.length,0);
 f.env.blocked=undefined;f.actual.prepareCandidate();
 assert.equal(f.calls.mask,1);assert.equal(f.calls.upload,1);assert.equal(f.calls.publish,1);
 assert.deepEqual([...f.candidate.colourPrograms.keys()],['one','two']);
});

test('all required main roles register in one pass and repeated polls retain ready grants',()=>{
 const f=fixture();f.env.required=['one','two','three'];f.env.blocked='one';
 f.actual.prepareCandidate();
 assert.deepEqual(f.calls.compileKeys,['one','two','three'],'a pending first role must not hide the remaining required roles');
 assert.deepEqual([...f.candidate.requiredKeys],['one','two','three']);
 const two=f.candidate.colourPrograms.get('two'),three=f.candidate.colourPrograms.get('three');assert(two);assert(three);
 f.actual.prepareCandidate();
 assert.deepEqual(f.calls.compileKeys,['one','two','three','one']);
 assert.equal(f.candidate.colourPrograms.get('two'),two);assert.equal(f.candidate.colourPrograms.get('three'),three);
 assert.equal(f.calls.upload,0);assert.equal(f.calls.publish,0);assert.equal(f.env.matrix,f.old.matrix);assert.equal(f.released.length,0);
 f.env.blocked=undefined;f.actual.prepareCandidate();
 assert.deepEqual(f.calls.compileKeys,['one','two','three','one','one']);
 assert.equal(f.candidate.colourPrograms.get('two'),two);assert.equal(f.candidate.colourPrograms.get('three'),three);
 assert.equal(f.calls.upload,1);assert.equal(f.calls.publish,1,'the replacement publishes only after every required role is ready');
});

test('a real failure after a pending role reaches the current candidate failure fence',()=>{
 const f=fixture();f.env.required=['one','two','three'];f.env.blocked='one';const failure=Error('current third colour failed'),compile=f.env.compileGeometryProgram;
 f.env.compileGeometryProgram=(helper,key)=>{if(key==='three')throw failure;return compile(helper,key);};
 f.actual.prepareCandidate();
 assert.match(String(f.env.candidateFailure),/current third colour failed/);
 assert.equal(f.env.candidateFailureGeneration,2);assert.equal(f.env.pendingCandidate,undefined);
 assert.equal(f.candidate.plan.released,true);assert.equal(f.calls.upload,0);assert.equal(f.calls.publish,0);
 assert.equal(f.env.anchor,f.old.anchor);assert.equal(f.env.matrix,f.old.matrix);assert.equal(f.env.rathausProxyMasks,f.old.rathausProxyMasks);
});

test('an upload admitted for a previous actual view cannot publish after the view changes',()=>{
 const f=fixture({deferUpload:true});f.env.blocked=undefined;f.actual.prepareCandidate();assert.equal(f.queued.length,1);
 f.env.candidateMainProjection[13]=.5;f.queued.shift()();assert.equal(f.calls.upload,0);assert.equal(f.calls.publish,0);
 f.actual.prepareCandidate();f.queued.shift()();assert.equal(f.calls.upload,1);assert.equal(f.calls.publish,1);
});

test('matching candidate cancellation releases every acquired reference without touching the old resident',()=>{
 const f=fixture();f.actual.prepareCandidate();const shared={sameProgram:true};f.candidate.windowProgram=shared;f.candidate.diffuseProgram=shared;
 f.actual.cancelCandidate(99);assert.equal(f.env.pendingCandidate,f.candidate);assert.equal(f.released.length,0);
 f.actual.cancelCandidate(2);assert.equal(f.env.pendingCandidate,undefined);assert.equal(f.candidate.plan.released,true);
 assert.equal(f.released.filter(value=>value===shared).length,2,'two grants on one shared object require two releases');
 assert.equal(f.calls.upload,0);assert.equal(f.calls.publish,0);assert.equal(f.env.anchor,f.old.anchor);assert.equal(f.env.rathausProxyMasks,f.old.rathausProxyMasks);
});

test('active offscreen capture only renews ready references and never blocks the main gate',()=>{
 const f=fixture();f.env.blocked=undefined;f.env.captureKeys=['offscreen-ready','offscreen-missing'];const ready={capture:true};f.env.readyCapture.set('offscreen-ready',ready);
 assert.equal(f.actual.prepareCandidateMain(f.candidate,f.env.gl),true);
 assert.equal(f.candidate.colourPrograms.get('offscreen-ready'),ready);assert.equal(f.candidate.colourPrograms.has('offscreen-missing'),false);assert.equal(f.calls.acquire,2);
 assert.equal(f.actual.prepareCandidateMain(f.candidate,f.env.gl),true);assert.equal(f.calls.acquire,3,'a held ready role is not granted again; only the remaining miss is queried');
 assert.deepEqual([...f.candidate.requiredKeys],['one','two']);assert.equal(f.calls.upload,0);
});

test('pending real texture pixels keep the old material until readiness or the original explicit optional failure',()=>{
 const f=fixture();f.env.required=[];f.env.blocked=undefined;f.env.paintMode=()=>1;f.env.surfaceFragment='windows';const stats={ready:false,loading:true,residentRevision:1,error:undefined};f.env.windowTexture={stats};
 const restore=f.candidate.state.restore;f.candidate.state.restore=()=>{restore();f.env.landmarkVisible=true;};
 const unions=[];f.env.syncFacadeResources=styles=>unions.push(styles);
 f.actual.prepareCandidate();assert.equal(f.calls.upload,0);assert.equal(f.calls.publish,0);assert.deepEqual(unions[0],[0]);assert.equal(f.env.rathausProxyMasks,f.old.rathausProxyMasks);
 stats.loading=false;stats.error='original optional image failure';f.actual.prepareCandidate();assert.equal(f.calls.upload,1);assert.equal(f.calls.publish,1);assert.equal(f.candidate.windowProgram,undefined,'terminal optional image failure retains the original sampler-free path');
});

test('context loss during mask preparation retains CPU candidate and old resident for recovery',()=>{
 const f=fixture();f.env.blocked=undefined;f.candidate.state.masks.prepare=()=>{f.env.gl.isContextLost=()=>true;return{ready:false,reason:'context-lost'};};
 f.actual.prepareCandidate();assert.equal(f.env.pendingCandidate,f.candidate);assert.equal(f.candidate.plan.released,undefined);assert.equal(f.env.candidateFailure,undefined);assert.equal(f.calls.publish,0);assert.equal(f.calls.upload,0);assert.equal(f.calls.lost,1);assert.equal(f.candidate.colourPrograms.size,0);assert.equal(f.env.anchor,f.old.anchor);
 f.env.gl.isContextLost=()=>false;f.candidate.state.masks.prepare=()=>({ready:true});f.actual.prepareCandidate();assert.equal(f.calls.upload,1);assert.equal(f.calls.publish,1);
});

function managerFixture({published=1,expected=2,ready=1,ticket=7,handoffTicket=7,currentTicket=ticket}={}){
 const cancelled=[],cleared=[];
 const env={revision:currentTicket,lastHandoffTicket:handoffTicket,lastHandoffGeneration:expected,lastReadyGeneration:ready,lastReadyState:undefined,clearedHandoffTicket:-1,mode:'3d',generation:expected,adoptedDetailResources:new Map(),renderer:{getRevision:()=>({generation:published}),cancelCandidate:value=>cancelled.push(value),setEnabled:value=>cleared.push(['enabled',value]),setBatches:(_rows,generation)=>cleared.push(['empty',generation])},s434Aggregate:{clear(){}},releaseAggregatePrepared(){},ownerRuntime:{clearResident(){}},ownerShapePatchMetadata:()=>({}),ownerReconstruction:{},options:{},selectedShardIds:['old'],visibleRetainedEstimateBytes:100};
 return{env,cancelled,cleared,run:()=>manager(env).clearFailedHandoff(ticket)};
}
test('registered but unpublished failure cancels its candidate and preserves the last successful resident',()=>{
 const f=managerFixture();f.run();assert.deepEqual(f.cancelled,[2]);assert.deepEqual(f.cleared,[]);assert.equal(f.env.mode,'3d');assert.equal(f.env.lastReadyGeneration,1);
});
test('same-ticket final failure preserves an earlier successful partial generation',()=>{
 const f=managerFixture({published:2,expected:2,ready:2});f.run();assert.deepEqual(f.cleared,[]);assert.equal(f.env.lastReadyGeneration,2);
});
test('only a matching genuinely published failed generation is cleared; a stale ticket cannot touch it',()=>{
 const stale=managerFixture({published:2,handoffTicket:8,currentTicket:8});stale.run();assert.deepEqual(stale.cancelled,[]);assert.deepEqual(stale.cleared,[]);
 const f=managerFixture({published:2,ready:1});f.run();assert.deepEqual(f.cleared,[['enabled',false],['empty',3]]);assert.equal(f.env.clearedHandoffTicket,7);assert.equal(f.env.mode,'2d');
});

 test('a current request failing before registration restores the actual successful resource witness',()=>{
 const f=managerFixture({handoffTicket:6});const owner={old:true},edge={old:true},resources=new Map([['leaf',{level:'near',key:'old-resource'}]]);
 f.env.lastReadyState={resources,owner,edge,shards:['old-ready'],retained:55};f.env.ownerReconstruction={unpublished:true};f.env.sourceEdgeAssemblyDisplay={unpublished:true};f.env.adoptedDetailResources.set('leaf',{key:'unpublished'});
 f.run();assert.deepEqual(f.cancelled,[]);assert.deepEqual(f.cleared,[]);assert.equal(f.env.ownerReconstruction,owner);assert.equal(f.env.sourceEdgeAssemblyDisplay,edge);assert.equal(f.env.adoptedDetailResources.get('leaf').key,'old-resource');assert.deepEqual(f.env.selectedShardIds,['old-ready']);assert.equal(f.env.visibleRetainedEstimateBytes,55);assert.equal(f.env.mode,'3d');
 });

// These are narrow production-callback boundary fixtures, not complete manager
// factories. Identical tiny inputs isolate duplicate suppression from packing.
function duplicatePackingFixture(provider,{publishedGeneration=3,mainReady=true}={}){
 const names=['repackS434','sameStageComponents',...(provider==='root500'?['sameSourceRoles']:[])],compile=production(`painted/${provider}/safety/three-dimensional-map.ts`,names),components=[{}],profile={},diagnostic={ready:true},nativePlan={groups:[{id:'old-ready'}]},adopted=[],scope={},prepared={scope},signal=new AbortController().signal,sourceRoles=[{}],packViewKey='same-actual-view',reached=Error(provider+' normal packing path reached'),calls={setBatches:0,normalPlan:0,validate:0};
 const chunkInput={fixture:'held chunk input',groups:[{components}]},packingComponents=chunkInput.groups.flatMap(group=>group.components),chosen=[{id:'leaf'}],detailBindings=new Map(),staged=[],keyCalls=[];prepared.chunkInput=chunkInput;
 const env={attempt:{isCurrent:()=>true,current(){}},publication:{isCurrent:()=>true},commitIsCurrent:()=>true,commitCurrent(){},destroyed:false,suspended:false,pageHidden:false,wantedMode:'3d',
  renderer:{isPickReady:()=>true,getDrawReadiness:()=>({ready:mainReady,preparing:!mainReady}),getRevision:()=>({generation:publishedGeneration,viewRevision:0}),setBatches(){calls.setBatches++;}},
  generation:3,lastS434PackedGeneration:3,s434Aggregate:{packing:()=>({profile,diagnostic})},lastPackedComponents:components,components,packingComponents,lastPackedAggregateProfile:profile,lastPackedAggregateDiagnostic:JSON.stringify(diagnostic),duplicatePackSkips:0,
  prepared,residentPreparation:prepared,scope,signal,batchSignal:signal,commitSignal:signal,packedArgs:[],city:provider,sourceRoles,lastPackedSourceRoles:sourceRoles,packViewKey,lastPackedViewKey:packViewKey,published:false,lastRegistered:undefined,
  rememberPublishedDetails(){},validateDetail(){calls.validate++;},shown:['leaf'],drawTarget:{registered:false,current:'current-draw-target'},nativePlan,adoptDetail:(shown,generation)=>adopted.push([shown,generation]),
  // Chunk residency: duplicate-ready adoption also names the published source resources and stages the
  // held chunk input for the adopted generation. The manager's key and staging helpers are recorded here.
  chosen,detailBindings,cachedPrepared:prepared,sourceResourceKeys:(...args)=>{keyCalls.push(args);return['leaf-resource'];},stageExplicitSources:(...args)=>staged.push(args),
  // A sentinel at the first normal packing operation proves the actual callback
  // crossed its guard. No replacement is registered or adopted by this fixture.
  s036NorthCofacePlan(rows){assert.strictEqual(rows,packingComponents,'normal packing consumes the outer complete source-group selection');calls.normalPlan++;throw reached;},
 };
 const actual=compile(env);Object.assign(env,actual);
 return{env,nativePlan,adopted,calls,reached,staged,keyCalls,chunkInput,chosen,detailBindings,run:()=>actual.repackS434()};
}

for(const provider of ['bremen','root500','infill']){
 test(`${provider}: duplicate-ready publication reuses only the actual published main-ready generation`,async()=>{
  const f=duplicatePackingFixture(provider);await f.run();
  assert.equal(f.env.drawTarget.generation,3);assert.equal(f.env.drawTarget.registered,true);assert.equal(f.env.duplicatePackSkips,1);assert.deepEqual(f.adopted,[[['leaf'],3]]);assert.equal(f.calls.normalPlan,0);assert.equal(f.calls.setBatches,0);assert.equal(f.env.generation,3);
  assert.deepEqual(f.env.drawTarget.sourceResourceKeys,['leaf-resource']);assert.equal(f.keyCalls.length,1);assert.deepEqual(f.keyCalls[0][0],['leaf']);assert.equal(f.keyCalls[0][1],f.chosen);assert.equal(f.keyCalls[0][2],f.detailBindings);
  assert.deepEqual(f.staged,[[f.chunkInput,3,'current-draw-target']],'the adopted generation stages the held chunk input once');
  if(provider==='bremen')assert.equal(f.env.drawTarget.nativePlan,f.nativePlan,'the successful Bremen native-plan witness follows duplicate-ready adoption');
  else assert.equal(f.env.lastRegistered,f.env.drawTarget);
 });
 test(`${provider}: old pick-ready allocation cannot skip registration of an unpublished packed generation`,async()=>{
  const f=duplicatePackingFixture(provider,{publishedGeneration:2});
  // Legacy picking and main readiness describe resident A=2; packed B=3 is
  // still unpublished. The actual generation equality must reject the skip.
  await assert.rejects(async()=>f.run(),error=>error===f.reached);
  assert.equal(f.calls.normalPlan,1);assert.equal(f.calls.setBatches,0);assert.equal(f.env.duplicatePackSkips,0);assert.equal(f.env.drawTarget.registered,false);assert.deepEqual(f.adopted,[]);assert.deepEqual(f.staged,[]);assert.equal(f.env.drawTarget.sourceResourceKeys,undefined);
 });
 test(`${provider}: same-generation unready main cannot reuse a pick-ready allocation`,async()=>{
  const f=duplicatePackingFixture(provider,{mainReady:false});
  // Matching generation and legacy pick readiness cannot hide an unfinished
  // current main view. The callback must enter the normal registration path.
  await assert.rejects(async()=>f.run(),error=>error===f.reached);
  assert.equal(f.calls.normalPlan,1);assert.equal(f.calls.setBatches,0);assert.equal(f.env.duplicatePackSkips,0);assert.equal(f.env.drawTarget.registered,false);assert.deepEqual(f.adopted,[]);assert.deepEqual(f.staged,[]);assert.equal(f.env.drawTarget.sourceResourceKeys,undefined);
 });
}
