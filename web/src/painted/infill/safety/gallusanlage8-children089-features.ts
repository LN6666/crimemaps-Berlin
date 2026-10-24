/** Architect02 photograph, native eight-part hierarchy. All dimensions remain
 * native schematic heights; facade courses/roof feature positions are photographic
 * registration approximations. One physical frame, no per-child programme reset. */
export const GALLUSANLAGE8_CHILDREN_GLSL089=String.raw`
float ga8Line089(float x,float pitch,float width){float d=abs(mod(x+pitch*.5,pitch)-pitch*.5);return 1.-smoothstep(width,width+max(fwidth(x),.018),d);}
float ga8Rect089(vec2 q,vec2 lo,vec2 hi){vec2 a=smoothstep(lo-vec2(.001),lo+vec2(.001),q)*(1.-smoothstep(hi-vec2(.001),hi+vec2(.001),q));return a.x*a.y;}
vec3 ga8Facade089(float u,float y){
 // Shared normalized photo composition: original25m eight-course registration
 // mapped as a whole to the native main17.5m body. This is not floor surveying.
 y*=25./17.5;
 vec3 silver=vec3(.64,.68,.69),glass=vec3(.20,.27,.29),clad=vec3(.31,.34,.35);
 float bx=abs(mod(u+1.45,2.9)-1.45),yy=mod(y,3.125),paneX=1.-smoothstep(1.16,1.21,bx),paneY=smoothstep(.40,.46,yy)*(1.-smoothstep(2.70,2.76,yy));
 float outerX=1.-smoothstep(1.25,1.30,bx),outerY=smoothstep(.30,.36,yy)*(1.-smoothstep(2.82,2.89,yy));
 vec3 c=mix(clad,vec3(.44,.48,.49),outerX*outerY);c=mix(c,glass,paneX*paneY);
 float center=ga8Line089(u,2.9,.023)*paneY,header=(1.-smoothstep(.04,.11,abs(yy-2.80)))*outerX,sill=(1.-smoothstep(.045,.12,abs(yy-.36)))*outerX;
 c=mix(c,silver,max(center,max(header,sill)));if(y<3.125)c=clad;
 c=mix(c,vec3(.49,.53,.54),ga8Line089(y,3.125,.035)*.7);
 // Independent top ribbon follows the native main17.5m envelope, not the
 // discarded parent25m shell. Display course pitch is not a measured floor.
 if(y>=21.875)c=mix(glass,silver,ga8Line089(u,2.9,.035));
 return c;
}
vec3 gallusanlage8Children089(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec2 metric=frame.xy,q=vec2((metric.x+18.228477964)/102.764975298,(metric.y+50.341252839)/50.341252839);
 if(family==45483.&&frame.w==93.&&abs(normal.y)<.01&&(dot(normal.xz,vec2(-.401988536,.915644705))>.999||(normal.x>.65&&normal.z>.12)))return ga8Facade089(frame.x,frame.y);
 if(family==45484.&&frame.w==94.&&abs(normal.y)<.01)return vec3(.59,.62,.63);
 if(family==45485.&&frame.w==95.&&normal.y>.99){
  vec3 roof=vec3(.48,.50,.49);float strip=max(ga8Rect089(q,vec2(.175,.43),vec2(.805,.57)),ga8Rect089(q,vec2(.755,.315),vec2(.94,.685)));
  vec3 glass=vec3(.25,.35,.38)*(1.+.10*clamp((q.y-.5)/.07,-1.,1.));
  float ribs=max(ga8Line089(metric.x,2.9,.055),ga8Line089(metric.y,1.45,.018)*.65);glass=mix(glass,vec3(.67,.72,.72),ribs);
  return mix(roof,glass,strip);
 }
 if(family==45486.&&frame.w==96.&&normal.y>.99){
  vec3 c=vec3(.80,.81,.78);float seams=max(ga8Line089(metric.x,2.9,.025),ga8Line089(metric.y,1.45,.015));c=mix(c,vec3(.65,.68,.66),seams*.5);
  // Four dark fans, a close pair at the west end of each actual U band.
  vec2 uv=q*vec2(102.764975298,50.341252839);float fans=0.;
  fans=max(fans,1.-smoothstep(1.0,1.10,length(uv-vec2(.20,.27)*vec2(102.764975298,50.341252839))));
  fans=max(fans,1.-smoothstep(1.0,1.10,length(uv-vec2(.26,.27)*vec2(102.764975298,50.341252839))));
  fans=max(fans,1.-smoothstep(1.0,1.10,length(uv-vec2(.20,.76)*vec2(102.764975298,50.341252839))));
  fans=max(fans,1.-smoothstep(1.0,1.10,length(uv-vec2(.26,.76)*vec2(102.764975298,50.341252839))));
  return mix(c,vec3(.19,.22,.22),fans);
 }
 if(family==45487.&&(frame.w==97.||frame.w==100.||frame.w==101.||frame.w==102.)&&abs(normal.y)<.01){
  // Common outward facade below mainroof; only source-bound U upper faces
  // carry their photographed pale panels/louvres above17.5m.
  if(frame.y<=17.5){if(frame.z>0.)return ga8Facade089(frame.x,frame.y);return vec3(.59,.62,.63);}
  float louvre=ga8Line089(frame.y,.25,.025);vec3 dark=mix(vec3(.19,.22,.22),vec3(.57,.60,.60),louvre);
  if(frame.w==97.)return dark; // Only two photographed east end faces full-height louvres.
  vec3 panel=mix(vec3(.75,.77,.74),vec3(.59,.63,.61),ga8Line089(frame.x,2.9,.025)*.6);
  if(frame.w==100.)return mix(panel,dark,smoothstep(21.62,21.78,frame.y)); // North outer: upper ribbon, pale below.
  if(frame.w==101.)return mix(panel,vec3(.62,.66,.63),ga8Line089(frame.y,2.5,.025)*.35); // Inner broad pale panels.
  return vec3(.70,.73,.70); // Far-south outer is not clearly photographed.
 }
 if(family==45488.&&normal.y>.99&&(frame.w==98.||frame.w==99.)){
  vec2 center=frame.w==98.?vec2(.941052599,.141672992):vec2(.909121888,.837318854),d=(q-center)*vec2(102.764975298,50.341252839);
  // The original eight-sided roof is retained. Its rim is expressed by the
  // native polygon's approximate apothem; no flat parent circle or new hole.
  float a=atan(d.y,d.x),r=length(d),edge=r*cos(mod(a+3.141592654/8.,3.141592654/4.)-3.141592654/8.);
  float rim=smoothstep(2.50,2.67,edge),spokes=(1.-smoothstep(.02,.045,abs(sin(a*4.))))*smoothstep(.15,.30,r);
  return mix(vec3(.24,.34,.36),vec3(.70,.73,.73),max(rim,spokes));
 }
 return base;
}
`;
export const GALLUSANLAGE8_CHILDREN_GUARD089=" if(family>=45483.&&family<=45488.)return gallusanlage8Children089(base,p,normal,frame,family);\n";
export function gallusanlage8ChildrenPartition089(source:string,key:string,city:string){
 if(city==='frankfurt'&&key==='infill-gallusanlage8-children089')return source;
 const defs=source.split(GALLUSANLAGE8_CHILDREN_GLSL089).length-1,calls=source.split(GALLUSANLAGE8_CHILDREN_GUARD089).length-1;if(defs>1||calls>1)throw Error('Ga8 child duplicate private source');
 const result=source.replace(GALLUSANLAGE8_CHILDREN_GLSL089,'').replace(GALLUSANLAGE8_CHILDREN_GUARD089,'');if(/\b(?:ga8Line089|ga8Rect089|ga8Facade089|gallusanlage8Children089)\s*\(/.test(result))throw Error('Ga8 child helper leaked');return result;
}
