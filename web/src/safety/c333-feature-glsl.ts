import {c334MaterialFragment} from './c334-feature-glsl';
export const C333_FEATURE_GLSL=`float c333Arch(vec2 q,float x,float bottom,float width,float spring){float dx=abs(q.x-x);return step(bottom,q.y)*step(dx,width)*step(q.y,spring+sqrt(max(0.,width*width-dx*dx)));}
vec3 c333Church(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 float u=f.x,n=f.z,y=p.y;vec3 stone=vec3(.82,.80,.70);
 if(family==13444.)return vec3(.24,.29,.26);
 if(family==13442.)return vec3(.42,.60,.50);
 if(family==13441.){vec2 q=vec2(u,n);if(abs(u-12.125)<10.62&&abs(n+2.785)>8.4)q=q.yx;float a=mod(q.x+3.6,7.2)-3.6;float b=abs(mod(q.y+2.785,8.415)-4.2075);float diamond=abs(a)/3.6+abs(b-4.1)/3.5;vec3 c=vec3(.72,.66,.24);if(diamond<1.45)c=vec3(.22,.39,.31);if(diamond<1.05)c=vec3(.84,.73,.32);if(diamond<.66)c=vec3(.25,.43,.53);if(diamond<.31)c=vec3(.56,.31,.25);float grid=(1.-smoothstep(.015,.015+max(.015,fwidth(u)),abs(mod(u+.12,.24)-.12)))*.07;return c*(1.-grid);}
 float joint=1.-smoothstep(.012,.012+max(.02,fwidth(y)),abs(mod(y+.35,.7)-.35));vec3 c=stone*(1.-joint*.025);
 if(family==13443.){float axis=abs(normal.x)>.7?n:u;float center=abs(normal.x)>.7?(n>0.?17.205:-23.085):-29.51;float local=axis-center;float win=max(c333Arch(vec2(local,y),-.8,43.,.65,49.),c333Arch(vec2(local,y),.8,43.,.65,49.));c=mix(c,vec3(.16,.20,.19),win);float rose=abs(length(vec2(local,y-51.0))-1.);c=mix(c,vec3(.30,.32,.27),1.-smoothstep(.18,.28,rose));}
 bool front=dot(normal,vec3(-.9520734,0.,.3058695))>.8;
 if(family==13440.&&front&&u< -33.8&&n> -19.1&&n<13.6){float v=n+2.785;float rose=length(vec2(v,y-21.));if(rose<2.65)c=vec3(.37,.39,.31);if(rose<2.3){float a=atan(y-21.,v);float spoke=1.-smoothstep(.06,.10,abs(sin(a*8.)));c=mix(vec3(.23,.31,.30),stone,max(spoke,1.-smoothstep(.15,.22,abs(rose-1.3))));}for(int j=0;j<5;j++){float x=(float(j)-2.)*5.2;float outer=c333Arch(vec2(v,y),x,0.,1.85,4.6);float inner=c333Arch(vec2(v,y),x,.1,1.5,4.5);c=mix(c,stone*.86,outer);c=mix(c,vec3(.27,.26,.21),inner);}for(int j=0;j<7;j++){float x=(float(j)-3.)*3.5;float m=c333Arch(vec2(v,y),x,9.0,.9,11.5);c=mix(c,stone*.67,m);}}
 float cornice=min(min(abs(y-13.),abs(y-45.)),abs(y-60.));if(cornice<.25)c=stone*.87;
 return c;
}
`;
export function c333MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C333 dispatcher drift');return c334MaterialFragment(source.replace(anchor,C333_FEATURE_GLSL+'\n'+anchor+'if(family>=13440.&&family<=13444.)return c333Church(base,p,normal,frame,family);'),city);}
