export const OMNITURM_GLSL=`
float omni050Line(float p,float pitch,float width){float d=abs(mod(p+.5*pitch,pitch)-.5*pitch);return 1.-smoothstep(width,width+max(fwidth(p),.014),d);}
vec3 omniturm050(vec3 base,vec3 p,vec3 n,vec4 f,float family){
 if(family>45050.5){float seam=max(omni050Line(f.x,2.7,.009),omni050Line(f.z,2.7,.009));return mix(vec3(.25,.29,.29),vec3(.19,.23,.23),seam*.35);}
 vec2 a=vec2(.855,-.518),b=vec2(.518,.855);float u=abs(dot(n.xz,a))>abs(dot(n.xz,b))?dot(f.xz,b):dot(f.xz,a);
 // Own photographed metal-and-glass wall: narrow mullions, pronounced dark slab rails.
 float y=f.y;float floorPitch=y<15.?7.5:y<70.?55./13.:y<100.?3.75:80./21.;float yy=y<15.?y:y<70.?y-15.:y<100.?y-70.:y-100.;
 float floorRail=omni050Line(yy,floorPitch,.12),post=omni050Line(u,1.35,.026),fineTransom=omni050Line(yy-.32,floorPitch,.018);
 vec3 glass=mix(vec3(.27,.40,.46),vec3(.39,.51,.55),.38+.12*sin(f.y*.031+u*.13));
 float spandrel=1.-smoothstep(.46,.62,mod(yy,floorPitch));glass=mix(glass,vec3(.18,.24,.28),spandrel*.72);
 glass=mix(glass,vec3(.115,.145,.16),max(floorRail,post));glass=mix(glass,vec3(.51,.58,.59),fineTransom*.4);
 if(y>=180.){float louver=omni050Line(y, .30,.035);glass=mix(vec3(.23,.29,.31),vec3(.14,.20,.22),louver*.5);glass=mix(glass,vec3(.14,.17,.18),post);}
 return glass;
}
`;
