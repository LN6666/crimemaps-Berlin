import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {build} from 'esbuild';

// web/src/painted/city/safety keeps frozen copies of the environment and vehicle
// scenery. An identical copy re-exports the one shared, budget-admitted
// implementation. The differing copies (older manager/renderer/scenery/vehicles
// and their data modules) allocate without page-budget admission, so they must
// stay outside the runtime module graph: wiring one in requires re-exporting the
// shared implementation or giving it the same admission first.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),src=path.join(web,'src'),city=path.join(src,'painted/city/safety'),safety=path.join(src,'safety');
const frozenUnadmitted=['main','environment-scene-manager','environment-scene-renderer','environment-scene-data','three-dimensional-scenery','animated-vehicles','vehicle-scenery-data'].map(name=>path.join(city,name+'.ts'));
const identicalCopies=[['environment-city-admission','environmentWaterAdmission'],['kenney-car-mesh','KENNEY_CAR_MESH']];
// A loose over-approximation of every literal module edge: any specifier after
// `from` (compact `}from'x'`, `export*from'x'`, `export * as n from`, type-only
// edges), side-effect `import'x'`, dynamic `import('x')` or a template without
// substitution, `require('x')`, and `new URL('x',import.meta.url)` assets.
const EDGES=[/\bfrom\s*(['"])([^'"\n]+)\1/g,/\bimport\s*(['"])([^'"\n]+)\1/g,/\bimport\s*\(\s*(['"`])([^'"`\n$]+)\1\s*\)/g,/\brequire\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g,/\bnew\s+URL\s*\(\s*(['"`])([^'"`\n$]+)\1\s*,\s*import\.meta\.url/g];
const looseEdges=text=>EDGES.flatMap((pattern,kind)=>[...text.matchAll(pattern)].map(match=>({spec:match[2],compact:kind===0&&/[}*]/.test(text[match.index-1]??'')})));
// TypeScript's own scanner: an independent extraction (it does not see assets).
const typeScriptEdges=text=>ts.preProcessFile(text,true,true).importedFiles.map(file=>({spec:file.fileName,compact:false}));
const SCRIPT=/\.(?:ts|tsx|mts|cts|js|mjs|cjs|jsx)$/;
function resolve(from,spec){
 const clean=spec.replace(/[?#].*$/,'');
 if(!clean.startsWith('.')&&!clean.startsWith('/'))return undefined;// packages and virtual modules cannot reach src
 const base=clean.startsWith('/')?path.join(web,clean):path.resolve(path.dirname(from),clean);
 const swapped=/\.(?:m?js|jsx)$/.test(base)?[base.replace(/\.js$/,'.ts').replace(/\.mjs$/,'.mts').replace(/\.jsx$/,'.tsx')]:[];
 for(const candidate of [base,...swapped,...['.ts','.tsx','.mts','.js','.mjs','.jsx','.json'].map(ext=>base+ext),...['index.ts','index.tsx','index.mts','index.js','index.mjs'].map(name=>path.join(base,name))])
  try{if(statSync(candidate).isFile())return candidate;}catch{}
 return undefined;
}
// The graph needs only the syntax of dynamic imports. Emitting every module
// would repeat a full TypeScript transformation for both graph traversals.
function opaqueImport(text,file){
 if(!/\bimport\s*[./(]/.test(text))return false;
 const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest);
 function opaque(node){
  if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword){
   const argument=node.arguments[0];
   if(!argument||!ts.isStringLiteralLike(argument))return true;
  }
  if((ts.isPropertyAccessExpression(node)||ts.isElementAccessExpression(node))&&
     ts.isMetaProperty(node.expression)&&node.expression.keywordToken===ts.SyntaxKind.ImportKeyword){
   const key=ts.isPropertyAccessExpression(node)?node.name:node.argumentExpression;
   if(key&&(ts.isIdentifier(key)||ts.isStringLiteralLike(key))&&key.text==='glob')return true;
  }
  return ts.forEachChild(node,opaque);
 }
 return opaque(source)===true;
}
async function scan(extract,{checkOpaque=false}={}){
 const entry=path.join(src,'safety/main.ts'),reached=new Map([[entry,undefined]]),queue=[entry],opaque=[];let compactFollowed=0;
 while(queue.length){
  const file=queue.pop();if(!SCRIPT.test(file))continue;// css, json and assets are leaves
  const text=await fs.readFile(file,'utf8');
  if(checkOpaque&&opaqueImport(text,file))opaque.push(path.relative(web,file));
  for(const {spec,compact}of extract(text)){
   const target=resolve(file,spec);if(!target)continue;
   if(compact)compactFollowed++;
   if(!reached.has(target)){reached.set(target,file);queue.push(target);}
  }
 }
 return {reached,opaque,compactFollowed};
}

test('the opaque-import check follows syntax, including comments between the import and its argument',()=>{
 for(const source of [
  '// import(name)\nconst a=import("./x");','const a=import( /* literal */ `./x` );',
  'const text="import(variable)";','type T=import("./x").T;','const re=/import\\(name/;'
 ])assert.equal(opaqueImport(source,'probe.ts'),false,source);
 for(const source of ['import(name)','import /* comment */ (name)','import(`./${name}`)','import.meta.glob("./*.ts")','import.meta["glob"]("./*.ts")'])
  assert.equal(opaqueImport(source,'probe.ts'),true,source);
});

test('the import scanner reads compact, type-only, side-effect, dynamic and asset specifiers',()=>{
 const sample=`import{a}from'./compact';import type{T}from'./compact-type';export*from'./compact-star';export * as ns from "./ns";export{default}from'./default';import './side-effect';import'./side-effect-compact';const lazy=import('./dynamic');const t=import(\`./template\`);const u=new URL('./asset.png',import.meta.url);`;
 const found=new Set(looseEdges(sample).map(edge=>edge.spec));
 assert.deepEqual([...found].sort(),['./asset.png','./compact','./compact-star','./compact-type','./default','./dynamic','./ns','./side-effect','./side-effect-compact','./template']);
 assert.equal(looseEdges(sample).filter(edge=>edge.compact).length,4,'compact }from and *from edges are recognised as such');
 for(const {spec}of typeScriptEdges(sample))assert.ok(found.has(spec),'TypeScript scanner edge '+spec+' is also a loose edge');
 assert.equal(resolve(path.join(city,'animated-vehicles.ts'),'./kenney-car-mesh'),path.join(city,'kenney-car-mesh.ts'));
 assert.equal(resolve(path.join(city,'x.ts'),'./c059-projection-math.mjs'),path.join(city,'c059-projection-math.mjs'),'.mjs modules resolve and are scanned');
});

test('identical frozen copies re-export the one shared implementation',async()=>{
 for(const [name,binding]of identicalCopies){
  const text=await fs.readFile(path.join(city,name+'.ts'),'utf8');
  assert.equal(text,`// Identical frozen source and runtime dependency graph; preserve one implementation.\nexport * from '../../../safety/${name}';\n`,name);
  const entry=`export {${binding} as frozen} from ${JSON.stringify(path.join(city,name+'.ts'))};export {${binding} as shared} from ${JSON.stringify(path.join(safety,name+'.ts'))};`;
  const built=await build({stdin:{contents:entry,resolveDir:city,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022'});
  const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
  assert.ok(m.shared,name);assert.equal(m.frozen,m.shared,name+': one implementation, not a second copy');
 }
});

test('differing frozen city environment copies stay outside the runtime module graph',async t=>{
 const html=await fs.readFile(path.join(web,'index.html'),'utf8'),scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
 assert.deepEqual(scripts.map(match=>/\bsrc="([^"]+)"/.exec(match[1])?.[1]),['/src/safety/main.ts'],'the page has one module entry');
 assert.ok(scripts.every(match=>!match[2].trim()),'and no inline script');
 for(const file of frozenUnadmitted)await fs.access(file);
 const loose=await scan(looseEdges,{checkOpaque:true}),viaTypeScript=await scan(typeScriptEdges);
 assert.deepEqual(loose.opaque,[],'every dynamic import is a literal the scan can follow');
 assert.ok(loose.compactFollowed>0,'compact }from edges are followed in the real graph');
 assert.deepEqual([...viaTypeScript.reached.keys()].filter(file=>!loose.reached.has(file)).map(file=>path.relative(web,file)),[],'the loose scan reaches every module TypeScript\'s scanner reaches');
 // Floor: the independently measured loose graph (review, 2026-11-01: 3828),
 // lowered to 3802 on 2026-11-02 after the controller confirmed that the 26
 // modules that left this graph through owner-lazy and owner-lazy-2 did so
 // intentionally. A scanner that
 // silently drops an import syntax falls far below it.
 assert.ok(loose.reached.size>=3802,'the scan followed the real application graph ('+loose.reached.size+' modules)');
 t.diagnostic('loose scan '+loose.reached.size+' modules, TypeScript scanner '+viaTypeScript.reached.size+', compact edges followed '+loose.compactFollowed);
 const chain=file=>{const rows=[];for(let at=file;at;at=loose.reached.get(at))rows.push(path.relative(web,at));return rows.join(' <- ');};
 for(const file of frozenUnadmitted)assert.equal(loose.reached.has(file),false,'frozen unadmitted copy became reachable: '+chain(file)+' (re-export the shared implementation or add page-budget admission)');
 for(const name of ['projected-shadow-mask','solar-shadow-admission','environment-scene-manager','three-dimensional-scenery'])assert.ok(loose.reached.has(path.join(safety,name+'.ts')),'shared '+name+' is the runtime implementation');
});
