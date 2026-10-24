export const infillFrankfurtML41SignarisOwnerPaintGLSL=/*glsl*/`

float fraMLSLine(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
const vec2 fraMLSPV[8]=vec2[8](vec2(-13.466319,26.637618),vec2(0.591880,14.538212),vec2(-3.779157,8.820919),vec2(-5.669335,10.682363),vec2(-3.188476,13.208608),vec2(-9.922235,19.324787),vec2(-12.166822,17.862222),vec2(-16.419722,21.452155));
bool fraMLSInsidePV(vec2 p){bool hit=false;for(int i=0;i<8;i++){vec2 a=fraMLSPV[i],b=fraMLSPV[(i+1)%8];if((a.y>p.y)!=(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
vec3 infillFrankfurtML41SignarisPaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family<34235.5||family>34239.5)return base;
 p.xz=frame.xz;
 if(normal.y<-.5)return vec3(.69,.70,.67);
 if(normal.y>.5){if(p.y>33.5&&fraMLSInsidePV(p.xz)){float rows=fraMLSLine(p.x*.62-p.z*.78,1.25,.08);return mix(vec3(.16,.23,.28),vec3(.43,.48,.49),rows*.65);}float seams=fraMLSLine(p.x*.93+p.z*.36,3.,.025);return mix(vec3(.69,.69,.62),vec3(.83,.82,.75),seams*.45);}
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001)));
 bool signaris=family>34238.5;
 vec3 glass=signaris?vec3(.22,.40,.38):vec3(.22,.39,.43);
 if((!signaris&&p.y>27.3)||(signaris&&p.y>24.5)){float grid=1.-(1.-fraMLSLine(u,1.4,.055))*(1.-fraMLSLine(p.y-27.3,3.15,.20));return mix(glass,vec3(.72,.75,.74),grid*.96);}
 float period=signaris?2.1:2.0,postHW=signaris?.22:.35;
 float pier=fraMLSLine(u,period,postHW),floorBand=fraMLSLine(p.y-1.2,3.55,signaris?.25:.10);
 float stone=1.-(1.-pier)*(1.-floorBand);
 vec3 result=mix(glass,signaris?vec3(.77,.76,.69):vec3(.81,.79,.71),stone);
 // Teal spandrels stay visually distinct from real pale stone piers.
 float spandrel=fraMLSLine(p.y-2.2,3.55,.38)*(1.-pier);
 result=mix(result,vec3(.24,.34,.34),spandrel*.72);
 float mullion=fraMLSLine(u+period*.25,period*.5,.025)*(1.-pier);
 return mix(result,vec3(.62,.67,.65),mullion*.65);
}

float fd705Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtML41SignarisPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillFrankfurtML41SignarisPaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(frame.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=2.0,h=3.55;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd705Line(u-.09,w,.018),secondary=fd705Line(u+w*.5,w,.023),transom=fd705Line(y-h*.57,h,.024);
 float reveal=fd705Line(u-.15,w,.045),sill=fd705Line(y-h*.18,h,.036),sillLip=fd705Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 float masonry=(1.-pane)*step(.58,c.r)*step(abs(c.r-c.g),.16);float course=fd705Line(y,.65,.007),joint=fd705Line(u+floor(y/.65)*.7,1.4,.007);c=mix(c,c*.89,max(course,joint)*masonry*.27);
 return c;
}

`;
