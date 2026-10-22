export const C345_FEATURE_GLSL=String.raw`
float c345box(vec2 q,vec2 c,vec2 h){vec2 a=max(fwidth(q),vec2(.02));vec2 v=1.-smoothstep(h-a,h+a,abs(q-c));return v.x*v.y;}
float c345arch(vec2 q,float x,float bottom,float spring,float r){float top=spring+sqrt(max(0.,r*r-(q.x-x)*(q.x-x)));float aa=max(fwidth(q.y),.025);return (1.-smoothstep(r-.02,r+.02,abs(q.x-x)))*smoothstep(bottom-aa,bottom+aa,q.y)*(1.-smoothstep(top-aa,top+aa,q.y));}
vec3 c345Court(vec3 base,vec3 p,vec3 normal,vec4 f,float family){vec3 brick=vec3(.49,.30,.22),stone=vec3(.70,.62,.48);vec2 q=f.xy;
if(family==13581.){float light=.63+.37*max(0.,dot(normalize(normal),normalize(vec3(-.35,.8,.4))));return mix(vec3(.48,.22,.14),vec3(.62,.32,.20),smoothstep(22.,29.5,p.y))/max(light,.01);}
if(family==13584.){if(abs(q.x)>f.w)return vec3(.67,.57,.44);family=13583.;}
vec3 c=family==13580.?vec3(.67,.57,.44):brick;float pixel=max(fwidth(p.y),.003),joint=(1.-smoothstep(.008,.008+pixel,abs(mod(p.y,.12)-.06)))*(1.-smoothstep(.025,.08,pixel));if(family!=13580.)c=mix(c,stone,joint*.17);
for(int i=0;i<4;i++){float y=4.6+float(i)*5.5;float band=1.-smoothstep(.09,.16,abs(p.y-y));c=mix(c,brick*.75,band);}
if(family!=13583.)return c;
for(int j=0;j<4;j++){float y=2.7+float(j)*5.4;for(int i=0;i<3;i++){float x=float(i-1)*3.7;float outer=c345arch(q,x,y-1.65,y+.70,1.32),inner=c345arch(q,x,y-1.45,y+.65,1.12);c=mix(c,stone,outer);c=mix(c,vec3(.21,.29,.30),inner);float mull=c345box(q,vec2(x,y+.1),vec2(.045,1.65));for(int k=0;k<3;k++)mull=max(mull,c345box(q,vec2(x,y-.9+float(k)*.8),vec2(1.05,.035)));c=mix(c,vec3(.56,.58,.49),mull*inner);}}
return c;}
`;
