export const BREMEN_GLOCKE_DETAIL_GLSL=String.raw`
float bgdLine(float x,float w){return 1.-smoothstep(w,w+max(fwidth(x),.013),abs(x));}
float bgdRect(float s,float y,float hw,float lo,float hi){float d=max(abs(s)-hw,max(lo-y,y-hi));return 1.-smoothstep(-.025,.025+max(fwidth(s),fwidth(y)),d);}
vec3 bgdBrick(float s,float y){float row=floor(y/.085),v=s+mod(row,2.)*.13;float mortar=max(bgdLine(mod(v,.255)-.1275,.005),bgdLine(mod(y,.085)-.0425,.004));vec3 c=vec3(.37,.245,.215)+vec3(.018,.010,.009)*sin(floor(v/.255)*2.31+row*1.63);return c*(1.-mortar*.20);}
void bgdWindow(inout vec3 c,float s,float y,float hw,float lo,float hi,float panes){float mask=bgdRect(s,y,hw,lo,hi),d=max(abs(s)-hw,max(lo-y,y-hi));vec3 glass=mix(vec3(.16,.255,.23),vec3(.39,.46,.40),clamp((y-lo)/max(hi-lo,.1),0.,1.));float curtain=step(hw*.73,abs(s));glass=mix(glass,vec3(.50,.51,.39),curtain*.28);c=mix(c,glass,mask);float reveal=1.-smoothstep(.04,.14+max(fwidth(s),fwidth(y)),abs(d));c=mix(c,vec3(.69,.63,.49),reveal);float edge=1.-smoothstep(.015,.055+max(fwidth(s),fwidth(y)),abs(d+.035));c=mix(c,vec3(.87,.85,.75),edge);float bars=bgdLine(s,.032);if(panes>.5)bars=max(bars,bgdLine(y-(lo+hi)*.5,.029));if(panes>1.5)bars=max(bars,max(bgdLine(y-mix(lo,hi,.34),.027),bgdLine(y-mix(lo,hi,.67),.027)));c=mix(c,vec3(.86,.845,.74),bars*mask);}
float bgdArch(float s,float y,float radius,float springY,float baseY){float d=max(abs(s)-radius,max(baseY-y,y-springY));if(y>springY)d=max(length(vec2(s,y-springY))-radius,baseY-y);return 1.-smoothstep(-.025,.025+max(fwidth(s),fwidth(y)),d);}
vec3 bremenGlockeDetailPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float s=frame.x,y=frame.y;vec3 c=base;
 if(family==46906.){
  vec2 slope=normal.xz;float horizontalLength=length(slope);vec2 ridgeAxis=horizontalLength>.025?vec2(-slope.y,slope.x)/horizontalLength:vec2(.991113,-.133015);
  float seamCoordinate=dot(p.xz,ridgeAxis),pixelSpan=max(abs(dFdx(seamCoordinate)),abs(dFdy(seamCoordinate)));
  float seamDistance=abs(mod(seamCoordinate+.30,.60)-.30);float seam=1.-smoothstep(.010,.010+max(pixelSpan,.003),seamDistance);
  float resolved=1.-smoothstep(.15,.30,pixelSpan);return vec3(.43,.60,.52)*(1.-.055*seam*resolved);
 }
 if(family==46908.)return vec3(.38,.40,.37)*(1.-max(bgdLine(mod(s,.29)-.145,.01),bgdLine(mod(y,.22)-.11,.01))*.13);
 if(family==46904.){float streak=.5+.5*sin(s*8.3+y*3.1);return mix(vec3(.63,.56,.41),vec3(.77,.70,.54),streak*.35);}
 if(family==46907.)return vec3(.65,.61,.51);
 c=bgdBrick(s,y);if(y<.62)c=vec3(.61,.58,.48);
 if(family==46900.){
  float pitch=3.594,cell=floor((s-5.77)/pitch),q=mod(s-5.77,pitch)-pitch*.5;
  if(s>=5.77&&s<=23.74){
   if(y<4.5){float entry=bgdArch(q,y,1.18,2.42,0.0);float surround=bgdArch(q,y,1.32,2.42,0.0)-entry;c=mix(c,vec3(.69,.62,.48),surround*.85);c=mix(c,vec3(.09,.12,.105),entry);if(y<2.35){float doors=max(bgdLine(q,.04),bgdLine(y-2.25,.05));c=mix(c,vec3(.30,.30,.245),doors*entry);}return c;}
   if(y<10.45){float stone=bgdRect(q,y,.69,5.15,9.38);c=mix(c,vec3(.67,.61,.48),stone);bgdWindow(c,q,y,.58,5.18,6.34,1.);bgdWindow(c,q,y,.58,8.12,9.35,1.);return c;}
   bgdWindow(c,q,y,.62,11.12,14.34,2.);bgdWindow(c,q,y,.62,14.72,16.43,1.);
   float ped=1.-smoothstep(.04,.11+fwidth(s),abs(y-(17.50-abs(q)*1.12)));ped*=step(abs(q),.91)*step(16.48,y);c=mix(c,vec3(.70,.63,.48),ped);
   float topY=cell<.5||cell>3.5?20.60:cell>1.5&&cell<2.5?27.635:24.10;
   float edge=max(bgdLine(abs(q)-1.55,.055),bgdLine(y-topY+.26,.065));c=mix(c,vec3(.60,.52,.37),edge*step(10.7,y));
   if(y>17.65&&y<topY-.55){float local=mod(y-17.65,2.40),peak=1.94-abs(q)*1.22;float chevron=bgdLine(local-peak,.055)*step(abs(q),1.17);float twin=bgdLine(local-peak-.18,.027)*step(abs(q),1.27);c=mix(c,vec3(.235,.17,.145),chevron);c=mix(c,vec3(.49,.34,.26),twin);}
   if(cell>1.5&&cell<2.5){bgdWindow(c,q,y,.20,23.38,24.20,0.);float slit=bgdArch(q,y,.20,26.0,25.17);c=mix(c,vec3(.16,.19,.16),slit);}
  }else if(y<10.0){float q=mod(s-1.1,3.8)-1.9;bgdWindow(c,q,y,.25,1.4,3.8,2.);bgdWindow(c,q,y,.25,6.1,8.5,2.);}
  return c;
 }
 if(family==46901.){
  if(s<-20.0){float q=s+21.0;float door=bgdArch(q,y,.76,2.5,.0);return mix(c,vec3(.105,.14,.12),door);}
  float q=mod(s+20.6,3.4)-1.7;bgdWindow(c,q,y,.58,.95,2.22,1.);bgdWindow(c,q,y,.58,6.45,8.00,1.);bgdWindow(c,q,y,.58,8.32,9.78,1.);
  float strip=max(bgdLine(q-.95,.047),bgdLine(q+.95,.047))*step(2.4,y)*step(y,6.25);c=mix(c,vec3(.62,.53,.40),strip);float diamond=abs(q)+abs((y-4.97)*.52)-.19;float medal=bgdLine(diamond,.026)*step(4.4,y)*step(y,5.5);return mix(c,vec3(.71,.64,.50),medal);
 }
 if(family==46902.){
  c=vec3(.68,.61,.46);float q=mod(s+2.1,1.4)-.7;bgdWindow(c,q,y,.58,.76,3.22,1.);bgdWindow(c,q,y,.58,6.13,9.43,2.);float panel=bgdRect(q,y,.60,3.55,5.87);c=mix(c,vec3(.60,.55,.43),panel*.25);float medallion=1.-smoothstep(.17,.25,length(vec2(q,(y-4.75)*.82)));c=mix(c,vec3(.45,.43,.34),medallion*.45);float seam=max(bgdLine(mod(s+2.1,1.4),.037),bgdLine(y-5.98,.09));return mix(c,vec3(.78,.71,.56),seam);
 }
 if(family==46903.){
  if(abs(s)<2.0){float q=mod(s+2.1,1.4)-.7;bgdWindow(c,q,y,.51,12.34,14.48,1.);float ped=bgdLine(y-(15.10-abs(q)*1.0),.045)*step(abs(q),.59)*step(14.5,y);c=mix(c,vec3(.73,.68,.54),ped);}
  if(abs(s)<.26)bgdWindow(c,s,y,.22,17.14,18.26,0.);return c;
 }
 return c;
}
`;
