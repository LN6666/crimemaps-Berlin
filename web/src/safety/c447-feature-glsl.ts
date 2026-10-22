export const C447_FEATURE_GLSL=String.raw`
float c447Box(vec2 p,vec2 a,vec2 b){vec2 d=min(p-a,b-p);return smoothstep(-.025,.025,min(d.x,d.y));}
float c447Line(float a,float x,float w){return 1.-smoothstep(w,w+.035,abs(x-a));}
float c447HSZGlass(vec2 p){return smoothstep(-.22,.02,-1.0*((-2.2681995)*(p.y-(4.8418724))-(9.9679414)*(p.x-(151.3379773)))/10.2227484)*smoothstep(-.22,.02,-1.0*((-4.6679055)*(p.y-(14.8098138))-(20.6934317)*(p.x-(149.0697778)))/21.2133792)*smoothstep(-.22,.02,-1.0*((-0.5518592)*(p.y-(35.5032455))-(2.5668516)*(p.x-(144.4018722)))/2.6255049)*smoothstep(-.22,.02,-1.0*((-1.2486386)*(p.y-(38.0700971))-(5.4968117)*(p.x-(143.8500130)))/5.6368464)*smoothstep(-.22,.02,-1.0*((50.6526754)*(p.y-(43.5669089))-(11.4158528)*(p.x-(142.6013744)))/51.9231665)*smoothstep(-.22,.02,-1.0*((8.7712602)*(p.y-(54.9827616))-(-38.6645292)*(p.x-(193.2540498)))/39.6469522)*smoothstep(-.22,.02,-1.0*((-50.6873327)*(p.y-(16.3182325))-(-11.4763600)*(p.x-(202.0253100)))/51.9703043);}
vec3 c447Campus(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 bool pot=family<14901.5;bool roof=family<14900.5||(family>14901.5&&family<14902.5);
 if(roof){
  if(pot){float seam=1.-smoothstep(.018,.06,abs(fract(f.x*.50)-.5));return vec3(.26,.29,.29)*(1.-.06*seam);}
  // Official orthophoto shows pale mineral/gravel flat roofs, not a glass roof blanket.
  float joint=max(c447Line(0.,mod(f.x,8.),.035),c447Line(0.,mod(f.y,8.),.035));return vec3(.61,.62,.59)*(1.-.055*joint);
 }
 float u=f.x,y=f.y;vec2 world=f.z<1.5?vec2(f.x,f.w):vec2(f.w,f.x);
 if(!pot){
  vec3 concrete=vec3(.72,.73,.69);float panel=max(c447Line(0.,mod(u,3.5),.025),c447Line(0.,mod(y,3.8),.025));concrete*=1.-.085*panel;
  float gl=c447HSZGlass(world);float mull=max(c447Line(0.,mod(u,2.05),.055),c447Line(0.,mod(y,4.05),.075));
  vec3 glass=mix(vec3(.22,.33,.34),vec3(.66,.70,.67),mull);return mix(concrete,glass,gl);
 }
 vec3 wall=vec3(.73,.69,.57),stone=vec3(.62,.59,.49);if(y<1.)wall=stone;
 float ph=mod(u+1.8,3.4)-1.7;float cy=2.2+floor((y-2.2)/3.7+.5)*3.7;
 float rim=c447Box(vec2(ph,y-cy),vec2(-.77,-1.28),vec2(.77,1.28));float pane=c447Box(vec2(ph,y-cy),vec2(-.64,-1.15),vec2(.64,1.15));float zone=step(1.,y)*(1.-step(15.9,y));
 wall=mix(wall,vec3(.81,.81,.73),rim*zone);wall=mix(wall,vec3(.24,.32,.33),pane*zone);float mull=max(c447Line(0.,ph,.04),c447Line(cy,y,.04));wall=mix(wall,vec3(.80,.81,.73),mull*pane*zone);
 // Auditorium south front: tall glazing above the separate ground-connected entrances.
 if(f.z<.5&&world.y<188.0&&world.x>76.&&world.x<108.&&y<12.0){
  float bay=mod(u-76.,6.1)-3.05;float pilaster=1.-smoothstep(.21,.31,abs(bay));wall=vec3(.72,.68,.55);
  float tall=c447Box(vec2(bay,y),vec2(-2.15,5.2),vec2(2.15,10.6));float door=c447Box(vec2(bay,y),vec2(-1.75,.6),vec2(1.75,4.6));
  wall=mix(wall,vec3(.23,.32,.34),max(tall,door));wall=mix(wall,vec3(.82,.82,.73),tall*max(c447Line(0.,bay,.045),c447Line(7.9,y,.05)));wall=mix(wall,stone,pilaster*.72);
 }
 return wall;
}
`;
export const C447_DISPATCH='if(family>=14900.&&family<=14903.)return c447Campus(base,p,normal,frame,family);';
export function c447MaterialFragment(source:string,city:string){if(city!=='dresden')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C447 dispatcher drift');return source.replace(anchor,C447_FEATURE_GLSL+'\n'+anchor+'if(family>=14900.&&family<=14903.)return c447Campus(base,p,normal,frame,family);');}
