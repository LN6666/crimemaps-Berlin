export const C372_FEATURE_GLSL=`
vec3 c372Corner(vec4 f){
 float fh=2.5;float row=floor(f.y/fh);float yy=mod(f.y,fh)-1.32;vec2 p=vec2(f.x,yy);bool arch=row==3.;
 vec3 c=vec3(.88,.83,.67);float outw=arch?c361arch(p,.91,-.85,.10):c361rect(p,vec2(.91,.90));float inw=arch?c361arch(p,.72,-.72,.10):c361rect(p,vec2(.72,.73));
 c=mix(c,vec3(.94,.91,.83),outw);c=mix(c,vec3(.25,.34,.36),inw);float bars=max(c361rect(p,vec2(.035,1.)),c361rect(vec2(p.x,p.y-.20),vec2(.8,.035)));c=mix(c,vec3(.92,.91,.85),bars*inw);
 float band=1.-smoothstep(.04,.10,abs(mod(f.y,fh)-.12));return mix(c,vec3(.76,.74,.65),band*.65);
}`;
