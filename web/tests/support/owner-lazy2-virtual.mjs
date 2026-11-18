// Fixtures for the lazily loaded stage-wrapper originals (owner-lazy-2). They
// bundle the actual root500 or infill owner aggregate with the actual registry,
// the actual 35 stage wrappers, lazy-owner-route, the wrappers' small identity /
// material modules and infill-owner-preparation. Every original builder of the
// 85 registry routes and the 35 stage routes is a tiny virtual module that
// records its load, data preparation and calls; every other aggregate dependency
// is a generic stub. No original builder, model table, data asset, shader or GPU
// state is opened or evaluated here.
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {existsSync,readFileSync} from 'node:fs';
import {build} from 'esbuild';
import ts from 'typescript';
import {web} from './owner-lazy-closure.mjs';
import {registryContracts} from './owner-lazy-fixtures.mjs';

export const rootDir=path.join(web,'src/painted/root500/safety');
export const infillDir=path.join(web,'src/painted/infill/safety');
export const rootAggregate=path.join(rootDir,'owner-reconstruction.ts');
export const infillAggregate=path.join(infillDir,'owner-reconstruction.ts');
export const registryFile=path.join(rootDir,'owner-nonberlin-lazy.ts');
const helperFile=path.join(rootDir,'lazy-owner-route.ts');
const zero=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
let serial=0;

/** The 35 stage wrappers the canonical aggregate binds ('./owner-*-lazy' except
 * the registry), each with its single dynamic original and route contract, read
 * with the TypeScript AST and the wrapper/original texts. */
export async function stageWrapperRoutes(aggregate=rootAggregate){
 const text=await readFile(aggregate,'utf8'),ast=ts.createSourceFile(aggregate,text,ts.ScriptTarget.Latest,true),out=[];
 for(const node of ast.statements){
  if(!ts.isImportDeclaration(node)||node.importClause?.isTypeOnly)continue;const specifier=node.moduleSpecifier.text;
  if(!/^\.\/owner-.*-lazy$/.test(specifier)||specifier==='./owner-nonberlin-lazy'||!node.importClause?.namedBindings||!ts.isNamedImports(node.importClause.namedBindings))continue;
  const names=node.importClause.namedBindings.elements.map(element=>(element.propertyName??element.name).text),file=path.join(rootDir,specifier.slice(2)+'.ts'),wrapperText=await readFile(file,'utf8'),wrapperAST=ts.createSourceFile(file,wrapperText,ts.ScriptTarget.Latest,true),dynamic=[];
  (function visit(child){if(ts.isCallExpression(child)&&child.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteral(child.arguments[0]))dynamic.push(child.arguments[0].text);ts.forEachChild(child,visit);})(wrapperAST);
  if(new Set(dynamic).size!==1)throw Error(specifier+' must name one dynamic original');
  const reconstruct=names.find(name=>!name.startsWith('prepare')&&name.endsWith('Reconstruction')),materials=names.find(name=>name.endsWith('BaseMaterials')),identity=names.find(name=>name.endsWith('Identity'));
  const original=path.join(rootDir,dynamic[0].slice(2)+'.ts'),originalText=await readFile(original,'utf8');
  const arities=JSON.parse(originalText.match(/export const root500DataFunctionArities:Record<string,number>=(\{[^}]*\});/)?.[1]??'{}');
  const reexports=[...originalText.matchAll(/^export \{([^}]*)\} from '(\.\/[^']+)';$/gm)].map(m=>({names:m[1].split(','),specifier:m[2]}));
  const routeCall=wrapperText.match(/createLazyOwnerRoute\('(\w+)',needed,(true|false)/);if(!routeCall||routeCall[1]!==reconstruct)throw Error(specifier+' must route '+reconstruct);
  const gate=wrapperText.match(/const materialNeeded=\(c:BuildingComponent\)=>([^;]*);/)?.[1];
  const ids=[];for(const source of [wrapperText,...reexports.concat([...wrapperText.matchAll(/from '(\.\/[\w-]+-(?:identities|stateless))'/g)].map(m=>({specifier:m[1]}))).map(r=>readFileSync(path.join(rootDir,r.specifier+'.ts'),'utf8'))])for(const m of source.matchAll(/const \w+_IDS(?::[^=]*)?=(\[.*?\]);/g))ids.push(...JSON.parse(m[1]));
  out.push({specifier,file,names,reconstruct,materials,identity,original,originalKey:dynamic[0].slice(2),arities,reexports,copyNoMatch:routeCall[2]==='true',
   neededCity:wrapperText.match(/(?:needed|reconstructionNeeded)=\(c:BuildingComponent\)=>c\.city===["'](\w+)["']/)?.[1]??null,
   materialRule:gate?{city:gate.match(/c\.city===['"](\w+)['"]/)?.[1]??null,identity:/Identity\(c\)|_IDS\.some/.test(gate),markers:[...gate.matchAll(/displayEstimates(?: as any\))?\??\.(\w+)/g)].map(m=>m[1])}:undefined,
   ids:[...new Map(ids.map(id=>[id.objectId+'|'+id.partId,id])).values()]});
 }
 return out;
}

/** Shared virtual-original behaviour: an original acts on rows of its identity
 * (and city, when its demand is city-scoped) and otherwise returns its certified
 * no-match container; materials follow the original's own material condition. */
function createState(routes){
 const byKey=new Map(routes.map(route=>[route.key,route])),gates=new Map(),index=new Map(routes.map((route,i)=>[route.key,i]));
 const state={loads:[],prepares:[],calls:[],writes:[],scopes:[],events:[],byKey,
  acts(route,c,identity){return(route.neededCity==null||c.city===route.neededCity)&&identity(c);},
  registryIdentity(route,c){return route.ids.some(i=>(!route.cityAware||i.city===c.city)&&i.objectId===c.objectId&&i.partId===c.partId);},
  gate(key){return gates.get(key)?.promise;},
  hold(key){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});gates.set(key,{promise});return{release:()=>{gates.delete(key);resolve();},fail:error=>{gates.delete(key);reject(error);}};},
  reconstruct(key,identity,components,scope,argc){
   const route=byKey.get(key);state.scopes.push({name:route.reconstruct,argc,scope});
   if(!components.some(c=>state.acts(route,c,identity)))return{components:route.copyNoMatch?components.map(c=>c):components,stats:zero()};
   state.calls.push(route.reconstruct);state.events.push('call:'+route.reconstruct);const stats=zero();
   const out=components.map(c=>{if(!state.acts(route,c,identity))return c;stats.objects++;stats.vertices+=3;stats.triangles++;stats.originalVertices+=3;stats.components.push({objectId:c.objectId,partId:c.partId,route:route.reconstruct});return{...c,chain:[...(c.chain??[]),route.reconstruct]};});
   return{components:out,stats};
  },
  materials(key,identity,components,paint,frames,scope,argc){
   const route=byKey.get(key),rule=route.materialRule;state.scopes.push({name:route.materials,argc,scope});let offset=0,objects=0,vertices=0;
   for(const c of components){const count=c.batches.reduce((n,b)=>n+b.positions.length/3,0),active=rule?(rule.city===null||c.city===rule.city)&&(!rule.identity||identity(c))&&rule.markers.some(m=>c.displayEstimates?.[m]!==undefined):state.acts(route,c,identity);if(active&&c.displayEstimates?.fixture){objects++;for(let j=0;j<count;j++){paint[4*(offset+j)]=index.get(key)+1;frames[5*(offset+j)]=-(index.get(key)+1);vertices++;}state.writes.push(route.materials);}offset+=count;}
   return{objects,vertices,actualVisualAccepted:false};
  },
  async prepare(key,identity,components,signal,scope){
   const route=byKey.get(key);signal.throwIfAborted();if(!components.some(c=>state.acts(route,c,identity)))return;
   state.prepares.push({name:route.reconstruct,scope,rows:components.filter(c=>state.acts(route,c,identity)).map(c=>c.partId)});state.events.push('prepare:'+route.reconstruct);
   const gate=gates.get('data:'+key);if(gate)await gate.promise;signal.throwIfAborted();
  },
  other(name,args){
   if(/^get/.test(name))return()=>false;
   if(/Identity/.test(name))return false;
   if(/RemoveDuplicateNativeParts$/.test(name))return args[0];
   if(/Reconstruction/.test(name))return{components:args[0],stats:zero(),cofaceStats:{fixture:true}};
   if(/Materials|MaterialFrames|^apply|^retire|^prepare/.test(name))return undefined;
   if(name==='ownerF154RecoveredSources')return args[0];
   return{components:args[0],stats:zero(),cofaceStats:{fixture:true}};
  }};
 return state;
}
function virtualOriginal(stateKey,route,extra){
 const s=`globalThis[${JSON.stringify(stateKey)}]`,key=JSON.stringify(route.key),lines=[`${s}.loads.push(${key});${s}.events.push('load:'+${key});`,`await ${s}.gate(${key});`],defined=new Set([route.reconstruct,'root500DataFunctionArities','prepareRoot500Data']);
 let identity='__identity',materials=true;
 if(route.kind==='registry'){lines.push(`export const root500DataFunctionArities=${JSON.stringify({[route.reconstruct]:1})};`,`export function ${route.identity}(c){return ${s}.registryIdentity(${s}.byKey.get(${key}),c);}`);identity=route.identity;defined.add(route.identity);}
 else{
  lines.push(`export const root500DataFunctionArities=${JSON.stringify(route.arities)};`);
  for(const r of route.reexports){lines.push(`export {${r.names.join(',')}} from ${JSON.stringify(path.join(rootDir,r.specifier)+'.ts')};`);for(const name of r.names)defined.add(name);}
  const from=route.reexports.find(r=>r.names.includes(route.identity));
  // An identity defined inside the original is reached through the wrapper's equal copy.
  lines.push(`import {${route.identity} as __identity} from ${JSON.stringify(from?path.join(rootDir,from.specifier)+'.ts':route.wrapper)};`);
  if(!from){lines.push(`export {${route.identity}} from ${JSON.stringify(route.wrapper)};`);defined.add(route.identity);}
  materials=!defined.has(route.materials);
 }
 lines.push(`export function ${route.reconstruct}(components,scope){return ${s}.reconstruct(${key},${identity},components,scope,arguments.length);}`);
 if(materials){lines.push(`export function ${route.materials}(components,paint,frames,scope){return ${s}.materials(${key},${identity},components,paint,frames,scope,arguments.length);}`);defined.add(route.materials);}
 lines.push(`export function prepareRoot500Data(components,signal,scope){return ${s}.prepare(${key},${identity},components,signal,scope);}`);
 for(const name of extra)if(!defined.has(name))lines.push(`export function ${name}(...args){return ${s}.other(${JSON.stringify(name)},args);}`);
 return lines.join('\n')+'\n';
}
function relativeBindings(text){
 const names=new Map();
 for(const m of text.matchAll(/(?:import|export)\s*\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g)){const set=names.get(m[2])??new Set();for(const binding of m[1].split(',')){const name=binding.trim();if(!name||name.startsWith('type '))continue;set.add(name.split(' as ')[0].trim());}names.set(m[2],set);}
 return names;
}
const stub=(stateKey,names)=>[...names].map(name=>`export function ${name}(...args){return globalThis[${JSON.stringify(stateKey)}].other(${JSON.stringify(name)},args);}`).join('\n')+'\nexport const root500DataFunctionArities={};\nexport function prepareRoot500Data(){}\n';

/** All route contracts keyed by original module path: 85 registry routes and 35 stage wrappers. */
export async function ownerRouteContracts(){
 const routes=new Map();
 for(const c of await registryContracts())routes.set(path.join(rootDir,c.moduleKey+'.ts'),{kind:'registry',key:c.moduleKey,city:c.city,reconstruct:c.reconstruct,materials:c.materials,identity:c.identity,copyNoMatch:c.copyNoMatch,neededCity:c.neededCity,ids:c.ids,cityAware:c.cityAware});
 for(const w of await stageWrapperRoutes())routes.set(w.original,{kind:'wrapper',key:w.originalKey,reconstruct:w.reconstruct,materials:w.materials,identity:w.identity,copyNoMatch:w.copyNoMatch,neededCity:w.neededCity,ids:w.ids,arities:w.arities,reexports:w.reexports,materialRule:w.materialRule,wrapper:w.file});
 return routes;
}

/** Bundle the actual root500 ('root500') or infill ('infill') owner aggregate
 * over the virtual originals; returns the aggregate module and the shared state. */
export async function bundleOwnerAggregate(target,routes){
 const stateKey='__ownerLazy2Virtual'+(++serial),state=createState([...routes.values()]);globalThis[stateKey]=state;
 const aggregate=target==='infill'?infillAggregate:rootAggregate,bindings=relativeBindings(await readFile(aggregate,'utf8'));
 const shim=specifier=>{const file=path.join(infillDir,specifier)+'.ts';if(!existsSync(file))return undefined;const m=readFileSync(file,'utf8').match(/^(?:\/\/[^\n]*\n)?export \* from '(\.\.\/\.\.\/root500\/safety\/[^']+)';\s*$/);return m?path.join(infillDir,m[1])+'.ts':undefined;};
 const isWrapper=file=>file.startsWith(rootDir+path.sep)&&/-lazy\.ts$/.test(file);
 const result=await build({entryPoints:[aggregate],bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent',plugins:[{name:'owner-lazy2-virtual',setup(builder){
  builder.onResolve({filter:/.*/},args=>{
   if(args.kind==='entry-point')return undefined;
   if(args.namespace==='owner-lazy2-original'){if(!path.isAbsolute(args.path))throw Error('Virtual original import '+args.path);return{path:args.path};}
   if(args.importer===aggregate){
    const file=path.resolve(path.dirname(aggregate),args.path)+'.ts';
    if(routes.has(file))return{path:file,namespace:'owner-lazy2-original'};
    if(target==='infill'&&routes.has(shim(args.path)))return{path:shim(args.path),namespace:'owner-lazy2-original'};
    if(file===registryFile||file===helperFile||isWrapper(file)||file===path.join(infillDir,'infill-owner-preparation.ts'))return{path:file};
    if(args.path.startsWith('./'))return{path:args.path,namespace:'owner-lazy2-stub'};
   }
   if(args.importer===registryFile||isWrapper(args.importer)){
    const file=path.resolve(rootDir,args.path)+'.ts';
    if(args.kind==='dynamic-import'){if(!routes.has(file))throw Error('Unknown original '+args.path);return{path:file,namespace:'owner-lazy2-original'};}
    if(file===helperFile||/-(identities|stateless|materials)\.ts$/.test(file))return{path:file};
   }
   if(/-(identities|stateless|materials)\.ts$/.test(args.importer)){const file=path.resolve(rootDir,args.path)+'.ts';if(/-(identities|stateless|materials)\.ts$/.test(file))return{path:file};}
   throw Error('Unexpected value dependency '+args.path+' from '+path.relative(web,args.importer||'?'));
  });
  builder.onLoad({filter:/.*/,namespace:'owner-lazy2-original'},args=>{
   const extra=new Set();for(const [specifier,names]of bindings){const file=path.resolve(path.dirname(aggregate),specifier)+'.ts';if(file===args.path||target==='infill'&&shim(specifier)===args.path)for(const name of names)extra.add(name);}
   return{contents:virtualOriginal(stateKey,routes.get(args.path),extra),loader:'js',resolveDir:rootDir};
  });
  builder.onLoad({filter:/.*/,namespace:'owner-lazy2-stub'},args=>({contents:stub(stateKey,bindings.get(args.path)??[]),loader:'js'}));
 }}]});
 const owner=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text+`\n//# sourceURL=owner-lazy2-${target}-${serial}.mjs`).toString('base64'));
 return{owner,state,close(){delete globalThis[stateKey];}};
}

/** A batch scope with the memo the infill aggregate builds its closures in. */
export function fixtureScope(label='batch-scope'){const memos=new Map();return{label,memo(key,make){if(!memos.has(key))memos.set(key,make());return memos.get(key);},async prepare(){},release(){}};}
/** One fixture row; `extra` lands in displayEstimates next to the material flag. */
export const fixtureRow=(city,objectId,partId,extra={})=>({city,objectId,partId,batches:[{positions:[0,0,0,1,0,0,0,1,0]}],displayEstimates:{fixture:true,...extra}});
