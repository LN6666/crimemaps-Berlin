export const C371_FEATURE_GLSL=`
vec3 c371Gable(vec4 f,float family){
 vec3 c=vec3(.86,.84,.76);if(family==13794.)return c;
 vec2 p=vec2(f.x,f.y-1.8);
 float outer=c361arch(p,.78,-.85,.25);float inner=c361arch(p,.61,-.71,.25);
 c=mix(c,vec3(.95,.93,.85),outer);c=mix(c,vec3(.23,.30,.32),inner);
 float bars=max(c361rect(p,vec2(.035,1.1)),c361rect(vec2(p.x,p.y-.05),vec2(.65,.035)));c=mix(c,vec3(.93,.91,.84),bars*inner);
 float base=1.-smoothstep(.04,.10,abs(f.y-.13));return mix(c,vec3(.72,.70,.62),base*.6);
}`;
