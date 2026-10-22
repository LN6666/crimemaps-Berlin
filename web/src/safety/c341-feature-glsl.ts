export const C341_FEATURE_GLSL=`float c341_hg89Box(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;return 1.-smoothstep(-.015,.015,max(d.x,d.y));}
float c341_hg89Arch(vec2 q,float x,float lo,float spring,float r){return max(c341_hg89Box(q,vec2(x,(lo+spring)*.5),vec2(r,(spring-lo)*.5)),(1.-smoothstep(r-.02,r+.02,length(q-vec2(x,spring))))*step(spring,q.y));}
vec3 c341_hg89Opening(vec3 c,vec2 q,float x,float lo,float spring,float r){c=mix(c,vec3(.77,.73,.60),c341_hg89Arch(q,x,lo-.18,spring,r+.16));float m=c341_hg89Arch(q,x,lo,spring,r);c=mix(c,vec3(.075,.095,.08),m);float bars=0.;for(int j=0;j<5;j++)bars=max(bars,c341_hg89Box(q,vec2(x+(float(j)-2.)*r*.38,(lo+spring)*.5),vec2(.018,(spring-lo)*.5+r)));for(int j=0;j<6;j++)bars=max(bars,c341_hg89Box(q,vec2(x,lo+.5+float(j)*.75),vec2(r,.018)));return mix(c,vec3(.24,.27,.22),bars*m);}
float c341_hg89Glyph(float n,vec2 q){int row=int(floor(q.y*7.));int col=int(floor(q.x*5.));if(row<0||row>6||col<0||col>4)return 0.;float v=0.;
 if(n==0.){v=(row==0||row==6)?31.:4.;} // I
 if(n==1.){v=row==0||row==6?17.:(row==1?25.:(row==2?21.:(row==3?19.:17.)));} // N
 if(n==2.){v=row==0?17.:(row==1?27.:(row==2?21.:17.));} // M
 if(n==3.){v=row==0?14.:(row==3?31.:17.);} // A
 if(n==4.){v=row<5?2.:(row==5?18.:12.);} // J
 if(n==5.){v=(row==0||row==6)?14.:17.;} // O
 if(n==6.){v=row==0||row==3?30.:(row<3?17.:(row==4?20.:(row==5?18.:17.)));} // R
 if(n==7.){v=row==0||row==3||row==6?31.:16.;} // E
 if(n==8.){v=row==0||row==6?30.:17.;} // D
 if(n==9.){v=row==0||row==6?14.:(row==3?23.:(row>3?17.:16.));} // G
 if(n==10.){v=row==6?31.:16.;} // L
 return mod(floor(v/pow(2.,float(4-col))),2.);
}
float c341_hg89Inscription(vec2 q){float j=floor(q.x/.48);float code=-1.;if(j==0.)code=0.;if(j==1.)code=1.;if(j==3.)code=2.;if(j==4.)code=3.;if(j==5.)code=4.;if(j==6.)code=5.;if(j==7.)code=6.;if(j==8.)code=7.;if(j==9.)code=2.;if(j==11.)code=8.;if(j==12.)code=7.;if(j==13.)code=0.;if(j==15.)code=9.;if(j==16.)code=10.;if(j==17.)code=5.;if(j==18.)code=6.;if(j==19.)code=0.;if(j==20.)code=3.;if(j==21.)code=2.;if(code<0.)return 0.;return c341_hg89Glyph(code,vec2(fract(q.x/.48)*1.2,1.-q.y/.65));}
vec3 c341_heiligGeistFormalFull500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family!=13540.&&family!=13541.&&family!=13542.)return base;
 vec2 q=frame.xy;float u=q.x,v=q.y;vec3 stone=vec3(.72,.68,.56),mould=vec3(.84,.79,.66),shadow=vec3(.55,.53,.45);
 if(family==13540.){
  if(frame.z<23.){if(v<12.)return base;vec3 c=stone;c=mix(c,mould,c341_hg89Box(q,vec2(u,12.8),vec2(30.,.13)));c=mix(c,mould,c341_hg89Box(q,vec2(u,16.7),vec2(30.,.13)));float phase=u<frame.w*.5?1.2:frame.w-1.2;c=c341_hg89Opening(c,q,phase,13.4,15.45,.47);return c;}
  if(u<0.||u>frame.w)return base;
  if(v<1.25)return base; // Hedge/parasols hide true lower openings and bases.
  vec3 c=stone;float middle=12.6397;
  for(int j=0;j<4;j++){float x=j==0?1.7:(j==1?8.1:(j==2?16.2:22.6));for(int k=0;k<2;k++){float xx=x+float(k)*.60;c=mix(c,mould,c341_hg89Box(q,vec2(xx,7.7),vec2(.24,6.05)));c=mix(c,shadow,c341_hg89Box(q,vec2(xx+.23,7.7),vec2(.035,5.8)));c=mix(c,mould,c341_hg89Box(q,vec2(xx,13.75),vec2(.48,.18)));c=mix(c,shadow,c341_hg89Box(q,vec2(xx,13.48),vec2(.44,.08)));c=mix(c,mould,c341_hg89Box(q,vec2(xx,1.75),vec2(.37,.12)));}}
  c=c341_hg89Opening(c,q,4.95,2.1,9.7,1.02);c=c341_hg89Opening(c,q,middle,1.45,10.0,1.43);c=c341_hg89Opening(c,q,19.55,2.1,9.7,1.02);
  c=mix(c,mould,c341_hg89Box(q,vec2(middle,14.9),vec2(frame.w*.5,.18)));c=mix(c,shadow,c341_hg89Box(q,vec2(middle,14.55),vec2(frame.w*.5,.10)));
  // Upper paired column/pilaster order, central niche and restrained relief graphics.
  for(int j=0;j<2;j++){float x=j==0?8.95:15.45;for(int k=0;k<2;k++){float xx=x+float(k)*.55;c=mix(c,mould,c341_hg89Box(q,vec2(xx,21.45),vec2(.22,5.9)));c=mix(c,shadow,c341_hg89Box(q,vec2(xx+.20,21.45),vec2(.025,5.7)));c=mix(c,mould,c341_hg89Box(q,vec2(xx,27.4),vec2(.45,.16)));}}
  float niche=c341_hg89Arch(q,middle,18.0,23.6,1.10);c=mix(c,vec3(.28,.32,.27),niche);float head=1.-smoothstep(.23,.27,length(q-vec2(middle,23.2)));float robe=c341_hg89Box(q,vec2(middle,21.5),vec2(.34,1.20));c=mix(c,vec3(.44,.52,.48),max(head,robe)*niche);c=mix(c,vec3(.63,.53,.24),(1.-smoothstep(.20,.26,length(q-vec2(middle,23.8))))*niche);
  // Two balustrade strips and visible shoulder scrolls are planar paint, no added relief.
  for(int j=0;j<2;j++){float x=j==0?4.5:20.0;float bal=c341_hg89Box(q,vec2(x,16.2),vec2(2.2,.7));float bars=step(.47,fract((u-x)*1.65));c=mix(c,shadow,bal*bars*.65);c=mix(c,mould,c341_hg89Box(q,vec2(x,16.95),vec2(2.3,.10)));vec2 s=q-vec2(x,20.0);float r=length(s);float spiral=1.-smoothstep(.09,.15,abs(r-(.60+.14*atan(s.y,s.x))));c=mix(c,mould,spiral*c341_hg89Box(q,vec2(x,20.),vec2(1.5,1.5)));}
  // Existing round fronthead panel only; crowned gilded figure lacks mesh and stays missing-carrier.
  vec2 top=q-vec2(middle,29.65);float ring=1.-smoothstep(.09,.16,abs(length(top)-1.85));c=mix(c,mould,ring);float relief=(1.-smoothstep(1.55,1.70,length(top)))*(.5+.5*cos(atan(top.y,top.x)*12.));c=mix(c,vec3(.60,.62,.56),relief*.40);
  if(v>25.5&&v<26.15)c=mix(c,vec3(.43,.36,.20),c341_hg89Inscription(vec2(u-(middle-5.28),v-25.5)));
  return c;
 }
 if(family==13541.){
  if(normal.y>.01){float across=fract(u/.30),course=fract(v/.19);float seam=max(1.-smoothstep(.035,.08,min(across,1.-across)),1.-smoothstep(.035,.08,min(course,1.-course)));return mix(vec3(.57,.22,.115),vec3(.30,.16,.10),seam*.42);}
  if(v<1.3||u<0.||u>34.5)return base;
  vec3 c=vec3(.79,.76,.65);c=mix(c,mould,c341_hg89Box(q,vec2(17.25,17.75),vec2(17.25,.18)));
  // Exactly four photo-visible circular/oval nave openings; hidden eastern continuation unknown.
  for(int j=0;j<4;j++){float x=4.3+float(j)*8.1;vec2 d=(q-vec2(x,11.6))/vec2(1.30,2.55);float rr=length(d);c=mix(c,mould,1.-smoothstep(1.04,1.10,rr));float m=1.-smoothstep(.90,.96,rr);c=mix(c,vec3(.30,.31,.26),m);c=mix(c,vec3(.60,.59,.48),c341_hg89Box(q,vec2(x,11.6),vec2(1.2,.045))*m);float posts=c341_hg89Box(q,vec2(x+3.9,8.8),vec2(.10,8.7));c=mix(c,mould,posts);}
  return c;
 }
 if(frame.z>36.5&&frame.z<37.5){
  vec3 c=stone;float mid=frame.w*.5;float corners=max(c341_hg89Box(q,vec2(.23,27.5),vec2(.17,9.5)),c341_hg89Box(q,vec2(frame.w-.23,27.5),vec2(.17,9.5)));c=mix(c,mould,corners);
  for(int j=0;j<3;j++){float y=j==0?18.25:(j==1?22.2:30.8);c=mix(c,mould,c341_hg89Box(q,vec2(mid,y),vec2(mid,.14)));}
  c=c341_hg89Opening(c,q,mid,23.0,28.0,.78);float louvers=step(.72,fract((v-23.)/.34))*c341_hg89Arch(q,mid,23.,28.,.75);c=mix(c,vec3(.34,.30,.22),louvers*.75);
  for(int j=0;j<2;j++){vec2 d=q-vec2(mid,j==0?20.1:31.45);c=mix(c,mould,1.-smoothstep(.48,.53,length(d)));c=mix(c,vec3(.11,.13,.10),1.-smoothstep(.35,.40,length(d)));}
  vec2 d=q-vec2(mid,34.25);float rr=length(d);c=mix(c,vec3(.19,.20,.16),1.-smoothstep(1.25,1.30,rr));c=mix(c,vec3(.87,.84,.70),1.-smoothstep(1.14,1.18,rr));float ticks=step(.93,cos(atan(d.y,d.x)*12.))*step(.89,rr)*(1.-step(1.10,rr));c=mix(c,vec3(.16,.17,.13),ticks);c=mix(c,vec3(.23,.28,.22),1.-smoothstep(.43,.47,rr));float hands=max(c341_hg89Box(d,vec2(.35,0.),vec2(.38,.035)),c341_hg89Box(vec2(dot(d,vec2(-.35,.94)),dot(d,vec2(-.94,-.35))),vec2(.31,0.),vec2(.34,.04)));return mix(c,vec3(.18,.18,.13),hands);
 }
 // Existing actual domes/caps only: copper-green sheets and standing seams; no cut holes.
 vec3 copper=vec3(.31,.49,.43);float seam=1.-smoothstep(.015,.04,min(mod(u,.42),.42-mod(u,.42)));vec3 c=mix(copper,vec3(.16,.30,.26),seam*.55);
 if(frame.z>53.){if(v<39.6)return mix(stone,mould,1.-smoothstep(.09,.15,abs(v-38.9)));if(v>52.76)c=vec3(.55,.48,.25);if(abs(v-40.)<.12||abs(v-45.)<.12)c*=.62;}
 return c;
}
`;
