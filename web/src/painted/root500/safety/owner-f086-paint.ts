export const F086_COMPLETION_GLSL=String.raw`float ak6434box(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;return 1.-smoothstep(-.015,.015,max(d.x,d.y));}
float ak6434ell(vec2 q,vec2 c,vec2 r){return 1.-smoothstep(.97,1.03,length((q-c)/r));}

// F086 courtyard openings: Michael Heinrich / Hild und K, contractor exterior photograph3.
// Only the observed NORTH wall and north arc of the western monks choir are admitted.
float ak86CourtCapsule(vec2 q,vec2 h){
 float r=min(h.x,h.y);vec2 d=abs(q)-vec2(h.x-r,h.y-r);
 return 1.-smoothstep(-.025,.025,length(max(d,0.))+min(max(d.x,d.y),0.)-r);
}
vec3 ak86CourtWindow(vec3 c,vec2 q,vec2 h,float rounded){
 float outer=mix(ak6434box(q,vec2(0.),h+vec2(.095,.095)),ak86CourtCapsule(q,h+vec2(.095,.095)),rounded);
 float inner=mix(ak6434box(q,vec2(0.),h),ak86CourtCapsule(q,h),rounded);
 c=mix(c,vec3(.88,.87,.79),outer);
 float bars=max(ak6434box(q,vec2(0.),vec2(.035,h.y)),ak6434box(q,vec2(0.),vec2(h.x,.028)));
 bars=max(bars,max(ak6434box(q,vec2(0.,h.y*.50),vec2(h.x,.025)),ak6434box(q,vec2(0.,-h.y*.50),vec2(h.x,.025))));
 vec3 glass=mix(vec3(.11,.16,.15),vec3(.29,.36,.34),clamp(q.y/(h.y*2.)+.5,0.,1.));
 return mix(c,mix(glass,vec3(.72,.74,.68),bars),inner);
}

vec3 annaCompletion6434(vec3 base,vec3 p,vec3 normal,vec4 f,float family){vec2 q=f.xy;float role=f.w;vec3 white=vec3(.80,.80,.76),trim=vec3(.87,.86,.80),gray=vec3(.69,.72,.71),c=white;

 // BVV-measured north low annex only. f.z is physical face length; upper/front roles unchanged.
 if(role>60.0&&role<61.0){
  c=vec3(.80,.80,.76);float id=(role-60.)*1000.;float u=q.x/f.z;
  // Two actual stair facets, two observed white-framed rectangular openings per facet.
  if(abs(id-23.)<.3||abs(id-36.)<.3){
   float cy=abs(id-23.)<.3?5.30:5.60;float by=abs(id-23.)<.3?2.0:2.25;
   c=ak86CourtWindow(c,vec2(q.x-f.z*.5,q.y-cy),vec2(.36,.48),0.);
   c=ak86CourtWindow(c,vec2(q.x-f.z*.5,q.y-by),vec2(.36,.48),0.);
  }
  // The straight lean-to's photographed tall upper rectangle and lower roundhead door.
  if(abs(id-43.)<.3){c=ak86CourtWindow(c,vec2(q.x-f.z*.55,q.y-5.85),vec2(.54,.85),0.);}
  if(abs(id-45.)<.3){c=ak86CourtWindow(c,vec2(q.x-f.z*.50,q.y-1.50),vec2(.57,1.23),1.);}
  c=mix(c,vec3(.88,.87,.81),1.-smoothstep(.025,.075,abs(q.y-.30)));return c;
 }
 if(abs(role-70.)<.25){float seam=1.-smoothstep(.016,.035,abs(sin(q.x*4.2)));return mix(vec3(.28,.43,.38),vec3(.16,.28,.25),seam*.55);}
 if(abs(role-71.)<.25)return vec3(.48,.28,.21);
 if(abs(role-73.)<.25)return vec3(.80,.80,.76);
 if(role<1.5){
  c=mix(c,vec3(.66,.67,.64),1.-smoothstep(.22,.32,q.y));
  // Explicit frame binding: q.x=SOURCE-local X, q.y=physical WALL height, f.z=SOURCE-local Z.
  // Renderer p is tile/style transformed and is deliberately not used for these opening domains.
  // Two directly visible nave clerestory openings; lowerannex openings wait for genuine physical-surface registration.
  if(f.z>8.0&&q.x>-5.55&&q.x<18.75){
   c=ak86CourtWindow(c,vec2(q.x-7.0,q.y-9.65),vec2(.96,1.35),1.);
   c=ak86CourtWindow(c,vec2(q.x+2.0,q.y-9.65),vec2(.96,1.35),1.);
  }
  // Northern upper monkschoir lights only. The small lowerannex windows are deliberately withheld here.
  // Angular U is continuous across the original short polygonfacets.
  if(q.x<-8.4&&q.x>-23.25&&f.z>5.0){
   float theta=atan(f.z,q.x+16.0);float radius=9.5;
   c=ak86CourtWindow(c,vec2((theta-1.047198)*radius,q.y-9.60),vec2(.46,1.43),1.);
   c=ak86CourtWindow(c,vec2((theta-1.570796)*radius,q.y-9.60),vec2(.46,1.43),1.);
   c=ak86CourtWindow(c,vec2((theta-2.094395)*radius,q.y-9.60),vec2(.46,1.43),1.);
  }
  return c;
 }
 if(abs(role-2.)<.25){
  for(int i=0;i<2;i++){float x=i==0?6.48:12.44;float t=clamp((q.y-12.)/3.,0.,1.);float curve=x+(i==0?1.:-1.)*.75*t*t;c=mix(c,gray,ak6434box(q,vec2(curve,13.3),vec2(.11,1.36)));c=mix(c,gray,ak6434box(q,vec2(i==0?5.2:13.2,13.1),vec2(.8,.58))-ak6434box(q,vec2(i==0?5.2:13.2,13.1),vec2(.69,.48)));}
  float ring=ak6434ell(q,vec2(9.46,13.55),vec2(.83,1.12));float inner=ak6434ell(q,vec2(9.46,13.55),vec2(.64,.96));c=mix(c,gray,ring);c=mix(c,vec3(.055,.075,.074),inner);float bar=max(1.-smoothstep(.014,.025,abs(q.x-9.46)),1.-smoothstep(.014,.025,abs(q.y-13.55)));c=mix(c,vec3(.24,.27,.26),bar*inner);float ledge=ak6434box(q,vec2(9.46,14.77),vec2(4.95,.065));c=mix(c,trim,ledge);
  float niche=ak6434box(q,vec2(9.46,16.18),vec2(.62,.73));c=mix(c,gray,ak6434box(q,vec2(9.46,16.18),vec2(.76,.88)));c=mix(c,vec3(.18,.29,.57),niche);c=mix(c,vec3(.47,.49,.47),ak6434ell(q,vec2(9.46,16.59),vec2(.18,.20))*niche);c=mix(c,vec3(.54,.55,.48),ak6434box(q,vec2(9.46,16.10),vec2(.23,.34))*niche);return c;
 }
 if(abs(role-3.)<.25)return trim;
 if(abs(role-4.)<.25)return vec3(.48,.49,.45);
 if(abs(role-10.)<.25||abs(role-11.)<.25){vec3 copper=vec3(.25,.43,.39);float seam;if(role<10.5)seam=1.-smoothstep(.013,.035,min(mod(q.x,.72),.72-mod(q.x,.72)));else{float a=atan(q.y,q.x+16.);seam=1.-smoothstep(.015,.04,abs(sin(a*24.)));}float broad=.035*sin(q.x*.39+q.y*.21);return mix(copper+vec3(broad),vec3(.16,.31,.29),seam*.55);}
 if(abs(role-23.)<.25){
  // Two actual NORTH-facing oval lights seen in the contractor north-courtyard photos.
  // Remaining drum directions are unpictured and stay white; no assumed opposite openings.
  c=white;
  for(int i=0;i<2;i++){
   float u=(i==0?.785398:2.356194)*1.10;
   float trimMask=ak6434ell(q,vec2(u,19.64),vec2(.25,.35));
   float glassMask=ak6434ell(q,vec2(u,19.64),vec2(.18,.27));
   c=mix(c,gray,trimMask);c=mix(c,vec3(.07,.11,.12),glassMask);
  }
  return c;
 }
 if(abs(role-24.)<.25){return vec3(.25,.43,.39);}
 if(abs(role-22.)<.25)return vec3(.29,.27,.21);return c;
}
`;
