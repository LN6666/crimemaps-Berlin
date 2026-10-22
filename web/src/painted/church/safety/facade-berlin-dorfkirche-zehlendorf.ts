/** Fast, source-bound paint for the native hipped roof over Dorfkirche Zehlendorf. */
export const BERLIN_DORFKIRCHE_ZEHLENDORF_GLSL = `
vec3 fpDorfkircheZehlendorf(vec3 base,vec3 normal,vec4 frame){
  if(frame.w<0.){
    // The exact OSM part tags and Commons photo support the terracotta roof color.
    vec3 roof=vec3(.92549,.38431,.29412);
    float r=length(frame.xy),angle=atan(frame.y,frame.x);
    float hips=fpRepeatStroke(angle,.785398,.014);
    float lineMask=smoothstep(.10,.32,r)*(1.-smoothstep(frame.z*.84,frame.z*.98,r));
    return fpLayer(roof,hips*lineMask,vec3(.50,.17,.13),.18);
  }
  if(frame.z<.2)return base;
  // Warm pale-pink plaster follows the photographed church and its OSM wall-color tag.
  vec3 wall=vec3(1.0,.89412,.89412);
  float eave=fpStroke(frame.y-(frame.z-.10),.045);
  wall=fpLayer(wall,eave,vec3(.39,.33,.30),.30);
  float foot=fpStroke(frame.y-.16,.035);
  return fpLayer(wall,foot,vec3(.68,.57,.52),.12);
}
`;
