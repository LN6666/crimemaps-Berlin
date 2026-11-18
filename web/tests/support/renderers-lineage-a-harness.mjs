// White-box harness for the lineage-a building renderers (root500, infill,
// bremen). One esbuild graph carries the actual page ledger, page store,
// program owner, solar preparation and projected shadow mask, so class and
// registry identities are shared. Renderer functions are taken verbatim from
// the production TypeScript (AST by name), type-stripped and evaluated with a
// fixture object as their scope; a fixture supplies only the boundaries it
// isolates. Nothing here builds the app, opens a browser or uses a GPU.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

export const web=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(path.join(web,'package.json'));
const ts=require('typescript'),esbuild=require('esbuild');

const entry=[
 "export {createProgramPreparationOwner,isProgramPreparationPending,isProgramPreparationBudgetWait,ProgramPreparationPending,ProgramPreparationFailure} from './render-runtime/program-preparation';",
 "export {createResourceBudget} from './render-runtime/resource-budget';",
 "export {createChunkResourceStore,bindChunkResourceContext} from './render-runtime/chunk-resource-store';",
 "export {solarShadowPreparation,prepareSolarShadowResources,solarShadowPreparationNeedsFrame,createSolarShadowPreparationBudget} from './solar-shadow-preparation';",
 "export {createProjectedShadowMask} from './projected-shadow-mask';",
].join('\n');
const built=await esbuild.build({stdin:{contents:entry,resolveDir:path.join(web,'src/safety'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022',logLevel:'silent'});
export const runtime=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=renderers-lineage-a-runtime.mjs').toString('base64'));

export const PROVIDERS=Object.freeze(['root500','infill','bremen']);
const texts=new Map();
export function rendererText(provider){if(!texts.has(provider))texts.set(provider,fs.readFileSync(path.join(web,`src/painted/${provider}/safety/building-mesh-renderer.ts`),'utf8'));return texts.get(provider);}

/** Production TypeScript of a named function, object-literal method, variable
 * initializer, or the if-statement whose condition starts with `prefix`. */
export function sourceOf(provider,name,{kind='function',occurrence=0}={}){
 const text=rendererText(provider),ast=ts.createSourceFile(provider+'.ts',text,ts.ScriptTarget.Latest,true),found=[];
 (function visit(node){
  if(kind==='function'&&ts.isFunctionDeclaration(node)&&node.name?.text===name)found.push(node.getText(ast).replace(/^export\s+/,''));
  else if(kind==='method'&&ts.isMethodDeclaration(node)&&node.name.getText(ast)===name)found.push('function '+node.getText(ast));
  else if(kind==='variable'&&ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name&&node.initializer)found.push(node.initializer.getText(ast));
  else if(kind==='if'&&ts.isIfStatement(node)&&node.expression.getText(ast).startsWith(name))found.push(node.getText(ast));
  ts.forEachChild(node,visit);
 })(ast);
 if(found.length<=occurrence)throw Error(`${provider}: missing production ${kind} ${name}`);
 return found[occurrence];
}

/** Fixture scope: production closures read and write `values`; any other name
 * resolves to a global, so a missing stub fails loudly when it is called. */
function scope(values){return new Proxy(values,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});}
/** Type-strip one TypeScript expression or function and evaluate it in scope. */
export function evaluate(code,values){const js=esbuild.transformSync('('+code+')',{loader:'ts',target:'es2022'}).code.trim().replace(/;$/,'');return Function('env','with(env){return ('+js+'\n)}')(scope(values));}
/** Install named production functions of a provider into one fixture scope. */
export function install(provider,values,names,kind='function'){for(const name of names)values[name]=evaluate(sourceOf(provider,name,{kind}),values);return values;}
/** A statement (for example an if/else) as a callable with the fixture scope. */
export function statement(provider,prefix,values){return evaluate('()=>{'+sourceOf(provider,prefix,{kind:'if'})+'}',values);}

/** The context scheduler runs on setTimeout turns; capture and drain them. */
export function turns(){
 const queue=[];
 const turn=work=>{const previous=globalThis.setTimeout;globalThis.setTimeout=fn=>(queue.push(fn),queue.length);try{return work();}finally{globalThis.setTimeout=previous;}};
 const drain=(limit=500)=>turn(()=>{let steps=0;while(queue.length){if(++steps>limit)throw Error('unbounded fixture preparation');queue.shift()();}return steps;});
 return{queue,turn,drain};
}

/** WebGL2 stand-in for program preparation, the page store fence and the R8 mask. */
export function mockGL(){
 const names='VERTEX_SHADER FRAGMENT_SHADER COMPILE_STATUS LINK_STATUS VIEWPORT DRAW_FRAMEBUFFER_BINDING CURRENT_PROGRAM VERTEX_ARRAY_BINDING ACTIVE_TEXTURE DEPTH_WRITEMASK DEPTH_FUNC DEPTH_RANGE STENCIL_WRITEMASK STENCIL_BACK_WRITEMASK BLEND_SRC_RGB BLEND_DST_RGB BLEND_SRC_ALPHA BLEND_DST_ALPHA BLEND_EQUATION_RGB BLEND_EQUATION_ALPHA COLOR_WRITEMASK TEXTURE_BINDING_2D SAMPLER_BINDING MAX_TEXTURE_SIZE DRAW_FRAMEBUFFER TEXTURE_2D TEXTURE0 DEPTH_TEST STENCIL_TEST SCISSOR_TEST CULL_FACE BLEND FRONT BACK FUNC_ADD FUNC_SUBTRACT FUNC_REVERSE_SUBTRACT MIN MAX LEQUAL SRC_ALPHA ONE_MINUS_SRC_ALPHA ONE R8 RED UNSIGNED_BYTE TEXTURE_MIN_FILTER TEXTURE_MAG_FILTER NEAREST TEXTURE_WRAP_S TEXTURE_WRAP_T CLAMP_TO_EDGE COLOR_ATTACHMENT0 FRAMEBUFFER_COMPLETE COLOR TRIANGLES SYNC_GPU_COMMANDS_COMPLETE ALREADY_SIGNALED CONDITION_SATISFIED TIMEOUT_EXPIRED WAIT_FAILED'.split(' ');
 const gl=Object.fromEntries(names.map((n,i)=>[n,i+1])),values=new Map(),enabled=new Set(),textures=new Map(),samplers=new Map();let serial=0;
 values.set(gl.VIEWPORT,[0,0,64,48]);values.set(gl.DRAW_FRAMEBUFFER_BINDING,{scene:true});values.set(gl.CURRENT_PROGRAM,null);values.set(gl.VERTEX_ARRAY_BINDING,null);values.set(gl.ACTIVE_TEXTURE,gl.TEXTURE0);values.set(gl.DEPTH_WRITEMASK,true);values.set(gl.DEPTH_FUNC,gl.LEQUAL);values.set(gl.DEPTH_RANGE,[0,1]);values.set(gl.STENCIL_WRITEMASK,255);values.set(gl.STENCIL_BACK_WRITEMASK,255);
 for(const [k,v]of [[gl.BLEND_SRC_RGB,gl.SRC_ALPHA],[gl.BLEND_DST_RGB,gl.ONE_MINUS_SRC_ALPHA],[gl.BLEND_SRC_ALPHA,gl.ONE],[gl.BLEND_DST_ALPHA,gl.ONE_MINUS_SRC_ALPHA],[gl.BLEND_EQUATION_RGB,gl.FUNC_ADD],[gl.BLEND_EQUATION_ALPHA,gl.FUNC_ADD],[gl.COLOR_WRITEMASK,[true,true,true,true]],[gl.MAX_TEXTURE_SIZE,8192]])values.set(k,v);
 const resource=kind=>({id:++serial,kind}),storage=[],programs=[];
 Object.assign(gl,{lost:false,storage,programs,
  isContextLost:()=>gl.lost,getExtension:()=>null,getError:()=>0,
  getParameter(k){if(k===gl.TEXTURE_BINDING_2D)return textures.get(values.get(gl.ACTIVE_TEXTURE))??null;if(k===gl.SAMPLER_BINDING)return samplers.get(values.get(gl.ACTIVE_TEXTURE))??null;return values.get(k);},
  createShader:type=>({...resource('shader'),type}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,getShaderInfoLog:()=>'',deleteShader(){},attachShader(){},detachShader(){},bindAttribLocation(){},
  createProgram:()=>{const value=resource('program');programs.push(value);return value;},linkProgram(){},getProgramParameter:()=>true,getProgramInfoLog:()=>'',deleteProgram(){},isProgram:v=>v?.kind==='program',
  createFramebuffer:()=>resource('framebuffer'),createTexture:()=>resource('texture'),createVertexArray:()=>resource('vao'),deleteFramebuffer(){},deleteTexture(){},deleteVertexArray(){},
  isEnabled:k=>enabled.has(k),enable:k=>enabled.add(k),disable:k=>enabled.delete(k),activeTexture:k=>values.set(gl.ACTIVE_TEXTURE,k),bindTexture:(_t,v)=>textures.set(values.get(gl.ACTIVE_TEXTURE),v),bindSampler:(unit,v)=>samplers.set(gl.TEXTURE0+unit,v),
  bindFramebuffer:(_t,v)=>values.set(gl.DRAW_FRAMEBUFFER_BINDING,v),texImage2D:(...args)=>storage.push({width:args[3],height:args[4]}),texParameteri(){},framebufferTexture2D(){},checkFramebufferStatus:()=>gl.FRAMEBUFFER_COMPLETE,clearBufferfv(){},
  viewport:(...v)=>values.set(gl.VIEWPORT,v),depthMask:v=>values.set(gl.DEPTH_WRITEMASK,v),depthFunc:v=>values.set(gl.DEPTH_FUNC,v),colorMask:(...v)=>values.set(gl.COLOR_WRITEMASK,v),stencilMaskSeparate(){},
  blendEquationSeparate:(a,b)=>{values.set(gl.BLEND_EQUATION_RGB,a);values.set(gl.BLEND_EQUATION_ALPHA,b);},blendFuncSeparate(){},useProgram:v=>values.set(gl.CURRENT_PROGRAM,v),bindVertexArray:v=>values.set(gl.VERTEX_ARRAY_BINDING,v),
  getUniformLocation:(_p,n)=>n,uniform1i(){},uniform1f(){},uniform2f(){},uniform3fv(){},uniform3f(){},uniform2fv(){},uniformMatrix4fv(){},drawElements(){},drawArrays(){},
  fenceSync:()=>({id:++serial}),flush(){},deleteSync(){},clientWaitSync:()=>gl.ALREADY_SIGNALED,
 });
 return gl;
}

/** A page ledger bound to the context, with a blocker that leaves `free` bytes. */
export function ledger(gl,{limitBytes=1<<20,free=limitBytes}={}){
 const budget=runtime.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,1<<16)}),store=runtime.createChunkResourceStore({budget});runtime.bindChunkResourceContext(gl,store);
 const blocker=free<limitBytes?budget.reserve({category:'texture',bytes:limitBytes-free,precision:'exact',label:'lineage-a fixture blocker'}):undefined;
 return{budget,store,blocker};
}

/** A shared-key recipe whose source claim is `bytes` on the page ledger. */
export function recipe(provider,key,bytes=4096){
 return{sharedKey:'renderers-lineage-a-'+provider,resource:provider+':fixture:'+key,inputs:[provider,key],budget:{sourceBytesUpperBound:bytes},priority:'visible',current:()=>true,build(){return{vertex:'vertex '+key,fragment:'fragment '+key,attributes:['a_position']};}};
}

/** A MapLibre surface stand-in that counts repaint requests. */
export function fixtureMap(){const map={repaints:0,triggerRepaint(){map.repaints++;},on(){},off(){}};return map;}
