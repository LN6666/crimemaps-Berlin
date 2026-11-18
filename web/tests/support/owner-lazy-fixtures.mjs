// Fixtures for the lazy certified non-Berlin owner routes. They bundle the
// actual canonical root500 aggregate and the actual route registry, with every
// owner builder replaced by a tiny virtual module. No original builder, model
// table, data asset, shader or GPU state is opened or evaluated here.
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import ts from 'typescript';
import {web,nonBerlinOwnerRoutes} from './owner-lazy-closure.mjs';

export const safety=path.join(web,'src/painted/root500/safety');
export const aggregateFile=path.join(safety,'owner-reconstruction.ts');
export const registryFile=path.join(safety,'owner-nonberlin-lazy.ts');
const zero=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
let serial=0;

/** Every registry route with its identity table and predicates, read with the TS AST. */
export async function registryContracts(file=registryFile){
 const routes=await nonBerlinOwnerRoutes(file),text=await readFile(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),variables=new Map();
 (function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer)variables.set(node.name.text,node.initializer);ts.forEachChild(node,visit);})(ast);
 return routes.map(route=>{
  const prefix=route.reconstruct.replace(/Reconstruction$/,''),identity=prefix+'Identity',materials=prefix+'BaseMaterials',table=prefix.replace(/^owner/,'')+'_IDS';
  const factory=variables.get(route.routeName),identityText=variables.get(identity)?.getText(ast),neededText=factory.arguments[1].getText(ast);
  if(!variables.has(table)||!identityText)throw Error('Registry route '+route.routeName+' lacks its identity table');
  const cityAware=identityText===`(c:{city?:string;objectId:string;partId:string})=>${table}.some(i=>i.city===c.city&&i.objectId===c.objectId&&i.partId===c.partId)`;
  if(!cityAware&&identityText!==`(c:Identity)=>${table}.some(i=>i.objectId===c.objectId&&i.partId===c.partId)`)throw Error('Unknown identity form for '+identity);
  const neededCity=neededText.match(new RegExp(`^c=>c\\.city==="([a-z]+)"&&${identity}\\(c\\)$`))?.[1];
  if(!neededCity&&neededText!==`c=>${identity}(c)`)throw Error('Unknown needed predicate for '+route.routeName);
  return{...route,identity,materials,table,ids:JSON.parse(variables.get(table).getText(ast)),identityText,cityAware,neededCity,neededText,copyNoMatch:factory.arguments[2].kind===ts.SyntaxKind.TrueKeyword,moduleKey:route.specifier.slice(2)};
 });
}

/** Names the aggregate binds from each relative specifier (static named imports and re-exports). */
export function aggregateBindings(text){
 const ast=ts.createSourceFile('aggregate.ts',text,ts.ScriptTarget.Latest,true),bindings=new Map();
 for(const node of ast.statements){
  if(!ts.isImportDeclaration(node)&&!ts.isExportDeclaration(node))continue;const specifier=node.moduleSpecifier?.text;if(!specifier?.startsWith('./'))continue;
  if(ts.isImportDeclaration(node)&&node.importClause?.isTypeOnly||ts.isExportDeclaration(node)&&node.isTypeOnly)continue;
  const names=bindings.get(specifier)??new Set(),list=ts.isImportDeclaration(node)?node.importClause?.namedBindings:node.exportClause;
  if(list&&(ts.isNamedImports(list)||ts.isNamedExports(list)))for(const element of list.elements)if(!element.isTypeOnly)names.add((element.propertyName??element.name).text);
  bindings.set(specifier,names);
 }
 return bindings;
}

/** Shared virtual-owner behaviour. Route builders follow the certified contract:
 * rows no route needs keep the no-match container, needed rows record the route. */
export function createOwnerFixtureState(contracts){
 const byModule=new Map(contracts.map(route=>[route.moduleKey,route])),gates=new Map();
 const state={loads:[],prepares:[],calls:[],writes:[],scopes:[],other:new Map(),inject:new Map(),
  route:key=>byModule.get(key),
  identity(route,c){return route.ids.some(i=>(!route.cityAware||i.city===c.city)&&i.objectId===c.objectId&&i.partId===c.partId);},
  needed(route,c){return(route.neededCity===undefined||c.city===route.neededCity)&&state.identity(route,c);},
  gate(key){return gates.get(key)?.promise;},
  hold(key){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});gates.set(key,{promise});return{release:()=>{gates.delete(key);resolve();},fail:error=>{gates.delete(key);reject(error);}};},
  reconstruct(key,components,scope,argc){
   const route=byModule.get(key);state.scopes.push({name:route.reconstruct,argc,scope});
   if(!components.some(c=>state.needed(route,c)))return{components:route.copyNoMatch?components.map(c=>c):components,stats:zero()};
   state.calls.push(route.reconstruct);const stats=zero();
   const out=components.map(c=>{if(!state.needed(route,c))return c;stats.objects++;stats.vertices+=3;stats.triangles++;stats.originalVertices+=3;stats.components.push({objectId:c.objectId,partId:c.partId,route:route.reconstruct});return{...c,chain:[...(c.chain??[]),route.reconstruct]};});
   return{components:out,stats};
  },
  materials(key,components,paint,frames,argc){
   const route=byModule.get(key),index=contracts.indexOf(route);state.scopes.push({name:route.materials,argc});let offset=0,objects=0,vertices=0;
   for(const c of components){const count=c.batches.reduce((n,b)=>n+b.positions.length/3,0);if(state.needed(route,c)&&c.displayEstimates?.fixture){objects++;for(let j=0;j<count;j++){paint[4*(offset+j)]=index+1;frames[5*(offset+j)]=-(index+1);vertices++;}state.writes.push(route.materials);}offset+=count;}
   return{objects,vertices,actualVisualAccepted:false};
  },
  async prepare(key,components,signal,scope){
   const route=byModule.get(key);signal.throwIfAborted();if(!components.some(c=>state.needed(route,c)))return;
   state.prepares.push({name:route.reconstruct,scope,rows:components.filter(c=>state.needed(route,c)).map(c=>c.partId)});
   const gate=gates.get('data:'+key);if(gate)await gate.promise;signal.throwIfAborted();
  },
  otherCall(key,name,args){
   if(name.endsWith('Identity'))return false;
   if(name.endsWith('Materials')||name.startsWith('apply')||name.startsWith('retire')||name.startsWith('prepare'))return undefined;
   if(name==='ownerF154RecoveredSources')return args[0];
   // Rows a test lets this stage add (a lazy identity that first appears mid-chain).
   const added=state.inject.get(name);
   return{components:added?[...args[0],...added]:args[0],stats:zero(),cofaceStats:{fixture:true}};
  }};
 return state;
}

function routeModule(stateKey,route,extra=[]){
 const s=`globalThis[${JSON.stringify(stateKey)}]`,key=JSON.stringify(route.moduleKey),own=new Set([route.identity,route.reconstruct,route.materials,'root500DataFunctionArities','prepareRoot500Data']);
 return `${s}.loads.push(${key});\nawait ${s}.gate(${key});\nexport const root500DataFunctionArities=${JSON.stringify({[route.reconstruct]:1})};\n`+
  `export function ${route.identity}(c){return ${s}.identity(${s}.route(${key}),c);}\n`+
  `export function ${route.reconstruct}(components,scope){return ${s}.reconstruct(${key},components,scope,arguments.length);}\n`+
  `export function ${route.materials}(components,paint,frames){return ${s}.materials(${key},components,paint,frames,arguments.length);}\n`+
  `export function prepareRoot500Data(components,signal,scope){return ${s}.prepare(${key},components,signal,scope);}\n`+
  // Further names the aggregate binds from a direct route import (for example the F257 retirement).
  [...extra].filter(name=>!own.has(name)).map(name=>`export function ${name}(...args){return ${s}.otherCall(${key},${JSON.stringify(name)},args);}`).join('\n')+'\n';
}
function otherModule(stateKey,key,names){
 const s=`globalThis[${JSON.stringify(stateKey)}]`;
 return [...names].map(name=>`export function ${name}(...args){return ${s}.otherCall(${JSON.stringify(key)},${JSON.stringify(name)},args);}`).join('\n')+`\nexport const root500DataFunctionArities={};\nexport function prepareRoot500Data(){}\n`;
}
// A synthetic eager registry, not the former aggregate: the current aggregate
// keeps its text, and this module stands in for the registry. It imports every
// route builder the aggregate binds from the registry (the 81 non-Bremen routes;
// the Bremen four stay direct imports of the aggregate) up front, re-exports
// them, merges their arities and lets each module prepare its own data at its own
// stage (every module in turn for material preparation). The actual former
// static wiring (the HEAD aggregate) is compared outside this suite.
function eagerRegistry(all){
 const contracts=all.filter(route=>route.city!=='bremen'),imports=contracts.map((route,index)=>`import * as m${index} from 'owner-lazy-virtual:${route.moduleKey}';`).join('\n');
 const exports=contracts.map(route=>`export {${route.identity},${route.reconstruct},${route.materials}} from 'owner-lazy-virtual:${route.moduleKey}';`).join('\n');
 return `${imports}\n${exports}\nconst modules=[${contracts.map((_,index)=>'m'+index).join(',')}];\nexport const root500DataFunctionArities=Object.assign({},...modules.map(m=>m.root500DataFunctionArities));\n`+
  `export async function prepareRoot500Data(components,signal,scope,recipe){for(const m of modules){if(recipe!==undefined&&!Object.values(m).includes(recipe))continue;const operation=m.prepareRoot500Data(components,signal,scope);if(operation)await operation;}}\nexport async function prepareNonBerlinOwnerRoutes(){}\n`;
}

/** Bundle the actual aggregate with the actual lazy registry ('lazy') or the
 * synthetic eager registry ('eager'), over identical virtual builders. Another
 * aggregate text (for example the HEAD aggregate) can be passed as `aggregate`. */
export async function bundleAggregate(mode,contracts,{aggregate=aggregateFile,registrySource}={}){
 const stateKey='__ownerLazyFixture'+(++serial),state=createOwnerFixtureState(contracts);globalThis[stateKey]=state;
 const text=await readFile(aggregate,'utf8'),bindings=aggregateBindings(text),byKey=new Map(contracts.map(route=>[route.moduleKey,route]));
 const result=await build({entryPoints:[aggregate],bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent',plugins:[{name:'owner-lazy-virtual-builders',setup(builder){
  builder.onResolve({filter:/.*/},args=>{
   if(args.namespace==='owner-lazy-virtual'||args.namespace==='owner-lazy-eager'){if(!args.path.startsWith('owner-lazy-virtual:'))throw Error('Unexpected virtual dependency '+args.path);return{path:args.path.slice('owner-lazy-virtual:'.length),namespace:'owner-lazy-virtual'};}
   if(args.kind==='entry-point')return undefined;
   if(args.importer===aggregate){
    if(args.path==='./owner-nonberlin-lazy')return mode==='lazy'?{path:registryFile}:{path:'eager-registry',namespace:'owner-lazy-eager'};
    if(args.path.startsWith('./'))return{path:args.path.slice(2),namespace:'owner-lazy-virtual'};
   }
   if(args.importer===registryFile){
    if(args.path==='./lazy-owner-route')return undefined;
    if(args.kind==='dynamic-import'&&byKey.has(args.path.slice(2)))return{path:args.path.slice(2),namespace:'owner-lazy-virtual'};
   }
   throw Error('Unexpected value dependency '+args.path+' from '+path.relative(web,args.importer||'?'));
  });
  builder.onLoad({filter:/.*/,namespace:'owner-lazy-eager'},()=>({contents:eagerRegistry(contracts),loader:'js'}));
  // Optional registry text (mutation and before/after checks); the path and its imports stay real.
  if(registrySource!==undefined)builder.onLoad({filter:/owner-nonberlin-lazy\.ts$/},args=>args.path===registryFile?{contents:registrySource,loader:'ts'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'owner-lazy-virtual'},args=>{
   const route=byKey.get(args.path);if(route)return{contents:routeModule(stateKey,route,bindings.get('./'+args.path)??[]),loader:'js'};
   const names=bindings.get('./'+args.path);if(!names)throw Error('Virtual module without aggregate bindings: '+args.path);
   return{contents:otherModule(stateKey,args.path,names),loader:'js'};
  });
 }}]});
 const owner=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text+`\n//# sourceURL=owner-lazy-${mode}-${serial}.mjs`).toString('base64'));
 return{owner,state,close(){delete globalThis[stateKey];}};
}

/** Bundle only the actual registry (or, for mutation checks, another registry
 * text at the same path); each original import goes through `load`. */
export async function bundleRegistry({registrySource}={}){
 const loaderKey='__ownerLazyLoad'+(++serial),result=await build({entryPoints:[registryFile],bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent',plugins:[{name:'owner-lazy-loader',setup(builder){
  builder.onResolve({filter:/.*/},args=>{
   if(args.kind==='entry-point')return undefined;
   if(args.importer===registryFile&&args.path==='./lazy-owner-route')return undefined;
   if(args.importer===registryFile&&args.kind==='dynamic-import'&&args.path.startsWith('./owner-'))return{path:'owner-lazy-loader:'+args.path,external:true};
   throw Error('Unexpected registry dependency '+args.path);
  });
  if(registrySource!==undefined)builder.onLoad({filter:/owner-nonberlin-lazy\.ts$/},args=>args.path===registryFile?{contents:registrySource,loader:'ts'}:undefined);
 }}]});
 const text=result.outputFiles[0].text,calls=(text.match(/import\("owner-lazy-loader:/g)??[]).length;
 const loader={calls:[],handler:undefined};globalThis[loaderKey]=specifier=>{loader.calls.push(specifier);if(!loader.handler)throw Error('No fixture loader for '+specifier);return loader.handler(specifier);};
 const registry=await import('data:text/javascript;base64,'+Buffer.from(text.replaceAll('import("owner-lazy-loader:',`globalThis[${JSON.stringify(loaderKey)}]("`)+`\n//# sourceURL=owner-lazy-registry-${serial}.mjs`).toString('base64'));
 return{registry,loader,dynamicImports:calls,close(){delete globalThis[loaderKey];}};
}
