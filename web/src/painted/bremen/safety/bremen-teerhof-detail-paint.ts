export const TEERHOF_DETAIL_GLSL=String.raw`
float thdLine(float v,float w){return 1.-smoothstep(w,w+max(fwidth(v),.012),abs(v));}
float thdBox(vec2 q,vec2 centre,vec2 radius){vec2 aa=max(fwidth(q),vec2(.012));vec2 hit=1.-smoothstep(radius-aa,radius+aa,abs(q-centre));return hit.x*hit.y;}
vec3 thdBay(int k){return k==0?vec3(-19.06488202,2.36726093,16.10000000) : k==1?vec3(-11.96546553,2.74666068,16.10000000) : k==2?vec3(-4.31430818,2.91862788,16.10000000) : k==3?vec3(3.31740534,2.72621803,16.10000000) : k==4?vec3(10.91529157,3.01936985,16.10000000) : vec3(18.17732182,2.42519813,16.10000000);}
vec3 thdBrick(vec3 base,vec2 q){float row=floor(q.y/.095);float joint=max(thdLine(mod(q.x+mod(row,2.)*.135,.27)-.135,.005),thdLine(mod(q.y,.095)-.0475,.004));return base*(1.-joint*.14);}
vec3 thdWindow(vec3 c,vec2 q,vec2 at,vec2 size){float trim=thdBox(q,at,size+vec2(.065,.065));float glass=thdBox(q,at,size);c=mix(c,vec3(.80,.82,.76),trim);c=mix(c,vec3(.30,.40,.41),glass);float division=max(thdLine(q.x-at.x,.024),thdLine(q.y-at.y-.21,.018));return mix(c,vec3(.80,.82,.76),division*glass);}
vec3 teerhofDetailPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family<47299.5||family>47319.5)return base;
 float u=frame.x,y=frame.y;vec2 q=vec2(u,y);
 if(family==47304.)return vec3(.22,.25,.24);
 if(family==47303.)return vec3(.64,.63,.58)*(.88+.12*max(normal.y,0.));
 if(family==47306.)return vec3(.64,.69,.68)*(1.-thdLine(mod(u,.62)-.31,.009)*.10);
 if(family==47307.){float seam=max(thdLine(mod(u,.29)-.145,.012),thdLine(mod(y,.23)-.115,.009));return vec3(.65,.39,.28)*(1.-seam*.13);}
 if(family==47302.)return thdBrick(vec3(.51,.32,.265),q);
 if(family==47305.){
  vec3 bay=thdBay(int(frame.w+.1));float du=u-bay.x;float cap=16.1+1.5*sqrt(max(0.,1.-du*du/(bay.y*bay.y)));
  vec3 c=mix(vec3(.30,.43,.47),vec3(.59,.70,.71),smoothstep(15.7,17.55,y));
  float rim=max(thdLine(y-15.77,.055),max(thdLine(y-cap+.14,.055),thdLine(abs(du)-bay.y+.09,.035)));
  float mull=max(thdLine(du-bay.y*.33,.032),thdLine(du+bay.y*.33,.032));
  return mix(c,vec3(.79,.83,.80),max(rim,mull));
 }
 if(family==47301.){
  vec3 c=thdBrick(vec3(.42,.29,.25),q);for(int k=0;k<6;k++){vec3 bay=thdBay(k);for(int j=0;j<4;j++){float level=3.2+float(j)*3.15;c=thdWindow(c,q,vec2(bay.x,level+1.39),vec2(1.09,1.14));}}return c;
 }
 if(family==47300.){
  vec3 c=thdBrick(vec3(.62,.39,.31),q);
  // Windows occupy brick piers BETWEEN the six curved balcony recesses; no uniform French-rail grid.
  for(int k=0;k<5;k++){vec3 a=thdBay(k),b=thdBay(k+1);float station=(a.x+b.x)*.5;for(int j=0;j<5;j++){float level=float(j)*3.15;c=thdWindow(c,q,vec2(station,level+1.70),vec2(.65,.88));}}
  return c;
 }
 return base;
}
`;
