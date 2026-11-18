// TypeScript -> CommonJS evaluator for source-level fixtures that execute the
// production modules without bundling them. Each relative dependency resolves
// against its importer's directory (so render-runtime/ siblings resolve there),
// every module evaluates once per loader (an import cycle observes the partial
// exports exactly as CommonJS does), and an optional allowlist rejects any file
// the subject was not expected to reach. Globals can be shadowed per module so a
// fixture instruments only the module that owns the behaviour under test.
import fs from 'node:fs';
import path from 'node:path';

const transpiled=new Map();

function compile(ts,file){
 const text=fs.readFileSync(file,'utf8'),cached=transpiled.get(file);
 if(cached?.text===text)return cached;
 const result=ts.transpileModule(text,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 const diagnostics=(result.diagnostics??[]).map(row=>ts.flattenDiagnosticMessageText(row.messageText,'\n'));
 const value={text,output:result.outputText,diagnostics};transpiled.set(file,value);return value;
}

/** allow(file, importer) -> boolean; globals(file) -> {identifier: value}. */
export function createTsModuleLoader({typescript,allow,globals}={}){
 if(typeof typescript?.transpileModule!=='function')throw new TypeError('A TypeScript compiler module is required');
 const modules=new Map(),edges=[],diagnostics=[];
 function resolve(importer,specifier){
  if(typeof specifier!=='string'||!/^\.\.?\//.test(specifier))throw new Error(`Non-relative dependency ${specifier} from ${importer}`);
  const base=path.resolve(path.dirname(importer),specifier);
  for(const candidate of [base+'.ts',path.join(base,'index.ts')])if(fs.existsSync(candidate))return candidate;
  throw new Error(`Unresolved dependency ${specifier} from ${importer}`);
 }
 function load(file,importer){
  const absolute=path.resolve(file),existing=modules.get(absolute);
  if(existing)return existing.exports;
  if(allow&&!allow(absolute,importer))throw new Error(`Unexpected dependency ${absolute}${importer?' from '+importer:''}`);
  const compiled=compile(typescript,absolute);
  if(compiled.diagnostics.length){diagnostics.push({file:absolute,messages:compiled.diagnostics});throw new Error(`TypeScript transpile diagnostics in ${absolute}: ${compiled.diagnostics.join('; ')}`);}
  const module={exports:{}};modules.set(absolute,module);
  const injected=globals?.(absolute)??{},names=Object.keys(injected);
  const localRequire=specifier=>{const target=resolve(absolute,specifier);edges.push({from:absolute,specifier,to:target});return load(target,absolute);};
  new Function('exports','require','module',...names,compiled.output)(module.exports,localRequire,module,...names.map(name=>injected[name]));
  return module.exports;
 }
 return{
  load:file=>load(file,undefined),resolve,
  get edges(){return edges.map(edge=>({...edge}));},
  get files(){return[...modules.keys()];},
  get diagnostics(){return diagnostics.map(row=>({file:row.file,messages:[...row.messages]}));},
 };
}

/** Returns the statements of a TypeScript file with comments and blank lines removed. */
export function codeStatements(text){
 return text.replace(/\/\*[\s\S]*?\*\//g,'').split('\n').map(line=>line.replace(/^\s*\/\/.*$/,'').trim()).filter(Boolean);
}

/** The balanced {...} block that follows the first occurrence of marker.
 * String, template and comment contents never count as braces. */
export function balancedBlock(source,marker){
 const start=source.indexOf(marker);if(start<0)throw new Error('Missing source marker: '+marker);
 const open=source.indexOf('{',start+marker.length);if(open<0)throw new Error('No block after marker: '+marker);
 let depth=0;
 for(let i=open;i<source.length;i++){
  const c=source[i];
  if(c==='"'||c==="'"||c==='`'){for(i++;i<source.length&&source[i]!==c;i++)if(source[i]==='\\')i++;continue;}
  if(c==='/'&&source[i+1]==='/'){i=source.indexOf('\n',i);if(i<0)break;continue;}
  if(c==='/'&&source[i+1]==='*'){i=source.indexOf('*/',i+2)+1;if(i<=0)break;continue;}
  if(c==='{')depth++;else if(c==='}'&&--depth===0)return{start,open,end:i+1,body:source.slice(open+1,i)};
 }
 throw new Error('Unbalanced block after marker: '+marker);
}

/** Asserts that every fragment occurs in text, each one after the previous. */
export function orderedFragments(text,fragments){
 let at=0;const positions=[];
 for(const fragment of fragments){const index=text.indexOf(fragment,at);if(index<0)throw new Error(`Missing or out-of-order fragment: ${fragment}`);positions.push(index);at=index+fragment.length;}
 return positions;
}
