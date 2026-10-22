export const C340_FEATURE_GLSL=`bool c340FlatRegion0(vec2 p){bool h=false;
if(((p.y>-95.64014051)!=(p.y>-41.17151367))&&p.x<(-42.53637867)*(p.y-(-95.64014051))/(54.46862684)+(-26.63260250))h=!h;
if(((p.y>-41.17151367)!=(p.y>-65.45029461))&&p.x<(-31.40633583)*(p.y-(-41.17151367))/(-24.27878094)+(-69.16898117))h=!h;
if(((p.y>-65.45029461)!=(p.y>-76.22602132))&&p.x<(8.93078204)*(p.y-(-65.45029461))/(-10.77572671)+(-100.57531700))h=!h;
if(((p.y>-76.22602132)!=(p.y>-82.17048213))&&p.x<(-7.42250520)*(p.y-(-76.22602132))/(-5.94446081)+(-91.64453496))h=!h;
if(((p.y>-82.17048213)!=(p.y>-127.00997302))&&p.x<(34.69779709)*(p.y-(-82.17048213))/(-44.83949089)+(-99.06704016))h=!h;
if(((p.y>-127.00997302)!=(p.y>-104.81286656))&&p.x<(31.26516706)*(p.y-(-127.00997302))/(22.19710646)+(-64.36924307))h=!h;
if(((p.y>-104.81286656)!=(p.y>-102.30817801))&&p.x<(-1.89463346)*(p.y-(-104.81286656))/(2.50468854)+(-33.10407601))h=!h;
if(((p.y>-102.30817801)!=(p.y>-95.64014051))&&p.x<(8.36610697)*(p.y-(-102.30817801))/(6.66803750)+(-34.99870947))h=!h;
return h;}
bool c340FlatRegion1(vec2 p){bool h=false;
if(((p.y>-95.64014051)!=(p.y>-99.30255176))&&p.x<(2.86052503)*(p.y-(-95.64014051))/(-3.66241125)+(-26.63260250))h=!h;
if(((p.y>-99.30255176)!=(p.y>-102.74232403))&&p.x<(-4.43567128)*(p.y-(-99.30255176))/(-3.43977227)+(-23.77207747))h=!h;
if(((p.y>-102.74232403)!=(p.y>-111.26939702))&&p.x<(6.62750214)*(p.y-(-102.74232403))/(-8.52707299)+(-28.20774875))h=!h;
if(((p.y>-111.26939702)!=(p.y>-55.36474875))&&p.x<(71.84004285)*(p.y-(-111.26939702))/(55.90464828)+(-21.58024661))h=!h;
if(((p.y>-55.36474875)!=(p.y>-58.81565296))&&p.x<(2.61533717)*(p.y-(-55.36474875))/(-3.45090421)+(50.25979624))h=!h;
if(((p.y>-58.81565296)!=(p.y>-70.34835221))&&p.x<(-14.50323339)*(p.y-(-58.81565296))/(-11.53269925)+(52.87513341))h=!h;
if(((p.y>-70.34835221)!=(p.y>-79.94409231))&&p.x<(-12.23710317)*(p.y-(-70.34835221))/(-9.59574011)+(38.37190002))h=!h;
if(((p.y>-79.94409231)!=(p.y>-99.41387125))&&p.x<(-24.82341330)*(p.y-(-79.94409231))/(-19.46977894)+(26.13479685))h=!h;
if(((p.y>-99.41387125)!=(p.y>-103.95570648))&&p.x<(-5.78791947)*(p.y-(-99.41387125))/(-4.54183522)+(1.31138355))h=!h;
if(((p.y>-103.95570648)!=(p.y>-113.15069642))&&p.x<(-11.71700771)*(p.y-(-103.95570648))/(-9.19498994)+(-4.47653592))h=!h;
if(((p.y>-113.15069642)!=(p.y>-118.21573325))&&p.x<(-6.50862318)*(p.y-(-113.15069642))/(-5.06503683)+(-16.19354363))h=!h;
if(((p.y>-118.21573325)!=(p.y>-104.81286656))&&p.x<(-10.40190919)*(p.y-(-118.21573325))/(13.40286669)+(-22.70216681))h=!h;
if(((p.y>-104.81286656)!=(p.y>-102.30817801))&&p.x<(-1.89463346)*(p.y-(-104.81286656))/(2.50468854)+(-33.10407601))h=!h;
if(((p.y>-102.30817801)!=(p.y>-95.64014051))&&p.x<(8.36610697)*(p.y-(-102.30817801))/(6.66803750)+(-34.99870947))h=!h;
return h;}
vec3 c340ParentFlat(vec3 base,vec4 f){vec2 q=f.xz;if(c340FlatRegion0(q)||c340FlatRegion1(q))return vec3(.65,.66,.62);return base;}
float c340_dm700box(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.008));vec2 z=1.-smoothstep(h-a,h+a,abs(p-c));return z.x*z.y;}
float c340_dm700line(float x,float pitch,float hw){float a=max(fwidth(x),.006);float d=abs(mod(x+pitch*.5,pitch)-pitch*.5);return 1.-smoothstep(hw-a,hw+a,d);}
float c340_dm700disc(vec2 p,vec2 c,float r){float d=length(p-c);float a=max(fwidth(d),.009);return 1.-smoothstep(r-a,r+a,d);}
vec3 c340_deutschesMuseum2014RiverFull500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family<13520.75||family>13523.25)return base;
 vec2 q=vec2(frame.x,p.y);vec3 stone=vec3(.60,.59,.55);vec3 c=mix(stone,vec3(.47,.47,.44),max(c340_dm700line(q.y,1.28,.018),c340_dm700line(q.x+mod(floor(q.y/1.28),2.)*.80,1.60,.012))*.18);
 if(abs(family-13521.)<.25){
  // Reference2014 NW meteorological face, approximate surface placement, never an operating instrument.
  c=mix(c,vec3(.45,.46,.44),c340_dm700box(q,vec2(6.08,30.),vec2(3.58,20.4))*.24);
  c=mix(c,vec3(.70,.69,.64),c340_dm700box(q,vec2(6.08,51.2),vec2(5.60,.36)));
  c=mix(c,vec3(.49,.49,.45),c340_dm700box(q,vec2(6.08,58.9),vec2(5.80,.25)));
  for(int i=0;i<3;i++){float x=2.60+float(i)*3.48;
   c=mix(c,vec3(.75,.74,.68),c340_dm700box(q,vec2(x,55.2),vec2(1.18,3.13)));
   c=mix(c,vec3(.16,.18,.17),c340_dm700box(q,vec2(x,55.2),vec2(.87,2.90)));
   c=mix(c,vec3(.40,.41,.38),c340_dm700box(q,vec2(x,55.2),vec2(.055,2.90)));
   c=mix(c,vec3(.18,.20,.18),c340_dm700box(q,vec2(x,61.7),vec2(.86,.70)));
  }
  vec2 d=q-vec2(6.08,45.6);float r=length(d);float face=c340_dm700disc(q,vec2(6.08,45.6),2.25);
  c=mix(c,vec3(.74,.75,.70),c340_dm700disc(q,vec2(6.08,45.6),2.48));c=mix(c,vec3(.16,.29,.35),face);
  float tick=1.-smoothstep(.045,.11,abs(sin(atan(d.y,d.x)*12.)));tick*=step(1.87,r)*step(r,2.13);c=mix(c,vec3(.86,.85,.76),tick);
  // Fixed illustrative dial hands do not encode a measured historical pressure/time.
  float hand=c340_dm700box(d,vec2(0.,.65),vec2(.06,.76));hand=max(hand,c340_dm700box(d,vec2(.55,0.),vec2(.67,.06)));c=mix(c,vec3(.88,.85,.72),hand*face);c=mix(c,vec3(.88,.85,.72),c340_dm700disc(d,vec2(0.),.14));
  float gauge=c340_dm700box(q,vec2(6.08,29.7),vec2(.16,8.4));c=mix(c,vec3(.76,.77,.71),gauge);c=mix(c,vec3(.24,.27,.25),c340_dm700box(q,vec2(6.08,29.7),vec2(.045,8.4)));
  c=mix(c,vec3(.75,.75,.68),c340_dm700box(q,vec2(6.72,29.7),vec2(.25,8.4))*c340_dm700line(q.y,.80,.028));
 }else if(abs(family-13522.)<.25){
  // Only the photographed SW tower face; small dial/letter forms are not asserted.
  c=mix(c,vec3(.67,.65,.59),.18);c=mix(c,vec3(.16,.18,.16),c340_dm700box(q,vec2(4.70,55.4),vec2(.52,2.8)));c=mix(c,vec3(.17,.19,.17),c340_dm700box(q,vec2(7.10,55.4),vec2(.52,2.8)));
  c=mix(c,vec3(.47,.47,.43),c340_dm700box(q,vec2(5.90,51.2),vec2(5.8,.30)));
 }else{
  // Source edge11, long river wall only; repeating pitch is photo approximation, not a surveyed bay count.
  float u=mod(q.x+1.50,3.28)-1.64;vec2 w=vec2(u,q.y);
  c=mix(c,vec3(.72,.71,.65),c340_dm700box(w,vec2(0.,5.1),vec2(1.24,5.0))*.34);
  for(int j=0;j<3;j++){float y=j==0?2.0:(j==1?6.0:9.40);vec2 h=j==0?vec2(.77,1.30):(j==1?vec2(.72,1.28):vec2(.71,.60));
   float rim=c340_dm700box(w,vec2(0.,y),h+vec2(.12,.11));float glass=c340_dm700box(w,vec2(0.,y),h);
   c=mix(c,vec3(.80,.79,.71),rim);c=mix(c,vec3(.24,.29,.27),glass);
   c=mix(c,vec3(.76,.76,.68),glass*max(c340_dm700line(w.x,.51,.025),c340_dm700line(w.y-y,.63,.024)));
  }
  c=mix(c,vec3(.77,.76,.68),max(c340_dm700box(q,vec2(36.7,3.74),vec2(40.,.085)),c340_dm700box(q,vec2(36.7,8.04),vec2(40.,.085))));
  c=mix(c,vec3(.50,.50,.46),c340_dm700box(q,vec2(36.7,10.79),vec2(40.,.095)));
 }
 return c;
}
`;
