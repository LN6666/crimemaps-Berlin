import {c326MaterialFragment} from './c326-feature-glsl';
export const C325_FEATURE_GLSL=`
vec3 c325Margaret(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family==13360.)return vec3(.88,.86,.80);
 if(family==13361.)return vec3(.66,.29,.20)*(1.-.035*abs(normal.x));
 if(family==13362.)return vec3(.40,.63,.54);
 if(family==13363.)return vec3(.91,.90,.85);
 if(family==13364.)return vec3(.28,.29,.27)*(1.-.035*abs(normal.x));
 return base;
}
`;
export function c325MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C325 dispatcher drift');return c326MaterialFragment(source.replace(anchor,C325_FEATURE_GLSL+'\n'+anchor+'if(family>=13360.&&family<=13364.)return c325Margaret(base,p,normal,frame,family);'),city);}
