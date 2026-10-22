export const F035_GLSL=`
float b035line(float x,float period,float width){float a=max(fwidth(x),.005);float d=abs(mod(x+period*.5,period)-period*.5);return 1.-smoothstep(width-a,width+a,d);}
float b035band(float x,float centre,float halfWidth){float a=max(fwidth(x),.005);return 1.-smoothstep(halfWidth-a,halfWidth+a,abs(x-centre));}
float b035rect(vec2 q,vec2 centre,vec2 halfSize){vec2 a=max(fwidth(q),vec2(.005));vec2 v=1.-smoothstep(halfSize-a,halfSize+a,abs(q-centre));return v.x*v.y;}
vec3 b035stone(vec2 q){vec3 c=vec3(.78,.73,.63);float detail=1.-smoothstep(.35,.8,length(fwidth(q)));float row=floor(q.y/.72),joint=max(b035line(q.y,.72,.010),b035line(q.x+mod(row,2.)*.63,1.26,.008));float cell=fract(sin(dot(floor((q+vec2(mod(row,2.)*.63,0.))/vec2(1.26,.72)),vec2(12.9898,78.233)))*43758.5453);c*=1.+(cell-.5)*.042*detail;return mix(c,c*.76,joint*.32*detail);}
vec3 brandenburgerCurrent035(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6381.)>.25)return base;
 float role=frame.z-1000.;vec2 q=frame.xy;
 if(abs(role-1.)<.25){vec3 c=vec3(.79,.74,.64);float shaft=smoothstep(.45,.8,q.y)*(1.-smoothstep(12.35,12.8,q.y));float flute=b035line(q.x,6.28318530718*frame.w/20.,.026);float seam=b035line(q.y,1.35,.010);c=mix(c,vec3(.54,.50,.42),flute*shaft*.45*(1.-smoothstep(.2,.6,abs(normal.y))));c=mix(c,c*.77,seam*.22);float baseBand=max(b035band(q.y,.18,.055),b035band(q.y,12.95,.075));return mix(c,vec3(.66,.61,.52),baseBand*.50);}
 if(abs(role-2.)<.25){vec3 c=b035stone(q);float passageSide=abs(dot(normal.xz,vec2(-.10854421999486338,.9940916216857009)));float recess=(1.-smoothstep(1.3,3.6,abs(frame.w)))*passageSide*(1.-smoothstep(.15,.45,abs(normal.y)));return c*(1.-recess*.20);}
 if(abs(role-3.)<.25){vec3 c=b035stone(q);float lower=max(b035band(q.y,13.72,.045),b035band(q.y,14.12,.055)),upper=max(b035band(q.y,15.66,.045),b035band(q.y,15.92,.05));c=mix(c,vec3(.63,.59,.50),max(lower,upper)*.55);float tx=mod(q.x+1.35,2.7)-1.35,field=b035band(q.y,14.98,.55);float grooves=max(b035band(tx,-.19,.025),max(b035band(tx,0.,.025),b035band(tx,.19,.025)));float tablet=b035rect(vec2(tx,q.y),vec2(0.,14.98),vec2(.36,.55));c=mix(c,vec3(.70,.65,.55),tablet*.50);return mix(c,vec3(.48,.45,.38),grooves*field*.52*(1.-smoothstep(.2,.6,abs(normal.y))));}
 if(abs(role-4.)<.25){vec2 roof=vec2(frame.x,frame.w);float seam=b035line(roof.x,.92,.018);return mix(vec3(.34,.48,.41),vec3(.23,.34,.29),seam*.35);}
 if(abs(role-5.)<.25){vec3 c=vec3(.82,.77,.66);float mould=max(b035band(q.y,16.12,.035),b035band(q.y,16.64,.045));return mix(c,vec3(.56,.52,.44),mould*.55);}
 if(abs(role-6.)<.25){vec3 c=b035stone(q);float border=b035rect(q,vec2(0.,18.35),vec2(5.6,.72)),inner=b035rect(q,vec2(0.,18.35),vec2(5.35,.56));c=mix(c,vec3(.65,.60,.51),max(0.,border-inner)*.55);c=mix(c,vec3(.74,.69,.59),inner*.20);float cornice=max(b035band(q.y,16.99,.045),b035band(q.y,19.48,.055));return mix(c,vec3(.59,.55,.46),cornice*.42);}
 if(abs(role-7.)<.25)return b035stone(q);
 if(abs(role-8.)<.25){vec3 c=b035stone(q);if(frame.w>.7){float outer=b035rect(q,vec2(0.,2.1),vec2(1.22,2.05)),door=b035rect(q,vec2(0.,2.1),vec2(1.04,1.90));c=mix(c,vec3(.65,.60,.51),outer);c=mix(c,mix(vec3(.19,.23,.21),vec3(.28,.29,.25),b035line(q.x,.26,.014)*.4),door);}return c;}
 if(abs(role-9.)<.25){vec3 c=vec3(.79,.74,.64);float flute=b035line(q.x,6.28318530718*frame.w/20.,.016),shaft=smoothstep(.25,.6,q.y)*(1.-smoothstep(9.45,9.85,q.y));c=mix(c,vec3(.55,.51,.43),flute*shaft*.4*(1.-smoothstep(.2,.6,abs(normal.y))));return mix(c,c*.78,b035line(q.y,1.25,.009)*.18);}
 if(abs(role-10.)<.25||abs(role-11.)<.25)return base;
 return vec3(.78,.73,.63);
}
`;
