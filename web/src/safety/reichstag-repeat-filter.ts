import {SCENE_SURFACE_LIGHT_GLSL} from './scene-surface-light';
import {FACADE_PAINT_PRIMITIVE_GLSL} from './facade-paint-primitives';
import {FACADE_OPENING_GLSL} from './facade-opening-primitives';
import {REICHSTAG_FACADE_GLSL} from './facade-reichstag-layouts';

// Exact composition, retaining references to existing snippets rather than
// another complete fragment. Unknown or changed compositions stay intact.
const SOURCE_PARTS:readonly string[]=[
"#version 300 es\nprecision highp float;in vec4 v_colour;in vec3 v_position;in vec3 v_normal;in float v_light;in vec4 v_frame;flat in float v_family;uniform float u_reflection_clip_enabled;uniform float u_reflection_min_height;uniform float u_opacity;uniform float u_selected;uniform float u_paint_mode;out vec4 colour;\n",
SCENE_SURFACE_LIGHT_GLSL,
"\nuniform float u_growth;\n",
FACADE_PAINT_PRIMITIVE_GLSL,
"\n",
FACADE_OPENING_GLSL,
"\n",
REICHSTAG_FACADE_GLSL,
"\nvoid main(){if(u_reflection_clip_enabled>.5&&v_position.y*u_growth<u_reflection_min_height)discard;vec3 c=u_paint_mode<.5?vec3(v_light):u_paint_mode>1.5?rrPaint(v_colour.rgb/max(v_light,.01),v_position,v_normal,v_frame,v_family)*v_light:v_colour.rgb;c=sceneSurfaceLight(c/max(v_light,.01),normalize(v_normal),v_position.y*u_growth);colour=vec4(mix(c,vec3(.98,.78,.3),u_selected*.65),v_colour.a*u_opacity);}"
];
const ORIGINAL_MAIN="void main(){if(u_reflection_clip_enabled>.5&&v_position.y*u_growth<u_reflection_min_height)discard;vec3 c=u_paint_mode<.5?vec3(v_light):u_paint_mode>1.5?rrPaint(v_colour.rgb/max(v_light,.01),v_position,v_normal,v_frame,v_family)*v_light:v_colour.rgb;c=sceneSurfaceLight(c/max(v_light,.01),normalize(v_normal),v_position.y*u_growth);colour=vec4(mix(c,vec3(.98,.78,.3),u_selected*.65),v_colour.a*u_opacity);}";

const PREPARE=`vec2 rrFrameDx=dFdx(v_frame.xy),rrFrameDy=dFdy(v_frame.xy);
rrFilterU=vec2(rrFrameDx.x,rrFrameDy.x);rrFilterV=vec2(rrFrameDx.y,rrFrameDy.y);
float rrDomeY=clamp(v_frame.y/max(v_frame.z,.0001),0.,1.);
rrFilterDomeY=vec2(dFdx(rrDomeY),dFdy(rrDomeY));
rrFilterStoneX=fwidth(v_frame.x+mod(floor(v_frame.y/.58),2.)*1.1);
`;
const FILTER_GLSL=`
vec2 rrFilterU,rrFilterV,rrFilterDomeY;
float rrFilterStoneX;
float rrFilterWidth(vec2 gradient){return abs(gradient.x)+abs(gradient.y);}
float rrRepeatFiltered(float value,float period,float halfWidth,float footprint){
 float p=max(period,.05),w=max(halfWidth,.0001),aa=max(footprint,.0001);
 float d=abs(mod(value+.5*p,p)-.5*p);
 float resolved=1.-smoothstep(max(0.,w-aa),w+aa,d);
 float periodMean=clamp(2.*w/p,0.,1.);
 float weight=smoothstep(.25,.5,footprint/p)*step(u_selected,.5);
 return mix(resolved,periodMean,weight);
}
`;
// Only colour-repeat sites in the exact Reichstag layout. Opening, column,
// roof-boundary and structural helpers remain byte-identical.
const REPEATS:readonly(readonly[string,string])[]=[
 ['fpRepeatStroke(uv.y,.58,.021)','rrRepeatFiltered(uv.y,.58,.021,rrFilterWidth(rrFilterV))'],
 ['fpRepeatStroke(uv.x+mod(floor(uv.y/.58),2.)*1.1,2.2,.018)','rrRepeatFiltered(uv.x+mod(floor(uv.y/.58),2.)*1.1,2.2,.018,rrFilterStoneX)'],
 ['fpRepeatStroke(uv.y+.045,.58,.013)','rrRepeatFiltered(uv.y+.045,.58,.013,rrFilterWidth(rrFilterV))'],
 ['fpRepeatStroke(uv.x,bay,.15)','rrRepeatFiltered(uv.x,bay,.15,rrFilterWidth(rrFilterU))'],
 ['fpRepeatStroke(uv.x,2.4,.024)','rrRepeatFiltered(uv.x,2.4,.024,rrFilterWidth(rrFilterU))'],
 ['fpRepeatStroke(uv.y,3.6,.025)','rrRepeatFiltered(uv.y,3.6,.025,rrFilterWidth(rrFilterV))'],
 ['fpRepeatStroke(uv.x,1.6,.045)','rrRepeatFiltered(uv.x,1.6,.045,rrFilterWidth(rrFilterU))'],
 ['fpRepeatStroke(uv.y,2.8,.055)','rrRepeatFiltered(uv.y,2.8,.055,rrFilterWidth(rrFilterV))'],
 ['fpRepeatStroke(y-uv.x*.5,.5,.004)','rrRepeatFiltered(y-uv.x*.5,.5,.004,rrFilterWidth(rrFilterDomeY-.5*rrFilterU))'],
 ['fpRepeatStroke(y+uv.x*.5,.5,.004)','rrRepeatFiltered(y+uv.x*.5,.5,.004,rrFilterWidth(rrFilterDomeY+.5*rrFilterU))'],
 ['fpRepeatStroke(uv.x,1./24.,.0010)','rrRepeatFiltered(uv.x,1./24.,.0010,rrFilterWidth(rrFilterU))'],
 ['fpRepeatStroke(y,1./17.,.0038)','rrRepeatFiltered(y,1./17.,.0038,rrFilterWidth(rrFilterDomeY))'],
 ['fpRepeatStroke(uv.x+.002,1./24.,.0007)','rrRepeatFiltered(uv.x+.002,1./24.,.0007,rrFilterWidth(rrFilterU))'],
 ['fpRepeatStroke(y,1./17.,.006)','rrRepeatFiltered(y,1./17.,.006,rrFilterWidth(rrFilterDomeY))'],
 ['fpRepeatStroke(uv.x,4.0,.037)','rrRepeatFiltered(uv.x,4.0,.037,rrFilterWidth(rrFilterU))'],
 ['fpRepeatStroke(uv.y,3.2,.033)','rrRepeatFiltered(uv.y,3.2,.033,rrFilterWidth(rrFilterV))'],
 ['fpRepeatStroke(uv.x,1.25,.023)','rrRepeatFiltered(uv.x,1.25,.023,rrFilterWidth(rrFilterU))'],
 ['fpRepeatStroke(uv.y,1.9,.022)','rrRepeatFiltered(uv.y,1.9,.022,rrFilterWidth(rrFilterV))'],
];
/** Dedicated-only colour filtering. New derivatives run at the start of main,
 * before reflection discard or material branches. Dome gradients use frame.y/H;
 * signed ramp gradients combine before abs. Selected surfaces retain resolved
 * coverage, not bitwise equivalence to old derivatives at folds/staggered rows.
 */
export function filterDedicatedReichstagRepeats(fragment:string):string{
 let at=0;for(const part of SOURCE_PARTS){if(!fragment.startsWith(part,at))return fragment;at+=part.length;}
 if(at!==fragment.length)return fragment;
 let layout=REICHSTAG_FACADE_GLSL;
 for(const [before,after]of REPEATS){if(layout.split(before).length!==2)return fragment;layout=layout.replace(before,after);}
 if(/\bfpRepeatStroke\s*\(/.test(layout))return fragment;
 return fragment.replace(REICHSTAG_FACADE_GLSL,FILTER_GLSL+layout).replace(ORIGINAL_MAIN,ORIGINAL_MAIN.replace('void main(){','void main(){'+PREPARE));
}
