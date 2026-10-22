export const OWNER_F153_PAINT_GLSL=`
float mm153Line(float x,float cell,float w){float d=abs(mod(x+cell*.5,cell)-cell*.5);return 1.0-smoothstep(w*.5,w*.5+max(fwidth(x),.008),d);}
float mm153Box(vec2 q,vec2 b){float d=max(abs(q.x)-b.x,abs(q.y)-b.y);return 1.0-smoothstep(0.0,max(max(fwidth(q.x),fwidth(q.y)),.008),d);}
float mm153Arch(vec2 q,float width,float shoulder,float crown){float hw=width*.5;float top=shoulder+crown*sqrt(max(0.0,1.0-q.x*q.x/(hw*hw)));return(1.0-smoothstep(hw-.015,hw+.015,abs(q.x)))*smoothstep(0.0,.01,q.y)*(1.0-smoothstep(top-.01,top+.01,q.y));}
vec3 mmkSouthwestDetail(vec3 base,vec3 p,vec3 n,vec4 frame,float family){
 if(family!=4722.0&&family!=4723.0)return base;float u=frame.x;float y=frame.y/max(frame.z,.1);vec3 pale=vec3(.85,.84,.78);vec3 terra=vec3(.58,.37,.29);vec3 dark=vec3(.17,.21,.20);vec3 c=pale;
 if(family==4723.0){
  c=terra;float upper=smoothstep(.355,.375,y)*(1.0-smoothstep(.955,.965,y));vec3 glass=vec3(.37,.46,.44);float fine=max(mm153Line(u,.72,.025),mm153Line(y,.115,.003));glass=mix(glass,vec3(.63,.68,.62),fine*.55);float fin=mm153Line(u,2.65,.16);glass=mix(glass,vec3(.88,.88,.80),fin);float floorband=max(mm153Box(vec2(0,y-.57),vec2(100,.012)),mm153Box(vec2(0,y-.77),vec2(100,.012)));glass=mix(glass,vec3(.70,.73,.66),floorband);c=mix(c,glass,upper);
  float door=mm153Arch(vec2(u-frame.w*.82,y-.025),5.2,.12,.095);c=mix(c,vec3(.75,.75,.68),door);float hole=mm153Arch(vec2(u-frame.w*.82,y-.025),4.4,.105,.08);c=mix(c,dark,hole);c=mix(c,vec3(.35,.29,.24),mm153Box(vec2(0,y-.976),vec2(100,.024)));return c;
 }
 if(u>900.0){u-=1000.0;c=mix(terra,pale,smoothstep(.315,.33,y));float slot=mm153Box(vec2(u-1.2,y-.79),vec2(.34,.115));float rim=mm153Box(vec2(u-1.2,y-.79),vec2(.46,.125));c=mix(c,vec3(.73,.75,.65),rim);c=mix(c,dark,slot);c=mix(c,vec3(.29,.32,.28),slot*mm153Line(y,.11,.004));c=mix(c,vec3(.69,.68,.61),mm153Line(y,.225,.003)*smoothstep(.34,.36,y));c=mix(c,vec3(.35,.29,.24),mm153Box(vec2(0,y-.977),vec2(100,.023)));return c;}
 c=mix(terra,pale,smoothstep(.385,.405,y));float joint=mm153Line(y,.225,.003);c=mix(c,vec3(.69,.68,.62),joint*smoothstep(.405,.42,y));
 float transom=mm153Box(vec2(0,y-.355),vec2(100,.045));float narrow=mm153Box(vec2(mod(u+.8,1.6)-.8,0),vec2(.25,100));c=mix(c,dark,transom*narrow);c=mix(c,vec3(.66,.47,.35),transom*mm153Line(u,1.6,.045));
 // Only nearcorner nativejaggedportico interval hasreferencearcade support; farstreetbase staysmaterial-only.
 float near=1.0-smoothstep(34.0,35.0,u);float arch=mm153Arch(vec2(mod(u+1.6,3.2)-1.6,y-.015),2.45,.14,.085);vec3 door=mix(dark,vec3(.40,.44,.38),max(mm153Line(u,.55,.035),mm153Line(y,.055,.004))*.4);c=mix(c,door,arch*near);c=mix(c,vec3(.72,.57,.45),mm153Line(u,3.2,.23)*near*(1.0-smoothstep(.22,.24,y)));c=mix(c,vec3(.35,.29,.24),mm153Box(vec2(0,y-.977),vec2(100,.023)));return c;
}

// One family, per-face semantic kind:0roof,1wedge,2curvedglass,3rear/returns.
vec3 mmkRecovery149(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float kind=frame.w,y=frame.y/22.;
 if(kind<.5){vec3 roof=vec3(.42,.43,.39);vec2 q=vec2(frame.x,frame.y);float g1=mm153Box(q-vec2(-23.,3.),vec2(13.,17.));float g2=mm153Box(q-vec2(7.,5.),vec2(12.,13.));vec3 glass=mix(vec3(.65,.73,.69),vec3(.36,.43,.41),max(mm153Line(q.x,2.,.045),mm153Line(q.y,3.,.04))*.55);return mix(roof,glass,max(g1,g2));}
 if(kind<2.5){float originalFamily=kind<1.5?4722.:4723.;return mmkSouthwestDetail(base,p,normal,vec4(frame.xyz,kind<1.5?96.0953:30.8372),originalFamily);}
 // Official architect northeast photographs: broad plain rear, red lower plinth, isolated service openings.
 vec3 c=mix(vec3(.58,.37,.29),vec3(.85,.84,.78),smoothstep(.32,.34,y));
 c=mix(c,vec3(.69,.68,.62),mm153Line(y,.225,.003)*step(.34,y));
 if(kind<3.5){float narrow=mm153Box(vec2(frame.x-42.,y-.58),vec2(.75,.28));c=mix(c,vec3(.42,.52,.48),narrow);c=mix(c,vec3(.75,.76,.68),narrow*mm153Line(y,.075,.003));for(int i=0;i<4;i++){float opening=mm153Box(vec2(frame.x-(49.+float(i)*6.),y-.095),vec2(.7,.035));c=mix(c,vec3(.25,.32,.29),opening);}float circle=1.-smoothstep(.98,1.02,length(vec2((frame.x-65.)/2.8,(y-.975)/.12)));c=mix(c,vec3(.27,.32,.29),circle*step(.84,y));}
 c=mix(c,vec3(.35,.29,.24),mm153Box(vec2(0.,y-.977),vec2(100.,.023)));return c;
}

`;
