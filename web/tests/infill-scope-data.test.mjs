import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import ts from 'typescript';

const web=fileURLToPath(new URL('../',import.meta.url));
const directory=path.join(web,'src/painted/infill/safety');
const registryFile=path.join(directory,'infill-scoped-functions.ts');
const rendererFile=path.join(directory,'building-mesh-renderer.ts');

async function coldImport(entryFile,t){
 const ast=ts.createSourceFile(registryFile,fs.readFileSync(registryFile,'utf8'),ts.ScriptTarget.Latest,true);
 const roots=ast.statements.filter(node=>ts.isImportDeclaration(node)&&node.importClause?.namedBindings&&ts.isNamespaceImport(node.importClause.namedBindings)).map(node=>path.resolve(directory,node.moduleSpecifier.text+'.ts'));
 assert(roots.length>0,'retain every actual registry namespace without freezing an obsolete module count');
 const probeKey=Symbol.for('crimemaps.infill-scope-data.cold-import'),probe={modelReads:[],modelDecodes:[],metadataQueries:0},assetRequests=[],modelParses=[];
 const built=await build({absWorkingDir:web,entryPoints:[entryFile],bundle:true,write:false,treeShaking:false,metafile:true,format:'esm',platform:'node',target:'es2022',logLevel:'silent',plugins:[{
  name:'infill-cold-model-boundary',setup(builder){
   builder.onResolve({filter:/frozen-paint-tables(?:\.[cm]?[jt]s)?$/},()=>({path:'metadata-only',namespace:'infill-cold-tables'}));
   builder.onLoad({filter:/.*/,namespace:'infill-cold-tables'},()=>({loader:'js',contents:`
    const probe=globalThis[Symbol.for('crimemaps.infill-scope-data.cold-import')];
    function forbidden(method,args){probe.modelReads.push({method,args});throw Error('Cold Infill import requested model data: '+method);}
    export function readFrozenTable(...args){return forbidden('readFrozenTable',args);}
    export function readFrozenTableAsync(...args){return forbidden('readFrozenTableAsync',args);}
    export function frozenPaintTableRowCounts(){probe.metadataQueries++;return undefined;}
   `}));
   builder.onResolve({filter:/(?:^|\/)building-mesh-codec(?:\.[cm]?[jt]s)?$/},()=>({path:'model-codec',namespace:'infill-cold-codec'}));
   builder.onLoad({filter:/.*/,namespace:'infill-cold-codec'},()=>({loader:'js',contents:`
    const probe=globalThis[Symbol.for('crimemaps.infill-scope-data.cold-import')];
    function forbidden(method,args){const city=typeof args[1]==='string'?args[1]:null;probe.modelDecodes.push({method,city});throw Error('Cold Infill import decoded model data: '+method+'('+city+')');}
    export function decodeBuildingShard(...args){return forbidden('decodeBuildingShard',args);}
    export function decodePackedBuildingShard(...args){return forbidden('decodePackedBuildingShard',args);}
    export function normalizeBuildingShard(...args){return forbidden('normalizeBuildingShard',args);}
   `}));
  },
 }]});
 const inputs=new Set(Object.keys(built.metafile.inputs).map(input=>path.resolve(web,input)));
 assert(inputs.has(entryFile));if(entryFile===registryFile)for(const file of roots)assert(inputs.has(file),'actual registry dependency: '+file);
 const actualInfillModules=[...inputs].filter(file=>file.startsWith(directory+path.sep));
 assert(actualInfillModules.length>roots.length,'retain the real transitive graph, including the registry and its namespace modules');
 const previousProbe=Object.getOwnPropertyDescriptor(globalThis,probeKey),previousFetch=Object.getOwnPropertyDescriptor(globalThis,'fetch'),parse=JSON.parse;
 let metadataParses=0;
 Object.defineProperty(globalThis,probeKey,{configurable:true,value:probe});
 Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value(input){assetRequests.push(String(input));throw Error('Cold Infill import attempted asset I/O');}});
 JSON.parse=function(value,...args){
  // Small identity/descriptor JSON remains valid. Mesh arrays or shader bodies
  // are model payloads and must remain behind their explicit resource scope.
  const mesh=typeof value==='string'&&/"positions"\s*:\s*\[/.test(value)&&/"indices"\s*:\s*\[/.test(value);
  const shader=typeof value==='string'&&/\b(?:void|vec[234]|mat[234])\s+\w+\s*\(/.test(value);
  if(mesh||shader){modelParses.push({kind:mesh?'mesh':'shader',characters:value.length});throw Error('Cold Infill import decoded inline model JSON');}
  metadataParses++;return Reflect.apply(parse,this,[value,...args]);
 };
 try{
  const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=infill-scope-data-'+path.basename(entryFile)+'.mjs').toString('base64'));
  await new Promise(resolve=>setImmediate(resolve));
  if(entryFile===registryFile){
   assert.equal(api.infillScopedDataModules.length,roots.length);assert(api.infillScopedFunctionArities instanceof Map);assert(api.infillScopedFunctionArities.size>0);
   for(const[fn,arity]of api.infillScopedFunctionArities){assert.equal(typeof fn,'function');assert(Number.isInteger(arity)&&arity>=0);}
  }else assert.equal(typeof api.createBuildingMeshRenderer,'function','import the actual renderer entry without calling its constructor');
  assert.deepEqual(probe.modelReads,[]);assert.deepEqual(probe.modelDecodes,[]);assert.deepEqual(modelParses,[]);assert.deepEqual(assetRequests,[]);
  t.diagnostic(JSON.stringify({entry:path.basename(entryFile),directNamespaces:entryFile===registryFile?roots.length:null,actualInfillModules:actualInfillModules.length,registeredFunctions:api.infillScopedFunctionArities?.size??null,modelReads:0,modelDecodes:0,modelParses:0,metadataQueries:probe.metadataQueries,metadataParses}));
 }finally{
  JSON.parse=parse;
  if(previousFetch)Object.defineProperty(globalThis,'fetch',previousFetch);else delete globalThis.fetch;
  if(previousProbe)Object.defineProperty(globalThis,probeKey,previousProbe);else delete globalThis[probeKey];
 }
}
test('actual Infill scoped registry cold-imports its real transitive modules without model reads or decoding',t=>coldImport(registryFile,t));
test('actual Infill renderer entry cold-imports direct and transitive code without model reads or decoding',t=>coldImport(rendererFile,t));
