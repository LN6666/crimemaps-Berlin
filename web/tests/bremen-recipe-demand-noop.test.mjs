import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// Actual function bodies and the shared scalar selector execute unchanged.
// Every model getter is a failure probe; neither assets nor inline model
// initializers are evaluated. This one matrix covers the registered entries.
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/painted/bremen/safety');
const pureModules=new Set(['bremen-recipe-demand','bremen-demand-metadata','bremen-identity-metadata','bremen-identity-projections','bremen-ag70-identities','bremen-ag70-metadata']);
const copies=new Set(['boundary70Reconstruction','infillBremenOldtownChurchesReconstruction','edgeDb70Reconstruction','europahafenkopf70Reconstruction','karstadt70Reconstruction','infillBremenOldtownExtra4Reconstruction','infillBremenOldtownRepairsReconstruction','school70Reconstruction','utility70Reconstruction','ws70Reconstruction']);
const unknown={city:'bremen',objectId:'__unknown_object__',partId:'__unknown_part__'};
const triangle=()=>({positions:[0,0,0,1,0,0,0,1,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.5,.5,.5],paint:Array(12).fill(.25),frames:Array(15).fill(.5)});
const component=identity=>({...unknown,...identity,origin:[8,53],componentGeometry:{tiny:'geometry'},sourceFeature:{tiny:'feature'},batches:[triangle()]});
function run(text,require){const module={exports:{}};const js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','module','exports',js)(require,module,module.exports);return module.exports;}
function harness({preserveScopedGetters=false}={}){
 const cache=new Map(),getters=[],failure=Error('Original model validation entered');
 const dependency=id=>new Proxy({}, {get(_target,name){name=String(name);if(name==='__esModule')return false;if(name.endsWith('_RESOURCE'))return{canonicalSHA256:'0'.repeat(64),file:id,occurrence:0,codec:'json'};if(name.endsWith('_SCOPE_RESOURCES'))return[];if(name.endsWith('_SHA')||name.endsWith('_SHA256'))return'0'.repeat(64);if(name==='nativePaintSignature')return()=> 'native';if(name.startsWith('get'))return()=>{getters.push(id+':'+name);throw failure;};return()=>{throw Error('Unexpected dependency '+id+':'+name);};}});
 function load(name){
  if(cache.has(name))return cache.get(name);
  let text=fs.readFileSync(path.join(safety,name+'.ts'),'utf8');const ast=ts.createSourceFile(name,text,99,true);
  // Replace only the lazy model getter bodies with explicit failure probes.
  // The public/private algorithms and their guards are left intact.
  const edits=[];if(!preserveScopedGetters)(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text.startsWith('_scope_'))edits.push({at:node.body.getStart(ast),end:node.body.end,text:'{throw __fixtureModelFailure();}'});ts.forEachChild(node,visit);})(ast);
  for(const edit of edits.sort((a,b)=>b.at-a.at))text=text.slice(0,edit.at)+edit.text+text.slice(edit.end);
  if(edits.length)text="import {modelFailure as __fixtureModelFailure} from '__fixture-model-failure';\n"+text;
  const api=run(text,id=>{if(id==='__fixture-model-failure')return{modelFailure(){getters.push(name+':inline/model');return failure;}};if(id.startsWith('./')&&pureModules.has(id.slice(2)))return load(id.slice(2));return dependency(id);});cache.set(name,api);return api;
 }
 const scope=()=>{const memo=new Map();return{memo(key,create){if(!memo.has(key))memo.set(key,create());return memo.get(key);},borrow(){getters.push('scope.borrow');throw failure;}};};
 return{load,getters,failure,scope};
}
function entries(h){
 const output=[];
 const names=Object.keys(h.load('bremen-identity-projections').BREMEN_IDENTITY_CANDIDATES).filter(name=>name!=='f260-accepted-restore-runtime');
 for(const file of names.map(name=>name+'.ts')){
  const text=fs.readFileSync(path.join(safety,file),'utf8');if(!text.includes('MODULE_SCOPE_DEMAND')||file==='f260-accepted-restore-runtime.ts')continue;
  const ast=ts.createSourceFile(file,text,99,true);function visit(n){if(ts.isFunctionDeclaration(n)&&n.name&&n.body){const guard=n.body.statements.find(s=>ts.isIfStatement(s)&&ts.isPrefixUnaryExpression(s.expression)&&ts.isCallExpression(s.expression.operand)&&s.expression.operand.expression.getText(ast)==='bremenRecipeDemand');if(guard){const call=guard.expression.operand;if(call.arguments[1]?.text==='infillBremenOldtown70Reconstruction')return;const stats=n.body.statements.flatMap(s=>ts.isVariableStatement(s)?[...s.declarationList.declarations]:[]).find(d=>d.name.getText(ast)==='stats');output.push({module:path.basename(file,'.ts'),name:call.arguments[1].text,parameters:n.parameters.map(p=>({name:p.name.getText(ast),type:p.type?.getText(ast)})),stats:stats?.initializer?.getText(ast)});}}ts.forEachChild(n,visit);}visit(ast);
 }
 return output;
}
function args(entry,rows,scope){return [...entry.parameters.map((p,index)=>index===0?rows:p.type?.includes('Float32Array')?new Float32Array(p.name==='paint'?12:15).fill(-1):/nativeLeafSHA|leaf/i.test(p.name)?()=> 'leaf':/SOURCE|sourceComponents|originalSource/.test(p.name)?rows:undefined),scope];}
function originalStats(expression){return run('export const value='+expression,()=>{throw Error('Stats literals cannot import');}).value;}

function progressiveObjectDemand(metadata){
 return run(fs.readFileSync(path.join(safety,'bremen-recipe-demand.ts'),'utf8'),id=>{
  if(id==='./bremen-demand-metadata')return{BREMEN_DEMAND_METADATA:metadata};
  if(id==='./bremen-identity-projections')return{BREMEN_IDENTITY_CANDIDATES:{}};
  if(id==='./bremen-identity-metadata')return{bremenIdentityIsPure(){throw Error('Object demand must not run identity validation');},bremenIdentityMatches(){throw Error('Object demand must not run identity validation');}};
  throw Error('Unexpected object-demand dependency '+id);
 }).bremenProgressiveObjectDemand;
}

test('progressive admission demand closes complete object cohorts transitively without changing selected inputs',()=>{
 const pair=id=>({objectId:id,partId:id+'/canonical-part'}),metadata={
  groups:{groups:[{members:[pair('C'),pair('D')]},{members:[pair('unrelated'),pair('E')]}]},
  models:{models:[{members:[pair('B'),pair('C')]}]},
  direct:{requiredNativeGroup:[pair('A'),pair('B')]},
  certificateLedger:{members:[pair('D'),pair('ledger-only')]},
 };
 const input=[{city:'bremen',objectId:'A',partId:'A/other-part'},{city:'berlin',objectId:'A',partId:'A/foreign-part'},{city:'bremen',objectId:'A',partId:'A/duplicate'}],before=structuredClone({metadata,input});
 assert.deepEqual(progressiveObjectDemand(metadata)(input),['bremen|A','berlin|A','bremen|B','bremen|C','bremen|D']);
 assert.deepEqual({metadata,input},before);
 const inaccessible=new Proxy({},{ownKeys(){throw Error('Inactive Bremen metadata must stay cold');}});
 assert.deepEqual(progressiveObjectDemand(inaccessible)(input.filter(row=>row.city==='berlin')),['berlin|A']);
 assert.deepEqual(progressiveObjectDemand(inaccessible)([]),[]);
});

test('progressive admission demand includes source-free oldtown cohorts and keeps unrelated or disabled cohorts absent',()=>{
 const pair=id=>({objectId:id,partId:id+'/part'}),metadata={
  groups:{groups:[{members:[pair('global'),pair('global-mate')]}]},
  oldtown:{models:[
   {geometryReadyForPreview:true,requiredNativeGroup:[],sourceCarrier:pair('global')},
   {geometryReadyForPreview:false,requiredNativeGroup:[],sourceCarrier:pair('disabled')},
   {geometryReadyForPreview:true,requiredNativeGroup:[pair('guard')],sourceCarrier:pair('guarded-display')},
  ]},
 };
 const input=[{city:'bremen',objectId:'seed',partId:'seed/part'}],before=structuredClone({metadata,input});
 assert.deepEqual(progressiveObjectDemand(metadata)(input),['bremen|seed','bremen|global','bremen|global-mate']);
 assert.deepEqual({metadata,input},before);
});

test('registered noncandidate reconstruction/material entrypoints retain original no-op shape, order and array ownership without model access',()=>{
 const h=harness(),list=entries(h);assert.equal(list.length,69);
 for(const entry of list){
  const api=h.load(entry.module),rows=[component(unknown)],scope=h.scope(),incoming=args(entry,rows,scope),before=incoming.slice(1,-1).filter(value=>value instanceof Float32Array).map(value=>Array.from(value));
  assert.equal(api.MODULE_SCOPE_DEMAND(entry.name,rows),false,entry.module+':'+entry.name+' missing precise negative selector');
  const output=api[entry.name](...incoming);
  if(/Materials$/.test(entry.name)){
   if(output!==undefined){assert.equal(output.objects,0);assert.equal(output.vertices,0);}
   assert.deepEqual(incoming.slice(1,-1).filter(value=>value instanceof Float32Array).map(value=>Array.from(value)),before);
  }else{
   assert(output&&Array.isArray(output.components),entry.name);
   if(copies.has(entry.name)){assert.notEqual(output.components,rows);assert.equal(output.components[0],rows[0]);}else assert.equal(output.components,rows);
   if(entry.stats){const expected=originalStats(entry.stats);assert.deepEqual(output.stats,expected);assert.deepEqual(Object.keys(output.stats),Object.keys(expected));}
   else if(entry.name==='office7aContourReconstruction')assert.deepEqual(output,{components:rows,objects:0,vertices:0,triangles:0,sourceRetained:true,actualVisualAccepted:false});
   else assert.deepEqual(output.stats,{objects:0,vertices:0,triangles:0,components:[],sourceRetained:true,actualVisualAccepted:false});
  }
 }
 assert.deepEqual(h.getters,[]);
});

test('object-only reconstruction collision candidates continue into the original validation instead of becoming silent pair no-ops',()=>{
 const h=harness(),catalog=h.load('bremen-identity-projections').BREMEN_IDENTITY_PROJECTIONS;
 for(const [module,name,identity,city]of [
  ['owner-f081-completion','ownerF081CompletionReconstruction','ownerF081CompletionIdentity','munich'],['owner-f088-completion','ownerF088CompletionReconstruction','ownerF088CompletionIdentity','munich'],
  ['owner-f116-completion','ownerF116CompletionReconstruction','ownerF116CompletionIdentity','cologne'],['owner-f122-completion','ownerF122CompletionReconstruction','ownerF122CompletionIdentity','cologne'],['owner-f126-completion','ownerF126CompletionReconstruction','ownerF126CompletionIdentity','cologne'],['owner-f128-completion','ownerF128CompletionReconstruction','ownerF128CompletionIdentity','cologne'],['owner-f131-completion','ownerF131CompletionReconstruction','ownerF131CompletionIdentity','cologne'],
  ['infill-stuttgart-jubilaeumssaeule','infillJubilaeumssaeuleReconstruction','infillJubilaeumssaeuleDerivedIdentity','stuttgart'],
 ]){
  const api=h.load(module),known=catalog[identity].rows[0],rows=[component({...known,city,partId:known.partId+'/wrong-part'})];assert.equal(api.MODULE_SCOPE_DEMAND(name,rows),true,name);
  assert.throws(()=>api[name](rows,h.scope()),error=>error===h.failure,name+' must retain original mismatch/collision validation');
 }
 const galerie=h.load('infill-essen-rathaus-galerie'),g=component(catalog.infillGalerieIdentity.rows[0]);delete g.city;
 assert.equal(galerie.MODULE_SCOPE_DEMAND('infillGalerieReconstruction',[g]),true);assert.throws(()=>galerie.infillGalerieReconstruction([g],h.scope()),error=>error===h.failure);
 const jub=h.load('infill-stuttgart-jubilaeumssaeule'),j=component(catalog.infillJubilaeumssaeuleDerivedIdentity.rows[0]);delete j.city;
 assert.equal(jub.MODULE_SCOPE_DEMAND('infillJubilaeumssaeuleReconstruction',[j,j]),true);const duplicate=jub.infillJubilaeumssaeuleReconstruction([j,j],h.scope());assert.match(duplicate.stats.error,/duplicate derived/);assert.deepEqual(duplicate.components,[]);
 const lloyd=h.load('lloyd-front-runtime'),l=catalog.lloydFrontIdentity.rows[0];assert.equal(lloyd.MODULE_SCOPE_DEMAND('lloydFrontFinalReconstruction',[{city:'bremen',objectId:new String(l.objectId),partId:l.partId}]),true,'Original key equality coercion must remain a conservative candidate');
});

test('metadata materials preserve marker-based writes for noncatalog IDs and F081 uses only the approved inline identity scalar',()=>{
 const h=harness();
 for(const [module,name,city,marker]of [['infill-f288-original','infillF288OriginalBaseMaterials','essen','infillF288Original'],['infill-essen-rathaus-galerie','infillGalerieBaseMaterials','essen','infillGalerieExterior'],['bremen-boundary70-runtime','boundary70BaseMaterials','bremen','boundary70']]){
  const api=h.load(module),c=component({...unknown,city});c.displayEstimates={[marker]:marker==='boundary70'?{inScope:true,patchSHA256:'0'.repeat(64)}:true};
  const paint=new Float32Array(12),frames=new Float32Array(15);assert(api.MODULE_SCOPE_METADATA_FUNCTIONS.includes(name));const output=api[name]([c],paint,frames);
  assert.equal(output.objects,1,name);assert.deepEqual(Array.from(paint),c.batches[0].paint);assert.deepEqual(Array.from(frames),c.batches[0].frames);
 }
 const api=h.load('owner-f081-completion'),identity=h.load('bremen-identity-metadata').bremenInlineIdentity('owner-f081-completion','_scope_NAVE432'),c=component({...identity,city:'munich'});c.displayEstimates={F081Completion:{nativeNavePaintOnly432:true}};
 const paint=new Float32Array(12),frames=new Float32Array(15);assert(api.MODULE_SCOPE_METADATA_FUNCTIONS.includes('ownerF081CompletionMaterials'));const output=api.ownerF081CompletionMaterials([c],paint,frames);assert.equal(output.objects,1);assert.equal(output.vertices,3);assert.equal(frames[4],6397);assert.equal(paint[3],1);assert.deepEqual(h.getters,[]);
});


test('oldtown authority and extra4 selected-target context gate only statically proven no-ops',()=>{
 const h=harness({preserveScopedGetters:true}),demand=h.load('bremen-recipe-demand'),metadata=h.load('bremen-demand-metadata').BREMEN_DEMAND_METADATA,oldtown=h.load('bremen-oldtown70-runtime'),extra4=h.load('bremen-oldtown-extra4-runtime'),rows=[component(unknown)],oldName='infillBremenOldtown70Reconstruction',extraName='infillBremenOldtownExtra4Reconstruction';
 const zero={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},authority=demand.bremenDemandSourceAuthority('oldtown');assert.match(authority,/^[a-f0-9]{64}$/);
 for(const auth of [undefined,'wrong-authority']){
  assert.equal(oldtown.MODULE_SCOPE_DEMAND(oldName,rows,[rows,undefined,auth]),false);
  const output=oldtown[oldName](rows,undefined,auth);assert.notEqual(output.components,rows);assert.equal(output.components[0],rows[0]);assert.deepEqual(output.stats,zero);assert.deepEqual(Object.keys(output.stats),Object.keys(zero));
 }
 assert.deepEqual(h.getters,[]);
 assert.equal(oldtown.MODULE_SCOPE_DEMAND(oldName,rows,[rows,undefined,authority]),true,'The verified empty native group still creates the original derived DISPLAY');
 assert.throws(()=>oldtown[oldName](rows,undefined,authority),/requires a prepared frozen data scope/);
 const undefinedCity=component(unknown);delete undefinedCity.city;for(const input of [[],[component({...unknown,city:'berlin'})],[undefinedCity]]){assert.equal(oldtown.MODULE_SCOPE_DEMAND(oldName,input,[input,undefined,authority]),true,'Explicit authority preserves source-free generation even for empty/foreign/undefined-city input');assert.throws(()=>oldtown[oldName](input,undefined,authority),/requires a prepared frozen data scope/);}
 const excluded=metadata.extra4.models.find(model=>model.targetId==='BR-OT-B06C');assert(excluded);
 const pairs=value=>{const result=[];function visit(value){if(!value||typeof value!=='object')return;if(typeof value.objectId==='string'&&typeof value.partId==='string')result.push({objectId:value.objectId,partId:value.partId});for(const child of Object.values(value))visit(child);}visit(value);return result;},pairKey=row=>row.objectId+'|'+row.partId;
 const otherPairs=new Set(metadata.extra4.models.filter(model=>model!==excluded).flatMap(pairs).map(pairKey)),identity=pairs(excluded).find(row=>!otherPairs.has(pairKey(row)));assert(identity,'The excluded target needs an actual exclusive metadata member');
 const selected=demand.bremenExtra4OwnerTargets(),extraRows=[component(identity)],extraAuthority=demand.bremenDemandSourceAuthority('extra4');assert(!selected.includes('BR-OT-B06C'));assert.match(extraAuthority,/^[a-f0-9]{64}$/);
 assert.equal(extra4.MODULE_SCOPE_DEMAND(extraName,extraRows,[extraRows,selected,extraAuthority]),false);
 const excludedOutput=extra4[extraName](extraRows,selected,extraAuthority);assert.notEqual(excludedOutput.components,extraRows);assert.equal(excludedOutput.components[0],extraRows[0]);assert.deepEqual(excludedOutput.stats,zero);assert.deepEqual(h.getters,[]);
 assert.equal(extra4.MODULE_SCOPE_DEMAND(extraName,extraRows,[extraRows,['BR-OT-B06C'],extraAuthority]),true);
 assert.throws(()=>extra4[extraName](extraRows,['BR-OT-B06C'],extraAuthority),/requires a prepared frozen data scope/);assert.deepEqual(h.getters,[]);
});
