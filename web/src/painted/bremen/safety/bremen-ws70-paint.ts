export const WS70_GLSL=/*glsl*/`
float ws70f256Box(vec2 p,vec2 c,vec2 h){vec2 aa=max(fwidth(p),vec2(.018));vec2 m=1.-smoothstep(h-aa,h+aa,abs(p-c));return m.x*m.y;}
float ws70f256Line(float p,float c,float w){float a=max(fwidth(p),.014);return 1.-smoothstep(w-a,w+a,abs(p-c));}
vec3 ws70f256Window(vec3 c,vec2 p,vec2 at,vec2 h){float s=ws70f256Box(p,at,h+vec2(.11)),g=ws70f256Box(p,at,h);c=mix(c,vec3(.80,.79,.70),s);c=mix(c,vec3(.20,.25,.24),g);float bars=max(ws70f256Box(p,at,vec2(.027,h.y)),ws70f256Box(p,at,vec2(h.x,.027)));c=mix(c,vec3(.79,.79,.72),bars*g);return mix(c,vec3(.65,.65,.58),ws70f256Box(p,at-vec2(0.,h.y+.13),vec2(h.x+.16,.055)));}
vec3 ws70f256Native190(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float u=frame.x,v=frame.y,y=p.y;vec2 q=vec2(u,y);float lod=1.-smoothstep(.04,.13,max(fwidth(u),fwidth(y)));
 if(abs(normal.y)>.10){float row=floor(v/.30);float joint=max(ws70f256Line(mod(u+mod(row,2.)*.15,.30),.15,.014),ws70f256Line(mod(v,.30),.15,.014));vec3 tile=vec3(.35,.16,.11)+normal.y*.035;return mix(tile,tile*.68,joint*lod*.4);}
 float row=floor(y/.16),x=mod(u+mod(row,2.)*.18,.36),z=mod(y,.16);float edge=min(min(x,.36-x),min(z,.16-z));float mortar=(1.-smoothstep(.006,.018,edge))*lod;vec3 c=mix(vec3(.49,.235,.155)+.018*sin(floor(u/.36)*3.7+row*2.3)*lod,vec3(.58,.49,.36),mortar*.55);if(y<1.7)c=vec3(.27,.255,.22);
 // PositiveB gable fronts identified by Schlachte-side photograph and exact original front planes.
 float facing=dot(normal,vec3(.7931266,0.,.6090568));if(facing<.8)return c;
 float lo=0.,hi=0.,n=0.;if(u>=11.7466&&u<=24.3525){lo=11.7466;hi=24.3525;n=5.;}else if(u>=-.6265&&u<11.7466){lo=-.6265;hi=11.7466;n=5.;}else if(u>=-12.9916&&u<-.6265){lo=-12.9916;hi=-.6265;n=3.;}else if(u>=-25.1489&&u< -12.9916){lo=-25.1489;hi=-12.9916;n=3.;}
 float plane=.3125*u+17.55;bool front=n>0.&&abs(v-plane)<.75;
 if(front){float band=max(ws70f256Line(y,1.9,.09),ws70f256Line(y,9.05,.10));float corner=max(ws70f256Line(u,lo+.20,.13),ws70f256Line(u,hi-.20,.13));c=mix(c,vec3(.75,.70,.58),max(band,corner));float width=hi-lo;
 for(int j=0;j<5;j++){if(float(j)>=n)break;float x=lo+(float(j)+.5)*width/n;for(int k=0;k<4;k++){float cy=3.0+float(k)*1.78;c=ws70f256Window(c,q,vec2(x,cy),vec2(n>4.?.72:.81,.62));}}
 float mid=(lo+hi)*.5;for(int j=-1;j<=1;j++){float x=mid+float(j)*width*.19;c=ws70f256Window(c,q,vec2(x,10.55),vec2(.39,.42));}c=ws70f256Window(c,q,vec2(mid,12.5),vec2(.34,.37));
 }
 // Distinct lower wing at photograph right, original source27261255 front atV7..9.
 if(u> -39.42&&u< -25.49&&v>6.8&&v<9.4&&y<10.6){for(int j=0;j<3;j++){float x=-37.1+float(j)*4.1;for(int k=0;k<3;k++)c=ws70f256Window(c,q,vec2(x,3.0+float(k)*2.45),vec2(.61,.70));}c=mix(c,vec3(.73,.69,.58),ws70f256Line(y,1.9,.09));}
 return c;
}


float ws70f265Box(vec2 q,vec2 c,vec2 h){vec2 aa=max(fwidth(q),vec2(.018));vec2 a=1.-smoothstep(h-aa,h+aa,abs(q-c));return a.x*a.y;}
float ws70f265Line(float v,float c,float w){float aa=max(fwidth(v),.015);return 1.-smoothstep(w-aa,w+aa,abs(v-c));}
float ws70f265Arch(vec2 q,float x,float b,float r,float t,float gothic){float sy=t-r*(gothic>.5?1.732:1.);float d;if(q.y<sy)d=abs(q.x-x)-r;else if(gothic>.5)d=max(length(q-vec2(x-r,sy)),length(q-vec2(x+r,sy)))-2.*r;else d=length(q-vec2(x,sy))-r;float aa=max(fwidth(d),.018);return (1.-smoothstep(-aa,aa,d))*smoothstep(b-aa,b+aa,q.y);}
vec3 ws70f265Stone(vec2 q,vec3 col,float rowh){float row=floor(q.y/rowh),bx=q.x+mod(row,2.)*.49;float x=mod(bx,1.13),y=mod(q.y,rowh);float j=1.-smoothstep(.012,.035,min(min(x,1.13-x),min(y,rowh-y)));float v=.037*sin(floor(bx/1.13)*7.1+row*3.8);return mix(col+v,vec3(.66,.61,.52),j*.5);}
vec3 ws70f265RectWindow(vec3 c,vec2 q,vec2 at,vec2 size,vec3 trim){float s=ws70f265Box(q,at,size+vec2(.12,.13)),g=ws70f265Box(q,at,size);c=mix(c,trim,s);c=mix(c,vec3(.15,.19,.18),g);float cross=max(ws70f265Box(q,at,vec2(.033,size.y)),ws70f265Box(q,at+vec2(0.,.12),vec2(size.x,.035)));c=mix(c,trim*.8,cross*g);float sill=ws70f265Box(q,at-vec2(0.,size.y+.13),vec2(size.x+.17,.07));return mix(c,trim*.76,sill);}
vec3 ws70f265Portal(vec3 c,vec2 q,float x,float r,float top,float gothic,vec3 wood){float outer=ws70f265Arch(q,x,.02,r+.22,top+.26,gothic),inner=ws70f265Arch(q,x,.03,r,top,gothic);c=mix(c,vec3(.49,.43,.34),outer);c=mix(c,wood,inner);float side=1.-smoothstep(.0,.30,r-abs(q.x-x));c=mix(c,vec3(.055,.066,.055),side*inner*.7);float planks=ws70f265Line(mod(q.x-x,.22),.11,.012);c=mix(c,wood*.64,inner*planks);c=mix(c,wood*.47,ws70f265Line(q.x,x,.027)*inner);float rail=ws70f265Line(q.y,.65,.035)*inner;return mix(c,wood*.66,rail);}
vec3 ws70f265Lancet(vec3 c,vec2 q,float x,float b,float r,float top){float surroundMask=ws70f265Arch(q,x,b-.13,r+.16,top+.22,1.),g=ws70f265Arch(q,x,b,r,top,1.);c=mix(c,vec3(.68,.63,.52),surroundMask);c=mix(c,vec3(.27,.33,.32),g);float bars=max(ws70f265Line(q.x,x,.035),max(ws70f265Line(q.x,x-r*.5,.026),ws70f265Line(q.x,x+r*.5,.026)));bars=max(bars,ws70f265Line(q.y,b+(top-b)*.67,.025));float dia=ws70f265Line(abs(q.x-x)+abs(q.y-(top-r*.9)),r*.62,.035);c=mix(c,vec3(.70,.70,.61),g*max(bars,dia));float lattice=(1.-smoothstep(.016,.032,abs(mod(q.x+q.y*.8,.34)-.17)))*(1.-smoothstep(.025,.075,max(fwidth(q.x),fwidth(q.y))));return mix(c,vec3(.58,.61,.55),g*lattice*.32);}
vec3 ws70f265Tiles(vec2 q,vec3 col,float slope){float row=floor(q.y/.29),x=mod(q.x+mod(row,2.)*.12,.24),y=mod(q.y,.29);float seams=max(1.-smoothstep(.012,.035,min(x,.24-x)),1.-smoothstep(.015,.038,min(y,.29-y)));float lod=1.-smoothstep(.03,.10,max(fwidth(q.x),fwidth(q.y)));return mix(col+clamp(slope,-1.,1.)*.055,col*.64,seams*lod*.42);}

vec3 ws70f265Brick(vec2 q,vec3 col){float rh=.17,bw=.36,row=floor(q.y/rh);vec2 cell=vec2(mod(q.x+mod(row,2.)*bw*.5,bw),mod(q.y,rh));float edge=min(min(cell.x,bw-cell.x),min(cell.y,rh-cell.y));float joint=1.-smoothstep(.006,.018,edge);float lod=1.-smoothstep(.025,.085,max(fwidth(q.x),fwidth(q.y)));float v=.028*sin(floor((q.x+mod(row,2.)*bw*.5)/bw)*3.13+row*5.1);return mix(col+v*lod,vec3(.66,.60,.49),joint*lod*.42);}
vec3 ws70f265Copper(vec2 q,vec3 col,vec3 normal){float seam=ws70f265Line(mod(q.x,1.8),.9,.026);return mix(col+.045*normal.y,col*.72,seam*.32);}
vec3 ws70f265Clock(vec3 c,vec2 q,float cy,float radius,float dark){vec2 d=q-vec2(0.,cy);float rr=length(d),outer=1.-smoothstep(radius+.10,radius+.16,rr),inner=1.-smoothstep(radius-.08,radius-.02,rr);c=mix(c,vec3(.61,.57,.46),outer);vec3 face=mix(vec3(.82,.79,.66),vec3(.12,.16,.14),dark);c=mix(c,face,inner);vec3 ink=mix(vec3(.13,.15,.11),vec3(.79,.68,.36),dark);float marks=0.;for(int j=0;j<12;j++){float a=float(j)*.5235988;vec2 dir=vec2(sin(a),cos(a));marks=max(marks,ws70f265Box(vec2(dot(d,dir),dot(d,vec2(dir.y,-dir.x))),vec2(radius*.79,0.),vec2(radius*.10,.027)));}float hands=max(ws70f265Line(d.x*.64+d.y*.77,0.,.045)*ws70f265Box(d,vec2(-radius*.21,radius*.18),vec2(radius*.41,radius*.36)),ws70f265Line(d.x*.93-d.y*.37,0.,.045)*ws70f265Box(d,vec2(radius*.25,radius*.12),vec2(radius*.43,radius*.28)));return mix(c,ink,max(marks,hands)*inner);}
vec3 ws70f265Blind(vec3 c,vec2 q,float x,float b,float r,float t,vec3 fill){float outer=ws70f265Arch(q,x,b-.10,r+.10,t+.15,1.),inner=ws70f265Arch(q,x,b,r,t,1.);c=mix(c,fill*.75,outer);return mix(c,fill,inner);}

vec3 ws70f265CoverageFull500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){vec2 q=vec2(frame.x,p.y);float u=q.x,y=q.y;if(family==4214.)return base;

 if(family==4217.)return ws70f265Tiles(frame.xy,vec3(.61,.30,.145),normal.y-.35);
 if(family==4216.)return ws70f265Copper(frame.xy,vec3(.48,.69,.59),normal);
 if(family==4218.||family==4215.){vec3 c=ws70f265Stone(q,vec3(.49,.465,.38),.63);float bands=max(ws70f265Line(y,23.4,.18),max(ws70f265Line(y,31.0,.18),max(ws70f265Line(y,40.4,.22),ws70f265Line(y,49.5,.20))));c=mix(c,vec3(.65,.60,.48),bands);if(family==4218.){c=ws70f265Clock(c,q,36.6,2.05,0.);float l=ws70f265Arch(q,0.,42.0,1.23,48.6,1.);c=mix(c,vec3(.10,.13,.10),l);float slats=ws70f265Line(mod(y,.33),.165,.055);c=mix(c,vec3(.31,.32,.25),l*slats);for(int j=0;j<2;j++){float x=(float(j)-.5)*1.50;float g=ws70f265Arch(q,x,27.0,.36,29.6,0.);c=mix(c,vec3(.15,.18,.14),g);}}return c;}
 vec3 c=ws70f265Brick(q,vec3(.56,.29,.19));if(family==4219.){for(int j=0;j<7;j++){float x=-14.+float(j)*7.;c=ws70f265Blind(c,q,x,2.9,1.45,11.8,vec3(.48,.285,.20));float inlay=ws70f265Arch(q,x,4.,.92,10.9,1.);c=mix(c,vec3(.30,.32,.28),inlay*.62);}c=mix(c,vec3(.42,.25,.18),ws70f265Line(y,13.7,.10));}return c;
}

vec3 ws70sync159F265(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1094.)return ws70f265CoverageFull500(base,p,normal,frame,4215.);if(family==1095.)return ws70f265CoverageFull500(base,p,normal,frame,4216.);if(family==1096.)return ws70f265CoverageFull500(base,p,normal,frame,4217.);if(family==1097.)return ws70f265CoverageFull500(base,p,normal,frame,4218.);if(family==1098.)return ws70f265CoverageFull500(base,p,normal,frame,4219.);if(family==1099.)return ws70f265CoverageFull500(base,p,normal,frame,4222.);return base;}
float ws70Repeat(float x,float period,float w){float a=max(fwidth(x),.0001),d=abs(mod(x+period*.5,period)-period*.5);return mix(1.-smoothstep(max(0.,w-a*.5),w+a*.5,d),clamp(2.*w/period,0.,1.),smoothstep(period*.18,period*.65,a));}
vec3 ws70Weserburg(vec3 base,vec3 p,vec3 normal,vec4 f){
 float u=f.x,v=f.y,y=p.y;vec2 q=vec2(u,y);float lod=1.-smoothstep(.09,.24,max(fwidth(u),fwidth(y)));float course=floor(y/.16),mortar=max(ws70Repeat(y,.16,.008),ws70Repeat(u+mod(course,2.)*.18,.36,.008));vec3 c=mix(vec3(.50,.285,.205),vec3(.60,.51,.40),mortar*.32*lod);c=mix(vec3(.29,.285,.25),c,smoothstep(1.4,2.0,y));
 float front=dot(normal.xz,vec2(.575,.818));bool main=front>.78&&abs(v-16.7)<1.35;bool low=front>.6&&u< -21.56&&u> -35.5&&v>16.8&&v<19.5;
 if(main&&u>=-21.56&&u<4.07){
  float lo=u< -8.87?-21.56:-8.87,hi=u< -8.87?-8.87:4.07,n=u< -8.87?4.:3.,width=hi-lo;
  // Two historic brick gables: individual white cross casements, reducing attic windows and barred basement openings.
  for(int j=0;j<4;j++){if(float(j)>=n)break;float x=lo+(float(j)+.5)*width/n;for(int k=0;k<4;k++)c=ws70f256Window(c,q,vec2(x,5.1+float(k)*4.15),vec2(.83,1.30));float basement=ws70f256Box(q,vec2(x,1.7),vec2(.67,.65));c=mix(c,mix(vec3(.15,.17,.155),vec3(.36,.37,.32),ws70Repeat(u,.23,.021)),basement);}
  float mid=(lo+hi)*.5;for(int j=-1;j<=1;j++){float x=mid+float(j)*width*.25;c=ws70f256Window(c,q,vec2(x,22.9),vec2(.43,.58));}for(int j=-1;j<=1;j++){float x=mid+float(j)*width*.20;c=ws70f256Window(c,q,vec2(x,25.2),vec2(.40,.52));}c=ws70f256Window(c,q,vec2(mid,27.3),vec2(.36,.46));
  c=mix(c,vec3(.72,.67,.54),max(ws70f256Line(y,3.1,.08),ws70f256Line(y,21.0,.09)));
 }
 if(main&&u>=4.07&&u<=30.2){
  float lo=u<17.01?4.07:17.01,hi=u<17.01?17.01:30.2,width=hi-lo;vec3 pale=vec3(.76,.75,.67);
  // The two1959 gables have exposed pale concrete rectangles and six narrow vertical casement bays.
  for(int j=0;j<6;j++){float x=lo+(float(j)+.5)*width/6.;for(int k=0;k<4;k++){float cy=5.1+float(k)*4.15;float trim=ws70f256Box(q,vec2(x,cy),vec2(.98,1.73));float pane=ws70f256Box(q,vec2(x,cy),vec2(.72,1.39));c=mix(c,pale,trim);c=mix(c,vec3(.25,.31,.31),pane);float bars=max(ws70f256Line(u,x,.035),ws70f256Line(y,cy,.035));c=mix(c,pale,bars*pane);}}
  float frame=max(ws70f256Line(u,lo+.18,.15),ws70f256Line(u,hi-.18,.15));for(int k=0;k<5;k++)frame=max(frame,ws70f256Line(y,3.05+float(k)*4.15,.16));c=mix(c,pale,frame);
  // Brick remains in the triangular gable above the concrete-framed wall; no fictitious glass triangle.
 }
 if(low){for(int j=0;j<2;j++){float x=-32.1+float(j)*5.8;for(int k=0;k<2;k++)c=ws70f256Window(c,q,vec2(x,5.8+float(k)*4.8),vec2(.83,1.18));}c=mix(c,vec3(.71,.67,.56),ws70f256Line(y,3.0,.09));}
 // Only the photographed return of the low headhouse receives its observed two casements.
 if(u< -21.5&&u> -35.8&&normal.x*.818+normal.z*-.575<-.70&&y<13.5&&v>4.&&v<18.6){float x=v;vec2 side=vec2(x,y);for(int j=0;j<2;j++)for(int k=0;k<2;k++)c=ws70f256Window(c,side,vec2(7.3+float(j)*6.1,5.8+float(k)*4.8),vec2(.82,1.17));}
 // Rear roof/body shape and brick colour are complete. Unverified rear fine openings stay unasserted.
 return c;
}
// Existing project photo 4: simple glazed lancets, without invented ornate tracery.
vec3 ws70StephaniPhotoLancet(vec3 c,vec2 q,float x,float bottom,float radius,float top,float transverse){
 float recess=ws70f265Arch(q,x,bottom-.16,radius+.20,top+.23,1.);
 float lining=ws70f265Arch(q,x,bottom-.05,radius+.055,top+.08,1.);
 float glass=ws70f265Arch(q,x,bottom,radius,top,1.);
 c=mix(c,vec3(.36,.225,.16),recess);
 c=mix(c,vec3(.68,.69,.63),lining);
 float halfTone=smoothstep(-radius,radius,q.x-x);
 c=mix(c,mix(vec3(.56,.66,.68),vec3(.72,.79,.77),halfTone),glass);
 float bars=ws70f265Line(q.x,x,.025);
 bars=max(bars,ws70f265Line(q.y,bottom+(top-bottom)*.34,.038));
 bars=max(bars,ws70f265Line(q.y,bottom+(top-bottom)*.68,.038));
 // Additional finer divisions are visible on the long transept glazing; no diamond/rose pattern.
 if(transverse>.5)bars=max(bars,ws70f265Line(mod(q.y-bottom,1.05),.525,.012)*.60);
 c=mix(c,vec3(.20,.255,.25),glass*bars);
 float sill=ws70f265Box(q,vec2(x,bottom-.11),vec2(radius+.17,.065));
 return mix(c,vec3(.48,.47,.40),sill);
}
vec3 ws70StephaniPhotoSouth(vec3 c,vec3 p,vec4 f,float mode){
 vec2 q=vec2(f.x,p.y);
 if(mode<1.5){
  // Keep the three existing south nave bay stations; the photo resolves their high glazed section.
  for(int k=0;k<3;k++)c=ws70StephaniPhotoLancet(c,q,-14.+float(k)*7.,8.5,.68,13.9,0.);
  float belt=ws70f265Line(p.y,15.12,.065);
  float dentils=ws70f265Line(p.y,14.80,.11)*ws70f265Line(mod(f.x,.31),.155,.065);
  c=mix(c,vec3(.65,.63,.54),belt);
  return mix(c,vec3(.31,.215,.16),dentils);
 }
 // Actual south transept: three separate long lights; the centre is higher.
 for(int k=-1;k<=1;k++)c=ws70StephaniPhotoLancet(c,q,11.25+float(k)*3.05,6.4,.74,16.1-abs(float(k))*1.2,1.);
 c=mix(c,vec3(.55,.48,.36),ws70f265Line(p.y,6.12,.065));
 for(int k=-2;k<=2;k++)c=ws70f265Blind(c,q,11.25+float(k)*1.45,18.0,.35,23.1-abs(float(k))*.9,vec3(.47,.275,.18));
 return c;
}

vec3 ws70Stephani(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 vec2 q=vec2(f.x,p.y);float y=p.y;
 if(family==46453.){float seam=ws70Repeat(f.x,.53,.011);return base*(1.-seam*.17);}
 if(family==46455.)return ws70f265Copper(f.xy,base,normal);
 if(family==46451.)return ws70f265Tiles(f.xy,vec3(.59,.275,.145),normal.y-.35);
 if(family==46454.){if(y>46.35)return vec3(.19,.155,.145)*(1.-.12*ws70Repeat(f.x,.53,.011));return ws70f265CoverageFull500(base,p,normal,f,4218.);}
 if(family==46456.){
  vec3 c=ws70f265Stone(q,vec3(.49,.465,.38),.63);c=mix(c,vec3(.64,.60,.48),max(ws70f265Line(y,10.8,.11),max(ws70f265Line(y,16.3,.13),ws70f265Line(y,23.5,.15))));
  for(int k=0;k<3;k++){float bottom=6.9+float(k)*5.45;float arch=ws70f265Arch(q,0.,bottom,.65,bottom+2.65,0.);c=mix(c,vec3(.16,.19,.155),arch);}return c;
 }
 vec3 c=ws70f265Brick(q,vec3(.56,.29,.19));
 // Exact installed wall-plane registration; exclude opposite walls, buttress returns and roofs.
 if(family==46450. && dot(normal.xz,vec2(.1,-.995))>.985){
  if(f.x> -19.75 && f.x<5.5 && f.y> -6.7 && f.y< -6.2)return ws70StephaniPhotoSouth(c,p,f,1.);
  if(f.x>5.9 && f.x<16.6 && f.y> -18.1 && f.y< -17.2)return ws70StephaniPhotoSouth(c,p,f,2.);
 }

 // Photographed river-facing nave: pointed recesses and three-light transept gable, each kept in its wall zone.
 float sideFacing=abs(dot(normal.xz,vec2(-.1,.995)));
 if(sideFacing>.68){
  for(int j=0;j<6;j++){float x=-14.+float(j)*7.;float outer=ws70f265Arch(q,x,2.9,1.45,11.8,1.);float inner=ws70f265Arch(q,x,4.,.92,10.9,1.);c=mix(c,vec3(.48,.285,.20),outer);c=mix(c,vec3(.30,.32,.28),inner*.72);}
  c=mix(c,vec3(.42,.25,.18),ws70f265Line(y,13.7,.10));
 }
 if(abs(dot(normal.xz,vec2(.995,.1)))>.65&&p.x>0.){
  for(int j=-1;j<=1;j++){float at=float(j)*3.05;float pane=ws70f265Arch(vec2(f.y,y),at,6.4,.74,16.1-abs(float(j))*1.2,1.);c=mix(c,vec3(.70,.69,.59),pane);}
  for(int j=-2;j<=2;j++)c=ws70f265Blind(c,vec2(f.y,y),float(j)*1.45,18.0,.35,23.1-abs(float(j))*.9,vec3(.45,.24,.17));
 }
 return c;
}
vec3 ws70Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family>=46399.5&&family<=46449.5){if(family==46401.)return ws70f256Native190(base,p,normal,frame,3404.);if(family==46402.)return base;return ws70Weserburg(base,p,normal,frame);}
 if(family>=46449.5&&family<=46499.5){if(family==46452.)return base;return ws70Stephani(base,p,normal,frame,family);}return base;
}
`;
