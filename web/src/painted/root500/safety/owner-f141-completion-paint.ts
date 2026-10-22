export const F141_COMPLETION_GLSL=String.raw`float kd141lineFrozen6417(float x,float at,float w){return 1.-smoothstep(w,w+.03,abs(x-at));}
float kd141boxFrozen6417(vec2 p,vec2 at,vec2 sz){vec2 a=1.-smoothstep(sz,sz+vec2(.03),abs(p-at));return a.x*a.y;}
float kd141ellFrozen6417(vec2 p,vec2 at,vec2 rad){return 1.-smoothstep(.97,1.03,length((p-at)/rad));}
float kd141pointFrozen6417(vec2 p,float x,float lo,float spring,float w,float rise){float d=abs(p.x-x);float top=spring+rise*sqrt(max(0.,1.-d/w));return(1.-smoothstep(w,w+.035,d))*smoothstep(lo-.035,lo,p.y)*(1.-smoothstep(top,top+.035,p.y));}
vec3 kaiserdomFrankfurtSouthwestFull500Frozen6417(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 red=vec3(.51,.31,.23),lit=vec3(.69,.47,.32),joint=vec3(.31,.24,.20),dark=vec3(.105,.13,.12);vec2 q=vec2(frame.x,p.y);vec3 c=red;
 if(family==4707.){
  // Exactoriginalslateroofplanes and duplicatednative ridge-turret appearance; no roofgeometryadded.
  vec2 s=frame.xy;float row=floor(s.y/.25);vec2 uv=vec2(fract((s.x+mod(row,2.)*.15)/.30),fract(s.y/.25));float seam=max(1.-smoothstep(.025,.075,min(uv.x,1.-uv.x)),1.-smoothstep(.035,.11,min(uv.y,1.-uv.y)));float n=fract(sin(dot(floor(vec2(s.x/.30,row)),vec2(16.7,71.3)))*4771.31);return mix(vec3(.27,.29,.28)+vec3(.065)*n,vec3(.16,.19,.18),seam*.55);
 }
 if(family==4705.&&p.y<12.)return base;if(family==4706.&&frame.z<40.&&p.y<20.)return base;
 float row=floor(p.y/.30);vec2 uv=vec2(fract((q.x+mod(row,2.)*.30)/.60),fract(p.y/.30));float seam=max(1.-smoothstep(.025,.075,min(uv.x,1.-uv.x)),1.-smoothstep(.035,.11,min(uv.y,1.-uv.y)));float n=fract(sin(dot(floor(vec2(q.x/.60,row)),vec2(19.3,51.7)))*1713.71);c=red+vec3(.10,.07,.045)*n;c=mix(c,joint,seam*.50);
 if(family==4705.){
  if(normal.z>-.65||frame.w<2.8)return c; // Shortbuttressfacets/Westreturns plainknownstone; no inventedwindow registration.
  float pitch=7.30;float x=mod(q.x,pitch)-pitch*.5;float outArch=kd141pointFrozen6417(vec2(x,p.y),0.,12.1,19.3,1.40,2.15);float win=kd141pointFrozen6417(vec2(x,p.y),0.,12.3,19.3,1.11,1.85);c=mix(c,lit,outArch);c=mix(c,dark,win);float lead=max(kd141lineFrozen6417(mod(x,.37),.185,.024),kd141lineFrozen6417(mod(p.y,.61),.305,.019));c=mix(c,vec3(.43,.42,.32),lead*win);float tracery=kd141ellFrozen6417(vec2(x,p.y),vec2(0.,19.2),vec2(.62,1.0))-kd141ellFrozen6417(vec2(x,p.y),vec2(0.,19.2),vec2(.49,.83));c=mix(c,lit,max(0.,tracery)*win);
  float buttress=kd141boxFrozen6417(vec2(x,p.y),vec2(pitch*.47,17.2),vec2(.22,5.0));c=mix(c,lit,buttress);c=mix(c,joint,kd141lineFrozen6417(x,pitch*.43,.035)*buttress);c=mix(c,lit,kd141lineFrozen6417(p.y,22.6,.11));c=mix(c,joint,kd141lineFrozen6417(p.y,22.40,.045));return c;
 }
 if(frame.z>80.){
  // Nativeclosedstonecupola/spire: opaqueGothicsurfaceapproximation, not a piercedsilhouette or addedpinnacles.
  vec2 g=frame.xy;float a=atan(g.y,g.x);float ang=mod(a+.5235988,1.0471976)-.5235988;float rib=1.-smoothstep(.022,.065,abs(ang));c=mix(c,lit,rib*.7);if(p.y<72.){float recess=kd141pointFrozen6417(vec2(ang*5.,p.y),0.,65.35,69.3,.42,1.2);c=mix(c,dark,recess*.8);c=mix(c,lit,kd141lineFrozen6417(p.y,71.40,.13));}else if(p.y<82.){float op=kd141pointFrozen6417(vec2(ang*1.45,p.y),0.,73.2,79.0,.33,1.20);c=mix(c,lit,kd141pointFrozen6417(vec2(ang*1.45,p.y),0.,73.05,79.0,.43,1.37));c=mix(c,dark,op);c=mix(c,lit,op*kd141lineFrozen6417(ang,0.,.025));c=mix(c,lit,kd141lineFrozen6417(p.y,81.65,.13));}else{float ridge=1.-smoothstep(.05,.12,abs(ang));c=mix(c,lit,ridge*.65);c=mix(c,joint,kd141lineFrozen6417(mod(p.y,.57),.285,.025)*.50);}return c;
 }
 if(normal.y>.5)return c; // Source016explicitstoneroof at38m; source761flat65mcap isunboundunknown.
 if(frame.z<40.){
  float outer=kd141pointFrozen6417(q,0.,21.0,32.8,frame.w*.22,3.4);float inner=kd141pointFrozen6417(q,0.,21.2,32.8,frame.w*.195,3.1);c=mix(c,lit,outer);c=mix(c,dark,inner);for(int i=0;i<3;i++){float x=(float(i)-1.)*frame.w*.115;float slit=kd141pointFrozen6417(q,x,21.3,31.1,frame.w*.044,1.55);c=mix(c,vec3(.27,.29,.24),slit);c=mix(c,lit,kd141lineFrozen6417(q.x,x+frame.w*.045,.04)*inner);}float arch=kd141ellFrozen6417(q,vec2(0.,33.4),vec2(frame.w*.11,1.18))-kd141ellFrozen6417(q,vec2(0.,33.4),vec2(frame.w*.086,.96));c=mix(c,lit,max(0.,arch)*inner);c=mix(c,lit,kd141lineFrozen6417(abs(q.x),frame.w*.45,.16));c=mix(c,lit,kd141lineFrozen6417(p.y,37.62,.13));return c;
 }
 // Octagonalupperstage: talllancets, verticalribs and onlythe photographedWest/Southgoldclockfaces.
 float ow=frame.w*.34;float outArch=kd141pointFrozen6417(q,0.,40.0,59.1,ow,3.0);float win=kd141pointFrozen6417(q,0.,40.2,59.1,ow-.15,2.73);c=mix(c,lit,outArch);c=mix(c,dark,win);for(int i=0;i<3;i++){float x=(float(i)-1.)*frame.w*.16;c=mix(c,lit,kd141lineFrozen6417(q.x,x,.045)*win);}c=mix(c,joint,win*kd141lineFrozen6417(mod(p.y,.46),.23,.025));c=mix(c,lit,kd141lineFrozen6417(abs(q.x),frame.w*.46,.11));c=mix(c,lit,kd141lineFrozen6417(p.y,64.35,.13));
 if(abs(normal.x)>.90||abs(normal.z)>.90){vec2 d=vec2(q.x,p.y-58.1);float rad=length(d);float dial=1.-smoothstep(1.68,1.73,rad);vec3 gold=vec3(.83,.73,.44);c=mix(c,vec3(.16,.23,.19),dial);c=mix(c,gold,kd141lineFrozen6417(rad,1.66,.075));float a=atan(d.y,d.x);float tick=1.-smoothstep(.045,.07,abs(mod(a+.2617994,.5235988)-.2617994));c=mix(c,gold,tick*step(1.30,rad)*(1.-step(1.57,rad)));float h1=kd141lineFrozen6417(d.x*.83-d.y*.55,0.,.045)*step(0.,d.x*.55+d.y*.83)*(1.-step(1.20,rad));float h2=kd141lineFrozen6417(d.x*.64-d.y*.77,0.,.065)*step(0.,-d.x*.77-d.y*.64)*(1.-step(.91,rad));c=mix(c,gold,max(h1,h2));c=mix(c,gold,1.-smoothstep(.10,.14,rad));}
 return c;
}

float k141line(float x,float c,float w){float aa=max(.015,fwidth(x));return 1.-smoothstep(w,w+aa,abs(x-c));}
float k141point(vec2 p,float low,float spring,float halfWidth,float rise){float x=abs(p.x),aa=max(.025,fwidth(p.x));float top=spring+rise*sqrt(max(0.,1.-x/halfWidth));return(1.-smoothstep(halfWidth,halfWidth+aa,x))*smoothstep(low-.03,low,p.y)*(1.-smoothstep(top,top+max(.03,fwidth(p.y)),p.y));}
vec3 k141stone(vec2 q){vec2 unit=vec2(.62,.30),fw=max(fwidth(q),vec2(.015));float row=floor(q.y/unit.y);vec2 uv=fract((q+vec2(mod(row,2.)*.31,0.))/unit);vec2 d=min(uv,1.-uv)*unit;float seam=max(1.-smoothstep(.012,.012+fw.x,d.x),1.-smoothstep(.012,.012+fw.y,d.y));float noise=fract(sin(dot(floor((q+vec2(mod(row,2.)*.31,0.))/unit),vec2(13.71,51.23)))*17237.19);vec3 c=vec3(.55,.335,.245)+vec3(.055,.035,.025)*noise;return mix(c,vec3(.36,.255,.205),seam*.30);}
vec3 k141window(vec3 c,vec2 q,float low,float spring,float width,float rise){float outer=k141point(q,low-.14,spring,width+.14,rise+.17);float win=k141point(q,low,spring,width,rise);vec3 stone=vec3(.68,.465,.325);c=mix(c,stone,outer);c=mix(c,vec3(.105,.14,.135),win);float mull=max(k141line(q.x,0.,.045),max(k141line(q.x,-width*.45,.032),k141line(q.x,width*.45,.032)));float lead=k141line(mod(q.y,.61),.305,.018);c=mix(c,stone,max(mull,lead*.35)*win);vec2 rose=vec2(q.x,q.y-spring);float ring=1.-smoothstep(.045,.045+max(.015,fwidth(length(rose))),abs(length(rose/vec2(max(.2,width*.55),.78))-1.));c=mix(c,stone,ring*win);return c;}
vec3 kaiserdomWhole141(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 // Frozen actual037 drawing is delegated verbatim on every previously-painted
 // branch. Only its explicit return-base domains receive the new stone layer.
 if(family==4707.)return kaiserdomFrankfurtSouthwestFull500Frozen6417(base,p,normal,frame,family);
 if(family==4705.&&p.y>=12.)return kaiserdomFrankfurtSouthwestFull500Frozen6417(base,p,normal,frame,family);
 if(family==4706.&&(frame.z>=40.||p.y>=20.))return kaiserdomFrankfurtSouthwestFull500Frozen6417(base,p,normal,frame,family);
 vec2 q=vec2(frame.x,p.y);vec3 c=k141stone(q);vec3 trim=vec3(.68,.465,.325);
 if(family==4705.||family==4706.)return c;
 float role=floor(frame.z+.5);
 if(role==1001.){vec2 uv=frame.xy;float row=floor(uv.y/.26);vec2 d=min(fract((uv+vec2(mod(row,2.)*.17,0.))/vec2(.34,.26)),1.-fract((uv+vec2(mod(row,2.)*.17,0.))/vec2(.34,.26)))*vec2(.34,.26);vec2 aa=max(fwidth(uv),vec2(.015));float seam=max(1.-smoothstep(.01,.01+aa.x,d.x),1.-smoothstep(.01,.01+aa.y,d.y));return mix(vec3(.265,.29,.28),vec3(.19,.22,.215),seam*.35);}
 if(role==1002.)return vec3(.35,.365,.35)+vec3(.015)*sin(frame.x*.31)*sin(frame.y*.19);
 if(role==1010.||role==1011.||role==1016.||role==1000.)return c;
 if(role==1021.){float grain=sin(q.x*37.+sin(q.y*2.3))*.012;vec3 wood=vec3(.18,.115,.075)+grain;wood=mix(wood,vec3(.075,.065,.05),k141line(q.x,0.,.025));float board=k141line(mod(q.x,.32),.16,.013);wood=mix(wood,vec3(.09,.065,.045),board*.4);float strap=k141line(q.y,1.0,.055)+k141line(q.y,2.7,.055);return mix(wood,vec3(.12,.13,.115),clamp(strap,0.,1.));}
 if(role==1004.)return c; // Lowest base partly occluded in tower photo; no invented second arch/window beneath preserved21m lancet.
 if(role==1022.){c=k141window(c,q,21.2,32.8,frame.w*.195,3.1);return mix(c,trim,max(k141line(abs(q.x),frame.w*.45,.16),k141line(p.y,37.62,.13)));}
 if(role==1023.){c=k141window(c,q,40.2,59.1,max(.3,frame.w*.34-.15),2.73);c=mix(c,trim,k141line(abs(q.x),frame.w*.46,.11));return mix(c,trim,k141line(p.y,64.35,.13));}
 if(role==1024.){float a=atan(frame.y,frame.x),ang=mod(a+.3926991,.7853982)-.3926991;c=mix(c,trim,(1.-smoothstep(.025,.07,abs(ang)))*.45);if(p.y<72.){float blind=k141point(vec2(ang*5.,p.y),65.35,69.3,.42,1.2);c=mix(c,vec3(.20,.18,.15),blind*.5);}return c;}
 if(role==1005.){c=k141window(c,q,8.0,18.9,3.2,3.1);return mix(c,trim,k141line(p.y,22.6,.12));}
 if(role==1006.)return mix(c,trim,k141line(p.y,22.6,.12));
 if(role==1003.){
  if(normal.y>.4)return c;
  // Parent apse facets carry a single tall lancet; native long walls use the
  // church's established7.3m bay pitch. Narrow buttress returns stay stone.
  if(frame.w>2.0&&frame.w<13.)return k141window(c,q,6.6,18.7,min(1.30,frame.w*.27),2.3);
  if(frame.w>=13.||frame.w<1.01){vec2 bay=vec2(mod(q.x+3.65,7.30)-3.65,p.y);c=k141window(c,bay,7.0,19.3,1.25,2.0);}return mix(c,trim,k141line(p.y,22.6,.10));
 }
 if(role==1007.){vec2 bay=vec2(mod(q.x+3.65,7.30)-3.65,p.y);return k141window(c,bay,6.5,18.7,1.1,2.1);}
 if(role==1008.||role==1009.){if(normal.y<.5&&frame.w>2.4)c=k141window(c,q,2.3,7.0,min(1.0,frame.w*.25),1.65);if(role==1008.&&frame.w>4.){float pane=k141point(vec2(q.x,p.y-7.),1.1,2.5,.65,.65);c=mix(c,vec3(.13,.16,.15),pane);}return c;}
 if(role==1019.)return c; // DOP lowflatSW chapels: no unsupported hidden windows.
 if(role==1020.)return c; // Real pointed porch holes/leaves are separate geometry.
 return c;
}
`;
