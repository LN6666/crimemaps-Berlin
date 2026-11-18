import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import ts from 'typescript';
import {web} from './support/owner-lazy-closure.mjs';
import {stageWrapperRoutes,ownerRouteContracts,bundleOwnerAggregate,fixtureScope,fixtureRow,rootAggregate,infillAggregate,registryFile,rootDir,infillDir} from './support/owner-lazy2-virtual.mjs';

// The 35 stage builders behind root500/safety/owner-*-lazy wrappers and the 81
// certified non-Bremen builders behind the owner-nonberlin-lazy registry stay out
// of the root500, Bremen and infill aggregates' static imports. A wrapper loads its
// original only for rows that need it, prepares the batch scope's data through the
// original's prepareRoot500Data and forwards that scope at the original's arity.
// Both aggregates load every original a batch needs in one parallel wave first.
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const signal=()=>new AbortController().signal;
const zero=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
const wrappers=await stageWrapperRoutes(),routes=await ownerRouteContracts();
const byName=name=>wrappers.find(w=>w.specifier==='./'+name);
const parse=(file,text)=>ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
const arrayNames=(ast,name)=>{let found;(function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name&&node.initializer&&ts.isArrayLiteralExpression(node.initializer))found=node.initializer.elements.map(element=>element.getText(ast));ts.forEachChild(node,visit);})(ast);return found;};
const namespaceOf=(ast,specifier)=>ast.statements.filter(ts.isImportDeclaration).filter(node=>node.moduleSpecifier.text===specifier&&node.importClause?.namedBindings&&ts.isNamespaceImport(node.importClause.namedBindings)).map(node=>node.importClause.namedBindings.name.text);
const markerValue=(marker,id)=>marker==='F105Completion'?{patchSHA256:'b19375cb659a278d45b41f7d2685b0309506804a72853ae4ca6ee7781f3474c4'}:/PhotoEstimate$/.test(marker)?{sourceSignature:id.signature}:{};
const hitRow=(wrapper,id=wrapper.ids[0])=>fixtureRow(id.city,id.objectId,id.partId,Object.fromEntries((wrapper.materialRule?.markers??[]).map(marker=>[marker,markerValue(marker,id)])));

test('the canonical and infill aggregates bind 35 stage wrappers and the 81 registry routes, never their originals',async()=>{
 assert.equal(wrappers.length,35);assert.equal(wrappers.filter(w=>w.names.some(name=>name.startsWith('prepare'))).length,0,'the aggregate binds no stage preparation; its module wave prepares every wrapper (DECISIONS 2026-11-02 "第三段第二轮结项", src-r3b removed the 34 unused bindings)');
 assert.equal(new Set(wrappers.map(w=>w.original)).size,35);
 const rootText=await readFile(rootAggregate,'utf8'),rootAST=parse(rootAggregate,rootText),infillText=await readFile(infillAggregate,'utf8'),infillAST=parse(infillAggregate,infillText);
 const rootWave=arrayNames(rootAST,'ownerStageWrappers'),infillWave=arrayNames(infillAST,'infillOwnerStageWrappers');
 const registry=[...routes.values()].filter(route=>route.kind==='registry'),lazy=registry.filter(route=>route.city!=='bremen');assert.equal(registry.length,85);assert.equal(lazy.length,81);
 for(const w of wrappers){
  assert(!rootText.includes(`'./${w.originalKey}'`)&&!rootText.includes(`"./${w.originalKey}"`),'canonical aggregate imports the original '+w.originalKey);
  assert.equal(namespaceOf(rootAST,w.specifier).filter(name=>rootWave.includes(name)).length,1,w.specifier+' joins the canonical module wave');
  const infillSpecifier='../../root500/safety/'+w.specifier.slice(2);
  assert(!infillText.includes(`'./${w.originalKey}'`)&&!infillText.includes(`"./${w.originalKey}"`),'infill aggregate imports the shim of '+w.originalKey);
  assert.equal(namespaceOf(infillAST,infillSpecifier).filter(name=>infillWave.includes(name)).length,1,infillSpecifier+' joins the infill module wave');
 }
 for(const route of lazy){
  assert(!rootText.includes(`'./${route.key}'`)&&!rootText.includes(`"./${route.key}"`),'canonical aggregate imports '+route.key);
  assert(!infillText.includes(`'./${route.key}'`)&&!infillText.includes(`"./${route.key}"`),'infill aggregate imports the shim of '+route.key);
 }
 // The Bremen four stay direct imports of both aggregates.
 for(const route of registry.filter(route=>route.city==='bremen'))assert(rootText.includes(`"./${route.key}"`)&&infillText.includes(`'./${route.key}'`),route.key+' stays a direct import');
 // One registry namespace, under its semantic name (src-r3b renamed infillOwnerModule155), joins the
 // infill preparation registry (its dependency list) and the infill module wave.
 const registryNamespace=namespaceOf(infillAST,'../../root500/safety/owner-nonberlin-lazy');assert.equal(registryNamespace.length,1);assert.equal(registryNamespace[0],'infillNonBerlinOwnerRegistry');
 assert(new RegExp(`export const infillDataDependencies=\\(\\):readonly InfillDataModule\\[\\]=>\\[[^\\]]*\\b${registryNamespace[0]}\\b`).test(infillText),'the infill preparation registry sees the registry facades');
 assert(infillText.includes(`registry=${registryNamespace[0]}.startNonBerlinOwnerRouteModules?.(components,signal)`),'the infill module wave starts the registry routes');
});

test('every wrapper facade keeps its original scope position and re-exports the original small modules',async()=>{
 for(const w of wrappers){
  const text=await readFile(w.file,'utf8'),own=JSON.parse(text.match(/export const root500DataFunctionArities:Readonly<Record<string,number>>=(\{[^}]*\});/)[1]);
  assert.equal(own[w.reconstruct],w.arities[w.reconstruct],w.specifier+' reconstruct scope position');assert.equal(own[w.reconstruct],1);
  const facade=new RegExp(`export function ${w.materials}\\(`).test(text),reexport=w.reexports.find(r=>r.names.includes(w.materials));
  if(facade)assert.equal(own[w.materials],w.arities[w.materials],w.specifier+' materials scope position');
  else{assert.equal(own[w.materials],undefined);assert(reexport,w.specifier+' materials must come from the original small module');assert(text.includes(`from '${reexport.specifier}'`)&&new RegExp(`export \\{[^}]*\\b${w.materials}\\b[^}]*\\} from '${reexport.specifier.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')}'`).test(text),w.specifier+' re-exports '+w.materials+' from '+reexport.specifier);}
  assert(/export const prepareRoot500Data=route\.prepareScope,startRoot500OwnerModule=route\.prepareModule;/.test(text));
 }
});

// All 35 wrappers in one bundle; each original is a recorder with the original's arities.
async function bundleWrappers(){
 const key='__ownerLazy2Wrappers',state={loads:[],calls:[],prepares:[]};globalThis[key]=state;
 const originals=new Map(wrappers.map(w=>[w.original,w])),entry=wrappers.map((w,i)=>`export * as w${i} from ${JSON.stringify(w.file)};`).join('\n');
 const result=await build({stdin:{contents:entry,resolveDir:rootDir,sourcefile:'owner-lazy2-wrappers.js',loader:'js'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent',plugins:[{name:'wrapper-originals',setup(builder){
  builder.onResolve({filter:/.*/},args=>{
   if(args.kind==='entry-point'||!args.importer||args.importer.endsWith('owner-lazy2-wrappers.js'))return undefined;
   const file=path.resolve(path.dirname(args.importer),args.path)+'.ts';
   if(args.kind==='dynamic-import'){assert(originals.has(file),'unknown original '+args.path);return{path:file,namespace:'recorder'};}
   if(file===path.join(rootDir,'lazy-owner-route.ts')||/-(identities|stateless|materials)\.ts$/.test(file))return{path:file};
   if(args.namespace==='recorder'&&path.isAbsolute(args.path))return{path:args.path};
   throw Error('Unexpected wrapper dependency '+args.path+' from '+args.importer);
  });
  builder.onLoad({filter:/.*/,namespace:'recorder'},args=>{
   const w=originals.get(args.path),s=`globalThis[${JSON.stringify(key)}]`,lines=[`${s}.loads.push(${JSON.stringify(w.originalKey)});`,`export const root500DataFunctionArities=${JSON.stringify(w.arities)};`],reexported=new Set(w.reexports.flatMap(r=>r.names));
   for(const r of w.reexports)lines.push(`export {${r.names.join(',')}} from ${JSON.stringify(path.join(rootDir,r.specifier)+'.ts')};`);
   lines.push(`export function ${w.reconstruct}(...args){${s}.calls.push([${JSON.stringify(w.reconstruct)},args]);return{components:args[0].map(c=>({...c,hit:${JSON.stringify(w.reconstruct)}})),stats:{objects:1}};}`);
   if(!reexported.has(w.materials))lines.push(`export function ${w.materials}(...args){${s}.calls.push([${JSON.stringify(w.materials)},args]);return{objects:1,vertices:3,actualVisualAccepted:false};}`);
   lines.push(`export function prepareRoot500Data(...args){${s}.prepares.push([${JSON.stringify(w.reconstruct)},args]);}`);
   return{contents:lines.join('\n'),loader:'js',resolveDir:rootDir};
  });
 }}]});
 const modules=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 return{state,modules:wrappers.map((w,i)=>modules['w'+i]),close(){delete globalThis[key];}};
}

test('every stage wrapper stays cold without an import, loads its original once for its rows and forwards the batch scope',async()=>{
 const f=await bundleWrappers(),scope={label:'batch-scope'};
 try{
  for(const [i,w]of wrappers.entries()){
   const m=f.modules[i],id=w.ids[0],other=id.city==='bremen'?'berlin':'bremen',cold=[fixtureRow(other,'osm/way/999999999999','osm/way/999999999999/component/unknown'),fixtureRow(id.city,id.objectId,id.partId+'/foreign')];
   assert.equal(m.startRoot500OwnerModule(cold,signal()),undefined,w.specifier+' cold start');await m.prepareRoot500Data(cold,signal(),scope);
   const result=m[w.reconstruct](cold,scope);assert.equal(result instanceof Promise,false);assert.deepEqual(result.stats,zero());assert.deepEqual(result.components,cold);assert.equal(result.components===cold,!w.copyNoMatch,w.specifier+' no-match container');
   assert.equal(f.state.loads.includes(w.originalKey),false,w.specifier+' imported its original for cold rows');
   const hit=[hitRow(w)],loading=m.startRoot500OwnerModule(hit,signal());assert(loading instanceof Promise,w.specifier+' starts its import for a needed row');await loading;
   assert.deepEqual(f.state.loads.filter(key=>key===w.originalKey),[w.originalKey]);assert.equal(m.startRoot500OwnerModule(hit,signal()),undefined,'a loaded original needs no second wave');
   const p0=f.state.prepares.length;await m.prepareRoot500Data(hit,signal(),scope);const prepared=f.state.prepares.slice(p0);
   assert.equal(prepared.length,1);assert.equal(prepared[0][1][0],hit);assert.equal(prepared[0][1][2],scope,w.specifier+' prepares the exact batch scope');assert.equal(prepared[0][1].length,3);
   const c0=f.state.calls.length;assert.equal(m[w.reconstruct](hit,scope).components[0].hit,w.reconstruct);const call=f.state.calls[c0];
   assert.equal(call[0],w.reconstruct);assert.equal(call[1].length,w.arities[w.reconstruct]+1);assert.equal(call[1].at(-1),scope,w.specifier+' forwards the scope after its original arguments');
   if(new RegExp(`export function ${w.materials}\\(`).test(await readFile(w.file,'utf8'))){
    const m0=f.state.calls.length,paint=new Float32Array(4),frames=new Float32Array(5);m[w.materials](hit,paint,frames,scope);const materials=f.state.calls.slice(m0).find(entry=>entry[0]===w.materials);
    assert(materials,w.specifier+' material gate passes for its own marker');
    if(w.arities[w.materials]!==undefined){assert.equal(materials[1].length,w.arities[w.materials]+1);assert.equal(materials[1].at(-1),scope);}else assert.equal(materials[1].length,3);
   }
  }
  assert.equal(new Set(f.state.loads).size,f.state.loads.length,'each original module is evaluated once');
 }finally{f.close();}
});

test('a cancelled wrapper preparation neither publishes nor cancels the shared import, and a failed import is retried',async()=>{
 const key='__ownerLazy2Single';let release,calls=0,fail=true;
 globalThis[key]=()=>{calls++;if(fail){fail=false;return Promise.reject(Error('controlled import failure'));}return new Promise(resolve=>release=()=>resolve({ownerF006Reconstruction:rows=>({components:rows,stats:{objects:1}}),ownerF006BaseMaterials:()=>({objects:0,vertices:0,actualVisualAccepted:false}),root500DataFunctionArities:{ownerF006Reconstruction:1},prepareRoot500Data(){}}));};
 const w=byName('owner-f006-lazy'),result=await build({entryPoints:[w.file],bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent',plugins:[{name:'single',setup(builder){builder.onResolve({filter:/^\.\/owner-f006-reconstruction$/},args=>args.kind==='dynamic-import'?{path:'owner-lazy2-single:original',external:true}:undefined);}}]});
 const text=result.outputFiles[0].text.replaceAll('import("owner-lazy2-single:original")',`globalThis[${JSON.stringify(key)}]()`);
 assert.notEqual(text,result.outputFiles[0].text,'fixture rewires the dynamic original import');
 const m=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64')),rows=[fixtureRow('berlin',w.ids[0].objectId,w.ids[0].partId)];
 try{
  await assert.rejects(m.prepareRoot500Data(rows,signal(),{label:'s'}),/controlled import failure/);assert.throws(()=>m.ownerF006Reconstruction(rows),/not prepared/);
  const a=new AbortController(),first=m.prepareRoot500Data(rows,a.signal,{label:'s'}),second=m.prepareRoot500Data(rows,signal(),{label:'s'});await tick();a.abort();
  await assert.rejects(first,{name:'AbortError'});assert.throws(()=>m.ownerF006Reconstruction(rows),/not prepared/,'an aborted waiter publishes nothing');
  release();await second;assert.equal(calls,2,'one retry after the failure, shared by both waiters');assert.equal(m.ownerF006Reconstruction(rows).stats.objects,1);
 }finally{delete globalThis[key];}
});

test('the registry prepares only the route an infill stage recipe names, through the actual infill preparation registry',async()=>{
 const key='__ownerLazy2Registry',loads=[],prepares=[];
 globalThis[key]=specifier=>{loads.push(specifier);const name=specifier.slice(2).replace(/^owner-(f\d+)-reconstruction$/,(_,id)=>'owner'+id.toUpperCase());return Promise.resolve({[name+'Reconstruction']:rows=>({components:rows,stats:zero()}),[name+'BaseMaterials']:()=>({objects:0,vertices:0,actualVisualAccepted:false}),root500DataFunctionArities:{[name+'Reconstruction']:1},prepareRoot500Data(...args){prepares.push([specifier,...args]);}});};
 const result=await build({stdin:{contents:`export * as registry from ${JSON.stringify(registryFile)};export * as preparation from ${JSON.stringify(path.join(infillDir,'infill-owner-preparation.ts'))};`,resolveDir:web,sourcefile:'owner-lazy2-infill-registry.js',loader:'js'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent',plugins:[{name:'loader',setup(builder){builder.onResolve({filter:/^\.\/owner-/},args=>args.kind==='dynamic-import'?{path:'owner-lazy2-loader:'+args.path,external:true}:undefined);}}]});
 const {registry,preparation}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text.replaceAll('import("owner-lazy2-loader:',`globalThis[${JSON.stringify(key)}]("`)).toString('base64'));
 try{
  const F136=[...routes.values()].find(route=>route.key==='owner-f136-reconstruction'),rows=[fixtureRow('frankfurt',F136.ids[0].objectId,F136.ids[0].partId)],cold=[fixtureRow('frankfurt','osm/way/1','osm/way/1/component/x')],scope={label:'s'},modules=()=>[registry];
  await preparation.prepareInfillOwnerFunction(registry.ownerF137Reconstruction,cold,signal(),scope,modules);assert.deepEqual(loads,[],'rows no route needs start no import');
  await preparation.prepareInfillOwnerFunction(registry.ownerF136Reconstruction,rows,signal(),scope,modules);
  assert.deepEqual(loads,['./owner-f136-reconstruction'],'only the named route loads');assert.equal(prepares.length,1);assert.equal(prepares[0][1],rows);assert.equal(prepares[0][3],scope);
  await preparation.prepareInfillOwnerFunction(registry.ownerF136BaseMaterials,rows,signal(),scope,modules);assert.equal(loads.length,1);assert.equal(prepares.length,2,'the materials facade prepares the same route');
  // An identity recipe prepares its own route, as the static original that exported it did (review R3).
  await preparation.prepareInfillOwnerFunction(registry.ownerF136Identity,rows,signal(),scope,modules);assert.equal(loads.length,1);assert.equal(prepares.length,3,'an identity recipe prepares its own route');assert.equal(prepares[2][1],rows);assert.equal(prepares[2][3],scope);
  await assert.rejects(registry.prepareInfillDataForFunction('prepareRoot500Data',rows,signal(),scope),/not a non-Berlin owner route recipe/,'a name that is no route recipe fails instead of skipping its data');
  assert.equal(registry.ownerF136Reconstruction(rows,scope).components,rows);
 }finally{delete globalThis[key];}
});

for(const target of ['root500','infill']){
 test(`the ${target} aggregate loads every registry and wrapper original a batch needs in one parallel wave before any stage`,async()=>{
  const f=await bundleOwnerAggregate(target,routes);
  try{
   const F006=byName('owner-f006-lazy'),F140=byName('owner-f140-lazy'),hamburg=[...routes.values()].find(route=>route.kind==='registry'&&route.city==='hamburg'),F136=[...routes.values()].find(route=>route.key==='owner-f136-reconstruction');
   const rows=[hitRow(F006),hitRow(F140),fixtureRow('hamburg',hamburg.ids[0].objectId,hamburg.ids[0].partId),fixtureRow('frankfurt',F136.ids[0].objectId,F136.ids[0].partId)],keys=[F006.originalKey,F140.originalKey,hamburg.key,F136.key];
   const holds=keys.map(key=>f.state.hold(key)),waits=[],wait=operation=>{waits.push(f.state.events.length);return operation;},scope=fixtureScope();
   const pending=f.owner.prepareOwnerReconstructionComponents(rows,signal(),wait,scope);await tick();
   // The Bremen four are static imports of both aggregates and load with them.
   const bremen=new Set([...routes.values()].filter(route=>route.city==='bremen').map(route=>route.key));
   assert.deepEqual(f.state.loads.filter(key=>!bremen.has(key)).sort(),[...keys].sort(),'all four lazy originals start together');assert.deepEqual(f.state.prepares,[],'no stage prepares data while its wave is pending');assert.equal(waits.length,1,'one session wait for the wave');
   for(const hold of holds)hold.release();const result=await pending,asyncCalls=[...f.state.calls];
   assert.deepEqual(result,f.owner.ownerReconstructionComponents(rows,scope),'synchronous reconstruction uses only the loaded originals');
   assert.deepEqual(f.state.calls.slice(asyncCalls.length),asyncCalls,'the synchronous chain calls the same originals in the same order');
   assert.deepEqual([...asyncCalls].sort(),[F006.reconstruct,F140.reconstruct,hamburg.reconstruct,F136.reconstruct].sort());
   for(const entry of f.state.scopes.filter(entry=>f.state.calls.includes(entry.name)&&entry.name.endsWith('Reconstruction')))assert.equal(entry.scope,scope,entry.name+' receives the batch scope');
   assert.deepEqual(f.state.prepares.map(entry=>entry.name).sort(),[F006.reconstruct,F140.reconstruct,hamburg.reconstruct,F136.reconstruct].sort(),'each needed route prepares its data once, at its stage');
   for(const entry of f.state.prepares)assert.equal(entry.scope,scope);
   // A second batch finds every original loaded: no wave and no import.
   const loads=f.state.loads.length;await f.owner.prepareOwnerReconstructionComponents(rows,signal(),undefined,fixtureScope());assert.equal(f.state.loads.length,loads);
   // Cold and Bremen rows import nothing.
   const cold=[fixtureRow('bremen','osm/way/1','osm/way/1/component/x'),fixtureRow('berlin',F006.ids[0].objectId,F006.ids[0].partId+'/foreign')];
   await f.owner.prepareOwnerReconstructionComponents(cold,signal(),undefined,fixtureScope());assert.equal(f.state.loads.length,loads);
   // Materials: a display row that only the material gate needs loads its original in the material wave.
   const F108=byName('owner-f108-completion-lazy'),marker=[fixtureRow('munich','osm/way/999','osm/way/999/component/m',{F108Completion:{}})],display=new Float32Array(12);
   const hold=f.state.hold(F108.originalKey),materialWaits=[],materials=f.owner.prepareOwnerReconstructionMaterials(marker,signal(),operation=>{materialWaits.push(1);return operation;},fixtureScope());await tick();
   assert(f.state.loads.includes(F108.originalKey));assert.equal(materialWaits.length,1);hold.release();await materials;
   f.owner.ownerReconstructionBaseMaterials(marker,display,new Float32Array(15),fixtureScope());assert.notEqual(display[0],0,'the loaded original writes the marker row through its material gate');
  }finally{f.close();}
 });
 test(`a cancelled ${target} wave runs no stage and a retry reuses the same imports`,async()=>{
  const f=await bundleOwnerAggregate(target,routes);
  try{
   const F033=byName('owner-f033-lazy'),rows=[hitRow(F033)],hold=f.state.hold(F033.originalKey),controller=new AbortController();
   const pending=f.owner.prepareOwnerReconstructionComponents(rows,controller.signal,undefined,fixtureScope());await tick();controller.abort();hold.release();
   await assert.rejects(pending,{name:'AbortError'});await tick();assert.deepEqual(f.state.prepares,[]);assert.deepEqual(f.state.calls,[]);
   const result=await f.owner.prepareOwnerReconstructionComponents(rows,signal(),undefined,fixtureScope());assert.equal(result.components[0].chain.at(-1),F033.reconstruct);
   assert.deepEqual(f.state.loads.filter(key=>key===F033.originalKey),[F033.originalKey],'the retry reuses the one import');
  }finally{f.close();}
 });
}
