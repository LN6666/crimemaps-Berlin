export const F121_COMPLETION_GLSL=`float gmc121LegacyBox(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;return 1.-smoothstep(-.012,.012,max(d.x,d.y));}
float gmc121LegacyArch(vec2 q,float x,float lo,float spring,float r){return max(gmc121LegacyBox(q,vec2(x,(lo+spring)*.5),vec2(r,(spring-lo)*.5)),(1.-smoothstep(r-.014,r+.014,length(q-vec2(x,spring))))*step(spring,q.y));}
vec3 gmc121LegacyStone(vec2 q){float row=floor(q.y/.29);float x=fract(q.x/.71+mod(row,2.)*.5),y=fract(q.y/.29);float seam=max(1.-smoothstep(.02,.055,min(x,1.-x)),1.-smoothstep(.02,.06,min(y,1.-y)));return mix(vec3(.62,.59,.51),vec3(.48,.47,.41),seam*.34);}
vec3 gmc121LegacySlot(vec3 c,vec2 q,float x,float lo,float spring,float r,bool louver){float outer=gmc121LegacyArch(q,x,lo-.10,spring,r+.10);c=mix(c,vec3(.73,.69,.59),outer);float hole=gmc121LegacyArch(q,x,lo,spring,r);c=mix(c,vec3(.13,.15,.13),hole);if(louver){float bars=step(.72,fract((q.y-lo)/.40))*hole;c=mix(c,vec3(.37,.37,.31),bars*.8);}return c;}
vec3 gmc121Legacy500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family!=4854.&&family!=4855.&&family!=4856.)return base;
 vec2 q=vec2(frame.x,p.y);float u=q.x,v=q.y;if(frame.y<0.)return base;vec3 stone=gmc121LegacyStone(q),trim=vec3(.72,.69,.60),dark=vec3(.36,.37,.32);vec3 c=stone;
 if(family==4856.){
  // Same exacthighspire native triangles share Ucanvas in784 and225; no geometry/finial creation.
  float along=v/max(.18,sqrt(max(.01,1.-normal.y*normal.y)));float row=floor(along/.17);float x=fract(u/.28+mod(row,2.)*.5),y=fract(along/.17);float lap=max(1.-smoothstep(.025,.06,min(x,1.-x)),1.-smoothstep(.025,.07,min(y,1.-y)));return mix(vec3(.26,.27,.26),vec3(.15,.17,.16),lap*.36);
 }
 if(family==4855.){
  float mid=frame.w*.5,r=clamp(frame.w*.19,.16,.34);
  // Originalfacet-local metreframes: one narrow arch per photographed visible polygonfacet.
  c=gmc121LegacySlot(c,q,mid,19.7,22.0,r*1.15,false);c=gmc121LegacySlot(c,q,mid,24.0,27.3,r*.72,false);c=gmc121LegacySlot(c,q,mid,29.2,31.2,r*1.10,false);
  float blind=gmc121LegacyArch(q,mid,33.0,41.4,r*1.48)-gmc121LegacyArch(q,mid,33.12,41.4,r*1.20);c=mix(c,trim,clamp(blind,0.,1.));c=gmc121LegacySlot(c,q,mid,34.1,40.4,r*.64,false);
  c=gmc121LegacySlot(c,q,mid,43.9,46.1,r*.98,false);c=gmc121LegacySlot(c,q,mid,47.9,49.8,r*1.06,true);
  for(int j=0;j<5;j++){float y=j==0?23.0:(j==1?28.4:(j==2?32.6:(j==3?43.0:47.1)));c=mix(c,dark,gmc121LegacyBox(q,vec2(mid,y-.08),vec2(mid,.05)));c=mix(c,trim,gmc121LegacyBox(q,vec2(mid,y),vec2(mid,.12)));}
  c=mix(c,trim,gmc121LegacyBox(q,vec2(mid,50.8),vec2(mid,.13)));c=mix(c,trim,gmc121LegacyBox(q,vec2(.08,35.),vec2(.06,15.5)));c=mix(c,trim,gmc121LegacyBox(q,vec2(frame.w-.08,35.),vec2(.06,15.5)));return c;
 }
 if(frame.z>42.){
  if(v<27.2)return base;float w=frame.w,mid=w*.5;
  // East broadmainface: allthree observedpaired round-headed windowgroups, not copied onto rearfaces.
  for(int j=0;j<3;j++){float x=(float(j)+.5)*w/3.;float surround=gmc121LegacyArch(q,x,33.0,37.8,1.48)-gmc121LegacyArch(q,x,33.05,37.8,1.30);c=mix(c,trim,clamp(surround,0.,1.));c=gmc121LegacySlot(c,q,x-.61,33.35,37.95,.46,true);c=gmc121LegacySlot(c,q,x+.61,33.35,37.95,.46,true);c=mix(c,trim,gmc121LegacyBox(q,vec2(x,32.95),vec2(1.43,.11)));}
  for(int j=0;j<4;j++){float x=float(j)*w/3.;c=mix(c,trim,gmc121LegacyBox(q,vec2(x,35.7),vec2(.14,6.5)));}
  for(int j=0;j<14;j++){float x=(float(j)+.5)*w/14.;float ar=gmc121LegacyArch(q,x,29.0,30.25,.27);c=mix(c,vec3(.22,.25,.21),ar);c=mix(c,trim,gmc121LegacyBox(q,vec2(x-w/28.,29.8),vec2(.08,.83)));float blind=gmc121LegacyArch(q,x,41.65,42.27,.28)-gmc121LegacyArch(q,x,41.69,42.27,.20);c=mix(c,dark,clamp(blind,0.,1.)*.65);}
  c=mix(c,trim,gmc121LegacyBox(q,vec2(mid,31.7),vec2(mid,.18)));c=mix(c,dark,gmc121LegacyBox(q,vec2(mid,31.43),vec2(mid,.07)));c=mix(c,trim,gmc121LegacyBox(q,vec2(mid,28.6),vec2(mid,.11)));c=mix(c,trim,gmc121LegacyBox(q,vec2(mid,42.9),vec2(mid,.11)));
  for(int j=0;j<18;j++){float x=(float(j)+.5)*w/18.;c=mix(c,dark,gmc121LegacyBox(q,vec2(x,27.85),vec2(w/44.,.28)));}return c;
 }
 if(frame.z>27.){
  // Easttransept gable's photographed stone rosette: planar approximation, not inventedglass or reliefmesh.
  float mid=frame.w*.5;vec2 d=q-vec2(mid,24.5);float r=length(d);float ring=1.-smoothstep(.07,.13,abs(r-2.65));c=mix(c,trim,ring);float petal=1.-smoothstep(.045,.085,abs(r-(1.60+.67*cos(atan(d.y,d.x)*10.))));c=mix(c,trim,petal*step(.60,r)*(1.-step(2.58,r)));c=mix(c,dark,1.-smoothstep(.24,.30,r));vec2 hole=q-vec2(frame.w*.80,23.0);float crossHole=max(gmc121LegacyBox(hole,vec2(0.),vec2(.30,.14)),gmc121LegacyBox(hole,vec2(0.),vec2(.14,.30)));c=mix(c,vec3(.16,.18,.15),crossHole);return c;
 }
 // Existingapses: Eastcentralwindowsector, Southuppergalleryonly; literalboundmasks never add hiddenwindows.
 if(normal.x>.85){if(v<8.5)return base;c=gmc121LegacySlot(c,q,frame.w*.5,9.1,14.5,1.25,false);}
 else if(v<15.5)return base;
 float pitch=.95;float x=(floor(u/pitch)+.5)*pitch;c=gmc121LegacySlot(c,q,x,17.05,18.05,.30,false);c=mix(c,trim,gmc121LegacyBox(q,vec2(u,18.86),vec2(30.,.12)));c=mix(c,dark,gmc121LegacyBox(q,vec2(u,16.65),vec2(30.,.075)));c=mix(c,trim,gmc121LegacyBox(q,vec2(u,16.22),vec2(30.,.10)));float panel=step(.28,fract(u/.75))*step(16.25,v)*(1.-step(16.60,v));c=mix(c,dark,panel*.65);return c;
}
float gmc121AA(vec2 q){return max(.012,max(fwidth(q.x),fwidth(q.y)));}
float gmc121BoxAA(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;float a=gmc121AA(q);return 1.-smoothstep(-a,a,max(d.x,d.y));}
float gmc121ArchAA(vec2 q,float x,float lo,float spring,float r){float a=gmc121AA(q);return max(gmc121BoxAA(q,vec2(x,(lo+spring)*.5),vec2(r,(spring-lo)*.5)),(1.-smoothstep(r-a,r+a,length(q-vec2(x,spring))))*step(spring,q.y));}
float gmc121PointedAA(vec2 q,float lo,float spring,float r){float a=gmc121AA(q);float circle=max(length(q-vec2(-r*.5,spring)),length(q-vec2(r*.5,spring)));return max(gmc121BoxAA(q,vec2(0.,(lo+spring)*.5),vec2(r,(spring-lo)*.5)),(1.-smoothstep(r*1.5-a,r*1.5+a,circle))*step(spring,q.y));}
vec3 gmc121Masonry(vec2 q){vec2 pitch=vec2(.71,.29);float row=floor(q.y/pitch.y);vec2 f=fract(q/pitch+vec2(mod(row,2.)*.5,0.));vec2 a=max(fwidth(q/pitch),vec2(.008));float seam=max(1.-smoothstep(.025,.025+a.x,min(f.x,1.-f.x)),1.-smoothstep(.035,.035+a.y,min(f.y,1.-f.y)));float fade=1.-smoothstep(.24,.8,max(a.x,a.y));return mix(vec3(.62,.59,.51),vec3(.48,.47,.41),seam*.34*fade);}
vec3 gmc121WindowAA(vec3 c,vec2 q,float x,float lo,float spring,float r,bool louver){float outer=gmc121ArchAA(q,x,lo-.12,spring,r+.12);c=mix(c,vec3(.72,.69,.60),outer);float hole=gmc121ArchAA(q,x,lo,spring,r);c=mix(c,vec3(.13,.17,.17),hole);float a=gmc121AA(q);float vertical=(1.-smoothstep(.025,.025+a,abs(q.x-x)))*hole;float cell=abs(fract((q.y-lo)/(louver?.40:1.10))-.5);float line=(1.-smoothstep(.025,.025+a,cell))*(1.-smoothstep(.18,.55,a))*hole;c=mix(c,louver?vec3(.37,.37,.31):vec3(.34,.36,.32),max(vertical,line)*.85);return c;}
vec3 gmc121Ring(vec3 c,vec2 q,vec2 at,float radius){float d=length(q-at),a=gmc121AA(q);c=mix(c,vec3(.72,.69,.60),1.-smoothstep(.14,.14+a,abs(d-radius)));float hole=1.-smoothstep(radius-.15-a,radius-.15+a,d);c=mix(c,vec3(.15,.19,.19),hole);float angle=atan(q.y-at.y,q.x-at.x);float spokes=(1.-smoothstep(.026,.026+a,abs(sin(angle*4.))*d))*hole;c=mix(c,vec3(.58,.57,.49),spokes);return c;}
vec3 grossStMartinCompletion121(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6408.)>.25)return base;float role=floor(frame.z-1000.+.5);vec2 q=frame.xy;float u=q.x,v=q.y,w=frame.w;vec3 c=gmc121Masonry(q),trim=vec3(.72,.69,.60),dark=vec3(.36,.37,.32);
 if(role==11.)return vec3(.31,.37,.30);
 if(role==2.){float along=v/max(.18,sqrt(max(.01,1.-normal.y*normal.y)));vec2 f=fract(vec2(u/.28,along/.17)+vec2(mod(floor(along/.17),2.)*.5,0.));vec2 a=max(fwidth(vec2(u/.28,along/.17)),vec2(.01));float lap=max(1.-smoothstep(.025,.025+a.x,min(f.x,1.-f.x)),1.-smoothstep(.025,.025+a.y,min(f.y,1.-f.y)));return mix(vec3(.26,.27,.26),vec3(.15,.17,.16),lap*.36*(1.-smoothstep(.25,.8,max(a.x,a.y))));}
 if(role==4.)return gmc121Legacy500(c,p,normal,vec4(u,v,57.5,w),4855.);
 if(role==5.)return gmc121Legacy500(c,p,normal,vec4(u,v,43.,w),4854.);
 if(role==6.){if(v>23.)return gmc121Legacy500(c,p,normal,vec4(u,v,28.,w),4854.);return c;}
 if(role==7.){
  // Three observed conch windows and their shallow gallery, continuous arc canvas.
  for(int j=0;j<3;j++){float x=(float(j)-1.)*7.65;c=gmc121WindowAA(c,q,x,9.1,14.5,1.25,false);float blind=gmc121ArchAA(q,x,8.45,14.7,1.78)-gmc121ArchAA(q,x,8.58,14.7,1.60);c=mix(c,trim,clamp(blind,0.,1.));}
  for(int j=0;j<25;j++){float x=(float(j)-12.)*.95;c=gmc121WindowAA(c,q,x,17.05,18.05,.30,false);c=mix(c,trim,gmc121BoxAA(q,vec2(x-.475,17.8),vec2(.06,.95)));}
  c=mix(c,trim,gmc121BoxAA(q,vec2(u,18.86),vec2(1.,.12)));c=mix(c,dark,gmc121BoxAA(q,vec2(u,16.65),vec2(1.,.075)));c=mix(c,trim,gmc121BoxAA(q,vec2(u,16.22),vec2(1.,.10)));c=mix(c,trim,gmc121BoxAA(q,vec2(u,8.0),vec2(1.,.09)));return c;
 }
 if(role==8.){
  // North-only nave clerestory and aisle. Three2023 visible bays plus fourth west bay on plan.
  for(int j=0;j<4;j++){float x=-23.6+float(j)*7.65;
   c=gmc121WindowAA(c,q,x,14.25,19.45,.88,false);
   c=mix(c,trim,gmc121BoxAA(q,vec2(x-3.65,17.),vec2(.105,4.8)));
   if(v<9.4){c=gmc121WindowAA(c,q,x-.48,3.4,7.5,.48,false);c=gmc121WindowAA(c,q,x+.48,3.4,7.5,.48,false);}
  }
  float x=(floor((u+27.4)/1.05)+.5)*1.05-27.4;float blind=gmc121ArchAA(q,x,21.1,21.5,.35)-gmc121ArchAA(q,x,21.12,21.5,.26);c=mix(c,dark,clamp(blind,0.,1.)*.65);
  c=mix(c,trim,gmc121BoxAA(q,vec2(u,12.2),vec2(1.,.10)));c=mix(c,trim,gmc121BoxAA(q,vec2(u,21.9),vec2(1.,.13)));return c;
 }
 if(role==9.){
  // South nave differs: circular lights, no mirrored north arched-window schedule.
  if(v>13.5&&v<22.)for(int j=0;j<4;j++)c=gmc121Ring(c,q,vec2(-23.6+float(j)*7.65,18.2),1.0);
  c=mix(c,trim,gmc121BoxAA(q,vec2(u,21.9),vec2(1.,.12)));return c;
 }
 if(role==10.){
  // Shared world T-axis registers the same west portal through overlapping native shell faces.
  for(int j=0;j<3;j++){float x=(float(j)-1.)*4.05;float sp=j==1?19.7:17.3;float lo=j==1?10.0:9.0;c=gmc121WindowAA(c,q,x,lo,sp,j==1?1.18:.84,false);}
  float archOuter=gmc121PointedAA(q,0.,4.35,2.30),archInner=gmc121PointedAA(q,0.,4.35,2.08);c=mix(c,trim,clamp(archOuter-archInner,0.,1.));
  for(int j=0;j<3;j++){float r=2.25+float(j)*.17;float ring=gmc121PointedAA(q,0.,4.35,r)-gmc121PointedAA(q,0.,4.35,r-.065);c=mix(c,trim,clamp(ring,0.,1.));}
  float door=gmc121BoxAA(q,vec2(0.,2.2),vec2(1.72,2.15));c=mix(c,vec3(.20,.18,.13),door);c=mix(c,vec3(.38,.35,.26),max(gmc121BoxAA(q,vec2(0.,2.2),vec2(.035,2.15)),gmc121BoxAA(q,vec2(0.,2.2),vec2(1.72,.035)))*door);
  float pitch=1.25,xc=(floor(u/pitch)+.5)*pitch;float y=28.1-abs(xc)*.98;float blind=gmc121ArchAA(q,xc,21.6,y-.35,.41)-gmc121ArchAA(q,xc,21.7,y-.35,.30);c=mix(c,dark,clamp(blind,0.,1.)*.65);return c;
 }
 if(role==12.){
  // Small north sacristy: masonry/slate is documented; exact hidden door/window count unresolved.
  return c;
 }
 return c;
}
`;
