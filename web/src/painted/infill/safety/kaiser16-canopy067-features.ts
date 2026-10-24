/** Dedicated Kaiser16 canopy material. Exact geometry/ownership is checked by its provider;
 * these metre masks never describe an office elevation or the under-canopy platform. */
export const KAISER16_CANOPY_GLSL067=String.raw`
float k16Line067(float x,float pitch,float halfWidth){float d=abs(mod(x+pitch*.5,pitch)-pitch*.5);float aa=clamp(fwidth(x),.003,.045);return 1.-smoothstep(halfWidth,halfWidth+aa,d);}
vec3 kaiser16Canopy067(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 steel=vec3(.70,.75,.73),darkSteel=vec3(.24,.33,.34),glass=vec3(.31,.48,.51);
 if(abs(family-45300.)<.25){
  if(normal.y<.85||abs(frame.z-20.189)>.03||abs(frame.w-7.0233455)>.03)return base;
  float across=k16Line067(frame.x,frame.w/3.,.032),crossbar=k16Line067(frame.y,1.40,.034),beam=k16Line067(frame.y,4.20,.075);
  vec3 g=vec3(.42,.58,.60)+vec3(.018,.024,.025)*clamp(frame.y/25.,0.,1.);
  return mix(g,mix(steel,darkSteel,beam*.24),max(across,max(crossbar,beam)));
 }
 if(abs(family-45301.)<.25){
  if(abs(normal.y)>.05||abs(frame.z-.28)>.02||abs(frame.w-7.0233455)>.03)return base;
  return mix(steel,darkSteel,.20*(1.-smoothstep(-.28,-.10,frame.y)));
 }
 if(abs(family-45302.)<.25){
  if(abs(normal.y)>.05||normal.x<.7||normal.z>-.4||abs(frame.z-12.089)>.03||abs(frame.w-6.9120347)>.03)return base;
  // Large bolted glass panes are not floors/windows. Lower opening has no triangles.
  float vertical=k16Line067(frame.x,frame.w/4.,.028),horizontal=k16Line067(frame.y,frame.z/4.,.028);
  float border=1.-smoothstep(.07,.13,min(min(frame.x,frame.w-frame.x),min(frame.y,frame.z-frame.y)));
  vec3 g=glass+vec3(.025,.035,.035)*clamp(frame.x/frame.w,0.,1.);
  g=mix(g,steel,max(border,max(vertical,horizontal)));
  vec2 q=abs(vec2(frame.x-frame.w*.50,frame.y-frame.z*.68));float hex=max(dot(q,vec2(.8660254,.5)),q.y);
  float logo=(1.-smoothstep(1.04,1.08,hex))*smoothstep(.73,.77,hex);
  return mix(g,vec3(.94,.72,.10),logo);
 }
 return base;
}
`;
