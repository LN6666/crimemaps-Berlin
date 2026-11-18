import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';

const web=fileURLToPath(new URL('../',import.meta.url)),infill=path.join(web,'src/painted/infill/safety'),bremen=path.join(web,'src/painted/bremen/safety');
const registryFile=path.join(infill,'bremen-infill-owner-routes.ts'),metadataFile=path.join(infill,'bremen-infill-owner-metadata.ts');
const sources=new Map(),compiled=new Map();
const parse=(file,text)=>ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
for(const file of [registryFile,metadataFile])sources.set(file,await readFile(file,'utf8'));
const registryAst=parse(registryFile,sources.get(registryFile)),metadataAst=parse(metadataFile,sources.get(metadataFile));
const exported=node=>node.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword);
const unwrap=node=>ts.isAsExpression(node)||ts.isParenthesizedExpression(node)?unwrap(node.expression):node;
const routes=[],members=[];
let current,registryExports=false;const registryValues=[];
for(const statement of registryAst.statements){
 // The route list ends at the registry's own exported preparation functions; the
 // exports after them (infillDataFunctionArities) belong to the registry, not a route.
 if(ts.isFunctionDeclaration(statement)&&exported(statement)){registryExports=true;current=undefined;continue;}
 if(!ts.isVariableStatement(statement))continue;
 for(const declaration of statement.declarationList.declarations){
  const value=declaration.initializer&&unwrap(declaration.initializer);
  if(value&&ts.isCallExpression(value)&&value.expression.getText(registryAst)==='createModuleRoute'){
   const [label,cities,load]=value.arguments;let imported;
   function visit(node){if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword){assert(ts.isStringLiteral(node.arguments[0]),'original import remains literal');imported=node.arguments[0].text;}ts.forEachChild(node,visit);}visit(load);
   const originalFile=path.resolve(infill,imported)+(path.extname(imported)?'':'.ts');
   current={name:declaration.name.getText(registryAst),file:label.text,cities:cities.elements.map(city=>city.text),imported,originalFile,members:[]};routes.push(current);
  }else if(exported(statement)&&registryExports){registryValues.push(declaration.name.getText(registryAst));
  }else if(exported(statement)){
   assert(current,'route before public export');const member={name:declaration.name.getText(registryAst),route:current};
   if(value&&ts.isPropertyAccessExpression(value)&&ts.isPropertyAccessExpression(value.expression)&&value.expression.expression.getText(registryAst)==='metadata')member.metadata={namespace:value.expression.name.text,name:value.name.text};
   current.members.push(member);members.push(member);
  }
 }
}
assert.deepEqual(registryValues,['infillDataFunctionArities'],'the registry exports only its data-function arity table after the routes');
assert(routes.length>=52,'all 52 original boundary routes remain represented');assert.equal(new Set(routes.map(route=>route.file)).size,routes.length);
for(const route of routes)for(const file of [route.originalFile,path.join(bremen,route.file)])sources.set(file,await readFile(file,'utf8'));
const signatureFile=path.join(web,'src/painted/root500/safety/progressive-native-signature.ts');sources.set(signatureFile,await readFile(signatureFile,'utf8'));
// The route registry now prepares each loaded original module's scoped data through
// the shared infill owner preparation (prepareInfillOwnerModule). That helper is
// data-free: it imports types only and walks the module's own data hooks.
const preparationFile=path.join(infill,'infill-owner-preparation.ts');sources.set(preparationFile,await readFile(preparationFile,'utf8'));
assert(parse(preparationFile,sources.get(preparationFile)).statements.filter(ts.isImportDeclaration).every(node=>node.importClause?.isTypeOnly),'the shared infill preparation helper has no value imports');
function publicNames(file){const ast=parse(file,sources.get(file)),names=[];for(const node of ast.statements){if(exported(node)&&ts.isFunctionDeclaration(node)&&node.name)names.push(node.name.text);if(exported(node)&&ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations)names.push(declaration.name.getText(ast));if(ts.isExportDeclaration(node)&&!node.isTypeOnly&&node.exportClause&&ts.isNamedExports(node.exportClause))for(const item of node.exportClause.elements)if(!item.isTypeOnly)names.push(item.name.text);}return names.sort();}
function execute(file,read){let code=compiled.get(file);if(!code){assert(sources.has(file),'explicit source '+file);code=ts.transpileModule(sources.get(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;compiled.set(file,code);}const module={exports:{}};Function('require','exports','module',code)(read,module.exports,module);return module.exports;}
// The first declaration in source order: since the scoped-data migration the
// original algorithm is the inner function of getInfillData's memo (reading
// __infillRead_GROUPS()), followed by the exported scope-dispatch wrapper.
function originalFunction(file,name,values){const ast=parse(file,sources.get(file));let found;function visit(node){if(!found&&node.name?.getText(ast)===name&&(ts.isFunctionDeclaration(node)||ts.isVariableDeclaration(node)))found=node;ts.forEachChild(node,visit);}visit(ast);assert(found,name);const expression=ts.isFunctionDeclaration(found)?found.getText(ast).replace(/^export\s+/,''):found.initializer.getText(ast),code=ts.transpileModule('('+expression+')',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;return Function(...Object.keys(values),'return '+code)(...Object.values(values));}
const {createFrozenDataScope}=createRuntimeLoader().load(path.join(web,'src/safety/frozen-data-scope.ts'));
// Originals now also export the infill data-contract hooks (InfillDataModule:
// data refs/memo keys, preparation, demand). They serve the route's scoped
// preparation of the loaded module, not Bremen callers: the thin proxies keep
// every other public name. The hook names are read from the contract itself.
const contractFile=path.join(infill,'infill-data-contract.ts'),contractAst=parse(contractFile,await readFile(contractFile,'utf8'));
const dataContractNames=new Set(contractAst.statements.filter(node=>ts.isInterfaceDeclaration(node)&&node.name.text==='InfillDataModule').flatMap(node=>node.members.filter(member=>member.name).map(member=>member.name.getText(contractAst))));
assert(['infillDataRefs','prepareInfillData','mayMatchInfillData','infillDataDependencies'].every(name=>dataContractNames.has(name)),'the infill data contract names its module hooks');
const emptyStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
const row=(city='berlin',objectId='unknown',partId='unknown')=>({city,objectId,partId,batches:[{positions:[0,0,0],normals:[0,1,0],indices:[0,0,0],color:[.2,.3,.4]}]});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const signal=()=>new AbortController().signal;
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}

function fixture(){
 const cache=new Map(),loads=[],calls=[],originals=new Map(),returns=new Map(),failures=new Map();
 function requireFrom(file,request){assert(!/frozen-paint-tables|painted-tables|\.json|(?:^|\/)\w[^/]*-data(?:$|\.)/.test(request),'data reader/import forbidden: '+request);assert(request.startsWith('.'),'unexpected external import '+request);const resolved=path.resolve(path.dirname(file),request)+(path.extname(request)?'':'.ts');if(originals.has(resolved)){loads.push(routes.find(route=>route.originalFile===resolved).file);if(failures.has(resolved)){const error=failures.get(resolved);failures.delete(resolved);throw error;}return originals.get(resolved);}assert([registryFile,metadataFile,signatureFile,preparationFile,...routes.map(route=>path.join(bremen,route.file))].includes(resolved),'unexpected runtime source '+resolved);return load(resolved);}
 function load(file){if(cache.has(file))return cache.get(file);const value=execute(file,request=>requireFrom(file,request));cache.set(file,value);return value;}
 const metadata=load(metadataFile);
 for(const route of routes){const module={};for(const member of route.members){if(member.metadata){module[member.name]=metadata[member.metadata.namespace][member.metadata.name];continue;}const result=/Reconstruction/.test(member.name)?{components:[{...row(route.cities[0]),batches:[{positions:[7,8,9],normals:[0,1,0],indices:[0],color:[.1,.2,.3],paint:[.4,.5,.6,2],frames:[1,2,3,4,45000]}]}],stats:{...emptyStats,objects:1,route:route.file}}:/Status|Rejections/.test(member.name)?[{restoredExistingAcceptedStyle:true,from:route.file}]:{objects:1,vertices:1,actualVisualAccepted:false,from:route.file};returns.set(member.name,result);module[member.name]=(...args)=>{calls.push({name:member.name,args});return result;};}originals.set(route.originalFile,module);}
 const registry=load(registryFile),proxies=new Map(routes.map(route=>[route.file,load(path.join(bremen,route.file))]));
 // The batch data scope every applicable route prepares its loaded module in. The
 // tiny originals declare no frozen data, so nothing is ever acquired through it.
 const scope=createFrozenDataScope({acquire(){throw Error('tiny original owner modules declare no frozen data');},dispose(){}});
 return{registry,metadata,proxies,originals,returns,loads,calls,failures,load,scope};
}

test('all actual thin proxies preserve their whole original public API and cold metadata/material calls load no original data modules',()=>{
 const f=fixture();assert.equal(f.loads.length,0);
 for(const route of routes){const proxy=f.proxies.get(route.file);assert.deepEqual(Object.keys(proxy).sort(),publicNames(route.originalFile).filter(name=>!dataContractNames.has(name)&&name!=='getInfillData'),route.file+' whole API');for(const member of route.members){assert.equal(proxy[member.name],f.registry[member.name],member.name+' uses the shared route');if(member.metadata){assert.equal(proxy[member.name],f.metadata[member.metadata.namespace][member.metadata.name]);if(/Materials/.test(member.name)){const paint=new Float32Array([.25,.5,.75,1]),frames=new Float32Array([1,2,3,4,5]);proxy[member.name]([],paint,frames);assert.deepEqual([...paint],[.25,.5,.75,1]);assert.deepEqual([...frames],[1,2,3,4,5]);}}}}
 assert.deepEqual(f.loads,[]);assert.deepEqual(f.calls,[]);
});

function candidates(namespace){const values=new Map(),add=(objectId,partId)=>values.set(objectId+'|'+partId,{objectId,partId});function visit(node){if(ts.isObjectLiteralExpression(node)){const p=Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).filter(property=>ts.isStringLiteral(property.initializer)).map(property=>[property.name.getText(metadataAst).replace(/^['"]|['"]$/g,''),property.initializer.text]));if(p.objectId&&p.partId)add(p.objectId,p.partId);}if(ts.isStringLiteral(node)){const text=node.text;if(/^osm\/(?:way|relation)\/\d+\|/.test(text)){const at=text.indexOf('|');add(text.slice(0,at),text.slice(at+1));}else if(/^osm\/(?:way|relation)\/\d+\/component\//.test(text))add(text.split('/component/')[0],text);else if(/^osm\/(?:way|relation)\/\d+$/.test(text))add(text,'noncatalog-part');}ts.forEachChild(node,visit);}visit(namespace);return[...values.values()];}
test('metadata predicates execute matching-city and undefined-city positive identities, preserving C032 object-only and original city guards',()=>{
 const f=fixture(),namespaces=new Map();for(const statement of metadataAst.statements)if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)namespaces.set(declaration.name.getText(metadataAst),declaration);
 const cities=[undefined,...new Set(routes.flatMap(route=>route.cities)),'berlin','bremen','hamburg'];let checked=0;
 for(const member of members.filter(member=>member.metadata&&/Identity$/.test(member.name))){const fn=f.registry[member.name],input=candidates(namespaces.get(member.metadata.namespace));assert(input.length,'compact identity candidates '+member.name);let positives=0;for(const identity of input)for(const city of cities){const result=fn({...identity,...(city===undefined?{}:{city})});assert.equal(typeof result,'boolean',member.name);if(result)positives++;}if(member.name==='infillSchauspielhausDerivedIdentity'){const original=parse(member.route.originalFile,sources.get(member.route.originalFile));let body;function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(original)===member.name)body=node.initializer.body;ts.forEachChild(node,visit);}visit(original);assert.equal(body?.kind,ts.SyntaxKind.FalseKeyword,'the original explicitly certifies no derived identity');assert.equal(positives,0);}else assert(positives>0,'matching-city/undefined positive for '+member.name);checked++;}
 assert(checked>=53);assert.equal(f.registry.infillC032OfficialIdentity({city:'essen',objectId:'osm/relation/2181079',partId:'not-a-catalogue-part'}),true);assert.equal(f.registry.infillC032OfficialIdentity({city:'berlin',objectId:'osm/relation/2181079',partId:'not-a-catalogue-part'}),false);assert.equal(f.registry.infillC032OriginalIdentity({objectId:'osm/way/452269648',partId:'osm/way/452269648/component/207ca47e16e67d7b21b8'}),true);assert.equal(f.registry.infillC032OriginalIdentity({city:'berlin',objectId:'osm/way/452269648',partId:'osm/way/452269648/component/207ca47e16e67d7b21b8'}),false);assert.equal(f.registry.infillSilberturmIdentity({city:'bremen',objectId:'osm/way/11527403',partId:'osm/way/11527403/component/fee6c96118bb2d2026ed'}),true);assert.deepEqual(f.loads,[]);
});

test('cold marker-based materials preserve noncatalog/city-changed admission and exact offsets without identity gating',()=>{
 const f=fixture(),plain=row(),marked={...row('berlin','not-catalogued','not-catalogued'),displayEstimates:{infillC032Official:true},batches:[{positions:[0,0,0,1,0,0],paint:[.1,.2,.3,26101,.4,.5,.6,26103],frames:Array(10).fill(.75)}]},paint=new Float32Array(16).fill(-1),frames=new Float32Array(20).fill(-2);
 assert.equal(f.registry.infillC032OfficialIdentity(marked),false);assert.deepEqual(f.registry.infillC032OfficialBaseMaterials([plain,marked,plain],paint,frames),{objects:1,vertices:2,actualVisualAccepted:false});assert.deepEqual([...paint].slice(0,4),Array(4).fill(-1));assert.equal(paint[7],2);assert.equal(paint[11],2);assert.equal(frames[9],26101);assert.equal(frames[14],26103);assert.deepEqual([...paint].slice(12),Array(4).fill(-1));assert.deepEqual([...frames].slice(15),Array(5).fill(-2));
 const low={...marked,city:'frankfurt',displayEstimates:{infillFrankfurtLowOffice:true},batches:[{positions:[0,0,0,1,0,0],paint:Array(8).fill(.25),frames:Array(10).fill(.5)}]},p=new Float32Array(16).fill(-1),r=new Float32Array(20).fill(-2);assert.equal(f.registry.infillFrankfurtLowOfficeIdentity(low),false);assert.deepEqual(f.registry.infillFrankfurtLowOfficeBaseMaterials([plain,low,plain],p,r),{objects:1,vertices:2,actualVisualAccepted:false});assert.deepEqual([...p],[...Array(4).fill(-1),...Array(8).fill(.25),...Array(4).fill(-1)]);assert.deepEqual([...r],[...Array(5).fill(-2),...Array(10).fill(.5),...Array(5).fill(-2)]);assert.deepEqual(f.loads,[]);
});

test('foreign no-match keeps original array-copy versus alias contracts and public cold status/material extras',()=>{
 const f=fixture(),rows=[row()],same=f.registry.infillOmniturmReconstruction(rows),copy=f.registry.infillFrankfurtLowOfficeReconstruction(rows);assert.equal(same.components,rows);assert.notEqual(copy.components,rows);assert.equal(copy.components[0],rows[0]);assert.deepEqual(same.stats,emptyStats);assert.deepEqual(copy.stats,emptyStats);
 assert.deepEqual(f.registry.infillC032OriginalStatus(),[]);assert.deepEqual(f.registry.infillC032OriginalRejections(),[]);const paint=new Float32Array([.25]),frames=new Float32Array([.5]);assert.deepEqual(f.registry.infillC032OriginalBaseMaterials(rows,paint,frames),{objects:0,vertices:0,restoredExistingAcceptedStyle:true,actualVisualAccepted:false});assert.deepEqual(f.registry.silberturmSpecificMaterials050(rows,paint,frames),{objects:0,vertices:0,reason:'complete exact crown-repaired group required',actualVisualAccepted:false});assert.deepEqual([...paint],[.25]);assert.deepEqual([...frames],[.5]);assert.deepEqual(f.loads,[]);
});

test('explicit applicable-city prepare loads the complete actual city group and delegates original geometry, arguments and extra statuses',async()=>{
 const f=fixture();await f.registry.prepareBremenInfillOwnerRoutes([row('bremen')],signal(),undefined,f.scope);assert.deepEqual(f.loads,[]);const seen=new Set();
 for(const city of new Set(routes.flatMap(route=>route.cities))){const applicable=routes.filter(route=>route.cities.includes(city)),first=applicable.flatMap(route=>route.members).find(member=>!member.metadata&&/Reconstruction/.test(member.name));assert.throws(()=>f.registry[first.name]([row(city)]),/not prepared/);await f.registry.prepareBremenInfillOwnerRoutes([row(city)],signal(),undefined,f.scope);for(const route of applicable)seen.add(route.file);assert.deepEqual(new Set(f.loads),seen,'whole city group without guessed raw identity');
  for(const route of applicable)for(const member of route.members.filter(member=>!member.metadata)){const args=/Status|Rejections/.test(member.name)?[]:[[row(city)],['selected'],()=> 'leaf'],result=f.registry[member.name](...args);assert.equal(result,f.returns.get(member.name));const call=f.calls.at(-1);assert.equal(call.name,member.name);assert.equal(call.args.length,args.length);call.args.forEach((value,index)=>assert.equal(value,args[index],member.name+' original argument '+index));}
 }
 assert.equal(f.loads.length,routes.length);assert.equal(f.registry.infillC032OriginalStatus()[0].restoredExistingAcceptedStyle,true);
});

test('one cancelled observer cannot publish late or cancel the other observer sharing a city import group',async()=>{
 const f=fixture(),gate=deferred(),controller=new AbortController(),wait=async operation=>{const module=await operation;await gate.promise;return module;},rows=[row('frankfurt')];
 const cancelled=f.registry.prepareBremenInfillOwnerRoutes(rows,controller.signal,wait,f.scope),active=f.registry.prepareBremenInfillOwnerRoutes(rows,signal(),wait,f.scope);await tick();controller.abort();await assert.rejects(cancelled,{name:'AbortError'});assert.throws(()=>f.registry.infillFrankfurtLowOfficeReconstruction(rows),/not prepared/);gate.resolve();await active;assert.equal(f.registry.infillFrankfurtLowOfficeReconstruction(rows),f.returns.get('infillFrankfurtLowOfficeReconstruction'));assert.equal(f.loads.length,routes.filter(route=>route.cities.includes('frankfurt')).length);
});

test('adapter rejection, synchronous adapter throw and original import failure leave readiness unpublished and permit bounded retry',async()=>{
 for(const failureMode of ['rejected-adapter','throwing-adapter','original-import']){const f=fixture(),failure=Error(failureMode),rows=[row('frankfurt')],failedRoute=routes.find(route=>route.file==='infill-frankfurt-low-office.ts');let wait;
  if(failureMode==='original-import')f.failures.set(failedRoute.originalFile,failure);else wait=failureMode==='throwing-adapter'?()=>{throw failure;}:()=>Promise.reject(failure);
  await assert.rejects(f.registry.prepareBremenInfillOwnerRoutes(rows,signal(),wait,f.scope),error=>error===failure);await tick();assert.throws(()=>f.registry.infillFrankfurtLowOfficeReconstruction(rows),/not prepared/);await f.registry.prepareBremenInfillOwnerRoutes(rows,signal(),undefined,f.scope);assert.equal(f.registry.infillFrankfurtLowOfficeReconstruction(rows),f.returns.get('infillFrankfurtLowOfficeReconstruction'));assert.equal(f.loads.filter(file=>file===failedRoute.file).length,failureMode==='original-import'?2:1);
 }
});

test('tiny original low-office algorithm preserves complete sibling guards, six copied arrays and material offsets through the actual facade',async()=>{
 const f=fixture(),native=execute(signatureFile,()=>{throw Error('unexpected signature dependency');}).nativePaintSignature,rows=[0,1].map(index=>({...row('frankfurt','tiny-'+index,'tiny-part-'+index),origin:[8.6,50.1],componentGeometry:{type:'Polygon',coordinates:[[[8,50],[9,50],[8,51],[8,50]]]},sourceFeature:{type:'Feature',properties:{index}},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.5,.5,.5]}]})),group={queueId:'tiny-complete-group',geometryReadyForPreview:true,materialsComplete:true,requiredNativeGroup:rows.map(c=>c.partId),models:rows.map(c=>({identity:{objectId:c.objectId,partId:c.partId,signature:native(c)},source:structuredClone(c),display:[{...structuredClone(c.batches[0]),paint:Array(12).fill(.25),frames:Array(15).fill(.5)}]}))},file=path.join(infill,'infill-frankfurt-low-office.ts'),unchanged=originalFunction(file,'unchanged',{nativePaintSignature:native}),original=originalFunction(file,'infillFrankfurtLowOfficeReconstruction',{__infillRead_GROUPS:()=>[group],unchanged,LOW_OFFICE_SHA:'tiny-sha'});
 f.originals.get(file).infillFrankfurtLowOfficeReconstruction=original;await f.registry.prepareBremenInfillOwnerRoutes(rows,signal(),undefined,f.scope);const before=structuredClone(rows),out=f.registry.infillFrankfurtLowOfficeReconstruction(rows,[group.queueId]);assert.deepEqual(out,original(rows,[group.queueId]));assert.equal(out.stats.objects,2);assert.deepEqual(rows,before);
 for(const [index,c]of out.components.entries()){assert.equal(c.sourceFeature,rows[index].sourceFeature);assert.equal(c.componentGeometry,rows[index].componentGeometry);for(const name of ['positions','normals','indices','color','paint','frames']){assert.deepEqual(c.batches[0][name],group.models[index].display[0][name]);assert.notEqual(c.batches[0][name],group.models[index].display[0][name]);}}
 const changed=structuredClone(rows);changed[0].batches[0].positions[0]=99;for(const [input,selected]of [[rows.slice(1),undefined],[changed,undefined],[[...rows,rows[0]],undefined],[rows,[]],[rows,['other']]]){const result=f.registry.infillFrankfurtLowOfficeReconstruction(input,selected);assert.equal(result.stats.objects,0);assert.notEqual(result.components,input);result.components.forEach((c,index)=>assert.equal(c,input[index]));}
 const plain=row(),paint=new Float32Array(28),frames=new Float32Array(35);assert.deepEqual(f.registry.infillFrankfurtLowOfficeBaseMaterials([plain,...out.components],paint,frames),{objects:2,vertices:6,actualVisualAccepted:false});assert.deepEqual([...paint],[...Array(4).fill(0),...Array(24).fill(.25)]);assert.deepEqual([...frames],[...Array(5).fill(0),...Array(30).fill(.5)]);
});
