export const OWNER_F204_PAINT_GLSL=String.raw`
float op204Box(vec2 p,vec2 h){return 1.-smoothstep(-.025,.025,max(abs(p.x)-h.x,abs(p.y)-h.y));}
float op204Arch(float x,float y,float w,float low,float high){return step(abs(x),w)*step(low,y)*step(y,high-w+sqrt(max(0.,w*w-x*x)));}
vec3 operaRecovery204(vec3 base,vec3 p,vec3 normal,vec4 f,float family){float u=f.x,y=f.y,v=f.z,k=f.w,nu=normal.x*.91+normal.z*(-.4146082488),nv=normal.x*.4146082488+normal.z*.91;
 if(abs(k-1.)<.5){float q=abs(nu)>.7?v:u,seam=step(.955,fract(q/.65));return mix(vec3(.38,.57,.48),vec3(.24,.38,.33),seam*.65);}
 if(abs(k-8.)<.5)return vec3(.55,.54,.47);
 float row=floor(y/.48),cell=floor((u+v)/1.05+mod(row,2.)*.5),g=fract(sin(row*17.3+cell*31.7)*4191.);vec3 stone=mix(vec3(.59,.53,.40),vec3(.80,.74,.59),g);float mortar=max(step(.97,fract(y/.48)),step(.985,fract((u+v)/1.05+mod(row,2.)*.5)));stone=mix(stone,vec3(.50,.47,.38),mortar*.35);
 if(abs(k-2.)<.5||abs(k-7.)<.5)return stone;
 if(abs(k-3.)<.5){float mullion=max(1.-smoothstep(.03,.06,abs(mod(u+v,.85)-.425)),1.-smoothstep(.03,.055,abs(mod(y,1.55)-.775)));return mix(vec3(.19,.28,.28),vec3(.48,.54,.46),mullion);}
 float win=0.,axis=abs(nu)>.7?v:u,x=0.;
 if(k<.5&&u<-30.){float angle=atan(v-4.1419969,-(u+15.5038962)),a=angle*25.482782; x=100.;for(int j=0;j<5;j++){float center=j==0?-12.6999146038:j==1?-6.3578092010:j==2?-0.0157037983:j==3?6.3264016045:12.6685070072;float dx=a-center;if(abs(dx)<abs(x))x=dx;}if(y<5.2){win=op204Box(vec2(x,y-2.4),vec2(1.25,2.1));return mix(stone,vec3(.19,.14,.10),win);}if(y<18.6){win=op204Arch(x,y,1.6,7.0,18.0);vec3 c=mix(stone,vec3(.25,.32,.32),win);float bars=max(1.-smoothstep(.028,.055,abs(mod(x,.48)-.24)),1.-smoothstep(.025,.05,abs(mod(y,.70)-.35)));return mix(c,vec3(.70,.70,.60),bars*win);}if(y<25.4){win=op204Box(vec2(x,y-22.7),vec2(.8,.55));return mix(stone,vec3(.21,.28,.28),win);}return stone;}
 if(abs(k-6.)<.5){vec3 c=vec3(.69,.68,.58);float xx=mod(axis+1.85,3.7)-1.85,yy=2.4+3.8*floor((y-.5)/3.8);win=op204Box(vec2(xx,y-yy),vec2(.95,.95))*step(y,20.9);return mix(c,vec3(.19,.25,.24),win);}
 x=mod(axis+1.95,3.9)-1.95;float cy=2.4+4.1*floor((y-.6)/4.1);if(y<19.)win=op204Box(vec2(x,y-cy),vec2(.85,1.20));if(k<.5&&u>0.&&u<23.6&&y>25.)win=0.;vec3 c=mix(stone,vec3(.18,.25,.24),win);float bars=max(1.-smoothstep(.025,.05,abs(x)),1.-smoothstep(.025,.05,abs(y-cy)));return mix(c,stone*.8,bars*win);
}
`;
