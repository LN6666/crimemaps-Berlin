import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import {build} from 'esbuild';
import ts from 'typescript';

// Place in web/tests. Optional first argument is the actual web/ root.
const root=path.resolve(process.argv[2]??fileURLToPath(new URL('../',import.meta.url)));
const sourceRoot=root+'/src';
const files={painted:sourceRoot+'/safety/painted-map.ts',recovery:sourceRoot+'/safety/custom-layer-recovery.ts',main:sourceRoot+'/safety/main.ts'};
const raw=Object.fromEntries(await Promise.all(Object.entries(files).map(async([k,f])=>[k,await fs.readFile(f,'utf8')])));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const providerOrder=['root500','delegated500','tier300','church','city'];
const importTS=async text=>import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(text,{mode:'strip'})).toString('base64'));
const {installCustomLayerRecovery}=await importTS(raw.recovery);
const {createRecoveryResidentReuse}=await importTS(await fs.readFile(sourceRoot+'/safety/recovery-resident-reuse.ts','utf8'));
const {createViewportRequestContinuation}=await importTS(await fs.readFile(sourceRoot+'/safety/viewport-request.ts','utf8'));
function actualMethod(source,name){const ast=ts.createSourceFile('lifecycle.ts',source,ts.ScriptTarget.Latest,true);const found=[];function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(ast)===name)found.push(node.getText(ast));ts.forEachChild(node,visit);}visit(ast);assert.equal(found.length,1,'actual '+name+' method');return found[0];}
// The browser-only page probes of the actual compositor. Desktop matches the
// ordinary unconstrained page; no store, transport or detail module is replaced.
function installPageGlobals(){globalThis.document={hidden:false};globalThis.location={hostname:'test.invalid'};globalThis.matchMedia=()=>({matches:false});}


// Production candidate always comes directly from the current source above.
// Only the two historical negative controls are synthesized by inverse changes.
const OLD_PICK="if (property === 'isPickReady') return () => engines.length > 0 && engines.every(r => r.isPickReady());";
const V2_PICK="if (property === 'isPickReady') return () => (wanted !== '3d' || providerOrder.every(p => managers.get(p)?.wantedMode === '3d' && managers.get(p)?.mode === '3d' && renderers.has(p))) && engines.length > 0 && engines.every(r => r.isPickReady());";
const OLD_RESUME="resume(){if(wanted==='3d'&&managers.size){request=new AbortController();startFrozenInitialization(request.signal);}managers.forEach(m=>m.resume());if(!managers.size&&wanted==='3d')void requestMode('3d',new AbortController().signal).catch(()=>{});}";
const V2_RESUME="resume(){if(destroyed)return;const incomplete=wanted==='3d'&&providerOrder.some(p=>managers.get(p)?.wantedMode!=='3d');if(wanted==='3d'&&managers.size){request.abort();request=new AbortController();startFrozenInitialization(request.signal);}managers.forEach(m=>m.resume());if(incomplete)void requestMode('3d',new AbortController().signal).catch(()=>{});}";
const V1_RESUME=V2_RESUME.replace("if(wanted==='3d'&&managers.size){request.abort();request=new AbortController();","if(wanted==='3d'&&managers.size){request=new AbortController();");
// P1-8 is later than both historical controls: a rolled-back failed 3D request
// leaves 2D wanted. Invert that statement too, so each control stays historical.
const P18_WANTED_RESET="if(fallback)wanted='2d';";
function exactReplace(source,before,after){assert.equal(source.split(before).length-1,1,'one expected historical-control boundary');return source.replace(before,after);}
function negativePainted(source,version='original'){
 assert(source.includes(V2_PICK),'actual source contains reviewed provider readiness boundary');
 source=exactReplace(source,P18_WANTED_RESET,'');
 const currentResume=actualMethod(source,'resume');
 // Inverse only the historical cancellation defect; keep the new optional
 // context-only path intact. These scenarios call ordinary resume().
 const uncancelled=exactReplace(currentResume,'request.abort();request=new AbortController();','request=new AbortController();');
 return version==='v1'?exactReplace(source,currentResume,uncancelled):exactReplace(exactReplace(source,V2_PICK,OLD_PICK),currentResume,OLD_RESUME);
}
function mainReady(source,patched){
 if(!patched)return manager=>new Function('threeDimensional',"return ()=>threeDimensional?.mode!=='3d'||Boolean(threeDimensional.renderer?.isPickReady());")(manager);
 const ast=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true),callbacks=[];
 function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='installCustomLayerRecovery'){const options=node.arguments[0];assert(options&&ts.isObjectLiteralExpression(options));const ready=options.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(ast)==='isReady');assert(ready,'actual recovery readiness option');callbacks.push(ready.initializer);}ts.forEachChild(node,visit);}visit(ast);assert.equal(callbacks.length,1);
 const callback=callbacks[0];assert(ts.isIdentifier(callback),'the actual main readiness callback is a named production function');assert(ast.statements.some(node=>ts.isFunctionDeclaration(node)&&node.name?.text===callback.text),'actual named main readiness implementation');
 // Load the callback with every main.ts function it reaches and the declared
 // initial value of each module state it reads (for example the metadata
 // request record). Only the owner is supplied; any other dependency fails here.
 const code=ts.transpileModule(mainReadinessClosure(ast,callback.text),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return manager=>new Function('threeDimensional',code+'\nreturn '+callback.text+';')(manager);
}
function freeIdentifiers(root){
 const locals=new Set(),references=new Set();
 const bind=name=>{if(ts.isIdentifier(name))locals.add(name.text);else for(const element of name.elements)if(!ts.isOmittedExpression(element))bind(element.name);};
 const visit=node=>{
  if(ts.isTypeNode(node)||ts.isTypeAliasDeclaration(node)||ts.isInterfaceDeclaration(node))return;
  if(ts.isParameter(node)||ts.isVariableDeclaration(node)||ts.isBindingElement(node))bind(node.name);
  if((ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node))&&node.name&&node!==root)locals.add(node.name.text);
  if(ts.isIdentifier(node)){const parent=node.parent;const declared=(ts.isParameter(parent)||ts.isVariableDeclaration(parent)||ts.isBindingElement(parent)||ts.isFunctionDeclaration(parent)||ts.isFunctionExpression(parent))&&parent.name===node;const property=ts.isPropertyAccessExpression(parent)&&parent.name===node||(ts.isPropertyAssignment(parent)||ts.isMethodDeclaration(parent))&&parent.name===node||ts.isBindingElement(parent)&&parent.propertyName===node;if(!declared&&!property)references.add(node.text);}
  ts.forEachChild(node,visit);
 };
 visit(root);return[...references].filter(name=>!locals.has(name));
}
function mainReadinessClosure(ast,entry){
 const functions=new Map(),states=new Map();
 for(const node of ast.statements){
  if(ts.isFunctionDeclaration(node)&&node.name)functions.set(node.name.text,node);
  if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations)if(ts.isIdentifier(declaration.name))states.set(declaration.name.text,{declaration,constant:(node.declarationList.flags&ts.NodeFlags.Const)!==0});
 }
 const included=[],state=[],seen=new Set(),pending=[entry];
 while(pending.length){
  const name=pending.shift();if(seen.has(name))continue;seen.add(name);
  if(name==='threeDimensional')continue;
  const fn=functions.get(name);if(fn){included.push(fn.getText(ast).replace(/^export\s+/,''));pending.push(...freeIdentifiers(fn));continue;}
  const value=states.get(name);
  if(value){const initializer=value.declaration.initializer;assert(!initializer||ts.isLiteralExpression(initializer)||initializer.kind===ts.SyntaxKind.TrueKeyword||initializer.kind===ts.SyntaxKind.FalseKeyword||ts.isIdentifier(initializer)&&initializer.text==='undefined','main readiness state '+name+' starts from a declared literal value');state.push((value.constant?'const ':'let ')+value.declaration.getText(ast)+';');continue;}
  assert(name in globalThis,'main readiness dependency '+name+' must be the owner, a main.ts declaration or a JavaScript global');
 }
 assert(included.length>0);return state.join('\n')+'\n'+included.join('\n');
}

// The compositor is bundled from its current source together with its actual
// imports (page chunk store, byte transport, shared native sources, projection,
// detail resolver, solar/reflection helpers). Only the same page singletons as
// the historical fixture are replaced; provider modules are the owners below.
const AGGREGATE_STUBS={
 './planar-reflection-group':'export const planarReflectionGroup=()=>({});',
 './paint-ownership':"export const paintOwner=()=> 'city';",
 './paint-asset-registry.json':'export default {};',
 './frozen-paint-tables':'export const beginFrozenPaintTableInitialization=()=>({active:true,wait:p=>p,settled:()=>Promise.resolve(),close(){}});export const frozenPaintTableStats=()=>({});export const createFrozenDataResourceOwner=()=>({client:provider=>({provider,dispose(){}}),stats:{active:0,queued:0,waiters:0},destroy(){}});',
 'virtual:crimemaps-city-data':'export const profileSHA256=null;export const buildingFocusRegistry=undefined;export const buildingDetailCatalog=undefined;',
};
const FACTORY_SLOT='__fixtureRecoveryFactorySlot__',aggregateBundles=new Map();
async function aggregateBundle(source){
 if(aggregateBundles.has(source))return aggregateBundles.get(source);
 const replaced=source.replace(/import\('\.\.\/painted\/([^/]+)\/safety\/(three-dimensional-map|building-mesh-renderer)'\)/g,(_,p)=>`Promise.resolve({installThreeDimensionalMap:options=>globalThis.${FACTORY_SLOT}(${JSON.stringify(p)},options)})`),stubbed=new Set();
 assert.equal(replaced.includes('import(\'../painted/'),false,'every provider module import is isolated');
 const result=await build({stdin:{contents:replaced,resolveDir:sourceRoot+'/safety',sourcefile:'painted-map.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,logLevel:'silent',plugins:[{name:'aggregate-page-stubs',setup(builder){
  builder.onResolve({filter:/.*/},args=>args.importer.endsWith('painted-map.ts')&&Object.hasOwn(AGGREGATE_STUBS,args.path)?(stubbed.add(args.path),{path:args.path,namespace:'aggregate-stub'}):undefined);
  builder.onLoad({filter:/.*/,namespace:'aggregate-stub'},args=>({contents:AGGREGATE_STUBS[args.path],loader:'js'}));
 }}]});
 assert.deepEqual([...stubbed].sort(),Object.keys(AGGREGATE_STUBS).sort(),'each replaced compositor singleton is still an actual import');
 const text=result.outputFiles[0].text;aggregateBundles.set(source,text);return text;
}
async function buildAggregate(factory,patched,version='v2'){
 const key='__fixtureRecovery'+Math.random().toString(16).slice(2);globalThis[key]=factory;
 const source=patched?(version==='v1'?negativePainted(raw.painted,'v1'):raw.painted):negativePainted(raw.painted);
 const text=(await aggregateBundle(source)).replaceAll(FACTORY_SLOT,key);
 const mod=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));return{...mod,cleanup:()=>{delete globalThis[key];}};
}

// The provider stubs isolate transport/GPU work, but their resume/suspend and
// moved() implementations below are taken verbatim from the current city owner.
const city=await fs.readFile(sourceRoot+'/painted/city/safety/three-dimensional-map.ts','utf8');
const movedSource=city.split('\n').find(s=>s.includes('const moved=()=>'));
const resumeMethod=actualMethod(city,'resume'),suspendMethod=actualMethod(city,'suspend');
assert(movedSource);

async function run({patched,phase='city-before-mode',blockProvider='city',version='v2',repeatResume=false,asyncModes=false,followingAction='none'}){
 installPageGlobals();
 const reached=deferred(),gate=deferred(),records=new Map(),events=[],handlers=new Map(),layers=new Map();let firstBlocked=true;
 const map={on(t,fn){const hs=handlers.get(t)??new Set();hs.add(fn);handlers.set(t,hs);},off(t,fn){handlers.get(t)?.delete(fn);},emit(t){events.push(t);for(const fn of handlers.get(t)??[])fn();},isStyleLoaded:()=>true,getLayer:id=>layers.get(id),addLayer(l){layers.set(l.id,l);},removeLayer:id=>layers.delete(id),triggerRepaint(){}};
 const sourceResume='return '+stripTypeScriptTypes('(function'+resumeMethod.slice('resume'.length)+')',{mode:'strip'})+';';
 const sourceSuspend='return '+stripTypeScriptTypes('(function'+suspendMethod.slice('suspend'.length)+')',{mode:'strip'})+';';
 const sourceMoved=stripTypeScriptTypes(movedSource,{mode:'strip'});
 const factory=(provider,options)=>{
   let mode='2d',wantedMode='2d',pageHidden=false,suspended=false,destroyed=false,revision=0,request=new AbortController(),renderer,cameraMotionTicket,lastError;
   let calls=0,resumes=0,ready=false;
   // No completed visible batch in this deliberately interrupted owner fixture.
   // Use the real reuse helper: ordinary resume must take its invalidation path.
   const recoveryResident=createRecoveryResidentReuse(()=>undefined);
   const modeRequests=createViewportRequestContinuation(()=>Boolean(map.isMoving?.()));
   const announce=status=>{options.onState?.({mode,status});return{mode,status};};
   const visible=async(signal,ticket)=>{signal.throwIfAborted();if(ticket!==revision||destroyed||suspended)throw new DOMException('Aborted','AbortError');ready=true;announce('ready');return{status:'ready'};};
   const requestMode=async(next,signal)=>{
     wantedMode=next;request.abort();request=new AbortController();const own=request,ticket=++revision;const cancel=()=>own.abort();signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)own.abort();calls++;
     try{
       own.signal.throwIfAborted();if(destroyed||suspended)throw new DOMException('Aborted','AbortError');
       if(next==='3d'&&!renderer){renderer={layer:{id:'source-building-meshes-'+provider},setPageHidden(){},setReducedMotion(){},setOpacityContext(){},setEnabled(v){if(!v)ready=false;},isPickReady:()=>ready,getDrawReadiness:()=>({ready:ready&&!destroyed&&!suspended&&mode==='3d'&&wantedMode==='3d',preparing:!ready&&!destroyed&&wantedMode==='3d'}),stats:{},getRevision:()=>({generation:0,viewRevision:0})};options.onRenderer(renderer);map.addLayer(renderer.layer);}
       if(provider===blockProvider&&next==='3d'&&firstBlocked){
         firstBlocked=false;
         if(phase.endsWith('-after-mode'))mode='3d';
         reached.resolve();await Promise.race([gate.promise,new Promise((_,reject)=>own.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}))]);
         own.signal.throwIfAborted();
       }
       if(asyncModes&&next==='3d'){await tick();own.signal.throwIfAborted();}
       mode=next;ready=next==='3d';return announce('ready');
     }finally{signal.removeEventListener('abort',cancel);}
   };
   // eval closes over the same locals as the extracted production methods.
   const moved=eval('(()=>{'+sourceMoved+';return moved;})()');
   const actualResume=eval('(()=>{'+sourceResume+'})()');
   const actualSuspend=eval('(()=>{'+sourceSuspend+'})()');
   const owner={requestMode,resume(){resumes++;actualResume();},suspend:actualSuspend,destroy(){destroyed=true;request.abort();},get mode(){return mode;},get wantedMode(){return wantedMode;},get renderer(){return renderer;},setPageHidden(){},setReducedMotion(){},setOpacityContext(){},cacheStats:()=>({mode,wantedMode,calls,resumes,renderer:renderer?{}:undefined})};
   records.set(provider,owner);return owner;
 };
 const built=await buildAggregate(factory,patched,version);const notifications=[];
 const manager=built.installThreeDimensionalMap({map,city:'berlin',fetchBytes:async()=>new Uint8Array(),onState:s=>notifications.push(s)});
 const external=new AbortController();let readyCalls=0;
 const recovery=installCustomLayerRecovery({map,layers:()=>manager.paintLayers.map(layer=>({layer})),onLost:()=>{external.abort();manager.suspend();},onLayersRestored:()=>manager.resume(),isReady:mainReady(raw.main,patched)(manager),onReady:()=>readyCalls++});
 const first=manager.requestMode('3d',external.signal).catch(e=>e.name);await reached.promise;
 map.emit('webglcontextlost');await first;await tick();layers.clear();
 map.emit('webglcontextrestored');map.emit('render');const synchronousState=recovery.state;
 if(repeatResume)manager.resume();
 let actionPromise,notificationsAtDestroy;
 if(followingAction==='2d')actionPromise=manager.requestMode('2d',new AbortController().signal);
 if(followingAction==='destroy'){recovery.destroy();manager.destroy();notificationsAtDestroy=notifications.length;manager.resume();}
 for(let i=0;i<(asyncModes?20:2);i++)await tick();
 if(actionPromise)await actionPromise;
 map.emit('render');await tick();
 if(followingAction==='destroy')assert.equal(notifications.length,notificationsAtDestroy,'no writes after destruction');
 const result={patched,version,repeatResume,asyncModes,followingAction,phase,blockProvider,synchronousState,recoveryState:recovery.state,readyCalls,publicMode:manager.mode,wantedMode:manager.wantedMode,providers:Object.fromEntries([...records].map(([p,m])=>[p,m.cacheStats()])),paintLayers:manager.paintLayers.map(l=>l.id),aggregatePickReady:manager.renderer?.isPickReady(),notifications};
 if(followingAction==='destroy'){assert.equal(result.recoveryState,'destroyed');assert.equal(readyCalls,0);}
 else if(followingAction==='2d'){assert.equal(result.publicMode,'2d');assert.equal(result.wantedMode,'2d');assert(Object.values(result.providers).every(m=>m.mode==='2d'));assert(!notifications.some(s=>s.status==='error'));}
 else if(version==='v1'&&repeatResume){assert.equal(result.recoveryState,'waiting-frame');assert.equal(result.publicMode,'2d');assert.equal(result.wantedMode,'3d');}
 else if(patched||blockProvider==='church'){assert.equal(result.recoveryState,'ready');assert.equal(result.paintLayers.length,5);assert(Object.values(result.providers).every(m=>m.mode==='3d'&&m.wantedMode==='3d'));}
 else{assert.equal(result.recoveryState,'ready');assert(Object.values(result.providers).some(m=>m.wantedMode==='2d'));assert(result.paintLayers.length<5);}
 recovery.destroy();manager.destroy();gate.resolve();built.cleanup();return result;
}
const results=[];
for(const cfg of [{phase:'city-before-mode',blockProvider:'city'},{phase:'city-after-mode',blockProvider:'city'},{phase:'root-after-mode',blockProvider:'root500'},{phase:'church-before-mode',blockProvider:'church'},{phase:'church-after-mode',blockProvider:'church'}])for(const patched of [false,true])results.push(await run({...cfg,patched}));
const repeatedResumeResults=[];
for(const version of ['v1','v2'])repeatedResumeResults.push(await run({patched:true,version,repeatResume:true,asyncModes:true}));
for(const followingAction of ['2d','destroy'])repeatedResumeResults.push(await run({patched:true,repeatResume:true,asyncModes:true,followingAction}));
// Main now reads the owner's aggregate draw snapshot. Each state below is the
// public owner of the actual current compositor rather than a hand-written
// snapshot: its providers either still wait in their first 3D request (resuming,
// no renderer) or completed it with the given renderer readiness.
async function ownerState({mode,renderer}){
 installPageGlobals();
 const factory=(provider,options)=>{let current='2d',wantedMode='2d',engine;return{
  async requestMode(next,signal){signal.throwIfAborted();wantedMode=next;
   if(next==='3d'&&mode!=='3d')await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
   if(next==='3d'&&renderer&&!engine){engine={layer:{id:'source-building-meshes-'+provider},setPageHidden(){},setReducedMotion(){},setOpacityContext(){},setEnabled(){},stats:{},getRevision:()=>({generation:0,viewRevision:0}),...renderer};options.onRenderer(engine);}
   current=next;options.onState?.({mode:current,status:'ready'});return{mode:current,status:'ready'};},
  get mode(){return current;},get wantedMode(){return wantedMode;},get renderer(){return engine;},cacheStats:()=>({mode:current,wantedMode}),destroy(){},suspend(){},resume(){},setPageHidden(){},setReducedMotion(){},setOpacityContext(){}};};
 const built=await buildAggregate(factory,true),owner=built.installThreeDimensionalMap({map:{on(){},off(){},triggerRepaint(){}},city:'berlin',fetchBytes:async()=>new Uint8Array()});
 const request=owner.requestMode('3d',new AbortController().signal).catch(error=>error);
 if(mode==='3d')assert.deepEqual(await request,{mode:'3d',status:'ready'});else for(let i=0;i<4;i++)await tick();
 assert.equal(owner.mode,mode);assert.equal(owner.wantedMode,'3d');assert.equal(Boolean(owner.renderer),Boolean(renderer));
 return{owner,async close(){owner.destroy();await request;built.cleanup();}};
}
const resuming=await ownerState({mode:'2d'});
const readinessWhileResuming={old:mainReady(raw.main,false)(resuming.owner)(),candidate:mainReady(raw.main,true)(resuming.owner)()};await resuming.close();
assert.equal(readinessWhileResuming.old,true);assert.equal(readinessWhileResuming.candidate,false);
const retainedOldPick=await ownerState({mode:'3d',renderer:{isPickReady:()=>true,getDrawReadiness:()=>({ready:false,preparing:true})}});assert.equal(mainReady(raw.main,false)(retainedOldPick.owner)(),true,'historical main trusted the retained old pickable view');assert.equal(mainReady(raw.main,true)(retainedOldPick.owner)(),false,'the actual main callback requires current complete draw readiness');await retainedOldPick.close();
const failedMain=await ownerState({mode:'3d',renderer:{getDrawReadiness:()=>({ready:false,preparing:false,failure:'original required-main failure'})}});assert.throws(mainReady(raw.main,true)(failedMain.owner),/original required-main failure/);await failedMain.close();
const rollbackResults=[];
for(const patched of [false,true])for(const action of ['supersede','destroy','external-abort'])rollbackResults.push(await rollbackRegression(patched,action));
const report={candidateVersion:2,repeatedResumeResults,readinessWhileResuming,rollbackResults,scope:'actual current aggregate and recovery coordinator; actual current readiness callback; provider I/O/GPU isolated with production moved/resume/suspend bodies; inverse-only original and V1 negative controls',results};
assert.equal(results.length+repeatedResumeResults.length+rollbackResults.length,20);
if(process.env.CRIMEMAPS_RECOVERY_TEST_REPORT)await fs.writeFile(path.resolve(process.env.CRIMEMAPS_RECOVERY_TEST_REPORT),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:20,assertions:'PASS',scope:report.scope,negativeControls:['original incomplete provider replay','V1 repeated-resume cancellation'],browserGPUValidated:false}));



async function rollbackRegression(patched,action){
 installPageGlobals();
 const gate=deferred(),started=deferred(),states=[],rollbackSignals=[],threeDSignals=[];let failOnce=true;
 const factory=(provider,options)=>{let mode='2d';return{
  async requestMode(next,signal){signal.throwIfAborted();if(next==='3d')threeDSignals.push(signal);if(next==='3d'&&provider==='city'&&failOnce){failOnce=false;throw Error('Fixture first 3D load failed');}if(next==='2d'){rollbackSignals.push(signal);if(rollbackSignals.length===5)started.resolve();await gate.promise;signal.throwIfAborted();}mode=next;options.onState?.({mode,status:'ready'});return{mode,status:'ready'};},get mode(){return mode;},cacheStats:()=>({}),destroy(){},suspend(){},resume(){},setPageHidden(){},setReducedMotion(){},setOpacityContext(){}
 };};
 const built=await buildAggregate(factory,patched),manager=built.installThreeDimensionalMap({map:{on(){},off(){}},city:'berlin',fetchBytes:async()=>new Uint8Array(),onState:s=>states.push(s)}),external=new AbortController();
 const first=manager.requestMode('3d',external.signal).catch(e=>e);await started.promise;
 if(action==='supersede'){const second=await manager.requestMode('3d',new AbortController().signal);assert.deepEqual(second,{mode:'3d',status:'ready'});external.abort();assert(threeDSignals.slice(-5).every(s=>!s.aborted));}
 else if(action==='destroy')manager.destroy();else external.abort();
 const count=states.length;gate.resolve();await first;await tick();assert(rollbackSignals.every(s=>s.aborted));assert.equal(states.length,count);
 if(action==='supersede')assert.equal(manager.mode,'3d');
 manager.destroy();built.cleanup();return{patched,action,status:'PASS',rollbackSignalsAborted:rollbackSignals.length};
}
