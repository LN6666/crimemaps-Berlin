/** Original group-specific DOP roof regions; unknown walls keep their native RGB.
 * All roofs use one metric East/North reference, independent of carrier origin.
 * No generic window grid, new equipment box or artificial courtyard floor. */
export const FRA149_OFFICIAL_GLSL070=`
float k149070Line(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/max(dot(d,d),.000001),0.,1.));}
vec3 katharinenEast149Official070(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-45342.)<.25)return base;
 if(abs(family-45341.)<.25)return base;
 if(abs(family-45340.)>.25)return base;
 vec3 c=base;
 // Only high service roofs receive the pale inspection band visible in the
 // bounded DOP. These lines are registered source-specific metre coordinates.
 if(frame.z>117.&&normal.y>.95){
  vec2 q=frame.xy;float d=10000.;
  d=min(d,k149070Line(q,vec2(-15.50151366,17.18775709),vec2(-12.78883800,4.27467016)));
  d=min(d,k149070Line(q,vec2(-12.78883800,4.27467016),vec2(-9.79061754,1.15772283)));
  d=min(d,k149070Line(q,vec2(-0.86734235,-0.62338911),vec2(18.54970446,8.72745523)));
  d=min(d,k149070Line(q,vec2(-15.14458265,16.74247771),vec2(4.84355377,25.09147228)));
  float band=1.-smoothstep(.35,.60,d);
  c=mix(c,vec3(.76,.75,.68),band);
 }
 return c;
}
`;
