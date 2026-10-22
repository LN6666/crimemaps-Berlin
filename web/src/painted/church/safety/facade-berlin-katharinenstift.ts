/** Photo-bound color zones for the exact native Mater Dolorosa component.
 * It colors existing surfaces only; the mesh silhouette and unmodeled details stay untouched.
 */
export const BERLIN_KATHARINENSTIFT_GLSL = `
vec3 fpBerlinKatharinenstift(vec3 base,vec3 normal,vec4 frame,float layoutId){
  vec2 uv=frame.xy;
  if(layoutId==292.){
    // The south reference and independent exterior photographs show a grey slate roof.
    vec3 roof=mix(base,vec3(.34,.37,.38),.92);
    float row=floor(uv.y/.58);
    float slate=max(fpRepeatStroke(uv.y,.58,.014),
                    fpRepeatStroke(uv.x+mod(row,2.)*.42,.84,.014));
    roof=fpLayer(roof,slate,vec3(.23,.26,.27),.34);
    return roof;
  }
  if(frame.z<=0.||frame.w<=0.)return base;

  // The documented facade alternates warm brick piers with pale plaster panels.
  vec3 plaster=mix(base,vec3(.79,.75,.67),.90);
  vec3 brick=mix(base,vec3(.55,.285,.205),.92);
  float bay=max(3.2,frame.w/6.);
  float pier=fpRepeatStroke(uv.x,bay,.34);
  vec3 wall=mix(plaster,brick,pier*.96);
  float row=floor(uv.y/.34);
  float joints=max(fpRepeatStroke(uv.y,.34,.012),
                   fpRepeatStroke(uv.x+mod(row,2.)*.38,.76,.011));
  wall=fpLayer(wall,joints*pier,vec3(.72,.55,.43),.28);

  // The photographed lower storey is brick; retain a continuous brick plinth.
  float plinth=1.-smoothstep(frame.z*.21,frame.z*.24,uv.y);
  wall=mix(wall,brick,plinth*.94);
  float cornice=fpStroke(uv.y-frame.z*.94,.12);
  wall=fpLayer(wall,cornice,vec3(.48,.235,.17),.58);
  return wall;
}
`;
