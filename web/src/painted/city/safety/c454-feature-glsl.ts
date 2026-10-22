export const C454_FEATURE_GLSL=String.raw`
float c454Box(vec2 p,vec2 a,vec2 b){vec2 d=min(p-a,b-p);return smoothstep(-.025,.025,min(d.x,d.y));}
float c454Line(float a,float x,float w){return 1.-smoothstep(w,w+.035,abs(x-a));}
float c454Arch(vec2 p,float w,float y0,float top){float q=(p.y-(top-w))/w;return(1.-smoothstep(.97,1.03,length(vec2(p.x/w,max(q,0.)))))*step(y0,p.y);}
vec3 c454Corner(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 bool roof=family<15600.5||(family>15601.5&&family<15602.5);if(roof){float course=c454Line(0.,mod(f.y,.55),.018);return vec3(.61,.30,.20)*(1.-course*.07);}
 float u=f.x,y=f.y,E=f.z,N=f.w;bool modern=E<0.;vec3 glass=vec3(.25,.34,.35),white=vec3(.84,.84,.76),stone=vec3(.68,.62,.49);
 if(modern){
  vec3 col=vec3(.78,.62,.36);float cy=1.3+floor((y-1.3)/2.6+.5)*2.6;float ph=mod(u+1.4,3.0)-1.5;float pane=c454Box(vec2(ph,y-cy),vec2(-.82,-.95),vec2(.82,.95));col=mix(col,glass,pane);col=mix(col,white,pane*max(c454Line(0.,ph,.035),c454Line(cy,y,.035)));
  // Main south/front modern bays: broad glazing and concrete balcony slabs, not a historic window template.
  if(normal.z<-.4&&y>2.8){float column=c454Line(0.,mod(u,5.8),.16);float slab=c454Line(0.,mod(y-2.8,2.8),.12);col=mix(glass,vec3(.68,.70,.66),max(column,slab));float rail=c454Line(0.,mod(y-3.15,2.8),.035);float bars=c454Line(0.,mod(u,.72),.018)*c454Box(vec2(0.,mod(y-2.8,2.8)),vec2(-1.,.15),vec2(1.,.65));col=mix(col,vec3(.72,.75,.72),max(rail,bars));}
  if(y<.55)col=vec3(.53,.53,.47);return col;
 }
 vec3 col=vec3(.84,.82,.67);if(y<1.0)col=stone;
 float ph=mod(u+1.3,3.3)-1.65;float cy=2.55+floor((y-2.55)/3.5+.5)*3.5;float pane=c454Box(vec2(ph,y-cy),vec2(-.58,-1.20),vec2(.58,1.20)),rim=c454Box(vec2(ph,y-cy),vec2(-.75,-1.36),vec2(.75,1.36));float zone=step(1.,y)*(1.-step(11.6,y));col=mix(col,stone,rim*zone);col=mix(col,glass,pane*zone);col=mix(col,white,pane*zone*max(c454Line(0.,ph,.035),c454Line(cy+.25,y,.035)));
 col=mix(col,stone,max(c454Line(1.,y,.10),max(c454Line(4.,y,.07),c454Line(12.3,y,.15))));
 // Confirmed Hettner front loggias: two recessed arched balcony bays, supported by stone piers.
 if(normal.x>.45&&N>10.&&N<19.&&y>4.0&&y<11.0){
  float x=N-14.5;float rowY=y<7.5?5.7:9.2;float arch=c454Arch(vec2(x,y),1.7,rowY-1.35,rowY+1.55);float stoneBay=c454Box(vec2(x,y),vec2(-2.15,rowY-1.65),vec2(2.15,rowY+1.7));col=mix(col,stone,stoneBay);col=mix(col,vec3(.33,.34,.27),arch);
  float rail=c454Line(rowY-1.07,y,.06);float pickets=c454Line(0.,mod(N,.42),.033)*step(rowY-1.02,y)*(1.-step(rowY-.58,y));col=mix(col,vec3(.74,.70,.57),arch*max(rail,pickets));}
 // Separate low red timber doorway; no window sill or repeated upper-window logic.
 if(normal.x>.45&&abs(N-21.0)<1.25&&y<3.6){float door=c454Arch(vec2(N-21.,y),.88,.0,3.25);col=mix(col,vec3(.40,.19,.12),door);col=mix(col,stone,door*c454Line(21.,N,.04));}
 return col;
}
`;
export const C454_DISPATCH='if(family>=15600.&&family<=15603.)return c454Corner(base,p,normal,frame,family);';
export function c454MaterialFragment(source:string,city:string){if(city!=='dresden')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C454 dispatcher drift');return source.replace(anchor,C454_FEATURE_GLSL+'\n'+anchor+'if(family>=15600.&&family<=15603.)return c454Corner(base,p,normal,frame,family);');}
