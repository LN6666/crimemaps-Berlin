import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';
const source=new URL('../src/painted/root500/safety/',import.meta.url),read=name=>readFile(new URL(name,source),'utf8');
const compile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
function evaluate(text,require){const exports={};new Function('require','exports',compile(text))(require,exports);return exports;}
// frozen-data-scope.ts imports only the page ledger's error class; bind the actual
// resource-budget module of one page runtime (the fixtures-managers-a loader) and refuse anything else.
const {createFrozenDataScope}=evaluate(await readFile(new URL('../src/safety/frozen-data-scope.ts',import.meta.url),'utf8'),createRuntimeLoader().scopeRequire());
const tinyLease=()=>{let released=false;const value={};return{borrow(read){assert(!released);return read(value);},release(){released=true;}};};
async function evaluateOriginal(text,{scoped=false}={}){const exports={};await new AsyncFunction('require','exports',compile(text))((name)=>{
 if(name==='../../../safety/frozen-paint-tables')return{readFrozenTableAsync:async()=>({})};
 if(name==='./progressive-native-signature')return{nativePaintSignature:()=>{throw Error('No-hit test must not inspect model geometry');}};
 throw Error('Unexpected original dependency '+name);
},exports);
 if(!scoped||!exports.getRoot500Data)return exports;
 const scope=createFrozenDataScope({acquire:async()=>tinyLease()});await scope.prepare(exports.root500DataRefs,new AbortController().signal);
 return Object.assign(exports,exports.getRoot500Data(scope),{__releaseScope:()=>scope.release()});
}
const helper=evaluate(await read('lazy-owner-route.ts'),name=>{throw Error(name);});
const stems=['owner-f141-completion','owner-f165','owner-f140','owner-f169-completion','owner-f108-completion','owner-f089','owner-f231','owner-f105','owner-f124-completion','owner-f216-annex','owner-f189','owner-f192','owner-f065-platform','owner-f209'];
const definitions=[];
for(const stem of stems){
 const text=await read(stem+'-lazy.ts'),original=await read(stem+'-reconstruction.ts'),identity=text.match(/export \{(\w+)\}/)[1],reconstruct=text.match(/export const (\w+)=route\.reconstruct/)[1],materials=text.match(/export function (\w+BaseMaterials)\(/)[1],prepare=text.match(/export function (prepare\w+)\(/)[1];
 const expose='\nexports.__needed=needed;exports.__materialNeeded=materialNeeded;';
 const constants=Object.fromEntries([...text.matchAll(/const (\w+IDS)=(\[.*?\]);/g)].map(m=>[m[1],JSON.parse(m[2])]));
 const ids=Object.values(constants).flat(),extra=stem==='owner-f089'?[{city:'munich',objectId:'osm/way/362467272',partId:'osm/way/362467272/component/ff2b80e77db8b1ee0125'}]:[];
 definitions.push({stem,text,original,expose,identity,reconstruct,materials,prepare,ids,extra});
}
const plain={city:'berlin',objectId:'osm/way/1',partId:'unrelated',origin:[0,0],batches:[]};
const empty=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};}
function load(row,gate){let imports=0,reconstructionInput,materialArgs;const result={components:[],stats:{...empty(),error:'unchanged partial owner result'},retainedExtra:{same:true}};
 const stub={
  [row.reconstruct]:input=>{reconstructionInput=input;return result;},
  [row.materials]:(...args)=>{materialArgs=args;args[1][0]=.375;args[2][0]=.625;return row.stem==='owner-f105'?undefined:{objects:3,vertices:7,buildingCount:1,actualVisualAccepted:false};}
 };
 const module=evaluate(row.text+row.expose,name=>{if(name==='./lazy-owner-route')return helper;assert.equal(name,'./'+row.stem+'-reconstruction');imports++;return gate?.promise??stub;});
 return{module,stub,result,get imports(){return imports;},get reconstructionInput(){return reconstructionInput;},get materialArgs(){return materialArgs;}};
}
function materialRows(row){
 const base={...plain,...row.ids[0]},marker=row.stem==='owner-f105'?'F105Completion':row.text.match(/displayEstimates\?\.([A-Za-z0-9]+)/)?.[1];assert(marker,row.stem);
 const value=row.stem==='owner-f105'?{patchSHA256:row.text.match(/const F105_SHA=("[^"]+");/)[1].slice(1,-1)}:/owner-f(?:189|192)$/.test(row.stem)?{sourceSignature:row.ids[0].signature}:true;
 return{base,marked:{...base,displayEstimates:{[marker]:value}}};
}

test('14 cold facades preserve the actual original identity, no-hit container/statistics and material return contract',async()=>{
 for(const row of definitions){
  const f=load(row),m=f.module,original=await evaluateOriginal(row.original),input=[plain],a=m[row.reconstruct](input),b=original[row.reconstruct](input);
  assert.deepEqual(a,b,row.stem);assert.equal(a.components===input,b.components===input,row.stem+' no-hit container');
  const paint=new Float32Array([.25]),frames=new Float32Array([.5]);assert.deepEqual(m[row.materials](input,paint,frames),original[row.materials](input,paint,frames));assert.deepEqual([...paint],[.25]);assert.deepEqual([...frames],[.5]);
  assert.equal(m[row.prepare](input,new AbortController().signal),undefined);assert.equal(f.imports,0);
  for(const id of [...row.ids,...row.extra])for(const candidate of [id,{...id,city:'berlin'},{...id,partId:id.partId+'/wrong'}])assert.equal(m[row.identity](candidate),original[row.identity](candidate),row.stem+' exact identity');
  const {base,marked}=materialRows(row);assert.equal(m.__materialNeeded(base),false);assert.deepEqual(m[row.materials]([base],paint,frames),row.stem==='owner-f105'?undefined:row.stem==='owner-f231'?{objects:0,vertices:0,buildingCount:1,actualVisualAccepted:false}:{objects:0,vertices:0,actualVisualAccepted:false});assert.equal(f.imports,0);
  assert.equal(m.__materialNeeded(marked),true);assert.throws(()=>m[row.reconstruct]([base]),/not prepared/);assert.throws(()=>m[row.materials]([marked],paint,frames),/not prepared/);
  const controller=new AbortController();controller.abort();assert.throws(()=>m[row.prepare]([],controller.signal),{name:'AbortError'});
 }
});

test('14 facades pass original input/output references and exact material buffers through once prepared',async()=>{
 for(const row of definitions){const f=load(row),m=f.module,{base,marked}=materialRows(row);let waits=0;
  await m[row.prepare]([base],new AbortController().signal,operation=>{waits++;return operation;});assert.equal(waits,1);assert.equal(f.imports,1);
  const input=[base,plain];assert.equal(m[row.reconstruct](input),f.result);assert.equal(f.reconstructionInput,input);
  const materials=[marked,plain],paint=new Float32Array([0]),frames=new Float32Array([0]);assert.deepEqual(m[row.materials](materials,paint,frames),row.stem==='owner-f105'?undefined:{objects:3,vertices:7,buildingCount:1,actualVisualAccepted:false});assert.equal(f.materialArgs[0],materials);assert.equal(f.materialArgs[1],paint);assert.equal(f.materialArgs[2],frames);assert.equal(paint[0],.375);assert.equal(frames[0],.625);
  await m[row.prepare]([base],new AbortController().signal);assert.equal(f.imports,1);
 }
});

test('completion marker-only input preserves its original broad material guard and count',async()=>{
 for(const row of definitions.filter(r=>/-completion$/.test(r.stem))){const original=await evaluateOriginal(row.original);let imports=0;
  const m=evaluate(row.text+row.expose,name=>{if(name==='./lazy-owner-route')return helper;imports++;return original;});
  const {marked}=materialRows(row),input=[{...marked,objectId:'unregistered',partId:'unregistered'}],paint=new Float32Array(),frames=new Float32Array();assert.equal(m[row.identity](input[0]),false);assert.equal(m.__materialNeeded(input[0]),true);
  await m[row.prepare](input,new AbortController().signal);assert.equal(imports,1);assert.deepEqual(m[row.reconstruct](input),original[row.reconstruct](input));assert.deepEqual(m[row.materials](input,paint,frames),original[row.materials](input,paint,frames));
 }
});

test('all original material identity/marker/signature branches retain their exact counts and return values',async()=>{
 for(const row of definitions){const original=await evaluateOriginal(row.original,{scoped:true}),m=evaluate(row.text,name=>name==='./lazy-owner-route'?helper:original);try{
  for(const id of [...row.ids,...row.extra]){
   let {marked}=materialRows(row);marked={...marked,...id};
   if(row.stem==='owner-f140'&&id!==row.ids[0]&&!row.text.match(/const F140_IDS=(\[.*?\]);/)[1].includes(id.partId))marked.displayEstimates={F140Courtyard:true};
   if(/owner-f(?:189|192)$/.test(row.stem))marked.displayEstimates={[row.stem==='owner-f189'?'F189PhotoEstimate':'F192PhotoEstimate']:{sourceSignature:id.signature}};
   for(const value of [marked,{...marked,city:'berlin'},{...marked,displayEstimates:{}},{...marked,partId:marked.partId+'/unregistered'}]){
    const input=[value],paint=new Float32Array(),frames=new Float32Array();await m[row.prepare](input,new AbortController().signal);
    assert.deepEqual(m[row.materials](input,paint,frames),original[row.materials](input,paint,frames),row.stem+' '+value.partId);
   }
  }}finally{original.__releaseScope?.();}
 }
});

test('14 imports keep cancellation and failed-session retry without exposing a late result',async()=>{
 for(const row of definitions){const gate=deferred(),f=load(row,gate),m=f.module,{base}=materialRows(row),own=new AbortController();
  const pending=m[row.prepare]([base],own.signal);own.abort();await assert.rejects(pending,{name:'AbortError'});assert.throws(()=>m[row.reconstruct]([base]),/not prepared/);
  gate.resolve(f.stub);await assert.rejects(m[row.prepare]([base],new AbortController().signal,()=>Promise.reject(Error('session failed'))),/session failed/);assert.throws(()=>m[row.reconstruct]([base]),/not prepared/);
  await m[row.prepare]([base],new AbortController().signal,operation=>operation);assert.equal(f.imports,1);assert.equal(m[row.reconstruct]([base]),f.result);
 }
});

test('the production chain waits at each real new stage, preserves prefix/order and stops an aborted continuation',async()=>{
 const aggregate=await read('owner-reconstruction.ts'),ast=ts.createSourceFile('owner-reconstruction.ts',aggregate,ts.ScriptTarget.Latest,true),declarations=new Map(),stages=new Map(),imports=new Map(),previous=new Map();
 function visit(node){
  if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer&&ts.isCallExpression(node.initializer)&&node.initializer.expression.getText(ast)==='scopedOwnerCall')declarations.set(node.name.text,node.initializer.arguments[0].getText(ast));
  if(ts.isYieldExpression(node)&&node.expression){let value=node.expression;while(ts.isSatisfiesExpression(value)||ts.isAsExpression(value))value=value.expression;if(ts.isObjectLiteralExpression(value)){const fields=new Map(value.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(ast),p.initializer]));if(fields.has('recipe')&&ts.isPropertyAccessExpression(fields.get('components')))stages.set(fields.get('recipe').getText(ast),fields.get('components').expression.getText(ast));}}
  ts.forEachChild(node,visit);
 }
 visit(ast);
 for(const node of ast.statements)if(ts.isImportDeclaration(node)&&!node.importClause?.isTypeOnly){const name=node.moduleSpecifier.text,names=imports.get(name)??new Set();const bindings=node.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings))for(const element of bindings.elements)if(!element.isTypeOnly)names.add((element.propertyName??element.name).text);imports.set(name,names);}
 for(const row of definitions){const predecessor=stages.get(row.reconstruct);assert(predecessor,row.stem);const fn=declarations.get(predecessor);assert(fn,row.stem+' preceding reconstruction');previous.set(fn,row);}
 const calls=[],loads=[],gates=new Map(definitions.map(row=>[row,deferred()])),targets=new Map(definitions.map(row=>[row,{...plain,...row.ids[0]}])),rowsByModule=new Map(definitions.flatMap(row=>[['./'+row.stem+'-reconstruction',row],['./'+row.stem+'-lazy',row]])),refs=new Map(definitions.map((row,index)=>[row,{canonicalSHA256:(index+1).toString(16).padStart(64,'0'),file:'fixture/'+row.stem+'.ts',occurrence:0,codec:'json'}]));let firstRow;
 const scope=createFrozenDataScope({acquire:async(ref,signal)=>{const row=definitions.find(row=>refs.get(row).canonicalSHA256===ref.canonicalSHA256);assert(row);loads.push(row);firstRow??=row;await gates.get(row).promise;signal.throwIfAborted();return tinyLease();}}),functions=new Map();
 for(const row of definitions){functions.set(row.reconstruct,(components,activeScope)=>{assert.equal(activeScope,scope);calls.push(row.reconstruct);return{components,stats:{...empty(),error:row.stem+' partial'}};});functions.set(row.materials,()=>({objects:0,vertices:0,actualVisualAccepted:false}));}
 function get(name){if(functions.has(name))return functions.get(name);if(name.startsWith('prepareOwner'))return()=>undefined;if(name.endsWith('Identity'))return()=>false;if(name==='ownerF154RecoveredSources')return rows=>rows;
  return components=>{calls.push(name);const next=previous.get(name);return{components:next?[...components,targets.get(next)]:components,stats:empty(),cofaceStats:{fixture:true}};};}
 const modules=new Map(),chain=evaluate(aggregate,name=>{if(modules.has(name))return modules.get(name);assert(imports.has(name),name);const value=Object.fromEntries([...imports.get(name)].map(n=>[n,get(n)])),row=rowsByModule.get(name);if(row)Object.assign(value,{root500DataFunctionArities:{[row.reconstruct]:1,[row.materials]:3},prepareRoot500Data(components,signal,activeScope){assert.equal(activeScope,scope);const target=targets.get(row);if(components.some(c=>c.objectId===target.objectId&&c.partId===target.partId))return scope.prepare([refs.get(row)],signal);}});modules.set(name,value);return value;});
 try{
 const own=new AbortController(),pending=chain.prepareOwnerReconstructionComponents([plain],own.signal,undefined,scope);await tick();assert.equal(loads.length,1);assert(firstRow);const prefix=[...calls];own.abort();await assert.rejects(pending,{name:'AbortError'});gates.get(firstRow).resolve();await tick();assert.deepEqual(calls,prefix);assert(!calls.includes(firstRow.reconstruct));
 for(const gate of gates.values())gate.resolve();calls.length=0;const asyncResult=await chain.prepareOwnerReconstructionComponents([plain],new AbortController().signal,undefined,scope);const asyncCalls=[...calls];assert.equal(loads.length,14);assert.equal(new Set(loads).size,14);assert.equal(scope.stats.resources,14);
 calls.length=0;const syncResult=chain.ownerReconstructionComponents([plain],scope);assert.deepEqual(syncResult,asyncResult);assert.deepEqual(calls,asyncCalls);for(const row of definitions)assert.equal(calls.filter(n=>n===row.reconstruct).length,1);
 }finally{scope.release();assert.equal(scope.stats.disposed,true);}
});
