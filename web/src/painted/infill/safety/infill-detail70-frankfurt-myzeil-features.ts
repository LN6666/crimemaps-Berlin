export const INFILL_MYZEIL_GLSL=/*glsl*/`
float fd70107Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
// Three families of metric lines make a dense triangular lattice in a separate
// surface chart. No render-triangle edges or per-triangle barycentrics are used.
vec3 myzeilSurfaceGrid056(vec3 base,vec4 frame){
 vec2 uv=frame.xy;float edge=2.65,period=edge*.8660254038;
 vec3 q=vec3(uv.y,.8660254038*uv.x+.5*uv.y,.8660254038*uv.x-.5*uv.y);
 vec3 fine=vec3(fd70107Line(q.x,period,.0325),fd70107Line(q.y,period,.0325),fd70107Line(q.z,period,.0325));
 vec3 lip=vec3(fd70107Line(q.x,period,.011),fd70107Line(q.y,period,.011),fd70107Line(q.z,period,.011));
 vec3 edgeSeal=vec3(fd70107Line(q.x,period,.068),fd70107Line(q.y,period,.068),fd70107Line(q.z,period,.068));
 float steel=1.-(1.-fine.x)*(1.-fine.y)*(1.-fine.z),shine=1.-(1.-lip.x)*(1.-lip.y)*(1.-lip.z),seal=1.-(1.-edgeSeal.x)*(1.-edgeSeal.y)*(1.-edgeSeal.z);
 vec2 cell=vec2(uv.x/edge-uv.y/(2.*period),uv.y/period);float tri=step(1.,fract(cell.x)+fract(cell.y));
 float far=smoothstep(period*.18,period*.60,max(length(dFdx(uv)),length(dFdy(uv))));
 vec3 glass=mix(base,vec3(.37,.46,.49),.24)*mix(.96,1.025,mix(tri,.5,far));
 glass=mix(glass,glass*.68,seal*.50);
 vec3 metal=mix(vec3(.38,.43,.44),vec3(.72,.76,.75),shine);
 return mix(glass,metal,steel*.97);
}
vec3 infillFrankfurtMyzeilPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(!(abs(family-29101.)<.25||abs(family-29102.)<.25))return base;
 if(abs(frame.w+2056.)<.25)return myzeilSurfaceGrid056(base,frame);
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y;
 // Existing opaque north/formal volumes and entrance canopy retain their RGB.
 if(abs(normal.y)>.40)return base;
 float glassMaterial=step(base.r*1.13,base.b)*step(base.r,.48);if(glassMaterial<.5)return base;
 float upright=fd70107Line(u,1.8,.045),floorBand=fd70107Line(y,2.5,.075),inner=fd70107Line(u+.9,1.8,.021),crossbar=fd70107Line(y-1.45,2.5,.023);
 float mainFrame=1.-(1.-upright)*(1.-floorBand),fine=max(inner,crossbar);vec3 col=mix(base,vec3(.59,.64,.63),mainFrame*.76);col=mix(col,vec3(.45,.51,.51),fine*.67);return col;
}
`;
