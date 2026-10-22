export const C347_FEATURE_GLSL=`
float c347line(float x,float width){return 1.-smoothstep(width,width+max(fwidth(x),.015),abs(x));}
vec3 c347Hff(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family==13701.)return vec3(.42,.44,.42);
 if(family==13702.){
  if(frame.x>-68.9&&frame.x<-48.4&&frame.z>24.5&&frame.z<52.){
   float depth=clamp((52.-frame.z)/27.5,0.,1.);
   float stepLine=c347line(mod(frame.z-.25,.95)-.475,.045);
   return mix(mix(vec3(.80,.79,.71),vec3(.42,.43,.39),depth*.55),vec3(.35,.36,.32),stepLine*.55);
  }
  return vec3(.63,.69,.53);
 }
 if(family==13705.){
  vec3 stone=vec3(.73,.72,.65)+.008*sin(p.y*3.7);
  float joint=c347line(mod(p.y,.95)-.475,.015);
  stone=mix(stone,vec3(.62,.61,.54),joint*.35);
  if(dot(normalize(normal),normalize(vec3(.396933916,0.,.917847191)))>.98){
   if(frame.x>-60.2&&frame.x<-57.4&&p.y<2.7)return vec3(.075,.10,.095);
   if(p.y>=2.7&&p.y<8.3&&frame.x>-60.2&&frame.x<-60.2+(8.3-p.y)*.5)return vec3(.42,.43,.38);
  }
  return stone;
 }
 float grain=sin(p.y*6.2+sin(frame.x*.27))*.008+sin(frame.x*19.)*.004;
 vec3 concrete=vec3(.72,.70,.59)+grain;
 if(family!=13703.&&family!=13704.)return concrete;
 if(p.y<8.6){
  if(family==13704.)return concrete;
  float a=21.2;float b=51.3;
  if(frame.x<a||frame.x>b)return concrete;
  float side=c347line(frame.x-a,.60)+c347line(frame.x-b,.60);
  float soffit=smoothstep(7.7,8.6,p.y);
  float mull=c347line(mod(frame.x-a+1.5,3.)-1.5,.045);
  float trans=c347line(p.y-2.4,.05)+c347line(p.y-7.7,.06);
  vec3 entry=mix(vec3(.27,.38,.39),vec3(.48,.58,.56),smoothstep(0.,8.6,p.y));
  entry=mix(entry,vec3(.25,.29,.28),max(mull,clamp(trans,0.,1.)));
  if(p.y<2.35&&frame.x>42.1&&frame.x<47.6){
   float door=c347line(p.y-2.25,.06)+c347line(frame.x-42.2,.07)+c347line(frame.x-44.9,.05)+c347line(frame.x-47.5,.07);
   entry=mix(vec3(.18,.28,.28),vec3(.53,.56,.53),clamp(door,0.,1.));
  }
  return mix(entry,vec3(.42,.41,.35),clamp(max(side,soffit)*.8,0.,1.));
 }
 float u=frame.x+75.9;float y=p.y-8.6;
 float vert=c347line(mod(u+.625,1.25)-.625,.035);
 float tier=c347line(mod(y,2.97),.065);
 float trans=c347line(mod(y,2.97)-.48,.025);
 float inner=c347line(mod(u+1.25,2.5)-1.25,.018);
 vec3 glass=mix(vec3(.40,.49,.51),vec3(.62,.67,.66),.5+.5*sin(u*.18));
 glass=mix(glass,vec3(.71,.72,.69),inner*.35);
 return mix(glass,vec3(.30,.35,.35),max(vert,max(tier,trans)));
}`;
