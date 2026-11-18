import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';

const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(web,'package.json')),ts=require('typescript');
const providers=Object.fromEntries(['root500','delegated500','tier300','church','city','infill','bremen'].map(p=>[p,'src/painted/'+p+'/safety']));
const extended=new Set(['root500','infill','bremen']);
const publicationFields={delegated500:['geometryUploadFailure','residentPublicationFailure'],tier300:['dataPreparationPending','dataPreparationFailure','dataPreparationRevision','sourceWorkingSet','capturePreparation','preparedData','geometryUploadPending','geometryUploadFailure','geometryPostPublishFailure'],church:['geometryUploadPending','geometryUploadFailure','geometryPostPublishFailure','fullProgramUpgradeFailure']};
const originalFields=['partition','destroyed','pageHidden','enabled','hasGL','hasProgram','hasVAO','hasVertexBuffer','hasIndexBuffer','hasStateBuffer','hasMatrix','contextLost','partitionPending','geometryUploadPending','geometryUploadRevision','geometryUploadFailure','shadowUploadPending','generation','viewRevision','components','vertices','indices','mainGeometryProgramFailure','contextRecoveryFailure'];
const transpile=(source,module=ts.ModuleKind.ESNext)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module}}).outputText;
const production=Object.fromEntries(await Promise.all(Object.entries(providers).map(async([provider,dir])=>{
 const file=path.join(web,dir,'building-mesh-renderer.ts'),source=await readFile(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),matches=[];
 function visit(node){if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='getReadinessDiagnostic')matches.push(node);ts.forEachChild(node,visit);}
 visit(ast);assert.equal(matches.length,1,provider+' public readiness getter');
 const arrow=matches[0].initializer;assert(ts.isArrowFunction(arrow));assert.equal(arrow.parameters.length,0);
 // Bremen's getter is a block that returns one object literal (fc802a0); the others return it directly.
 let returned=arrow.body;if(ts.isBlock(returned)){const statements=returned.statements.filter(ts.isReturnStatement);assert.equal(statements.length,1,provider+' readiness block returns once');returned=statements[0].expression;}
 const body=ts.isParenthesizedExpression(returned)?returned.expression:returned;assert(ts.isObjectLiteralExpression(body));
 const fields=body.properties.map(p=>p.name?.getText(ast));
 // Fields added by committed readiness work, verified per family with git log -S:
 // root500/infill mainDraw (ccac2be) and candidate/candidateFailure/candidateFailureGeneration (7510ef5);
 // tier300/city mainFrame (ccac2be); Bremen's projection sub-fields (ccac2be), candidate sub-fields (7510ef5) and the chunk-scene
 // vertex/index counts (7510ef5) are checked in the fixture below. Every other field is the original declared light snapshot.
 const committedReadiness={root500:['mainDraw','candidate','candidateFailure','candidateFailureGeneration'],infill:['mainDraw','candidate','candidateFailure','candidateFailureGeneration'],tier300:['mainFrame'],city:['candidate','mainFrame']}[provider]??[];
 const expectedFields=[...committedReadiness,...(extended.has(provider)?['preparedSourceStats','geometryResources','programPreparation',...(provider==='bremen'?['projection']:[]),...originalFields.flatMap(name=>provider==='bremen'&&name==='generation'?['candidate','candidateFailure',name]:[name])]
  :provider==='city'?['dataPreparationPending','preparedData','programPreparation','geometryResources']:['programPreparation',...(provider==='base'?[]:provider==='delegated500'?[...publicationFields[provider],'geometryResources']:['geometryResources',...(publicationFields[provider]??[])])])];
 assert.deepEqual(fields,expectedFields,provider+' retains existing readiness fields and publishes only the declared light owner snapshots');
 const preparation=body.properties.find(p=>p.name.getText(ast)==='programPreparation');
 assert(ts.isPropertyAssignment(preparation));assert.equal(preparation.initializer.getText(ast),'programPreparation.stats');
 // Exercise the actual bounded city candidate helper instead of stubbing its result.
 const cityHelper=provider==='city'?source.slice(source.indexOf(' function candidateReadinessDiagnostic(){'),source.indexOf(' // A deadline can reject before a candidate generation exists.')):'';
 assert(provider!=='city'||cityHelper.includes('return {generation:'),'city candidate helper extracted');
 return[provider,transpile(cityHelper?'(()=>{'+cityHelper+';return ('+arrow.getText(ast)+');})()':'('+arrow.getText(ast)+')')];
})));
const runtimeSources={scheduler:await readFile(path.join(web,'src/safety/render-runtime/preparation-scheduler.ts'),'utf8'),owner:await readFile(path.join(web,'src/safety/render-runtime/program-preparation.ts'),'utf8')};
function load(source,deps={}){const m={exports:{}};Function('require','module','exports',transpile(source,ts.ModuleKind.CommonJS))(name=>{assert(name in deps,'unexpected runtime dependency '+name);return deps[name];},m,m.exports);return m.exports;}
function fixture(provider,preparation){
 let reads=0,partitionReads=0,contextReads=0,mainGeometryReads=0,shadowGeometryReads=0,residentSourceReads=0,candidateSourceReads=0,residentScopeReads=0,candidateScopeReads=0,captureReads=0;
 const partition={pending:2,missingKeys:['base|1001']},lastMatrixInvalidation={revision:5},lastRenderedProjection={revision:4};
 const geometryCounters={contextId:11,contextIdScope:'last-upload-context',lifetimeScope:'geometry-owner-lifetime-across-contexts',createdBuffers:8,deleteBufferRequests:3,createdVertexArrays:2,deleteVertexArrayRequests:1};
 const mainGeometry=Object.freeze({...geometryCounters,revision:7,ownedBufferBytes:4096,ownedBuffers:5,borrowedBuffers:0}),shadowGeometry=Object.freeze({...geometryCounters,createdBuffers:2,deleteBufferRequests:1,revision:8,ownedBufferBytes:128,ownedBuffers:1,borrowedBuffers:4});
 const residentSource=Object.freeze({builds:2,analyses:2,hits:1,replacements:1,clears:0,sourceCharacters:512,released:false}),candidateSource=Object.freeze({...residentSource,builds:1,analyses:1,hits:0,replacements:0});
 const residentScopeStats=Object.freeze({resources:2,pending:0,pins:2,ownerReleased:true,disposed:false}),candidateScopeStats=Object.freeze({resources:1,pending:1,pins:1,ownerReleased:false,disposed:false});
 const residentScope={get stats(){residentScopeReads++;return residentScopeStats;}},candidateScope={get stats(){candidateScopeReads++;return candidateScopeStats;}};
 const capture=Object.freeze({active:true,plan:11,required:Object.freeze(['fixture-base','fixture-family7']),cached:Object.freeze(['fixture-base']),missing:Object.freeze(['fixture-family7']),failures:Object.freeze([])});
 const geometryOwner={get stats(){mainGeometryReads++;return mainGeometry;}},shadowGeometryOwner={get stats(){shadowGeometryReads++;return shadowGeometry;}},residentProgramPlan={get preparedSourceStats(){residentSourceReads++;return residentSource;}},candidatePlan={get preparedSourceStats(){candidateSourceReads++;return candidateSource;}};
 const env={programPreparation:{get stats(){reads++;return preparation();}},partitionWarmupDiagnostic(){partitionReads++;return partition;},
  geometryOwner,shadowGeometryOwner,residentGeometry:geometryOwner,shadowGeometry:shadowGeometryOwner,residentProgramPlan,publishedProgramPlan:residentProgramPlan,
  dataPreparationPending:provider==='city'?5:true,dataPreparationFailure:'data preparation failure',dataPreparationRevision:13,sourcePlanIdentity:11,cityPaintFragment:'fixture source',capturePreparationDiagnostic(){captureReads++;return capture;},residentData:{plan:{id:11},scope:residentScope},pendingData:{plan:{id:12},scope:candidateScope},publishedDataPlan:{identity:'city-resident',scope:residentScope},pendingGeometryCandidate:{dataPlan:{identity:'city-candidate',scope:candidateScope}},
  // Committed readiness snapshots (ccac2be mainDraw/mainFrame, 7510ef5 candidate fields): plain resident state and stamps.
  mainWorldProjection:undefined,candidateMainStamp:()=>4,candidateBindingStamp:()=>5,mainGPUIncarnation:3,mainGeometryIdentity:'fixture-geometry',candidateMainMatrix:undefined,residentMainPreparedStamp:4,mainPreparationStamp:()=>4,mainDrawComplete:()=>true,residentMainFailure:undefined,candidateMainReady:()=>false,mainDrawWitnessCurrent:()=>true,candidateFailureGeneration:10,hasCompleteMainDraw:()=>true,candidateMainViewStamp:()=>4,
  // Resident counts are read from the published chunk scene (chunk residency migration).
  sceneVertexCount:()=>2,sceneIndexCount:()=>3,
  pendingCandidate:{generation:10,pack:()=>{},plan:candidatePlan},candidateFailure:'candidate failure',residentPublicationFailure:'publication failure',geometryPostPublishFailure:'post-publication failure',fullProgramUpgradeFailure:'full-program failure',destroyed:false,pageHidden:false,enabled:true,gl:undefined,program:{},vao:{},vertexBuffer:{},indexBuffer:{},stateBuffer:{},matrix:new Float64Array(16),partitionPending:true,geometryUploadPending:true,geometryUploadRevision:7,geometryUploadFailure:'upload failure',shadowUploadPending:true,generation:8,viewRevision:9,loaded:new Map([['one',{}]]),vertices:new Float32Array(18),indices:new Uint32Array(3),mainGeometryProgramFailure:'m'.repeat(700),contextRecoveryFailure:'c'.repeat(700),lastMatrixInvalidation,lastRenderedProjection,
  get stats(){throw Error('full renderer stats read');},map:{triggerRepaint(){throw Error('readiness getter requested repaint');}}};
 const read=Function('env','with(env){return '+production[provider]+'}')(new Proxy(env,{has:()=>true,get:(o,k)=>{if(k===Symbol.unscopables||k==='undefined')return undefined;if(k in o)return o[k];throw Error('readiness getter accessed unexpected '+String(k));}}));
 const expected={partition,destroyed:false,pageHidden:false,enabled:true,hasGL:false,hasProgram:true,hasVAO:true,hasVertexBuffer:true,hasIndexBuffer:true,hasStateBuffer:true,hasMatrix:true,contextLost:false,partitionPending:true,geometryUploadPending:true,geometryUploadRevision:7,geometryUploadFailure:'upload failure',shadowUploadPending:true,generation:8,viewRevision:9,components:1,vertices:2,indices:3,mainGeometryProgramFailure:'m'.repeat(512),contextRecoveryFailure:'c'.repeat(512)};
 if(provider==='root500'||provider==='infill')Object.assign(expected,{mainDraw:{incarnation:3,geometryIdentity:'fixture-geometry',projectionKnown:false,prepared:true,firstComplete:true,failure:undefined},candidate:{generation:10,mainRequiredCount:0,mainProgramCount:0,mainReady:false,windowFailure:undefined,diffuseFailure:undefined},candidateFailure:'candidate failure',candidateFailureGeneration:10});
 if(provider==='bremen'){expected.projection={lastMatrixInvalidation,lastRenderedProjection,mainGPUIncarnation:3,completeMainDraw:true,mainPrepared:true};expected.candidate={generation:10,phase:'source-build',mainReady:false,requiredMainPrograms:0,readyMainPrograms:0};expected.candidateFailure='candidate failure';}
 const publishedExpected=extended.has(provider)?expected:Object.fromEntries((publicationFields[provider]??[]).map(key=>[key,env[key]]));
 if(provider==='city'){publishedExpected.candidate={generation:undefined,revision:undefined,packed:undefined,closed:false,programReady:false,requiredFamilyPrograms:0,readyFamilyPrograms:0,projectionAvailable:false,projectionStampCurrent:false,textureBindingCurrent:false,programContextCurrent:false,materialRevision:undefined,hooks:undefined,uploadPending:true,uploadRevision:7};publishedExpected.dataPreparationPending=true;publishedExpected.preparedData={resident:{identity:'city-resident',...residentScopeStats},candidate:{identity:'city-candidate',...candidateScopeStats}};}
 if(provider==='tier300'){publishedExpected.sourceWorkingSet={plan:11,characters:'fixture source'.length};publishedExpected.capturePreparation=capture;publishedExpected.preparedData={residentPlan:11,pendingPlan:12,residentScope:residentScopeStats,pendingScope:candidateScopeStats};}
 if(provider==='tier300'||provider==='city')publishedExpected.mainFrame={incarnation:3,complete:true};
 if(provider!=='base')publishedExpected.geometryResources={main:mainGeometry,shadow:shadowGeometry};
 if(extended.has(provider))publishedExpected.preparedSourceStats={resident:residentSource,candidate:candidateSource};
 return{env,read,expected:publishedExpected,get reads(){return reads;},get partitionReads(){return partitionReads;},get contextReads(){return contextReads;},get mainGeometryReads(){return mainGeometryReads;},get shadowGeometryReads(){return shadowGeometryReads;},get residentSourceReads(){return residentSourceReads;},get candidateSourceReads(){return candidateSourceReads;},get residentScopeReads(){return residentScopeReads;},get candidateScopeReads(){return candidateScopeReads;},get captureReads(){return captureReads;},setContext(){env.gl=new Proxy({isContextLost(){contextReads++;return true;}},{get:(o,k)=>{assert.equal(k,'isContextLost','no added GL queries');return o[k];}});}};
}
function noScheduling(work){
 const names=['setTimeout','setInterval','queueMicrotask','requestAnimationFrame','requestIdleCallback'],descriptors=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 try{for(const name of names)Object.defineProperty(globalThis,name,{configurable:true,writable:true,value(){throw Error('readiness snapshot scheduled '+name);}});return work();}
 finally{for(const[name,descriptor]of descriptors)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
}
for(const provider of Object.keys(providers)){
 test(provider+': actual readiness getter reads owner stats once and preserves existing fields without added work',()=>{
  const snapshot=Object.freeze({schemaVersion:1,observedAtMs:123,pending:1,pendingResources:Object.freeze([]),phaseTimingsScope:'private-owner-lifetime-excludes-shared-programs',ownedLegacyPrograms:2,resourceObjects:Object.freeze({contextId:11,createdPrograms:6,deleteProgramRequests:2,scope:'tracked-program-owners/context-lifetime-issued-calls'}),shared:Object.freeze({heldPrograms:3,heldReferences:5,grantedReferences:7,releasedReferences:2})}),f=fixture(provider,()=>snapshot);
  const result=noScheduling(f.read);assert.equal(f.reads,1);assert.equal(result.programPreparation,snapshot);
  assert.equal(result.programPreparation.phaseTimingsScope,snapshot.phaseTimingsScope);assert.equal(result.programPreparation.ownedLegacyPrograms,2);assert.equal(result.programPreparation.shared,snapshot.shared);
  const {programPreparation,...rest}=result;assert.deepEqual(rest,f.expected);assert.equal(f.partitionReads,extended.has(provider)?1:0);assert.equal(f.contextReads,0);
  assert.equal(f.mainGeometryReads,provider==='base'?0:1);assert.equal(f.shadowGeometryReads,provider==='base'?0:1);
  assert.equal(f.residentSourceReads,extended.has(provider)?1:0);assert.equal(f.candidateSourceReads,extended.has(provider)?1:0);
  assert.equal(f.residentScopeReads,['city','tier300'].includes(provider)?1:0);assert.equal(f.candidateScopeReads,['city','tier300'].includes(provider)?1:0);assert.equal(f.captureReads,provider==='tier300'?1:0);
  f.setContext();const withContext=noScheduling(f.read);assert.equal(f.reads,2);assert.equal(withContext.programPreparation,snapshot);
  // The three existing A getters already queried context loss; preserve that one query.
  assert.equal(f.contextReads,extended.has(provider)?1:0);if(extended.has(provider)){assert.equal(withContext.hasGL,true);assert.equal(withContext.contextLost,true);}
  assert.equal(f.mainGeometryReads,provider==='base'?0:2);assert.equal(f.shadowGeometryReads,provider==='base'?0:2);
  assert.equal(f.residentSourceReads,extended.has(provider)?2:0);assert.equal(f.candidateSourceReads,extended.has(provider)?2:0);
  assert.equal(f.residentScopeReads,['city','tier300'].includes(provider)?2:0);assert.equal(f.candidateScopeReads,['city','tier300'].includes(provider)?2:0);assert.equal(f.captureReads,provider==='tier300'?2:0);
 });
 test(provider+': actual owner snapshots pin their observation time and survive subsequent cleanup',()=>{
  const clock=globalThis.performance,descriptor=Object.getOwnPropertyDescriptor(clock,'now');let now=100,glReads=0,repaints=0;
  Object.defineProperty(clock,'now',{configurable:true,value:()=>now});
  try{
   // One fresh page runtime per case (program owner, scheduler, completion, chunk store, ledger) through its real imports.
   const page=createSourceModules({allow:id=>['safety/render-runtime/preparation-scheduler','safety/render-runtime/program-preparation','safety/render-runtime/submitted-program-completion','safety/render-runtime/chunk-resource-store','safety/render-runtime/resource-budget','safety/render-runtime/diagnostic-snapshot','safety/render-runtime/pressure-availability'].includes(id)});assert(runtimeSources.scheduler&&runtimeSources.owner&&load);
   const scheduler=page.load('safety/render-runtime/preparation-scheduler'),P=page.load('safety/render-runtime/program-preparation'),owner=P.createProgramPreparationOwner(provider+' test',()=>repaints++),turns=[];
   const gl=new Proxy({isContextLost(){glReads++;return false;}},{get:(o,k)=>{assert.equal(k,'isContextLost','queued work requires no other GL calls');return o[k];}});
   const timer=globalThis.setTimeout;globalThis.setTimeout=work=>(turns.push(work),turns.length);
   try{assert.equal(owner.work(gl,{resource:'geometry-upload',revision:1,current:()=>true,work(){throw Error('getter advanced queued upload');}}),false);}finally{globalThis.setTimeout=timer;}
   const f=fixture(provider,()=>owner.stats);now=130;const beforeGL=glReads,beforeRepaints=repaints,first=noScheduling(f.read).programPreparation,savedFirst=structuredClone(first);
   assert.equal(f.reads,1);assert.equal(first.observedAtMs,130);assert.equal(first.performanceTimeOriginMs,clock.timeOrigin);assert.equal(first.pending,1);assert.equal(first.pendingResources.length,1);
   assert.equal(first.phaseTimingsScope,'private-owner-lifetime-excludes-shared-programs');
   now=180;const second=noScheduling(f.read).programPreparation,savedSecond=structuredClone(second);assert.equal(f.reads,2);assert.equal(second.observedAtMs,180);assert.notEqual(first,second);assert.deepEqual(first,savedFirst);
   assert.equal(glReads,beforeGL,'stats never queries GL');assert.equal(repaints,beforeRepaints,'stats never repaints');assert.equal(turns.length,1,'stats never advances or reschedules queued work');
   now=210;owner.cancel();now=240;const after=noScheduling(f.read).programPreparation;
   assert.equal(f.reads,3);assert.equal(after.pending,0);assert.equal(after.observedAtMs,240);assert.equal(after.pendingResources.length,0);assert.deepEqual(first,savedFirst,'cleanup must not mutate the cached timeout snapshot');assert.deepEqual(second,savedSecond,'later observations must remain pinned too');
  }finally{if(descriptor)Object.defineProperty(clock,'now',descriptor);else delete clock.now;}
 });
}
