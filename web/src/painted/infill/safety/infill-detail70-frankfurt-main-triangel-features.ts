export const INFILL_MAIN_TRIANGEL_GLSL=/*glsl*/`
float fd70106Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtMainTriangelPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(!(abs(family-28201.)<.25||abs(family-28202.)<.25||abs(family-28203.)<.25))return base;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y;
 if(abs(normal.y)>.40){float joint=max(fd70106Line(p.x*.86+p.z*.51,1.8,.018),fd70106Line(p.x*.51-p.z*.86,2.4,.018));return mix(base,base*.84,joint*.46);}
 float w=1.6,h=3.5;
 float upright=fd70106Line(u,w,.045),floorBand=fd70106Line(y,h,.075),inner=fd70106Line(u+w*.5,w,.021),crossbar=fd70106Line(y-h*.58,h,.023);
 float glassMaterial=step(base.r*1.13,base.b)*step(base.r,.48);
 float mainFrame=1.-(1.-upright)*(1.-floorBand),fine=max(inner,crossbar);vec3 col=mix(base,vec3(.59,.64,.63),mainFrame*glassMaterial*.76);
 col=mix(col,vec3(.45,.51,.51),fine*glassMaterial*.67);float seal=fd70106Line(u-.085,w,.014);col=mix(col,col*.73,seal*glassMaterial*.42);
 float panel=max(fd70106Line(u,1.5,.010),fd70106Line(y,h,.012));return mix(col,col*.90,panel*(1.-glassMaterial)*.35);
}

`;
