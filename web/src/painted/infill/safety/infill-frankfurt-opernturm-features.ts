export const INFILL_OPERNTURM_GLSL=/*glsl*/`
vec3 infillOpernturmPaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family==29903.)return base;
 vec2 uv=frame.xy;vec3 stone=vec3(.90,.89,.80),glass=vec3(.23,.32,.37);
 float period=family==29901.?3.9:4.;
 float pane=step(.38,mod(uv.x,2.7))*step(mod(uv.x,2.7),2.28)*step(.65,mod(uv.y,period))*step(mod(uv.y,period),period-.35);
 if(family==29901.&&uv.y>163.)pane=step(.42,mod(uv.x,2.7))*step(mod(uv.x,2.7),2.24)*step(164.,uv.y)*step(uv.y,168.8);
 return mix(stone,glass,pane);}
float fd7012Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillOpernturmPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillOpernturmPaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=1.5,h=3.7;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd7012Line(u-.09,w,.018),secondary=fd7012Line(u+w*.5,w,.023),transom=fd7012Line(y-h*.57,h,.024);
 float reveal=fd7012Line(u-.15,w,.045),sill=fd7012Line(y-h*.18,h,.036),sillLip=fd7012Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 float masonry=(1.-pane)*step(.58,c.r)*step(abs(c.r-c.g),.16);float course=fd7012Line(y,.65,.007),joint=fd7012Line(u+floor(y/.65)*.7,1.4,.007);c=mix(c,c*.89,max(course,joint)*masonry*.27);
 return c;
}

`;
