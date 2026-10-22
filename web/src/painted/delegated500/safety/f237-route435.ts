import{PROGRESSIVE_FEATURE_SHA,PROGRESSIVE_FEATURE_GLSL}from'./progressive-feature-glsl';
import{PROGRESSIVE_CITY_SOURCE_FULL_SHA,PROGRESSIVE_CITY_EXTRA_GLSL}from'./progressive-feature-cities';
// Mirrors actual facadePaintFragmentForCity selection. Dortmund is not Berlin/Hamburg partitioned.
export function f237ActualRoute435(program:string){const specialized=PROGRESSIVE_CITY_SOURCE_FULL_SHA===PROGRESSIVE_FEATURE_SHA?PROGRESSIVE_CITY_EXTRA_GLSL['dortmund']:undefined;const source=specialized===undefined?PROGRESSIVE_FEATURE_GLSL:specialized;return source.includes(program)&&source.includes('if(family==1707.)return f237Full412(base,p,normal,frame,family);');}
