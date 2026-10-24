export const BREMEN_OLDTOWN_CHURCHES_GLSL=/*glsl*/`
float c70f266Box(vec2 q,vec2 c,vec2 h){vec2 aa=max(fwidth(q),vec2(.018));vec2 a=1.-smoothstep(h-aa,h+aa,abs(q-c));return a.x*a.y;}
float c70f266Line(float v,float c,float w){float aa=max(fwidth(v),.015);return 1.-smoothstep(w-aa,w+aa,abs(v-c));}
float c70f266Arch(vec2 q,float x,float b,float r,float t,float gothic){float sy=t-r*(gothic>.5?1.732:1.);float d;if(q.y<sy)d=abs(q.x-x)-r;else if(gothic>.5)d=max(length(q-vec2(x-r,sy)),length(q-vec2(x+r,sy)))-2.*r;else d=length(q-vec2(x,sy))-r;float aa=max(fwidth(d),.018);return (1.-smoothstep(-aa,aa,d))*smoothstep(b-aa,b+aa,q.y);}
vec3 c70f266Stone(vec2 q,vec3 col,float rowh){float row=floor(q.y/rowh),bx=q.x+mod(row,2.)*.49;float x=mod(bx,1.13),y=mod(q.y,rowh);float j=1.-smoothstep(.012,.035,min(min(x,1.13-x),min(y,rowh-y)));float v=.037*sin(floor(bx/1.13)*7.1+row*3.8);return mix(col+v,vec3(.66,.61,.52),j*.5);}
vec3 c70f266RectWindow(vec3 c,vec2 q,vec2 at,vec2 size,vec3 trim){float s=c70f266Box(q,at,size+vec2(.12,.13)),g=c70f266Box(q,at,size);c=mix(c,trim,s);c=mix(c,vec3(.15,.19,.18),g);float cross=max(c70f266Box(q,at,vec2(.033,size.y)),c70f266Box(q,at+vec2(0.,.12),vec2(size.x,.035)));c=mix(c,trim*.8,cross*g);float sill=c70f266Box(q,at-vec2(0.,size.y+.13),vec2(size.x+.17,.07));return mix(c,trim*.76,sill);}
vec3 c70f266Portal(vec3 c,vec2 q,float x,float r,float top,float gothic,vec3 wood){float outer=c70f266Arch(q,x,.02,r+.22,top+.26,gothic),inner=c70f266Arch(q,x,.03,r,top,gothic);c=mix(c,vec3(.49,.43,.34),outer);c=mix(c,wood,inner);float side=1.-smoothstep(.0,.30,r-abs(q.x-x));c=mix(c,vec3(.055,.066,.055),side*inner*.7);float planks=c70f266Line(mod(q.x-x,.22),.11,.012);c=mix(c,wood*.64,inner*planks);c=mix(c,wood*.47,c70f266Line(q.x,x,.027)*inner);float rail=c70f266Line(q.y,.65,.035)*inner;return mix(c,wood*.66,rail);}
vec3 c70f266Lancet(vec3 c,vec2 q,float x,float b,float r,float top){float surroundMask=c70f266Arch(q,x,b-.13,r+.16,top+.22,1.),g=c70f266Arch(q,x,b,r,top,1.);c=mix(c,vec3(.68,.63,.52),surroundMask);c=mix(c,vec3(.27,.33,.32),g);float bars=max(c70f266Line(q.x,x,.035),max(c70f266Line(q.x,x-r*.5,.026),c70f266Line(q.x,x+r*.5,.026)));bars=max(bars,c70f266Line(q.y,b+(top-b)*.67,.025));float dia=c70f266Line(abs(q.x-x)+abs(q.y-(top-r*.9)),r*.62,.035);c=mix(c,vec3(.70,.70,.61),g*max(bars,dia));float lattice=(1.-smoothstep(.016,.032,abs(mod(q.x+q.y*.8,.34)-.17)))*(1.-smoothstep(.025,.075,max(fwidth(q.x),fwidth(q.y))));return mix(c,vec3(.58,.61,.55),g*lattice*.32);}
vec3 c70f266Tiles(vec2 q,vec3 col,float slope){float row=floor(q.y/.29),x=mod(q.x+mod(row,2.)*.12,.24),y=mod(q.y,.29);float seams=max(1.-smoothstep(.012,.035,min(x,.24-x)),1.-smoothstep(.015,.038,min(y,.29-y)));float lod=1.-smoothstep(.03,.10,max(fwidth(q.x),fwidth(q.y)));return mix(col+clamp(slope,-1.,1.)*.055,col*.64,seams*lod*.42);}

vec3 c70f266Brick(vec2 q,vec3 col){float rh=.17,bw=.36,row=floor(q.y/rh);vec2 cell=vec2(mod(q.x+mod(row,2.)*bw*.5,bw),mod(q.y,rh));float edge=min(min(cell.x,bw-cell.x),min(cell.y,rh-cell.y));float joint=1.-smoothstep(.006,.018,edge);float lod=1.-smoothstep(.025,.085,max(fwidth(q.x),fwidth(q.y)));float v=.028*sin(floor((q.x+mod(row,2.)*bw*.5)/bw)*3.13+row*5.1);return mix(col+v*lod,vec3(.66,.60,.49),joint*lod*.42);}
vec3 c70f266Copper(vec2 q,vec3 col,vec3 normal){float seam=c70f266Line(mod(q.x,1.8),.9,.026);return mix(col+.045*normal.y,col*.72,seam*.32);}
vec3 c70f266Clock(vec3 c,vec2 q,float cy,float radius,float dark){vec2 d=q-vec2(0.,cy);float rr=length(d),outer=1.-smoothstep(radius+.10,radius+.16,rr),inner=1.-smoothstep(radius-.08,radius-.02,rr);c=mix(c,vec3(.61,.57,.46),outer);vec3 face=mix(vec3(.82,.79,.66),vec3(.12,.16,.14),dark);c=mix(c,face,inner);vec3 ink=mix(vec3(.13,.15,.11),vec3(.79,.68,.36),dark);float marks=0.;for(int j=0;j<12;j++){float a=float(j)*.5235988;vec2 dir=vec2(sin(a),cos(a));marks=max(marks,c70f266Box(vec2(dot(d,dir),dot(d,vec2(dir.y,-dir.x))),vec2(radius*.79,0.),vec2(radius*.10,.027)));}float hands=max(c70f266Line(d.x*.64+d.y*.77,0.,.045)*c70f266Box(d,vec2(-radius*.21,radius*.18),vec2(radius*.41,radius*.36)),c70f266Line(d.x*.93-d.y*.37,0.,.045)*c70f266Box(d,vec2(radius*.25,radius*.12),vec2(radius*.43,radius*.28)));return mix(c,ink,max(marks,hands)*inner);}
vec3 c70f266Blind(vec3 c,vec2 q,float x,float b,float r,float t,vec3 fill){float outer=c70f266Arch(q,x,b-.10,r+.10,t+.15,1.),inner=c70f266Arch(q,x,b,r,t,1.);c=mix(c,fill*.75,outer);return mix(c,fill,inner);}

vec3 c70f266CoverageFull500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){vec2 q=vec2(frame.x,p.y);float u=q.x,y=q.y;if(family==4207.)return base;

 if(family==4210.)return c70f266Tiles(frame.xy,vec3(.32,.255,.18),normal.y-.35);
 if(family==4209.)return c70f266Copper(frame.xy,vec3(.49,.67,.54),normal);
 vec3 c=c70f266Brick(q,vec3(.54,.29,.195));if(family==4211.){float trim=max(c70f266Line(abs(u),3.72,.26),c70f266Line(y,30.6,.17));c=mix(c,vec3(.77,.73,.57),trim);if(normal.x*.75+normal.z*.66<-.55)c=c70f266Clock(c,q,27.8,1.35,1.);for(int j=0;j<2;j++){float x=(float(j)-.5)*1.25;float opening=c70f266Arch(q,x,23.1,.34,25.5,0.);c=mix(c,vec3(.17,.20,.15),opening);}return c;}
 if(family==4212.){for(int j=0;j<4;j++){float x=-14.5+float(j)*11.1;c=c70f266Lancet(c,q,x,5.5,1.12,12.7);for(int k=-2;k<=2;k++){float xx=x+float(k)*1.6;c=c70f266Blind(c,q,xx,14.4,.47,19.7-abs(float(k))*.8,vec3(.60,.34,.22));}float butt=c70f266Box(q,vec2(x+5.2,6.7),vec2(.28,6.7));c=mix(c,vec3(.68,.63,.49),butt);}c=c70f266Portal(c,q,-23.,1.12,3.7,1.,vec3(.16,.15,.10));c=mix(c,vec3(.64,.59,.46),c70f266Line(y,13.7,.11));}return c;
}

vec3 c70sync159F266(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1101.)return c70f266CoverageFull500(base,p,normal,frame,4209.);if(family==1102.)return c70f266CoverageFull500(base,p,normal,frame,4210.);if(family==1103.)return c70f266CoverageFull500(base,p,normal,frame,4211.);if(family==1104.)return c70f266CoverageFull500(base,p,normal,frame,4212.);if(family==1105.)return c70f266CoverageFull500(base,p,normal,frame,4213.);return base;}

float c70f267Box(vec2 q,vec2 c,vec2 h){vec2 aa=max(fwidth(q),vec2(.018));vec2 a=1.-smoothstep(h-aa,h+aa,abs(q-c));return a.x*a.y;}
float c70f267Line(float v,float c,float w){float aa=max(fwidth(v),.015);return 1.-smoothstep(w-aa,w+aa,abs(v-c));}
float c70f267Arch(vec2 q,float x,float b,float r,float t,float gothic){float sy=t-r*(gothic>.5?1.732:1.);float d;if(q.y<sy)d=abs(q.x-x)-r;else if(gothic>.5)d=max(length(q-vec2(x-r,sy)),length(q-vec2(x+r,sy)))-2.*r;else d=length(q-vec2(x,sy))-r;float aa=max(fwidth(d),.018);return (1.-smoothstep(-aa,aa,d))*smoothstep(b-aa,b+aa,q.y);}
vec3 c70f267Stone(vec2 q,vec3 col,float rowh){float row=floor(q.y/rowh),bx=q.x+mod(row,2.)*.49;float x=mod(bx,1.13),y=mod(q.y,rowh);float j=1.-smoothstep(.012,.035,min(min(x,1.13-x),min(y,rowh-y)));float v=.037*sin(floor(bx/1.13)*7.1+row*3.8);return mix(col+v,vec3(.66,.61,.52),j*.5);}
vec3 c70f267RectWindow(vec3 c,vec2 q,vec2 at,vec2 size,vec3 trim){float s=c70f267Box(q,at,size+vec2(.12,.13)),g=c70f267Box(q,at,size);c=mix(c,trim,s);c=mix(c,vec3(.15,.19,.18),g);float cross=max(c70f267Box(q,at,vec2(.033,size.y)),c70f267Box(q,at+vec2(0.,.12),vec2(size.x,.035)));c=mix(c,trim*.8,cross*g);float sill=c70f267Box(q,at-vec2(0.,size.y+.13),vec2(size.x+.17,.07));return mix(c,trim*.76,sill);}
vec3 c70f267Portal(vec3 c,vec2 q,float x,float r,float top,float gothic,vec3 wood){float outer=c70f267Arch(q,x,.02,r+.22,top+.26,gothic),inner=c70f267Arch(q,x,.03,r,top,gothic);c=mix(c,vec3(.49,.43,.34),outer);c=mix(c,wood,inner);float side=1.-smoothstep(.0,.30,r-abs(q.x-x));c=mix(c,vec3(.055,.066,.055),side*inner*.7);float planks=c70f267Line(mod(q.x-x,.22),.11,.012);c=mix(c,wood*.64,inner*planks);c=mix(c,wood*.47,c70f267Line(q.x,x,.027)*inner);float rail=c70f267Line(q.y,.65,.035)*inner;return mix(c,wood*.66,rail);}
vec3 c70f267Lancet(vec3 c,vec2 q,float x,float b,float r,float top){float surroundMask=c70f267Arch(q,x,b-.13,r+.16,top+.22,1.),g=c70f267Arch(q,x,b,r,top,1.);c=mix(c,vec3(.68,.63,.52),surroundMask);c=mix(c,vec3(.27,.33,.32),g);float bars=max(c70f267Line(q.x,x,.035),max(c70f267Line(q.x,x-r*.5,.026),c70f267Line(q.x,x+r*.5,.026)));bars=max(bars,c70f267Line(q.y,b+(top-b)*.67,.025));float dia=c70f267Line(abs(q.x-x)+abs(q.y-(top-r*.9)),r*.62,.035);c=mix(c,vec3(.70,.70,.61),g*max(bars,dia));float lattice=(1.-smoothstep(.016,.032,abs(mod(q.x+q.y*.8,.34)-.17)))*(1.-smoothstep(.025,.075,max(fwidth(q.x),fwidth(q.y))));return mix(c,vec3(.58,.61,.55),g*lattice*.32);}
vec3 c70f267Tiles(vec2 q,vec3 col,float slope){float row=floor(q.y/.29),x=mod(q.x+mod(row,2.)*.12,.24),y=mod(q.y,.29);float seams=max(1.-smoothstep(.012,.035,min(x,.24-x)),1.-smoothstep(.015,.038,min(y,.29-y)));float lod=1.-smoothstep(.03,.10,max(fwidth(q.x),fwidth(q.y)));return mix(col+clamp(slope,-1.,1.)*.055,col*.64,seams*lod*.42);}

vec3 c70f267Brick(vec2 q,vec3 col){float rh=.17,bw=.36,row=floor(q.y/rh);vec2 cell=vec2(mod(q.x+mod(row,2.)*bw*.5,bw),mod(q.y,rh));float edge=min(min(cell.x,bw-cell.x),min(cell.y,rh-cell.y));float joint=1.-smoothstep(.006,.018,edge);float lod=1.-smoothstep(.025,.085,max(fwidth(q.x),fwidth(q.y)));float v=.028*sin(floor((q.x+mod(row,2.)*bw*.5)/bw)*3.13+row*5.1);return mix(col+v*lod,vec3(.66,.60,.49),joint*lod*.42);}
vec3 c70f267Copper(vec2 q,vec3 col,vec3 normal){float seam=c70f267Line(mod(q.x,1.8),.9,.026);return mix(col+.045*normal.y,col*.72,seam*.32);}
vec3 c70f267Clock(vec3 c,vec2 q,float cy,float radius,float dark){vec2 d=q-vec2(0.,cy);float rr=length(d),outer=1.-smoothstep(radius+.10,radius+.16,rr),inner=1.-smoothstep(radius-.08,radius-.02,rr);c=mix(c,vec3(.61,.57,.46),outer);vec3 face=mix(vec3(.82,.79,.66),vec3(.12,.16,.14),dark);c=mix(c,face,inner);vec3 ink=mix(vec3(.13,.15,.11),vec3(.79,.68,.36),dark);float marks=0.;for(int j=0;j<12;j++){float a=float(j)*.5235988;vec2 dir=vec2(sin(a),cos(a));marks=max(marks,c70f267Box(vec2(dot(d,dir),dot(d,vec2(dir.y,-dir.x))),vec2(radius*.79,0.),vec2(radius*.10,.027)));}float hands=max(c70f267Line(d.x*.64+d.y*.77,0.,.045)*c70f267Box(d,vec2(-radius*.21,radius*.18),vec2(radius*.41,radius*.36)),c70f267Line(d.x*.93-d.y*.37,0.,.045)*c70f267Box(d,vec2(radius*.25,radius*.12),vec2(radius*.43,radius*.28)));return mix(c,ink,max(marks,hands)*inner);}
vec3 c70f267Blind(vec3 c,vec2 q,float x,float b,float r,float t,vec3 fill){float outer=c70f267Arch(q,x,b-.10,r+.10,t+.15,1.),inner=c70f267Arch(q,x,b,r,t,1.);c=mix(c,fill*.75,outer);return mix(c,fill,inner);}

vec3 c70f267CoverageFull500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){vec2 q=vec2(frame.x,p.y);float u=q.x,y=q.y;if(family==4200.)return base;

 if(family==4203.)return c70f267Tiles(frame.xy,vec3(.34,.255,.18),normal.y-.35);
 if(family==4202.)return c70f267Copper(frame.xy,vec3(.48,.65,.52),normal);
 vec3 c=c70f267Brick(q,vec3(.57,.29,.18));if(family==4205.){c=c70f267Portal(c,q,-1.4,1.32,4.3,1.,vec3(.24,.18,.115));c=c70f267Lancet(c,q,-1.4,5.2,1.85,13.4);c=c70f267Lancet(c,q,-7.4,3.4,.96,12.3);c=c70f267Lancet(c,q,5.6,3.4,.96,12.3);float rr=length(q-vec2(-1.4,28.5));float rose=1.-smoothstep(1.32,1.39,rr),ring=c70f267Line(rr,1.44,.12);c=mix(c,vec3(.23,.28,.24),rose);float radials=c70f267Line(sin(atan(q.y-28.5,u+1.4)*6.),0.,.10)*rose;c=mix(c,vec3(.83,.77,.61),max(ring,radials));for(int k=0;k<3;k++){float yy=16.0+float(k)*3.4;float count=4.-float(k);for(int j=-4;j<=4;j++){if(abs(float(j))<=count){float x=-1.4+float(j)*1.9;c=c70f267Blind(c,q,x,yy,.56,yy+2.0,vec3(.78,.72,.55));}}}c=mix(c,vec3(.74,.65,.48),max(c70f267Line(y,14.2,.13),c70f267Line(y,22.7,.08)));}
 if(family==4204.){for(int j=0;j<4;j++)c=c70f267Lancet(c,q,-16.+float(j)*7.,3.6,1.05,13.6);}return c;
}

vec3 c70sync159F267(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1106.)return c70f267CoverageFull500(base,p,normal,frame,4202.);if(family==1107.)return c70f267CoverageFull500(base,p,normal,frame,4203.);if(family==1108.)return c70f267CoverageFull500(base,p,normal,frame,4204.);if(family==1109.)return c70f267CoverageFull500(base,p,normal,frame,4205.);if(family==1110.)return c70f267CoverageFull500(base,p,normal,frame,4206.);return base;}

float c70f276Box(vec2 q,vec2 c,vec2 h){vec2 aa=max(fwidth(q),vec2(.018));vec2 a=1.-smoothstep(h-aa,h+aa,abs(q-c));return a.x*a.y;}
float c70f276Line(float v,float c,float w){float aa=max(fwidth(v),.015);return 1.-smoothstep(w-aa,w+aa,abs(v-c));}
float c70f276Arch(vec2 q,float x,float b,float r,float t,float gothic){float sy=t-r*(gothic>.5?1.732:1.);float d;if(q.y<sy)d=abs(q.x-x)-r;else if(gothic>.5)d=max(length(q-vec2(x-r,sy)),length(q-vec2(x+r,sy)))-2.*r;else d=length(q-vec2(x,sy))-r;float aa=max(fwidth(d),.018);return (1.-smoothstep(-aa,aa,d))*smoothstep(b-aa,b+aa,q.y);}
vec3 c70f276Stone(vec2 q,vec3 col,float rowh){float row=floor(q.y/rowh),bx=q.x+mod(row,2.)*.49;float x=mod(bx,1.13),y=mod(q.y,rowh);float j=1.-smoothstep(.012,.035,min(min(x,1.13-x),min(y,rowh-y)));float v=.037*sin(floor(bx/1.13)*7.1+row*3.8);return mix(col+v,vec3(.66,.61,.52),j*.5);}
vec3 c70f276RectWindow(vec3 c,vec2 q,vec2 at,vec2 size,vec3 trim){float s=c70f276Box(q,at,size+vec2(.12,.13)),g=c70f276Box(q,at,size);c=mix(c,trim,s);c=mix(c,vec3(.15,.19,.18),g);float cross=max(c70f276Box(q,at,vec2(.033,size.y)),c70f276Box(q,at+vec2(0.,.12),vec2(size.x,.035)));c=mix(c,trim*.8,cross*g);float sill=c70f276Box(q,at-vec2(0.,size.y+.13),vec2(size.x+.17,.07));return mix(c,trim*.76,sill);}
vec3 c70f276Portal(vec3 c,vec2 q,float x,float r,float top,float gothic,vec3 wood){float outer=c70f276Arch(q,x,.02,r+.22,top+.26,gothic),inner=c70f276Arch(q,x,.03,r,top,gothic);c=mix(c,vec3(.49,.43,.34),outer);c=mix(c,wood,inner);float side=1.-smoothstep(.0,.30,r-abs(q.x-x));c=mix(c,vec3(.055,.066,.055),side*inner*.7);float planks=c70f276Line(mod(q.x-x,.22),.11,.012);c=mix(c,wood*.64,inner*planks);c=mix(c,wood*.47,c70f276Line(q.x,x,.027)*inner);float rail=c70f276Line(q.y,.65,.035)*inner;return mix(c,wood*.66,rail);}
vec3 c70f276Lancet(vec3 c,vec2 q,float x,float b,float r,float top){float surroundMask=c70f276Arch(q,x,b-.13,r+.16,top+.22,1.),g=c70f276Arch(q,x,b,r,top,1.);c=mix(c,vec3(.68,.63,.52),surroundMask);c=mix(c,vec3(.27,.33,.32),g);float bars=max(c70f276Line(q.x,x,.035),max(c70f276Line(q.x,x-r*.5,.026),c70f276Line(q.x,x+r*.5,.026)));bars=max(bars,c70f276Line(q.y,b+(top-b)*.67,.025));float dia=c70f276Line(abs(q.x-x)+abs(q.y-(top-r*.9)),r*.62,.035);c=mix(c,vec3(.70,.70,.61),g*max(bars,dia));float lattice=(1.-smoothstep(.016,.032,abs(mod(q.x+q.y*.8,.34)-.17)))*(1.-smoothstep(.025,.075,max(fwidth(q.x),fwidth(q.y))));return mix(c,vec3(.58,.61,.55),g*lattice*.32);}
vec3 c70f276Tiles(vec2 q,vec3 col,float slope){float row=floor(q.y/.29),x=mod(q.x+mod(row,2.)*.12,.24),y=mod(q.y,.29);float seams=max(1.-smoothstep(.012,.035,min(x,.24-x)),1.-smoothstep(.015,.038,min(y,.29-y)));float lod=1.-smoothstep(.03,.10,max(fwidth(q.x),fwidth(q.y)));return mix(col+clamp(slope,-1.,1.)*.055,col*.64,seams*lod*.42);}

vec3 c70f276Brick(vec2 q,vec3 col){float rh=.17,bw=.36,row=floor(q.y/rh);vec2 cell=vec2(mod(q.x+mod(row,2.)*bw*.5,bw),mod(q.y,rh));float edge=min(min(cell.x,bw-cell.x),min(cell.y,rh-cell.y));float joint=1.-smoothstep(.006,.018,edge);float lod=1.-smoothstep(.025,.085,max(fwidth(q.x),fwidth(q.y)));float v=.028*sin(floor((q.x+mod(row,2.)*bw*.5)/bw)*3.13+row*5.1);return mix(col+v*lod,vec3(.66,.60,.49),joint*lod*.42);}
vec3 c70f276Copper(vec2 q,vec3 col,vec3 normal){float seam=c70f276Line(mod(q.x,1.8),.9,.026);return mix(col+.045*normal.y,col*.72,seam*.32);}
vec3 c70f276Clock(vec3 c,vec2 q,float cy,float radius,float dark){vec2 d=q-vec2(0.,cy);float rr=length(d),outer=1.-smoothstep(radius+.10,radius+.16,rr),inner=1.-smoothstep(radius-.08,radius-.02,rr);c=mix(c,vec3(.61,.57,.46),outer);vec3 face=mix(vec3(.82,.79,.66),vec3(.12,.16,.14),dark);c=mix(c,face,inner);vec3 ink=mix(vec3(.13,.15,.11),vec3(.79,.68,.36),dark);float marks=0.;for(int j=0;j<12;j++){float a=float(j)*.5235988;vec2 dir=vec2(sin(a),cos(a));marks=max(marks,c70f276Box(vec2(dot(d,dir),dot(d,vec2(dir.y,-dir.x))),vec2(radius*.79,0.),vec2(radius*.10,.027)));}float hands=max(c70f276Line(d.x*.64+d.y*.77,0.,.045)*c70f276Box(d,vec2(-radius*.21,radius*.18),vec2(radius*.41,radius*.36)),c70f276Line(d.x*.93-d.y*.37,0.,.045)*c70f276Box(d,vec2(radius*.25,radius*.12),vec2(radius*.43,radius*.28)));return mix(c,ink,max(marks,hands)*inner);}
vec3 c70f276Blind(vec3 c,vec2 q,float x,float b,float r,float t,vec3 fill){float outer=c70f276Arch(q,x,b-.10,r+.10,t+.15,1.),inner=c70f276Arch(q,x,b,r,t,1.);c=mix(c,fill*.75,outer);return mix(c,fill,inner);}

vec3 c70f276CoverageFull500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){vec2 q=vec2(frame.x,p.y);float u=q.x,y=q.y;if(family==3952.)return base;

 if(family==3954.)return c70f276Copper(frame.xy,vec3(.215,.28,.25),normal);
 if(family==3955.){vec3 c=vec3(.34,.265,.205)+normal.y*.06;float seam=c70f276Line(mod(frame.x,3.6),1.8,.035);return mix(c,c*.75,seam*.22);}
 vec3 c=c70f276Stone(q,vec3(.43,.395,.305),.60);
 if(family==3956.){if(dot(normal.xz,vec2(.377,.926))>-.65)return c;c=c70f276Clock(c,q,31.3,1.22,1.);float inner=1.-smoothstep(.93,1.03,length(q-vec2(0.,31.3)));c=mix(c,vec3(.29,.43,.285),inner*.45);c=c70f276Lancet(c,q,-1.1,23.5,.45,28.6);c=c70f276Lancet(c,q,1.1,23.5,.45,28.6);return c;}
 if(family==3953.)return c;
 if(family==3957.){for(int j=0;j<2;j++){float x=-4.5+float(j)*14.;c=c70f276Lancet(c,q,x,4.5,2.35,14.3);float side=c70f276Line(u,x+4.8,.31)*c70f276Box(q,vec2(x+4.8,8.),vec2(.5,8.));c=mix(c,vec3(.53,.49,.38),side);for(int k=-1;k<=1;k++)c=c70f276Blind(c,q,x+float(k)*1.16,16.2,.40,19.1-abs(float(k))*.7,vec3(.38,.36,.28));}c=mix(c,vec3(.56,.52,.41),c70f276Line(y,15.3,.10));}return c;
}

vec3 c70sync159F276(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1135.)return c70f276CoverageFull500(base,p,normal,frame,3953.);if(family==1136.)return c70f276CoverageFull500(base,p,normal,frame,3954.);if(family==1137.)return c70f276CoverageFull500(base,p,normal,frame,3955.);if(family==1138.)return c70f276CoverageFull500(base,p,normal,frame,3956.);if(family==1139.)return c70f276CoverageFull500(base,p,normal,frame,3957.);if(family==1140.)return c70f276CoverageFull500(base,p,normal,frame,3958.);return base;}

float c70M1Repeat(float x,float pitch,float w){float a=max(fwidth(x)/pitch,.0001),h=w/pitch,d=abs(fract(x/pitch)-.5);return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h,0.,1.),smoothstep(.2,.7,a));}
vec3 c70M1Brick(vec2 q){float row=floor(q.y/.077),bx=q.x+mod(row,2.)*.125;float course=c70M1Repeat(q.y,.077,.0035),head=c70M1Repeat(bx,.25,.003);float lod=1.-smoothstep(.05,.15,max(fwidth(q.x),fwidth(q.y)));float shade=.010*sin(floor(bx/.25)*3.13+row*5.1)*lod;vec3 brick=vec3(.49,.285,.205)+shade;return mix(brick,vec3(.62,.48,.37),max(course,head)*.19);}
vec3 c70M1Tiles(vec2 q,vec3 normal){float row=floor(q.y/.34),seam=max(c70M1Repeat(q.y,.34,.012),c70M1Repeat(q.x+mod(row,2.)*.14,.28,.010));float low=.5+.5*sin(q.x*1.93+sin(q.y*1.31));vec3 tile=mix(vec3(.285,.222,.178),vec3(.326,.263,.213),low*.48);return tile*(1.-seam*.20)+clamp(normal.y-.35,-1.,1.)*.018;}
vec3 c70M1Window(vec3 c,vec2 q,vec2 centre,vec2 h){vec3 trim=vec3(.87,.85,.78);float border=c70f276Box(q,centre,h+vec2(.085,.10)),pane=c70f276Box(q,centre,h);c=mix(c,trim*.84,border);vec2 d=q-centre;float ribs=max(c70f276Line(d.x,0.,.025),max(c70f276Line(d.y,0.,.026),max(c70f276Line(d.y,h.y*.53,.024),c70f276Line(d.y,-h.y*.53,.024))));c=mix(c,mix(vec3(.19,.25,.24),trim,ribs),pane);return c;}
vec3 c70M1Registered(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family==46621.)return c70M1Tiles(frame.xy,normal);
 vec2 q=frame.xy;float houseY=frame.y;vec3 c=c70M1Brick(q);
 c=mix(c,vec3(.61,.56,.48),c70f276Line(houseY,5.25,.055));
 if(family==46622.){
  c=c70M1Window(c,q,vec2(-2.35,2.70),vec2(.55,1.42));c=c70M1Window(c,q,vec2(0.,2.70),vec2(.55,1.42));c=c70M1Window(c,q,vec2(2.25,2.70),vec2(.55,1.42));
 }
 if(family==46623.){
  // Actual recessed entry at U-7.4..-4.2 is kept in the official footprint.
  float doorway=c70f276Box(q,vec2(-5.8,2.13),vec2(1.39,2.08));float frameMask=max(c70f276Line(q.x,-5.8,.035),c70f276Line(houseY,2.72,.035));c=mix(c,mix(vec3(.17,.22,.21),vec3(.87,.85,.78),frameMask),doorway);
  c=c70M1Window(c,q,vec2(-2.55,2.72),vec2(.60,1.38));c=c70M1Window(c,q,vec2(-.50,2.72),vec2(.60,1.38));c=c70M1Window(c,q,vec2(1.55,2.72),vec2(.60,1.38));c=c70M1Window(c,q,vec2(3.85,2.72),vec2(.60,1.38));c=c70M1Window(c,q,vec2(5.75,2.72),vec2(.60,1.38));
 }
 if(family==46624.)c=c70M1Window(c,q,vec2(0.,6.45),vec2(.48,.78));
 if(family==46625.){for(int k=0;k<3;k++)c=c70M1Window(c,q,vec2(.0+float(k)*2.05,6.96),vec2(.77,.65));}
 return c;
}

float c70ulfFoil(vec2 q,vec2 at,float radius,float lobes){
 float opening=0.;
 for(int j=0;j<4;j++){
  if(float(j)>=lobes)continue;
  float a=1.57079632679+float(j)*6.28318530718/lobes;
  vec2 centre=at+vec2(cos(a),sin(a))*radius*.40;
  float d=length(q-centre)-radius*.60,aa=max(fwidth(d),.015);
  opening=max(opening,1.-smoothstep(-aa,aa,d));
 }
 return opening;
}
vec3 c70ulfNaveTracery(vec3 c,vec2 q,float x,float b,float r,float top){
 float surroundMask=c70f276Arch(q,x,b-.13,r+.16,top+.22,1.);
 float g=c70f276Arch(q,x,b,r,top,1.);
 c=mix(c,vec3(.68,.63,.52),surroundMask);
 float span=top-b,lightTop=b+span*.69,lights=0.;
 for(int j=0;j<4;j++){
  float centre=x+(float(j)-1.5)*r*.5;
  lights=max(lights,c70f276Arch(q,centre,b,r*.25-.075,lightTop,1.));
 }
 float foil=0.;
 foil=max(foil,c70ulfFoil(q,vec2(x-r*.59,b+span*.735),r*.205,3.));
 foil=max(foil,c70ulfFoil(q,vec2(x+r*.59,b+span*.735),r*.205,3.));
 foil=max(foil,c70ulfFoil(q,vec2(x,b+span*.795),r*.285,4.));
 foil=max(foil,c70ulfFoil(q,vec2(x-r*.40,b+span*.865),r*.16,4.));
 foil=max(foil,c70ulfFoil(q,vec2(x+r*.40,b+span*.865),r*.16,4.));
 foil=max(foil,c70ulfFoil(q,vec2(x,b+span*.94),r*.16,3.));
 float aperture=max(lights,foil)*g;
 vec3 glass=vec3(.27,.33,.32);
 float horizontalLead=c70f276Line(abs(mod(q.y-b+.675,1.35)-.675),0.,.008);
 float verticalLead=c70f276Line(abs(mod(q.x-x+.265,.53)-.265),0.,.007);
 float lead=max(horizontalLead,verticalLead)*(1.-smoothstep(lightTop-.65,lightTop-.25,q.y))*lights;
 glass=mix(glass,vec3(.20,.245,.24),lead*.55);
 c=mix(c,vec3(.65,.61,.50),g);
 return mix(c,glass,aperture);
}

vec3 infillBremenOldtownChurchesPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family>=46619.5&&family<=46625.5)return c70M1Registered(base,p,normal,frame,family);
 if(family==46583.)return c70f276Tiles(frame.xy,vec3(.43,.25,.17),normal.y-.35);
 if(family==46587.||family==46588.){
  // Official-local U is shared by every complete nave face; no legacy per-part origin is reused.
  vec2 q=vec2(frame.x,p.y);float u=q.x,y=q.y;vec3 c=c70f276Stone(q,vec3(.43,.395,.305),.60);
  for(int j=0;j<3;j++){
   float x=j==0?-16.4:j==1?-6.5:3.6;
   c=c70ulfNaveTracery(c,q,x,4.2,2.12,15.05);
   float butt=c70f276Box(q,vec2(x+5.0,8.2),vec2(.29,8.2));c=mix(c,vec3(.54,.50,.40),butt);
   for(int k=-2;k<=2;k++)c=c70f276Blind(c,q,x+float(k)*1.05,17.70,.34,21.10-abs(float(k))*.92,vec3(.385,.36,.28));
  }
  c=mix(c,vec3(.54,.50,.40),c70f276Box(q,vec2(-21.4,8.2),vec2(.29,8.2)));
  c=mix(c,vec3(.56,.52,.41),c70f276Line(y,16.95,.11));
  return c;
 }

 if(family>=46500.5&&family<=46505.5){
  float oldFamily=1100.+family-46500.;vec3 c=c70sync159F266(base,p,normal,frame,oldFamily);
  if(family==46505.&&abs(dot(normal.xz,vec2(-.660628,.750714)))>.7){
   vec2 q=vec2(frame.x,p.y);c=c70f266Lancet(c,q,-4.3,4.2,1.18,13.0);c=c70f266Lancet(c,q,4.3,4.2,1.18,13.0);
   for(int k=-2;k<=2;k++)c=c70f266Blind(c,q,float(k)*1.65,14.4,.47,20.0-abs(float(k))*.95,vec3(.61,.48,.32));
  }return c;
 }
 if(family>=46540.5&&family<=46545.5){
  float oldFamily=1105.+family-46540.;vec3 c=c70sync159F267(base,p,normal,frame,oldFamily);
  if(family==46545.&&abs(dot(normal.xz,vec2(.534933,.844894)))>.58){float u=frame.x;vec2 q=vec2(u,p.y);float x=floor((u+19.5)/7.0)*7.0-16.0;c=c70f267Lancet(c,q,x,3.6,1.05,13.6);}return c;
 }
 if(family>=46580.5&&family<=46586.5){
  float oldFamily=1134.+family-46580.;vec3 c=c70sync159F276(base,p,normal,frame,oldFamily);
  if(family==46586.&&dot(normal.xz,vec2(.926183,-.377074))<-.65){
   vec2 q=vec2(frame.x,p.y);float rr=length(q-vec2(0.,10.5));float disk=1.-smoothstep(2.62,2.72,rr),ring=c70f276Line(rr,2.87,.15);c=mix(c,vec3(.17,.225,.22),disk);float ribs=c70f276Line(sin(atan(q.y-10.5,q.x)*6.),0.,.09)*disk;c=mix(c,vec3(.63,.60,.48),max(ring,ribs));c=c70f276Portal(c,q,0.,1.45,4.6,1.,vec3(.20,.18,.125));
  }return c;
 }
 if(family==46621.){float a=max(fwidth(p.x),.02);float seam=1.-smoothstep(.016,.016+a,abs(mod(p.x+.2,.4)-.2));return base*(1.-.065*seam);}
 if(family==46620.){float a=max(fwidth(frame.x),.01),joint=1.-smoothstep(.008,.008+a,abs(mod(p.y+.045,.09)-.045));return base*(1.-joint*.07);}
 return base;
}
`;
