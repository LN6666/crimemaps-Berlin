export const F163_GLSL=String.raw`float k163half(float t,float a,float b){float q=clamp((t-a)/(b-a),0.,1.);return min(t,a)+(b-a)*(q-q*q*q+.5*q*q*q*q);}
float k163integral(float x,float a,float b){float t=fract(x);return floor(x)*(a+b)+k163half(t,a,b)+.5*(a+b)-k163half(1.-t,a,b);}
float k163line(float x,float period,float width){float phase=x/period,pixel=max(fwidth(phase),.00001),center=fract(phase),a=width/period,b=(width+.008)/period;return clamp((k163integral(center+.5*pixel,a,b)-k163integral(center-.5*pixel,a,b))/pixel,0.,1.);}
float k163rect(vec2 p,vec2 size){vec2 q=abs(p)-size,aa=max(fwidth(p),vec2(.008));return(1.-smoothstep(-aa.x,aa.x,q.x))*(1.-smoothstep(-aa.y,aa.y,q.y));}
vec3 kunstpalastWhole163(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6354.)>.25)return base;float x=frame.x,z=frame.y,role=frame.z,y=p.y;vec3 pale=vec3(.70,.68,.59),glass=vec3(.21,.30,.33),white=vec3(.86,.87,.80),stone=vec3(.64,.59,.48);
 if(role>7.5)return vec3(.17,.20,.19);if(role>5.5)return stone*(1.+.012*sin(y*3.));if(role>4.5){float bars=max(k163line(z,.85,.025),k163line(y,.75,.025));return mix(glass,vec3(.29,.32,.31),bars);}
 if(role>1.5&&role<2.5){float seams=max(k163line(x,3.2,.025),k163line(z,3.2,.025));return vec3(.44,.46,.44)*(1.-seams*.08);}
 float axis=abs(normal.x)>.6?z:x;float rows=k163line(y,.11,.004),joints=k163line(axis+mod(floor(y/.11),2.)*.13,.26,.004);float random=fract(sin(dot(floor(vec2(axis,y)/vec2(.26,.11)),vec2(17.3,42.7)))*3128.);float footprint=max(fwidth(axis/.26),fwidth(y/.11));random=mix(.5,random,1.-smoothstep(.35,1.25,footprint));
 if(role>2.5){
  vec3 c=vec3(.26,.31,.35)+(random-.5)*.05;c=mix(c,vec3(.36,.39,.40),max(rows,joints)*.55);float cx=mod(axis-1.5,5.1)-2.55;
  float windows=max(k163rect(vec2(cx,y-8.0),vec2(.93,1.25)),k163rect(vec2(cx,y-11.5),vec2(.93,1.25)));float reveal=max(k163rect(vec2(cx,y-8.),vec2(1.02,1.34)),k163rect(vec2(cx,y-11.5),vec2(1.02,1.34)));float glazed=(abs(normal.x)>.6?step(43.,z):1.);float bars=max(k163line(cx,1.8,.035),max(k163line(y-8.,.85,.025),k163line(cx,.9,.025)));vec3 pane=mix(glass,white,bars);vec3 infill=pale*(1.+.012*sin(y*2.+axis));c=mix(c,stone,reveal);c=mix(c,mix(infill,pane,glazed),windows);
  if(y<4.6){float ashlar=max(k163line(y,.62,.008),k163line(axis+mod(floor(y/.62),2.)*.8,1.6,.008));c=pale*(1.-ashlar*.09);float low=k163rect(vec2(mod(axis,2.55)-1.275,y-1.2),vec2(.42,.95));float transom=k163rect(vec2(mod(axis,2.55)-1.275,y-3.45),vec2(.42,.16));float frame=max(k163line(axis,1.27,.035),k163line(y,1.0,.03));c=mix(c,mix(glass,white,frame),max(low,transom));}
  return c;
 }
 vec3 c=vec3(.49,.29,.24)+(random-.5)*.028;c=mix(c,vec3(.64,.53,.45),max(rows,joints)*.48);float cx=mod(axis+1.8,5.6)-2.8;float low=k163rect(vec2(cx,y-5.2),vec2(.86,1.25)),high=k163rect(vec2(cx,y-9.4),vec2(.86,1.25));float outer=max(k163rect(vec2(cx,y-5.2),vec2(1.03,1.43)),k163rect(vec2(cx,y-9.4),vec2(1.03,1.43)));float win=max(low,high);float bars=max(1.-smoothstep(.04,.075,abs(cx)),max(1.-smoothstep(.04,.075,abs(y-5.2)),1.-smoothstep(.04,.075,abs(y-9.4))));c=mix(c,stone,outer);c=mix(c,mix(glass,white,bars),win);float plinth=1.-smoothstep(3.2,3.5,y);float ashlar=max(k163line(y,.65,.008),k163line(axis+mod(floor(y/.65),2.)*.85,1.7,.008));c=mix(c,pale*(1.-ashlar*.08),plinth);float basement=k163rect(vec2(mod(axis,5.6)-2.8,y-.95),vec2(.28,.58));c=mix(c,glass,basement);
 // The museum's official cafe photo shows a broad permanent glazed court opening.
 if(normal.z<-.65&&z>61.8&&x> -15.5&&x<5.8){float cafe=k163rect(vec2(x+4.85,y-4.3),vec2(7.5,4.05));float mull=max(k163line(x+4.85,2.5,.045),k163line(y,2.6,.045));c=mix(c,mix(glass,vec3(.30,.32,.30),mull),cafe);}
 // Recessed courtportal is its own domain; generic windows stop here.
 if(normal.x>.65&&x< -30.&&x> -36.&&z>5.23&&z<15.58){c=stone;float bx=mod(z-5.23,3.45)-1.725;float recess=k163rect(vec2(bx,y-5.95),vec2(1.12,5.15));c=mix(c,stone*.58,recess);float upper=k163rect(vec2(bx,y-10.45),vec2(.78,.62));c=mix(c,mix(glass,white,max(k163line(bx,.78,.035),k163line(y,.7,.035))),upper);float door=k163rect(vec2(z-10.4124,y-2.0),vec2(1.12,1.4));c=mix(c,mix(glass,vec3(.25,.27,.25),max(k163line(z,.9,.03),k163line(y,1.4,.03))),door);float grooves=k163line(z-5.23,3.45,.14);c=mix(c,pale,grooves*.35);}
 return c;
}
`;
