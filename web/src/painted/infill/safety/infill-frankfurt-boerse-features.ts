export const INFILL_BOERSE_GLSL=/*glsl*/`
float fd70Step10(float edge,float x){float a=max(fwidth(x-edge),.004);return smoothstep(edge-a,edge+a,x);}

float boerseEdge(float d,float width){float aa=max(fwidth(d),.025);return 1.-smoothstep(width-aa,width+aa,abs(d));}
vec3 infillBoersePaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 stone=vec3(.87,.81,.65),glass=vec3(.19,.28,.31),trim=vec3(.77,.72,.59);vec2 uv=frame.xy;
 if(family==28504.)return base;
 if(family==28503.){vec2 g=vec2(p.x*.8+p.z*.6,p.y*1.5+p.z*.7);float grid=max(boerseEdge(mod(g.x,2.8)-1.4,.038),boerseEdge(mod(g.y,2.)-1.,.038));return mix(base,vec3(.63,.66,.61),grid*.9);}
 if(family==28502.){float seam=max(boerseEdge(mod(p.x,4.)-2.,.025),boerseEdge(mod(p.z,4.)-2.,.025));return mix(base,vec3(.36,.37,.34),seam*.35);}
 if(family!=28501.)return base;
 float y=uv.y;float x=mod(uv.x+1.6,3.2)-1.6;float localY=mod(y-.35,4.65);float centre=2.15;
 // Upper arched openings across each complete wing; groundarcades use the same simple vocabulary.
 float archY=localY-centre;float rectIn=fd70Step10(abs(x),.86)*fd70Step10(localY,.35+2.15)*fd70Step10(.55,localY);
 float archIn=fd70Step10(x*x+archY*archY,.86*.86)*fd70Step10(centre,localY);
 float opening=max(rectIn,archIn);float surround=fd70Step10(abs(x),1.02)*fd70Step10(.4,localY)*fd70Step10(localY,3.2);
 vec3 outColor=mix(base,trim,surround*.28);outColor=mix(outColor,glass,opening);
 float mullion=max(boerseEdge(x,.045),boerseEdge(localY-1.65,.045));outColor=mix(outColor,trim,opening*mullion*.85);
 float sill=boerseEdge(localY-.48,.095);float floorBand=boerseEdge(mod(y,4.65)-.18,.08);
 return mix(outColor,trim,max(sill*.65,floorBand*.5));
}
float fd7010Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillBoersePaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillBoersePaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=frame.x,y=frame.y,w=3.2,h=4.65;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd7010Line(u-.09,w,.018),secondary=fd7010Line(u+w*.5,w,.023),transom=fd7010Line(y-h*.57,h,.024);
 float reveal=fd7010Line(u-.15,w,.045),sill=fd7010Line(y-h*.18,h,.036),sillLip=fd7010Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 float masonry=(1.-pane)*step(.58,c.r)*step(abs(c.r-c.g),.16);float course=fd7010Line(y,.65,.007),joint=fd7010Line(u+floor(y/.65)*.7,1.4,.007);c=mix(c,c*.89,max(course,joint)*masonry*.27);
 return c;
}

`;
