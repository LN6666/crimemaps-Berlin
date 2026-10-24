export const infillFrankfurtLowOfficeOwnerPaintGLSL=/*glsl*/`

// These two facade systems are individually bound to their own architect photographs.
// Derivatives use unwrapped metres, then fade to analytic average at distance.
float fraLowLine(float x,float period,float halfWidth){
 float fw=max(fwidth(x),0.0001);
 float d=abs(fract(x/period+0.5)-0.5)*period;
 float nearValue=1.0-smoothstep(halfWidth-fw*0.5,halfWidth+fw*0.5,d);
 return mix(nearValue,clamp(2.0*halfWidth/period,0.0,1.0),smoothstep(period*0.18,period*0.60,fw));
}
float fraLowWindow(float x,float period,float lo,float hi){
 float center=(lo+hi)*.5,hw=(hi-lo)*.5,fw=max(fwidth(x),.0001);
 float d=abs(fract((x-center)/period+.5)-.5)*period;
 return mix(1.0-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp((hi-lo)/period,0.0,1.0),smoothstep(period*.18,period*.60,fw));
}
float fraLowEdgeDistance(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return abs(d.x*(p.y-a.y)-d.y*(p.x-a.x))/max(length(d),.0001);}
vec3 infillFrankfurtLowOfficePaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 bool romeo=family>34167.5&&family<34171.5;
 bool first=family>34179.5&&family<34183.5;
 bool dz=family>34123.5&&family<34127.5;
 bool ml=family>34215.5&&family<34219.5;
 if(!romeo&&!first&&!dz&&!ml)return base;
 if(normal.y<-.5)return base;
 if(normal.y>.5){
  if(ml&&p.y>30.5){
   // Top trueofficial rectangle, subdivided edges collapsed only for material mask.
   // DOP shows pale center and gray service/perimeter; 3m visual rim is approximate.
   vec2 a=vec2(-11.308,1.458),b=vec2(-2.242,-13.459),c=vec2(11.965,-4.776),d=vec2(2.898,10.141);
   vec2 roofP=frame.xz; // Renderer p.xz is global style space; own roof mask needs bound common frame.
   float edge=min(min(fraLowEdgeDistance(roofP,a,b),fraLowEdgeDistance(roofP,b,c)),min(fraLowEdgeDistance(roofP,c,d),fraLowEdgeDistance(roofP,d,a)));
   float aa=max(fwidth(edge),.05),center=smoothstep(2.8-aa,3.2+aa,edge);
   return mix(vec3(.51,.53,.51),vec3(.84,.85,.81),center);
  }
  float seams=1.0-(1.0-fraLowLine(p.x,1.8,.018))*(1.0-fraLowLine(p.z,1.8,.018));return mix(base,base*.79,seams*.5);}
 float u=dot(p.xz,normalize(vec2(normal.z+0.000001,-normal.x+0.000001)));
 if(dz){
  float joint=fraLowLine(p.y,3.5,.035);
  if(p.y>17.0)return mix(vec3(.30,.31,.30),vec3(.19,.21,.21),fraLowLine(u,1.5,.035)*.5);
  if(p.y<3.5)return mix(vec3(.54,.56,.54),vec3(.22,.29,.29),fraLowWindow(u,4.0,.40,3.60)*.85);
  float window=fraLowWindow(u,1.50,.43,1.05)*fraLowWindow(p.y-3.5,3.5,.45,3.32);
  vec3 result=mix(vec3(.86,.86,.82),vec3(.22,.29,.29),window);
  return mix(result,vec3(.69,.70,.68),joint*.38);
 }
 if(ml){
  if(p.y>29.0)return mix(vec3(.75,.77,.76),vec3(.57,.60,.59),fraLowLine(u,1.6,.022)*.5);
  float vertical=fraLowLine(u,1.60,.037),horizontal=fraLowLine(p.y-3.5,3.63,.047);
  float line=1.0-(1.0-vertical)*(1.0-horizontal);
  return mix(vec3(.41,.53,.55),vec3(.70,.73,.73),line*.91);
 }
 float w=romeo?1.55:1.65;float h=romeo?3.55:3.54;
 // Dark double metal relief frames, narrow upright lights and floor-wide crosspieces.
 float edgeU=fraLowLine(u,w,.061),edgeH=fraLowLine(p.y,h,.080);
 float nestedU=fraLowLine(u-.125,w,.021)+fraLowLine(u+.125,w,.021);
 float nestedH=fraLowLine(p.y-.17,h,.022)+fraLowLine(p.y+.17,h,.022);
 float major=1.0-(1.0-edgeU)*(1.0-edgeH);
 float nested=clamp((nestedU+nestedH)*.5,0.0,1.0);
 vec3 glass=romeo?vec3(.30,.40,.45):vec3(.31,.41,.45);
 vec3 metal=romeo?vec3(.20,.24,.25):vec3(.21,.25,.26);
 vec3 result=mix(glass,metal,major*.91);
 result=mix(result,vec3(.38,.41,.42),nested*.42);
 // Half-density detail: primary frame rhythm everywhere, no room/interior fiction.
 return result;
}

float fd700Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtLowOfficePaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillFrankfurtLowOfficePaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=1.6,h=3.6;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd700Line(u-.09,w,.018),secondary=fd700Line(u+w*.5,w,.023),transom=fd700Line(y-h*.57,h,.024);
 float reveal=fd700Line(u-.15,w,.045),sill=fd700Line(y-h*.18,h,.036),sillLip=fd700Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 float masonry=(1.-pane)*step(.58,c.r)*step(abs(c.r-c.g),.16);float course=fd700Line(y,.65,.007),joint=fd700Line(u+floor(y/.65)*.7,1.4,.007);c=mix(c,c*.89,max(course,joint)*masonry*.27);
 return c;
}

`;
