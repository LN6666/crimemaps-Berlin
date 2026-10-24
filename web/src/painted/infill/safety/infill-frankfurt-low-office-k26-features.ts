export const infillFrankfurtLowOfficeK26OwnerPaintGLSL=/*glsl*/`

float fraK26Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.0-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
float fraK26Window(float x,float period,float lo,float hi){float fw=max(fwidth(x),.0001),hw=(hi-lo)*.5,d=abs(fract((x-(lo+hi)*.5)/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp((hi-lo)/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtLowOfficeK26PaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family<34355.5||family>34359.5)return base;
 p.xz=frame.xz; // own bound common frame, not renderer global style XY
 if(normal.y<-.5)return vec3(.45,.38,.34);
 if(normal.y>.5){
  vec3 roof=p.y>70.?vec3(.43,.47,.47):vec3(.56,.55,.50);
  float joints=1.-(1.-fraK26Line(p.x,2.0,.024))*(1.-fraK26Line(p.z,2.0,.024));
  if(p.y>70.){float u=dot(p.xz,vec2(.86,.51)),v=dot(p.xz,vec2(-.51,.86));float ed=min(min(u+11.208,13.487-u),min(v+8.576,19.377-v));roof=mix(vec3(.70,.70,.65),roof,smoothstep(.30,.72,ed));}
  return mix(roof,roof*.81,joints*.5);
 }
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001)));
 vec3 stone=vec3(.53,.39,.34),glass=vec3(.27,.38,.42);
 // The northern slab stays opaque: paneljoints only, no fabricated windows.
 if(normal.z>.75){float joints=1.-(1.-fraK26Line(u,1.8,.022))*(1.-fraK26Line(p.y,1.5,.022));return mix(stone,stone*.78,joints*.5);}
 float mullion=fraK26Line(u,1.55,.042);
 if(normal.x<-.65&&p.y<61.0){float floorLine=fraK26Line(p.y,3.55,.05);return mix(glass,vec3(.50,.47,.42),(1.-(1.-mullion)*(1.-floorLine))*.75);}
 float opening=fraK26Window(p.y-.9,3.55,.55,3.18);
 if(p.y>61.)opening*=fraK26Window(u,2.25,.55,1.70);
 return mix(stone,mix(glass,vec3(.32,.34,.34),mullion*.75),opening*.96);
}

float fd702Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtLowOfficeK26Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillFrankfurtLowOfficeK26PaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(frame.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=1.55,h=3.55;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd702Line(u-.09,w,.018),secondary=fd702Line(u+w*.5,w,.023),transom=fd702Line(y-h*.57,h,.024);
 float reveal=fd702Line(u-.15,w,.045),sill=fd702Line(y-h*.18,h,.036),sillLip=fd702Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 float masonry=(1.-pane)*step(.58,c.r)*step(abs(c.r-c.g),.16);float course=fd702Line(y,.65,.007),joint=fd702Line(u+floor(y/.65)*.7,1.4,.007);c=mix(c,c*.89,max(course,joint)*masonry*.27);
 return c;
}

`;
