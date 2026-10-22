export const C452_FEATURE_GLSL=String.raw`
float c452Box(vec2 p,vec2 a,vec2 b){vec2 d=min(p-a,b-p);return smoothstep(-.025,.025,min(d.x,d.y));}
float c452Line(float a,float x,float w){return 1.-smoothstep(w,w+.035,abs(x-a));}
float c452Arch(vec2 p,float w,float y0,float top){float q=(p.y-(top-w))/w;float cap=1.-smoothstep(.97,1.03,length(vec2(p.x/w,max(q,0.))));return cap*step(y0,p.y);}
vec3 c452Tillich(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family<15400.5){vec3 tile=vec3(.65,.30,.19);float course=1.-smoothstep(.018,.05,abs(fract(f.y*1.8)-.5));tile*=1.-.07*course;
 if(f.x>39.&&f.x<47.&&f.y>35.&&f.y<43.&&f.z<16.4)tile=vec3(.26,.30,.31);return tile;}
 float u=f.x,y=f.y;vec2 world=f.z<1.5?vec2(f.x,f.w):vec2(f.w,f.x);vec3 render=vec3(.70,.67,.59),stone=vec3(.56,.54,.46),trim=vec3(.75,.69,.53),white=vec3(.83,.83,.75),glass=vec3(.23,.33,.35);vec3 col=y<3.2?stone:render;
 float course=c452Line(0.,mod(y,.65),.03);if(y<3.2)col*=1.-.12*course;
 float ph=mod(u+1.6,3.7)-1.85;float cy=1.4+floor((y-1.4)/3.6+.5)*3.6;float win=c452Box(vec2(ph,y-cy),vec2(-.54,-1.12),vec2(.54,1.12)),rim=c452Box(vec2(ph,y-cy),vec2(-.67,-1.25),vec2(.67,1.25));float zone=1.-step(11.0,y);
 col=mix(col,trim,rim*zone);col=mix(col,glass,win*zone);float mull=max(c452Line(0.,ph,.035),c452Line(cy,y,.035));col=mix(col,white,win*zone*mull);
 col=mix(col,trim,max(c452Line(3.2,y,.12),c452Line(11.1,y,.16)));
 // One central east gable: three stepped arched windows, only on existing vertical wall.
 if(f.z>2.5&&world.x>39.&&world.y>18.&&world.y<33.&&y>11.0){
  col=render;float x=world.y-25.5;float a0=c452Arch(vec2(x+2.5,y),.69,11.3,14.5),a1=c452Arch(vec2(x,y),.69,11.3,16.2),a2=c452Arch(vec2(x-2.5,y),.69,11.3,15.1);float ar=max(a0,max(a1,a2));col=mix(col,glass,ar);
  float rim0=c452Arch(vec2(x+2.5,y),.84,11.15,14.65),rim1=c452Arch(vec2(x,y),.84,11.15,16.35),rim2=c452Arch(vec2(x-2.5,y),.84,11.15,15.25);float trimMask=max(rim0,max(rim1,rim2))*(1.-ar);col=mix(col,trim,trimMask);
 }
 // Confirmed half-timber band below the north tower roof; no generic windows on the cap.
 if(world.y>40.&&world.x>35.&&y>16.4){col=vec3(.79,.76,.66);float timber=max(c452Line(0.,mod(u,1.9),.085),max(c452Line(16.5,y,.10),c452Line(19.4,y,.10)));col=mix(col,vec3(.39,.22,.18),timber);}
 return col;
}
`;
export const C452_DISPATCH='if(family>=15400.&&family<=15401.)return c452Tillich(base,p,normal,frame,family);';
export function c452MaterialFragment(source:string,city:string){if(city!=='dresden')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C452 dispatcher drift');return source.replace(anchor,C452_FEATURE_GLSL+'\n'+anchor+'if(family>=15400.&&family<=15401.)return c452Tillich(base,p,normal,frame,family);');}
