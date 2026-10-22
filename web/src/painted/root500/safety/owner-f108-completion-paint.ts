export const F108_COMPLETION_GLSL=String.raw`float df108boxFrozen6431(vec2 p,vec2 at,vec2 sz){vec2 a=1.-smoothstep(sz,sz+vec2(.035),abs(p-at));return a.x*a.y;}
float df108ellFrozen6431(vec2 p,vec2 at,vec2 rad){return 1.-smoothstep(.96,1.04,length((p-at)/rad));}
float df108lineFrozen6431(float x,float a,float w){return 1.-smoothstep(w,w+.035,abs(x-a));}
float df108archFrozen6431(vec2 p,float x,float bottom,float spring,float halfw,float rise){return max(df108boxFrozen6431(p,vec2(x,(bottom+spring)*.5),vec2(halfw,(spring-bottom)*.5)),df108ellFrozen6431(p,vec2(x,spring),vec2(halfw,rise))*step(spring,p.y));}
vec3 dreifaltigkeitskircheFrontFull500Frozen6431(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-4905.)>.25)return base;
 vec2 q=vec2(frame.x,p.y);vec3 plaster=vec3(.81,.79,.72),bright=vec3(.88,.86,.80),shadow=vec3(.55,.54,.48),stone=vec3(.45,.39,.32),dark=vec3(.16,.18,.17),gold=vec3(.69,.53,.19),c=plaster;
 // Four photographed originalfrontfacets share one metrephase; no side/rear/roof or neighboringhouse is admitted.
 c=mix(c,vec3(.70,.68,.62),1.-smoothstep(.72,.84,q.y));c=mix(c,bright,df108lineFrozen6431(q.y,.84,.10));
 // Shallow rectangularplaster fields and six Ioniccolumn positions from the datedfrontphoto. Nativeflatwall has no addedprojections.
 for(int i=0;i<6;i++){float x=i==0?-7.35:(i==1?-5.10:(i==2?-2.42:(i==3?2.42:(i==4?5.10:7.35))));float shaft=df108boxFrozen6431(q,vec2(x,3.82),vec2(.31,2.90));c=mix(c,shadow,shaft);c=mix(c,bright,df108boxFrozen6431(q,vec2(x-.09,3.82),vec2(.22,2.90)));c=mix(c,vec3(.63,.62,.56),shaft*df108lineFrozen6431(q.x,x+.23,.045));c=mix(c,bright,df108boxFrozen6431(q,vec2(x,.91),vec2(.48,.14)));c=mix(c,shadow,df108boxFrozen6431(q,vec2(x,.73),vec2(.48,.055)));
  // Ioniccapital two spiralvolutes/abacus and egg-and-dart marks are boundedopaque colorgraphics.
  c=mix(c,bright,df108boxFrozen6431(q,vec2(x,6.78),vec2(.48,.12)));for(int j=0;j<2;j++){float sx=j==0?-1.:1.;vec2 v=q-vec2(x+sx*.31,6.60);float rr=length(v/vec2(.20,.19));float ring=1.-smoothstep(.075,.14,abs(rr-.72));c=mix(c,shadow,ring);c=mix(c,bright,df108ellFrozen6431(q,vec2(x+sx*.31,6.60),vec2(.09,.08)));}for(int j=0;j<4;j++){float xx=x+(float(j)-1.5)*.15;c=mix(c,shadow,df108ellFrozen6431(q,vec2(xx,6.55),vec2(.065,.10)));}c=mix(c,bright,df108boxFrozen6431(q,vec2(x,7.02),vec2(.56,.10)));}
 // Centraldarkstone doorframe and turquoise doublewooddoors with gold crossingdiagonals and studs.
 c=mix(c,stone,df108boxFrozen6431(q,vec2(0.,2.27),vec2(1.42,2.16)));c=mix(c,vec3(.28,.21,.16),df108boxFrozen6431(q,vec2(0.,2.26),vec2(1.21,2.06)));float door=df108boxFrozen6431(q,vec2(0.,2.22),vec2(.98,1.98));c=mix(c,vec3(.22,.33,.29),door);float diag=max(df108lineFrozen6431(mod(q.x+q.y*.54+.22,.72),.36,.022),df108lineFrozen6431(mod(q.x-q.y*.54+.22,.72),.36,.022));c=mix(c,gold,door*diag);c=mix(c,vec3(.31,.25,.17),door*df108lineFrozen6431(q.x,0.,.040));float nodes=df108lineFrozen6431(mod(q.x+.18,.36),.18,.035)*df108lineFrozen6431(mod(q.y,.34),.17,.035);c=mix(c,vec3(.80,.66,.29),door*nodes*.65);
 // Darkframe pilasters with scrollcapitals and broken curveddoorpediment, rather than an invented opening.
 for(int i=0;i<2;i++){float x=i==0?-1.29:1.29;c=mix(c,vec3(.61,.52,.40),df108boxFrozen6431(q,vec2(x,2.32),vec2(.115,2.18)));c=mix(c,shadow,df108ellFrozen6431(q,vec2(x,4.47),vec2(.17,.12)));}float ped=4.69+.46*(1.-pow(abs(q.x)/1.8,2.));float rim=df108lineFrozen6431(q.y,ped,.11)*step(abs(q.x),1.80);c=mix(c,stone,rim);c=mix(c,vec3(.69,.63,.52),df108lineFrozen6431(q.y,ped+.14,.055)*step(abs(q.x),1.80));c=mix(c,shadow,df108boxFrozen6431(q,vec2(0.,4.55),vec2(1.48,.10)));
 // Ovoidgilt devotionalcartouche aboveportal: contour and compactfoilmarks, no unverified literal inscription.
 float oval=df108ellFrozen6431(q,vec2(0.,5.63),vec2(1.47,.63));c=mix(c,vec3(.36,.35,.28),oval);float inside=df108ellFrozen6431(q,vec2(0.,5.63),vec2(1.26,.47));c=mix(c,vec3(.64,.60,.46),inside);float outer=max(0.,oval-inside);c=mix(c,gold,outer);for(int i=0;i<18;i++){float a=float(i)*6.2831853/18.;vec2 at=vec2(cos(a)*1.43,5.63+sin(a)*.59);c=mix(c,vec3(.78,.64,.28),df108ellFrozen6431(q,at,vec2(.11,.095)));}for(int i=0;i<3;i++){float y=5.45+float(i)*.17;c=mix(c,vec3(.36,.34,.26),df108lineFrozen6431(q.y,y,.024)*df108boxFrozen6431(q,vec2(0.,5.63),vec2(.88,.35))*.70);}
 // Only the nativeupperstrip receives the beginning of the centralarched leadwindow; the high statue/gable remains missingcarrier.
 float central=df108archFrozen6431(q,0.,6.25,7.15,.83,.56);c=mix(c,shadow,df108archFrozen6431(q,0.,6.14,7.15,1.05,.75));c=mix(c,dark,central);float lead=max(df108lineFrozen6431(mod(q.x,.27),.135,.015),df108lineFrozen6431(mod(q.y,.29),.145,.015));c=mix(c,vec3(.45,.47,.42),lead*central);
 // Sidebays: lower oval ironlatticewindows, upperarched leadglazing, narrow stoneframes. Lowerwing exposedfaces follow sourcefolds unchanged.
 for(int i=0;i<2;i++){float x=i==0?-6.16:6.16;float o=df108ellFrozen6431(q,vec2(x,2.86),vec2(.70,.90));float of=df108ellFrozen6431(q,vec2(x,2.86),vec2(.84,1.04));c=mix(c,bright,of);c=mix(c,dark,o);float lattice=max(df108lineFrozen6431(mod(q.x+q.y*.52,.22),.11,.012),df108lineFrozen6431(mod(q.x-q.y*.52,.22),.11,.012));c=mix(c,vec3(.39,.41,.35),lattice*o);float upper=df108archFrozen6431(q,x,4.55,5.96,.69,.57);c=mix(c,bright,df108archFrozen6431(q,x,4.45,5.96,.85,.73));c=mix(c,vec3(.34,.37,.34),upper);float grid=max(df108lineFrozen6431(mod(q.x,.22),.11,.015),df108lineFrozen6431(mod(q.y,.25),.125,.015));c=mix(c,dark,grid*upper);c=mix(c,vec3(.54,.56,.50),upper*df108ellFrozen6431(q,vec2(x,5.35),vec2(.56,.95))*pow(abs(sin(q.x*27.+q.y*17.)),8.)*.28);}
 // Horizontalentablature/capshadow marks within7.5m only; no balustrade/obelisk/dome silhouettes on roof.
 c=mix(c,shadow,df108lineFrozen6431(q.y,7.24,.085));c=mix(c,bright,df108lineFrozen6431(q.y,7.40,.065));return c;
}
float d108line(float x,float w){return 1.-smoothstep(w,w+max(.012,fwidth(x)),abs(x));}
float d108box(vec2 q,vec2 at,vec2 sz){vec2 a=abs(q-at)-sz,aa=max(fwidth(q),vec2(.015));return(1.-smoothstep(0.,aa.x,a.x))*(1.-smoothstep(0.,aa.y,a.y));}
float d108ell(vec2 q,vec2 at,vec2 r){float d=length((q-at)/r);return 1.-smoothstep(1.,1.+max(.02,fwidth(d)),d);}
float d108arch(vec2 q,float y,float spring,float w){return max(d108box(q,vec2(0.,(y+spring)*.5),vec2(w,(spring-y)*.5)),d108ell(q,vec2(0.,spring),vec2(w))*step(spring,q.y));}
vec3 dreifaltigkeitWhole108(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-4905.)<.25)return dreifaltigkeitskircheFrontFull500Frozen6431(base,p,normal,frame,family);
 float role=floor(frame.z+.5);vec2 q=vec2(frame.x,p.y);vec3 pale=vec3(.81,.79,.72),bright=vec3(.88,.86,.80),shadow=vec3(.55,.54,.48),stone=vec3(.45,.39,.32),dark=vec3(.16,.18,.17),gold=vec3(.75,.59,.22),c=pale;
 if(role==1001.){vec2 uv=frame.xy;float row=floor(uv.y/.27);vec2 f=fract((uv+vec2(mod(row,2.)*.14,0.))/vec2(.28,.27));vec2 dist=min(f,1.-f)*vec2(.28,.27),aa=max(fwidth(uv),vec2(.02));float seam=max(1.-smoothstep(.009,.009+aa.x,dist.x),1.-smoothstep(.009,.009+aa.y,dist.y));return mix(vec3(.48,.225,.12),vec3(.34,.14,.075),seam*.30);}
 if(role==1004.)return bright;
 if(role==1005.)return gold;
 if(role==1006.)return vec3(.25,.25,.20);
 if(role==1007.){float ridges=d108line(sin(atan(normal.z,normal.x)*16.),.06);return mix(bright,vec3(.72,.70,.64),ridges*.17);}
 if(role==1008.)return vec3(.18,.20,.19);
 float facing=dot(normal,vec3(.30427734,0.,.9525835));
 if(role==1002.){
  if(facing<-.7){
   if(p.y<8.0)return dreifaltigkeitskircheFrontFull500Frozen6431(base,p,normal,frame,4905.);
   // True blind upper sculpture niche. Sculptural solids sit in front; no black false through-hole.
   float outside=d108arch(q,10.65,14.55,.94),inside=d108arch(q,10.78,14.55,.80);c=mix(c,bright,outside);c=mix(c,vec3(.39,.38,.32),inside);c=mix(c,shadow,d108line(q.x+.76,.045)*inside);
   // Distinct bounded pilaster fields and cornice contact shading, no generic windows in gable.
   float side=max(d108box(q,vec2(-1.75,13.),vec2(.09,4.3)),d108box(q,vec2(1.75,13.),vec2(.09,4.3)));c=mix(c,bright,side);
   c=mix(c,shadow,max(d108line(p.y-18.05,.07),d108line(p.y-20.5,.06)));
   float archY=19.4+1.15*sqrt(max(0.,1.-pow(q.x/2.65,2.)));c=mix(c,bright,d108line(p.y-archY,.11)*step(abs(q.x),2.65));
  }
  return c;
 }
 if(role==1003.){
  if(facing<-.35){
   if(p.y<8.)return dreifaltigkeitskircheFrontFull500Frozen6431(base,p,normal,frame,4905.);
   // Only small high oval windows observed on recessed front wings; hidden side counts are not guessed.
   float xx=frame.x<0.?-6.25:6.25;float frameOval=d108ell(q,vec2(xx,10.0),vec2(.62,.39)),win=d108ell(q,vec2(xx,10.0),vec2(.47,.27));c=mix(c,bright,frameOval);c=mix(c,dark,win);float grille=max(d108line(mod(q.x,.18)-.09,.015),d108line(q.y-10.,.018));c=mix(c,vec3(.38,.40,.36),grille*win);
   c=mix(c,shadow,d108line(p.y-8.12,.06));
  }
  return c;
 }
 return pale;
}
`;
