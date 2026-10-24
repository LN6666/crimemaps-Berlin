export const BREMEN_FLEMINGS70_GLSL=String.raw`
float bfl70line(float x,float w){return 1.-smoothstep(w,w+max(fwidth(x),.012),abs(x));}
vec3 bfl70stone(float s,float y){vec3 c=vec3(.805,.775,.68);float joints=max(bfl70line(mod(s,1.35)-.675,.012),bfl70line(mod(y,.72)-.36,.009));c*=1.-joints*.17;c+=vec3(.012)*sin(s*.9+y*.8);return c;}
void bfl70window(inout vec3 c,float s,float y,float halfw,float low,float high,float rail){
 float sd=max(abs(s)-halfw,max(low-y,y-high));float aa=max(max(fwidth(s),fwidth(y)),.022);float inside=1.-smoothstep(-aa,aa,sd+.075);vec3 glass=mix(vec3(.15,.21,.23),vec3(.34,.43,.46),clamp((y-low)/max(high-low,.1),0.,1.));
 float curtain=step(halfw*.7,abs(s));glass=mix(glass,vec3(.59,.57,.49),curtain*.46);float mullion=bfl70line(s,.03);glass=mix(glass,vec3(.16,.19,.19),mullion);c=mix(c,glass,inside);float outline=1.-smoothstep(.025,.08+aa,abs(sd));c=mix(c,vec3(.24,.225,.19),outline*.87);
 if(rail>.5&&y>low-.03&&y<low+.83&&abs(s)<halfw+.08){float baluster=bfl70line(mod(s,.16)-.08,.009);float bars=max(baluster,bfl70line(y-(low+.80),.026));c=mix(c,vec3(.14,.17,.17),bars*.95);}
}
vec3 bremenFlemings70Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float s=frame.x,y=frame.y;
 if(family==46071.){vec3 c=vec3(.51,.535,.515);float seam=max(bfl70line(mod(p.x,1.05)-.525,.01),bfl70line(mod(p.z,1.5)-.75,.01));return c*(1.-seam*.12);}
 if(family==46074.)return vec3(.75,.755,.70);
 vec3 c=bfl70stone(s,y);float q=mod(s+1.8,3.6)-1.8;
 if(y>=17.55&&y<19.25){c=vec3(.30,.355,.335);float slat=bfl70line(mod(s,.30)-.15,.045);c=mix(c,vec3(.67,.685,.62),slat*.7);float mullion=bfl70line(q,.09);return mix(c,vec3(.76,.75,.67),mullion);}
 if(y>=8.5&&y<17.55){float floorY=floor((y-8.5)/3.0)*3.+8.5;bfl70window(c,q,y,.72,floorY+.23,floorY+2.71,1.);return c;}
 if(y<8.5){
  if(family==46070.){
   float lobby=mod(s+3.6,7.2)-3.6;bfl70window(c,lobby,y,2.48,.42,8.12,0.);if(abs(lobby)<2.38&&y>.52&&y<8.02){float transom=max(bfl70line(y-3.62,.22),bfl70line(y-5.40,.13));c=mix(c,vec3(.29,.30,.275),transom*.8);float split=bfl70line(lobby,.065);c=mix(c,vec3(.27,.275,.25),split);}
   if(abs(lobby)>2.6){float lamp=bfl70line(abs(lobby)-2.91,.11)*bfl70line(y-4.1,.17);c=mix(c,vec3(.27,.26,.21),lamp);}
  }else{float fy=floor(y/4.25)*4.25;bfl70window(c,q,y,.86,fy+.43,fy+3.58,0.);}
 }
 return c;
}
`;
