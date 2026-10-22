import {c332MaterialFragment} from './c332-feature-glsl';
export const C331_FEATURE_GLSL=`
vec3 c331Center(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family==13422.)return vec3(.43,.63,.54);
 if(family==13421.){float grain=fract(sin(dot(p.xz,vec2(12.9898,78.233)))*43758.5453);float fade=1.-smoothstep(.12,.5,max(fwidth(p.x),fwidth(p.z)));return vec3(.65,.65,.60)*(1.+(grain-.5)*.025*fade);}
 float u=abs(normal.x)>.6?p.z:p.x;float y=p.y;float line=(1.-smoothstep(.012,.012+max(.025,fwidth(u)),abs(fract(u/4.)-.5)))*.04;float band=(1.-smoothstep(.05,.15,min(abs(y-.45),abs(y-4.0))))*.035;vec3 c=vec3(.67,.67,.63)*(1.-line-band);
 bool west=normal.x*(-.919292)+normal.z*.390612>.8;
 if(west&&f.z>.25&&f.z<22.8){float bay=mod(f.z-.25,3.25);float side=smoothstep(.42,.52,bay)*(1.-smoothstep(2.75,2.85,bay));float low=smoothstep(.95,1.03,y)*(1.-smoothstep(3.65,3.73,y));float upper=smoothstep(4.55,4.63,y)*(1.-smoothstep(6.65,6.73,y));c=mix(c,vec3(.24,.29,.28),side*max(low,upper));float lintel=smoothstep(3.72,3.78,y)*(1.-smoothstep(4.0,4.08,y));c=mix(c,vec3(.49,.50,.47),side*lintel);}
 return c;
}
`;
export function c331MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C331 dispatcher drift');return c332MaterialFragment(source.replace(anchor,C331_FEATURE_GLSL+'\n'+anchor+'if(family>=13420.&&family<=13422.)return c331Center(base,p,normal,frame,family);'),city);}
