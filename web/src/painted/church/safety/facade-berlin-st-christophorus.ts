/** Source-bound color and entrance cues for St. Christophorus, Berlin-Neukölln. */
export const BERLIN_ST_CHRISTOPHORUS_GLSL = `
vec3 fpStChristophorus(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
  if(family==270.){
    if(normal.y>.15)return base;
    vec3 wall=mix(base,vec3(.78431,.67843,.62745),.92);
    // The entrance elevation is the northwest-facing 7.5 m wall shared by the
    // mapped church body and tower base. Its exact source-ring face normal is
    // (-.853,.521) in native east/north axes.
    float front=smoothstep(.88,.96,dot(normalize(normal.xz),normalize(vec2(-.853,.521))));
    if(front>.01){
      wall=vec3(.55,.285,.22);
      float course=max(fpRepeatStroke(frame.y,.285,.008),fpRepeatStroke(frame.x+mod(floor(frame.y/.285),2.)*.34,.68,.008));
      wall=fpLayer(wall,course,vec3(.31,.22,.19),.32);
      vec3 portal=wall;
      portal=foEntranceArcade(portal,vec2(frame.x-frame.w*.12,frame.y-1.55),vec2(min(frame.w*.055,.62),1.55),0.);
      portal=foEntranceArcade(portal,vec2(frame.x-frame.w*.37,frame.y-1.90),vec2(min(frame.w*.095,1.08),1.90),1.);
      portal=foEntranceArcade(portal,vec2(frame.x-frame.w*.60,frame.y-1.90),vec2(min(frame.w*.095,1.08),1.90),1.);
      portal=foEntranceArcade(portal,vec2(frame.x-frame.w*.87,frame.y-2.15),vec2(min(frame.w*.11,1.22),2.15),0.);
      float band=fpStroke(frame.y-5.18,.055);
      portal=fpLayer(portal,band,vec3(.75,.66,.56),.70);
      float pierLines=max(fpStroke(frame.x-frame.w*.25,.045),fpStroke(frame.x-frame.w*.49,.045));
      pierLines=max(pierLines,fpStroke(frame.x-frame.w*.74,.045));
      portal=fpLayer(portal,pierLines*step(frame.y,5.18),vec3(.72,.61,.51),.40);
      float crossY=frame.y-4.82;
      float crossV=max(fpStroke(frame.x-frame.w*.37,.052),fpStroke(frame.x-frame.w*.60,.052));
      crossV*=1.-smoothstep(.31,.39,abs(crossY));
      float crossH=max(fpStroke(crossY,.052)*(1.-smoothstep(.18,.24,abs(frame.x-frame.w*.37))),
                       fpStroke(crossY,.052)*(1.-smoothstep(.18,.24,abs(frame.x-frame.w*.60))));
      portal=fpLayer(portal,max(crossV,crossH),vec3(.84,.75,.58),.96);
      wall=mix(wall,portal,front);
    }
    return wall;
  }
  if(normal.y>.15){
    vec3 roof=family==271.||family==276.?vec3(.36471,.41961,.41961):family==275.?vec3(.73333,.56863,.51373):vec3(.80784,.55686,.45882);
    float width=max(frame.w,.5),depth=max(frame.z,.5);
    vec2 q=frame.xy-vec2(width,depth)*.5;
    float hips=max(fpStroke(q.x/width-q.y/depth,.008),fpStroke(q.x/width+q.y/depth,.008));
    float seam=fpRepeatStroke(frame.x+frame.y,.95,.010);
    float edge=1.-smoothstep(.76,.99,min(min(frame.x,width-frame.x)/width,min(frame.y,depth-frame.y)/depth));
    roof=mix(roof,roof*.78,edge*.16);
    roof=fpLayer(roof,seam,roof*.72,.18);
    if(family==271.)roof=fpLayer(roof,hips,vec3(.72,.74,.70),.62);
    float light=clamp(.82+normal.y*.18, .82, 1.0);
    return roof*light;
  }
  vec3 wall=base;
  if(family==271.||family==275.||family==276.){
    // OSM identifies these native parts as brick; the entrance cues are placed
    // on the actual low wall plane beneath the tower instead.
    wall=vec3(.55,.285,.22);
    float course=max(fpRepeatStroke(frame.y,.285,.008),fpRepeatStroke(frame.x+mod(floor(frame.y/.285),2.)*.34,.68,.008));
    wall=fpLayer(wall,course,vec3(.31,.22,.19),.32);
    return wall;
  }
  // The parent building color is the only supported hue for the plastered main mass.
  if(family==273.)wall=vec3(1.0,1.0,1.0);
  else wall=vec3(.78431,.67843,.62745);
  float foot=fpStroke(frame.y-.18,.035);
  return fpLayer(wall,foot,vec3(.48,.42,.38),.12);
}
`;
