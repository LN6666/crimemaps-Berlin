export const SCHOOL70_GLSL=/*glsl*/`
float sf70Line(float x,float h){float a=max(fwidth(x),.01);return 1.-smoothstep(max(0.,h-a*.5),h+a*.5,abs(x));}
float sf70Rep(float x,float p,float h){float a=max(fwidth(x),.0001),d=abs(mod(x+p*.5,p)-p*.5);return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h/p,0.,1.),smoothstep(p*.18,p*.65,a));}
float sf70Box(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.012)),m=1.-smoothstep(h-a*.5,h+a*.5,abs(p-c));return m.x*m.y;}
vec3 school70Paint(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family<46181.5||family>46188.5)return base;float u=f.x,v=f.y,y=p.y;vec3 c=base;
 if(family==46187.)return c;
 if(family==46184.){float close=1.-smoothstep(.2,.55,max(fwidth(u),fwidth(v)));float tiles=max(sf70Rep(u,.33,.011),sf70Rep(v,.30,.011));return c*(1.-tiles*.08*close);}
 float brick=max(sf70Rep(y,.09,.005),sf70Rep(u+floor(y/.09)*.12,.24,.005));c*=1.-brick*.08;
 if(family==46188.)return c;
 if(family==46185.){float q=mod(u+1.35,2.70)-1.35;float pane=sf70Box(vec2(q,y),vec2(0.,20.35),vec2(.88,.76));c=mix(vec3(.74,.75,.72),vec3(.22,.28,.29),pane);c=mix(c,vec3(.79,.80,.77),sf70Line(q,.036)*pane);return c;}
 if(family==46182.){
  // Three brick classroom storeys above the dark polished stone ground storey, with separate white-framed casements.
  float q=mod(u+1.48,2.96)-1.48;
  for(int row=0;row<3;row++){float cy=7.0+float(row)*4.5;float trim=sf70Box(vec2(q,y),vec2(0.,cy),vec2(1.12,1.45));float pane=sf70Box(vec2(q,y),vec2(0.,cy),vec2(.96,1.30));c=mix(c,vec3(.84,.84,.78),trim);c=mix(c,vec3(.29,.35,.35),pane);c=mix(c,vec3(.82,.83,.77),pane*sf70Line(q-.30,.035));float sill=sf70Box(vec2(q,y),vec2(0.,cy-1.5),vec2(1.22,.06));c=mix(c,vec3(.73,.74,.68),sill);}
  if(y<4.35){c=vec3(.22,.255,.23);float stone=max(sf70Rep(y,.69,.009),sf70Rep(u,1.32,.009));c*=1.-stone*.10;float glass=sf70Box(vec2(q,y),vec2(0.,2.1),vec2(1.12,1.45));c=mix(c,vec3(.36,.41,.40),glass);float post=sf70Rep(u,2.96,.20);c=mix(c,vec3(.75,.76,.70),post*.75);}
  return c;
 }
 // Photographed end is a broad solid brick field, with only small horizontal ribbon openings.
 for(int row=0;row<3;row++){float cy=7.0+float(row)*4.5,q=mod(v+2.1,4.2)-2.1;float trim=sf70Box(vec2(q,y),vec2(0.,cy),vec2(1.24,.35));float pane=sf70Box(vec2(q,y),vec2(0.,cy),vec2(1.10,.23));c=mix(c,vec3(.83,.83,.77),trim);c=mix(c,vec3(.24,.29,.28),pane);}
 if(y<4.35)c=vec3(.22,.255,.23);return c;
}
`;
