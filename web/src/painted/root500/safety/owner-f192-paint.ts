// Explicit native-face semantics for the old/new/Steib Staatsgalerie ensemble. Glass is an opaque reflection approximation.
export const OWNER_F192_PAINT_GLSL=String.raw`
float sg192box(vec2 q,vec2 lo,vec2 hi){return step(lo.x,q.x)*step(lo.y,q.y)*step(q.x,hi.x)*step(q.y,hi.y);}
vec3 staatsgalerieRecovery187(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6237.)>.25)return base;
 float k=floor(frame.w+.5),u=frame.x,y=frame.y,w=frame.z;
 vec3 stone=vec3(.76,.72,.60),glass=vec3(.19,.32,.36),green=vec3(.25,.49,.19);
 if(k==0.)return vec3(.39,.41,.39);
 if(k==3.||k==13.||k==41.){
  float m=max(step(.94,fract(u/1.15)),step(.95,fract(y/1.6)));
  return mix(vec3(.22,.35,.39)+.025*sin(u*.8+y*.9),vec3(.38,.43,.43),m);
 }
 if(k==4.)return green;
 if(k==5.)return vec3(.80,.28,.53);
 if(k==6.)return vec3(.13,.36,.55);
 if(k==7.)return vec3(.72,.11,.10);
 if(k==12.){float grid=max(step(.98,fract(u/1.7)),step(.98,fract(y/1.7)));return mix(vec3(.65,.65,.61),vec3(.54,.54,.51),grid);}
 if(k==11.)return vec3(.72,.65,.50);
 if(k==14.)return vec3(.79,.77,.69);
 if(k==21.){
  float edge=max(1.-step(.06,u),step(w-.06,u));float bar=max(edge,max(1.-step(2.65,y),max(1.-step(.05,abs(y-4.65)),1.-step(.05,abs(y-6.8)))));
  return mix(glass+.035*sin(u*.7+y),green,bar);
 }
 if(k==23.){
  float opening=sg192box(vec2(u,y),vec2(.45,2.65),vec2(w-.45,5.65));
  float mullion=1.-step(.055,abs(u-w*.5));return mix(vec3(.73,.11,.10),mix(glass,green,mullion),opening);
 }
 if(k==30.||k==31.||k==32.){
  vec3 col=vec3(.88,.86,.79);float count=clamp(floor(w/4.2),1.,18.),spacing=w/count;float bx=mod(u,spacing)-spacing*.5;
  float low=step(abs(bx),.76)*step(3.1,y)*step(y,8.1);float high=step(abs(bx),.76)*step(11.4,y)*step(y,16.4);
  if(w<2.9){low=0.;high=0.;}
  float trim=(step(abs(bx),.94)*max(sg192box(vec2(u,y),vec2(0.,2.95),vec2(w,8.28)),sg192box(vec2(u,y),vec2(0.,11.22),vec2(w,16.63))));
  col=mix(col,vec3(.73,.66,.51),trim);
  float hGlass=k==31.?0.:high;col=mix(col,glass,low+hGlass);
  if(k==31.)col=mix(col,vec3(.80,.77,.67),high);
  float lattice=step(abs(bx),.76)*max(1.-step(.035,abs(bx)),max(1.-step(.035,abs(mod(y-3.1,.9))),1.-step(.035,abs(mod(y-11.4,1.0)))));
  col=mix(col,vec3(.84,.83,.77),lattice*(low+hGlass));
  float bands=max(1.-step(.10,abs(y-9.7)),max(1.-step(.16,abs(y-18.)),1.-step(.16,abs(y-1.4))));
  return mix(col,vec3(.73,.67,.53),bands);
 }
 if(k==40.){
  vec3 col=vec3(.74,.72,.67);float top=step(14.,y)*step(y,17.85),mid=step(6.5,y)*step(y,7.8)*step(.3,fract(u/2.2));
  float bars=max(1.-step(.045,abs(mod(u,1.6))),1.-step(.045,abs(y-16.0)));
  return mix(col,mix(glass,vec3(.46,.47,.45),bars),max(top,mid));
 }
 if(k==22.){
  float count=clamp(floor(w/3.8),1.,12.),du=mod(u,w/count)-w/count*.5;
  float win=step(abs(du),.65)*step(4.,y)*step(y,13.)*step(.22,fract((y-3.4)/3.));
  return mix(vec3(.82,.80,.70),glass,win);
 }
 // Travertine courses and deliberately sparse gallery wall apertures; no universal all-floor window grid.
 float row=floor(y/.72),joint=max(step(.985,fract(y/.72)),step(.992,fract((u+mod(row,2.)*1.4)/2.8)));
 vec3 col=stone+vec3(.035,.028,.012)*sin(floor(u/2.8)*7.+row*3.);
 col=mix(col,vec3(.55,.53,.46),joint*.45);
 if(k==20.){
  float bx=mod(u,6.5)-3.25;float rise=clamp(u/94.,0.,1.)*2.3;float archTop=3.2+rise+sqrt(max(0.,1.45*1.45-bx*bx));
  float niche=step(abs(bx),1.45)*step(1.0+rise,y)*step(y,archTop);
  float ring=step(abs(bx),1.65)*step(0.8+rise,y)*step(y,archTop+.22);
  col=mix(col,vec3(.63,.59,.48),ring);col=mix(col,vec3(.13,.19,.18),niche);
  float oculus=step(length(vec2(bx,y-6.0-rise)),.24);col=mix(col,glass,oculus);
 }
 return col;
}
`;
