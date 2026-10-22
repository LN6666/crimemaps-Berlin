export const OWNER_F203_PAINT_GLSL=String.raw`
float fk203Box(vec2 p,vec2 h){return 1.-smoothstep(-.025,.025,max(abs(p.x)-h.x,abs(p.y)-h.y));}
float fk203Arch(float x,float y,float w,float low,float high){return step(abs(x),w)*step(low,y)*step(y,high-w+sqrt(max(0.,w*w-x*x)));}
vec3 friedensRecovery203(vec3 base,vec3 p,vec3 normal,vec4 f,float family){float u=f.x,y=f.y,v=f.z,k=f.w,nu=normal.x*.6395605334+normal.z*(-.7687407392),nv=normal.x*.7687407392+normal.z*.6395605334;
 if(abs(k-1.)<.5)return vec3(.26,.28,.27)+sin(u*16.+v*19.)*.008;
 if(abs(k-2.)<.5)return vec3(.74,.75,.70);
 if(abs(k-5.)<.5){float q=abs(nu)>.7?v:u,seam=step(.93,fract(q/.38));return mix(vec3(.44,.61,.51),vec3(.28,.40,.36),seam*.65);}
 if(abs(k-8.)<.5)return vec3(.68,.55,.27);
 float row=floor(y/.43),cell=floor((u+v)/.90+mod(row,2.)*.5),noise=fract(sin(row*13.6+cell*47.)*4097.);vec3 stone=mix(vec3(.58,.50,.37),vec3(.77,.68,.51),noise);float mortar=max(step(.96,fract(y/.43)),step(.98,fract((u+v)/.90+mod(row,2.)*.5)));stone=mix(stone,vec3(.43,.40,.32),mortar*.35);
 if(abs(k-4.)<.5||abs(k-7.)<.5)return stone;
 if(abs(k-9.)<.5){vec3 c=vec3(.76,.77,.71);float axis=abs(nu)>.7?v:u,x=mod(axis+1.6,3.2)-1.6,cy=y<3.7?2.2:5.65,win=fk203Box(vec2(x,y-cy),vec2(.70,.72));return mix(c,vec3(.21,.28,.26),win);}
 if(k>2.5){float x=abs(nu)>.7?v+8.35:u+14.25;
 if(abs(k-6.)<.5){float win=fk203Arch(x,y,.30,41.4,43.6);return mix(stone,vec3(.10,.13,.12),win);}
 if(y>25.&&y<31.7){vec2 q=vec2(x,y-28.5);float r=length(q),dial=1.-smoothstep(1.78,1.82,r),ring=step(1.63,r)*dial,ticks=step(.91,cos(atan(q.y,q.x)*12.))*step(1.42,r)*dial;vec3 c=mix(stone,vec3(.10,.14,.15),dial);c=mix(c,vec3(.77,.65,.33),max(ring,ticks));float hand=max(fk203Box(vec2(q.x,q.y-.6),vec2(.06,.65)),fk203Box(vec2(q.x-.42,q.y+.20),vec2(.50,.05)));return mix(c,vec3(.85,.73,.37),hand*dial);}
 float win=0.;if(y>32.2&&y<39.9)win=fk203Arch(abs(x)-.95,y,.70,33.2,39.5);else if(y>10.5&&y<22.2)win=fk203Arch(x,y,1.35,11.,21.6);else if(y<6.5)win=fk203Arch(x,y,1.1,.3,5.5);vec3 c=mix(stone,vec3(.12,.17,.16),win);float bar= y>32.?step(.65,fract(y/.24)):max(1.-smoothstep(.025,.05,abs(x)),1.-smoothstep(.03,.05,abs(mod(y,2.)-1.)));return mix(c,stone*.80,bar*win);}
 // Cast-concrete nave: shallow horizontal offsets, specific irregular stained-glass modules on SWwall.
 float panel=floor(y/1.55),seam=1.-smoothstep(.012,.035,abs(mod(y,1.55)-.03));vec3 c=vec3(.80,.81,.76)-seam*.055+sin(u*29.+y*31.)*.005;
 float win=0.;if((nv<-.72&&v<-14.)||(nv>.72&&v>14.6)){if((nv<0.&&y>9.8&&y<13.9)||(nv>0.&&y>5.2&&y<15.6)){float col=floor((u+12.)/4.),x=mod(u+12.,4.)-2.,cy=nv<0.?11.8+mod(col,2.)*.40:6.6+3.5*floor((y-5.2)/3.5),yy=y-cy;float outer=fk203Box(vec2(x,yy),vec2(1.36,1.15)),cut=max(fk203Box(vec2(x+.15,yy-.20),vec2(1.4,.13)),fk203Box(vec2(x-.25,yy+.35),vec2(.13,.90)));win=outer*(1.-cut);vec3 glass=mix(vec3(.24,.32,.34),vec3(.28,.39,.55),step(.55,fract(sin(col*13.+floor(y/3.5)*31.)*4193.)));return mix(c,glass,win);}if(y<4.){float door=fk203Box(vec2(u+9.,y-1.45),vec2(2.6,1.45)),slot=fk203Box(vec2(mod(u+2.,4.)-2.,y-2.5),vec2(.85,.22));c=mix(c,vec3(.12,.19,.18),max(door,slot));}}
 if(nu>.72&&u>12.){float slot=fk203Box(vec2(v-3.1,y-9.5),vec2(.48,8.8)),bar=step(.96,fract(y/1.8));c=mix(c,mix(vec3(.17,.31,.31),vec3(.56,.64,.58),bar),slot);}
 // Rear currentphoto detail is screened: bounded narrow corner strips and small service doors rather than generic all-wall windows.
 if(nv>.72&&v>14.6){float slot=fk203Box(vec2(u+10.7,y-9.5),vec2(.35,8.5)),door=fk203Box(vec2(u-8.8,y-1.2),vec2(.65,1.2));c=mix(c,vec3(.18,.27,.25),max(slot,door));}
 if(nu<-.72&&u<-12.3&&v>-2.8&&v<.35){float glass=step(.95,fract(y/2.5));c=mix(vec3(.18,.25,.25),vec3(.57,.61,.56),glass);}
 if(nu<-.72&&u<-10.4&&y<4.)c=mix(c,vec3(.18,.25,.23),fk203Box(vec2(v-8.2,y-1.4),vec2(.8,1.4)));return c;
}
`;
