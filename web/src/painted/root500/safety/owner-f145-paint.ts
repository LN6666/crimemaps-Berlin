export const OWNER_F145_PAINT_GLSL=`
float ju145Box(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;return 1.-smoothstep(-.012,.012,max(d.x,d.y));}
float ju145Arch(vec2 q,float w,float bot,float spring,float tip){float side=w*.5;float y=q.y;float archTop=spring+(tip-spring)*sqrt(max(0.,1.-abs(q.x)/side));return step(bot,y)*step(y,archTop)*step(abs(q.x),side);}
vec3 ju145Choir(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec2 q=frame.xy;float W=frame.w;vec3 c=vec3(.66,.47,.43);float yy=q.y;
 // Source-native height is compressed7.5m. Visible photo proportions, not metric survey.
 float course=1.-smoothstep(.008,.025,abs(mod(yy,.37)-.185));c=mix(c,vec3(.56,.40,.38),course*.16);
 c=mix(c,vec3(.59,.41,.38),ju145Box(q,vec2(W*.5,.52),vec2(W*.5,.055)));
 if(W<2.){float st=1.-smoothstep(.01,.035,abs(mod(yy,.38)-.19));c=mix(c,vec3(.77,.61,.52),st*.5);c=mix(c,vec3(.72,.56,.49),ju145Box(q,vec2(W*.5,6.85),vec2(W*.5,.20)));return c;}
 vec2 t=vec2(q.x-W*.5,yy);float ww=W*.66;float outer=ju145Arch(t,ww+.20,.65,5.20,6.67);float inner=ju145Arch(t,ww,.78,5.15,6.45);c=mix(c,vec3(.49,.34,.32),outer);
 // Original southfirstbay9 is a blind pointedarch. Never copy glazing into it.
 if(p.x<13.)return mix(c,vec3(.67,.48,.44),inner);
 c=mix(c,vec3(.20,.24,.25),inner);float lead=0.;for(int i=0;i<3;i++){float xx=(float(i)-1.)*ww*.31;lead=max(lead,ju145Box(t,vec2(xx,2.83),vec2(.024,2.04)));}
 lead=max(lead,ju145Box(t,vec2(0.,2.50),vec2(ww*.5,.04)));lead=max(lead,ju145Box(t,vec2(0.,4.70),vec2(ww*.5,.04)));
 float mesh=max(1.-smoothstep(.005,.012,abs(mod(t.x+t.y*.35,.19)-.095)),1.-smoothstep(.005,.012,abs(mod(t.x-t.y*.35,.19)-.095)));c=mix(c,vec3(.44,.47,.43),mesh*inner*.38);c=mix(c,vec3(.75,.66,.56),lead*inner);
 // Planar quatrefoil motif approximate from observed tracery, not carved geometry.
 vec2 h=t-vec2(0.,5.45);float ro=0.;for(int j=0;j<4;j++){float a=float(j)*1.57079633;vec2 cc=vec2(cos(a),sin(a))*.17;ro=max(ro,1.-smoothstep(.015,.04,abs(length(h-cc)-.22)));}c=mix(c,vec3(.77,.68,.58),ro*inner);return c;
}

vec3 justinuskircheRecovery153(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float u=frame.x,y=frame.y,v=frame.z,k=frame.w;vec3 stone=vec3(.67,.48,.44);
 if(k<.5){vec3 slate=vec3(.24,.27,.29);float seam=max(1.-smoothstep(.012,.04,abs(mod(u,.48)-.24)),1.-smoothstep(.012,.04,abs(mod(y,.35)-.175)));return mix(slate,vec3(.16,.19,.21),seam*.25);}
 if(k<1.5)return ju145Choir(base,p,normal,vec4(u,y,7.5,v),family);
 if(k>3.5&&k<4.5){vec3 c=vec3(.28,.31,.32);if(y<22.5&&y>18.){float louver=1.-smoothstep(.015,.045,abs(mod(y,.22)-.11));c=mix(vec3(.13,.17,.18),vec3(.37,.40,.40),louver*.7);}return c;}
 vec3 c=mix(stone,vec3(.56,.40,.38),(1.-smoothstep(.008,.03,abs(mod(y,.45)-.225)))*.15);
 if(k>1.5&&k<2.5){float x=mod(u+21.,4.6)-2.3;float arch=ju145Arch(vec2(x,y),.85,8.95,10.65,11.2);c=mix(c,vec3(.19,.24,.25),arch);c=mix(c,vec3(.62,.57,.52),arch*(1.-smoothstep(.02,.06,abs(x))));}
 if(k>4.5&&k<5.5){float x=mod(u+21.,4.6)-2.3;float arch=ju145Arch(vec2(x,y),1.1,1.3,3.8,4.7);c=mix(c,vec3(.20,.24,.25),arch);}
 if(k>5.5){for(int i=0;i<2;i++){float x=u-(float(i)*3.+.6);float lower=ju145Arch(vec2(x,y),1.15,1.2,4.2,5.2);float upper=ju145Box(vec2(x,y),vec2(0.,6.7),vec2(.35,.6));c=mix(c,vec3(.22,.26,.27),max(lower,upper));}}
 return c;
}

`;
