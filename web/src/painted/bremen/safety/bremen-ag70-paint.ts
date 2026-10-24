export const EDGE_AG70_GLSL=`
float ag70Stroke(float d,float w){float a=max(fwidth(d),.014);return 1.-smoothstep(max(0.,w-a*.5),w+a*.5,abs(d));}
float ag70Box(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.014));vec2 q=1.-smoothstep(h-a*.5,h+a*.5,abs(p-c));return q.x*q.y;}
float ag70Repeat(float x,float pitch,float w){float a=max(fwidth(x)/pitch,.0001),h=w/pitch,d=abs(fract(x/pitch)-.5);return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h,0.,1.),smoothstep(.2,.7,a));}
vec3 ag70Window(vec3 c,vec2 uv,vec2 centre,vec2 h){vec3 trim=vec3(.73,.73,.67);float outer=ag70Box(uv,centre,h+vec2(.085,.085)),glass=ag70Box(uv,centre,h);vec2 q=uv-centre;float mull=max(ag70Stroke(q.x,.025),ag70Stroke(q.y+h.y*.33,.020));c=mix(c,trim,outer);return mix(c,mix(vec3(.17,.22,.23),trim,mull),glass);}
vec3 paintedgeAg70(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family<46740.||family>46759.)return base;
 float u=f.x,y=f.y;vec2 uv=vec2(u,y);vec3 c=base;
 if(family==46741.)return c*(1.-.08*ag70Repeat(u,1.05,.012));
 if(family==46748.)return c;
 float ashlar=max(ag70Repeat(y,.48,.006),ag70Repeat(u+floor(y/.48)*.64,1.28,.006));c*=1.-ashlar*.055;
 if(family==46740.){
  // Separate tall classroom/office apertures, pale stone piers and five upper registers photographed from Ostertorstraße.
  for(int j=0;j<5;j++){float yy=5.0+float(j)*3.42;float cx=-164.0+floor((u+164.0)/2.52)*2.52+1.26;c=ag70Window(c,uv,vec2(cx,yy),vec2(.56,.92));}
  float ground=ag70Box(uv,vec2(-138.,1.65),vec2(25.3,1.62));float pier=ag70Repeat(u+164.0,5.04,.23);c=mix(c,mix(vec3(.14,.18,.18),vec3(.55,.53,.47),pier),ground*.95);
  float slab=max(ag70Stroke(y-3.35,.12),ag70Stroke(y-20.28,.14));c=mix(c,vec3(.72,.71,.65),slab*.9);
  return c;
 }
 if(family==46743.){
  // The connected taller rear court block has horizontal pale slabs and recessed glazing, visible at the end of the primary street photograph.
  for(int j=0;j<8;j++){float yy=3.5+float(j)*3.20;float cx=-183.+floor((u+183.)/2.70)*2.70+1.35;c=ag70Window(c,uv,vec2(cx,yy),vec2(.94,.93));}
  c=mix(c,vec3(.74,.74,.68),ag70Repeat(y-.35,3.20,.115)*.88);return c;
 }
 // Unphotographed returns retain their sandstone/concrete material; no invented rear window count.
 return c;
}`;
