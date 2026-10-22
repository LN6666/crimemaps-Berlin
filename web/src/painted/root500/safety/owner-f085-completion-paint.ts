export const F085_COMPLETION_GLSL=`
float tfc085box(vec2 p,vec2 at,vec2 sz){vec2 a=1.-smoothstep(sz,sz+vec2(.04),abs(p-at));return a.x*a.y;}
float tfc085ellipse(vec2 p,vec2 at,vec2 rad){return 1.-smoothstep(.96,1.04,length((p-at)/rad));}
float tfc085arch(vec2 p,float x,float bottom,float spring,float halfw,float rise){return max(tfc085box(p,vec2(x,(bottom+spring)*.5),vec2(halfw,(spring-bottom)*.5)),tfc085ellipse(p,vec2(x,spring),vec2(halfw,rise))*step(spring,p.y));}
float tfc085band(float x,float at,float w){return 1.-smoothstep(w,w+.045,abs(x-at));}
float tfc085figure(vec2 p,vec2 at,float scale){vec2 q=(p-at)/scale;return max(tfc085ellipse(q,vec2(0.,.65),vec2(.22,.24)),max(tfc085ellipse(q,vec2(0.,0.),vec2(.34,.58)),tfc085box(q,vec2(0.,-.55),vec2(.39,.10))));}
vec3 tfc085LegacyFront(vec3 base,vec3 p,vec3 n,vec4 frame,float family){
 vec2 q=frame.xy;vec3 plaster=vec3(.77,.57,.26),light=vec3(.89,.73,.45),shade=vec3(.60,.43,.23),stone=vec3(.39,.38,.33),dark=vec3(.15,.16,.15),c=plaster;
 if(family==4987.){float ribs=pow(abs(sin(atan(q.y,q.x)*8.)),18.);return mix(vec3(.19,.21,.20),vec3(.30,.31,.28),ribs*.55);}
 if(q.y<0.||q.y>frame.z)return base;
 if(family==4985.){
  // Native29m front is a compressed surfacegraphic of the two-register officialfront; cap/centraldome are not recreated.
  c=mix(c,stone,1.-smoothstep(1.20,1.45,q.y));
  for(int i=0;i<5;i++){float yy=i==0?1.6:(i==1?12.2:(i==2?13.2:(i==3?24.5:25.4)));c=mix(c,shade,tfc085band(q.y,yy,.19));c=mix(c,light,tfc085band(q.y,yy+.25,.14));}
  if(frame.w<5.)return c;
  // Six shallow fluted pilasters/pairedcolumns and shadowed capitals. Their volume remains original flatwall.
  for(int i=0;i<6;i++){float x=i==0?-14.4:(i==1?-9.6:(i==2?-4.7:(i==3?4.7:(i==4?9.6:14.4))));float m=tfc085box(q,vec2(x,7.),vec2(.43,5.10));c=mix(c,shade,m);c=mix(c,light,tfc085box(q,vec2(x-.11,7.),vec2(.23,5.10)));c=mix(c,shade,m*pow(abs(sin((q.x-x)*22.)),12.)*.20);c=mix(c,light,tfc085box(q,vec2(x,11.88),vec2(.69,.22)));c=mix(c,shade,tfc085box(q,vec2(x,1.74),vec2(.68,.19)));}
  // Three portals, curved centralpediment and low stoneplinth.
  for(int i=0;i<3;i++){float x=float(i-1)*12.1;float top=i==1?7.9:4.0;float w=i==1?1.82:1.04;c=mix(c,shade,tfc085box(q,vec2(x,top*.5+.7),vec2(w+.30,top*.5+.15)));c=mix(c,dark,tfc085box(q,vec2(x,top*.5+.7),vec2(w,top*.5-.06)));for(int j=0;j<5;j++){float y=.9+float(j)*(top-1.)/5.;c=mix(c,vec3(.23,.22,.18),tfc085box(q,vec2(x,y),vec2(w-.15,.055)));}c=mix(c,light,tfc085band(q.x,x,.045)*step(.8,q.y)*(1.-step(top,q.y)));float ped=1.-smoothstep(.12,.22,abs(q.y-(top+1.15+.26*(w-abs(q.x-x)))));c=mix(c,light,ped*step(abs(q.x-x),w+1.0));}
  // Central inscriptioncartouche, side niches and four depicted saints as flat silhouettes.
  c=mix(c,shade,tfc085ellipse(q,vec2(0.,10.25),vec2(2.35,.92)));c=mix(c,vec3(.65,.58,.44),tfc085ellipse(q,vec2(0.,10.25),vec2(2.10,.71)));for(int i=0;i<6;i++)c=mix(c,stone,tfc085band(q.y,9.90+float(i)*.14,.027)*tfc085box(q,vec2(0.,10.25),vec2(1.65,.53))*.65);
  for(int i=0;i<2;i++){float x=i==0?-7.1:7.1;for(int j=0;j<2;j++){float yy=j==0?7.:19.3;float niche=tfc085arch(q,x,yy-1.6,yy+.9,.78,.9);c=mix(c,shade,niche);c=mix(c,stone,tfc085figure(q,vec2(x,yy),1.0)*niche);c=mix(c,light,tfc085box(q,vec2(x,yy-1.8),vec2(1.07,.16)));}}
  for(int i=0;i<2;i++){float x=i==0?-12.1:12.1;c=mix(c,shade,tfc085ellipse(q,vec2(x,10.3),vec2(.85,.95)));c=mix(c,stone,tfc085ellipse(q,vec2(x,10.3),vec2(.65,.75)));}
  // Uppercentral tall dark window and pairedflutedcolumns, Ionic/Corinthian ornament only a graphic approximation.
  c=mix(c,shade,tfc085box(q,vec2(0.,19.2),vec2(2.36,4.35)));c=mix(c,dark,tfc085box(q,vec2(0.,19.2),vec2(1.91,3.91)));float grids=max(tfc085band(mod(q.x+.38,.76),.38,.024),tfc085band(mod(q.y,.79),.395,.025));c=mix(c,vec3(.30,.31,.28),grids*tfc085box(q,vec2(0.,19.2),vec2(1.91,3.91)));
  for(int i=0;i<4;i++){float x=i==0?-4.55:(i==1?-3.25:(i==2?3.25:4.55));float shaft=tfc085box(q,vec2(x,19.1),vec2(.33,4.27));c=mix(c,light,shaft);c=mix(c,shade,shaft*pow(abs(sin((q.x-x)*26.)),12.)*.30);c=mix(c,light,tfc085box(q,vec2(x,23.6),vec2(.55,.24)));c=mix(c,shade,tfc085ellipse(q,vec2(x-.34,23.6),vec2(.20,.19)));c=mix(c,shade,tfc085ellipse(q,vec2(x+.34,23.6),vec2(.20,.19)));}
  // Reliefband and triangularpediment are bounded surface marks on nativewall; no silhouette or centraldome is invented.
  float relief=tfc085box(q,vec2(0.,13.4),vec2(13.8,.72));c=mix(c,light,relief);c=mix(c,shade,relief*pow(abs(sin(q.x*1.27+sin(q.y*6.))),8.)*.40);float line=25.0+3.6*(1.-abs(q.x)/14.8);c=mix(c,light,tfc085band(q.y,line,.23)*step(abs(q.x),14.8));float crest=tfc085ellipse(q,vec2(0.,26.),vec2(2.6,2.1));c=mix(c,stone,crest);c=mix(c,shade,crest*pow(abs(sin(q.x*3.+q.y*2.)),10.)*.35);c=mix(c,vec3(.63,.54,.39),tfc085ellipse(q,vec2(0.,26.1),vec2(1.2,1.25)));return c;
 }
 // Two source-native towers: two visible exterior directions only. No new bellopenings or alpha holes.
 c=mix(c,stone,1.-smoothstep(1.3,1.55,q.y));float w=frame.w;float x=q.x;float pil=max(tfc085band(x,-w*.40,.30),tfc085band(x,w*.40,.30));c=mix(c,light,pil);c=mix(c,shade,pil*tfc085band(mod(x,.24),.12,.025)*.25);
 for(int i=0;i<7;i++){float y=i==0?1.7:(i==1?14.0:(i==2?27.5:(i==3?30.2:(i==4?44.3:(i==5?47.0:57.4)))));c=mix(c,shade,tfc085band(q.y,y,.24));c=mix(c,light,tfc085band(q.y,y+.37,.19));}
 for(int i=0;i<3;i++){float spring=i==0?11.5:(i==1?23.7:37.0);float bottom=spring-(i==2?5.4:4.6);float wi=i==2?.88:.75;float ar=tfc085arch(q,0.,bottom,spring,wi,1.15);c=mix(c,shade,tfc085arch(q,0.,bottom-.15,spring,wi+.23,1.39));c=mix(c,dark,ar);c=mix(c,vec3(.32,.30,.24),ar*tfc085band(x,0.,.045));}
 if(n.z>.7&&q.y<29.)return c;
 // Whiteclock face on the photographed upperstage, 12ticks and darkhands; time is a neutral referencegraphic, not a liveclock.
 vec2 clock=q-vec2(0.,41.1);float disc=tfc085ellipse(q,vec2(0.,41.1),vec2(1.55,1.55));c=mix(c,vec3(.89,.89,.82),disc);float angle=atan(clock.y,clock.x);float tick=pow(abs(cos(angle*6.)),36.)*step(1.15,length(clock));c=mix(c,vec3(.44,.43,.36),tick*disc);float hands=max(tfc085box(q,vec2(0.,41.55),vec2(.055,.45)),tfc085box(q,vec2(.40,41.1),vec2(.40,.055)));c=mix(c,stone,hands*disc);
 // Belfrystage: dark arched recesses and scroll/roundel outlines as flatart, never transparentcutouts.
 float bell=tfc085arch(q,0.,48.2,53.4,.82,1.05);c=mix(c,shade,tfc085arch(q,0.,48.,53.4,1.12,1.35));c=mix(c,dark,bell);for(int i=0;i<2;i++){float xx=i==0?-w*.30:w*.30;float ring=tfc085ellipse(q,vec2(xx,51.),vec2(.95,1.55));float core=tfc085ellipse(q,vec2(xx,51.),vec2(.62,1.16));c=mix(c,light,ring);c=mix(c,shade,core);c=mix(c,stone,tfc085ellipse(q,vec2(xx,55.6),vec2(.52,.52)));}return c;
}

float tfc085Seam(float x,float period,float width){float d=abs(mod(x+period*.5,period)-period*.5);return 1.-smoothstep(width,width+max(fwidth(x),.005),d);}
vec3 theatinerComplete085(vec3 base,vec3 p,vec3 n,vec4 frame,float family){if(abs(family-6395.)>.25)return base;float role=floor(frame.z-1000.+.5);vec3 c=vec3(.77,.57,.26);float y=frame.y,x=frame.x;
 if(role<.5)return tfc085LegacyFront(base,p,n,vec4(frame.xy,29.,31.72),4985.);
 if(role<1.5){vec2 front=vec2(.961226,-.275762),north=vec2(.275762,.961226);if(max(dot(n.xz,front),dot(n.xz,north))>.7)return tfc085LegacyFront(base,p,n,vec4(frame.xy,47.,9.7),4986.);c=mix(c,vec3(.89,.73,.45),max(tfc085band(x,-3.9,.30),tfc085band(x,3.9,.30)));for(int i=0;i<4;i++){float yy=i==0?1.7:(i==1?14.:(i==2?27.5:44.3));c=mix(c,vec3(.89,.73,.45),tfc085band(y,yy,.22));}return c;}
 if(role<2.5||role>7.5&&role<8.5){float radius=role<2.5?4.35:8.85;float sector=6.28318530718/8.;float xx=(mod(x+sector*.5,sector)-sector*.5)*radius;vec2 q=vec2(xx,y);float bottom=role<2.5?48.6:39.7,spring=role<2.5?54.5:47.8;float hw=role<2.5?.68:1.12;float rim=tfc085arch(q,0.,bottom-.18,spring,hw+.23,hw+.28);float glass=tfc085arch(q,0.,bottom,spring,hw,hw);c=mix(c,vec3(.89,.73,.45),rim);c=mix(c,vec3(.13,.16,.15),glass);c=mix(c,vec3(.33,.35,.31),glass*max(tfc085Seam(xx,.48,.025),tfc085Seam(y,.72,.025)));float pil=step(radius*sector*.36,abs(xx));c=mix(c,vec3(.88,.72,.44),pil);c=mix(c,vec3(.60,.43,.23),pil*tfc085Seam(xx,.25,.018)*.25);if(role<2.5)c=mix(c,vec3(.19,.21,.18),tfc085ellipse(q,vec2(0.,56.6),vec2(.49,.49)));return c;}
 if(role>8.5){float metal=max(tfc085Seam(x,6.28318530718/8.,.032),tfc085Seam(y,1.5,.05));return mix(vec3(.12,.18,.17),vec3(.33,.39,.34),metal);}
 if(role>3.5&&role<5.5){float rib=role<4.5?pow(abs(cos(x*8.)),20.):max(tfc085Seam(x,.65,.012),tfc085Seam(frame.w,.95,.009));return mix(vec3(.18,.22,.20),vec3(.32,.35,.30),rib*.6);}
 if(role>6.5)return vec3(.27,.39,.30);
 if(role>5.5){float plinth=1.-smoothstep(1.2,1.45,y);c=mix(c,vec3(.43,.42,.37),plinth);c=mix(c,vec3(.89,.73,.45),tfc085band(y,23.8,.15));c*=1.-.025*tfc085Seam(y,.44,.004);return c;}
 return vec3(.88,.72,.44);
}
`;
