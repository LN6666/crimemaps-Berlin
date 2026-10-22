export const F023_PERGOLA_GLSL=`
vec3 schoenhausenPergola023(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6391.0)>.25)return base;
 float grain=sin(p.x*31.0+p.z*17.0)*sin(p.y*43.0+p.x*7.0);
 return base*(1.0+(frame.z<1.5?.022:.008)*grain);
}`;
