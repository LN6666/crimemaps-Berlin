export const OWNER_F147_PAINT_GLSL=`
float lh147Box(vec2 q,vec2 h){vec2 d=abs(q)-h;return 1.-smoothstep(-.025,.025,max(d.x,d.y));}
float lh147Line(float x,float w){return 1.-smoothstep(w,w+max(fwidth(x),.015),abs(x));}
float lh147Arch(vec2 q,float w,float bottom,float spring){return step(bottom,q.y)*step(abs(q.x),w)*step(q.y,spring+sqrt(max(0.,w*w-q.x*q.x)));}
vec3 liebieghausRecovery155(vec3 base,vec3 p,vec3 normal,vec4 f,float family){float u=f.x,y=f.y,v=f.z,k=f.w;vec3 wall=vec3(.79,.73,.57),stone=vec3(.52,.54,.49),glass=vec3(.20,.28,.28);if(k<.5){
 if(u> -33.5&&u<24.8){float glazing=step(-4.7,y)*(1.-step(.8,y))*step(-31.,u)*(1.-step(22.,u));float seam=max(lh147Line(mod(u+31.,2.)-1.,.035),lh147Line(mod(y+4.7,1.7)-.85,.035));return mix(vec3(.46,.49,.46),mix(vec3(.47,.59,.60),vec3(.26,.32,.32),seam*.8),glazing);}
 if(u>=24.8)return vec3(.42,.44,.40);float course=lh147Line(mod(y,.42)-.21,.02);return mix(vec3(.25,.28,.29),vec3(.15,.19,.20),course*.28);}
 vec3 c=mix(wall,vec3(.51,.53,.47),step(y,1.));c=mix(c,stone,lh147Line(y-1.0,.10)*.5);
 if(k>1.5&&k<2.5){for(int j=0;j<5;j++){float x=u-(4.3+float(j)*4.25);float surround=lh147Arch(vec2(x,y),1.32,1.3,4.1),inside=lh147Arch(vec2(x,y),1.08,1.5,4.1);c=mix(c,stone,surround);c=mix(c,glass,inside);float bars=max(lh147Line(x,.035),lh147Line(y-3.2,.035));c=mix(c,vec3(.77,.79,.71),bars*inside);}return c;}
 if(k>2.5&&k<3.5){
  // Street corner: blind sculpture niche, fluted giant pilasters and festoon; no false glazed window.
  for(int j=0;j<4;j++){float x=u-(25.5+float(j)*3.15);float col=lh147Box(vec2(x,y-6.4),vec2(.30,5.0)),flute=lh147Line(mod(x,.12)-.06,.018);c=mix(c,mix(stone,vec3(.72,.73,.65),flute*.65),col);c=mix(c,stone,lh147Box(vec2(x,y-11.3),vec2(.46,.30)));}
  vec2 q=vec2(u-30.4,y);float niche=lh147Arch(q,1.35,1.7,7.3);c=mix(c,vec3(.59,.57,.45),niche);float rim=lh147Arch(q,1.5,1.5,7.3)-niche;c=mix(c,vec3(.68,.65,.53),rim);
  float statue=max(lh147Box(q-vec2(0.,6.2),vec2(.33,1.25)),1.-smoothstep(.34,.43,length(q-vec2(0.,7.9))));c=mix(c,vec3(.70,.67,.54),statue);c=mix(c,stone,lh147Box(q-vec2(0.,3.7),vec2(.65,.35)));
  float swag=lh147Line(y-(10.5-.6*(1.-pow(clamp(abs(q.x)/2.5,0.,1.),2.))),.08)*step(abs(q.x),2.5);c=mix(c,stone,swag);return mix(c,stone,max(lh147Line(y-11.6,.18),lh147Line(y-12.1,.12)));}
 if(k>3.5&&k<4.5){
  // Southwestern garden entrance pavilion: floor-reaching door and slender stacked side lights.
  float x=u+36.7;float arch=lh147Arch(vec2(x,y),1.15,.05,3.7);c=mix(c,stone,lh147Arch(vec2(x,y),1.38,0.,3.7));c=mix(c,glass,arch);c=mix(c,vec3(.83,.83,.75),lh147Line(x,.04)*arch);
  for(int j=0;j<2;j++){float side=j==0?-2.05:2.05;for(int r=0;r<2;r++){vec2 q=vec2(x-side,y-(r==0?3.1:8.8));float rim=lh147Box(q,vec2(.56,r==0?2.0:1.15)),hole=lh147Box(q,vec2(.40,r==0?1.84:1.0));c=mix(c,stone,rim);c=mix(c,glass,hole);c=mix(c,vec3(.82,.83,.74),lh147Line(q.y,.03)*hole);}}
  for(int j=0;j<2;j++){float side=j==0?-3.0:3.0;float col=lh147Box(vec2(x-side,y-5.8),vec2(.37,5.1));float fl=lh147Line(mod(x-side,.13)-.065,.018);c=mix(c,mix(stone,vec3(.69,.70,.61),fl*.55),col);c=mix(c,stone,lh147Box(vec2(x-side,y-10.8),vec2(.51,.28)));}return c;}
 if(k>4.5){
  // Modern garden return is opaque light stone panelling, not an invented glass/window grid.
  float vertical=lh147Line(mod(u+31.,3.5)-1.75,.055),horizontal=lh147Line(y-3.6,.055);c=mix(vec3(.76,.77,.68),vec3(.55,.55,.46),max(vertical,horizontal)*.5);return mix(c,vec3(.22,.27,.26),lh147Line(y-7.1,.28));}
 return c;
}

`;
