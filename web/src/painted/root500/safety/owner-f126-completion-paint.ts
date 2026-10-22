export const F126_COMPLETION_GLSL=`float f126c6413Oldline(float x,float at,float w){return 1.-smoothstep(w,w+.035,abs(x-at));}
float f126c6413Oldbox(vec2 p,vec2 at,vec2 sz){vec2 a=1.-smoothstep(sz,sz+vec2(.035),abs(p-at));return a.x*a.y;}
float f126c6413Oldell(vec2 p,vec2 at,vec2 rad){return 1.-smoothstep(.96,1.04,length((p-at)/rad));}
float f126c6413Oldarch(vec2 p,float x,float lo,float spring,float w,float rise){return max(f126c6413Oldbox(p,vec2(x,(lo+spring)*.5),vec2(w,(spring-lo)*.5)),f126c6413Oldell(p,vec2(x,spring),vec2(w,rise))*step(spring,p.y));}
float f126c6413Oldpoint(vec2 p,float x,float lo,float spring,float w,float rise){float d=abs(p.x-x);float top=spring+rise*sqrt(max(0.,1.-d/w));return(1.-smoothstep(w,w+.035,d))*smoothstep(lo-.035,lo,p.y)*(1.-smoothstep(top,top+.035,p.y));}
vec3 f126c6413OldFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec2 q=vec2(frame.x,p.y);vec3 stone=vec3(.69,.66,.56),pale=vec3(.83,.80,.69),joint=vec3(.46,.44,.37),dark=vec3(.12,.15,.15),c=stone;
 if(family==4899.){vec2 s=frame.xy;float row=floor(s.y/.22);vec2 uv=vec2(fract((s.x+mod(row,2.)*.135)/.27),fract(s.y/.22));float seam=max(1.-smoothstep(.025,.08,min(uv.x,1.-uv.x)),1.-smoothstep(.035,.10,min(uv.y,1.-uv.y)));float grain=fract(sin(dot(floor(vec2(s.x/.27,row)),vec2(14.3,71.7)))*3751.3);return mix(vec3(.22,.23,.24)+vec3(.075)*grain,vec3(.13,.14,.15),seam*.50);}
 float cutoff=family==4898.?(frame.z>40.?28.:15.):(frame.z>30.?22.:(frame.z>25.?12.:(frame.w<20.?16.:10.)));if(p.y<cutoff)return base;
 float row=floor(p.y/.25);vec2 uv=vec2(fract((q.x+mod(row,2.)*.23)/.46),fract(p.y/.25));float seam=max(1.-smoothstep(.025,.075,min(uv.x,1.-uv.x)),1.-smoothstep(.035,.10,min(uv.y,1.-uv.y)));float grain=fract(sin(dot(floor(vec2(q.x/.46,row)),vec2(7.17,91.73)))*1315.27);c=stone+vec3(.065)*grain;c=mix(c,joint,seam*.42);
 if(family==4897.){
  if(frame.z>30.)return c; // OriginalEastgable exposedupperstone only; lowerface unregistered.
  if(frame.z<25.&&frame.w<20.){
   // Nativeeasternapse, photographednarrowdwarf-gallery; lowerbodyhiddenbytrees staysneutral.
   vec2 g=frame.xy;float a=atan(g.y,g.x);float along=a*frame.w*.5;float x=mod(along+.46,.92)-.46;float outArch=f126c6413Oldarch(vec2(x,p.y),0.,19.1,20.6,.36,.42);float opening=f126c6413Oldarch(vec2(x,p.y),0.,19.2,20.6,.25,.31);c=mix(c,pale,outArch);c=mix(c,dark,opening);c=mix(c,pale,f126c6413Oldline(x,.35,.055)*f126c6413Oldbox(vec2(x,p.y),vec2(0.,20.1),vec2(.46,1.05)));c=mix(c,pale,f126c6413Oldline(p.y,21.65,.13));c=mix(c,joint,f126c6413Oldline(p.y,18.84,.09));return c;
  }
  if(frame.z<25.){
   // Five visibleSouthuppernavebays, phase calibratedapproximately to originalnativewall width.
   float pitch=frame.w/5.;float x=mod(q.x+pitch*.5,pitch)-pitch*.5;float surround=f126c6413Oldarch(vec2(x,p.y),0.,11.1,18.8,1.03,1.27);float opening=f126c6413Oldarch(vec2(x,p.y),0.,11.25,18.8,.78,1.04);c=mix(c,pale,surround);c=mix(c,dark,opening);float grille=max(f126c6413Oldline(x,0.,.043),max(f126c6413Oldline(mod(p.y,.49),.245,.020),f126c6413Oldline(x,.38,.019)));c=mix(c,vec3(.45,.47,.42),grille*opening);float blind=f126c6413Oldarch(vec2(x,p.y),0.,10.8,18.8,1.31,1.57)-f126c6413Oldarch(vec2(x,p.y),0.,10.9,18.8,1.17,1.42);c=mix(c,joint,max(0.,blind)*.5);float tiny=mod(q.x+.42,.84)-.42;float arcade=f126c6413Oldarch(vec2(tiny,p.y),0.,20.8,21.35,.31,.29)-f126c6413Oldarch(vec2(tiny,p.y),0.,20.85,21.35,.24,.22);c=mix(c,joint,max(0.,arcade));c=mix(c,pale,f126c6413Oldline(p.y,21.85,.10));return c;
  }
  // OriginalSouthtransept gable: two slimpointedglazedwindows and small upperblindrecess/slits.
  if(p.y<21.){for(int i=0;i<2;i++){float x=(float(i)-.5)*frame.w*.48;float ar=f126c6413Oldpoint(q,x,12.4,18.0,.53,1.15);c=mix(c,pale,f126c6413Oldpoint(q,x,12.25,18.0,.69,1.34));c=mix(c,dark,ar);c=mix(c,vec3(.43,.46,.41),ar*max(f126c6413Oldline(q.x,x,.028),f126c6413Oldline(mod(p.y,.58),.29,.020)));}float x=mod(q.x+.39,.78)-.39;float b=f126c6413Oldarch(vec2(x,p.y),0.,20.1,20.5,.28,.25)-f126c6413Oldarch(vec2(x,p.y),0.,20.16,20.5,.21,.18);c=mix(c,joint,max(0.,b));}
  else{float panel=f126c6413Oldarch(q,0.,22.4,25.0,.70,.57)-f126c6413Oldarch(q,0.,22.5,25.0,.58,.46);c=mix(c,joint,max(0.,panel)*.50);for(int i=0;i<2;i++){float x=(float(i)-.5)*3.8;c=mix(c,dark,f126c6413Oldbox(q,vec2(x,23.55),vec2(.10,.72)));}}return c;
 }
 // Eastern twins and westernhigher tower have distinct openings; originalMDcompasserror never drives binding.
 float quoins=f126c6413Oldline(abs(q.x),frame.w*.46,.12);c=mix(c,pale,quoins*.65);
 if(frame.z<40.){
  for(int i=0;i<2;i++){float x=(float(i)-.5)*frame.w*.43;float w=frame.w*.145;
   float lower=f126c6413Oldarch(q,x,16.1,23.1,w,.95)-f126c6413Oldarch(q,x,16.27,23.1,w-.13,.82);c=mix(c,joint,max(0.,lower)*.7);c=mix(c,pale,f126c6413Oldline(q.x,x-w,.075)*f126c6413Oldbox(q,vec2(x,20.0),vec2(w+.12,3.65)));
   float outer=f126c6413Oldpoint(q,x,27.2,33.6,w,1.35);float inside=f126c6413Oldpoint(q,x,27.35,33.6,w-.16,1.13);c=mix(c,pale,max(0.,outer-inside));float win=f126c6413Oldarch(q,x,28.0,32.0,.34,.56);c=mix(c,dark,win);c=mix(c,joint,win*f126c6413Oldline(mod(p.y,.23),.115,.030));c=mix(c,pale,f126c6413Oldbox(q,vec2(x,27.1),vec2(w+.18,.09)));}
  for(int i=0;i<2;i++){float y=i==0?25.2:36.65;c=mix(c,joint,f126c6413Oldline(p.y,y,.11));c=mix(c,pale,f126c6413Oldline(p.y,y+.18,.10));}float x=mod(q.x+.41,.82)-.41;float b=f126c6413Oldarch(vec2(x,p.y),0.,35.8,36.15,.30,.28)-f126c6413Oldarch(vec2(x,p.y),0.,35.86,36.15,.23,.21);c=mix(c,joint,max(0.,b));return c;
 }
 // Westerntower pairedGothicbelfry, insetlouvres/tracery. Trueholes/finials are not synthesized.
 for(int i=0;i<2;i++){float x=(float(i)-.5)*frame.w*.44;float w=frame.w*.132;float ar=f126c6413Oldpoint(q,x,32.1,40.6,w,2.0);c=mix(c,pale,f126c6413Oldpoint(q,x,31.95,40.6,w+.16,2.20));c=mix(c,dark,ar);for(int j=0;j<2;j++){float sx=x+(float(j)-.5)*w*.95;float sub=f126c6413Oldpoint(q,sx,32.2,38.6,w*.35,1.05);c=mix(c,vec3(.25,.27,.24),sub);c=mix(c,vec3(.49,.48,.41),sub*f126c6413Oldline(mod(p.y,.27),.135,.034));c=mix(c,pale,f126c6413Oldline(q.x,sx+w*.39,.037)*ar);}float rose=f126c6413Oldell(q,vec2(x,40.15),vec2(w*.44,.61))-f126c6413Oldell(q,vec2(x,40.15),vec2(w*.31,.46));c=mix(c,pale,max(0.,rose)*ar);}
 c=mix(c,joint,f126c6413Oldline(p.y,31.6,.12));c=mix(c,pale,f126c6413Oldline(p.y,31.8,.12));c=mix(c,pale,f126c6413Oldline(p.y,43.65,.13));return c;
}
float f126c6413Line(float x,float period,float width){return 1.-smoothstep(width,width+max(fwidth(x),.015),abs(mod(x+period*.5,period)-period*.5));}
vec3 f126c6413Stone(vec2 q){float row=floor(q.y/.25);vec2 uv=vec2(fract((q.x+mod(row,2.)*.23)/.46),fract(q.y/.25));float seam=max(1.-smoothstep(.025,.075,min(uv.x,1.-uv.x)),1.-smoothstep(.035,.10,min(uv.y,1.-uv.y)));float grain=fract(sin(dot(floor(vec2(q.x/.46,row)),vec2(7.17,91.73)))*1315.27);return mix(vec3(.69,.66,.56)+vec3(.065)*grain,vec3(.46,.44,.37),seam*.42);}
vec3 f126c6413Glass(vec3 c,vec2 q,float x,float lo,float spring,float w,float rise,bool pointed){float a=pointed?f126c6413Oldpoint(q,x,lo-.15,spring,w+.15,rise+.15):f126c6413Oldarch(q,x,lo-.15,spring,w+.15,rise+.15);float b=pointed?f126c6413Oldpoint(q,x,lo,spring,w,rise):f126c6413Oldarch(q,x,lo,spring,w,rise);c=mix(c,vec3(.42,.41,.36),a);float bars=max(f126c6413Oldline(q.x,x,.035),f126c6413Line(q.y,.62,.023));return mix(c,mix(vec3(.11,.17,.21),vec3(.43,.45,.42),bars),b);}
vec3 f126c6413Apse(vec3 c,float u,float v,float y){float theta=atan(v+3.3046,u-28.3744);float along=theta*7.5;
 // Three directly visible east apsidal openings per storey. Other tree-obscured openings are not duplicated around the entire circle.
 for(int j=0;j<3;j++){float x=(float(j)-1.)*4.2;c=f126c6413Glass(c,vec2(along,y),x,8.35,14.1,.67,.88,false);c=f126c6413Glass(c,vec2(along,y),x,2.0,4.8,.42,.58,false);}
 c=mix(c,vec3(.78,.75,.65),max(f126c6413Oldline(y,7.1,.13),f126c6413Oldline(y,17.7,.14)));float pil=f126c6413Line(along+2.1,4.2,.13);c=mix(c,vec3(.73,.70,.60),pil*step(y,17.6));return c;
}
vec3 f126c6413Portal(vec3 c,vec2 q){
 float outer=f126c6413Oldpoint(q,0.,.1,4.4,2.25,2.5);c=mix(c,vec3(.44,.42,.36),outer);
 for(int k=0;k<3;k++){float inset=float(k)*.22;float ar=f126c6413Oldpoint(q,0.,.2,4.4,2.12-inset,2.32-inset)-f126c6413Oldpoint(q,0.,.2,4.4,1.98-inset,2.18-inset);c=mix(c,vec3(.76,.73,.64)-float(k)*.035,max(ar,0.));}
 float tym=f126c6413Oldpoint(q,0.,3.95,4.4,1.44,1.60);c=mix(c,vec3(.46,.44,.39),tym);
 // Bounded photographed relief silhouettes; faces, lettering and iconographic microdetail are not invented.
 for(int j=0;j<9;j++){float x=(float(j)-4.)*.30;float cy=4.40+.42*(1.-abs(x)/1.35);float person=max(f126c6413Oldell(q,vec2(x,cy+.34),vec2(.10,.12)),f126c6413Oldell(q,vec2(x,cy),vec2(.12,.29)));c=mix(c,vec3(.66,.63,.55),person*tym);}
 float door=f126c6413Oldbox(q,vec2(0.,1.95),vec2(1.36,1.86));vec3 bronze=vec3(.18,.25,.22);float joints=max(f126c6413Oldline(q.x,0.,.045),f126c6413Line(q.y-.13,.91,.045));bronze=mix(bronze,vec3(.33,.38,.30),joints);
 for(int col=0;col<2;col++)for(int row=0;row<4;row++){vec2 p=q-vec2((float(col)-.5)*1.34,.58+.91*float(row));float frame=f126c6413Oldbox(p,vec2(0.),vec2(.57,.36))-f126c6413Oldbox(p,vec2(0.),vec2(.50,.29));float relief=f126c6413Oldell(p,vec2(-.06,.03),vec2(.25,.19))*.30;c=mix(c,bronze+vec3(relief),door*f126c6413Oldbox(p,vec2(0.),vec2(.65,.44)));c=mix(c,vec3(.34,.39,.31),max(frame,0.)*door);}
 return c;
}
vec3 stKunibertComplete126(vec3 base,vec3 p,vec3 n,vec4 frame,float family){
 bool old=abs(family-4897.)<.25||abs(family-4898.)<.25||abs(family-4899.)<.25;
 float u=frame.x,v=frame.y,y=p.y;
 float ne=dot(n.xz,vec2(.942689654,-.333670821)),nn=dot(n.xz,vec2(.333670821,.942689654));
 if(old){vec3 c=f126c6413OldFacade(base,p,n,frame,family);if(abs(family-4899.)<.25)return c;float cutoff=family==4898.?(frame.z>40.?28.:15.):(frame.z>30.?22.:(frame.z>25.?12.:(frame.w<20.?16.:10.)));if(y<cutoff)c=f126c6413Stone(vec2(frame.x,y));if(abs(family-4897.)<.25&&frame.z<25.&&frame.w<20.&&y<18.){vec2 raw=frame.xy+vec2(227.73888736300998,-459.23888821072046);vec2 xz=vec2(dot(vec3(raw,1.),vec3(0.9978829977412663,0.000164750552797869,-201.52029001044235)),dot(vec3(raw,1.),vec3(6.336305962782083e-06,1.0009575366215921,447.1110860314903)));c=f126c6413Apse(c,dot(xz,vec2(.942689654,-.333670821)),dot(xz,vec2(.333670821,.942689654)),y);}return c;}
 if(abs(family-6413.)>.25)return base;float role=frame.z;vec3 c=f126c6413Stone(vec2(abs(ne)>.7?v:u,y));
 if(frame.w>.5&&n.y>.02){if(abs(role-3.)<.25){float seam=max(f126c6413Line(u,.6,.008),f126c6413Line(v,.8,.008));return mix(vec3(.30,.38,.33),vec3(.22,.29,.25),seam*.4);}return f126c6413OldFacade(base,p,n,vec4(frame.xy,54.,1.),4899.);}
 if(abs(role-10.)<.25){float slat=f126c6413Line(y,.22,.038);return mix(vec3(.16,.18,.18),vec3(.32,.34,.33),slat);}
 if(abs(role-5.)<.25){if(y>=19.)return f126c6413OldFacade(base,p,n,vec4(vec2(u*.942689654+v*.333670821,-u*.333670821+v*.942689654)-vec2(25.644,-12.591),22.,15.00668),4897.);return f126c6413Apse(c,u,v,y);}
 if(abs(role-3.)<.25||abs(role-8.)<.25||abs(role-9.)<.25){bool west=role<4.;float center=west?-23.49456:22.908;float vc=west?-3.2501:role<8.5?5.1486:-11.711;float along=abs(ne)>.7?v-vc:u-center;float width=abs(ne)>.7?(west?13.10:8.77):(west?13.18:10.90);float cutoff=west?28.:15.;if(y>=cutoff)return f126c6413OldFacade(base,p,n,vec4(along,0.,west?44.:37.,width),4898.);return c;}
 // Five directly photographed northern clerestory openings; accepted southern program is separately replayed unchanged.
 if(abs(role-7.)<.25&&abs(nn)>.7){if(y>=10.)return f126c6413OldFacade(base,p,n,vec4(u-5.694,0.,22.,45.39816),4897.);}
 // West transept: photographed north pair and gable. South old program remains byte-exact in its accepted surface frames.
 if(abs(role-6.)<.25&&abs(nn)>.7){float x=u+23.4828;if(y>=12.)return f126c6413OldFacade(base,p,n,vec4(x,0.,28.,14.01583),4897.);for(int j=0;j<2;j++)c=f126c6413Glass(c,vec2(x,y),(float(j)-.5)*6.65,2.0,6.2,.43,.95,true);return c;}
 // Only the west-facing crossbar receives the source-registered principal portal and observed high roundheads.
 if(abs(role-6.)<.25&&ne<-.7){float z=v+3.25;if(abs(z)<3.0)c=f126c6413Portal(c,vec2(z,y));for(int j=0;j<3;j++){float x=(float(j)-1.)*7.8;float spring=j==1?17.5:18.4;c=f126c6413Glass(c,vec2(z,y),x,10.2,spring,.80,1.12,false);}float fringe=f126c6413Oldarch(vec2(mod(z+.42,.84)-.42,y),0.,20.0,20.5,.31,.28)-f126c6413Oldarch(vec2(mod(z+.42,.84)-.42,y),0.,20.06,20.5,.23,.20);c=mix(c,vec3(.45,.43,.37),max(fringe,0.));return c;}
 // Two unoccluded eight-lobed north aisle lights are registered individually, never repeated through photo-obscured bays.
 if((abs(role-1.)<.25||abs(role-2.)<.25)&&nn>.7&&v>8.){for(int j=0;j<2;j++){float x=j==0?2.1:10.8;vec2 q=vec2(u-x,y-4.55);float radius=length(q),a=atan(q.y,q.x),edge=1.02+.19*cos(8.*a);float ring=1.-smoothstep(edge,edge+.045,radius),inside=1.-smoothstep(edge-.14,edge-.09,radius);c=mix(c,vec3(.81,.78,.68),ring);c=mix(c,mix(vec3(.15,.21,.23),vec3(.47,.48,.41),max(f126c6413Oldline(q.x,0.,.03),f126c6413Oldline(q.y,0.,.03))),inside);}}
 return c;
}
`;
