export const BREMEN_RADSTATION70_GLSL=String.raw`
float brad70line(float q,float w){return 1.-smoothstep(w,w+max(fwidth(q),.012),abs(q));}
vec3 bremenRadstation70Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float s=frame.x,y=frame.y;
 if(family==46081.){vec3 roof=vec3(.31,.34,.325);float seam=max(brad70line(mod(p.x,1.3)-.65,.01),brad70line(mod(p.z,1.3)-.65,.01));return roof*(1.-seam*.11);}
 if(family==46084.){vec3 concrete=vec3(.73,.75,.71);float joint=brad70line(mod(y,.72)-.36,.009);return concrete*(1.-joint*.08);}
 if(family==46085.){vec3 stone=vec3(.63,.655,.625);float edge=brad70line(mod(y,.16)-.005,.009);return stone*(1.-edge*.14);}
 if(family==46086.)return vec3(.14,.18,.18);
 if(family==46080.){
  vec3 red=vec3(.49,.225,.26);float joint=max(brad70line(mod(s,2.2)-1.1,.014),brad70line(mod(y-.02,.94)-.47,.012));red*=1.-joint*.20;
  if(frame.z<.5&&abs(s)<7.02&&y>9.48&&y<11.13){red=mix(vec3(.27,.38,.43),vec3(.45,.55,.575),clamp((y-9.48)/1.65,0.,1.));float vertical=brad70line(mod(s+.1,2.25)-1.125,.05);float border=max(brad70line(abs(s)-7.02,.10),max(brad70line(y-9.48,.065),brad70line(y-11.13,.065)));red=mix(red,vec3(.12,.17,.19),max(vertical,border));}
  return red;
 }
 if(family==46082.){
  vec3 glass=mix(vec3(.16,.24,.265),vec3(.34,.45,.48),clamp(y/8.,0.,1.));glass+=vec3(.016)*sin(s*.7-y*.5);float mullion=brad70line(mod(s+2.5,5.)-2.5,.055);float beam=max(brad70line(y-4.,.14),brad70line(y-7.96,.11));glass=mix(glass,vec3(.13,.18,.19),max(mullion,beam));
  if(frame.z<.5){float blind=max(step(2.65,y)*step(y,3.94),step(6.25,y)*step(y,7.82));vec3 shade=vec3(.83,.845,.81);shade*=1.-brad70line(mod(y,.065)-.0325,.005)*.07;glass=mix(glass,shade,blind*(1.-mullion));}
  return glass;
 }
 // Two-storey rear hall: dark steel framing and glazed panels; bicycle silhouettes remain restrained.
 vec3 glass=vec3(.33,.425,.43)+vec3(.025)*sin(s*.27+y*.9);float fy=mod(y,3.395);float q=mod(s+1.05,2.1)-1.05;
 float wheel=min(abs(length(vec2(q-.54,fy-.92))-.34),abs(length(vec2(q+.54,fy-.92))-.34));float cycle=1.-smoothstep(.014,.035+max(fwidth(s),fwidth(y)),wheel);
 float tube=max(brad70line(fy-(.92+.5*(q+.54)),.014)*step(-.54,q)*step(q,.3),brad70line(fy-(.92-.5*(q-.54)),.014)*step(-.3,q)*step(q,.54));glass=mix(glass,vec3(.65,.69,.66),max(cycle,tube)*.48);
 float frameSteel=max(brad70line(mod(s,.98)-.49,.035),max(brad70line(y-3.395,.09),max(brad70line(y-.12,.10),brad70line(y-6.65,.11))));glass=mix(glass,vec3(.13,.19,.20),frameSteel);
 return glass;
}
`;
