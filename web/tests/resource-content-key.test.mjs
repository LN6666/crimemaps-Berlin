import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {resourceContentKey,resourceContentKeys,decodeResourceContentKey} from './support/resource-content-key.mjs';

const read=file=>fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
function declaration(file,name){
 const source=read(file),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);let found;
 (function visit(node){if(found)return;if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node.getText(ast);if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)found=node.initializer.getText(ast);ts.forEachChild(node,visit);})(ast);
 assert(found,file+' declares '+name);return found;
}
function expression(source,bindings){
 const code=ts.transpileModule('('+source.replace(/^export\s+/,'')+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return Function(...Object.keys(bindings),'return '+code)(...Object.values(bindings));
}
const packing='painted/root500/safety/chunk-mesh-packing.ts',abi=expression(declaration(packing,'CHUNK_MESH_PACKING_ABI'),{});
const packedKey=(version=abi)=>expression(declaration(packing,'meshChunkContentKey'),{resourceContentKey,CHUNK_MESH_PACKING_ABI:version});
const meshChunkContentKey=packedKey(),chunks={};
Function('exports','require',ts.transpileModule(read('safety/renderer-chunk-input.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(chunks,id=>{assert.equal(id,'./resource-content-key');return resourceContentKeys;});

test('opaque quoted parents grow linearly through nested resource identities and remain fully recoverable',()=>{
 const raw=JSON.stringify(['legacy-source',('"\\:|\u0000😀').repeat(2048)]);let parent=raw;
 for(let depth=0;depth<48;depth++){
  const next=resourceContentKey('nested-stage-v2',parent,depth);
  assert.deepEqual(decodeResourceContentKey(next),['nested-stage-v2',parent,depth]);
  assert(next.length-parent.length<100,'one layer adds only its namespace, tags and scalar metadata');
  assert.equal(next.split(raw).length-1,1,'the complete original parent is present exactly once');parent=next;
 }
 assert(parent.length<raw.length+4800);
});

test('typed length boundaries preserve row shape, separators, Unicode and namespace separation',()=>{
 const values=[['a','bc'],['ab','c'],['a:1','s2:bc'],[['a','bc']],[['a'],'bc'],['1'],[1],[null],['null'],[false],['false'],['😀','x'],['\ud83d','\ude00x'],[{source:'quoted"\\authority'}]];
 const keys=values.map(parts=>resourceContentKey('boundaries-v2',...parts));assert.equal(new Set(keys).size,values.length);
 values.forEach((parts,index)=>assert.deepEqual(decodeResourceContentKey(keys[index]),['boundaries-v2',...parts]));
 assert.notEqual(resourceContentKey('namespace-a','b'),resourceContentKey('namespace','a','b'));
 assert.notEqual(resourceContentKey('boundaries-v2','a','bc'),JSON.stringify(['boundaries-v2','a','bc']));
 const cycle=[];cycle.push(cycle);assert.throws(()=>resourceContentKey('cycle',cycle),/Cyclic/);
});

test('all seven real manager wrappers retain source text once and distinguish source owners',()=>{
 const raw=JSON.stringify(['building-source-v1','source"\\:|',{'geometry':'exact-source','material':'exact-material'}]);
 for(const provider of ['root500','infill','bremen','city','tier300','delegated500','church']){
  const source=declaration('painted/'+provider+'/safety/three-dimensional-map.ts',['root500','infill','bremen'].includes(provider)?'sourceResourceKey':'resourceKey');
  const keyFor=(owner,content)=>expression(source,{resourceContentKey,sourceOwnerKey:owner,sourceClient:{ownerKey:owner},sourceContentKey:()=>content})(content);
  const key=keyFor('owner"\\:|',raw);assert.equal(key.split(raw).length-1,1,provider+' keeps the ingress protocol intact');
  assert.equal(keyFor('owner"\\:|',raw),key);assert.notEqual(keyFor('other-owner',raw),key);assert.notEqual(keyFor('owner"\\:|',raw+'changed'),key);
  assert.deepEqual(decodeResourceContentKey(key).at(-1),raw);assert.deepEqual(JSON.parse(raw),['building-source-v1','source"\\:|',{'geometry':'exact-source','material':'exact-material'}]);
 }
});

const row=id=>({objectId:id,partId:'surface',origin:[8.8,53.1],batches:[]});
function group(rows){return{contentKey:resourceContentKey('source-pack-v2','source"\\:|'),components:rows,parents:[],frame:{authority:resourceContentKey('source-frame-v2','exact-frame'),origin:[8.8,53.1],unit:1000},cohortKeys:[],materialAuthority:'material"\\:|',recipeAuthority:'recipe"\\:|',selectedLOD:'canonical'};}

test('actual packed identity ignores viewport membership and isolates every physical authority and ABI field',()=>{
 const [a,b]=['a','b'].map(row),source=group([a,b]),input={store:{},groups:[source],cohorts:[]};
 const first=chunks.rendererChunkGroups(input,[a])[0],second=chunks.rendererChunkGroups(input,[b,a])[0];
 for(const provider of ['root500','infill','bremen','city','tier300','delegated500','church'])assert.equal(meshChunkContentKey(provider,first),meshChunkContentKey(provider,second));
 const key=meshChunkContentKey('bremen',source),changes=[{contentKey:source.contentKey+'changed'},{materialAuthority:'other-material'},{recipeAuthority:'other-recipe'},{selectedLOD:2},{frame:{...source.frame,authority:'other-frame'}},{frame:{...source.frame,origin:[8.9,53.1]}},{frame:{...source.frame,unit:1001}}];
 for(const change of changes)assert.notEqual(meshChunkContentKey('bremen',{...source,...change}),key);
 assert.notEqual(meshChunkContentKey('city',source),key);assert.notEqual(packedKey(abi+':next')('bremen',source),key);
 assert.deepEqual(decodeResourceContentKey(key),['packed-mesh-v2','bremen',abi,source.contentKey,source.selectedLOD,source.frame.authority,source.frame.origin,source.frame.unit,source.materialAuthority,source.recipeAuthority]);
});

test('verified derived publication keeps a flat authority table and exact row-index references through packing',()=>{
 const a=row('native'),display=row('derived'),source=group([a]),proof={authority:JSON.stringify(['recipe','quoted"\\:|']),components:[display],sources:[a],parents:[],frame:source.frame},input={store:{},groups:[source],cohorts:[]};
 const once=chunks.bindRendererChunkDerivations(input,[proof]),twice=chunks.bindRendererChunkDerivations(once,[proof]);
 try{
  assert.deepEqual(twice.groups[0].derivationBaseAuthorities,once.groups[0].derivationBaseAuthorities);assert.deepEqual(twice.groups[0].derivationAuthorities,[proof.authority]);
  assert.equal(meshChunkContentKey('bremen',twice.groups[0]),meshChunkContentKey('bremen',once.groups[0]));
  const key=meshChunkContentKey('bremen',once.groups[0]),rows=Array.from({length:1000},(_,index)=>[key,[index*3,3]]),indexed=chunks.indexedResourceKey('solar',rows,value=>value),decoded=decodeResourceContentKey(indexed);
  assert.equal(indexed.split(key).length-1,1);assert.deepEqual(decoded[2],[key]);assert.deepEqual(decoded[3],rows.map(([,range])=>[0,range]));
  assert.equal(chunks.rendererChunkPublicationCohorts(once,[{source:once.groups[0],contentKey:key}]).length,1);
 }finally{twice.release();once.release();}
});

test('legacy source-group ordering still selects the exact frame and physical row order for unequal quoted keys',()=>{
 const a={...row('native-a'),sourceFeature:{}},z={...row('native-z'),origin:[8.9,53.2],sourceFeature:{}},raw=['a'+('"\\').repeat(16),'z'];
 const parents=[a,z].map((component,index)=>({contentKey:'parent-'+index,value:{contentKey:raw[index],resourceKey:'resource-'+index,components:[component],recipeAuthority:'recipe',materialAuthority:'material',selectedLOD:'canonical'},retain(){return{contentKey:this.contentKey,value:this.value,release(){}};}}));
 const sourceChunkInput=expression(declaration('painted/root500/safety/three-dimensional-map.ts','sourceChunkInput'),{resourceContentKey,sourceResourceByFeature:new WeakMap(),ownerShapePatchDisplayRows:rows=>rows,ownerProfileByComponent:new WeakMap(),sourceLeafByFeature:new WeakMap(),sourceAbsentDisplay:()=>false,resources:{},manifestSHA:'manifest',manifest:{compiler_sha256:'compiler'}});
 const input=sourceChunkInput([a,z],parents),ordered=[...input.groups].sort((left,right)=>left.contentKey.localeCompare(right.contentKey));
 assert.equal(ordered[0].components[0],a);
 for(const [index,source]of input.groups.entries())assert.equal(source.contentKey,JSON.stringify(['root500-source-pack-v1',[raw[index],'verified-source-leaf'],[[source.components[0].objectId,'surface']],'recipe']),'the actual manager preserves every legacy ordering input');
 const proposed=[...input.groups].sort((left,right)=>resourceContentKey('root500-source-pack-v2',...JSON.parse(left.contentKey).slice(1)).localeCompare(resourceContentKey('root500-source-pack-v2',...JSON.parse(right.contentKey).slice(1))));
 assert.notEqual(proposed[0].components[0],ordered[0].components[0],'the counterexample really reverses frame choice under the proposed key spelling');
 const display=row('derived'),proof={authority:'verified-recipe',components:[display],sources:[a,z],parents:[],frame:input.groups[1].frame},bound=chunks.bindRendererChunkDerivations(input,[proof]);
 try{
  assert.deepEqual(bound.groups[0].frame,ordered[0].frame);
  const coalesced=chunks.coalesceRendererChunkGroups(input.groups,[{members:[a,z],authority:'semantic-recipe'}])[0];
  assert.strictEqual(coalesced.frame,ordered[0].frame);assert.deepEqual(coalesced.components,ordered.flatMap(source=>source.components));
  assert.deepEqual(bound.groups[0].derivationBaseAuthorities.map(base=>base.contentKey),ordered.map(source=>source.contentKey));
 }finally{bound.release();}
});

// A retained source cohort may belong entirely to another painted provider.
// Synthetic profiles below exercise only dependency selection, not source attestation.
const packingOwnership={};
Function('exports','require',ts.transpileModule(read('safety/paint-ownership.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(packingOwnership,id=>{
 if(id==='../painted/church/safety/facade-paint-frame')return{paintFamily(){throw Error('Explicit fixture ownership required');}};
 return{default:JSON.parse(fs.readFileSync(new URL('../src/safety/'+id,import.meta.url),'utf8'))};
});
const s434Metadata={};
Function('exports',ts.transpileModule(read('painted/root500/safety/s434-aggregate-display-constants.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(s434Metadata);
function rootPackingDependencies(members,profile={}){
 const file='painted/root500/safety/building-mesh-renderer.ts',source=read(file),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);let call;
 (function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='coalesceRendererChunkGroups')call=node;ts.forEachChild(node,visit);})(ast);
 assert(call,'actual root500 semantic packing call must exist');
 return expression('()=>('+call.arguments[1].getText(ast)+')',{plans:{s434Plan:{profile,entries:members.map(component=>({component}))}},acceptPaintComponent:packingOwnership.acceptPaintComponent})();
}
const nativeS434Members=s434Metadata.S434_AGGREGATE_EXPECTED.required.map(r=>({city:r.city,objectId:r.objectId,partId:r.partId,origin:r.origin,componentGeometry:r.componentGeometry,sourceFeature:{properties:r.sourceProperties},batches:[]}));
const ownedPackingMembers=Object.entries(JSON.parse(read('safety/paint-ownership-registry.json')).parts).filter(([,row])=>row.provider==='root500').map(([id])=>{const [city,objectId,partId]=id.split('|');return{city,objectId,partId,origin:[8.8,53.1],batches:[]};}).filter(c=>packingOwnership.paintOwner(c)==='root500').slice(0,7);

test('root500 does not require the seven Frankfurt source members owned entirely by infill',()=>{
 assert.equal(nativeS434Members.length,7);assert(nativeS434Members.every(c=>packingOwnership.paintOwner(c)==='infill'));
 const dependencies=rootPackingDependencies(nativeS434Members);assert.deepEqual(dependencies,[]);
 assert.deepEqual(chunks.coalesceRendererChunkGroups([],dependencies),[]);
});

test('root500 retains complete semantic dependencies whenever it owns any member',()=>{
 assert.equal(ownedPackingMembers.length,7);assert(ownedPackingMembers.every(c=>packingOwnership.paintOwner(c)==='root500'));
 const dependencies=rootPackingDependencies(ownedPackingMembers);assert.equal(dependencies.length,1);assert.equal(dependencies[0].members.length,7);
 const complete=chunks.coalesceRendererChunkGroups([group(ownedPackingMembers)],dependencies);assert.equal(complete.length,1);assert.equal(complete[0].components.length,7);
 assert.throws(()=>chunks.coalesceRendererChunkGroups([group(ownedPackingMembers.slice(1))],dependencies),/Admitted semantic packing dependency is not complete/);
 const mixed=[ownedPackingMembers[0],...nativeS434Members];const mixedDependencies=rootPackingDependencies(mixed);assert.equal(mixedDependencies[0].members.length,8);
 assert.throws(()=>chunks.coalesceRendererChunkGroups([group([ownedPackingMembers[0]])],mixedDependencies),/Admitted semantic packing dependency is not complete/);
 assert.deepEqual(rootPackingDependencies(ownedPackingMembers,null),[]);
});

function tierPackingDependencies(members,profile={}){
 const file='painted/tier300/safety/building-mesh-renderer.ts',source=read(file),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);let pack;
 (function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='packBatches')pack=node;ts.forEachChild(node,visit);})(ast);assert(pack);
 let dependencies;(function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='dependencies')dependencies=node.initializer;ts.forEachChild(node,visit);})(pack);assert(dependencies);
 return expression('()=>('+dependencies.getText(ast)+')',{profile,s434Entries:members.map(component=>({component})),partialGatePlan:undefined,s402Plan:undefined,s036Plan:undefined,s240Plan:undefined,acceptPaintComponent:packingOwnership.acceptPaintComponent})();
}
const tierPackingMembers=Object.entries(JSON.parse(read('safety/paint-ownership-registry.json')).parts).filter(([,row])=>row.provider==='tier300').map(([id])=>{const [city,objectId,partId]=id.split('|');return{city,objectId,partId,origin:[8.8,53.1],batches:[]};}).filter(c=>packingOwnership.paintOwner(c)==='tier300').slice(0,7);
test('tier300 does not require Frankfurt cohort members owned entirely by infill',()=>{
 assert(nativeS434Members.every(c=>!packingOwnership.acceptPaintComponent('tier300',c)));
 const dependencies=tierPackingDependencies(nativeS434Members);assert.deepEqual(dependencies,[]);assert.deepEqual(chunks.coalesceRendererChunkGroups([],dependencies),[]);
});
test('tier300 still rejects incomplete dependencies for cohorts it actually owns',()=>{
 assert.equal(tierPackingMembers.length,7);const dependencies=tierPackingDependencies(tierPackingMembers);assert.equal(dependencies.length,1);assert.equal(dependencies[0].members.length,7);
 assert.equal(chunks.coalesceRendererChunkGroups([group(tierPackingMembers)],dependencies)[0].components.length,7);
 assert.throws(()=>chunks.coalesceRendererChunkGroups([group(tierPackingMembers.slice(1))],dependencies),/Admitted semantic packing dependency is not complete/);
 assert.deepEqual(tierPackingDependencies(tierPackingMembers,null),[]);
});

test('city physical packing omits the foreign Frankfurt cohort and infill keeps its complete cohort',()=>{
 const members=nativeS434Members,s434Entries=members.map(component=>({component})),profile={partitionProofSHA256:'selection-only-fixture'};
 const cityDependencies=expression('()=>('+declaration('painted/city/safety/building-mesh-renderer.ts','semanticDependencies')+')',{profile,s434Entries,physical:members.filter(c=>packingOwnership.acceptPaintComponent('city',c)),key:c=>c.objectId+'|'+c.partId,partialGatePlan:undefined,s402Plan:undefined,s036Plan:undefined,s240Plan:undefined,c248Coface:undefined,c018Plan:undefined,cbtPlan:undefined,c298Plan:undefined})();
 assert.deepEqual(cityDependencies,[]);
 const file='painted/infill/safety/building-mesh-renderer.ts',source=read(file),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);let call;
 (function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='coalesceRendererChunkGroups')call=node;ts.forEachChild(node,visit);})(ast);assert(call);
 const dependencies=expression('()=>('+call.arguments[1].getText(ast)+')',{plans:{s434Plan:{profile,entries:s434Entries}},acceptPaintComponent:packingOwnership.acceptPaintComponent})();
 assert(members.every(c=>packingOwnership.acceptPaintComponent('infill',c)));assert.equal(dependencies.length,1);assert.equal(dependencies[0].members.length,7);
 assert.equal(chunks.coalesceRendererChunkGroups([group(members)],dependencies)[0].components.length,7);
 assert.throws(()=>chunks.coalesceRendererChunkGroups([group(members.slice(1))],dependencies),/Admitted semantic packing dependency is not complete/);
});

function selectPhysicalDependencies(provider,plans){
 const file='painted/'+provider+'/safety/building-mesh-renderer.ts',source=read(file),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);let call;
 (function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='coalesceRendererChunkGroups')call=node;ts.forEachChild(node,visit);})(ast);assert(call);
 const argument=call.arguments[1],sourceExpression=ts.isIdentifier(argument)?declaration(file,argument.text):argument.getText(ast);
 return expression('()=>('+sourceExpression+')',{plans,partialGatePlan:plans.partialGate,s402Plan:plans.s402,s036Plan:plans.s036,s240Plan:plans.s240,profile:null,s434DisplayProfile:null,s434Entries:[],acceptPaintComponent:packingOwnership.acceptPaintComponent})();
}
for(const[name,file,constant]of[
 ['partialGate','source-partial-gate-display.ts','PROFILE'],
 ['s402','s402-connector-display-constants.ts','S402_CONNECTOR_EXPECTED'],
 ['s036','s036-north-coface-constants.ts','S036_NORTH_EXPECTED'],
 ['s240','s240-base-coface-constants.ts','S240_BASE_EXPECTED'],
]){
 const fixture=expression(declaration('painted/root500/safety/'+file,constant),{});
 const members=(fixture.members??[fixture.parent,fixture.cover]).map(row=>({...row,city:fixture.city,sourceFeature:{properties:row.sourceProperties??{}},batches:[]}));
 for(const provider of ['root500','tier300','infill','bremen'])test(provider+' selects only its owned '+name+' dependency without weakening completeness',()=>{
  const plan={enabled:true,members,parent:members[0],cover:members[1]},dependencies=selectPhysicalDependencies(provider,{[name]:plan});
  const owns=members.some(c=>packingOwnership.acceptPaintComponent(provider,c));
  if(!owns){assert.deepEqual(dependencies,[]);assert.deepEqual(chunks.coalesceRendererChunkGroups([],dependencies),[]);return;}
  assert.equal(dependencies.length,1);assert.deepEqual(dependencies[0].members,members);
  assert.equal(chunks.coalesceRendererChunkGroups([group(members)],dependencies)[0].components.length,members.length);
  assert.throws(()=>chunks.coalesceRendererChunkGroups([group(members.slice(1))],dependencies),/Admitted semantic packing dependency is not complete/);
  assert.throws(()=>chunks.coalesceRendererChunkGroups([],dependencies),/Admitted semantic packing dependency is not complete/);
  assert.deepEqual(selectPhysicalDependencies(provider,{[name]:{...plan,enabled:false}}),[]);
 });
}
