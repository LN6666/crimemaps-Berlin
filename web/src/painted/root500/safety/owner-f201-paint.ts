export const OWNER_F201_PAINT_GLSL=String.raw`
float eb201Box(vec2 p,vec2 h){return 1.-smoothstep(-.025,.025,max(abs(p.x)-h.x,abs(p.y)-h.y));}
vec3 eberhardRecovery201(vec3 base,vec3 p,vec3 normal,vec4 f,float family){float u=f.x,y=f.y,v=f.z,k=f.w;float nu=normal.x*.8701573448+normal.z*(-.4927739799),nv=normal.x*.4927739799+normal.z*.8701573448;
 if(abs(k-2.)<.5||abs(k-4.)<.5||abs(k-8.)<.5){float seam=1.-smoothstep(.012,.035,abs(mod(u,.55)-.275));vec3 copper=abs(k-8.)<.5?vec3(.40,.43,.43):vec3(.35,.55,.48);return mix(copper,copper*.70,seam*.4);}
 if(abs(k-3.)<.5){float axis=abs(nu)>.7?v:u,rib=1.-smoothstep(.05,.09,abs(mod(axis,.52)-.26));vec3 c=vec3(.26,.39,.35);if(y>17.2&&y<24.9){float slat=step(.70,fract(y/.19));c=mix(vec3(.10,.17,.15),vec3(.20,.28,.25),slat);}return mix(c,vec3(.44,.57,.50),rib*.8);}
 if(abs(k-5.)<.5)return vec3(.55,.40,.34)+sin(y*20.+v*11.)*.016;
 if(abs(k-6.)<.5)return vec3(.49,.47,.43);
 if(abs(k-7.)<.5)return vec3(.24,.29,.25);
 if(k<.5){float row=floor(y/.40),cell=floor(v/.95+mod(row,2.)*.5),h=fract(sin(row*14.31+cell*35.1)*4157.3);vec3 c=mix(vec3(.56,.40,.33),vec3(.72,.61,.49),h);float mortar=max(step(.955,fract(y/.40)),step(.975,fract(v/.95+mod(row,2.)*.5)));c=mix(c,vec3(.62,.55,.46),mortar*.55);
 if(nu<-.72&&u<0.){if(abs(v)<6.4&&y<4.65){float a=v-4.2*floor((v+2.1)/4.2),door=eb201Box(vec2(a,y-2.35),vec2(1.15,1.55)),arch=step(abs(a),1.35)*step(3.85,y)*step(y,4.55-.20*pow(a/1.35,2.));float grille=max(1.-smoothstep(.025,.05,abs(mod(a,.25)-.125)),1.-smoothstep(.025,.05,abs(y-2.8)));c=mix(c,vec3(.14,.20,.18),max(door,arch));c=mix(c,vec3(.49,.51,.44),grille*max(door,arch));return c;}vec2 q=vec2(v,y-8.6);float r=length(q),rim=1.-smoothstep(3.28,3.35,r),inside=1.-smoothstep(3.02,3.10,r),crossMask=max(eb201Box(vec2(q.x,q.y),vec2(.38,3.1)),eb201Box(vec2(q.x,q.y),vec2(3.1,.30)));c=mix(c,vec3(.54,.40,.33),rim);float pane=inside*(1.-crossMask);c=mix(c,vec3(.23,.29,.28),pane);float bars=max(1.-smoothstep(.018,.035,abs(mod(q.x,.34)-.17)),1.-smoothstep(.018,.035,abs(mod(q.y,.38)-.19)));c=mix(c,vec3(.42,.44,.38),bars*pane);if(abs(v)>7.2){float target=abs(v)>12.5?(v>0.?14.1:15.6):9.6;float a=abs(v)-target,pair=abs(abs(a)-.45),yc=y<4.?2.0:y<8.?6.:10.;float win=eb201Box(vec2(pair,y-yc),vec2(.24,.70));c=mix(c,vec3(.17,.24,.22),win);}return c;}return c;}
 // Verified pale plaster side elevation, distinct from front sandstone. Seven tall narrow shallow-arched bays.
 vec3 c=vec3(.82,.81,.75)+sin(u*20.+y*37.)*.008;
 if(abs(nv)>.7&&u>2.5){float a=mod(u-5.+2.35,4.7)-2.35;if(y<9.){float opening=step(abs(a),.48)*step(3.3,y)*step(y,7.8+.20*sqrt(max(0.,1.-a*a/.25)));c=mix(c,vec3(.15,.23,.21),opening);float bars=max(1.-smoothstep(.025,.05,abs(a)),1.-smoothstep(.025,.05,abs(mod(y,.65)-.325)));c=mix(c,vec3(.39,.42,.36),bars*opening);}else{float slit=eb201Box(vec2(a,y-10.85),vec2(.13,.62)),small=eb201Box(vec2(a,y-8.8),vec2(.30,.35));c=mix(c,vec3(.18,.25,.22),max(slit,small));}}
 if(nu>.75&&u>34.){float a=mod(v+1.,1.25)-.625,cy=1.6+2.0*floor((y-.6)/2.);float win=eb201Box(vec2(a,y-cy),vec2(.32,.68))*step(9.5,abs(v))*step(y,8.4);c=mix(c,vec3(.18,.25,.22),win);}return c;
}
`;
