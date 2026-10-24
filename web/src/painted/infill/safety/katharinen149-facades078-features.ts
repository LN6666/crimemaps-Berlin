/** Zeil127 own architect/owner/BNP photographs. Seven structural northfront
 * bays, three upper storeys and alternating narrow opening leaves; heights
 * and fenestration offsets are explicit photographic proportions, not GML
 * measurements. Church-side opening stations remain unknown: only the
 * photographed material section/rails are restored there. No rear grid.
 */
export const KATHARINEN149_FACADES_GLSL078=`
float k149f078Rect(vec2 q,vec2 a,vec2 b){vec2 w=max(fwidth(q)*.75,vec2(.008));return smoothstep(a-w,a+w,q).x*(1.-smoothstep(b-w,b+w,q).x)*smoothstep(a-w,a+w,q).y*(1.-smoothstep(b-w,b+w,q).y);}
float k149f078Stroke(float q,float center,float width){float d=abs(q-center);return 1.-smoothstep(width,width+max(fwidth(q),.008),d);}
vec3 k149f078Glass(float y){return mix(vec3(.43,.54,.51),vec3(.60,.68,.65),clamp(y/19.,0.,1.));}
vec3 k149f078FloorSection(vec3 c,vec2 q){
 for(int r=0;r<3;r++){float y=4.15+4.30*float(r);float sp=k149f078Rect(q,vec2(-1.,y+.10),vec2(30.,y+.87));c=mix(c,vec3(.75,.79,.75),sp*.92);float rail=k149f078Stroke(q.y,y,.095);float shade=k149f078Stroke(q.y,y-.13,.035);c=mix(c,vec3(.38,.42,.40),shade*.5);c=mix(c,vec3(.76,.79,.76),rail);}
 return c;
}
vec3 katharinen149Facades078(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(normal.y)>.02)return base;
 vec2 q=frame.xy;float L=frame.z;
 if(q.x<-.12||q.x>L+.12||q.y<-.02||q.y>18.93)return base;
 if(abs(family-45460.)<.25){
  vec3 c=k149f078FloorSection(k149f078Glass(q.y),q);float pitch=L/7.;
  // Eight observed posts delimit seven northfront bays. Each bay has a
  // secondary glass division; upper narrow leaves alternate left/right/left.
  for(int j=0;j<8;j++){float u=float(j)*pitch;float shadow=k149f078Stroke(q.x,u+.095,.025);float post=k149f078Stroke(q.x,u,.065);c=mix(c,vec3(.29,.35,.32),shadow*.4);c=mix(c,vec3(.77,.80,.77),post);}
  for(int j=0;j<7;j++){
   float u=float(j)*pitch;float mullion=k149f078Stroke(q.x,u+pitch*.55,.018);c=mix(c,vec3(.66,.72,.68),mullion*.85);
   for(int r=0;r<3;r++){
    float y=4.15+4.30*float(r);float center=u+pitch*(r==1?.77:.23);
    vec2 a=vec2(center-.36,y+1.10),b=vec2(center+.36,y+3.36);
    float outer=k149f078Rect(q,a-vec2(.055),b+vec2(.055)),inner=k149f078Rect(q,a,b);
    c=mix(c,vec3(.23,.29,.27),outer);c=mix(c,k149f078Glass(q.y)*.80,inner);
   }
  }
  // Two photographically identified ground entrances, with glass retained
  // elsewhere. These are material door frames, not new geometric openings.
  for(int d=0;d<2;d++){
   float a=d==0?3.88:22.10,b=d==0?6.62:24.38;
   float outer=k149f078Rect(q,vec2(a-.07,.08),vec2(b+.07,3.83));
   float inner=k149f078Rect(q,vec2(a,.16),vec2(b,3.74));
   c=mix(c,vec3(.65,.71,.68),outer);c=mix(c,vec3(.29,.40,.37),inner);
   c=mix(c,vec3(.68,.73,.70),k149f078Stroke(q.x,(a+b)*.5,.025)*inner);
  }
  c=mix(c,vec3(.76,.79,.75),k149f078Stroke(q.y,4.15,.12));return c;
 }
 if(abs(family-45461.)<.25){
  if(q.y<17.05)return base;
  vec3 c=k149f078Glass(q.y);float rails=max(k149f078Stroke(q.y,17.14,.045),k149f078Stroke(q.y,18.80,.065));
  return mix(c,vec3(.77,.80,.77),rails);
 }
 if(abs(family-45462.)<.25){
  // The side photographs establish material layers and floor rails but do
  // not resolve a full registered count of side bays or door stations.
  vec3 c=k149f078FloorSection(k149f078Glass(q.y),q);
  float blind=(1.-smoothstep(.010,.025,abs(fract(q.x/.11+.5)-.5)*.11))*.055;
  c+=vec3(blind)*step(4.25,q.y);return c;
 }
 return base;
}
`;
