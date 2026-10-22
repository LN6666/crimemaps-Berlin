import {c330MaterialFragment} from './c330-feature-glsl';
export const C329_FEATURE_GLSL=`
vec3 c329Cloister(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family==13401.)return vec3(.27,.29,.29);
 float u=abs(normal.x)>.7?p.z:p.x;float y=p.y;float row=floor(y/.24);vec2 q=vec2(u+mod(row,2.)*.24,y);vec2 g=abs(fract(q/vec2(.48,.24))-.5);vec2 aa=max(fwidth(q/vec2(.48,.24)),vec2(.015));float seam=max(1.-smoothstep(.025,.025+aa.x,g.x),1.-smoothstep(.025,.025+aa.y,g.y));float fade=1.-smoothstep(.22,.65,max(aa.x,aa.y));vec3 brick=vec3(.56,.32,.24);vec3 c=mix(brick,vec3(.62,.51,.42),seam*.25*fade);
 float eave=1.-smoothstep(.10,.22,abs(y-11.7));c=mix(c,vec3(.42,.28,.23),eave*.45);if(y<.55)c=vec3(.46,.44,.38);return c;
}
`;
export function c329MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C329 dispatcher drift');return c330MaterialFragment(source.replace(anchor,C329_FEATURE_GLSL+'\n'+anchor+'if(family>=13400.&&family<=13401.)return c329Cloister(base,p,normal,frame,family);'),city);}
