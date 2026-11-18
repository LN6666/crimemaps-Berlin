import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function declaration(file,name){
 const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(String(file),source,ts.ScriptTarget.Latest,true);let found;
 const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node.getText(ast);ts.forEachChild(node,visit);};visit(ast);assert(found,name);return found;
}
const preparationSource=declaration(new URL('../src/safety/solar-shadow-preparation.ts',import.meta.url),'solarShadowPreparation').replace(/^export /,'');
function fixture(provider,snapshot){
 const renderer=new URL(`../src/painted/${provider}/safety/building-mesh-renderer.ts`,import.meta.url),source=declaration(renderer,'preparePlanarReflection');
 const gl={isContextLost:()=>false},values={destroyed:false,pageHidden:false,enabled:true,sceneIndexCount:()=>3,selectPhysicalReflection:()=>({triangles:1,draws:1,plan:[{program:'resident'}]}),captureProgramKeys:()=>new Set(),activeCaptureProgramKeys:()=>new Set(),reflectionDemandKeys:new Set(),reflectionDemandPlanned:false,retireCapturePrograms(){},reflectionCaptureToken:{},gl,geometryUploadPending:false,gpuReady:()=>true,city:'fixture',reflectionProgramFailures:new Map(),reflectionKeyProgram:()=>({}),programPreparation:{},sceneChunks:[],prepareChunkMasks:()=>({ready:true}),residentCaptureAdapter:()=>({snapshot:()=>snapshot}),reflectionResidentRevision:0};
 const js=ts.transpileModule(preparationSource+'\n'+source+'\nreturn preparePlanarReflection;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return {pass:{gl},prepare:new Function(...Object.keys(values),js)(...Object.values(values))};
}
for(const provider of ['church','delegated500']){
 test(provider+' reflection preserves a terminal blocked capture after resident recovery',()=>{
  const f=fixture(provider,{status:'blocked',reason:'binding-failed',pending:false}),result=f.prepare(f.pass,{});
  assert.equal(result.status,'failed');assert.equal(result.pending,0);assert.equal(result.failed,1);assert.equal(result.plannedTriangles,1);assert.equal(result.plannedDraws,1);
 });
 for(const pending of [true,undefined])test(provider+' reflection keeps '+String(pending)+' blocked pending state recoverable',()=>{
  const f=fixture(provider,{status:'blocked',reason:'bindings-not-ready',...(pending===undefined?{}:{pending})}),result=f.prepare(f.pass,{});
  assert.equal(result.status,'pending');assert.equal(result.pending,1);assert.equal(result.failed,0);
 });
 test(provider+' reflection waits for restored active chunk bindings and accepts them when ready',()=>{
  let ready=false,releases=0;const f=fixture(provider,{status:'active',chunks:[{bindingsReady:()=>ready}],release(){releases++;}});
  assert.equal(f.prepare(f.pass,{}).status,'pending');assert.equal(releases,1,'the pending readiness probe returns its snapshot loan');ready=true;assert.equal(f.prepare(f.pass,{}).status,'ready');assert.equal(releases,2,'the ready probe also returns its snapshot loan');
 });
}

for(const provider of ['church','delegated500'])test(provider+' reflection returns active snapshot loans when a restored binding throws',()=>{
 let releases=0;const f=fixture(provider,{status:'active',chunks:[{bindingsReady(){throw Error('controlled restored binding failure');}}],release(){releases++;}});
 assert.throws(()=>f.prepare(f.pass,{}),/controlled restored binding failure/);assert.equal(releases,1);
});
