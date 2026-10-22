export const OWNER_F202_PAINT_GLSL=String.raw`
float sm202Box(vec2 p,vec2 h){return 1.-smoothstep(-.025,.025,max(abs(p.x)-h.x,abs(p.y)-h.y));}
float sm202Lancet(float x,float y,float width,float low,float high){return step(abs(x),width)*step(low,y)*step(y,high-1.25*pow(abs(x)/width,1.35));}
vec3 mariaRecovery202(vec3 base,vec3 p,vec3 normal,vec4 f,float family){float u=f.x,y=f.y,v=f.z,k=f.w,nu=normal.x*.478+normal.z*.8783553,nv=-normal.x*.8783553+normal.z*.478;
 if(abs(k-1.)<.5){float tile=step(.93,fract(y/.32))+step(.97,fract(u/.45+floor(y/.32)*.5));return mix(vec3(.24,.26,.25),vec3(.17,.19,.19),min(1.,tile)*.5);}
 if(abs(k-6.)<.5)return vec3(.50,.49,.45);
 float row=floor(y/.43),cell=floor((u+v)/.92+mod(row,2.)*.5),grain=fract(sin(row*13.7+cell*37.1)*4193.7);vec3 stone=mix(vec3(.61,.56,.44),vec3(.81,.75,.61),grain);float mortar=max(step(.965,fract(y/.43)),step(.983,fract((u+v)/.92+mod(row,2.)*.5)));stone=mix(stone,vec3(.46,.44,.36),mortar*.45);
 if(abs(k-4.)<.5){float seam=step(.93,fract(y/.72));return mix(vec3(.39,.40,.35),vec3(.65,.62,.51),seam*.65);}
 if(abs(k-2.)<.5||abs(k-5.)<.5)return stone*.96;
 float opening=0.,x=0.;
 if(abs(k-7.)<.5){x=mod(u+.3+2.85,5.7)-2.85;float ry=17.+10.*max(0.,1.-abs(v)/10.8);opening=sm202Lancet(x,y-ry,.65,.05,1.85);return mix(stone,vec3(.14,.20,.20),opening);}
 if(abs(k-3.)<.5){float cv=v>0.?6.8:-6.8;x=abs(nu)>.7?v-cv:u-20.15;if(y<8.)opening=sm202Lancet(x,y,1.72,.45,6.25);else if(y<16.)opening=sm202Lancet(x,y,1.45,9.,14.9);else if(y>21.&&y<33.8){float pair=abs(x)-.9;opening=sm202Lancet(pair,y,.64,22.,33.4);}else opening=sm202Lancet(x,y,.32,17.8,19.5);
 float circle=length(vec2(x,y-34.0)),oculus=(1.-smoothstep(.65,.72,circle))*step(33.,y);opening=max(opening,oculus);vec3 c=mix(stone,vec3(.12,.15,.14),opening);if(y>22.&&y<32.5)c=mix(c,vec3(.28,.29,.25),step(.68,fract(y/.23))*opening);float bars=max(1.-smoothstep(.035,.065,abs(mod(x,.48)-.24)),1.-smoothstep(.03,.055,abs(mod(y,.85)-.425)));return mix(c,vec3(.62,.59,.47),bars*opening*.85);}
 if(nu>.75&&u>22.){x=v;if(y<7.){float a=v-6.8*floor((v+3.4)/6.8);opening=sm202Lancet(a,y,1.76,.25,6.6);}else if(abs(v)<3.0){float radius=length(vec2(v,y-12.4)),rose=1.-smoothstep(2.7,2.75,radius),ribs=max(1.-smoothstep(.035,.07,abs(sin(atan(y-12.4,v)*6.))*radius),1.-smoothstep(.05,.09,abs(radius-1.25)));vec3 c=mix(stone,vec3(.29,.35,.35),rose);return mix(c,stone*.77,ribs*rose);}else opening=sm202Lancet(abs(v)-6.8,y,1.55,8.6,14.7);}
 else if(abs(nv)>.68&&u>-5.3){x=mod(u-2.6+2.85,5.7)-2.85;opening=sm202Lancet(x,y,1.20,4.0,16.1)*step(abs(v),11.3);}
 else if(abs(nv)>.68&&u<-5.0&&u>-17.5){x=u+10.7;opening=sm202Lancet(x,y,2.1,5.,16.8);}
 else if(u<-17.){x=abs(nu)>.7?mod(v+1.65,3.3)-1.65:mod(u+1.65,3.3)-1.65;opening=sm202Lancet(x,y,.95,4.,16.4);}
 vec3 c=mix(stone,vec3(.19,.25,.25),opening);float bars=max(1.-smoothstep(.035,.065,abs(mod(x,.58)-.29)),1.-smoothstep(.03,.06,abs(mod(y,1.8)-.9)));return mix(c,stone*.80,bars*opening);
}
`;
