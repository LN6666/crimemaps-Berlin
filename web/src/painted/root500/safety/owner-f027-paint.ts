export const F027_GLSL=String.raw`
float ft27line(float x,float pitch,float width){float d=abs(mod(x+pitch*.5,pitch)-pitch*.5);float a=max(fwidth(x),.002);return 1.-smoothstep(width,width+a,d);}
vec3 ft27glass(vec2 q,float pitch){float glass=.6+.04*sin(q.x*.32);vec3 c=vec3(.22,.31,.33)*glass+vec3(.08,.10,.11);float bars=max(ft27line(q.x,pitch,.035),ft27line(q.y,.92,.025));return mix(c,vec3(.71,.72,.67),bars);}
vec3 funkturmWhole027(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float role=floor(frame.w+.5),U=frame.x,Y=frame.y,V=frame.z;vec2 q=abs(dot(normal.xz,vec2(-.970201481,.242299578)))>.65?vec2(V,Y):vec2(U,Y);
if(role==0.)return vec3(.63,.66,.65)+vec3(.035)*sin(U*.21+V*.32+Y*.13);
if(role==6.)return vec3(.54,.53,.48)+.025*sin(U*2.1+V*1.9);
if(role==3.)return vec3(.38,.42,.43);
if(role==4.){vec3 c=vec3(.22,.31,.34);float grid=max(ft27line(q.x,.50,.024),ft27line(Y,2.05,.025));return mix(c,vec3(.62,.66,.65),grid);}
if(role==2.){vec3 c=ft27glass(q,.67);float band=max(ft27line(Y,1.12,.026),1.-smoothstep(.06,.11,abs(Y-51.85)));return mix(c,vec3(.76,.76,.68),band*.75);}
if(role==5.){vec3 c=vec3(.77,.76,.66);float a=max(fwidth(Y),.015),win=smoothstep(50.55-a,50.55+a,Y)*(1.-smoothstep(51.32-a,51.32+a,Y));return mix(c,ft27glass(q,.58),win);}
vec3 c=vec3(.76,.76,.68);if(Y>127.&&Y<129.1&&abs(normal.y)<.35){float band=smoothstep(127.3,127.35,Y)*(1.-smoothstep(128.65,128.70,Y));c=mix(c,ft27glass(q,.54),band);}return c;}
`;
