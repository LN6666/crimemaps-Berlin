export const F169_COMPLETION_GLSL=String.raw`float nd169lineFrozen6426(float x,float w){return 1.-smoothstep(w,w+max(fwidth(x),.012),abs(x));}
float nd169lineFrozen6426(float x,float at,float w){return nd169lineFrozen6426(x-at,w);}
float nd169boxFrozen6426(vec2 q,vec2 at,vec2 sz){vec2 a=1.-smoothstep(sz,sz+vec2(.018),abs(q-at));return a.x*a.y;}
float nd169archFrozen6426(vec2 q,float w,float lo,float spring){float rect=nd169boxFrozen6426(q,vec2(0.,(lo+spring)*.5),vec2(w,(spring-lo)*.5));float cap=(1.-smoothstep(w,w+.018,length(q-vec2(0.,spring))))*step(spring,q.y);return max(rect,cap);}
vec3 neanderkircheLowerFrontFull500Frozen6426(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-4730.)>.25||abs(normal.y)>.05)return base;vec2 q=frame.xy;vec3 pale=vec3(.88,.84,.66),stone=vec3(.51,.53,.51),edge=vec3(.64,.66,.62),shade=vec3(.29,.33,.31),glass=vec3(.24,.29,.28),green=vec3(.13,.34,.32),c=pale;
 float dist=frame.w*.5-abs(q.x);float reach=mod(floor(p.y/.45),2.)<.5?.32:.18;float quoins=1.-smoothstep(reach,reach+.025,dist);c=mix(c,stone,quoins);c=mix(c,edge,quoins*nd169lineFrozen6426(mod(p.y,.45)-.225,.01)*.4);c=mix(c,stone,1.-smoothstep(.75,.82,p.y));
 if(frame.w>5.5){
  // Grounddoor only; natural7.5mclip of firstwindow, no talltowerstack squeezeddown.
  float opening=nd169boxFrozen6426(q,vec2(0.,1.56),vec2(.96,1.42));float surround=nd169boxFrozen6426(q,vec2(0.,1.66),vec2(1.18,1.57));c=mix(c,shade,surround);c=mix(c,stone,nd169boxFrozen6426(q,vec2(0.,1.66),vec2(1.12,1.52)));c=mix(c,edge,nd169lineFrozen6426(abs(q.x)-1.04,.045)*surround);c=mix(c,green,opening);
  float panel=nd169boxFrozen6426(q,vec2(.47,1.35),vec2(.34,.91))+nd169boxFrozen6426(q,vec2(-.47,1.35),vec2(.34,.91));c=mix(c,vec3(.10,.28,.27),panel*.6);c=mix(c,vec3(.26,.43,.39),nd169lineFrozen6426(q.x,.018)*opening);
  float transom=nd169boxFrozen6426(q,vec2(0.,2.77),vec2(.96,.20));c=mix(c,glass,transom);float mull=max(nd169lineFrozen6426(mod(q.x+.96,.38)-.19,.014),nd169lineFrozen6426(q.y,2.77,.014));c=mix(c,stone,mull*transom);c=mix(c,edge,nd169lineFrozen6426(q.y,2.54,.032)*opening);float handles=nd169boxFrozen6426(q,vec2(.13,1.22),vec2(.025,.07))+nd169boxFrozen6426(q,vec2(-.13,1.22),vec2(.025,.07));c=mix(c,vec3(.66,.62,.43),handles);
  c=mix(c,stone,nd169boxFrozen6426(q,vec2(0.,3.27),vec2(1.38,.085)));c=mix(c,edge,nd169boxFrozen6426(q,vec2(0.,3.39),vec2(1.45,.035)));float ped=nd169lineFrozen6426(q.y-(4.04-.46*abs(q.x)),.055)*step(.43,abs(q.x))*step(abs(q.x),1.42);c=mix(c,stone,ped);c=mix(c,edge,nd169lineFrozen6426(q.y-(4.11-.46*abs(q.x)),.025)*step(.45,abs(q.x))*step(abs(q.x),1.40));c=mix(c,stone,nd169boxFrozen6426(q,vec2(0.,3.80),vec2(.37,.15)));
  float framewin=nd169boxFrozen6426(q,vec2(0.,7.12),vec2(.64,1.08));float inner=nd169boxFrozen6426(q,vec2(0.,7.12),vec2(.50,.95));c=mix(c,stone,framewin);c=mix(c,glass,inner);float grille=max(nd169lineFrozen6426(mod(q.x+.5,.14)-.07,.012),nd169lineFrozen6426(mod(q.y,.31)-.155,.012));c=mix(c,edge,grille*inner);c=mix(c,stone,nd169boxFrozen6426(q,vec2(0.,6.00),vec2(.69,.045)));return c;
 }
 // Existinglowerportions ofwingarches; theiruppercaps exceed native7.5m andremain missing.
 float outer=nd169archFrozen6426(q,.94,5.65,7.20),inner=nd169archFrozen6426(q,.78,5.80,7.20);c=mix(c,stone,outer);c=mix(c,glass,inner);float bars=max(nd169lineFrozen6426(mod(q.x+.78,.18)-.09,.013),nd169lineFrozen6426(mod(q.y,.36)-.18,.013));c=mix(c,edge,bars*inner);return c;
}

float n169line(float x,float w){return 1.-smoothstep(w,w+max(.012,fwidth(x)),abs(x));}
float n169box(vec2 q,vec2 at,vec2 halfSize){vec2 d=abs(q-at)-halfSize;vec2 aa=max(fwidth(q),vec2(.012));return(1.-smoothstep(0.,aa.x,d.x))*(1.-smoothstep(0.,aa.y,d.y));}
float n169arch(vec2 q,float low,float spring,float width){float rect=n169box(q,vec2(0.,(low+spring)*.5),vec2(width,(spring-low)*.5));float cap=(1.-smoothstep(width,width+max(.015,fwidth(length(q-vec2(0.,spring)))),length(q-vec2(0.,spring))))*step(spring,q.y);return max(rect,cap);}
vec3 n169window(vec3 c,vec2 q,float low,float spring,float width){float frame=n169arch(q,low-.13,spring,width+.13),win=n169arch(q,low,spring,width);c=mix(c,vec3(.51,.53,.51),frame);c=mix(c,vec3(.24,.29,.28),win);float bars=max(n169line(mod(q.x+width,.18)-.09,.012),n169line(mod(q.y,.36)-.18,.012));return mix(c,vec3(.64,.66,.62),bars*win);}
float n169segment(vec2 p,vec2 a,vec2 b,float w){vec2 v=b-a;float t=clamp(dot(p-a,v)/dot(v,v),0.,1.);float d=length(p-a-v*t);return 1.-smoothstep(w,w+max(.004,fwidth(d)),d);}
float n169roman(vec2 q,int n){
 if(n==1)return n169segment(q,vec2(0.00000,-0.07000),vec2(0.00000,0.07000),.008);
 if(n==2)return max(n169segment(q,vec2(-0.03350,-0.07000),vec2(-0.03350,0.07000),.008),n169segment(q,vec2(0.03350,-0.07000),vec2(0.03350,0.07000),.008));
 if(n==3)return max(max(n169segment(q,vec2(-0.06700,-0.07000),vec2(-0.06700,0.07000),.008),n169segment(q,vec2(0.00000,-0.07000),vec2(0.00000,0.07000),.008)),n169segment(q,vec2(0.06700,-0.07000),vec2(0.06700,0.07000),.008));
 if(n==4)return max(max(n169segment(q,vec2(-0.03350,-0.07000),vec2(-0.03350,0.07000),.008),n169segment(q,vec2(0.00750,0.07000),vec2(0.03350,-0.07000),.008)),n169segment(q,vec2(0.03350,-0.07000),vec2(0.05950,0.07000),.008));
 if(n==5)return max(n169segment(q,vec2(-0.02600,0.07000),vec2(0.00000,-0.07000),.008),n169segment(q,vec2(0.00000,-0.07000),vec2(0.02600,0.07000),.008));
 if(n==6)return max(max(n169segment(q,vec2(-0.05950,0.07000),vec2(-0.03350,-0.07000),.008),n169segment(q,vec2(-0.03350,-0.07000),vec2(-0.00750,0.07000),.008)),n169segment(q,vec2(0.03350,-0.07000),vec2(0.03350,0.07000),.008));
 if(n==7)return max(max(max(n169segment(q,vec2(-0.09300,0.07000),vec2(-0.06700,-0.07000),.008),n169segment(q,vec2(-0.06700,-0.07000),vec2(-0.04100,0.07000),.008)),n169segment(q,vec2(0.00000,-0.07000),vec2(0.00000,0.07000),.008)),n169segment(q,vec2(0.06700,-0.07000),vec2(0.06700,0.07000),.008));
 if(n==8)return max(max(max(max(n169segment(q,vec2(-0.12650,0.07000),vec2(-0.10050,-0.07000),.008),n169segment(q,vec2(-0.10050,-0.07000),vec2(-0.07450,0.07000),.008)),n169segment(q,vec2(-0.03350,-0.07000),vec2(-0.03350,0.07000),.008)),n169segment(q,vec2(0.03350,-0.07000),vec2(0.03350,0.07000),.008)),n169segment(q,vec2(0.10050,-0.07000),vec2(0.10050,0.07000),.008));
 if(n==9)return max(max(n169segment(q,vec2(-0.03350,-0.07000),vec2(-0.03350,0.07000),.008),n169segment(q,vec2(0.00750,-0.07000),vec2(0.05950,0.07000),.008)),n169segment(q,vec2(0.00750,0.07000),vec2(0.05950,-0.07000),.008));
 if(n==10)return max(n169segment(q,vec2(-0.02600,-0.07000),vec2(0.02600,0.07000),.008),n169segment(q,vec2(-0.02600,0.07000),vec2(0.02600,-0.07000),.008));
 if(n==11)return max(max(n169segment(q,vec2(-0.05950,-0.07000),vec2(-0.00750,0.07000),.008),n169segment(q,vec2(-0.05950,0.07000),vec2(-0.00750,-0.07000),.008)),n169segment(q,vec2(0.03350,-0.07000),vec2(0.03350,0.07000),.008));
 if(n==12)return max(max(max(n169segment(q,vec2(-0.09300,-0.07000),vec2(-0.04100,0.07000),.008),n169segment(q,vec2(-0.09300,0.07000),vec2(-0.04100,-0.07000),.008)),n169segment(q,vec2(0.00000,-0.07000),vec2(0.00000,0.07000),.008)),n169segment(q,vec2(0.06700,-0.07000),vec2(0.06700,0.07000),.008));
return 0.;}

vec3 neanderkircheWhole169(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-4730.)<.25)return neanderkircheLowerFrontFull500Frozen6426(base,p,normal,frame,family);
 float role=floor(frame.z+.5);vec2 q=vec2(frame.x,p.y);vec3 pale=vec3(.88,.84,.66),stone=vec3(.51,.53,.51),edge=vec3(.64,.66,.62),dark=vec3(.16,.19,.18),c=pale;
 if(role==1001.){vec2 uv=frame.xy;float row=floor(uv.y/.24);vec2 f=fract((uv+vec2(mod(row,2.)*.15,0.))/vec2(.30,.24));vec2 d=min(f,1.-f)*vec2(.30,.24);vec2 aa=max(fwidth(uv),vec2(.015));float seam=max(1.-smoothstep(.01,.01+aa.x,d.x),1.-smoothstep(.01,.01+aa.y,d.y));return mix(vec3(.24,.27,.28),vec3(.16,.19,.21),seam*.35);}
 if(role==1010.)return stone;
 if(role==1011.)return vec3(.17,.19,.18);
 if(role==1012.)return vec3(.80,.65,.21);
 if(role==1013.)return vec3(.20,.26,.28);
 if(role==1007.)return vec3(.86,.87,.83);
 if(role==1008.)return mix(vec3(.075,.09,.085),vec3(.25,.27,.25),n169line(mod(p.y,.11)-.055,.018)*.60);
 if(role==1009.)return pale;
 if(role==1005.){if(p.y<8.35)return neanderkircheLowerFrontFull500Frozen6426(base,p,normal,frame,4730.);c=n169window(c,q,10.1,11.15,.65);c=mix(c,stone,n169line(p.y-9.55,.085));return c;}
 float facing=dot(normal,vec3(-.121397619,0.,.992603958));
 if(role==1003.){
  if(facing<-.8){
   if(p.y<8.35)return neanderkircheLowerFrontFull500Frozen6426(base,p,normal,frame,4730.);
   for(int j=0;j<4;j++){float at=j==0?10.8:j==1?14.3:j==2?17.8:21.5;float outwin=n169box(q,vec2(0.,at),vec2(.66,1.0)),win=n169box(q,vec2(0.,at),vec2(.51,.87));c=mix(c,stone,outwin);c=mix(c,vec3(.24,.29,.28),win);float grille=max(n169line(mod(q.x+.51,.14)-.07,.012),n169line(mod(q.y,.31)-.155,.012));c=mix(c,edge,grille*win);}
   c=mix(c,stone,max(n169line(p.y-9.5,.05),max(n169line(p.y-16.7,.05),n169line(p.y-23.0,.05))));
  }
  float dist=frame.w*.5-abs(q.x),reach=mod(floor(p.y/.45),2.)<.5?.32:.18;c=mix(c,stone,1.-smoothstep(reach,reach+.025,dist));return c;
 }
 if(role==1006.){
  if(facing<-.9){vec2 d=vec2(q.x,p.y-26.35);float radius=length(d);float dial=1.-smoothstep(.91,.93,radius);c=mix(c,vec3(.94,.94,.89),dial);c=mix(c,dark,n169line(radius-.91,.025));float numerals=0.;for(int i=1;i<=12;i++){float a=float(i)*.5235987756;vec2 at=vec2(sin(a),cos(a))*.73;vec2 v=d-at;vec2 glyph=vec2(dot(v,vec2(cos(a),-sin(a))),dot(v,vec2(sin(a),cos(a))));numerals=max(numerals,n169roman(glyph,i));}c=mix(c,dark,numerals*dial);float hands=max(n169segment(d,vec2(0.),vec2(.10,.69),.017),n169segment(d,vec2(0.),vec2(-.10,.47),.026));c=mix(c,dark,hands*dial);c=mix(c,dark,1.-smoothstep(.045,.065,radius));}
  else if(facing<-.1){vec2 d=(q-vec2(0.,26.40))/vec2(.25,.40);float a=length(d);c=mix(c,stone,1.-smoothstep(1.0,1.15,a));c=mix(c,dark,1.-smoothstep(.82,1.,a));}
  c=mix(c,stone,n169line(p.y-27.65,.06));return c;
 }
 if(role==1002.){
  // North main door precisely centered at original node5074193654.
  float surround=n169box(q,vec2(0.,1.65),vec2(1.17,1.65)),leaf=n169box(q,vec2(0.,1.20),vec2(.94,1.20)),transom=n169box(q,vec2(0.,2.80),vec2(.94,.38));c=mix(c,stone,surround);c=mix(c,vec3(.10,.28,.27),leaf);float panels=n169box(q,vec2(-.46,1.2),vec2(.33,.93))+n169box(q,vec2(.46,1.2),vec2(.33,.93));c=mix(c,vec3(.13,.34,.32),panels);c=mix(c,vec3(.24,.29,.28),transom);float bars=max(n169line(mod(q.x+.94,.38)-.19,.012),n169line(mod(q.y,.24)-.12,.012));c=mix(c,stone,bars*transom);c=mix(c,vec3(.08,.16,.15),n169line(q.x,.015)*leaf);c=n169window(c,q,3.85,7.15,1.02);return c;
 }
 if(role==1004.){
  // Only two observed southeast interior window bays are registered here.
  // Hidden/unconfirmed other side openings are not replicated as a grid.
  c=n169window(c,vec2(q.x+6.0,p.y),1.7,7.2,.95);c=n169window(c,vec2(q.x+.5,p.y),1.7,7.2,.95);return c;
 }
 return pale;
}
`;
