/** Photo-bound quick paint for St. Benedikt's angular brick hall and separate bell tower. */
export const BERLIN_ST_BENEDIKT_GLSL = `
vec3 fpStBenediktMain(vec3 base,vec3 normal,vec4 frame){
  vec2 uv=frame.xy;float H=frame.z,W=frame.w;
  if(H<.2||W<.2||abs(normal.y)>.35)return base;
  float screen=smoothstep(H*.755,H*.785,uv.y);
  vec3 brick=mix(base,vec3(.47,.255,.175),.91);
  vec3 concrete=mix(base,vec3(.76,.755,.72),.90);
  vec3 wall=mix(brick,concrete,screen);
  float course=fpRepeatStroke(uv.y,.38,.012)*(1.-screen);
  wall=fpLayer(wall,course,vec3(.27,.145,.105),.16);
  float band=smoothstep(H*.765,H*.785,uv.y)*(1.-smoothstep(H*.94,H*.965,uv.y));
  float row=floor((uv.y-H*.77)/.30);
  float x=mod(uv.x+mod(row,2.)*.19,.38)-.19;
  float y=mod(uv.y-H*.77,.30)-.15;
  float holes=fpInside(length(vec2(x,y))-min(.045,W*.018))*band;
  wall=fpLayer(wall,holes,vec3(.31,.32,.31),.68);
  float screenEdge=max(fpStroke(uv.y-H*.76,.045),fpStroke(uv.y-H*.95,.055));
  wall=fpLayer(wall,screenEdge,vec3(.50,.51,.49),.56);
  float seam=fpRepeatStroke(uv.x,max(W,.8),.035);
  return fpLayer(wall,seam,vec3(.67,.66,.63),.30);
}
vec3 fpStBenediktBellTower(vec3 base,vec3 normal,vec4 frame){
  vec2 uv=frame.xy;float H=frame.z,W=frame.w;
  if(H<.2||W<.2||abs(normal.y)>.35)return base;
  vec3 shaft=mix(base,vec3(.60,.62,.61),.90);
  float verticalSeam=fpRepeatStroke(uv.x,max(W,.6),.035);
  shaft=fpLayer(shaft,verticalSeam,vec3(.40,.43,.43),.31);
  if(abs(normal.x)>.55||abs(normal.z)>.55){
    for(int i=0;i<3;i++){
      float cx=W*(.38+.12*float(i));
      vec2 q=uv-vec2(cx,H*.82);
      float opening=fpWindowShape(q,vec2(min(.065,W*.10),H*.075),.025,0.0);
      float reveal=fpWindowShape(q,vec2(min(.10,W*.14),H*.09),.025,0.0)-opening;
      shaft=fpLayer(shaft,reveal,vec3(.45,.47,.46),.70);
      shaft=fpLayer(shaft,opening,vec3(.12,.15,.15),.96);
    }
  }
  return shaft;
}
vec3 fpStBenedikt(vec3 base,vec3 normal,vec4 frame,float layoutId){
  if(layoutId==281.)return fpStBenediktMain(base,normal,frame);
  if(layoutId==282.)return fpStBenediktBellTower(base,normal,frame);
  return base;
}
`;
