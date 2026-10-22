export const C344_FEATURE_GLSL=String.raw`float c344_jp67box(vec2 p,vec2 c,vec2 h){vec2 aa=max(fwidth(p),vec2(.004));vec2 m=1.-smoothstep(h-aa,h+aa,abs(p-c));return m.x*m.y;}
float c344_jp67oval(vec2 p,vec2 c,vec2 h){float d=length((p-c)/h);float aa=max(fwidth(d),.012);return 1.-smoothstep(1.-aa,1.+aa,d);}
vec3 c344_jp67window(vec3 c,vec2 q,float x,float y,float hy){vec3 trim=vec3(.77,.74,.67),glass=vec3(.19,.25,.29);c=mix(c,vec3(.46,.43,.38),c344_jp67box(q,vec2(x,y),vec2(.84,hy+.13)));c=mix(c,trim,c344_jp67box(q,vec2(x,y),vec2(.73,hy+.08)));c=mix(c,glass,c344_jp67box(q,vec2(x,y),vec2(.59,hy)));c=mix(c,trim,c344_jp67box(q,vec2(x,y),vec2(.035,hy)));for(int j=0;j<3;j++)c=mix(c,trim,c344_jp67box(q,vec2(x,y+(float(j)-1.)*hy*.55),vec2(.59,.025)));c=mix(c,trim,c344_jp67box(q,vec2(x,y-hy-.17),vec2(.94,.055)));return c;}
float c344_jp96arch(vec2 q,float x,float low,float spring,float width,float rise){float a=max(fwidth(q.x),.005);float top=spring+rise*sqrt(max(0.,1.-(q.x-x)*(q.x-x)/(width*width)));return(1.-smoothstep(width-a,width+a,abs(q.x-x)))*smoothstep(low-.02,low+.02,q.y)*(1.-smoothstep(top-.02,top+.02,q.y));}
vec3 c344_jp96door(vec3 c,vec2 q,float x,float w){float outer=c344_jp96arch(q,x,.03,1.14,w+.15,.50),inner=c344_jp96arch(q,x,.08,1.14,w,.40);c=mix(c,vec3(.77,.74,.67),outer);return mix(c,vec3(.13,.18,.17),inner);}
vec3 c344_jp96tallArch(vec3 c,vec2 q,float x){vec3 trim=vec3(.77,.74,.67);float outer=c344_jp96arch(q,x,3.12,5.62,1.64,.76),inner=c344_jp96arch(q,x,3.25,5.62,1.43,.61);c=mix(c,trim,outer);c=mix(c,vec3(.17,.24,.29),inner);float grid=c344_jp67box(q,vec2(x,4.65),vec2(.035,1.7));for(int i=0;i<5;i++)grid=max(grid,c344_jp67box(q,vec2(x,3.5+float(i)*.5),vec2(1.43,.025)));return mix(c,trim,grid*inner);}
vec3 c344_jp96North(vec3 base,vec3 p,vec3 normal,vec4 frame){vec2 q=frame.xy;float w=frame.w;vec3 c=vec3(.69,.67,.61),trim=vec3(.77,.74,.67);for(int i=0;i<4;i++)c=mix(c,trim,c344_jp67box(q,vec2(w*.5,1.60+float(i)*1.65),vec2(w*.5,.055)));float joint=1.-smoothstep(.018,.04,abs(mod(q.y+.12,.31)-.155));c=mix(c,vec3(.44,.43,.40),joint*.30*(1.-smoothstep(1.40,1.58,q.y)));
if(w>=34.){for(int i=0;i<9;i++){float x=(float(i)+.5)*w/9.;c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);float cap=6.64-abs(q.x-x)*.3;c=mix(c,trim,c344_jp67box(vec2(q.x,q.y-cap),vec2(x,0.),vec2(.84,.045)));}return c;}
if(w>=25.){float mid=w*.5;for(int i=0;i<3;i++){float x=mid+(float(i)-1.)*6.5;c=c344_jp96tallArch(c,q,x);c=c344_jp96door(c,q,x,1.38);}for(int i=0;i<2;i++){float x=i==0?2.15:w-2.15;c=c344_jp67window(c,q,x,3.80,.55);c=c344_jp67window(c,q,x,5.91,.51);c=c344_jp96door(c,q,x,.68);}for(int i=0;i<6;i++){float x=mid+(float(i)-2.5)*5.8;c=mix(c,trim,c344_jp67box(q,vec2(x,4.85),vec2(.30,1.82)));}c=mix(c,trim,c344_jp67box(q,vec2(mid,7.16),vec2(w*.5,.18)));return c;}
// Independently observed single upper axis on corner fronts and stepped return walls; no copied concealed ground doors.
float x=w*.5;c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);for(int i=0;i<2;i++){float px=i==0?.38:w-.38;c=mix(c,trim,c344_jp67box(q,vec2(px,4.6),vec2(.20,2.1)));}return c;}

vec3 c344_jp97SouthWing(vec3 base,vec3 p,vec3 normal,vec4 frame){
vec2 q=frame.xy;float w=frame.w;vec3 c=vec3(.69,.67,.61),trim=vec3(.77,.74,.67);
for(int i=0;i<4;i++)c=mix(c,trim,c344_jp67box(q,vec2(w*.5,1.60+float(i)*1.65),vec2(w*.5,.055)));
float joint=1.-smoothstep(.018,.04,abs(mod(q.y+.12,.31)-.155));c=mix(c,vec3(.44,.43,.40),joint*.30*(1.-smoothstep(1.40,1.58,q.y)));
// Seven axes independently counted on each south wing; no northern layout reuse.
for(int i=0;i<7;i++){
float x=(float(i)+.5)*w/7.;
// Lower windows are visible on the east wing; west ground openings are tram-occluded.
if(normal.x<-.42)c=c344_jp67window(c,q,x,.83,.50);
c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);
// Middle-storey semicircular stone hood, upper-storey broken angular hood.
float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);
float top=6.64-abs(q.x-x)*.30;c=mix(c,trim,c344_jp67box(vec2(q.x,q.y-top),vec2(x,0.),vec2(.84,.045)));
c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.80,.09)));
}return c;}
vec3 c344_justizpalastVisibleEasternFull500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==13573.)return c344_jp97SouthWing(base,p,normal,frame);if(family==13572.)return c344_jp96North(base,p,normal,frame);if(family!=13570.&&family!=13571.)return base;vec2 q=vec2(frame.x,p.y);vec3 c=vec3(.69,.67,.61),trim=vec3(.77,.74,.67);float y=p.y;
// Native compressed four-storey surface illustration, no roof/cupola silhouette.
for(int k=0;k<4;k++){float yy=1.60+float(k)*1.65;c=mix(c,trim,c344_jp67box(q,vec2(0.,yy),vec2(80.,.055)));}
float aa=max(fwidth(y),.008);float joint=1.-smoothstep(.022,.022+aa,abs(mod(y+.12,.31)-.155));c=mix(c,vec3(.44,.43,.40),joint*.30*(1.-smoothstep(1.40,1.58,y)));
if(family==13570.){
{float x=(-37.71036259);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
{float x=(-32.96971271);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
{float x=(-28.47857071);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
{float x=(-23.79336702);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
{float x=(-19.55173291);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
{float x=(-15.89228387);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
{float x=(17.16717326);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
{float x=(20.59236102);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
{float x=(24.01754879);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
{float x=(27.44273655);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
{float x=(30.86792432);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
{float x=(34.29311209);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
{float x=(37.71829985);c=c344_jp67window(c,q,x,.83,.50);c=c344_jp67window(c,q,x,2.47,.56);c=c344_jp67window(c,q,x,4.18,.62);c=c344_jp67window(c,q,x,5.91,.51);float hood=c344_jp67oval(q,vec2(x,4.90),vec2(.94,.20))*step(4.90,q.y);c=mix(c,trim,hood);c=mix(c,trim,c344_jp67box(q,vec2(x,3.11),vec2(.75,.09)));}
return c;}
// Official second view exposes the third central axis, previously hidden by trees in the first photo.
for(int i=0;i<3;i++){float x=(-4.0)+float(i)*4.0;c=c344_jp67window(c,q,x,2.47,.59);c=c344_jp67window(c,q,x,4.18,.65);c=c344_jp67window(c,q,x,5.91,.53);c=mix(c,trim,c344_jp67box(q,vec2(x+1.15,4.25),vec2(.19,2.25)));c=mix(c,trim,c344_jp67box(q,vec2(x+1.15,6.52),vec2(.36,.10)));}
// Visible local attic oval fields condensed inside original wall height, no raised attic geometry.
for(int i=0;i<3;i++){float x=(-2.7)+float(i)*2.7;c=mix(c,trim,c344_jp67oval(q,vec2(x,7.02),vec2(.96,.30)));c=mix(c,vec3(.22,.23,.22),c344_jp67oval(q,vec2(x,7.02),vec2(.69,.19)));}
// Independent ground entrance, not a window: dark door/recess with pale arch surround; no speculative pane grid.
float doorAA=max(fwidth(q.x),.01);float doorTop=1.02+.40*sqrt(max(0.,1.-q.x*q.x/(.77*.77)));
float outer=(1.-smoothstep(.90-doorAA,.90+doorAA,abs(q.x)))*step(.04,q.y)*(1.-smoothstep(doorTop+.08,doorTop+.14,q.y));
float opening=(1.-smoothstep(.77-doorAA,.77+doorAA,abs(q.x)))*step(.08,q.y)*(1.-smoothstep(doorTop-.02,doorTop+.02,q.y));
c=mix(c,trim,outer);c=mix(c,vec3(.10,.12,.12),opening);
// Small circular opening beside the entrance is a local oculus, not a repeated lower window.
c=mix(c,trim,c344_jp67oval(q,vec2(3.7,1.03),vec2(.48,.34)));c=mix(c,vec3(.15,.17,.17),c344_jp67oval(q,vec2(3.7,1.03),vec2(.34,.23)));
return c;}
`;
