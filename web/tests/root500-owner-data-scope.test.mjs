import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import ts from 'typescript';

// Actual owner modules and the actual resource core, with only profile row-count
// metadata virtualized. No model asset/table is opened or decoded. The one
// resource fixture below consists of tiny verified JSON made in this test.
const web=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(web,'tests/root500-owner-scope-manifest.json'),'utf8'));
const legacyEdges=new Set(),built=await build({stdin:{contents:manifest.modules.map((row,i)=>`import * as m${i} from './${row.file}';`).join('\n')+'\nexport const modules=['+manifest.modules.map((_,i)=>'m'+i).join(',')+'];\nexport {createFrozenDataScope} from "./src/safety/frozen-data-scope";export {createFrozenDataLeaseStore} from "./src/safety/frozen-data-lease-store";',resolveDir:web,sourcefile:'root500-owner-data-scope-fixture.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent',plugins:[{name:'no-legacy-model-reader',setup(builder){builder.onResolve({filter:/frozen-paint-tables/},args=>{legacyEdges.add(path.basename(args.importer));return{path:'metadata-only',namespace:'owner-fixture'};});builder.onLoad({filter:/.*/,namespace:'owner-fixture'},()=>({contents:'export function readFrozenTable(){throw Error("Legacy model reads are forbidden in this fixture")};export const readFrozenTableAsync=readFrozenTable;export const frozenPaintTableRowCounts=()=>undefined;',loader:'js'}));}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=root500-owner-data-scope-fixture.mjs').toString('base64'));
const modules=api.modules,signal=()=>new AbortController().signal;
const component=(city='bremen')=>({city,objectId:'osm/way/999999999999',partId:'osm/way/999999999999/component/unknown',origin:[0,0],batches:[],sourceFeature:{type:'Feature',properties:{}},componentGeometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[0,1],[0,0]]]},displayEstimates:{},start:0,end:0,firstVertex:0,lastVertex:0,box:[0,0,0,0]});
const moduleNamed=name=>modules[manifest.modules.findIndex(row=>path.basename(row.file)===name)];
function coldScope(){const calls={memo:0,borrow:0,prepare:0};return{calls,scope:{memo(){calls.memo++;throw Error('Cold memo touched')},borrow(){calls.borrow++;throw Error('Cold borrow touched')},async prepare(){calls.prepare++;throw Error('Cold preparation touched')}}};}
function invoke(module,name,args,scope){const arity=module.root500DataFunctionArities[name];if(arity!==undefined){args.length=arity;args.push(scope);}return module[name](...args);}

test('the complete owner-family cold identity, reconstruction and material entry points do not borrow or construct model state',t=>{
 const f=coldScope(),counts={identity:0,reconstruction:0,material:0};
 for(let i=0;i<modules.length;i++)for(const[name,fn]of Object.entries(modules[i])){
  if(typeof fn!=='function')continue;const c=component(),rows=[c],label=path.basename(manifest.modules[i].file)+':'+name;
  if(/Identity$/.test(name)){counts.identity++;assert.equal(invoke(modules[i],name,[c],f.scope),false,label);}
  else if(/Reconstruction$/.test(name)){counts.reconstruction++;const result=invoke(modules[i],name,[rows],f.scope);assert.deepEqual(result.components,rows,label);assert.equal(result.components[0],c,label);assert.equal(result.stats.objects,0,label);const contract=manifest.modules[i].coldContracts.find(row=>row.name===name);if(contract)assert.equal(result.components===rows,contract.arrayAlias,label+' original array alias');}
  else if(/(?:BaseMaterials|Materials)$/.test(name)){counts.material++;invoke(modules[i],name,[rows,new Float32Array(),new Float32Array()],f.scope);}
 }
 assert.deepEqual(f.calls,{memo:0,borrow:0,prepare:0});assert(counts.identity>200&&counts.reconstruction>200&&counts.material>200);t.diagnostic(JSON.stringify({modules:modules.length,...counts,...f.calls}));
});

test('actual stage preparation excludes same-city unknown identities and preserves cancellation before resource work',async t=>{
 const f=coldScope();let stages=0;
 for(let i=0;i<modules.length;i++){
  const row=manifest.modules[i],module=modules[i];if(!Object.keys(module).some(name=>/Reconstruction$|Materials$/.test(name)&&typeof module[name]==='function'))continue;
  stages++;for(const city of new Set(['bremen','berlin',...row.cities])){const rows=[component(city)];assert.equal(module.mayMatchRoot500Data(rows),false,path.basename(row.file)+' '+city);await module.prepareRoot500Data(rows,signal(),f.scope);}
  const controller=new AbortController();controller.abort();await assert.rejects(module.prepareRoot500Data([],controller.signal,f.scope),{name:'AbortError'});
 }
 assert(stages>190);assert.deepEqual(f.calls,{memo:0,borrow:0,prepare:0});t.diagnostic(stages+' actual owner stage modules, every declared city plus Bremen/Berlin.');
});

test('F029 actual scope migration preserves exact city-agnostic identities, cold map copies and marker-gated material no-ops',()=>{
 const module=moduleNamed('owner-f029-reconstruction.ts'),f=coldScope(),ids=module.F029_IDS;assert.equal(ids.length,10);
 for(const id of ids)for(const city of [undefined,'berlin','bremen','frankfurt']){assert.equal(module.ownerF029Identity({objectId:id.objectId,partId:id.partId,...(city===undefined?{}:{city})},f.scope),true);assert.equal(module.ownerF029Identity({objectId:id.objectId,partId:id.partId+'/wrong',city},f.scope),false);}
 for(let i=0;i<ids.length;i++)assert.equal(module.ownerF029Identity({objectId:ids[i].objectId,partId:ids[(i+1)%ids.length].partId},f.scope),false);
 const native=(id,city,marked)=>({...component(city),objectId:id.objectId,partId:id.partId,batches:[{positions:[0,-0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.2,.3,.4]}],displayEstimates:marked?{F029Completion:{patchSHA256:module.F029_SHA}}:{}});
 const foreign=ids.flatMap(id=>[native(id,'bremen',true),native(id,'frankfurt',true)]),unknown=native(component('berlin'),'berlin',true);
 for(const rows of [foreign,[unknown],[...foreign,unknown]]){
  const before=structuredClone(rows),out=module.ownerF029Reconstruction(rows,f.scope);assert.notEqual(out.components,rows,'F029 retains its original map-copy array contract');assert.deepEqual(out.components,rows);out.components.forEach((c,index)=>assert.equal(c,rows[index]));assert.deepEqual(out.stats,{objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
  const count=rows.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0),paint=new Float32Array(count*4).fill(.375),frames=new Float32Array(count*5).fill(-.5),paintBefore=paint.slice(),framesBefore=frames.slice(),paintBuffer=paint.buffer,framesBuffer=frames.buffer;assert.equal(module.ownerF029BaseMaterials(rows,paint,frames,f.scope),undefined);assert.deepEqual(paint,paintBefore);assert.deepEqual(frames,framesBefore);assert.equal(paint.buffer,paintBuffer);assert.equal(frames.buffer,framesBuffer);assert.deepEqual(rows,before);
 }
 // A known Berlin ID alone is insufficient for the material path: only an
 // actual F029Completion marker enables its scoped DISPLAY data dependency.
 const unmarked=ids.map(id=>native(id,'berlin',false)),paint=new Float32Array(ids.length*12).fill(.25),frames=new Float32Array(ids.length*15).fill(.75),paintBefore=paint.slice(),framesBefore=frames.slice();assert.equal(module.ownerF029BaseMaterials(unmarked,paint,frames,f.scope),undefined);assert.deepEqual(paint,paintBefore);assert.deepEqual(frames,framesBefore);assert.deepEqual(f.calls,{memo:0,borrow:0,prepare:0});
 let acquires=0;const client={async acquire(){acquires++;throw Error('No acquire may occur without explicit preparation');},dispose(){}},realScope=api.createFrozenDataScope(client),matching=native(ids[0],'berlin',true),missing=/resource was not prepared for this scope/;
 try{assert.throws(()=>module.ownerF029Reconstruction([matching],realScope),missing);assert.throws(()=>module.ownerF029BaseMaterials([matching],new Float32Array(12),new Float32Array(15),realScope),missing);assert.equal(acquires,0);assert.equal(realScope.stats.resources,0);assert.equal(realScope.stats.pending,0);}finally{realScope.release();}
});

test('F115 inline source identities retain exact pairs rather than an object/part Cartesian product',()=>{
 const row=manifest.modules.find(row=>row.file.endsWith('/owner-f115-reconstruction.ts')),pairs=row.identityMetadata.find(item=>item.name==='ownerF115Identity').pairs,module=moduleNamed('owner-f115-reconstruction.ts'),f=coldScope();assert.equal(pairs.length,6);assert(pairs.every(pair=>pair.partId!==null));
 for(const a of pairs)for(const b of pairs)if(a.partId!==b.partId)assert.equal(module.ownerF115Identity({city:'munich',objectId:a.objectId,partId:b.partId},f.scope),false);
 assert.deepEqual(f.calls,{memo:0,borrow:0,prepare:0});
});

test('F154 recovery keeps exactly the original identity and near-origin domain before touching its recipe',async()=>{
 const module=moduleNamed('owner-f154-reconstruction.ts'),f=coldScope(),far=[component('frankfurt')],bremen=[component('bremen')];
 assert.equal(module.ownerF154RecoveredSources(far,f.scope),far);assert.equal(module.ownerF154RecoveredSources(bremen,f.scope),bremen);
 await module.prepareOwnerF154RecoveredSources(far,signal(),undefined,f.scope);await module.prepareOwnerF154RecoveredSources(bremen,signal(),undefined,f.scope);
 assert.equal(module.mayMatchRoot500Data(far),false);assert.equal(module.mayMatchRoot500Data([{...component('frankfurt'),origin:[8.67198,50.116035]}]),true);assert.deepEqual(f.calls,{memo:0,borrow:0,prepare:0});
});

test('actual imported batch data helper keep the full borrowed values, exact alias rules and per-scope memo ownership',async()=>{
 const batches=moduleNamed('owner-f032-reconstruction-data.ts'),refs=batches.root500DataRefs;
 const value=[{positions:[0,-0,1.125],normals:[0,1,0],indices:[0],color:[.1,.2,.3],frames:[1,2,3,4,5],paint:[.2,.3,.4,2],extra:{retained:['all','fields']}}],raw=new TextEncoder().encode(JSON.stringify(value).replace('[0,0,1.125]','[0,-0,1.125]')),sha=createHash('sha256').update(raw).digest('hex'),descriptor={path:`/safety/buildings3d/painted-tables/${sha.slice(0,2)}/${sha}.json`,sha256:sha,bytes:raw.length},store=api.createFrozenDataLeaseStore([descriptor]);
 const initializers={};for(const ref of refs)initializers[ref.file]=Math.max(initializers[ref.file]??0,ref.occurrence+1);let reads=0;
 const client=store.client({city:'berlin',provider:'root500',profileSHA256:'a'.repeat(64),selection:{tables:[sha],initializers:{[sha]:initializers}},resolve:()=>sha,async read(resource,request,max){request.throwIfAborted();assert.equal(resource,descriptor.path);assert.equal(max,raw.length);reads++;return raw;}}),a=api.createFrozenDataScope(client),b=api.createFrozenDataScope(client);
 try{
  assert.throws(()=>batches.getF032_RECONSTRUCTION_BATCHES(a),/not prepared/);await Promise.all([a.prepare(refs,signal()),b.prepare(refs,signal())]);
  const first=batches.getRoot500Data(a),second=batches.getRoot500Data(b);assert.equal(batches.getRoot500Data(a),first);assert.notEqual(first,second);assert.equal(first.F032_RECONSTRUCTION_BATCHES,batches.getF032_RECONSTRUCTION_BATCHES(a));assert.equal(first.F032_RECONSTRUCTION_BATCHES,second.F032_RECONSTRUCTION_BATCHES);assert.deepEqual(first.F032_RECONSTRUCTION_BATCHES,value);assert.equal(reads,refs.length);
  const unpin=a.retain();a.release();assert.equal(a.stats.disposed,false);unpin();assert.equal(a.stats.disposed,true);assert.throws(()=>batches.getRoot500Data(a),/released/i);assert.deepEqual(batches.getF032_RECONSTRUCTION_BATCHES(b),value);
 }finally{a.release();b.release();client.dispose();}
 assert.equal(store.stats.valueCells,0);assert.equal(store.stats.leases,0);
});

test('the family has one implementation per original callable and exact frozen file/SHA/occurrence bindings without TLA',()=>{
 let refs=0;
 for(const row of manifest.modules){
  const text=fs.readFileSync(path.join(web,row.file),'utf8'),source=ts.createSourceFile(row.file,text,ts.ScriptTarget.Latest,true),declarations=new Map();
  function visit(node,inFunction=false){const nested=inFunction||ts.isFunctionLike(node);if(!nested){assert(!ts.isAwaitExpression(node),row.file+' top-level await');if(ts.isCallExpression(node))assert(!/^readFrozenTable(?:Async)?$/.test(node.expression.getText(source)),row.file+' legacy read');}
   if(ts.isFunctionDeclaration(node)&&node.name||ts.isVariableDeclaration(node)&&node.initializer&&(ts.isArrowFunction(node.initializer)||ts.isFunctionExpression(node.initializer))){const name=node.name.text;declarations.set(name,(declarations.get(name)??0)+1);}ts.forEachChild(node,child=>visit(child,nested));}visit(source);
  for(const fn of row.functions)assert.equal(declarations.get(fn.name)??(fn.aliasOf?1:0),1,row.file+':'+fn.name+' single original implementation');
  refs+=row.refs.length;
 }
 assert.equal(refs,189);assert.deepEqual(manifest.rootHeaderNeeds,[]);assert.deepEqual([...legacyEdges].sort(),['progressive-paint-admissions.ts','progressive-paint.ts']);
 // Independent SHA-256 witnesses from the original reviewed source 2257c636c3993ddc860216dd0001e61d96080029.
 const digest=value=>createHash('sha256').update(value).digest('hex');
 const identities=manifest.modules.map(({file,refs})=>[file,refs]);
 assert.equal(digest(JSON.stringify(identities)),'f3614b8b7cfa0e844468e992a9e0d723a23b9619b3a98221f229de90b4eaeafa','original file/SHA/occurrence bindings');
 const planning='src/painted/root500/safety/owner-shape-patch-profiles.ts';assert.equal(digest(fs.readFileSync(path.join(web,planning))),'3436e901e60afcf933b75919e1dbb87927f10548c7edc50777e3ab6221e0f234');
});
