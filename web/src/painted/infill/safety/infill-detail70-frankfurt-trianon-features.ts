export const infillFrankfurtTrianonOwnerPaintGLSL=/*glsl*/`
float fd70101Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtTrianonPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(!(abs(family-28800.)<.25||abs(family-28801.)<.25||abs(family-28802.)<.25))return base;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y;
 if(abs(normal.y)>.40){float joint=max(fd70101Line(p.x*.86+p.z*.51,1.8,.018),fd70101Line(p.x*.51-p.z*.86,2.4,.018));return mix(base,base*.84,joint*.46);}
 float w=1.5,h=3.8;
 float upright=fd70101Line(u,w,.045),floorBand=fd70101Line(y,h,.075),inner=fd70101Line(u+w*.5,w,.021),crossbar=fd70101Line(y-h*.58,h,.023);
 float glassMaterial=step(base.r*1.13,base.b)*step(base.r,.48);
 if(abs(family-28801.)<.25)return mix(base,base*.91,max(fd70101Line(y,1.9,.012),fd70101Line(u,1.5,.012))*.26);
 if(abs(family-28802.)<.25)return mix(base,base*.86,fd70101Line(u,1.5,.018)*.4);
 glassMaterial=1.;
 float mainFrame=1.-(1.-upright)*(1.-floorBand),fine=max(inner,crossbar);vec3 col=mix(base,vec3(.59,.64,.63),mainFrame*glassMaterial*.76);
 col=mix(col,vec3(.45,.51,.51),fine*glassMaterial*.67);float seal=fd70101Line(u-.085,w,.014);col=mix(col,col*.73,seal*glassMaterial*.42);
 float panel=max(fd70101Line(u,1.5,.010),fd70101Line(y,h,.012));return mix(col,col*.90,panel*(1.-glassMaterial)*.35);
}

`;
