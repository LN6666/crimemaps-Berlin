export const infillFrankfurtSkyperOwnerPaintGLSL=/*glsl*/`


// Derivatives are taken before wrapping. Far pixels converge to mean coverage.
float skyperAaLine(float c,float period,float halfWidth) {
 float footprint=max(fwidth(c),0.0001);
 float d=abs(fract(c/period)-0.5)*period;
 float resolved=1.0-smoothstep(halfWidth-footprint*0.5,halfWidth+footprint*0.5,d);
 float meanCoverage=clamp(2.0*halfWidth/period,0.0,1.0);
 return mix(resolved,meanCoverage,smoothstep(period*0.18,period*0.60,footprint));
}
float skyperAaWindow(float c,float period,float lo,float hi) {
 float footprint=max(fwidth(c),0.0001);
 float center=(lo+hi)*0.5;
 float d=abs(fract((c-center)/period+0.5)-0.5)*period;
 float halfWidth=(hi-lo)*0.5;
 float resolved=1.0-smoothstep(halfWidth-footprint*0.5,halfWidth+footprint*0.5,d);
 return mix(resolved,clamp((hi-lo)/period,0.0,1.0),smoothstep(period*0.18,period*0.60,footprint));
}

vec3 infillFrankfurtSkyperOfficialPaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family) {
 if(family<29999.5||family>30003.5)return base;
 float u=dot(p.xz,normalize(vec2(normal.z+0.00001,-normal.x+0.00001)));
 bool villa=family>30001.5&&family<30002.5;bool carre=family>30002.5;bool atrium=family>30000.5&&family<30001.5;
 if(abs(normal.y)>0.45){float scale=villa?0.46:1.8;float a=skyperAaLine(p.x,scale,0.03),b=skyperAaLine(p.z,scale,0.03);return mix(base,base*0.82,(1.0-(1.0-a)*(1.0-b))*0.5);}
 if(villa||carre){float w=villa?3.0:2.7;float h=villa?3.75:3.5;float wx=skyperAaWindow(u,w,0.58,w-0.58);float wy=skyperAaWindow(p.y-0.75,h,0.93,h-0.40);float window=wx*wy;float divider=skyperAaLine(u,w,0.028);float sill=skyperAaLine(p.y-0.75-0.82+h*0.5,h,0.05);vec3 stone=villa?vec3(0.70,0.67,0.58):vec3(0.81,0.79,0.70);vec3 glass=mix(vec3(0.16,0.24,0.25),vec3(0.51,0.52,0.45),divider*0.65);return mix(mix(stone,glass,window*0.95),stone*0.80,sill*wx*0.55);}
 float w=atrium?1.50:1.65;float h=atrium?3.0:3.80;float a=skyperAaLine(u,w,0.045),b=skyperAaLine(p.y,h,0.045);float joint=1.0-(1.0-a)*(1.0-b*0.75);return mix(atrium?vec3(0.25,0.40,0.42):vec3(0.24,0.36,0.40),vec3(0.64,0.69,0.68),joint*0.78);
}

float fd708Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtSkyperOfficialPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillFrankfurtSkyperOfficialPaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=1.65,h=3.8;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd708Line(u-.09,w,.018),secondary=fd708Line(u+w*.5,w,.023),transom=fd708Line(y-h*.57,h,.024);
 float reveal=fd708Line(u-.15,w,.045),sill=fd708Line(y-h*.18,h,.036),sillLip=fd708Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 float masonry=(1.-pane)*step(.58,c.r)*step(abs(c.r-c.g),.16);float course=fd708Line(y,.65,.007),joint=fd708Line(u+floor(y/.65)*.7,1.4,.007);c=mix(c,c*.89,max(course,joint)*masonry*.27);
 return c;
}

`;
