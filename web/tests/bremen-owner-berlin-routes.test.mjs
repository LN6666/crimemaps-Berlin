import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const web=fileURLToPath(new URL('../',import.meta.url)),rootDir=path.join(web,'src/painted/root500/safety'),bremenDir=path.join(web,'src/painted/bremen/safety');
const parse=(file,text)=>ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
const [canonicalText,bremenText,managerText]=await Promise.all([readFile(path.join(rootDir,'owner-reconstruction.ts'),'utf8'),readFile(path.join(bremenDir,'owner-reconstruction.ts'),'utf8'),readFile(path.join(bremenDir,'three-dimensional-map.ts'),'utf8')]);
const canonical=parse('canonical.ts',canonicalText),bremen=parse('bremen.ts',bremenText),manager=parse('manager.ts',managerText);
const functions=ast=>new Map(ast.statements.filter(ts.isFunctionDeclaration).map(node=>[node.name.text,node]));
const rootFunctions=functions(canonical),bremenFunctions=functions(bremen);
const stage=rootFunctions.get('ownerReconstructionStages'),rootPrepare=rootFunctions.get('prepareOwnerReconstructionComponents'),bremenPrepare=bremenFunctions.get('prepareBremenOwnerReconstructionComponents');assert(stage&&rootPrepare&&bremenPrepare);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const signal=()=>new AbortController().signal;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const scope=values=>new Proxy(values,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
function expression(text,values){const js=ts.transpileModule('('+text.replace(/^export\s+/,'')+')',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;return Function('scope','with(scope){return '+js+'}')(scope(values));}
const zeroStats=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});

// Derive the manifest from the canonical aggregate's stage-wrapper namespaces
// (owner-lazy-2 R4): every -lazy wrapper the aggregate imports as a namespace
// exports the module-only start (startRoot500OwnerModule) and the batch data
// preparation (prepareRoot500Data) its stages run through; its facade names come
// from the aggregate's named import of the same wrapper, and its legacy prepare
// hook from the wrapper's own export (not from an aggregate binding). There are
// 35 stage wrappers (F029 included), 21 of them for Berlin.
const wrapperManifest=[],namedImports=new Map();
for(const declaration of canonical.statements)if(ts.isImportDeclaration(declaration)&&declaration.importClause?.namedBindings&&ts.isNamedImports(declaration.importClause.namedBindings))namedImports.set(declaration.moduleSpecifier.text,[...(namedImports.get(declaration.moduleSpecifier.text)??[]),...declaration.importClause.namedBindings.elements.map(element=>element.name.text)]);
for(const declaration of canonical.statements){
 if(!ts.isImportDeclaration(declaration)||!declaration.importClause?.namedBindings||!ts.isNamespaceImport(declaration.importClause.namedBindings))continue;
 const specifier=declaration.moduleSpecifier.text;if(!specifier.endsWith('-lazy')||specifier.includes('nonberlin'))continue;
 const file=path.resolve(rootDir,specifier)+'.ts',text=await readFile(file,'utf8'),ast=parse(file,text);let city,original;
 assert(/export const prepareRoot500Data=route\.prepareScope,startRoot500OwnerModule=route\.prepareModule;/.test(text),'stage wrapper namespace '+specifier+' exports its module start and data preparation');
 (function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='needed')(function predicate(p){if(ts.isBinaryExpression(p)&&p.left.getText(ast)==='c.city'&&ts.isStringLiteral(p.right))city=p.right.text;ts.forEachChild(p,predicate);})(node.initializer);if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)original=path.resolve(rootDir,node.arguments[0].text)+'.ts';ts.forEachChild(node,visit);})(ast);
 const names=namedImports.get(specifier)??[],prepare=text.match(/export function (prepare\w+Reconstruction)\(/)?.[1];assert(prepare,'wrapper '+specifier+' keeps its prepare hook');
 wrapperManifest.push({declaration,file,text,ast,city,original,prepare,namespace:declaration.importClause.namedBindings.name.text,reconstruct:names.find(name=>!name.startsWith('prepare')&&name.endsWith('Reconstruction')),materials:names.find(name=>name.endsWith('BaseMaterials'))});
}
const berlin=wrapperManifest.filter(route=>route.city==='berlin');
const major=['033','035','026','031','036','005'].map(id=>path.join(rootDir,`owner-f${id}-reconstruction.ts`));

test('Bremen uses the canonical aggregate, identity, materials and preparation instead of a second frozen chain',()=>{
 const binding=bremen.statements.find(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='../../root500/safety/owner-reconstruction');assert(binding);
 const aliases=new Map(binding.importClause.namedBindings.elements.map(element=>[element.name.text,(element.propertyName??element.name).text]));
 for(const [local,name]of [['frozenOwnerReconstructionComponents','ownerReconstructionComponents'],['frozenOwnerReconstructionIdentity','ownerReconstructionIdentity'],['frozenOwnerReconstructionBaseMaterials','ownerReconstructionBaseMaterials'],['prepareFrozenOwnerReconstructionComponents','prepareOwnerReconstructionComponents']])assert.equal(aliases.get(local),name);
 assert.equal(bremenFunctions.has('frozenOwnerReconstructionComponents'),false);assert.equal(bremenFunctions.has('frozenOwnerReconstructionBaseMaterials'),false);
 const calls=stage.body.statements.filter(ts.isVariableStatement).flatMap(node=>node.declarationList.declarations).filter(node=>ts.isCallExpression(node.initializer)&&ts.isIdentifier(node.initializer.expression));assert.equal(calls.length,221,'The shared original owner chain retains all 221 call declarations');
 assert.equal(wrapperManifest.length,35);assert.equal(berlin.length,21);assert(wrapperManifest.every(route=>route.reconstruct&&route.materials&&route.original),'every stage wrapper names its facades and lazy original');for(const file of major)assert(berlin.some(route=>route.original===file),'Missing actual Berlin wrapper '+file);
});

function wrapperFixture(){
 const loads=[],cache=new Map(),originals=new Map(berlin.map(route=>[route.original,route]));
 const evaluate=(text,require)=>{const exports={};Function('require','exports',ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(require,exports);return exports;};
 function load(file){
  if(originals.has(file)){const route=originals.get(file);loads.push(file);return{[route.reconstruct]:rows=>({components:rows,stats:{fixture:route.reconstruct}}),[route.materials]:()=>({objects:1,vertices:1,actualVisualAccepted:false})};}
  if(cache.has(file))return cache.get(file);
  assert(berlin.some(route=>route.file===file)||file===path.join(rootDir,'lazy-owner-route.ts')||/-(?:identities|stateless|materials)\.ts$/.test(file),'Unexpected dependency; original builder/table source must never be opened: '+file);assert(statSync(file).size<65536);
  const text=readFileSync(file,'utf8'),module=evaluate(text,name=>load(path.resolve(path.dirname(file),name)+'.ts'));cache.set(file,module);return module;
 }
 const modules=new Map(berlin.map(route=>[route,load(route.file)]));
 function target(route){
  const pending=[route.ast],seen=new Set();while(pending.length){const ast=pending.shift();for(const node of ast.statements){if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations){let value=declaration.initializer;while(value&&(ts.isAsExpression(value)||ts.isSatisfiesExpression(value)))value=value.expression;if(/_IDS$/.test(declaration.name.getText(ast))&&ts.isArrayLiteralExpression(value))return JSON.parse(value.getText(ast))[0];}if(ts.isImportDeclaration(node)&&/-(?:identities|stateless)$/.test(node.moduleSpecifier.text)){const file=path.resolve(rootDir,node.moduleSpecifier.text)+'.ts';if(!seen.has(file)){seen.add(file);assert(statSync(file).size<65536);pending.push(parse(file,readFileSync(file,'utf8')));}}}}
  throw Error('No bounded identity metadata for '+route.file);
 }
 return{loads,modules,target};
}
test('all 21 actual Berlin facades stay synchronous on Bremen no-match without evaluating any original builder',async()=>{
 const f=wrapperFixture(),rows=[{city:'bremen',objectId:'unrelated',partId:'unrelated',batches:[]}];assert.equal(f.loads.length,0);
 for(const route of berlin){const module=f.modules.get(route);await module[route.prepare](rows,signal());const result=module[route.reconstruct](rows);assert.equal(result instanceof Promise,false);assert.deepEqual(result.components,rows);assert.equal(result.components[0],rows[0]);assert.deepEqual(result.stats,zeroStats());const paint=new Float32Array([.25]),frames=new Float32Array([.5]),materials=module[route.materials](rows,paint,frames);
  // The F029 facade (now in the namespace manifest) is a void material hook: the aggregate ignores its return.
  if(route.reconstruct==='ownerF029Reconstruction')assert.equal(materials,undefined);else assert.deepEqual(materials,{objects:0,vertices:0,actualVisualAccepted:false});assert.deepEqual([...paint],[.25]);assert.deepEqual([...frames],[.5]);}
 assert.equal(f.loads.length,0);
});
test('all 21 real facades still delegate a matching Berlin identity after preparation',async()=>{
 const f=wrapperFixture();for(const route of berlin){const module=f.modules.get(route),rows=[{...f.target(route),city:'berlin',batches:[]}];await module[route.prepare](rows,signal());assert.equal(module[route.reconstruct](rows).stats.fixture,route.reconstruct);}
 assert.deepEqual(f.loads,berlin.map(route=>route.original));
});

// Stages yield {components, recipe} (no prepare field, owner-lazy-2 R4). The actual
// aggregate prepares each stage through the wrapper namespace that owns its recipe
// (prepareScopedOwnerData -> module.prepareRoot500Data), after one module wave
// (ownerRouteModules -> startRoot500OwnerModule), and waits through the adapter.
const stageCall=node=>{const call=node.initializer;return call.expression.text==='scopedOwnerCall'&&ts.isIdentifier(call.arguments[0])?call.arguments[0].text:call.expression.text;};
function stageFixture(target,predecessor){
 const gate=deferred(),calls=[],waited=[],controller=new AbortController(),stop=Error('stop after target stage'),wait=operation=>{waited.push(operation);return operation;},values={};
 const callNames=stage.body.statements.filter(ts.isVariableStatement).flatMap(node=>node.declarationList.declarations).filter(node=>ts.isCallExpression(node.initializer)&&ts.isIdentifier(node.initializer.expression)).map(stageCall);
 for(const name of callNames)values[name]=rows=>{calls.push(name);if(name===target)throw stop;return{components:name===predecessor?rows.map(row=>({...row,fixtureStage:predecessor})):rows,stats:zeroStats()};};
 let yields=0;(function visit(node){if(ts.isYieldExpression(node)){let object=node.expression;while(ts.isSatisfiesExpression(object)||ts.isAsExpression(object))object=object.expression;const fields=object.properties.map(property=>property.name.getText(canonical));assert.deepEqual(fields.sort(),['components','recipe'],'a stage yields only its components and recipe');yields++;}ts.forEachChild(node,visit);})(stage);assert(yields>0);
 const wrapper=wrapperManifest.find(route=>route.reconstruct===target);assert(wrapper,'the target stage belongs to a wrapper namespace');
 const namespace={startRoot500OwnerModule(rows,s){assert.equal(s,controller.signal);calls.push('module:'+target);return undefined;},
  prepareRoot500Data(rows,s,_scope,recipe){assert.equal(s,controller.signal);if(recipe===values[target]){assert.equal(rows[0].fixtureStage,predecessor);calls.push('prepare:'+target);return gate.promise;}}};
 Object.assign(values,{scopedOwnerModules:new Map([[values[target],{module:namespace,arity:undefined}]]),ownerStageWrappers:[namespace],scopedOwnerRoutes:{}});
 for(const name of ['scopedOwnerCall','prepareScopedOwnerData','ownerRouteModules']){const node=rootFunctions.get(name);assert(node,'the aggregate declares '+name);values[name]=expression(node.getText(canonical),values);}
 values.ownerReconstructionStages=expression(stage.getText(canonical),values);const prepare=expression(rootPrepare.getText(canonical),values);return{prepare:()=>prepare([{city:'berlin',objectId:'fixture',partId:'part',batches:[]}],controller.signal,wait),gate,calls,waited,controller,stop};
}
for(const [target,predecessor]of [['ownerF005Reconstruction','ownerF006Reconstruction'],['ownerF033Reconstruction','ownerF034Reconstruction']]){
 test(`${target} prepares the actual transformed predecessor rows at its original stage`,async()=>{const f=stageFixture(target,predecessor),pending=f.prepare();await tick();assert.equal(f.calls[0],'module:'+target,'one module wave starts before any stage');assert.equal(f.calls.at(-1),'prepare:'+target);assert.equal(f.calls.includes(target),false);assert(f.waited.includes(f.gate.promise),'the stage preparation is awaited through the session adapter');f.gate.resolve();await assert.rejects(pending,error=>error===f.stop);assert.equal(f.calls.at(-1),target);});
 test(`${target} never executes after cancellation or failure of its actual preparation stage`,async()=>{for(const cancel of [false,true]){const f=stageFixture(target,predecessor),pending=f.prepare(),failure=Error('controlled stage failure');await tick();if(cancel){f.controller.abort();f.gate.resolve();await assert.rejects(pending,{name:'AbortError'});}else{f.gate.reject(failure);await assert.rejects(pending,error=>error===failure);}assert.equal(f.calls.includes(target),false);}});
}

// DECISIONS 2026-11-02 "第三段第二轮结项" (R2 fixtures CDR[8](1)): the Bremen manager's shard no longer
// prepares the shared canonical owner chain. The Bremen renderer's prepareBatches(input, signal, wait,
// admission, scope) does: it runs the actual Bremen helper inside one batch data scope, and nothing after
// it (derived displays, module resources, certificates, chunk retention, publication) runs before that
// preparation settles. Tests 8-14 check the same properties at that location.
const rendererText=readFileSync(path.join(bremenDir,'building-mesh-renderer.ts'),'utf8'),renderer=parse('renderer.ts',rendererText);
const rendererDeclaration=name=>{let found;(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node;ts.forEachChild(node,visit);})(renderer);assert(found,'the Bremen renderer declares '+name);return found.getText(renderer);};
const rendererConst=name=>{const found=renderer.statements.filter(ts.isVariableStatement).flatMap(node=>node.declarationList.declarations).find(node=>node.name.getText(renderer)===name&&node.initializer)?.initializer;assert(found,'the Bremen renderer declares the module-level '+name);return found.getText(renderer);};
// The actual helper's stage driver, over a two-stage stand-in for the frozen stage list: one Bremen
// preparation stage, then the shared canonical ("frozen") stage whose output becomes the result.
function bremenHelper(prepare,events=[]){
 const stats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 return expression(bremenPrepare.getText(bremen),{prepareFrozenOwnerReconstructionComponents:prepare,EDGE70_RESOURCE:'edge70-resource',edgeAg70Identity:()=>false,withBremenRecipeDemand:(_rows,consume)=>consume(),
  bremenScopedCall:()=>{throw Error('the stand-in stage list yields no call stage');},prepareBremenFunctions:async(scope,fns,rows,signal)=>{signal.throwIfAborted();events.push('bremen-stage');},
  *bremenOwnerStages(components,_leaf,_runtime,_scope){yield{kind:'prepare',fns:[()=>{}],components};const frozen=yield{kind:'frozen',components};events.push('after-frozen');return{components:frozen?.components??components,stats:frozen?.stats??stats};}});
}
test('the actual Bremen preparation helper needs no scope for empty rows, fails closed without one otherwise, and forwards rows/signal/wait/scope to the canonical stage',async()=>{
 // Empty rows still return synchronously-shaped zero stats without any scope; any other rows now need
 // the batch data scope (fail closed), and the canonical stage receives the very rows, signal, wait
 // adapter and batch scope it was given. The helper no longer skips pure Bremen rows (HEAD's city skip
 // is gone); the stage list here is a stand-in, so which rows reach the canonical stage is checked on
 // the actual bremenOwnerStages in the next test.
 const foreign=[],fast=bremenHelper(async(...args)=>{foreign.push(args);});const empty=await fast([],signal());assert.deepEqual(empty.stats,zeroStats());assert.equal(foreign.length,0);
 await assert.rejects(fast([{city:'bremen'}],signal()),/Bremen reconstruction requires a batch data scope/);assert.equal(foreign.length,0,'no canonical preparation without a scope');
 const batchScope={prepare:async()=>{throw Error('no AG70 row in this fixture');}},frankfurt=[{city:'frankfurt'}],adapter=operation=>operation,s=signal();await fast(frankfurt,s,adapter,batchScope);
 assert.equal(foreign.length,1);assert.equal(foreign[0][0],frankfurt);assert.equal(foreign[0][1],s);assert.equal(foreign[0][2],adapter);assert.equal(foreign[0][3],batchScope);
 const gate=deferred(),calls=[],events=[],wait=operation=>operation,controller=new AbortController(),prepare=bremenHelper((...args)=>{calls.push(args);return gate.promise;},events),rows=[{city:'berlin'}];const pending=prepare(rows,controller.signal,wait,batchScope);await tick();
 assert.deepEqual(events,['bremen-stage']);assert.equal(calls[0][0],rows);assert.equal(calls[0][1],controller.signal);assert.equal(calls[0][2],wait);assert.equal(calls[0][3],batchScope);controller.abort();gate.resolve();await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(events,['bremen-stage'],'an aborted preparation never resumes the stage list');
});
// Which rows reach canonical preparation is decided by the actual stage list, not by a city skip in
// the helper: bremenOwnerStages yields its one canonical ("frozen") stage unconditionally, with the very
// rows it was given, before any early return. So pure Bremen rows (with a batch scope) are prepared
// canonically too, exactly like foreign rows.
test('the actual Bremen stage list sends every non-empty row set, pure Bremen included, through one canonical stage',()=>{
 const generator=bremenFunctions.get('bremenOwnerStages');assert(generator?.asteriskToken,'the Bremen module declares the generator bremenOwnerStages');
 assert.equal(generator.parameters[0].name.getText(bremen),'components');
 const frozen=[],exits=[],reassigned=[];
 const owner=node=>{let at=node.parent;while(at&&!ts.isFunctionLike(at))at=at.parent;return at;};
 (function visit(node){
  if(ts.isYieldExpression(node)&&node.expression&&ts.isObjectLiteralExpression(node.expression)&&node.expression.properties.some(property=>property.name?.getText(bremen)==='kind'&&property.initializer?.text==='frozen'))frozen.push(node);
  if((ts.isReturnStatement(node)||ts.isThrowStatement(node))&&owner(node)===generator)exits.push(node);
  if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&node.left.getText(bremen)==='components'&&owner(node)===generator)reassigned.push(node);
  ts.forEachChild(node,visit);
 })(generator);
 assert.equal(frozen.length,1,'one canonical stage');
 const yielded=frozen[0].expression.properties.find(property=>property.name?.getText(bremen)==='components');
 assert(yielded&&ts.isShorthandPropertyAssignment(yielded),'the canonical stage receives the generator rows as given');assert.equal(reassigned.length,0,'the generator never replaces its input rows');
 const unconditional=new Set([ts.SyntaxKind.ParenthesizedExpression,ts.SyntaxKind.AsExpression,ts.SyntaxKind.VariableDeclaration,ts.SyntaxKind.VariableDeclarationList,ts.SyntaxKind.VariableStatement,ts.SyntaxKind.ExpressionStatement]);
 let at=frozen[0].parent;const path=[];while(at&&at!==generator.body){path.push(ts.SyntaxKind[at.kind]);assert(unconditional.has(at.kind),'the canonical stage is not behind a condition, loop or nested function: '+path.join(' < '));at=at.parent;}
 assert.equal(at,generator.body,'the canonical stage is a top-level statement of the generator');
 assert.deepEqual(exits.filter(node=>node.pos<frozen[0].pos).map(node=>node.getText(bremen)),[],'nothing returns or throws out of the stage list before the canonical stage');
});
const managerShard=(()=>{let found;(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='shard')found=node;ts.forEachChild(node,visit);})(manager);assert(found);return found.getText(manager);})();
// Bind the real pure chunk selection helpers used by the extracted preparation path.
const chunkPackingAST=parse('chunk-mesh-packing.ts',await readFile(path.join(rootDir,'chunk-mesh-packing.ts'),'utf8'));
const chunkSelection=Object.fromEntries(['completeChunkSourceRows','orderVisibleChunkRows','visibleChunkDisplayKeys'].map(name=>[name,expression(functions(chunkPackingAST).get(name).getText(chunkPackingAST),{})]));
function batchFixture(variant){
 const row={city:'bremen',objectId:'osm/way/1',partId:'osm/way/1/fixture',sourceFeature:{type:'Feature',properties:{}},componentGeometry:{type:'Polygon',coordinates:[[[8.8,53.07],[8.81,53.07],[8.81,53.08],[8.8,53.07]]]},origin:[8.8,53.07],batches:[]};
 const input=[row],gate=deferred(),calls=[],released=[],controller=new AbortController(),wait=operation=>operation;
 const makeScope=label=>({label,release(){released.push(label);calls.push('scope-release:'+label);}});
 const provided=variant==='provided-scope'?makeScope('provided'):undefined,chunkInput=variant==='chunk-input'?{store:{},groups:[],cohorts:[]}:undefined;let ownScope;
 const values={...chunkSelection,city:'bremen',destroyed:false,nativeLeafSHA:()=>undefined,DOMException,BREMEN_MATERIAL_SCOPE_CONSUMERS:[],
  ownerRuntime:{createBatchScope(){calls.push('scope-create');return ownScope=makeScope('own');},async prepareBatchCertificates(scope,_rows,s){s.throwIfAborted();calls.push('certificates');}},
  prepareBremenProgressiveAdmissions:async(_rows,s)=>{s.throwIfAborted();calls.push('progressive');},
  prepareOwnerRecoveredSourceComponents:async(_rows,s)=>{s.throwIfAborted();calls.push('recovered');},
  scopeOriginal_ownerRecoveredSourceComponents:rows=>rows,
  prepareBremenOwnerReconstructionComponents:bremenHelper((rows,s,adapter,scope)=>{calls.push('canonical-prepare');assert.deepEqual(rows,input);assert.equal(s,controller.signal);assert.equal(adapter,wait);assert.equal(scope,provided??ownScope,'the canonical stage prepares inside the batch scope');return gate.promise;}),
  bremenScopedCall:(_fn,args)=>{calls.push('clip');return args[0];},infillF288ClipCoplanarFacilityRoofs:()=>{},
  prepareRoot500DerivedDisplays:async(_rows,_city,_admission,s)=>{s.throwIfAborted();calls.push('derived');},
  scopeOriginal_appendF068DerivedDisplay:rows=>rows,scopeOriginal_appendF075DerivedDisplay:rows=>rows,scopeOriginal_appendF082DerivedDisplay:rows=>rows,scopeOriginal_appendF107DerivedDisplay:rows=>rows,
  prepareBremenModuleResources:async(_scope,_rows,s)=>{s.throwIfAborted();calls.push('module-resources');},
  retainRendererChunkInput:value=>{if(!value)return undefined;calls.push('retain-chunks');return{release(){calls.push('release-chunks');}};}};
 values.validate=expression(rendererDeclaration('validate'),values);values.key=expression(rendererConst('key'),values);
 const prepareBatches=expression(rendererDeclaration('prepareBatches'),values);
 return{run:()=>prepareBatches(input,controller.signal,wait,undefined,provided,undefined,chunkInput),gate,calls,released,controller,input};
}
const afterPreparation=['clip','derived','module-resources','certificates','retain-chunks'];
for(const variant of ['own-scope','provided-scope','chunk-input']){
 test(`actual Bremen renderer ${variant} prepareBatches awaits shared canonical preparation before certificates/publication`,async()=>{
  assert.equal(/prepareBremenOwnerReconstructionComponents\(/.test(managerShard),false,'the manager shard no longer prepares the shared chain; the renderer batch does');
  const f=batchFixture(variant);let returned=false;const pending=f.run().then(value=>{returned=true;return value;});await tick();
  assert.deepEqual(f.calls,[...(variant==='provided-scope'?[]:['scope-create']),'progressive','recovered','canonical-prepare']);assert.equal(returned,false);assert.deepEqual(f.released,[],'the batch scope stays held while its preparation is pending');
  f.gate.resolve();const batch=await pending;assert.equal(batch.input,f.input);assert.deepEqual(f.calls.filter(call=>afterPreparation.includes(call)),['clip','derived','module-resources','certificates',...(variant==='chunk-input'?['retain-chunks']:[])]);assert.deepEqual(f.released,[],'a published batch keeps its scope');
  batch.release();assert.deepEqual(f.released,[variant==='provided-scope'?'provided':'own']);if(variant==='chunk-input')assert.equal(f.calls.at(-2),'release-chunks');
 });
 test(`actual Bremen renderer ${variant} cancellation/failure cannot publish an unprepared batch and releases its scope`,async()=>{
  for(const cancel of [false,true]){const f=batchFixture(variant),pending=f.run(),failure=Error('controlled canonical preparation failure');await tick();
   if(cancel){f.controller.abort();f.gate.resolve();await assert.rejects(pending,{name:'AbortError'});}else{f.gate.reject(failure);await assert.rejects(pending,error=>error===failure);}
   assert.deepEqual(f.calls.filter(call=>afterPreparation.includes(call)),[],'nothing after the canonical preparation runs');assert.equal(f.calls.at(-1),'scope-release:'+(variant==='provided-scope'?'provided':'own'));assert.deepEqual(f.released,[variant==='provided-scope'?'provided':'own'],'the unpublished batch releases its scope exactly once');}
 });
}

test('both actual Bremen roots exclude every Berlin lazy original and the six K6 eager data entries',async t=>{
 // Reuse the existing bounded static-import parser, without running its tests
 // or parsing any raw JSON. One combined closure covers both product roots.
 const helperText=await readFile(path.join(web,'tests/bremen-bulk70-lazy.test.mjs'),'utf8'),helperAST=parse('closure.mjs',helperText),helpers=helperAST.statements.filter(node=>ts.isFunctionDeclaration(node)&&['valueImports','staticClosure'].includes(node.name?.text));assert.equal(helpers.length,2);
 const closureFunction=Function('ts','assert','readFile','stat','path','web',helpers.map(node=>node.getText(helperAST)).join('\n')+';return staticClosure;')(ts,assert,readFile,stat,path,web),entries=['three-dimensional-map.ts','building-mesh-renderer.ts'].map(name=>path.join(bremenDir,name)),closure=await closureFunction(entries);
 for(const target of [...berlin.map(route=>route.original),path.join(rootDir,'owner-f005-completion-geometry.ts')]){const route=[];for(let file=target;file;file=closure.parents.get(file))route.push(path.relative(web,file));assert(!closure.parents.has(target),'Unexpected eager Berlin path: '+route.reverse().join(' → '));}
 t.diagnostic(`Bremen closure: ${closure.parents.size} local modules / ${closure.bytes} source bytes; ${berlin.length} Berlin builders plus F005 completion data unreachable`);
});
