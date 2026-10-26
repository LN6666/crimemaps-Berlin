import {SCENE_SURFACE_LIGHT_GLSL} from './scene-surface-light';
import {GREEN_GROUND_MATERIAL_GLSL} from './environment-green-ground';
import {TREE_DISPLAY_HORIZONTAL_SCALE_METRES} from './environment-scene-data';
/** Display-only foliage stays inside the existing5m source-point guard. Water
 * positions/coastlines/holes stay fixed: only its surface shading is animated. */
export const ENVIRONMENT_SCENE_VERTEX_GLSL = `#version 300 es
precision highp float;
in vec3 a_position;in vec3 a_normal;in float a_role;in vec3 a_tree;
uniform mat4 u_matrix;uniform mat4 u_environment_reflection_matrix;uniform int u_tree;uniform float u_environment_time;
uniform float u_environment_wind;uniform highp int u_environment_shadow_pass;uniform vec2 u_environment_shadow_vector;
out vec3 v_normal;out vec3 v_position;out vec3 v_base;out float v_role;out vec4 v_reflection_clip;
float envHash(vec2 q){vec3 p=fract(vec3(q.xyx)*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
void main(){
 vec3 p=a_position,n=a_normal;float variant=.5;
 if(u_tree==1){
  variant=envHash(a_tree.xy*.017);float angle=variant*6.28318530718,c=cos(angle),s=sin(angle);
  mat2 rotation=mat2(c,s,-s,c);vec2 size=vec2(mix(.90,1.08,variant),mix(.88,1.06,envHash(a_tree.yx*.023)))*${TREE_DISPLAY_HORIZONTAL_SCALE_METRES.toFixed(1)};
  p=vec3((rotation*(a_position.xz*size)).x+a_tree.x,a_position.y*a_tree.z,(rotation*(a_position.xz*size)).y+a_tree.y);
  vec2 nr=rotation*(a_normal.xz/size);n=normalize(vec3(nr.x,a_normal.y/max(a_tree.z,.3),nr.y));
  float crown=smoothstep(.28,.95,a_position.y)*step(.5,a_role),phase=dot(a_tree.xy,vec2(.017,.023));
  float wind=clamp(u_environment_wind,0.,.08)*crown*clamp(a_tree.z/7.,.1,1.);
  p.x+=wind*.83*sin(u_environment_time*1.15+phase);p.z+=wind*.55*sin(u_environment_time*.91+phase+1.6);
 }
 float foliageVariant=fract(variant+a_role*.37);
 v_base=a_role<.5?vec3(.27,.21,.14):a_role<1.5?mix(vec3(.12,.235,.095),vec3(.275,.335,.14),foliageVariant):a_role<2.5?vec3(.245,.365,.435):vec3(.43,.47,.245);
 v_reflection_clip=u_environment_reflection_matrix*vec4(p,1.);v_position=p;v_normal=n;v_role=a_role;if(u_environment_shadow_pass==1)p=vec3(p.x+u_environment_shadow_vector.x*max(0.,p.y),.03,p.z+u_environment_shadow_vector.y*max(0.,p.y));gl_Position=u_matrix*vec4(p,1.);
}`;
export const ENVIRONMENT_SCENE_FRAGMENT_GLSL = `#version 300 es
precision highp float;
in vec3 v_normal;in vec3 v_position;in vec3 v_base;in float v_role;in vec4 v_reflection_clip;uniform sampler2D u_environment_reflection;uniform int u_environment_reflection_enabled;
uniform float u_environment_time;uniform float u_environment_water_detail;uniform highp int u_environment_shadow_pass;uniform float u_environment_shadow_opacity;
uniform vec3 u_environment_eye;uniform vec3 u_environment_view_direction;uniform float u_environment_perspective;
out vec4 color;
${SCENE_SURFACE_LIGHT_GLSL}
${GREEN_GROUND_MATERIAL_GLSL}
float waterHash(vec2 q){vec3 p=fract(vec3(q.xyx)*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
// Value noise and its analytical gradient. Phase rates are decorative, not measured flow.
vec3 waterNoiseGradient(vec2 p){
 vec2 cell=floor(p),f=fract(p),u=f*f*(3.-2.*f),du=6.*f*(1.-f);
 float a=waterHash(cell),b=waterHash(cell+vec2(1.,0.)),c=waterHash(cell+vec2(0.,1.)),d=waterHash(cell+vec2(1.));
 float k=a-b-c+d;
 return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y,du.x*((b-a)+k*u.y),du.y*((c-a)+k*u.x));
}
// Far facets evolve locally as well as drifting. Each lattice corner has its
// own smooth phase/rate; neighbouring cells share the same corner value, so
// glints grow and recede without tile seams or synchronized white flashes.
float waterEvolvingCorner(float seed,float time){return .5+.5*sin(time*(.95+seed*.8)+seed*6.28318530718);}
vec3 waterEvolvingNoiseGradient(vec2 p,float time){
 vec2 cell=floor(p),f=fract(p),u=f*f*(3.-2.*f),du=6.*f*(1.-f);
 float a=waterEvolvingCorner(waterHash(cell),time),b=waterEvolvingCorner(waterHash(cell+vec2(1.,0.)),time);
 float c=waterEvolvingCorner(waterHash(cell+vec2(0.,1.)),time),d=waterEvolvingCorner(waterHash(cell+vec2(1.)),time);
 float k=a-b-c+d;
 return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y,du.x*((b-a)+k*u.y),du.y*((c-a)+k*u.x));
}
float waterBandVisibility(vec2 q){return 1.-smoothstep(.55,2.5,max(length(dFdx(q)),length(dFdy(q))));}
// Pixel coverage of a narrow, irregular noise contour; preserves thin highlights
// instead of hard threshold flicker when the contour becomes subpixel.
float waterFineCoverage(float value,float level,float halfWidth){
 float halfPixel=max(.5*fwidth(value),.001);
 float overlap=max(0.,min(value+halfPixel,level+halfWidth)-max(value-halfPixel,level-halfWidth));
 return clamp(overlap/(2.*halfPixel),0.,1.);
}
void main(){
 if(u_environment_shadow_pass==1){color=vec4(u_environment_shadow_opacity,0.,0.,1.);return;}
 vec3 base=v_base;
 if(v_role>=2.5){
  // Conservative fallback shares the dedicated green program's material.
  color=greenGroundColor(v_position,v_normal);
 }else if(v_role>1.5){
  // Global decorative wave axis. No source river flow speed/direction is asserted.
  vec2 axis=normalize(vec2(.84,.54)),crossAxis=vec2(-axis.y,axis.x),p=vec2(dot(v_position.xz,axis),dot(v_position.xz,crossAxis));
  float waterTime=u_environment_time*2.0,t=waterTime*2.5,detail=clamp(u_environment_water_detail,0.,2.);
  // Crossed noise domains share a broad axis, but drift independently so short
  // bright fragments change shape instead of translating as synchronized bands.
  mat2 crossDomain=mat2(.9396926,.3420201,-.3420201,.9396926);
  vec2 q0=p*vec2(.8,3.6)-t*vec2(.15,.11),q1=(crossDomain*p)*vec2(2.1,8.)-t*vec2(-.21,.17);
  vec3 a=waterNoiseGradient(q0),b=waterNoiseGradient(q1);float aa=waterBandVisibility(q0),ab=waterBandVisibility(q1);
  vec2 slope=.014*a.yz*vec2(.8,3.6)*aa+.006*(transpose(crossDomain)*(b.yz*vec2(2.1,8.)))*ab;
  float grain=b.x;
  if(detail>1.5){vec2 q2=p*vec2(4.4,13.5)-t*vec2(.37,-.23);vec3 c=waterNoiseGradient(q2);slope+=.002*c.yz*vec2(4.4,13.5)*waterBandVisibility(q2);grain=mix(grain,c.x,.35);}
  // One fixed lower-frequency band replaces only unresolved fine coverage.
  // Its coordinates never depend on derivatives: all fwidth/dFdx below are
  // first derivatives of position/noise, not derivatives of derivative-scaled UVs.
  // Distant glints drift and evolve at one sixteenth of the fine-ripple clock speed.
  float farTime=u_environment_time*.125;
  vec2 qFar=p*vec2(.055,.22)-(farTime*2.5)*vec2(.017,-.043);
  vec3 farNoise=waterEvolvingNoiseGradient(qFar,farTime);float farVisibility=waterBandVisibility(qFar),farWeight=1.-max(aa,ab);
  slope+=.22*farNoise.yz*vec2(.055,.22)*farVisibility*farWeight;
  float fragments=waterFineCoverage(a.x,.51,.085)*smoothstep(.28,.78,b.x)*aa;
  float flecks=waterFineCoverage(b.x,.54,.045)*smoothstep(.32,.76,a.x)*ab;
  float sparkle=clamp(.85*fragments+.45*flecks,0.,1.)*(.7+.3*smoothstep(.28,.80,grain));
  // Gradient gates break the irregular contour into short glints; no repeated
  // sine stripes, extra texture or modification of the water body's colour.
  float farFlecks=waterFineCoverage(farNoise.x,.53,.065)*smoothstep(.08,.35,abs(farNoise.y))*smoothstep(.08,.35,abs(farNoise.z))*farVisibility;
  sparkle=clamp(sparkle+.70*farFlecks*farWeight,0.,1.);
  vec2 worldSlope=axis*slope.x+crossAxis*slope.y;vec3 normal=normalize(vec3(-worldSlope.x,1.,-worldSlope.y));
  vec3 view=normalize(u_environment_perspective>.5?u_environment_eye-v_position:u_environment_view_direction);
  vec3 light=normalize(u_scene_sun_direction),halfway=normalize(view+light+vec3(0.,.00001,0.));
  float nv=clamp(dot(normal,view),0.,1.),nh=max(0.,dot(normal,halfway));
  float fresnel=.025+.975*pow(1.-nv,5.);
  float solar=u_scene_light_enabled*u_scene_daylight*step(0.,light.y);
  float specular=(.30*pow(nh,48.)+.70*pow(nh,160.))*solar;
  vec3 reflected=reflect(-view,normal);
  // Analytic sky tint is not a reflection of resident buildings or the map scene.
  vec3 sky=mix(vec3(.25,.32,.38),vec3(.57,.65,.70),clamp(reflected.y*.6+.4,0.,1.))*mix(.24,1.,mix(1.,u_scene_daylight,u_scene_light_enabled));
  // Stable blue-grey water body; only reflected light carries the moving flecks.
  vec3 lit=sceneSurfaceLight(base,normal,v_position.y);
  lit=mix(lit,sky,fresnel*.65);
  if(u_environment_reflection_enabled==1&&v_reflection_clip.w>0.){
   vec2 uv=v_reflection_clip.xy/v_reflection_clip.w*.5+.5+vec2(worldSlope.x,-worldSlope.y)*.018;
   if(all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.)))){vec4 building=texture(u_environment_reflection,uv);lit=mix(lit,building.rgb/max(building.a,.0001),building.a*clamp(fresnel*.90,.04,.80));}
  }
  // Broad sky glints keep fine facets legible outside the narrow solar lobe;
  // Fresnel/view and daylight still control their reflection brightness.
  float skyGlint=solar*(.20+.16*fresnel+.10*pow(nh,12.));
  lit+=vec3(.72,.80,.84)*sparkle*skyGlint;
  lit+=vec3(.79,.83,.83)*specular*(.18+.62*sparkle);
  color=vec4(lit,1.);
 }else{
  // Stable dark-green/olive lobes carry the crown shape. Gentle broad variation
  // avoids bright per-leaf speckling; trunks keep their untextured source display.
  if(v_role>.5){
   vec2 crown=v_position.xz*.6+vec2(v_position.y*.7,0.);
   float leaf=waterNoiseGradient(crown).x;
   base*=mix(1.,mix(.96,1.025,leaf),waterBandVisibility(crown));
  }
  color=vec4(sceneSurfaceLight(base,normalize(v_normal),v_position.y),1.);
 }
}`;
