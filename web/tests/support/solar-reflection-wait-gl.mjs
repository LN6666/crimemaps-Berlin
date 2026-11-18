// One WebGL2 stand-in shared by solar-reflection-budget-wait.test.mjs. It is
// not a GPU: it tracks the bindings and fixed-function state that the solar
// depth capture, the planar reflection target, the environment renderer, the
// shared projected-shadow mask, the dedicated Reichstag layer and program
// preparation save and restore, records allocations and draws, compiles and
// links everything, and signals every fence at once. GL enum names resolve to
// stable distinct numbers on first use. Entry points that none of those owners
// call are deliberately absent, so a new dependency fails loudly.
export function createWaitGL({viewport=[0,0,1280,800],maxTextureSize=4096}={}){
 const names=new Map();let nextConstant=0x10000,nextObject=1,lost=false;
 const allocations=[],draws=[],deleted=[],sources=[],unknownParameters=new Set(),uniforms=new Map();
 const counts={programs:0,shaders:0,textures:0,framebuffers:0,renderbuffers:0,buffers:0,vaos:0,clears:0,fences:0};
 const target={TEXTURE0:0x84c0};names.set(target.TEXTURE0,'TEXTURE0');
 const gl=new Proxy(target,{get(object,key,receiver){
  if(typeof key==='string'&&/^[A-Z][A-Z0-9_]*$/.test(key)&&!(key in object)){object[key]=nextConstant++;names.set(object[key],key);}
  return Reflect.get(object,key,receiver);
 }});
 const s={active:gl.TEXTURE0,textures:new Map(),samplers:new Map(),read:null,draw:null,renderbuffer:null,program:null,vao:null,array:null,element:null,
  viewport:[...viewport],scissor:[...viewport],clearColor:[0,0,0,0],clearDepth:1,colorMask:[true,true,true,true],depthMask:true,depthFunc:gl.LESS,depthRange:[0,1],
  blend:[gl.ONE,gl.ZERO,gl.ONE,gl.ZERO],equations:[gl.FUNC_ADD,gl.FUNC_ADD],cull:gl.BACK,front:gl.CCW,stencil:[255,255],lineWidth:1,enabled:new Set([gl.DEPTH_TEST])};
 const object=kind=>{const value={kind,id:nextObject++};const key=kind+'s';if(key in counts)counts[key]++;return value;};
 const uniform=(location,value)=>{uniforms.set(location,value);};
 Object.assign(target,{
  allocations,draws,deleted,sources,counts,uniforms,unknownParameters,canvas:{clientWidth:viewport[2],clientHeight:viewport[3]},
  setLost(value){lost=value;},isContextLost:()=>lost,getExtension:()=>null,
  getParameter(parameter){
   if(lost)return null;
   switch(names.get(parameter)){
    case 'ACTIVE_TEXTURE':return s.active;
    case 'TEXTURE_BINDING_2D':return s.textures.get(s.active)??null;
    case 'SAMPLER_BINDING':return s.samplers.get(s.active-gl.TEXTURE0)??null;
    case 'READ_FRAMEBUFFER_BINDING':return s.read;
    case 'DRAW_FRAMEBUFFER_BINDING':return s.draw;
    case 'RENDERBUFFER_BINDING':return s.renderbuffer;
    case 'CURRENT_PROGRAM':return s.program;
    case 'VERTEX_ARRAY_BINDING':return s.vao;
    case 'ARRAY_BUFFER_BINDING':return s.array;
    case 'ELEMENT_ARRAY_BUFFER_BINDING':return s.element;
    case 'VIEWPORT':return Int32Array.from(s.viewport);
    case 'SCISSOR_BOX':return Int32Array.from(s.scissor);
    case 'COLOR_CLEAR_VALUE':return Float32Array.from(s.clearColor);
    case 'DEPTH_CLEAR_VALUE':return s.clearDepth;
    case 'COLOR_WRITEMASK':return [...s.colorMask];
    case 'DEPTH_WRITEMASK':return s.depthMask;
    case 'DEPTH_FUNC':return s.depthFunc;
    case 'DEPTH_RANGE':return Float32Array.from(s.depthRange);
    case 'STENCIL_WRITEMASK':return s.stencil[0];
    case 'STENCIL_BACK_WRITEMASK':return s.stencil[1];
    case 'BLEND_SRC_RGB':return s.blend[0];
    case 'BLEND_DST_RGB':return s.blend[1];
    case 'BLEND_SRC_ALPHA':return s.blend[2];
    case 'BLEND_DST_ALPHA':return s.blend[3];
    case 'BLEND_EQUATION_RGB':return s.equations[0];
    case 'BLEND_EQUATION_ALPHA':return s.equations[1];
    case 'CULL_FACE_MODE':return s.cull;
    case 'FRONT_FACE':return s.front;
    case 'LINE_WIDTH':return s.lineWidth;
    case 'MAX_TEXTURE_SIZE':return maxTextureSize;
    case 'MAX_COMBINED_TEXTURE_IMAGE_UNITS':return 32;
    default:unknownParameters.add(names.get(parameter)??parameter);return null;
   }
  },
  isEnabled:cap=>s.enabled.has(cap),enable:cap=>{s.enabled.add(cap);},disable:cap=>{s.enabled.delete(cap);},
  activeTexture:unit=>{s.active=unit;},bindTexture:(_target,texture)=>{s.textures.set(s.active,texture);},bindSampler:(unit,sampler)=>{s.samplers.set(unit,sampler);},
  bindFramebuffer:(kind,framebuffer)=>{if(kind!==gl.DRAW_FRAMEBUFFER)s.read=framebuffer;if(kind!==gl.READ_FRAMEBUFFER)s.draw=framebuffer;},
  bindRenderbuffer:(_target,renderbuffer)=>{s.renderbuffer=renderbuffer;},useProgram:program=>{s.program=program;},bindVertexArray:vao=>{s.vao=vao;},
  bindBuffer:(kind,buffer)=>{if(kind===gl.ELEMENT_ARRAY_BUFFER)s.element=buffer;else s.array=buffer;},
  viewport:(...value)=>{s.viewport=value;},scissor:(...value)=>{s.scissor=value;},clearColor:(...value)=>{s.clearColor=value;},clearDepth:value=>{s.clearDepth=value;},
  colorMask:(...value)=>{s.colorMask=value;},depthMask:value=>{s.depthMask=value;},depthFunc:value=>{s.depthFunc=value;},depthRange:(...value)=>{s.depthRange=value;},
  blendFuncSeparate:(...value)=>{s.blend=value;},blendEquationSeparate:(...value)=>{s.equations=value;},cullFace:value=>{s.cull=value;},frontFace:value=>{s.front=value;},lineWidth:value=>{s.lineWidth=value;},
  stencilMaskSeparate:(face,mask)=>{if(face!==gl.BACK)s.stencil[0]=mask;if(face!==gl.FRONT)s.stencil[1]=mask;},
  createTexture:()=>object('texture'),createFramebuffer:()=>object('framebuffer'),createRenderbuffer:()=>object('renderbuffer'),createVertexArray:()=>object('vao'),createBuffer:()=>object('buffer'),
  createProgram:()=>object('program'),createShader:type=>({...object('shader'),type}),
  deleteTexture:value=>{deleted.push(value);},deleteFramebuffer:value=>{deleted.push(value);},deleteRenderbuffer:value=>{deleted.push(value);},deleteVertexArray:value=>{deleted.push(value);},
  deleteBuffer:value=>{deleted.push(value);},deleteProgram:value=>{deleted.push(value);},deleteShader:value=>{deleted.push(value);},
  isProgram:value=>!lost&&value?.kind==='program'&&!deleted.includes(value),
  texParameteri(){},texImage2D:(_target,_level,format,width,height)=>{allocations.push({kind:'texture',format,width,height});},
  renderbufferStorage:(_target,format,width,height)=>{allocations.push({kind:'renderbuffer',format,width,height});},
  framebufferTexture2D(){},framebufferRenderbuffer(){},checkFramebufferStatus:()=>gl.FRAMEBUFFER_COMPLETE,drawBuffers(){},readBuffer(){},
  clear:()=>{counts.clears++;},clearBufferfv(){},
  shaderSource:(_shader,text)=>{sources.push(text);},compileShader(){},getShaderParameter:()=>true,getShaderInfoLog:()=>'',attachShader(){},detachShader(){},
  bindAttribLocation:(program,location,name)=>{(program.attributes??=new Map()).set(name,location);},linkProgram(){},getProgramParameter:()=>true,getProgramInfoLog:()=>'',
  getAttribLocation:(program,name)=>program?.attributes?.get(name)??({a_position:0,a_normal:1,a_role:2,a_tree:3}[name]??-1),getUniformLocation:(_program,name)=>name,
  uniform1f:uniform,uniform1i:uniform,uniform2f:(location,...value)=>uniform(location,value),uniform2fv:uniform,uniform3f:(location,...value)=>uniform(location,value),uniform3fv:uniform,uniform4fv:uniform,
  uniformMatrix4fv:(location,_transpose,value)=>uniform(location,Array.from(value)),
  bufferData(){},bufferSubData(){},enableVertexAttribArray(){},vertexAttribPointer(){},vertexAttribDivisor(){},
  drawArrays:(mode,first,count)=>{draws.push({call:'drawArrays',mode,first,count,program:s.program,framebuffer:s.draw});},
  drawElements:(mode,count,type,offset)=>{draws.push({call:'drawElements',mode,count,type,offset,program:s.program,framebuffer:s.draw});},
  drawElementsInstanced:(mode,count,type,offset,instances)=>{draws.push({call:'drawElementsInstanced',mode,count,type,offset,instances,program:s.program,framebuffer:s.draw});},
  fenceSync:()=>{counts.fences++;return{kind:'fence',id:nextObject++};},flush(){},deleteSync(){},clientWaitSync:()=>gl.ALREADY_SIGNALED,
 });
 return gl;
}

/** Captures setTimeout so the context preparation scheduler advances only when
 * a test runs its queue; nothing else in these owners may schedule a timer. */
export function captureTimers(){
 const queue=[],previous=globalThis.setTimeout;
 globalThis.setTimeout=(fn,_delay,...args)=>{queue.push(()=>fn(...args));return queue.length;};
 return{queue,all(){let n=0;while(queue.length){if(++n>1000)throw Error('preparation scheduler did not settle');queue.shift()();}},restore(){globalThis.setTimeout=previous;}};
}
