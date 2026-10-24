export const europahafenkopf70OwnerPaintGLSL=/*glsl*/`
float ehk70Line(float x,float period,float halfWidth){float fw=max(fwidth(x),.001),d=abs(mod(x+period*.5,period)-period*.5);return mix(1.-smoothstep(halfWidth-fw*.5,halfWidth+fw*.5,d),clamp(2.*halfWidth/period,0.,1.),smoothstep(period*.16,period*.62,fw));}
float ehk70Rect(vec2 p,vec2 centre,vec2 halfSize){vec2 aa=max(fwidth(p),vec2(.012));vec2 a=vec2(1.)-smoothstep(halfSize-aa,halfSize+aa,abs(p-centre));return a.x*a.y;}
vec3 ehk70Brick(vec3 base,float u,float y){float course=floor(y/.083),unit=floor((u+mod(course,2.)*.125)/.25);float variation=fract(sin(unit*2.17+course*3.03)*917.23)-.5;float detail=1.-smoothstep(.045,.20,max(fwidth(u),fwidth(y)));vec3 col=base*(1.+variation*.10*detail);float mortar=max(ehk70Line(y,.083,.003),ehk70Line(u+mod(course,2.)*.125,.25,.003));return mix(col,vec3(.47,.40,.35),mortar*.28*detail);}
vec3 ehk70Residential(vec3 base,vec3 q,vec3 normal,vec4 frame,float family,bool north,bool tower){
 float hall=north?6.37:5.99,eave=tower?(north?51.4:40.92):(north?23.77:20.19);
 float period=tower?(north?3.75:3.49):(north?3.48:3.55);
 vec2 tangent=normalize(vec2(normal.z+.00001,-normal.x+.00001));float u=dot(q.xz,tangent),harbor=step(.72,dot(normal.xz,vec2(-.774,.633)));float pitch=north?3.60:3.42;
 // Distinct local residential rhythm: broad brick piers, grouped pale casements and deep jambs.
 float bay=floor((u+(north?.46:1.12))/pitch),x=mod(u+(north?.46:1.12),pitch)-pitch*.5;
 vec3 brick=ehk70Brick(base,u,q.y),col=brick;float row=floor((q.y-hall)/period),y=mod(q.y-hall,period);
 if(q.y>hall&&q.y<eave-.15){
  float outer=ehk70Rect(vec2(x,y),vec2(0.,period*.48),vec2(north?1.17:1.12,period*.375));
  float glass=ehk70Rect(vec2(x,y),vec2(0.,period*.48),vec2(north?1.06:1.01,period*.350));
  col=mix(col,vec3(.24,.235,.215),outer);float reveal=ehk70Rect(vec2(x-.055,y-.025),vec2(0.,period*.48),vec2(north?1.10:1.05,period*.362));
  col=mix(col,vec3(.83,.85,.81),outer*reveal);vec3 pane=north?vec3(.31,.38,.40):vec3(.32,.39,.40);pane+=vec3(.028,.025,.020)*(fract(sin(bay*8.1+row*2.4)*71.7)-.5);
  col=mix(col,pane,glass);float bars=max(ehk70Line(x+.36,.72,.028),ehk70Line(y-period*.48,period,.022));
  col=mix(col,vec3(.84,.86,.82),bars*glass);float sill=ehk70Rect(vec2(x,y),vec2(0.,period*.48-period*.375-.035),vec2(north?1.20:1.15,.055));col=mix(col,vec3(.65,.66,.60),sill);
  // Courtyard returns retain their own continuous common metre coordinates; no per-triangle restart.
  if(frame.w>1.5){float rail=ehk70Line(y-.43,period,.035),pick=ehk70Line(u,.16,.012);float band=smoothstep(.35,.40,y)*(1.-smoothstep(1.42,1.48,y));col=mix(col,vec3(.60,.62,.58),max(rail,pick*band)*.60);}
 }
 if(q.y<hall){
  float entryBay=mod(u+(north?1.8:.9),5.8)-2.9;float glass=ehk70Rect(vec2(entryBay,q.y),vec2(0.,hall*.46),vec2(2.38,hall*.43));col=mix(col,vec3(.20,.265,.27),glass);
  float post=ehk70Line(u+(north?1.8:.9),5.8,.22);col=mix(col,mix(base,vec3(.79,.78,.71),harbor),post);
  float transom=ehk70Line(q.y-hall*.72,hall,.055)*glass;float mullion=ehk70Line(entryBay,2.9,.033)*glass;col=mix(col,vec3(.58,.61,.59),max(transom,mullion));
  float plinth=1.-smoothstep(.23,.32,q.y);col=mix(col,vec3(.37,.35,.31),plinth);
 }
 // Real gable infill stays masonry; windows never migrate onto sloping roof triangles.
 col=mix(col,base*.79,ehk70Line(q.y-hall,1000.,.075));return col;
}
vec3 ehk70Zech(vec3 base,vec3 q,vec3 normal,bool tower){
 vec2 tangent=normalize(vec2(normal.z+.00001,-normal.x+.00001));float u=dot(q.xz,tangent),eave=tower?70.17:26.5,hall=5.9,period=tower?3.7806:4.12;
 vec3 col=ehk70Brick(base,u,q.y);if(q.y>eave-.06){float seam=ehk70Line(u,.62,.012);return mix(vec3(.43,.195,.16),vec3(.32,.145,.12),seam*.38);}
 if(q.y>=hall){
  float x=mod(u+.46,1.47)-.735,y=mod(q.y-hall,period),outer=ehk70Rect(vec2(x,y),vec2(0.,period*.49),vec2(.588,period*.365));
  col=mix(col,vec3(.18,.20,.195),outer);float pane=ehk70Rect(vec2(x,y),vec2(0.,period*.49),vec2(.535,period*.349));col=mix(col,vec3(.33,.42,.46),pane);
  float frame=ehk70Line(x-.005,1.47,.018);col=mix(col,vec3(.72,.73,.70),frame*pane*.75);
  float lightEdge=ehk70Line(y-period*.12,period,.035);col=mix(col,vec3(.64,.62,.56),lightEdge*.58);
 }else{
  // Photographed public market-hall level: grounded deep glazing and pale structural supports.
  col=mix(vec3(.19,.245,.25),col,ehk70Line(u,6.2,.23));float column=ehk70Line(u,6.2,.22);
  float branch=1.-smoothstep(.09,.18,abs(abs(mod(u+3.1,6.2)-3.1)-(q.y-3.1)*.34));branch*=smoothstep(3.1,3.3,q.y);
  col=mix(col,vec3(.83,.82,.75),max(column,branch));float mullion=ehk70Line(u,1.55,.026)*(1.-column);col=mix(col,vec3(.56,.59,.56),mullion*.75);
  col=mix(col,vec3(.42,.39,.34),1.-smoothstep(.23,.32,q.y));
 }return col;
}
vec3 europahafenkopf70Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 bool south=family>=45999.5&&family<=46004.5,zech=family>=46009.5&&family<=46014.5,north=family>=46019.5&&family<=46024.5;if(!south&&!zech&&!north)return base;
 vec3 q=frame.xyz;float root=south?46000.:zech?46010.:46020.,role=family-root;
 // Roof normals are a second independent barrier: facade window code cannot execute on roof planes.
 if(role<1.5&&abs(normal.y)>.18)return south?vec3(.40,.19,.15):zech?vec3(.40,.19,.15):vec3(.25,.15,.12);
 if(role>3.5){float joints=max(ehk70Line(q.x*.633+q.z*.774,2.4,.012),ehk70Line(q.x*-.774+q.z*.633,2.4,.012));return mix(base,base*.92,joints*.24);}
 if(role>2.5)return base;
 if(role>1.5){
  // Actual LoD2 roof planes and ridge topology; calm red standing-seam surfaces without triangle colour patches.
  float seam=ehk70Line(dot(q.xz,vec2(-.774,.633)),zech?.62:.58,.010);float close=1.-smoothstep(.16,.46,fwidth(dot(q.xz,vec2(-.774,.633))));
  vec3 col=mix(base,base*.78,seam*.34*close);return col;
 }
 return zech?ehk70Zech(base,q,normal,role>.5):ehk70Residential(base,q,normal,frame,family,north,role>.5);
}
`;
