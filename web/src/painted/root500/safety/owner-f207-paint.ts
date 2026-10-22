export const OWNER_F207_PAINT_GLSL=String.raw`
float mh207B(vec2 p,vec2 h){return 1.-smoothstep(-.025,.025,max(abs(p.x)-h.x,abs(p.y)-h.y));}
float mh207Arch(vec2 p,float w,float h){float top=h-1.1+1.1*sqrt(max(0.,1.-abs(p.x)/w));return step(abs(p.x),w)*step(0.,p.y)*step(p.y,top);}
vec3 mh207Window(vec3 c,float a,float y,float cy,float hw,float hh){float rim=mh207B(vec2(a,y-cy),vec2(hw+.14,hh+.13)),g=mh207B(vec2(a,y-cy),vec2(hw,hh));c=mix(c,vec3(.63,.60,.47),rim);c=mix(c,vec3(.19,.25,.23),g);float bars=max(1.-smoothstep(.025,.045,abs(mod(a,.49)-.245)),1.-smoothstep(.025,.045,min(abs(y-cy-.65),abs(y-cy+.55))));return mix(c,vec3(.61,.60,.48),bars*g);}
float mh207Text(vec2 p){float ix=floor(p.x/4.);vec2 q=vec2(mod(p.x,4.),p.y);if(ix<0.||ix>9.||q.x>=3.||q.y<0.||q.y>=5.)return 0.;float code=0.;if(ix==0.)code=23549.;else if(ix==1.)code=23530.;else if(ix==2.)code=23275.;else if(ix==3.)code=22109.;else if(ix==4.)code=9367.;else if(ix==5.)code=23533.;else if(ix==6.)code=23530.;else if(ix==7.)code=29257.;else if(ix==8.)code=29257.;else if(ix==9.)code=29391.;float bit=floor(q.x)+3.*floor(q.y);return mod(floor(code/exp2(bit)),2.);}
vec3 markthalleRecovery207(vec3 base,vec3 p,vec3 normal,vec4 f,float family){float u=f.x,y=f.y,v=f.z,k=f.w;vec3 cream=vec3(.80,.74,.56),stone=vec3(.61,.60,.49),c=cream;
 if(k>3.5&&k<4.5){float glass=step(abs(v),9.9);if(abs(normal.y)<.4)glass=step(y,21.)*step(14.5,y);float ribs=max(1.-smoothstep(.025,.065,abs(mod(u+30.,2.35)-1.175)),1.-smoothstep(.025,.055,abs(mod(v,.90)-.45)));c=mix(vec3(.57,.30,.20),vec3(.40,.55,.56),glass);c=mix(c,vec3(.24,.30,.29),ribs*glass*.8);return c;}
 if(k>5.5&&k<6.5){float tile=max(step(.9,fract(y/.24)),step(.95,fract(u/.27)));return mix(vec3(.59,.31,.22),vec3(.38,.23,.18),tile*.35);}
 if(k>7.5&&k<8.5)return vec3(.31,.30,.25);
 if(k>8.5&&k<9.5)return vec3(.52,.53,.46);
 if(k>9.5&&k<10.5){float joints=1.-smoothstep(.015,.045,abs(mod(u,.52)-.26));return mix(vec3(.39,.43,.43),vec3(.25,.29,.28),joints*.45);}
 if(k>10.5&&k<11.5){float axis=abs(normal.x)>abs(normal.z)?v:u;if(y>16.1){float o=1.-smoothstep(.41,.52,length(vec2(mod(axis+.9,1.8)-.9,y-17.1)));c=mix(c,stone,1.-smoothstep(.58,.68,length(vec2(mod(axis+.9,1.8)-.9,y-17.1))));return mix(c,vec3(.17,.22,.21),o);}return mh207Window(c,mod(axis+1.1,2.2)-1.1,y,14.5,.65,1.05);}
 if(k>12.5){return mh207Window(vec3(.32,.30,.24),mod(u+25.+4.15,8.3)-4.15,y,18.15,.85,.42);}
 if(k>11.5){float uc=u<0.?-28.:27.;float o=1.-smoothstep(.35,.46,length(vec2(u-uc,y-16.1)));return mix(c,vec3(.17,.22,.21),o);}
 if(k>6.5&&k<7.5){float a=mod(u+2.5,5.)-2.5;c=mix(cream,vec3(.27,.26,.21),step(y,7.25));return mh207Window(c,a,y,10.,.73,1.0);}
 float axis=k<.5?u:k<1.5?u:k<2.5?v:k<3.5?v:u;
 float pitch=k<.5?5.2:k<1.5?5.05:3.7;float a=mod(axis+pitch*.5,pitch)-pitch*.5;
 c=mix(c,stone,mh207B(vec2(0.,y-4.75),vec2(100.,.12)));c=mix(c,stone,mh207B(vec2(0.,y-10.0),vec2(100.,.085)));c=mix(c,stone,mh207B(vec2(0.,y-14.75),vec2(100.,.12)));
 // Each face has a specific facade role; circle stair has ocular rather than generic windows.
 if(k>4.5&&k<5.5){float o=1.-smoothstep(.40,.52,length(vec2(a,y-13.15)));c=mix(c,vec3(.20,.25,.21),o);if(y<11.)c=mh207Window(c,a,y,7.5,.62,1.0);return c;}
 if(k<1.5){float arc=mh207Arch(vec2(a,y),1.50,4.3);c=mix(c,stone,mh207Arch(vec2(a,y),1.72,4.52));c=mix(c,vec3(.12,.15,.12),arc);if(y<3.0)c=mix(c,vec3(.30,.31,.24),arc*(1.-smoothstep(.04,.07,abs(a))));}
 else {float ground=mh207Arch(vec2(a,y),1.1,3.1);c=mix(c,vec3(.17,.20,.17),ground);}
 if(k<.5){bool mural=abs(u+28.)<5.2||abs(u-27.)<5.2;if(mural&&y>5.1&&y<14.6){c=vec3(.52,.32,.24);float panel=mh207B(vec2(mod(u+2.6,5.2)-2.6,y-7.3),vec2(2.35,2.0));c=mix(c,vec3(.68,.58,.36),panel*.7);float q=mod(u+2.6,5.2)-2.6,head=1.-smoothstep(.28,.42,length(vec2(q-.45,y-8.5))),body=mh207B(vec2(q-.45,y-7.2),vec2(.5,1.0));c=mix(c,vec3(.57,.39,.22),max(head,body)*panel*.8);}c=mh207Window(c,a,y,7.3,1.05,1.65);c=mh207Window(c,a,y,12.1,1.05,1.35);}
 else {c=mh207Window(c,a,y,7.4,1.0,1.45);c=mh207Window(c,a,y,12.1,.87,1.0);}
 if(k<.5&&y>4.65&&y<5.25&&u>-32.2&&u<-23.8){float letters=mh207Text(vec2((u+32.2)/.21,(5.25-y)/.12));c=mix(c,vec3(.29,.36,.38),letters);}
 return c;}
`;
