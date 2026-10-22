/** Photo-bound paint for the exact flat-roof native prayer-house component. */
export const BERLIN_ECB_GLSL = `
vec3 fpEcbWindow(vec3 wall,vec2 uv,float cx,float cy,vec2 size){
  vec2 q=uv-vec2(cx,cy);
  float glass=fpWindowShape(q,size,.025,0.);
  float trim=fpWindowShape(q,size+vec2(.12,.13),.025,0.)-glass;
  wall=fpLayer(wall,trim,vec3(.94,.93,.89),.98);
  wall=fpLayer(wall,glass,vec3(.16,.20,.22),.97);
  float mullion=max(fpStroke(q.x,.022),fpStroke(q.y,.022))*glass;
  wall=fpLayer(wall,mullion,vec3(.66,.68,.66),.78);
  wall=fpLayer(wall,fpStroke(q.y+size.y+.08,.035)*fpInside(abs(q.x)-size.x-.12),vec3(.70,.69,.64),.72);
  return wall;
}
vec3 fpEvangeliumsChristen(vec3 base,vec3 p,vec3 normal,vec4 frame){
  vec2 uv=frame.xy;float H=frame.z,W=frame.w;
  if(H<.2||W<.2)return base;

  // The source photo documents a dark, continuous flat parapet/roof band.
  if(abs(normal.y)>.30){
    vec3 roof=mix(base,vec3(.075,.082,.088),.94);
    float seams=max(fpRepeatStroke(uv.x,3.2,.014),fpRepeatStroke(uv.y,3.2,.014));
    roof=fpLayer(roof,seams,vec3(.20,.21,.21),.34);
    return roof;
  }

  // Warm white render follows the photographed stucco; only native faces are touched.
  vec3 wall=mix(base,vec3(.88,.87,.82),.90);
  float foot=1.-smoothstep(.18,.42,uv.y);
  wall=fpLayer(wall,foot,vec3(.57,.57,.53),.13);
  float parapet=smoothstep(H*.84,H*.87,uv.y);
  wall=fpLayer(wall,parapet,vec3(.075,.082,.088),.96);
  float floorLine=fpStroke(uv.y-H*.51,.018)*(1.-parapet);
  wall=fpLayer(wall,floorLine,vec3(.69,.68,.63),.35);

  // The long south elevation has two regular rows of rectangular windows.
  if(normal.z<-.70&&W>24.){
    float count=W>34.?7.:5.;
    float doorX=W*.78;
    for(int i=0;i<8;i++){
      if(float(i)>=count)break;
      float x=W*(float(i)+.5)/count;
      float halfWidth=min(.78,W/count*.17);
      float halfHeight=min(.52,H*.095);
      wall=fpEcbWindow(wall,uv,x,H*.70,vec2(halfWidth,halfHeight));
      if(abs(x-doorX)>W*.105)
        wall=fpEcbWindow(wall,uv,x,H*.34,vec2(halfWidth,H*.105));
    }

    // Recessed double entrance, with a restrained dark canopy and cast shadow.
    float doorH=H*.29,doorW=min(1.25,W*.045);
    vec2 dq=uv-vec2(doorX,doorH*.51);
    float opening=fpWindowShape(dq,vec2(doorW,doorH*.5),.015,0.);
    float reveal=fpWindowShape(dq,vec2(doorW+.16,doorH*.5+.12),.015,0.)-opening;
    wall=fpLayer(wall,reveal,vec3(.67,.65,.60),.85);
    wall=fpLayer(wall,opening,vec3(.14,.17,.18),.98);
    wall=fpLayer(wall,fpStroke(dq.x,.025)*opening,vec3(.57,.58,.55),.85);
    float canopy=fpWindowShape(uv-vec2(doorX,H*.43),vec2(min(2.5,W*.10),.105),0.,0.);
    float canopyShadow=fpWindowShape(uv-vec2(doorX,H*.405),vec2(min(2.65,W*.105),.16),0.,0.);
    wall=fpLayer(wall,canopyShadow,vec3(.36,.37,.35),.28);
    wall=fpLayer(wall,canopy,vec3(.12,.13,.13),.94);
  }

  // The southwest view shows the west end: orange accent and exterior stair.
  if(normal.x<-.70&&W<26.){
    float accentX=W*.32;
    float accent=fpWindowShape(uv-vec2(accentX,H*.49),vec2(W*.11,H*.47),0.,0.);
    wall=fpLayer(wall,accent,vec3(.76,.24,.10),.97);
    for(int i=0;i<5;i++){
      float x=W*(.10+.18*float(i));
      if(abs(x-accentX)>W*.12){
        wall=fpEcbWindow(wall,uv,x,H*.70,vec2(min(.34,W*.027),H*.085));
        wall=fpEcbWindow(wall,uv,x,H*.34,vec2(min(.34,W*.027),H*.085));
      }
    }
    // Painted tread and rail shadows record the photographed stair without adding geometry.
    for(int i=0;i<11;i++){
      float t=float(i)/10.;
      float sx=W*(.06+.34*t),sy=H*(.11+.32*t);
      float tread=fpWindowShape(uv-vec2(sx+.20,sy),vec2(.25,.035),0.,0.);
      wall=fpLayer(wall,tread,vec3(.34,.36,.36),.62);
    }
    float rail=fpStroke(uv.y-(H*.16+(uv.x-W*.07)*H*.34/(W*.34)),.028)
      *fpInside(W*.07-uv.x)*fpInside(uv.x-W*.42);
    wall=fpLayer(wall,rail,vec3(.44,.46,.44),.78);
  }
  return wall;
}
`;
