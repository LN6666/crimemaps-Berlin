export const C363_FEATURE_GLSL=`
vec3 c363Georgianum(vec3 base,vec4 f,float family){
 if(family==13760.)return vec3(.87,.86,.79);
 if(family==13761.)return vec3(.54,.25,.16);
 // Photograph supports only the west square-facing elevation here.
 // Native height is compressed; vertical composition is normalized explicitly.
 float y=f.y/max(f.w,.1);float bay=mod(f.x+34.,3.6)-1.8;
 vec3 c=vec3(.87,.86,.79);
 float low=c361rect(vec2(bay,(y-.16)*18.),vec2(.48,.95));
 float mid=c361arch(vec2(bay,(y-.45)*18.),.68,-1.35,.75);
 float upper=c361arch(vec2(bay,(y-.77)*18.),.62,-1.25,.6);
 float outer=max(low,max(mid,upper));c=mix(c,vec3(.61,.62,.56),outer);
 float ilow=c361rect(vec2(bay,(y-.16)*18.),vec2(.36,.80));
 float imid=c361arch(vec2(bay,(y-.45)*18.),.53,-1.22,.75);
 float iupper=c361arch(vec2(bay,(y-.77)*18.),.47,-1.12,.6);
 float inside=max(ilow,max(imid,iupper));c=mix(c,vec3(.22,.29,.29),inside);
 float band=max(1.-smoothstep(.007,.018,abs(y-.31)),max(1.-smoothstep(.007,.018,abs(y-.62)),1.-smoothstep(.008,.022,abs(y-.96))));
 c=mix(c,vec3(.94,.92,.84),band*.85);return c;
}`;
