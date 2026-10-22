export const F124_COMPLETION_GLSL=String.raw`float apc6411OldBox(vec2 p,vec2 at,vec2 sz){vec2 a=1.-smoothstep(sz,sz+vec2(.04),abs(p-at));return a.x*a.y;}
float apc6411OldEll(vec2 p,vec2 at,vec2 rad){return 1.-smoothstep(.96,1.04,length((p-at)/rad));}
float apc6411OldLine(float p,float at,float w){return 1.-smoothstep(w,w+.04,abs(p-at));}
float apc6411OldArch(vec2 p,float x,float bottom,float spring,float w,float rise){return max(apc6411OldBox(p,vec2(x,(bottom+spring)*.5),vec2(w,(spring-bottom)*.5)),apc6411OldEll(p,vec2(x,spring),vec2(w,rise))*step(spring,p.y));}
vec3 apc6411Legacy(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 stone=vec3(.62,.59,.47),light=vec3(.77,.73,.60),joint=vec3(.45,.43,.34),dark=vec3(.13,.15,.14);vec2 q=vec2(frame.x,p.y);vec3 c=stone;
 if(family==4875.){vec2 v=frame.xy;float diag=max(apc6411OldLine(mod(v.x+v.y,.72),.36,.016),apc6411OldLine(mod(v.x-v.y,.72),.36,.016));return mix(vec3(.43,.49,.47),vec3(.28,.36,.34),diag*.65)+vec3(.015*sin(v.x*7.+v.y*5.));}
 if(family==4873.){
  // Allappearance domains come from the datedEastphoto; invisibleNorthbase remainsneutral. Originalcurvedgeometry is never cut into a gallery.
  if(p.z>559.993609374&&p.y<8.)return base;
  vec2 g=frame.xy;float rad=frame.w*.5;float a=atan(g.y,g.x);float along=a*rad;float row=floor(p.y/.22);vec2 uv=vec2(fract((along+mod(row,2.)*.24)/.48),fract(p.y/.22));float mortar=max(1.-smoothstep(.025,.07,min(uv.x,1.-uv.x)),1.-smoothstep(.025,.07,min(uv.y,1.-uv.y)));float n=fract(sin(dot(floor(vec2(along/.48,row)),vec2(17.1,53.4)))*4791.2);c=stone+vec3(n*.10);c=mix(c,joint,mortar*.58);
  float bay=mod(a+.2617994,.5235988)-.2617994;float bx=bay*rad;float windowAngle=mod(a+.5235988,1.0471976)-.5235988;float wx=windowAngle*rad;
  // Two largeblindarcade registers with alternate tallleadedwindows. Recesses are opaque color, not holes or claimed exactsurvey baycounts.
  for(int i=0;i<2;i++){float y=i==0?7.0:14.85;float arch=apc6411OldArch(vec2(bx,p.y),0.,i==0?1.6:8.3,y,rad*.235,1.20);float inner=apc6411OldArch(vec2(bx,p.y),0.,i==0?1.7:8.4,y,rad*.207,1.04);c=mix(c,light,max(0.,arch-inner));c=mix(c,joint,max(0.,arch-inner)*apc6411OldLine(bx,rad*.21,.06)*.45);}
  float lower=apc6411OldArch(vec2(wx,p.y),0.,1.65,4.25,.53,.66);float loFrame=apc6411OldArch(vec2(wx,p.y),0.,1.48,4.25,.73,.86);c=mix(c,light,loFrame);c=mix(c,dark,lower);float grille=max(apc6411OldLine(mod(wx,.16),.08,.015),apc6411OldLine(mod(p.y,.31),.155,.015));c=mix(c,vec3(.43,.46,.40),grille*lower);
  float upper=apc6411OldArch(vec2(wx,p.y),0.,9.0,13.3,.68,.92);c=mix(c,light,apc6411OldArch(vec2(wx,p.y),0.,8.85,13.3,.86,1.10));c=mix(c,vec3(.24,.28,.26),upper);float lead=max(apc6411OldLine(mod(wx,.21),.105,.016),apc6411OldLine(mod(p.y,.39),.195,.016));c=mix(c,joint,lead*upper);c=mix(c,vec3(.40,.44,.37),upper*pow(abs(sin(wx*19.+p.y*11.)),12.)*.35);
  for(int i=0;i<3;i++){float yy=i==0?8.15:(i==1?15.75:18.9);c=mix(c,joint,apc6411OldLine(p.y,yy,.10));c=mix(c,light,apc6411OldLine(p.y,yy+.16,.09));}
  // Densephotographed dwarf-gallery arcades and lowbalustrade slots; no removedwallgeometry or alpha.
  float local=mod(along+.52,1.04)-.52;float gallery=apc6411OldArch(vec2(local,p.y),0.,16.65,17.90,.35,.46);c=mix(c,light,apc6411OldArch(vec2(local,p.y),0.,16.53,17.90,.46,.57));c=mix(c,vec3(.20,.23,.19),gallery);c=mix(c,light,apc6411OldLine(local,.45,.065)*apc6411OldBox(vec2(local,p.y),vec2(0.,17.55),vec2(.53,1.04)));float rail=apc6411OldBox(vec2(mod(along,.31)-.155,p.y),vec2(0.,16.19),vec2(.068,.20));c=mix(c,dark,rail);return c;
 }
 float mask=frame.z>35.?34.:(frame.z>32.?21.:(frame.z>28.?24.:22.));if(p.y<mask)return base;
 float row=floor(p.y/.23);vec2 uv=vec2(fract((q.x+mod(row,2.)*.24)/.48),fract(p.y/.23));float mortar=max(1.-smoothstep(.025,.07,min(uv.x,1.-uv.x)),1.-smoothstep(.025,.07,min(uv.y,1.-uv.y)));c=stone+vec3(.08*fract(sin(dot(floor(vec2(q.x/.48,row)),vec2(8.7,91.3)))*3917.));c=mix(c,joint,mortar*.55);
 if(frame.z<28.)return c; // only sourcegable22..27 paleappearance, exactunseenwindowdetail unknown
 if(frame.z>35.){float op=apc6411OldArch(q,0.,34.17,34.77,.19,.28);c=mix(c,light,apc6411OldArch(q,0.,34.09,34.77,.28,.37));c=mix(c,dark,op);c=mix(c,light,apc6411OldLine(p.y,35.31,.07));return c;}
 if(frame.z<32.){for(int i=0;i<2;i++){float x=(float(i)-.5)*frame.w*.36;float w=frame.w*.13;float op=apc6411OldArch(q,x,27.0,28.45,w,.47);c=mix(c,light,apc6411OldArch(q,x,26.88,28.45,w+.10,.57));c=mix(c,dark,op);}c=mix(c,light,apc6411OldLine(p.y,29.80,.08));return c;}
 // TallEasttowers: lowerblindrecesses and upperpaired belfryarches on only the originalphoto-facing facets.
 float ap124HalfWidth=frame.w*.40;float blind=apc6411OldArch(q,0.,22.1,26.3,ap124HalfWidth,1.0);float inr=apc6411OldArch(q,0.,22.2,26.3,ap124HalfWidth-.13,.84);c=mix(c,light,max(0.,blind-inr));c=mix(c,joint,max(0.,blind-inr)*.35);
 for(int i=0;i<2;i++){float x=(float(i)-.5)*frame.w*.36;float w=frame.w*.13;float ar=apc6411OldArch(q,x,29.0,32.0,w,.62);c=mix(c,light,apc6411OldArch(q,x,28.86,32.0,w+.13,.77));c=mix(c,dark,ar);c=mix(c,vec3(.36,.36,.29),ar*apc6411OldLine(mod(p.y,.19),.095,.025));}for(int i=0;i<3;i++){float yy=i==0?21.5:(i==1?28.0:33.7);c=mix(c,joint,apc6411OldLine(p.y,yy,.12));c=mix(c,light,apc6411OldLine(p.y,yy+.18,.09));}return c;
}
float apc6411Band(float v,float at,float halfWidth){float aa=max(fwidth(v)*.75,.022);return 1.-smoothstep(halfWidth,halfWidth+aa,abs(v-at));}
float apc6411Box(vec2 p,vec2 at,vec2 h){vec2 aa=max(fwidth(p)*.75,vec2(.022));vec2 s=1.-smoothstep(h,h+aa,abs(p-at));return s.x*s.y;}
float apc6411Arch(vec2 p,float w,float spring,float rise){float aa=max(max(fwidth(p.x),fwidth(p.y))*.75,.025);float top=spring+rise*sqrt(max(0.,1.-p.x*p.x/(w*w)));return (1.-smoothstep(w,w+aa,abs(p.x)))*step(0.,p.y)*(1.-smoothstep(top,top+aa,p.y));}
vec3 apc6411Stone(vec2 p){float row=floor(p.y/.23);vec2 uv=fract(vec2(p.x/.48+mod(row,2.)*.5,p.y/.23));vec2 aa=max(fwidth(vec2(p.x/.48,p.y/.23)),vec2(.015));vec2 edge=min(uv,1.-uv);float j=max(1.-smoothstep(.025,.025+aa.x,edge.x),1.-smoothstep(.025,.025+aa.y,edge.y));float tile=fract(sin(dot(floor(vec2(p.x/.48+mod(row,2.)*.5,row)),vec2(8.7,91.3)))*3917.);return mix(vec3(.62,.59,.47)+tile*.065,vec3(.45,.43,.34),j*.5);}
vec3 apc6411Opening(vec3 c,vec2 q,float width,float height,float rise,float louver){float spring=height-rise;float outer=apc6411Arch(q,width+.13,spring,rise+.13),inside=apc6411Arch(q,width,spring,rise);c=mix(c,vec3(.77,.73,.60),outer);c=mix(c,vec3(.13,.15,.14),inside);if(louver>.5)c=mix(c,vec3(.36,.36,.29),inside*apc6411Band(mod(q.y,.19),.095,.025));else{float lead=max(apc6411Band(mod(q.x,.22),.11,.012),apc6411Band(mod(q.y,.36),.18,.012));c=mix(c,vec3(.39,.42,.35),inside*lead*.65);}return c;}
vec3 apc6411Blind(vec3 c,vec2 p,float w,float h){float ar=apc6411Arch(p,w,h-w,w),inner=apc6411Arch(p-vec2(0.,.12),w-.14,h-w,w-.13);c=mix(c,vec3(.77,.73,.60),max(0.,ar-inner));return mix(c,c*.91,inner*.5);}
vec3 apc6411Nave(vec3 c,vec3 world,vec3 normal,float low){if(abs(normal.z)<.8)return c;float bay=mod(world.x+10.6,6.75)-3.375;if(world.x> -10.65&&world.x<16.4){if(low>.5)return apc6411Opening(c,vec2(bay,world.y-3.4),.67,4.65,.78,0.);return apc6411Opening(c,vec2(bay,world.y-14.),.65,3.25,.76,0.);}return c;}
vec3 apc6411WestTransept(vec3 c,vec3 world,vec3 normal){float center=-17.8;if(abs(normal.z)>.8){float xx=world.x-center;float pair=min(abs(xx-2.75),abs(xx+2.75));c=apc6411Opening(c,vec2(pair,world.y-8.6),.78,8.3,.92,0.);if(world.y>18.){float cross=apc6411Box(vec2(xx,world.y),vec2(0.,22.55),vec2(.23,1.4));cross=max(cross,apc6411Box(vec2(xx,world.y),vec2(0.,22.8),vec2(.95,.22)));c=mix(c,vec3(.15,.17,.15),cross);for(int i=0;i<2;i++){float sx=(float(i)-.5)*7.0;c=apc6411Opening(c,vec2(xx-sx,world.y-20.2),.22,1.7,.25,0.);}}}
 // Native entrance node4212379300 on southwest transept west face. Ground anchor exact; unmeasured door dimensions estimated.
 if(normal.x<-.8&&abs(world.x+24.8)<.55&&world.z< -5.9&&world.z> -13.1){vec2 door=vec2(world.z+9.49554,world.y-.15);float trim=apc6411Box(door,vec2(0.,1.85),vec2(1.16,1.85));float leaf=apc6411Box(door,vec2(0.,1.77),vec2(.91,1.76));c=mix(c,vec3(.77,.73,.60),trim);c=mix(c,vec3(.24,.20,.14),leaf);c=mix(c,vec3(.45,.38,.25),leaf*max(apc6411Band(door.x,0.,.035),apc6411Band(door.y,1.83,.04)));c=mix(c,vec3(.55,.48,.31),leaf*apc6411Box(door,vec2(.16,1.54),vec2(.025,.15)));}
 return c;}
vec3 apc6411LowTower(vec3 base,vec3 p,vec3 normal,vec4 frame){vec2 q=vec2(frame.x,p.y);vec3 c=apc6411Stone(q);float h=frame.z;
 if(h>35.)return c; // Octagonal lantern neck: existing upper arches remain delegated, lower neck is plain stone.
 if(h>32.){c=apc6411Opening(c,vec2(q.x,p.y-11.6),.16,3.3,.20,0.);c=mix(c,vec3(.77,.73,.60),apc6411Band(p.y,9.9,.08));return c;}
 if(h>28.){if(normal.z>.8)c=apc6411Opening(c,vec2(q.x,p.y-23.1),1.45,3.5,1.45,0.);return c;}
 return c;
}
vec3 apc6411WestBody(vec3 c,vec2 q,float y){float x=q.x;float pair=min(abs(x-2.30),abs(x+2.30));for(int i=1;i<5;i++){float yy=float(i)*10.;c=mix(c,vec3(.45,.43,.34),apc6411Band(y,yy,.13));c=mix(c,vec3(.77,.73,.60),apc6411Band(y,yy+.2,.09));}
  if(y<20.){float bottom=y<10.?1.2:10.5;float hh=y<10.?8.0:8.6;vec2 blind=vec2(pair,y-bottom);c=apc6411Blind(c,blind,2.,hh);float fill=apc6411Arch(blind,1.83,hh-2.,1.85);vec3 rubble=vec3(.46,.44,.36)+fract(sin(dot(floor(vec2((x+mod(floor(y/.29),2.)*.17)/.34,y/.29)),vec2(27.4,9.7)))*4937.)*.07;c=mix(c,rubble,fill*.65);}
  if(y>=20.&&y<30.){c=apc6411Blind(c,vec2(pair,y-20.4),1.93,8.7);c=apc6411Opening(c,vec2(pair,y-22.7),.17,3.1,.19,0.);}
  c=apc6411Blind(c,vec2(pair,y-31.0),1.88,6.5);float twin=min(abs(pair-.56),abs(pair+.56));c=apc6411Opening(c,vec2(twin,y-32.),.43,4.35,.44,1.);c=apc6411Opening(c,vec2(min(abs(x-1.10),abs(x+1.10)),y-38.),.37,1.15,.40,0.);return c;}
vec3 apc6411ParentConch(vec3 c,vec3 world,vec3 normal){if(abs(normal.y)>.2)return c;float best=.35;vec2 canvas=vec2(0.);float width=0.;
 {vec2 raw=(world.xz-vec2(272.102708787358,-550.30116381163))/vec2(0.997630261813323,1.0008088574919);vec2 uv=vec2((0.*raw.x+1.*raw.y-(559.993609373666)),(-1.*raw.x+0.*raw.y-(250.619593282263)));float delta=abs(length(uv)-7.94476147136566);if(delta<best){best=delta;canvas=uv;width=15.8895229427313;}}
 {vec2 raw=(world.xz-vec2(272.14784517797,-550.299074054848))/vec2(0.997814123490898,1.00080868241194);vec2 uv=vec2((0.*raw.x+-1.*raw.y-(-538.917847618932)),(1.*raw.x+0.*raw.y-(-251.199326210206)));float delta=abs(length(uv)-7.93478974079099);if(delta<best){best=delta;canvas=uv;width=15.869579481582;}}
 {vec2 raw=(world.xz-vec2(272.259328035703,-550.337548958037))/vec2(0.998256963694862,1.00087797256686);vec2 uv=vec2((1.*raw.x+0.*raw.y-(-240.731604316775)),(0.*raw.x+1.*raw.y-(549.501125991204)));float delta=abs(length(uv)-7.94012184777721);if(delta<best){best=delta;canvas=uv;width=15.8802436955544;}}
 if(width>0.)return apc6411Legacy(c,vec3(0.,world.y,559.),normal,vec4(canvas,19.,width),4873.);return c;}
vec3 stApostelnComplete124(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 // Frozen vector attributes and original function body are never changed. Only its explicit neutral branches are completed.
 if(family==4875.)return apc6411Legacy(base,p,normal,frame,family);
 if(family==4873.){if(!(p.z>559.993609374&&p.y<8.))return apc6411Legacy(base,p,normal,frame,family);return apc6411Legacy(base,vec3(p.x,p.y,559.),normal,frame,family);}
 if(family==4874.){float mask=frame.z>35.?34.:(frame.z>32.?21.:(frame.z>28.?24.:22.));if(p.y>=mask)return apc6411Legacy(base,p,normal,frame,family);return apc6411LowTower(base,p,normal,frame);}
 if(abs(family-6411.)>.25)return base;
 float role=frame.z;vec2 q=frame.xy;float y=p.y;
 if(abs(role-1040.)<.2)return base*vec3(.87,.95,.91);if(abs(role-1041.)<.2)return vec3(.55,.51,.41);
 if(abs(role-1001.)<.2){float seam=max(apc6411Band(mod(q.x+.15*floor(q.y/.24),.32),.16,.008),apc6411Band(mod(q.y,.24),.12,.008));return vec3(.19,.21,.20)-seam*.025;}
 if(abs(role-1002.)<.2)return apc6411Legacy(base,p,normal,vec4(q,40.,frame.w),4875.);
 if(abs(role-1003.)<.2)return apc6411Legacy(base,vec3(p.x,y,559.),normal,vec4(q,19.,frame.w),4873.);
 vec3 c=apc6411Stone(vec2(q.x,y));
 if(abs(role-1004.)<.2){vec4 legacy=vec4(q,34.,frame.w);if(y>=21.)return apc6411Legacy(base,p,normal,legacy,4874.);return apc6411LowTower(base,p,normal,legacy);}
 if(abs(role-1005.)<.2){vec3 outc=y>=24.?apc6411Legacy(base,p,normal,vec4(q,30.,frame.w),4874.):apc6411LowTower(base,p,normal,vec4(q,30.,frame.w));if(normal.z>.8&&y<27.)outc=apc6411Opening(outc,vec2(q.x,y-23.1),1.45,3.5,1.45,0.);return outc;}
 if(abs(role-1006.)<.2){if(y>=34.)return apc6411Legacy(base,p,normal,vec4(q,35.4,frame.w),4874.);return c;}
 if(abs(role-1007.)<.2||abs(role-1017.)<.2){float xx=q.x-21.7;
  if(abs(role-1007.)<.2&&normal.z>.8&&y>22.){vec2 rose=vec2(xx,y-24.15);float rr=length(rose);float ring=apc6411Band(rr,1.94,.12);c=mix(c,vec3(.77,.73,.60),ring);float carved=0.;for(int i=0;i<8;i++){float a=float(i)*.785398163;carved=max(carved,1.-smoothstep(.29,.35,length(rose-.90*vec2(cos(a),sin(a)))));}c=mix(c,vec3(.46,.44,.36),carved*.7);c=mix(c,vec3(.77,.73,.60),apc6411Band(rr,.30,.08));for(int i=0;i<2;i++){float x=(float(i)-.5)*7.3;c=mix(c,vec3(.24,.25,.20),1.-smoothstep(.23,.28,length(vec2(xx-x,y-23.7))));}}
  if(abs(role-1017.)<.2&&normal.x>.8&&y>22.){float across=q.y+.1;for(int i=0;i<5;i++){float x=(float(i)-2.)*1.62;float h=4.15-abs(float(i)-2.)*.62;c=apc6411Blind(c,vec2(across-x,y-22.3),.55,h);}}return c;}
 if(abs(role-1008.)<.2||abs(role-1009.)<.2)return apc6411Nave(c,vec3(q.x,y,q.y),normal,abs(role-1009.)<.2?1.:0.);
 if(abs(role-1010.)<.2)return apc6411WestBody(c,q,y);
 if(abs(role-1011.)<.2){float pair=min(abs(q.x-1.35),abs(q.x+1.35));c=apc6411Opening(c,vec2(pair,q.y-1.2),.5,3.4,.50,1.);vec2 r=vec2(q.x,q.y-6.8);float rr=length(r);c=mix(c,vec3(.77,.73,.60),apc6411Band(rr,1.02,.15));float cut=0.;for(int i=0;i<4;i++){float a=float(i)*1.5707963268;cut=max(cut,1.-smoothstep(.38,.41,length(r-.38*vec2(cos(a),sin(a)))));}c=mix(c,vec3(.13,.15,.14),cut);c=mix(c,vec3(.13,.15,.14),1.-smoothstep(.16,.19,length(vec2(q.x,q.y-9.3))));return c;}
 if(abs(role-1012.)<.2){for(int i=0;i<2;i++){float yy=9.+float(i)*7.;c=apc6411Opening(c,vec2(q.x,y-yy),.10,1.15,.12,0.);}return c;}
 if(abs(role-1020.)<.2)return apc6411WestTransept(c,vec3(q.x,y,q.y),normal);
 if(abs(role-1030.)<.2){vec3 world=vec3(q.x,y,q.y);if(abs(normal.y)>.2)return c;if(world.x< -29.7&&abs(world.z+.055)<6.2){vec2 face=vec2(abs(normal.x)>.7?world.z+.055:world.x+34.865,y);return apc6411WestBody(c,face,y);}if(world.x< -10.3&&world.x> -25.6)return apc6411WestTransept(c,world,normal);if(world.x> -11.1&&world.x<16.7)return apc6411Nave(c,world,normal,1.);return apc6411ParentConch(c,world,normal);}
 return c;
}
`;
