export const OWNER_F148_PAINT_GLSL=`
float db148Rect(vec2 q,vec2 h){vec2 s=1.-smoothstep(h,h+vec2(.025),abs(q));return s.x*s.y;}
float db148Line(float q,float h){return 1.-smoothstep(h,h+max(fwidth(q),.015),abs(q));}
// frame=(global source X or end-face Z, source height or roofZ, width, faceKind).
// Face 0 roof; 1 north; 2 south; 3 west; 4 east. Exact family dispatch is external.
vec3 deutscheBundesbankRecovery145(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float kind=frame.w,x=frame.x,y=frame.y;
 vec3 concrete=vec3(.70,.70,.66),edge=vec3(.80,.79,.73),shade=vec3(.48,.49,.46),glass=vec3(.19,.24,.25);
 if(kind<.5){
  // Native flat roof retained. Only source-footprint parapet and restrained tonal field;
  // mechanical-cap depth/outline and elevator-core roof relief remain unverified.
  float border=max(smoothstep(106.2,108.8,abs(x)),smoothstep(6.3,8.85,abs(y)));
  return mix(vec3(.48,.49,.46),concrete,border*.8);
 }
 if(kind>2.5){
  // Thin solid end closures: no unsupported office windows on short ends.
  float seam=db148Line(abs(x)-7.4,.10);return mix(concrete,shade,seam*.5);
 }
 vec3 c=concrete;
 // Published two elevator cores divide the single straight slab. Their dimensions are
 // registered approximately from the captioned north photograph, not the incidental OSM nodes.
 float coreDist=min(abs(x+47.),abs(x-47.));
 if(coreDist<6.8){
  c=mix(concrete,vec3(.64,.65,.61),smoothstep(5.6,6.8,coreDist)*.5);
  c=mix(c,shade,db148Line(coreDist-6.55,.16)*.7);
  return c;
 }
 // This building's three finite fields: seven, ten, seven major bays, each with four panes.
 float left=0.,right=0.,bays=0.;
 if(x<-53.8){left=-108.3;right=-53.8;bays=7.;}
 else if(x>-40.2&&x<40.2){left=-40.2;right=40.2;bays=10.;}
 else if(x>53.8){left=53.8;right=108.3;bays=7.;}
 else return c;
 float pitch=(right-left)/bays;
 if(x<left||x>right)return c;
 float ux=mod(x-left,pitch)-pitch*.5;
 if(y<4.2){
  // Source photographs support floor-reaching glazing and central entrance, not a fake upper window.
  float entry=abs(x)<18.?1.:0.;float ground=step(.24,y)*(1.-step(3.9,y));
  if(ground>.5){c=glass;float posts=db148Line(abs(ux)-pitch*.45,.11);c=mix(c,concrete,posts);c=mix(c,edge,db148Line(ux,.035)*entry);}
  return mix(c,shade,db148Line(y-4.12,.12)*.4);
 }
 if(y>=52.3)return c;
 const float floorPitch=3.7;float row=floor((y-4.2)/floorPitch);
 if(row<0.||row>=13.)return c;
 float yy=mod(y-4.2,floorPitch)-floorPitch*.5;
 vec2 q=vec2(ux,yy);float recess=db148Rect(q,vec2(pitch*.435,1.35));
 c=mix(c,vec3(.35,.37,.34),recess);
 float opening=db148Rect(q+vec2(0.,.03),vec2(pitch*.405,1.12));c=mix(c,glass,opening);
 float pane=mod(ux+pitch*.405,pitch*.81/4.);float mullion=db148Line(min(pane,pitch*.81/4.-pane),.035);
 c=mix(c,vec3(.52,.54,.51),mullion*opening);
 float transom=db148Line(yy+.42,.035);c=mix(c,vec3(.48,.50,.47),transom*opening);
 // Independent lower opaque spandrel and white concrete beam; no sky or tree reflections baked in.
 float spandrel=opening*(1.-smoothstep(-.55,-.39,yy));c=mix(c,vec3(.47,.49,.46),spandrel);
 c=mix(c,edge,db148Line(yy-1.63,.11));
 c=mix(c,shade,db148Line(yy+1.53,.09)*.55);
 return c;
}

`;
