export const infillFrankfurtFbcOwnerPaintGLSL=/*glsl*/`


// Derivatives are taken before wrapping. Far pixels converge to mean coverage.
float fbcAaLine(float c,float period,float halfWidth) {
 float footprint=max(fwidth(c),0.0001);
 float d=abs(fract(c/period)-0.5)*period;
 float resolved=1.0-smoothstep(halfWidth-footprint*0.5,halfWidth+footprint*0.5,d);
 float meanCoverage=clamp(2.0*halfWidth/period,0.0,1.0);
 return mix(resolved,meanCoverage,smoothstep(period*0.18,period*0.60,footprint));
}
float fbcAaWindow(float c,float period,float lo,float hi) {
 float footprint=max(fwidth(c),0.0001);
 float center=(lo+hi)*0.5;
 float d=abs(fract((c-center)/period+0.5)-0.5)*period;
 float halfWidth=(hi-lo)*0.5;
 float resolved=1.0-smoothstep(halfWidth-footprint*0.5,halfWidth+footprint*0.5,d);
 return mix(resolved,clamp((hi-lo)/period,0.0,1.0),smoothstep(period*0.18,period*0.60,footprint));
}

vec3 infillFrankfurtFbcOfficialPaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family) {
 if(family<28699.5||family>28703.5)return base;
 if(family>28702.5){float louver=fbcAaLine(p.y,0.30,0.025);return mix(base,base*0.68,louver*0.6);}
 if(abs(normal.y)>0.5){float a=fbcAaLine(p.x,2.0,0.04),b=fbcAaLine(p.z,2.0,0.04);return mix(base,base*0.91,(1.0-(1.0-a)*(1.0-b))*0.35);}
 float u=dot(p.xz,vec2(-0.5264,0.8502));float edgeFacing=abs(dot(normal.xz,vec2(-0.5264,0.8502)));
 float floorPitch=family<28700.5?3.42:3.12;float floorJoint=fbcAaLine(p.y,floorPitch,0.04);
 bool concrete=family<28700.5&&(edgeFacing>0.8||p.y>133.0||(p.y>47.0&&p.y<52.0));
 if(concrete){float v=fbcAaLine(u,1.5,0.025);float joint=1.0-(1.0-floorJoint)*(1.0-v);return mix(vec3(0.68,0.69,0.64),vec3(0.47,0.49,0.46),joint*0.42);}
 if(p.y<0.9)return vec3(0.43,0.38,0.32);
 float vertical=fbcAaLine(u,1.48,0.055);float joint=1.0-(1.0-vertical)*(1.0-floorJoint*0.65);
 return mix(family<28700.5?vec3(0.15,0.23,0.26):vec3(0.25,0.34,0.35),vec3(0.56,0.61,0.59),joint*0.8);
}

float fd707Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtFbcOfficialPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillFrankfurtFbcOfficialPaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=1.48,h=3.42;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd707Line(u-.09,w,.018),secondary=fd707Line(u+w*.5,w,.023),transom=fd707Line(y-h*.57,h,.024);
 float reveal=fd707Line(u-.15,w,.045),sill=fd707Line(y-h*.18,h,.036),sillLip=fd707Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 return c;
}

`;
