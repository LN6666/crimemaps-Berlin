export const C441_FEATURE_GLSL=String.raw`
float c441Box(vec2 p,vec2 a,vec2 b){vec2 d=min(p-a,b-p);return smoothstep(-.025,.025,min(d.x,d.y));}
float c441Line(float a,float x,float w){return 1.-smoothstep(w,w+.035,abs(x-a));}
vec3 c441Zeuner(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family<14400.5){
  // Source hip/slate planes are retained, including existing native rooflights.
  vec3 roof=mix(vec3(.285,.30,.295),vec3(.23,.255,.26),clamp((f.z-19.)/8.,0.,1.));
  if(f.z<18.2)roof=vec3(.51,.53,.51); // lower linked lecture-roof, inferred metal family
  float joint=1.-smoothstep(.016,.045,abs(fract(f.x*.46)-.5));
  return roof*(1.-.035*joint);
 }
 float u=f.x,y=f.y;
 if(y>20.8){
  vec3 high=vec3(.31,.33,.32);float pane=c441Box(vec2(mod(u,1.35),y),vec2(.12,21.45),vec2(1.18,23.4));
  high=mix(high,vec3(.28,.35,.35),pane);return high; // native rooflight upstands, no facade-window spill onto roof slopes
 }
 vec3 brick=vec3(.63,.31,.225),stone=vec3(.64,.60,.49),glass=vec3(.22,.30,.30);
 float mortar=(1.-smoothstep(.012,.035,abs(fract(y*3.2)-.5)))*.13;
 vec3 col=brick*(1.-mortar);
 if(y<3.8){col=stone*.78;col*=1.-.16*c441Line(0.,mod(y,.58),.035);}
 float band=max(c441Line(3.8,y,.13),max(c441Line(9.,y,.12),max(c441Line(14.5,y,.12),c441Line(19.2,y,.18))));
 col=mix(col,stone,band);
 float phase=mod(u+1.9,4.1)-2.05;
 float rowY=y<3.8?1.95:y<9.?6.25:y<14.5?11.65:17.0;
 float halfH=y<3.8?.82:y<14.5?1.55:1.30;
 float opening=c441Box(vec2(phase,y-rowY),vec2(-.66,-halfH),vec2(.66,halfH));
 float casing=c441Box(vec2(phase,y-rowY),vec2(-.82,-halfH-.17),vec2(.82,halfH+.17));
 // The four principal storeys only; solid native roof upstands stay quiet.
 if(y<19.0){col=mix(col,stone,casing);col=mix(col,glass,opening);
 float mull=max(c441Line(0.,phase,.045),max(c441Line(rowY-.45,y,.04),c441Line(rowY+.5,y,.04)));
 col=mix(col,vec3(.82,.82,.74),opening*mull);}
 // Main south portal in the middle projecting bay, not repeated as windows.
 if(f.z<.5&&abs(u-50.)<2.6&&y<5.6){
 float gate=c441Box(vec2(u,y),vec2(48.35,0.),vec2(51.65,4.35));
 float rim=c441Box(vec2(u,y),vec2(48.0,0.),vec2(52.,4.7));
 col=mix(col,stone,rim);col=mix(col,vec3(.18,.205,.18),gate);
 col=mix(col,stone,gate*c441Line(50.,u,.055));}
 return col;
}
`;
export const C441_DISPATCH='if(family>=14400.&&family<=14401.)return c441Zeuner(base,p,normal,frame,family);';

export function c441MaterialFragment(source:string,city:string){if(city!=='dresden')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C441 dispatcher drift');return source.replace(anchor,C441_FEATURE_GLSL+'\n'+anchor+'if(family>=14400.&&family<=14401.)return c441Zeuner(base,p,normal,frame,family);');}
