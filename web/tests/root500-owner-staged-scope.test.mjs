import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import ts from 'typescript';

// The actual canonical stage driver runs against small virtual recipe modules.
// No original model literal/table, shader or builder is evaluated by this suite.
const web=fileURLToPath(new URL('../',import.meta.url)),file=path.join(web,'src/painted/root500/safety/owner-reconstruction.ts');
const text=await readFile(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),manifest=JSON.parse(await readFile(path.join(web,'tests/root500-owner-scope-manifest.json'),'utf8'));
const exportsByModule=new Map(),aritiesByModule=new Map();
for(const row of manifest.modules){const key='./'+path.basename(row.file,'.ts');aritiesByModule.set(key,Object.fromEntries(row.functions.filter(fn=>fn.needsScope).map(fn=>[fn.name,fn.originalArity])));}
for(const declaration of ast.statements){if(!ts.isImportDeclaration(declaration)&&!ts.isExportDeclaration(declaration))continue;const specifier=declaration.moduleSpecifier?.text;if(!specifier?.startsWith('./'))continue;const names=exportsByModule.get(specifier)??new Set();const bindings=ts.isImportDeclaration(declaration)?declaration.importClause?.namedBindings:declaration.exportClause;if(bindings&&(ts.isNamedImports(bindings)||ts.isNamedExports(bindings)))for(const element of bindings.elements)if(!element.isTypeOnly)names.add((element.propertyName??element.name).text);exportsByModule.set(specifier,names);}
const virtualSource=(specifier)=>{
 const key=specifier.slice(2),arities=aritiesByModule.get(specifier)??{},names=[...(exportsByModule.get(specifier)??[])].filter(name=>name!=='root500DataFunctionArities');
 const declarations=names.map(name=>`export function ${name}(...args){return globalThis.__root500OwnerStageState.call(${JSON.stringify(key)},${JSON.stringify(name)},args,${JSON.stringify(arities[name]??null)});}`).join('\n');
 return `${declarations}\nexport const root500DataFunctionArities=${JSON.stringify(arities)};\nexport function prepareRoot500Data(rows,signal,scope){return globalThis.__root500OwnerStageState.prepare(${JSON.stringify(key)},rows,signal,scope);}`;
};
const built=await build({entryPoints:[file],bundle:true,write:false,format:'esm',platform:'node',target:'es2022',plugins:[{name:'virtual-root-owner-recipes',setup(builder){builder.onResolve({filter:/^\.\//},args=>{assert.equal(args.importer,file,'Only the canonical aggregate imports may enter this fixture');return{path:args.path,namespace:'scope-recipes'};});builder.onLoad({filter:/.*/,namespace:'scope-recipes'},args=>({contents:virtualSource(args.path),loader:'js'}));}}]});
const owner=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=root500-owner-staged-scope-fixture.mjs').toString('base64'));
const tick=()=>new Promise(resolve=>setImmediate(resolve)),signal=()=>new AbortController().signal;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const zero=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
const stages=['ownerF257Reconstruction','ownerF259Reconstruction','ownerF261Reconstruction','ownerF274Reconstruction'];
function fixture({gateAt,failAt,receiptErrors={}}={}){
 const calls=[],prepares=[],gate=deferred(),scope={label:'one prepared generation'},rows=[{city:'bremen',objectId:'fixture',partId:'part',batches:[],chain:[]}];
 const state={calls,prepares,scope,call(module,name,args,arity){
  if(arity!==null){assert.equal(args[arity],scope,name+' must receive the exact batch scope after its original arguments');assert.equal(args.length,arity+1);}
  if(name.endsWith('Identity'))return false;
  if(name.includes('BaseMaterials')||name.endsWith('Materials')||name.startsWith('apply'))return{objects:0,vertices:0,actualVisualAccepted:false};
  if(name==='ownerF154RecoveredSources')return args[0];
  calls.push(name);const index=stages.indexOf(name);if(index>=0){assert.deepEqual(args[0][0].chain,stages.slice(0,index));const stats=zero();if(receiptErrors[name])stats.error=receiptErrors[name];return{components:args[0].map(row=>({...row,chain:[...row.chain,name]})),stats};}
  return{components:args[0],stats:zero(),cofaceStats:{fixture:true}};
 },async prepare(module,components,request,received){
  assert.equal(received,scope);request.throwIfAborted();const match=module.match(/^owner-f(257|259|261|274)-reconstruction$/);if(!match)return;
  const name='ownerF'+match[1]+'Reconstruction',index=stages.indexOf(name);assert.deepEqual(components[0].chain,stages.slice(0,index));prepares.push(name);
  if(name===failAt)throw Error('controlled recipe failure');if(name===gateAt)await gate.promise;request.throwIfAborted();
 }};
 globalThis.__root500OwnerStageState=state;return{scope,rows,calls,prepares,gate};
}

test('canonical preparation awaits each actual transformed predecessor before F257/F259/F261/F274',async()=>{
 const f=fixture({gateAt:stages[2]}),pending=owner.prepareOwnerReconstructionComponents(f.rows,signal(),operation=>operation,f.scope);await tick();
 assert.deepEqual(f.prepares,stages.slice(0,3));assert.deepEqual(f.calls.filter(name=>stages.includes(name)),stages.slice(0,2));f.gate.resolve();const result=await pending;
 assert.deepEqual(result.components[0].chain,stages);assert.deepEqual(f.prepares,stages);assert.equal(f.rows[0].chain.length,0,'the native input remains unchanged');
});
test('canonical cancellation/failure cannot execute or publish the blocked stage or its later dependencies',async()=>{
 for(const failure of [false,true]){const f=fixture({gateAt:failure?undefined:stages[2],failAt:failure?stages[2]:undefined}),controller=new AbortController(),pending=owner.prepareOwnerReconstructionComponents(f.rows,controller.signal,undefined,f.scope);
  if(failure)await assert.rejects(pending,/controlled recipe failure/);else{await tick();controller.abort();f.gate.resolve();await assert.rejects(pending,{name:'AbortError'});}
  assert.deepEqual(f.calls.filter(name=>stages.includes(name)),stages.slice(0,2));
 }
});
test('the aggregate identity and material APIs forward the same scope without occupying original parameters',()=>{
 const f=fixture();assert.equal(owner.ownerReconstructionIdentity(f.rows[0],f.scope),false);owner.ownerReconstructionBaseMaterials(f.rows,new Float32Array(),new Float32Array(),f.scope);
});
test('F154 source preparation and recovery retain their coordinated public aliases',async()=>{
 const f=fixture();await owner.prepareOwnerRecoveredSourceComponents(f.rows,signal(),undefined,f.scope);assert.equal(owner.ownerRecoveredSourceComponents(f.rows,f.scope),f.rows);
});

// Replaces the valid owner-stage-prepare receipts and early/late barrier cases.
// Actual resource/cold behavior remains in root500-owner-data-scope.test.mjs;
// commit/repack/source snapshot behavior stays in the manager/renderer suites.
test('canonical receipts retain multiple owner errors and cofaceStats with one ordered run per sync or async stage',async()=>{
 const messages={ [stages[0]]:'first exact native carrier mismatch', [stages[2]]:'later unchanged real native carriers required' },f=fixture({receiptErrors:messages});
 const result=await owner.prepareOwnerReconstructionComponents(f.rows,signal(),operation=>operation,f.scope),asyncCalls=[...f.calls];
 assert.equal(result.stats.error,Object.values(messages).join('; '));assert.deepEqual(result.cofaceStats,{fixture:true});assert.deepEqual(result.components[0].chain,stages);assert.deepEqual(f.prepares,stages);
 for(const stage of stages)assert.equal(asyncCalls.filter(name=>name===stage).length,1,stage+' executes once in the asynchronous driver');
 f.calls.length=0;const synchronous=owner.ownerReconstructionComponents(f.rows,f.scope);assert.deepEqual(synchronous,result);assert.deepEqual(f.calls,asyncCalls);assert.deepEqual(f.prepares,stages,'the synchronous driver never starts preparation');assert.deepEqual(f.rows[0].chain,[]);
 const empty=fixture(),withoutErrors=await owner.prepareOwnerReconstructionComponents(empty.rows,signal(),undefined,empty.scope);assert.equal(withoutErrors.stats.objects,0);assert.equal(withoutErrors.stats.error,undefined);
});

test('early and late canonical cancellation preserves only the completed prefix and a fresh scope retries the whole chain',async()=>{
 for(const blocked of [stages[0],stages.at(-1)]){
  const f=fixture({gateAt:blocked}),controller=new AbortController(),operation=owner.prepareOwnerReconstructionComponents(f.rows,controller.signal,undefined,f.scope),rejected=assert.rejects(operation,{name:'AbortError'});await tick();
  const completed=stages.slice(0,stages.indexOf(blocked));assert.deepEqual(f.calls.filter(name=>stages.includes(name)),completed);controller.abort();f.gate.resolve();await rejected;await tick();assert.deepEqual(f.calls.filter(name=>stages.includes(name)),completed,'a late preparation result cannot execute the blocked stage or suffix');
  const retry=fixture();assert.notEqual(retry.scope,f.scope);const result=await owner.prepareOwnerReconstructionComponents(retry.rows,signal(),undefined,retry.scope);assert.deepEqual(retry.prepares,stages);assert.deepEqual(retry.calls.filter(name=>stages.includes(name)),stages);assert.deepEqual(result.components[0].chain,stages);assert.equal(result.stats.error,undefined);assert.deepEqual(f.rows[0].chain,[]);
 }
});
