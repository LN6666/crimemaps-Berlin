// Scope fixtures for the City, Tier300 and Church building renderers.
//
// The production program owner, page ResourceBudget, chunk store and solar
// preparation helpers come from one esbuild module graph (one class identity).
// Renderer declarations are their own text, read from the source file through
// the TypeScript AST and evaluated against a small state object: a fixture
// names every binding a declaration reads that matters to the assertion; any
// other free name resolves to an inert stand-in, so unrelated bookkeeping
// calls (prune, reconcile, invalidate) neither throw nor take part.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

export const web=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(path.join(web,'package.json'));
export const ts=require('typescript');
const esbuild=require('esbuild');

const entry=["export {createProgramPreparationOwner,isProgramPreparationPending,isProgramPreparationBudgetWait,ProgramPreparationPending} from './render-runtime/program-preparation';",
 "export {currentPaintProgramGroups} from './current-paint-program-groups';",
 "export {createResourceBudget} from './render-runtime/resource-budget';",
 "export {createChunkResourceStore,bindChunkResourceContext,getPageChunkResourceStore} from './render-runtime/chunk-resource-store';",
 "export {solarShadowPreparation,prepareSolarShadowResources,solarShadowPreparationNeedsFrame,createSolarShadowPreparationBudget} from './solar-shadow-preparation';",
 // The production Rathaus mask on this graph's own page store (one ledger).
 "export {createRathausProxyMasks} from './facade-rathaus-proxy-mask';"].join('\n');
const built=await esbuild.build({stdin:{contents:entry,resolveDir:path.join(web,'src/safety'),sourcefile:'renderers-city-tier-church-runtime.ts',loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022',logLevel:'silent'});
export const runtime=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=renderers-city-tier-church-runtime.mjs').toString('base64'));

export const rendererPath=provider=>path.join(web,`src/painted/${provider}/safety/building-mesh-renderer.ts`);
const sources=new Map();
/** Source text and AST of one provider renderer. */
export function renderer(provider){
 let value=sources.get(provider);
 if(!value){const text=fs.readFileSync(rendererPath(provider),'utf8');value={text,ast:ts.createSourceFile(provider+'.ts',text,ts.ScriptTarget.Latest,true)};sources.set(provider,value);}
 return value;
}
/** Every node of a renderer's AST that satisfies `match`. */
export function nodes(provider,match){
 const {ast}=renderer(provider),found=[];(function visit(node){if(match(node,ast))found.push(node);ts.forEachChild(node,visit);})(ast);return found;
}
/** The text of a named function declaration, object method or variable initializer. */
export function declaration(provider,name){
 const {ast}=renderer(provider),found=nodes(provider,node=>(ts.isFunctionDeclaration(node)&&node.name?.text===name)||(ts.isMethodDeclaration(node)&&node.name.getText(ast)===name)||(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name&&!!node.initializer));
 assert.equal(found.length,1,provider+' declares '+name+' once');
 const node=found[0];return ts.isVariableDeclaration(node)?node.initializer.getText(ast):(ts.isMethodDeclaration(node)?'function ':'')+node.getText(ast);
}
/** Callable and property-transparent: an inert stand-in for unnamed bindings. */
export const inert=new Proxy(function inert(){},{get:(_target,key)=>key===Symbol.toPrimitive?()=>0:key==='then'?undefined:inert,apply:()=>undefined,construct:()=>({})});
/** Evaluate declarations against `state`: reads and writes go to the state;
 * a name the state does not hold reads a global, or else the inert stand-in.
 * `rewrite` (name -> text -> text) is for mutation checks only: each rewrite
 * must change its declaration's source text, so a stale one fails loudly. */
export function bind(provider,names,state,rewrite={}){
 const scope=new Proxy(state,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:key in globalThis?globalThis[key]:inert,set:(target,key,value)=>(target[key]=value,true)});
 for(const name of Object.keys(rewrite))assert(names.includes(name),'rewrite of an unbound declaration '+name);
 for(const name of names){let text=declaration(provider,name);if(rewrite[name]){const next=rewrite[name](text);assert.notEqual(next,text,'the '+provider+' '+name+' rewrite applies');text=next;}const js=ts.transpileModule('('+text+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'');state[name]=Function('scope','with(scope){return '+js+'}')(scope);}
 return state;
}
/** Logical bytes of one category on a ledger. */
export const categoryBytes=(budget,category)=>budget.stats.categories?.[category]?.bytes??0;

function fakeGL(){
 let id=0;
 return{VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,COMPILE_STATUS:4,SYNC_GPU_COMMANDS_COMPLETE:6,ALREADY_SIGNALED:7,CONDITION_SATISFIED:8,TIMEOUT_EXPIRED:9,WAIT_FAILED:10,lost:false,
  isContextLost(){return this.lost;},getExtension:()=>null,createShader:type=>({id:++id,type}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,getShaderInfoLog:()=>'',
  createProgram:()=>({id:++id,program:true}),attachShader(){},detachShader(){},deleteShader(){},bindAttribLocation(){},linkProgram(){},getProgramParameter:()=>true,getProgramInfoLog:()=>'',
  deleteProgram(program){program.deleted=true;},fenceSync:()=>({}),flush(){},clientWaitSync:()=>7,deleteSync(){},createVertexArray:()=>({vao:++id}),getParameter:()=>16};
}

/**
 * A real program owner on a real page ledger (1000 logical bytes) and store.
 * `recipe(name)` is a private budgeted program demand (512 B source bound plus a
 * 128 B driver allowance); `block()` holds 900 B so that demand is refused and
 * the owner waits on the ledger's onAvailable wake. The owner's repaint is the
 * map's: `map.repaints` counts both the renderer's own frame requests and the
 * owner's wake. Scheduler turns are captured, never run on a real timer.
 */
export function budgetFixture(){
 const queue=[],previous=globalThis.setTimeout;globalThis.setTimeout=fn=>(queue.push(fn),queue.length);
 const budget=runtime.createResourceBudget({limitBytes:1000,recentLimitBytes:0}),store=runtime.createChunkResourceStore({budget}),gl=fakeGL();runtime.bindChunkResourceContext(gl,store);
 const map={repaints:0,triggerRepaint(){map.repaints++;}},owner=runtime.createProgramPreparationOwner('renderers city tier church budget wait',()=>map.triggerRepaint());
 // One exact recipe per name, as a renderer retries the same demand each frame.
 let blocker;const recipes=new Map();
 const recipe=(name='colour')=>{let value=recipes.get(name);if(!value)recipes.set(name,value={resource:name,priority:'visible',inputs:['fixture:'+name],budget:{sourceBytesUpperBound:512,submittedAllowanceBytes:128},build:()=>({vertex:'vertex',fragment:'fragment '+name,attributes:['a_position']})});return value;};
 return{budget,store,gl,map,owner,queue,recipe,
  /** One compile demand: a held budget wait while blocked, else ordinary pending. */
  compile:(name='colour')=>owner.compile(gl,recipe(name)),
  block(){blocker=budget.reserve({category:'construction',bytes:900,precision:'exact'});return blocker;},
  unblock(){blocker?.release();blocker=undefined;},
  dispose(){blocker?.release();owner.dispose();try{let n=0;while(queue.length){assert(++n<1000,'bounded fixture turns');queue.shift()();}}finally{globalThis.setTimeout=previous;}store.collectRetired();store.destroy();},
 };
}
