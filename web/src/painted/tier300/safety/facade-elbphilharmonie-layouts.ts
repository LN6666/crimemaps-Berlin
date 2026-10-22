/**
 * Source-bound Elbphilharmonie surface painting; visual acceptance separate.
 * Required globals: fpInside, fpStroke, fpRepeatStroke, fpLayer,
 * fpSurfaceOnly and foRect from the existing facade fragment/primitives.
 * Original target: hamburg|osm/way/24981342; component d0a99814ae5178c5920b.
 * Native source surfaces span y=19.99..85 m, not ground..110 m.
 * No vertex movement or new surfaces; roof depth is painted with lines and shading.
 * All panel pitches, Plaza placement and reflected fields below are explicit
 * drawing approximations pending native face binding and selected-view review.
 */
export const ELBPHILHARMONIE_PROPOSED_LAYOUTS = {
  140: 'Selected observed main elevation: visible warehouse/Plaza/glass partition',
  141: 'Selected observed western Kaispitze return: independent glass field',
  142: 'Owner-observed eastern glass field: orientation-specific panel highlights',
  143: 'Owner-observed diagonal glass field: curved openings and reflections',
  144: 'Original visible warehouse-only surface',
  145: 'Original bound Plaza/junction surface only',
  146: 'Original observed upper glass-only surface',
  147: 'Original skillion/sloped roof: conservative surface colour only',
  148: 'Original horizontal roof/junction: retain native surface',
  149: 'Unverified original surface: material-only preservation',
} as const;

export const FACADE_ELBPHILHARMONIE_GLSL = `
uniform vec4 u_fe_roof_edges[5];uniform int u_fe_roof_edge_count;
float feHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// This is a display partition inside the visible native mesh, not a measured
// Plaza elevation. The MD supplies no absolute Plaza height.
float fePlazaPaintY() {
  return 19.99 + (85.0 - 19.99) * 0.26;
}

vec3 feWarehouse(vec3 base, vec2 uv, float absoluteY, float W, float variant) {
  vec3 brick = mix(base, vec3(0.47, 0.28, 0.22), 0.89);
  brick = fpSurfaceOnly(brick, uv, 1.0);
  // Documented compact 0.50 x 0.75 m structural apertures; spacing is a
  // conservative drawing approximation, not an independently counted grid.
  vec2 cell = vec2(mod(uv.x + 0.6, 3.2) - 1.6,
                   mod(absoluteY - 19.99 + 0.4, 2.4) - 1.2);
  float hole = foRect(cell, vec2(0.25, 0.375));
  float reveal = foRect(cell + vec2(0.035, 0.045), vec2(0.285, 0.41));
  brick = fpLayer(brick, reveal, vec3(0.28, 0.20, 0.17), 0.45);
  // No glazed frame, mullion, domestic sill or added storey band.
  brick=fpLayer(brick,hole,vec3(.16,.15,.14),.87);
  // Full-height warehouse glazing bands separated by broad brick piers.
  float stripCount=W>95.?4.:W>55.?3.:1.;
  float pitch=W/(stripCount+1.);
  float idx=floor(uv.x/pitch+.5);
  float strip=foRect(vec2(uv.x-idx*pitch,absoluteY-17.7),vec2(1.45,16.4))*step(1.,idx)*step(idx,stripCount);
  float transom=fpRepeatStroke(absoluteY,4.5,.10);
  vec3 glass=mix(vec3(.15,.22,.26),vec3(.37,.46,.48),.45+.22*sin(absoluteY*.23+variant));
  glass=fpLayer(glass,transom,vec3(.58,.60,.57),.75);
  glass=fpLayer(glass,fpStroke(abs(uv.x-idx*pitch)-1.35,.09),vec3(.35,.36,.33),.9);
  return fpLayer(brick,strip,glass,.96);
}

vec3 feGlass(vec3 base, vec3 p, vec3 normal, vec2 uv,
             float fieldVariant, float observedDetail) {
  float lower = max(0.0, p.y - fePlazaPaintY());
  float vertical = clamp(lower / max(110.0 - fePlazaPaintY(), 1.0), 0.0, 1.0);
  vec3 waterSky = mix(vec3(0.32, 0.47, 0.60), vec3(0.71, 0.81, 0.87), vertical);
  float faceValue = clamp(0.58 + 0.18 * normal.x - 0.12 * normal.z, 0.25, 0.88);
  vec3 skin = mix(base, waterSky * (0.81 + faceValue * 0.24), 0.91);
  // Static broad value fields are selected-view paint approximations.
  // They are not environment-mapped or physical reflections.
  float cityBand = (1.0 - smoothstep(0.12, 0.58, vertical)) *
                   (0.45 + 0.25 * sin(uv.x * 0.048 + fieldVariant * 1.8));
  skin = fpLayer(skin, cityBand, vec3(0.49, 0.46, 0.43), 0.17);
  float skySweep = smoothstep(-0.4, 0.8,
    sin(uv.x * 0.030 - lower * 0.034 + fieldVariant * 1.47));
  skin = fpLayer(skin, skySweep, vec3(0.80, 0.85, 0.85), 0.15);

  // Local panel hierarchy: broad modules, row-dependent widths/stagger,
  // gentle curved joints and low-contrast faceting inside continuous glass.
  // Exact panel shapes/counts remain unverified; these are not black windows.
  float rowHeight = mix(4.4, 4.9, fract(fieldVariant * 0.37));
  float warpedY = lower + observedDetail * 0.32 *
                 sin(uv.x * 0.071 + fieldVariant);
  float row = floor(warpedY / rowHeight);
  float moduleWidth = 4.7 + observedDetail *
                     (feHash(vec2(row, fieldVariant + 2.0)) - 0.5) * 2.1;
  float shiftedX = uv.x + moduleWidth * fract(row * 0.17 + fieldVariant * 0.23) +
                   observedDetail * 0.18 * sin(lower * 0.14 + fieldVariant);
  float col = floor(shiftedX / moduleWidth);
  vec2 local = vec2(mod(shiftedX, moduleWidth) - moduleWidth * 0.5,
                    mod(warpedY, rowHeight) - rowHeight * 0.5);
  float seed = feHash(vec2(col + fieldVariant * 9.0, row));
  float tint = (seed - 0.5) * (0.05 + observedDetail * 0.09);
  skin *= 1.0 + tint;
  float joint = max(fpStroke(abs(local.x) - moduleWidth * 0.5, 0.035),
                    fpStroke(abs(local.y) - rowHeight * 0.5, 0.028));
  skin = fpLayer(skin, joint, vec3(0.39, 0.47, 0.49), 0.40);
  float edgeGlint = fpStroke(local.x - moduleWidth * 0.5 + 0.085, 0.019);
  skin = fpLayer(skin, edgeGlint, vec3(0.82, 0.88, 0.87), 0.30);
  float facet = fpInside(local.y - local.x * (0.36 + seed * 0.42) -
                        (seed - 0.5) * rowHeight * 0.56);
  skin = fpLayer(skin, facet * observedDetail, vec3(0.72, 0.78, 0.79), 0.12);
  float curvedGlint = fpStroke(local.x -
    sin(local.y / max(rowHeight, 0.1) * 2.2 + seed * 2.0) * moduleWidth * 0.15,
    0.045);
  skin = fpLayer(skin, curvedGlint * observedDetail, vec3(0.84, 0.88, 0.87), 0.10);
  // Photograph-supported curved panel highlights within the glass skin.
  float oval=fpInside(length(local/vec2(moduleWidth*.32,rowHeight*.35))-1.0);
  skin=fpLayer(skin,oval,vec3(.37,.54,.66),.18);
  if(feHash(vec2(col,fieldVariant+7.))>.73&&seed>.42){
    float opening=fpInside(length((local-vec2(0.,rowHeight*.10))/vec2(moduleWidth*.25,rowHeight*.36))-1.)*step(local.y,rowHeight*.20);
    skin=fpLayer(skin,opening,vec3(.13,.24,.31),.76);
    float curve=fpStroke(length((local-vec2(0.,rowHeight*.10))/vec2(moduleWidth*.25,rowHeight*.36))-1.,.055)*step(local.y,rowHeight*.20);skin=fpLayer(skin,curve,vec3(.86,.92,.93),.48);}
  return clamp(skin, 0.0, 1.0);
}

vec3 fePlazaBand(vec3 colour, float absoluteY) {
  float dy = absoluteY - fePlazaPaintY();
  colour = fpLayer(colour, fpStroke(dy, 0.14), vec3(0.82, 0.83, 0.78), 0.86);
  colour = fpLayer(colour, fpStroke(dy - 0.40, 0.17), vec3(0.29, 0.32, 0.32), 0.64);
  return fpLayer(colour, fpStroke(dy + 0.26, 0.075), vec3(0.61, 0.62, 0.57), 0.50);
}

// Finite quadratic seams follow the owner's annotated peak/valley graph.
// Returns nearest distance and signed side, in registered roof metres.
vec2 feRoofCurve(vec2 p,vec2 a,vec2 control,vec2 b){
 vec2 best=vec2(10000.,0.),prev=a;
 for(int i=1;i<=12;i++){
  float t=float(i)/12.;vec2 next=mix(mix(a,control,t),mix(control,b,t),t);
  vec2 d=next-prev;float h=clamp(dot(p-prev,d)/max(dot(d,d),.001),0.,1.);
  vec2 delta=p-prev-h*d;float dist=length(delta);
  if(dist<best.x)best=vec2(dist,sign(d.x*delta.y-d.y*delta.x));prev=next;
 }
 return best;
}
vec3 feRoofSurface(vec3 base,vec2 uv,float W,float H){
 // Transverse limits come from the seven original footprint anchors.
 float v=clamp(uv.y,0.,127.070656);
 float left=v<122.0046?33.1790*v/122.0046:mix(33.1790,53.6417,(v-122.0046)/5.066056);
 float right=v<21.1889?80.4104*v/21.1889:mix(80.4104,53.6417,(v-21.1889)/105.881756);
 float span=max(.30,right-left),x=clamp((uv.x-left)/span,0.,1.);
 // Registered graph traced from the owner's red annotated aerial photograph.
 // W=western lower corner; P/T=northern peaks; M=interior valley junction;
 // Q/R=southern edge valleys; E=eastern edge junction. No lines extend past nodes.
 vec2 Wp=vec2(32.424,112.486),P=vec2(59.55,92.88),T=vec2(70.0,51.1);
 vec2 M=vec2(39.29,61.97),Q=vec2(21.9,74.6),R=vec2(11.22,35.9),E=vec2(55.17,19.061);
 vec2 curves[8]=vec2[8](
  feRoofCurve(uv,Wp,vec2(45.,108.),P),
  feRoofCurve(uv,P,vec2(44.,84.),Q),
  feRoofCurve(uv,P,vec2(43.,85.),M),
  feRoofCurve(uv,Q,vec2(32.,70.),M),
  feRoofCurve(uv,M,vec2(54.,61.),T),
  feRoofCurve(uv,M,vec2(33.,46.),R),
  feRoofCurve(uv,T,vec2(61.,31.),E),
  feRoofCurve(uv,R,vec2(31.,26.),E));
 vec2 nearest=vec2(10000.,0.);
 for(int i=0;i<8;i++){if(curves[i].x<nearest.x)nearest=curves[i];}
 // Broad asymmetric gradients carry the depth; the seam itself stays subtle.
 float fold=exp(-nearest.x/5.8);
 float shade=.92-.07*x-fold*(nearest.y<0.?.25:.08);
 float junctionShadow=.12*exp(-length((uv-M)/vec2(10.,14.)));
 vec3 silver=mix(vec3(.40,.52,.61),vec3(.97,.97,.94),clamp(shade-junctionShadow,.22,.99));
 silver=fpLayer(silver,fpStroke(nearest.x,.13),vec3(.60,.67,.69),.32);
 float lightLip=fpStroke(nearest.x-.35,.15)*step(0.,nearest.y);
 silver=fpLayer(silver,lightLip,vec3(.99,.99,.96),.55);
 float distance=10000.;
 for(int i=0;i<5;i++){if(i>=u_fe_roof_edge_count)break;vec2 a=u_fe_roof_edges[i].xy,b=u_fe_roof_edges[i].zw,d=b-a;float t=clamp(dot(uv-a,d)/max(dot(d,d),.01),0.,1.);distance=min(distance,length(uv-a-t*d));}
 float edge=fpStroke(distance,.17);
 silver=fpLayer(silver,edge,vec3(.91,.94,.91),.72);
 // Fine staggered irregular metallic tiles remain subordinate to broad fields.
 float tileRow=floor(uv.y/.85);
 float stagger=feHash(vec2(tileRow,8.))* .65;
 vec2 tileUv=vec2(uv.x+stagger,uv.y);
 float tile=feHash(floor(tileUv/vec2(.72,.85)));
 silver*=.88+.17*tile;
 float seams=max(fpRepeatStroke(tileUv.x,.72,.015),fpRepeatStroke(tileUv.y,.85,.015));
 silver=fpLayer(silver,seams,vec3(.47,.56,.61),.23);
 // Three photo-supported roof-light fields; perspective and shadows are paint.
 vec2 q=vec2(x,v/127.070656);
 vec2 a=q-vec2(.40,.26);a.x+=a.y*.40;
 vec2 b=q-vec2(.58,.66);b.x-=b.y*.28;
 vec2 c=q-vec2(.76,.90);c.x+=c.y*.80;
 float cutA=foRect(a,vec2(.105,.062)),cutB=foRect(b,vec2(.15,.065));
 float cutC=foRect(c,vec2(.11,.027));
 float surround=max(foRect(a+vec2(.012,.007),vec2(.12,.073)),max(foRect(b+vec2(.012,.007),vec2(.165,.076)),foRect(c+vec2(.012,.007),vec2(.125,.038))));
 silver=fpLayer(silver,surround,vec3(.28,.38,.43),.65);
 float cuts=max(cutA,max(cutB,cutC));
 vec3 recess=mix(vec3(.045,.09,.13),vec3(.19,.31,.38),smoothstep(-.06,.06,b.y));
 recess=fpLayer(recess,fpRepeatStroke(uv.x,.95,.07),vec3(.35,.44,.46),.48);
 silver=fpLayer(silver,cuts,recess,.98);
 return mix(base,silver,.97);
}

vec3 fePaint(vec3 base, vec3 p, vec3 normal, vec4 frame, float layoutId) {
  // Only shade original fragment surfaces; never synthesize missing lower body.
  if (p.y < -.015 || p.y > 110.025) return base;
  vec2 uv = frame.xy;
  float family = floor(layoutId + 0.5);
  // Native roof is a skillion approximation. Preserve its existing outline;
  // Curves, roof lights and recess shadows are graphic depth cues only.
  if (family == 149.0) return fract(layoutId)>.05?mix(base,vec3(.47,.28,.22),.92):base;
  if (family == 147.0)return feRoofSurface(base,uv,frame.w,frame.z);
  if (family == 148.0)return mix(base,vec3(.55,.69,.76),.94);
  if(abs(normal.y)>.12)return base;
  if (family == 144.0) return feWarehouse(base, uv, p.y,frame.w,normal.x+normal.z);
  if (family == 145.0) return fePlazaBand(base, p.y);
  if (family == 146.0) return feGlass(base, p, normal, uv, 0.0, 1.0);
  if (family < 140.0 || family > 143.0) return base;
  float variant = family - 140.0;
  // 142/143 retain source-limited detail rather than copying the observed grid.
  float observed = 1.0;
  vec3 colour;
  if (p.y < fePlazaPaintY()) colour = feWarehouse(base, uv, p.y,frame.w,normal.x+normal.z);
  else colour = feGlass(base, p, normal, uv, variant, observed);
  colour=fePlazaBand(colour,p.y);
  // Long elevations: broad arched Plaza openings, without cutting the mesh.
  if(frame.w>95.){
    float centre=frame.w*(variant>2.? .49:.55),halfW=variant>2.?18.:10.;
    vec2 arch=vec2((uv.x-centre)/halfW,(p.y-fePlazaPaintY())/8.0);
    float aperture=fpInside(dot(arch,arch)-1.)*step(0.,arch.y);
    colour=fpLayer(colour,aperture,vec3(.09,.18,.24),.96);
    float rim=fpStroke(length(arch)-1.,.035)*step(0.,arch.y);
    colour=fpLayer(colour,rim,vec3(.78,.86,.87),.83);
    if(variant<2.){float piers=fpStroke(uv.x-centre-halfW*.38,.20)+fpStroke(uv.x-centre+halfW*.38,.20);colour=fpLayer(colour,aperture*piers,vec3(.74,.79,.77),.95);}
  }
  return colour;
}
`;
