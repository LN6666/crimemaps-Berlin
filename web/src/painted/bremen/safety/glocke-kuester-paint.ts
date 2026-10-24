export const GLOCKE_KUESTER_OWNERSHIP_GLSL=String.raw`
float gkoLine(float x,float w){float aa=max(fwidth(x),.004);return(1.-smoothstep(w,w+aa,abs(x)))*min(1.,max(w,.004)/aa);}
float gkoRect(float u,float y,vec2 at,vec2 halfSize){vec2 q=abs(vec2(u,y)-at)-halfSize,aa=max(fwidth(vec2(u,y)),vec2(.008));return(1.-smoothstep(-aa.x,aa.x,q.x))*(1.-smoothstep(-aa.y,aa.y,q.y));}
vec3 gkoBrick(float u,float y){float row=floor(y/.077),s=u+mod(row,2.)*.122;float mort=max(gkoLine(mod(s,.244)-.122,.004),gkoLine(mod(y,.077)-.0385,.003));float variation=sin(floor(s/.244)*1.73+row*2.13);return(vec3(.40,.245,.185)+vec3(.010,.007,.005)*variation)*(1.-mort*.14);}
void gkoWindow(inout vec3 c,float u,float y,float x,float cy,float hw,float hh){vec2 q=vec2(u-x,y-cy);float outer=gkoRect(u,y,vec2(x,cy),vec2(hw+.085,hh+.065)),inner=gkoRect(u,y,vec2(x,cy),vec2(hw,hh));vec3 glass=mix(vec3(.13,.205,.19),vec3(.31,.375,.34),clamp((q.y+hh)/(2.*hh),0.,1.));c=mix(c,vec3(.84,.85,.78),outer);c=mix(c,glass,inner);float bars=max(gkoLine(q.x,.034),gkoLine(q.y-.12,.029));c=mix(c,vec3(.86,.865,.81),bars*inner);float sill=gkoRect(u,y,vec2(x,cy-hh-.10),vec2(hw+.16,.052));c=mix(c,vec3(.72,.73,.66),sill);}
vec3 glockeKuesterOwnershipPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family<47080.||family>47085.)return base;
 float u=frame.x,y=frame.y;vec3 c=base;
 if(family==47081.){float seam=gkoLine(mod(u,.47)-.235,.006);return vec3(.43,.64,.56)*(1.-seam*.07);}
 if(family==47083.)return vec3(.58,.56,.48);
 c=gkoBrick(u,y);
 if(family==47085.)return c*.95;
 if(y<1.18){float joint=gkoLine(mod(u,.72)-.36,.010);return vec3(.59,.57,.49)*(1.-joint*.14);}
 if(family==47080.){
  // Five upper white casements: isolated flanks and a tight central triplet, measured proportionally from exact UV evidence.
  gkoWindow(c,u,y,1.94,7.57,.56,.90);gkoWindow(c,u,y,11.96,7.57,.56,.98);
  for(int j=0;j<3;j++){float x=5.28+float(j)*1.65;gkoWindow(c,u,y,x,7.57,.55,.90);float q=abs(u-x),head=9.25-q*1.1;float triangle=step(q,.67)*step(8.53,y)*(1.-smoothstep(head-.04,head+.04+fwidth(y),y));c=mix(c,vec3(.21,.29,.26),triangle);float edge=max(gkoLine(y-head,.035),gkoLine(y-8.56,.033))*step(q,.72);c=mix(c,vec3(.84,.85,.77),edge);float lattice=max(gkoLine((u-x)*.78+(y-8.55)*.6,.022),gkoLine((u-x)*.78-(y-8.55)*.6,.022));c=mix(c,vec3(.84,.85,.78),lattice*triangle);}
  // The tree-obscured central lower opening is deliberately not invented.
  gkoWindow(c,u,y,1.94,3.21,.58,.84);gkoWindow(c,u,y,8.58,3.17,.56,.86);
  float diamond=abs((u-6.93)/.48)+abs((y-13.70)/.73);c=mix(c,vec3(.82,.83,.75),1.-smoothstep(1.,1.08,diamond));c=mix(c,vec3(.09,.155,.135),1.-smoothstep(.76,.83,diamond));
  // Three continuous raised diagonal brick ribs, bounded inside the real high gable.
  if(y>9.45&&y<18.3){for(int j=0;j<3;j++){float rib=abs((u-6.93)*.82-(y-13.7)+float(j-1)*2.70),domain=step(abs(u-6.93),5.5)*step(y,18.45-abs(u-6.93)*1.12);float light=gkoLine(rib-.06,.035)*domain,dark=gkoLine(rib+.055,.035)*domain;c=mix(c,vec3(.51,.34,.25),light*.62);c=mix(c,vec3(.26,.16,.13),dark*.55);}}
  return c;
 }
 if(family==47084.){
  // Only the photographed west side; four distinct casement bays, no openings propagated to the unobserved back.
  for(int j=0;j<4;j++){float x=-3.85+float(j)*2.50;gkoWindow(c,u,y,x,3.18,.45,.83);gkoWindow(c,u,y,x,7.58,.45,.91);}return c;
 }
 return c;
}
`;
