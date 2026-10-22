export const F132_GLSL=String.raw`float f132line(float x,float period,float w){float d=abs(mod(x+period*.5,period)-period*.5);return 1.-smoothstep(w,w+.025,d);}
float f132rect(vec2 p,vec2 s){vec2 d=abs(p)-s;return 1.-smoothstep(-.015,.025,max(d.x,d.y));}
float f132arch(vec2 p,float w,float h){float lower=f132rect(p-vec2(0.,h*.5),vec2(w,h*.5));float top=(1.-smoothstep(w-.025,w+.025,length(p-vec2(0.,h))))*step(h,p.y);return max(lower,top);}
vec3 museumSchnuetgenWhole132(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6347.)>.25)return base;float u=frame.x,v=frame.y,role=frame.z,y=p.y;
 float nU=dot(normal.xz,vec2(.9999755,.00700004)),nV=dot(normal.xz,vec2(-.00700004,.9999755));
 vec3 dark=vec3(.13,.18,.20),mortar=vec3(.73,.72,.65),pale=vec3(.67,.65,.57),rough=vec3(.43,.42,.36);
 if(role>10.5)return vec3(.34,.36,.34)*(1.-.06*f132line(u+v,1.2,.018));
 if(role>9.5)return vec3(.67,.68,.63);if(role>8.5)return vec3(.49,.47,.40);if(role>7.5)return vec3(.14,.19,.20);if(role>6.5)return vec3(.64,.62,.54);
 if(role>5.5){
  float axis=abs(nU)>.6?v:u;float brick=max(f132line(y,.105,.008),f132line(axis+mod(floor(y/.105),2.)*.13,.26,.009));vec3 c=mix(vec3(.56,.36,.27),mortar,brick*.7);float garden=step(.65,nU);float pair=max(f132rect(vec2(v-15.5,y-2.0),vec2(.65,1.35)),f132rect(vec2(v-15.5,y-4.75),vec2(.65,1.05)));pair=max(pair,max(f132rect(vec2(v-23.,y-2.),vec2(.65,1.35)),f132rect(vec2(v-23.,y-4.75),vec2(.65,1.05))));float small=f132rect(vec2(v-11.,y-2.1),vec2(.75,.9));float win=max(pair,small)*garden;float mull=max(f132line(v,1.2,.035),f132line(y,1.1,.035));c=mix(c,mix(dark,vec3(.56,.59,.55),mull),win);return mix(c,vec3(.82,.82,.75),step(5.8,y));
 }
 if(role>4.5){float grid=max(f132line(u,1.35,.035),f132line(y,1.2,.035));vec3 pane=vec3(.22,.32,.33)*(1.+.07*sin(u*.4+v*.2));return mix(pane,vec3(.52,.57,.55),grid);}
 if(role>3.5){float seams=max(f132line(u,.42,.008),f132line(v,.42,.008));return vec3(.29,.38,.33)*(1.-.08*seams);}
 if(role>1.5&&role<2.5){float course=f132line(y,.16,.009);float seam=max(f132line(u+mod(floor(y/.16),2.)*.15,.3,.008),f132line(v,.35,.009));return vec3(.27,.29,.28)*(1.-.08*max(course,seam));}
 float axis=abs(nV)>.65?u:v;float rows=f132line(y,.24,.011),joints=f132line(axis+mod(floor(y/.24),2.)*.21,.43,.012);float mott=.045*sin(u*3.7+v*1.7)*sin(y*4.9)+.025*cos(u*7.3-y*2.1);vec3 c=mix(rough,pale,smoothstep(8.5,11.5,y))+mott; c=mix(c,mortar,max(rows,joints)*.48);
 if(role<1.5){
  if(abs(nV)>.65&&y>10.8){float xx=mod(u+18.,5.55)-2.775;float win=f132arch(vec2(xx,y-11.15),.62,1.65);float bars=max(f132line(xx,.3,.018),f132line(y,.43,.018));c=mix(c,mix(dark,vec3(.49,.54,.52),bars),win);float a=mod(u+18.,1.11)-.555;float arc=abs(length(vec2(a,(y-13.45)))-.46);float frieze=(1.-smoothstep(.04,.09,arc))*step(13.45,y);c=mix(c,rough,frieze*.85);float pilaster=f132line(u+18.,5.55,.1);c=mix(c,mortar,pilaster*.6);}
  if(abs(nU)>.65&&y>8.){float trip=max(f132arch(vec2(v+1.3,y-9.7),.36,2.2),max(f132arch(vec2(v+3.0,y-9.7),.30,1.8),f132arch(vec2(v-.4,y-9.7),.30,1.8)));float eye=1.-smoothstep(.36,.44,length(vec2(v+1.3,y-15.1)));c=mix(c,dark,max(trip,eye));}
 }else{
  float xx=mod(axis+17.,5.6)-2.8;float win=f132arch(vec2(xx,y-3.),.65,1.4);float bars=max(f132line(xx,.33,.024),f132line(y,.45,.023));c=mix(c,mix(dark,mortar,bars),win);if(abs(nU)>.65&&y>7.8){float opening=f132arch(vec2(v+1.25,y-8.2),.45,2.0);c=mix(c,dark,opening);}
 }
 return c;
}
`;
