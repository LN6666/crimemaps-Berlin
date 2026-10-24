// 50% whole-complex material rhythm. Glazing stays in pre-registered glass masses.
export const INFILL_PHILHARMONIE_GLSL=`
float philAA(float x,float pitch,float halfWidth){float span=max(fwidth(x)/pitch,.00001);float h=halfWidth/pitch;float d=abs(fract(x/pitch)-.5);return mix(1.-smoothstep(max(0.,h-span*.5),h+span*.5,d),clamp(2.*h,0.,1.),smoothstep(.2,.7,span));}
vec3 infillPhilharmoniePaint(vec3 base,vec3 p,vec3 n,vec4 f,float family){
 p=vec3(f.z,p.y,f.w);
 float along=abs(n.x)>abs(n.z)?p.z:p.x;
 if(family==26022.){
  // Existing copper hall roof has true mansard fold geometry; no fake cross-hatch.
  bool copper=base.g>base.r*1.25;
  if(copper){float seam=philAA(along,.72,.016);float overlap=philAA(p.y,2.8,.018);return base*(1.-.16*seam-.055*overlap);}
  float lap=philAA(along,3.0,.018);return base*(1.-lap*.07);
 }
 if(family!=26021.||abs(n.y)>.3)return base;
 bool glass=base.b>base.r*1.15&&base.g>base.r*1.15;
 if(glass){float mullion=philAA(along,1.5,.035);float transom=philAA(p.y,2.7,.037);float frame=max(mullion,transom);vec3 pane=base*(.94+.035*sin(along*.41));return mix(pane,vec3(.62,.65,.61),frame*.88);}
 // Warm mineral façades: restrained coursing and tall pilaster rhythm, limited
 // to existing walls. No unsupported repetitive apertures on blind rear rooms.
 float course=philAA(p.y,.55,.009);float joint=philAA(along+floor(p.y/.55)*.61,1.22,.010);base*=1.-.065*max(course,joint);
 float pilaster=philAA(along,4.7,.18)*smoothstep(.6,1.,p.y)*(1.-smoothstep(10.7,11.4,p.y));base=mix(base,base*1.06,pilaster*.7);
 // Original frame12 shows tall windows along this entire east-facing rear-wing street wall.
 // Its actual rotated outer plane is 28.7..30.7m; opposite/courtyard and glass pavilion excluded.
 float eastPlane=dot(p.xz,vec2(.894,-.447));float rearAlong=dot(p.xz,vec2(.447,.894));
 if(p.z<2.&&eastPlane>28.4&&eastPlane<31.0&&dot(n.xz,vec2(.894,-.447))>.98){
  float q=mod(rearAlong+2.35,4.7)-2.35;float aa=max(.025,fwidth(p.y));float d=max(abs(q)-1.28,max(4.1-p.y,p.y-9.8));float window=1.-smoothstep(-aa,aa,d);float surround=(1.-smoothstep(-aa,aa,d-.18))-window;base=mix(base,vec3(.83,.83,.75),surround);
  float frame=max(philAA(q,1.28,.035),philAA(p.y-.25,1.9,.030));vec3 pane=mix(vec3(.28,.39,.40),vec3(.64,.68,.63),frame*.83);base=mix(base,pane,window);float head=(1.-smoothstep(.045,.105,abs(p.y-10.05)))*step(abs(q),1.5);base*=1.-head*.11;
 }
 float sill=philAA(p.y,4.0,.055)*smoothstep(.4,1.1,p.y);return base*(1.-sill*.065);
}`;
