import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Execute the actual page wiring with small scene owners. No renderer imports,
// source tables, GL, real timers or browser are needed for this event contract.
const file=new URL('../src/safety/main.ts',import.meta.url),raw=fs.readFileSync(file,'utf8');
const ast=ts.createSourceFile(file.pathname,raw,ts.ScriptTarget.Latest,true);
assert.equal(ast.parseDiagnostics.length,0,'main parses');
const names=['syncSceneVisibility','syncSceneViewportVisibility','syncThreeDimensionalVisibility'];
const variables=names.map(name=>{
  for(const node of ast.statements)if(ts.isVariableStatement(node)){
    const declaration=node.declarationList.declarations.find(value=>value.name.getText(ast)===name);
    if(declaration)return 'const '+declaration.getText(ast)+';';
  }
  assert.fail('actual '+name);
});
function find(predicate){let result;function visit(node){if(result)return;if(predicate(node)){result=node;return;}ts.forEachChild(node,visit);}visit(ast);assert(result,'actual lifecycle callback');return result;}
const eventCallback=name=>find(node=>ts.isCallExpression(node)&&node.expression.getText(ast)==='window.addEventListener'&&node.arguments[0]?.text===name).arguments[1].getText(ast);
const restored=find(node=>ts.isPropertyAssignment(node)&&node.name.getText(ast)==='onLayersRestored').initializer.getText(ast);
const code=ts.transpileModule(variables.join('\n')+'\nreturn {'+names.join(',')+',pageshow:('+eventCallback('pageshow')+'),pagehide:('+eventCallback('pagehide')+'),restored:('+restored+')};',{
  compilerOptions:{target:ts.ScriptTarget.ES2022},
}).outputText;

function harness(){
  const calls=[],owner=label=>new Proxy({renderer:{setOpacity(){}},setVisible(value){calls.push([label,'visible',value]);},setPageHidden(value){calls.push([label,'hidden',value]);},setViewportVisible(value){calls.push([label,'viewport',value]);},setOffscreen(value){calls.push([label,'offscreen',value]);},cancelPending(){calls.push([label,'cancel']);},resume(){calls.push([label,'resume']);},suspend(){calls.push([label,'suspend']);}}, {get:(o,k)=>o[k]??(()=>{})});
  const scope={document:{hidden:false},mapGPUUnavailable:false,sceneViewportVisible:true,loaded:true,locale:'en',el:()=>({}),app:{querySelector:()=>undefined},map:{resize(){}},
    threeDimensional:owner('building'),dedicatedAppearance:owner('dedicated'),buildingSolarShadow:owner('shadow'),threeDimensionalScenery:owner('scenery'),environmentScene:owner('environment'),localPalaceGarden:owner('garden'),sceneControls:owner('controls'),sceneFrameClock:owner('clock'),building3dInteraction:owner('pick'),threeDimensionalRecovery:owner('recovery'),
    geographyBase:owner('geography'),publicTransitOverlay:owner('transit'),electoralOverlay:owner('election'),baseShopLabels:owner('shops'),deferredSourceData:new Map(),environmentWanted:false,dedicatedWanted:false,environmentSuspended:false,
    environmentRequest:new AbortController(),dedicatedInitRequest:new AbortController(),statisticsRequest:new AbortController(),datedStatisticsRequest:new AbortController(),monthRequest:new AbortController(),yearRequest:new AbortController(),yearReportRequest:new AbortController(),viewportRequest:new AbortController(),annualLoadingKey:'',annualLoading:undefined,viewportTimer:undefined,
    abortPendingReportBodyLoads(){},syncThreeDimensionalMotion(){},syncSceneEnvironment(){},communityVisibility(){},refresh(){},loadViewport(){},loadMonth(){},loadStatistics(){},loadDatedStatistics(){},
  };
  const values=new Proxy(scope,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,v)=>(o[k]=v,true)});
  const api=Function('scope','with(scope){'+code+'}')(values);Object.assign(scope,api);
  return {scope,calls,...api};
}
const last=(h,label,kind)=>h.calls.filter(row=>row[0]===label&&row[1]===kind).at(-1)?.[2];

test('hidden pages cancel pending picks and pause every existing scene owner',()=>{
  const h=harness();h.scope.document.hidden=true;h.syncThreeDimensionalVisibility();
  assert(h.calls.some(row=>row[0]==='pick'&&row[1]==='cancel'));
  for(const label of ['scenery','environment','garden'])assert.equal(last(h,label,'visible'),false,label);
  for(const label of ['clock','controls','dedicated','shadow'])assert.equal(last(h,label,'hidden'),true,label);
});

test('restoring graphics after hidden/visible events restores environment and cars before resuming them',()=>{
  const h=harness();h.scope.document.hidden=true;h.syncThreeDimensionalVisibility();
  h.scope.mapGPUUnavailable=true;h.scope.document.hidden=false;h.syncThreeDimensionalVisibility();
  for(const label of ['scenery','environment','garden'])assert.equal(last(h,label,'visible'),false,label+' waits for graphics');
  h.calls.length=0;h.restored(new AbortController().signal);
  for(const label of ['scenery','environment','garden']){
    assert.equal(last(h,label,'visible'),true,label);
    assert(h.calls.findIndex(row=>row[0]===label&&row[1]==='visible')<h.calls.findIndex(row=>row[0]===label&&row[1]==='resume'),label+' visibility before resume');
  }
  assert.equal(last(h,'clock','hidden'),false);
});

test('persisted pagehide cancels an in-flight pick even if the document is still visible; pageshow restores scene visibility',()=>{
  const h=harness();h.pagehide({persisted:true});
  assert(h.calls.some(row=>row[0]==='pick'&&row[1]==='cancel'));
  assert.equal(last(h,'clock','hidden'),true);
  h.scope.document.hidden=true;h.syncThreeDimensionalVisibility();h.scope.document.hidden=false;
  h.calls.length=0;h.pageshow({persisted:true});
  for(const label of ['scenery','environment','garden'])assert.equal(last(h,label,'visible'),true,label);
  assert.equal(last(h,'controls','hidden'),false);assert.equal(last(h,'clock','hidden'),false);
  assert.equal(h.calls.some(row=>row[1]==='cancel'),false,'showing does not clear a current selection');
});

test('offscreen gating stays separate from page visibility and restoration does not animate offscreen scenes',()=>{
  const h=harness();h.syncSceneViewportVisibility(false);
  assert.equal(last(h,'environment','offscreen'),true);assert.equal(last(h,'scenery','viewport'),false);
  for(const label of ['scenery','environment','garden'])assert.equal(last(h,label,'visible'),true,label+' page remains visible');
  assert.equal(last(h,'clock','hidden'),true);h.restored(new AbortController().signal);
  assert.equal(last(h,'clock','hidden'),true);assert.equal(last(h,'controls','hidden'),true);
  h.syncSceneViewportVisibility(true);assert.equal(last(h,'clock','hidden'),false);assert.equal(last(h,'environment','offscreen'),false);
});
