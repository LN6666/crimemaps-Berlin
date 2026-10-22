export const F065_GLSL=String.raw`
float m65box(vec2 p,vec2 c,vec2 r){vec2 a=max(fwidth(p),vec2(.003));vec2 q=1.-smoothstep(r-a,r+a,abs(p-c));return q.x*q.y;}
float m65line(float x,float pitch,float width){float d=abs(mod(x+pitch*.5,pitch)-pitch*.5),a=max(fwidth(x),.003);return 1.-smoothstep(width,width+a,d);}
vec3 m65window(vec3 c,vec2 p,vec2 at,vec2 size){float outer=m65box(p,at,size+vec2(.11)),inner=m65box(p,at,size);c=mix(c,vec3(.62,.62,.55),outer);c=mix(c,vec3(.28,.34,.34),inner);float frame=max(m65line(p.x-at.x,.62,.026),m65line(p.y-at.y,1.15,.028));return mix(c,vec3(.66,.67,.60),frame*inner);}
vec3 m65stone(vec2 p){float joint=max(m65line(p.x,1.35,.018),m65line(p.y,.52,.014));float stain=.025*sin(p.x*1.2)*sin(p.y*.55);return mix(vec3(.46,.45,.40)+stain,vec3(.31,.33,.30),joint*.45);}
float m65glyph(int code,vec2 p){int col=int(floor(p.x/.09)),row=int(floor((.63-p.y)/.09));if(col<0||col>4||row<0||row>6)return 0.;float bits=0.;
if(code==0){if(row==0)bits=17.;if(row==1)bits=17.;if(row==2)bits=17.;if(row==3)bits=31.;if(row==4)bits=17.;if(row==5)bits=17.;if(row==6)bits=17.;}
if(code==1){if(row==0)bits=14.;if(row==1)bits=17.;if(row==2)bits=17.;if(row==3)bits=31.;if(row==4)bits=17.;if(row==5)bits=17.;if(row==6)bits=17.;}
if(code==2){if(row==0)bits=17.;if(row==1)bits=17.;if(row==2)bits=17.;if(row==3)bits=17.;if(row==4)bits=17.;if(row==5)bits=17.;if(row==6)bits=14.;}
if(code==3){if(row==0)bits=30.;if(row==1)bits=17.;if(row==2)bits=17.;if(row==3)bits=30.;if(row==4)bits=16.;if(row==5)bits=16.;if(row==6)bits=16.;}
if(code==4){if(row==0)bits=31.;if(row==1)bits=4.;if(row==2)bits=4.;if(row==3)bits=4.;if(row==4)bits=4.;if(row==5)bits=4.;if(row==6)bits=4.;}
if(code==5){if(row==0)bits=30.;if(row==1)bits=17.;if(row==2)bits=17.;if(row==3)bits=30.;if(row==4)bits=17.;if(row==5)bits=17.;if(row==6)bits=30.;}
if(code==6){if(row==0)bits=17.;if(row==1)bits=25.;if(row==2)bits=25.;if(row==3)bits=21.;if(row==4)bits=19.;if(row==5)bits=19.;if(row==6)bits=17.;}
if(code==7){if(row==0)bits=14.;if(row==1)bits=17.;if(row==2)bits=17.;if(row==3)bits=17.;if(row==4)bits=17.;if(row==5)bits=17.;if(row==6)bits=14.;}
if(code==8){if(row==0)bits=31.;if(row==1)bits=16.;if(row==2)bits=16.;if(row==3)bits=30.;if(row==4)bits=16.;if(row==5)bits=16.;if(row==6)bits=16.;}
if(code==9){if(row==0)bits=31.;if(row==1)bits=16.;if(row==2)bits=16.;if(row==3)bits=30.;if(row==4)bits=1.;if(row==5)bits=1.;if(row==6)bits=30.;}
if(code==10){if(row==0)bits=0.;if(row==1)bits=0.;if(row==2)bits=0.;if(row==3)bits=31.;if(row==4)bits=0.;if(row==5)bits=0.;if(row==6)bits=0.;}
if(code==11){if(row==0)bits=30.;if(row==1)bits=1.;if(row==2)bits=1.;if(row==3)bits=14.;if(row==4)bits=1.;if(row==5)bits=1.;if(row==6)bits=30.;}
if(code==12){if(row==0)bits=14.;if(row==1)bits=16.;if(row==2)bits=16.;if(row==3)bits=30.;if(row==4)bits=17.;if(row==5)bits=17.;if(row==6)bits=14.;}
float bit=mod(floor(bits/pow(2.,float(4-col))),2.);vec2 d=abs(fract(p/.09)-.5)*.09;vec2 a=max(fwidth(p),vec2(.001));return bit*(1.-smoothstep(.043-a.x,.043+a.x,d.x))*(1.-smoothstep(.043-a.y,.043+a.y,d.y));}
float m65word(vec2 p){float ink=0.;ink=max(ink,m65glyph(0,p-vec2(0.0,0.)));ink=max(ink,m65glyph(1,p-vec2(0.56,0.)));ink=max(ink,m65glyph(2,p-vec2(1.12,0.)));ink=max(ink,m65glyph(3,p-vec2(1.6800000000000002,0.)));ink=max(ink,m65glyph(4,p-vec2(2.24,0.)));ink=max(ink,m65glyph(5,p-vec2(2.8000000000000003,0.)));ink=max(ink,m65glyph(1,p-vec2(3.3600000000000003,0.)));ink=max(ink,m65glyph(0,p-vec2(3.9200000000000004,0.)));ink=max(ink,m65glyph(6,p-vec2(4.48,0.)));ink=max(ink,m65glyph(0,p-vec2(5.040000000000001,0.)));ink=max(ink,m65glyph(7,p-vec2(5.6000000000000005,0.)));ink=max(ink,m65glyph(8,p-vec2(6.16,0.)));return ink;}
float m65platform(vec2 p){float ink=0.;ink=max(ink,m65glyph(9,p-vec2(0.0,0.)));ink=max(ink,m65glyph(10,p-vec2(0.72,0.)));ink=max(ink,m65glyph(11,p-vec2(1.44,0.)));ink=max(ink,m65glyph(12,p-vec2(2.16,0.)));return ink;}
vec3 muenchenHauptbahnhofWhole065(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(abs(family-6336.)>.25)return base;float U=frame.x,Y=frame.y,V=frame.z,role=floor(frame.w+.5);float mainNormal=dot(normal.xz,vec2(.994878478,-.101078254));vec2 q=abs(mainNormal)>.65?vec2(V,Y):vec2(U,Y);
if(role==2.){vec2 g=abs(normal.y)>.2?vec2(U,V):q;float bars=max(m65line(g.x,1.32,.032),m65line(g.y,1.85,.032));return mix(vec3(.31,.43,.46),vec3(.67,.71,.69),bars);}
if(role==3.){float seams=max(m65line(U,.82,.014),m65line(V,6.0,.018)*.30);return mix(vec3(.38,.41,.41),vec3(.24,.28,.29),seams*.60);}
if(role==5.||role==13.)return vec3(.45,.49,.48);
if(role==6.)return vec3(.27,.30,.30);
if(role==8.){float band=m65line(Y,2.5,.045);return mix(vec3(.55,.55,.50),vec3(.39,.42,.41),band*.42);}
if(role==12.)return vec3(.21,.22,.21);
if(role==20.){vec3 c=vec3(.15,.17,.17);float signBand=m65box(vec2(U,Y),vec2(49.5,4.96),vec2(5.1,.61));c=mix(c,vec3(.075,.09,.23),signBand);float badge=m65box(vec2(U,Y),vec2(45.55,6.05),vec2(.42,.31));c=mix(c,vec3(.69,.06,.055),badge);float clock=1.-smoothstep(.29,.32,length(vec2(U-44.65,Y-6.05)));c=mix(c,vec3(.80,.81,.73),clock);float hands=m65box(vec2(U,Y),vec2(44.65,6.14),vec2(.015,.10))+m65box(vec2(U,Y),vec2(44.73,6.05),vec2(.09,.015));c=mix(c,vec3(.14),clamp(hands,0.,1.)*clock);float text=max(m65word(vec2(U-46.35,Y-5.72)),m65platform(vec2(U-51.1,Y-4.60)));c=mix(c,vec3(.88,.88,.79),text);float doors=m65box(vec2(U,Y),vec2(49.5,2.6),vec2(3.6,1.45));return mix(c,vec3(.10,.15,.16),doors*.65);}
vec3 red=vec3(.68,.25,.15)+.015*sin(U*.21)*sin(Y*.7);float baseStone=1.-smoothstep(1.65,1.73,Y);vec3 c=mix(red,m65stone(vec2(U,Y)),baseStone);
if(role==10.){for(int i=0;i<9;i++){float x=2.6+4.65*float(i);float pier=m65box(vec2(U,Y),vec2(x,5.02),vec2(.82,3.12));c=mix(c,vec3(.47,.47,.42),pier);c=m65window(c,vec2(U,Y),vec2(x,5.05),vec2(.55,2.63));float crossbar=m65box(vec2(U,Y),vec2(x,5.0),vec2(.58,.055));c=mix(c,vec3(.67,.67,.60),crossbar);c=m65window(c,vec2(U,Y),vec2(x,.83),vec2(.45,.39));}
for(int i=0;i<3;i++){float x=58.3+4.9*float(i);float pier=m65box(vec2(U,Y),vec2(x,5.02),vec2(1.0,3.12));c=mix(c,vec3(.47,.47,.42),pier);c=m65window(c,vec2(U,Y),vec2(x,3.0),vec2(.78,.97));c=m65window(c,vec2(U,Y),vec2(x,6.9),vec2(.78,.97));c=m65window(c,vec2(U,Y),vec2(x,.83),vec2(.53,.39));float r=length(vec2(U-x,Y-4.95)),a=max(fwidth(r),.008);float relief=1.-smoothstep(.055-a,.055+a,abs(r-.42));c=mix(c,vec3(.39,.41,.37),relief*.55);}
float lintel=m65box(vec2(U,Y),vec2(49.5,7.88),vec2(5.5,.13));c=mix(c,vec3(.48,.47,.42),lintel);}
return c;}
`;
