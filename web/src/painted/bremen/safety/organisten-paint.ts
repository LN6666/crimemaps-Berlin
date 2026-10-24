export const ORGANISTEN_FINAL_GLSL=`
float of13Line(float d,float w){float a=max(fwidth(d),.007);return 1.-smoothstep(max(0.,w-a*.5),w+a*.5,abs(d));}
float of13Box(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.009)),v=1.-smoothstep(h-a*.5,h+a*.5,abs(p-c));return v.x*v.y;}
float of13Repeat(float x,float pitch,float w){float a=max(fwidth(x)/pitch,.00001),d=abs(fract(x/pitch)-.5),h=w/pitch;return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h,0.,1.),smoothstep(.2,.65,a));}
vec3 of13Brick(vec3 c,vec2 p){float course=of13Repeat(p.y,.077,.004),joint=of13Repeat(p.x+floor(p.y/.077)*.115,.23,.004);return c*(1.-.095*max(course,joint));}
vec3 of13Window(vec3 c,vec2 p,vec2 ctr,vec2 halfSize){vec3 white=vec3(.86,.86,.79);float outer=of13Box(p,ctr,halfSize+vec2(.075,.075)),inside=of13Box(p,ctr,halfSize);vec2 q=p-ctr;float bars=max(of13Line(q.x,.023),max(of13Line(q.y,.020),of13Line(abs(q.y)-halfSize.y*.52,.017)));vec3 glass=mix(vec3(.18,.23,.23),white,bars);c=mix(c,white*.78,outer);c=mix(c,glass,inside);float sill=of13Box(p,ctr-vec2(0.,halfSize.y+.09),vec2(halfSize.x+.12,.035));return mix(c,white*.9,sill);}
vec3 of13Door(vec3 c,vec2 p,float u,float halfWidth,float h){float mask=of13Box(p,vec2(u,h*.5),vec2(halfWidth,h*.5));vec2 q=p-vec2(u,h*.5);float frame=max(of13Line(abs(q.x)-halfWidth+.045,.035),of13Line(q.y-h*.5+.06,.04));vec3 timber=vec3(.31,.24,.16);vec3 panel=mix(vec3(.12,.16,.15),timber,max(frame,of13Line(q.y-.18,.035)));return mix(c,panel,mask);}
vec3 organistenFinalPaint(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 vec2 uv=f.xy;float u=uv.x,y=uv.y,W=f.w;vec3 c=base,wood=vec3(.27,.43,.40);
 if(family==47403.){float row=of13Repeat(y,.30,.008),seam=of13Repeat(u+floor(y/.30)*.17,.34,.007);return c*(1.-.065*max(row,seam));}
 if(family==47407.)return c;
 if(family==47406.)return of13Window(c,uv,vec2(.45,.50),vec2(.325,.375));
 c=of13Brick(c,uv);
 if(family==47400.){
  // The photographed SSW plain brick gable is distinct from the projecting WNW oriel.
  for(int k=0;k<3;k++){float x=W*(.20+float(k)*.30);c=of13Window(c,uv,vec2(x,8.45),vec2(k==1?.48:.24,.76));}
  for(int k=0;k<2;k++)c=of13Window(c,uv,vec2(W*(.26+float(k)*.49),4.90),vec2(.40,.90));
  float panel=of13Box(uv,vec2(W*.5,10.50),vec2(.46,.64));float boards=of13Repeat(u,.12,.008);c=mix(c,vec3(.25,.43,.49)*(1.-boards*.08),panel);
  c=of13Door(c,uv,W*.28,.40,2.90);c=of13Window(c,uv,vec2(W*.74,1.55),vec2(.50,1.10));
  return c;
 }
 if(family==47401.){
  // Only the long wall left exposed south of the oriel receives its two photo casements.
  c=of13Window(c,uv,vec2(-2.15,4.90),vec2(.43,.90));c=of13Window(c,uv,vec2(-5.05,4.90),vec2(.53,.90));
  for(int k=0;k<3;k++){float x=-1.50-float(k)*1.20;float glazing=of13Box(uv,vec2(x,1.32),vec2(.49,1.12));float trim=max(of13Line(abs(u-x)-.46,.035),max(of13Line(y-1.05,.03),of13Line(y-2.25,.03)));c=mix(c,mix(vec3(.12,.16,.15),vec3(.48,.34,.20),trim),glazing);}
  for(int k=0;k<3;k++){float x=.80+float(k)*1.60;float glazing=of13Box(uv,vec2(x,1.32),vec2(.65,1.12));float trim=max(of13Line(abs(u-x)-.62,.035),max(of13Line(y-1.05,.03),of13Line(y-2.25,.03)));c=mix(c,mix(vec3(.12,.16,.15),vec3(.48,.34,.20),trim),glazing);}
  return c;
 }
 if(family==47404.){
  float timber=0.;for(int k=0;k<5;k++)timber=max(timber,of13Line(u-W*float(k)*.25,.065));
  timber=max(timber,max(of13Line(y-2.64,.075),max(of13Line(y-5.05,.075),of13Line(y-7.18,.075))));
  float braces=of13Line(abs(u-W*.50)-(y-2.75)*.85,.055)*of13Box(uv,vec2(W*.50,3.15),vec2(W*.47,.40));c=mix(c,wood,max(timber,braces));
  for(int k=0;k<2;k++){float x=W*(.24+float(k)*.51);c=of13Window(c,uv,vec2(x,4.02),vec2(.43,.75));c=of13Window(c,uv,vec2(x,6.23),vec2(.30,.57));}
  return c;
 }
 if(family==47405.){float edge=max(of13Line(y-2.64,.075),max(of13Line(y-5.05,.075),of13Line(y-7.18,.075)));return mix(c,wood,edge);}
 return c;
}`;
