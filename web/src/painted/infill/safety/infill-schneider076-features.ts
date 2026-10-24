export const INFILL_SCHNEIDER076_GLSL=/*glsl*/`

float sch076Line(float x,float pitch,float w){float a=max(fwidth(x)/pitch,.00001),h=w/pitch,d=abs(fract(x/pitch)-.5);return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h,0.,1.),smoothstep(.2,.7,a));}
vec3 infillSchneider076PaintBase50(vec3 base,vec3 p,vec3 n,vec4 f,float family){
 float u=abs(n.x)>abs(n.z)?f.z:f.x;float y=f.y;
 if(family==34302.)return base;
 if(family==34301.){
  if(base.r>.7){float seam=sch076Line(u,.48,.018);return base*(1.-seam*.16);}
  float slate=max(sch076Line(y,.30,.012),sch076Line(u+floor(y/.30)*.19,.40,.010));return base*(1.-slate*.12);
 }
 if(family==34303.){
  float uprights=sch076Line(u,1.35,.037);float floors=sch076Line(y-.4,3.6,.075);float secondary=sch076Line(y,1.8,.018);
  vec3 panes=base*(.94+.035*sin(u*.39));float metal=max(uprights,max(floors,secondary*.55));
  if(y>25.){float louver=sch076Line(y,.32,.052);metal=max(metal,louver*.9);}
  return mix(panes,vec3(.69,.72,.70),metal*.88);
 }
 if(family==34300.){
  float joint=max(sch076Line(y,.58,.009),sch076Line(u+floor(y/.58)*.64,1.28,.009));base*=1.-joint*.065;
  if(f.w>1.5){
   float xx=mod(u+2.6,5.2)-2.6;float aa=max(.025,fwidth(y));
   float windows=0.;float arch=0.;
   if(base.r<.8){
    float gy=y-5.8;float da=max(abs(xx)-1.02,max(-gy,gy-2.0-1.02*sqrt(max(0.,1.-xx*xx/(1.02*1.02)))));
    arch=1.-smoothstep(-aa,aa,da);windows=arch;
    windows=max(windows,(1.-smoothstep(.98-aa,.98+aa,abs(xx)))*max(smoothstep(11.6-aa,11.6+aa,y)*(1.-smoothstep(14.5-aa,14.5+aa,y)),smoothstep(17.1-aa,17.1+aa,y)*(1.-smoothstep(19.5-aa,19.5+aa,y))));
    float cap=(1.-smoothstep(.05,.12,abs(y-15.4+.5*abs(xx))))*step(abs(xx),1.3)*step(14.7,y)*step(y,15.8);base=mix(base,base*1.10,cap);
   }else{windows=(1.-smoothstep(.92-aa,.92+aa,abs(xx)))*max(smoothstep(7.0,7.1,y)*(1.-smoothstep(9.5,9.6,y)),max(smoothstep(12.0,12.1,y)*(1.-smoothstep(14.5,14.6,y)),smoothstep(17.0,17.1,y)*(1.-smoothstep(19.5,19.6,y))));}
   float cornice=1.-smoothstep(.05,.14,min(abs(y-10.3),min(abs(y-16.2),abs(y-21.0))));base*=1.-cornice*.13;
   float bars=max(sch076Line(xx,1.04,.035),sch076Line(y,.94,.025));return mix(base,mix(vec3(.22,.29,.28),vec3(.38,.32,.24),bars*.85),windows);
  }
  // Ground-floor entrances are not invented. These upper office-window dimensions
  // are a photo-scaled rhythm estimate, separately from historic façade carving.
  float x=abs(mod(u+1.8,3.6)-1.8),z=mod(y-2.2,3.6);float aa=max(.02,fwidth(y));
  float win=(1.-smoothstep(.90-aa,.90+aa,x))*smoothstep(.70-aa,.70+aa,z)*(1.-smoothstep(2.75-aa,2.75+aa,z))*smoothstep(3.,3.6,y)*(1.-smoothstep(29.,30.,y));
  float mull=sch076Line(u,1.8,.025);vec3 pane=mix(vec3(.26,.34,.35),vec3(.64,.64,.57),mull*.8);return mix(base,pane,win);
 }
 return base;
}
float fd706Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillSchneider076Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillSchneider076PaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=abs(normal.x)>abs(normal.z)?frame.z:frame.x,y=frame.y,w=1.35,h=3.6;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd706Line(u-.09,w,.018),secondary=fd706Line(u+w*.5,w,.023),transom=fd706Line(y-h*.57,h,.024);
 float reveal=fd706Line(u-.15,w,.045),sill=fd706Line(y-h*.18,h,.036),sillLip=fd706Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 float masonry=(1.-pane)*step(.58,c.r)*step(abs(c.r-c.g),.16);float course=fd706Line(y,.65,.007),joint=fd706Line(u+floor(y/.65)*.7,1.4,.007);c=mix(c,c*.89,max(course,joint)*masonry*.27);
 return c;
}

`;
