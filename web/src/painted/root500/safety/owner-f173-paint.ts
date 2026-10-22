export const F173_GLSL=`
float rt173line(float x,float period,float width){float a=max(fwidth(x),.004);float d=abs(mod(x+period*.5,period)-period*.5);return 1.-smoothstep(width-a,width+a,d);}
float rt173band(float x,float center,float width){float a=max(fwidth(x),.004);return 1.-smoothstep(width-a,width+a,abs(x-center));}
vec3 rheinturmWhole173(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6387.)>.25)return base;
 float role=frame.z-1000.,y=frame.y;vec2 radial=vec2(frame.x,frame.w);float radius=max(length(radial),.01),angle=atan(radial.x,-radial.y);float u=angle*radius;
 float fine=1.-smoothstep(.12,.6,length(fwidth(vec2(u,y))));
 float pore=fract(sin(dot(floor(vec2(u,y)*12.),vec2(17.71,43.57)))*15371.37);
 vec3 concrete=vec3(.64,.63,.59)*(1.+(pore-.5)*.055*fine);
 float pour=rt173line(y,2.5,.016);concrete=mix(concrete,concrete*.87,pour*.32*fine);
 if(role>10.){float rings=rt173line(radius,.8,.015);return mix(vec3(.48,.48,.44),vec3(.39,.40,.37),rings*.18*fine);}
 if(abs(role-6.)<.25){float whiteBand=step(225.5,y)*(1.-step(233.,y));vec3 c=mix(vec3(.72,.25,.13),vec3(.84,.85,.82),whiteBand);return mix(c,c*.81,rt173line(u,1.0,.018)*.2*fine);}
 if(abs(role-5.)<.25){float seam=rt173line(u,.64,.013);float fastener=rt173line(y,1.8,.025)*rt173line(u,1.25,.025);return mix(vec3(.49,.51,.46),vec3(.29,.32,.30),max(seam*.22,fastener*.6)*fine);}
 if(abs(role-4.)<.25){float windows=step(179.6,y)*(1.-step(185.95,y));vec3 c=mix(concrete,vec3(.075,.105,.105),windows*.85);float posts=rt173line(angle*8.,1.55,.075);c=mix(c,vec3(.56,.57,.53),posts*windows);float slabs=max(rt173band(y,186.65,.24),rt173band(y,193.95,.28));c=mix(c,vec3(.58,.59,.54),slabs);float dish=rt173band(y,182.8,.5)*rt173line(angle*8.,7.2,.48);return mix(c,vec3(.72,.73,.68),dish*.58);}
 if(abs(role-3.)<.25){float bay=angle*19.1;float mullion=rt173line(bay,1.38,.052);float rail=max(rt173band(y,166.25,.07),max(rt173band(y,170.,.08),max(rt173band(y,174.5,.08),rt173band(y,179.25,.13))));float shimmer=.5+.5*sin(angle*3.1+.6);vec3 glass=mix(vec3(.075,.16,.19),vec3(.27,.40,.43),shimmer);float pane=.5+.5*sin(floor(bay/1.38)*2.31);glass*=.91+.11*pane;glass=mix(glass,vec3(.65,.70,.69),max(mullion,rail));if(y<161.1)glass=mix(vec3(.045,.065,.067),glass,smoothstep(160.5,161.1,y));return glass;}
 if(abs(role-2.)<.25){float openings=rt173line(angle*10.,12.5,.42)*max(rt173band(y,156.,.46),rt173band(y,159.,.46));return mix(concrete,vec3(.075,.085,.078),openings);}
 // Decimal-clock aperture column is confined to the northeast side, never repeated as windows around the whole shaft.
 float tangent=dot(radial,vec2(.70710678,.70710678)),front=step(.96,dot(radial/radius,vec2(.70710678,-.70710678)));
 float localY=mod(y-3.75+1.25,2.5)-1.25;float circle=1.-smoothstep(.23-max(length(fwidth(vec2(tangent,localY))),.006),.27+max(length(fwidth(vec2(tangent,localY))),.006),length(vec2(tangent,localY)));
 float clock=front*circle*step(3.4,y)*(1.-step(156.6,y));concrete=mix(concrete,vec3(.085,.10,.095),clock);
 float redSafety=front*rt173band(tangent,0.,.32)*max(rt173band(y,80.,.32),rt173band(y,120.,.32));concrete=mix(concrete,vec3(.45,.14,.10),redSafety);
 // Entrance material is limited to the admitted lowest shaft carrier; no neighbouring pavilion is claimed.
 if(y<4.2){float entrance=step(.90,dot(radial/radius,vec2(1.,0.)))*(1.-rt173line(tangent,1.6,.08));concrete=mix(concrete,vec3(.12,.18,.18),entrance*step(.45,y)*(1.-step(3.4,y)));}
 return concrete;
}
`;
