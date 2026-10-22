export const F106_COMPLETION_GLSL=`
float as6430box(vec2 p,vec2 at,vec2 sz){vec2 a=1.-smoothstep(sz,sz+vec2(.025),abs(p-at));return a.x*a.y;}
float as6430ell(vec2 p,vec2 at,vec2 rad){return 1.-smoothstep(.96,1.04,length((p-at)/rad));}
float as6430line(float p,float x,float w){return 1.-smoothstep(w,w+.025,abs(p-x));}
float as6430arch(vec2 q,float x,float bottom,float spring,float w,float rise){return max(as6430box(q,vec2(x,(bottom+spring)*.5),vec2(w,(spring-bottom)*.5)),as6430ell(q,vec2(x,spring),vec2(w,rise))*step(spring,q.y));}
float as6430saint(vec2 q,vec2 at,float sc){vec2 p=(q-at)/sc;float head=as6430ell(p,vec2(.02,.67),vec2(.18,.22));float robe=as6430ell(p,vec2(-.05,.05),vec2(.27,.52));robe=max(robe,as6430ell(p,vec2(.13,-.27),vec2(.38,.18)));float arm=as6430ell(p,vec2(-.32,.28),vec2(.30,.10));return max(head,max(robe,arm));}
vec3 asam6430LegacyPortal(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-4904.)>.25)return base;
 // 8m city-guide width is a graphical reference; exact9.89m native sourcefront is retained, never extended to neighbors.
 vec2 q=vec2(frame.x*8./frame.w,p.y);vec3 white=vec3(.77,.75,.69),ochre=vec3(.73,.53,.30),shade=vec3(.44,.39,.32),marble=vec3(.64,.66,.59),gold=vec3(.69,.51,.21),wood=vec3(.12,.115,.09),c=white;
 // Warm flankingplaster fields, fine marbleveins and sinuous raised white Rococo outlines.
 for(int i=0;i<2;i++){float signx=i==0?-1.:1.;float x=signx*3.17;float field=as6430box(q,vec2(x,3.75),vec2(.48,3.75));c=mix(c,ochre,field);float wave=sin(q.y*4.9+sin(q.y*1.7))* .035;float edge=as6430line(q.x,x-.47+wave,.035)+as6430line(q.x,x+.47-wave,.035);c=mix(c,white,clamp(edge,0.,1.)*field);c=mix(c,vec3(.84,.68,.44),field*pow(abs(sin(q.y*9.7+q.x*11.2)),14.)*.13);}
 // Lower originalstreetportal doubleleaf doors with goldradial motifs and darkfoliate carving. Everyopening is a flatopaquegraphic.
 float door=as6430arch(q,0.,0.,2.68,1.55,1.40);c=mix(c,wood,door);c=mix(c,vec3(.25,.23,.17),door*as6430line(q.x,0.,.055));
 for(int i=0;i<2;i++){float x=i==0?-.76:.76;float panel=as6430box(q,vec2(x,1.0),vec2(.64,.94));c=mix(c,vec3(.20,.19,.14),panel);c=mix(c,vec3(.08,.085,.065),as6430box(q,vec2(x,1.),vec2(.55,.84)));vec2 fan=q-vec2(x,.23);float rays=pow(abs(sin(atan(fan.y,fan.x)*8.)),22.);float rm=as6430ell(q,vec2(x,.23),vec2(.54,.74));c=mix(c,gold,rm*rays*.85);for(int j=0;j<5;j++){float y=.65+float(j)*.25;float leaf=max(as6430ell(q,vec2(x-.18,y),vec2(.23,.055)),as6430ell(q,vec2(x+.16,y+.10),vec2(.23,.055)));c=mix(c,vec3(.27,.25,.18),leaf*panel);}}
 // Large roundedfanlight with thick ironrectangular and circularrails, small gilt crossjunctions.
 vec2 fan=q-vec2(0.,2.96);float circ=as6430ell(q,vec2(0.,2.96),vec2(1.50,1.38));c=mix(c,vec3(.21,.24,.23),circ);float rim=1.-smoothstep(.045,.085,abs(length(fan/vec2(1.44,1.31))-1.));c=mix(c,wood,rim*circ);float grid=max(as6430line(mod(q.x+.20,.41),.205,.035),as6430line(mod(q.y,.42),.21,.035));c=mix(c,vec3(.095,.11,.10),grid*circ);float studs=as6430line(mod(q.x+.20,.41),.205,.035)*as6430line(mod(q.y,.42),.21,.035);c=mix(c,gold,studs*circ);
 // Gray-white columns and greenishmarble pilasters with gildedCorinthianleaf capitals, painted fluting and flatshadowedges.
 for(int i=0;i<2;i++){float signx=i==0?-1.:1.;float x=signx*2.07;float rect=as6430box(q,vec2(signx*2.58,2.35),vec2(.27,2.30));c=mix(c,marble,rect);float veins=pow(abs(sin(q.y*5.3+q.x*11.+sin(q.y*2.2))),18.);c=mix(c,vec3(.45,.50,.44),rect*veins*.24);float shaft=as6430box(q,vec2(x,2.2),vec2(.22,2.12));c=mix(c,vec3(.73,.73,.67),shaft);c=mix(c,vec3(.54,.55,.49),shaft*(.35+.25*sin((q.x-x)*7.)));c=mix(c,white,as6430line(q.x,x-.10,.035)*shaft);float cap=as6430box(q,vec2(x,4.37),vec2(.39,.22));c=mix(c,gold,cap);for(int j=0;j<5;j++){float xx=x+(float(j)-2.)*.14;float leaf=as6430ell(q,vec2(xx,4.27+.10*cos(float(j)*1.4)),vec2(.12,.22));c=mix(c,vec3(.85,.67,.31),leaf);c=mix(c,shade,as6430ell(q,vec2(xx,4.36),vec2(.055,.065)));}c=mix(c,white,as6430box(q,vec2(x,4.63),vec2(.42,.07)));}
 // Strongly modeledrockbase is represented by bounded facetedcolor patches only; originalflatwall/nativerockvolume are unchanged.
 for(int side=0;side<2;side++){float sx=side==0?-1.:1.;for(int i=0;i<10;i++){float xx=sx*(2.62+.14*float(i%4));float yy=.08+.14*float(i/4);float m=as6430ell(q,vec2(xx,yy),vec2(.31,.20));c=mix(c,vec3(.48,.48,.43)+vec3(.025*float(i%3)),m);c=mix(c,vec3(.68,.68,.62),as6430ell(q,vec2(xx-.07,yy+.08),vec2(.19,.055))*m);}}
 // Convex-and-concave brokenpediment/overdoor canopy, nested brown-and-whitecornices and shadowed goldfloral soffit.
 float curve=4.62+.86*exp(-q.x*q.x/2.0)-.24*exp(-pow(abs(q.x)-2.1,2.)/.25);float extent=step(abs(q.x),3.0);float canopy=as6430line(q.y,curve,.22)*extent;c=mix(c,vec3(.32,.25,.18),canopy);c=mix(c,white,as6430line(q.y,curve+.22,.07)*extent);c=mix(c,vec3(.54,.40,.26),as6430line(q.y,curve-.22,.065)*extent);float soffit=as6430line(q.y,curve-.08,.13)*step(abs(q.x),2.6);float flowers=pow(abs(sin(q.x*7.5+sin(q.y*5.))),12.);c=mix(c,gold,soffit*flowers*.85);
 // Only the surviving uppernativewall strip receives partialtallwindow and framing. Fullgable/crowningvirtues remain missingcarrier.
 float upper=step(6.70,q.y);float win=as6430box(q,vec2(0.,7.55),vec2(1.55,.90));c=mix(c,vec3(.30,.34,.33),win*upper);float glazing=max(as6430line(mod(q.x,.44),.22,.018),as6430line(mod(q.y,.40),.20,.018));c=mix(c,vec3(.57,.59,.53),win*upper*glazing);for(int i=0;i<2;i++){float x=i==0?-1.97:1.97;c=mix(c,white,as6430box(q,vec2(x,7.2),vec2(.19,.55)));}
 // Group of Nepomuk/angels aboveportal: flatreference silhouettes and drapery, no inventedstatuevolume.
 float central=as6430saint(q,vec2(0.,6.02),.95);c=mix(c,vec3(.61,.61,.52),central);c=mix(c,vec3(.37,.38,.32),central*pow(abs(sin(q.x*15.+q.y*9.)),12.)*.55);c=mix(c,white,as6430ell(q,vec2(-.10,6.68),vec2(.16,.18)));for(int i=0;i<2;i++){float sx=i==0?-1.:1.;float figure=as6430saint(q,vec2(sx*1.27,5.54),.62);float wing=as6430ell(q,vec2(sx*1.64,5.97),vec2(.39,.34));c=mix(c,vec3(.68,.68,.59),max(figure,wing));c=mix(c,shade,wing*pow(abs(sin(q.y*23.+q.x*10.)),16.)*.40);}
 float cross=max(as6430box(q,vec2(1.34,6.52),vec2(.035,.43)),as6430box(q,vec2(1.34,6.72),vec2(.20,.035)));c=mix(c,gold,cross);

 return c;
}
vec3 asamCompletion6430(vec3 base,vec3 p,vec3 normal,vec4 f,float family){float role=f.w;vec2 q=vec2(f.x*8./max(f.z,.01),f.y);vec3 white=vec3(.77,.75,.69),ochre=vec3(.73,.53,.30),marble=vec3(.64,.66,.59),shade=vec3(.44,.39,.32),gold=vec3(.69,.51,.21);
 if(abs(role-80.)<.25)return asam6430LegacyPortal(base,vec3(0.,f.y,0.),normal,vec4(f.x,f.y,7.5,f.z),4904.);
 if(abs(role-81.)<.25)return mix(vec3(.48,.48,.43),vec3(.66,.65,.58),pow(abs(sin(q.x*11.+q.y*7.)),18.)*.16);
 if(role<1.5)return white;
 if(abs(role-2.)<.25){vec3 c=white;
 for(int i=0;i<2;i++){float sg=i==0?-1.:1.;float x=sg*3.17;float field=as6430box(q,vec2(x,10.1),vec2(.48,3.7));c=mix(c,ochre,field);float wave=sin(q.y*4.9+sin(q.y*1.7))*.035;float edge=as6430line(q.x,x-.47+wave,.035)+as6430line(q.x,x+.47-wave,.035);c=mix(c,white,clamp(edge,0.,1.)*field);float shaft=as6430box(q,vec2(sg*1.97,9.6),vec2(.19,2.2));c=mix(c,marble,shaft);float veins=pow(abs(sin(q.y*5.3+q.x*11.+sin(q.y*2.2))),18.);c=mix(c,vec3(.45,.50,.44),shaft*veins*.24);c=mix(c,gold,as6430box(q,vec2(sg*1.97,11.9),vec2(.34,.20)));for(int j=0;j<5;j++)c=mix(c,vec3(.84,.66,.31),as6430ell(q,vec2(sg*1.97+(float(j)-2.)*.12,11.85+.08*cos(float(j))),vec2(.11,.16)));}
 float window=as6430arch(q,0.,6.7,11.5,1.55,.95);float frame=as6430arch(q,0.,6.58,11.5,1.70,1.12);c=mix(c,vec3(.66,.64,.55),frame);vec3 glass=vec3(.30,.34,.33);float grid=max(as6430line(mod(q.x,.44),.22,.018),as6430line(mod(q.y,.40),.20,.018));c=mix(c,mix(glass,vec3(.57,.59,.53),grid),window);
 float ycurve=12.15+.95*exp(-q.x*q.x/1.9)-.24*exp(-pow(abs(q.x)-2.1,2.)/.25);float cornice=as6430line(q.y,ycurve,.20)*step(abs(q.x),3.0);c=mix(c,vec3(.48,.30,.25),cornice);c=mix(c,white,as6430line(q.y,ycurve+.22,.065)*step(abs(q.x),3.05));
 vec2 o=q-vec2(0.,15.7);float outer=as6430ell(q,vec2(0.,15.7),vec2(1.22,1.35));float inner=as6430ell(q,vec2(0.,15.7),vec2(1.01,1.12));c=mix(c,vec3(.72,.57,.43),outer);float radial=pow(abs(sin(atan(o.y/1.12,o.x/1.01)*6.)),24.);float rings=as6430line(length(o/vec2(1.01,1.12)),.68,.025);c=mix(c,mix(vec3(.31,.38,.39),vec3(.65,.65,.57),max(radial,rings)),inner);
 // Finite relief bands, medallions and arabesques belong only to the photographed front.
 for(int i=0;i<2;i++){float sg=i==0?-1.:1.;vec2 z=q-vec2(sg*3.0,12.45);float med=as6430ell(q,vec2(sg*3.,12.45),vec2(.35,.44));c=mix(c,vec3(.72,.66,.53),med);float wreath=1.-smoothstep(.07,.11,abs(length(z/vec2(.49,.58))-1.));c=mix(c,white,wreath);float scroll=as6430line(length((q-vec2(sg*2.8,14.2))/vec2(.32,.26)),1.,.12);c=mix(c,white,scroll);}
 float shield=as6430ell(q,vec2(0.,13.65),vec2(.48,.60));c=mix(c,vec3(.71,.69,.59),shield);return c;}
 if(abs(role-3.)<.25){float consoles=as6430line(mod(q.x+.15,.43),.215,.07);return mix(white,vec3(.46,.28,.25),consoles*.70);}
 if(abs(role-4.)<.25)return mix(vec3(.72,.71,.64),vec3(.55,.54,.47),pow(abs(sin(q.x*12.+q.y*7.)),16.)*.30);
 if(abs(role-20.)<.25){float side=floor(f.x*8.+.001),x=fract(f.x*8.);vec3 c=vec3(.25,.39,.35);float seam=as6430line(x,.03,.03)+as6430line(x,.97,.03);c=mix(c,vec3(.14,.25,.22),clamp(seam,0.,1.)*.5);if(side>4.5&&side<6.5){float opening=as6430arch(vec2(x,f.y),.5,18.7,19.75,.27,.26);float louver=as6430line(mod(f.y,.15),.075,.025);c=mix(c,mix(vec3(.09,.14,.12),vec3(.28,.38,.32),louver),opening);}return c;}
 if(abs(role-21.)<.25)return mix(vec3(.25,.40,.34),vec3(.15,.28,.24),as6430line(fract(f.x*8.),.03,.02)*.5);
 if(abs(role-22.)<.25)return vec3(.28,.29,.24);
 if(abs(role-23.)<.25)return vec3(.78,.62,.23);
 if(abs(role-25.)<.25)return vec3(.84,.81,.66);
 if(abs(role-11.)<.25){float joint=max(as6430line(mod(f.x,1.0),.5,.012),as6430line(mod(f.y,1.0),.5,.012));return mix(vec3(.48,.49,.45),vec3(.36,.37,.34),joint*.4);}
 // Only main red roof. Repeated image bands in aerial are not copied as invented dormers.
 float row=floor(f.z/.28);float joint=as6430line(mod(f.x+mod(row,2.)*.12,.24),.12,.009);float course=as6430line(mod(f.z,.28),.14,.008);return mix(vec3(.52,.25,.15),vec3(.35,.15,.085),max(joint,course)*.45);
}
`;
