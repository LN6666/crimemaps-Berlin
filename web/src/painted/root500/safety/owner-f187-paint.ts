export const OWNER_F187_PAINT_GLSL = `
float hp187Line(float x,float pitch,float width){return 1.-smoothstep(width,width+max(fwidth(x),.012),abs(mod(x+pitch*.5,pitch)-pitch*.5));}
float hp187Edge(float x,float width){return 1.-smoothstep(width,width+max(fwidth(x),.015),abs(x));}
float hp187Box(vec2 p,vec2 h){vec2 d=abs(p)-h;return 1.-smoothstep(-.015,max(.02,max(fwidth(p.x),fwidth(p.y))),max(d.x,d.y));}
float hp187Arch(vec2 p,float w,float bottom,float top){float r=w*.5,h=top-r+sqrt(max(0.,r*r-p.x*p.x));return step(bottom,p.y)*step(p.y,h)*(1.-smoothstep(r-.02,r+.02,abs(p.x)));}
vec3 hp187Window(vec3 c,vec2 q,float center,float width,float height,bool arch){q.y-=center;float rim=arch?hp187Arch(q,width+.25,-height*.5-.12,height*.5+.16):hp187Box(q,vec2(width*.5+.13,height*.5+.14)),glass=arch?hp187Arch(q,width,-height*.5,height*.5):hp187Box(q,vec2(width*.5,height*.5));c=mix(c,vec3(.87,.84,.72),rim);c=mix(c,vec3(.16,.23,.23),glass);float mullion=max(hp187Edge(q.x,.025),hp187Line(q.y,.70,.022));c=mix(c,vec3(.87,.87,.79),glass*mullion);float shutters=hp187Box(vec2(abs(q.x)-width*.5-.37,q.y),vec2(.24,height*.5-.05));float slat=hp187Line(q.y,.13,.016);c=mix(c,mix(vec3(.46,.49,.43),vec3(.62,.63,.54),slat*.5),shutters*(1.-rim));return c;}
vec3 hohenheimRecovery183(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float x=frame.x,y=frame.y,z=frame.z,k=frame.w;vec3 plaster=vec3(.80,.68,.43),stone=vec3(.85,.81,.67),shadow=vec3(.56,.49,.35);vec3 c=plaster;
if(k<.5){float tiles=max(hp187Line(x,.32,.010),hp187Line(y,.20,.009));return mix(vec3(.52,.28,.19),vec3(.34,.19,.14),tiles*.4);}
if(abs(k-3.)<.4){float seam=max(hp187Line(x,.30,.009),hp187Line(y,.22,.009));return mix(vec3(.35,.38,.38),vec3(.22,.26,.27),seam*.40);}
if(abs(k-5.)<.4){float joint=max(hp187Line(x,.65,.012),hp187Line(y,.65,.012));return mix(vec3(.70,.67,.57),vec3(.51,.51,.44),joint*.35);}
if(abs(k-6.)<.4)return stone;
if(abs(k-14.)<.4)return stone*.9;
if(abs(k-8.)<.4){float rim=hp187Box(vec2(x,y-.56),vec2(.42,.56)),pane=hp187Box(vec2(x,y-.56),vec2(.30,.43));vec3 d=mix(vec3(.44,.46,.42),stone,rim);d=mix(d,vec3(.13,.21,.22),pane);return mix(d,vec3(.84,.86,.79),pane*max(hp187Edge(x,.025),hp187Edge(y-.56,.025)));}
if(abs(k-7.)<.4){for(int j=0;j<3;j++){float dx=x-(65.15+(float(j)+1.)*16.52/4.);float rim=hp187Arch(vec2(dx,y),2.25,.1,4.55),door=hp187Arch(vec2(dx,y),1.90,.1,4.35);c=mix(c,stone,rim);c=mix(c,vec3(.12,.18,.17),door);c=mix(c,vec3(.54,.56,.47),door*max(hp187Edge(dx,.033),hp187Line(y,.78,.024)));}return c;}
if(abs(k-10.)<.4){float dx=x-73.41;c=mix(c,stone,max(hp187Edge(y-5.5,.14),max(hp187Edge(y-10.7,.11),hp187Edge(y-15.25,.14))));if(y>10.9){float cell=16.52/5.,xx=mod(dx+cell*.5,cell)-cell*.5;c=hp187Window(c,vec2(xx,y),13.1,.80,2.35,false);c=mix(c,shadow,hp187Edge(abs(dx)-7.9,.08));}else if(y>5.65){for(int j=-1;j<=1;j++)c=hp187Window(c,vec2(dx-float(j)*4.13,y),8.1,1.40,3.1,true);}else{float xx=mod(dx+2.065,4.13)-2.065;c=hp187Window(c,vec2(xx,y),2.65,1.35,2.9,false);}return c;}
if(abs(k-11.)<.4){float xx;if(x<65.15)xx=mod(x-32.2,32.95/7.)-32.95/14.;else xx=mod(x-81.67,32.83/7.)-32.83/14.;c=hp187Window(c,vec2(xx,y),2.65,1.40,2.90,false);c=hp187Window(c,vec2(xx,y),7.65,1.45,3.15,true);c=mix(c,stone,max(hp187Edge(y-5.02,.12),hp187Edge(y-10.55,.15)));float pilaster=hp187Edge(mod(x-32.2,32.95)-.30,.13);return mix(c,stone,pilaster*.5);}
if(abs(k-12.)<.4){float xx=mod(x+2.12,4.24)-2.12;c=hp187Window(c,vec2(xx,y),2.35,1.25,2.6,false);c=hp187Window(c,vec2(xx,y),6.95,1.28,2.85,true);return mix(c,stone,max(hp187Edge(y-4.8,.13),hp187Edge(y-9.75,.16)));}
if(abs(k-13.)<.4){float xx=mod(x+1.8,3.6)-1.8;c=hp187Window(c,vec2(xx,y),1.80,.95,1.85,false);c=hp187Window(c,vec2(xx,y),5.10,.95,1.85,false);float pilaster=hp187Edge(mod(x+14.4,28.8)-14.4,.18);c=mix(c,stone,pilaster*.65);return mix(c,stone,max(hp187Edge(y-3.45,.10),hp187Edge(y-7.3,.13)));}
return c;}
`;
