// White-box renderer fixtures for the provider renderers.
//
// One esbuild module graph carries the light production imports of a renderer
// together with the runtime modules used by the fixture itself, so classes
// such as ProgramPreparationPending and the context/resource registries keep
// one identity. The renderer factory is then evaluated declaration by
// declaration into an observable scope object: production closures read and
// write that scope, and a fixture overrides only the boundaries it isolates.
// Heavy material-data imports are never loaded; touching one fails loudly.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const web=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(path.join(web,'package.json'));
export const ts=require('typescript');
export const esbuild=require('esbuild');
const {nullCityDataProfilePlugin}=await import(pathToFileURL(path.join(web,'tests/city-profile-test-plugin.mjs')).href);

export const rendererFile=provider=>path.join(web,`src/painted/${provider}/safety/building-mesh-renderer.ts`);

/** Runtime modules exported as namespaces from every renderer graph. */
export const RUNTIME_MODULES=Object.freeze({
 preparation:'src/safety/render-runtime/program-preparation.ts',
 geometry:'src/safety/render-runtime/resident-geometry.ts',
 store:'src/safety/render-runtime/chunk-resource-store.ts',
 budget:'src/safety/render-runtime/resource-budget.ts',
 chunkInput:'src/safety/renderer-chunk-input.ts',
 lifecycle:'src/safety/resident-gpu-lifecycle.ts',
 scope:'src/safety/frozen-data-scope.ts',
 leases:'src/safety/frozen-data-lease-store.ts',
 capture:'src/safety/render-runtime/resident-capture.ts',
 reflection:'src/safety/resident-planar-reflection.ts',
 utf8:'src/safety/utf8-byte-length.ts',
 currentPaint:'src/painted/delegated500/safety/current-paint-program.ts',
});

export function scope(values){return new Proxy(values,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});}
/** Evaluate one JavaScript expression with the fixture object as its scope. */
export function evaluateJS(code,values){return Function('env','with(env){return ('+code+'\n)}')(scope(values));}
/** Run JavaScript statements with the fixture object as their scope. */
export function runJS(code,values){Function('env','with(env){'+code+'\n}')(scope(values));}
/** Evaluate one TypeScript expression (a function, arrow or literal) in scope. */
export function evaluateTS(code,values){const js=esbuild.transformSync('('+code+')',{loader:'ts',target:'es2022'}).code.trim().replace(/;$/,'');return evaluateJS(js,values);}

/** TypeScript text of a named function, method, property or variable initializer. */
export function sourceOf(text,name,{kind='any',occurrence=0}={}){
 const ast=ts.createSourceFile('source.ts',text,ts.ScriptTarget.Latest,true),found=[];
 (function visit(node){
  if((kind==='any'||kind==='function')&&ts.isFunctionDeclaration(node)&&node.name?.text===name)found.push(node.getText(ast).replace(/^export\s+/,''));
  else if((kind==='any'||kind==='variable')&&ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name&&node.initializer)found.push(node.initializer.getText(ast));
  else if((kind==='any'||kind==='method')&&ts.isMethodDeclaration(node)&&node.name.getText(ast)===name)found.push('function '+node.getText(ast));
  ts.forEachChild(node,visit);
 })(ast);
 if(found.length<=occurrence)throw Error('missing source binding '+name);return found[occurrence];
}

function bindingNames(name){const names=[];(function collect(node){if(ts.isIdentifier(node))names.push(node.text);else for(const element of node.elements)if(!ts.isOmittedExpression(element))collect(element.name);})(name);return names;}
const freeCache=new WeakMap();
/** Identifiers a node reads or writes that it does not declare itself. */
export function freeIdentifiers(node,ast){
 const cached=freeCache.get(node);if(cached)return cached;
 const declared=new Set(),free=new Set();
 (function declare(n){
  if(ts.isVariableDeclaration(n)||ts.isParameter(n)||ts.isBindingElement(n))for(const name of bindingNames(n.name))declared.add(name);
  if((ts.isFunctionDeclaration(n)||ts.isFunctionExpression(n)||ts.isClassDeclaration(n)||ts.isClassExpression(n))&&n.name)declared.add(n.name.text);
  if(ts.isCatchClause(n)&&n.variableDeclaration)for(const name of bindingNames(n.variableDeclaration.name))declared.add(name);
  ts.forEachChild(n,declare);
 })(node);
 (function use(n){
  if(ts.isIdentifier(n)){
   const p=n.parent,property=(ts.isPropertyAccessExpression(p)&&p.name===n)||(ts.isPropertyAssignment(p)&&p.name===n)||(ts.isMethodDeclaration(p)&&p.name===n)||(ts.isBindingElement(p)&&p.propertyName===n)||((ts.isGetAccessor(p)||ts.isSetAccessor(p))&&p.name===n)||ts.isLabeledStatement(p)||ts.isBreakOrContinueStatement(p)||ts.isPropertyDeclaration(p);
   if(!property&&!declared.has(n.text))free.add(n.text);
  }
  ts.forEachChild(n,use);
 })(node);
 freeCache.set(node,free);return free;
}

const deferred=node=>ts.isArrowFunction(node)||ts.isFunctionExpression(node)||ts.isFunctionDeclaration(node)||ts.isMethodDeclaration(node)||ts.isGetAccessor(node)||ts.isSetAccessor(node)||ts.isConstructorDeclaration(node);
/** Free identifiers a statement reads while it is executed, excluding nested
 * function bodies; `calls` are the identifiers it invokes. */
export function eagerIdentifiers(node,ast){
 const free=freeIdentifiers(node,ast),reads=new Set(),calls=new Set();
 (function visit(n){if(n!==node&&deferred(n))return;if(ts.isIdentifier(n)&&free.has(n.text)){reads.add(n.text);const p=n.parent;if((ts.isCallExpression(p)||ts.isNewExpression(p))&&p.expression===n)calls.add(n.text);}ts.forEachChild(n,visit);})(node);
 return{reads,calls};
}

// Transitive source bytes of a module specifier, from a static import scan.
// Material data modules (tens of megabytes) are never part of a fixture graph
// unless a fixture names one of their imports explicitly.
const sourceDeps=new Map();
function resolveSource(from,specifier){
 if(!specifier.startsWith('.'))return undefined;
 const base=path.resolve(path.dirname(from),specifier);
 for(const candidate of [base,base+'.ts',base+'.tsx',base+'.js',base+'.mjs',path.join(base,'index.ts')])if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile())return candidate;
 return undefined;
}
function dependenciesOf(file){
 if(!sourceDeps.has(file)){
  const text=fs.readFileSync(file,'utf8'),rows=[];
  if(!file.endsWith('.json'))for(const match of text.matchAll(/(?:^|[;\n}])\s*(import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g)){if(match[2])continue;const resolved=resolveSource(file,match[3]);if(resolved)rows.push(resolved);}
  sourceDeps.set(file,{bytes:Buffer.byteLength(text),rows});
 }
 return sourceDeps.get(file);
}
const closureCache=new Map();
export function specifierBytes(fromFile,specifier){
 const start=resolveSource(fromFile,specifier);if(!start)return 0;
 if(closureCache.has(start))return closureCache.get(start);
 const seen=new Set([start]),stack=[start];let bytes=0;
 while(stack.length){const file=stack.pop(),row=dependenciesOf(file);bytes+=row.bytes;for(const next of row.rows)if(!seen.has(next)){seen.add(next);stack.push(next);}}
 closureCache.set(start,bytes);return bytes;
}
export const HEAVY_IMPORT_BYTES=2_500_000;

/** Value imports of a TypeScript module: local name, imported name, specifier. */
export function valueImports(text){
 const ast=ts.createSourceFile('imports.ts',text,ts.ScriptTarget.Latest,true),rows=[];
 for(const statement of ast.statements){
  if(!ts.isImportDeclaration(statement)||!statement.importClause||statement.importClause.isTypeOnly)continue;
  const specifier=statement.moduleSpecifier.text,clause=statement.importClause;
  if(clause.name)rows.push({local:clause.name.text,imported:'default',specifier});
  const named=clause.namedBindings;
  if(named&&ts.isNamedImports(named))for(const element of named.elements)if(!element.isTypeOnly)rows.push({local:element.name.text,imported:(element.propertyName??element.name).text,specifier});
  if(named&&ts.isNamespaceImport(named))rows.push({local:named.name.text,imported:'*',specifier});
 }
 return rows;
}

const graphs=new Map();
/** Import selected renderer imports plus the runtime namespaces in one graph. */
export async function rendererGraph(provider,names,extra=[]){
 const file=rendererFile(provider),text=fs.readFileSync(file,'utf8'),wanted=new Set(names),lines=[];
 for(const [alias,relative]of Object.entries(RUNTIME_MODULES))lines.push(`export * as __runtime_${alias} from ${JSON.stringify(path.join(web,relative))};`);
 for(const row of extra)lines.push(row);
 const loaded=[];
 for(const row of valueImports(text)){
  if(!wanted.has(row.local))continue;loaded.push(row.local);
  if(row.imported==='*')lines.push(`export * as ${row.local} from ${JSON.stringify(row.specifier)};`);
  else lines.push(`export {${row.imported==='default'?'default':row.imported} as ${row.local}} from ${JSON.stringify(row.specifier)};`);
 }
 const key=provider+'\n'+lines.join('\n');
 if(!graphs.has(key))graphs.set(key,(async()=>{
  // Some production modules read page parameters while they are imported. The
  // graph sees a module-local default page, never the test runner's globals.
  const banner='const location={hostname:"localhost",search:"",href:"http://localhost/"},document={addEventListener(){},removeEventListener(){},visibilityState:"visible",hidden:false},window={};';
  const output=await esbuild.build({stdin:{contents:lines.join('\n'),resolveDir:path.dirname(file),sourcefile:provider+'-fixture-graph.ts',loader:'ts'},banner:{js:banner},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent',plugins:[nullCityDataProfilePlugin]});
  const module=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text+'\n//# sourceURL='+provider+'-fixture-graph.mjs').toString('base64'));
  const runtime={};for(const alias of Object.keys(RUNTIME_MODULES))runtime[alias]=module['__runtime_'+alias];
  const values={};for(const name of loaded)values[name]=module[name];
  return{module,runtime,values,loaded};
 })());
 return graphs.get(key);
}

/** A stand-in for an import or declaration a fixture deliberately does not load. */
export function isolated(name,reason='not loaded by this fixture'){
 const fail=()=>{throw Error('fixture isolated '+name+': '+reason);};
 return new Proxy(function isolatedBinding(){},{apply:fail,construct:fail,get(_target,key){if(key===Symbol.toPrimitive)return()=>'[isolated '+name+']';if(key==='then')return undefined;if(key==='__isolated')return name;return fail();},has:()=>false});
}

const transformed=new Map();
function rendererJS(provider){
 if(!transformed.has(provider)){
  const text=fs.readFileSync(rendererFile(provider),'utf8'),js=esbuild.transformSync(text,{loader:'ts',format:'esm',target:'es2022'}).code,ast=ts.createSourceFile(provider+'.js',js,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  transformed.set(provider,{text,js,ast});
 }
 return transformed.get(provider);
}
const strip=text=>text.replace(/^export\s+(?:default\s+)?/,'');

/**
 * Evaluate the module and factory declarations of a provider renderer into one
 * observable scope. `params` are the factory arguments. `imports` names extra
 * production imports to load (names used by flattening are loaded already);
 * every other import is an explicit isolated stand-in. `rewrite[name]` edits
 * the JavaScript text of one factory function before evaluation.
 */
export async function flattenRenderer(provider,{params=[],env={},imports=[],extra=[],rewrite={},skip=()=>false,factory='createBuildingMeshRenderer'}={}){
 const {text,js,ast}=rendererJS(provider),factoryNode=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===factory);
 if(!factoryNode)throw Error('missing renderer factory '+factory);
 const importRows=valueImports(text),importNames=new Set(importRows.map(row=>row.local)),eager=new Set();
 // 'light' loads every import whose module graph carries no material data.
 const requested=new Set(imports==='light'?importRows.filter(row=>specifierBytes(rendererFile(provider),row.specifier)<=HEAVY_IMPORT_BYTES).map(row=>row.local):imports);
 const moduleStatements=ast.statements.filter(node=>!ts.isImportDeclaration(node)&&!ts.isExportDeclaration(node)&&node!==factoryNode),body=factoryNode.body.statements;
 // Initializers and statements execute while flattening, including the local
 // functions they call; their light imports are real production modules.
 const local=new Map();
 for(const node of [...moduleStatements,...body]){
  if(ts.isFunctionDeclaration(node)&&node.name)local.set(node.name.text,node);
  else if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations)if(ts.isIdentifier(declaration.name)&&declaration.initializer&&(ts.isArrowFunction(declaration.initializer)||ts.isFunctionExpression(declaration.initializer)))local.set(declaration.name.text,declaration.initializer);
 }
 const called=new Set(),pending=[];
 const visit=node=>{const use=eagerIdentifiers(node,ast);for(const name of use.reads)if(importNames.has(name))eager.add(name);for(const name of use.calls)if(local.has(name)&&!called.has(name)){called.add(name);pending.push(local.get(name));}};
 for(const statement of [...moduleStatements,...body])if(!ts.isFunctionDeclaration(statement))visit(statement);
 while(pending.length)visit(pending.pop());
 const rowsByLocal=new Map(importRows.map(row=>[row.local,row])),file=rendererFile(provider),heavy=new Set();
 for(const name of eager)if(!requested.has(name)&&specifierBytes(file,rowsByLocal.get(name).specifier)>HEAVY_IMPORT_BYTES){eager.delete(name);heavy.add(name);}
 const graph=await rendererGraph(provider,[...eager,...requested],extra),values=env,failures=[];
 for(const row of importRows)if(!(row.local in values))values[row.local]=row.local in graph.values?graph.values[row.local]:isolated(row.local,'import from '+row.specifier+(heavy.has(row.local)?' carries material data and':'')+' is outside this fixture');
 const define=(name,work)=>{try{values[name]=work();}catch(error){failures.push({name,error});values[name]=isolated(name,'initializer failed: '+String(error?.message??error).slice(0,200));}};
 const declare=(statement)=>{
  for(const declaration of statement.declarationList.declarations){
   const names=bindingNames(declaration.name),init=declaration.initializer?declaration.initializer.getText(ast):'undefined';
   if(ts.isIdentifier(declaration.name)){if(declaration.initializer||!(names[0] in values))define(names[0],()=>evaluateJS(init,values));continue;}
   try{Object.assign(values,evaluateJS('(()=>{const '+declaration.name.getText(ast)+'=('+init+');return{'+names.join(',')+'};})()',values));}catch(error){for(const name of names){failures.push({name,error});values[name]=isolated(name,'initializer failed');}}
  }
 };
 const functionText=node=>{const name=node.name.text,raw=strip(node.getText(ast));return rewrite[name]?rewrite[name](raw):raw;};
 const run=nodes=>{
  for(const node of nodes)if(ts.isFunctionDeclaration(node)&&node.name)define(node.name.text,()=>evaluateJS(functionText(node),values));
  for(const node of nodes){
   if(ts.isFunctionDeclaration(node))continue;
   if(ts.isVariableStatement(node)){declare(node);continue;}
   if(ts.isClassDeclaration(node)&&node.name){define(node.name.text,()=>evaluateJS(strip(node.getText(ast)),values));continue;}
   if(ts.isReturnStatement(node)){define('__api',()=>node.expression?evaluateJS(node.expression.getText(ast),values):undefined);continue;}
   const statement=node.getText(ast);if(skip(statement))continue;
   try{runJS(statement,values);}catch(error){failures.push({name:'statement:'+statement.slice(0,80),error});}
  }
 };
 run(moduleStatements);
 const parameterText=factoryNode.parameters.map(parameter=>parameter.getText(ast)).join(','),parameterNames=factoryNode.parameters.flatMap(parameter=>bindingNames(parameter.name));
 Object.assign(values,Function('return function bindRendererParameters('+parameterText+'){return{'+parameterNames.join(',')+'};}')()(...params));
 run(body);
 return{values,api:values.__api,failures,text,js,graph,runtime:graph.runtime,parameterNames};
}

/** Browser globals the renderer factories read while they are constructed. */
export function browserGlobals(){
 const listeners=new Map();
 return{
  location:{hostname:'localhost',search:'',href:'http://localhost/'},
  document:{addEventListener(type,listener){listeners.set(type,[...(listeners.get(type)??[]),listener]);},removeEventListener(type,listener){listeners.set(type,(listeners.get(type)??[]).filter(row=>row!==listener));},createElement:()=>({getContext:()=>null,style:{}}),visibilityState:'visible',hidden:false},
  window:{},
  listeners,
 };
}

/** A map surface stand-in that records repaint requests and listeners. */
export function fixtureMap(){
 const events=new Map(),map={repaints:0,triggerRepaint(){map.repaints++;},on(type,listener){events.set(type,[...(events.get(type)??[]),listener]);},off(type,listener){events.set(type,(events.get(type)??[]).filter(row=>row!==listener));},getCanvas:()=>({clientWidth:512,clientHeight:512,width:512,height:512}),events};
 return map;
}

/** Collect setTimeout turns used by the shared scheduler and drain them explicitly. */
export function preparationTurns(){
 const queue=[];
 const turn=work=>{const previous=globalThis.setTimeout;globalThis.setTimeout=fn=>(queue.push(fn),queue.length);try{return work();}finally{globalThis.setTimeout=previous;}};
 const drain=({one=false,limit=2000}={})=>turn(()=>{let steps=0;while(queue.length){if(++steps>limit)throw Error('unbounded fixture preparation');queue.shift()();if(one)break;}return steps;});
 return{queue,turn,drain};
}

/**
 * Re-export the value imports of one production module into a renderer graph
 * under a prefix, except names a fixture supplies itself. The module body can
 * then be evaluated with the graph's (single-identity) values plus overrides.
 */
export function moduleImportExtras(relative,prefix,supplied=[]){
 const file=path.join(web,relative),text=fs.readFileSync(file,'utf8'),skip=new Set(supplied),lines=[],names=[];
 for(const row of valueImports(text)){if(skip.has(row.local))continue;const target=row.specifier.startsWith('.')?path.resolve(path.dirname(file),row.specifier):row.specifier;names.push(row.local);lines.push(row.imported==='*'?`export * as ${prefix}${row.local} from ${JSON.stringify(target)};`:`export {${row.imported==='default'?'default':row.imported} as ${prefix}${row.local}} from ${JSON.stringify(target)};`);}
 return{lines,names,prefix,relative};
}
/** Evaluate a module's non-import statements; returns the named bindings. */
export function evaluateModuleBody(extras,module,overrides,names){
 const text=fs.readFileSync(path.join(web,extras.relative),'utf8'),ast=ts.createSourceFile(extras.relative,text,ts.ScriptTarget.Latest,true);
 const body=ast.statements.filter(node=>!ts.isImportDeclaration(node)&&!ts.isTypeAliasDeclaration(node)&&!ts.isInterfaceDeclaration(node)).map(node=>node.getText(ast).replace(/^export\s+/,''));
 const env={};for(const name of extras.names)env[name]=module[extras.prefix+name];Object.assign(env,overrides);
 return evaluateTS('(()=>{'+body.join('\n')+';return{'+names.join(',')+'};})()',env);
}
