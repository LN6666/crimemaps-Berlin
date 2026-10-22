export const C359_FEATURE_GLSL=`
float c359box(vec2 p,vec2 halfSize){float d=max(abs(p.x)-halfSize.x,abs(p.y)-halfSize.y);return 1.-smoothstep(-.025,.04+fwidth(d),d);}
float c359arch(vec2 p,float w,float bottom,float spring){float d=max(abs(p.x)-w,max(bottom-p.y,p.y-spring));float rect=1.-smoothstep(-.025,.045+fwidth(d),d);float circle=1.-smoothstep(w-.035,w+.045+fwidth(p.y),length(vec2(p.x,p.y-spring)));return max(rect,circle*step(spring,p.y));}
vec3 c359window(vec3 stone,vec2 p,bool arched,float h){
 float outer=arched?c359arch(p,1.03,-h,h-.88):c359box(p,vec2(1.03,h));
 float inner=arched?c359arch(p,.78,-h+.18,h-.88):c359box(p,vec2(.78,h-.18));
 vec3 c=mix(stone,vec3(.63,.63,.57),outer);
 c=mix(c,vec3(.20,.27,.25),inner);
 float bars=c359box(vec2(p.x,p.y),vec2(.035,h))*inner;
 bars=max(bars,c359box(vec2(p.x,p.y-.05),vec2(.8,.035))*inner);
 return mix(c,vec3(.58,.60,.54),bars);
}
vec3 c359Academy(vec3 base,vec3 p,vec3 normal,vec4 frame){
 vec2 E=vec2(.95303347092,-.30286499188),N=vec2(.30286499188,.95303347092);
 vec2 q=vec2(dot(frame.xz,E),dot(frame.xz,N));float y=p.y;
 float en=dot(normal.xz,E),north=dot(normal.xz,N);
 vec3 stone=vec3(.79,.78,.70)+.006*sin(q.x*3.+y*2.);
 float bed=1.-smoothstep(.012,.03+fwidth(y),abs(mod(y+.25,.65)-.325));
 float vertical=1.-smoothstep(.014,.035+fwidth(q.x),abs(mod(q.x+step(.325,mod(y,.65))*.7,1.4)-.7));
 stone=mix(stone,vec3(.61,.61,.55),max(bed,vertical*.55)*.28*(1.-smoothstep(3.1,3.5,y)));
 bool pavilion=q.x>-18.2&&q.x<16.2;float b0=pavilion?4.4:3.5;float b1=pavilion?10.6:7.8;float b2=pavilion?16.6:11.9;
 float floorBand=max(1.-smoothstep(.07,.16,abs(y-b0)),max(1.-smoothstep(.06,.14,abs(y-b1)),1.-smoothstep(.06,.16,abs(y-b2))));
 stone=mix(stone,vec3(.88,.87,.78),floorBand*.7);
 bool south=north<-.98&&q.y<7.2;
 if(south){
  bool central=q.x>-17.6&&q.x<15.5&&q.y<0.;
  if(central){
   float local=mod(q.x+17.45,6.54)-3.27;
   if(y>4.8&&y<10.25)stone=c359window(stone,vec2(local,y-7.45),true,2.2);
   if(y>10.7&&y<16.7)stone=c359window(stone,vec2(local,y-13.6),true,2.3);
   // Grounded portal only, never window sills in the entry domain.
   if(y<3.45&&abs(q.x+1.05)<8.2){float doorway=c359arch(vec2(local,y-1.5),.95,-1.5,.25);stone=mix(stone,vec3(.17,.22,.20),doorway);}
  }else if(abs(q.x)<75.8&&q.y>5.5){
   float left=q.x<0.?-73.1:15.25;float length=q.x<0.?55.65:60.46;float count=q.x<0.?10.:11.;float pitch=length/count;float local=mod(q.x-left,pitch)-pitch*.5;
   if(y>.55&&y<3.4)stone=c359window(stone,vec2(local,y-1.85),true,1.15);
   if(y>4.&&y<7.65)stone=c359window(stone,vec2(local,y-5.85),true,1.45);
   if(y>9.9&&y<11.7)stone=c359window(stone,vec2(local,y-10.8),false,.38);
  }
 }
 // Photo-bound east return of the central pavilion: four upper rectangles,
 // a central arched middle opening, and separate lower rectangular openings.
 if(en>.98&&q.x>14.8&&q.x<16.&&q.y>-4.4&&q.y<6.9){
  if(y>12.&&y<16.7){float a=mod(q.y+4.29,2.76)-1.38;stone=c359window(stone,vec2(a,y-14.3),false,1.85);}
  if(y>5.&&y<10.3){for(int i=0;i<3;i++){float a=q.y-(-.5+float(i)*3.15);if(abs(a)<1.2)stone=c359window(stone,vec2(a,y-7.7),i==1,1.9);}}
  if(y>.6&&y<3.2){for(int i=0;i<3;i++){float a=q.y-(-.5+float(i)*3.15);if(abs(a)<1.2)stone=c359window(stone,vec2(a,y-1.8),false,1.05);}}
 }
 return stone;
}`;
