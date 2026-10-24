export const UTILITY70_GLSL=`
float uw70Line(float d,float w){float a=max(fwidth(d),.012);return 1.-smoothstep(max(0.,w-a*.5),w+a*.5,abs(d));}
float uw70Repeat(float x,float pitch,float w){float a=max(fwidth(x)/pitch,.0001),h=w/pitch,d=abs(fract(x/pitch)-.5);return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h,0.,1.),smoothstep(.2,.7,a));}
float uw70Box(vec2 p,vec2 c,vec2 h){vec2 aa=max(fwidth(p),vec2(.012));vec2 qq=1.-smoothstep(h-aa*.5,h+aa*.5,abs(p-c));return qq.x*qq.y;}
vec4 uw70SSWUnit(int k){return k==0?vec4(6.966642,13.484298,0.726264,0.895725) : k==1?vec4(9.411731,13.484298,0.702055,0.895725) : k==2?vec4(11.881027,13.484298,0.653637,0.895725) : k==3?vec4(13.454599,13.484298,0.677846,0.895725) : k==4?vec4(16.214401,13.484298,0.726264,0.895725) : k==5?vec4(18.780533,13.484298,0.726264,0.895725) : k==6?vec4(6.966642,10.070858,0.726264,0.919934) : k==7?vec4(9.411731,10.070858,0.702055,0.919934) : k==8?vec4(11.881027,10.070858,0.653637,0.919934) : k==9?vec4(13.454599,10.070858,0.677846,0.919934) : k==10?vec4(16.214401,10.070858,0.726264,0.919934) : k==11?vec4(18.780533,10.070858,0.726264,0.919934) : k==12?vec4(2.754312,16.486188,0.726264,0.750473) : k==13?vec4(2.754312,11.402341,0.726264,3.703945) : k==14?vec4(2.730104,4.357583,0.750473,0.677846) : k==15?vec4(6.942434,2.299835,0.702055,0.847308) : vec4(10.936884,2.735594,1.694615,2.590341);}
vec4 uw70ESEUnit(int k){return k==0?vec4(4.309452,10.022440,0.726264,1.016769) : k==1?vec4(7.626056,10.022440,0.750473,1.016769) : k==2?vec4(11.015287,9.974023,0.702055,0.968352) : k==3?vec4(14.210848,9.877187,0.702055,0.968352) : k==4?vec4(3.510562,2.517714,1.428319,2.420879) : k==5?vec4(6.924001,2.517714,1.452528,2.420879) : k==6?vec4(10.216397,2.517714,1.452528,2.420879) : vec4(13.533002,2.517714,1.379901,2.420879);}

vec3 uw70Casement(vec3 c,vec2 p,vec4 d,float kind,float pale){
 vec2 q=p-d.xy;float rim=uw70Box(p,d.xy,d.zw+vec2(.082,.085)),pane=uw70Box(p,d.xy,d.zw);c=mix(c,vec3(.81,.82,.76),rim);float bars=0.;
 if(kind<.5)bars=max(uw70Line(q.x,.025),max(uw70Line(q.y-d.w*.34,.023),uw70Line(q.y+d.w*.34,.023)));
 else if(kind<1.5)bars=max(max(uw70Line(q.x-d.z*.33,.023),uw70Line(q.x+d.z*.33,.023)),uw70Line(q.y-d.w*.35,.026));
 else if(kind<2.5)bars=max(uw70Line(q.x,.025),uw70Repeat(q.y,.45,.030));
 else bars=max(uw70Line(q.x,.027),uw70Repeat(q.y,.34,.035));
 vec3 glass=mix(vec3(.22,.30,.30),vec3(.67,.70,.65),pale);glass=mix(glass,vec3(.85,.86,.80),bars);return mix(c,glass,pane);
}
vec3 uw70Service(vec3 c,vec2 p,vec4 d,float ese){
 float rim=uw70Box(p,d.xy,d.zw+vec2(.10,.085)),pane=uw70Box(p,d.xy,d.zw);vec2 q=p-d.xy;c=mix(c,vec3(.43,.46,.43),rim);
 float head=step(d.w*.48,q.y);float grille=max(uw70Repeat(q.x,.28,.018),uw70Repeat(q.y,.32,.018));vec3 panel=mix(vec3(.55,.61,.59),vec3(.67,.71,.68),grille*.5);panel=mix(panel,vec3(.15,.21,.21),head*(1.-max(uw70Repeat(q.x,.53,.038),uw70Repeat(q.y,.45,.025))));
 panel=mix(panel,vec3(.42,.48,.47),uw70Line(q.x,.035));panel=mix(panel,panel*.86,ese*.5);return mix(c,panel,pane);
}
vec3 paintUtility70(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family<46190.||family>46199.)return base;
 if(family==46192.)return vec3(.25,.23,.21);
 if(family==46191.)return vec3(.32,.30,.28)*(1.-.035*uw70Repeat(f.x,1.4,.012));
 vec3 c=vec3(.49,.31,.25);float course=uw70Repeat(f.y,.077,.0035),joint=uw70Repeat(f.x+mod(floor(f.y/.077),2.)*.125,.25,.0035);c=mix(c,vec3(.68,.54,.43),max(course,joint)*.29);
 // UnverifiedWNW/ENE walls retain brick without invented apertures.
 if(family==46190.)return c;
 vec2 uv=f.xy;
 if(family==46193.){
  float diamondBand=step(5.55,f.y)*step(f.y,7.75);float dx=abs(mod(f.x-.98+1.36,2.72)-1.36);float edge=uw70Line(dx/1.36+abs(f.y-6.65)/1.05-1.,.045);c=mix(c,c*.73,edge*diamondBand*.9);float border=max(uw70Line(f.y-5.55,.042),uw70Line(f.y-7.75,.042));c=mix(c,vec3(.67,.47,.35),border*.7);
  for(int k=0;k<12;k++){float pale=k<6&&k!=1?.60:.0;c=uw70Casement(c,uv,uw70SSWUnit(k),0.,pale);}
  c=uw70Casement(c,uv,uw70SSWUnit(12),0.,.08);c=uw70Casement(c,uv,uw70SSWUnit(13),2.,.04);c=uw70Casement(c,uv,uw70SSWUnit(14),3.,.04);c=uw70Casement(c,uv,uw70SSWUnit(15),3.,.03);c=uw70Service(c,uv,uw70SSWUnit(16),0.);
 }else if(family==46194.){
  for(int k=0;k<4;k++)c=uw70Casement(c,uv,uw70ESEUnit(k),1.,.03);
  for(int k=4;k<8;k++)c=uw70Service(c,uv,uw70ESEUnit(k),1.);
 }
 return c;
}`;
