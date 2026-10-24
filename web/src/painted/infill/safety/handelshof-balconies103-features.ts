import {INFILL_C032_OFFICIAL_GLSL} from './infill-c032-official-features';
/** Independent private programme; original C032 programmes and base dispatch remain unchanged. */
export const HANDELSHOF_BALCONIES103_GLSL=INFILL_C032_OFFICIAL_GLSL+`
float handelshof103Line(float x,float halfWidth){float a=max(fwidth(x),.012);return 1.-smoothstep(halfWidth-a,halfWidth+a,abs(x));}
vec3 handelshofBalconies103Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-45530.)>.25||abs(frame.w-103.)>.1)return base;
 vec3 c=infillC032OfficialPaint(base,p,normal,frame,26103.);
 float u=frame.x,y=frame.y;
 // Two photograph-visible short south-front balconies, not a repeated facade template.
 float start=u<28.?8.4:38.;float finish=start+10.4;
 if(u<start-.12||u>finish+.12||y<18.08||y>19.60)return c;
 float along=step(start,u)*step(u,finish);
 float stone=along*step(18.20,y)*step(y,18.45);
 vec3 paleStone=vec3(.77,.74,.66);
 c=mix(c,paleStone,stone*.83);
 float lowerShadow=along*handelshof103Line(y-18.18,.045);
 c*=1.-lowerShadow*.16;
 float uprights=handelshof103Line(mod(u-start,.34)-.17,.021)*step(18.45,y)*step(y,19.50);
 float ends=max(handelshof103Line(u-start,.031),handelshof103Line(u-finish,.031))*step(18.45,y)*step(y,19.50);
 float rails=max(handelshof103Line(y-18.47,.039),handelshof103Line(y-19.50,.046));
 float paleRail=max(max(uprights,ends),rails)*along;
 c=mix(c,vec3(.83,.83,.76),paleRail*.95);
 return c;
}
`;
