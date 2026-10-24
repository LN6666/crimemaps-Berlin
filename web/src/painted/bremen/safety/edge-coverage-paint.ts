export const EDGE_COVERAGE_GLSL=String.raw`
float ec70line(float x,float w){return 1.-smoothstep(w,w+max(fwidth(x),.012),abs(x));}
float ec70rect(float s,float y,float w,float lo,float hi){float d=max(abs(s)-w,max(lo-y,y-hi));return 1.-smoothstep(-.025,.025+max(fwidth(s),fwidth(y)),d);}
vec3 edgeCoveragePaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float s=frame.x,y=frame.y;
 if(family==46941.){float seam=max(ec70line(mod(p.x,1.25)-.625,.012),ec70line(mod(p.z,1.7)-.85,.012));return vec3(.44,.45,.42)*(1.-.12*seam);}
 if(family==46940.){
  vec3 c=vec3(.60,.365,.335);float pitch=frame.z<.5?4.45:4.85,q=mod(s,pitch)-pitch*.5;
  float horizontalStone=ec70line(mod(y,.65)-.325,.008),verticalStone=ec70line(mod(s,.90)-.45,.009);c*=1.-.10*max(horizontalStone,verticalStone);
  float fy=y<4.?0.:floor((y-4.)/3.8)*3.8+4.;float lo=y<4.?.18:fy+.36,hi=y<4.?3.72:fy+3.40,hw=y<4.?pitch*.45:1.46;
  float aperture=ec70rect(q,y,hw,lo,hi);vec3 glass=mix(vec3(.15,.225,.23),vec3(.32,.40,.39),clamp((y-lo)/max(hi-lo,.1),0.,1.));
  c=mix(c,glass,aperture);float jamb=ec70line(abs(q)-hw,.04)*step(lo,y)*step(y,hi);float lintel=max(ec70line(y-lo,.038),ec70line(y-hi,.038))*step(abs(q),hw);
  float mull=max(ec70line(q-.48,.027),ec70line(q+.48,.027));c=mix(c,vec3(.30,.335,.32),max(jamb,lintel));c=mix(c,vec3(.27,.305,.29),mull*aperture);
  if(y<4.){float column=ec70line(abs(q)-pitch*.5,.11);c=mix(c,vec3(.61,.54,.36),column);float door=ec70line(y-2.72,.025)*aperture;c=mix(c,vec3(.42,.43,.37),door);}
  return c;
 }
 if(family==46942.){
  // Contractor photographs show matte cobalt dry paving, grass islands and a pale sand end patch; this is not water.
  vec2 uv=vec2(dot(p.xz,vec2(.7731544332,-.6342178036)),dot(p.xz,vec2(.6342178036,.7731544332)));uv=(uv-vec2(-19.30670145,-8.31386035))/vec2(38.38682435,16.81225551);
  vec2 a=(uv-vec2(.48,.48))/vec2(.27,.25),b=(uv-vec2(.66,.61))/vec2(.13,.22),c=(uv-vec2(.29,.36))/vec2(.13,.19);float island=min(length(a)-1.,min(length(b)-1.,length(c)-1.));
  float green=1.-smoothstep(-.015,.015,island);float edge=1.-smoothstep(.035,.08,abs(island));vec3 result=mix(vec3(.035,.37,.67),vec3(.32,.40,.20),green);result=mix(result,vec3(.26,.28,.23),edge);
  float sand=length((uv-vec2(.08,.72))/vec2(.15,.37))-1.;float sandMask=1.-smoothstep(-.015,.015,sand);result=mix(result,vec3(.66,.62,.47),sandMask);float curb=1.-smoothstep(.02,.055,abs(sand));return mix(result,vec3(.55,.53,.44),curb);
 }
 return base;
}
`;
