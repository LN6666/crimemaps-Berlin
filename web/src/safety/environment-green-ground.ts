import {projectedShadowDepthPlane} from './projected-shadow-mask';
import {SCENE_SURFACE_LIGHT_GLSL} from './scene-surface-light';

/** One material definition for both the normal green pass and its conservative
 * raster-depth fallback. Source park/wood coverage is not a claim of lawn. */
export const GREEN_GROUND_MATERIAL_GLSL = `
float greenGroundHash(vec2 q){vec3 p=fract(vec3(q.xyx)*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float greenGroundNoise(vec2 p){
 vec2 cell=floor(p),f=fract(p),u=f*f*(3.-2.*f);
 float a=greenGroundHash(cell),b=greenGroundHash(cell+vec2(1.,0.)),c=greenGroundHash(cell+vec2(0.,1.)),d=greenGroundHash(cell+vec2(1.));
 float k=a-b-c+d;return a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y;
}
vec4 greenGroundColor(vec3 position,vec3 normal){
 vec2 ground=position.xz*.9;
 float grain=greenGroundNoise(ground),coverage=1.-smoothstep(.55,2.5,max(length(dFdx(ground)),length(dFdy(ground))));
 vec3 base=vec3(.43,.47,.245)*mix(1.,mix(.94,1.045,grain),coverage);
 return vec4(sceneSurfaceLight(base,normalize(normal),position.y),.60);
}`;

export const GREEN_GROUND_VERTEX_GLSL = `#version 300 es
precision highp float;
in vec3 a_position;in vec3 a_normal;uniform mat4 u_matrix;
out vec3 v_position;out vec3 v_normal;
void main(){v_position=a_position;v_normal=a_normal;gl_Position=u_matrix*vec4(a_position,1.);}`;

/** All green triangles use the same screen-space plane depth. LESS + depth
 * writes therefore reject duplicate coverage, including partial intersections,
 * without changing any source ring or allocating a coverage texture. */
export const GREEN_GROUND_FRAGMENT_GLSL = `#version 300 es
precision highp float;
in vec3 v_position;in vec3 v_normal;
uniform vec3 u_green_depth_plane;uniform vec4 u_green_viewport;uniform vec2 u_green_depth_range;
out vec4 color;
${SCENE_SURFACE_LIGHT_GLSL}
${GREEN_GROUND_MATERIAL_GLSL}
void main(){
 vec2 ndc=(gl_FragCoord.xy-u_green_viewport.xy)/u_green_viewport.zw*2.-1.;
 float z=dot(u_green_depth_plane,vec3(ndc,1.));
 color=greenGroundColor(v_position,v_normal);
 if(z< -1.||z>1.)discard;
 gl_FragDepth=mix(u_green_depth_range.x,u_green_depth_range.y,z*.5+.5);
}`;

/** Match the uploaded matrix and packed y=.01 exactly, including DPR/viewport
 * origin and MapLibre's active depth range. Degenerate views keep the original
 * green draw rather than throwing or dropping source coverage. */
export function greenGroundDepthParameters(matrix:Float32Array,viewport:ArrayLike<number>|null,depthRange:ArrayLike<number>|null){
 if(!viewport||viewport.length!==4||!Array.from(viewport).every(Number.isFinite)||viewport[2]<=0||viewport[3]<=0||!depthRange||depthRange.length!==2||!Array.from(depthRange).every(v=>Number.isFinite(v)&&v>=0&&v<=1))return;
 try{
  const plane=new Float32Array(projectedShadowDepthPlane(matrix,Math.fround(.01)));
  if(!plane.every(Number.isFinite))return;
  return{plane,viewport:new Float32Array(Array.from(viewport)),depthRange:new Float32Array(Array.from(depthRange))};
 }catch{return;}
}
