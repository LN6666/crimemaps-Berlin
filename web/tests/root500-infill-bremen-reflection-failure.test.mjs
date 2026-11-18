import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function productionFunctions(path,names){
 const source=fs.readFileSync(new URL('../src/'+path,import.meta.url),'utf8'),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true),found=new Map();
 const visit=node=>{if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))found.set(node.name.text,node.getText(ast).replace(/^export\s+/,''));ts.forEachChild(node,visit);};visit(ast);
 for(const name of names)assert(found.has(name),'Missing production function '+name);
 return names.map(name=>found.get(name)).join('\n');
}
const preparation=productionFunctions('safety/solar-shadow-preparation.ts',['solarShadowPreparation','solarShadowPreparationNeedsFrame']);
function fixture(provider){
 // Keep the real adapter's blocked-state decision and real reflection preparation
 // together. Only already-completed program/material work and geometry planning
 // are doubled, so a terminal adapter result must survive their common boundary.
 const source=preparation+'\n'+productionFunctions(`painted/${provider}/safety/building-mesh-renderer.ts`,['residentCaptureAdapter','preparePlanarReflection'])+`
 return {prepare:()=>preparePlanarReflection({gl,mainMatrix:[],maxTriangles:10},{}),needsFrame:solarShadowPreparationNeedsFrame,
  snapshot:()=>residentCaptureAdapter().snapshot(false),
  upload(pending,failure){geometryUploadPending=pending;geometryUploadFailure=failure;},
  failure(main,geometry,recovery){mainGeometryProgramFailure=main;geometryUploadFailure=geometry;contextRecoveryFailure=recovery;}};`;
 const bindings={solarCaptureRevision:()=>1,destroyed:false,pageHidden:false,enabled:true,sceneIndexCount:()=>3,partitionEnabled:false,paintMode:()=>0,sceneChunks:[],captureDemands:new Map([['reflection',{}]]),
  planResidentReflectionChunks:()=>({triangles:1,draws:1,plan:[]}),reconcileCaptureDemand(){},prepareCapturePrograms:()=>({ready:1,pending:0,failed:0}),prepareCaptureMaterials:()=>({ready:0,pending:0,failed:0}),
  geometryUploadPending:false,geometryUploadFailure:undefined,opacity:1,opacityContext:'normal',loaded:new Map([['resident',{}]]),pendingCandidate:undefined,candidateFailure:undefined,
  needsBirth:false,birth:new Map(),sceneEnvironment:{shadows:true,sunlight:true},gl:{isContextLost:()=>false},gpuReady:()=>false,program:{},mainGeometryProgramFailure:undefined,contextRecoveryFailure:undefined};
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return new Function(...Object.keys(bindings),js)(...Object.values(bindings));
}
for(const provider of ['root500','infill','bremen']){
 test(provider+' reflection stops polling a terminal adapter failure and preserves live recovery waits',()=>{
  const h=fixture(provider);
  const pending=()=>{const result=h.prepare();assert.equal(result.status,'pending');assert.equal(result.pending,1);assert.equal(result.failed,0);assert.equal(h.needsFrame(result),true);};
  const failed=()=>{assert.equal(h.snapshot().pending,false);const result=h.prepare();assert.equal(result.status,'failed');assert.equal(result.pending,0);assert.equal(result.failed,1);assert.equal(h.needsFrame(result),false);assert.equal(result.plannedTriangles,1);assert.equal(result.plannedDraws,1);};
  assert.equal(h.snapshot().reason,'gpu-unready');assert.equal(h.snapshot().pending,true);pending();
  h.upload(true);assert.equal(h.snapshot().reason,'geometry-upload-pending');pending();
  h.upload(true,'bounded upload rejected');assert.match(h.snapshot().reason,/geometry-upload-failed/);failed();
  h.upload(false);h.failure('main program failed');failed();
  h.failure(undefined,'resident upload failed');failed();
  h.failure(undefined,undefined,'context restore failed');failed();
  // A fresh recovery clears the failure, and the actual adapter again marks
  // absent GPU residency as pending; the previous failure is not sticky here.
  h.failure();assert.equal(h.snapshot().pending,true);pending();
 });
}
