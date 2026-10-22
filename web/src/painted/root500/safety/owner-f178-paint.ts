export const OWNER_F178_PAINT_GLSL=`
float ka178Box(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;return 1.-smoothstep(-.018,.018,max(d.x,d.y));}
float ka178Arch(vec2 q,float width,float bottom,float spring){float r=width*.5;return step(abs(q.x),r)*step(bottom,q.y)*step(q.y,spring+sqrt(max(0.,r*r-q.x*q.x)));}
vec3 ka178Window(vec3 c,vec2 q,float x,float bot,float top,float width,float arch){vec2 a=q-vec2(x,0.);float surround=arch>.5?ka178Arch(a,width+.4,bot-.15,top):ka178Box(a,vec2(0.,(bot+top)*.5),vec2(width*.5+.23,(top-bot)*.5+.18));float pane=arch>.5?ka178Arch(a,width,bot,top):ka178Box(a,vec2(0.,(bot+top)*.5),vec2(width*.5,(top-bot)*.5));c=mix(c,vec3(.83,.72,.52),surround);c=mix(c,vec3(.23,.28,.29),pane);float bar=ka178Box(a,vec2(0.,(bot+top)*.5),vec2(.045,20.));for(int j=0;j<5;j++){float yy=bot+.85+float(j)*1.03;bar=max(bar,ka178Box(a,vec2(0.,yy),vec2(width,.035)));}for(int j=0;j<2;j++){float xx=(float(j)*2.-1.)*width*.25;bar=max(bar,ka178Box(a,vec2(xx,(bot+top)*.5),vec2(.026,20.)));}if(arch>.5){float radius=width*.5;float rr=length(vec2(a.x,a.y-top));bar=max(bar,(1.-smoothstep(.025,.055,abs(rr-radius*.58)))*step(top,a.y));for(int j=0;j<5;j++){float ang=.5235988*float(j+1),line=abs(a.x*cos(ang)+(a.y-top)*sin(ang));bar=max(bar,(1.-smoothstep(.025,.05,line))*step(top,a.y));}}return mix(c,vec3(.76,.79,.73),bar*pane);}
vec3 ka178Mosaic(vec3 c,vec2 q,float x,float bot,float top){vec2 z=q-vec2(x,(bot+top)*.5);float border=ka178Box(z,vec2(0.),vec2(.80,(top-bot)*.5)),inner=ka178Box(z,vec2(0.),vec2(.62,(top-bot)*.5-.17));c=mix(c,vec3(.71,.58,.35),border);c=mix(c,vec3(.42,.27,.24),inner);float oval=length(vec2(z.x/.40,z.y/.71));c=mix(c,vec3(.59,.67,.59),(1.-smoothstep(.90,1.0,oval))*inner);float rim=1.-smoothstep(.03,.08,abs(oval-1.));c=mix(c,vec3(.86,.72,.44),rim*inner);float motif=max(ka178Box(z,vec2(0.,1.3),vec2(.075,.48)),ka178Box(z,vec2(0.,-1.3),vec2(.075,.48)));c=mix(c,vec3(.79,.66,.43),motif*inner);return c;}
vec3 kunstakademieRecovery178(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float x=frame.x,y=frame.y,v=frame.z,k=frame.w;vec2 q=vec2(x,y);
 if(k<.5){vec3 c=vec3(.40,.41,.40);float joint=1.-smoothstep(.012,.035,abs(mod(v,2.1)-1.05));return mix(c,vec3(.33,.34,.33),joint*.28);}
 if(k>4.5)return vec3(.78,.69,.53);
 vec3 c=y<2.6?vec3(.26,.27,.24):y<16.5?vec3(.76,.67,.51):vec3(.75,.62,.42);
 float bed=1.-smoothstep(.018,.045,abs(mod(y,.52)-.26));float joint=1.-smoothstep(.015,.04,abs(mod(x+mod(floor(y/.52),2.)*.60,1.2)-.60));if(y<16.5)c=mix(c,vec3(.59,.52,.40),max(bed,joint*.55)*.28);else{float brick=max(1.-smoothstep(.015,.035,abs(mod(y,.16)-.08)),1.-smoothstep(.012,.03,abs(mod(x+mod(floor(y/.16),2.)*.20,.4)-.2)));c=mix(c,vec3(.62,.52,.36),brick*.15);}
 if(k>3.5)return c; // Solid upper height-step walls; never ordinary window templates.
 if(k<1.5){
 // Exact source facade composition:6 lower-wing bays on each side +3 center and3 per end pavilion =21 real openings per principal row.
 for(int side=0;side<2;side++){float s=side==0?-1.:1.;for(int i=0;i<6;i++){float xx=s*(25.2+float(i)*5.1);c=ka178Window(c,q,xx,.55,2.05,1.8,0.);c=ka178Window(c,q,xx,4.1,8.6,2.9,0.);c=ka178Window(c,q,xx,10.4,15.1,2.9,0.);c=ka178Window(c,q,xx,17.6,23.7,3.1,0.);if(i<5)c=ka178Mosaic(c,q,s*(27.75+float(i)*5.1),17.55,23.7);}
 for(int i=0;i<3;i++){float xx=s*(55.7+float(i)*9.9);c=ka178Window(c,q,xx,.55,2.05,1.8,0.);c=ka178Window(c,q,xx,4.1,8.6,3.2,0.);c=ka178Window(c,q,xx,10.4,15.1,3.2,0.);c=ka178Window(c,q,xx,17.7,i==1?25.35:23.7,i==1?6.2:3.6,i==1?1.:0.);}
 // Blind central niches and circular reliefs beside greatAula arch: masonry, no glass.
 float xx=s*8.8;float niche=ka178Arch(vec2(x-xx,y),3.9,18.0,23.15);c=mix(c,vec3(.54,.49,.38),niche);float rr=length(vec2(x-xx,y-26.8));c=mix(c,vec3(.64,.51,.34),1.-smoothstep(1.2,1.28,rr));c=mix(c,vec3(.82,.69,.47),1.-smoothstep(.05,.12,abs(rr-1.16)));c=ka178Mosaic(c,q,s*10.,10.35,15.1);
 c=ka178Window(c,q,s*18.0,.55,2.05,1.8,0.);c=ka178Window(c,q,s*18.,4.1,8.6,3.6,0.);c=ka178Window(c,q,s*18.,10.4,15.1,3.6,0.);c=ka178Window(c,q,s*18.,17.6,23.7,4.2,0.);
 }
 c=ka178Window(c,q,0.,.55,2.05,1.8,0.);c=ka178Window(c,q,0.,4.1,8.6,3.4,0.);c=ka178Window(c,q,0.,10.4,15.1,3.4,0.);c=ka178Window(c,q,0.,18.0,25.0,7.2,1.);
 // Pilaster/cornice emphasis confined to solid zones between northern bays.
 float pil=0.;for(int side=0;side<2;side++){float s=side==0?-1.:1.;for(int i=0;i<7;i++)pil=max(pil,ka178Box(q,vec2(s*(22.65+float(i)*5.1),20.6),vec2(.14,3.55)));for(int i=0;i<4;i++)pil=max(pil,ka178Box(q,vec2(s*(i==0?52.9:(i==1?60.5:(i==2?71.2:78.0))),21.6),vec2(.20,4.6)));}c=mix(c,vec3(.86,.73,.52),pil);
 }else if(k<2.5){
 // South/rear is the plainer facade in the professional record; restrained rectangular openings, no copied north mosaics.
 for(int i=0;i<27;i++){float xx=-74.5+float(i)*5.72;for(int j=0;j<4;j++){float bot=.55+float(j)*6.45;c=ka178Window(c,q,xx,bot,bot+(j==0?1.55:3.75),2.0,0.);}}
 }else{
 // East/west short faces: three large axes; main door only east at nativeV about-1.
 for(int i=0;i<3;i++){float xx=-8.+float(i)*8.0;c=ka178Window(c,q,xx,.55,2.05,1.8,0.);for(int j=0;j<3;j++){float bot=4.1+float(j)*6.65;c=ka178Window(c,q,xx,bot,bot+4.6,3.15,0.);}if(i<2)c=ka178Mosaic(c,q,xx+4.,17.4,23.9);}
 // The east-facing source normals identify the historical entrance; no floating sill or pane grid on door.
 float east=normal.x*.950376+normal.z*(-.311103);if(east>.7&&abs(x+.9)<2.15&&y<4.15){float outer=ka178Arch(vec2(x+.9,y),4.25,0.,2.2),door=ka178Arch(vec2(x+.9,y),3.5,0.,2.2);c=mix(c,vec3(.82,.72,.54),outer);c=mix(c,vec3(.24,.21,.17),door);c=mix(c,vec3(.51,.43,.31),ka178Box(q,vec2(-.9,1.55),vec2(.04,1.55))*door);}
 }
 for(int i=0;i<4;i++){float yy=i==0?2.65:(i==1?9.25:(i==2?16.3:24.65));float keep=(i==3&&k<1.5&&(abs(x)<4.0||abs(abs(x)-65.6)<3.5))?0.:1.;float line=ka178Box(q,vec2(0.,yy),vec2(100.,.13))*keep;c=mix(c,vec3(.65,.55,.39),line);c=mix(c,vec3(.86,.75,.56),ka178Box(q,vec2(0.,yy+.16),vec2(100.,.045))*keep);}return c;
}
`;
