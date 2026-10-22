/** Isolated Hamburg church drawing grammar, unimported/unadmitted.
 * Canonical inputs: hamburg-st-petri.md / hamburg-st-michaelis.md.
 * Required globals: fpInside, fpStroke, fpRepeatStroke, fpLayer, fpWindowShape,
 * fpSurfaceOnly, foRect, foTriangle, foRoundedArcade, foOrderColumn,
 * foNicheStatue and foReliefCrown. No edits to accepted shared modules.
 * Frame = local U,V, selected original semantic field height,width.
 * Root must bind actual decoded native surfaces/stages, not raw height tags.
 * Clock, upper gable and verified porthole IDs require local semantic frames.
 * No new vertices, new apertures, false lantern voids or repeated spire windows.
 */
export const HAMBURG_CHURCH_PROPOSED_LAYOUTS = {
  150: 'Petri tall subdivided side/choir lancet tier',
  151: 'Petri compact paired ROUND lights in a verified upper chapel gable',
  152: 'Petri west dark timber portal and bronze pulls',
  153: 'Petri square tower: sparse compact rounded pairs and louvres',
  154: 'Petri one clock on separately framed triangular masonry field',
  155: 'Petri copper taper: seams only, no window grid',
  156: 'Petri ONE verified tiny porthole patch, independently framed',
  157: 'Petri original dark nave/chapel slope, no invented dormers',
  158: 'Petri blind masonry gable/stone figure accent',
  159: 'Petri unknown original field: masonry only',
  160: 'Michel verified three-window projecting body face only',
  161: 'Michel source-limited side/return: solid brick and stone boundary only',
  162: 'Michel west round-column portal outside glazed tympanum',
  163: 'Michel lower tower: solid horizontal rustication',
  164: 'Michel original copper stage: inset solid fields, no window array',
  165: 'Michel one black/gold clock on separately framed source clock face',
  166: 'Michel material on actual source lantern supports; no painted fake void',
  167: 'Michel original copper rounded cap/stem: no glazing',
  168: 'Michel original dark metal roof slope: local seam treatment',
  169: 'Michel unverified original surface: preserve base',
  240: 'Moorburg photographed wall: red brick, repeated tall windows and painted bronze-green tower cue',
  241: 'Moorburg native flat roof: terracotta pitch illusion, ridge/tile shadows and tower footprint cue',
  242: 'Moorburg other walls: red brick, with no unobserved window pattern',
  245: 'Michaeliskirche native flat cross-plan roof: terracotta tile field and crossing ridge/valley shadows with dark tower-cap cue',
  246: 'Michaeliskirche photographed west-facing native walls: restrained red brick and source-supported round-headed windows',
} as const;

export const HAMBURG_CHURCH_FACADE_GLSL = `
uniform vec4 u_petri_west_portal;
float hcOpeningMask(vec2 q, vec2 h, float pointed) {
  h = max(h, vec2(0.025));
  float capH = min(h.y * 0.46, h.x * (pointed > 0.5 ? 1.55 : 1.0));
  float spring = h.y - capH;
  float lowerH = (spring + h.y) * 0.5;
  float lower = foRect(q - vec2(0.0, (spring - h.y) * 0.5), vec2(h.x, lowerH));
  vec2 cap = vec2(q.x, q.y - spring);
  float head;
  if (pointed > 0.5) {
    // Two intersecting curved arcs form a compact pointed head, preserving
    // a substantial rectangular lower glazing field (not a tall triangle).
    float yy = cap.y * (1.7320508 * h.x / max(capH, 0.02));
    float curve = max(length(vec2(cap.x + h.x, yy)),
                      length(vec2(cap.x - h.x, yy))) - 2.0 * h.x;
    head = fpInside(max(curve, max(-cap.y, cap.y - capH)));
  } else {
    float curve = (length(cap / vec2(h.x, max(capH, 0.02))) - 1.0) * min(h.x, capH);
    head = fpInside(max(curve, max(-cap.y, cap.y - capH)));
  }
  return max(lower, head);
}

vec3 hcBrick(vec3 base, vec2 uv, float michel) {
  vec3 colour = mix(base, mix(vec3(0.49,0.31,0.25),vec3(0.58,0.34,0.28),michel),0.83);
  return fpSurfaceOnly(colour,uv,1.0);
}

vec3 hcStoneBand(vec3 wall, vec2 uv, float y, float halfHeight) {
  float band=fpStroke(uv.y-y,halfHeight);
  wall=fpLayer(wall,band,vec3(0.77,0.75,0.66),0.91);
  wall=fpLayer(wall,fpStroke(uv.y-y+halfHeight,0.035),vec3(0.39,0.41,0.38),0.58);
  return fpLayer(wall,fpStroke(uv.y-y-halfHeight,0.028),vec3(0.90,0.87,0.76),0.65);
}

vec3 hcTallGlass(vec3 wall, vec2 q, vec2 h, float pointed, float michel) {
  float inner=hcOpeningMask(q,h,pointed),outer=hcOpeningMask(q,h+vec2(0.15),pointed);
  float shadow=hcOpeningMask(q-vec2(0.075,-0.065),h+vec2(0.21),pointed);
  wall=fpLayer(wall,shadow,vec3(0.22,0.20,0.18),0.38);
  wall=fpLayer(wall,inner,mix(vec3(0.32,0.38,0.39),vec3(0.48,0.55,0.56),michel),0.90);
  vec3 surround=mix(vec3(0.57,0.37,0.29),vec3(0.82,0.79,0.68),michel);
  wall=fpLayer(wall,max(0.0,outer-inner),surround,0.95);
  float capH=min(h.y*0.46,h.x*(pointed>0.5?1.55:1.0)),spring=h.y-capH;
  float vertical=max(fpStroke(q.x,0.040),
    max(fpStroke(q.x-h.x*0.49,0.030),fpStroke(q.x+h.x*0.49,0.030)));
  float horizontal=fpRepeatStroke(q.y+h.y, max(0.65,(2.0*h.y-capH)/5.0),0.026);
  float rectangularField=1.0-smoothstep(spring-0.04,spring+0.04,q.y);
  float grid=max(vertical,horizontal*rectangularField)*inner;
  wall=fpLayer(wall,grid,mix(vec3(0.14,0.16,0.16),vec3(0.25,0.27,0.26),michel),0.94);
  float springBar=fpStroke(q.y-spring,0.042)*inner;
  wall=fpLayer(wall,springBar,vec3(0.25,0.28,0.27),0.87);
  if(pointed>0.5){
    float crownY=spring+capH*0.43;
    float ring=fpStroke(length(q-vec2(0.0,crownY))-min(h.x*0.24,0.32),0.028)*inner;
    float branches=max(fpStroke(q.x-(q.y-spring)*0.52,0.029),
                       fpStroke(q.x+(q.y-spring)*0.52,0.029))*step(spring,q.y)*inner;
    wall=fpLayer(wall,max(ring,branches),vec3(0.28,0.31,0.29),0.93);
  }
  float sill=fpStroke(q.y+h.y+0.15,0.070)*step(abs(q.x),h.x+0.24);
  return fpLayer(wall,sill,mix(vec3(0.55,0.40,0.31),vec3(0.85,0.82,0.71),michel),0.89);
}

vec3 hcRoundPair(vec3 wall,vec2 q,float width,float height,float louvred){
  for(int j=0;j<2;j++){
    vec2 p=q-vec2(float(j*2-1)*width*1.65,0.0);
    float inner=hcOpeningMask(p,vec2(width,height),0.0);
    float outer=hcOpeningMask(p,vec2(width+0.11,height+0.10),0.0);
    wall=fpLayer(wall,max(0.0,outer-inner),vec3(0.63,0.45,0.33),0.89);
    wall=fpLayer(wall,inner,mix(vec3(0.38,0.42,0.40),vec3(0.13,0.14,0.13),louvred),0.92);
    float bars=mix(fpStroke(p.x,0.024),fpRepeatStroke(p.y,0.18,0.023),louvred)*inner;
    wall=fpLayer(wall,bars,vec3(0.22,0.22,0.19),0.84);
  }
  return wall;
}

vec3 hcBlindTrefoil(vec3 wall,vec2 q,float radius){
  float a=fpStroke(length(q-vec2(0.0,radius*0.45))-radius*0.55,0.045);
  float b=fpStroke(length(q-vec2(radius*0.43,-radius*0.23))-radius*0.55,0.045);
  float c=fpStroke(length(q-vec2(-radius*0.43,-radius*0.23))-radius*0.55,0.045);
  wall=fpLayer(wall,max(a,max(b,c)),vec3(0.35,0.26,0.21),0.44);
  return fpLayer(wall,fpStroke(length(q)-radius*1.06,0.032),vec3(0.67,0.48,0.34),0.53);
}

float hcRomanDigits(vec2 q,float r,float cardinal){
  float hh=r*0.095,w=r*0.044,stroke=max(0.018,r*0.013);
  float digits=0.0;
  if(cardinal<0.5){
    digits=max(fpStroke(q.y-q.x*hh/w,stroke),fpStroke(q.y+q.x*hh/w,stroke))*foRect(q,vec2(w,hh));
    digits=max(digits,max(foRect(q-vec2(w*1.55,0.0),vec2(stroke,hh)),foRect(q-vec2(w*2.4,0.0),vec2(stroke,hh))));
  }else if(cardinal<1.5){
    for(int j=0;j<3;j++)digits=max(digits,foRect(q-vec2(float(j-1)*w*1.1,0.0),vec2(stroke,hh)));
  }else if(cardinal<2.5){
    digits=fpStroke(q.y-(abs(q.x)/max(w,0.01))*hh*2.0+hh,stroke)*foRect(q,vec2(w,hh));
    digits=max(digits,foRect(q-vec2(w*1.8,0.0),vec2(stroke,hh)));
  }else{
    vec2 x=q-vec2(w*0.85,0.0);
    digits=max(fpStroke(x.y-x.x*hh/w,stroke),fpStroke(x.y+x.x*hh/w,stroke))*foRect(x,vec2(w,hh));
    digits=max(digits,foRect(q+vec2(w*0.95,0.0),vec2(stroke,hh)));
  }
  return digits;
}

vec3 hcClock(vec3 wall,vec2 q,float radius,float michel){
  float r=max(radius,0.25),d=length(q),dial=fpInside(d-r);
  wall=fpLayer(wall,fpInside(d-r-0.16),mix(vec3(0.67,0.52,0.35),vec3(0.28,0.33,0.29),michel),0.82);
  wall=fpLayer(wall,dial,vec3(0.13,0.18,0.18),0.96);
  float paleRing=(fpInside(d-r)-fpInside(d-r*0.63))*(1.0-michel);
  wall=fpLayer(wall,paleRing,vec3(0.84,0.83,0.72),0.92);
  float rim=fpStroke(d-r,0.07);
  vec3 marks=mix(vec3(0.20,0.24,0.22),vec3(0.84,0.71,0.39),michel);
  wall=fpLayer(wall,rim,mix(vec3(0.89,0.87,0.74),marks,michel),0.95);
  float angle=atan(q.y,q.x),ticks=fpRepeatStroke(angle,6.2831853/12.0,0.027)*fpInside(abs(d-r*0.78)-r*0.075);
  wall=fpLayer(wall,ticks*dial,marks,0.94);
  for(int k=0;k<4;k++){
    float a=1.5707963-float(k)*1.5707963;vec2 at=vec2(cos(a),sin(a))*r*0.78;
    wall=fpLayer(wall,hcRomanDigits(q-at,r,float(k))*dial,marks,0.96);
  }
  float hands=max(fpStroke(q.x,0.035)*foRect(q-vec2(0.0,r*0.17),vec2(0.06,r*0.42)),
                  fpStroke(q.y-q.x*0.40,0.036)*foRect(q-vec2(r*0.14,0.0),vec2(r*0.35,r*0.18)));
  return fpLayer(wall,hands*dial,mix(vec3(0.84,0.83,0.70),vec3(0.92,0.79,0.44),michel),0.98);
}

vec3 hcPetriPortal(vec3 wall,vec2 uv,float W,float H){
  vec2 q=uv-vec2(W*0.5,H*0.27),h=vec2(min(W*0.18,1.8),min(H*0.21,3.1));
  float arch=hcOpeningMask(q,h,1.0),outer=hcOpeningMask(q,h+vec2(0.22),1.0);
  wall=fpLayer(wall,max(0.0,outer-arch),vec3(0.48,0.33,0.25),0.92);
  wall=fpLayer(wall,arch,vec3(0.20,0.17,0.14),0.94);
  wall=fpLayer(wall,fpRepeatStroke(q.x,0.31,0.018)*arch,vec3(0.40,0.29,0.20),0.42);
  for(int k=0;k<2;k++){
    vec2 pull=q-vec2(float(k*2-1)*h.x*0.18,-h.y*0.19);float face=fpInside(length(pull)-0.10);
    wall=fpLayer(wall,face,vec3(0.27,0.23,0.16),0.93);
    wall=fpLayer(wall,fpStroke(length(pull)-0.105,0.018),vec3(0.64,0.53,0.31),0.80);
  }
  return wall;
}

vec3 hcPetriNave(vec3 wall,vec2 uv,float W,float H){
  float margin=min(1.0,W*0.12),count=max(1.0,floor((W-2.0*margin)/5.2));
  float pitch=(W-2.0*margin)/count,x=uv.x-margin;
  if(x<0.0||x>W-2.0*margin)return wall;
  float center=(floor(x/pitch)+0.5)*pitch;
  vec2 q=vec2(x-center,uv.y-H*0.52),h=vec2(min(pitch*0.28,1.5),H*0.35);
  wall=hcTallGlass(wall,q,h,1.0,0.0);
  float pier=fpStroke(mod(x,pitch),0.075)*step(H*0.08,uv.y)*step(uv.y,H*0.90);
  wall=fpLayer(wall,pier,vec3(0.64,0.44,0.31),0.40);
  // Thin green caps mark the observed stepped buttress offsets. These local
  // surface cues do not create the physical projection if native relief lacks it.
  for(int k=0;k<3;k++){
    float y=H*(0.27+float(k)*0.26);
    float cap=foRect(vec2(mod(x,pitch),uv.y-y),vec2(min(pitch*.075,.38),.055));
    wall=fpLayer(wall,cap,vec3(.36,.55,.46),.67);
  }
  return wall;
}

vec3 hcPetriGable(vec3 wall,vec2 uv,float W,float H){
  // Independently framed upper gable only; lower lancet fields are ID150.
  wall=hcRoundPair(wall,uv-vec2(W*0.5,H*0.38),min(W*0.10,0.65),min(H*0.18,1.1),0.0);
  wall=hcBlindTrefoil(wall,uv-vec2(W*0.5,H*0.73),min(W*0.10,H*0.10));
  float divider=fpStroke(uv.x-W*0.5,0.052)*step(H*0.20,uv.y)*step(uv.y,H*0.84);
  return fpLayer(wall,divider,vec3(0.58,0.39,0.28),0.58);
}

vec3 hcPetriShaft(vec3 wall,vec2 uv,float W,float H){
  float width=min(W*0.065,0.65),height=min(H*0.032,1.0);
  wall=hcRoundPair(wall,uv-vec2(W*0.5,H*0.28),width,height,0.0);
  wall=hcRoundPair(wall,uv-vec2(W*0.5,H*0.56),width,height,1.0);
  wall=hcRoundPair(wall,uv-vec2(W*0.5,H*0.78),width*.80,height*.74,0.0);
  wall=hcStoneBand(wall,uv,H*0.10,0.07);wall=hcStoneBand(wall,uv,H*0.93,0.11);
  float corners=max(fpStroke(uv.x-W*0.08,0.055),fpStroke(uv.x-W*0.92,0.055));
  return fpLayer(wall,corners,vec3(0.66,0.44,0.30),0.58);
}

vec3 hcCopper(vec3 base,vec2 uv,float W,float H,float petri,float taper){
  vec3 c=mix(base,mix(vec3(0.34,0.43,0.38),vec3(0.40,0.36,0.31),petri),0.80);
  float shrink=mix(1.0,max(0.10,1.0-uv.y/max(H,0.1)*0.86),taper);
  float panelU=(uv.x-W*0.5)/shrink;
  c=fpLayer(c,fpRepeatStroke(panelU,0.83,0.018),vec3(0.17,0.22,0.21),0.42);
  return fpLayer(c,fpRepeatStroke(panelU-0.04,0.83,0.011),vec3(0.49,0.53,0.47),0.23);
}

vec3 hcMetalRoof(vec3 base,vec2 uv,float michel){
  vec3 c=mix(base,mix(vec3(0.24,0.26,0.29),vec3(0.25,0.30,0.29),michel),0.73);
  c=fpLayer(c,fpRepeatStroke(uv.x,0.82,0.015),vec3(0.13,0.17,0.17),0.30);
  return fpLayer(c,fpRepeatStroke(uv.x-0.045,0.82,0.011),vec3(0.42,0.46,0.41),0.20);
}

vec3 hcMichelPortal(vec3 wall,vec2 uv,float W,float H){
  float height=min(H*0.27,3.8),width=min(W*0.15,2.25);vec2 center=vec2(W*0.5,4.4);
  vec2 q=uv-center;vec2 h=vec2(width,height);
  float field=hcOpeningMask(q,h+vec2(0.26),0.0);wall=fpLayer(wall,field,vec3(0.78,0.77,0.67),0.91);
  float glazing=hcOpeningMask(q-vec2(0.0,height*0.51),vec2(width*.78,height*.55),0.0);
  wall=fpLayer(wall,glazing,vec3(0.45,0.52,0.52),0.89);
  float bars=max(fpRepeatStroke(q.x,max(width*.36,0.50),0.028),fpRepeatStroke(q.y,0.78,0.029))*glazing;
  wall=fpLayer(wall,bars,vec3(0.26,0.29,0.28),0.95);
  float door=foRect(q-vec2(0.0,-height*.50),vec2(width*.72,height*.53));
  wall=fpLayer(wall,door,vec3(0.20,0.17,0.14),0.96);
  wall=fpLayer(wall,fpRepeatStroke(q.x,0.34,0.018)*door,vec3(0.42,0.31,0.22),0.46);
  float foot=foRect(vec2(q.x,uv.y-.45),vec2(width*1.65,.16));
  wall=fpLayer(wall,foot,vec3(.78,.75,.65),.90);
  for(int stepIndex=0;stepIndex<3;stepIndex++)wall=fpLayer(wall,fpStroke(uv.y-(.15+float(stepIndex)*.18),.035)*step(abs(q.x),width*(1.85-float(stepIndex)*.10)),vec3(.48,.48,.41),.75);
  // Independent round column shafts, bases and articulated BLOCK capitals
  // remain outside the glazed tympanum; no Corinthian subtype is invented.
  for(int k=0;k<2;k++){
    vec2 columnQ=q-vec2(float(k*2-1)*width*1.31,0.0);
    wall=foOrderColumn(wall,columnQ,height*1.20,min(width*.16,0.38),0.0);
  }
  wall=hcStoneBand(wall,uv,center.y+height*1.37,0.16);
  wall=foReliefCrown(wall,q-vec2(0.0,height*1.48),width*.85,height*.22);
  float scrolls=max(fpStroke(length((q-vec2(width*.74,height*1.05))/vec2(width*.29,height*.24))-1.0,0.08),
                    fpStroke(length((q-vec2(-width*.74,height*1.05))/vec2(width*.29,height*.24))-1.0,0.08));
  wall=fpLayer(wall,scrolls,vec3(0.84,0.81,0.70),0.88);
  // Bronze archangel is one localized masonry silhouette, not glazing.
  vec2 figure=q-vec2(0.0,height*1.88);float head=fpInside(length(figure-vec2(0.0,height*.11))-height*.075);
  float body=foRect(figure-vec2(0.0,-height*.04),vec2(width*.06,height*.16));
  float wings=max(foTriangle(figure-vec2(width*.16,0.0),width*.22,height*.25),foTriangle(figure+vec2(width*.16,0.0),width*.22,height*.25));
  wall=fpLayer(wall,max(head,max(body,wings)),vec3(0.25,0.31,0.26),0.87);
  vec2 beast=figure-vec2(width*.18,-height*.24);
  float opponent=foTriangle(beast,width*.29,height*.16);
  float tail=fpStroke(length(beast-vec2(width*.27,0.0))-width*.20,.030)*step(beast.y,height*.02);
  return fpLayer(wall,max(opponent,tail),vec3(.24,.29,.24),.76);
}

vec3 hcMichelThreeLights(vec3 wall,vec2 uv,float W,float H){
  // ID160 is allowed ONLY on the verified three-window projection face.
  wall=hcStoneBand(wall,uv,H*0.08,0.12);wall=hcStoneBand(wall,uv,H*0.94,0.20);
  for(int k=0;k<3;k++){
    float u=W*(0.24+float(k)*0.26),w=min(W*.075,1.7),h=H*.31;
    wall=hcTallGlass(wall,uv-vec2(u,H*.50),vec2(w,h),0.0,1.0);
    if(k==1){
      wall=foReliefCrown(wall,uv-vec2(u,H*.83),w*1.05,H*.04);
      float curl=fpStroke(length((uv-vec2(u,H*.80))/vec2(w*1.16,H*.060))-1.0,0.06);
      wall=fpLayer(wall,curl,vec3(0.83,0.80,0.69),0.65);
    }
  }
  float pilasters=max(fpStroke(uv.x-W*.10,W*.017),fpStroke(uv.x-W*.90,W*.017));
  wall=fpLayer(wall,pilasters,vec3(0.79,0.77,0.66),0.92);
  float pediment=foTriangle(uv-vec2(W*.5,H*.985),W*.39,H*.115);
  return fpLayer(wall,pediment,vec3(0.78,0.76,0.66),0.45);
}

vec3 hcMichelRustication(vec3 wall,vec2 uv,float W,float H){
  float bed=fpRepeatStroke(uv.y,0.62,0.033);wall=fpLayer(wall,bed,vec3(0.34,0.27,0.23),0.50);
  wall=fpLayer(wall,fpRepeatStroke(uv.y-0.06,0.62,0.017),vec3(0.74,0.54,0.40),0.37);
  return hcStoneBand(wall,uv,H*.92,0.20);
}

vec3 hcMichelCopperStage(vec3 base,vec2 uv,float W,float H){
  vec3 c=hcCopper(base,uv,W,H,0.0,0.0);
  float corner=max(fpStroke(uv.x-W*.08,W*.025),fpStroke(uv.x-W*.92,W*.025));
  c=fpLayer(c,corner,vec3(0.39,0.46,0.42),0.75);
  for(int k=0;k<2;k++){
    vec2 q=uv-vec2(W*.5,H*(.30+float(k)*.37));vec2 h=vec2(W*.20,H*.10);
    float inset=max(fpStroke(abs(q.x)-h.x,0.06)*step(abs(q.y),h.y),fpStroke(abs(q.y)-h.y,0.06)*step(abs(q.x),h.x));
    c=fpLayer(c,inset,vec3(0.14,0.22,0.20),0.64);
  }
  // Inset panels are SOLID. Native source aperture faces need their own field,
  // never convert every panel into a black window.
  return c;
}

vec3 hcMichelVerifiedAperture(vec3 copper,vec2 uv,float W,float H,float rounded){
  // Entire frame is ONE source-observed aperture patch, not a tower-wide grid.
  if(uv.y<0.||uv.y>H)return copper;
  vec2 q=uv-vec2(W*.5,H*.5),h=vec2(W*.30,H*.32);
  if(rounded>.5)return hcTallGlass(copper,q,h,0.0,1.0);
  float opening=foRect(q,h),outer=foRect(q,h+vec2(.10));
  copper=fpLayer(copper,max(0.0,outer-opening),vec3(.42,.47,.43),.82);
  copper=fpLayer(copper,opening,vec3(.16,.22,.21),.90);
  float grid=max(fpStroke(q.x,.025),fpStroke(q.y-h.y*.12,.025))*opening;
  return fpLayer(copper,grid,vec3(.37,.42,.38),.80);
}

vec3 hcStoneFigure(vec3 wall,vec2 q,float width,float height,float bronze){
  float head=fpInside(length(q-vec2(0.0,height*.27))-width*.18);
  float body=foTriangle(q-vec2(0.0,-height*.04),width*.34,height*.69);
  float plinth=foRect(q-vec2(0.0,-height*.45),vec2(width*.46,height*.055));
  vec3 material=mix(vec3(.75,.72,.61),vec3(.30,.34,.28),bronze);
  wall=fpLayer(wall,max(head,max(body,plinth)),material,.88);
  return fpLayer(wall,fpStroke(q.x+width*.07,width*.05)*head,material*1.17,.51);
}

vec3 hcWesternGroup(vec3 wall,vec2 uv,float W){
 vec2 q=vec2(uv.x-W*.5+3.,uv.y-11.5);float H=8.;
 if(abs(q.x-3.)>3.||q.y<0.||q.y>H)return wall;
 wall=hcStoneFigure(wall,q-vec2(3.,H*.74),.54,H*.30,0.);
 for(int j=0;j<2;j++){
  wall=hcStoneFigure(wall,q-vec2(1.5+float(j)*3.,H*.69),.48,H*.23,0.);
  wall=hcStoneFigure(wall,q-vec2(1.98+float(j)*2.04,H*.33),.54,H*.27,0.);
 }
 return wall;
}
vec3 hcBonhoeffer(vec3 wall,vec2 uv,float W){
 // Local bronze prisoner and rectangular stone plinth; no invented arch surround.
 vec2 q=uv-vec2(W*.27,1.9);float head=fpInside(length(q-vec2(0.,.98))-.14);
 float coat=foTriangle(q-vec2(0.,.14),.34,1.55),feet=foRect(q-vec2(0.,-.64),vec2(.22,.20));
 float figure=max(head,max(coat,feet));
 wall=fpLayer(wall,figure,vec3(.24,.29,.23),.95);
 wall=fpLayer(wall,fpStroke(q.x+.08,.03)*figure,vec3(.49,.51,.40),.62);
 float hands=max(fpStroke(q.y-q.x*.40-.57,.035),fpStroke(q.y+q.x*.40-.57,.035))*foRect(q-vec2(0.,.57),vec2(.22,.10));
 wall=fpLayer(wall,hands,vec3(.53,.53,.40),.88);
 wall=fpLayer(wall,foRect(q-vec2(0.,-1.04),vec2(.53,.20)),vec3(.66,.64,.55),.95);
 return wall;
}
vec3 hcHamburgTileRoof(vec3 base,vec2 uv,float W,float H,float family,float detail){
  vec3 tint=family==249.||family==256.?vec3(.26,.28,.30):family==257.?vec3(.47,.53,.48):family==258.?vec3(.24,.40,.35):family==260.?vec3(.27,.39,.47):family==261.?vec3(.43,.45,.42):vec3(.58,.26,.16);
  if(family==251.||family==259.)tint=vec3(.32,.35,.34);
  if(family==253.)tint=vec3(.68,.67,.63);
  if(family==255.&&detail>.45)tint=vec3(.35,.37,.38);
  vec3 roof=mix(base,tint,.93);
  float pitch=family==256.?1.12:.82;
  float lines=max(fpRepeatStroke(uv.y,pitch,.018),fpRepeatStroke(uv.x+mod(floor(uv.y/pitch),2.)*.70,1.70,.014));
  roof=fpLayer(roof,lines,family==249.||family==256.?vec3(.13,.15,.16):vec3(.31,.14,.10),.48);
  if(detail>0.){
    float x=detail==2.?W*.30:(detail==3.?W*.70:W*.50);
    float body=foRect(uv-vec2(x,H*.5),vec2(min(W*.075,1.25),min(H*.12,1.25)));
    float shadow=foRect(uv-vec2(x+.14,H*.5-.12),vec2(min(W*.085,1.40),min(H*.13,1.38)));
    roof=fpLayer(roof,shadow,vec3(.13,.14,.12),.44);
    roof=fpLayer(roof,body,detail==5.?vec3(.23,.25,.26):vec3(.18,.36,.32),.90);
    float cap=foTriangle(uv-vec2(x,H*.5+.48),min(W*.07,1.0),min(H*.08,.90));
    roof=fpLayer(roof,cap,detail==5.?vec3(.31,.32,.32):vec3(.32,.47,.40),.86);
    float seams=max(fpStroke(uv.x-x,.028),fpRepeatStroke(uv.y-H*.5,.42,.024))*max(body,cap);
    roof=fpLayer(roof,seams,vec3(.10,.20,.18),.70);
    if(detail==4.){
      float second=foRect(uv-vec2(W*.68,H*.5),vec2(min(W*.06,1.),min(H*.10,1.)));
      roof=fpLayer(roof,second,vec3(.17,.35,.31),.88);
    }
    if(detail==6.)roof=fpLayer(roof,fpInside(length((uv-vec2(x,H*.5))/vec2(min(W*.08,1.2),min(H*.12,1.2)))-.74),vec3(.32,.48,.40),.88);
  }
  return roof;
}
float hcHamburgPhotoFace(vec3 n,float face){
  if(face<.5)return 0.;
  if(face<1.5)return step(.65,-n.x);
  if(face<2.5)return step(.65,n.x);
  if(face<3.5)return step(.65,-n.z);
  if(face<4.5)return step(.65,n.z);
  if(face<5.5)return max(step(.55,-n.x),step(.55,-n.z));
  if(face<6.5)return max(step(.55,n.x),step(.55,-n.z));
  if(face<7.5)return max(step(.55,n.x),step(.55,n.z));
  return max(step(.55,-n.x),step(.55,n.z));
}
vec3 hcHamburgWall(vec3 base,vec2 uv,float W,float H,vec3 n,float family,float detail,float face){
  vec3 tint=(family==249.||family==253.||family==257.||family==260.)?vec3(.76,.74,.68):family==255.&&detail<.4?vec3(.62,.57,.49):vec3(.58,.30,.22);
  vec3 wall=mix(base,tint,.91);
  float course=fpRepeatStroke(uv.y,family==254.?.48:.34,.014);
  float joint=fpRepeatStroke(uv.x+mod(floor(uv.y/.34),2.)*.34,.82,.011);
  wall=fpLayer(wall,max(course,joint),tint.r>.7?vec3(.48,.47,.43):vec3(.32,.15,.11),.42);
  if(family==254.)wall=fpLayer(wall,max(fpRepeatStroke(uv.x,2.2,.04),fpRepeatStroke(uv.x+uv.y,3.,.035)),vec3(.78,.73,.62),.88);
  if(family==256.)wall=fpLayer(wall,fpRepeatStroke(uv.y,max(.7,H*.16),.06),vec3(.70,.68,.60),.72);
  if(family==258.)wall=fpLayer(wall,max(fpRepeatStroke(uv.x,.42,.025),fpRepeatStroke(uv.y,.42,.025)),vec3(.22,.20,.18),.62);
  if(family==260.)wall=fpLayer(wall,max(fpRepeatStroke(uv.x,.38,.02),fpRepeatStroke(uv.y,.42,.018)),vec3(.37,.53,.61),.62);
  if(family==253.)return fpLayer(wall,fpRepeatStroke(uv.y,.28,.036)*step(H*.35,uv.y),vec3(.19,.22,.23),.90);
  float photoFace=hcHamburgPhotoFace(n,face);
  if(family==249.&&detail==5.&&photoFace>.5&&W>=6.&&H>=5.){
    vec2 ovalQ=uv-vec2(W*.50,H*.64);
    return foOvalLight(wall,ovalQ,vec2(min(W*.09,1.45),min(H*.20,1.65)));
  }
  if(family==258.||family==260.||photoFace<.5||H<3.2||W<4.5)return wall;
  float count=clamp(floor(W/3.4),1.,8.),bay=W/count;
  for(int i=0;i<8;i++){
    if(float(i)>=count)break;
    vec2 q=uv-vec2(bay*(float(i)+.5),H*.48),h=vec2(min(.48,bay*.20),min(1.15,H*.24));
    float inside=hcOpeningMask(q,h,family==248.?1.:0.),outer=hcOpeningMask(q,h+vec2(.14),family==248.?1.:0.);
    wall=fpLayer(wall,inside,vec3(.11,.16,.17),.94);
    wall=fpLayer(wall,max(0.,outer-inside),vec3(.76,.64,.49),.88);
    wall=fpLayer(wall,max(fpStroke(q.x,.025),fpStroke(q.y+.08,.022))*inside,vec3(.39,.38,.33),.82);
  }
  return wall;
}
vec3 hcPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float layoutId){
  float family=floor(layoutId),W=frame.w,H=frame.z;vec2 uv=frame.xy;
  float suffix=floor(fract(layoutId)*100.+.5),detail=floor(suffix/10.),faceCode=mod(suffix,10.);
  if(W<=0.02||H<=0.02)return base;
  if(family==288.){
    if(detail==1.){
      if(abs(normal.y)>.12){
        vec3 roof=mix(base,vec3(.29,.31,.33),.94);
        float seams=max(fpRepeatStroke(uv.x,1.25,.060),fpRepeatStroke(uv.y,1.25,.060));
        return fpLayer(roof,seams,vec3(.12,.14,.16),.88);
      }
      if(uv.y<0.||uv.y>H)return base;
      vec3 wall=mix(base,vec3(.75,.74,.69),.94);
      wall=fpLayer(wall,max(fpRepeatStroke(uv.x,3.5,.035),fpRepeatStroke(uv.y,3.2,.03)),vec3(.61,.60,.56),.42);
      if(normal.x>.65){
        vec3 brick=mix(base,vec3(.50,.34,.28),.90);
        float courses=max(fpRepeatStroke(uv.y,.34,.018),fpRepeatStroke(uv.x+mod(floor(uv.y/.34),2.)*.38,.76,.014));
        return fpLayer(brick,courses,vec3(.30,.20,.17),.62);
      }
      if(faceCode==1.&&normal.x<-.55&&W>=1.2&&H>=1.5){
        float band=foRect(uv-vec2(W*.5,H*.53),vec2(max(.1,W*.43),H*.30));
        wall=fpLayer(wall,band,vec3(.10,.18,.20),.96);
        wall=fpLayer(wall,max(fpRepeatStroke(uv.x,1.15,.045),fpStroke(uv.y-H*.53,.04))*band,vec3(.68,.71,.69),.96);
      }
      return wall;
    }
    if(abs(normal.y)>.12){
      vec3 roof=mix(base,vec3(.25,.27,.30),.94);
      float seams=max(fpRepeatStroke(uv.x,1.30,.035),fpRepeatStroke(uv.y,1.30,.035));
      return fpLayer(roof,seams,vec3(.12,.14,.17),.70);
    }
    if(uv.y<0.||uv.y>H)return base;
    vec3 wall=mix(base,vec3(.77,.76,.72),.94);
    float course=fpRepeatStroke(uv.y,.42,.025);
    float joint=fpRepeatStroke(uv.x+mod(floor(uv.y/.42),2.)*.35,.85,.018);
    wall=fpLayer(wall,max(course,joint),vec3(.60,.60,.57),.48);
    if(normal.z>.65&&W>=5.&&H>=3.){
      float portal=foRect(uv-vec2(W*.5,H*.45),vec2(.55,min(1.6,H*.30)));
      wall=fpLayer(wall,portal,vec3(.18,.21,.21),.90);
      wall=fpLayer(wall,max(fpStroke(uv.x-W*.5,.025),fpStroke(uv.y-H*.45,.025))*portal,vec3(.52,.52,.48),.80);
    }
    return wall;
  }
  if(family==284.){
    if(abs(normal.y)>.12){
      vec3 roof=mix(base,vec3(.24,.27,.29),.94);
      float courses=max(fpRepeatStroke(uv.x,.92,.018),fpRepeatStroke(uv.y,.92,.018));
      float diagonals=fpRepeatStroke(uv.x+uv.y,1.30,.014);
      roof=fpLayer(roof,max(courses,diagonals),vec3(.11,.13,.15),.48);
      return roof;
    }
    if(uv.y<0.||uv.y>H)return base;
    vec3 wall=mix(base,vec3(.53,.30,.20),.92);
    float joints=max(fpRepeatStroke(uv.y,.34,.014),fpRepeatStroke(uv.x+mod(floor(uv.y/.34),2.)*.34,.82,.012));
    wall=fpLayer(wall,joints,vec3(.30,.15,.11),.42);
    float band=fpInside(abs(uv.y-H*.84)-H*.095);
    wall=mix(wall,vec3(.12,.18,.20),band*.94);
    float mullions=fpRepeatStroke(uv.x,1.15,.032)*band;
    wall=fpLayer(wall,mullions,vec3(.43,.48,.47),.84);
    float cornerGlass=max(fpInside(uv.x-.06),fpInside(W-uv.x-.06))*step(H*.18,uv.y)*step(uv.y,H*.91);
    return fpLayer(wall,cornerGlass,vec3(.15,.21,.22),.78);
  }
  if(family>=247.&&family<=261.){
    if(abs(normal.y)>.12)return hcHamburgTileRoof(base,uv,W,H,family,detail);
    if(uv.y<0.||uv.y>H)return base;
    return hcHamburgWall(base,uv,W,H,normal,family,detail,faceCode);
  }
  if(family==241.0){
    if(normal.y<.85)return base;
    float ridge=H*.50,offset=abs(uv.y-ridge);
    vec3 tile=mix(vec3(.62,.29,.18),vec3(.49,.20,.13),smoothstep(0.,H*.50,offset)*.72);
    tile=fpSurfaceOnly(tile,uv,2.0);
    float courses=fpRepeatStroke(uv.y,.78,.018),row=floor(uv.y/.78);
    float joints=fpRepeatStroke(uv.x+mod(row,2.)*.72,1.65,.015);
    tile=fpLayer(tile,max(courses,joints),vec3(.31,.14,.10),.53);
    tile=fpLayer(tile,fpStroke(uv.y-ridge,.075),vec3(.34,.15,.10),.91);
    tile=fpLayer(tile,fpStroke(uv.y-ridge+.09,.028),vec3(.83,.43,.25),.76);
    float eaves=max(fpStroke(uv.y-.10,.035),fpStroke(uv.y-(H-.10),.035));
    tile=fpLayer(tile,eaves,vec3(.34,.16,.12),.72);
    // Bronze-green tower/spire paint covers the roof footprint marked by the
    // owner. The native mesh is flat, so the shaded panel and gable linework
    // suggest the missing structure without adding geometry.
    vec2 turretQ=uv-vec2(W*.12,H*.50);
    vec2 areaHalf=vec2(min(W*.14,4.3),min(H*.46,7.0));
    float towerArea=foRect(turretQ,areaHalf);
    vec2 shadowOffset=vec2(.22,-.17);
    float areaShadow=foRect(turretQ-shadowOffset,areaHalf+vec2(.14,.12));
    tile=fpLayer(tile,areaShadow,vec3(.16,.15,.12),.48);
    tile=fpLayer(tile,towerArea,vec3(.17,.35,.32),.98);
    vec2 gableQ=turretQ-vec2(0.,.20);
    float gable=foTriangle(gableQ,3.25,2.40);
    tile=fpLayer(tile,gable,vec3(.21,.42,.37),.82);
    float gableTaper=1.-clamp((gableQ.y+1.20)/2.40,0.,1.);
    float gableEdges=fpStroke(abs(gableQ.x)-3.25*gableTaper,.038)*gable;
    float centerRib=fpStroke(gableQ.x-.20,.030)*gable;
    float panelCourses=fpRepeatStroke(turretQ.y,.54,.030)*towerArea;
    float panelRibs=fpRepeatStroke(turretQ.x,.72,.026)*towerArea;
    float areaBorder=max(fpStroke(abs(turretQ.x)-areaHalf.x,.045)*step(abs(turretQ.y),areaHalf.y),fpStroke(abs(turretQ.y)-areaHalf.y,.045)*step(abs(turretQ.x),areaHalf.x));
    tile=fpLayer(tile,max(gableEdges,centerRib),vec3(.55,.68,.53),.88);
    tile=fpLayer(tile,max(max(panelCourses,panelRibs),areaBorder),vec3(.10,.23,.21),.78);
    return tile;
  }
  if(family==243.0){
    vec3 wall=mix(base,vec3(.61,.24,.17),.96);
    float courses=fpRepeatStroke(uv.y,.34,.014);
    float joints=fpRepeatStroke(uv.x+mod(floor(uv.y/.34),2.)*.32,.82,.011);
    wall=fpLayer(wall,max(courses,joints),vec3(.31,.13,.09),.58);
    if(H<4.4||W<5.2)return wall;
    float count=clamp(floor(W/2.25),2.0,6.0),bay=W/count;
    float halfW=min(.42,bay*.18),halfH=min(1.18,H*.20),windowY=H*.48;
    for(int i=0;i<6;i++){
      if(float(i)>=count)break;
      vec2 q=uv-vec2(bay*(float(i)+.5),windowY);
      wall=hcTallGlass(wall,q,vec2(halfW,halfH),0.0,0.0);
    }
    return wall;
  }
  if(family==244.0){
    if(normal.y<.85)return base;
    float ridgeV=H*.52,ridgeU=W*.50;
    float mainSlope=smoothstep(.55,3.0,abs(uv.y-ridgeV))*(1.0-smoothstep(2.8,3.8,abs(uv.x-ridgeU)));
    float crossSlope=smoothstep(.55,3.0,abs(uv.x-ridgeU))*(1.0-smoothstep(2.6,3.7,abs(uv.y-ridgeV)));
    vec3 tile=mix(base,vec3(.53,.22,.135),.92);
    tile=fpLayer(tile,max(mainSlope,crossSlope),vec3(.31,.13,.085),.27);
    tile=fpSurfaceOnly(tile,uv,2.0);
    float courses=fpRepeatStroke(uv.y,.92,.016);
    float joints=fpRepeatStroke(uv.x+mod(floor(uv.y/.92),2.)*.82,2.0,.013);
    tile=fpLayer(tile,max(courses,joints),vec3(.30,.13,.09),.48);
    float mainRidge=fpStroke(uv.y-ridgeV,.070)*(1.0-smoothstep(2.9,3.8,abs(uv.x-ridgeU)));
    float crossRidge=fpStroke(uv.x-ridgeU,.060)*(1.0-smoothstep(2.7,3.6,abs(uv.y-ridgeV)));
    tile=fpLayer(tile,max(mainRidge,crossRidge),vec3(.32,.14,.095),.88);
    tile=fpLayer(tile,max(fpStroke(uv.y-(ridgeV-2.65),.035),fpStroke(uv.y-(ridgeV+2.65),.035)),vec3(.38,.16,.105),.55);
    tile=fpLayer(tile,max(fpStroke(uv.x-(ridgeU-3.05),.032),fpStroke(uv.x-(ridgeU+3.05),.032)),vec3(.38,.16,.105),.52);
    // The plan's crossing is the photographed tower location; green-grey
    // surface linework stands for the missing spire without adding volume.
    vec2 towerQ=uv-vec2(ridgeU,ridgeV),towerHalf=vec2(1.55,1.50);
    float towerShadow=foRect(towerQ-vec2(.20,-.18),towerHalf+vec2(.14,.12));
    float towerBase=foRect(towerQ,towerHalf);
    tile=fpLayer(tile,towerShadow,vec3(.20,.14,.11),.50);
    tile=fpLayer(tile,towerBase,vec3(.22,.33,.31),.95);
    vec2 capQ=towerQ-vec2(0.,.72);
    float cap=foTriangle(capQ,1.20,1.05);
    tile=fpLayer(tile,cap,vec3(.34,.44,.40),.91);
    float capEdges=fpStroke(abs(capQ.x)-1.20*(1.0-clamp((capQ.y+.525)/1.05,0.,1.)),.035)*cap;
    float capRib=fpStroke(capQ.x,.028)*cap;
    float towerPanels=max(fpRepeatStroke(towerQ.y,.52,.024),fpRepeatStroke(towerQ.x,.66,.022))*towerBase;
    tile=fpLayer(tile,max(capEdges,capRib),vec3(.61,.66,.56),.84);
    return fpLayer(tile,towerPanels,vec3(.12,.21,.20),.72);
  }
  if(family==245.0){
    if(normal.y<.85)return base;
    vec3 tile=mix(base,vec3(.61,.29,.17),.94);
    tile=fpSurfaceOnly(tile,uv,2.0);
    float course=fpRepeatStroke(uv.y,.88,.016);
    float joint=fpRepeatStroke(uv.x+mod(floor(uv.y/.88),2.)*.76,1.95,.013);
    tile=fpLayer(tile,max(course,joint),vec3(.34,.16,.11),.48);
    float ridge=max(fpStroke(uv.y-H*.5,.090),fpStroke(uv.x-W*.5,.082));
    float valley=max(fpStroke(uv.y-(H*.5-2.85),.045),fpStroke(uv.y-(H*.5+2.85),.045));
    valley=max(valley,max(fpStroke(uv.x-(W*.5-3.15),.042),fpStroke(uv.x-(W*.5+3.15),.042)));
    tile=fpLayer(tile,valley,vec3(.38,.17,.115),.48);
    tile=fpLayer(tile,ridge,vec3(.30,.13,.09),.83);
    // The local description places the tower at the Greek-crossing; only a
    // plan-view masonry/cap cue is painted on the unchanged native roof.
    vec2 towerQ=uv-vec2(W*.5,H*.5),body=vec2(min(3.6,W*.095),min(3.6,H*.15));
    float shadow=foRect(towerQ-vec2(.22,-.20),body+vec2(.18,.16));
    float tower=foRect(towerQ,body);
    tile=fpLayer(tile,shadow,vec3(.22,.13,.10),.55);
    tile=fpLayer(tile,tower,vec3(.52,.25,.16),.94);
    tile=fpLayer(tile,fpStroke(abs(towerQ.x)-body.x,.065)*tower,vec3(.30,.13,.09),.80);
    vec2 capQ=towerQ/max(body,vec2(.1));
    float cap=foRect(capQ,vec2(.72));
    float facets=max(fpStroke(capQ.x-capQ.y,.035),fpStroke(capQ.x+capQ.y,.035))*cap;
    tile=fpLayer(tile,cap,vec3(.15,.17,.17),.95);
    return fpLayer(tile,facets,vec3(.36,.37,.34),.74);
  }
  if(family==246.0){
    vec3 wall=mix(base,vec3(.62,.31,.22),.94);
    float course=fpRepeatStroke(uv.y,.32,.014);
    float joint=fpRepeatStroke(uv.x+mod(floor(uv.y/.32),2.)*.34,.78,.011);
    wall=fpLayer(wall,max(course,joint),vec3(.34,.16,.12),.50);
    // The only local exterior photograph was taken west of the target; keep
    // its tall, round-headed window rhythm on that observed-facing side only.
    if(normal.x>-.28||H<5.0||W<5.5)return wall;
    float count=clamp(floor(W/3.5),1.0,6.0),bay=W/count;
    for(int i=0;i<6;i++){
      if(float(i)>=count)break;
      vec2 q=uv-vec2(bay*(float(i)+.5),H*.35),h=vec2(min(.66,bay*.20),min(1.24,H*.20));
      float opening=hcOpeningMask(q,h,0.0),outer=hcOpeningMask(q,h+vec2(.19,.19),0.0);
      wall=fpLayer(wall,foRect(q-vec2(.12,-.09),h+vec2(.30,.29)),vec3(.20,.14,.12),.48);
      wall=fpLayer(wall,opening,vec3(.08,.12,.14),.98);
      wall=fpLayer(wall,clamp(outer-opening,0.0,1.0),vec3(.84,.75,.62),.98);
      float mullion=max(fpStroke(q.x,.035),fpStroke(q.y+.08,.032))*opening;
      wall=fpLayer(wall,mullion,vec3(.47,.42,.34),.92);
    }
    return wall;
  }
  if(family==240.0||family==242.0){
    if(abs(normal.y)>.12)return base;
    vec3 wall=hcBrick(base,uv,0.0);
    if(family==242.0||H<3.0||W<6.0)return wall;
    float count=clamp(floor(W/3.05),3.0,15.0),bay=W/count;
    float halfW=min(.58,bay*.21),halfH=min(1.62,H*.25),windowY=H*.52;
    for(int i=0;i<15;i++){
      if(float(i)>=count)break;
      float centerX=bay*(float(i)+.5);
      vec2 q=uv-vec2(centerX,windowY),h=vec2(halfW,halfH);
      float opening=foRect(q,h),outer=foRect(q,h+vec2(.12,.13));
      float shadow=foRect(q-vec2(.09,-.08),h+vec2(.19,.19));
      wall=fpLayer(wall,shadow,vec3(.20,.16,.13),.43);
      wall=fpLayer(wall,opening,vec3(.12,.17,.18),.96);
      wall=fpLayer(wall,clamp(outer-opening,0.0,1.0),vec3(.72,.57,.43),.96);
      float panes=max(fpStroke(q.x,.026),fpStroke(q.y+.12,.024))*opening;
      wall=fpLayer(wall,panes,vec3(.38,.39,.34),.92);
      float sill=fpStroke(q.y+halfH+.14,.045)*(1.0-smoothstep(halfW+.08,halfW+.15,abs(q.x)));
      wall=fpLayer(wall,sill,vec3(.82,.67,.50),.91);
    }
    return wall;
  }
  if(family<150.0||family>169.0)return base;
  if(family==169.0)return fract(layoutId)>.05?mix(base,vec3(.80,.78,.69),.68):base;
  if(family==157.0)return hcMetalRoof(base,uv,0.0);
  if(family==168.0){
    vec3 c=hcMetalRoof(base,uv,1.0);
    if(fract(layoutId)>.05&&fract(layoutId)<.15){
      //168.10 is ONE independently verified compact roof-element patch.
      //No repeated dormer row; paint cannot establish a missing roof silhouette.
      vec2 q=uv-vec2(W*.5,H*.5),h=vec2(min(W*.24,.72),min(H*.20,.54));
      c=fpLayer(c,foRect(q,h),vec3(.13,.18,.18),.72);
      float hood=foArchCap(q-vec2(0.,h.y*.72),h.x*1.14,h.y*.75);
      c=fpLayer(c,hood,vec3(.40,.45,.39),.52);
    }
    return c;
  }
  if(family==155.0||family==156.0){
    vec3 c=hcCopper(base,uv,W,H,1.0,1.0);
    // Photographed type/scale on ONE west taper panel; exact all-face distribution unknown.
    if(family==155.0&&normal.x<-.90&&abs(normal.z)<.30){
      for(int level=0;level<5;level++){
        float yy=H*(.18+float(level)*.17),shrink=max(.10,1.-yy/max(H,.1)*.86),radius=min(.17,W*shrink*.035);
        vec2 q=uv-vec2(W*.5+float(level%2==0?-1:1)*W*shrink*.20,yy);
        c=fpLayer(c,fpInside(length(q)-radius),vec3(.12,.16,.15),.91);
        c=fpLayer(c,fpStroke(length(q)-radius,.018),vec3(.56,.55,.45),.58);
      }
    }
    if(family==156.0){
      // One independently VERIFIED porthole patch, not a repeated roof grid.
      float radius=min(min(W,H)*0.065,0.17);vec2 q=uv-vec2(W*.5,H*.5);
      c=fpLayer(c,fpInside(length(q)-radius),vec3(0.14,0.18,0.17),0.92);
      c=fpLayer(c,fpStroke(length(q)-radius,0.018),vec3(0.57,0.58,0.49),0.67);
    }
    return c;
  }
  if(family==167.0){
    // Rounded cap uses native face coordinates, not a fabricated conical taper.
    vec3 cap=hcCopper(base,uv,W,H,0.,0.);
    if(p.y>130.7)cap=mix(cap,vec3(.71,.60,.30),.75);
    return cap;
  }
  if(family==166.0){
    // Shade only ACTUAL source supports/columns; this does not draw voids.
    // If native open lantern geometry is missing, keep it unsupported.
    return hcCopper(base,uv,W,H,0.0,0.0);
  }
  if(family==164.0){
    // Native overlapping stage carriers retain one face-wide composite program.
    // Their actual world Y selects brick, copper shaft, then single clock box.
    if(abs(normal.y)>.12)return hcCopper(base,uv,W,max(H,.1),0.,0.);
    if(uv.y<32.){
      vec3 brick=hcMichelRustication(hcBrick(base,uv,1.),uv,W,32.);
      if(normal.x<-.85&&uv.y<19.)brick=hcMichelPortal(brick,uv,W,16.);
      return brick;
    }
    if(H>97.&&uv.y>=84.){
      vec3 copper=hcCopper(base,vec2(uv.x,uv.y-84.),W,14.,0.,0.);
      copper=hcStoneBand(copper,uv,97.4,.20);
      if(W>5.&&max(abs(normal.x),abs(normal.z))>.99)return hcClock(copper,uv-vec2(W*.5,91.),min(W*.34,4.),1.);
      return copper;
    }
    vec2 shaft=vec2(uv.x,uv.y-32.);float stageH=52.;
    vec3 c=hcMichelCopperStage(base,shaft,W,stageH);float variant=fract(layoutId);
    // Two source-observed sparse aperture TYPES. Middle panel remains solid.
    if(uv.y>=32.&&uv.y<=84.&&W>5.&&max(abs(normal.x),abs(normal.z))>.99){
      float patchW=min(W*.45,5.);
      c=hcMichelVerifiedAperture(c,vec2(uv.x-W*.5+patchW*.5,shaft.y-stageH*.25+3.),patchW,6.,1.);
      c=hcMichelVerifiedAperture(c,vec2(uv.x-W*.5+patchW*.5,shaft.y-stageH*.77+4.),patchW,8.,0.);
    }
    // 164.10 rectangular /164.20 rounded: ONE independently source-bound
    // aperture patch. Integer164 remains solid stage ornament only.
    if(variant>.05&&variant<.25)c=hcMichelVerifiedAperture(c,uv,W,H,variant>.15?1.0:0.0);
    return c;
  }
  if(family==165.0){
    vec3 c=hcCopper(base,uv,W,H,0.0,0.0);
    return hcClock(c,uv-vec2(W*.5,H*.50),min(W*.34,H*.34),1.0);
  }
  // Wall layouts must not reach roof slopes or copper taper faces.
  if(abs(normal.y)>0.12)return base;
  if(uv.y<0.0||uv.y>H)return base;
  if(family==159.&&fract(layoutId)>.05)return fpSurfaceOnly(mix(base,vec3(.70,.67,.57),.55),uv,2.);
  vec3 wall=hcBrick(base,uv,family>=160.0?1.0:0.0);
  if(family==150.0){
    // One constant family per original face; fragment-local gable subdivision.
    if(uv.y>22.5){
      if(H<=22.55||fract(layoutId)>.15)return wall;
      return hcPetriGable(wall,vec2(uv.x,uv.y-22.5),W,H-22.5);
    }
    float variant=fract(layoutId);
    if(variant>.25&&variant<.35&&u_petri_west_portal.w>.5){
      vec2 local=vec2(uv.x-u_petri_west_portal.x+u_petri_west_portal.y*.5,uv.y);
      if(local.x>=0.&&local.x<=u_petri_west_portal.y){
        wall=hcPetriShaft(wall,local,u_petri_west_portal.y,55.);
        if(uv.y<12.)wall=hcPetriPortal(wall,local,u_petri_west_portal.y,16.);
        return hcWesternGroup(wall,local,u_petri_west_portal.y);
      }
    }
    wall=hcPetriNave(wall,uv,W,min(H,22.5));
    if(variant>.15&&variant<.25)wall=hcBonhoeffer(wall,uv,W);
    return wall;
  }
  if(family==151.0)return hcPetriGable(wall,uv,W,H);
  if(family==152.0)return hcPetriPortal(wall,uv,W,H);
  if(family==153.0){
    // Exact native shaft/brick-gable stages; no layout interpolation on triangles.
    bool principal=max(abs(dot(normal.xz,vec2(.998956,.045679))),abs(dot(normal.xz,vec2(-.045679,.998956))))>.995;
    if(!principal)return wall;
    if(uv.y>55.)return H>55.1?hcClock(wall,uv-vec2(W*.5,55.+13.5*.43),min(W*.22,13.5*.24),0.):wall;
    wall=hcPetriShaft(wall,uv,W,min(H,55.));
    bool west=dot(normal.xz,vec2(-.998956,-.045679))>.995;
    if(west&&uv.y<12.)wall=hcPetriPortal(wall,uv,W,16.);
    if(west)wall=hcWesternGroup(wall,uv,W);
    return wall;
  }
  if(family==154.0)return hcClock(wall,uv-vec2(W*.5,H*.43),min(W*.22,H*.24),0.0);
  if(family==158.0){
    float variant=fract(layoutId);
    if(variant>.05&&variant<.15){
      // Source-described western group: Christus/angels above Petrus/Paulus.
      wall=hcStoneFigure(wall,uv-vec2(W*.5,H*.76),W*.09,H*.30,0.0);
      for(int j=0;j<2;j++){
        wall=hcStoneFigure(wall,uv-vec2(W*(.30+float(j)*.40),H*.70),W*.08,H*.23,0.0);
        wall=hcStoneFigure(wall,uv-vec2(W*(.35+float(j)*.30),H*.31),W*.09,H*.27,0.0);
      }
      return wall;
    }
    if(variant>.15&&variant<.25){
      // One documented northern choir niche, independently source-framed.
      float recess=hcOpeningMask(uv-vec2(W*.5,H*.5),vec2(W*.28,H*.37),0.0);
      wall=fpLayer(wall,recess,vec3(.30,.24,.20),.42);
      return hcStoneFigure(wall,uv-vec2(W*.5,H*.5),W*.24,H*.60,1.0);
    }
    return hcBlindTrefoil(wall,uv-vec2(W*.5,H*.68),min(W*.13,H*.13));
  }
  if(family==159.0)return wall;
  if(family==160.0){
    if(uv.y<=24.2)return hcMichelThreeLights(wall,uv,W,24.2);
    // Existing vertical gable carries stone edging only; glazing stops at eaves.
    float rise=max(.1,H-24.2),q=abs(uv.x-W*.5),edge=24.2+rise*(1.-q/(W*.5));
    return fpLayer(wall,fpStroke(uv.y-edge,.16),vec3(.81,.79,.68),.92);
  }
  if(family==161.0)return hcStoneBand(wall,uv,H*.93,0.14);
  if(family==162.0){
    if(uv.y>=32.)return hcMichelCopperStage(base,vec2(uv.x,uv.y-32.),W,52.);
    wall=hcMichelRustication(wall,uv,W,32.);
    if(uv.x>=0.&&uv.x<=W&&uv.y<19.)wall=hcMichelPortal(wall,uv,W,16.);
    return wall;
  }
  if(family==163.0){
    wall=hcMichelRustication(wall,uv,W,32.);
    if(normal.x<-.85&&uv.y<19.)wall=hcMichelPortal(wall,uv,W,16.);
    return wall;
  }
  return wall;
}
`;
