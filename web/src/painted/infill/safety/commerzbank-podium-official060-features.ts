/**
 * Commerzbank's two selected podium SOURCE objects only, after the exact
 * official-five-body owner guard. See material-description.json for evidence
 * and limits. This module changes colour only; it never discards a surface.
 */
export const COMMERZBANK_PODIUM_OFFICIAL_GLSL060 = /* glsl */ `
float cbp060Band(float p, float lo, float hi, float aa) {
  return smoothstep(lo-aa,lo+aa,p)*(1.0-smoothstep(hi-aa,hi+aa,p));
}
// Registered HVBG DOP pixels -> the provider's fixed local East/North metres.
// BBOX[8.67385,50.11045,8.67555,50.11185], 900x900; no screen/world lookup.
vec2 cbp060DopPoint(vec2 pixel) {
  return (pixel-vec2(478.667647059,423.257142857))*vec2(0.134846814932,-0.173164444444);
}
float cbp060Crossing(vec2 p, vec2 a, vec2 b) {
  if ((a.y>p.y)==(b.y>p.y)) return 0.0;
  return p.x < a.x+(p.y-a.y)*(b.x-a.x)/(b.y-a.y) ? 1.0 : 0.0;
}
float cbp060LongPlantField(vec2 p) {
  vec2 a=cbp060DopPoint(vec2(293.0,196.0));
  vec2 b=cbp060DopPoint(vec2(430.0,152.0));
  vec2 c=cbp060DopPoint(vec2(586.0,464.0));
  vec2 d=cbp060DopPoint(vec2(664.0,674.0));
  vec2 e=cbp060DopPoint(vec2(527.0,592.0));
  vec2 f=cbp060DopPoint(vec2(537.0,549.0));
  vec2 g=cbp060DopPoint(vec2(514.0,493.0));
  vec2 h=cbp060DopPoint(vec2(497.0,500.0));
  vec2 i=cbp060DopPoint(vec2(319.0,237.0));
  return mod(cbp060Crossing(p,a,b)+cbp060Crossing(p,b,c)+
    cbp060Crossing(p,c,d)+cbp060Crossing(p,d,e)+
    cbp060Crossing(p,e,f)+cbp060Crossing(p,f,g)+
    cbp060Crossing(p,g,h)+cbp060Crossing(p,h,i)+
    cbp060Crossing(p,i,a),2.0);
}
float cbp060Path(vec2 p, vec2 pixelA, vec2 pixelB, float halfWidthM) {
  vec2 a=cbp060DopPoint(pixelA),b=cbp060DopPoint(pixelB);
  vec2 v=b-a;
  float t=clamp(dot(p-a,v)/max(dot(v,v),0.0001),0.0,1.0);
  return 1.0-smoothstep(halfWidthM-0.06,halfWidthM+0.06,length(p-a-v*t));
}
float cbp060Quad(vec2 p, vec2 pa, vec2 pb, vec2 pc, vec2 pd) {
  vec2 a=cbp060DopPoint(pa),b=cbp060DopPoint(pb);
  vec2 c=cbp060DopPoint(pc),d=cbp060DopPoint(pd);
  return mod(cbp060Crossing(p,a,b)+cbp060Crossing(p,b,c)+
    cbp060Crossing(p,c,d)+cbp060Crossing(p,d,a),2.0);
}
vec3 commerzbankPodiumOfficial060(vec3 base, vec3 p, vec3 normal, vec4 frame, float family) {
  bool stoneFamily=abs(family-45200.0)<0.25;
  bool roofFamily=abs(family-45201.0)<0.25;
  bool photoFamily=abs(family-45202.0)<0.25;
  if (!(stoneFamily||roofFamily||photoFamily)) return base;
  if (roofFamily) {
    if (normal.y<0.55) return base;
    // Unresolved/shadowed small roof and thin roof returns stay neutral.
    vec3 roof=vec3(0.54,0.53,0.48);
    float planting=cbp060LongPlantField(frame.xy);
    roof=mix(roof,vec3(0.39,0.37,0.265),planting);
    float paths=0.0;
    paths=max(paths,cbp060Path(frame.xy,vec2(319.0,237.0),vec2(426.0,155.0),0.48));
    paths=max(paths,cbp060Path(frame.xy,vec2(366.0,316.0),vec2(506.0,269.0),0.36));
    paths=max(paths,cbp060Path(frame.xy,vec2(401.0,342.0),vec2(508.0,306.0),0.36));
    paths=max(paths,cbp060Path(frame.xy,vec2(430.0,387.0),vec2(530.0,353.0),0.36));
    paths=max(paths,cbp060Path(frame.xy,vec2(456.0,437.0),vec2(553.0,400.0),0.36));
    paths=max(paths,cbp060Path(frame.xy,vec2(481.0,479.0),vec2(575.0,447.0),0.36));
    paths=max(paths,cbp060Path(frame.xy,vec2(534.0,552.0),vec2(624.0,589.0),0.36));
    roof=mix(roof,vec3(0.68,0.67,0.60),paths*planting);
    // Two light DOP patches are colour regions, never invented box geometry.
    float lightPatch=max(
      cbp060Quad(frame.xy,vec2(412.0,207.0),vec2(465.0,196.0),vec2(484.0,246.0),vec2(430.0,261.0)),
      cbp060Quad(frame.xy,vec2(538.0,478.0),vec2(583.0,466.0),vec2(605.0,518.0),vec2(549.0,532.0)));
    return mix(roof,vec3(0.64,0.63,0.57),lightPatch*planting);
  }
  if (abs(normal.y)>0.05) return base;
  vec3 stone=vec3(0.755,0.735,0.685);
  if (stoneFamily) return stone;
  // Provider assigns 45202 to only the seven frozen bMiL polygon IDs.
  // These extra guards keep malformed/roof frames from becoming windows.
  bool photoNormal=(normal.x>0.2&&normal.z<0.1)||normal.z< -0.55;
  if (!photoNormal || abs(frame.z-20.615)>0.02 || frame.w<122.20 ||
      frame.x<86.919 || frame.x>122.204 || frame.y<-0.01 || frame.y>20.625) return base;
  // Photo-derived approximate bays, continuous around the curved street corner.
  // The five bands fit the official body; they are not surveyed opening geometry.
  float storey=20.615/5.0;
  float u=mod(frame.x-86.920265592,3.528231887);
  float v=mod(max(frame.y,0.0),storey);
  float aa=clamp(max(fwidth(frame.x),fwidth(frame.y)),0.008,0.10);
  float opening=cbp060Band(u,0.46,3.068231887,aa)*cbp060Band(v,0.48,storey-0.46,aa);
  vec3 glass=vec3(0.205,0.315,0.305);
  float upperReflection=cbp060Band(v,storey-1.10,storey-0.51,aa);
  glass=mix(glass,vec3(0.28,0.385,0.365),upperReflection*0.45);
  float thinFrame=1.0-cbp060Band(u,0.505,3.023231887,aa)*
    cbp060Band(v,0.525,storey-0.505,aa);
  float middleMullion=1.0-smoothstep(0.025,0.045,abs(u-1.764115944));
  glass=mix(glass,vec3(0.135,0.175,0.17),max(thinFrame,middleMullion)*0.72);
  return mix(stone,glass,opening);
}
`;
