export const infillFrankfurtMaro80OwnerPaintGLSL=/*glsl*/`

float fraM80Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
float fraM80Seg(vec2 p,vec2 a,vec2 b){vec2 d=b-a;float t=clamp(dot(p-a,d)/max(dot(d,d),.0001),0.,1.);return length(p-a-t*d);}
const vec2 fraM80Outer[11]=vec2[11](vec2(-13.677324,18.701707),vec2(-3.440746,15.239660),vec2(0.185600,14.182122),vec2(0.449724,14.115330),vec2(-2.327144,4.552969),vec2(23.299992,-3.295056),vec2(22.700360,-6.567846),vec2(20.194754,-18.701642),vec2(19.837830,-18.601454),vec2(-23.299992,-5.688423),vec2(-14.048525,17.755488));
const vec2 fraM80Core[6]=vec2[6](vec2(-8.228534,11.999959),vec2(-1.714278,10.114249),vec2(-3.942839,2.399990),vec2(15.942784,-3.599982),vec2(14.571362,-8.399955),vec2(-14.399934,0.342856));
bool fraM80Inside(vec2 p){bool hit=false;for(int i=0;i<11;i++){vec2 a=fraM80Outer[i],b=fraM80Outer[(i+1)%11];if((a.y>p.y)!=(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
vec3 infillFrankfurtMaro80PaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family<34311.5||family>34315.5)return base;
 p.xz=frame.xz;
 if(family>34314.5){float bars=1.-(1.-fraM80Line(p.x,1.6,.045))*(1.-fraM80Line(p.z,1.8,.045));return mix(vec3(.50,.63,.65),vec3(.43,.48,.49),bars*.75);}
 if(normal.y<-.5)return vec3(.61,.63,.62);
 if(normal.y>.5){
  if(p.y>27.0){float seams=1.-(1.-fraM80Line(p.x,1.8,.02))*(1.-fraM80Line(p.z,1.8,.02));float e=1000.;for(int i=0;i<6;i++)e=min(e,fraM80Seg(p.xz,fraM80Core[i],fraM80Core[(i+1)%6]));float aa=max(fwidth(e),.03);vec3 cap=mix(vec3(.78,.79,.74),vec3(.48,.51,.50),smoothstep(.25-aa,.5+aa,e));return mix(cap,vec3(.68,.69,.66),seams*.5);}
  // Wholelowerroof is a terrace, not anopaque roofcap. Small mineralpaths remain distinct.
  if(!fraM80Inside(p.xz))return mix(vec3(.72,.73,.67),vec3(.57,.59,.55),fraM80Line(p.x,2.0,.025)*.5);
  float path=fraM80Line(p.x*.86+p.z*.51,8.0,.45);
  return mix(vec3(.61,.59,.46),vec3(.77,.77,.70),path*.55);
 }
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001)));
 float storey=3.84;
 float post=fraM80Line(u,1.42,.035),floorBand=fraM80Line(p.y-6.0,storey,.105);
 float narrowFin=fraM80Line(u+.31,4.26,.10);
 vec3 glass=mix(vec3(.20,.28,.37),vec3(.47,.50,.51),narrowFin*.60);
 if(p.y<6.0){float groundPost=fraM80Line(u,4.26,.10);return mix(glass,vec3(.73,.74,.70),groundPost*.90);}
 // Individuallyobserved projectingwhiteboxframe rhythm, simplifieduniform50%, notgenericstonegrid.
 float boxU=fraM80Line(u+floor(p.y/(storey*2.0))*2.8,8.52,.14);
 float boxH=fraM80Line(p.y-6.0,storey*2.0,.18);
 float major=1.-(1.-boxU)*(1.-boxH);
 vec3 result=mix(glass,vec3(.65,.67,.66),(1.-(1.-post)*(1.-floorBand))*.75);
 return mix(result,vec3(.79,.79,.75),major*.97);
}

float fd704Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtMaro80Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillFrankfurtMaro80PaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(frame.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=1.42,h=3.84;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd704Line(u-.09,w,.018),secondary=fd704Line(u+w*.5,w,.023),transom=fd704Line(y-h*.57,h,.024);
 float reveal=fd704Line(u-.15,w,.045),sill=fd704Line(y-h*.18,h,.036),sillLip=fd704Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 return c;
}

`;
