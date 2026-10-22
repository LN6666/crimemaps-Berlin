export const F122_COMPLETION_GLSL=`// StAndreas originalCologneTourism photo. Opaque paint on exact originalnative triangles.
float f122c6409OldBox(vec2 q,vec2 h){vec2 d=abs(q)-h;return 1.0-smoothstep(0.0,max(fwidth(q.x),fwidth(q.y))*1.2,max(d.x,d.y));}
float f122c6409OldRound(vec2 q,vec2 h){float v=max(abs(q.x)/h.x,(q.y>0.0?length(vec2(q.x/h.x,q.y/h.x)):abs(q.y)/h.y));return 1.0-smoothstep(1.0,1.025,v);}
float f122c6409OldPoint(vec2 q,vec2 h){float top=h.y*(1.0-0.38*abs(q.x)/h.x);float d=max(abs(q.x)-h.x,max(-q.y-h.y,q.y-top));return 1.0-smoothstep(0.0,0.055,d);}
float f122c6409OldLine(float q,float stepM,float widthM){float d=abs(mod(q+stepM*.5,stepM)-stepM*.5);return 1.0-smoothstep(widthM*.5,widthM*.5+max(fwidth(q),.012),d);}
vec3 f122c6409OldStone(vec2 q){vec3 c=vec3(.67,.64,.52);float row=floor(q.y/.36);float j=max(f122c6409OldLine(q.y,.36,.018),f122c6409OldLine(q.x+mod(row,2.0)*.36,.72,.014));return mix(c,vec3(.53,.51,.43),j*.24);}
vec3 f122c6409OldWindow(vec3 c,vec2 q,vec2 h,bool pointed){float a=pointed?f122c6409OldPoint(q,h):f122c6409OldRound(q,h);float b=pointed?f122c6409OldPoint(q,h-vec2(.13,.16)):f122c6409OldRound(q,h-vec2(.13,.16));c=mix(c,vec3(.77,.74,.63),a);c=mix(c,vec3(.16,.18,.17),b);float bars=max(f122c6409OldLine(q.x,.43,.065),f122c6409OldLine(q.y,1.1,.05));return mix(c,vec3(.55,.55,.48),b*bars*.9);}
vec3 f122c6409OldFacade(vec3 base,vec3 p,vec3 n,vec4 frame,float family){
 vec2 q=frame.xy;float y=p.y;
 if(family==4869.0){
  float code=q.x<150.0?100.0:q.x<250.0?200.0:q.x<310.0?300.0:q.x<330.0?320.0:q.x<370.0?340.0:400.0;float u=q.x-code;
  if(code<250.0){
   if(y<22.0)return base;vec3 c=f122c6409OldStone(vec2(u,y));
   c=mix(c,vec3(.79,.75,.63),max(f122c6409OldBox(vec2(u,y-26.7),vec2(4.0,.17)),f122c6409OldBox(vec2(u,y-34.5),vec2(4.0,.19))));
   // Narrow paired round-headed toweropenings, each on its exact exposed octagonalface.
   for(int i=0;i<2;i++){float x=i==0?-.53:.53;c=f122c6409OldWindow(c,vec2(u-x,y-30.2),vec2(.38,2.0),false);}
   c=f122c6409OldWindow(c,vec2(u,y-24.0),vec2(.55,1.0),false);
   float ar=f122c6409OldRound(vec2(mod(u+.25,.50)-.25,y-33.7),vec2(.18,.29));c=mix(c,vec3(.51,.49,.41),ar*.65);
   c=mix(c,vec3(.72,.68,.56),max(f122c6409OldBox(vec2(u+2.0,y-30.1),vec2(.10,3.7)),f122c6409OldBox(vec2(u-2.0,y-30.1),vec2(.10,3.7))));return c;
  }
  if(y<7.5)return base;vec3 c=f122c6409OldStone(vec2(u,y));
  if(code<370.0){
   // Three individual Southapse facets, one photographed tallwindow each.
   c=f122c6409OldWindow(c,vec2(u,y-13.5),vec2(1.28,5.4),true);
   float trac=f122c6409OldRound(vec2(u,y-17.2),vec2(.73,.73))-f122c6409OldRound(vec2(u,y-17.2),vec2(.59,.59));c=mix(c,vec3(.70,.67,.57),clamp(trac,0.0,1.0));
   c=mix(c,vec3(.74,.70,.59),max(f122c6409OldBox(vec2(u-frame.w*.47,y-13.6),vec2(.16,6.3)),f122c6409OldBox(vec2(u+frame.w*.47,y-13.6),vec2(.16,6.3))));
  }else{
   // EastchoirSouth's three visible bays. Width derives solely from originalnative endpoints.
   float stepM=frame.w/3.0;
   for(int i=0;i<3;i++){float x=(float(i)-1.0)*stepM;c=f122c6409OldWindow(c,vec2(u-x,y-13.2),vec2(stepM*.27,5.9),true);float ring=f122c6409OldRound(vec2(u-x,y-17.6),vec2(.90,.90))-f122c6409OldRound(vec2(u-x,y-17.6),vec2(.75,.75));c=mix(c,vec3(.76,.72,.61),clamp(ring,0.0,1.0));c=mix(c,vec3(.73,.69,.57),f122c6409OldBox(vec2(u-(x+stepM*.46),y-13.8),vec2(.18,6.2)));}
  }
  c=mix(c,vec3(.76,.72,.60),f122c6409OldBox(vec2(u,y-19.7),vec2(frame.w*.51,.18)));return c;
 }
 if(family==4872.0){
  float code=q.x<610.0?600.0:q.x<630.0?620.0:q.x<650.0?640.0:q.x<750.0?700.0:800.0;float u=q.x-code;
  vec3 c=vec3(.23,.22,.21)*(.83+.20*n.y+.06*n.x);float lines=max(f122c6409OldLine(y,.30,.012),f122c6409OldLine(u+mod(floor(y/.3),2.0)*.18,.36,.01));c=mix(c,vec3(.14,.14,.14),lines*.18);
  if(code<650.0){
   // Visible stonegabled basewindow painted on existingpyramid; no newturretgeometry.
   vec2 z=vec2(u,y-36.4);c=mix(c,vec3(.74,.69,.55),f122c6409OldPoint(z,vec2(.91,1.55)));c=mix(c,vec3(.14,.15,.14),f122c6409OldRound(z-vec2(0,.1),vec2(.30,.63)));
  }
  return c;
 }
 return base;
}

float f122c6409Box(vec2 q,vec2 h){vec2 d=abs(q)-h;return 1.-smoothstep(0.,max(max(fwidth(q.x),fwidth(q.y)),.015),max(d.x,d.y));}
float f122c6409Round(vec2 q,vec2 h){float aa=max(max(fwidth(q.x),fwidth(q.y)),.012);float d=max(abs(q.x)-h.x,max(-q.y-h.y,q.y>0.?length(vec2(q.x,q.y*h.x/h.y))-h.x:-h.x));return 1.-smoothstep(0.,aa,d);}
float f122c6409Point(vec2 q,vec2 h){float d=max(abs(q.x)-h.x,max(-q.y-h.y,q.y-h.y*(1.-.38*abs(q.x)/h.x)));return 1.-smoothstep(0.,max(fwidth(q.x),.02),d);}
float f122c6409Line(float x,float s,float w){float d=abs(mod(x+s*.5,s)-s*.5);return 1.-smoothstep(w,w+max(fwidth(x),.01),d);}
vec3 f122c6409Stone(vec2 q){float row=floor(q.y/.36);float joint=max(f122c6409Line(q.y,.36,.009),f122c6409Line(q.x+mod(row,2.)*.36,.72,.008));return mix(vec3(.67,.64,.52),vec3(.53,.51,.43),joint*.24);}
vec3 f122c6409Window(vec3 c,vec2 q,vec2 h,bool pointHead,float lights){float a=pointHead?f122c6409Point(q,h):f122c6409Round(q,h),b=pointHead?f122c6409Point(q,h-vec2(.14,.18)):f122c6409Round(q,h-vec2(.14,.18));c=mix(c,vec3(.77,.74,.63),a);vec3 glass=vec3(.15,.19,.20);float mull=0.;for(int j=1;j<4;j++){if(float(j)>=lights)break;mull=max(mull,f122c6409Box(vec2(q.x-(-h.x+2.*h.x*float(j)/lights),0.),vec2(.045,100.)));}float trans=f122c6409Line(q.y,1.1,.025);return mix(c,mix(glass,vec3(.61,.61,.53),max(mull,trans)),b);}
vec3 stAndreasComplete122(vec3 base,vec3 p,vec3 n,vec4 frame,float family){
 if(abs(family-4869.)<.25||abs(family-4872.)<.25){vec3 c=f122c6409OldFacade(base,p,n,frame,family);if(abs(family-4869.)<.25){bool tower=frame.x<250.;if(p.y<(tower?22.:7.5))c=f122c6409Stone(vec2(frame.x,p.y));}return c;}
 if(abs(family-6409.)>.25)return base;float x=frame.x,z=frame.y,y=p.y,role=frame.z;vec3 c=f122c6409Stone(vec2(abs(n.x)>.7?z:x,y));
 if(frame.w>.5&&n.y>.03){float seam=max(f122c6409Line(y,.30,.006),f122c6409Line(x+z+mod(floor(y/.30),2.)*.18,.36,.005));return mix(vec3(.24,.24,.23)*(.83+.20*n.y+.06*n.x),vec3(.14,.14,.14),seam*.18);}
 if(abs(role-12.)<.25)return vec3(.23,.43,.33)*(.82+.18*abs(n.y));
 // West front as directly photographed: two side doors, four-lobed low centre light, three upper arches and six-lobed rose, blind arcades and three gable recesses.
 if(n.x<-.7&&x< -25.){
  float zz=z+.7;
  c=mix(c,vec3(.76,.73,.64),max(f122c6409Line(zz-5.,5.2,.12),f122c6409Box(vec2(0.,y-5.),vec2(100.,.13))));
  if(abs(zz)<5.2){
   float four=0.;for(int i=0;i<4;i++){float a=1.5707963*float(i);four=max(four,f122c6409Round(vec2(zz,y-2.7)-.52*vec2(cos(a),sin(a)),vec2(.58,.58)));}c=mix(c,vec3(.74,.72,.61),four);float fr=0.;for(int i=0;i<4;i++){float a=1.5707963*float(i);fr=max(fr,f122c6409Round(vec2(zz,y-2.7)-.5*vec2(cos(a),sin(a)),vec2(.46,.46)));}c=mix(c,vec3(.16,.20,.21),fr);
   for(int i=0;i<3;i++){float u=(float(i)-1.)*3.1;c=f122c6409Window(c,vec2(zz-u,y-9.3),vec2(1.1,2.45),false,2.);}
   for(int i=0;i<2;i++){float u=i==0?-2.9:2.9;c=f122c6409Window(c,vec2(zz-u,y-2.8),vec2(.53,1.0),false,1.);}
   vec2 rq=vec2(zz,y-14.3);float rose=0.;for(int i=0;i<6;i++){float a=1.04719755*float(i);rose=max(rose,f122c6409Round(rq-.86*vec2(cos(a),sin(a)),vec2(.75,.75)));}c=mix(c,vec3(.77,.74,.65),rose);float inner=0.;for(int i=0;i<6;i++){float a=1.04719755*float(i);inner=max(inner,f122c6409Round(rq-.84*vec2(cos(a),sin(a)),vec2(.62,.62)));}vec3 roseGlass=mix(vec3(.15,.22,.28),vec3(.62,.63,.58),f122c6409Line(length(rq),.75,.025));c=mix(c,roseGlass,inner);
   for(int i=0;i<3;i++){float u=(float(i)-1.)*2.7,cy=i==1?21.1:19.9;float a=f122c6409Round(vec2(zz-u,y-cy),vec2(.86,1.3));float b=f122c6409Round(vec2(zz-u,y-cy),vec2(.74,1.17));c=mix(c,vec3(.58,.56,.47),a);c=mix(c,vec3(.70,.67,.56),b);}c=mix(c,vec3(.20,.19,.17),f122c6409Box(vec2(zz,y-20.1),vec2(.38,.65)));
   c=mix(c,vec3(.75,.72,.61),max(f122c6409Box(vec2(0.,y-12.0),vec2(5.,.12)),f122c6409Box(vec2(0.,y-17.7),vec2(5.,.14))));
  }else{
   float side=zz<0.?-8.4:8.4;c=f122c6409Window(c,vec2(zz-side,y-2.05),vec2(1.5,1.95),false,1.);c=mix(c,vec3(.17,.16,.14),f122c6409Round(vec2(zz-side,y-1.8),vec2(1.16,1.65)));for(int j=0;j<2;j++)c=f122c6409Window(c,vec2(zz-side-(float(j)-.5)*2.9,y-13.35),vec2(.72,1.30),false,1.);
  }
  float fringe=f122c6409Round(vec2(mod(zz+.55,1.1)-.55,y-(abs(zz)<5.2?16.7:16.0)),vec2(.42,.38));c=mix(c,vec3(.49,.48,.41),fringe*.7);return c;
 }
 // Two nave bays, each with three round-headed clerestory openings (explicit primary architectural text), with lower chapel openings left unguessed where obscured.
 if(abs(role-3.)<.25&&abs(n.z)>.7&&x> -24.){for(int b=0;b<2;b++)for(int j=0;j<3;j++){float xx=-17.4+10.9*float(b)+(float(j)-1.)*1.8;c=f122c6409Window(c,vec2(x-xx,y-15.5),vec2(.62,1.45),false,1.);}c=mix(c,vec3(.76,.72,.61),f122c6409Box(vec2(0.,y-17.7),vec2(100.,.12)));}
 if(abs(role-2.)<.25&&y>=22.){float u=dot(vec2(x+.5,z+.65),vec2(n.z,-n.x));for(int j=0;j<2;j++)c=f122c6409Window(c,vec2(u-(j==0?-.53:.53),y-30.2),vec2(.38,2.),false,1.);c=f122c6409Window(c,vec2(u,y-24.),vec2(.55,1.),false,1.);c=mix(c,vec3(.79,.75,.63),max(f122c6409Box(vec2(0.,y-26.7),vec2(100.,.17)),f122c6409Box(vec2(0.,y-34.5),vec2(100.,.19))));}
 if(role>=6.5&&role<=9.5&&abs(n.y)<.1){vec2 center=role<7.5?vec2(0.,-13.1):role<8.5?vec2(0.,11.5):vec2(24.3,-.45);float u=dot(vec2(x,z)-center,vec2(n.z,-n.x));c=f122c6409Window(c,vec2(u,y-13.45),vec2(role>8.5?1.45:1.35,5.45),true,role<7.5?3.:2.);float rosette=f122c6409Round(vec2(u,y-17.2),vec2(.70,.70))-f122c6409Round(vec2(u,y-17.2),vec2(.56,.56));c=mix(c,vec3(.72,.69,.59),clamp(rosette,0.,1.));c=mix(c,vec3(.76,.72,.61),f122c6409Box(vec2(0.,y-19.7),vec2(100.,.18)));}
 if(abs(role-10.)<.25&&abs(n.z)>.7){for(int j=0;j<3;j++)c=f122c6409Window(c,vec2(x-(4.+8.*float(j)),y-13.2),vec2(2.15,5.9),true,2.);c=mix(c,vec3(.76,.72,.61),f122c6409Box(vec2(0.,y-19.7),vec2(100.,.18)));}
 if(abs(role-11.)<.25){c=mix(c,vec3(.54,.54,.50),.6);float joint=max(f122c6409Line(y,.5,.012),f122c6409Line(x+z,1.,.012));c=mix(c,vec3(.43,.44,.41),joint*.18);c=mix(c,vec3(.72,.69,.60),max(f122c6409Box(vec2(0.,y-12.4),vec2(100.,.10)),f122c6409Box(vec2(0.,y-19.8),vec2(100.,.15))));}
 return c;
}
`;
