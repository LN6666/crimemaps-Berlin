import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';

const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=createRuntimeLoader(web),providers=['city','root500','infill','bremen','tier300','delegated500','church'];
const key=row=>row.objectId+'|'+row.partId;
function declarations(relative,names,kind=ts.isFunctionDeclaration){
 const text=fs.readFileSync(path.join(web,'src',relative),'utf8'),ast=ts.createSourceFile(relative,text,ts.ScriptTarget.Latest,true),found=new Map();
 function visit(node){if(kind(node)&&names.includes(node.name?.getText(ast)))found.set(node.name.getText(ast),node.getText(ast));ts.forEachChild(node,visit);}
 visit(ast);for(const name of names)assert.ok(found.has(name),'actual product declaration missing: '+relative+':'+name);
 return names.map(name=>found.get(name)).join(kind===ts.isMethodDeclaration?',\n':'\n');
}
function evaluate(source,environment){
 const exports={},scope=new Proxy({...environment,exports},{has:()=>true,get:(object,name)=>name===Symbol.unscopables?undefined:name in object?object[name]:globalThis[name]});
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 Function('scope',`with(scope){${js}}`)(scope);return{exports,scope};
}
function rendererMethods(provider,environment){
 const file=`painted/${provider}/safety/building-mesh-renderer.ts`;
 const helpers=declarations(file,provider==='church'?['chunkForComponent','localComponent']:['localComponent']);
 const methods=declarations(file,['retainPublishedSelection','setSelection'],ts.isMethodDeclaration);
 return evaluate(helpers+'\nexport const renderer={'+methods+'};',environment);
}
function managerMethod(provider,environment){
 const body=declarations(`painted/${provider}/safety/three-dimensional-map.ts`,['retainSelectedSource']);
 return evaluate(body+'\nexport {retainSelectedSource};',environment).exports.retainSelectedSource;
}
const cost=bytes=>({category:'metadata',bytes,precision:'exact'});

for(const provider of providers){
 test(provider+': published DISPLAY selection owns the CPU parent graph across replacement and cancellation',()=>{
  const {store,budget}=runtime.createPageResources({limitBytes:4096,recentLimitBytes:0});
  const source=store.acquire({contentKey:'source:'+provider,role:'source',estimate:cost(32),produce:()=>({})});
  const recipe=store.acquire({contentKey:'recipe:'+provider,role:'source',estimate:cost(64),produce:()=>({})});
  const display={objectId:'derived/'+provider,partId:'display/surface'};
  const cpu=store.acquire({contentKey:'packed:'+provider,role:'main',parents:[source,recipe],estimate:cost(128),produce:()=>({rows:[{component:display}]})});
  const loaded=new Map([[key(display),display]]),chunks=[{cpu,loaded}],sourceLoaded=new Map();
  let painted=0;
  const {exports:{renderer},scope}=rendererMethods(provider,{key,loaded,sourceLoaded,sceneChunks:chunks,selectedIdentity:undefined,selectionActive:false,c311Display:{enabled:true},c312Display:{enabled:false},c311IsAdded:row=>row.objectId===display.objectId,c312IsAdded:()=>false,paintSelection(){painted++;}});
  const retain=managerMethod(provider,{renderer,mainSourceLeases:['root500','infill','bremen'].includes(provider)?new Map():[],retainSelectedExplicitSource(){throw Error('published CPU must not use the single-patch fallback');}});
  const selected=retain(display);assert.equal(selected.contentKey,cpu.contentKey);
  renderer.setSelection(display);assert.deepEqual(scope.selectedIdentity,display);assert.equal(painted,1);
  assert.equal(sourceLoaded.size,0,'a DISPLAY must not be promoted to native SOURCE');
  if(provider==='city'){scope.c311Display.enabled=false;assert.throws(()=>renderer.setSelection(display),/Selection component not loaded/,'City retains its existing C311/C312 admission gate');scope.c311Display.enabled=true;}
  source.release();recipe.release();cpu.release();
  assert.equal(budget.stats.bytes,224,'selected owns both native and recipe parents after main/source release');
  // A later failed candidate has its own graph and must not retire selection.
  const cancelled=new AbortController();
  const candidate=store.acquire({contentKey:'replacement:'+provider,role:'candidate',signal:cancelled.signal,estimate:cost(96),produce:()=>({})});
  cancelled.abort();assert.equal(candidate.released,true);assert.equal(budget.stats.bytes,224);
  loaded.clear();chunks.length=0;
  assert.equal(renderer.retainPublishedSelection(display),undefined,'stale or hidden DISPLAY cannot acquire a new selected role');
  assert.throws(()=>renderer.setSelection(display),/Selection component not loaded/);
  selected.release();selected.release();assert.equal(budget.stats.bytes,0);store.destroy();
 });

 test(provider+': native canonical picking gate applies before the published CPU pin',()=>{
  const {store,budget}=runtime.createPageResources({limitBytes:4096,recentLimitBytes:0});
  const identity={objectId:'native/'+provider,partId:'native/part'};
  const value={contentKey:'native-source:'+provider,components:[identity],selectedLOD:'coarse',selectedResource:{level:'coarse'}};
  const source=store.acquire({contentKey:value.contentKey,role:'main',estimate:cost(32),produce:()=>value});
  const cpu=store.acquire({contentKey:'native-packed:'+provider,role:'main',parents:[source],estimate:cost(64),produce:()=>({rows:[{component:identity}]})});
  const loaded=new Map([[key(identity),identity]]);
  const {exports:{renderer}}=rendererMethods(provider,{key,loaded,sourceLoaded:loaded,sceneChunks:[{cpu,loaded}],selectedIdentity:undefined,selectionActive:false,paintSelection(){}});
  const sources=['root500','infill','bremen'].includes(provider)?new Map([[source.contentKey,source]]):[source];
  const retain=managerMethod(provider,{renderer,mainSourceLeases:sources,retainSelectedExplicitSource:()=>undefined});
  assert.throws(()=>retain(identity),/canonical detail/);
  value.selectedLOD='near';value.selectedResource.level='near';
  const selected=retain(identity);assert.equal(selected.contentKey,cpu.contentKey);
  cpu.release();source.release();assert.equal(budget.stats.bytes,96);
  selected.release();assert.equal(budget.stats.bytes,0);store.destroy();
 });
}

test('compositor replaces the selected graph transactionally and clears it on lifecycle release',()=>{
 const {store,budget}=runtime.createPageResources({limitBytes:4096,recentLimitBytes:0});
 const first={objectId:'display/first',partId:'surface'},second={objectId:'display/second',partId:'surface'};
 const entries=new Map([first,second].map((row,index)=>[key(row),store.acquire({contentKey:key(row),role:'main',estimate:cost(64*(index+1)),produce:()=>({row})})]));
 let fail=false,drawSelection;
 const engine={setSelection(row){if(fail)throw Error('selection rejected');drawSelection=row;},clearSelection(){drawSelection=undefined;},get selected(){return drawSelection;}};
 const manager={retainSelectedSource(row){return entries.get(key(row))?.retain('selected');}};
 const functions=declarations('safety/painted-map.ts',['releaseSelectedSource','syncSelectedSource','setSelection']);
 const {exports,scope}=evaluate(functions+'\nexport {releaseSelectedSource,syncSelectedSource,setSelection};',{
  managers:new Map([['bremen',manager]]),renderers:new Map([['bremen',engine]]),selectionOwner:()=>({provider:'bremen',engine}),
  selectedSource:undefined,selectionSuspended:false,wanted:'3d',destroyed:false,
 });
 exports.setSelection(first);const original=scope.selectedSource.pin;
 fail=true;assert.throws(()=>exports.setSelection(second),/selection rejected/);
 assert.equal(original.released,false,'failure preserves the previous selected graph');assert.strictEqual(scope.selectedSource.pin,original);
 fail=false;exports.setSelection(second);assert.equal(original.released,true);const current=scope.selectedSource.pin;
 exports.syncSelectedSource('bremen');assert.strictEqual(scope.selectedSource.pin,current,'same publication does not accumulate roles');
 for(const entry of entries.values())entry.release();assert.equal(budget.stats.bytes,128,'failed and replaced selections leave no parent retention');
 exports.releaseSelectedSource();exports.releaseSelectedSource();assert.equal(budget.stats.bytes,0);store.destroy();
});

test('an actual manager partial publication transfers selection to the new graph while loading/error do not',()=>{
 const {store,budget}=runtime.createPageResources({limitBytes:4096,recentLimitBytes:0}),identity={objectId:'same/display',partId:'surface'};
 const old=store.acquire({contentKey:'packed:old',role:'main',estimate:cost(64),produce:()=>({})});
 const next=store.acquire({contentKey:'packed:new',role:'main',estimate:cost(128),produce:()=>({})});
 let published=old;
 const engine={selected:identity},manager={retainSelectedSource:()=>published.retain('selected')};
 const text=fs.readFileSync(path.join(web,'src/safety/painted-map.ts'),'utf8'),ast=ts.createSourceFile('painted-map.ts',text,ts.ScriptTarget.Latest,true),callbacks=[];
 function visit(node){if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='onState'&&node.initializer.getText(ast).includes('syncSelectedSource(provider)'))callbacks.push(node.initializer.getText(ast));ts.forEachChild(node,visit);}
 visit(ast);assert.equal(callbacks.length,1,'actual provider publication callback');
 const functions=declarations('safety/painted-map.ts',['releaseSelectedSource','syncSelectedSource']);
 const {exports,scope}=evaluate(functions+'\nexport {releaseSelectedSource};export const onState='+callbacks[0]+';',{
  provider:'bremen',managers:new Map([['bremen',manager]]),renderers:new Map([['bremen',engine]]),states:new Map(),preparing:0,
  selectedSource:{provider:'bremen',identity,pin:old.retain('selected')},selectionSuspended:false,wanted:'3d',destroyed:false,
  options:{onState(){}},aggregateState:()=>({mode:'3d',status:'partial'}),
 });
 const oldPin=scope.selectedSource.pin;old.release();published=next;
 for(const status of ['loading','error']){exports.onState({mode:'3d',status});assert.strictEqual(scope.selectedSource.pin,oldPin);assert.equal(oldPin.released,false);}
 exports.onState({mode:'3d',status:'partial'});
 assert.equal(oldPin.released,true);assert.equal(scope.selectedSource.pin.contentKey,next.contentKey);
 next.release();assert.equal(budget.stats.bytes,128,'only the new graph remains selected');
 exports.releaseSelectedSource();assert.equal(budget.stats.bytes,0);store.destroy();
});
