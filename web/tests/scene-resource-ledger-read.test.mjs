import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {loadProductionModule,page} from './support/core3-runtime.mjs';

const {createSceneProofGate}=loadProductionModule(new URL('../src/safety/scene-proof-gate.ts',import.meta.url));
const {withRenderDiagnosticSnapshot}=loadProductionModule(new URL('../src/safety/render-runtime/diagnostic-snapshot.ts',import.meta.url));
const source=readFileSync(new URL('../src/safety/main.ts',import.meta.url),'utf8');
const ast=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true);
let definition;
function visit(node){
 if(ts.isCallExpression(node)&&node.expression.getText(ast)==='Object.defineProperty'&&node.arguments[0]?.getText(ast)==='sceneProof'&&ts.isStringLiteral(node.arguments[1])&&node.arguments[1].text==='resourceLedgerNow')definition=node;
 ts.forEachChild(node,visit);
}
visit(ast);assert(definition,'the actual local scene proof exposes a current ledger read');
const compiled=ts.transpileModule(definition.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
function install(store){
 let clock=0;
 const sceneProof={textContent:'the previous render witness'};
 const manager={resourceStore:store,mode:'3d',wantedMode:'3d',getNativeSourceDiagnostics:()=>undefined,getRecoveryPreparationStats:()=>[],getResourceDiagnostics:()=>undefined};
 const create=new Function('sceneProof','threeDimensional','withRenderDiagnosticSnapshot','performance',`let sceneProofDisposed=false;${compiled};return()=>{sceneProofDisposed=true;};`);
 const dispose=create(sceneProof,manager,withRenderDiagnosticSnapshot,{timeOrigin:123456,now:()=>++clock});
 return{sceneProof,manager,dispose};
}

test('idle ledger reads see actual release without another render or modifying the last render witness',async()=>{
 const p=page(),f=install(p.store);
 const lease=p.store.acquire({contentKey:'ledger-now/source',role:'source',estimate:{category:'decoded',bytes:16,precision:'exact'},produce:()=>new Uint8Array(16)});
 try{
  await lease.ready;
  const before=f.sceneProof.resourceLedgerNow;
  assert.equal(before.store.resources,1);assert.equal(before.store.budget.bytes,16);
  lease.release();f.manager.mode='2d';f.manager.wantedMode='2d';
  const after=f.sceneProof.resourceLedgerNow;
  assert(after.monotonicMs>before.monotonicMs);assert.equal(after.timeOrigin,before.timeOrigin);
  assert.equal(after.mode,'2d');assert.equal(after.wantedMode,'2d');
  assert.equal(after.store.resources,0);assert.equal(after.store.budget.bytes,0);
  assert.equal(before.store.resources,1,'an older snapshot is preserved as older evidence');
  assert.equal(f.sceneProof.textContent,'the previous render witness');
  assert.equal(p.store.stats.productions,1,'diagnostic reads never produce resources');
 }finally{lease.release();f.dispose();p.store.destroy();}
});

test('ledger observation does not collect held or expired recent resources and stops after proof disposal',async t=>{
 let now=performance.now();t.mock.method(performance,'now',()=>now);
 const p=page(),f=install(p.store),lease=p.store.acquire({contentKey:'ledger-now/recent',role:'cache',estimate:{category:'decoded',bytes:16,precision:'exact'},produce:()=>new Uint8Array(16),allowRecent:true});
 try{
  await lease.ready;
  assert.equal(f.sceneProof.resourceLedgerNow.store.budget.bytes,16);
  lease.release();assert.equal(p.store.stats.recent,1);
  now+=32_000;
  const held=f.sceneProof.resourceLedgerNow;
  assert.equal(held.store.recent,1,'observation cannot expire a cache entry on behalf of production');
  for(let i=0;i<20;i++){
   const next=f.sceneProof.resourceLedgerNow;
   assert.equal(next.store.budget.bytes,held.store.budget.bytes);
   assert.equal(next.store.roles,held.store.roles);
   assert.equal(next.store.frameBoundaries,held.store.frameBoundaries,'a read does not collect a frame');
   assert.equal(next.store.budget.allocations,held.store.budget.allocations);
  }
  f.dispose();assert.equal(f.sceneProof.resourceLedgerNow,undefined);
  assert.equal(p.store.stats.budget.bytes,16,'disabling diagnostics does not release production ownership');
 }finally{lease.release();p.store.destroy();}
});


test('ledger reads support resource budgets without optional holder diagnostics',()=>{
 const f=install({destroyed:false,stats:{resources:0},budget:{}});
 const snapshot=f.sceneProof.resourceLedgerNow;
 assert.equal(snapshot.store.resources,0);assert.equal(snapshot.holders,undefined);
 assert.equal(snapshot.storeDestroyed,false);f.dispose();
});

function installSceneObservation(){
 const declarations=[],hooks=[];
 (function walk(node){
  if(ts.isVariableDeclaration(node)&&['sceneProofGate','sceneSettlementKey','publishSceneProof','publishSettledSceneProof'].includes(node.name.getText(ast)))declarations.push('const '+node.getText(ast)+';');
  if(ts.isFunctionDeclaration(node)&&node.name?.text==='disposeSceneProof')declarations.push(node.getText(ast));
  if(ts.isCallExpression(node)&&['map.on','map.once'].includes(node.expression.getText(ast))&&['captureSceneCamera','publishSceneProof','publishSettledSceneProof','disposeSceneProof'].includes(node.arguments[1]?.getText(ast)))hooks.push(node.getText(ast)+';');
  ts.forEachChild(node,walk);
 })(ast);
 assert.equal(declarations.length,5);
 const listeners=new Map(),sceneProof={textContent:'',dataset:{}},state={clock:0,ready:false};
 const scope={createSceneProofGate,sceneCameraKey:undefined,threeDimensionalPreparation:undefined,
  readMainDrawReadiness:()=>({mode:'3d',wantedMode:'3d',ready:state.ready,preparing:!state.ready,providers:[{provider:'bremen',ready:state.ready,preparing:!state.ready}]}),sceneProof,sceneProofSequence:0,sceneProofRevision:'',sceneProofSamples:[],sceneProofModules:{},sceneFrozenModule:undefined,sceneTimingModule:undefined,sceneProofDisposed:false,
  performance:{now:()=>state.clock},captureSceneCamera:()=>({moving:false}),withRenderDiagnosticSnapshot,
  threeDimensional:{mode:'3d',wantedMode:'3d',getManagerDrawReadiness:()=>[{provider:'bremen',record:{mainReady:state.ready}}],getFrozenDataResourceStats:()=>undefined},
  threeDimensionalRecovery:undefined,mapGPUUnavailable:false,document:{hidden:false},sceneEnvironment:{quality:'economy'},sceneControls:undefined,sceneFrameClock:undefined,sceneRenderQuality:undefined,buildingSolarShadow:undefined,environmentScene:undefined,environmentStatus:'ready',threeDimensionalScenery:undefined,sceneResources:()=>({}),
  map:{on:(name,fn)=>listeners.set(name,fn),once:(name,fn)=>listeners.set(name,fn),off:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);},triggerRepaint(){assert.fail('observation must not request a render');}},
  setTimeout(){assert.fail('observation must not schedule a timer');},requestAnimationFrame(){assert.fail('observation must not schedule a frame');},
 };
 const code=ts.transpileModule(declarations.join('\n')+'\n'+hooks.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('scope','with(scope){'+code+'}')(scope);
 return{state,sceneProof,sceneEnvironment:scope.sceneEnvironment,emit:name=>listeners.get(name)?.(),read:()=>JSON.parse(sceneProof.textContent),listeners};
}

test('natural idle publishes final readiness when the last render was inside the proof throttle',()=>{
 const f=installSceneObservation();f.emit('render');assert.equal(f.read().managerDrawReadiness[0].record.mainReady,false);
 f.state.clock=100;f.state.ready=true;f.emit('render');assert.equal(f.read().managerDrawReadiness[0].record.mainReady,false,'ordinary rendering stays throttled');
 f.state.clock=101;f.emit('idle');const proof=f.read();
 assert.equal(proof.managerDrawReadiness[0].record.mainReady,true);assert.equal(proof.monotonicMs,101);assert.equal(proof.sequence,2);
 assert.match(proof.measurement,/idle state is not a new GPU-completion witness/);
 for(let i=0;i<60;i++){f.state.clock++;f.emit('idle');}
 assert.equal(f.read().sequence,2,'repeated settled idle uses the actual production gate without serializing again');
});

test('removing the map detaches natural-idle observation as well as render and movement hooks',()=>{
 const f=installSceneObservation();f.emit('render');const before=f.sceneProof.textContent;
 f.emit('remove');assert.equal(f.listeners.size,0);assert.equal(f.sceneProof.dataset.disposed,'true');
 f.state.ready=true;f.state.clock=500;f.emit('idle');f.emit('render');assert.equal(f.sceneProof.textContent,before);
});

 test('idle preserves a final lighting setting change even when readiness is unchanged',()=>{
 const f=installSceneObservation();f.emit('render');
 f.state.clock=100;f.sceneEnvironment.sunlight=false;f.emit('render');
 assert.notEqual(f.read().scene.settings.sunlight,false);
 f.state.clock=101;f.emit('idle');assert.equal(f.read().scene.settings.sunlight,false);
 assert.equal(f.read().sequence,2);f.emit('idle');assert.equal(f.read().sequence,2);
 });


test('idle renderer ownership reads are fresh and reuse the same rows for the resource digest',()=>{
 const f=install({destroyed:false,stats:{resources:0},budget:{}});
 let deleted=0,reads=0,lastRows;
 f.manager.getRecoveryPreparationStats=()=>{
  reads++;
  return lastRows=[{provider:'delegated500',resourceResidency:{createdPrograms:12,deleteProgramRequests:deleted}}];
 };
 f.manager.getResourceDiagnostics=rows=>{
  assert.equal(rows,lastRows,'digest consumes the same current read without rereading renderers');
  return{providers:rows.map(row=>({provider:row.provider,deleted:row.resourceResidency.deleteProgramRequests}))};
 };
 const before=f.sceneProof.resourceLedgerNow;
 deleted=12;f.manager.mode='2d';f.manager.wantedMode='2d';
 const after=f.sceneProof.resourceLedgerNow;
 assert.equal(reads,2);
 assert.equal(before.programPreparation[0].resourceResidency.deleteProgramRequests,0);
 assert.equal(after.programPreparation[0].resourceResidency.deleteProgramRequests,12);
 assert.equal(after.renderResources.providers[0].deleted,12);
 assert.equal(after.mode,'2d');
 assert.equal(f.sceneProof.textContent,'the previous render witness');
 assert.match(after.measurement,/Deletion calls do not prove driver reclamation/);
 f.dispose();assert.equal(f.sceneProof.resourceLedgerNow,undefined);assert.equal(reads,2);
});
