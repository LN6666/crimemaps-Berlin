export const F128_ROOF_GLSL=`
vec3 wallrafRoof128(vec3 base,vec3 p,vec3 n,vec4 frame,float family){
 if(abs(family-6405.)>.25||n.y<.99)return base;
 // Concrete manufactured-stone roof cladding documented by Stadt Koeln2022.
 // One-metre seam spacing is an explicit display estimate, not a measured slab survey.
 vec2 cell=fract(frame.xy);float edge=min(min(cell.x,1.-cell.x),min(cell.y,1.-cell.y));
 float seam=1.-smoothstep(.008,.021,edge);float grain=.012*sin(frame.x*17.1+frame.y*11.7)*sin(frame.y*13.3);
 return mix(vec3(.64,.63,.59)+grain,vec3(.46,.46,.44),seam*.7);
}
`;
