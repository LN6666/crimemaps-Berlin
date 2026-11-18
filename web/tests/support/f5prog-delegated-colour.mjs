// Delegated500 colour-program dependencies for suites that evaluate the actual
// delegated renderer closures over the shared reflection fixture
// (support/f3-reflection-bridge.mjs).
//
// The delegated colour recipe (colourProgramRecipe/compileGeometryProgram) now
// names two module-level immutable source authorities as provenance
// (delegatedColourSourceAuthority, delegatedPreparedSourceAuthority), its fixed
// attribute list (DELEGATED_COLOUR_ATTRIBUTES), and preflights its budget with
// the delegated shader-budget module (assertDelegatedProgramBudgetFits,
// existingShaderTextBoundPart, describeDelegatedWrappedPaintBounds, ...).
//
// delegated-shader-budget.ts cannot be bundled by the fixture runtime: its
// wrapper table imports the per-building delegated paint fragments, which reach
// the frozen paint tables (a virtual module). This loader evaluates that one
// module's own statements once, in one scope, exactly as the shared setup
// already evaluates createContextPreparedSourceWorkspace from the same file:
// its shader-source, resource-budget, prepared-source and program-preparation
// imports come from the fixture's single production runtime bundle; only the
// per-building paint fragments it wraps are not loaded. Those names are bound
// to functions that throw when called, so any path that would need real paint
// text fails visibly instead of silently using a substitute.
//
// The wrapper probes also name string constants exported beside those
// fragments (F358_TOKEN604, F244_TOKEN619, F244_TOKEN622, BE_PAUL_LOBE_GLSL).
// Their modules cannot be loaded either, but each constant is a plain string
// literal: it is read from its own module's text (the exported const's literal
// initializer, through the TS AST), so every probe and growth bound is computed
// from the real text. A name whose module has no such literal fails the load.
//
// The renderer's own module constants are then evaluated from the renderer
// text in the fixture scope. delegated500ScopedFunctionArities (the table of
// frozen-data scoped functions) belongs to the same unloaded data modules; the
// fixture loads none of them, so its table is empty: scopedCall then calls the
// fixture functions directly, as it does for every function outside the table.
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const web=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(path.join(web,'package.json')),ts=require('typescript');
const BUDGET_FILE='src/painted/delegated500/safety/delegated-shader-budget.ts';
const RUNTIME_IMPORTS={
 '../../../safety/render-runtime/shader-source-budget':'src/safety/render-runtime/shader-source-budget.ts',
 '../../../safety/render-runtime/resource-budget':'src/safety/render-runtime/resource-budget.ts',
 '../../../safety/prepared-source':'src/safety/prepared-source.ts',
 '../../../safety/render-runtime/program-preparation':'src/safety/render-runtime/program-preparation.ts',
 './berlin-distant-paint':'src/painted/delegated500/safety/berlin-distant-paint.ts',
};

const loaded=new WeakMap();

/** The literal value of `export const name="..."` in the sibling module `spec`. */
async function exportedStringLiteral(spec,name){
 if(!spec.startsWith('./'))throw Error('f5prog-delegated-colour: no source for constant '+name+' from '+spec);
 const file=path.join(path.dirname(BUDGET_FILE),spec.slice(2)+'.ts'),text=await readFile(path.join(web,file),'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 for(const node of ast.statements){
  if(!ts.isVariableStatement(node)||!ts.getModifiers(node)?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))continue;
  for(const d of node.declarationList.declarations)if(ts.isIdentifier(d.name)&&d.name.text===name){
   const init=d.initializer;if(init&&(ts.isStringLiteral(init)||ts.isNoSubstitutionTemplateLiteral(init)))return init.text;
   throw Error('f5prog-delegated-colour: '+name+' in '+file+' is not a plain string literal');
  }
 }
 throw Error('f5prog-delegated-colour: '+file+' exports no constant '+name);
}

/**
 * Evaluates delegated-shader-budget.ts once per bridge (its exports share one
 * module scope). `bridge` supplies evaluate/productionHelpers of the shared
 * reflection setup. `fragments` may name a test's own stand-ins for the
 * per-building paint fragment functions the wrapper table applies (e.g. a
 * suite checking the exact original nesting order); such an evaluation is a
 * separate module instance and is not cached.
 */
export async function loadDelegatedShaderBudget(bridge,{fragments}={}){
 const cached=fragments?undefined:loaded.get(bridge.evaluate);if(cached)return cached;
 const text=await readFile(path.join(web,BUDGET_FILE),'utf8'),ast=ts.createSourceFile(BUDGET_FILE,text,ts.ScriptTarget.Latest,true);
 const scope={},exportsList=[],body=[];
 for(const node of ast.statements){
  if(ts.isImportDeclaration(node)){
   const spec=node.moduleSpecifier.text,clause=node.importClause;if(!clause||clause.isTypeOnly)continue;
   const relative=RUNTIME_IMPORTS[spec],module=relative?await bridge.productionHelpers(relative):undefined;
   for(const element of clause.namedBindings?.elements??[]){
    if(element.isTypeOnly)continue;const local=element.name.text,exported=(element.propertyName??element.name).text;
    if(module){if(module[exported]===undefined)throw Error('f5prog-delegated-colour: runtime import missing '+exported);scope[local]=module[exported];}
    else if(fragments&&local in fragments)scope[local]=fragments[local];
    else if(/^[A-Z0-9_]+$/.test(local))scope[local]=await exportedStringLiteral(spec,exported);
    else scope[local]=Object.defineProperty(()=>{throw Error('fixture does not load delegated paint fragment '+local);},'name',{value:local});
   }
   continue;
  }
  const declared=ts.canHaveModifiers?.(node)&&ts.getModifiers(node)?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword);
  if(ts.isTypeAliasDeclaration(node)||ts.isInterfaceDeclaration(node))continue;
  if(declared){
   if(ts.isVariableStatement(node))for(const d of node.declarationList.declarations)exportsList.push(d.name.getText(ast));
   else if(node.name)exportsList.push(node.name.text);
  }
  body.push(node.getText(ast).replace(/^export\s+/,''));
 }
 const namespace=await bridge.evaluate('(()=>{'+body.join('\n')+';return{'+exportsList.join(',')+'};})()',scope);
 if(!fragments)loaded.set(bridge.evaluate,namespace);
 return namespace;
}

const COLOUR_CONSTANTS=['delegatedColourSourceAuthority','delegatedPreparedSourceAuthority','DELEGATED_COLOUR_ATTRIBUTES'];

/**
 * Installs the delegated renderer's colour-recipe dependencies on `f.values`
 * (only names the fixture does not already define), then evaluates the
 * renderer's own module constants from its text.
 */
export async function installDelegatedColourDependencies(bridge,f){
 const budget=await loadDelegatedShaderBudget(bridge),prepared=await bridge.productionHelpers('src/safety/prepared-source.ts');
 for(const [name,value]of Object.entries(budget))if(!(name in f.values)||f.values[name]===undefined)f.values[name]=value;
 f.values.createPreparedSourceWorkspace??=prepared.createPreparedSourceWorkspace;
 f.values.delegated500ScopedFunctionArities??=new Map();
 for(const name of COLOUR_CONSTANTS)if(f.values[name]===undefined)f.values[name]=await bridge.evaluate(bridge.binding(f.text,name),f.values);
 return budget;
}
