export const F115_VISIBLE_COURTYARD_GLSL=`
float m115rBox(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;return 1.-smoothstep(-.012,.012,max(d.x,d.y));}
vec3 m115rBrick(vec2 q){float row=floor(q.y/.072);float x=fract(q.x/.245+mod(row,2.)*.5),y=fract(q.y/.072);float joint=max(1.-smoothstep(.025,.065,min(x,1.-x)),1.-smoothstep(.04,.11,min(y,1.-y)));return mix(vec3(.46,.30,.22),vec3(.63,.55,.44),joint*.48);}
vec3 m115rPane(vec3 c,vec2 q,float x,float y,float w,float h,bool blind){c=mix(c,vec3(.19,.22,.21),m115rBox(q,vec2(x,y),vec2(w*.5+.065,h*.5+.065)));float m=m115rBox(q,vec2(x,y),vec2(w*.5,h*.5));c=mix(c,blind?vec3(.64,.60,.49):vec3(.24,.32,.32),m);c=mix(c,vec3(.23,.26,.24),m115rBox(q,vec2(x,y+h*.22),vec2(w*.5,.025))*m);return c;}
vec3 m115rGlassBay(vec3 c,vec2 q,float start,float width){float u=q.x-start;float x=width*.5;float glass=m115rBox(vec2(u,q.y),vec2(x,4.95),vec2(width*.5-.30,2.06));c=mix(c,vec3(.27,.34,.35),glass);for(int j=0;j<5;j++){float xx=.30+(width-.60)*float(j)/4.;c=mix(c,vec3(.59,.61,.57),m115rBox(vec2(u,q.y),vec2(xx,4.95),vec2(.035,2.08)));}for(int j=0;j<3;j++){float yy=j==0?2.91:(j==1?4.99:6.73);c=mix(c,vec3(.58,.60,.55),m115rBox(vec2(u,q.y),vec2(x,yy),vec2(x-.29,.035)));}c=mix(c,vec3(.64,.62,.55),m115rBox(vec2(u,q.y),vec2(x,2.78),vec2(x,.13)));for(int j=0;j<4;j++){float xx=(float(j)+.5)*width/4.;c=m115rPane(c,vec2(u,q.y),xx,1.33,width/4.-.38,1.77,false);}return c;}
vec3 m115rLegacy(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family!=4849.&&family!=4853.)return base;
 vec2 q=frame.xy;float u=q.x,v=q.y;vec3 c=m115rBrick(vec2(q.x,q.y*17./7.5));
 if(family==4849.){
  // North court: precisely ten observed upper shuttered windows; blank upperbrick retained.
  float pitch=frame.w/10.;for(int j=0;j<10;j++)c=m115rPane(c,q,(float(j)+.5)*pitch,4.46,pitch-.36,1.54,true);
  vec3 pale=vec3(.76,.72,.62);float left=1.55,right=frame.w-1.55,mid=frame.w*.5;
  c=mix(c,pale,m115rBox(q,vec2(mid,3.35),vec2((right-left)*.5,.23)));
  // Approximate planar circle/square/diamond motifs, not a sculptural reproduction of Mataré.
  for(int j=0;j<20;j++){float x=left+.60+float(j)*(right-left-1.2)/19.;float yy=3.35+(mod(float(j),2.)-.5)*.15;vec2 d=q-vec2(x,yy);float r=mod(float(j),3.);float mark=r<1.?(1.-smoothstep(.009,.022,abs(length(d)-.055))):(r<2.?(1.-smoothstep(.008,.021,abs(max(abs(d.x),abs(d.y))-.052))):(1.-smoothstep(.009,.023,abs(abs(d.x)+abs(d.y)-.075))));c=mix(c,vec3(.56,.54,.47),mark*.75);}
  float ground=m115rBox(q,vec2(mid,1.60),vec2((right-left)*.5,1.42));c=mix(c,vec3(.75,.77,.71),ground);
  // Two asymmetric glazed groups around the actual visible central support; no foreground furniture.
  float gwidth=mid-left-.25;for(int side=0;side<2;side++){float lo=side==0?left:mid+.25;float w=side==0?gwidth:right-lo;for(int j=0;j<4;j++){float t=j==0?0.:(j==1?(side==0?.24:.61):(j==2?(side==0?.78:.85):1.));c=mix(c,vec3(.24,.28,.26),m115rBox(q,vec2(lo+w*t,1.6),vec2(.028,1.42)));}}
  c=mix(c,vec3(.25,.29,.26),m115rBox(q,vec2(mid,1.25),vec2((right-left)*.5,.035))*ground);float curtain=step(.70,fract(u/.11))*ground;c=mix(c,vec3(.66,.69,.63),curtain*.13);
  c=mix(c,pale,m115rBox(q,vec2(mid,1.77),vec2(.25,1.57)));float incised=(1.-smoothstep(.015,.028,abs(mod(v+u*.9,.25)-.125)))*m115rBox(q,vec2(mid,1.77),vec2(.20,1.40));c=mix(c,vec3(.61,.59,.52),incised*.28);
  return c;
 }
 // Actual narrow source returns are brick piers; never borrow the adjacent room's windows.
 if(abs(normal.x)<.5)return c;
 if(normal.x>0.)return m115rGlassBay(c,q,0.,frame.w); // West Northmost glazed bay only.
 float lo=0.,hi=8.21269827,cols=2.;bool glazing=false;
 if(u>=8.90614404&&u<=17.35656130){lo=8.90614404;hi=17.35656130;cols=4.;glazing=true;}
 else if(u>=18.01723497&&u<=27.10466273){lo=18.01723497;hi=27.10466273;cols=3.;}
 else if(u>8.21269827)return c; // Two exact inset pier strips between source room fronts.
 if(glazing)return m115rGlassBay(c,q,lo,hi-lo);
 float width=hi-lo;vec3 band=vec3(.54,.53,.47);for(int j=0;j<2;j++){float y=j==0?2.56:4.92;c=mix(c,band,m115rBox(q,vec2((lo+hi)*.5,y),vec2(width*.5,.24)));}
 for(int j=0;j<3;j++){float y=j==0?1.25:(j==1?3.78:6.26);for(int k=0;k<3;k++){if(float(k)>=cols)continue;float x=lo+(float(k)+.5)*width/cols;c=m115rPane(c,q,x,y,width/cols-.45,1.60,false);}}
 return c;
}

vec3 makkVisibleCourtyard115(vec3 base,vec3 p,vec3 n,vec4 frame,float family){
 if(abs(family-6399.)>.25)return base;
 float role=floor(frame.z-1000.+.5);float u=frame.x,y=frame.y;
 if(role>2.5&&role<3.5){float d=abs(mod(u+.42,.84)-.42);float seam=1.-smoothstep(.012,max(.025,fwidth(u)),d);return mix(vec3(.47,.51,.49),vec3(.67,.70,.66),seam*.7);}
 vec3 brick=m115rBrick(vec2(u,y));
 if(role<.5||u<0.||u>frame.w||y<0.||y>=17.)return brick;
 float legacyFamily=role<1.5?4849.:4853.;
 return m115rLegacy(base,p,n,vec4(u,y*7.5/17.,7.5,frame.w),legacyFamily);
}
`;
