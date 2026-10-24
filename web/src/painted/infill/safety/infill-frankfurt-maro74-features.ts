export const infillFrankfurtMaro74OwnerPaintGLSL=/*glsl*/`

float fraM74Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
float fraM74Seg(vec2 p,vec2 a,vec2 b){vec2 d=b-a;float t=clamp(dot(p-a,d)/max(dot(d,d),.0001),0.,1.);return length(p-a-t*d);}
const vec2 fraM74Outer[34]=vec2[34](vec2(-25.498793,-14.521608),vec2(-22.450645,-7.107745),vec2(-23.193052,-6.807183),vec2(-22.065165,-4.068726),vec2(-23.878349,-3.322886),vec2(-13.884421,21.089519),vec2(25.498793,9.133772),vec2(24.842050,6.796059),vec2(25.106175,6.729267),vec2(24.149613,3.367416),vec2(20.637461,-8.543764),vec2(17.746361,-7.630946),vec2(14.862399,-17.427038),vec2(4.318805,-14.276706),vec2(-5.410998,-10.391664),vec2(-6.724486,-13.475207),vec2(-5.767924,-13.864825),vec2(-5.025518,-12.083717),vec2(-1.955954,-13.330492),vec2(-2.705499,-15.122731),vec2(-1.948816,-15.456689),vec2(-2.284326,-16.180263),vec2(-2.648391,-16.770255),vec2(-3.162364,-17.371378),vec2(-3.576399,-17.738731),vec2(-3.976156,-18.083821),vec2(-4.618622,-18.373250),vec2(-5.432414,-18.684944),vec2(-6.353283,-18.885318),vec2(-7.267013,-18.907582),vec2(-8.152190,-18.840791),vec2(-8.880319,-18.629284),vec2(-9.872573,-21.089436),vec2(-12.221146,-20.076432));
const vec2 fraM74Core[6]=vec2[6](vec2(-6.514256,7.714256),vec2(3.085700,4.971408),vec2(3.599984,5.828548),vec2(10.799951,3.428557),vec2(5.999973,-11.485649),vec2(-11.142806,-6.171397));
bool fraM74Inside(vec2 p){bool hit=false;for(int i=0;i<34;i++){vec2 a=fraM74Outer[i],b=fraM74Outer[(i+1)%34];if((a.y>p.y)!=(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
vec3 infillFrankfurtMaro74PaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family<34303.5||family>34307.5)return base;
 p.xz=frame.xz;
 if(family>34306.5){float bars=1.-(1.-fraM74Line(p.x,1.6,.045))*(1.-fraM74Line(p.z,1.8,.045));return mix(vec3(.50,.63,.65),vec3(.43,.48,.49),bars*.75);}
 if(normal.y<-.5)return vec3(.61,.63,.62);
 if(normal.y>.5){
  if(p.y>27.0){float seams=1.-(1.-fraM74Line(p.x,1.8,.02))*(1.-fraM74Line(p.z,1.8,.02));float e=1000.;for(int i=0;i<6;i++)e=min(e,fraM74Seg(p.xz,fraM74Core[i],fraM74Core[(i+1)%6]));float aa=max(fwidth(e),.03);vec3 cap=mix(vec3(.78,.79,.74),vec3(.48,.51,.50),smoothstep(.25-aa,.5+aa,e));return mix(cap,vec3(.68,.69,.66),seams*.5);}
  // Wholelowerroof is a terrace, not anopaque roofcap. Small mineralpaths remain distinct.
  if(!fraM74Inside(p.xz))return mix(vec3(.72,.73,.67),vec3(.57,.59,.55),fraM74Line(p.x,2.0,.025)*.5);
  float path=fraM74Line(p.x*.86+p.z*.51,8.0,.45);
  return mix(vec3(.61,.59,.46),vec3(.77,.77,.70),path*.55);
 }
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001)));
 float storey=3.84;
 float post=fraM74Line(u,1.42,.035),floorBand=fraM74Line(p.y-6.0,storey,.105);
 float narrowFin=fraM74Line(u+.31,4.26,.10);
 vec3 glass=mix(vec3(.20,.28,.37),vec3(.47,.50,.51),narrowFin*.60);
 if(p.y<6.0){float groundPost=fraM74Line(u,4.26,.10);return mix(glass,vec3(.73,.74,.70),groundPost*.90);}
 // Individuallyobserved projectingwhiteboxframe rhythm, simplifieduniform50%, notgenericstonegrid.
 float boxU=fraM74Line(u+floor(p.y/(storey*2.0))*2.8,8.52,.14);
 float boxH=fraM74Line(p.y-6.0,storey*2.0,.18);
 float major=1.-(1.-boxU)*(1.-boxH);
 vec3 result=mix(glass,vec3(.65,.67,.66),(1.-(1.-post)*(1.-floorBand))*.75);
 return mix(result,vec3(.79,.79,.75),major*.97);
}

float fd703Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtMaro74Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillFrankfurtMaro74PaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(frame.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=1.42,h=3.84;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd703Line(u-.09,w,.018),secondary=fd703Line(u+w*.5,w,.023),transom=fd703Line(y-h*.57,h,.024);
 float reveal=fd703Line(u-.15,w,.045),sill=fd703Line(y-h*.18,h,.036),sillLip=fd703Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 return c;
}

`;
