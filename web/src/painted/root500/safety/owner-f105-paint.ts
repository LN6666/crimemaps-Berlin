export const F105_GLSL=`
float ap105Line(float q,float period,float width){float a=max(fwidth(q),.004);return 1.-smoothstep(width,width+a,abs(mod(q+period*.5,period)-period*.5));}
float ap105Rect(vec2 q,vec2 c,vec2 h){vec2 a=max(fwidth(q),vec2(.006));vec2 m=1.-smoothstep(h-a,h+a,abs(q-c));return m.x*m.y;}
float ap105Arch(vec2 q,float x,float bottom,float spring,float ru,float rv){float dx=abs(q.x-x),a=max(fwidth(q.x),.006);float top=spring+rv*sqrt(max(0.,1.-dx*dx/(ru*ru)));return(1.-smoothstep(ru-a,ru+a,dx))*smoothstep(bottom-a,bottom+a,q.y)*(1.-smoothstep(top-a,top+a,q.y));}
vec3 ap105Opening(vec3 c,vec2 q,float x,float bottom,float spring,float ru,float rv,bool clear,bool framed){vec3 stone=vec3(.65,.61,.49);float outer=ap105Arch(q,x,bottom-.12,spring,ru+.18,rv+.14),inner=ap105Arch(q,x,bottom,spring,ru,rv);if(framed)c=mix(c,stone,outer);vec3 infill=clear?vec3(.16,.23,.25):vec3(.45,.42,.34);if(!clear)infill=mix(infill,vec3(.37,.36,.31),max(ap105Line(q.y,.12,.008),ap105Line(q.x+mod(floor(q.y/.12),2.)*.15,.30,.008))*.40);c=mix(c,infill,inner);if(clear){float bars=max(ap105Line(q.x-x,ru*.7,.028),ap105Line(q.y-bottom,.83,.024));c=mix(c,vec3(.32,.35,.33),bars*inner);}return c;}
vec3 altePinakothekCompletion105(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(abs(family-6398.)>.25)return base;float role=frame.z-1000.;vec2 q=frame.xy;vec3 stone=vec3(.65,.61,.49),brick=vec3(.62,.49,.32);float joints=max(ap105Line(q.y,.12,.006),ap105Line(q.x+mod(floor(q.y/.12),2.)*.15,.30,.006));vec3 c=mix(brick,vec3(.43,.40,.31),joints*.28);
 if(abs(role-6.)<.25){float seams=max(ap105Line(q.x,1.2,.012),ap105Line(frame.w,2.0,.012));return mix(base,vec3(.25,.28,.26),seams*.24);}
 if(abs(role-9.)<.25){float seams=max(ap105Line(q.x,2.4,.028),ap105Line(frame.w,1.35,.022));return mix(base,vec3(.66,.67,.59),seams*.75);}
 if(abs(role-8.)<.25)return mix(base,base*.78,ap105Line(q.y,.45,.007)*.12);
 if(abs(role-7.)<.25)return c;
 bool south=abs(role-1.)<.25,north=abs(role-2.)<.25,endwall=abs(role-3.)<.25,upperend=abs(role-4.)<.25;
 if(south||north){float stepU=119.363/25.;float bay=floor((q.x+59.507)/stepU),x=-59.507+(bay+.5)*stepU;bool repair=south?(bay>=8.&&bay<=16.&&q.y>10.1+max(0.,abs(bay-12.)-2.)*1.1):(q.x>-20.&&q.x<5.&&q.y>10.);
 if(repair)c=mix(vec3(.49,.34,.25),vec3(.37,.31,.24),joints*.42);
 c=ap105Opening(c,q,x,2.15,6.75,1.12,1.10,true,true);c=mix(c,stone,ap105Rect(q,vec2(x,7.98),vec2(1.50,.13)));
 if(south){c=ap105Opening(c,q,x,10.55,16.45,1.18,1.35,true,!repair);if(!repair){c=mix(c,stone,ap105Rect(q,vec2(x,10.35),vec2(1.47,.14)));float med=length((q-vec2(x,18.45))/vec2(.30,.30));c=mix(c,stone,1.-smoothstep(.85,1.,med));}}
 else{c=ap105Opening(c,q,x,10.55,14.85,1.05,1.08,true,!repair);c=mix(c,stone,ap105Rect(q,vec2(x,17.85),vec2(1.15,.64)));c=mix(c,vec3(.18,.23,.24),ap105Rect(q,vec2(x,17.85),vec2(.84,.36)));c=mix(c,stone,ap105Rect(q,vec2(x,17.85),vec2(.04,.36)));if(!repair)c=mix(c,stone,ap105Rect(q,vec2(x,16.03),vec2(1.42,.12)));}
 if(north&&abs(q.x-.908)<2.2){float door=ap105Arch(q,.908,.08,6.15,1.6,.9);c=mix(c,vec3(.15,.20,.20),door);float panels=max(ap105Line(q.x-.908,.80,.035),ap105Line(q.y,.95,.035));c=mix(c,stone*.58,panels*door);}
 }else if(endwall){
 // Both observed end elevations: seven lower bays; upper central two clear arches and five true blind niches.
 for(int j=-3;j<=3;j++){float x=j==-3?-21.:j==3?21.:float(j)*5.3;bool door=frame.w>70.&&j==0;c=ap105Opening(c,q,x,2.15,6.75,1.12,1.1,true,true);c=ap105Opening(c,q,x,10.55,16.45,1.27,1.35,j==-2||j==2,true);if(door){float a=ap105Arch(q,x,1.65,6.75,1.20,1.1);c=mix(c,vec3(.14,.19,.18),a);c=mix(c,stone*.65,max(ap105Line(q.x-x,.75,.025),ap105Line(q.y,.90,.025))*a);}}
 for(int j=-2;j<=2;j++)c=ap105Opening(c,q,float(j)*5.3,20.25,20.25,1.70,1.55,j==-2||j==2,true);
 }else if(upperend){for(int j=-2;j<=2;j++)c=ap105Opening(c,q,float(j)*5.3,20.25,20.25,1.70,1.55,j==-2||j==2,true);}
 else{float center=q.x<0.?-67.7:67.8;c=ap105Opening(c,q,center,2.15,6.75,1.10,1.10,true,true);c=ap105Opening(c,q,center,10.55,16.45,1.15,1.32,false,true);}
 if(!upperend){if(q.y<1.55){float blocks=max(ap105Line(q.y,.48,.025),ap105Line(q.x+mod(floor(q.y/.48),2.)*.70,1.40,.025));c=mix(stone,stone*.70,blocks*.6);}for(int k=0;k<3;k++){float y=k==0?1.55:k==1?9.25:19.2;c=mix(c,stone,ap105Rect(q,vec2(q.x,y),vec2(1000.,.14)));}float meander=ap105Line(q.y,1.,.03)*ap105Rect(q,vec2(q.x,9.05),vec2(1000.,.17));c=mix(c,stone*.70,meander*.5);}
 return c;
}`;
