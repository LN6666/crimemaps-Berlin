export const OWNER_F191_PAINT_GLSL=`
float er191Box(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;return 1.-smoothstep(-.015,max(.025,fwidth(q.x)+fwidth(q.y)),max(d.x,d.y));}
vec3 erloeserkircheRecovery191(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float a=frame.x,y=frame.y,b=frame.z,k=frame.w;
 if(k<.5){float u=a,v=y,h=b;vec3 c=vec3(.47,.24,.15);float tile=max(1.-smoothstep(.012,.035,abs(mod(u+mod(floor(h/.27),2.)*.15,.30)-.15)),1.-smoothstep(.01,.025,abs(mod(h,.27)-.135)));return mix(c,vec3(.29,.15,.105),tile*.38);}
 if(k>4.5&&k<5.5)return vec3(.13,.17,.16);
 vec3 stone=vec3(.54,.51,.42);float bed=1.-smoothstep(.012,.03,abs(mod(y,.42)-.21)),joint=1.-smoothstep(.012,.035,abs(mod(a+mod(floor(y/.42),2.)*.31,.62)-.31));vec3 c=mix(stone,vec3(.77,.73,.61),max(bed,joint*.75)*.40);
 if(k>1.5&&k<3.5){
 // Native square tower clock/belfry and upper round arcade. Native geometry and33m top remain intact.
 if(k<2.5){if(y>3.&&y<21.&&abs(mod(a+1.7,4.5)-2.25)<.15)c=vec3(.20,.21,.18);float pane=er191Box(vec2(a,y),vec2(0.,25.15),vec2(.62,1.60));c=mix(c,vec3(.08,.11,.10),pane);float louvers=1.-smoothstep(.025,.06,abs(mod(y,.34)-.17));c=mix(c,vec3(.29,.30,.25),pane*louvers);vec2 q=vec2(a,y-21.5);float rr=length(q);if(rr<1.40){c=vec3(.30,.49,.43);if(rr>1.25)c=vec3(.68,.64,.43);float ticks=step(1.05,rr)*(1.-smoothstep(.05,.10,abs(sin(atan(q.x,q.y)*6.))));c=mix(c,vec3(.70,.63,.40),ticks);float hands=max(er191Box(q,vec2(.0,.38),vec2(.05,.50)),er191Box(q,vec2(.27,.0),vec2(.36,.05)));c=mix(c,vec3(.21,.20,.15),hands);}if(abs(y-16.8)<.11||abs(y-23.6)<.10||y>26.65)c=mix(c,vec3(.32,.31,.25),.80);}
 else{float slot=er191Box(vec2(mod(a+1.,2.)-1.,y),vec2(0.,29.0),vec2(.30,.85));c=mix(c,vec3(.16,.18,.15),slot);float arch=1.-smoothstep(.07,.17,abs(length(vec2(mod(a+1.,2.)-1.,y-29.2))-1.));c=mix(c,vec3(.71,.67,.55),arch*step(29.2,y));}
 return c;}
 if(k>5.5){float rr=length(vec2(mod(a+1.6,3.2)-1.6,y-9.4));c=mix(c,vec3(.70,.66,.55),1.-smoothstep(.46,.54,rr));c=mix(c,vec3(.13,.19,.18),1.-smoothstep(.31,.37,rr));if(y<1.0)c=vec3(.37,.36,.30);return c;}
 if(k>3.5){vec2 q=vec2(a+11.,y);float opening=step(abs(q.x),.95)*step(.1,y)*step(y,3.1+sqrt(max(0.,.95*.95-q.x*q.x)));float arch=step(abs(q.x),1.13)*step(.1,y)*step(y,3.2+sqrt(max(0.,1.13*1.13-q.x*q.x)));c=mix(c,vec3(.68,.64,.52),arch);c=mix(c,vec3(.13,.15,.12),opening);float doorline=1.-smoothstep(.03,.06,abs(q.x));return mix(c,vec3(.36,.28,.18),doorline*opening);}
 // Southern nave6 tall rectangular windows; northern gallery9 paired levels, source photographic registration approximate.
 float nu=normal.x*.998316+normal.z*(-.05801);bool endFace=abs(nu)>.7;float pane=0.,surround=0.;vec2 q;
 if(!endFace){float centre=0.,w=.59,lo=5.2,hi=10.5;if(b<0.)centre=-11.2+floor((a+13.55)/4.7)*4.7;else{centre=-14.4+floor((a+16.0)/3.5)*3.5;lo=y<6.6?2.8:7.2;hi=y<6.6?5.5:10.6;w=.56;}q=vec2(a-centre,y);pane=er191Box(q,vec2(0.,(lo+hi)*.5),vec2(w,(hi-lo)*.5));surround=er191Box(q,vec2(0.,(lo+hi)*.5),vec2(w+.17,(hi-lo)*.5+.18));}
 else if(b>13.){float rr=length(vec2(a+2.5,y-9.3));pane=1.-smoothstep(.41,.47,rr);surround=1.-smoothstep(.57,.63,rr);q=vec2(a+2.5,y-9.3);}
 else{q=vec2(a,y);pane=er191Box(q,vec2(0.,7.7),vec2(.75,2.1));surround=er191Box(q,vec2(0.,7.7),vec2(.94,2.3));}
 c=mix(c,vec3(.67,.64,.54),surround);c=mix(c,vec3(.17,.23,.22),pane);float bars=max(1.-smoothstep(.025,.055,abs(q.x)),1.-smoothstep(.02,.05,abs(mod(y,.72)-.36)));c=mix(c,vec3(.56,.59,.53),bars*pane);if(y<.75)c=vec3(.40,.39,.32);if(abs(y-11.9)<.12)c=mix(c,vec3(.30,.30,.24),.85);return c;
}
`;
