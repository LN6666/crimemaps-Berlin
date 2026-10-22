import {c328MaterialFragment} from './c328-feature-glsl';
export const C327_FEATURE_GLSL=`
vec3 c327Propylaeen(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 vec3 stone=vec3(.84,.81,.73),pale=vec3(.91,.88,.80),dark=vec3(.23,.24,.22);float y=p.y;
 if(family==13381.)return vec3(.36,.39,.38);
 if(family==13383.)return stone;
 if(family==13382.){float band=1.-smoothstep(.04,.12,min(abs(y-14.0),abs(y-15.6)));return mix(stone,pale,band);}
 if(family==13384.)return mix(stone,pale,.15);
 float row=abs(fract(y/.8)-.5);float seam=(1.-smoothstep(.012,.012+max(.02,fwidth(y/.8)),row))*.035;vec3 c=stone*(1.-seam);

 float band=1.-smoothstep(.05,.13,min(abs(y-17.),abs(y-24.8)));return mix(c,pale,band);
}
`;
export function c327MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C327 dispatcher drift');return c328MaterialFragment(source.replace(anchor,C327_FEATURE_GLSL+'\n'+anchor+'if(family>=13380.&&family<=13384.)return c327Propylaeen(base,p,normal,frame,family);'),city);}
