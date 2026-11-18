// Stage 3 round 6 (S6b) directed checks for the delegated500 and church renderers.
//
// 1. Publication retires a replaced scene-level Rathaus mask that no chunk owns
//    (the initial or empty-scene scratch): it is destroyed and its page-ledger
//    'mask' reservation is returned, while a mask still owned by a published or
//    previous chunk is left to its chunk owner. The statement under test is the
//    renderer's own text, evaluated against real masks on the real page ledger.
//    These two cases are structural: they prove the guard's semantics and that
//    the statement exists once after releasePackedChunks, not that a whole
//    publication returns the reservation. That behaviour is covered by
//    delegated500-resident-geometry #1 ({destroy:1, allocatedCPUBytes:0}) and
//    tier-church-resident-geometry church #23 (initial scratch destroyed).
// 2. church packBatches: a synchronous producer failure crosses as the
//    producer's own failure (same name and message), not as the generic
//    'not synchronously ready' error, and leaves no page-ledger bytes behind;
//    a genuinely unfinished shared production still reports not-ready.
//    (The church error is the producer's own object, not the chunk store's
//    bounded copy: the store exposes that copy only on the rejected ready
//    promise, which a synchronous packer cannot read.)
// 3. delegated500 (review finding D1): the two pre-publication exits, candidate
//    discard and a failed material-batch packing, destroy the unowned scratch
//    mask and return its reservation; these run the renderer's own closures.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {installRendererClosures,bundleRendererModules} from './support/f5resb-renderer-closures.mjs';

const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(web+'package.json'),ts=require('typescript');
const CHURCH='src/painted/church/safety/building-mesh-renderer.ts',DELEGATED='src/painted/delegated500/safety/building-mesh-renderer.ts';
const STORE='src/safety/render-runtime/chunk-resource-store.ts',MASKS='src/safety/facade-rathaus-proxy-mask.ts';
const bundle=await bundleRendererModules([CHURCH,DELEGATED],[STORE,MASKS]);
const {getPageChunkResourceStore}=bundle.load(STORE),{createRathausProxyMasks}=bundle.load(MASKS);
const store=getPageChunkResourceStore(),ledgerBytes=()=>store.budget.stats.bytes;
const text=file=>fs.readFileSync(web+file,'utf8');

function functionNamed(source,name){
 const ast=ts.createSourceFile(name+'.ts',source,ts.ScriptTarget.Latest,true);let found;
 (function visit(n){if(found)return;if(ts.isFunctionDeclaration(n)&&n.name?.text===name&&n.body)found=n;else ts.forEachChild(n,visit);})(ast);
 assert(found,'renderer function '+name);return{ast,node:found};
}
/** The publication's own retirement statement for the replaced scene-level mask. */
function maskRetirement(file,publish){
 const {ast,node}=functionNamed(text(file),publish),statements=[];
 (function visit(n){if(ts.isIfStatement(n)&&/^previousMasks\.destroy\(\)/.test(n.thenStatement.getText(ast)))statements.push(n);ts.forEachChild(n,visit);})(node);
 assert.equal(statements.length,1,publish+' retires the replaced scene-level mask exactly once');
 const statement=statements[0],body=node.getText(ast),at=statement.getStart(ast)-node.getStart(ast),release=body.indexOf('releasePackedChunks(previousChunks');
 assert(release>=0&&release<at,publish+' releases the previous chunks (and their masks) before retiring an unowned scene mask');
 const condition=statement.expression.getText(ast);
 for(const guard of ['previousMasks!==rathausProxyMasks','!sceneChunks.some(','!previousChunks.some('])assert(condition.includes(guard),publish+' guard '+guard);
 const js=ts.transpileModule(statement.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return values=>Function('env','with(env){'+js+'}')(values);
}

for(const [provider,file,publish]of [['delegated500',DELEGATED,'publishPackedResident'],['church',CHURCH,'publishPackedGeometry']])
 test(provider+': publication destroys an unowned replaced scene mask and returns its page-ledger reservation, never a chunk-owned one',()=>{
  const retire=maskRetirement(file,publish),before=ledgerBytes();
  // The initial (or empty-scene) scratch: no chunk owns it once a chunk scene replaces it.
  const scratch=createRathausProxyMasks(),published=createRathausProxyMasks();
  assert.equal(scratch.stats.allocatedCPUBytes,2048,'the scratch mask holds its exact CPU mask reservation');
  assert.equal(ledgerBytes(),before+4096,'both masks are charged on the page ledger');
  retire({previousMasks:scratch,rathausProxyMasks:published,sceneChunks:[{masks:published}],previousChunks:[]});
  assert.equal(scratch.stats.allocatedCPUBytes,0,'the replaced scratch is destroyed');
  assert.equal(ledgerBytes(),before+2048,'its reservation is returned to the page ledger');
  // An empty publication replacing the scratch with another scratch retires the old one too.
  const empty=createRathausProxyMasks();
  retire({previousMasks:published,rathausProxyMasks:empty,sceneChunks:[],previousChunks:[]});
  assert.equal(published.stats.allocatedCPUBytes,0);assert.equal(ledgerBytes(),before+2048);
  // Not retired here: the same mask, a mask a published chunk still owns, and a previous chunk's mask
  // (releasePackedChunks retires that one under its keep set).
  const owned=createRathausProxyMasks(),previousOwned=createRathausProxyMasks();
  retire({previousMasks:empty,rathausProxyMasks:empty,sceneChunks:[],previousChunks:[]});
  retire({previousMasks:owned,rathausProxyMasks:empty,sceneChunks:[{masks:empty},{masks:owned}],previousChunks:[{masks:owned}]});
  retire({previousMasks:previousOwned,rathausProxyMasks:empty,sceneChunks:[{masks:empty}],previousChunks:[{masks:previousOwned}]});
  for(const mask of [empty,owned,previousOwned])assert.equal(mask.stats.allocatedCPUBytes,2048,'a current or chunk-owned mask keeps its reservation');
  for(const mask of [empty,owned,previousOwned])mask.destroy();
  assert.equal(ledgerBytes(),before,'every reservation returns once its last owner destroys it');
 });

let churchSequence=0;
const sameFailure=(actual,expected)=>actual instanceof Error&&actual.name===expected.name&&actual.message===expected.message;
function component(id){return{city:'berlin',objectId:'osm/way/r6b-'+id,partId:'part-'+id,origin:[13.4,52.5],sourceFeature:{type:'Feature',properties:{}},componentGeometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[0,1],[0,0]]]},batches:[{positions:new Float32Array([0,0,0,2,0,0,0,3,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),color:[.25,.5,.75],indices:new Uint32Array([0,1,2]),faceRole:'wall'}]};}
/** church packBatches bound to its own closures and imports on the real page store; only the paint/mask
 * producers, row validation and display selection are fixture stubs. */
function churchPacking(stubs={}){
 const values={destroyed:false,generation:0,city:'berlin',id:'r6b-church-'+ ++churchSequence,vertexCap:1e6,geometryOwner:{store},sceneChunks:[],packingChunkInput:undefined,queueOnlyProgram:false,
  validate(){},acceptPaintComponent:()=>true,exactNativePartDisplay:components=>({held:new Set(),drawable:components}),churchPackingInput:input=>input,...stubs};
 installRendererClosures(text(CHURCH),values,{requireFrom:bundle.requireFor(CHURCH)});
 return values;
}

test('church: a synchronous paint or mask production failure is thrown as that failure and returns every reservation',()=>{
 for(const field of ['paint','mask']){
  const error=new RangeError('r6b '+field+' production failed'),before=ledgerBytes();
  const values=churchPacking(field==='paint'?{facadePaintData(){throw error;}}:{facadePaintData:()=>new Float32Array(15),createRathausProxyMasks:()=>({configure(){throw error;},destroy(){},cpuRecipe(){throw Error('unreachable');}})});
  assert.throws(()=>values.packBatches([component(1)],1),actual=>{assert(sameFailure(actual,error),field+': '+actual?.name+': '+actual?.message);assert.doesNotMatch(actual.message,/not synchronously ready/);return true;});
  assert.deepEqual(values.sceneChunks,[],field+': nothing is published');
  assert.equal(ledgerBytes(),before,field+': the failed production, its bindings and the chunk state hold no page-ledger bytes');
 }
});

test('church: a shared production that is still running keeps the explicit not-ready error',async()=>{
 const before=ledgerBytes(),c=component(2),group={contentKey:'r6b-church-pending-group',components:[c],parents:[],frame:{origin:[13.4,52.5],unit:4e7,authority:'r6b-frame'},cohortKeys:[],materialAuthority:'r6b-material',recipeAuthority:'r6b-recipe',selectedLOD:'canonical'};
 const values=churchPacking({facadePaintData(){throw Error('the running production is reused, never started again');}});
 values.packingChunkInput={store,groups:[group],cohorts:[]};
 const contentKey=values.packedChunkContentKey('church:berlin',group,'position9-paint5-state1-v1');
 let finish;const running=store.acquire({contentKey,role:'candidate',estimate:{category:'packed',bytes:64,precision:'estimate'},produce:()=>new Promise(resolve=>{finish=resolve;})});
 assert.equal(running.state,'preparing');
 assert.throws(()=>values.packBatches([c],1),/Church packed chunk is not synchronously ready/);
 assert.deepEqual(values.sceneChunks,[]);
 running.release();finish({});await running.ready.catch(()=>{});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(ledgerBytes(),before,'the waiting production and the refused packing return their reservations');
});

// Stage 3 round 6 fix (S6b-delegChurch-fix, review finding D1): the two delegated500 exits that drop a
// candidate scene-level mask before publication. These run the renderer's own discardGeometryCandidate and
// pumpPendingMaterialBatches (closures bound from the current source) on the real page ledger; only the
// program, material-source and packing collaborators are fixture stubs.
function countRetirements(mask){const counts={detach:0,destroy:0};for(const name of ['detach','destroy']){const original=mask[name].bind(mask);mask[name]=()=>{counts[name]++;original();};}return counts;}
let delegatedSequence=0;
function delegatedClosures(stubs={}){
 const values={destroyed:false,enabled:true,pageHidden:false,gl:undefined,id:'r6b-delegated-'+ ++delegatedSequence,city:'berlin',sceneChunks:[],sceneChunkBindings:undefined,pendingGeometry:undefined,pendingMaterialBatches:undefined,
  geometryUploadRevision:0,geometryUploadPending:false,residentLifecycleRevision:0,committedGeneration:1,generation:1,map:{triggerRepaint(){}},
  programPreparation:{prune(){},releaseProgram(){},work(_gl,job){return job.work();}},clearProgramGrantHandoff(){},clearMaterialSnapshot(){},syncFacadeResources(){},clearDelegated500PaintSourcesForScope(){},
  createRathausProxyMasks:()=>createRathausProxyMasks(),...stubs};
 installRendererClosures(text(DELEGATED),values,{requireFrom:bundle.requireFor(DELEGATED)});
 return values;
}
const leaseStub=()=>({release(){}});
function delegatedCandidate(state){return{state:{sceneChunkBindings:undefined,material:undefined,preparedData:undefined,generation:2,...state},partitions:new Map(),mainKeys:new Set(),materialKeys:new Set(),captureKeys:new Set(),quality:new Map(),preparedData:undefined,closed:false,releaseScope(){}};}

test('delegated500: discarding an unpublished candidate destroys its unowned scene scratch and returns the reservation, never a current or chunk-owned mask',()=>{
 const before=ledgerBytes(),current=createRathausProxyMasks(),currentRetired=countRetirements(current);
 // (1) An empty-scene candidate (assembleChunkConstruction's first?.masks??createRathausProxyMasks()) replaced or cancelled before publication.
 {const values=delegatedClosures({rathausProxyMasks:current}),scratch=createRathausProxyMasks(),retired=countRetirements(scratch),candidate=delegatedCandidate({sceneChunks:[],rathausProxyMasks:scratch});
  values.pendingGeometry=candidate;assert.equal(ledgerBytes(),before+4096);
  values.discardGeometryCandidate();
  assert.equal(values.pendingGeometry,undefined);assert.equal(candidate.closed,true);
  assert.equal(retired.destroy,1,'the unowned empty-scene scratch is destroyed exactly once');
  assert.equal(scratch.stats.allocatedCPUBytes,0);assert.equal(ledgerBytes(),before+2048,'its 2,048 B mask reservation is returned to the page ledger');}
 // (2) A candidate whose scene mask is its own chunk's mask: releasePackedChunks retires it once; the discard only detaches it.
 {const values=delegatedClosures({rathausProxyMasks:current}),owned=createRathausProxyMasks(),retired=countRetirements(owned),chunk={cpu:leaseStub(),dynamic:leaseStub(),masks:owned};
  values.pendingGeometry=delegatedCandidate({sceneChunks:[chunk],rathausProxyMasks:owned});values.discardGeometryCandidate();
  assert.deepEqual(retired,{detach:1,destroy:1},'the candidate chunk mask is retired once by its chunk owner');assert.equal(ledgerBytes(),before+2048);}
 // (3) A candidate mask that the published scene's chunk still owns is kept (detached only).
 {const shared=createRathausProxyMasks(),retired=countRetirements(shared),chunk={cpu:leaseStub(),dynamic:leaseStub(),masks:shared},published={cpu:leaseStub(),dynamic:leaseStub(),masks:shared};
  const values=delegatedClosures({rathausProxyMasks:current,sceneChunks:[published]});
  values.pendingGeometry=delegatedCandidate({sceneChunks:[chunk],rathausProxyMasks:shared});values.discardGeometryCandidate();
  assert.deepEqual(retired,{detach:1,destroy:0},'a mask the published scene still owns keeps its reservation');assert.equal(shared.stats.allocatedCPUBytes,2048);shared.destroy();}
 // (4) A candidate that shares the current scene mask leaves it untouched.
 {const values=delegatedClosures({rathausProxyMasks:current});values.pendingGeometry=delegatedCandidate({sceneChunks:[],rathausProxyMasks:current});values.discardGeometryCandidate();}
 assert.deepEqual(currentRetired,{detach:0,destroy:0},'the current scene mask is never retired by a discard');
 current.destroy();assert.equal(ledgerBytes(),before,'every reservation returns once its last owner destroys it');
});

test('delegated500: a material-batch packing failure destroys the scratch mask it created and restores the published scene',()=>{
 const before=ledgerBytes(),current=createRathausProxyMasks(),currentRetired=countRetirements(current),created=[],failure=new Error('Visible mesh budget exceeded');
 let claimReleased=0;
 const values=delegatedClosures({rathausProxyMasks:current,gl:{isContextLost:()=>false},batchSourceGate:{blockedFor:()=>false},
  admitMaterialSourceNow:()=>({release(){claimReleased++;}}),buildMaterialSource(){},createCasterPreparedSources:()=>({}),clearMaterialSource(){},
  createRathausProxyMasks(){const mask=createRathausProxyMasks();created.push({mask,retired:countRetirements(mask)});return mask;},
  packResidentBatches(){assert.equal(created.length,1,'packing runs on the fresh scratch mask');assert.equal(ledgerBytes(),before+4096);throw failure;}});
 const controller=new AbortController(),data={city:'berlin',chunkInput:undefined,signal:controller.signal,scope:{retain:()=>()=>{}},releaseChunkDependencies(){}};
 values.pendingMaterialBatches={revision:1,args:[[component('pump')],2],prepared:data,signal:controller.signal,closed:false,releaseScope(){}};
 values.pumpPendingMaterialBatches();
 assert.equal(created.length,1);const [{mask,retired}]=created;
 assert.equal(values.rathausProxyMasks,current,'the published scene mask is restored');assert.equal(values.pendingGeometry,undefined);
 assert.match(values.batchPreparationFailure,/Visible mesh budget exceeded/);assert.equal(values.pendingMaterialBatches,undefined);assert.equal(claimReleased,1);
 assert.equal(retired.destroy,1,'the failed packing scratch is destroyed exactly once');
 assert.equal(mask.stats.allocatedCPUBytes,0);assert.equal(ledgerBytes(),before+2048,'its 2,048 B mask reservation is returned to the page ledger');
 assert.deepEqual(currentRetired,{detach:0,destroy:0});current.destroy();assert.equal(ledgerBytes(),before);
});
