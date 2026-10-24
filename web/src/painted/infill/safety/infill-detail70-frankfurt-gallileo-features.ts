export const INFILL_GALLILEO_GLSL=/*glsl*/`
vec3 infillGallileoPaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family==30203.)return base;
 vec2 uv=frame.xy;vec3 glass=vec3(.27,.46,.53),metal=vec3(.32,.35,.35);
 float vertical=1.-step(.065,mod(uv.x,2.2)),horizontal=1.-step(.08,mod(uv.y,3.55));
 if(family==30201.)return mix(glass,metal,max(vertical,horizontal)*.9);
 float window=step(.35,mod(uv.x,2.8))*step(mod(uv.x,2.8),2.25)*step(.7,mod(uv.y,3.5))*step(mod(uv.y,3.5),2.9);return mix(base,vec3(.20,.29,.33),window);}
float fd7013Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillGallileoPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillGallileoPaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=1.5,h=3.7;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd7013Line(u-.09,w,.018),secondary=fd7013Line(u+w*.5,w,.023),transom=fd7013Line(y-h*.57,h,.024);
 float reveal=fd7013Line(u-.15,w,.045),sill=fd7013Line(y-h*.18,h,.036),sillLip=fd7013Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 return c;
}

`;
