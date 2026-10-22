/** Photo-bound restrained material zones for Evangelische Kirche Alt-Lietzow.
 * Paint is attached to existing native surfaces; this never adds roof or facade geometry.
 */
export const BERLIN_ALT_LIETZOW_GLSL = `
vec3 fpBerlinAltLietzow(vec3 base,vec3 p,vec3 normal,vec4 frame,float layoutId){
  vec2 uv=frame.xy;float H=frame.z,W=frame.w;
  if(H<=.05||W<=.05)return base;

  // The photographed tent roof is dark sheet metal. Its native gabled planes stay intact.
  if(abs(normal.y)>.12){
    float lit=clamp(.52+.42*dot(normal.xz,normalize(vec2(-.48,.88))),.0,1.0);
    vec3 roof=mix(vec3(.075,.087,.098),vec3(.22,.23,.24),lit);
    roof=mix(base,roof,.96);
    float slopeX=step(abs(normal.z),abs(normal.x));
    float ridgeCoord=mix(uv.y,uv.x,slopeX),ridgeSpan=mix(H,W,slopeX);
    float seamCoord=mix(uv.x,uv.y,slopeX);
    float seams=fpRepeatStroke(seamCoord,2.8,.024);
    float ridge=fpStroke(ridgeCoord-ridgeSpan*.5,.055);
    float eave=max(fpStroke(ridgeCoord,.040),fpStroke(ridgeCoord-ridgeSpan,.040));
    roof=fpLayer(roof,seams,vec3(.047,.058,.067),.34);
    roof=fpLayer(roof,ridge,vec3(.27,.28,.28),.48);
    roof=fpLayer(roof,eave,vec3(.035,.043,.050),.48);
    return roof;
  }

  if(uv.y<0.0||uv.y>H)return base;
  float gable=fract(layoutId)<.15?1.0:0.0;
  if(gable>.5){
    vec3 wall=mix(base,vec3(.52,.275,.205),.90);
    float course=max(fpRepeatStroke(uv.y,.42,.014),
                     fpRepeatStroke(uv.x+mod(floor(uv.y/.42),2.0)*.42,.84,.012));
    wall=fpLayer(wall,course,vec3(.31,.17,.135),.38);

    // Pale framing and dark vertical glazing occupy the two documented gable flanks.
    float edgeY=H*.53+H*.43*(1.0-abs(uv.x-W*.5)/max(.5,W*.5));
    float flankMask=step(H*.18,uv.y)*step(uv.y,edgeY);
    float left=fpInside(fpBoxSdf(uv-vec2(W*.205,H*.58),vec2(W*.065,H*.29)))*flankMask;
    float right=fpInside(fpBoxSdf(uv-vec2(W*.795,H*.58),vec2(W*.065,H*.29)))*flankMask;
    float flank=max(left,right);
    wall=fpLayer(wall,flank,vec3(.14,.19,.20),.89);
    float ribs=max(fpRepeatStroke(uv.x,.46,.026),
                   max(fpStroke(uv.x-W*.14,.075),fpStroke(uv.x-W*.86,.075)));
    wall=fpLayer(wall,ribs*flank,vec3(.77,.75,.68),.83);

    float gableFrame=fpStroke(uv.y-edgeY,.11);
    wall=fpLayer(wall,gableFrame,vec3(.78,.76,.69),.91);
    float door=foRect(uv-vec2(W*.5,H*.145),vec2(W*.055,H*.115));
    wall=fpLayer(wall,door,vec3(.10,.13,.14),.94);
    float canopy=foTriangle(uv-vec2(W*.5,H*.275),W*.10,H*.035);
    wall=fpLayer(wall,canopy,vec3(.70,.68,.61),.88);
    return wall;
  }
  // The MD verifies the main gabled elevation only; unverified returns stay native.
  return base;
}
`;
