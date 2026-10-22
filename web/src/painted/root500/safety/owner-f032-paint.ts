/** Source: Kvikk2019 CC-BY-SA4.0 restored front; dimensions photo-approximate. */
export const OWNER_F032_PAINT_GLSL=`
float o32edge(float d){float a=max(fwidth(d)*1.2,.012);return 1.-smoothstep(-a,a,d);}
float o32box(vec2 p,vec2 c,vec2 h){vec2 d=abs(p-c)-h;return o32edge(max(d.x,d.y));}
float o32line(float d,float w){return o32edge(abs(d)-w);}
float o32disk(vec2 p,vec2 c,float r){return o32edge(length(p-c)-r);}
float o32arch(vec2 p,vec2 base,float w,float h){
 vec2 q=p-base;float d=max(abs(q.x)-w,max(-q.y,q.y-h));
 if(q.y>h-w)d=max(d,length(vec2(q.x,q.y-(h-w)))-w);
 return o32edge(d);
}
float o32segment(vec2 p,vec2 base,float w,float h,float cap){
 vec2 q=p-base;float d=max(abs(q.x)-w,max(-q.y,q.y-h));
 float r=(w*w+cap*cap)/(2.*cap);
 if(q.y>h-cap)d=max(d,length(vec2(q.x,q.y-(h-r)))-r);
 return o32edge(d);
}
vec3 o32window(vec3 color,vec2 q,float u,float bottom,float h,float w,float cap){
 vec2 b=vec2(u,bottom);float outer=o32segment(q,b-vec2(0.,.16),w+.17,h+.32,cap+.08);
 float inside=o32segment(q,b,w,h,cap);color=mix(color,vec3(.66,.62,.51),outer);
 color=mix(color,vec3(.14,.21,.18),inside);
 float mullion=max(o32line(q.x-u,.045),max(o32line(q.y-bottom-h*.34,.045),o32line(q.y-bottom-h*.69,.045)));
 float small=max(o32line(q.x-u-w*.48,.024),o32line(q.x-u+w*.48,.024));
 color=mix(color,vec3(.60,.60,.45),inside*max(mullion,small));
 color=mix(color,vec3(.53,.49,.38),o32box(q,vec2(u,bottom-.18),vec2(w+.23,.08)));
 return color;
}
vec3 ownerF032Paint(vec3 base,vec4 frame){
 vec2 q=frame.xy;float kind=frame.w;vec3 c=base;
 if(kind>5.5&&kind<6.5){
  // Lateral foyer bay: upper window, solid lower panel, separate low doorway.
  c=vec3(.89,.865,.79);c=o32window(c,q,0.,9.75,5.30,.95,.95);
  float panel=o32box(q,vec2(0.,6.6),vec2(1.08,1.74)),inside=o32box(q,vec2(0.,6.6),vec2(1.02,1.68));
  c=mix(c,vec3(.74,.70,.60),max(0.,panel-inside));
  float portal=o32arch(q,vec2(0.,.02),.75,2.70),door=o32arch(q,vec2(0.,.08),.60,2.49);
  c=mix(c,vec3(.73,.68,.55),portal);c=mix(c,vec3(.19,.23,.18),door);
  c=mix(c,vec3(.50,.51,.40),door*o32line(q.x,.028));
  float attic=o32box(q,vec2(0.,16.25),vec2(.85,.51));c=mix(c,vec3(.23,.27,.22),attic);
  return c;
 }
 if(kind>4.5){
  // Individually registered plan openings; upper discs are solid blind panels.
  c=vec3(.89,.865,.79);
  c=mix(c,vec3(.66,.62,.52),o32line(q.y-.72,.08));
  float panel=o32box(q,vec2(0.,15.80),vec2(frame.z*.41,1.32));
  float panelInner=o32box(q,vec2(0.,15.80),vec2(frame.z*.41-.065,1.25));
  c=mix(c,vec3(.75,.71,.61),max(0.,panel-panelInner));
  float disc=o32disk(q,vec2(0.,15.80),1.02),discInner=o32disk(q,vec2(0.,15.80),.94);
  c=mix(c,vec3(.75,.71,.61),disc);c=mix(c,vec3(.89,.865,.79),discInner);
  float surround=o32arch(q,vec2(0.,2.55),1.12,11.80),glass=o32arch(q,vec2(0.,2.70),.95,11.50);
  c=mix(c,vec3(.73,.69,.58),surround);c=mix(c,vec3(.18,.25,.22),glass);
  float bars=max(o32line(q.x,.045),o32line(mod(q.y-2.70,1.80)-.90,.024));
  float head=o32line(abs(q.x)-(q.y-12.80)*.67,.04)*smoothstep(12.75,12.85,q.y);
  c=mix(c,vec3(.77,.76,.62),glass*max(bars,head));
  c=mix(c,vec3(.60,.55,.44),o32box(q,vec2(0.,2.51),vec2(1.16,.08)));
  if(kind>6.5){
   float lintel=o32box(q,vec2(0.,2.46),vec2(1.07,.14));c=mix(c,vec3(.70,.66,.54),lintel);
   float door=o32box(q,vec2(0.,1.16),vec2(.68,1.14));c=mix(c,vec3(.20,.26,.21),door);
   c=mix(c,vec3(.57,.58,.44),door*o32line(q.x,.028));
  }
  return c;
 }
 if(kind<1.5){
  c=vec3(.89,.865,.79);
  c=mix(c,vec3(.54,.52,.45),1.-smoothstep(.50,.62,q.y));
  float band=max(o32line(q.y-.75,.10),max(o32line(q.y-8.65,.10),o32line(q.y-17.35,.17)));
  c=mix(c,vec3(.76,.70,.59),band);
  for(int i=0;i<2;i++){
   float u=i==0?-6.9:6.9;
   c=o32window(c,q,u,1.35,5.65,1.02,.22);
   c=o32window(c,q,u,9.75,5.30,1.02,.95);
   float attic=o32box(q,vec2(u,16.25),vec2(.89,.53));
   float frameAttic=o32box(q,vec2(u,16.25),vec2(1.03,.66));
   c=mix(c,vec3(.68,.63,.53),frameAttic);c=mix(c,vec3(.20,.25,.21),attic);
   c=mix(c,vec3(.55,.55,.43),attic*o32line(q.x-u,.035));
  }
  // Central ground-level door: two solid lower leaves, separate arched transom.
  float surround=o32arch(q,vec2(0.,.22),1.72,8.22);
  float door=o32arch(q,vec2(0.,.44),1.44,7.78);
  c=mix(c,vec3(.66,.57,.44),surround);c=mix(c,vec3(.17,.25,.18),door);
  float leaf=door*(1.-smoothstep(5.45,5.60,q.y));
  float panel=max(o32box(q,vec2(-.70,2.90),vec2(.52,1.93)),o32box(q,vec2(.70,2.90),vec2(.52,1.93)));
  c=mix(c,vec3(.30,.36,.25),leaf*panel);
  float transom=door*smoothstep(5.5,5.65,q.y);c=mix(c,vec3(.11,.18,.17),transom);
  float bars=max(o32line(q.x,.035),max(o32line(q.x-.72,.03),o32line(q.x+.72,.03)));
  bars=max(bars,o32line(q.y-6.10,.045));
  c=mix(c,vec3(.59,.60,.42),max(transom*bars,leaf*o32line(q.x,.025)));
  for(int i=0;i<2;i++){
   float u=i==0?-1.96:1.96;
   c=mix(c,vec3(.80,.70,.56),o32box(q,vec2(u,4.68),vec2(.20,4.2)));
   c=mix(c,vec3(.63,.57,.46),o32box(q,vec2(u,8.86),vec2(.40,.17)));
  }
  float arc=length(q-vec2(0.,7.85));
  float pediment=o32line(arc-2.72,.10)*smoothstep(9.45,9.65,q.y)*(1.-smoothstep(2.46,2.63,abs(q.x)));
  c=mix(c,vec3(.62,.54,.42),pediment);
  c=mix(c,vec3(.70,.61,.48),o32box(q,vec2(0.,9.45),vec2(2.27,.16)));
  float roundOuter=o32disk(q,vec2(0.,13.05),1.22),roundInside=o32disk(q,vec2(0.,13.05),1.00);
  c=mix(c,vec3(.64,.59,.47),roundOuter);c=mix(c,vec3(.14,.21,.18),roundInside);
  vec2 rq=q-vec2(0.,13.05);float radial=atan(rq.y,rq.x);
  c=mix(c,vec3(.54,.56,.37),roundInside*max(o32line(length(rq)-.58,.025),o32line(sin(radial*6.)*length(rq),.026)));
  // Main triangular pediment remains a solid wall with a shallow sun ornament.
  float slope=22.7-abs(q.x)*(5./11.2);
  c=mix(c,vec3(.66,.61,.51),o32line(q.y-slope,.14)*smoothstep(17.6,17.85,q.y));
  c=mix(c,vec3(.74,.69,.58),o32line(q.y-17.85,.14));
  vec2 sun=q-vec2(0.,19.40);float r=length(sun),a=atan(sun.y,sun.x);
  float rays=o32line(sin(a*12.)*r,.030)*smoothstep(.50,.58,r)*(1.-smoothstep(1.42,1.50,r));
  c=mix(c,vec3(.74,.67,.53),max(o32disk(q,vec2(0.,19.40),.49),rays));
  return c;
 }
 if(kind<2.5){
  c=vec3(.88,.84,.71);float molding=max(o32line(q.y-18.4,.12),max(o32line(q.y-26.55,.09),o32line(q.y-29.10,.14)));
  c=mix(c,vec3(.72,.65,.52),molding);
  float archOuter=o32arch(q,vec2(0.,21.25),1.27,4.65),opening=o32arch(q,vec2(0.,21.45),1.06,4.22);
  c=mix(c,vec3(.72,.67,.54),archOuter);c=mix(c,vec3(.22,.26,.23),opening);
  float slats=o32line(mod(q.y-.03,.17)-.085,.029);c=mix(c,vec3(.38,.40,.33),opening*slats);
  float blind=o32disk(q,vec2(0.,27.80),1.02),inner=o32disk(q,vec2(0.,27.80),.87);
  c=mix(c,vec3(.72,.66,.53),blind);c=mix(c,vec3(.88,.84,.71),inner);
  return c;
 }
 if(kind<3.5){
  c=vec3(.88,.84,.71);float o=o32disk(q,vec2(0.,27.3),.80),w=o32disk(q,vec2(0.,27.3),.59);
  c=mix(c,vec3(.70,.64,.51),o);return mix(c,vec3(.18,.22,.20),w);
 }
 vec2 k=q-vec2(0.,44.15);float r=length(k);float rim=o32edge(r-.99),dial=o32edge(r-.86);
 c=mix(c,vec3(.76,.60,.20),rim);c=mix(c,vec3(.15,.45,.47),dial);
 float angle=atan(k.y,k.x),ticks=o32line(sin(angle*6.)*r,.035)*smoothstep(.61,.68,r)*(1.-smoothstep(.78,.82,r));
 c=mix(c,vec3(.86,.72,.31),dial*ticks);c=mix(c,vec3(.86,.72,.31),o32edge(r-.10));
 return c;
}
`;
