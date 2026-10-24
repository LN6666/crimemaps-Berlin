/** Exact four native carriers only. Photo-bound face roles are written by the
 * independent owner; unknown returns and schematic Portico keep related base. */
export const FRANKFURT_OFFICE_PRINCIPALS_GLSL069=String.raw`
float fop069Band(float x,float a,float b){float w=max(fwidth(x),.012);return smoothstep(a-w,a+w,x)*(1.-smoothstep(b-w,b+w,x));}
float fop069Line(float x,float period,float halfwidth){float q=mod(x,period);return 1.-fop069Band(q,halfwidth,period-halfwidth);}
vec3 frankfurtOfficePrincipals069(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec2 uv=frame.xy;float h=frame.z;
 if(family==45243.||family==45247.||family==45251.){
  if(normal.y<.1)return base;
  float seam=fop069Line(uv.x,1.05,.018);return mix(base,base*.86,seam*.28);
 }
 if(abs(normal.y)>.12)return base;
 if(family==45240.){
  if(abs(h-95.)>.05||dot(normal,vec3(.824,0.,-.567))<.995)return base;
  float floorH=h/22.,y=mod(uv.y,floorH),m=fop069Line(uv.x,1.48,.035);
  vec3 glass=vec3(.255,.365,.435),metal=vec3(.63,.67,.68);
  float pane=fop069Band(y,.24,floorH-.42);vec3 c=mix(vec3(.58,.62,.63),glass,pane);c=mix(c,metal,m*.8);
  if(uv.y<floorH*6.){float bay=mod(uv.x,3.25),win=fop069Band(bay,.40,2.85)*fop069Band(y,.72,floorH-.55);c=mix(vec3(.69,.70,.67),vec3(.245,.33,.38),win);c=mix(c,vec3(.59,.63,.64),fop069Line(uv.x,1.625,.028)*win);}
  return c;
 }
 if(family==45241.){
  if(abs(h-95.)>.05||dot(normal,vec3(-.562,0.,-.827))<.995)return base;
  float seam=max(fop069Line(uv.x,2.35,.018),fop069Line(uv.y,1.16,.012));return mix(base,base*.77,seam*.40);
 }
 if(family==45244.){
  if(abs(h-130.)>.05||normal.x<.1||normal.z>-.35)return base;
  float floorH=h/33.,vertical=fop069Line(uv.x,1.48,.13),transom=fop069Line(uv.y,floorH,.075),spandrel=fop069Band(mod(uv.y,floorH),0.,.40);
  vec3 c=mix(vec3(.275,.38,.43),vec3(.43,.49,.51),spandrel);return mix(c,vec3(.72,.74,.72),max(vertical,transom));
 }
 if(family==45245.){
  if(abs(h-130.)>.05||dot(normal,vec3(-.824,0.,.566))<.995)return base;
  float seam=max(fop069Line(uv.x,1.48,.018),fop069Line(uv.y,h/33.,.018));return mix(base,base*.76,seam*.45);
 }
 if(family==45248.||family==45249.){
  if(abs(h-110.)>.05)return base;
  float floorH=h/31.,cylinder=family==45249.?1.:0.;
  float fine=fop069Line(uv.x,mix(1.35,1.18,cylinder),.025),major=(1.-cylinder)*fop069Line(uv.x,8.10,.14),horizontal=fop069Line(uv.y,floorH,.065),spandrel=fop069Band(mod(uv.y,floorH),0.,.63);
  vec3 glass=mix(vec3(.235,.355,.425),vec3(.315,.43,.47),cylinder);vec3 c=mix(glass,vec3(.20,.275,.31),spandrel*.80);c=mix(c,vec3(.48,.56,.59),max(fine,horizontal)*.80);return mix(c,vec3(.65,.69,.70),major);
 }
 // 45242/45246 unknown opposite faces,45250 small returns/lowPortico:
 // related material only. No fabricated windows, sixstoreys or doors.
 return base;
}
`;
