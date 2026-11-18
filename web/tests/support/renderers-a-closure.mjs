// Closure-retention fixtures for the building renderers' chunk acquisitions
// (renderers-a, third stage; WAVE3-BACKLOG 03:25 Stage 3 "onChange becomes
// repaintMap; WeakRef tests for 6 families").
//
// The page chunk store keeps a lease's onChange listener for the lease's whole
// life (the premise test checks this on the real store). A renderer that hands
// the store an inline arrow made inside its packing loop therefore pins that
// loop's scope, and through it the candidate, the batch scope and the packing
// rows, for as long as the packed chunk is resident. Each case below takes the
// renderer's actual call expression from the production TypeScript (AST, by
// callee and enclosing function), type-strips it, and evaluates it inside one
// function whose locals stand for the renderer's per-candidate packing scope.
// Renderer-level names (map, repaintMap, the material writers) come from a
// separate fixture scope, so only a callback that captures the per-candidate
// scope can keep its sentinel alive. The producer, chunk-state owner, chunk
// store and page ledger are the real modules (one esbuild graph).
//
// RENDERERS_A_SOURCE_ROOT=<dir> reads <dir>/<provider>/safety/building-mesh-renderer.ts
// instead, for A/B runs against saved pre-change copies. Nothing here builds
// the app, opens a browser or uses a GPU. Run with node --expose-gc.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

export const web=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(path.join(web,'package.json'));
const ts=require('typescript'),esbuild=require('esbuild');

const entry=[
 "export {acquirePackedMeshChunk} from '../painted/root500/safety/chunk-mesh-packing';",
 "export {acquireChunkMeshState} from '../painted/root500/safety/chunk-mesh-residency';",
 "export {acquirePackedChunk,packChunkGeometry} from '../painted/delegated500/safety/renderer-packed-chunks';",
 "export {createChunkResourceStore} from './render-runtime/chunk-resource-store';",
 "export {createResourceBudget} from './render-runtime/resource-budget';",
 "export {retainReconstructionResourceParents} from './reconstruction-resource-parents';",
].join('\n');
const built=await esbuild.build({stdin:{contents:entry,resolveDir:path.join(web,'src/safety'),sourcefile:'renderers-a-closure-entry.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent'});
export const runtime=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=renderers-a-closure-runtime.mjs').toString('base64'));

export const FAMILIES=Object.freeze(['root500','infill','bremen','city','tier300','church','delegated500']);
const texts=new Map();
export function rendererFile(provider){
 const root=process.env.RENDERERS_A_SOURCE_ROOT,override=root&&path.join(root,provider,'safety/building-mesh-renderer.ts');
 return override&&fs.existsSync(override)?override:path.join(web,`src/painted/${provider}/safety/building-mesh-renderer.ts`);
}
function rendererAST(provider){
 if(!texts.has(provider)){const file=rendererFile(provider),text=fs.readFileSync(file,'utf8');texts.set(provider,{file,text,ast:ts.createSourceFile(provider+'.ts',text,ts.ScriptTarget.Latest,true)});}
 return texts.get(provider);
}
/** Production text of the n-th call to `callee` inside function `inFunction`. */
export function callText(provider,callee,inFunction,occurrence=0){
 const {ast}=rendererAST(provider),found=[];
 (function visit(node){
  if(ts.isCallExpression(node)&&node.expression.getText(ast)===callee){let owner=node.parent;while(owner&&!ts.isFunctionDeclaration(owner))owner=owner.parent;if(owner?.name?.text===inFunction)found.push(node.getText(ast));}
  ts.forEachChild(node,visit);
 })(ast);
 assert(found.length>occurrence,`${provider}: no production call ${callee} in ${inFunction}`);
 return found[occurrence];
}
/** Production initializer of a renderer-scope variable, or undefined. */
export function variableText(provider,name){
 const {ast}=rendererAST(provider);let found;
 (function visit(node){if(!found&&ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name&&node.initializer)found=node.initializer.getText(ast);ts.forEachChild(node,visit);})(ast);
 return found;
}
const strip=code=>esbuild.transformSync('('+code+')',{loader:'ts',target:'es2022'}).code.trim().replace(/;$/,'');
/** Renderer scope: production closures read and write `values`; any other
 * name resolves to a global, so a missing stub fails loudly when called. */
function rendererScope(values){return new Proxy(values,{has:(_target,key)=>key!=='__locals',get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});}
/** A renderer-scope value from its production initializer. */
export function rendererValue(provider,name,values){const text=variableText(provider,name);return text===undefined?undefined:Function('env','with(env){return ('+strip(text)+'\n)}')(rendererScope(values));}
/** A local declaration belonging to the same production function, including
 * the reconstruction helper's destructured parents/authority pair. */
function packingInitializer(provider,inFunction,name){
 const {ast}=rendererAST(provider),found=[];
 (function visit(node){
  if(ts.isVariableDeclaration(node)&&node.initializer){
   const names=ts.isIdentifier(node.name)?[node.name.text]:ts.isObjectBindingPattern(node.name)?node.name.elements.filter(element=>ts.isIdentifier(element.name)).map(element=>element.name.text):[];
   if(names.includes(name)){let owner=node.parent;while(owner&&!ts.isFunctionDeclaration(owner))owner=owner.parent;if(owner?.name?.text===inFunction)found.push({names,text:`const ${node.name.getText(ast)}=${strip(node.initializer.getText(ast))};`});}
  }
  ts.forEachChild(node,visit);
 })(ast);
 assert.equal(found.length,1,`${provider}: expected one production initializer ${name} in ${inFunction}`);return found[0];
}
/** Run the production call inside one per-candidate packing scope and return
 * its result. Every local is context-allocated (an inner closure names them
 * all), as in the renderers' loops, whose material/run callbacks capture the
 * loop scope. Requested production initializers execute inside that same scope,
 * so their callbacks cannot bypass the candidate/scope retention check. The
 * caller keeps only the result. */
export function packingCall(provider,callee,inFunction,locals,values,occurrence=0,initializers=[]){
 const names=Object.keys(locals);for(const name of names)assert.match(name,/^[A-Za-z_$][\w$]*$/);
 const bindings=initializers.map(name=>packingInitializer(provider,inFunction,name)),boundNames=bindings.flatMap(binding=>binding.names);
 assert.equal(new Set([...names,...boundNames]).size,names.length+boundNames.length,'packing initializers must not replace fixture locals');
 const body=`return function(__locals){${names.map(name=>`let ${name}=__locals.${name};`).join('')}__locals=undefined;${bindings.map(binding=>binding.text).join('')}const __scope=()=>[${[...names,...boundNames].join(',')}];void __scope;return (${strip(callText(provider,callee,inFunction,occurrence))});}`;
 return Function('env','with(env){'+body+'}')(rendererScope(values))(locals);
}

export const tick=()=>new Promise(resolve=>setImmediate(resolve));
export async function collect(rounds=8){
 assert.equal(typeof globalThis.gc,'function','Run this suite with node --expose-gc');
 for(let round=0;round<rounds;round++){await tick();globalThis.gc();}
 await tick();
}
export const alive=refs=>Object.entries(refs).filter(([,ref])=>ref.deref()!==undefined).map(([name])=>name).sort();
export const context=()=>({isContextLost:()=>false});
export const fixtureMap=()=>({repaints:0,triggerRepaint(){this.repaints++;}});

const MiB=1024*1024;
export function component(id,{vertices=6,origin=[8.8+id/1000,53.07]}={}){
 const batch=(face,offset)=>{const positions=Array.from({length:vertices*3},(_,i)=>(i*7+offset+id)%11-5),indices=Array.from({length:(vertices-2)*3},(_,i)=>(i+offset)%vertices);
  return{positions,normals:positions.map((_,i)=>i%3===1?(face==='roof'?1:.1):.5),indices,color:[.2+id/100,.4,.6],faceRole:face};};
 return{city:'bremen',objectId:'osm/way/'+id,partId:'osm/way/'+id+'/component/fixture',origin,sourceFeature:{properties:{}},batches:[batch('wall',0),batch('roof',1)]};
}
const vertexCount=rows=>rows.reduce((sum,row)=>sum+row.batches.reduce((v,b)=>v+b.positions.length/3,0),0);
/** A page ledger and store, one ready CPU source parent, one source group, and
 * a store view that records each request's onChange (the store keeps it). */
export function page(){
 const budget=runtime.createResourceBudget({limitBytes:64*MiB,recentLimitBytes:8*MiB}),real=runtime.createChunkResourceStore({budget});
 const components=[component(1),component(2,{origin:[8.81,53.06]})];
 const source=real.acquire({contentKey:'renderers-a-source',role:'source',estimate:{category:'decoded',bytes:4096,precision:'exact'},produce:()=>({components})});
 const group={contentKey:'renderers-a-group',components,parents:[source],frame:{origin:[8.8,53.07],unit:1e7,authority:'renderers-a-frame'},cohortKeys:[],materialAuthority:'m',recipeAuthority:'r',selectedLOD:'near',source:{contentKey:'renderers-a-group',parents:[source]}};
 const requests=[],store=new Proxy(real,{get(target,key){if(key==='acquire')return request=>{requests.push({onChange:request.onChange===undefined?undefined:new WeakRef(request.onChange),hasOnChange:'onChange'in request});return target.acquire(request);};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
 return{budget,store,real,source,group,components,requests,close(){source.release();real.evictRecent();}};
}
/** Material writers and run planners: module-level, they keep nothing they are given. */
const maskCosts=Object.freeze([{category:'mask',bytes:2048,precision:'exact'}]);
export function materialsFor(rows){const n=vertexCount(rows);return{paint:new Float32Array(n*5),progressive:new Float32Array(n*4)};}
export const writers={
 packChunkMaterials:rows=>({...materialsFor(rows),auxiliary:{masks:{costs:maskCosts},progressiveStatus:[]}}),
 packBremenChunkMaterials:rows=>({...materialsFor(rows),auxiliary:{masks:{costs:maskCosts},diagnosticBytes:64,progressiveStatus:{state:'unprepared'}}}),
 packTierChunkMaterials:rows=>({...materialsFor(rows),auxiliary:{maskRecipe:{costs:maskCosts}}}),
 runs:indices=>[{key:'base',firstIndex:0,indexCount:indices.length}],
 styles:()=>({wall:1,roof:33,landmark:false,sourceGlassRoof:false}),
};
/** A delegated500/Church packed group, as their builders return it. */
export function packedGroup(group){
 const n=vertexCount(group.components),packed=runtime.packChunkGeometry(group.components,group.frame,new Float32Array(n*5),new Float32Array(n*4),{merc:p=>[(p[0]+180)/360,.3+p[1]/1000],unit:latitude=>1e7*Math.cos(latitude*Math.PI/180),included:()=>true,style:()=>1,progressivePainted:()=>false,landmark:()=>false,indexedPick:true});
 return{...packed,maskRecipe:{costs:maskCosts,release(){}}};
}
/** Per-candidate packing scope: a sentinel, the candidate and the batch scope. */
export function packingScope(label){
 const sentinel={label,payload:new Uint8Array(1<<16)},candidate={label:'candidate',sentinel,args:[sentinel],repack(){return sentinel;},finishChunkPack(){return sentinel;}};
 const scope={label:'batch scope',stats:{disposed:false},retain(){return()=>{};}};
 return{sentinel,candidate,scope,refs:{sentinel:new WeakRef(sentinel),candidate:new WeakRef(candidate),scope:new WeakRef(scope)}};
}
