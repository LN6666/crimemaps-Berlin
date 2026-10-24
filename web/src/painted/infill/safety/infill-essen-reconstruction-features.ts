// 50% material/architectural rhythm pass. Metric layout estimates, not surveyed openings.
export const INFILL_ESSEN_GLSL=`
float erlAA(float x,float pitch,float halfWidth){float span=max(fwidth(x)/pitch,.00001);float h=halfWidth/pitch;float d=abs(fract(x/pitch)-.5);float nearLine=1.-smoothstep(max(0.,h-span*.5),h+span*.5,d);return mix(nearLine,clamp(2.*h,0.,1.),smoothstep(.2,.7,span));}
float erlArch(vec2 q,float w,float spring){return max(abs(q.x)-w,max(-q.y,q.y-spring-w*sqrt(max(0.,1.-q.x*q.x/(w*w)))));}
vec3 infillEssenPaint(vec3 base,vec3 p,vec3 n,vec4 f,float family){
 p=vec3(f.z,p.y,f.w);
 float y=p.y;float along=abs(n.x)>abs(n.z)?p.z:p.x;float aa=max(.025,fwidth(y));
 if(family==26002.){float course=erlAA(y,.36,.012);float seam=erlAA(along+floor(y/.36)*.21,.48,.009);return base*(1.-.13*max(course,seam));}
 if(family==26003.){float standing=erlAA(along,.68,.014);return base*(1.-.14*standing);}
 if(family!=26001.||abs(n.y)>.35)return base;
 float course=erlAA(y,.40,.012);float joint=erlAA(along+floor(y/.40)*.43,.86,.013);base*=1.-.12*max(course,joint);
 // Campanile bounds come from the actual official8148565 mesh. Upper bell stages
 // and blind arcades are supported by the congregation's exterior photograph.
 float tu=p.x*.823+p.z*.568;float tv=-p.x*.568+p.z*.823;
 bool tower=tu>15.24&&tu<24.83&&tv>8.94&&tv<17.79;
 if(tower){
  bool faceU=abs(dot(n.xz,vec2(.823,.568)))>.7;float u=(faceU?tv:tu)-(faceU?13.364:20.032);
  float d=100.;float q=0.;
  if(y>42.){q=abs(u)-2.55;d=erlArch(vec2(q,y-44.1),1.15,2.6);}
  else if(y>30.&&y<37.){q=mod(u+1.55,3.1)-1.55;d=erlArch(vec2(q,y-31.1),.67,2.05);}
  else if(y>37.&&y<41.){q=mod(u+.87,1.74)-.87;d=erlArch(vec2(q,y-37.6),.43,1.0);}
  float aperture=1.-smoothstep(-aa,aa,d);float trim=(1.-smoothstep(-aa,aa,d-.16))-aperture;
  base=mix(base,vec3(.67,.51,.43),trim);
  float louvers=erlAA(y,.22,.035);vec3 dark=mix(vec3(.12,.15,.14),vec3(.27,.29,.25),louvers*.58);
  base=mix(base,dark,aperture);
  float band=1.-smoothstep(.07,.17,min(min(abs(y-29.6),abs(y-36.4)),min(abs(y-41.8),abs(y-49.4))));base=mix(base,base*1.17,band*.65);
  // Lower tower has slender blind vertical strips, not a generic window grid.
  float ribs=erlAA(u,2.05,.065)*smoothstep(7.,9.,y)*(1.-smoothstep(27.,29.,y));base*=1.-ribs*.12;
 }
 if(!tower&&dot(n.xz,vec2(.823,.568))>.92&&tu>23.7){
  float q=tv-.35;float doorq=mod(q+1.95,3.9)-1.95;
  float portal=erlArch(vec2(doorq,y-.15),.91,2.7);float inside=(1.-smoothstep(-aa,aa,portal))*step(abs(q),5.4);
  float surround=((1.-smoothstep(-aa,aa,portal-.26))-(1.-smoothstep(-aa,aa,portal)))*step(abs(q),5.6);base=mix(base,vec3(.69,.52,.42),surround);
  float pointedHood=(1.-smoothstep(.045,.11,abs(y-4.5+abs(doorq)*.72)))*step(abs(doorq),1.5)*step(abs(q),5.7);base=mix(base,vec3(.26,.29,.28),pointedHood);
  vec3 leaf=vec3(.18,.20,.17);float boards=erlAA(doorq,.25,.015);float strap=erlAA(y,.95,.025);leaf=mix(leaf,vec3(.34,.30,.23),max(boards*.4,strap*.7));base=mix(base,leaf,inside);
  float rose=length(vec2(q,y-13.4));float ring=1.-smoothstep(.05,.11,abs(rose-1.25));float opening=1.-smoothstep(1.08,1.14,rose);float spokes=erlAA(atan(y-13.4,q)*1.2,.62,.045);base=mix(base,vec3(.72,.56,.44),ring);base=mix(base,mix(vec3(.14,.23,.25),vec3(.62,.53,.36),spokes),opening);
 }
 // Congregation welcome PDF page0 interior photograph confirms high stained-glass
 // and lower arched side windows on both nave sides. Approximate repeated bays are
 // confined to the central nave; no apertures spread to choir/apse/service masses.
 if(!tower&&tu>-9.&&tu<14.&&abs(tv)>9.0&&abs(tv)<12.2&&abs(dot(n.xz,vec2(-.568,.823)))>.92){
  float u=mod(tu+11.2,5.6)-2.8;
  float high=erlArch(vec2(u,y-11.0),.95,2.65);
  float low=erlArch(vec2(u,y-4.1),1.25,1.85);
  float d=min(high,low);float opening=1.-smoothstep(-aa,aa,d);float trim=(1.-smoothstep(-aa,aa,d-.18))-opening;
  base=mix(base,vec3(.69,.52,.42),trim);
  float mull=max(erlAA(u,.95,.035),erlAA(y,1.6,.035));
  vec3 stained=mix(vec3(.19,.29,.32),vec3(.38,.36,.24),.5+.5*sin(u*1.9+y*1.3));
  stained=mix(stained,vec3(.43,.39,.31),mull*.72);base=mix(base,stained,opening);
  float sill=(1.-smoothstep(.035,.10,abs(y-10.84)))*step(abs(u),1.16);base*=1.-sill*.14;
 }
 return base;
}`;
