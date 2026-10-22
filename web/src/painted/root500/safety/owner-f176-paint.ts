export const OWNER_F176_PAINT_GLSL = `
float rd175Line(float x,float w){return 1.-smoothstep(w,w+max(fwidth(x),.012),abs(x));}
float rd175Box(vec2 q,vec2 h){vec2 aa=max(fwidth(q),vec2(.008)),m=1.-smoothstep(h-aa*.25,h+aa*.75,abs(q));return m.x*m.y;}
vec3 rd175Window(vec3 c,float dx,float y,float cy,float w,float h){vec3 trim=vec3(.58,.58,.51),pane=vec3(.20,.28,.29);float a=rd175Box(vec2(dx,y-cy),vec2(w+.10,h+.10)),b=rd175Box(vec2(dx,y-cy),vec2(w,h));c=mix(c,trim,a);c=mix(c,pane,b);return mix(c,vec3(.65,.67,.62),b*max(rd175Line(dx,.035),rd175Line(y-cy,.035))*.7);}
vec3 rathausDusseldorfRecovery175(vec3 base,vec3 p,vec3 normal,vec4 f,float family){float u=f.x,y=f.y,W=f.z,k=f.w;vec3 brick=vec3(.40,.29,.24),stone=vec3(.66,.65,.57);if(k<.5||k>6.5){float seam=max(rd175Line(mod(u,.35)-.175,.008),rd175Line(mod(y,.20)-.10,.008));vec3 c=mix(vec3(.27,.29,.28),vec3(.18,.20,.20),seam*.4);if(k>6.5){for(int i=0;i<5;i++)c=rd175Window(c,u-(float(i)+.5)*3.8,y,15.1,.52,.92);for(int i=0;i<6;i++)c=rd175Window(c,u-(float(i)+.5)*(19./6.),y,19.0,.40,.44);}return c;}if(k>5.5)return stone;
 float mortar=max(rd175Line(mod(y,.18)-.09,.009),rd175Line(mod(u+mod(floor(y/.18),2.)*.17,.34)-.17,.008));vec3 c=mix(brick,vec3(.61,.56,.47),mortar*.35);
 if(k>3.5&&k<4.5){c=vec3(.83,.80,.73);c=mix(c,vec3(.35,.37,.35),1.-step(1.1,y));float oriel=rd175Box(vec2(u-8.6,y-8.4),vec2(.60,2.2));c=mix(c,vec3(.77,.80,.76),oriel);c=mix(c,vec3(.24,.34,.35),rd175Box(vec2(u-8.6,y-8.4),vec2(.43,2.03)));return c;}
 if(k>2.5&&k<3.5){c=vec3(.84,.81,.74);c=mix(c,vec3(.39,.41,.39),1.-step(1.1,y));float dx=mod(u,19./7.)-19./14.;for(int j=0;j<3;j++)c=rd175Window(c,dx,y,2.65+float(j)*3.8,.63,1.05);return c;}
 if(k>4.5){return mix(c,stone,rd175Line(y-12.55,.12));}
 float dx=mod(u,3.8)-1.9;c=mix(c,stone,max(rd175Line(y-1.20,.09),max(rd175Line(y-5.05,.13),max(rd175Line(y-7.1,.09),rd175Line(y-10.25,.10)))));
 if(k<1.5){for(int i=0;i<5;i++){float x=(float(i)+.5)*3.8;c=rd175Window(c,u-x,y,8.25,.57,1.50);c=rd175Window(c,u-x,y,11.35,.57,.60);if(i!=2){c=rd175Window(c,u-x,y,3.05,.67,1.32);float pane=rd175Box(vec2(u-x,y-3.05),vec2(.67,1.32));c=mix(c,vec3(.12,.15,.15),pane*rd175Line(mod(u-x,.18)-.09,.020));}}float door=rd175Box(vec2(u-9.5,y-2.65),vec2(.92,1.60));c=mix(c,vec3(.16,.18,.17),door);c=mix(c,stone,rd175Box(vec2(u-9.5,y-4.45),vec2(1.35,.16)));}
 else{float xx=mod(u-19.,3.8)-1.9;for(int j=0;j<3;j++)c=rd175Window(c,xx,y,2.7+float(j)*3.7,.58,1.15);}
 return mix(c,stone,rd175Line(y-12.55,.12));}
`;
