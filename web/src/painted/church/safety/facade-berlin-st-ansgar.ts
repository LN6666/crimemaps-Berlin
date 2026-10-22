/** Photo-bound stone and angular glazing cues for the modern St. Ansgar nave. */
export const BERLIN_ST_ANGSAR_GLSL = `
vec3 fpBerlinStAnsgar(vec3 base,vec3 normal,vec4 frame){
  vec2 uv=frame.xy;float H=frame.z,W=frame.w;
  if(H<.2||W<1.2||abs(normal.y)>.35)return base;

  // Cool gray masonry surrounds a continuous run of tall, dark window bays.
  vec3 stone=mix(base,vec3(.68,.69,.67),.82);
  float bed=fpRepeatStroke(uv.y,.46,.010);
  stone=fpLayer(stone,bed,vec3(.48,.49,.47),.22);

  float pitch=clamp(W/6.0,1.45,4.0);
  float cell=floor(uv.x/pitch);
  float local=mod(uv.x,pitch)/pitch-.5;
  float low=H*.105,high=H*.955;
  float t=clamp((uv.y-low)/max(.1,high-low),0.0,1.0);
  float lean=mod(cell,2.0)<1.0?-.105:.105;
  float center=lean*(t-.5);
  float panel=fpInside(max(abs(local-center)-.205,max(low-uv.y,uv.y-high)));
  float surround=max(
    fpInside(max(abs(local-center)-.252,max(low-.075-uv.y,uv.y-(high+.075))))-panel,
    0.0);
  stone=fpLayer(stone,surround,vec3(.43,.45,.44),.70);

  vec3 glass=mix(vec3(.085,.115,.13),vec3(.28,.33,.34),
                 .12+.16*(1.0-abs(local-center)*3.0));
  float reflection=fpInside(max(abs(local-center+.065)-.028,
                                max(low+.12-uv.y,uv.y-(high-.12))));
  glass=mix(glass,vec3(.48,.52,.51),reflection*.18);
  stone=fpLayer(stone,panel,glass,.94);

  // Alternating heavy diagonals create the source photo's zigzag rhythm.
  float diagonal=mod(cell,2.0)<1.0
    ?fpStroke(local-center-(t-.5)*.70,.020)
    :fpStroke(local-center+(t-.5)*.70,.020);
  float mullion=fpStroke(local-center,.010);
  float rails=max(fpStroke(uv.y-low-.12,.020),fpStroke(uv.y-high+.12,.020));
  stone=fpLayer(stone,(diagonal+mullion+rails)*panel,vec3(.74,.75,.72),.80);

  float pier=fpRepeatStroke(uv.x,pitch,.020);
  stone=fpLayer(stone,pier,vec3(.52,.53,.50),.22);
  float baseCourse=fpStroke(uv.y-.20,.045);
  return fpLayer(stone,baseCourse,vec3(.46,.47,.45),.24);
}
`;

/** Pale concrete on the separately mapped St. Ansgar bell-tower shaft only. */
export const BERLIN_ST_ANGSAR_TOWER_GLSL = `
vec3 fpBerlinStAnsgarTower(vec3 base,vec3 normal){
  if(abs(normal.y)>.35)return base;
  // Preserve the photo's pale gray-white concrete under the shared display light.
  return mix(base,vec3(.96,.97,.95),.82);
}
`;
