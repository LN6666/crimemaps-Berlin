/** Append after unchanged073+084 only in their existing private partition. */
export const FRA145_RETURN087_GLSL=String.raw`
float vb087Rect(vec2 q,vec2 a,vec2 b){vec2 w=max(fwidth(q)*.75,vec2(.008));return smoothstep(a.x-w.x,a.x+w.x,q.x)*(1.-smoothstep(b.x-w.x,b.x+w.x,q.x))*smoothstep(a.y-w.y,a.y+w.y,q.y)*(1.-smoothstep(b.y-w.y,b.y+w.y,q.y));}
float vb087Edge(float x,float at,float width){return 1.-smoothstep(width,width+max(fwidth(x),.008),abs(x-at));}
vec3 vb087Window(vec3 wall,vec2 q,vec2 a,vec2 b,bool narrow){
 float reveal=vb087Rect(q,a-vec2(.10),b+vec2(.10)),glass=vb087Rect(q,a,b);
 vec3 c=mix(wall,vec3(.25,.28,.26),reveal);
 vec3 g=mix(vec3(.31,.40,.37),vec3(.43,.49,.45),clamp(q.y/30.051,0.,1.));
 if(narrow){float blinds=1.-smoothstep(.018,.045,abs(mod(q.y-a.y+.075,.15)-.075));g=mix(g,vec3(.61,.64,.59),blinds*.32);}
 else{float third=(b.x-a.x)/3.;float mull=max(vb087Edge(q.x,a.x+third,.023),vb087Edge(q.x,a.x+third*2.,.023));g=mix(g,vec3(.21,.26,.24),mull);float rail=vb087Edge(q.y,a.y+.20,.035);g=mix(g,vec3(.46,.50,.46),rail*.65);}
 return mix(c,g,glass);
}
vec3 fra145ReturnDetail087(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 bool narrow=abs(frame.w-87.)<.01,wide=abs(frame.w-88.)<.01;
 if(abs(family-45357.)>.1||(!narrow&&!wide))return base;
 vec2 expected=narrow?vec2(.23089552,.97297855):vec2(.24000421,.97077185);
 if(dot(normal.xz,expected)<.999)return base;
 float width=narrow?3.37485616956:6.02972323782;vec2 q=frame.xy;
 if(q.x<-.001||q.x>width+.001||q.y<0.||q.y>30.052)return base;
 vec2 xr=narrow?vec2(.24,.76)*width:vec2(.18,.82)*width;
 vec3 c=base;
 // Six explicitly observed rows in these two bays; no periodic facade transfer.
 for(int j=0;j<6;j++){float h=5.9+3.7*float(j);c=vb087Window(c,q,vec2(xr.x,h-1.3),vec2(xr.y,h+1.3),narrow);}
 float outer=vb087Rect(q,vec2(xr.x-.10,26.6),vec2(xr.y+.10,29.1));
 float grille=vb087Rect(q,vec2(xr.x,26.7),vec2(xr.y,29.0));
 c=mix(c,vec3(.28,.30,.28),outer);float slat=1.-smoothstep(.017,.039,abs(mod(q.y-26.7+.075,.15)-.075));
 c=mix(c,mix(vec3(.12,.17,.16),vec3(.28,.32,.29),slat*.65),grille);
 // The narrow bottom leaf is visible. The wide bay's ground opening is unknown.
 if(narrow){float reveal=vb087Rect(q,vec2(xr.x-.10,.15),vec2(xr.y+.10,3.7));c=mix(c,vec3(.25,.28,.26),reveal);float leaf=vb087Rect(q,vec2(xr.x+.06,.31),vec2(xr.y-.06,3.54));c=mix(c,vec3(.40,.45,.42),leaf*.55);float head=vb087Edge(q.y,3.12,.025);c=mix(c,vec3(.26,.30,.27),leaf*head);}
 return c;
}
vec3 frankfurtGroups144146WithReturn087(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return fra145ReturnDetail087(frankfurtGroups144146Official073(base,p,normal,frame,family),p,normal,frame,family);}
`;
/** Foreign programmes recover their exact previous source, including old shared
 * owner branches which retain independent sources after replacing dispatch. */
export function fra145Return087PartitionSource(source:string,key:string,city:string){
 if(city==='frankfurt'&&key==='infill-frankfurt-groups144146-official073')return source;
 const scoped=source.replace(FRA145_RETURN087_GLSL,'').replaceAll('frankfurtGroups144146WithReturn087(base,p,normal,frame,family)','frankfurtGroups144146Official073(base,p,normal,frame,family)');
 if(/\b(?:vb087\w*|fra145ReturnDetail087|frankfurtGroups144146WithReturn087)\s*\(/.test(scoped))throw Error('FRA145 return087 source/call leaked outside private073 partition');
 return scoped;
}
