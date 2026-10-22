export const F081_COMPLETION_GLSL=`
float spc081box(vec2 q,vec2 c,vec2 h){vec2 aa=max(fwidth(q),vec2(.003));vec2 m=1.-smoothstep(h-aa,h+aa,abs(q-c));return m.x*m.y;}
float spc081oval(vec2 q,vec2 c,vec2 h){float d=length((q-c)/h);float aa=max(fwidth(d),.008);return 1.-smoothstep(1.-aa,1.+aa,d);}
float spc081line(vec2 q,vec2 a,vec2 b,float w){vec2 d=b-a;float t=clamp(dot(q-a,d)/max(dot(d,d),.000001),0.,1.);float v=length(q-a-t*d);return 1.-smoothstep(w,w+max(fwidth(v),.004),v);}
float spc081arch(vec2 q,float x,float low,float spring,float r){return max(spc081box(q,vec2(x,(low+spring)*.5),vec2(r,(spring-low)*.5)),spc081oval(q,vec2(x,spring),vec2(r))*step(spring,q.y));}
vec3 spc081brick(vec2 q){float row=floor(q.y/.085);vec2 cell=vec2(.29,.085);vec2 d=abs(fract((q+vec2(mod(row,2.)*.145,0.))/cell+.5)-.5)*cell;vec2 aa=max(fwidth(q),vec2(.002));float seam=max(1.-smoothstep(.004,.004+aa.x,d.x),1.-smoothstep(.004,.004+aa.y,d.y));return mix(vec3(.46,.34,.29),vec3(.55,.46,.38),seam*.42);}
vec3 spc081glass(vec3 c,vec2 q,float x,float mask){vec2 z=q-vec2(x,0.);vec2 d=abs(fract(z/vec2(.23,.31)+.5)-.5)*vec2(.23,.31);vec2 aa=max(fwidth(q),vec2(.003));float lead=max(1.-smoothstep(.009,.009+aa.x,d.x),1.-smoothstep(.009,.009+aa.y,d.y));vec3 glass=vec3(.41,.46,.42);glass=mix(glass,vec3(.20,.24,.22),lead);return mix(c,glass,mask);}
vec3 spc081apse(vec3 c,vec2 q,float x,float w,bool onlyUpper){vec3 trim=vec3(.53,.41,.34),dark=vec3(.34,.26,.22);float top=spc081oval(q,vec2(x,22.45),vec2(1.18,1.87));float rim=spc081oval(q,vec2(x,22.45),vec2(1.37,2.06));c=mix(c,dark,rim);c=mix(c,trim,spc081oval(q,vec2(x,22.45),vec2(1.29,1.98)));c=spc081glass(c,q,x,top);if(!onlyUpper){float lower=spc081arch(q,x,11.65,17.50,1.16);c=mix(c,dark,spc081arch(q,x,11.50,17.50,1.35));c=mix(c,trim,spc081arch(q,x,11.56,17.50,1.28));c=spc081glass(c,q,x,lower);c=mix(c,trim,spc081box(q,vec2(x,11.43),vec2(1.46,.10)));}
for(int j=0;j<2;j++){float xx=x+(j==0?(-1.):1.)*(w*.5-.18);c=mix(c,trim,spc081box(q,vec2(xx,19.20),vec2(.16,7.58)));c=mix(c,dark,spc081box(q,vec2(xx+.14,19.20),vec2(.026,7.58)));}float oval=spc081oval(q,vec2(x,26.03),vec2(1.30,.66))-spc081oval(q,vec2(x,26.03),vec2(1.24,.60));c=mix(c,trim,oval);for(int j=0;j<3;j++){float yy=27.06+float(j)*.28;c=mix(c,trim,spc081box(q,vec2(x,yy),vec2(w*.5,.065)));}return c;}
float spc081romanGlyph(vec2 q,int glyph){float m=0.;if(glyph==1)m=spc081line(q,vec2(0.,-.12),vec2(0.,.12),.021);if(glyph==2){m=spc081line(q,vec2(-.07,.12),vec2(0.,-.12),.018);m=max(m,spc081line(q,vec2(0.,-.12),vec2(.07,.12),.018));}if(glyph==3){m=spc081line(q,vec2(-.07,.12),vec2(.07,-.12),.018);m=max(m,spc081line(q,vec2(-.07,-.12),vec2(.07,.12),.018));}return m;}
int spc081romanCode(int i){if(i==0)return 53;if(i==1)return 1;if(i==2)return 5;if(i==3)return 21;if(i==4)return 6;if(i==5)return 2;if(i==6)return 9;if(i==7)return 37;if(i==8)return 149;if(i==9)return 7;if(i==10)return 3;return 13;}
vec3 spc081clock(vec3 c,vec2 q){vec2 z=q-vec2(0.,56.35);c=mix(c,vec3(.18,.21,.20),spc081oval(z,vec2(0.),vec2(2.42)));c=mix(c,vec3(.88,.87,.78),spc081oval(z,vec2(0.),vec2(2.30)));c=mix(c,vec3(.12,.15,.16),spc081oval(z,vec2(0.),vec2(1.68)));for(int i=0;i<12;i++){float a=float(i)*6.28318530718/12.;vec2 radial=vec2(-sin(a),cos(a)),tangent=vec2(-cos(a),-sin(a));vec2 local=vec2(dot(z-radial*1.98,tangent),dot(z-radial*1.98,radial));int code=spc081romanCode(i);int count=code>=64?4:(code>=16?3:(code>=4?2:1));for(int k=0;k<4;k++){if(k>=count)break;float power=pow(4.,float(count-1-k));int glyph=int(mod(floor(float(code)/power),4.));float off=(float(k)-float(count-1)*.5)*.155;c=mix(c,vec3(.20,.23,.22),spc081romanGlyph(local-vec2(off,0.),glyph));}}
// Static hand directions are an approximate reading of the source photograph, never current time.
c=mix(c,vec3(.85,.74,.40),spc081line(z,vec2(0.),vec2(1.16,-1.24),.070));c=mix(c,vec3(.89,.81,.53),spc081line(z,vec2(0.),vec2(.73,-.68),.095));c=mix(c,vec3(.91,.84,.57),spc081oval(z,vec2(0.),vec2(.13)));return c;}
//439 source-bound west porch and rear cafe arcade. Open passages have grounded leaves/gates, never window sills.
vec3 spc081passage439(vec3 c,vec2 q,float x,float low,float spring,float r,bool timber){
float rim=spc081arch(q,x,low,spring,r+.16),hole=spc081arch(q,x,low+.08,spring,r);c=mix(c,vec3(.58,.51,.42),rim);c=mix(c,timber?vec3(.30,.17,.105):vec3(.14,.18,.17),hole);
if(timber){float panels=spc081box(q,vec2(x-r*.48,(low+spring)*.5),vec2(r*.36,(spring-low)*.40))+spc081box(q,vec2(x+r*.48,(low+spring)*.5),vec2(r*.36,(spring-low)*.40));c=mix(c,vec3(.37,.22,.13),panels*hole);c=mix(c,vec3(.14,.17,.16),hole*step(spring-.3,q.y));}
else{float gate=max((1.-smoothstep(.022,.022+max(fwidth(q.x),.003),abs(mod(q.x-x+.14,.28)-.14))),(1.-smoothstep(.018,.018+max(fwidth(q.y),.003),abs(mod(q.y+.27,.54)-.27))));c=mix(c,vec3(.34,.36,.29),gate*hole*.66);}
return c;
}
vec3 stPeterLegacy081(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family!=4958.&&family!=4959.)return base;vec2 q=vec2(frame.x,p.y);float faceEast=dot(normal,vec3(.97077,0.,-.24));
if(family==4958.){
 if(normal.y>.001){vec2 cell=vec2(.31,.20);vec2 d=abs(fract(q/cell+.5)-.5)*cell;vec2 aa=max(fwidth(q),vec2(.003));float seam=max(1.-smoothstep(.010,.010+aa.x,d.x),1.-smoothstep(.010,.010+aa.y,d.y));return mix(vec3(.48,.25,.18),vec3(.31,.19,.15),seam*.34);}
 vec3 c=spc081brick(q);
 if(q.x>250.){c=mix(c,vec3(.54,.40,.32),spc081box(q,vec2(300.,4.68),vec2(20.,.16)));
if(normal.x>.94&&normal.z<-.15&&normal.z>-.30){float x=q.x<298.15?296.55:(q.x<301.85?300.:303.45);c=spc081passage439(c,q,x,.10,2.35,1.27,false);}
if(normal.x>.75&&normal.x<.90&&normal.z>.45&&normal.z<.68)c=spc081passage439(c,q,307.85,.10,2.35,1.23,false);
return c;}
 if(q.x>150.)return c;
 if(q.x>50.){if(dot(normal,vec3(.949,0.,.315))>.95){for(int j=0;j<3;j++){float yy=8.9+float(j)*6.5;float x=100.;c=mix(c,vec3(.66,.55,.44),spc081box(q,vec2(x,yy),vec2(.21,.48)));c=mix(c,vec3(.15,.17,.16),spc081box(q,vec2(x,yy),vec2(.12,.35)));}}return c;}
 if(q.x>16.){if(p.y<20.)return base;return spc081apse(c,q,20.,frame.w,true);}
 if(q.x>6.)return spc081apse(c,q,10.,frame.w,false);return spc081apse(c,q,0.,frame.w,false);
}
vec3 copper=vec3(.42,.56,.49);
if(q.x>350.){if(p.y<60.)return copper;if(p.y<66.){vec3 c=copper;if(faceEast>.65){for(int j=0;j<3;j++){float xx=400.+(float(j)-1.)*1.04;float opening=spc081arch(q,xx,60.25,63.75,.37);c=mix(c,vec3(.19,.27,.24),opening);c=mix(c,copper*.93,spc081box(q,vec2(xx-.48,62.55),vec2(.11,2.35)));}c=mix(c,copper*.86,spc081box(q,vec2(400.,65.30),vec2(3.,.13)));}return c;}return copper;}
if(q.x>50.)return copper;
if(normal.y>.001){vec3 c=copper;if(faceEast>.45)c=spc081clock(c,q);return c;}
if(p.y<30.)return base;vec3 c=vec3(.83,.80,.70),pale=vec3(.91,.88,.77);for(int j=0;j<4;j++){float yy=38.8+float(j)*4.25;c=mix(c,pale,spc081box(q,vec2(0.,yy),vec2(10.,.16)));c=mix(c,vec3(.61,.58,.50),spc081box(q,vec2(0.,yy-.20),vec2(10.,.035)));}
float win=spc081arch(q,0.,42.0,46.1,.58);c=mix(c,vec3(.53,.50,.43),spc081arch(q,0.,41.8,46.1,.75));c=mix(c,vec3(.21,.24,.23),win);for(int j=0;j<12;j++)c=mix(c,vec3(.46,.48,.43),spc081box(q,vec2(0.,42.2+float(j)*.32),vec2(.55,.035))*win);
for(int j=0;j<7;j++){float xx=(float(j)-3.)*.83;float a=spc081arch(q,xx,48.4,49.05,.32)-spc081arch(q,xx,48.45,49.05,.25);c=mix(c,pale,a);c=mix(c,vec3(.48,.49,.43),spc081box(q,vec2(xx,51.05),vec2(.045,.66)));}c=mix(c,pale,spc081box(q,vec2(0.,50.3),vec2(5.,.10)));c=mix(c,pale,spc081box(q,vec2(0.,51.85),vec2(5.,.13)));return c;}

float spc081seam(float x,float pitch,float w){float d=abs(mod(x+pitch*.5,pitch)-pitch*.5);return 1.-smoothstep(w,w+max(fwidth(x),.003),d);}

// South fixed epitaphs observed in Chris Light photo431. Approximate silhouettes and relief, no invented text.
vec3 spc081memorial439(vec3 c,vec2 z){
vec3 marble=vec3(.49,.30,.25),light=vec3(.66,.51,.42),shade=vec3(.31,.24,.20);
vec2 a=z-vec2(-63.875,3.35);float plaque=spc081box(a,vec2(0.,-.15),vec2(.82,1.43));plaque=max(plaque,spc081oval(a,vec2(0.,1.25),vec2(.80,.38)));c=mix(c,shade,plaque);c=mix(c,marble,spc081box(a,vec2(0.,-.16),vec2(.70,1.30)));c=mix(c,light,max(spc081line(a,vec2(0.,.1),vec2(0.,1.17),.044),spc081line(a,vec2(-.34,.83),vec2(.34,.83),.041))*plaque);c=mix(c,light,spc081oval(a,vec2(0.,.90),vec2(.10,.14)));for(int j=0;j<2;j++){float x=j==0?-.74:.74;float scroll=spc081oval(a,vec2(x,.88),vec2(.25,.35))-spc081oval(a,vec2(x,.88),vec2(.16,.25));c=mix(c,marble,scroll);}
// Oil Mount relief under the third west-to-east window: two pilasters, cornice, rounded inscription base.
vec2 b=z-vec2(-54.95,1.18);float body=spc081box(b,vec2(0.),vec2(1.72,.77));c=mix(c,shade,body);c=mix(c,marble,spc081box(b,vec2(0.,-.02),vec2(1.52,.63)));for(int j=0;j<2;j++){float x=j==0?-1.65:1.65;c=mix(c,light,spc081box(b,vec2(x,.07),vec2(.14,.78)));}c=mix(c,light,spc081box(b,vec2(0.,.86),vec2(1.91,.09)));c=mix(c,marble,spc081oval(b,vec2(0.,-.76),vec2(1.46,.30)));float relief=spc081line(b,vec2(-.9,-.4),vec2(-.48,.30),.075);relief=max(relief,spc081line(b,vec2(-.48,.30),vec2(.18,-.12),.07));relief=max(relief,spc081oval(b,vec2(-.46,.47),vec2(.14)));relief=max(relief,spc081oval(b,vec2(.70,-.2),vec2(.48,.18)));c=mix(c,light,relief*body*.62);
// Two independently visible plain tablets, deliberately different dimensions/materials.
c=mix(c,vec3(.50,.40,.34),spc081box(z,vec2(-69.35,1.40),vec2(.30,.78)));c=mix(c,vec3(.58,.55,.48),spc081box(z,vec2(-58.00,1.27),vec2(.46,.65)));return c;
}
float spc081point435(vec2 q,float x,float low,float spring,float r){float body=spc081box(q,vec2(x,(low+spring)*.5),vec2(r,(spring-low)*.5));float head=min(spc081oval(q,vec2(x-r,spring),vec2(2.*r)),spc081oval(q,vec2(x+r,spring),vec2(2.*r)))*step(spring,q.y);return max(body,head);}
// St Peter tower: independent native face widths, pointed belfry arches.
vec3 spc081tower435(vec3 base,vec2 z,float width){
vec3 c=vec3(.83,.80,.70),trim=vec3(.91,.88,.77),shadow=vec3(.60,.58,.50);
float pitch=width*.238;float k=clamp(floor((z.x+pitch)/pitch+.5),0.,2.);float x=-pitch+k*pitch;float r=width*.0555;
float rim=spc081point435(z,x,42.15,46.4,r+.14),opening=spc081point435(z,x,42.35,46.4,r);c=mix(c,shadow,rim);c=mix(c,vec3(.15,.18,.16),opening);
float slat=spc081seam(z.y,.27,.027);c=mix(c,vec3(.30,.32,.28),slat*opening*.65);
for(int j=0;j<2;j++){float y=41.3+float(j)*8.10;c=mix(c,trim,spc081box(z,vec2(0.,y),vec2(width*.5,.12)));}
// Lower clock shares the documented Roman dial primitive, translated only in height.
c=spc081clock(c,vec2(z.x,z.y-37.2+56.35));
c=mix(c,shadow,spc081box(z,vec2(-width*.455,41.),vec2(.04,10.8)));c=mix(c,trim,spc081box(z,vec2(width*.455,41.),vec2(.10,10.8)));
return c;
}


//440 west porch on the actual6397 native shaft frame, not an unreachable4959 back face.
vec3 spc081west440(vec3 c,vec2 z){c=spc081passage439(c,z,0.,.10,4.45,1.90,false);float win=spc081arch(z,0.,13.25,16.,1.18);c=mix(c,vec3(.62,.60,.53),spc081arch(z,0.,13.10,16.,1.34));c=spc081glass(c,z,0.,win);c=mix(c,vec3(.59,.58,.51),spc081box(z,vec2(0.,12.95),vec2(1.44,.09)));c=mix(c,vec3(.60,.58,.51),spc081box(z,vec2(0.,7.20),vec2(2.50,.12)));return c;}
//440 north aisle directly observed in Leonardo Monacensis2018 Nordseite; layout registered to its own native wall.
vec3 spc081north440(vec3 c,vec2 z){
float x=-66.85;if(z.x> -63.875)x=-60.90;if(z.x> -57.925)x=-54.95;if(z.x> -51.975)x=-49.;if(z.x> -46.025)x=-43.05;if(z.x> -34.125)x=-31.15;
float rim=spc081arch(z,x,2.20,10.40,1.27),win=spc081arch(z,x,2.38,10.40,1.08);c=mix(c,vec3(.65,.63,.56),rim);c=spc081glass(c,z,x,win);c=mix(c,vec3(.69,.68,.60),spc081box(z,vec2(x,2.20),vec2(1.43,.10)));
float doorX=z.x< -58.?-72.8:-37.1;c=spc081passage439(c,z,doorX,.12,4.80,1.40,true);
float piers=max(spc081box(z,vec2(doorX-1.96,4.4),vec2(.26,4.3)),spc081box(z,vec2(doorX+1.96,4.4),vec2(.26,4.3)));c=mix(c,vec3(.71,.66,.57),piers);
c=mix(c,vec3(.62,.57,.49),spc081box(z,vec2(doorX,8.85),vec2(2.45,.18)));float ped=max(spc081line(z,vec2(doorX-2.27,9.15),vec2(doorX,11.45),.14),spc081line(z,vec2(doorX,11.45),vec2(doorX+2.27,9.15),.14));c=mix(c,vec3(.70,.65,.56),ped);
// Ligsaltz red-marble aedicule between the westernmost two windows, separately observed and LMU located.
vec2 m=z-vec2(-63.875,3.70);vec3 stone=vec3(.58,.40,.32);float panel=spc081box(m,vec2(0.,-.05),vec2(.85,1.65));c=mix(c,stone,panel);c=mix(c,vec3(.39,.29,.24),spc081box(m,vec2(0.,.10),vec2(.67,1.28)));for(int j=0;j<2;j++){float a=j==0?-.89:.89;c=mix(c,vec3(.68,.53,.42),spc081box(m,vec2(a,.05),vec2(.13,1.67)));}c=mix(c,stone,spc081oval(m,vec2(0.,1.55),vec2(1.08,.48)));float figure=spc081oval(m,vec2(0.,.85),vec2(.15));figure=max(figure,spc081line(m,vec2(0.,.64),vec2(0.,-.10),.09));figure=max(figure,spc081line(m,vec2(-.50,.20),vec2(.50,.20),.07));c=mix(c,vec3(.72,.57,.45),figure*panel);
// Low tablets remain distinct shallow solids, no fake inscription text or repeating window pattern.
c=mix(c,vec3(.53,.42,.35),spc081box(z,vec2(-69.0,1.20),vec2(.40,.74)));c=mix(c,vec3(.59,.56,.49),spc081box(z,vec2(-58.1,1.0),vec2(.48,.52)));c=mix(c,vec3(.54,.43,.37),spc081box(z,vec2(-52.,1.0),vec2(.32,.61)));
c=mix(c,vec3(.65,.63,.55),spc081box(z,vec2(-51.5,14.65),vec2(25.1,.13)));return c;}
// Six paired small north roof dormers: photo-estimated positions, surface shading only; no geometry added.
vec3 spc081dormers440(vec3 c,vec2 q){for(int row=0;row<2;row++){float v=row==0?795.65:798.10;float offset=row==0?-1.20:0.;float j=clamp(floor((q.x+73.8-offset)/8.32+.5),0.,5.);float u=-73.8+offset+j*8.32;vec2 d=q-vec2(u,v);float shadow=spc081box(d,vec2(0.,.10),vec2(.54,.45));c=mix(c,vec3(.20,.16,.13),shadow);float hood=spc081box(d,vec2(0.,-.30),vec2(.49,.21));c=mix(c,vec3(.45,.25,.18),hood);c=mix(c,vec3(.19,.24,.22),spc081box(d,vec2(0.,.15),vec2(.35,.21)));c=mix(c,vec3(.50,.48,.38),spc081box(d,vec2(0.,.39),vec2(.43,.035)));}return c;}
vec3 stPeterComplete081(vec3 base,vec3 p,vec3 n,vec4 frame,float family){// Original apse817 lower bay retains red SOURCE color; cover it with the registered brick material.
if(abs(family-4958.)<.25&&frame.x>16.&&frame.x<24.&&p.y<20.)return spc081brick(vec2(frame.x,p.y));if(abs(family-4959.)<.25&&n.y>.001&&p.y>53.&&p.y<60.01&&abs(frame.x)<6.4&&dot(n,vec3(.97077,0.,-.24))<.45){float x=abs(n.z)>abs(n.x)?(.97077*p.x-.24*p.z+79.74931256):frame.x;return spc081clock(vec3(.42,.56,.49),vec2(x,p.y));}if(abs(family-4959.)<.25&&abs(n.y)<.01&&abs(frame.x)<6.4&&p.y>30.&&p.y<52.97)return spc081tower435(base,vec2(frame.x,p.y),12.62);if(abs(family-4958.)<.25||abs(family-4959.)<.25)return stPeterLegacy081(base,p,n,frame,family);if(abs(family-6397.)>.25)return base;float role=floor(frame.z-1000.+.5);vec2 q=vec2(frame.x,frame.w);if(role<.5)return spc081brick(vec2(q.x,p.y));if(role<1.5){
// Exact native tower shaft: face-specific coordinates retained from original SOURCE359.
if(abs(n.y)<.01&&n.x<-.90&&frame.x>247.20&&frame.x<247.50&&frame.w> -536.90&&frame.w< -524.0&&p.y<30.)return spc081west440(vec3(.83,.80,.70),vec2(frame.w+530.464,p.y));
if(abs(n.y)<.01&&frame.x>247.2&&frame.x<253.8&&frame.w> -536.9&&frame.w< -524.0&&p.y>30.&&p.y<52.97){float tx=abs(n.x)>.9?frame.w+530.464:frame.x-250.471;return spc081tower435(base,vec2(tx,p.y),abs(n.x)>.9?12.62:6.26);}
vec3 c=vec3(.83,.80,.70);c*=1.-.018*spc081seam(p.y,.42,.004);
// South side-wing and its west return, separately observed in Chris Light photo443.
// Slits are narrow openings; the two pale arcaded bands are blind ornament, not windows.
if(abs(n.y)<.01&&frame.x> -83.95&&frame.x< -76.5&&p.y<35.1&&((n.z<-.94&&frame.w>780.0&&frame.w<780.22)||(n.x<-.94&&frame.x< -83.65&&frame.w>780.0&&frame.w<786.5))){
float u=n.z<-.94?frame.x+80.2:frame.w-783.25;vec2 z=vec2(u,p.y);
float row=clamp(floor((p.y-15.)/7.+.5),0.,2.);float y=15.+row*7.;float slit=spc081arch(z,0.,y-.65,y+.50,.105);c=mix(c,vec3(.64,.61,.53),spc081arch(z,0.,y-.78,y+.50,.19));c=mix(c,vec3(.19,.20,.17),slit);
for(int j=0;j<2;j++){float band=26.5+float(j)*6.;float x=floor((u+.275)/.55)*.55;float ring=spc081arch(z,x,band-.30,band,.24)-spc081arch(z,x,band-.30,band,.16);float blind=ring*step(.35,abs(u));c=mix(c,vec3(.91,.88,.77),blind);c=mix(c,vec3(.66,.63,.55),spc081box(z,vec2(0.,band-.40),vec2(3.65,.035)));}
}
// North lower native wall is at its own v804.45, independent of upper carrier799.4.
if(n.z>.94&&n.x>.20&&n.x<.28&&frame.w>804.30&&frame.w<804.60&&p.y<15.08&&frame.x> -76.7&&frame.x< -26.4)c=spc081north440(c,vec2(frame.x,p.y));
// North clerestory only: directly viewed Kajebi II September2017 Rathaus photograph.
// Eight oval openings; spacing and dimensions are photo estimates, not survey.
if(n.z>.94&&n.x>.20&&n.x<.28&&frame.w>799.3&&frame.w<799.5&&p.y>17.1&&p.y<27.8&&frame.x> -76.7&&frame.x< -26.4){
vec2 z=vec2(frame.x,p.y);
float j=clamp(floor((z.x+72.8)/5.95+.5),0.,7.);float x=-72.8+j*5.95;float rim=spc081oval(z,vec2(x,22.1),vec2(1.14,2.13));float win=spc081oval(z,vec2(x,22.1),vec2(.96,1.95));c=mix(c,vec3(.65,.63,.56),rim);c=spc081glass(c,z,x,win);
c=mix(c,vec3(.70,.68,.60),spc081box(z,vec2(-51.6,27.3),vec2(25.1,.12)));
}
// South upper nave: small round-headed openings; not mirrored north ovals.
if(n.z<-.94&&n.x<-.20&&n.x>-.28&&frame.w>786.7&&frame.w<786.9&&p.y>17.1&&p.y<27.8&&frame.x> -76.7&&frame.x< -26.4){vec2 z=vec2(frame.x,p.y);float j=clamp(floor((z.x+72.8)/5.95+.5),0.,7.);float x=-72.8+j*5.95;float rim=spc081arch(z,x,19.1,21.2,1.17),win=spc081arch(z,x,19.25,21.2,1.02);c=mix(c,vec3(.65,.63,.56),rim);c=spc081glass(c,z,x,win);c=mix(c,vec3(.70,.68,.60),spc081box(z,vec2(-51.6,27.3),vec2(25.1,.12)));}
// Intermediate squat oval openings between aisle and high nave cornices.
if(n.z<-.94&&n.x<-.20&&n.x>-.28&&frame.w>781.8&&frame.w<782.0&&p.y>11.1&&p.y<15.05&&frame.x> -76.7&&frame.x< -26.4){vec2 z=vec2(frame.x,p.y);float j=clamp(floor((z.x+72.8)/5.95+.5),0.,7.);float x=-72.8+j*5.95;float rim=spc081oval(z,vec2(x,13.3),vec2(1.26,.91)),win=spc081oval(z,vec2(x,13.3),vec2(1.10,.75));c=mix(c,vec3(.65,.63,.56),rim);c=spc081glass(c,z,x,win);}
// South lower aisle: combined independently viewed Chris Light photos441/443.
// Two grounded portals and six tall window bays; dimensions are photo estimates.
if(n.z<-.94&&n.x<-.20&&n.x>-.28&&frame.w>778.1&&frame.w<778.3&&p.y<11.1&&frame.x> -76.5&&frame.x< -28.8){
vec2 z=vec2(frame.x,p.y);float x=-66.85;if(z.x> -63.875)x=-60.9;if(z.x> -57.925)x=-54.95;if(z.x> -51.975)x=-49.;if(z.x> -46.025)x=-43.05;if(z.x> -34.125)x=-31.15;
float trim=spc081arch(z,x,2.20,8.05,1.28),win=spc081arch(z,x,2.38,8.05,1.08);
c=mix(c,vec3(.65,.63,.56),trim);c=spc081glass(c,z,x,win);c=mix(c,vec3(.71,.69,.60),spc081box(z,vec2(x,2.20),vec2(1.44,.10)));
// Entry is grounded, with timber leaves and separate arched fanlight; no window sill.
float doorX=z.x< -58.?-72.8:-37.1,door=spc081arch(z,doorX,.12,4.25,1.40);c=mix(c,vec3(.63,.60,.51),spc081arch(z,doorX,0.,4.25,1.68));c=mix(c,vec3(.25,.18,.12),door);
c=mix(c,vec3(.13,.17,.15),door*step(3.8,z.y));c=mix(c,vec3(.16,.12,.085),spc081box(z,vec2(doorX,1.95),vec2(.035,1.80))*door);
float pilaster=max(spc081box(z,vec2(doorX-1.92,3.10),vec2(.26,3.0)),spc081box(z,vec2(doorX+1.92,3.10),vec2(.26,3.0)));c=mix(c,vec3(.73,.70,.61),pilaster);
c=mix(c,vec3(.65,.62,.54),spc081box(z,vec2(doorX,6.12),vec2(2.35,.16)));
float ped=max(spc081line(z,vec2(doorX-2.22,6.38),vec2(doorX,7.65),.13),spc081line(z,vec2(doorX,7.65),vec2(doorX+2.22,6.38),.13));c=mix(c,vec3(.70,.67,.58),ped);
c=mix(c,vec3(.59,.57,.50),spc081box(z,vec2(-42.0,1.15),vec2(.48,.72)));c=mix(c,vec3(.64,.61,.53),spc081oval(z,vec2(-33.8,1.35),vec2(.58,.85)));
c=mix(c,vec3(.66,.64,.56),spc081box(z,vec2(-43.,.42),vec2(15.,.33)));
c=spc081memorial439(c,z);
}
return c;}if(role<2.5){float seam=max(spc081seam(q.x,.31,.010),spc081seam(q.y,.20,.010));vec3 c=mix(vec3(.48,.25,.18),vec3(.31,.19,.15),seam*.34);if(q.x> -76.6&&q.x< -26.5&&q.y>793.2&&q.y<799.5&&n.z>.2&&p.y>28.)c=spc081dormers440(c,q);return c;}if(role<3.5){float seam=max(spc081seam(q.x,.65,.012),spc081seam(q.y,1.2,.007));return mix(vec3(.42,.56,.49),vec3(.31,.44,.38),seam*.23);}return vec3(.83,.71,.34);}
`;
