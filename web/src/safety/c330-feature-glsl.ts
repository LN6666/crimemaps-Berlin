import {c331MaterialFragment} from './c331-feature-glsl';
export const C330_FEATURE_GLSL=`
float c330Arch(vec2 q,float x,float bottom,float width,float height){float dx=(q.x-x)/width;float top=bottom+height-width+width*sqrt(max(0.,1.-dx*dx));return (1.-smoothstep(.97,1.03,abs(dx)))*smoothstep(bottom,bottom+.06,q.y)*(1.-smoothstep(top-.04,top+.04,q.y));}
vec3 c330Bonifaz(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 vec3 pale=vec3(.88,.83,.71),brick=vec3(.58,.31,.23);if(family==13411.)return vec3(.29,.31,.30);if(family==13412.)return pale;
 float u=f.x,y=p.y;vec3 c=brick;float mortar=(1.-smoothstep(.015,.015+max(.025,fwidth(y/.24)),abs(fract(y/.24)-.5)))*.035*(1.-smoothstep(.2,.6,fwidth(y/.24)));c=mix(c,vec3(.64,.53,.44),mortar);
 bool front=normal.x*(-.390612)+normal.z*(-.919292)>.8;
 if(front&&abs(f.z-4.5)<.6&&abs(u)<8.6){
  if(y>9.8&&y<15.4){float glass=0.,rim=0.;for(int i=0;i<3;i++){float x=(float(i)-1.)*4.7;float outer=c330Arch(vec2(u,y),x,10.4,1.2,3.8),inner=c330Arch(vec2(u,y),x,10.55,.96,3.50);rim=max(rim,outer-inner);glass=max(glass,inner);}c=mix(c,pale,rim);c=mix(c,vec3(.20,.25,.28),glass);}
  if(abs(u)>7.65&&y>8.5)c=pale;
  float gable=15.5+3.*(1.-abs(u)/8.5);float trim=1.-smoothstep(.12,.28,abs(y-gable));c=mix(c,pale,trim);
  if(abs(u)<1.7&&y<4.5)c=vec3(.25,.20,.15);
 }
 if(y<.55)c=pale*.75;return c;
}
`;
export function c330MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C330 dispatcher drift');return c331MaterialFragment(source.replace(anchor,C330_FEATURE_GLSL+'\n'+anchor+'if(family>=13410.&&family<=13412.)return c330Bonifaz(base,p,normal,frame,family);'),city);}
