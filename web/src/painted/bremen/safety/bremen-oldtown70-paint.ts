export const BREMEN_OLDTOWN70_GLSL=`
float b70Stroke(float d,float w){float a=max(fwidth(d),.012);return 1.-smoothstep(max(0.,w-a*.5),w+a*.5,abs(d));}
float b70Band(float y,float c,float h){return b70Stroke(y-c,h);}
float b70Repeat(float x,float pitch,float w){float a=max(fwidth(x)/pitch,.00001),h=w/pitch,d=abs(fract(x/pitch)-.5);float k=1.-smoothstep(max(0.,h-a*.5),h+a*.5,d);return mix(k,clamp(2.*h,0.,1.),smoothstep(.2,.7,a));}
float b70Box(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.015));vec2 q=1.-smoothstep(h-a*.5,h+a*.5,abs(p-c));return q.x*q.y;}
float b70Arch(vec2 p,vec2 c,float w,float stem,float rise){vec2 q=p-c;float top=stem+rise*sqrt(max(0.,1.-q.x*q.x/(w*w)));float d=max(abs(q.x)-w,max(-q.y,q.y-top));return 1.-smoothstep(-max(fwidth(d),.012),max(fwidth(d),.012),d);}
vec3 b70Window(vec3 base,vec2 uv,vec2 c,vec2 h,vec3 trim){float outer=b70Box(uv,c,h+vec2(.10,.10)),glass=b70Box(uv,c,h);vec2 q=uv-c;float bars=max(b70Stroke(q.x,.035),max(b70Stroke(q.y,.032),b70Stroke(abs(q.y)-h.y*.52,.023)));vec3 pane=mix(vec3(.15,.20,.21),trim,bars*.96);base=mix(base,trim*.91,outer);return mix(base,pane,glass);}
vec3 b70Door(vec3 base,vec2 uv,float x,float width,float h,vec3 trim){float a=b70Arch(uv,vec2(x,0.),width,h-width*.55,width*.55),rim=b70Arch(uv,vec2(x,-.10),width+.17,h-width*.55+.10,width*.55+.14)-a;vec3 timber=vec3(.20,.15,.11)*(1.-.14*b70Repeat(uv.x,.27,.014));base=mix(base,trim,max(0.,rim));return mix(base,timber,a);}
vec3 b70Brick(vec3 c,vec2 uv,float scale){float row=b70Repeat(uv.y,.075*scale,.005*scale),joint=b70Repeat(uv.x+floor(uv.y/(.075*scale))*.12*scale,.24*scale,.005*scale);return c*(1.-max(row,joint)*.12);}
vec3 b70Stone(vec3 c,vec2 uv){float row=b70Repeat(uv.y,.58,.009),joint=b70Repeat(uv.x+floor(uv.y/.58)*.66,1.32,.009);return c*(1.-.065*max(row,joint));}
float b70Scroll(vec2 q,float r){float d=length(q)-r*(.83+.12*sin(atan(q.y,q.x)*3.));return b70Stroke(d,.034);}

vec3 infillBremenOldtown70Paint(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 float u=f.x,y=f.y,W=max(f.w,.5),x=u/W;vec3 c=base;
 // Real facade spans are registered to the official wall, independent of footprint depth.
 if(family==46100.){y=y<=5.524?y*7.5/5.524:y<=13.132?7.5+(y-5.524)*7.5/(13.132-5.524):15.+(y-13.132)*9.5/(20.62-13.132);}
 if(family==46110.){y=y<=11.59?y*15./11.59:15.+(y-11.59)*9./7.5;}
 if(family==46120.&&y>14.971)y=15.+(y-14.971)*8./6.1;
 vec2 uv=vec2(u,y);
 // Every roof has a separate family. Analytic coverage fades to its average at distance.
 if(family==46101.||family==46111.||family==46121.||family==46131.||family==46141.||family==46151.){
  if(family==46151.){float seam=b70Repeat(u,.57,.018);return c*(1.-seam*.13);}
  if(family==46141.){float row=b70Repeat(y,.28,.015),joint=b70Repeat(u+floor(y/.28)*.18,.38,.010);return c*(1.-.13*max(row,joint));}
  float row=b70Repeat(y,.25,.011),joint=b70Repeat(u+floor(y/.25)*.105,.21,.009);return c*(1.-.105*max(row,joint));
 }
 if(family==46102.||family==46112.||family==46132.||family==46142.||family==46152.)return b70Brick(c,uv,1.2);
 if(family==46122.)return b70Stone(c,uv);

 if(family==46100.){
  vec3 trim=vec3(.73,.71,.63);c=b70Brick(c,uv,1.2);
  float string=max(b70Band(y,3.9,.09),max(b70Band(y,7.5,.11),max(b70Band(y,11.6,.09),b70Band(y,15.,.12))));c=mix(c,trim,string*.91);
  float corner=max(b70Box(uv,vec2(W*.035,9.),vec2(.12,8.5)),b70Box(uv,vec2(W*.965,9.),vec2(.12,8.5)));c=mix(c,trim,corner*.8);
  // Lower paired projecting bays are source-footprint features; each upper light has its own aperture.
  for(int k=0;k<4;k++){float q=(float(k)+.5)*W*.178+W*.07;c=b70Window(c,uv,vec2(q,2.05),vec2(W*.071,1.31),trim);c=b70Window(c,uv,vec2(q,5.75),vec2(W*.071,1.29),trim);}
  c=b70Door(c,uv,W*.505,W*.048,3.15,trim);
  float passage=b70Arch(uv,vec2(W*.91,0.),W*.067,2.8,1.05);c=mix(c,vec3(.075,.083,.078),passage);
  for(int k=0;k<11;k++)c=b70Window(c,uv,vec2(W*(.09+float(k)*.073),9.48),vec2(W*.025,1.54),trim);
  for(int k=0;k<4;k++)c=b70Window(c,uv,vec2(W*(.17+float(k)*.205),13.3),vec2(W*.064,.99),trim);
  for(int k=0;k<3;k++)c=b70Window(c,uv,vec2(W*(.29+float(k)*.205),17.4),vec2(W*.052,.82),trim);
  c=b70Window(c,uv,vec2(W*.5,20.5),vec2(W*.065,.72),trim);
  float roundel=1.-smoothstep(.28,.32,length(uv-vec2(W*.5,23.1)));c=mix(c,vec3(.16,.18,.16),roundel);
  float relief=b70Box(uv,vec2(W*.5,15.7),vec2(W*.18,.37));float carving=b70Scroll(uv-vec2(W*.5,15.7),.32);c=mix(c,trim,relief*.62);c*=1.-carving*relief*.22;
  // Solid inscription field, no invented readable lettering and no glass.
  float panel=b70Box(uv,vec2(W*.91,9.4),vec2(W*.067,3.0));c=mix(c,vec3(.25,.21,.17),panel*.87);
  return c;
 }
 if(family==46110.){
  vec3 trim=vec3(.84,.83,.76);c=b70Stone(c,uv);
  float bands=max(b70Band(y,4.0,.085),max(b70Band(y,9.2,.075),max(b70Band(y,13.9,.09),b70Band(y,15.1,.13))));c=mix(c,trim*.85,bands);
  // Six independently framed narrow lights in each broad glazed tier.
  for(int k=0;k<6;k++){float z=W*(.105+float(k)*.158);c=b70Window(c,uv,vec2(z,6.8),vec2(W*.060,1.68),trim);c=b70Window(c,uv,vec2(z,11.85),vec2(W*.060,1.35),trim);}
  float frieze=b70Box(uv,vec2(W*.5,9.55),vec2(W*.47,.45));float relief=b70Repeat(u,.78,.018)*b70Box(uv,vec2(W*.5,9.55),vec2(W*.43,.26));c=mix(c,vec3(.62,.61,.54),frieze*.5);c=mix(c,trim,relief*.58);
  float parapet=b70Box(uv,vec2(W*.5,14.75),vec2(W*.47,.42));c=mix(c,vec3(.40,.48,.44)*(1.-.14*b70Repeat(u,.57,.025)),parapet);
  c=b70Door(c,uv,W*.19,W*.11,3.75,vec3(.76,.73,.63));
  for(int k=0;k<3;k++)c=b70Window(c,uv,vec2(W*(.54+float(k)*.16),1.9),vec2(W*.060,1.45),trim);
  for(int k=0;k<3;k++)c=b70Window(c,uv,vec2(W*(.29+float(k)*.21),17.0),vec2(W*.052,.80),trim);
  c=b70Window(c,uv,vec2(W*.5,20.6),vec2(W*.037,.92),trim);
  return c;
 }
 if(family==46120.){
  vec3 trim=vec3(.80,.77,.67);c=b70Stone(c,uv);
  float bands=max(b70Band(y,4.15,.10),max(b70Band(y,7.9,.10),max(b70Band(y,11.65,.10),b70Band(y,15.0,.11))));c=mix(c,trim*.90,bands);
  for(int j=0;j<2;j++)for(int k=0;k<5;k++){float z=W*(.105+float(k)*.194);if(abs(z-W*.42)>W*.11)c=b70Window(c,uv,vec2(z,5.9+float(j)*3.75),vec2(W*.055,1.18),trim);}
  // Two-storey oriel: narrow front lights and restrained carved solid spandrels.
  float erker=b70Box(uv,vec2(W*.42,7.8),vec2(W*.11,3.9));c=mix(c,trim*.84,erker*.65);
  for(int j=0;j<2;j++)for(int k=0;k<3;k++)c=b70Window(c,uv,vec2(W*(.355+float(k)*.065),5.95+float(j)*3.75),vec2(W*.024,1.18),trim);
  float spandrel=b70Box(uv,vec2(W*.42,7.85),vec2(W*.095,.40));c=mix(c,vec3(.64,.56,.40),spandrel*.62);
  for(int j=0;j<2;j++)for(int k=0;k<3;k++)c=b70Window(c,uv,vec2(W*(.11+float(j)*.51+float(k)*.12),16.6),vec2(W*.035,.79),trim);
  for(int j=0;j<2;j++)for(int k=0;k<2;k++)c=b70Window(c,uv,vec2(W*(.19+float(j)*.51+float(k)*.11),19.7),vec2(W*.035,.72),trim);
  float roundel=1.-smoothstep(.20,.24,length(uv-vec2(W*.25,22.05)));c=mix(c,vec3(.22,.23,.20),roundel);
  vec2 dial=uv-vec2(W*.755,21.1);float disc=1.-smoothstep(.53,.58,length(dial));float rays=b70Stroke(sin(atan(dial.y,dial.x)*8.)*.4,.025);c=mix(c,mix(trim,vec3(.62,.52,.26),rays*.5),disc);
  c=b70Door(c,uv,W*.62,W*.080,3.8,trim);
  for(int k=0;k<4;k++)c=b70Window(c,uv,vec2(W*(.11+float(k)*.20),1.8),vec2(W*.055,1.14),trim);
  return c;
 }
 if(family==46130.){
  // Five photographed registers, not the prior six-storey extrapolation.
  vec3 trim=vec3(.84,.82,.72),gold=vec3(.70,.58,.31);c=b70Stone(c,uv);
  float bands=max(b70Band(y,4.25,.085),max(b70Band(y,7.65,.09),max(b70Band(y,10.58,.09),max(b70Band(y,13.16,.085),b70Band(y,16.22,.075)))));c=mix(c,trim*.85,bands);
  for(int j=0;j<3;j++)for(int k=0;k<3;k++){
   float yy=j==0?5.92:j==1?9.13:11.90;float z=W*(.19+float(k)*.31);float hh=j==0?1.18:j==1?.87:.68;
   c=b70Window(c,uv,vec2(z,yy),vec2(W*(j==2?.070:.080),hh),trim);
   float crown=b70Stroke(y-yy-hh-.24-.095*cos((u-z)/(W*.09)*3.),.035)*b70Box(uv,vec2(z,yy+hh+.24),vec2(W*.104,.17));c=mix(c,gold,crown*.66);
  }
  c=b70Window(c,uv,vec2(W*.5,14.82),vec2(W*.095,.69),trim);
  for(int k=0;k<4;k++)c=b70Window(c,uv,vec2(W*(.10+float(k)*.264),2.27),vec2(W*.077,1.36),trim);
  c=b70Door(c,uv,W*.50,W*.084,3.63,trim);
  float transom=b70Box(uv,vec2(W*.50,3.68),vec2(W*.092,.48));float tracery=max(b70Scroll(uv-vec2(W*.48,3.68),.28),b70Scroll(uv-vec2(W*.52,3.68),.28));c=mix(c,vec3(.12,.16,.15),transom);c=mix(c,trim,tracery*transom);
  for(int j=0;j<3;j++){float yy=10.92+float(j)*2.67;for(int k=0;k<2;k++){vec2 q=uv-vec2(W*(k==0?.11:.89),yy);c=mix(c,trim,b70Scroll(q,.30)*.76);}}
  float relief=b70Repeat(u,W*.31,.023)*step(4.5,y)*step(y,10.3);c=mix(c,trim,relief*.38);
  return c;
 }
 if(family==46140.||family==46144.){
  vec3 trim=vec3(.83,.83,.75),wood=vec3(.25,.40,.37);c=b70Brick(c,uv,1.2);
  if(family==46144.){float timber=max(b70Repeat(u,1.20,.080),max(b70Band(y,2.7,.09),max(b70Band(y,5.55,.09),b70Band(y,7.1,.10))));float brace=b70Stroke(mod(u+y*.85+1.,2.4)-1.2,.06)*step(2.7,y)*step(y,3.7);c=mix(c,wood,max(timber,brace));}
  for(int k=0;k<3;k++){float z=W*(.17+float(k)*.29);c=b70Window(c,uv,vec2(z,4.25),vec2(W*.071,.91),trim);}
  if(family==46140.){
   for(int k=0;k<3;k++)c=b70Window(c,uv,vec2(W*(.18+float(k)*.24),1.25),vec2(W*.098,.92),vec3(.49,.34,.21));
   c=b70Door(c,uv,W*.88,W*.055,2.8,vec3(.70,.67,.56));
   c=b70Window(c,uv,vec2(W*.52,8.05),vec2(W*.047,.51),trim);
  }
  if(family==46144.){for(int k=0;k<2;k++)c=b70Window(c,uv,vec2(W*(.30+float(k)*.26),6.45),vec2(W*.065,.55),trim);}
  float shutter=b70Box(uv,vec2(W*.52,9.0),vec2(W*.085,.65));c=mix(c,vec3(.24,.43,.49),shutter);
  return c;
 }
 if(family==46150.){
  vec3 trim=vec3(.83,.82,.73);c=b70Brick(c,uv,1.15);
  float plinth=1.-smoothstep(1.0,1.15,y);c=mix(c,vec3(.66,.65,.56),plinth);
  for(int j=0;j<2;j++)for(int k=0;k<3;k++)c=b70Window(c,uv,vec2(W*(.18+float(k)*.30),3.8+float(j)*4.35),vec2(W*.066,1.03),trim);
  // Gable diamonds are solid brick relief bands with one independently bounded diamond opening.
  for(int k=0;k<3;k++){vec2 q=uv-vec2(W*(.35+float(k)*.15),15.5+float(k)*.55);float d=abs(q.x)/(W*.235)+abs(q.y)/4.25-1.;float rib=b70Stroke(d*2.,.075)*step(11.6,y);c=mix(c,c*1.19,rib);c*=1.-b70Stroke(d*2.-.14,.035)*.18*step(11.6,y);}
  vec2 q=uv-vec2(W*.50,18.5);float d=abs(q.x)/(W*.055)+abs(q.y)/.80-1.;float reveal=1.-smoothstep(-.08,.06,d),rim=(1.-smoothstep(-.1,.06,d-.20))-reveal;c=mix(c,trim,max(0.,rim));c=mix(c,vec3(.12,.18,.18),reveal);
  for(int k=0;k<3;k++)c=b70Window(c,uv,vec2(W*(.18+float(k)*.30),.59),vec2(W*.045,.22),vec3(.53,.51,.43));
  c=b70Door(c,uv,W*.91,W*.048,3.0,vec3(.60,.58,.49));
  return c;
 }
 return c;
}`;
