import {c339MaterialFragment} from './c339-feature-glsl';
export const C338_FEATURE_GLSL=`
vec3 c338MaterialOnly(vec3 base,vec3 p,vec4 f,float family){float u=f.x,y=f.y;if(family==13497.){vec3 c=vec3(.77,.75,.68);float band=min(min(abs(y-4.03),abs(y-7.89)),abs(y-11.75));return c*(1.-(1.-smoothstep(.05,.12,band))*.045);}vec3 brick=vec3(.64,.43,.29),stone=vec3(.73,.70,.60),joint=vec3(.56,.43,.30);float row=floor(y/.105),m=max(1.-smoothstep(.01,.01+max(.012,fwidth(y)),abs(mod(y+.0525,.105)-.0525)),1.-smoothstep(.008,.008+max(.012,fwidth(u)),abs(mod(u+mod(row,2.)*.125+.125,.25)-.125)));vec3 c=mix(brick,joint,m*.35);if(y<4.04)c=stone;float band=min(min(abs(y-4.04),abs(y-8.33)),abs(y-11.74));return mix(c,stone,1.-smoothstep(.05,.11,band));}
float c338_bsbRect72(vec2 q,vec2 c,vec2 h){vec2 a=max(fwidth(q),vec2(.006));vec2 m=1.-smoothstep(h-a,h+a,abs(q-c));return m.x*m.y;}
float c338_bsbArch72(vec2 q,float x,float ru,float rv,float spring,float bottom){float a=max(fwidth(q.x),.006);float xx=abs(q.x-x);float top=spring+rv*sqrt(max(0.,1.-xx*xx/(ru*ru)));return(1.-smoothstep(ru-a,ru+a,xx))*smoothstep(bottom-.015,bottom+.015,q.y)*(1.-smoothstep(top-.015,top+.015,q.y));}
vec3 c338_bsbWindow72(vec3 c,vec2 q,float x,float bottom,float spring,float rv,float ru){vec3 stone=vec3(.71,.68,.56),glass=vec3(.13,.18,.18),brick=vec3(.59,.31,.20);float outside=c338_bsbArch72(q,x,ru+.23,rv+.16,spring,bottom-.10),inner=c338_bsbArch72(q,x,ru,rv,spring,bottom);c=mix(c,brick,outside);c=mix(c,stone,c338_bsbArch72(q,x,ru+.07,rv+.05,spring,bottom-.04));c=mix(c,glass,inner);c=mix(c,stone*.82,c338_bsbRect72(q,vec2(x,(bottom+spring)*.5),vec2(.032,(spring-bottom)*.5))*inner);for(int k=1;k<3;k++)c=mix(c,stone*.82,c338_bsbRect72(q,vec2(x,mix(bottom,spring,float(k)/3.)),vec2(ru,.022))*inner);c=mix(c,stone,c338_bsbRect72(q,vec2(x,bottom-.08),vec2(ru+.18,.07)));return c;}

vec3 c338_bsb106CourtWindow(vec3 c,vec2 q,float x,float bottom,float spring,float rise,float width){
vec3 trim=vec3(.73,.71,.64);float outer=c338_bsbArch72(q,x,width+.12,rise+.10,spring,bottom-.08),inner=c338_bsbArch72(q,x,width,rise,spring,bottom);
c=mix(c,trim,outer);c=mix(c,vec3(.16,.21,.21),inner);
float bars=c338_bsbRect72(q,vec2(x,(bottom+spring)*.5),vec2(.035,(spring-bottom)*.5));for(int j=1;j<4;j++)bars=max(bars,c338_bsbRect72(q,vec2(x,mix(bottom,spring,float(j)/4.)),vec2(width,.025)));
return mix(c,trim*.88,bars*inner);}
vec3 c338_bsb106Court(vec3 base,vec3 p,vec3 normal,vec4 frame){
vec2 q=frame.xy;if(q.y>12.08)return base;bool northCourt=frame.w>45.3;vec3 c=vec3(.77,.75,.68),trim=vec3(.72,.70,.63);
for(int i=0;i<3;i++)c=mix(c,trim,c338_bsbRect72(q,vec2(frame.w*.5,4.03+float(i)*3.86),vec2(frame.w*.5,.07)));
// Independent six actually visible northern upper openings in each source crop.
// Approximate photo phase only; no hypothetical hidden southern bays are admitted.
for(int i=0;i<6;i++){
float x=(.06+.12*float(i))*frame.w;
c=c338_bsb106CourtWindow(c,q,x,9.00,10.62,.50,.78);
if(i<(northCourt?3:4))c=c338_bsb106CourtWindow(c,q,x,4.55,7.22,.57,.96);
if(i<(northCourt?1:2))c=c338_bsb106CourtWindow(c,q,x,.90,2.18,.46,.75);
}return c;}

vec3 c338_bsb107Annex(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
if(family==13491.)return vec3(.25,.27,.28);
vec2 q=frame.xy;float y=q.y/10.;if(y>1.)return base;
vec3 glass=vec3(.12,.20,.25),aluminium=vec3(.64,.67,.66),c=glass;
// Photograph shows two large glazed zones and a narrow upper strip, not three equal window rows.
c=mix(c,vec3(.10,.15,.18),c338_bsbRect72(vec2(q.x,y),vec2(frame.w*.5,.055),vec2(frame.w*.5,.045)));
for(int i=0;i<4;i++){
float yy=i==0?.08:(i==1?.35:(i==2?.88:.985));
c=mix(c,aluminium,c338_bsbRect72(vec2(q.x,y),vec2(frame.w*.5,yy),vec2(frame.w*.5,.014)));
}
// Only the thirteen actually exposed eastern south-facade fins are registered.
if(dot(normal,vec3(-.301319745,0.,-.953523157))>.8){
for(int i=0;i<13;i++){
float x=float(i)*frame.w*.05;
c=mix(c,aluminium,c338_bsbRect72(q,vec2(x,5.05),vec2(.055,4.73)));
c=mix(c,vec3(.33,.40,.43),c338_bsbRect72(q,vec2(x+.11,5.05),vec2(.035,4.73)));
}
// Fine horizontal glazing transom is local to the upper large glazed zone.
c=mix(c,aluminium*.66,c338_bsbRect72(vec2(q.x,y),vec2(frame.w*.30,.63),vec2(frame.w*.30,.005)));
}
return c;}
vec3 c338_bayerischeStaatsbibliothekFull500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==13491.||family==13492.)return c338_bsb107Annex(base,p,normal,frame,family);if(family==13490.)return c338_bsb106Court(base,p,normal,frame);
 if(family!=13493.&&family!=13494.&&family!=13495.)return base;
 vec2 q=frame.xy;
 if(family==13495.){
  // Pixel-footprint filtered seams; no discontinuous per-tile sine hash in distant views.
  vec2 grid=q/vec2(.34,.22),pixel=max(fwidth(grid),vec2(.001));
  vec2 seam=1.-smoothstep(vec2(.025),vec2(.025)+pixel,abs(fract(grid)-.5));
  float detail=1.-smoothstep(.25,.65,max(pixel.x,pixel.y));
  vec3 red=mix(vec3(.50,.19,.105),vec3(.32,.12,.075),max(seam.x,seam.y)*.25*detail);
  vec2 aa=max(fwidth(q),vec2(.025));vec2 inside=smoothstep(vec2(66.938478349,18.450943456)-aa,vec2(66.938478349,18.450943456)+aa,q)*(1.-smoothstep(vec2(85.313655004,59.571128334)-aa,vec2(85.313655004,59.571128334)+aa,q));
  return mix(red,vec3(.22,.26,.27),inside.x*inside.y);
 }
 // Native gabled South wall rises above the photograph's eave. Do not paint its extra gable triangles as brick or manufacture a hip.
 if(q.y>12.08)return base;
 vec3 brick=vec3(.64,.43,.29),mortar=vec3(.56,.43,.30),stone=vec3(.73,.70,.60),joint=vec3(.57,.55,.47);float row=floor(q.y/.105);float bm=max(step(.94,fract(q.y/.105)),step(.955,fract((q.x+mod(row,2.)*.125)/.25)));vec3 c=mix(brick,mortar,bm*.55);
 float stoneBand=1.-smoothstep(3.98,4.04,q.y);float quoin=0.;
 if(family==13493.)quoin=max(1.-step(1.45,q.x),step(frame.w-1.45,q.x));
 else{
  quoin=max(1.-step(1.45,q.x),step(76.5,q.x));
  quoin=max(quoin,1.-smoothstep(1.0,1.1,abs(q.x-18.73)));quoin=max(quoin,1.-smoothstep(1.0,1.1,abs(q.x-59.36)));
  // Two original small return faces are stone rustication, not repeated window fronts.
  if(dot(normal,vec3(-.301319745,0.,-.953523157))<.8)quoin=1.;
 }
 float sr=floor(q.y/.32);float seam=max(step(.945,fract(q.y/.32)),step(.97,fract((q.x+mod(sr,2.)*.50)/1.0)));c=mix(c,mix(stone,joint,seam*.65),max(stoneBand,quoin));
 for(int k=0;k<3;k++){float y=k==0?4.04:(k==1?8.33:11.74);c=mix(c,stone,c338_bsbRect72(q,vec2(frame.w*.5,y),vec2(frame.w*.5,.075)));c=mix(c,joint,c338_bsbRect72(q,vec2(frame.w*.5,y-.10),vec2(frame.w*.5,.025)));}
 if(family==13493.){
  for(int j=0;j<25;j++){
   float x=(float(j)+.5)*frame.w/25.;c=c338_bsbWindow72(c,q,x,4.55,7.22,.57,1.08);c=c338_bsbWindow72(c,q,x,9.00,10.62,.50,.91);
   if(j>=11&&j<=13){float outer=c338_bsbArch72(q,x,1.30,.77,2.65,.05),inner=c338_bsbArch72(q,x,1.05,.63,2.65,.08);c=mix(c,stone*.92,outer);c=mix(c,vec3(.12,.15,.145),inner);}
   else {float outer=c338_bsbArch72(q,x,.80,.56,2.18,.85),inner=c338_bsbArch72(q,x,.62,.46,2.18,.90);c=mix(c,stone*.90,outer);c=mix(c,vec3(.14,.18,.17),inner);c=mix(c,stone*.80,c338_bsbRect72(q,vec2(x,1.60),vec2(.026,.65))*inner);}
  }
 }else if(dot(normal,vec3(-.301319745,0.,-.953523157))>.8){
  // South sequence3 +7 +3; middle seven include the partially occluded near-corner arch, never restart at the source4/5 seam.
  for(int j=0;j<13;j++){float x=j<3?(float(j)+.5)*18.727904/3.:(j<10?18.733105+(float(j-3)+.5)*(59.361529-18.733105)/7.:59.353160+(float(j-10)+.5)*(77.929540-59.353160)/3.);c=c338_bsbWindow72(c,q,x,4.55,7.22,.57,1.08);c=c338_bsbWindow72(c,q,x,9.00,10.62,.50,.91);}
  // South ground openings are hidden by trees/independent foreground structure; keep only supported stone courses, no copied window count.
 }
 float bracket=c338_bsbRect72(vec2(mod(q.x,.62),q.y),vec2(.31,11.42),vec2(.08,.16));c=mix(c,joint,bracket*.65);c=mix(c,stone*1.03,c338_bsbRect72(q,vec2(frame.w*.5,12.00),vec2(frame.w*.5,.045)));return c;
}
`;
export function c338MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C338 dispatcher drift');return c339MaterialFragment(source.replace(anchor,C338_FEATURE_GLSL+'\n'+anchor+'if(family==13499.)return normal.y>.4?vec3(.55,.58,.58):vec3(.42,.47,.49);if(family==13496.||family==13497.)return c338MaterialOnly(base,p,frame,family);if(family>=13490.&&family<=13495.)return c338_bayerischeStaatsbibliothekFull500(base,p,normal,frame,family);'),city);}
