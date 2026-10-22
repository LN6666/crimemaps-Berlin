export const F170_COMPLETION_GLSL=`
float kh6428Box(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;float aa=max(max(fwidth(q.x),fwidth(q.y)),.008);return 1.-smoothstep(-aa,aa,max(d.x,d.y));}
vec3 kh6428Brick(vec2 q){float row=floor(q.y/.085);float bx=mod(q.x+mod(row,2.)*.16,.32);float joint=max(1.-smoothstep(.004,.004+max(fwidth(q.y),.006),abs(mod(q.y+.0425,.085)-.0425)),1.-smoothstep(.009,.018,min(bx,.32-bx)));float variation=sin(floor(q.x/.32)*7.13+row*3.17)*.018;return mix(vec3(.61,.44,.31)+variation,vec3(.66,.59,.47),joint*.48);}
float kh6428Round(vec2 q,float x,float bottom,float spring,float width){float body=kh6428Box(q,vec2(x,(bottom+spring)*.5),vec2(width*.5,(spring-bottom)*.5));float cap=(1.-smoothstep(width*.5-.012,width*.5+.012,length(q-vec2(x,spring))))*step(spring,q.y);return max(body,cap);}
vec3 kreuzherrenCompletion6428(vec3 base,vec4 f){float role=f.w;vec2 q=f.xy;
if(role<1.5){vec3 c=kh6428Brick(q);float cornice=kh6428Box(q,vec2(f.z*.5,15.05),vec2(f.z,.12));return mix(c,vec3(.49,.45,.35),cornice*.5);}
if(role<2.5)return kh6428Brick(vec2(q.y*1.4,f.z));
if(abs(role-20.)<.5){vec3 c=kh6428Brick(q);float width=5.383;float quoins=max(kh6428Box(q,vec2(.16,12.),vec2(.16,12.)),kh6428Box(q,vec2(width-.16,12.),vec2(.16,12.)));float courses=1.-smoothstep(.012,.022,abs(mod(q.y,.45)-.225));c=mix(c,mix(vec3(.64,.62,.53),vec3(.44,.43,.36),courses*.65),quoins);float belt=max(kh6428Box(q,vec2(width*.5,15.),vec2(width,.14)),max(kh6428Box(q,vec2(width*.5,18.5),vec2(width,.14)),kh6428Box(q,vec2(width*.5,23.65),vec2(width,.19))));c=mix(c,vec3(.66,.63,.54),belt);
if(f.z>.5){float surround=kh6428Round(q,width*.5,19.5,21.1,1.8),opening=kh6428Round(q,width*.5,19.65,21.1,1.45);c=mix(c,vec3(.72,.68,.56),surround);float louver=1.-smoothstep(.012,.025,abs(mod(q.y,.16)-.08));c=mix(c,mix(vec3(.12,.15,.14),vec3(.36,.38,.31),louver*.65),opening);float slit=kh6428Box(q,vec2(width*.5,16.4),vec2(.20,.80));c=mix(c,vec3(.18,.20,.17),slit);}return c;}
if(abs(role-21.)<.5)return vec3(.80,.78,.69);
if(abs(role-22.)<.5)return vec3(.27,.29,.26);
if(abs(role-23.)<.5)return vec3(.75,.61,.23);
if(abs(role-31.)<.5){float opening=kh6428Box(q,vec2(0.,.52),vec2(.16,.36));return mix(vec3(.67,.65,.56),vec3(.22,.24,.22),opening);}
vec2 slate=role<10.5?vec2(q.x,f.z):vec2(q.x*12.,q.y);float row=floor(slate.y/.26);float joint=1.-smoothstep(.008,.025,min(mod(slate.x+mod(row,2.)*.15,.30),.30-mod(slate.x+mod(row,2.)*.15,.30)));float course=1.-smoothstep(.008,.023,abs(mod(slate.y,.26)-.13));return mix(vec3(.29,.31,.30),vec3(.19,.21,.20),max(joint,course)*.45);
}
`;
