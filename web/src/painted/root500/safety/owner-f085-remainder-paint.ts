export const F085_REMAINDER_GLSL=`
// All coordinates are native-source registered frame UV/metres; p.xz is intentionally unused.
float tfc6437aa(float d,float edge){return 1.-smoothstep(edge,edge+max(fwidth(d),.025),d);}
float tfc6437box(vec2 q,vec2 at,vec2 halfSize){vec2 d=abs(q-at)-halfSize;return tfc6437aa(max(d.x,d.y),0.);}
float tfc6437arch(vec2 q,float x,float lo,float spring,float hw,float rise){vec2 p=q-vec2(x,spring);float rect=tfc6437box(q,vec2(x,(lo+spring)*.5),vec2(hw,(spring-lo)*.5));float ellipse=tfc6437aa(length(p/vec2(hw,rise)),1.)*smoothstep(-.025,.025,p.y);return max(rect,ellipse);}
vec3 tfc6437window(vec3 c,vec2 q,float x,float lo,float spring,float hw,float rise){float rim=tfc6437arch(q,x,lo-.14,spring,hw+.18,rise+.18);float pane=tfc6437arch(q,x,lo,spring,hw,rise);c=mix(c,vec3(.88,.73,.45),rim);c=mix(c,vec3(.12,.17,.17),pane);float grid=max(tfc085Seam(q.x-x,.43,.018),tfc085Seam(q.y,.72,.02));c=mix(c,vec3(.49,.51,.44),grid*pane*.76);return c;}
vec3 theatinerRemainder6437(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(abs(family-6437.)>.25)return base;float role=floor(frame.z-1000.+.5);vec3 c=theatinerComplete085(base,p,normal,frame,6395.);float u=frame.x,v=frame.w,y=frame.y;
 if(abs(role-1.)<.25){
  // Only the two former base-only back directions are rebound; original east/north role1 stays6395.
  for(int j=0;j<3;j++){float lo=j==0?6.9:(j==1?19.1:31.6),sp=j==0?11.5:(j==1?23.7:37.0);c=tfc6437window(c,frame.xy,0.,lo,sp,.75,1.15);}
  return c;
 }
 if(abs(role-11.)<.25){
  c=vec3(.77,.57,.26);c=mix(c,vec3(.89,.73,.45),tfc085band(y,34.1,.18));
  // Three upper nave bays located by official floor plan and directly viewed south aerial.
  // Plan documents matching north bay positions; sizes are photographic, not surveyed.
  if(abs(abs(u)-8.85)<.09&&v<1.7){for(int j=0;j<3;j++){float at=-25.0+float(j)*8.7;c=tfc6437window(c,vec2(v,y),at,29.3,32.0,.85,1.15);float pil=tfc085band(v,at-3.0,.30);c=mix(c,vec3(.88,.72,.44),pil);}}
  else if(v>30.){float theta=atan(v-31.5,u);float sector=6.28318530718/8.;float local=(mod(theta+sector*.5,sector)-sector*.5)*8.85;c=tfc6437window(c,vec2(local,y),0.,29.3,32.0,.74,1.05);}
  return c;
 }
 if(abs(role-6.)<.25){
  // Exposed transverse high wall, not surrounding monastery/cafe walls. No low repetitive house windows.
  //444: south transept high wall, directly photographed in south-aerial-2007.jpg.
  // Native DISPLAY batch24 has u18.458..19.176, v-1.345..22.553. One opening only;
  // photograph-estimated jamb/panel positions, no mirrored low-window grid.
  if(abs(u-18.9)<.85&&v>-.5&&v<21.5){
   float panelY=tfc6437box(vec2(v,y),vec2(10.5,26.1),vec2(9.0,7.15));
   float sideJamb=max(tfc085band(v,1.9,.24),tfc085band(v,19.1,.24));
   float panelBand=max(tfc085band(y,19.0,.16),tfc085band(y,33.15,.16));
   c=mix(c,vec3(.86,.68,.39),panelY*max(sideJamb,panelBand));
   c=tfc6437window(c,vec2(v,y),10.5,20.7,28.9,1.26,.55);
  }
  if(abs(u+21.3)<.85&&v>-.5&&v<21.5)c=tfc6437window(c,vec2(v,y),10.5,20.7,28.9,1.26,1.45);
  // Rear return and original rounded apse have a bounded upper opening schedule, grounded in plan bays.
  if(v>23.0&&v<30.6&&abs(u+18.9)<.65)c=tfc6437window(c,vec2(v,y),26.5,20.6,25.0,.92,1.05);
  return c;
 }
 if(abs(role-9.)<.25){float sector=6.28318530718/8.;float x=(mod(frame.x+sector*.5,sector)-sector*.5)*2.05;c=vec3(.20,.27,.23);float glass=tfc6437box(vec2(x,y),vec2(0.,64.35),vec2(.49,1.65));c=mix(c,vec3(.10,.16,.17),glass);c=mix(c,vec3(.48,.51,.42),glass*max(tfc085Seam(x,.49,.018),tfc085Seam(y,.85,.018)));return c;}
 if(abs(role-13.)<.25){c=vec3(.22,.30,.26);return tfc6437window(c,frame.xy,0.,52.3,55.65,.78,.85);}
 if(abs(role-14.)<.25)return mix(vec3(.19,.28,.24),vec3(.32,.40,.33),tfc085Seam(y,.8,.016)*.32);
 return c;
}
`;
