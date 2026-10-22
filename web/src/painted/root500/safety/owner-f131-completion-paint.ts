export const F131_COMPLETION_GLSL=`float f131c6415OldBox(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;return 1.-smoothstep(-.012,.012,max(d.x,d.y));}
float f131c6415OldArch(vec2 q,float x,float low,float spring,float r){float stem=f131c6415OldBox(q,vec2(x,(low+spring)*.5),vec2(r,(spring-low)*.5));float cap=(1.-smoothstep(r-.014,r+.014,length(q-vec2(x,spring))))*step(spring,q.y);return max(stem,cap);}
float f131c6415OldPoint(vec2 q,float x,float low,float high,float r){float xx=abs(q.x-x)/r;float top=high-r*.9+r*.9*sqrt(max(0.,1.-xx));return step(xx,1.)*step(low,q.y)*step(q.y,top);}
vec3 f131c6415OldStone(vec2 q){float row=floor(q.y/.23);vec2 cell=vec2(fract(q.x/.51+mod(row,2.)*.5),fract(q.y/.23));float seam=max(1.-smoothstep(.02,.06,min(cell.x,1.-cell.x)),1.-smoothstep(.02,.06,min(cell.y,1.-cell.y)));return mix(vec3(.74,.70,.60),vec3(.54,.52,.46),seam*.34);}
vec3 f131c6415OldSlot(vec3 c,vec2 q,float x,float lo,float spring,float r,bool louver){float rim=f131c6415OldArch(q,x,lo-.12,spring,r+.12);float hole=f131c6415OldArch(q,x,lo,spring,r);c=mix(c,vec3(.80,.76,.66),rim);c=mix(c,vec3(.13,.15,.14),hole);float bars=louver?step(.65,fract(q.y/.24)):max(step(.96,fract(q.y/.8)),1.-smoothstep(.025,.05,abs(q.x-x)));return mix(c,vec3(.46,.49,.46),hole*bars*.7);}
vec3 f131c6415OldFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec2 q=vec2(frame.x,p.y);float u=q.x,y=q.y,W=max(frame.w,.01),H=frame.z;vec3 trim=vec3(.81,.77,.66);vec3 c=f131c6415OldStone(q);
 if(family==4893.){
  // Actual originalrooftriangles only. Source material copper/slate remains unchanged; pale finish is photo evidence, chemistry unknown.
  if(H<20.&&H>18.5)return mix(vec3(.25,.27,.25),vec3(.18,.20,.19),step(.93,fract(u/.31))*.4);
  float along=y/max(.18,sqrt(max(.01,1.-normal.y*normal.y)));float seam=max(step(.975,fract(u/.65)),step(.975,fract(along/1.2)));return mix(vec3(.68,.71,.69),vec3(.40,.45,.43),seam*.52);
 }
 if(family==4887.){
  if(y<3.||normal.z>.98&&y<20.)return base;
  // East broadtowerfaces have two bays each containing pairedarches. North upperfacet visible; low side phase unknown.
  float bay=W*.5;float bx=mod(u,bay)-bay*.5;float band=0.;
  for(int j=1;j<5;j++){float yy=float(j)*7.1;band=max(band,f131c6415OldBox(q,vec2(W*.5,yy),vec2(W*.5,.12)));}
  c=mix(c,vec3(.39,.43,.39),band);
  if(y>28.8){
   c=f131c6415OldSlot(c,q,bay*.5-bay*.13,30.,34.3,bay*.15,true);c=f131c6415OldSlot(c,q,bay*.5+bay*.13,30.,34.3,bay*.15,true);c=f131c6415OldSlot(c,q,bay*1.5-bay*.13,30.,34.3,bay*.15,true);c=f131c6415OldSlot(c,q,bay*1.5+bay*.13,30.,34.3,bay*.15,true);
  }else if(y>7.){
   float stage=floor(y/7.1);float low=stage*7.1+1.5;float top=stage*7.1+4.6;
   float outer=f131c6415OldArch(vec2(bx,y),-bay*.16,low,top,bay*.20);outer=max(outer,f131c6415OldArch(vec2(bx,y),bay*.16,low,top,bay*.20));float inner=max(f131c6415OldArch(vec2(bx,y),-bay*.16,low+.14,top,bay*.16),f131c6415OldArch(vec2(bx,y),bay*.16,low+.14,top,bay*.16));c=mix(c,vec3(.46,.47,.41),outer);c=mix(c,f131c6415OldStone(q)*.97,inner);
  }else{c=f131c6415OldSlot(c,q,W*.25,3.1,5.3,.31,false);c=f131c6415OldSlot(c,q,W*.75,3.1,5.3,.31,false);}
  float topArc=f131c6415OldArch(vec2(mod(u,W/6.)-W/12.,y),0.,35.5,36.25,W/15.);return mix(c,vec3(.45,.46,.40),topArc*.65);
 }
 if(family==4888.){
  if(H>22.){
   if(y<18.2)return base;
   float gallery=f131c6415OldArch(vec2(mod(u,W/12.)-W/24.,y),0.,18.25,19.45,W/34.);c=mix(c,vec3(.20,.21,.18),gallery);
   for(int j=0;j<3;j++){float xx=W*(.40+float(j)*.10);float yy=j==1?22.25:21.85;float disk=1.-smoothstep(.43,.52,length(q-vec2(xx,yy)));float ring=1.-smoothstep(.07,.12,abs(length(q-vec2(xx,yy))-.47));c=mix(c,trim,disk*.4);c=mix(c,vec3(.48,.48,.41),ring*.8);}return c;
  }
  if(y<2.2)return base;
  float bay=W/5.;float bx=mod(u,bay)-bay*.5;float blind=f131c6415OldArch(vec2(bx,y),0.,3.2,5.6,bay*.43);float inside=f131c6415OldArch(vec2(bx,y),0.,3.3,5.6,bay*.36);c=mix(c,vec3(.46,.46,.40),blind);c=mix(c,f131c6415OldStone(q),inside);
  c=f131c6415OldSlot(c,q,W*.27,7.1,10.8,.70,false);c=f131c6415OldSlot(c,q,W*.73,7.1,10.8,.70,false);
  float gallery=f131c6415OldArch(vec2(mod(u,.72)-.36,y),0.,14.35,15.45,.27);c=mix(c,vec3(.16,.18,.15),gallery);float balustrade=f131c6415OldBox(q,vec2(W*.5,13.55),vec2(W*.5,.56));float panels=step(.18,fract(u/.72));c=mix(c,vec3(.53,.53,.46),balustrade*panels*.65);
  float bands=max(f131c6415OldBox(q,vec2(W*.5,6.7),vec2(W*.5,.13)),max(f131c6415OldBox(q,vec2(W*.5,12.9),vec2(W*.5,.12)),f131c6415OldBox(q,vec2(W*.5,15.88),vec2(W*.5,.12))));return mix(c,trim,bands);
 }
 if(family==4889.){
  if(H>25.){
   if(y<14.)return base;
   float enclosing=f131c6415OldPoint(q,W*.5,14.7,25.1,W*.34);float inset=f131c6415OldPoint(q,W*.5,14.95,24.85,W*.32);c=mix(c,vec3(.48,.46,.39),enclosing);c=mix(c,f131c6415OldStone(q),inset);
   for(int j=0;j<3;j++){float xx=W*(.32+float(j)*.18);float top=j==1?24.0:22.6;float rim=f131c6415OldPoint(q,xx,15.05,top,W*.085);float pane=f131c6415OldPoint(q,xx,15.15,top-.15,W*.074);c=mix(c,trim,rim);c=mix(c,vec3(.24,.34,.35),pane);float mull=max(step(.96,fract(y/.85)),1.-smoothstep(.025,.055,abs(u-xx)));c=mix(c,vec3(.62,.65,.60),pane*mull*.8);}
   for(int j=0;j<8;j++){float xx=W*(.18+float(j)*.091);c=f131c6415OldSlot(c,q,xx,27.8,29.45,W*.027,false);}
   float bal=f131c6415OldBox(q,vec2(W*.5,26.8),vec2(W*.39,.54));c=mix(c,vec3(.46,.47,.40),bal*step(.17,fract(u/(W/11.)))*.6);float blind=f131c6415OldArch(vec2(mod(u,W/14.)-W/28.,y),0.,30.0,30.65,W/40.);return mix(c,vec3(.43,.43,.37),blind*.7);
  }
  if(y<.3)return base;
  for(int j=0;j<3;j++){float xx=W*(.23+float(j)*.27);float top=j==1?4.2:3.55;float rim=f131c6415OldPoint(q,xx,.35,top,W*.115);float door=f131c6415OldPoint(q,xx,.4,top-.17,W*.10);c=mix(c,vec3(.43,.40,.32),rim);c=mix(c,vec3(.29,.25,.19),door);c=mix(c,vec3(.41,.34,.24),door*step(.92,fract(u/.3)));c=f131c6415OldSlot(c,q,xx,5.1,j==1?8.4:7.8,W*.053,false);}
  float band=f131c6415OldArch(vec2(mod(u,W/15.)-W/30.,y),0.,4.48,4.82,W/39.);c=mix(c,vec3(.46,.43,.35),band*.75);c=mix(c,vec3(.25,.25,.21),f131c6415OldBox(q,vec2(W*.5,12.7),vec2(.10,.46)));return c;
 }
 if(family==4892.){
  if(y<10.5)return base;
  float bands=max(f131c6415OldBox(q,vec2(W*.5,13.7),vec2(W*.5,.12)),f131c6415OldBox(q,vec2(W*.5,18.3),vec2(W*.5,.12)));c=mix(c,vec3(.40,.41,.35),bands);float blind=f131c6415OldArch(q,W*.5,14.3,17.7,W*.34);float inner=f131c6415OldArch(q,W*.5,14.4,17.7,W*.28);c=mix(c,vec3(.46,.46,.39),blind);c=mix(c,f131c6415OldStone(q),inner);c=f131c6415OldSlot(c,q,W*.5,19.0,20.2,.12,false);return c;
 }
 return base;
}
float f131c6415Line(float x,float spacing,float width){return 1.-smoothstep(width,width+max(fwidth(x),.012),abs(mod(x+spacing*.5,spacing)-spacing*.5));}
float f131c6415Ellipse(vec2 q,vec2 h){return 1.-smoothstep(.96,1.04,length(q/h));}
vec3 f131c6415Window(vec3 c,vec2 q,float center,float lo,float high,float width,bool pointed,float lights){float a=pointed?f131c6415OldPoint(q,center,lo-.15,high+.15,width+.15):f131c6415OldArch(q,center,lo-.15,high-width,width+.15);float b=pointed?f131c6415OldPoint(q,center,lo,high,width):f131c6415OldArch(q,center,lo,high-width,width);c=mix(c,vec3(.81,.77,.66),a);float grille=f131c6415Line(q.y,.70,.025);for(int j=1;j<4;j++){if(float(j)>=lights)break;grille=max(grille,f131c6415OldBox(q,vec2(center-width+2.*width*float(j)/lights,q.y),vec2(.035,100.)));}return mix(c,mix(vec3(.19,.29,.34),vec3(.56,.60,.57),grille),b);}
vec3 f131c6415Rose(vec3 c,vec2 q,float radius){float rr=length(q);c=mix(c,vec3(.48,.47,.41),1.-smoothstep(radius+.15,radius+.22,rr));c=mix(c,vec3(.80,.77,.67),1.-smoothstep(radius,radius+.07,rr));float pane=1.-smoothstep(radius-.16,radius-.10,rr);c=mix(c,vec3(.16,.25,.32),pane);float stone=1.-smoothstep(.035,.07,abs(rr-radius*.31));for(int i=0;i<8;i++){float a=.785398163*float(i);vec2 o=radius*.62*vec2(cos(a),sin(a));stone=max(stone,1.-smoothstep(.035,.07,abs(length(q-o)-radius*.25)));}return mix(c,vec3(.65,.64,.54),stone*pane);}
vec3 f131c6415LowerTriplet(vec3 c,vec2 q,float w){float o=f131c6415OldArch(q,w*.5,11.0,12.45,w*.30);c=mix(c,vec3(.80,.77,.67),o);for(int i=0;i<3;i++){float x=w*(.32+.18*float(i));c=f131c6415Window(c,q,x,11.15,i==1?13.35:12.95,w*.07,false,1.);}return c;}
vec3 f131c6415Door(vec3 c,vec2 q){c=mix(c,vec3(.45,.44,.39),f131c6415OldBox(q,vec2(0.,1.8),vec2(1.10,1.8)));c=mix(c,vec3(.25,.27,.24),f131c6415OldBox(q,vec2(0.,1.65),vec2(.83,1.55)));float jamb=max(f131c6415OldBox(q,vec2(-.99,1.9),vec2(.13,1.9)),f131c6415OldBox(q,vec2(.99,1.9),vec2(.13,1.9)));c=mix(c,vec3(.68,.66,.57),jamb);c=mix(c,vec3(.53,.52,.44),f131c6415OldBox(q,vec2(0.,3.7),vec2(1.25,.18)));float panel=f131c6415OldBox(q,vec2(0.,4.4),vec2(.82,.45));c=mix(c,vec3(.63,.61,.52),panel);for(int j=0;j<3;j++){float x=(float(j)-1.)*.43;float silhouette=max(f131c6415Ellipse(q-vec2(x,4.63),vec2(.11,.12)),f131c6415Ellipse(q-vec2(x,4.35),vec2(.14,.25)));c=mix(c,vec3(.48,.47,.40),silhouette*panel);}return c;}
vec3 stGereonComplete131(vec3 base,vec3 p,vec3 n,vec4 frame,float family){
 bool old=abs(family-4887.)<.25||abs(family-4888.)<.25||abs(family-4889.)<.25||abs(family-4892.)<.25||abs(family-4893.)<.25;float y=p.y;
 if(old){vec3 c=f131c6415OldFacade(base,p,n,frame,family);bool neutral=family==4887.?(y<3.||(n.z>.98&&y<20.)):family==4888.?(frame.z>22.?y<18.2:y<2.2):family==4889.?(frame.z>25.?y<14.:y<.3):family==4892.?y<10.5:false;if(neutral)c=f131c6415OldStone(vec2(frame.x,y));if(family==4889.&&frame.z>25.&&y<14.)c=f131c6415LowerTriplet(c,vec2(frame.x,y),frame.w);return c;}
 if(abs(family-6415.)>.25)return base;float role=frame.z,u=frame.x,W=max(frame.y,.01);vec2 q=vec2(u,y);vec3 c=f131c6415OldStone(vec2(frame.x,y));
 if(abs(role-23.)<.25)return vec3(.60,.53,.31);
 if(abs(role-21.)<.25){vec2 radial=normalize(frame.xy-vec2(-9.7,1.4));return n.y>.2?vec3(.66,.69,.69):dot(n.xz,radial)>.5?vec3(.55,.18,.14):vec3(.59,.62,.61);}
 if(frame.w>.5&&n.y>.02){if(abs(role-7.)<.25||abs(role-11.)<.25||abs(role-17.)<.25){float seam=max(f131c6415Line(frame.x,.27,.006),f131c6415Line(frame.y,.22,.006));return mix(vec3(.24,.27,.27),vec3(.14,.16,.17),seam*.22);}float h=role>13.5&&role<14.5?47.:role>7.5&&role<9.5?42.:role>5.5&&role<6.5?24.:15.;return f131c6415OldFacade(base,p,n,vec4(frame.x,frame.y,h,1.),4893.);}
 if(abs(role-22.)<.25){float bands=max(f131c6415OldBox(vec2(0.,y),vec2(0.,13.8),vec2(100.,.12)),f131c6415OldBox(vec2(0.,y),vec2(0.,20.4),vec2(100.,.13)));return mix(c,vec3(.57,.56,.49),bands*.5);}
 if(abs(role-14.)<.25){if(y>=14.)return f131c6415OldFacade(base,p,n,vec4(u,0.,32.,W),4889.);return f131c6415LowerTriplet(c,q,W);}
 if(abs(role-8.)<.25||abs(role-9.)<.25){if(y>=3.)return f131c6415OldFacade(base,p,n,vec4(u,0.,42.,W),4887.);return c;}
 if(abs(role-7.)<.25){if(y>=2.2)return f131c6415OldFacade(base,p,n,vec4(frame.y+3.82,0.,19.,13.73999),4888.);return c;}
 if(abs(role-3.)<.25||abs(role-4.)<.25||abs(role-12.)<.25||abs(role-16.)<.25){if(y>=10.5)return f131c6415OldFacade(base,p,n,vec4(u,0.,role<3.5?22.:role<4.5?23.:role<12.5?26.:14.,W),4892.);if(y<8.&&y>3.5&&abs(n.y)<.1)c=f131c6415Window(c,q,W*.5,4.0,5.6,min(.24,W*.2),false,1.);return c;}
 // West porch is a separate source: three entry arches and stepped three-light upper register are confined to its actual west front.
 if(abs(role-5.)<.25){if(n.x<-.7)return f131c6415OldFacade(base,p,n,vec4(u,0.,15.,W),4889.);if(abs(n.z)>.7)c=f131c6415Door(c,vec2(frame.x+30.,y));return c;}
 // The north porch-side wall has its own photographed rose and high small light; no south mirror.
 if(abs(role-2.)<.25&&n.z>.7){c=f131c6415Rose(c,vec2(frame.x+26.4,y-4.9),1.32);c=f131c6415Window(c,vec2(frame.x,y),-26.4,9.0,11.3,.40,false,1.);float blind=f131c6415OldArch(vec2(frame.x,y),-29.0,.2,3.0,1.35)-f131c6415OldArch(vec2(frame.x,y),-29.0,.25,3.0,1.20);c=mix(c,vec3(.46,.45,.39),max(blind,0.));c=mix(c,vec3(.19,.22,.20),f131c6415OldBox(vec2(frame.x,y),vec2(-29.,1.25),vec2(.46,1.15)));return c;}
 // North choir's two directly visible three-light Gothic windows. Unseen southern opening layout remains unguessed.
 if(abs(role-6.)<.25&&n.z>.7){for(int j=0;j<2;j++)c=f131c6415Window(c,vec2(frame.x,y),j==0?11.0:23.3,7.6,17.8,2.40,true,3.);return c;}
 if(abs(role-6.)<.25&&n.x>.7&&y>=18.2)return f131c6415OldFacade(base,p,n,vec4(u,0.,24.,W),4888.);
 // Aerial north low-ring facets show individual upper roundheads and lower small windows; each is tied to its source face.
 if((abs(role-24.)<.25||abs(role-25.)<.25)&&n.z>.3){c=f131c6415Window(c,q,W*.5,5.7,8.3,min(.60,W*.14),false,1.);if(abs(role-25.)<.25){float door=f131c6415OldArch(q,W*.5,.15,1.8,min(.72,W*.20));c=mix(c,vec3(.18,.21,.20),door);}else c=mix(c,vec3(.22,.25,.24),f131c6415OldBox(q,vec2(W*.5,2.1),vec2(min(.40,W*.10),.45)));return c;}
 // Small south porch apse and return are distinct from main hall; photographed roundheaded lights and a blind cornice.
 if(abs(role-19.)<.25&&n.z<.5){float theta=atan(frame.y+11.0,frame.x+26.3);for(int j=0;j<2;j++){float a=j==0?-1.570796327:-3.141592654;float along=mod(theta-a+3.141592654,6.283185307)-3.141592654;c=f131c6415Window(c,vec2(along*2.45,y),0.,2.8,7.2,.49,false,1.);}float fringe=f131c6415OldArch(vec2(mod(u,.65)-.325,y),0.,8.3,8.65,.22)-f131c6415OldArch(vec2(mod(u,.65)-.325,y),0.,8.36,8.65,.16);c=mix(c,vec3(.47,.46,.40),max(fringe,0.));return c;}
 // Separate dark-roofed south annex: three staggered roundheads observed directly, not a decagon window template.
 if(abs(role-17.)<.25&&n.z<-.7){for(int j=0;j<3;j++)c=f131c6415Window(c,vec2(frame.x,y),-7.3+(float(j)-1.)*2.25,j==1?1.7:1.9,j==1?5.5:4.7,j==1?.67:.38,false,1.);return c;}
 return c;
}
`;
