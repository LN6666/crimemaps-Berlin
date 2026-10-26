import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const result=await build({entryPoints:[path.join(root,'src/safety/projected-shadow-mask.ts')],bundle:true,write:false,platform:'node',format:'esm',target:'es2022'});
const {projectedShadowDepthPlane,createProjectedShadowMask}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const topDown=[1,0,0,0,0,0,-1,0,0,1,0,0,0,0,0,1];
function product(a,b){return Array.from({length:16},(_,i)=>{const r=i%4,c=Math.floor(i/4);let n=0;for(let k=0;k<4;k++)n+=a[k*4+r]*b[c*4+k];return n;});}
function project(m,p){const v=Array.from({length:4},(_,r)=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]);return v.slice(0,3).map(n=>n/v[3]);}
test('composite plane matches projected ground depth under perspective and orthographic cameras',()=>{
 const angle=.73,c=Math.cos(angle),s=Math.sin(angle),view=[1,0,0,0,0,c,s,0,0,-s,c,0,2,-8,-100,1],near=.1,far=400,f=1.7,perspective=[f,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
 for(const m of [topDown,product(perspective,view),new Float32Array(product(perspective,view))])for(const height of [.03,.13]){
  const plane=projectedShadowDepthPlane(m,height);
  for(let x=-20;x<=20;x+=4)for(let z=-30;z<=30;z+=6){const q=project(m,[x,height,z]);assert.ok(Math.abs(q[2]-(plane[0]*q[0]+plane[1]*q[1]+plane[2]))<1e-11);}
 }
 assert.throws(()=>projectedShadowDepthPlane(new Float32Array(16)),/Singular/);
 assert.throws(()=>projectedShadowDepthPlane([1,0]),/Invalid/);
});
function mockGL(){
 const names='STENCIL_WRITEMASK STENCIL_BACK_WRITEMASK FRONT BACK VIEWPORT DRAW_FRAMEBUFFER_BINDING CURRENT_PROGRAM VERTEX_ARRAY_BINDING ACTIVE_TEXTURE DEPTH_WRITEMASK DEPTH_FUNC DEPTH_RANGE BLEND_SRC_RGB BLEND_DST_RGB BLEND_SRC_ALPHA BLEND_DST_ALPHA BLEND_EQUATION_RGB BLEND_EQUATION_ALPHA COLOR_WRITEMASK TEXTURE_BINDING_2D SAMPLER_BINDING MAX_TEXTURE_SIZE DRAW_FRAMEBUFFER TEXTURE_2D TEXTURE0 DEPTH_TEST STENCIL_TEST SCISSOR_TEST CULL_FACE BLEND LEQUAL GREATER FUNC_ADD MAX ONE ZERO SRC_ALPHA ONE_MINUS_SRC_ALPHA VERTEX_SHADER FRAGMENT_SHADER COMPILE_STATUS LINK_STATUS FRAMEBUFFER_COMPLETE R8 RED UNSIGNED_BYTE TEXTURE_MIN_FILTER TEXTURE_MAG_FILTER TEXTURE_WRAP_S TEXTURE_WRAP_T NEAREST CLAMP_TO_EDGE COLOR_ATTACHMENT0 COLOR TRIANGLES'.split(' '),gl=Object.fromEntries(names.map((n,i)=>[n,i+1])),values=new Map(),enabled=new Set(),uniforms=new Map(),created=[],deleted=[],textures=new Map(),samplers=new Map();let serial=0;
 values.set(gl.STENCIL_WRITEMASK,255);values.set(gl.STENCIL_BACK_WRITEMASK,127);values.set(gl.VIEWPORT,[7,9,640,480]);values.set(gl.DRAW_FRAMEBUFFER_BINDING,{scene:true});values.set(gl.CURRENT_PROGRAM,{coverage:true});values.set(gl.VERTEX_ARRAY_BINDING,{source:true});values.set(gl.ACTIVE_TEXTURE,gl.TEXTURE0+3);values.set(gl.DEPTH_WRITEMASK,false);values.set(gl.DEPTH_FUNC,gl.LEQUAL);values.set(gl.DEPTH_RANGE,[.1,.9]);values.set(gl.COLOR_WRITEMASK,[true,true,true,true]);values.set(gl.BLEND_SRC_RGB,gl.SRC_ALPHA);values.set(gl.BLEND_DST_RGB,gl.ONE_MINUS_SRC_ALPHA);values.set(gl.BLEND_SRC_ALPHA,gl.ONE);values.set(gl.BLEND_DST_ALPHA,gl.ONE_MINUS_SRC_ALPHA);values.set(gl.BLEND_EQUATION_RGB,gl.FUNC_ADD);values.set(gl.BLEND_EQUATION_ALPHA,gl.FUNC_ADD);values.set(gl.MAX_TEXTURE_SIZE,8192);for(const k of [gl.DEPTH_TEST,gl.STENCIL_TEST,gl.SCISSOR_TEST,gl.BLEND])enabled.add(k);
 textures.set(gl.TEXTURE0,{mapTexture:true});samplers.set(gl.TEXTURE0,{mapSampler:true});
 const resource=kind=>{const v={id:++serial,kind};created.push(v);return v;};
 Object.assign(gl,{created,deleted,uniforms,textureAllocations:[],scene:[1,1,1],sceneDepth:[1,.2,1],mask:[0,0,0],composites:0,lost:false,stencilWrites:0,
  getParameter(k){if(k===gl.TEXTURE_BINDING_2D)return textures.get(values.get(gl.ACTIVE_TEXTURE))??null;if(k===gl.SAMPLER_BINDING)return samplers.get(values.get(gl.ACTIVE_TEXTURE))??null;return values.get(k);},isEnabled:k=>enabled.has(k),isContextLost:()=>gl.lost,
  enable:k=>enabled.add(k),disable:k=>enabled.delete(k),activeTexture:k=>values.set(gl.ACTIVE_TEXTURE,k),bindTexture:(_,v)=>textures.set(values.get(gl.ACTIVE_TEXTURE),v),bindSampler:(unit,v)=>samplers.set(gl.TEXTURE0+unit,v),
  createProgram:()=>resource('program'),createShader:()=>resource('shader'),createFramebuffer:()=>resource('framebuffer'),createTexture:()=>resource('texture'),createVertexArray:()=>resource('vao'),deleteProgram:v=>deleted.push(v),deleteShader:v=>deleted.push(v),deleteFramebuffer:v=>deleted.push(v),deleteTexture:v=>deleted.push(v),deleteVertexArray:v=>deleted.push(v),
  shaderSource(){},compileShader(){},attachShader(){},linkProgram(){},getShaderParameter:()=>true,getProgramParameter:()=>true,getShaderInfoLog:()=>'',getProgramInfoLog:()=>'',
  stencilMaskSeparate:(face,mask)=>values.set(face===gl.FRONT?gl.STENCIL_WRITEMASK:gl.STENCIL_BACK_WRITEMASK,mask),useProgram:v=>values.set(gl.CURRENT_PROGRAM,v),bindVertexArray:v=>values.set(gl.VERTEX_ARRAY_BINDING,v),bindFramebuffer:(_,v)=>values.set(gl.DRAW_FRAMEBUFFER_BINDING,v),viewport:(...v)=>values.set(gl.VIEWPORT,v),depthMask:v=>values.set(gl.DEPTH_WRITEMASK,v),depthFunc:v=>values.set(gl.DEPTH_FUNC,v),colorMask:(...v)=>values.set(gl.COLOR_WRITEMASK,v),
  blendEquationSeparate(a,b){values.set(gl.BLEND_EQUATION_RGB,a);values.set(gl.BLEND_EQUATION_ALPHA,b);},blendFuncSeparate(a,b,c,d){for(const [k,v]of [[gl.BLEND_SRC_RGB,a],[gl.BLEND_DST_RGB,b],[gl.BLEND_SRC_ALPHA,c],[gl.BLEND_DST_ALPHA,d]])values.set(k,v);},
  texImage2D:(...v)=>gl.textureAllocations.push(v),texParameteri(){},framebufferTexture2D(){},checkFramebufferStatus:()=>gl.FRAMEBUFFER_COMPLETE,clearBufferfv:()=>gl.mask.fill(0),getUniformLocation:(_,name)=>name,uniform1f:(k,v)=>uniforms.set(k,v),uniform2f:(k,...v)=>uniforms.set(k,v),uniformMatrix4fv:(k,_t,v)=>uniforms.set(k,Array.from(v)),uniform1i:(k,v)=>uniforms.set(k,v),uniform3f:(k,...v)=>uniforms.set(k,v),uniform3fv:(k,v)=>uniforms.set(k,v),uniform2fv:(k,v)=>uniforms.set(k,v),
  coverage(pixels,alpha){assert.equal(textures.get(gl.TEXTURE0).mapTexture,true);assert.equal(values.get(gl.CURRENT_PROGRAM).coverage,true);assert.equal(enabled.has(gl.STENCIL_TEST),false);assert.equal(enabled.has(gl.DEPTH_TEST),false);assert.equal(values.get(gl.DEPTH_WRITEMASK),false);assert.equal(values.get(gl.BLEND_EQUATION_RGB),gl.MAX);for(const i of pixels)gl.mask[i]=Math.max(gl.mask[i],Math.round(alpha*255)/255);},
  drawArrays(){gl.composites++;if(enabled.has(gl.STENCIL_TEST)&&(values.get(gl.STENCIL_WRITEMASK)||values.get(gl.STENCIL_BACK_WRITEMASK)))gl.stencilWrites++;assert.equal(values.get(gl.DRAW_FRAMEBUFFER_BINDING).scene,true);assert.equal(values.get(gl.DEPTH_WRITEMASK),false);assert.equal(values.get(gl.BLEND_EQUATION_RGB),gl.FUNC_ADD);const p=uniforms.get('u_plane'),range=uniforms.get('u_depth_range');for(let i=0;i<3;i++){const z=p[0]*(i-1)+p[2],depth=range[0]+(range[1]-range[0])*(z*.5+.5);if(depth<=gl.sceneDepth[i])if(values.get(gl.COLOR_WRITEMASK)[0])gl.scene[i]=uniforms.get('u_shadow_colour')[0]*gl.mask[i]+gl.scene[i]*(1-gl.mask[i]);}},
  snapshot:()=>JSON.stringify({values:[...values],enabled:[...enabled].sort(),textures:[...textures],samplers:[...samplers]})});return gl;
}
test('many overlapping source triangles composite once; foreground and uncovered pixels stay unchanged',()=>{
 const gl=mockGL(),mask=createProjectedShadowMask(),before=gl.snapshot();
 assert.equal(mask.draw(gl,topDown,.03,()=>{for(let n=0;n<40;n++)gl.coverage([0,1],.08);}),true);
 assert.ok(Math.abs(gl.scene[0]-(.12*(20/255)+1-20/255))<1e-12);assert.equal(gl.scene[1],1);assert.equal(gl.scene[2],1);assert.equal(gl.composites,1);assert.equal(gl.snapshot(),before);assert.deepEqual(gl.sceneDepth,[1,.2,1]);assert.equal(gl.stencilWrites,0);mask.release();
});
test('shared context target stays bounded, reuses storage, and releases after last owner',()=>{
 const gl=mockGL(),a=createProjectedShadowMask(),b=createProjectedShadowMask(),draw=m=>m.draw(gl,topDown,.03,()=>gl.coverage([0],.08));draw(a);draw(b);draw(a);
 assert.equal(gl.created.filter(x=>x.kind==='framebuffer').length,1);assert.equal(gl.created.filter(x=>x.kind==='texture').length,1);assert.equal(gl.textureAllocations.length,1);assert.equal(a.stats.bytes,640*480);
 gl.viewport(0,0,10000,10000);draw(b);assert.ok(a.stats.bytes<=12000000);assert.equal(gl.textureAllocations.length,2);
 a.release();assert.equal(gl.deleted.filter(x=>x.kind==='texture').length,0);b.release();assert.equal(gl.deleted.filter(x=>x.kind==='texture').length,1);assert.equal(gl.deleted.filter(x=>x.kind==='framebuffer').length,1);assert.equal(a.stats.bytes,0);assert.equal(b.stats.bytes,0);
});
test('draw errors restore caller state, and context loss never allocates or draws',()=>{
 const gl=mockGL(),a=createProjectedShadowMask(),before=gl.snapshot();assert.throws(()=>a.draw(gl,topDown,.03,()=>{throw Error('draw failure');}),/draw failure/);assert.equal(gl.snapshot(),before);a.release();gl.lost=true;const count=gl.created.length;assert.equal(a.draw(gl,topDown,.03,()=>{throw Error('must not draw');}),false);assert.equal(gl.created.length,count);
});
test('Reichstag routes only its solar draw through the mask and releases it with GPU resources',async()=>{
 const source=await fs.readFile(path.join(root,'src/safety/dedicated-reichstag-mesh.ts'),'utf8');assert.ok(source.includes('colour=vec4(u_shadow_opacity,0.,0.,1.)'));assert.ok(source.includes('if(solarMask.draw(gl,shadowMatrix,.03,()=>gl!.drawElements('));assert.ok(source.includes('function release(){solarMask.release();'));assert.ok(source.includes('a_position.x+u_shadow_vector.x*h,.03,a_position.z+u_shadow_vector.y*h'));
});

test('active stencil test never writes scene bits and partial caller colour mask is respected',()=>{const gl=mockGL(),a=createProjectedShadowMask();gl.colorMask(false,true,false,true);const before=gl.snapshot();a.draw(gl,topDown,.03,()=>gl.coverage([0,1,2],.5),[.15,.18,.21]);assert.equal(gl.stencilWrites,0);assert.deepEqual(gl.scene,[1,1,1]);assert.equal(gl.snapshot(),before);assert.deepEqual(gl.uniforms.get('u_shadow_colour'),[.15,.18,.21]);a.release();});


test('all eight source renderer shadow hooks use one union with the exact uploaded matrix and release it',async()=>{
 const names=['base','city','delegated500','root500','church','infill','bremen','tier300'];
 for(const name of names){
  const directory=name==='base'?'src/safety':`src/painted/${name}/safety`,source=await fs.readFile(path.join(root,directory,'building-mesh-renderer.ts'),'utf8'),start=source.indexOf(name==='church'?' if(shadowProgram&&shadowVao':' if(progressiveDiagnostic!==\'no-shadow\'&&shadowProgram');assert.ok(start>=0,name);
  let begin=source.indexOf('{',start),end=begin+1,depth=1;for(;depth&&end<source.length;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
  const block=source.slice(start,end).replaceAll('gl!','gl'),run=new Function('gl','shadowMask','matrix','alpha',`let shadowDraws=0,shadowFailure=false,shadowProgram={coverage:true},shadowVao={source:true},shadowIndices=new Uint32Array([0,1,2]),shadowAlpha=alpha,progressiveDiagnostic='',sceneSun={shadowVector:[-2,1]},city='berlin',c311Failure,c312Failure,c313Failure;const paintMode=()=>2,releaseShadowGPU=()=>{throw Error('Unexpected shadow draw failure');};${block};return shadowDraws;`),gl=mockGL(),mask=createProjectedShadowMask();
  gl.drawElements=(mode,count,type,offset)=>{assert.equal(mode,gl.TRIANGLES);assert.equal(count,3);assert.equal(offset,0);gl.coverage([0],gl.uniforms.get('u_shadow_opacity'));};
  assert.equal(run(gl,mask,topDown,0),0,name);assert.equal(mask.stats.bytes,0,name);assert.equal(run(gl,mask,topDown,.08),1,name);assert.equal(gl.composites,1,name);assert.deepEqual(gl.uniforms.get('u_matrix'),Array.from(new Float32Array(topDown)),name);
  assert.ok(source.includes('function releaseShadowGPU(){shadowMask.release();'),name);mask.release();assert.equal(mask.stats.bytes,0,name);
 }
});
