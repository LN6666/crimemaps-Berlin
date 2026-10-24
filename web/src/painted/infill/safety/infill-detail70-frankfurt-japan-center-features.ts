export const INFILL_JAPAN_CENTER_GLSL=/*glsl*/`
vec3 infillJapanCenterPaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family!=30301.)return base;
 vec2 uv=frame.xy;vec3 stone=vec3(.61,.40,.31),glass=vec3(.21,.27,.30);
 float pane=step(.5,mod(uv.x,3.2))*step(mod(uv.x,3.2),2.15)*step(.9,mod(uv.y,3.85))*step(mod(uv.y,3.85),2.55);
 return mix(stone,glass,pane);}
float fd7014Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillJapanCenterPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillJapanCenterPaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=2.2,h=3.6;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd7014Line(u-.09,w,.018),secondary=fd7014Line(u+w*.5,w,.023),transom=fd7014Line(y-h*.57,h,.024);
 float reveal=fd7014Line(u-.15,w,.045),sill=fd7014Line(y-h*.18,h,.036),sillLip=fd7014Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 float masonry=(1.-pane)*step(.58,c.r)*step(abs(c.r-c.g),.16);float course=fd7014Line(y,.65,.007),joint=fd7014Line(u+floor(y/.65)*.7,1.4,.007);c=mix(c,c*.89,max(course,joint)*masonry*.27);
 return c;
}

`;
