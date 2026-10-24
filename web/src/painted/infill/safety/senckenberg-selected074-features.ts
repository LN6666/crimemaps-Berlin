/** Exact private families45400..45405 OneFortyWest,45410..45415 Senckenberg.
 * Metre frames from each own reconstructed face. No world-random triangles.
 * Actual balconies/joints are DISPLAY geometry, so picking and draw agree. */
export const SENCKENBERG_SELECTED_GLSL074=String.raw`
float s074Line(float x,float period,float halfWidth){return 1.0-smoothstep(halfWidth,halfWidth+0.025,abs(mod(x+period*.5,period)-period*.5));}
vec3 senckenbergSelected074(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family>45399.5&&family<45400.5){
  float u=f.x,v=f.y;float bay=max(1.0,f.w/floor(f.w/1.45+.5));
  float mull=s074Line(u,bay,.045),floorBand=s074Line(v-3.5,3.5,.11);
  vec3 glass=mix(vec3(.25,.36,.42),vec3(.37,.47,.51),clamp(v/56.0,0.0,1.0));
  float spandrel=1.0-smoothstep(.28,.43,abs(mod(v-3.5,3.5)-.60));
  glass=mix(glass,vec3(.22,.28,.30),spandrel*.38);
  vec3 col=mix(glass,vec3(.70,.69,.64),max(mull,floorBand));
  // Own15th-floor restaurant/skybar: bounded dark framed glazed zone. Exact
  // elevation and endpoint count are photo approximations, not measured bays.
  float bar=step(52.5,v)*step(v,56.0)*step(.35,normal.x);
  col=mix(col,mix(vec3(.27,.36,.39),vec3(.58,.56,.50),max(s074Line(v-52.5,3.5,.19),s074Line(u,bay*4.0,.17))),bar);
  return col;
 }
 if(family>45400.5&&family<45401.5){
  float bay=max(1.0,f.w/floor(f.w/1.65+.5));
  float mull=s074Line(f.x,bay,.042),band=s074Line(f.y-56.0,3.675,.07);
  return mix(vec3(.23,.34,.39),vec3(.47,.48,.45),max(mull,band));
 }
 if(family>45401.5&&family<45402.5)return mix(vec3(.72,.70,.63),vec3(.88,.85,.76),clamp(normal.y*.4+.55,0.0,1.0));
 if(family>45402.5&&family<45403.5){float top=s074Line(f.y-56.0,3.675,.025);return mix(vec3(.38,.49,.51),vec3(.65,.67,.64),top*.45);}
 if(family>45403.5&&family<45404.5){
  // Base GFRC/metal is documented; unseen rear opening counts remain unknown.
  vec3 col=vec3(.61,.60,.56);float joint=s074Line(f.y,4.0,.025);col=mix(col,vec3(.46,.46,.43),joint*.4);
  // Street-facing hotel entrance remains glazed, not a solid office-window
  // extrusion. Width/count are explicitly own-photo approximate.
  if(normal.x>.5&&f.y<6.2){float bay=max(1.0,f.w/floor(f.w/2.6+.5));col=mix(vec3(.26,.37,.39),vec3(.59,.60,.56),max(s074Line(f.x,bay,.065),s074Line(f.y,3.1,.08)));}
  return col;
 }
 if(family>45404.5&&family<45405.5)return vec3(.49,.50,.48);
 if(family>45409.5&&family<45410.5){
  // Architect's1.35m modules, shifted grouped-floor rhythms and doubleheight
  // foyer. These are this tower's published facade contract, not generic grid.
  float u=f.x,v=f.y,group=floor(max(v-6.0,0.0)/8.0);
  float fin=s074Line(u+mod(group,2.0)*.675,1.35,.057);
  float trans=s074Line(v-6.0,4.0,.045);float sp=1.0-smoothstep(.16,.32,abs(mod(v-6.0,4.0)-.48));
  vec3 glass=mix(vec3(.27,.39,.45),vec3(.42,.51,.55),clamp(v/106.0,0.0,1.0));glass=mix(glass,vec3(.22,.30,.33),sp*.42);
  if(v<6.0){glass=vec3(.24,.35,.38);trans=s074Line(v,6.0,.045);}
  return mix(glass,vec3(.70,.71,.68),max(fin,trans));
 }
 if(family>45410.5&&family<45411.5)return mix(vec3(.14,.21,.23),vec3(.47,.49,.46),s074Line(f.x,1.35,.035)*.6);
 if(family>45411.5&&family<45412.5)return vec3(.49,.50,.48);
 if(family>45412.5&&family<45413.5){
  // Published landscaped23m terrace, registered to this north plinth in metre
  // UV. Plant/path layout is an explicit photo/description approximation.
  float walk=1.0-smoothstep(1.0,1.35,abs(f.x-1.8));
  return mix(vec3(.43,.48,.34),vec3(.71,.68,.56),walk);
 }
 if(family>45413.5&&family<45414.5)return mix(vec3(.14,.19,.21),vec3(.54,.55,.52),s074Line(f.x,1.35,.055));
 if(family>45414.5&&family<45415.5)return mix(vec3(.60,.61,.58),vec3(.77,.78,.74),clamp(normal.x*.12-normal.z*.14+.65,0.0,1.0));
 return base;
}
`;
