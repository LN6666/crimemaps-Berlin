/** Photo-bound facade drawing for the exact flat-roof Augustanakirche native component. */
export const BERLIN_AUGUSTANA_GLSL = `
vec3 fpAugustanaGrid(vec3 wall,vec2 uv,float W,float H){
  vec2 q=uv-vec2(W*.69,H*.53);
  vec2 outer=vec2(W*.245,H*.315),glassSize=outer-vec2(.16,.16);
  float frame=fpInside(fpBoxSdf(q,outer));
  float glass=fpInside(fpBoxSdf(q,glassSize));
  float reveal=max(frame-glass,0.);
  wall=fpLayer(wall,fpBoxSdf(q-vec2(.075,-.075),outer+vec2(.025)),vec3(.43,.43,.41),.16);
  wall=fpLayer(wall,reveal,vec3(.91,.90,.86),.98);
  wall=fpLayer(wall,glass,vec3(.20,.24,.25),.96);
  float mullion=0.;
  for(int i=1;i<5;i++){
    float x=-glassSize.x+2.*glassSize.x*float(i)/5.;
    mullion=max(mullion,fpStroke(q.x-x,.035)*glass);
  }
  for(int j=1;j<3;j++){
    float y=-glassSize.y+2.*glassSize.y*float(j)/3.;
    mullion=max(mullion,fpStroke(q.y-y,.045)*glass);
  }
  wall=fpLayer(wall,mullion,vec3(.83,.82,.78),.96);
  return wall;
}
vec3 fpAugustanaSlot(vec3 wall,vec2 uv,float W,float H){
  vec2 q=uv-vec2(W*.53,H*.53);
  vec2 outer=vec2(min(W*.12,1.18),H*.345),glassSize=outer-vec2(.13,.14);
  float frame=fpInside(fpBoxSdf(q,outer));
  float glass=fpInside(fpBoxSdf(q,glassSize));
  wall=fpLayer(wall,fpInside(fpBoxSdf(q-vec2(.07,-.07),outer+vec2(.02))),vec3(.42,.42,.40),.15);
  wall=fpLayer(wall,frame-glass,vec3(.92,.91,.87),.98);
  wall=fpLayer(wall,glass,vec3(.19,.23,.24),.96);
  float mullion=fpStroke(q.y+glassSize.y/3.,.05)*glass;
  mullion=max(mullion,fpStroke(q.y-glassSize.y/3.,.05)*glass);
  mullion=max(mullion,fpStroke(q.x,.035)*glass);
  wall=fpLayer(wall,mullion,vec3(.84,.83,.79),.97);
  return wall;
}
vec3 fpAugustana(vec3 base,vec3 normal,vec4 frame){
  vec2 uv=frame.xy;float H=frame.z,W=frame.w;
  if(H<.2||W<.2||abs(normal.y)>.30)return base;
  vec3 wall=mix(base,vec3(.93,.91,.86),.94);
  float roofEdge=fpStroke(uv.y-(H-.10),.025);
  wall=fpLayer(wall,roofEdge,vec3(.95,.93,.87),.48);
  float baseShade=fpStroke(uv.y-.16,.045);
  wall=fpLayer(wall,baseShade,vec3(.46,.45,.42),.12);

  // North-facing broad elevation: a wide, divided window group with large blank fields around it.
  if(normal.z>.70&&W>8.){
    wall=fpAugustanaGrid(wall,uv,W,H);
  }
  // The photographed northeast short end: one tall window divided into stacked rectangular modules.
  if(normal.x>.70&&W<24.){
    wall=fpAugustanaSlot(wall,uv,W,H);
  }
  return wall;
}
`;
