// Production TypeScript modules for source-level fixtures, evaluated as
// CommonJS with their real relative dependency graph instead of a hand-written
// per-module require map that silently goes stale when a module gains an import.
// One loader evaluates each file once (an import cycle observes partial exports
// exactly as CommonJS does), so classes such as ResourceBudgetExceededError and
// page singletons keep one identity for every importer in the fixture. A test
// double is never implicit: `overrides` names the src-relative module id
// (without .ts) it replaces, and `allow(id, importerId)` rejects any production
// file the fixture did not expect to reach (model data, renderers, browsers).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

export const webSource=fileURLToPath(new URL('../../src/',import.meta.url));
const transpiled=new Map();

function compile(file){
 const text=fs.readFileSync(file,'utf8'),cached=transpiled.get(file);
 if(cached?.text===text)return cached.code;
 // Hoist import declarations as ESM does, so an import written after other
 // top-level statements is still bound before those statements run.
 const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),imports=sf.statements.filter(ts.isImportDeclaration),rest=sf.statements.filter(node=>!ts.isImportDeclaration(node));
 const code=ts.transpileModule([...imports,...rest].map(node=>node.getText(sf)).join('\n'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 transpiled.set(file,{text,code});return code;
}

export function sourceModuleId(file){return path.relative(webSource,file).split(path.sep).join('/').replace(/\.ts$/,'');}
const fileOf=id=>path.join(webSource,id.replace(/\.ts$/,'')+'.ts');

export function createSourceModules({overrides={},allow}={}){
 const modules=new Map(),edges=[];
 function resolve(importer,specifier){
  if(typeof specifier!=='string'||!/^\.\.?\//.test(specifier))throw Error(`Non-relative production dependency ${specifier} from ${sourceModuleId(importer)}`);
  const base=path.resolve(path.dirname(importer),specifier);
  for(const candidate of [base+'.ts',path.join(base,'index.ts')])if(fs.existsSync(candidate))return candidate;
  throw Error(`Unresolved production dependency ${specifier} from ${sourceModuleId(importer)}`);
 }
 function load(file,importer){
  const id=sourceModuleId(file);
  if(Object.hasOwn(overrides,id))return overrides[id];
  const existing=modules.get(file);if(existing)return existing.exports;
  if(allow&&!allow(id,importer&&sourceModuleId(importer)))throw Error(`Unexpected production dependency ${id}${importer?' from '+sourceModuleId(importer):''}`);
  const module={exports:{}};modules.set(file,module);
  const local=specifier=>{const target=resolve(file,specifier);edges.push([id,sourceModuleId(target)]);return load(target,file);};
  new Function('require','module','exports',compile(file))(local,module,module.exports);
  return module.exports;
 }
 return{
  load:id=>load(fileOf(id),undefined),
  /** A require for text evaluated outside the loader (an extracted function or
   * a module evaluated with its own double map) whose imports resolve from id. */
  requireFrom:id=>{const importer=fileOf(id);return specifier=>load(resolve(importer,specifier),importer);},
  get files(){return[...modules.keys()].map(sourceModuleId);},
  get edges(){return edges.map(edge=>[...edge]);},
 };
}
