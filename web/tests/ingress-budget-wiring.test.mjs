import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {build} from 'esbuild';

const web=fileURLToPath(new URL('../',import.meta.url)),safety=path.join(web,'src/safety');
const parse=async name=>{const text=await readFile(path.join(safety,name),'utf8');return ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);};
function collect(ast,predicate){const out=[];(function visit(node){if(predicate(node))out.push(node);ts.forEachChild(node,visit);})(ast);return out;}
const named=(node,ast,name)=>node.name?.getText(ast)===name;

test('the compositor starts frozen initialization with its byte leases and page ledger',async()=>{
  const ast=await parse('painted-map.ts');
  const starts=collect(ast,node=>ts.isVariableDeclaration(node)&&named(node,ast,'startFrozenInitialization'));assert.equal(starts.length,1);
  const calls=collect(starts[0],node=>ts.isCallExpression(node)&&node.expression.getText(ast)==='beginFrozenPaintTableInitialization');assert.equal(calls.length,1);
  const ingress=calls[0].arguments[0];assert(ts.isObjectLiteralExpression(ingress),'a FrozenTableIngress, not the released compat reader');
  const property=key=>ingress.properties.find(row=>(ts.isPropertyAssignment(row)||ts.isShorthandPropertyAssignment(row))&&row.name.getText(ast)===key);
  assert(property('acquireBytes'),'byte leases from the shared transport');
  const budget=property('budget');assert(budget&&ts.isPropertyAssignment(budget)&&budget.initializer.getText(ast)==='resourceStore.budget','the compositor page ledger');
  // The shared transport's acquireBytes is the one passed to every ingress owner.
  const transport=collect(ast,node=>ts.isVariableDeclaration(node)&&named(node,ast,'acquireBytes')&&node.initializer?.getText(ast)==='transport.acquireBytes');
  assert.equal(transport.length,1);
});

test('compositor diagnostics report facade helper source admission beside resource residency',async()=>{
  const ast=await parse('painted-map.ts');
  const literals=collect(ast,node=>ts.isObjectLiteralExpression(node)&&node.properties.some(row=>ts.isPropertyAssignment(row)&&row.name.getText(ast)==='resourceResidency'));
  assert.equal(literals.length,1);
  const row=literals[0].properties.find(item=>ts.isPropertyAssignment(item)&&item.name.getText(ast)==='facadeHelperSource');
  assert(row,'facadeHelperSource diagnostics are present');
  assert.equal(row.initializer.getText(ast),'facadeHelperSourceStats(resourceStore.budget)');
  const imports=ast.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./facade-helper-source');
  assert.equal(imports.length,1);assert.match(imports[0].getText(ast),/\bfacadeHelperSourceStats\b/);
});

// The actual main.ts environment installer statement, run with the actual
// environment admission helpers on a test ledger. Only the scene manager, the
// 3D owner's readAsset and DOM/map handles are stand-ins.
const environmentHelpers=await build({stdin:{contents:"export * from './environment-resource-budget';export {createResourceBudget} from './render-runtime/resource-budget';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export * as transport from './resource-byte-transport';",resolveDir:safety,sourcefile:'environment-helpers.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022'});
const helpers=await import('data:text/javascript;base64,'+Buffer.from(environmentHelpers.outputFiles[0].text).toString('base64'));
const mainAst=await parse('main.ts');
const declaration=collect(mainAst,node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>named(row,mainAst,'syncEnvironmentMode')));
assert.equal(declaration.length,1);
const installer=ts.transpileModule(declaration[0].getText(mainAst),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/\bimport\(/g,'__import(');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const admission={path:'/safety/environment/berlin/water-admission-test.json',sha256:'e'.repeat(64),bytes:4096};
function environment({limitBytes=64*1024*1024,readAsset}={}){
  const budget=helpers.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,1024*1024)}),store=helpers.createChunkResourceStore({budget});
  const calls=[],installed=[],manager={setReflectionSource(){},setSceneEnvironment(){},setVisible(){},setOffscreen(){},setReducedMotion(){},setMode(value){calls.push(['mode',value]);}};
  const modules={
    './environment-scene-manager':{installEnvironmentScene(options){installed.push(options);return manager;}},
    './environment-city-admission':{environmentWaterAdmission:city=>city==='berlin'?admission:undefined},
    // The real helpers; only the page-store lookup is the test ledger's store.
    './environment-resource-budget':{...helpers,environmentResourceStore:(...args)=>{calls.push(['store',args.length]);return store;}},
    // The read envelope is minted by the actual byte transport module.
    './resource-byte-transport':helpers.transport,
  };
  const context=vm.createContext({AbortController,DOMException,Promise,console,
    __import:specifier=>Promise.resolve(modules[specifier]??assert.fail('unexpected import '+specifier)),
    environmentWanted:false,environmentDestroyed:false,environmentSuspended:false,environmentLoad:undefined,environmentRequest:new AbortController(),environmentStatus:'idle',environmentScene:undefined,
    document:{hidden:false},currentCity:'berlin',map:{},matchMedia:()=>({matches:false}),sceneFrameClock:undefined,planarReflectionGroup:()=>({}),dedicatedAppearance:undefined,
    sceneEnvironment:{},sceneViewportVisible:true,threeDimensionalMotion:{matches:false},
    // The 3D owner: its readiness (holding nothing), its page store, and the
    // forwarded caller-admitted read.
    threeDimensional:{mode:'3d',renderer:undefined,resourceStore:store,ensureReady:async signal=>{signal.throwIfAborted();calls.push(['ready',budget.stats.bytes,budget.stats.availabilityListeners]);},readAsset:(asset,signal,max,admission)=>{calls.push(['read',asset,max,budget.stats.bytes,admission,admission?.admitted?.bytes]);return readAsset(asset,signal,max,budget);}},
  });
  vm.runInContext(installer,context);
  // The reader copy, decoded text and parsed value plus the read's two-copy envelope, in one claim.
  const expected=helpers.environmentJsonReadCosts(admission,'water admission profile').reduce((bytes,cost)=>bytes+cost.bytes,0)+2*admission.bytes;
  return{budget,store,calls,installed,context,expected,start(){vm.runInContext('syncEnvironmentMode(true);',context);return context.environmentLoad;}};
}

test('the water-admission profile working set is on the page ledger before its descriptor-sized read and leaves after decode',async()=>{
  const profile={boundarySHA256:'b'.repeat(64),origin:[13.4,52.5],sourcePbfSHA256:'c'.repeat(64),physicalTileSHA256:['d'.repeat(64)]};
  const f=environment({readAsset:async(_asset,signal)=>{signal.throwIfAborted();await settle();return structuredClone(profile);}});
  await f.start();
  const read=f.calls.find(row=>row[0]==='read');
  assert(read,'the profile is read through the 3D owner');assert.equal(read[1],admission);
  assert.equal(read[2],admission.bytes,'the read ceiling is the descriptor size, not one MiB');
  assert.equal(read[3],f.expected,'the reader copy, decoded text, parsed value and the read envelope were admitted in one claim before the read began');
  assert.equal(read[5],f.expected,'that claim is the read\'s admission');assert.equal(read[4].envelope.reduce((bytes,cost)=>bytes+cost.bytes,0),2*admission.bytes,'with its minted two-copy envelope');
  const ready=f.calls.findIndex(row=>row[0]==='ready');assert(ready>=0&&ready<f.calls.findIndex(row=>row[0]==='read'),'3D readiness precedes the admission');assert.deepEqual(f.calls[ready].slice(1),[0,0],'nothing is held while readiness is awaited');
  assert.equal(f.context.environmentStatus,'installed');assert.deepEqual(f.installed[0].waterAdmission,profile);
  assert.equal(f.budget.stats.bytes,0,'the transient profile claim was returned after decode');
  f.store.destroy();
});

test('the profile read waits for ledger capacity and does not start while the working set does not fit',async()=>{
  const limitBytes=256*1024,f=environment({limitBytes,readAsset:async()=>({boundarySHA256:'b'.repeat(64),origin:[0,0],sourcePbfSHA256:'c'.repeat(64),physicalTileSHA256:[]})});
  assert(f.expected<limitBytes);
  const blocker=f.budget.reserve({category:'construction',bytes:limitBytes-f.expected+1,precision:'estimate'});
  const loading=f.start();await settle();await settle();
  assert.equal(f.calls.some(row=>row[0]==='read'),false,'no read before admission');
  assert.equal(f.context.environmentStatus,'loading');assert.equal(f.budget.stats.availabilityListeners,1);
  blocker.release();await loading;
  assert.equal(f.context.environmentStatus,'installed');assert.equal(f.budget.stats.bytes,0);assert.equal(f.budget.stats.availabilityListeners,0);
  f.store.destroy();
});

test('a failed or superseded profile read returns its claim and never installs the scene',async()=>{
  const failed=environment({readAsset:async()=>{throw Error('profile unavailable');}});
  await failed.start();
  assert.equal(failed.context.environmentStatus,'error');assert.equal(failed.installed.length,0);assert.equal(failed.budget.stats.bytes,0);failed.store.destroy();
  let started;const gate=new Promise(resolve=>{started=resolve;});
  const aborted=environment({readAsset:(_asset,signal)=>new Promise((_resolve,reject)=>{started();signal.addEventListener('abort',()=>reject(signal.reason),{once:true});})});
  const loading=aborted.start();await gate;
  assert.equal(aborted.budget.stats.bytes,aborted.expected,'held while the read is in flight');
  vm.runInContext('environmentWanted=false;environmentRequest.abort();',aborted.context);await loading;
  assert.equal(aborted.installed.length,0);assert.equal(aborted.budget.stats.bytes,0,'the superseded read returned its claim');aborted.store.destroy();
  const unfit=environment({limitBytes:1024,readAsset:async()=>assert.fail('an unfit profile is never read')});
  await unfit.start();
  assert.equal(unfit.context.environmentStatus,'error','a working set above the whole page ledger is refused, not queued');assert.equal(unfit.budget.stats.availabilityListeners,0);unfit.store.destroy();
});
