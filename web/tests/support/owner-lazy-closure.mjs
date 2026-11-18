// Static ESM closure of product entry modules, computed from the TypeScript
// preprocessor plus a statement-level TypeScript AST of each import/export
// declaration. Large model literals are never parsed into an AST: the
// preprocessor only scans tokens, and only the short declaration text around
// each module reference is parsed. Unknown local import syntax fails closed.
//
// Edges: value imports, value re-exports, side-effect imports and require().
// Not edges: type-only imports/exports and dynamic import() (the lazy boundary).
// A dynamic import() that a module runs at its own top level is still counted as
// lazy here; for the registry and the canonical aggregate the owner-lazy suite
// covers that separately by asserting that loading either one imports nothing.
// Whether a lazy edge stays lazy in production also depends on the build's
// manual chunks; productionChunk() mirrors the vite rule the suite pins.
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

export const web=fileURLToPath(new URL('../../',import.meta.url));
export const productSource=path.join(web,'src');
const extensions=['.ts','.tsx','.mts','.js','.mjs','.json','/index.ts','/index.js'];
const WINDOW=16384;

const word=/[\w$]/;
/** Nearest `import`/`export` keyword starts before `end`, nearest first. */
function* keywordStarts(source,end,limit){
 let from=end;
 while(from>limit){
  const a=source.lastIndexOf('import',from-1),b=source.lastIndexOf('export',from-1),at=Math.max(a,b);
  if(at<limit||at<0)return;from=at;
  if((at===0||!word.test(source[at-1]))&&!word.test(source[at+6]??''))yield at;
 }
}
/** Classify each local module reference of one source text. */
export function classifyLocalReferences(source,file){
 const edges=[],dynamic=[];
 for(const reference of ts.preProcessFile(source,true,true).importedFiles){
  if(!reference.fileName.startsWith('.'))continue;
  const before=source.slice(Math.max(0,reference.pos-256),reference.pos);
  if(/\brequire\s*\(\s*$/.test(before)){edges.push(reference.fileName);continue;}
  // import('x') in value or type position (typeof import('x')) is never an eager edge.
  if(/(?:^|[^\w$.])import\s*\(\s*$/.test(before)){dynamic.push(reference.fileName);continue;}
  let kind;
  for(const start of keywordStarts(source,reference.pos,Math.max(0,reference.pos-WINDOW))){
   const text=source.slice(start,reference.pos)+JSON.stringify(reference.fileName);
   const ast=ts.createSourceFile('edge.ts',text+';',ts.ScriptTarget.Latest,true),node=ast.statements[0];
   if(ast.parseDiagnostics.length||ast.statements.length!==1||!node)continue;
   if(ts.isImportEqualsDeclaration(node)&&ts.isExternalModuleReference(node.moduleReference)&&ts.isStringLiteral(node.moduleReference.expression)&&node.moduleReference.expression.text===reference.fileName){kind=node.isTypeOnly?'type':'value';break;}
   if(!node.moduleSpecifier||!ts.isStringLiteral(node.moduleSpecifier)||node.moduleSpecifier.text!==reference.fileName)continue;
   if(ts.isImportDeclaration(node)){
    const clause=node.importClause;
    const typeOnly=!!clause&&(clause.isTypeOnly||!clause.name&&!!clause.namedBindings&&ts.isNamedImports(clause.namedBindings)&&clause.namedBindings.elements.length>0&&clause.namedBindings.elements.every(element=>element.isTypeOnly));
    kind=typeOnly?'type':'value';break;
   }
   if(ts.isExportDeclaration(node)){
    const typeOnly=node.isTypeOnly||!!node.exportClause&&ts.isNamedExports(node.exportClause)&&node.exportClause.elements.length>0&&node.exportClause.elements.every(element=>element.isTypeOnly);
    kind=typeOnly?'type':'value';break;
   }
  }
  if(!kind)throw Error('Unclassified local dependency in '+file+': '+reference.fileName);
  if(kind==='value')edges.push(reference.fileName);else if(kind==='dynamic')dynamic.push(reference.fileName);
 }
 return{edges,dynamic};
}

async function resolveLocal(from,specifier){
 const clean=specifier.split('?')[0],base=path.resolve(path.dirname(from),clean);
 if(!(base+path.sep).startsWith(productSource+path.sep))throw Error('Static dependency leaves product source: '+specifier+' in '+from);
 for(const candidate of [base,...extensions.map(extension=>base+extension)]){
  try{if((await stat(candidate)).isFile())return candidate;}catch(error){if(error.code!=='ENOENT'&&error.code!=='ENOTDIR')throw error;}
 }
 throw Error('Unresolved static dependency '+specifier+' in '+from);
}

/** Breadth-first static closure; parents record one shortest eager path. A
 * shared cache keeps one classification per file across several entries. */
export async function staticClosure(entries,{maxModules=4096,maxBytes=512*1024**2,maxFileBytes=24*1024**2,cache=new Map()}={}){
 const pending=entries.map(file=>[file,null]),parents=new Map(),sizes=new Map(),dynamic=new Map();let bytes=0;
 async function describe(file){
  let entry=cache.get(file);if(entry)return entry;
  const info=await stat(file);if(info.size>maxFileBytes)throw Error('Static closure file bound exceeded at '+file);
  entry={size:info.size,edges:[],dynamic:[]};
  if(/\.[cm]?[jt]sx?$/.test(file)){
   const references=classifyLocalReferences(await readFile(file,'utf8'),path.relative(web,file));entry.dynamic=references.dynamic;
   // Query imports (for example ?raw) are leaf assets: counted, not traversed.
   for(const specifier of references.edges)entry.edges.push(await resolveLocal(file,specifier));
  }
  cache.set(file,entry);return entry;
 }
 while(pending.length){
  const [file,parent]=pending.shift();if(parents.has(file))continue;parents.set(file,parent);
  if(parents.size>maxModules)throw Error('Static closure module bound exceeded');
  const entry=await describe(file);sizes.set(file,entry.size);bytes+=entry.size;
  if(bytes>maxBytes)throw Error('Static closure source-byte bound exceeded at '+file);
  if(entry.dynamic.length)dynamic.set(file,entry.dynamic);
  for(const resolved of entry.edges)if(!parents.has(resolved))pending.push([resolved,file]);
 }
 return{parents,sizes,bytes,dynamic,has:file=>parents.has(file),route:file=>{const out=[];for(let next=file;next;next=parents.get(next))out.push(path.relative(web,next));return out.reverse().join(' -> ');}};
}

/** The certified non-Berlin owner registry, read with the TypeScript AST. */
export async function nonBerlinOwnerRoutes(registry=path.join(web,'src/painted/root500/safety/owner-nonberlin-lazy.ts')){
 const text=await readFile(registry,'utf8'),ast=ts.createSourceFile(registry,text,ts.ScriptTarget.Latest,true),factories=new Map();let table;
 (function visit(node){
  if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer){
   if(ts.isCallExpression(node.initializer)&&node.initializer.expression.getText(ast)==='createLazyOwnerRoute'){
    const args=node.initializer.arguments,specifiers=[];
    (function find(child){if(ts.isCallExpression(child)&&child.expression.kind===ts.SyntaxKind.ImportKeyword&&child.arguments.length===1&&ts.isStringLiteral(child.arguments[0]))specifiers.push(child.arguments[0].text);ts.forEachChild(child,find);})(args[3]);
    if(!ts.isStringLiteral(args[0])||specifiers.length!==1)throw Error('Route '+node.name.text+' must name one dynamic original module');
    factories.set(node.name.text,{routeName:node.name.text,reconstruct:args[0].text,specifier:specifiers[0],file:path.resolve(path.dirname(registry),specifiers[0])+'.ts'});
   }
   if(node.name.text==='routes'&&ts.isArrayLiteralExpression(node.initializer))table=node.initializer;
  }
  ts.forEachChild(node,visit);
 })(ast);
 if(!table)throw Error('Registry route table is missing');
 return table.elements.map(row=>{
  const property=name=>row.properties.find(p=>p.name?.getText(ast)===name)?.initializer,city=property('city'),prepare=property('prepare');
  if(!city||!ts.isStringLiteral(city)||!prepare||!ts.isPropertyAccessExpression(prepare))throw Error('Malformed registry route row');
  const factory=factories.get(prepare.expression.getText(ast));if(!factory)throw Error('Registry row has no route factory');
  return{...factory,city:city.text};
 });
}

/** Every module painted-map imports dynamically per provider: the manager and
 * the renderer of each of the seven providers. */
export const providerNames=['root500','delegated500','tier300','church','city','infill','bremen'];
export const providerEntries=providerNames.flatMap(provider=>['three-dimensional-map.ts','building-mesh-renderer.ts'].map(name=>({provider,name,file:path.join(web,'src/painted',provider,'safety',name)})));

/** These manual-chunk rules of web/vite.config.ts decide whether a lazily
 * imported module gets a chunk of its own; the suite pins their exact text. */
export const viteChunkRules=[
 'onlyExplicitManualChunks: true,',
 "const sourceAt=id.lastIndexOf('/web/src/'),sourceId=sourceAt<0?'':id.slice(sourceAt+9).split('?')[0];",
 "if(frozenInitializerChunks.has(sourceId))return 'init-'+sourceId.slice(0,-3).replaceAll('/','--');",
 'const owner=id.match(/\\/painted\\/(root500|delegated500|infill|bremen)\\/safety\\/owner-f(\\d{3})/);',
 'if(owner)return `paint-${owner[1]}-${Number(owner[2])%8}`;',
];
/** The manual chunk of one product module under those rules (undefined: rollup's own placement). */
export function productionChunk(file,initializerChunks){
 const sourceId=path.relative(productSource,file).split(path.sep).join('/');
 if(initializerChunks.has(sourceId))return 'init-'+sourceId.slice(0,-3).replaceAll('/','--');
 const owner=('/'+sourceId).match(/\/painted\/(root500|delegated500|infill|bremen)\/safety\/owner-f(\d{3})/);
 if(owner)return `paint-${owner[1]}-${Number(owner[2])%8}`;
}
