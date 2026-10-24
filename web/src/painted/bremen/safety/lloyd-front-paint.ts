export const LLOYD_FRONT_GLSL=`
float lf14Line(float d,float w){float a=max(fwidth(d),.006);return 1.-smoothstep(max(0.,w-a*.5),w+a*.5,abs(d));}
float lf14Box(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.008));vec2 q=1.-smoothstep(h-a*.5,h+a*.5,abs(p-c));return q.x*q.y;}
float lf14Repeat(float x,float pitch,float w){float a=max(fwidth(x)/pitch,.00001),d=abs(fract(x/pitch)-.5),h=w/pitch;return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h,0.,1.),smoothstep(.2,.7,a));}
float lf14Segment(vec2 p,vec2 a,vec2 b,float w){vec2 v=b-a;float t=clamp(dot(p-a,v)/dot(v,v),0.,1.);return lf14Line(length(p-a-v*t),w);}
vec3 lf14Casement(vec3 c,vec2 p,float x){vec2 ctr=vec2(x,6.05),halfSize=vec2(.69,1.55);float rim=lf14Box(p,ctr,halfSize+vec2(.105)),glass=lf14Box(p,ctr,halfSize);vec2 q=p-ctr;float bars=max(lf14Line(q.x,.035),max(lf14Line(abs(q.x)-.35,.025),max(lf14Line(q.y-.50,.032),max(lf14Line(q.y+.50,.024),lf14Line(q.y+1.02,.022)))));vec3 white=vec3(.83,.84,.77);c=mix(c,white*.82,rim);c=mix(c,mix(vec3(.17,.245,.25),white,bars),glass);return mix(c,white*.87,lf14Box(p,ctr-vec2(0.,1.67),vec2(.88,.055)));}
vec3 lloydFrontFinalPaint(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 vec2 uv=f.xy;float x=uv.x,y=uv.y;vec3 c=base;
 if(family==47509.){vec2 roof=vec2(dot(p.xz,vec2(.619722916,.784820685)),dot(p.xz,vec2(-.784820685,.619722916)));float rows=lf14Repeat(roof.y,.24,.008),joints=lf14Repeat(roof.x+floor(roof.y/.24)*.14,.28,.007);return c*(1.-.09*max(rows,joints));}
 if(family==47507.){float seams=lf14Repeat(x,.80,.016);return c*(1.-seams*.11);}
 if(family==47506.){
  if(y<20.5){float seam=max(lf14Repeat(x,.82,.015),lf14Line(y-19.55,.025));return vec3(.31,.48,.41)*(1.-seam*.13);}
  float panes=lf14Repeat(x,1.15,.055),bands=max(lf14Line(y-20.65,.085),lf14Line(y-23.20,.09));return mix(vec3(.16,.20,.19),vec3(.40,.42,.37),max(panes,bands));
 }
 if(family==47508.)return c;
 if(family==47501.){float seam=lf14Repeat(x,.75,.014);return c*(1.-seam*.075);}
 if(family==47502.){float flutes=lf14Line(sin(atan(normal.x,normal.z)*10.)*.05,.009);return c*(1.-.065*flutes);}
 if(family==47504.)return c*(.96+.04*clamp(normal.y+.5,0.,1.));
 if(family==47503.){
  vec3 gold=vec3(.73,.66,.37),olive=vec3(.35,.39,.33);vec2 q=vec2(x/.68,(y-12.88)/1.08);float width=q.y<-.25?max(.02,(q.y+1.)/.75):sqrt(max(.04,1.-pow((max(q.y,.35)-.35)/.70,2.)));float sd=max(abs(q.x)-width,max(-1.-q.y,q.y-1.));float field=1.-smoothstep(-.025,.025,sd);c=mix(c,olive,field);
  float ring=lf14Line(sd*.68,.045);float twist=.83+.17*sin(atan(q.y,q.x)*44.);c=mix(c,gold*twist,ring);
  float key=lf14Segment(uv,vec2(-.36,13.53),vec2(.42,12.77),.045);key=max(key,lf14Line(length(uv-vec2(.42,12.77))-.115,.037));key=max(key,lf14Box(uv,vec2(-.36,13.53),vec2(.13,.09)));
  float anchor=lf14Segment(uv,vec2(.35,13.52),vec2(-.25,12.60),.046);anchor=max(anchor,lf14Line(length(uv-vec2(.35,13.52))-.105,.035));vec2 aq=uv-vec2(-.25,12.68);float bow=lf14Line(length(aq)-.35,.045)*step(aq.y,.02);anchor=max(anchor,bow);anchor=max(anchor,lf14Segment(uv,vec2(-.58,12.63),vec2(-.66,12.81),.035));anchor=max(anchor,lf14Segment(uv,vec2(.07,12.63),vec2(.13,12.81),.035));return mix(c,gold,max(key,anchor)*field);
 }
 if(family==47500.){
  float row=lf14Repeat(y,.078,.004),joint=lf14Repeat(x+floor(y/.078)*.12,.24,.004);c*=1.-.11*max(row,joint);vec3 stone=vec3(.62,.57,.46),white=vec3(.83,.84,.77);
  float string=max(lf14Line(y-4.25,.08),max(lf14Line(y-8.95,.10),max(lf14Line(y-9.42,.11),lf14Line(y-10.05,.10))));c=mix(c,stone,string);
  for(int i=0;i<3;i++){float z=(float(i)-1.)*4.27;c=lf14Casement(c,uv,z);float head=0.;if(i==1){vec2 q=uv-vec2(z,7.90);head=lf14Line(length(vec2(q.x,q.y*1.65))-.96,.055)*step(7.90,y)*step(y,8.65);}else head=lf14Line(y-(8.72-abs(x-z)*.50),.055)*step(abs(x-z),1.04)*step(8.14,y);c=mix(c,stone,head);c=mix(c,stone,lf14Box(uv,vec2(z,8.08),vec2(1.03,.055)));}
  // The ground-reaching entrance is separate from the three upper casements.
  float door=lf14Box(uv,vec2(0.,1.63),vec2(1.20,1.63)),jamb=max(lf14Line(abs(x)-1.16,.065),lf14Line(y-3.21,.065));c=mix(c,mix(vec3(.16,.13,.095),vec3(.39,.32,.23),jamb),door);
  for(int k=0;k<2;k++){float z=k==0?-4.60:4.60;float glass=lf14Box(uv,vec2(z,1.94),vec2(.78,1.24)),rim=lf14Box(uv,vec2(z,1.94),vec2(.86,1.32));float bars=max(lf14Line(x-z,.032),max(lf14Line(y-1.53,.025),lf14Line(y-2.34,.025)));c=mix(c,white*.83,rim);c=mix(c,mix(vec3(.17,.245,.25),white,bars),glass);}
  return c;
 }
 return c;
}`;
