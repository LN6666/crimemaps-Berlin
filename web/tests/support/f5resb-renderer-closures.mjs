// Chunk-residency closure binding for the renderer white-box suites
// (delegated500-resident-geometry, family-renderer-preparation,
// tier-church-resident-geometry).
//
// Those suites extract named renderer closures from the current source and
// evaluate them against one fixture state object. After the chunk-residency
// migration the extracted closures reach many more renderer helpers
// (sceneIndexCount, sceneShadowIndexCount, mainMaskChunks, releasePackedChunks,
// writeChunkSelection, ...) and closure state (sceneChunks, sceneSpans,
// preparedChunkConstructions, packingChunkInput, ...). Instead of a growing,
// hand-maintained extraction list, this module binds exactly the renderer's own
// declarations on first use:
//
// - closure-level and module-level function declarations and const arrow /
//   function expressions (the same rule as the shared reflection fixture);
// - closure-level `let`/`const` state whose declared initial value is a plain
//   literal or an empty collection (never a constructed owner);
// - optionally, the renderer's own non-type named imports, resolved through the
//   caller's production module loader (one module graph with the fixture's
//   chunk store / ledger), only when a closure actually reaches them.
//
// Fixture state, stubs and explicitly extracted closures already present on
// `values` keep precedence; `reset` names state fields whose fixture value is a
// placeholder `undefined` (for example capturePackedState fields) and that must
// start from the renderer's own declared literal instead. Nothing here
// substitutes a renderer function.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {nullCityDataProfilePlugin} from '../city-profile-test-plugin.mjs';

const web=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(web+'package.json'),ts=require('typescript');

export const scopeProxy=values=>new Proxy(values,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
const transpiled=new Map();
/** Evaluate one TypeScript expression/declaration text with `values` as its scope. */
export function evaluateIn(source,values){
 let js=transpiled.get(source);
 if(js===undefined){js=ts.transpileModule('('+source+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'');transpiled.set(source,js);}
 return Function('env','with(env){return '+js+'}')(scopeProxy(values));
}

const parsedTexts=new Map();
function parse(text){let ast=parsedTexts.get(text);if(!ast){ast=ts.createSourceFile('renderer.ts',text,ts.ScriptTarget.Latest,true);parsedTexts.set(text,ast);while(parsedTexts.size>3)parsedTexts.delete(parsedTexts.keys().next().value);}return ast;}

/** The renderer factory block: the block that declares `anchor` (default setBatches). */
export function rendererBlock(text,anchor='setBatches'){
 const ast=parse(text);let block;
 (function find(n){if(block)return;if(ts.isFunctionDeclaration(n)&&n.name?.text===anchor&&ts.isBlock(n.parent)&&n.parent.parent&&ts.isFunctionLike(n.parent.parent))block=n.parent;else ts.forEachChild(n,find);})(ast);
 assert(block,'renderer closure declaring '+anchor);
 return{ast,block};
}

const literal=node=>!node||ts.isLiteralExpression(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isPrefixUnaryExpression(node)&&ts.isNumericLiteral(node.operand)||[ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword,ts.SyntaxKind.NullKeyword].includes(node.kind)||ts.isIdentifier(node)&&node.text==='undefined'||ts.isArrayLiteralExpression(node)&&!node.elements.length||ts.isObjectLiteralExpression(node)&&!node.properties.length||ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&['Map','Set','WeakMap','WeakSet'].includes(node.expression.text)&&!node.arguments?.length||(ts.isAsExpression(node)||ts.isParenthesizedExpression(node))&&literal(node.expression);

function lazy(values,name,produce,bound){
 const define=value=>Object.defineProperty(values,name,{configurable:true,enumerable:true,writable:true,value});
 Object.defineProperty(values,name,{configurable:true,enumerable:false,get(){const value=produce();define(value);bound.push(name);return value;},set:define});
}

/**
 * Binds the renderer's own closures/state lazily on `values`.
 * @param {string} text renderer source
 * @param {object} values fixture state
 * @param {{anchor?:string,reset?:Iterable<string>|'undefined',requireFrom?:(specifier:string)=>object,imports?:boolean,wrappers?:string[],exclude?:string[],construct?:string[]}} options
 * `reset:'undefined'` resets every such placeholder field the fixture left `undefined`.
 * `exclude` names bindings a later fixture step installs itself (left unbound here).
 * `construct` names closure-level state whose own constructing initializer (a production gate, cache or
 * owner) the suite explicitly opts into; it is evaluated lazily against the fixture state like the rest.
 * @returns {{bound:string[],declared:Set<string>}}
 */
export function installRendererClosures(text,values,{anchor='setBatches',reset=[],requireFrom,imports=!!requireFrom,wrappers=[],exclude=[],construct=[]}={}){
 const constructed=new Set(construct);
 const excluded=new Set(exclude);
 const {ast,block}=rendererBlock(text,anchor),declarations=new Map(),state=new Map(),bound=[];
 const collect=statements=>{for(const node of statements){
  if(ts.isFunctionDeclaration(node)&&node.name&&node.body)declarations.set(node.name.text,node.getText(ast).replace(/^export\s+/,''));
  else if(ts.isVariableStatement(node)&&node.declarationList.flags&ts.NodeFlags.Const)for(const declaration of node.declarationList.declarations)if(ts.isIdentifier(declaration.name)&&declaration.initializer&&(ts.isArrowFunction(declaration.initializer)||ts.isFunctionExpression(declaration.initializer)))declarations.set(declaration.name.text,declaration.initializer.getText(ast));
 }};
 // Closure level first (it shadows module level), then module level.
 collect(block.statements);
 const closureNames=new Set(declarations.keys());
 for(const node of ast.statements){if(ts.isFunctionDeclaration(node)&&node.name&&node.body&&!closureNames.has(node.name.text))declarations.set(node.name.text,node.getText(ast).replace(/^export\s+/,''));else if(ts.isVariableStatement(node)&&node.declarationList.flags&ts.NodeFlags.Const)for(const declaration of node.declarationList.declarations)if(ts.isIdentifier(declaration.name)&&!closureNames.has(declaration.name.text)&&declaration.initializer&&(ts.isArrowFunction(declaration.initializer)||ts.isFunctionExpression(declaration.initializer)))declarations.set(declaration.name.text,declaration.initializer.getText(ast));}
 // Closure-level const wrappers named by the suite (for example delegated500's scopedValue(importedX)) are
 // aliases of a production import through the renderer's own wrapper function.
 const wrapped=node=>!!node&&ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&wrappers.includes(node.expression.text)&&node.arguments.length===1&&(ts.isIdentifier(node.arguments[0])||ts.isExpressionWithTypeArguments(node.arguments[0])&&ts.isIdentifier(node.arguments[0].expression));
 for(const node of block.statements)if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations)if(ts.isIdentifier(declaration.name)&&(literal(declaration.initializer)||constructed.has(declaration.name.text)&&declaration.initializer||node.declarationList.flags&ts.NodeFlags.Const&&wrapped(declaration.initializer)))state.set(declaration.name.text,declaration.initializer?declaration.initializer.getText(ast):'undefined');
 // Module level: literal state and plain import aliases (const local=importedName); a constructed value only
 // when the suite names it in `construct`.
 const alias=node=>!!node&&(ts.isIdentifier(node)&&node.text!=='undefined'||ts.isPropertyAccessExpression(node)&&alias(node.expression));
 // A pure module constant (literals, arrays/objects of them, arithmetic, aliases, Object.freeze of those):
 // no other call, construction or function.
 const pure=node=>{let ok=true;(function visit(n){if(!ok)return;if(ts.isCallExpression(n)&&n.expression.getText()==='Object.freeze'){n.arguments.forEach(visit);return;}if(ts.isCallExpression(n)||ts.isNewExpression(n)||ts.isTaggedTemplateExpression(n)||ts.isFunctionLike(n)||ts.isClassLike(n)){ok=false;return;}ts.forEachChild(n,visit);})(node);return ok;};
 for(const node of ast.statements)if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations){if(!ts.isIdentifier(declaration.name))continue;const name=declaration.name.text;if(declarations.has(name)||state.has(name))continue;if(literal(declaration.initializer)||constructed.has(name)&&declaration.initializer||node.declarationList.flags&ts.NodeFlags.Const&&(alias(declaration.initializer)||pure(declaration.initializer)))state.set(name,declaration.initializer?declaration.initializer.getText(ast):'undefined');}
 const resetNames=new Set(reset==='undefined'?[...state.keys()].filter(name=>Object.hasOwn(values,name)&&values[name]===undefined):reset);
 for(const name of resetNames){assert(state.has(name),'reset field has no literal renderer initializer: '+name);if(values[name]===undefined)delete values[name];}
 for(const [name,source]of declarations)if(!(name in values)&&!excluded.has(name))lazy(values,name,()=>evaluateIn(source,values),bound);
 for(const [name,source]of state)if(!(name in values)&&!excluded.has(name))lazy(values,name,()=>evaluateIn(source,values),bound);
 if(imports&&requireFrom){
  for(const node of ast.statements){
   if(!ts.isImportDeclaration(node)||node.importClause?.isTypeOnly)continue;const bindings=node.importClause?.namedBindings,specifier=node.moduleSpecifier.text;
   if(bindings&&ts.isNamedImports(bindings))for(const element of bindings.elements){if(element.isTypeOnly)continue;const local=element.name.text,exported=(element.propertyName??element.name).text;if(local in values||declarations.has(local)||excluded.has(local))continue;lazy(values,local,()=>{const value=requireFrom(specifier)[exported];assert(value!==undefined,'renderer import '+local+' from '+specifier);return value;},bound);}
   else if(bindings&&ts.isNamespaceImport(bindings)){const local=bindings.name.text;if(!(local in values))lazy(values,local,()=>requireFrom(specifier),bound);}
  }
 }
 return{bound,declared:new Set([...declarations.keys(),...state.keys()])};
}

/**
 * One esbuild bundle (one module state, JSON assets as esbuild loads them) of the
 * renderer's own non-type import modules plus the fixture's runtime modules.
 * `load(relative)` returns a module namespace by web-relative path;
 * `requireFrom(specifier)` resolves the renderer's own import specifier.
 * @param {string|string[]} renderers web-relative renderer path(s); several renderers share one graph
 * @param {string[]} runtimeModules web-relative module paths the fixture loads itself
 * `requireFor(renderer)` resolves another bundled renderer's own import specifiers.
 */
export async function bundleRendererModules(renderers,runtimeModules=[]){
 const rendererList=Array.isArray(renderers)?renderers:[renderers],rendererRelative=rendererList[0];
 const path=await import('node:path'),fs=await import('node:fs'),{build}=require('esbuild');
 const resolveTs=file=>{for(const candidate of [file+'.ts',path.join(file,'index.ts'),file])if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile())return candidate;throw Error('unresolved '+file);};
 const files=new Map(),specifiersByRenderer=new Map();
 for(const renderer of rendererList){const rendererFile=path.join(web,renderer),ast=ts.createSourceFile(rendererFile,fs.readFileSync(rendererFile,'utf8'),ts.ScriptTarget.Latest,true),specifiers=new Map();specifiersByRenderer.set(renderer,specifiers);
  for(const node of ast.statements)if(ts.isImportDeclaration(node)&&!node.importClause?.isTypeOnly){const specifier=node.moduleSpecifier.text,file=resolveTs(path.resolve(path.dirname(rendererFile),specifier));specifiers.set(specifier,file);if(!files.has(file))files.set(file,files.size);}}
 for(const relative of runtimeModules){const file=resolveTs(path.join(web,relative.replace(/\.ts$/,'')));if(!files.has(file))files.set(file,files.size);}
 const output=await build({stdin:{contents:[...files].map(([file,index])=>`export * as m${index} from ${JSON.stringify(file)};`).join('\n'),resolveDir:web,sourcefile:'f5resb-renderer-runtime.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,logLevel:'error',plugins:[nullCityDataProfilePlugin]});
 const namespaces=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text+'\n//# sourceURL=f5resb-'+rendererRelative.replace(/\W/g,'-')+'-runtime.mjs').toString('base64'));
 const byFile=file=>{const index=files.get(file);assert(index!==undefined,'module outside the fixture bundle: '+file);return namespaces['m'+index];};
 const requireFor=renderer=>{const specifiers=specifiersByRenderer.get(renderer);assert(specifiers,'renderer outside the bundle: '+renderer);return specifier=>{const file=specifiers.get(specifier);assert(file,'renderer import specifier outside the bundle: '+specifier);return byFile(file);};};
 return{load:relative=>byFile(resolveTs(path.join(web,relative.replace(/\.ts$/,'')))),requireFrom:requireFor(rendererRelative),requireFor};
}
