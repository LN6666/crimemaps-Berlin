/** Städel main river frontage: source-face fields, owner-authorized photo approximation. */
export const OWNER_F135_PAINT_GLSL=`
// Opening primitives are defined later in the shared native fragment; explicit prototypes preserve its established order.
float foRect(vec2 q,vec2 h);
vec3 foRectCasement(vec3 wall,vec2 local,vec2 halfSize,float variant);
vec3 foHallArch(vec3 wall,vec2 q,vec2 h,float heavy);
vec3 foOrderColumn(vec3 wall,vec2 q,float halfHeight,float radius,float foliate);
vec3 foEntranceArcade(vec3 wall,vec2 q,vec2 h,float doorLeaf);
vec3 ownerF135Paint(vec3 base,vec4 frame){
 vec2 uv=frame.xy;float kind=frame.w;vec3 c=base;
 if(kind>11.5){
  // Four finite rooflight strips registered to the native long wing; no geometry change.
  float strip=0.;for(int i=0;i<4;i++)strip=max(strip,foRect(uv-vec2(-1.5,-23.+float(i)*14.),vec2(5.5,4.8)));
  c=fpLayer(c,strip,vec3(.37,.55,.60),.95);
  return fpLayer(c,max(fpRepeatStroke(uv.x,1.2,.035),fpRepeatStroke(uv.y,1.6,.03))*strip,vec3(.33,.38,.37),.9);
 }
 if(kind>9.5){
  float joint=max(fpRepeatStroke(uv.y,.44,.008),fpRepeatStroke(uv.x+mod(floor(uv.y/.44),2.)*.6,1.2,.008));
  c=fpLayer(c,joint,vec3(.50,.52,.48),.20);
  c=fpLayer(c,fpStroke(uv.y-.35,.10),vec3(.59,.60,.54),.65);
  if(kind>10.5){
   // Two ground-level doors, with photo-estimated phase; blank museum wall above.
   for(int i=0;i<2;i++){
    float center=i==0?-21.:13.;vec2 q=uv-vec2(center,1.2);
    c=fpLayer(c,foRect(q,vec2(.62,1.17)),vec3(.22,.25,.23),.98);
    c=fpLayer(c,foRect(q-vec2(.18,0.),vec2(.035,.55)),vec3(.62,.65,.61),.85);
   }
  }return c;
 }

 if(kind>8.5){
  // Two finite skylight fields observed in the official roof photograph; solid terrace and cornice remain outside.
  bool left=uv.x>-22.5&&uv.x< -5.8,right=uv.x>11.7&&uv.x<28.5;
  if((left||right)&&uv.y> -1.0&&uv.y<11.3){
   float ridge=5.15,shade=smoothstep(0.,6.15,abs(uv.y-ridge));
   c=mix(vec3(.35,.46,.49),vec3(.66,.73,.73),shade);
   c=fpLayer(c,max(fpRepeatStroke(uv.x,1.35,.035),fpRepeatStroke(uv.y+1.,2.05,.035)),vec3(.72,.74,.69),.93);
   return fpLayer(c,fpStroke(uv.y-ridge,.065),vec3(.30,.35,.34),.75);
  }return base;
 }
 if(kind>7.5){
  float domain=foRect(uv-vec2(7.55,9.4),vec2(7.22,7.1));
  vec3 glass=mix(vec3(.23,.35,.38),vec3(.53,.64,.63),.5+.18*sin(uv.x*.35+uv.y*.11));
  c=fpLayer(c,domain,glass,.96);
  float rails=max(fpRepeatStroke(uv.x,.94,.027),fpRepeatStroke(uv.y-2.3,2.8,.04));
  c=fpLayer(c,rails*domain,vec3(.27,.31,.30),.94);
  float column=max(fpStroke(uv.x-.35,.15),max(fpStroke(uv.x-7.55,.15),fpStroke(uv.x-14.75,.15)));
  c=fpLayer(c,column*domain,vec3(.16,.20,.20),.95);
  return fpLayer(c,fpStroke(uv.y-2.2,.10),vec3(.78,.76,.67),.9);
 }
 if(kind>6.5){
  // Historic southwest corner beside the restaurant: one lower arch, two blind roundels, three upper rectangular lights.
  c=mix(c,vec3(.79,.72,.57),.28);float x=uv.x+28.25;
  c=foHallArch(c,vec2(x,uv.y-4.5),vec2(1.20,2.8),.38);
  for(int j=0;j<2;j++){
   vec2 q=vec2(x-(j==0?-2.75:2.75),uv.y-6.5);float ring=fpStroke(length(q)-.58,.08);
   c=fpLayer(c,ring,vec3(.88,.79,.61),.93);
   c=fpLayer(c,fpStroke(length(q)-.69,.035),vec3(.43,.38,.28),.5);
  }
  for(int j=0;j<3;j++)c=foRectCasement(c,vec2(x-(float(j)-1.)*2.45,uv.y-12.3),vec2(.65,1.8),.08);
  c=fpLayer(c,fpStroke(uv.y-8.1,.16),vec3(.88,.77,.56),.92);
  return fpLayer(c,fpStroke(uv.y-16.6,.15),vec3(.88,.77,.56),.92);
 }
 if(kind>5.5){
  float y=clamp((uv.y-21.15)/3.65,0.,1.);
  c=mix(vec3(.24,.30,.31),vec3(.51,.58,.58),y);
  c=mix(c,vec3(.66,.72,.70),(.5+.5*sin(uv.x*12.566+y*1.5))*.13);
  float ribs=fpRepeatStroke(uv.x,1./24.,.0017),rings=fpRepeatStroke(y,1./4.,.012);
  return fpLayer(c,max(ribs,rings),vec3(.27,.29,.28),.92);
 }
 float joint=max(fpRepeatStroke(uv.y,.55,.014),fpRepeatStroke(uv.x+mod(floor(uv.y/.55),2.)*.65,1.3,.011));
 c=fpLayer(c,joint,vec3(.48,.39,.26),.18);
 if(kind>4.5)return fpLayer(c,fpRepeatStroke(uv.y,.38,.025),vec3(.52,.42,.29),.22);
 for(int i=0;i<3;i++){float y=i==0?1.1:i==1?8.1:16.25;
  c=fpLayer(c,fpStroke(uv.y-y,.11),vec3(.88,.73,.49),.9);
  c=fpLayer(c,fpStroke(uv.y-y-.18,.04),vec3(.40,.32,.22),.65);
 }
 c=fpLayer(c,fpStroke(uv.y-17.35,.22),vec3(.86,.70,.45),.9);
 if(kind<1.5){
  float u0=uv.x>10.?10.27:-23.99,W=uv.x>10.?19.76:19.66;
  float bay=W/5.,x=u0+(floor((uv.x-u0)/bay)+.5)*bay;
  c=foRectCasement(c,uv-vec2(x,12.05),vec2(.68,1.65),.08);
  c=foHallArch(c,uv-vec2(x,4.85),vec2(.76,2.1),.24);
  float px=u0+round((uv.x-u0)/bay)*bay;
  c=foOrderColumn(c,uv-vec2(px,11.9),3.55,.20,1.);
  c=fpLayer(c,fpStroke(uv.y-14.05,.11)*step(abs(uv.x-x),1.2),vec3(.91,.76,.52),.92);
  return c;
 }
 if(kind<2.5){
  c=foHallArch(c,uv-vec2(2.97,12.1),vec2(1.15,3.0),.36);
  c=foEntranceArcade(c,uv-vec2(2.97,3.3),vec2(1.25,3.3),.0);
  for(int j=0;j<2;j++){
   float x=j==0?-1.65:7.65;
   c=foRectCasement(c,uv-vec2(x,11.95),vec2(.66,1.55),.08);
   c=foOrderColumn(c,uv-vec2(j==0?-3.4:9.3,11.9),4.35,.30,1.);
  }
  c=fpLayer(c,fpStroke(uv.y-16.1,.14),vec3(.90,.74,.49),.92);
  c=fpLayer(c,fpStroke(uv.y-19.7,.18),vec3(.89,.73,.48),.92);
  c=fpLayer(c,fpStroke(uv.y-19.95,.06),vec3(.43,.34,.23),.65);
  return c;
 }
 // End poster fields, rear walls and returns remain solid material; no transient posters or invented rear window grid.
 return c;
}
float f135CompletionArch(vec2 q,vec2 h){float stem=foRect(q-vec2(0.,-h.y*.25),vec2(h.x,h.y*.75));float top=(1.-smoothstep(.97,1.03,length((q-vec2(0.,h.y*.5))/vec2(h.x,h.y*.5))))*step(h.y*.5,q.y);return max(stem,top);}
vec3 ownerF135CompletionPaint(vec3 base,vec4 frame){
 float kind=frame.w;
 // Every original accepted kind returns the original function with identical arguments; added source-bound surfaces alone use13/14.
 if(abs(kind-13.)>.25&&abs(kind-14.)>.25)return ownerF135Paint(base,frame);
 vec2 uv=frame.xy;
 if(abs(kind-13.)<.25){
  vec3 c=ownerF135Paint(base,vec4(uv,26.5,4.));c=mix(c,vec3(.85,.78,.64),.23);
  // Main west return: three photographed blind upper arches and Corinthian pilasters, three real lower glazed roundheads.
  for(int j=0;j<3;j++){float x=.15+4.1*float(j);vec2 q=uv-vec2(x,12.0);float outside=f135CompletionArch(q,vec2(1.34,3.12)),inside=f135CompletionArch(q,vec2(1.17,2.94));c=fpLayer(c,max(outside-inside,0.),vec3(.90,.83,.69),.95);c=fpLayer(c,inside,vec3(.81,.75,.64),.30);c=foHallArch(c,uv-vec2(x,4.55),vec2(.88,2.60),.40);float disk=fpStroke(length(uv-vec2(x,8.70))-.35,.045);c=fpLayer(c,disk,vec3(.87,.78,.62),.88);}
  for(int j=0;j<4;j++)c=foOrderColumn(c,uv-vec2(-1.9+4.1*float(j),12.15),3.45,.24,1.);
  c=fpLayer(c,fpStroke(uv.y-16.25,.14),vec3(.88,.78,.61),.94);float dentils=fpRepeatStroke(uv.x,.43,.075)*fpStroke(uv.y-16.90,.12);return fpLayer(c,dentils,vec3(.49,.43,.33),.65);
 }
 // Peichl street wall; height remains original7.5m. Layout proportions estimated from official museum street photograph, no garden-side transfer.
 vec3 c=ownerF135Paint(base,vec4(uv,60.,10.));
 for(int j=0;j<8;j++){float x=12.0+float(j)*1.62;vec2 q=uv-vec2(x,4.75);float outer=foRect(q,vec2(.45,.89)),inner=foRect(q,vec2(.36,.78));c=fpLayer(c,outer,vec3(.69,.70,.63),.94);c=fpLayer(c,inner,vec3(.27,.36,.36),.98);c=fpLayer(c,fpStroke(q.x,.023)*inner,vec3(.57,.62,.57),.90);c=fpLayer(c,foRect(q-vec2(0.,.82),vec2(.49,.06)),vec3(.44,.47,.42),.90);}
 for(int j=0;j<9;j++){float x=j<4?12.+5.*float(j):7.-5.*float(j-4);c=fpLayer(c,foRect(uv-vec2(x,6.85),vec2(.105,.10)),vec3(.22,.27,.25),.97);}
 return c;
}
`;
