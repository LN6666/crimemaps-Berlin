import {SCENE_SURFACE_LIGHT_GLSL} from './scene-surface-light';
/** Ordinary Hamburg mode0 only. Same packed native position/normal/state; no paint GLSL. */
export const HAMBURG_WHITE_VERTEX=`#version 300 es
in vec3 a_position;in vec3 a_normal;in float a_selected;uniform mat4 u_matrix;out vec3 v_color;out vec3 v_normal;out float v_height;out float v_growth;flat out float v_selected;
void main(){float growth=mod(a_selected,2.);v_growth=growth;v_selected=step(2.,mod(a_selected,4.));vec3 n=normalize(vec3(a_normal.x,a_normal.y/max(growth,.005),a_normal.z));float light=.63+.37*max(0.,dot(n,normalize(vec3(-.35,.8,.4))));v_color=vec3(light);v_normal=n;v_height=a_position.y*growth;gl_Position=u_matrix*vec4(a_position.x,a_position.y*growth,a_position.z,1.);}`;
export const HAMBURG_WHITE_FRAGMENT=`#version 300 es
precision highp float;in vec3 v_color;in vec3 v_normal;in float v_height;in float v_growth;flat in float v_selected;uniform float u_opacity;out vec4 color;
${SCENE_SURFACE_LIGHT_GLSL}
void main(){gl_FragDepth=gl_FragCoord.z;if(v_growth<.005)discard;color=vec4(mix(sceneSurfaceLight(vec3(1.),normalize(v_normal),v_height),vec3(.98,.78,.3),v_selected*.65),u_opacity);}`;
