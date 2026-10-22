/** Photo-bound brick and slit-window cues for the low Paulus-Gemeinde hall. */
export const BERLIN_PAULUS_GEMEINDE_GLSL = `
vec3 fpBerlinPaulusGemeinde(vec3 base,vec3 normal,vec4 frame){
  vec2 uv=frame.xy;float H=frame.z,W=frame.w;
  if(H<.2||W<.2||normal.y>.15)return base;
  vec3 brick=mix(base,vec3(.48,.255,.185),.88);
  float course=fpRepeatStroke(uv.y,.31,.010);
  float bond=fpRepeatStroke(uv.x+mod(floor(uv.y/.31),2.)*.34,.68,.010);
  brick=fpLayer(brick,max(course,bond),vec3(.30,.16,.115),.25);

  // Narrow high-level windows form a continuous clerestory rhythm, with broad
  // brick piers between each opening as seen in the source elevation.
  float band=smoothstep(H*.675,H*.695,uv.y)*(1.-smoothstep(H*.815,H*.835,uv.y));
  float pitch=max(.82,W/8.0);
  float slotWidth=min(.54,pitch*.58);
  float localX=mod(uv.x+pitch*.5,pitch)-pitch*.5;
  float slot=fpInside(max(abs(localX)-slotWidth*.5,abs(uv.y-H*.755)-.055))*band;
  float reveal=(fpInside(max(abs(localX)-(slotWidth*.5+.055),abs(uv.y-H*.755)-.105))-fpInside(max(abs(localX)-slotWidth*.5,abs(uv.y-H*.755)-.055)))*band;
  brick=fpLayer(brick,reveal,vec3(.67,.56,.46),.58);
  brick=fpLayer(brick,slot,vec3(.12,.145,.14),.94);
  float sill=fpStroke(uv.y-H*.675,.038)*band;
  brick=fpLayer(brick,sill,vec3(.68,.56,.45),.65);

  // Keep the entry small and recessed on the two end walls; the mapped flat
  // extrusion does not support the separate canopy or shallow roof volume.
  if(abs(normal.x)>.72){
    vec2 q=uv-vec2(W*.5,H*.115);
    float doorW=min(.88,W*.17),doorH=min(2.25,H*.34);
    float opening=fpInside(max(abs(q.x)-doorW*.5,abs(q.y)-doorH*.5));
    float surround=fpInside(max(abs(q.x)-(doorW*.5+.12),abs(q.y)-(doorH*.5+.12)))-opening;
    brick=fpLayer(brick,surround,vec3(.68,.55,.43),.80);
    brick=fpLayer(brick,opening,vec3(.095,.105,.10),.96);
    float canopy=fpStroke(q.y-doorH*.5-.13,.06)*(1.-smoothstep(doorW*.54,doorW*.68,abs(q.x)));
    brick=fpLayer(brick,canopy,vec3(.19,.18,.16),.82);
  }
  float baseCourse=fpStroke(uv.y-.22,.045);
  return fpLayer(brick,baseCourse,vec3(.35,.21,.16),.30);
}
`;
