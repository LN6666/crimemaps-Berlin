export const INFILL_FRANKFURT_PAINT_GLSL=/*glsl*/`
float fd70113Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtMesseturmPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(!(abs(family-26600.)<.25))return base;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y;
 if(abs(normal.y)>.40){float joint=max(fd70113Line(p.x*.86+p.z*.51,1.8,.018),fd70113Line(p.x*.51-p.z*.86,2.4,.018));return mix(base,base*.84,joint*.46);}
 float w=2.2,h=3.8;
 float upright=fd70113Line(u,w,.045),floorBand=fd70113Line(y,h,.075),inner=fd70113Line(u+w*.5,w,.021),crossbar=fd70113Line(y-h*.58,h,.023);
 float glassMaterial=step(base.r*1.13,base.b)*step(base.r,.48);
 float x=abs(fract((u-w*.5)/w+.5)-.5)*w,z=fract((y-.7)/h)*h,aa=max(fwidth(u),.018);
 float opening=(1.-smoothstep(w*.27-aa,w*.27+aa,x))*smoothstep(.55,.65,z)*(1.-smoothstep(h-.42,h-.32,z))*(step(2.4,y));
 vec3 col=mix(base,vec3(.20,.28,.30),opening);col=mix(col,vec3(.56,.58,.54),max(inner,crossbar)*opening*.76);
 float reveal=fd70113Line(u-w*.28,w,.045)*opening;col=mix(col,col*.70,reveal*.45);
 float course=fd70113Line(y,.42,.008),joint=fd70113Line(u+floor(y/.42)*.62,1.24,.008);col=mix(col,col*.90,max(course,joint)*(1.-opening)*.32);
 return col;
}

`;
