/** Existing architect02 local analysis: rectangular paired-pane window groups,
 * silver headers/sills, charcoal spandrels and separate top curtain ribbon.
 * Sample-scaled2.9m bays/3.125m display courses are photographic approximations,
 * not surveyed counts, not the source10-level estimate. Roof remains UV only. */
export const GALLUSANLAGE8_GLSL088=String.raw`
float ga8Line088(float x,float pitch,float width){float d=abs(mod(x+pitch*.5,pitch)-pitch*.5);return 1.-smoothstep(width,width+max(fwidth(x),.018),d);}
float ga8Rect088(vec2 q,vec2 lo,vec2 hi,float soft){return smoothstep(lo.x-soft,lo.x+soft,q.x)*(1.-smoothstep(hi.x-soft,hi.x+soft,q.x))*smoothstep(lo.y-soft,lo.y+soft,q.y)*(1.-smoothstep(hi.y-soft,hi.y+soft,q.y));}
vec3 ga8Round088(vec3 base,vec2 xy,vec2 center,float radius,bool glass){
 vec2 d=xy-center;float r=length(d),aa=max(fwidth(r),.025),outer=1.-smoothstep(radius-aa,radius+aa,r),inner=1.-smoothstep(radius-.16-aa,radius-.16+aa,r);
 vec3 rim=vec3(.70,.73,.73),fill=glass?vec3(.24,.34,.36):vec3(.20,.22,.22);fill*=1.+.10*clamp(d.y/max(radius,.01),-1.,1.);if(glass){float a=atan(d.y,d.x),spokes=(1.-smoothstep(.015,.032,abs(sin(a*4.))))*smoothstep(.10,.24,r)*(1.-smoothstep(radius-.14,radius,r));fill=mix(fill,rim,spokes);fill=mix(fill,rim,1.-smoothstep(.10,.18,r));}return mix(base,mix(rim,fill,inner),outer);
}
vec3 gallusanlage8Material088(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(frame.z-25.)>.001)return base;
 if(family==45481.&&frame.w==91.&&abs(normal.y)<.01)return vec3(.59,.62,.63);
 if(family==45480.&&abs(normal.y)<.01&&((frame.w==89.&&dot(normal.xz,vec2(-.401988536,.915644705))>.999)||(frame.w==90.&&normal.x>.65&&normal.z>.12))){
  float u=frame.x,y=frame.y;vec3 silver=vec3(.64,.68,.69),glass=vec3(.20,.27,.29),clad=vec3(.31,.34,.35);
  // The readable near-end sample shows about17..19 paired-window groups across
  // the50.93m end;2.9m per group lies in its2.7..3.0m approximate interval.
  // Six regular courses are directly readable; lower courses are occluded.
  //3.125m is an8-course DISPLAY scaling including the top ribbon, not10tags.
  float bx=abs(mod(u+1.45,2.9)-1.45),yy=mod(y,3.125);
  float paneX=1.-smoothstep(1.16,1.21,bx),paneY=smoothstep(.40,.46,yy)*(1.-smoothstep(2.70,2.76,yy)),opening=paneX*paneY;
  float outerX=1.-smoothstep(1.25,1.30,bx),outerY=smoothstep(.30,.36,yy)*(1.-smoothstep(2.82,2.89,yy));
  vec3 c=mix(clad,vec3(.44,.48,.49),outerX*outerY);c=mix(c,glass,opening);
  float center=ga8Line088(u,2.9,.023)*paneY,header=(1.-smoothstep(.04,.11,abs(yy-2.80)))*outerX,sill=(1.-smoothstep(.045,.12,abs(yy-.36)))*outerX;
  c=mix(c,silver,max(center,max(header,sill)));
  if(y<3.125)c=clad; // Photographic low/ground course is occluded; no guessed door or window.
  float storyBand=ga8Line088(y,3.125,.035);c=mix(c,vec3(.49,.53,.54),storyBand*.7);
  if(y>=21.875){float mullion=ga8Line088(u,2.9,.035);c=mix(glass,silver,mullion);}
  float boundary=max(1.-smoothstep(.18,.32,y),smoothstep(24.72,24.88,y));return mix(c,vec3(.69,.72,.73),boundary);
 }
 if(family!=45482.||frame.w!=88.||normal.y<.99)return base;
 vec2 metric=frame.xy,q=vec2((metric.x+18.228477964)/102.764975298,(metric.y+50.341252839)/50.341252839);
 float soft=.0009;vec3 roof=vec3(.48,.50,.49);
 float strip=max(ga8Rect088(q,vec2(.15,.43),vec2(.81,.57),soft),ga8Rect088(q,vec2(.75,.30),vec2(.94,.70),soft)),stripInner=max(ga8Rect088(q,vec2(.152,.435),vec2(.808,.565),soft),ga8Rect088(q,vec2(.752,.305),vec2(.938,.695),soft));
 float halfSlope=clamp((q.y-.5)/.07,-1.,1.);vec3 glazed=vec3(.25,.35,.38)*(1.+.12*halfSlope);
 float ridge=1.-smoothstep(.001,.0025,abs(q.y-.5));glazed=mix(glazed,vec3(.68,.73,.73),ridge*.65);
 float transverse=ga8Line088(metric.x,2.9,.055),longitudinal=ga8Line088(metric.y,1.45,.018);glazed=mix(glazed,vec3(.67,.72,.72),max(transverse,longitudinal*.65));
 roof=mix(roof,mix(vec3(.68,.71,.71),glazed,stripInner),strip);
 float e0=ga8Rect088(q,vec2(.17,.19),vec2(.77,.29),soft),e1=ga8Rect088(q,vec2(.17,.71),vec2(.77,.81),soft),equipment=max(e0,e1);
 float ei=max(ga8Rect088(q,vec2(.172,.194),vec2(.768,.286),soft),ga8Rect088(q,vec2(.172,.714),vec2(.768,.806),soft));
 roof=mix(roof,mix(vec3(.58,.61,.60),vec3(.80,.81,.78),ei),equipment);
 float longSlots=max(ga8Rect088(q,vec2(.18,.191),vec2(.76,.218),soft),ga8Rect088(q,vec2(.18,.782),vec2(.76,.809),soft));
 float endSlots=max(ga8Rect088(q,vec2(.741,.196),vec2(.768,.284),soft),ga8Rect088(q,vec2(.741,.716),vec2(.768,.804),soft));
 vec3 longLouvre=mix(vec3(.18,.21,.21),vec3(.54,.57,.57),ga8Line088(metric.y,.25,.028)),endLouvre=mix(vec3(.18,.21,.21),vec3(.57,.60,.60),ga8Line088(metric.x,.30,.030));
 roof=mix(roof,longLouvre,longSlots);roof=mix(roof,endLouvre,endSlots);
 vec2 physical=q*vec2(102.764975298,50.341252839);
 roof=ga8Round088(roof,physical,vec2(.20,.24)*vec2(102.764975298,50.341252839),1.05,false);
 roof=ga8Round088(roof,physical,vec2(.26,.24)*vec2(102.764975298,50.341252839),1.05,false);
 roof=ga8Round088(roof,physical,vec2(.20,.76)*vec2(102.764975298,50.341252839),1.05,false);
 roof=ga8Round088(roof,physical,vec2(.26,.76)*vec2(102.764975298,50.341252839),1.05,false);
 roof=ga8Round088(roof,physical,vec2(.87,.14)*vec2(102.764975298,50.341252839),2.1,true);
 roof=ga8Round088(roof,physical,vec2(.87,.86)*vec2(102.764975298,50.341252839),2.1,true);
 return roof;
}
`;
export const GALLUSANLAGE8_GUARD088=" if(family>=45480.&&family<=45482.)return gallusanlage8Material088(base,p,normal,frame,family);\n";
export function gallusanlage8PartitionSource088(source:string,key:string,city:string){
 if(city==='frankfurt'&&key==='infill-gallusanlage8-material088')return source;
 const defs=source.split(GALLUSANLAGE8_GLSL088).length-1,calls=source.split(GALLUSANLAGE8_GUARD088).length-1;if(defs>1||calls>1)throw Error('Ga8 duplicate private source/guard');
 const scoped=source.replace(GALLUSANLAGE8_GLSL088,'').replace(GALLUSANLAGE8_GUARD088,'');if(/\b(?:ga8Line088|ga8Rect088|ga8Round088|gallusanlage8Material088)\s*\(/.test(scoped))throw Error('Ga8 source leaked outside its private partition');return scoped;
}
