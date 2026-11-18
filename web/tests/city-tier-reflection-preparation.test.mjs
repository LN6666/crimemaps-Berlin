import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function declaration(relative,name){
 const text=fs.readFileSync(new URL(relative,import.meta.url),'utf8'),ast=ts.createSourceFile(relative,text,ts.ScriptTarget.Latest,true),found=[];
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found.push(node);ts.forEachChild(node,visit);}visit(ast);
 assert.equal(found.length,1,relative+' declares '+name+' once');return found[0].getText(ast);
}
function bind(source,bindings){
 const js=ts.transpileModule('('+source.replace(/^export\s+/,'')+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'');
 return Function(...Object.keys(bindings),'return '+js)(...Object.values(bindings));
}
// The result accounting and caller-frame policy are the production helpers.
const solarShadowPreparation=bind(declaration('../src/safety/solar-shadow-preparation.ts','solarShadowPreparation'),{});
const needsFrame=bind(declaration('../src/safety/solar-shadow-preparation.ts','solarShadowPreparationNeedsFrame'),{});
const groupsModule={exports:{}};
const groupsSource=fs.readFileSync(new URL('../src/safety/current-paint-program-groups.ts',import.meta.url),'utf8');
Function('exports',ts.transpileModule(groupsSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(groupsModule.exports);

for(const provider of ['city','tier300'])test(provider+' reflection preserves terminal capture failure and keeps unspecified blocks retryable',()=>{
 const source=declaration(`../src/painted/${provider}/safety/building-mesh-renderer.ts`,'preparePlanarReflection'),gl={isContextLost:()=>false},program={};let snapshot;
 const prepare=bind(source,{
  solarShadowPreparation,linkedPaint:groupsModule.exports.currentPaintProgramGroups(provider,'berlin'),reflectionDemandToken:'reflection',destroyed:false,pageHidden:false,enabled:true,
  sceneIndexCount:()=>3,opacityContext:'normal',opacity:1,overrideProgramKey:()=>undefined,currentPaintProgramKey:()=> 'base',paintMode:()=>2,
  familyRuns:[{key:'base',firstIndex:0,indexCount:3}],c290RoofComponent:()=>undefined,c290ProgramRuns:()=>[],sceneChunks:[],
  planResidentReflectionChunks:()=>({plan:[{program:'base'}],triangles:1,draws:1,components:[]}),replaceCaptureKeys(){},
  programPreparation:{prune(){}},reconcileProgramSources(){},reconcileMaterialSource(){},gl,gpuReady:()=>true,materialProgramsCurrent:()=>true,
  geometryUploadPending:false,residentData:{},prepareCaptureMaterialPrograms:()=>solarShadowPreparation(),program,
  familyPrograms:new Map(),familyFailures:new Map(),reflectionCaptureFailures:new Map(),captureFamilyFailures:new Map(),
  residentCaptureState:()=>({materialProgram:program}),residentCaptureAdapter:()=>({snapshot:()=>snapshot})
 });
 const pass={gl,maxTriangles:10,maxDraws:8};
 for(const pending of [false,true,undefined]){
  snapshot={status:'blocked',reason:'controlled-capture-block',...(pending===undefined?{}:{pending})};
  const result=prepare(pass,{});
  assert.deepEqual(result,{status:pending===false?'failed':'pending',ready:1,pending:pending===false?0:1,failed:pending===false?1:0,plannedTriangles:1,plannedDraws:1});
  assert.equal(needsFrame(result),pending!==false,'only an explicit terminal block ends the frame retry');
 }
});
