import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {build} from 'esbuild';

// Execute the actual compositor functions with its actual coordinator,
// projection and group. Provider settlement below is controlled input; the
// seven real managers have a separate source-extracted settlement test.
const safety=new URL('../src/safety/',import.meta.url),file=new URL('painted-map.ts',safety);
const source=await readFile(file,'utf8'),ast=ts.createSourceFile(file.pathname,source,ts.ScriptTarget.Latest,true);
const compiled=await build({stdin:{contents:"export * from './scene-solar-detail-coordinator'; export * from './prospective-solar-projection'; export * from './model-view-projection'; export * from './planar-reflection-group'; export * from './solar-shadow-preparation';",resolveDir:safety.pathname,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const real=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
function expression(name){
 const found=[];(function visit(node){
  if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found.push('('+node.getText(ast)+')');
  if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)found.push('('+node.initializer.getText(ast)+')');
  if(ts.isPropertyAssignment(node)&&node.name.getText(ast)===name)found.push('('+node.initializer.getText(ast)+')');
  ts.forEachChild(node,visit);
 })(ast);assert.equal(found.length,1,name);return found[0];
}
function evaluate(name,context){
 const code=ts.transpileModule('return '+expression(name)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 return Function('scope','with(scope){'+code+'}')(new Proxy(context,{has:()=>true,get:(object,key)=>{
  if(key===Symbol.unscopables)return undefined;
  if(key in object)return object[key];if(key in globalThis)return globalThis[key];
  throw new ReferenceError('Unbound actual compositor dependency: '+String(key));
 },set:(object,key,value)=>(object[key]=value,true)}));
}
function fixture(){
 const components=[{origin:[8.8,53.1],box:[-50,0,-40,50,20,40]}],leaf=real.buildingDetailSolarCoverageBounds(components,0);
 let sourceRevision=1,raw={bounds:[leaf[0]-.001,leaf[1]-.001,leaf[2],leaf[3]+.001,leaf[4]+.001,leaf[5]],triangles:12,draws:2,complete:true},preparations=0;
 const light={instantISO:'2026-11-05T11:00:00Z',altitudeDegrees:20,direction:[.4,.7,.3]};
 const managers=new Map(),renderers=new Map(),states=new Map(),providerOrder=['city','root500'];
 for(const provider of providerOrder){
  const settlement={requestRevision:1,readyRequestRevision:1,generation:1,readyGeneration:1,pending:false,canonical:{kind:'empty',generation:1}};
  managers.set(provider,{mode:'3d',wantedMode:'3d',getDetailSettlement:()=>settlement,get detailDemandPending(){return settlement.pending;},requestDetailRefresh(){settlement.pending=true;}});
  renderers.set(provider,{getDrawReadiness:()=>({ready:true,preparing:false}),getSolarShadowRevision:()=>provider+sourceRevision,getSolarShadowCoverage:()=>raw,getPlanarReflectionRevision:()=>provider+sourceRevision,prepareSolarShadow:()=>{preparations++;return {status:'ready',ready:1,pending:0,failed:0};}});
  states.set(provider,{mode:'3d',status:'ready'});
 }
 const context={...real,providerOrder,managers,renderers,states,destroyed:false,detailConfigured:true,detailDemandReaders:new Set(),pendingDetailRefresh:new Set(),traceDetailRefresh(){},solarDetailContextGeneration:0,
  projectionActive:()=>true,compositorSceneSunlight:()=>light,detailSceneEnvironment:{instantISO:light.instantISO,sunlight:true,shadows:true,quality:'economy'},
  options:{map:{triggerRepaint(){}}},resourceStore:{collectRetired(){}},requiredSolarCoverage:()=>undefined,detailCaptureHeld:()=>false,
  renderer:{selected:undefined,sceneSunlight:light},getModelViewProjection:()=>undefined,modelViewKey:()=> 'camera',pickingDemands:new Set(),
  detailMobile:false,prospectiveDetailReflection:()=>undefined,detailReflectionEnabled:false,detailReflection:undefined,detailReflectionPlane:undefined,
 };
 context.reflectionGroup=real.planarReflectionGroup(()=>providerOrder.map(p=>renderers.get(p)),{requireAll:true});
 for(const name of ['syncSolarDetailContext','invalidateDetailDemands','recordDetailReflectionState','detailCapturePending','detailPendingPreparation','solarCapturePending','solarSourceRevision','recordSolarPublication','prepareSolarShadow','solarCoverage','detailDemands','collectRetiredResources'])context[name]=evaluate(name,context);
 context.solarDetail=evaluate('solarDetail',context);
 const settle=()=>{for(const manager of managers.values()){const s=manager.getDetailSettlement();s.requestRevision++;s.readyRequestRevision=s.requestRevision;s.pending=false;}};
 const publish=()=>{const coverage=context.solarCoverage();assert(coverage.complete);context.recordSolarPublication({sourceRevision:context.solarSourceRevision(),bounds:coverage.bounds,direction:light.direction,targetSize:512,complete:true});};
 return {context,components,light,settle,publish,frame:()=>context.collectRetiredResources(),get preparations(){return preparations;},setRaw:value=>raw=value,changeSource:()=>sourceRevision++};
}

test('actual compositor uses published scene epoch for shadow LOD only after both real request barriers',()=>{
 const f=fixture(),c=f.context,shadow=()=>c.detailDemands({components:f.components},'root500').find(d=>d.pass==='shadow');
 assert.equal(shadow().forceCanonical,true);f.frame();assert.equal(c.solarCapturePending(),true);
 f.settle();f.frame();assert.equal(c.solarDetail.capturePlan().kind,'witness');
 assert.equal(shadow().forceCanonical,true,'raw complete coverage is not a published witness');
 f.publish();f.frame();assert.equal(c.solarCapturePending(),true,'new epoch needs rejudgement even if meshes are unchanged');
 f.settle();f.frame();assert.equal(c.solarDetail.capturePlan().kind,'epoch');
 assert.equal(shadow().forceCanonical,false);assert.equal(shadow().maxErrorCssPx,.5);assert.equal(shadow().maxErrorDrawingBufferPx,1);
 assert.equal(shadow().project(f.components[0].origin).viewport.drawingBufferWidth,512);
 f.publish();f.frame();assert.equal(c.solarDetail.state.receiverReady,true);
 assert(real.sceneSolarCoverageContains(c.solarCoverage().bounds,c.solarDetail.capturePlan().bounds));
});

test('reflection refresh reaches prior readers once and the solar epoch still validates every manager',()=>{
 const f=fixture(),c=f.context,calls=[];
 for(const [id,manager] of c.managers){
  const refresh=manager.requestDetailRefresh;
  manager.requestDetailRefresh=()=>{calls.push(id);refresh();};
 }
 c.detailSceneEnvironment.shadows=false;
 c.detailDemands({components:f.components},'root500');
 c.recordDetailReflectionState({enabled:false,planeWorldZ:1});
 assert.equal(c.pendingDetailRefresh.size,0,'a disabled reflection has no plane demand');
 c.recordDetailReflectionState({enabled:true,planeWorldZ:2});
 c.detailDemands({components:f.components},'city'); // Its first read already sees plane 2.
 assert.equal(c.detailCapturePending(),true);
 f.frame();assert.deepEqual(calls,['root500']);
 f.settle();calls.length=0;
 c.recordDetailReflectionState({enabled:true,planeWorldZ:3});
 c.recordDetailReflectionState({enabled:true,planeWorldZ:4});
 c.detailSceneEnvironment.shadows=true;
 f.frame();assert.deepEqual(calls,['city','root500'],'one real request each covers both causes');
 assert.equal(c.pendingDetailRefresh.size,0);
 assert.equal(c.solarDetail.capturePlan(),undefined);
 f.settle();f.frame();assert.equal(c.solarDetail.capturePlan().kind,'witness');
});

test('actual capture preparation can warm existing depth programs before a coverage witness exists',()=>{
 const f=fixture(),c=f.context;c.syncSolarDetailContext();
 assert.equal(c.prepareSolarShadow().status,'pending');assert.equal(f.preparations,2);
 f.frame();assert.equal(c.prepareSolarShadow().status,'pending');assert.equal(f.preparations,2,'manager work still owns the existing preparation barrier');
});

test('old publication cannot acknowledge a new date or changed source and explicit withdrawal clears readiness',()=>{
 const f=fixture(),c=f.context;f.frame();f.settle();f.frame();
 const old={sourceRevision:c.solarSourceRevision(),bounds:c.solarCoverage().bounds,direction:f.light.direction,targetSize:512,complete:true};
 f.changeSource();c.recordSolarPublication(old);f.frame();assert.equal(c.solarDetail.state.epochId,undefined);
 f.publish();f.frame();f.settle();f.frame();f.publish();f.frame();assert.equal(c.solarDetail.state.receiverReady,true);
 c.recordSolarPublication(undefined);assert.equal(c.solarDetail.state.receiverReady,false);
 f.light.instantISO='2026-11-06T11:00:00Z';c.detailSceneEnvironment.instantISO=f.light.instantISO;
 assert.equal(c.detailDemands({components:f.components},'root500').find(d=>d.pass==='shadow').forceCanonical,true);
 assert.equal(c.solarCapturePending(),true);
});

test('complete empty painted coverage does not invent origin bounds or block a dedicated-only capture',()=>{
 const f=fixture();f.setRaw(undefined);f.frame();
 assert.equal(f.context.solarCoverage(),undefined);assert.equal(f.context.solarCapturePending(),false);
 assert.equal(f.context.prepareSolarShadow().status,'ready');
});

test('on-demand solar diagnostics read bounded scalar evidence without requesting refresh or preparing programs',()=>{
 const f=fixture(),read=evaluate('getBuildingDetailSolarSnapshot',f.context);
 const first=read();assert.equal(first.providers.length,2);assert.equal(first.plan,undefined);
 assert.equal(f.preparations,0);assert([...f.context.managers.values()].every(m=>!m.detailDemandPending));
 f.context.destroyed=true;assert.deepEqual(read().providers,[]);
});
