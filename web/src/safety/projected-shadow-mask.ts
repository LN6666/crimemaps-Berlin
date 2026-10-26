/** One viewport-sized R8 scratch target on the existing WebGL2 context. Projected
 * mesh triangles contribute their maximum opacity; the union is blended once.
 * No scene stencil bits or scene depth pixels are changed. */
const VERTEX=`#version 300 es
precision highp float;
out vec2 v_uv;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));v_uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const FRAGMENT=`#version 300 es
precision highp float;
uniform sampler2D u_mask;uniform vec3 u_shadow_colour;uniform vec3 u_plane;uniform vec2 u_depth_range;
in vec2 v_uv;out vec4 colour;
void main(){float a=texture(u_mask,v_uv).r;if(a<=0.)discard;float z=dot(u_plane,vec3(v_uv*2.-1.,1.));if(z< -1.||z>1.)discard;gl_FragDepth=mix(u_depth_range.x,u_depth_range.y,z*.5+.5);colour=vec4(u_shadow_colour,a);}`;

/** Homogeneous image of the actual local y=height plane. Solving M^T p=n
 * gives z_ndc=-dot(p.xyw,vec3(x_ndc,y_ndc,1))/p.z, including perspective. */
export function projectedShadowDepthPlane(matrix:ArrayLike<number>,height=.03):[number,number,number]{
 if(matrix.length!==16||!Array.from(matrix).every(Number.isFinite)||!Number.isFinite(height))throw Error('Invalid projected shadow matrix');
 const local=[0,1,0,-height],rows=Array.from({length:4},(_,r)=>[...Array.from({length:4},(_,c)=>matrix[r*4+c]),local[r]]);
 for(let c=0;c<4;c++){let pivot=c;for(let r=c+1;r<4;r++)if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c]))pivot=r;if(Math.abs(rows[pivot][c])<1e-25)throw Error('Singular projected shadow matrix');[rows[c],rows[pivot]]=[rows[pivot],rows[c]];const d=rows[c][c];for(let k=c;k<5;k++)rows[c][k]/=d;for(let r=0;r<4;r++)if(r!==c){const f=rows[r][c];for(let k=c;k<5;k++)rows[r][k]-=f*rows[c][k];}}
 const p=rows.map(row=>row[4]);if(Math.abs(p[2])<1e-14*Math.hypot(...p))throw Error('Edge-on projected shadow plane');
 const plane:[number,number,number]=[-p[0]/p[2],-p[1]/p[2],-p[3]/p[2]];if(!plane.every(Number.isFinite))throw Error('Invalid projected shadow depth');return plane;
}
type Resource={refs:number;framebuffer:WebGLFramebuffer;texture:WebGLTexture;program:WebGLProgram;vao:WebGLVertexArrayObject;width:number;height:number;limit:number};
const resources=new WeakMap<WebGL2RenderingContext,Resource>();
function destroy(gl:WebGL2RenderingContext,r:Resource){gl.deleteFramebuffer(r.framebuffer);gl.deleteTexture(r.texture);gl.deleteProgram(r.program);gl.deleteVertexArray(r.vao);}
function allocate(gl:WebGL2RenderingContext):Resource{
 const shaders:WebGLShader[]=[];let framebuffer:WebGLFramebuffer|null=null,texture:WebGLTexture|null=null,program:WebGLProgram|null=null,vao:WebGLVertexArrayObject|null=null;
 try{program=gl.createProgram();if(!program)throw Error('Shadow mask program allocation');for(const [type,text]of [[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,FRAGMENT]]as const){const shader=gl.createShader(type);if(!shader)throw Error('Shadow mask shader allocation');shaders.push(shader);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Shadow mask shader: '+gl.getShaderInfoLog(shader));gl.attachShader(program,shader);}gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shadow mask link: '+gl.getProgramInfoLog(program));framebuffer=gl.createFramebuffer();texture=gl.createTexture();vao=gl.createVertexArray();if(!framebuffer||!texture||!vao)throw Error('Shadow mask target allocation');return{refs:0,framebuffer,texture,program,vao,width:0,height:0,limit:gl.getParameter(gl.MAX_TEXTURE_SIZE)};}
 catch(error){if(framebuffer)gl.deleteFramebuffer(framebuffer);if(texture)gl.deleteTexture(texture);if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);throw error;}finally{for(const shader of shaders)gl.deleteShader(shader);}
}
export function createProjectedShadowMask(){
 let context:WebGL2RenderingContext|undefined,resident:Resource|undefined;
 function release(){if(context&&resident&&--resident.refs===0){destroy(context,resident);resources.delete(context);}context=undefined;resident=undefined;}
 return{release,draw(gl:WebGL2RenderingContext,matrix:ArrayLike<number>,height:number,drawCoverage:()=>void,shadowColour:readonly[number,number,number]=[.12,.14,.16]){
  if(gl.isContextLost())return false;
  const plane=projectedShadowDepthPlane(matrix,height),viewport=gl.getParameter(gl.VIEWPORT) as Int32Array;
  if(gl.isContextLost()||!viewport||viewport.length!==4||viewport[2]<=0||viewport[3]<=0)return false;
  if(context!==gl){
   release();let next=resources.get(gl);
   if(!next){
    try{next=allocate(gl);}catch(error){if(gl.isContextLost())return false;throw error;}
    if(gl.isContextLost()){destroy(gl,next);return false;}
   }
   context=gl;resident=next;resources.set(gl,next);next.refs++;
  }
  const r=resident!,old={framebuffer:gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),activeTexture:gl.getParameter(gl.ACTIVE_TEXTURE),depth:gl.isEnabled(gl.DEPTH_TEST),depthMask:gl.getParameter(gl.DEPTH_WRITEMASK),depthFunc:gl.getParameter(gl.DEPTH_FUNC),depthRange:gl.getParameter(gl.DEPTH_RANGE),stencil:gl.isEnabled(gl.STENCIL_TEST),stencilMask:gl.getParameter(gl.STENCIL_WRITEMASK),stencilBackMask:gl.getParameter(gl.STENCIL_BACK_WRITEMASK),scissor:gl.isEnabled(gl.SCISSOR_TEST),cull:gl.isEnabled(gl.CULL_FACE),blend:gl.isEnabled(gl.BLEND),src:gl.getParameter(gl.BLEND_SRC_RGB),dst:gl.getParameter(gl.BLEND_DST_RGB),srcA:gl.getParameter(gl.BLEND_SRC_ALPHA),dstA:gl.getParameter(gl.BLEND_DST_ALPHA),equation:gl.getParameter(gl.BLEND_EQUATION_RGB),equationA:gl.getParameter(gl.BLEND_EQUATION_ALPHA),colour:gl.getParameter(gl.COLOR_WRITEMASK)};
  // Loss can happen during driver allocation or any state query, before its
  // DOM event reaches the layer owner. Never replay a partial/null snapshot.
  const equationValid=(value:unknown)=>typeof value==='number'&&(value===gl.FUNC_ADD||value===gl.FUNC_SUBTRACT||value===gl.FUNC_REVERSE_SUBTRACT||value===gl.MIN||value===gl.MAX);
  if(gl.isContextLost()||!equationValid(old.equation)||!equationValid(old.equationA)||old.colour?.length!==4||old.depthRange?.length!==2||typeof old.depthMask!=='boolean'||![old.activeTexture,old.depthFunc,old.stencilMask,old.stencilBackMask,old.src,old.dst,old.srcA,old.dstA].every(Number.isInteger))return false;
  gl.activeTexture(gl.TEXTURE0);const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),sampler=gl.getParameter(gl.SAMPLER_BINDING);
  if(gl.isContextLost())return false;
  let completed=false;
  try{
   // Match the bounded scene viewport; never allocate a second depth/stencil buffer.
   const ratio=Math.min(1,r.limit/viewport[2],r.limit/viewport[3],Math.sqrt(12000000/(viewport[2]*viewport[3]))),width=Math.max(1,Math.floor(viewport[2]*ratio)),heightPixels=Math.max(1,Math.floor(viewport[3]*ratio));
   gl.bindTexture(gl.TEXTURE_2D,r.texture);gl.bindSampler(0,null);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,r.framebuffer);
   if(r.width!==width||r.height!==heightPixels){gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,width,heightPixels,0,gl.RED,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,r.texture,0);const status=gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER);if(gl.isContextLost())return false;if(status!==gl.FRAMEBUFFER_COMPLETE)throw Error('Shadow mask framebuffer incomplete');r.width=width;r.height=heightPixels;}
   if(gl.isContextLost())return false;
   gl.viewport(0,0,width,heightPixels);gl.disable(gl.SCISSOR_TEST);gl.disable(gl.STENCIL_TEST);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.colorMask(true,true,true,true);gl.clearBufferfv(gl.COLOR,0,new Float32Array(4));gl.enable(gl.BLEND);gl.blendEquationSeparate(gl.MAX,gl.MAX);gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ONE,gl.ONE);
   // Some shared surface programs retain active samplers even in their shadow branch.
   // Never leave the attached mask bound to a sampler during the coverage draw.
   gl.bindTexture(gl.TEXTURE_2D,texture);gl.bindSampler(0,sampler);drawCoverage();
   if(gl.isContextLost())return false;
   gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,old.framebuffer);gl.viewport(viewport[0],viewport[1],viewport[2],viewport[3]);old.scissor?gl.enable(gl.SCISSOR_TEST):gl.disable(gl.SCISSOR_TEST);old.stencil?gl.enable(gl.STENCIL_TEST):gl.disable(gl.STENCIL_TEST);gl.stencilMaskSeparate(gl.FRONT,0);gl.stencilMaskSeparate(gl.BACK,0);gl.colorMask(old.colour[0],old.colour[1],old.colour[2],old.colour[3]);old.depth?gl.enable(gl.DEPTH_TEST):gl.disable(gl.DEPTH_TEST);gl.depthFunc(old.depthFunc);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendEquationSeparate(gl.FUNC_ADD,gl.FUNC_ADD);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,r.texture);gl.bindSampler(0,null);gl.useProgram(r.program);gl.bindVertexArray(r.vao);gl.uniform1i(gl.getUniformLocation(r.program,'u_mask'),0);gl.uniform3fv(gl.getUniformLocation(r.program,'u_plane'),plane);gl.uniform3f(gl.getUniformLocation(r.program,'u_shadow_colour'),...shadowColour);gl.uniform2fv(gl.getUniformLocation(r.program,'u_depth_range'),old.depthRange);if(gl.isContextLost())return false;gl.drawArrays(gl.TRIANGLES,0,3);completed=true;
  }catch(error){if(gl.isContextLost())return false;throw error;}finally{
   if(!gl.isContextLost()){
   gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,old.framebuffer);gl.viewport(viewport[0],viewport[1],viewport[2],viewport[3]);gl.useProgram(old.program);gl.bindVertexArray(old.vao);gl.bindTexture(gl.TEXTURE_2D,texture);gl.bindSampler(0,sampler);gl.activeTexture(old.activeTexture);
   for(const [cap,on]of [[gl.DEPTH_TEST,old.depth],[gl.STENCIL_TEST,old.stencil],[gl.SCISSOR_TEST,old.scissor],[gl.CULL_FACE,old.cull],[gl.BLEND,old.blend]]as const)on?gl.enable(cap):gl.disable(cap);gl.stencilMaskSeparate(gl.FRONT,old.stencilMask);gl.stencilMaskSeparate(gl.BACK,old.stencilBackMask);gl.depthFunc(old.depthFunc);gl.depthMask(old.depthMask);gl.blendEquationSeparate(old.equation,old.equationA);gl.blendFuncSeparate(old.src,old.dst,old.srcA,old.dstA);gl.colorMask(old.colour[0],old.colour[1],old.colour[2],old.colour[3]);
   }
  }
  return completed&&!gl.isContextLost();
 },get stats(){return{contexts:resident?1:0,textures:resident?1:0,framebuffers:resident?1:0,bytes:resident?resident.width*resident.height:0};}};
}
