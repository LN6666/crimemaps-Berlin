// Individual Marienturm facade from actual architect close-up and entrance photographs.
// 38 floor native metadata vs 39 architect-count discrepancy retained; meter cadence is photo estimate.
export const MARIENTURM_SPECIFIC_050_GLSL=String.raw`
float mt050Line(float x,float w){float aa=max(fwidth(x),.005);return 1.-smoothstep(w-aa,w+aa,abs(x));}
vec3 marienturmSpecific050(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family==45061.){
  if(abs(normal.y)>.2)return vec3(.52,.51,.46);
  float rail=mt050Line(mod(frame.x,1.4)-.7,.025)+mt050Line(frame.y-.15,.035)+mt050Line(frame.y-2.95,.035);
  return mix(vec3(.20,.31,.33),vec3(.67,.64,.56),clamp(rail,0.,1.));
 }
 if(family!=45060.)return base;
 // Roof is not in wall frame program. No invented triangles, HVAC or roof windows.
 if(abs(normal.y)>.2)return base;
 float u=abs(dot(normal.xz,normalize(vec2(.874,.486))))>.7?frame.z:frame.x,y=frame.y;
 float bay=1.35, floorH=3.86;
 float q=mod(u+.675,bay)-.675;
 float fy=mod(y-1.15,floorH);
 vec3 glass=vec3(.29,.40,.46),silver=vec3(.72,.69,.62),bright=vec3(.83,.80,.73),gasket=vec3(.12,.14,.14);
 // The facade photograph shows broad clear glazing above paired grey blind zones,
 // slender champagne-silver profiles, dark recessed gaskets and alternate raised pilasters.
 float seam=mt050Line(q,.035),outer=mt050Line(q,.065),fin=mt050Line(mod(u+1.35,2.7)-1.35,.105);
 float edgeShade=mt050Line(q+.083,.025);
 vec3 col=glass;
 float blind=step(3.11,fy);
 col=mix(col,vec3(.37,.40,.40),blind*.77);
 float fineBlind=mt050Line(mod(fy,.065)-.0325,.006)*blind;
 col=mix(col,vec3(.29,.32,.32),fineBlind*.28);
 // Muted reflectance variation represents pane material, not fixed cloud photographs.
 col+=vec3(.018,.022,.025)*sin(u*.19+y*.022);
 col=mix(col,gasket,outer);col=mix(col,silver,seam);
 col=mix(col,vec3(.17,.20,.20),edgeShade*.65);
 col=mix(col,silver,fin);col=mix(col,bright,mt050Line(mod(u+1.35,2.7)-1.35-.075,.018));
 float transom=mt050Line(fy-.02,.037);
 col=mix(col,gasket,mt050Line(fy-.02,.075));col=mix(col,silver,transom);
 // Every actual floor has slim cross rail; no generic thick beige slab band.
 // Taunusanlage east long elevation: four-storey-high foyer, independently spaced
 // tall mullions and ground door panes, no repeated office-floor stripes inside foyer.
 float east=step(.8,dot(normal.xz,normalize(vec2(.874,.486))));
 if(east>.5&&frame.x>24.&&frame.z>-17.85&&frame.z<23.28&&y<14.3){
  float foyerU=frame.z+17.85;float mull=mt050Line(mod(foyerU,2.70)-1.35,.07);
  col=vec3(.26,.38,.39);col=mix(col,silver,mull);
  col=mix(col,silver,mt050Line(mod(y,4.15)-.02,.025));
  if(y<3.1){float door=1.-smoothstep(1.25,1.55,min(abs(frame.z+2.96),abs(frame.z-8.14)));col=mix(col,vec3(.17,.24,.24),door*.45);col=mix(col,silver,mt050Line(mod(foyerU,5.4)-2.7,.045));}
  col=mix(col,vec3(.62,.59,.52),mt050Line(y-3.2,.11));
 }
 if(y<.6)col=vec3(.25,.26,.25);
 return col;
}
`;
