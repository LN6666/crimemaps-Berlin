export const OWNER_F185_PAINT_GLSL = `
float mb185Line(float v,float pitch,float width){return 1.-smoothstep(width,width+max(fwidth(v),.015),abs(mod(v+pitch*.5,pitch)-pitch*.5));}
float mb185Edge(float v,float width){return 1.-smoothstep(width,width+max(fwidth(v),.016),abs(v));}
float mb185Box(vec2 p,vec2 h){vec2 a=max(fwidth(p),vec2(.018)),d=1.-smoothstep(h-a*.25,h+a*.75,abs(p));return d.x*d.y;}
vec3 mb185Metal(float s,float y){float seam=mb185Line(s,1.45,.012),course=mb185Line(y,2.4,.010);vec3 c=vec3(.75,.78,.78)+.035*cos(s*.034);return mix(c,vec3(.48,.53,.54),max(seam,course)*.30);}
vec3 mercedesMuseumRecovery181(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float s=frame.x,y=frame.y,z=frame.z,k=frame.w;
if(abs(k-1.)<.4){
// Three large native lobes share continuous perimeter coordinates. Broad cladding/glass ribbons and diagonal white structure are photo-estimates, not nine invented storey windows.
float t=fract(s/max(z,.1)),lobe=fract(t*3.+.16),ramp=lobe<.67?mix(-2.2,2.2,lobe/.67):mix(2.2,-2.2,(lobe-.67)/.33),yy=y-ramp;
vec3 metal=mb185Metal(s,y),c=metal;float glazing=0.;for(int j=0;j<3;j++){float floorY=6.0+float(j)*12.7,lower=floorY,upper=floorY+6.7;float slot=smoothstep(lower-.08,lower+.08,yy)*(1.-smoothstep(upper-.08,upper+.08,yy));glazing=max(glazing,slot);}
// Glazed ground foyer below first silver ribbon; no ordinary upper-window grid on solid metal.
glazing=max(glazing,(1.-smoothstep(5.0,5.12,y))*smoothstep(.2,.3,y));glazing*=1.-smoothstep(42.1,42.5,y);
float reflection=.5+.5*cos(s*.052+yy*.13);vec3 glass=mix(vec3(.10,.17,.19),vec3(.30,.40,.43),reflection*.75);float diagonal=min(mb185Edge(mod(s+yy*.44+2.35,4.7)-2.35,.095),1.),opposite=mb185Edge(mod(s-yy*.44+2.35,4.7)-2.35,.065);float ribs=max(diagonal,opposite*.80),mullion=mb185Line(s+yy*.12,1.57,.026),horizontal=mb185Line(yy,3.15,.025);glass=mix(glass,vec3(.70,.75,.74),max(ribs,max(mullion,horizontal)*.72));float ribShade=mb185Edge(mod(s+yy*.44+2.35,4.7)-2.52,.12);glass=mix(glass,vec3(.06,.11,.13),ribShade*.35*(1.-ribs));c=mix(c,glass,glazing);
for(int j=0;j<3;j++){float low=6.+float(j)*12.7;c=mix(c,vec3(.29,.34,.35),max(mb185Edge(yy-low,.08),mb185Edge(yy-low-6.7,.08))*.55);}
// Northwest visitor foyer: four floor-reaching door leaves in its ground glass only.
float entrance=mb185Box(vec2(s-124.6342,y-1.55),vec2(3.2,1.55));c=mix(c,vec3(.12,.19,.20),entrance);c=mix(c,vec3(.60,.66,.65),entrance*max(mb185Line(s-124.6342,1.6,.045),mb185Edge(y-2.9,.05)));
return c;}
if(abs(k-2.)<.4){vec3 c=vec3(.67,.69,.66);float joints=max(mb185Line(s,2.8,.015),mb185Line(y,2.8,.015));return mix(c,vec3(.45,.48,.48),joints*.35);}
if(abs(k-3.)<.4){float grid=max(mb185Line(s,1.4,.035),mb185Line(y,1.4,.035));return mix(vec3(.29,.39,.41),vec3(.68,.73,.72),grid);}
if(abs(k-4.)<.4){float pavers=max(mb185Line(s,.7,.012),mb185Line(y,.7,.012));return mix(vec3(.62,.64,.60),vec3(.45,.49,.47),pavers*.35);}
if(abs(k-5.)<.4){float joint=max(mb185Line(s,2.4,.012),mb185Line(y,1.2,.012));return mix(vec3(.68,.67,.61),vec3(.48,.48,.44),joint*.28);}
if(abs(k-11.)<.4){vec3 concrete=vec3(.68,.67,.61);float foyer=step(.15,y)*step(y,2.15);vec3 pane=vec3(.14,.23,.23);pane=mix(pane,vec3(.52,.57,.54),max(mb185Line(s,1.4,.035),mb185Edge(y-2.1,.04)));return mix(concrete,pane,foyer);}
if(abs(k-6.)<.4){float joint=max(mb185Line(s,1.2,.012),mb185Line(y,1.2,.012));return mix(vec3(.66,.67,.62),vec3(.49,.51,.47),joint*.33);}
if(abs(k-7.)<.4){float grain=sin(floor(s/.32)*7.+floor(y/.32)*13.)*.035;return vec3(.40,.47,.31)+grain;}
if(abs(k-8.)<.4){float grille=max(mb185Line(s,.22,.025),mb185Line(y,.22,.025));return mix(vec3(.18,.24,.25),vec3(.46,.50,.49),grille*.65);}
if(abs(k-9.)<.4){float tread=mb185Line(s*.857+y*.515,.30,.025);return mix(vec3(.70,.69,.62),vec3(.43,.45,.41),tread*.7);}
return mb185Metal(s,y);}
`;
