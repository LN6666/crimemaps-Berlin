export const F031_GLSL=String.raw`vec3 schaeferbergWhole031(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6334.)>.25)return base;
 float angle=frame.x,y=frame.y,r=frame.z,role=frame.w;
 vec3 concrete=vec3(.80,.79,.745),metal=vec3(.43,.46,.47);
 if(role<1.5){
  // Quiet pale concrete shaft and solid crown piers: no generic windows.
  float joint=1.-smoothstep(.014,.055,abs(fract(y/3.8)-.5)*3.8);
  float stain=.018*sin(angle*5.+.3)*sin(y*.036);
  return concrete*(1.-.045*joint+stain);
 }
 if(role<2.5){
  // Flat concrete/metal-edged ledges, never tiled roof or window grid.
  float edge=mix(.82,1.,smoothstep(-.15,.45,normal.y));
  return vec3(.66,.68,.66)*edge;
 }
 if(role<3.5){
  float line=1.-smoothstep(.012,.05,abs(fract(angle*12./6.2831853)-.5));
  return mix(vec3(.72,.73,.70),metal,.22*line);
 }
 if(role<5.5)return metal;
 if(role>6.5&&role<7.5){
  // Photo186..212m red/white axial aerial bands; top remains red.
  float band=mod(floor((212.-y)/5.8),2.);
  return mix(vec3(.82,.105,.055),vec3(.89,.89,.83),band);
 }
 if(role>7.5&&role<8.5)return vec3(.66,.68,.66);
 return base;
}
`;
