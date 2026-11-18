import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// src-r3b, R2 fixtures CDR[8](3): candidate-main-handoff #3 against the current
// chunk-residency Bremen candidate path. The harness is the one in
// candidate-main-handoff.test.mjs with only the chunk-residency inputs the
// current production reads: candidate.indexCount (set by finishPack; HEAD read
// candidate.geometry.indices.length), sceneChunks restored by candidate.state
// (prepareBremenMasks walks the scene chunks) and publishBremenGeometry as the
// upload (HEAD called geometryOwner.upload). No production function is stubbed.
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
// Chunk residency: the candidate's masks belong to its packed chunk.
 candidate.chunks=[{masks:candidateMasks,cpu:{release(){}},state:{release(){}}}];
 candidate.state={masks:candidateMasks,chunks:candidate.chunks,dependencies:undefined,restore(){Object.assign(env,{anchor:[.1,.2],anchorUnit:2,matrix:undefined,residentMaterialStyles:[1],landmarkVisible:false,rathausProxyMasks:candidateMasks,sceneChunks:candidate.chunks});}};
 const prepare=candidateMasks.prepare;candidateMasks.prepare=(...args)=>{calls.mask++;return prepare(...args);};
 const actual=renderer(env);Object.assign(env,actual);
 return{env,candidate,old,calls,queued,released,actual};
}


test('chunk residency: unready main colour keeps the old resident, prepares no mask and uploads nothing; the ready poll prepares masks once and publishes once',()=>{
 const f=fixture();
 f.actual.prepareCandidate();
 assert.equal(f.calls.mask,0,'no mask preparation while a required main colour is pending');assert.equal(f.calls.upload,0);assert.equal(f.calls.publish,0);
 assert.equal(f.env.anchor,f.old.anchor);assert.equal(f.env.matrix,f.old.matrix);assert.equal(f.env.rathausProxyMasks,f.old.rathausProxyMasks);assert.equal(f.env.sceneChunks,f.old.sceneChunks);
 assert.deepEqual([...f.candidate.colourPrograms.keys()],['one']);assert.equal(f.released.length,0);
 assert.deepEqual(f.calls.compileKeys,['one','two'],'both required roles register in the one pass');
 f.env.blocked=undefined;f.actual.prepareCandidate();
 assert.equal(f.calls.mask,1);assert.equal(f.calls.upload,1);assert.equal(f.calls.publish,1);
 assert.deepEqual([...f.candidate.colourPrograms.keys()],['one','two']);
});
