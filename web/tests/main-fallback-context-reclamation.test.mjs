import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {build} from 'esbuild';
const bundled=await build({entryPoints:[new URL('../src/safety/idle-context-reclamation.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm'});
const {contextReclamationResourcesIdle}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const source=fs.readFileSync(new URL('../src/safety/main.ts',import.meta.url),'utf8');
const ast=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true);
let eligible,report;
function visit(node){
 if(ts.isFunctionDeclaration(node)&&node.name?.text==='reportThreeDimensionalState')report=node.getText(ast);
 if(ts.isCallExpression(node)&&node.expression.getText(ast)==='installIdleContextReclamation')eligible=node.arguments[0].properties.find(p=>p.name?.getText(ast)==='eligible').initializer.getText(ast);
 ts.forEachChild(node,visit);
}
visit(ast);assert(eligible&&report);
function fixture(){
 const calls=[],preparation={mode:'3d',handedOff:true,failure:'actual load failure'};
 const scope={threeDimensionalPreparation:preparation,document:{hidden:false},mapGPUUnavailable:false,map:{isMoving:()=>false},threeDimensional:{mode:'2d',wantedMode:'2d',resourceStore:{stats:{},budget:{stats:{categories:{}}}}},contextReclamationResourcesIdle:()=>true,releaseRecentPrograms(){},idleContextReclamation:{on2DReady:()=>calls.push('2d'),on3DReady:()=>calls.push('3d')},building3dInteraction:{suspend(){}},threeDimensionalControls:{reportState(){}},mapRecoveryNotice:{setThreeDFallback(){}}};
 const proxy=new Proxy(scope,{has:()=>true,get:(s,k)=>k===Symbol.unscopables?undefined:k in s?s[k]:globalThis[k]});
 const code=ts.transpileModule(report+';return {eligible:('+eligible+'),report:reportThreeDimensionalState}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return {scope,calls,preparation,api:Function('scope','with(scope){'+code+'}')(proxy)};
}
test('settled failed handoff schedules normal 2D reclamation without discarding failure',()=>{
 const f=fixture();f.api.report({mode:'2d',status:'error',fallback:{provider:'delegated500'}});
 assert.deepEqual(f.calls,['2d']);assert.equal(f.api.eligible(),true);assert.strictEqual(f.scope.threeDimensionalPreparation,f.preparation);assert.equal(f.preparation.failure,'actual load failure');
 f.scope.contextReclamationResourcesIdle=()=>false;assert.equal(f.api.eligible(),false,'live/retiring GPU resources still block');
});
test('pending or pre-handoff failure cannot borrow the settled fallback cleanup gate',()=>{
 for(const preparation of [{mode:'3d'},{mode:'3d',handedOff:true},{mode:'3d',failure:'metadata failed'}]){const f=fixture();f.scope.threeDimensionalPreparation=preparation;assert.equal(f.api.eligible(),false);}
 for(const key of ['mode','wantedMode']){const f=fixture();f.scope.threeDimensional[key]='3d';assert.equal(f.api.eligible(),false);}
 const f=fixture();f.scope.document.hidden=true;assert.equal(f.api.eligible(),false);
});

test('settled 2D releases unused retained programs before checking context retirement',()=>{
 const f=fixture(),store=f.scope.threeDimensional.resourceStore;
 Object.assign(store.stats,{gpu:0,preparing:0,retiring:0,recent:0});
 store.budget.stats.categories={program:{bytes:524288},metadata:{bytes:1400000}};
 f.scope.contextReclamationResourcesIdle=contextReclamationResourcesIdle;
 let releases=0;f.scope.releaseRecentPrograms=received=>{assert.strictEqual(received,store);releases++;store.budget.stats.categories={metadata:{bytes:1400000}};};
 assert.equal(f.api.eligible(),true);assert.equal(releases,1);
});
test('live work, hidden pages and a new 3D intent cannot evict retained programs',()=>{
 for(const change of [s=>s.document.hidden=true,s=>s.threeDimensional.wantedMode='3d',s=>s.threeDimensionalPreparation={mode:'3d'},s=>s.map.isMoving=()=>true,...['gpu','preparing','retiring','recent'].map(k=>s=>s.threeDimensional.resourceStore.stats[k]=1),...['program-submitted','program-retiring','texture'].map(k=>s=>s.threeDimensional.resourceStore.budget.stats.categories[k]={bytes:1})]){
  const f=fixture(),store=f.scope.threeDimensional.resourceStore;Object.assign(store.stats,{gpu:0,preparing:0,retiring:0,recent:0});store.budget.stats.categories={program:{bytes:524288}};f.scope.contextReclamationResourcesIdle=contextReclamationResourcesIdle;
  let releases=0;f.scope.releaseRecentPrograms=()=>releases++;change(f.scope);assert.equal(f.api.eligible(),false);assert.equal(releases,0);
 }
});
test('linked programs still held by consumers continue to block context loss',()=>{
 const f=fixture(),store=f.scope.threeDimensional.resourceStore;Object.assign(store.stats,{gpu:0,preparing:0,retiring:0,recent:0});store.budget.stats.categories={program:{bytes:262144}};f.scope.contextReclamationResourcesIdle=contextReclamationResourcesIdle;f.scope.releaseRecentPrograms=()=>0;assert.equal(f.api.eligible(),false);
});
