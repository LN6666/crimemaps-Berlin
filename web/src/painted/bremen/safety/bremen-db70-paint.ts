export const EDGE_DB70_GLSL=`
float db70Stroke(float d,float w){float a=max(fwidth(d),.014);return 1.-smoothstep(max(0.,w-a*.5),w+a*.5,abs(d));}
float db70Box(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.014));vec2 q=1.-smoothstep(h-a*.5,h+a*.5,abs(p-c));return q.x*q.y;}
float db70Arch(vec2 p,vec2 c,float hw,float stem,float rise){vec2 q=p-c;float h=stem+rise*sqrt(max(0.,1.-q.x*q.x/(hw*hw)));float d=max(abs(q.x)-hw,max(-q.y,q.y-h));return 1.-smoothstep(-max(fwidth(d),.014),max(fwidth(d),.014),d);}
float db70Repeat(float x,float pitch,float width){float a=max(fwidth(x)/pitch,.0001),h=width/pitch,d=abs(fract(x/pitch)-.5);return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h,0.,1.),smoothstep(.2,.7,a));}
vec3 db70Window(vec3 c,vec2 p,vec2 q,vec2 h,bool arch){vec3 stone=vec3(.56,.35,.29),frame=vec3(.27,.23,.20);float outer=arch?db70Arch(p,q-vec2(0.,h.y),h.x+.15,h.y*1.5,h.y*.5):db70Box(p,q,h+vec2(.14));float glass=arch?db70Arch(p,q-vec2(0.,h.y),h.x,h.y*1.5-.12,h.y*.5):db70Box(p,q,h);c=mix(c,stone,outer);vec2 d=p-q;float mull=max(db70Stroke(d.x,.034),db70Stroke(d.y-.30,.035));return mix(c,mix(vec3(.12,.19,.21),frame,mull),glass);}
vec3 paintedgeDb70(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family<46720.||family>46739.)return base;
 float u=f.x,y=f.y,W=41.1,x=(u-65.85)/W;vec2 uv=vec2(u,y);vec3 c=base;
 if(family==46721.)return c*(1.-.13*db70Repeat(u,.62,.018));
 if(family==46726.)return c*(1.-.07*db70Repeat(u,1.20,.012));
 if(family==46725.){float flute=db70Repeat(u,.115,.018)*step(8.5,y)*step(y,19.8);return c*(1.-.11*flute);}
 if(family==46728.||family==46739.)return c;
 if(family==46722.)return c*(1.-.07*max(db70Repeat(y,.42,.007),db70Repeat(u+floor(y/.42)*.62,1.24,.008)));
 if(family==46723.){
  vec3 trim=vec3(.57,.58,.54);c*=1.-db70Repeat(y,3.55,.095)*.16;
  for(int j=0;j<6;j++){float yy=3.9+float(j)*3.55;float centre=66.5+floor((u-66.5)/3.0)*3.0+1.5;c=db70Window(c,uv,vec2(centre,yy),vec2(1.04,1.12),false);}
  return c;
 }
 if(family==46724.)return c*(1.-.06*db70Repeat(y,3.55,.04));
 if(family!=46720.)return c;
 vec3 stone=vec3(.60,.39,.31);float rust=step(y,6.7)*max(db70Repeat(y,.44,.022),db70Repeat(u+floor(y/.44)*.63,1.26,.018));c*=1.-rust*.24;
 float bands=max(db70Stroke(y-6.8,.14),max(db70Stroke(y-13.0,.09),max(db70Stroke(y-19.9,.14),db70Stroke(y-20.8,.17))));c=mix(c,stone,bands*.92);
 // Nine photographed major axes; the central loggia remains a single broad opening between four columns.
 for(int k=0;k<9;k++){
  float z=k==0?.09:k==1?.20:k==2?.28:k==3?.36:k==4?.50:k==5?.64:k==6?.72:k==7?.80:.91;float q=65.85+W*z;
  c=db70Window(c,uv,vec2(q,3.05),vec2(k==4?1.45:.93,2.32),true);
  c=db70Window(c,uv,vec2(q,10.0),vec2(k==4?1.11:.91,1.75),false);
  c=db70Window(c,uv,vec2(q,16.25),vec2(k==4?1.18:.96,1.95),true);
  if(k==1||k==4||k==7){float d=y-12.35-1.0*(1.-abs(u-q)/1.35);float g=db70Stroke(d,.075)*db70Box(uv,vec2(q,12.85),vec2(1.40,.7));c=mix(c,stone,g);}
 }
 // The low glazed attic is a localized dark band under a shallow copper roof.
 float attic=db70Box(uv,vec2(86.4,21.30),vec2(W*.47,.37));c=mix(c,mix(vec3(.11,.18,.19),stone,db70Repeat(u,1.02,.065)),attic);
 float field=db70Box(uv,vec2(86.4,19.9),vec2(4.6,.37));c=mix(c,stone*.93,field*.65);
 return c;
}`;
