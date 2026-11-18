import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {nullCityDataProfilePlugin} from '../city-profile-test-plugin.mjs';

const web=fileURLToPath(new URL('../../',import.meta.url)),require=createRequire(path.join(web,'package.json'));
const ts=require('typescript'),{build}=require('esbuild');
const PLAN={root500:['root500-prepared-program-plan','createRoot500PreparedProgramPlan'],infill:['infill-prepared-program-plan','createInfillPreparedProgramPlan'],bremen:['bremen-prepared-program-plan','createBremenPreparedProgramPlan'],tier300:['tier300-prepared-data-plan','createTier300PreparedDataPlan']};

// Extract the actual current renderer declarations, including its real tagged
// template and recipe builder. No source-length or assembly algorithm is copied.
export async function rendererSourceRuntime(provider){
 const directory=path.join(web,'src/painted',provider,'safety'),text=fs.readFileSync(path.join(directory,'building-mesh-renderer.ts'),'utf8');
 const ast=ts.createSourceFile(provider,text,ts.ScriptTarget.Latest,true),imports=new Map(),declarations=new Map(),helpers=new Set();
 const names=['VERTEX','fragmentParts','fragment',...(provider==='tier300'?['tierProgramSourceAuthority','compileGeometryProgram']:[provider==='bremen'?'COLOUR_ATTRIBUTES':'COLOUR_PROGRAM_ATTRIBUTES','COLOUR_ASSEMBLY_AUTHORITY',...(provider==='root500'?['withPlan']:provider==='bremen'?['programPlanScope']:[]),'geometryProgramRecipe'])];
 for(const node of ast.statements)if(ts.isImportDeclaration(node)&&!node.importClause?.isTypeOnly){const group=node.importClause?.namedBindings;if(group&&ts.isNamedImports(group))for(const element of group.elements)if(!element.isTypeOnly)imports.set(element.name.text,[node.moduleSpecifier.text,(element.propertyName??element.name).text]);}
 (function walk(node){
  if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text)){assert(!declarations.has(node.name.text));declarations.set(node.name.text,node.getText(ast));}
  if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&names.includes(node.name.text)&&node.initializer){assert(!declarations.has(node.name.text));declarations.set(node.name.text,node.initializer.getText(ast));}
  if(ts.isStringLiteral(node)&&node.text.startsWith('vec3 sourceFacade(')&&node.text.endsWith('{return base;}'))helpers.add(node.text);
  ts.forEachChild(node,walk);
 })(ast);
 for(const name of names)assert(declarations.has(name),provider+' declaration '+name);
 assert.equal(helpers.size,1,provider+' production default helper');
 const used=new Set();for(const source of declarations.values())for(const [word] of source.matchAll(/\b[A-Za-z_$][\w$]*\b/g))if(imports.has(word))used.add(word);
 if(provider==='root500')used.add('importedRoot500_pruneOwner6307Fragment');
 const [planFile,planName]=PLAN[provider];
 const sharedExports=new Set(['createResourceBudget','createChunkResourceStore','bindChunkResourceContext','createProgramPreparationOwner','ProgramPreparationPending','isProgramPreparationPending','validateShaderSourceSyntax','countShaderSourceSyntax']);
 const entry=[...[...used].filter(name=>!sharedExports.has(name)).map(name=>{assert(imports.has(name));const [specifier,exported]=imports.get(name);return`export {${exported} as ${name}} from ${JSON.stringify(specifier)};`;}),
  `export {${planName} as createPlan} from './${planFile}';`,
  "export {createResourceBudget} from '../../../safety/render-runtime/resource-budget';",
  "export {createChunkResourceStore,bindChunkResourceContext} from '../../../safety/render-runtime/chunk-resource-store';",
  "export {createProgramPreparationOwner,ProgramPreparationPending,isProgramPreparationPending} from '../../../safety/render-runtime/program-preparation';",
  "export {validateShaderSourceSyntax,countShaderSourceSyntax} from '../../../safety/render-runtime/shader-source-budget';",
  "export {createCityFrozenProfile} from '../../../safety/city-frozen-profile';",
  "export {default as frozenManifest} from '../../../safety/frozen-paint-table-manifest.json';",
  "export {default as frozenDependencies} from '../../../safety/frozen-paint-table-dependencies.json';",
 ].join('\n');
 const bundle=await build({stdin:{contents:entry,resolveDir:directory,loader:'ts',sourcefile:'real-shader-bounds-entry.ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'error',plugins:[nullCityDataProfilePlugin]});
 const source=bundle.outputFiles[0].text+'\n//# sourceURL=crimemaps-real-shader-bounds-'+provider+'.mjs';
 const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const evaluate=(name,state)=>{
  const js=ts.transpileModule('('+declarations.get(name)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'');
  const context=new Proxy(state,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:key in globalThis?globalThis[key]:(()=>{throw Error(provider+' unbound renderer name '+String(key));})(),set:(target,key,value)=>(target[key]=value,true)});
  return Function('scope','with(scope){return '+js+'}')(context);
 };
 return{module,names,evaluate,helper:[...helpers][0]};
}

export function shaderRecordingGL(){
 let sequence=0;const submitted=[],linked=[];
 const gl={VERTEX_SHADER:0x8B31,FRAGMENT_SHADER:0x8B30,COMPILE_STATUS:0x8B81,LINK_STATUS:0x8B82,
  isContextLost:()=>false,getExtension:()=>null,createShader:type=>({id:++sequence,type}),
  shaderSource(shader,source){assert.equal(typeof source,'string');shader.source=source;submitted.push({type:shader.type,source});},
  compileShader(){},getShaderParameter:()=>true,getShaderInfoLog:()=>'',deleteShader(){},
  createProgram:()=>({id:++sequence,shaders:[]}),attachShader(program,shader){program.shaders.push(shader);},bindAttribLocation(){},detachShader(){},
  deleteProgram(program){program.deleted=true;},linkProgram(program){linked.push(program);},getProgramParameter:()=>true,getProgramInfoLog:()=>'',
 };
 return{gl,submitted,linked};
}
