export const INFILL_BOERSENPLATZ_BLOCK_GLSL=/*glsl*/`
float fd70Step11(float edge,float x){float a=max(fwidth(x-edge),.004);return smoothstep(edge-a,edge+a,x);}

float f7Edge(float x,float w){float a=max(fwidth(x),.02);return 1.-smoothstep(w-a,w+a,abs(x));}
vec3 infillBoersenplatzBlockPaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family==29402.){float seam=max(f7Edge(mod(p.x,2.8)-1.4,.028),f7Edge(mod(p.z,3.5)-1.75,.028));return mix(base,vec3(.31,.34,.34),seam*.45);}
 if(family!=29401.&&family!=29403.)return base;
 float bay=max(frame.z,2.),story=max(frame.w,3.);float x=mod(frame.x+bay*.5,bay)-bay*.5,y=mod(frame.y-.3,story);
 vec3 glass=vec3(.20,.28,.31),trim=mix(base,vec3(.72,.72,.65),.48);float win;
 if(family==29401.){float centre=2.25,r=.85;float rect=fd70Step11(abs(x),r)*fd70Step11(.6,y)*fd70Step11(y,centre);float arch=fd70Step11(x*x+(y-centre)*(y-centre),r*r)*fd70Step11(centre,y);win=max(rect,arch);}
 else{win=fd70Step11(abs(x),bay*.36)*fd70Step11(.65,y)*fd70Step11(y,story-.4);}
 vec3 outColor=mix(base,glass,win);float surround=fd70Step11(abs(x),bay*.4)*fd70Step11(.49,y)*fd70Step11(y,story-.22)-win;
 outColor=mix(outColor,trim,surround*.55);float mullion=max(f7Edge(x,.035),f7Edge(y-1.8,.04));outColor=mix(outColor,trim,win*mullion*.75);
 float sill=f7Edge(y-.55,.09),band=f7Edge(mod(frame.y,story)-.18,.085);return mix(outColor,trim,max(sill*.7,band*.55));
}
float fd7011Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillBoersenplatzBlockPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillBoersenplatzBlockPaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=frame.x,y=frame.y,w=max(frame.z,2.),h=max(frame.w,3.);
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd7011Line(u-.09,w,.018),secondary=fd7011Line(u+w*.5,w,.023),transom=fd7011Line(y-h*.57,h,.024);
 float reveal=fd7011Line(u-.15,w,.045),sill=fd7011Line(y-h*.18,h,.036),sillLip=fd7011Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 float masonry=(1.-pane)*step(.58,c.r)*step(abs(c.r-c.g),.16);float course=fd7011Line(y,.65,.007),joint=fd7011Line(u+floor(y/.65)*.7,1.4,.007);c=mix(c,c*.89,max(course,joint)*masonry*.27);
 return c;
}

`;
