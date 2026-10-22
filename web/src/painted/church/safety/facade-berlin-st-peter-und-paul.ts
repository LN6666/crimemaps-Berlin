/** Photo-bound surface paint for the native church and its mapped tower parts. */
export const BERLIN_ST_PETER_UND_PAUL_GLSL = `
vec3 fpStPeterNave(vec3 base,vec3 p,vec3 normal,vec4 frame){
  vec2 uv=frame.xy;float H=frame.z,W=frame.w;
  if(H<.2||W<.2)return base;
  // The photograph and OSM roof-colour tag support a subdued slate roof.
  if(abs(normal.y)>.20)return mix(base,vec3(.43,.46,.45),.70);
  vec3 wall=mix(base,vec3(.55,.30,.22),.84);
  float course=fpRepeatStroke(uv.y,.32,.009);
  float bond=fpRepeatStroke(uv.x+mod(floor(uv.y/.32),2.)*.34,.68,.009);
  wall=fpLayer(wall,max(course,bond),vec3(.28,.14,.10),.24);
  wall=fpLayer(wall,fpStroke(uv.y-H*.93,.09),vec3(.70,.56,.43),.75);
  wall=fpLayer(wall,fpStroke(uv.y-H*.075,.12),vec3(.40,.23,.17),.58);

  // The documented long nave has a regular run of tall, round-headed windows.
  float count=W>20.?7.:W>11.?4.:2.;
  for(int i=0;i<8;i++){
    if(float(i)>=count)break;
    float x=W*(float(i)+.5)/count;
    vec2 q=uv-vec2(x,H*.58),size=vec2(min(.54,W/count*.22),min(1.52,H*.205));
    float opening=fpWindowShape(q,size,.43,0.);
    float surround=fpWindowShape(q,size+vec2(.14,.17),.43,0.)-opening;
    wall=fpLayer(wall,opening,vec3(.15,.16,.15),.92);
    wall=fpLayer(wall,fpStroke(q.x,.025)*opening,vec3(.60,.50,.39),.58);
    wall=fpLayer(wall,surround,vec3(.78,.66,.52),.88);
  }
  return wall;
}

vec3 fpStPeterTower(vec3 base,vec3 p,vec3 normal,vec4 frame){
  vec2 uv=frame.xy;float H=frame.z,W=frame.w;
  if(H<.2||W<.2)return base;
  if(abs(normal.y)>.20)return mix(base,vec3(.43,.46,.45),.70);
  vec3 wall=mix(base,vec3(.54,.29,.21),.84);
  float course=fpRepeatStroke(uv.y,.34,.009);
  float bond=fpRepeatStroke(uv.x+mod(floor(uv.y/.34),2.)*.34,.68,.009);
  wall=fpLayer(wall,max(course,bond),vec3(.28,.14,.10),.23);
  // Restrained belt courses divide the broad base and narrower upper shaft.
  for(int k=0;k<4;k++){
    float y=H*(.30+.20*float(k));
    wall=fpLayer(wall,fpStroke(uv.y-y,.075),vec3(.75,.61,.47),.68);
  }
  // Paired broad arches at the base and narrow vertical arches in the shaft.
  float center=W*.5,windowY=H*(H>17.5?.76:.64);
  float halfWidth=min(.30,W*.19),halfHeight=min(H*.095,1.25);
  for(int i=0;i<2;i++){
    float x=center+(float(i)-.5)*W*.36;
    vec2 q=uv-vec2(x,windowY),size=vec2(halfWidth,halfHeight);
    float opening=fpWindowShape(q,size,.42,0.);
    float surround=fpWindowShape(q,size+vec2(.10,.14),.42,0.)-opening;
    wall=fpLayer(wall,opening,vec3(.14,.15,.15),.92);
    wall=fpLayer(wall,surround,vec3(.79,.67,.53),.86);
  }
  return wall;
}

vec3 fpStPeterGreenTower(vec3 base,vec3 p,vec3 normal,vec4 frame){
  if(abs(normal.y)>.20)return mix(base,vec3(.49,.64,.54),.78);
  return fpStPeterTower(base,p,normal,frame);
}

vec3 fpStPeterDome(vec3 base,vec3 p,vec3 normal,vec4 frame){
  // This source component is explicitly an onion roof with a green roof-colour tag.
  return mix(base,vec3(.49,.65,.55),.84);
}
`;
