import {c322MaterialFragment} from './c322-feature-glsl';
export const C321_FEATURE_GLSL=`
vec3 c321Belfry(vec4 frame){
 vec3 brick=vec3(.51,.33,.28),stone=vec3(.68,.63,.54);
 float u=fract(atan(frame.z,frame.x)/6.2831853*8.+.5)-.5;
 float a=max(.012,fwidth(u)),radius=.29;
 float arch=36.+1.7*sqrt(max(0.,1.-pow(u/radius,2.)));
 float opening=(1.-smoothstep(radius-a,radius+a,abs(u)))*smoothstep(31.8,32.1,frame.y)*(1.-smoothstep(arch-.08,arch+.08,frame.y));
 float trim=(1.-smoothstep(.045,.075,abs(frame.y-arch)))*(1.-smoothstep(.32,.35,abs(u)))*step(35.8,frame.y);
 float band=1.-smoothstep(.10,.20,min(abs(frame.y-31.7),abs(frame.y-39.0)));
 return mix(mix(brick,stone,max(trim,band)),vec3(.15,.17,.16),opening);
}
vec3 c321LukasMaterial(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 brick=vec3(.51,.33,.28),copper=vec3(.40,.55,.48),slate=vec3(.25,.27,.26),stone=vec3(.68,.63,.54);
 if(family==13320.)return brick;
 if(family==13321.)return frame.w>.5&&frame.y<frame.w?brick:copper;
 if(family==13322.)return frame.w>.5&&frame.y<frame.w?c321Belfry(frame):slate;
 if(family==13323.)return copper;
 if(family==13324.)return stone;
 if(family==13325.)return c321Belfry(frame);
 return base;
}
`;
export function c321MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C321 dispatcher drift');return c322MaterialFragment(source.replace(anchor,C321_FEATURE_GLSL+'\n'+anchor+'if(family>=13320.&&family<=13325.)return c321LukasMaterial(base,p,normal,frame,family);'),city);}
