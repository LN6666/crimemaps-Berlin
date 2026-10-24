/** Exact press centre only. Material grain/seam spacing is an explicit visual
 * approximation, not surveyed panel counts. No invented office window rows.
 * Official LoD2 does not supply the panorama double curvature;15m open soffit is photo-derived. */
export const ECB_PRESS_GLSL072=String.raw`
float ecbPress072Line(float x,float period,float width){
 float d=abs(mod(x+period*.5,period)-period*.5);
 return 1.-smoothstep(width,width+max(fwidth(x),.015),d);
}
vec3 ecbPress072(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(frame.w-1.)>.01)return base;
 if(abs(family-45370.)<.25){
  if(abs(normal.y)>.2)return base;
  float wide=.5+.5*sin(frame.x*.19+frame.y*.035);
  // Broad restrained glass tonality, not a photograph baked into the wall.
  vec3 glass=base*mix(.94,1.055,wide);
  // Continuous panorama pane seams; illustrative spacing, not office openings.
  float vertical=ecbPress072Line(frame.x,2.2,.016);
  float transom=ecbPress072Line(frame.y-15.+.09*frame.x,3.4,.018);
  return mix(glass,vec3(.54,.57,.58),max(vertical,transom)*.72);
 }
 if(abs(family-45371.)<.25){
  if(abs(normal.y)>.2)return base;
  float seam=max(ecbPress072Line(frame.x,2.4,.014),ecbPress072Line(frame.y,1.2,.012));
  return base*mix(1.,.91,seam);
 }
 if(abs(family-45372.)<.25){if(normal.y<.85)return base;return base;}
 return base;
}
`;
