/** Photo-bound HausamDom material only; no whole-building generic window grid.
 * 45332 south end, 45333 eastern head, 45334 eastern foyer plane and 45335
 * east roof are explicit GML plane bindings. Placement is photo approximation,
 * not a measured facade survey. Hidden planes retain white plaster/slate. */
export const HAUSDOM_OFFICIAL_GLSL070=`
float hdo070Rect(vec2 q,vec2 lo,vec2 hi){return step(lo.x,q.x)*step(q.x,hi.x)*step(lo.y,q.y)*step(q.y,hi.y);}
vec3 hdo070Opening(vec3 wall,vec2 q,vec2 lo,vec2 hi,float divisions){
 float border=hdo070Rect(q,lo-vec2(.085),hi+vec2(.085));
 float inner=hdo070Rect(q,lo,hi);
 vec3 c=mix(wall,vec3(.60,.60,.55),border);
 vec2 uv=(q-lo)/max(hi-lo,vec2(.01));
 float mullion=1.-smoothstep(.014,.025,abs(fract(uv.x*divisions+.5)-.5));
 vec3 glass=mix(vec3(.25,.33,.35),vec3(.42,.50,.51),clamp(uv.y,0.,1.));
 return mix(c,mix(glass,vec3(.19,.22,.22),mullion),inner);
}
vec3 hausdomOfficial070(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec2 q=frame.xy;vec3 plaster=vec3(.90,.90,.86);
 if(abs(family-45331.)<.25||abs(family-45335.)<.25){
  if(normal.y>.9)return vec3(.47,.48,.46);
  vec3 slate=vec3(.29,.31,.32);
  float course=1.-smoothstep(.006,.013,abs(fract((abs(family-45335.)<.25?q.y:q.x)/.22)-.5)*.22);
  slate-=course*.019;
  if(abs(family-45335.)<.25){
   for(int j=0;j<3;j++){
    float u=3.5+7.0*float(j);
    slate=hdo070Opening(slate,q,vec2(u-.27,21.2),vec2(u+.27,24.1),1.);
   }
  }
  return slate;
 }
 if(abs(family-45330.)<.25){return mix(plaster,vec3(.68,.68,.62),1.-step(1.25,q.y));}
 if(abs(family-45332.)<.25){
  vec3 c=mix(plaster,vec3(.69,.69,.63),1.-step(.55,q.y));
  float scale=frame.w/14.8426145861;
  for(int r=0;r<3;r++){
   float y=5.6+4.25*float(r);
   for(int k=0;k<3;k++){
    float u=(3.65+2.05*float(k))*scale;
    c=hdo070Opening(c,q,vec2(u-.54,y),vec2(u+.54,y+2.05),2.);
   }
   c=hdo070Opening(c,q,vec2(10.55*scale,y),vec2(12.6*scale,y+2.05),3.);
  }
  c=hdo070Opening(c,q,vec2(6.6*scale,20.9),vec2(8.05*scale,24.1),2.);
  c=hdo070Opening(c,q,vec2(5.4*scale,.45),vec2(12.8*scale,3.85),4.);
  // The projecting steel canopy visible in the photograph is not fabricated
  // as painted wall geometry; that protrusion remains an explicit limitation.
  return c;
 }
 if(abs(family-45333.)<.25){
  vec3 c=plaster;
  c=hdo070Opening(c,q,vec2(.9,.45),vec2(8.6,3.2),4.);
  c=hdo070Opening(c,q,vec2(1.,5.1),vec2(8.6,8.7),4.);
  c=hdo070Opening(c,q,vec2(1.,9.7),vec2(8.6,12.65),4.);
  c=hdo070Opening(c,q,vec2(1.1,14.2),vec2(16.8,16.35),5.);
  c=hdo070Opening(c,q,vec2(12.2,5.4),vec2(13.1,8.2),1.);
  c=hdo070Opening(c,q,vec2(12.2,10.),vec2(13.1,12.5),1.);
  return c;
 }
 if(abs(family-45334.)<.25){
  vec3 c=plaster;
  c=hdo070Opening(c,q,vec2(.12,8.3),vec2(frame.w-.12,12.65),4.);
  c=hdo070Opening(c,q,vec2(.12,13.5),vec2(frame.w-.12,23.15),4.);
  float upper=hdo070Rect(q,vec2(.12,13.5),vec2(frame.w-.12,23.15));
  float transom=1.-smoothstep(.035,.07,abs(fract((q.y-13.5)/2.1+.5)-.5)*2.1);
  return mix(c,vec3(.28,.33,.33),upper*transom);
 }
 return base;
}
`;
