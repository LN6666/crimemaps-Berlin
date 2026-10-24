export const KARSTADT70_GLSL=`
float ks70Line(float d,float w){float a=max(fwidth(d),.015);return 1.-smoothstep(max(0.,w-a*.5),w+a*.5,abs(d));}
float ks70Repeat(float x,float pitch,float w){float a=max(fwidth(x)/pitch,.0001),h=w/pitch,d=abs(fract(x/pitch)-.5);return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h,0.,1.),smoothstep(.2,.7,a));}
float ks70Box(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.015));vec2 q=1.-smoothstep(h-a*.5,h+a*.5,abs(p-c));return q.x*q.y;}
vec3 paintKarstadt70(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family<46160.||family>46169.)return base;
 // Reset the former extra4 colour for this range: its misplaced lower windows must not survive as input.
 float u=f.x,y=f.y,eave=f.z;vec2 uv=f.xy;vec3 c=family==46160.?vec3(.67,.59,.46):family==46161.?vec3(.43,.43,.40):family==46162.?vec3(.57,.51,.42):family==46164.?vec3(.44,.34,.27):family==46165.?vec3(.25,.25,.23):family==46166.?vec3(.56,.54,.47):vec3(.27,.25,.22);
 if(family==46161.||family==46165.)return c*(1.-.055*ks70Repeat(u,1.80,.012));
 if(family==46168.)return c;
 if(family==46164.)return c*(1.-.08*max(ks70Repeat(y,.18,.008),ks70Repeat(u+floor(y/.18)*.18,.36,.008)));
 float stone=max(ks70Repeat(y,.67,.008),ks70Repeat(u+floor(y/.67)*.87,1.74,.009));c*=1.-stone*.065;
 if(family!=46160.)return c;
 // Official facade bay pitch is about5.35m. The visible tall slots span the actual19.5m column order.
 float q=mod(u,5.35)-2.675;vec2 local=vec2(q,y);float top=eave-.48;
 float reveal=ks70Box(local,vec2(0.,(3.25+top)*.5),vec2(1.80,(top-3.25)*.5+.08));
 float slot=ks70Box(local,vec2(0.,(3.40+top)*.5),vec2(1.53,(top-3.40)*.5));
 c=mix(c,c*.61,reveal);float mull=max(ks70Line(q,.032),ks70Repeat(y-3.4,3.87,.039));vec3 pane=mix(vec3(.30,.36,.36),vec3(.76,.76,.69),mull*.93);c=mix(c,pane,slot);
 // Solid projecting cornice and the quieter square-window register above it.
 float cornice=ks70Line(y-eave,.17);c=mix(c,vec3(.48,.42,.33),cornice*.92);
 float square=ks70Box(local,vec2(0.,eave+2.14),vec2(.66,.70));float sqrim=ks70Box(local,vec2(0.,eave+2.14),vec2(.79,.80));c=mix(c,c*.70,sqrim);c=mix(c,vec3(.26,.30,.29),square);
 // Continuous pale glazed attic is bounded above the second setback, with a fine rail at its base.
 float attic=ks70Box(vec2(0.,y),vec2(0.,eave+6.23),vec2(1.,1.46));float divisions=max(ks70Repeat(u,1.34,.035),ks70Line(y-eave-6.23,.022));vec3 paleGlass=mix(vec3(.69,.73,.71),vec3(.89,.89,.83),divisions);c=mix(c,paleGlass,attic);
 float rail=max(ks70Line(y-eave-4.72,.023),max(ks70Line(y-eave-5.08,.022),ks70Repeat(u,1.34,.019)*ks70Box(vec2(0.,y),vec2(0.,eave+4.90),vec2(1.,.22))));c=mix(c,vec3(.31,.32,.29),rail*.86);
 float retail=ks70Box(local,vec2(0.,1.53),vec2(1.95,1.48));float rbar=ks70Line(q,.035);c=mix(c,mix(vec3(.18,.24,.24),vec3(.76,.76,.69),rbar),retail);
 return c;
}`;
