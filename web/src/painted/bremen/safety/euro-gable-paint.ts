export const EURO_GABLE_GLSL=String.raw`float eg70Line(float x,float period,float halfWidth){float fw=max(fwidth(x),.001),d=abs(mod(x+period*.5,period)-period*.5);return mix(1.-smoothstep(halfWidth-fw*.5,halfWidth+fw*.5,d),clamp(2.*halfWidth/period,0.,1.),smoothstep(period*.16,period*.62,fw));}
float eg70Rect(vec2 p,vec2 centre,vec2 halfSize){vec2 aa=max(fwidth(p),vec2(.012));vec2 a=vec2(1.)-smoothstep(halfSize-aa,halfSize+aa,abs(p-centre));return a.x*a.y;}
vec3 eg70Brick(vec3 base,float u,float y){float course=floor(y/.083),unit=floor((u+mod(course,2.)*.125)/.25);float variation=fract(sin(unit*2.17+course*3.03)*917.23)-.5;float detail=1.-smoothstep(.045,.20,max(fwidth(u),fwidth(y)));vec3 col=base*(1.+variation*.10*detail);float mortar=max(eg70Line(y,.083,.003),eg70Line(u+mod(course,2.)*.125,.25,.003));return mix(col,vec3(.47,.40,.35),mortar*.28*detail);}
vec3 eg70Residential(vec3 base,vec3 q,vec3 normal,vec4 frame,float family,bool north,bool tower){
 float hall=north?6.37:5.99,eave=tower?(north?51.4:40.92):(north?23.77:20.19);
 float period=tower?(north?3.75:3.49):(north?3.48:3.55);
 vec2 tangent=normalize(vec2(normal.z+.00001,-normal.x+.00001));float u=dot(q.xz,tangent),harbor=step(.72,dot(normal.xz,vec2(-.774,.633)));float pitch=north?3.60:3.42;
 // Distinct local residential rhythm: broad brick piers, grouped pale casements and deep jambs.
 float bay=floor((u+(north?.46:1.12))/pitch),x=mod(u+(north?.46:1.12),pitch)-pitch*.5;
 vec3 brick=eg70Brick(base,u,q.y),col=brick;float row=floor((q.y-hall)/period),y=mod(q.y-hall,period);
 if(q.y>hall&&q.y<eave-.15){
  float outer=eg70Rect(vec2(x,y),vec2(0.,period*.48),vec2(north?1.17:1.12,period*.375));
  float glass=eg70Rect(vec2(x,y),vec2(0.,period*.48),vec2(north?1.06:1.01,period*.350));
  col=mix(col,vec3(.24,.235,.215),outer);float reveal=eg70Rect(vec2(x-.055,y-.025),vec2(0.,period*.48),vec2(north?1.10:1.05,period*.362));
  col=mix(col,vec3(.83,.85,.81),outer*reveal);vec3 pane=north?vec3(.31,.38,.40):vec3(.32,.39,.40);pane+=vec3(.028,.025,.020)*(fract(sin(bay*8.1+row*2.4)*71.7)-.5);
  col=mix(col,pane,glass);float bars=max(eg70Line(x+.36,.72,.028),eg70Line(y-period*.48,period,.022));
  col=mix(col,vec3(.84,.86,.82),bars*glass);float sill=eg70Rect(vec2(x,y),vec2(0.,period*.48-period*.375-.035),vec2(north?1.20:1.15,.055));col=mix(col,vec3(.65,.66,.60),sill);
  // Courtyard returns retain their own continuous common metre coordinates; no per-triangle restart.
  if(frame.w>1.5){float rail=eg70Line(y-.43,period,.035),pick=eg70Line(u,.16,.012);float band=smoothstep(.35,.40,y)*(1.-smoothstep(1.42,1.48,y));col=mix(col,vec3(.60,.62,.58),max(rail,pick*band)*.60);}
 }
 if(q.y<hall){
  float entryBay=mod(u+(north?1.8:.9),5.8)-2.9;float glass=eg70Rect(vec2(entryBay,q.y),vec2(0.,hall*.46),vec2(2.38,hall*.43));col=mix(col,vec3(.20,.265,.27),glass);
  float post=eg70Line(u+(north?1.8:.9),5.8,.22);col=mix(col,mix(base,vec3(.79,.78,.71),harbor),post);
  float transom=eg70Line(q.y-hall*.72,hall,.055)*glass;float mullion=eg70Line(entryBay,2.9,.033)*glass;col=mix(col,vec3(.58,.61,.59),max(transom,mullion));
  float plinth=1.-smoothstep(.23,.32,q.y);col=mix(col,vec3(.37,.35,.31),plinth);
 }
 // Real gable infill stays masonry; windows never migrate onto sloping roof triangles.
 col=mix(col,base*.79,eg70Line(q.y-hall,1000.,.075));return col;
}
vec3 eg70Zech(vec3 base,vec3 q,vec3 normal,bool tower){
 vec2 tangent=normalize(vec2(normal.z+.00001,-normal.x+.00001));float u=dot(q.xz,tangent),eave=tower?70.17:26.5,hall=5.9,period=tower?3.7806:4.12;
 vec3 col=eg70Brick(base,u,q.y);if(q.y>eave-.06){float seam=eg70Line(u,.62,.012);return mix(vec3(.43,.195,.16),vec3(.32,.145,.12),seam*.38);}
 if(q.y>=hall){
  float x=mod(u+.46,1.47)-.735,y=mod(q.y-hall,period),outer=eg70Rect(vec2(x,y),vec2(0.,period*.49),vec2(.588,period*.365));
  col=mix(col,vec3(.18,.20,.195),outer);float pane=eg70Rect(vec2(x,y),vec2(0.,period*.49),vec2(.535,period*.349));col=mix(col,vec3(.33,.42,.46),pane);
  float frame=eg70Line(x-.005,1.47,.018);col=mix(col,vec3(.72,.73,.70),frame*pane*.75);
  float lightEdge=eg70Line(y-period*.12,period,.035);col=mix(col,vec3(.64,.62,.56),lightEdge*.58);
 }else{
  // Photographed public market-hall level: grounded deep glazing and pale structural supports.
  col=mix(vec3(.19,.245,.25),col,eg70Line(u,6.2,.23));float column=eg70Line(u,6.2,.22);
  float branch=1.-smoothstep(.09,.18,abs(abs(mod(u+3.1,6.2)-3.1)-(q.y-3.1)*.34));branch*=smoothstep(3.1,3.3,q.y);
  col=mix(col,vec3(.83,.82,.75),max(column,branch));float mullion=eg70Line(u,1.55,.026)*(1.-column);col=mix(col,vec3(.56,.59,.56),mullion*.75);
  col=mix(col,vec3(.42,.39,.34),1.-smoothstep(.23,.32,q.y));
 }return col;
}

float egApertureRect(vec2 q,vec4 r){float d=max(max(r.x-q.x,q.x-r.y),max(r.z-q.y,q.y-r.w));return 1.-smoothstep(-.015,.015+max(fwidth(q.x),fwidth(q.y)),d);}
void egAperture(inout vec3 col,vec2 q,vec4 r,bool wide){float outer=egApertureRect(q,r+vec4(-.045,.045,-.045,.045));float glass=egApertureRect(q,r+vec4(.04,-.04,.04,-.04));col=mix(col,vec3(.72,.75,.73),outer);vec3 pane=mix(vec3(.24,.31,.33),vec3(.42,.47,.46),clamp((q.y-r.z)/(r.w-r.z),0.,1.));col=mix(col,pane,glass);if(wide){float width=r.y-r.x;float bars=max(eg70Line(q.x-r.x-width/3.,width*4.,.025),eg70Line(q.x-r.x-width*2./3.,width*4.,.025));col=mix(col,vec3(.75,.78,.75),bars*glass);}}
vec3 euroGableOpeningsPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family!=47110.&&family!=47111.)return base;vec3 q=frame.xyz;float u=q.x*0.633402231987+q.z*0.773822726801;vec2 s=vec2(u,q.y);
 bool zech=family==47110.;vec3 col=zech?eg70Zech(base,q,normal,true):eg70Residential(base,q,normal,frame,46021.,true,true);
 if(family==47110.){
  egAperture(col,s,vec4(8.380748018,9.300748018,70.940000000,72.480000000),false);
  egAperture(col,s,vec4(9.756251470,10.676251470,70.940000000,72.480000000),false);
  egAperture(col,s,vec4(10.902504347,11.822504347,70.940000000,72.480000000),false);
  egAperture(col,s,vec4(12.278007798,13.198007799,70.940000000,72.480000000),false);
  egAperture(col,s,vec4(13.653511250,14.573511250,70.940000000,72.480000000),false);
  egAperture(col,s,vec4(15.029014702,15.949014702,70.940000000,72.480000000),false);
 }
 if(family==47111.){
  if(u>=104.38&&u<=121.77&&q.y>=47.8&&q.y<=51.4){vec2 tangent=normalize(vec2(normal.z+.00001,-normal.x+.00001));col=eg70Brick(base,dot(q.xz,tangent),q.y);}
  egAperture(col,s,vec4(107.090880597,111.090880597,49.150000000,51.150000000),true);
  egAperture(col,s,vec4(112.755865672,116.755865672,49.150000000,51.150000000),true);
 }
 return col;
}
`;
