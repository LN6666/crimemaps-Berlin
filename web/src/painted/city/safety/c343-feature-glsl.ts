export const C343_FEATURE_GLSL=String.raw`float c343_tk85box(vec2 p,vec2 at,vec2 sz){vec2 a=1.-smoothstep(sz,sz+vec2(.04),abs(p-at));return a.x*a.y;}
float c343_tk85ellipse(vec2 p,vec2 at,vec2 rad){return 1.-smoothstep(.96,1.04,length((p-at)/rad));}
float c343_tk85arch(vec2 p,float x,float bottom,float spring,float halfw,float rise){return max(c343_tk85box(p,vec2(x,(bottom+spring)*.5),vec2(halfw,(spring-bottom)*.5)),c343_tk85ellipse(p,vec2(x,spring),vec2(halfw,rise))*step(spring,p.y));}
float c343_tk85band(float x,float at,float w){return 1.-smoothstep(w,w+.045,abs(x-at));}
float c343_tk85figure(vec2 p,vec2 at,float scale){vec2 q=(p-at)/scale;return max(c343_tk85ellipse(q,vec2(0.,.65),vec2(.22,.24)),max(c343_tk85ellipse(q,vec2(0.,0.),vec2(.34,.58)),c343_tk85box(q,vec2(0.,-.55),vec2(.39,.10))));}
vec3 c343_theatinerkircheFrontFull500(vec3 base,vec3 p,vec3 n,vec4 frame,float family){
 vec2 q=frame.xy;vec3 plaster=vec3(.77,.57,.26),light=vec3(.89,.73,.45),shade=vec3(.60,.43,.23),stone=vec3(.39,.38,.33),dark=vec3(.15,.16,.15),c=plaster;
 if(family==13562.){float ribs=pow(abs(sin(atan(q.y,q.x)*8.)),18.);return mix(vec3(.19,.21,.20),vec3(.30,.31,.28),ribs*.55);}
 if(q.y<0.||q.y>frame.z)return base;
 if(family==13560.){
  // Native29m front is a compressed surfacegraphic of the two-register officialfront; cap/centraldome are not recreated.
  c=mix(c,stone,1.-smoothstep(1.20,1.45,q.y));
  for(int i=0;i<5;i++){float yy=i==0?1.6:(i==1?12.2:(i==2?13.2:(i==3?24.5:25.4)));c=mix(c,shade,c343_tk85band(q.y,yy,.19));c=mix(c,light,c343_tk85band(q.y,yy+.25,.14));}
  if(frame.w<5.)return c;
  // Six shallow fluted pilasters/pairedcolumns and shadowed capitals. Their volume remains original flatwall.
  for(int i=0;i<6;i++){float x=i==0?-14.4:(i==1?-9.6:(i==2?-4.7:(i==3?4.7:(i==4?9.6:14.4))));float m=c343_tk85box(q,vec2(x,7.),vec2(.43,5.10));c=mix(c,shade,m);c=mix(c,light,c343_tk85box(q,vec2(x-.11,7.),vec2(.23,5.10)));c=mix(c,shade,m*pow(abs(sin((q.x-x)*22.)),12.)*.20);c=mix(c,light,c343_tk85box(q,vec2(x,11.88),vec2(.69,.22)));c=mix(c,shade,c343_tk85box(q,vec2(x,1.74),vec2(.68,.19)));}
  // Three portals, curved centralpediment and low stoneplinth.
  for(int i=0;i<3;i++){float x=float(i-1)*12.1;float top=i==1?7.9:4.0;float w=i==1?1.82:1.04;c=mix(c,shade,c343_tk85box(q,vec2(x,top*.5+.7),vec2(w+.30,top*.5+.15)));c=mix(c,dark,c343_tk85box(q,vec2(x,top*.5+.7),vec2(w,top*.5-.06)));for(int j=0;j<5;j++){float y=.9+float(j)*(top-1.)/5.;c=mix(c,vec3(.23,.22,.18),c343_tk85box(q,vec2(x,y),vec2(w-.15,.055)));}c=mix(c,light,c343_tk85band(q.x,x,.045)*step(.8,q.y)*(1.-step(top,q.y)));float ped=1.-smoothstep(.12,.22,abs(q.y-(top+1.15+.26*(w-abs(q.x-x)))));c=mix(c,light,ped*step(abs(q.x-x),w+1.0));}
  // Central inscriptioncartouche, side niches and four depicted saints as flat silhouettes.
  c=mix(c,shade,c343_tk85ellipse(q,vec2(0.,10.25),vec2(2.35,.92)));c=mix(c,vec3(.65,.58,.44),c343_tk85ellipse(q,vec2(0.,10.25),vec2(2.10,.71)));for(int i=0;i<6;i++)c=mix(c,stone,c343_tk85band(q.y,9.90+float(i)*.14,.027)*c343_tk85box(q,vec2(0.,10.25),vec2(1.65,.53))*.65);
  for(int i=0;i<2;i++){float x=i==0?-7.1:7.1;for(int j=0;j<2;j++){float yy=j==0?7.:19.3;float niche=c343_tk85arch(q,x,yy-1.6,yy+.9,.78,.9);c=mix(c,shade,niche);c=mix(c,stone,c343_tk85figure(q,vec2(x,yy),1.0)*niche);c=mix(c,light,c343_tk85box(q,vec2(x,yy-1.8),vec2(1.07,.16)));}}
  for(int i=0;i<2;i++){float x=i==0?-12.1:12.1;c=mix(c,shade,c343_tk85ellipse(q,vec2(x,10.3),vec2(.85,.95)));c=mix(c,stone,c343_tk85ellipse(q,vec2(x,10.3),vec2(.65,.75)));}
  // Uppercentral tall dark window and pairedflutedcolumns, Ionic/Corinthian ornament only a graphic approximation.
  c=mix(c,shade,c343_tk85box(q,vec2(0.,19.2),vec2(2.36,4.35)));c=mix(c,dark,c343_tk85box(q,vec2(0.,19.2),vec2(1.91,3.91)));float grids=max(c343_tk85band(mod(q.x+.38,.76),.38,.024),c343_tk85band(mod(q.y,.79),.395,.025));c=mix(c,vec3(.30,.31,.28),grids*c343_tk85box(q,vec2(0.,19.2),vec2(1.91,3.91)));
  for(int i=0;i<4;i++){float x=i==0?-4.55:(i==1?-3.25:(i==2?3.25:4.55));float shaft=c343_tk85box(q,vec2(x,19.1),vec2(.33,4.27));c=mix(c,light,shaft);c=mix(c,shade,shaft*pow(abs(sin((q.x-x)*26.)),12.)*.30);c=mix(c,light,c343_tk85box(q,vec2(x,23.6),vec2(.55,.24)));c=mix(c,shade,c343_tk85ellipse(q,vec2(x-.34,23.6),vec2(.20,.19)));c=mix(c,shade,c343_tk85ellipse(q,vec2(x+.34,23.6),vec2(.20,.19)));}
  // Reliefband and triangularpediment are bounded surface marks on nativewall; no silhouette or centraldome is invented.
  float relief=c343_tk85box(q,vec2(0.,13.4),vec2(13.8,.72));c=mix(c,light,relief);c=mix(c,shade,relief*pow(abs(sin(q.x*1.27+sin(q.y*6.))),8.)*.40);float line=25.0+3.6*(1.-abs(q.x)/14.8);c=mix(c,light,c343_tk85band(q.y,line,.23)*step(abs(q.x),14.8));float crest=c343_tk85ellipse(q,vec2(0.,26.),vec2(2.6,2.1));c=mix(c,stone,crest);c=mix(c,shade,crest*pow(abs(sin(q.x*3.+q.y*2.)),10.)*.35);c=mix(c,vec3(.63,.54,.39),c343_tk85ellipse(q,vec2(0.,26.1),vec2(1.2,1.25)));return c;
 }
 // Two source-native towers: two visible exterior directions only. No new bellopenings or alpha holes.
 c=mix(c,stone,1.-smoothstep(1.3,1.55,q.y));float w=frame.w;float x=q.x;float pil=max(c343_tk85band(x,-w*.40,.30),c343_tk85band(x,w*.40,.30));c=mix(c,light,pil);c=mix(c,shade,pil*c343_tk85band(mod(x,.24),.12,.025)*.25);
 for(int i=0;i<7;i++){float y=i==0?1.7:(i==1?14.0:(i==2?27.5:(i==3?30.2:(i==4?44.3:(i==5?47.0:57.4)))));c=mix(c,shade,c343_tk85band(q.y,y,.24));c=mix(c,light,c343_tk85band(q.y,y+.37,.19));}
 for(int i=0;i<3;i++){float spring=i==0?11.5:(i==1?23.7:37.0);float bottom=spring-(i==2?5.4:4.6);float wi=i==2?.88:.75;float ar=c343_tk85arch(q,0.,bottom,spring,wi,1.15);c=mix(c,shade,c343_tk85arch(q,0.,bottom-.15,spring,wi+.23,1.39));c=mix(c,dark,ar);c=mix(c,vec3(.32,.30,.24),ar*c343_tk85band(x,0.,.045));}
 if(n.z>.7&&q.y<29.)return c;
 // Whiteclock face on the photographed upperstage, 12ticks and darkhands; time is a neutral referencegraphic, not a liveclock.
 vec2 clock=q-vec2(0.,41.1);float disc=c343_tk85ellipse(q,vec2(0.,41.1),vec2(1.55,1.55));c=mix(c,vec3(.89,.89,.82),disc);float angle=atan(clock.y,clock.x);float tick=pow(abs(cos(angle*6.)),36.)*step(1.15,length(clock));c=mix(c,vec3(.44,.43,.36),tick*disc);float hands=max(c343_tk85box(q,vec2(0.,41.55),vec2(.055,.45)),c343_tk85box(q,vec2(.40,41.1),vec2(.40,.055)));c=mix(c,stone,hands*disc);
 // Belfrystage: dark arched recesses and scroll/roundel outlines as flatart, never transparentcutouts.
 float bell=c343_tk85arch(q,0.,48.2,53.4,.82,1.05);c=mix(c,shade,c343_tk85arch(q,0.,48.,53.4,1.12,1.35));c=mix(c,dark,bell);for(int i=0;i<2;i++){float xx=i==0?-w*.30:w*.30;float ring=c343_tk85ellipse(q,vec2(xx,51.),vec2(.95,1.55));float core=c343_tk85ellipse(q,vec2(xx,51.),vec2(.62,1.16));c=mix(c,light,ring);c=mix(c,shade,core);c=mix(c,stone,c343_tk85ellipse(q,vec2(xx,55.6),vec2(.52,.52)));}return c;
}
`;
