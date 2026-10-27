import type {PlanarReflectionSource} from './planar-building-reflection';
import type {SceneQuality} from './scene-environment-quality';

const SHADOW_UNIT=15;
type Bounds=readonly [number,number,number,number,number,number];
type Direction=readonly [number,number,number];
type Snapshot={owner:object;texture:WebGLTexture;matrix:Float64Array;size:number;bias:number};
type Receiver={snapshot:Snapshot;matrix:Float32Array;viewport:Float32Array;depthRange:Float32Array};
const published=new WeakMap<WebGL2RenderingContext,Snapshot>();
const receiving=new WeakMap<WebGL2RenderingContext,Receiver>();
const lost=Symbol('solar shadow context lost');
const live=(g:WebGL2RenderingContext)=>{if(g.isContextLost())throw lost;};
const dot=(a:readonly number[],b:readonly number[])=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:readonly number[],b:readonly number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=(v:number[])=>{const d=Math.hypot(...v);if(!Number.isFinite(d)||d<1e-12)throw Error('Invalid solar direction');return v.map(n=>n/d);};

/** Fit all resident world-Mercator bounds, never the screen's first depth layer.
 * Solar input axes are east/up/north; Mercator axes are east/south/up. */
export function sceneSolarShadowProjection(bounds:Bounds,direction:Direction,size:number){
 if(bounds.length!==6||!bounds.every(Number.isFinite)||[0,1,2].some(i=>bounds[i]>bounds[i+3])||!Number.isInteger(size)||size<1)throw Error('Invalid solar coverage');
 const sun=unit([direction[0],-direction[2],direction[1]]);
 const right=unit(cross(Math.abs(sun[2])>.95?[0,1,0]:[0,0,1],sun));
 const up=cross(sun,right),depth=sun.map(n=>-n);
 const center=[0,1,2].map(i=>(bounds[i]+bounds[i+3])/2),half=[0,1,2].map(i=>(bounds[i+3]-bounds[i])/2);
 const radii=[right,up,depth].map(axis=>Math.max(1e-8,axis.reduce((sum,n,i)=>sum+Math.abs(n)*half[i],0)));
 // Two texels of lateral margin and a small depth margin keep boundary samples
 // inside the same fitted projection; this does not enlarge source geometry.
 radii[0]*=1+4/size;radii[1]*=1+4/size;radii[2]*=1.01;
 const matrix=new Float64Array(16);
 for(let row=0;row<3;row++){const axis=[right,up,depth][row];for(let col=0;col<3;col++)matrix[col*4+row]=axis[col]/radii[row];matrix[12+row]=-dot(axis,center)/radii[row];}
 matrix[15]=1;
 return{matrix,bias:Math.max(2/16777215,Math.max(radii[0],radii[1])/(size*2*radii[2]))};
}

/** Float64 composition cancels the Mercator origin before upload to GLSL. */
export function sceneSolarReceiverMatrix(solar:ArrayLike<number>,main:ArrayLike<number>):Float32Array|undefined{
 if(solar.length!==16||main.length!==16||!Array.from(solar).every(Number.isFinite)||!Array.from(main).every(Number.isFinite))return;
 const rows=Array.from({length:4},(_,r)=>[...Array.from({length:4},(_,c)=>main[c*4+r]),...Array.from({length:4},(_,c)=>Number(c===r))]);
 for(let c=0;c<4;c++){let pivot=c;for(let r=c+1;r<4;r++)if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c]))pivot=r;if(Math.abs(rows[pivot][c])<1e-25)return;[rows[c],rows[pivot]]=[rows[pivot],rows[c]];const div=rows[c][c];for(let k=0;k<8;k++)rows[c][k]/=div;for(let r=0;r<4;r++)if(r!==c){const scale=rows[r][c];for(let k=0;k<8;k++)rows[r][k]-=scale*rows[c][k];}}
 const result=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let sum=0;for(let k=0;k<4;k++)sum+=solar[k*4+r]*rows[k][4+c];result[c*4+r]=sum;}
 return Array.from(result).every(Number.isFinite)?result:undefined;
}

/** Nestable draw scope. mainMatrix must be the actual WORLD-Mercator camera
 * matrix for this draw (including the mirror for reflection), not material UVs. */
export function withSceneSolarShadowReceiver<T>(g:WebGL2RenderingContext,mainMatrix:ArrayLike<number>,draw:()=>T,disabled=false):T|undefined{
 if(g.isContextLost())return;
 const previous=receiving.get(g),active=g.getParameter(g.ACTIVE_TEXTURE);if(g.isContextLost())return;
 g.activeTexture(g.TEXTURE0+SHADOW_UNIT);
 const texture=g.getParameter(g.TEXTURE_BINDING_2D),sampler=g.getParameter(g.SAMPLER_BINDING);if(g.isContextLost())return;
 let value:Receiver|undefined;
 try{
  const snapshot=!disabled?published.get(g):undefined;
  if(snapshot){const matrix=sceneSolarReceiverMatrix(snapshot.matrix,mainMatrix),viewport=g.getParameter(g.VIEWPORT),range=g.getParameter(g.DEPTH_RANGE);live(g);if(matrix&&viewport?.length===4&&viewport[2]>0&&viewport[3]>0&&range?.length===2&&range[1]>range[0])value={snapshot,matrix,viewport:new Float32Array(viewport),depthRange:new Float32Array(range)};}
  if(value)receiving.set(g,value);else receiving.delete(g);
  g.bindTexture(g.TEXTURE_2D,value?.snapshot.texture??null);g.bindSampler(SHADOW_UNIT,null);g.activeTexture(active);live(g);
  return draw();
 }catch(error){
  if(!g.isContextLost())throw error;
 }finally{
  if(previous&&!g.isContextLost())receiving.set(g,previous);else receiving.delete(g);
  if(!g.isContextLost()){g.activeTexture(g.TEXTURE0+SHADOW_UNIT);g.bindTexture(g.TEXTURE_2D,texture);g.bindSampler(SHADOW_UNIT,sampler);g.activeTexture(active);}
 }
}

const uniformLocations=new WeakMap<WebGLProgram,{enabled:WebGLUniformLocation|null;map:WebGLUniformLocation|null;matrix:WebGLUniformLocation|null;viewport:WebGLUniformLocation|null;range:WebGLUniformLocation|null;texel:WebGLUniformLocation|null;bias:WebGLUniformLocation|null}>();
export function uploadSceneSolarShadowReceiver(g:WebGL2RenderingContext,p:WebGLProgram){
 let u=uniformLocations.get(p);if(!u){const loc=(n:string)=>g.getUniformLocation(p,n);u={enabled:loc('u_scene_shadow_enabled'),map:loc('u_scene_shadow_map'),matrix:loc('u_scene_shadow_matrix'),viewport:loc('u_scene_shadow_viewport'),range:loc('u_scene_shadow_depth_range'),texel:loc('u_scene_shadow_texel'),bias:loc('u_scene_shadow_bias')};uniformLocations.set(p,u);}
 const value=receiving.get(g);
 // Always assign the reserved unit, including disabled/caster programs. A new
 // sampler must not accidentally alias an existing source sampler on unit zero.
 g.uniform1i(u.map,SHADOW_UNIT);g.uniform1f(u.enabled,value?1:0);
 if(value){g.uniformMatrix4fv(u.matrix,false,value.matrix);g.uniform4fv(u.viewport,value.viewport);g.uniform2fv(u.range,value.depthRange);g.uniform2f(u.texel,1/value.snapshot.size,1/value.snapshot.size);g.uniform1f(u.bias,value.snapshot.bias);}
}

/** No derivatives, geometry edits or change to sky/contact illumination. */
export const SCENE_SOLAR_SHADOW_GLSL=`
uniform sampler2D u_scene_shadow_map;
uniform float u_scene_shadow_enabled;
uniform mat4 u_scene_shadow_matrix;
uniform vec4 u_scene_shadow_viewport;
uniform vec2 u_scene_shadow_depth_range;
uniform vec2 u_scene_shadow_texel;
uniform float u_scene_shadow_bias;
float sceneSolarVisibility(float facing){
 if(u_scene_shadow_enabled<.5||facing<=0.)return 1.;
 vec2 xy=(gl_FragCoord.xy-u_scene_shadow_viewport.xy)/u_scene_shadow_viewport.zw*2.-1.;
 float z=(gl_FragCoord.z-u_scene_shadow_depth_range.x)/(u_scene_shadow_depth_range.y-u_scene_shadow_depth_range.x)*2.-1.;
 vec4 light=u_scene_shadow_matrix*vec4(xy,z,1.);
 if(abs(light.w)<.000001)return 1.;
 vec3 q=light.xyz/light.w*.5+.5;
 if(any(lessThan(q,vec3(0.)))||any(greaterThan(q,vec3(1.))))return 1.;
 // Each PCF tap moves half a texel; NEAREST may add another half.
 // Both axes therefore span a full texel. u_bias is a HALF-texel
 // depth scale, so 2*sqrt(2)*tan(theta) bounds every plane orientation.
 // Preserve the existing constant numerical/depth-quantization margin.
 float slope=sqrt(max(0.,1.-facing*facing))/max(facing,.0001);
 float bias=u_scene_shadow_bias*(1.+2.82842712474619*slope);
 vec2 t=u_scene_shadow_texel*.5;
 float lit=step(q.z-bias,textureLod(u_scene_shadow_map,q.xy+vec2(-t.x,-t.y),0.).r);
 lit+=step(q.z-bias,textureLod(u_scene_shadow_map,q.xy+vec2(t.x,-t.y),0.).r);
 lit+=step(q.z-bias,textureLod(u_scene_shadow_map,q.xy+vec2(-t.x,t.y),0.).r);
 lit+=step(q.z-bias,textureLod(u_scene_shadow_map,q.xy+t,0.).r);
 return lit*.25;
}
`;

/** One bounded depth target in the shared context. Only a complete resident
 * capture is published; failures are keyed and never retried every frame. */
export function createSceneSolarShadow({mobile=false}:{mobile?:boolean}={}){
 const owner={};let source:PlanarReflectionSource|undefined,gl:WebGL2RenderingContext|undefined,texture:WebGLTexture|undefined,fbo:WebGLFramebuffer|undefined,size=0;
 let coverageSummary:{complete:boolean;triangles:number|undefined;draws:number|undefined;reason:string|undefined}|undefined;
 let lastKey='',failedKey='',destroyed=false,maxSize:number|undefined,units:number|undefined,captures=0,failures=0,cacheHits=0,triangles=0,draws=0,status='no-source',lastError='';
 const unpublish=()=>{if(gl&&published.get(gl)?.owner===owner)published.delete(gl);};
 function release(){unpublish();if(gl&&!gl.isContextLost()){if(fbo)gl.deleteFramebuffer(fbo);if(texture)gl.deleteTexture(texture);}texture=fbo=undefined;size=0;lastKey='';triangles=draws=0;coverageSummary=undefined;}
 function reset(){release();gl=undefined;maxSize=units=undefined;lastKey=failedKey='';lastError='';status=source?'awaiting-capture':'no-source';}
 function save(g:WebGL2RenderingContext){
  const get=(p:number)=>{const v=g.getParameter(p);live(g);return v;};
  const state={read:get(g.READ_FRAMEBUFFER_BINDING),draw:get(g.DRAW_FRAMEBUFFER_BINDING),rb:get(g.RENDERBUFFER_BINDING),program:get(g.CURRENT_PROGRAM),vao:get(g.VERTEX_ARRAY_BINDING),array:get(g.ARRAY_BUFFER_BINDING),viewport:get(g.VIEWPORT),scissor:get(g.SCISSOR_BOX),clearDepth:get(g.DEPTH_CLEAR_VALUE),colorMask:get(g.COLOR_WRITEMASK),depthMask:get(g.DEPTH_WRITEMASK),depthFunc:get(g.DEPTH_FUNC),depthRange:get(g.DEPTH_RANGE),src:get(g.BLEND_SRC_RGB),dst:get(g.BLEND_DST_RGB),srcA:get(g.BLEND_SRC_ALPHA),dstA:get(g.BLEND_DST_ALPHA),eq:get(g.BLEND_EQUATION_RGB),eqA:get(g.BLEND_EQUATION_ALPHA),cull:get(g.CULL_FACE_MODE),front:get(g.FRONT_FACE),active:get(g.ACTIVE_TEXTURE),textures:[] as {texture:WebGLTexture|null;sampler:WebGLSampler|null}[],caps:[g.DEPTH_TEST,g.BLEND,g.CULL_FACE,g.SCISSOR_TEST,g.STENCIL_TEST,g.POLYGON_OFFSET_FILL].map(cap=>{const on=g.isEnabled(cap);live(g);return[cap,on]as const;})};
  for(let i=0;i<units!;i++){g.activeTexture(g.TEXTURE0+i);state.textures.push({texture:get(g.TEXTURE_BINDING_2D),sampler:get(g.SAMPLER_BINDING)});}g.activeTexture(state.active);return state;
 }
 function restore(g:WebGL2RenderingContext,s:ReturnType<typeof save>){
  g.bindFramebuffer(g.READ_FRAMEBUFFER,s.read);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,s.draw);g.bindRenderbuffer(g.RENDERBUFFER,s.rb);g.useProgram(s.program);g.bindVertexArray(s.vao);g.bindBuffer(g.ARRAY_BUFFER,s.array);g.viewport(...s.viewport as [number,number,number,number]);g.scissor(...s.scissor as [number,number,number,number]);g.clearDepth(s.clearDepth);g.colorMask(...s.colorMask as [boolean,boolean,boolean,boolean]);g.depthMask(s.depthMask);g.depthFunc(s.depthFunc);g.depthRange(...s.depthRange as [number,number]);g.blendFuncSeparate(s.src,s.dst,s.srcA,s.dstA);g.blendEquationSeparate(s.eq,s.eqA);g.cullFace(s.cull);g.frontFace(s.front);for(const[cap,on]of s.caps)on?g.enable(cap):g.disable(cap);
  s.textures.forEach((row,i)=>{g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,row.texture);g.bindSampler(i,row.sampler);});g.activeTexture(s.active);
 }
 return{
  setSource(value:PlanarReflectionSource|undefined){if(destroyed||source===value)return;reset();source=value;status=value?'awaiting-capture':'no-source';},
  capture(g:WebGL2RenderingContext,args:{direction:Direction;enabled:boolean;quality:SceneQuality}){
   if(destroyed)return;
   if(g.isContextLost()){reset();status='context-lost';return;}
   if(gl!==g){reset();gl=g;}
   if(!args.enabled||!source){release();failedKey='';status=!args.enabled?'disabled':'no-source';return;}
   let key='';let state:ReturnType<typeof save>|undefined;const previousReceiver=receiving.get(g);
   try{
    const revision=source.getSolarShadowRevision?.()??source.getPlanarReflectionRevision();live(g);if(typeof revision!=='string'||revision.length<1||revision.length>65536)throw Error('Invalid solar source revision');
    const requested=args.quality==='economy'?512:args.quality==='balanced'?1024:args.quality==='detail'?2048:0;if(!requested)throw Error('Invalid solar quality');
    if(args.direction.length!==3||!args.direction.every(Number.isFinite)||args.direction[1]<=0){release();status='no-daylight';return;}
    key=revision+'|'+args.direction.join(',')+'|'+args.quality;
    if(key===lastKey&&published.get(g)?.owner===owner){cacheHits++;return;}
    if(key===failedKey){unpublish();return;}
    unpublish();coverageSummary=undefined;
    // Prepare only an actually dirty enabled capture, never from stats. The
    // provider owns a context/material-generation failure latch and must not
    // mutate caller render state while compiling its dedicated depth program.
    // A thrown prepare is suppressed by the pre-prepare key; successful program
    // creation may update the revision, which is then the capture/cache key.
    if(source.prepareSolarShadow){source.prepareSolarShadow();live(g);const nextRevision=source.getSolarShadowRevision?.()??source.getPlanarReflectionRevision();live(g);if(typeof nextRevision!=='string'||nextRevision.length<1||nextRevision.length>65536)throw Error('Invalid prepared solar source revision');key=nextRevision+'|'+args.direction.join(',')+'|'+args.quality;if(key===failedKey)return;}
    const coverage=source.getSolarShadowCoverage?.();
    if(coverage)coverageSummary={complete:coverage.complete===true,triangles:Number.isFinite(coverage.triangles)?coverage.triangles:undefined,draws:Number.isFinite(coverage.draws)?coverage.draws:undefined,reason:typeof coverage.reason==='string'?coverage.reason.slice(0,1024):undefined};
    if(!coverage?.complete||!Number.isSafeInteger(coverage.triangles)||coverage.triangles<1||!Number.isSafeInteger(coverage.draws)||coverage.draws<1){failedKey=key;status='incomplete-coverage';return;}
    if(maxSize===undefined){maxSize=g.getParameter(g.MAX_TEXTURE_SIZE);units=g.getParameter(g.MAX_COMBINED_TEXTURE_IMAGE_UNITS);live(g);if(!Number.isInteger(maxSize)||maxSize!<1||!Number.isInteger(units)||units!<=SHADOW_UNIT||units!>256)throw Error('Invalid solar GPU limits');}
    const nextSize=Math.min(requested,mobile?1024:2048,maxSize!),projection=sceneSolarShadowProjection(coverage.bounds,args.direction,nextSize);
    state=save(g);live(g);receiving.delete(g);
    if(!texture){texture=g.createTexture()??undefined;live(g);if(!texture)throw Error('Solar depth texture allocation');}
    if(!fbo){fbo=g.createFramebuffer()??undefined;live(g);if(!fbo)throw Error('Solar framebuffer allocation');}
    g.activeTexture(g.TEXTURE0+SHADOW_UNIT);g.bindTexture(g.TEXTURE_2D,texture);g.bindSampler(SHADOW_UNIT,null);g.bindFramebuffer(g.FRAMEBUFFER,fbo);live(g);
    if(size!==nextSize){g.texImage2D(g.TEXTURE_2D,0,g.DEPTH_COMPONENT24,nextSize,nextSize,0,g.DEPTH_COMPONENT,g.UNSIGNED_INT,null);live(g);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_COMPARE_MODE,g.NONE);g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,texture,0);live(g);g.drawBuffers([g.NONE]);g.readBuffer(g.NONE);const complete=g.checkFramebufferStatus(g.FRAMEBUFFER);live(g);if(complete!==g.FRAMEBUFFER_COMPLETE)throw Error('Solar depth framebuffer incomplete');size=nextSize;}
    // A disabled sampler still participates in validation. Detach this target
    // from every sampling unit, not only the receiver's reserved slot.
    for(let i=0;i<state.textures.length;i++)if(state.textures[i].texture===texture||i===SHADOW_UNIT){g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,null);g.bindSampler(i,null);}g.activeTexture(state.active);
    g.viewport(0,0,size,size);for(const cap of [g.BLEND,g.CULL_FACE,g.SCISSOR_TEST,g.STENCIL_TEST,g.POLYGON_OFFSET_FILL])g.disable(cap);g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.depthRange(0,1);g.depthMask(true);g.colorMask(false,false,false,false);g.clearDepth(1);g.clear(g.DEPTH_BUFFER_BIT);live(g);
    const result=source.renderPlanarReflection({gl:g,mainMatrix:projection.matrix,clipPlaneWorldZ:0,maxTriangles:coverage.triangles,maxDraws:coverage.draws,purpose:'solar-depth'});live(g);
    if(g.getParameter(g.DRAW_FRAMEBUFFER_BINDING)!==fbo)throw Error('Solar source changed framebuffer');live(g);
    if(!result?.complete||!Number.isSafeInteger(result.triangles)||result.triangles<1||result.triangles>coverage.triangles||!Number.isSafeInteger(result.draws)||result.draws<1||result.draws>coverage.draws)throw Error('Solar source capture incomplete or over budget');
    triangles=result.triangles;draws=result.draws;published.set(g,{owner,texture,matrix:projection.matrix,size,bias:projection.bias});lastKey=key;failedKey='';lastError='';status='ready';captures++;
   }catch(error){unpublish();if(g.isContextLost()){reset();status='context-lost';}else{failedKey=key;lastError=String(error).slice(0,2048);status='capture-failed';failures++;}}
   finally{if(previousReceiver&&!g.isContextLost())receiving.set(g,previousReceiver);else receiving.delete(g);if(state&&!g.isContextLost())restore(g,state);if(g.isContextLost()){reset();status='context-lost';}}
  },
  resetGPU(){if(!destroyed)reset();},destroy(){if(destroyed)return;reset();source=undefined;destroyed=true;status='destroyed';},
  get stats(){return{status,captures,failures,cacheHits,lastError,coverage:coverageSummary?{...coverageSummary}:undefined,triangles,draws,size,depthTextureObjects:texture?1:0,framebufferObjects:fbo?1:0,allocatedGPUBytes:size*size*4,measurement:'DEPTH24 logical storage conservatively four bytes per pixel; excludes driver overhead',published:!!gl&&published.get(gl)?.owner===owner,noNewContext:true,noNewTimer:true};}
 };
}
