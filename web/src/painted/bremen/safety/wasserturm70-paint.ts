// Photograph-derived appearance on complete official LoD2 geometry; no SOURCE edits.
export const BREMEN_WASSERTURM70_GLSL=String.raw`
float bwt70hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
float bwt70line(float q,float w){float a=max(fwidth(q),.012);return 1.-smoothstep(w,w+a,abs(q));}
vec3 bwt70brick(float s,float y,vec3 col){
 float row=floor(y/.105);float x=s+mod(row,2.)*.16;vec2 cell=vec2(floor(x/.32),row);vec2 f=fract(vec2(x/.32,y/.105));
 float d=min(min(f.x,1.-f.x)*.32,min(f.y,1.-f.y)*.105);float mortar=1.-smoothstep(.005,.012,d);float close=1.-smoothstep(.18,.5,max(fwidth(s),fwidth(y)));
 col*=.94+.11*bwt70hash(cell);col=mix(col,col*.81+vec3(.12,.11,.08),mortar*close*.42);return col;
}
void bwt70window(inout vec3 col,float s,float y,float bottom,float top,float halfw,float arch){
 float roof=top-arch+arch*sqrt(max(0.,1.-s*s/(halfw*halfw)));float sd=max(abs(s)-halfw,max(bottom-y,y-roof));float aa=max(max(fwidth(s),fwidth(y)),.025);
 float edge=1.-smoothstep(.03,.15+aa,abs(sd));col=mix(col,vec3(.45,.30,.18),edge*.7);
 float inside=1.-smoothstep(-aa,aa,sd+.11);vec3 pane=vec3(.19,.245,.24)+vec3(.025)*sin(s*1.6+y*.36);
 float wire=max(bwt70line(mod(s+y*.48+.27,.68)-.34,.006),bwt70line(mod(s-y*.48+.27,.68)-.34,.006));pane=mix(pane,vec3(.46,.47,.40),wire*.23);
 float wood=max(max(bwt70line(s-halfw/3.,.065),bwt70line(s+halfw/3.,.065)),bwt70line(y-mix(bottom,top,.52),.105));pane=mix(pane,vec3(.51,.415,.27),wood*.95);
 col=mix(col,pane,inside);
}
vec3 bremenWasserturm70Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float s=frame.x;float y=frame.y;vec3 col=base;
 if(family==46051.){
  col=vec3(.61,.64,.625);float seam=max(bwt70line(mod(p.x+p.z*.12,.84)-.42,.012),bwt70line(mod(p.z,1.35)-.675,.008));col*=1.-seam*.13;col+=vec3(.018)*sin(p.x*.31+p.z*.26);return col;
 }
 if(family==46054.){
  float row=floor(y/.26);float tile=mod(s+row*.17,.34)-.17;col=vec3(.54,.265,.165)*(.92+.12*bwt70hash(vec2(floor((s+row*.17)/.34),row)));col*=1.-bwt70line(tile,.008)*.19;col*=1.-bwt70line(mod(y,.26)-.13,.009)*.15;return col;
 }
 if(family==46055.){
  col=vec3(.44,.445,.39);float joint=max(bwt70line(mod(s+floor(y/.48)*.6,1.2)-.6,.014),bwt70line(mod(y,.48)-.24,.012));return col*(1.-joint*.2);
 }
 if(family==46056.){
  // Only the photograph-visible central annex end gable; other walls remain brick.
  // LfD heritage-a04: weathered white render, not a half-timber facade.
  float weather=.025*sin(s*1.2+y*.7)+.018*sin(s*4.1-y*2.3);
  col=vec3(.79,.795,.73)+vec3(weather);
  float highWindows=step(abs(abs(s)-2.15),.42)*step(7.35,y)*step(y,8.55);
  col=mix(col,vec3(.18,.205,.18),highWindows);
  if(abs(s+.5)<2.05&&y>.65&&y<4.5){col=vec3(.48,.505,.45);col*=1.-bwt70line(mod(s,.2)-.1,.009)*.16;float surround=max(bwt70line(abs(s+.5)-2.05,.1),bwt70line(y-4.5,.12));col=mix(col,vec3(.30,.30,.24),surround);}
  return col;
 }
 if(family==46053.){
  col=bwt70brick(s,y,vec3(.58,.315,.205));
  if(abs(normal.y)<.15){
   if(frame.z==1.){float q=mod(s+2.25,4.5)-2.25;if(abs(s)<6.8)bwt70window(col,q,y,1.25,6.5,1.02,1.02);float circle=length(vec2(s,y-10.7));col=mix(col,vec3(.31,.23,.17),bwt70line(circle-.72,.09));}
   else if(frame.z==0.){float q=mod(s+2.0,4.0)-2.0;bwt70window(col,q,y,1.25,6.4,1.0,.94);if(y>8.3&&y<10.2){float vent=step(abs(q),.62);col=mix(col,vec3(.25,.29,.26),vent*.8);}}
   else{float q=mod(s+1.95,3.9)-1.95;bwt70window(col,q,y,1.0,4.65,.69,.35);}
   col=mix(col,vec3(.26,.24,.18),bwt70line(y-6.45,.14)*.65);
  }
  return col;
 }
 if(family==46052.){
  col=bwt70brick(s,y,vec3(.59,.335,.225));
  if(abs(normal.y)<.15){
   float slit=max(max(step(24.2,y)*step(y,26.4),step(28.4,y)*step(y,30.6)),step(11.3,y)*step(y,13.5))*bwt70line(s,.12);col=mix(col,vec3(.13,.14,.11),slit);
   float band=max(bwt70line(y-19.4,.13),bwt70line(y-35.6,.15));col=mix(col,vec3(.43,.43,.32),band*.75);
   if(y>35.6&&y<38.45){float q=mod(s+.51,1.02)-.51;float archTop=38.25-1.3*pow(clamp(abs(q)/.42,0.,1.),.68);float niche=step(abs(q),.31)*step(35.8,y)*step(y,archTop);col=mix(col,vec3(.25,.22,.14),niche*.75);}
   if(y>38.54){col=mix(col,vec3(.57,.54,.435),.7);float border=max(bwt70line(abs(s)-1.04,.09),max(bwt70line(y-38.75,.10),bwt70line(y-41.12,.10)));col=mix(col,vec3(.67,.65,.54),border*.88);float slit=step(39.3,y)*step(y,40.85)*bwt70line(s,.1);col=mix(col,vec3(.19,.19,.14),slit);}
  }return col;
 }
 // Tower main walls: four tall industrial bays on each principal elevation.
 col=bwt70brick(s,y,vec3(.575,.32,.215));
 if(abs(normal.y)<.15&&frame.z>13.5&&frame.z<15.6&&abs(s)<12.7){
  float q=mod(s+12.6,6.3)-3.15;bwt70window(col,q,y,21.7,30.6,2.075,.78);bwt70window(col,q,y,7.4,14.6,1.93,.64);
  if(y>16.9&&y<19.1){float panel=max(bwt70line(abs(q)-2.38,.07),bwt70line(y-17.15,.07));col=mix(col,vec3(.43,.37,.25),panel*.65);}
  if(y>32.1&&y<35.6){float a=mod(s+.56,1.12)-.56;float top=35.45-1.6*pow(clamp(abs(a)/.46,0.,1.),.7);float niche=step(abs(a),.33)*step(y,top)*step(32.35,y);col=mix(col,vec3(.245,.225,.155),niche*.80);}
 }
 float belt=max(max(bwt70line(y-15.6,.11),bwt70line(y-20.55,.10)),max(bwt70line(y-31.65,.10),bwt70line(y-35.85,.17)));col=mix(col,vec3(.45,.43,.31),belt*.64);
 if(y>36.05){col=mix(col,vec3(.51,.33,.22),.32);col=mix(col,vec3(.45,.43,.32),bwt70line(y-37.72,.16)*.65);}
 return col;
}
`;
