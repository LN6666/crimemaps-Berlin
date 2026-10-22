export const F088_COMPLETION_GLSL=`
float smc088box(vec2 q,vec2 c,vec2 h){vec2 aa=max(fwidth(q),vec2(.0008));vec2 m=1.-smoothstep(h-aa,h+aa,abs(q-c));return m.x*m.y;}
float smc088oval(vec2 q,vec2 c,vec2 h){float d=length((q-c)/h);return 1.-smoothstep(1.-max(fwidth(d),.01),1.+max(fwidth(d),.01),d);}
float smc088arch(vec2 q,float x,float low,float spring,float rx,float ry){return max(smc088box(q,vec2(x,(low+spring)*.5),vec2(rx,(spring-low)*.5)),smc088oval(q,vec2(x,spring),vec2(rx,ry))*step(spring,q.y));}
vec3 smc088figure(vec3 c,vec2 q,float x,float low,float high){vec3 pale=vec3(.91,.90,.84),shade=vec3(.69,.68,.62);float h=high-low;float f=smc088oval(q,vec2(x,low+h*.84),vec2(.24,h*.105));f=max(f,smc088oval(q,vec2(x,low+h*.61),vec2(.37,h*.22)));f=max(f,smc088box(q,vec2(x-.04,low+h*.28),vec2(.34,h*.25)));f=max(f,smc088oval(q,vec2(x+.37,low+h*.54),vec2(.16,h*.18)));c=mix(c,pale,f);c=mix(c,shade,smc088box(q,vec2(x-.08,low+h*.28),vec2(.035,h*.20))*f);return c;}
vec3 smc088niche(vec3 c,vec2 q,float x,float low,float spring){float n=smc088arch(q,x,low,spring,.67,.025);c=mix(c,vec3(.64,.63,.58),smc088arch(q,x,low-.004,spring,.79,.029));c=mix(c,vec3(.40,.32,.28),n);c=smc088figure(c,q,x,low+.009,spring+.020);c=mix(c,vec3(.58,.55,.47),smc088box(q,vec2(x,low-.010),vec2(.89,.009)));c=mix(c,vec3(.85,.83,.74),smc088box(q,vec2(x,low-.002),vec2(.78,.005)));return c;}
vec3 smc088window(vec3 c,vec2 q,float x,float low,float spring){float outer=smc088arch(q,x,low-.006,spring,1.15,.048);float inner=smc088arch(q,x,low,spring,1.02,.043);c=mix(c,vec3(.73,.73,.67),outer);c=mix(c,vec3(.16,.21,.21),inner);vec2 z=q-vec2(x,low);vec2 d=abs(fract(z/vec2(.28,.013)+.5)-.5)*vec2(.28,.013);vec2 aa=max(fwidth(q),vec2(.0005));float grid=max(1.-smoothstep(.017,.017+aa.x,d.x),1.-smoothstep(.0011,.0011+aa.y,d.y));c=mix(c,vec3(.35,.38,.34),grid*inner);return c;}
vec3 smc088portal(vec3 c,vec2 q,float x){vec3 stone=vec3(.53,.44,.34),light=vec3(.71,.62,.49),dark=vec3(.26,.23,.18);float smc088OuterPortal=smc088arch(q,x,.025,.205,2.16,.070);c=mix(c,stone,smc088OuterPortal);c=mix(c,light,smc088arch(q,x,.028,.205,1.92,.062));c=mix(c,dark,smc088arch(q,x,.03,.205,1.65,.054));for(int j=0;j<2;j++){float xx=x+(j==0?(-1.):1.)*2.04;c=mix(c,light,smc088box(q,vec2(xx,.156),vec2(.29,.128)));c=mix(c,stone,smc088box(q,vec2(xx,.156),vec2(.08,.118)));}float cap=smc088oval(q,vec2(x,.300),vec2(2.55,.053))-smc088oval(q,vec2(x,.300),vec2(2.28,.041));c=mix(c,stone,cap*step(.296,q.y));c=mix(c,light,smc088oval(q,vec2(x,.319),vec2(.83,.035)));c=mix(c,dark,smc088oval(q,vec2(x,.319),vec2(.57,.024)));c=mix(c,light,smc088box(q,vec2(x,.363),vec2(2.55,.006)));return c;}
float smc088glyph(vec2 q,vec4 a,vec3 b){vec2 cell=floor(q);if(cell.x<0.||cell.x>=5.||cell.y<0.||cell.y>=7.)return 0.;float r=cell.y<.5?a.x:(cell.y<1.5?a.y:(cell.y<2.5?a.z:(cell.y<3.5?a.w:(cell.y<4.5?b.x:(cell.y<5.5?b.y:b.z)))));float v=mod(floor(r/pow(2.,4.-cell.x)),2.);vec2 t=fract(q);return v*smc088box(t,vec2(.5),vec2(.43));}
vec3 smc088LegacyBody(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family!=4923.)return base;vec2 q=vec2(frame.x,p.y/7.5);float W=frame.w;vec3 white=vec3(.88,.88,.83),pale=vec3(.96,.95,.88),grey=vec3(.65,.66,.59);vec3 c=white;
for(int j=0;j<2;j++){float xx=(j==0?(-1.):1.)*W*.475;c=mix(c,pale,smc088box(q,vec2(xx,.49),vec2(.49,.48)));c=mix(c,grey,smc088box(q,vec2(xx+.52,.49),vec2(.055,.48)));for(int k=0;k<3;k++)c=mix(c,grey,smc088box(q,vec2(xx,.38+float(k)*.31),vec2(.85,.013)));}
c=smc088portal(c,q,(-W*.225));c=smc088portal(c,q,(W*.225));
// Central bronze zone only, no inventedexactstatueidentity/attributes or separategeometry.
c=mix(c,vec3(.29,.29,.23),smc088arch(q,0.,.095,.285,1.28,.035));c=mix(c,vec3(.52,.47,.29),smc088oval(q,vec2(0.,.273),vec2(.25,.014)));c=mix(c,vec3(.29,.32,.24),smc088oval(q,vec2(0.,.217),vec2(.55,.049)));c=mix(c,vec3(.50,.48,.31),smc088box(q,vec2(0.,.133),vec2(1.08,.009)));
for(int j=0;j<2;j++){float xx=(j==0?(-1.):1.)*W*.425;c=mix(c,grey,smc088oval(q,vec2(xx,.198),vec2(.58,.025)));c=mix(c,vec3(.24,.27,.24),smc088oval(q,vec2(xx,.198),vec2(.36,.019)));c=mix(c,grey,smc088box(q,vec2(xx,.354),vec2(.45,.015)));c=mix(c,vec3(.22,.25,.23),smc088box(q,vec2(xx,.354),vec2(.26,.010)));}
for(int j=0;j<3;j++){float xx=(float(j)-1.)*W*.23;c=smc088window(c,q,xx,.435,.603);}
c=smc088niche(c,q,W*(-0.430000),.455,.579);c=smc088niche(c,q,W*(-0.430000),.757,.872);
c=smc088niche(c,q,W*(-0.310000),.455,.579);c=smc088niche(c,q,W*(-0.310000),.757,.872);
c=smc088niche(c,q,W*(-0.105000),.455,.579);c=smc088niche(c,q,W*(-0.105000),.757,.872);
c=smc088niche(c,q,W*(0.105000),.455,.579);c=smc088niche(c,q,W*(0.105000),.757,.872);
c=smc088niche(c,q,W*(0.310000),.455,.579);c=smc088niche(c,q,W*(0.310000),.757,.872);
c=smc088niche(c,q,W*(0.430000),.455,.579);c=smc088niche(c,q,W*(0.430000),.757,.872);
// Uppermainbody oval and blind recessedpanels; trueuppergable isoutsidecarrier.
c=mix(c,grey,smc088oval(q,vec2(0.,.836),vec2(1.13,.066)));c=mix(c,vec3(.18,.22,.22),smc088oval(q,vec2(0.,.836),vec2(.94,.057)));c=mix(c,vec3(.42,.44,.40),smc088box(q,vec2(0.,.836),vec2(.045,.055)));
for(int j=0;j<2;j++){float xx=(j==0?(-1.):1.)*W*.23;float panel=smc088box(q,vec2(xx,.825),vec2(1.65,.070))-smc088box(q,vec2(xx,.825),vec2(1.52,.062));c=mix(c,pale,panel);}
for(int j=0;j<3;j++){float yy=j==0?.395:(j==1?.690:.958);c=mix(c,grey,smc088box(q,vec2(0.,yy),vec2(W*.5,.014)));c=mix(c,pale,smc088box(q,vec2(0.,yy+.018),vec2(W*.5,.007)));c=mix(c,vec3(.48,.49,.43),smc088box(q,vec2(0.,yy-.017),vec2(W*.5,.003)));}
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-6.16000000))/0.18666667,((0.96500000)-q.y)/.002),vec4(30.,17.,17.,17.),vec3(17.,17.,30.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-5.04000000))/0.18666667,((0.96500000)-q.y)/.002),vec4(31.,16.,16.,30.),vec3(16.,16.,31.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-3.92000000))/0.18666667,((0.96500000)-q.y)/.002),vec4(14.,17.,17.,17.),vec3(17.,17.,14.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-1.68000000))/0.18666667,((0.96500000)-q.y)/.002),vec4(14.,17.,17.,17.),vec3(17.,17.,14.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-0.56000000))/0.18666667,((0.96500000)-q.y)/.002),vec4(30.,17.,17.,30.),vec3(16.,16.,16.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(0.56000000))/0.18666667,((0.96500000)-q.y)/.002),vec4(31.,4.,4.,4.),vec3(4.,4.,4.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(2.80000000))/0.18666667,((0.96500000)-q.y)/.002),vec4(17.,27.,21.,21.),vec3(17.,17.,17.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(3.92000000))/0.18666667,((0.96500000)-q.y)/.002),vec4(14.,17.,17.,31.),vec3(17.,17.,17.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(5.04000000))/0.18666667,((0.96500000)-q.y)/.002),vec4(17.,17.,10.,4.),vec3(10.,17.,17.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-9.20000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(31.,4.,4.,4.),vec3(4.,4.,31.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-8.40000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(17.,25.,25.,21.),vec3(19.,19.,17.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-6.80000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(17.,27.,21.,21.),vec3(17.,17.,17.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-6.00000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(31.,16.,16.,30.),vec3(16.,16.,31.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-5.20000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(17.,27.,21.,21.),vec3(17.,17.,17.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-4.40000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(14.,17.,17.,17.),vec3(17.,17.,14.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-3.60000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(30.,17.,17.,30.),vec3(20.,18.,17.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-2.80000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(31.,4.,4.,4.),vec3(4.,4.,31.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-2.00000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(14.,17.,17.,31.),vec3(17.,17.,17.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(-1.20000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(17.,27.,21.,21.),vec3(17.,17.,17.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(0.40000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(30.,17.,17.,17.),vec3(17.,17.,30.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(2.00000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(17.,27.,21.,21.),vec3(17.,17.,17.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(2.80000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(31.,4.,4.,4.),vec3(4.,4.,31.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(3.60000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(14.,17.,16.,16.),vec3(16.,17.,14.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(4.40000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(17.,17.,17.,31.),vec3(17.,17.,17.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(5.20000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(14.,17.,17.,31.),vec3(17.,17.,17.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(6.00000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(31.,16.,16.,30.),vec3(16.,16.,31.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(6.80000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(16.,16.,16.,16.),vec3(16.,16.,31.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(7.60000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(31.,4.,4.,4.),vec3(4.,4.,31.)));
c=mix(c,vec3(.82,.79,.65),smc088glyph(vec2((q.x-(8.40000000))/0.13333333,((0.69700000)-q.y)/.002),vec4(15.,16.,16.,14.),vec3(1.,1.,30.)));
return c;}



// 444: glazing bars remain inside already admitted 6402 glass apertures only.
vec3 smc088glazing444(vec3 c,vec2 wall,float x,float low,float spring,float rx,float ry){
 float mask=smc088arch(wall,x,low,spring,rx,ry);
 vec2 z=wall-vec2(x,low),aa=max(fwidth(wall),vec2(.008));
 vec2 d=abs(mod(z+vec2(.25,.275),vec2(.50,.55))-vec2(.25,.275));
 float vertical=1.-smoothstep(.025,.025+aa.x,d.x);
 float horizontal=1.-smoothstep(.028,.028+aa.y,d.y);
 return mix(c,vec3(.38,.41,.37),max(vertical,horizontal)*mask*.90);
}
vec3 smc088oculus444(vec3 c,vec2 wall,float x,float y,float radius){
 vec2 z=wall-vec2(x,y),aa=max(fwidth(wall),vec2(.008));
 float mask=smc088oval(wall,vec2(x,y),vec2(radius));
 float cross=max(1.-smoothstep(.035,.035+aa.x,abs(z.x)),1.-smoothstep(.035,.035+aa.y,abs(z.y)));
 float ring=1.-smoothstep(.030,.030+max(aa.x,aa.y),abs(length(z)-radius*.59));
 return mix(c,vec3(.39,.42,.37),max(cross,ring)*mask*.85);
}

vec3 sanktMichaelComplete088(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(abs(family-4923.)<.25){vec3 oldP=p;oldP.y=p.y*(7.5/31.);return smc088LegacyBody(base,oldP,normal,frame,family);}if(abs(family-6402.)>.25)return base;vec2 q=frame.xy;float y=p.y,role=floor(frame.z-1000.+.5);vec3 pale=vec3(.93,.93,.87),grey=vec3(.64,.66,.60),glass=vec3(.15,.20,.19);if(role<.5){vec2 d=abs(fract(q/vec2(.26,.34)+.5)-.5)*vec2(.26,.34);float line=1.-smoothstep(.009,.025,min(d.x,d.y));vec3 c=mix(vec3(.50,.22,.13),vec3(.34,.15,.10),line*.5);if(q.x>13.&&q.x<16.){for(int j=0;j<5;j++){float v=10.+8.*float(j);float window=smc088box(q,vec2(14.6,v),vec2(.7,.8));c=mix(c,glass,window);}}c=mix(c,glass,smc088box(q,vec2(0.,70.),vec2(.55,1.1)));return c;}
if(role<1.5){vec3 c=pale;c=mix(c,grey,smc088box(vec2(q.x,y),vec2(0.,30.7),vec2(100.,.15)));return c;}
if(role<2.5){vec2 wall=vec2(q.y,y);vec3 c=pale;for(int j=0;j<3;j++){float v=j==0?14.:(j==1?26.:39.);float a=smc088arch(wall,v,9.,16.5,1.6,2.2);c=mix(c,grey,smc088arch(wall,v,8.85,16.5,1.8,2.4));c=mix(c,glass,a);c=smc088glazing444(c,wall,v,9.,16.5,1.6,2.2);c=mix(c,vec3(.91,.92,.87),smc088oval(wall,vec2(v,25.),vec2(2.5,2.6)));c=mix(c,grey,smc088oval(wall,vec2(v,25.),vec2(2.3,2.4))*.14);}
if(q.y>=47.&&q.y<=75.){c=pale;for(int j=0;j<3;j++){float v=53.+float(j)*8.;c=mix(c,grey,smc088arch(wall,v,20.,24.5,1.45,1.8));c=mix(c,glass,smc088arch(wall,v,20.2,24.5,1.2,1.6));c=smc088glazing444(c,wall,v,20.2,24.5,1.2,1.6);}c=mix(c,grey,smc088arch(wall,61.,0.,11.5,2.7,3.0));c=mix(c,glass,smc088arch(wall,61.,0.,11.5,2.35,2.7));for(int j=0;j<2;j++)c=mix(c,grey,smc088box(wall,vec2(j==0?48.:74.,15.),vec2(.4,15.)));c=mix(c,grey,smc088box(wall,vec2(61.,18.),vec2(14.,.2)));}
if(q.y>75.){c=pale;float a=smc088arch(wall,81.,13.,22.,1.7,2.0);c=mix(c,glass,a);c=smc088glazing444(c,wall,81.,13.,22.,1.7,2.0);}c=mix(c,grey,smc088box(wall,vec2(40.,30.7),vec2(100.,.18)));return c;}
if(role<3.5){vec2 wall=vec2(q.x,y);vec3 c=pale;float w=frame.w;c=mix(c,grey,smc088arch(wall,0.,12.,22.,1.65,2.6));float inside=smc088arch(wall,0.,12.2,22.,1.4,2.35);c=mix(c,glass,inside);float bars=1.-smoothstep(.03,.07,abs(mod(q.x+.25,.5)-.25));c=mix(c,grey,bars*inside*.7);c=smc088glazing444(c,wall,0.,12.2,22.,1.4,2.35);c=mix(c,grey,smc088oval(wall,vec2(0.,28.),vec2(1.65)));c=mix(c,glass,smc088oval(wall,vec2(0.,28.),vec2(1.42)));c=smc088oculus444(c,wall,0.,28.,1.42);for(int j=0;j<2;j++){float x=(j==0?-1.:1.)*(w*.5-.25);c=mix(c,grey,smc088box(wall,vec2(x,21.),vec2(.22,10.)));float swirl=abs(length((wall-vec2(x,25.))/vec2(.9,1.3))-1.);c=mix(c,vec3(.51,.67,.57),(1.-smoothstep(.08,.18,swirl))*.7);}return c;}
if(role<4.5){vec2 wall=vec2(q.x,y);vec3 c=pale;for(int j=0;j<2;j++){float x=(j==0?-1.:1.)*5.4;for(int k=0;k<2;k++){float a=x+(k==0?-.65:.65);c=mix(c,grey,smc088arch(wall,a,35.0,37.3,.55,.7));c=mix(c,glass,smc088arch(wall,a,35.1,37.3,.40,.6));}float xx=(j==0?-1.:1.)*12.5;float ring=abs(length((wall-vec2(xx,34.7))/vec2(1.2,.9))-1.);c=mix(c,grey,1.-smoothstep(.08,.16,ring));for(int k=0;k<2;k++)c=mix(c,glass,smc088oval(wall,vec2((j==0?-1.:1.)*(8.9+2.4*float(k)),32.8),vec2(.7,.6)));}
c=mix(c,grey,smc088oval(wall,vec2(0.,43.8),vec2(1.75,1.6)));c=mix(c,glass,smc088oval(wall,vec2(0.,43.8),vec2(1.4,1.3)));c=mix(c,vec3(.43,.29,.23),smc088arch(wall,0.,35.0,38.2,1.5,1.6));c=smc088figure(c,wall,0.,35.2,39.3);c=mix(c,vec3(.43,.29,.23),smc088arch(wall,0.,48.,50.,1.05,.9));c=smc088figure(c,wall,0.,48.,50.6);for(int j=0;j<3;j++)c=mix(c,grey,smc088box(wall,vec2(0.,j==0?34.5:(j==1?40.4:47.2)),vec2(17.,.10)));return c;}
if(role<5.5){vec2 wall=vec2(q.y,y);vec3 c=pale;c=mix(c,grey,smc088box(wall,vec2(61.,33.5),vec2(9.3,.10)));c=mix(c,glass,smc088box(wall,vec2(61.,34.2),vec2(.7,1.6)));for(int j=0;j<2;j++)c=mix(c,glass,smc088box(wall,vec2(j==0?57.2:64.8,34.3),vec2(.4,.55)));return c;}
return vec3(.66,.57,.28);}

`;
