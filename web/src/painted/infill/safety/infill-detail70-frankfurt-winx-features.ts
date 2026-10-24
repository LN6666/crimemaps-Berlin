export const INFILL_WINX_GLSL=/*glsl*/`
vec3 infillWinxPaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family==29704.)return base;
 vec2 uv=frame.xy;vec3 glass=vec3(.33,.41,.45),silver=vec3(.73,.77,.78),pale=vec3(.78,.78,.74);
 float vertical=1.-step(.10,mod(uv.x,2.4));float floor=1.-step(.13,mod(uv.y,3.65));
 if(family==29701.)return mix(glass,silver,max(vertical*.85,floor*.55));
 if(family==29702.){float window=step(.7,mod(uv.y,3.7))*step(mod(uv.y,3.7),3.0)*step(.2,mod(uv.x,2.6))*step(mod(uv.x,2.6),2.3);return mix(pale,glass,window);}
 return mix(base,silver,max(vertical*.6,floor*.4));}
float fd7015Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillWinxPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillWinxPaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=1.5,h=3.6;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd7015Line(u-.09,w,.018),secondary=fd7015Line(u+w*.5,w,.023),transom=fd7015Line(y-h*.57,h,.024);
 float reveal=fd7015Line(u-.15,w,.045),sill=fd7015Line(y-h*.18,h,.036),sillLip=fd7015Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 return c;
}

`;
