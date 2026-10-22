import {c329MaterialFragment} from './c329-feature-glsl';
export const C328_FEATURE_GLSL=`
float c328Box(vec2 p,vec2 c,vec2 h){vec2 aa=max(fwidth(p),vec2(.008));vec2 v=1.-smoothstep(h-aa,h+aa,abs(p-c));return v.x*v.y;}
vec3 c328Antiken(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 vec3 stone=vec3(.83,.79,.68),pale=vec3(.92,.88,.79),dark=vec3(.33,.32,.27);float u=f.x,y=p.y,n=f.z;
 if(family==13391.||family==13392.){float panel=0.;if(family==13392.)panel=c328Box(vec2(u,n),vec2(0.,16.),vec2(9.3,11.));else panel=c328Box(vec2(abs(u),n),vec2(24.4,15.5),vec2(7.7,9.0));vec3 c=mix(vec3(.45,.65,.57),vec3(.53,.60,.59),panel);float seam=(1.-smoothstep(.015,.015+max(.02,fwidth(u)),abs(fract(u/1.5)-.5)))*panel;return mix(c,vec3(.43,.57,.52),seam*.35);}
 if(family==13394.)return vec3(.58,.56,.49);
 if(family==13393.)return stone;
 bool front=normal.x*.390612+normal.z*.919292>.8;
 if(!front||n>6.)return stone;
 vec2 q=vec2(u,y);vec3 c=stone;
 if(abs(u)<11.9){
  c=mix(c,dark,c328Box(q,vec2(0.,9.0),vec2(11.85,6.0)));
  for(int i=0;i<8;i++){float x=(float(i)-3.5)*2.96;float shaft=c328Box(q,vec2(x,9.0),vec2(.56,5.65));c=mix(c,pale*(.93+.06*sqrt(max(0.,1.-pow((u-x)/.56,2.)))),shaft);c=mix(c,pale,c328Box(q,vec2(x,3.18),vec2(.78,.16)));c=mix(c,pale,c328Box(q,vec2(x,14.78),vec2(.82,.34)));}
  c=mix(c,vec3(.24,.22,.17),c328Box(q,vec2(0.,5.15),vec2(1.20,2.2)));
  float band=c328Box(q,vec2(0.,15.2),vec2(11.85,.28));c=mix(c,pale,band);
 }else{for(int i=0;i<4;i++){float x=15.5+5.*float(i);c=mix(c,pale,c328Box(vec2(abs(u),y),vec2(x,5.5),vec2(.35,3.2)));}}
 if(y<2.8){float joint=1.-smoothstep(.02,.02+max(.02,fwidth(y)),abs(fract(y/.6)-.5));c*=1.-joint*.07;}
 return c;
}
`;
export function c328MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C328 dispatcher drift');return c329MaterialFragment(source.replace(anchor,C328_FEATURE_GLSL+'\n'+anchor+'if(family>=13390.&&family<=13394.)return c328Antiken(base,p,normal,frame,family);'),city);}
