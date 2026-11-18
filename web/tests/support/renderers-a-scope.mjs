// White-box scope for single production functions of the lineage-A renderers
// and the Bremen owner aggregate (renderers-a, third stage). A function is taken
// verbatim from the production TypeScript (AST by name), type-stripped and
// evaluated with a fixture object as its scope. Names the fixture supplies are
// read and written there; JavaScript globals stay globals; any other name is a
// named inert stub (calls return undefined, property reads return the stub), so
// a case states exactly the boundaries it observes and records the rest.
// RENDERERS_A_SOURCE_ROOT=<dir> reads <dir>/<provider>/safety/<file> instead,
// for A/B runs against saved pre-change copies. No app build, browser or GPU.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

export const web=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(path.join(web,'package.json'));
const ts=require('typescript'),esbuild=require('esbuild');

export function sourceFile(provider,file='building-mesh-renderer.ts'){
 const root=process.env.RENDERERS_A_SOURCE_ROOT,override=root&&path.join(root,provider,'safety',file);
 return override&&fs.existsSync(override)?override:path.join(web,`src/painted/${provider}/safety/${file}`);
}
const asts=new Map();
function parsed(file){if(!asts.has(file)){const text=fs.readFileSync(file,'utf8');asts.set(file,{text,ast:ts.createSourceFile(path.basename(file),text,ts.ScriptTarget.Latest,true)});}return asts.get(file);}
/** Production text of a named function declaration (also generators) or
 * object-literal method, as a function expression. */
export function functionText(file,name,kind='function'){
 const {ast}=parsed(file),found=[];
 (function visit(node){
  if(kind==='function'&&ts.isFunctionDeclaration(node)&&node.name?.text===name)found.push(node.getText(ast).replace(/^export\s+/,''));
  else if(kind==='method'&&ts.isMethodDeclaration(node)&&node.name.getText(ast)===name){const text=node.getText(ast);found.push(text.startsWith('async ')?'async function '+text.slice(6):'function '+text);}
  ts.forEachChild(node,visit);
 })(ast);
 if(found.length!==1)throw Error(`${path.basename(file)}: expected one production ${kind} ${name}, found ${found.length}`);
 return found[0];
}
/** Production initializer of a variable declaration. */
export function variableText(file,name){
 const {ast}=parsed(file);let found;
 (function visit(node){if(!found&&ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name&&node.initializer)found=node.initializer.getText(ast);ts.forEachChild(node,visit);})(ast);
 if(found===undefined)throw Error(`${path.basename(file)}: missing production variable ${name}`);
 return found;
}
/** Named inert stub: calling it returns undefined, reading a property returns the stub. */
export function inert(name,record){
 const target=function(){};
 const stub=new Proxy(target,{get:(_t,key)=>key===Symbol.toPrimitive?()=>'[inert '+name+']':key==='inertName'?name:key==='then'?undefined:stub,apply:(_t,_this,args)=>{record?.(name,args);return undefined;},set:()=>true});
 return stub;
}
function fixtureScope(values,record){
 const stubs=new Map();
 return new Proxy(values,{has:()=>true,get(target,key){
  if(key===Symbol.unscopables)return undefined;if(key in target)return target[key];if(typeof key!=='string'||key in globalThis)return globalThis[key];
  if(!stubs.has(key))stubs.set(key,inert(key,record));return stubs.get(key);
 },set:(target,key,value)=>(target[key]=value,true)});
}
/** Evaluate production code (a function expression or initializer) in a fixture scope. */
export function evaluate(code,values,record){const js=esbuild.transformSync('('+code+')',{loader:'ts',target:'es2022'}).code.trim().replace(/;$/,'');return Function('env','with(env){return ('+js+'\n)}')(fixtureScope(values,record));}
/** Install named production functions (and variables) into one fixture scope. */
export function install(file,values,{functions=[],methods=[],variables=[]}={},record){
 for(const name of variables)values[name]=evaluate(variableText(file,name),values,record);
 for(const name of functions)values[name]=evaluate(functionText(file,name),values,record);
 for(const name of methods)values[name]=evaluate(functionText(file,name,'method'),values,record);
 return values;
}
