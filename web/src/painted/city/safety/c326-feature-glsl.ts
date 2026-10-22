import {c327MaterialFragment} from './c327-feature-glsl';
export const C326_FEATURE_GLSL=`float c326gy73box(vec2 p,vec2 c,vec2 h){vec2 aa=max(fwidth(p),vec2(.004));vec2 m=1.-smoothstep(h-aa,h+aa,abs(p-c));return m.x*m.y;}
float c326gy73oval(vec2 p,vec2 c,vec2 h){float d=length((p-c)/h);float aa=max(fwidth(d),.012);return 1.-smoothstep(1.-aa,1.+aa,d);}
float c326gy73line(vec2 p,vec2 a,vec2 b,float w){vec2 d=b-a;float t=clamp(dot(p-a,d)/dot(d,d),0.,1.);float r=length(p-a-t*d);return 1.-smoothstep(w,w+max(fwidth(r),.006),r);}
vec3 c326gy73stone(vec2 q){float row=floor(q.y/.73);vec2 z=vec2(q.x+mod(row,2.)*.86,q.y);vec2 d=abs(fract(z/vec2(1.72,.73)+.5)-.5)*vec2(1.72,.73);vec2 aa=max(fwidth(z),vec2(.004));float seam=max(1.-smoothstep(.010,.010+aa.x,d.x),1.-smoothstep(.010,.010+aa.y,d.y));return mix(vec3(.83,.80,.72),vec3(.61,.59,.53),seam*.16);}
vec3 c326gy73niche(vec3 c,vec2 q,float x){vec3 pale=vec3(.90,.87,.78),shade=vec3(.50,.48,.42);vec2 z=q-vec2(x,0.);c=mix(c,shade,c326gy73box(z,vec2(0.,8.15),vec2(1.38,3.15)));c=mix(c,vec3(.68,.65,.57),c326gy73box(z,vec2(0.,8.15),vec2(1.10,2.88)));c=mix(c,pale,c326gy73box(z,vec2(0.,8.15),vec2(1.36,3.22))-c326gy73box(z,vec2(0.,8.15),vec2(1.13,3.05)));
 // Stonehumanmass ineachobservedniche, no inventedidentity/attributes or blackwindow.
 float figure=c326gy73oval(z,vec2(0.,9.88),vec2(.30,.42));figure=max(figure,c326gy73oval(z,vec2(0.,8.75),vec2(.48,.89)));float drape=c326gy73box(z,vec2(-.10,7.18),vec2(.42,1.02));figure=max(figure,drape);figure=max(figure,c326gy73line(z,vec2(.35,8.98),vec2(.66,8.0),.15));figure=max(figure,c326gy73line(z,vec2(-.30,8.85),vec2(-.62,7.92),.14));c=mix(c,pale,figure);c=mix(c,vec3(.71,.68,.60),c326gy73line(z,vec2(-.12,7.96),vec2(-.28,6.25),.035)*figure);c=mix(c,pale,c326gy73box(z,vec2(0.,5.65),vec2(.73,.16)));c=mix(c,pale,c326gy73box(z,vec2(0.,4.90),vec2(1.55,.14)));c=mix(c,shade,c326gy73box(z,vec2(0.,4.66),vec2(1.50,.045)));float cap=12.03-abs(z.x)*.43;c=mix(c,pale,c326gy73box(vec2(z.x,z.y-cap),vec2(0.,0.),vec2(1.78,.13)));c=mix(c,shade,c326gy73box(z,vec2(0.,11.10),vec2(1.68,.12)));return c;}
vec3 c326RetainedFront(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family!=13370.)return base;vec2 q=vec2(frame.x,p.y);vec3 c=c326gy73stone(q),pale=vec3(.90,.87,.78),shade=vec3(.50,.48,.42);
float front=dot(normal,vec3((-0.39011351),0.,(-0.92076677)));if(front<.80)return c;
if(abs(q.x)<12.35){
 c=mix(c,vec3(.54,.51,.44),c326gy73box(q,vec2(0.,8.90),vec2(12.4,7.40)));c=mix(c,vec3(.22,.20,.16),c326gy73box(q,vec2(0.,4.60),vec2(1.58,3.50)));c=mix(c,vec3(.35,.29,.21),c326gy73box(q,vec2(0.,4.60),vec2(1.44,3.35)));c=mix(c,shade,c326gy73box(q,vec2(0.,4.60),vec2(.035,3.35)));
 for(int i=0;i<8;i++){float x=(float(i)-3.5)*3.05;float shaft=c326gy73box(q,vec2(x,8.85),vec2(.59,7.35));float cyl=clamp((q.x-x)/.59,-1.,1.);vec3 col=pale*(.91+.07*sqrt(max(0.,1.-cyl*cyl)));c=mix(c,col,shaft);for(int j=0;j<5;j++)c=mix(c,vec3(.72,.69,.61),c326gy73box(q,vec2(x+(float(j)-2.)*.19,8.86),vec2(.018,7.25))*shaft);c=mix(c,pale,c326gy73box(q,vec2(x,1.38),vec2(.82,.20)));c=mix(c,pale,c326gy73box(q,vec2(x,16.37),vec2(.75,.18)));c=mix(c,pale,c326gy73box(q,vec2(x,16.84),vec2(.92,.13)));for(int k=0;k<2;k++){float xx=x+(k==0?(-.63):.63);c=mix(c,pale,c326gy73oval(q,vec2(xx,16.61),vec2(.29,.20)));c=mix(c,shade,c326gy73oval(q,vec2(xx,16.61),vec2(.11,.085)));}}
 for(int j=0;j<4;j++)c=mix(c,pale,c326gy73box(q,vec2(0.,17.35+float(j)*.30),vec2(13.0,.085)));float dent=mod(q.x+.20,.40)-.20;c=mix(c,pale,c326gy73box(vec2(dent,q.y),vec2(0.,18.47),vec2(.115,.12)));
 float top=22.85-abs(q.x)*.306;float tri=step(18.82,q.y)*step(q.y,top);c=mix(c,vec3(.72,.68,.59),tri);c=mix(c,pale,c326gy73line(q,vec2(-12.25,19.10),vec2(0.,22.85),.16));c=mix(c,pale,c326gy73line(q,vec2(0.,22.85),vec2(12.25,19.10),.16));c=mix(c,pale,c326gy73box(q,vec2(0.,18.94),vec2(12.4,.12)));
 // Reliefisaggregatepale/chiaroscurozoneonly: noinventedcount/namesofpedimentfigures.
 float relief=c326gy73oval(q,vec2(0.,20.72),vec2(.60,1.02));relief=max(relief,c326gy73oval(q,vec2(-3.8,19.90),vec2(2.35,.45)));relief=max(relief,c326gy73oval(q,vec2(3.8,19.90),vec2(2.35,.45)));relief=max(relief,c326gy73line(q,vec2(-8.2,19.35),vec2(-4.1,20.14),.19));relief=max(relief,c326gy73line(q,vec2(4.1,20.14),vec2(8.2,19.35),.19));c=mix(c,pale,relief*tri);
 for(int i=0;i<4;i++)c=mix(c,pale,c326gy73box(q,vec2(0.,.30+float(i)*.25),vec2(12.4,.040)));return c;}
c=c326gy73niche(c,q,(-29.15735886));
c=c326gy73niche(c,q,(-22.30080869));
c=c326gy73niche(c,q,(-15.44425852));
c=c326gy73niche(c,q,(15.54239850));
c=c326gy73niche(c,q,(22.60059872));
c=c326gy73niche(c,q,(29.65879893));
for(int i=0;i<4;i++)c=mix(c,pale,c326gy73box(q,vec2(0.,14.80+float(i)*.45),vec2(36.,.075)));c=mix(c,pale,c326gy73box(q,vec2(0.,1.00),vec2(36.,.075)));return c;}

vec3 c326Material(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family==13371.)return vec3(.48,.65,.56);
 if(family==13372.)return vec3(.29,.32,.31);
 if(family==13373.)return vec3(.83,.80,.72);
 if(frame.z>5.5)return c326gy73stone(vec2(frame.x,p.y));
 bool portico=abs(frame.x)<12.26&&frame.z<22.21;
 float y=portico?(p.y<=13.?p.y*18./13.:18.+(p.y-13.)*1.25):p.y*2.;
 vec3 virtualP=vec3(p.x,y,p.z);return c326RetainedFront(base,virtualP,normal,frame,13370.);
}
`;
export function c326MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C326 dispatcher drift');return c327MaterialFragment(source.replace(anchor,C326_FEATURE_GLSL+'\n'+anchor+'if(family>=13370.&&family<=13373.)return c326Material(base,p,normal,frame,family);'),city);}
