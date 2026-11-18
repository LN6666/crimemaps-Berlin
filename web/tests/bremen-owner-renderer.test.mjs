import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build,transform} from 'esbuild';
import ts from 'typescript';

const web=fileURLToPath(new URL('../',import.meta.url)),directory=path.join(web,'src/painted/bremen/safety');
// Actual runtime/store/AG70 recipe. The mixed-family 132/19 certificate factory
// alone is an explicit tiny substitute; its full admission remains in its own
// existing scope tests. This substitute returns parsed aliases deliberately.
const certificates=`import {EDGE70_SHA,EDGE70_RESOURCE} from './bremen-ag70-metadata';
import {certificateGroupKeysForIdentity} from './bremen-certificate-group-ledger';
const prepared=new WeakMap();
export async function prepareBremenHeldSourceCertificates(scope,rows,signal){await scope.prepare([EDGE70_RESOURCE],signal);prepared.set(scope,new Set(rows.flatMap(c=>certificateGroupKeysForIdentity(c))));}
export const hasPreparedBremenCertificateUnion=scope=>prepared.has(scope)&&!scope.stats.disposed;
export const hasPreparedBremenCertificateGroup=(scope,key)=>hasPreparedBremenCertificateUnion(scope)&&prepared.get(scope).has(key);
let observer;export const observeParsed=fn=>{observer=fn;};
export function createBremenHeldSourceCertificates(data,scope){data??=scope.borrow(EDGE70_RESOURCE,value=>value);observer?.(data);let resident=data;
 const record=c=>{if(!resident)throw Error('tiny scope disposed');const m=resident.models[0];if(!m.requiredNativeGroup.some(r=>r.objectId===c?.objectId&&r.partId===c?.partId))return null;return{patchSHA256:EDGE70_SHA,parent:m.displays[0],model:m};};
 return{bremenHeldSourceRule:record,serializeBremenHeldSourceReadback(c,leaf,generation){const r=record(c);return r&&{...r,generation,sourceLeafSHA256:leaf?.(c),requiredWholeDisplayParent:r.parent};},serializeBremenWholeDisplayCertificate(c,generation,source,leaf){const r=record(c);return r&&{...r,generation,originalSource:source,sourceLeafSHA256:leaf?.(source)};},dispose(){resident=undefined;}};
}`;
const bundled=await build({stdin:{contents:`export {createBremenOwnerRuntime} from './src/painted/bremen/safety/bremen-owner-runtime';export {createFrozenDataLeaseStore} from './src/safety/frozen-data-lease-store';export {EDGE70_SHA,EDGE70_RESOURCE} from './src/painted/bremen/safety/bremen-ag70-metadata';export {EDGE70_IDENTITIES} from './src/painted/bremen/safety/bremen-ag70-identities';export {edgeAg70Identity,edgeAg70BaseMaterials} from './src/painted/bremen/safety/bremen-ag70-runtime';export {nativePaintSignature} from './src/painted/bremen/safety/progressive-native-signature';export {observeParsed} from './src/painted/bremen/safety/bremen-held-source-certificates';export {withBremenRecipeDemand,bremenRecipeDemand,bremenDemandSourceAuthority,bremenExtra4OwnerTargets} from './src/painted/bremen/safety/bremen-recipe-demand';export {certificateGroupKeysForIdentity,certificateGroupKeysForModule} from './src/painted/bremen/safety/bremen-certificate-group-ledger';`,resolveDir:web,sourcefile:'bremen-owner-renderer-fixture.ts',loader:'ts'},bundle:true,write:false,metafile:true,platform:'node',format:'esm',target:'es2022',plugins:[{name:'explicit-tiny-mixed-certificates',setup(builder){builder.onResolve({filter:/bremen-held-source-certificates$/},()=>({path:'tiny-certificate-scope',namespace:'tiny-certificate-scope'}));builder.onLoad({filter:/.*/,namespace:'tiny-certificate-scope'},()=>({contents:certificates,loader:'js',resolveDir:directory}));builder.onResolve({filter:/frozen-paint-tables|painted-tables|\.json(?:\.gz)?$/},()=>{throw Error('Original frozen data/store must not enter renderer wiring fixture');});}}]});
const {createBremenOwnerRuntime,createFrozenDataLeaseStore,EDGE70_SHA,EDGE70_RESOURCE,EDGE70_IDENTITIES,edgeAg70Identity,edgeAg70BaseMaterials,nativePaintSignature,observeParsed,withBremenRecipeDemand,bremenRecipeDemand,bremenDemandSourceAuthority,bremenExtra4OwnerTargets,certificateGroupKeysForIdentity,certificateGroupKeysForModule}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text+'\n//# sourceURL=bremen-owner-renderer-runtime-fixture.mjs').toString('base64'));
const rendererText=await readFile(path.join(directory,'building-mesh-renderer.ts'),'utf8'),ownerText=await readFile(path.join(directory,'owner-reconstruction.ts'),'utf8');
const rendererAst=ts.createSourceFile('renderer.ts',rendererText,ts.ScriptTarget.Latest,true),ownerAst=ts.createSourceFile('owner.ts',ownerText,ts.ScriptTarget.Latest,true);
function actual(ast,name){let found,rank=0;function visit(n){const score=ts.isFunctionDeclaration(n)?3:ts.isMethodDeclaration(n)||ts.isVariableDeclaration(n)?2:ts.isPropertyAssignment(n)?1:0;if(score&&n.name?.getText(ast)===name&&score>=rank){found=n;rank=score;}ts.forEachChild(n,visit);}visit(ast);assert(found,'actual '+name);return ts.isFunctionDeclaration(found)?found.getText(ast).replace(/^export\s+/,''):ts.isMethodDeclaration(found)?'function '+found.getText(ast):found.initializer.getText(ast);}
async function evaluate(ast,name,environment){const result=await transform('('+actual(ast,name)+')',{loader:'ts',target:'es2022'});return Function('env','with(env){return '+result.code+'}')(environment);}
const emptyStats=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
const pass=rows=>rows,noop=()=>{},no=()=>false,vertexCount=rows=>rows.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0),key=c=>c.objectId+'|'+c.partId;
const tick=()=>new Promise(resolve=>setImmediate(resolve));


// The whole production renderer module runs in the construction harness: its
// constructor, setBatches commit, page-store chunk packing (packBremenChunkMaterials,
// installBremenChunkScene, releaseBremenChunks), scene* state, program preparation
// and resident geometry are the actual code, on a tiny fenced GL bound to the page
// chunk store. The owner boundary is the real Bremen owner runtime of this file;
// the owner recipe/material functions are the actual owner-reconstruction AST.
// A read-only inspection statement (support/f6bremen-renderer-inspect.mjs) exposes
// the constructor's closure state for the white-box assertions below.
const {constructionHarness,evaluate:evaluateLeaf}=await import('./fixtures/bremen-renderer-construction-harness.mjs');
const {inspectableRendererSource,inspectionRecorder,sceneArrays,residentArrayIdentity,assertSameResidentArrays,trackLiveBuffers}=await import('./support/f6bremen-renderer-inspect.mjs');
const inspectedRendererText=inspectableRendererSource(rendererText),lifecycleText=await readFile(path.join(web,'src/safety/resident-gpu-lifecycle.ts'),'utf8');

async function fixture(t,body){
 const rows=EDGE70_IDENTITIES.map((identity,index)=>({city:'bremen',...identity,origin:[8.8,53.07],componentGeometry:{type:'Polygon',coordinates:[[[8.8,53.07],[8.801,53.07],[8.8,53.071],[8.8,53.07]]]},sourceFeature:{type:'Feature',properties:{fixture:index}},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.5,.5,.5]}]}));
 const leaf=c=>'leaf-'+c?.partId,display={objectId:rows[0].objectId,partId:rows[0].partId,origin:[8.81,53.08],inScope:true,officialLoD2Shape:true,outsideBankGeometryRetained:true,ownerExtra:{complete:['parent','AG70']},batches:[{positions:[0,0,0,2,0,0,0,2,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.75,.75,.75],paint:Array(12).fill(.25),frames:Array(15).fill(.5),extras:{nested:[{value:7}]}}]};
 const data={models:[{targetId:'tiny-renderer-ag70',requiredNativeGroup:rows.map(c=>({objectId:c.objectId,partId:c.partId,signature:nativePaintSignature(c),sourceLeafSHA256:leaf(c)})),nativeSourceComponents:structuredClone(rows),displays:[display]}]},bytes=new TextEncoder().encode(JSON.stringify(data)),sha256=createHash('sha256').update(bytes).digest('hex'),descriptor={path:'/safety/buildings3d/painted-tables/'+sha256.slice(0,2)+'/'+sha256+'.json',sha256,bytes:bytes.length},store=createFrozenDataLeaseStore([descriptor]);
 let reads=0,parsed,failRead=false;observeParsed(value=>{parsed=value;});
 const client=store.client({city:'bremen',provider:'bremen',profileSHA256:'a'.repeat(64),selection:{tables:[sha256],initializers:{[sha256]:{[EDGE70_RESOURCE.file]:1}}},resolve:(canonical,file,occurrence)=>{assert.equal(canonical,EDGE70_SHA);assert.equal(file,EDGE70_RESOURCE.file);assert.equal(occurrence,0);return sha256;},read:async(p,signal,max)=>{reads++;assert.equal(p,descriptor.path);assert.equal(max,bytes.length);signal.throwIfAborted();if(failRead){failRead=false;return new Uint8Array(bytes.length);}return bytes;}}),runtime=createBremenOwnerRuntime(client),events=[],calls={pins:0,releases:0,reconstruction:0,materials:0,uploads:0,captureInvalidations:0,productionHolds:0,productionReleases:0};
 let v,view;const batchScopes=[],control={failMaterials:false},pack={progressive:undefined,paint:undefined};let scope;
 // Resident pins are the renderer's batch-scope retains (setBatches and
 // retainResidentBatchScope store them in residentScopePins). The actual renderer
 // also holds the scope transiently: page-store chunk production while packing
 // (the packer's retainSource) and each main frame (retainBremenMainFrame). Those
 // holds are counted apart and must all be returned by the end of each test.
 const residentRetain=()=>{const limit=Error.stackTraceLimit;Error.stackTraceLimit=64;const stack=new Error().stack??'';Error.stackTraceLimit=limit;return /\bretainResidentBatchScope\b|at Object\.setBatches \(eval/.test(stack)&&!/\b(retainSource|retainBremenMainFrame)\b/.test(stack);};
 const injected=new Proxy(runtime,{get(target,property){const value=target[property];
  if(property==='pin'||property==='prepare')return()=>{throw Error('Legacy owner preparation/pin must not enter renderer fixture');};
  if(property==='createBatchScope')return()=>{const next=value.call(target),retain=next.retain.bind(next);batchScopes.push(next);next.retain=()=>{if(!residentRetain()){const release=retain();calls.productionHolds++;let done=false;return()=>{if(done)return;done=true;calls.productionReleases++;release();};}calls.pins++;events.push('pin');const release=retain();let done=false;return()=>{if(done)return;done=true;calls.releases++;events.push('release-pin');assert.notEqual(v.currentDataScope,next);assert.notEqual(v.residentRollbackScope,next);if(!v.currentDataScope){assert.equal(v.sourceLoaded.size,0,'SOURCE cleared before resident pin release');assert.equal(v.loaded.size,0,'DISPLAY cleared before resident pin release');assert.equal(v.vertices.length,0,'packed arrays cleared before resident pin release');}release();};};return next;};
  if(property==='edgeAg70Reconstruction')return(...args)=>{calls.reconstruction++;events.push('AG70 reconstruction');return value.apply(target,args);};
  return typeof value==='function'?value.bind(target):value;
 }});
 const legacy=(rows)=>({components:rows,stats:emptyStats()});
 const fallback=name=>{
  if(/BaseMaterials|SpecificMaterials/.test(name))return noop;
  if(/Identity|CarrierIdentity/.test(name))return no;
  if(/RemoveDuplicateNativeParts/.test(name))return pass;
  if(/Reconstruction|Reframe|Repaint/.test(name))return legacy;
  if(/^[A-Z][A-Z0-9_]+$/.test(name))return{models:[],sourceAuthoritySHA256:'tiny-authority'};
  throw Error('Unbound legacy fixture dependency: '+String(name));
 };
 // AG70 materials write into exactly the arrays this chunk's packing produced.
 const ownerValues={withBremenRecipeDemand,bremenRecipeDemand,bremenDemandSourceAuthority,bremenExtra4OwnerTargets,bremenScopedCall:(fn,args,scope)=>fn(...args,scope),edgeAg70Identity,edgeAg70BaseMaterials:(components,paint,frames)=>{calls.materials++;events.push('AG70 materials');assert.equal(paint,pack.progressive);assert.equal(frames,pack.paint);return edgeAg70BaseMaterials(components,paint,frames);},frozenOwnerReconstructionComponents:legacy,infillLow009RemoveDuplicateNativeParts:pass,infillLow073RemoveDuplicateNativeParts:pass};
 const ownerEnvironment=new Proxy(ownerValues,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:k in globalThis?globalThis[k]:fallback(k)});
 for(const name of ['captureBremenReplacements','applyBremenReplacements','bremenOwnerStages','BREMEN_MATERIAL_SCOPE_CONSUMERS'])ownerValues[name]=await evaluate(ownerAst,name,ownerEnvironment);
 const reconstruct=await evaluate(ownerAst,'ownerReconstructionComponents',ownerEnvironment),materials=await evaluate(ownerAst,'ownerReconstructionBaseMaterials',ownerEnvironment);
 const texture=name=>({setUploadSize:noop,setNeededMaterials:noop,setPageHidden:noop,setEnabled:noop,attach:noop,detach:noop,destroy(){events.push(name+' destroy');}});
 const lifecycle=evaluateLeaf(lifecycleText);
 const recorder=inspectionRecorder();
 const h=constructionHarness(inspectedRendererText,{ownerRuntime:injected,rendererOptions:{nativeLeafSHA:leaf,windowTexture:texture('window'),diffuseTexture:texture('diffuse')},dependencyOverrides:{...recorder.override,
  // Owner recipe and materials: the actual owner-reconstruction functions. The
  // renderer's own scoped wrapper appends its current data scope.
  './owner-reconstruction':{BREMEN_MATERIAL_SCOPE_CONSUMERS:[],ownerRecoveredSourceComponents:pass,ownerReconstructionComponents(){throw Error('Prepared commits must not repeat owner reconstruction');},ownerReconstructionBaseMaterials(...args){if(control.failMaterials)throw Error('controlled materials failure');return materials(...args);},ownerReconstructionIdentity:c=>edgeAg70Identity(c)},
  './bremen-certificate-group-ledger':{certificateGroupKeysForIdentity,certificateGroupKeysForModule},
  './progressive-paint':{prepareBremenProgressiveAdmissions:async()=>{},isProgressivelyPainted:no,progressiveAdmission:()=>undefined,progressivePaintRejections:()=>[],progressiveRenderStatus:()=>[],getProgressivePaintDiagnosticsView:()=>({state:'available',appliedComponents:[],rejectedAdmissions:[]}),progressivePaintData:components=>{events.push('progressive data');return pack.progressive=new Float32Array(vertexCount(components)*4).fill(.125);}},
  './facade-paint-frame':{facadePaintData:components=>{events.push('facade frames');return pack.paint=new Float32Array(vertexCount(components)*5).fill(.875);}},
  '../../../safety/render-runtime/resident-capture':{createResidentCaptureRuntime:adapter=>({invalidate(){calls.captureInvalidations++;events.push('capture invalidate');},render(){return adapter.snapshot(false);}})},
  '../../../safety/resident-gpu-lifecycle':{...lifecycle,createResidentGPULifecycle(callbacks){const owner=lifecycle.createResidentGPULifecycle(callbacks);return{...owner,get stats(){return owner.stats;},detach(){events.push('resident detach');owner.detach();}};}},
 }});
 h.control.onUpload=()=>{calls.uploads++;events.push('upload');};
 const liveBuffers=trackLiveBuffers(h.gl);
 // The tiny shader fragment is built inside the retained candidate scope. The
 // actual renderer retires the AG70 construction resource of a certified batch
 // as soon as its chunks are packed (before program sources are built), so this
 // fixture owner store holds no shader data to borrow: the builder checks the
 // scope is the live retained one instead.
 const TINY_FRAGMENT='vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}',scopedFragment=scope=>{assert.ok(scope.stats.pins>0,'scoped shader source requires the retained batch scope');assert.equal(scope.stats.disposed,false);assert(batchScopes.includes(scope),'shader source reads the prepared owner batch scope');return TINY_FRAGMENT;};
 h.overrideDependency('./facade-paint-fragment',{paintProgramFragment:(_key,_city,scope)=>scopedFragment(scope),facadePaintFragmentForCity:(_city,scope)=>scopedFragment(scope)});
 const retainChunkInput=h.runtime.load(path.join(web,'src/safety/renderer-chunk-input.ts')).retainRendererChunkInput;
 await h.environment(async()=>{
  const r=h.create();view=recorder.latest;r.setEnabled(true);r.layer.onAdd({},h.gl);
  async function settle(){await h.settle(r,()=>!!r.stats.geometryPreparation.failure||!r.stats.geometryPreparation.pending&&r.getDrawReadiness().ready);const failure=r.stats.geometryPreparation.failure;if(failure)throw Error(failure);}
  // Empty and invalid commits are synchronous. A nonempty commit hands the
  // actual renderer a prepared owner batch (real AG70 recipe on the prepared
  // scope) with authoritative page-store chunk input, then runs frames until the
  // candidate publishes or fails.
  function setBatches(components,nextGeneration,...args){
   if(!components.length||!Number.isSafeInteger(nextGeneration)||nextGeneration<view.generation)return r.setBatches(components,nextGeneration,...args);
   if(!scope||scope.stats.disposed)throw Error('Fixture requires a prepared batch scope');
   const rebuilt=reconstruct(components,leaf,injected,scope),chunkInput=retainChunkInput(h.chunkInput(components)),prepared={chunkInput,releaseChunkDependencies(){chunkInput?.release();prepared.chunkInput=undefined;},signal:new AbortController().signal,input:components,source:components,sourceLoaded:new Map(components.map(c=>[key(c),c])),components:rebuilt.components,stats:rebuilt.stats,originalSourceVertices:vertexCount(components),originalSourceIndices:components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.indices.length,0),0),sourceVertices:vertexCount(components),sourceIndices:components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.indices.length,0),0),scope,release(){}};
   return(async()=>{try{r.setBatches(components,nextGeneration,...Array(9).fill(undefined),prepared);await settle();}finally{prepared.releaseChunkDependencies();scope.release();}})();
  }
  const local={setBatches,releaseGPU:()=>view.releaseGPU(),contextLost:()=>view.contextLost()},arrays=new Set(['vertices','indices','paintData','progressiveData','stateData']);
  // Closure state through the inspection view; the former whole-scene arrays are
  // their chunk-scene equivalents; the former rollback scope is the transient
  // resident scope a replacement keeps while its candidate is in flight.
  v=new Proxy({},{get(_o,k){if(k in local)return local[k];if(arrays.has(k))return sceneArrays(view)[k];if(k==='residentRollbackScope')return view.transientResidentScope;if(k in view)return view[k];const value=r[k];return typeof value==='function'?value.bind(r):value;},set(_o,k,value){if(k==='failMaterials')control.failMaterials=value;else if(k==='lastRenderedProjection')view.lastRenderedProjection=value;else throw Error('Fixture does not write renderer state '+String(k));return true;}});
  const unrelated={...structuredClone(rows[0]),objectId:'unrelated',partId:'unrelated',batches:structuredClone(rows[0].batches)},input=[unrelated,...rows];
  const f={v,r,h,runtime,injected,store,rows,input,unrelated,display,data,leaf,calls,events,arrays:()=>residentArrayIdentity(view),assertSameResidentArrays,get parsed(){return parsed;},get reads(){return reads;},failNextRead(){failRead=true;},get scope(){return scope;},async prepare({fresh=false}={}){if(!fresh&&scope&&!scope.stats.disposed)return;const next=injected.createBatchScope(),signal=new AbortController().signal;try{await next.prepare([EDGE70_RESOURCE],signal);await injected.prepareBatchCertificates(next,rows,signal,true);scope=next;}catch(error){next.release();throw error;}}};
  // A body failure is reported as itself; the page drain runs after a passing body.
  const cleanup=()=>{observeParsed(undefined);r.destroy();for(const batch of batchScopes)batch.release();runtime.dispose();client.dispose();store.destroy();};
  try{await body(f);assert.equal(calls.productionReleases,calls.productionHolds,'every chunk production returns its source scope hold');}
  catch(error){try{cleanup();}catch{}throw error;}
  cleanup();h.drainPage(liveBuffers);
 });
}

function drained(f){for(const name of ['entries','valueCells','leases','waiters','active','queued'])assert.equal(f.store.stats[name],0,name);}

test('unprepared or failed preparation can commit empty 2D batches before a fresh prepare rebuilds normally',t=>fixture(t,async f=>{
 f.v.setBatches([],1);assert.equal(f.calls.pins,0);assert.equal(f.calls.reconstruction,0);assert.equal(f.v.sourceLoaded.size,0);assert.equal(f.v.loaded.size,0);assert.equal(f.reads,0);drained(f);
 f.failNextRead();await assert.rejects(f.prepare(),/hash mismatch/);await tick();assert.equal(f.runtime.stats.prepared,false);f.v.setBatches([],2);assert.equal(f.calls.pins,0);assert.equal(f.calls.reconstruction,0);assert.equal(f.runtime.stats.leases,0);drained(f);
 await f.prepare();await f.v.setBatches(f.input,3);assert.equal(f.reads,2);assert.equal(f.calls.pins,1);assert.equal(f.v.ownerReconstruction.objects,1);assert.equal(f.v.getBremenWholeDisplayCertificate(f.rows[0]).patchSHA256,EDGE70_SHA);
}));

test('actual setBatches uses the injected real AG70 recipe and stateless material aggregate without changing SOURCE, suppression or offsets',t=>fixture(t,async f=>{
 await f.prepare();const before=structuredClone(f.input),revision=f.v.getRevision();assert.deepEqual(revision,{generation:0,viewRevision:revision.viewRevision});await f.v.setBatches(f.input,1);
 assert.equal(f.calls.pins,1);assert.equal(f.scope.stats.pins,1);assert.equal(f.calls.reconstruction,1);assert.equal(f.calls.materials,1);assert.equal(f.v.ownerReconstruction.objects,1);assert.equal(f.v.sourceLoaded.size,4);assert.equal(f.v.loaded.size,2);assert.deepEqual(f.input,before);
 const source=f.v.borrowSourceComponent(f.rows[0]),shown=f.v.borrowSurfaceComponent(f.rows[0]);assert.equal(source.batches,f.rows[0].batches);assert.equal(source.componentGeometry,f.rows[0].componentGeometry);assert.equal(shown.componentGeometry,f.rows[0].componentGeometry);assert.equal(shown.sourceFeature,f.rows[0].sourceFeature);assert.deepEqual(shown.origin,f.display.origin);
 for(const name of ['positions','normals','indices','color','paint','frames']){assert.deepEqual(shown.batches[0][name],f.display.batches[0][name]);assert.notEqual(shown.batches[0][name],f.parsed.models[0].displays[0].batches[0][name]);}
 assert.notEqual(shown.batches[0].extras,f.parsed.models[0].displays[0].batches[0].extras);assert.equal(f.v.borrowSurfaceComponent(f.rows[1]),undefined);assert.equal(f.v.borrowSurfaceComponent(f.rows[2]),undefined);assert.equal(f.v.getSurfaceComponent(f.rows[1]),undefined);assert.equal(f.v.borrowSourceComponent(f.rows[1]).batches,f.rows[1].batches);assert.equal(f.v.borrowSurfaceComponent(f.unrelated).batches,f.unrelated.batches);
 assert.deepEqual([...f.v.progressiveData],[...Array(12).fill(.125),...Array(12).fill(.25)]);assert.deepEqual([...f.v.paintData],[...Array(15).fill(.875),...Array(15).fill(.5)]);assert.deepEqual([...f.v.indices],[0,1,2,3,4,5]);assert.equal(f.v.vertices.length,54);assert.equal(f.v.stateData.length,6);assert.deepEqual(f.v.getRevision(),{generation:1,viewRevision:revision.viewRevision+3},'the commit advances the view revision twice (packing, publication) and the first drawn frame of the new generation once (growth start)');assert(f.events.indexOf('AG70 reconstruction')<f.events.indexOf('progressive data'));assert(f.events.indexOf('facade frames')<f.events.indexOf('AG70 materials'));assert(f.events.indexOf('AG70 materials')<f.events.indexOf('upload'));
}));

test('incomplete or changed AG70 carriers retain original aliases and do not receive AG70 material writes',t=>fixture(t,async f=>{
 await f.prepare();
 const missing=f.rows.slice(1);await f.v.setBatches(missing,1);assert.equal(f.v.ownerReconstruction.objects,0);for(const row of missing)assert.equal(f.v.borrowSurfaceComponent(row).batches,row.batches);
 const first=f.scope;await f.prepare({fresh:true});assert.notEqual(f.scope,first);const changed=structuredClone(f.input);changed[1].batches[0].positions[0]=99;await f.v.setBatches(changed,2);assert.equal(f.v.ownerReconstruction.objects,0);for(const row of changed)assert.equal(f.v.borrowSurfaceComponent(row).batches,row.batches);assert(f.v.progressiveData.every(n=>n===.125));assert(f.v.paintData.every(n=>n===.875));assert.equal(f.calls.pins,2,'the replacement batch is pinned once');assert.equal(f.calls.releases,1,'the replaced batch pin is released');assert.equal(f.v.residentScopePins.size,1,'replacement does not add another resident pin');assert.equal(first.stats.disposed,true);
}));

test('actual public certificate getters keep complete independent carrier graphs through scoped runtime calls',t=>fixture(t,async f=>{
 await f.prepare();await f.v.setBatches(f.input,1);
 const held=f.v.getBremenHeldSourceReadback(f.rows[1]),whole=f.v.getBremenWholeDisplayCertificate(f.rows[0]);assert.equal(held.generation,1);assert.equal(held.sourceLeafSHA256,f.leaf(f.rows[1]));assert.deepEqual(held.requiredWholeDisplayParent,f.display);assert.deepEqual(whole.originalSource,f.rows[0]);assert.equal(whole.generation,1);assert.equal(whole.patchSHA256,EDGE70_SHA);
 held.requiredWholeDisplayParent.batches[0].positions[0]=123;held.requiredWholeDisplayParent.batches[0].extras.nested[0].value=70;held.requiredWholeDisplayParent.ownerExtra.complete.push('owned');whole.model.nativeSourceComponents[0].batches[0].positions[0]=900;
 const again=f.v.getBremenHeldSourceReadback(f.rows[1]);assert.deepEqual(again.requiredWholeDisplayParent,f.display);assert.equal(f.v.getSurfaceComponent(f.rows[0]).batches[0].positions[0],0);assert.equal(f.parsed.models[0].displays[0].batches[0].extras.nested[0].value,7);assert.equal(f.v.getBremenHeldSourceReadback({objectId:'missing',partId:'missing'}),null);assert.equal(f.v.getBremenWholeDisplayCertificate({objectId:'missing',partId:'missing'}),null);
}));

test('GPU release, context loss and hidden/resume retain the resident owner pin and SOURCE/surface arrays for later capture or picking',t=>fixture(t,async f=>{
 await f.prepare();await f.v.setBatches(f.input,1);const source=f.v.borrowSourceComponent(f.rows[0]).batches,surface=f.v.borrowSurfaceComponent(f.rows[0]).batches,vertices=f.arrays();assert.equal(vertices.length,1,'one published chunk');
 f.v.releaseGPU();f.v.contextLost();f.v.setPageHidden(true);f.v.setPageHidden(false);
 assert.equal(f.scope.stats.pins,1);assert.equal(f.calls.releases,0);assert.equal(f.scope.stats.resources,0,'the published certified batch retired its AG70 construction resource; its certificate graph stays live below');f.assertSameResidentArrays(f.arrays(),vertices);assert.equal(f.v.borrowSourceComponent(f.rows[0]).batches,source);assert.equal(f.v.borrowSurfaceComponent(f.rows[0]).batches,surface);assert.equal(f.v.getBremenWholeDisplayCertificate(f.rows[0]).patchSHA256,EDGE70_SHA);
 // No GPU context or draw is claimed here; this exercises actual CPU lifecycle
 // callbacks while the unchanged GPU behavior has its own existing tests.
}));

test('empty commit releases only after references clear, manager clear drains leases, and prepare/rebuild reacquires',t=>fixture(t,async f=>{
 await f.prepare();await f.v.setBatches(f.input,1);f.v.lastRenderedProjection={generation:1};f.v.setBatches([],2);assert.equal(f.v.lastRenderedProjection,undefined);assert.equal(f.calls.releases,1);assert.equal(f.scope.stats.pins,0);assert.equal(f.runtime.stats.disposed,false,'overview-style empty commit does not dispose manager runtime');assert.equal(f.scope.stats.disposed,true);f.runtime.clearResident();await tick();drained(f);
 await f.prepare();assert.equal(f.reads,2);assert.equal(f.store.stats.parses,2);await f.v.setBatches(f.input,3);assert.equal(f.scope.stats.pins,1);assert.equal(f.v.ownerReconstruction.objects,1);f.v.lastRenderedProjection={generation:3};f.v.destroy();f.v.destroy();assert.equal(f.v.lastRenderedProjection,undefined);assert.equal(f.calls.releases,2);assert.equal(f.scope.stats.pins,0);assert.equal(f.runtime.stats.disposed,false,'renderer does not dispose the manager-owned runtime');const released=f.events.lastIndexOf('release-pin');for(const name of ['capture invalidate','resident detach','window destroy','diffuse destroy'])assert(f.events.lastIndexOf(name)<released,name+' completes before pin release');f.runtime.clearResident();await tick();drained(f);
}));

test('invalid generation never pins, while a mid-commit failure restores the original resident references before releasing the failed batch',t=>fixture(t,async f=>{
 await f.prepare();assert.throws(()=>f.v.setBatches(f.input,-1),/Invalid generation/);assert.equal(f.calls.pins,0);
 const source=f.v.sourceLoaded,loaded=f.v.loaded,vertices=f.arrays();f.v.failMaterials=true;await assert.rejects(()=>f.v.setBatches(f.input,1),/3D commit \[owner materials\].*controlled materials failure/);assert.equal(f.calls.pins,1);assert.equal(f.calls.releases,1);assert.equal(f.scope.stats.disposed,true);assert.equal(f.v.sourceLoaded,source);assert.equal(f.v.loaded,loaded);f.assertSameResidentArrays(f.arrays(),vertices);assert.equal(f.v.vertices.length,0);assert.equal(f.v.currentDataScope,undefined);assert.equal(f.v.generation,0);
 f.runtime.clearResident();assert.equal(f.runtime.stats.releaseRequested,true);f.v.failMaterials=false;f.v.setBatches([],2);assert.equal(f.calls.releases,1);await tick();drained(f);
}));
