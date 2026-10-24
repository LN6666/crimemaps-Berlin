export const BREMEN_OLDTOWN_EXTRA4_GLSL=`
float bx4Line(float d,float w){float a=max(fwidth(d),.015);return 1.-smoothstep(max(0.,w-a*.5),w+a*.5,abs(d));}
float bx4Repeat(float x,float pitch,float w){float a=max(fwidth(x)/pitch,.00001),h=w/pitch,d=abs(fract(x/pitch)-.5);return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h,0.,1.),smoothstep(.2,.7,a));}
float bx4Box(vec2 uv,vec2 c,vec2 h){vec2 a=max(fwidth(uv),vec2(.015)),v=1.-smoothstep(h-a*.5,h+a*.5,abs(uv-c));return v.x*v.y;}
vec3 infillBremenOldtownExtra4Paint(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 float u=f.x,y=f.y,W=max(f.w,1.);vec2 uv=f.xy;vec3 c=base;
 if(family==46161.||family==46181.||family==46191.)return c*(1.-.06*bx4Repeat(u,1.8,.018));
 if(family==46171.)return c*(1.-.12*bx4Repeat(u,.58,.018));
 if(family==46164.)return c*(1.-.08*max(bx4Repeat(y,.18,.009),bx4Repeat(u+floor(y/.18)*.18,.36,.009)));
 if(family==46172.||family==46190.)return c*(1.-.12*max(bx4Repeat(y,.09,.006),bx4Repeat(u+floor(y/.09)*.12,.24,.006)));
 if(family==46180.){
  // Coarse visible horizontal material divisions only. No unsupported classroom window grid.
  return c*(1.-.08*bx4Repeat(y,3.55,.045));
 }
 if(family==46160.){
  // The tuff-clad historic store part has monumental vertical slots; rear brown parts use46164.
  float q=mod(u+1.65,3.3)-1.65;
  float slots=bx4Box(vec2(q,y),vec2(0.,8.8),vec2(.73,5.4));
  float reveal=bx4Box(vec2(q,y),vec2(0.,8.8),vec2(.84,5.52))-slots;c=mix(c,c*.68,max(0.,reveal));
  vec3 trim=vec3(.73,.74,.69),glass=vec3(.35,.40,.39);float mull=max(bx4Line(q,.035),bx4Repeat(y,2.7,.038));glass=mix(glass,trim,mull*.87);c=mix(c,glass,slots);
  float cornice=bx4Line(y-15.0,.17);c=mix(c,vec3(.46,.41,.33),cornice);
  float square=bx4Box(vec2(q,y),vec2(0.,17.1),vec2(.44,.51));c=mix(c,vec3(.25,.29,.28),square);
  float attic=step(19.1,y)*step(y,20.1);c=mix(c,mix(vec3(.42,.48,.47),vec3(.86,.86,.79),bx4Repeat(u,1.25,.045)),attic*.94);
  float retail=bx4Box(vec2(q,y),vec2(0.,1.45),vec2(1.10,1.35));c=mix(c,mix(vec3(.20,.25,.25),trim,bx4Line(q,.045)),retail);
  float stone=max(bx4Repeat(y,.62,.009),bx4Repeat(u+floor(y/.62)*.58,1.16,.009));return c*(1.-stone*.07);
 }
 if(family==46170.){
  c*=1.-.11*max(bx4Repeat(y,.085,.0055),bx4Repeat(u+floor(y/.085)*.12,.24,.0055));
  // Source-specific five-field concert-house front; graphic relief remains solid brick.
  float lane=W/5.,q=mod(u+lane*.5,lane)-lane*.5;float field=floor(u/lane);float top=field<1.||field>3.?22.:field<2.||field>2.?26.:30.3;
  float band=bx4Line(abs(q)-lane*.42,.085)*step(13.,y)*step(y,top);c=mix(c,vec3(.31,.22,.18),band*.8);
  float chevron=bx4Line(y-(17.2+lane*.55-abs(q)*1.15),.085)*step(15.6,y)*step(y,top-1.0);c=mix(c,c*1.16,chevron);
  float upper=bx4Box(vec2(q,y),vec2(0.,14.5),vec2(lane*.23,2.25));float cross=max(bx4Line(q,.034),bx4Repeat(y,1.4,.025));c=mix(c,mix(vec3(.23,.29,.29),vec3(.83,.83,.74),cross),upper);
  float lower=bx4Box(vec2(q,y),vec2(0.,8.0),vec2(lane*.20,1.52));c=mix(c,mix(vec3(.23,.29,.29),vec3(.83,.83,.74),cross),lower);
  float archTop=2.55+lane*.24*sqrt(max(0.,1.-q*q/(lane*lane*.065)));float d=max(abs(q)-lane*.255,max(-y,y-archTop));float a=max(fwidth(d),.02);float door=1.-smoothstep(-a,a,d);c=mix(c,vec3(.095,.115,.11),door);
  return c;
 }
 return c;
}`;
