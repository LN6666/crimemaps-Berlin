export const infillFrankfurtNextowerOwnerPaintGLSL=/*glsl*/`


// Derivatives are taken before wrapping. Far pixels converge to mean coverage.
float nextowerAaLine(float c,float period,float halfWidth) {
 float footprint=max(fwidth(c),0.0001);
 float d=abs(fract(c/period)-0.5)*period;
 float resolved=1.0-smoothstep(halfWidth-footprint*0.5,halfWidth+footprint*0.5,d);
 float meanCoverage=clamp(2.0*halfWidth/period,0.0,1.0);
 return mix(resolved,meanCoverage,smoothstep(period*0.18,period*0.60,footprint));
}
float nextowerAaWindow(float c,float period,float lo,float hi) {
 float footprint=max(fwidth(c),0.0001);
 float center=(lo+hi)*0.5;
 float d=abs(fract((c-center)/period+0.5)-0.5)*period;
 float halfWidth=(hi-lo)*0.5;
 float resolved=1.0-smoothstep(halfWidth-footprint*0.5,halfWidth+footprint*0.5,d);
 return mix(resolved,clamp((hi-lo)/period,0.0,1.0),smoothstep(period*0.18,period*0.60,footprint));
}

vec3 infillFrankfurtNextowerOfficialPaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family) {
 if(family<29299.5||family>29300.5)return base;
 if(abs(normal.y)>0.45){float scale=normal.y<0.0?2.0:1.8;float a=nextowerAaLine(p.x,scale,0.04),b=nextowerAaLine(p.z,scale,0.04);float seam=1.0-(1.0-a)*(1.0-b);return normal.y<0.0?mix(vec3(0.64,0.67,0.65),vec3(0.48,0.53,0.52),seam*0.45):mix(vec3(0.36,0.40,0.41),vec3(0.28,0.32,0.33),seam*0.45);}
 float u=dot(p.xz,normalize(vec2(normal.z+0.00001,-normal.x+0.00001)));
 float wx=nextowerAaWindow(u,2.35,0.635,1.535);float wy=nextowerAaWindow(p.y,3.75,0.315,3.335);
 float a=nextowerAaLine(u+2.35*0.5,2.35,0.028),b=nextowerAaLine(p.y+3.75*0.5,3.75,0.028);float panelJoint=1.0-(1.0-a)*(1.0-b);
 vec3 silver=mix(vec3(0.76,0.79,0.77),vec3(0.58,0.63,0.62),panelJoint*0.42);
 float mullion=nextowerAaLine(u-1.115+2.35*0.5,2.35,0.028);vec3 glass=mix(vec3(0.18,0.28,0.31),vec3(0.50,0.58,0.58),mullion*0.7);
 return mix(silver,glass,wx*wy*0.96);
}

float fd709Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtNextowerOfficialPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillFrankfurtNextowerOfficialPaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=2.35,h=3.75;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd709Line(u-.09,w,.018),secondary=fd709Line(u+w*.5,w,.023),transom=fd709Line(y-h*.57,h,.024);
 float reveal=fd709Line(u-.15,w,.045),sill=fd709Line(y-h*.18,h,.036),sillLip=fd709Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 return c;
}

`;
