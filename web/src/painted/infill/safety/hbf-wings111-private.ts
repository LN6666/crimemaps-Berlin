/** Own-reference Frankfurt Hbf side-wing material recovery after075.
 * Dedicated current45422 measured walls only. Existing common station UV/Y and
 * carrier index provide phase across genuine faces/SOURCE seams, never pertri.
 * Openings/cornice/column relief are photograph-proportioned surface graphics;
 * no new geometry, rooflight, glass ceiling, opening holes or door count.
 */
export const HBF_WINGS111_GLSL=String.raw`
float hw111box(vec2 p,vec2 center,vec2 halfSize){vec2 d=abs(p-center)-halfSize;return 1.-smoothstep(-.02,.025,max(d.x,d.y));}
float hw111edge(float x,float center,float halfWidth){return 1.-smoothstep(halfWidth,halfWidth+.035,abs(x-center));}
vec3 hw111Window(vec3 c,vec2 p,vec2 center,vec2 halfSize,vec3 timber){
 vec2 d=p-center;float surround=hw111box(p,center,halfSize+vec2(.22,.23));
 float recess=hw111box(p,center,halfSize+vec2(.07,.07));
 float pane=hw111box(p,center,halfSize-vec2(.085,.08));
 c=mix(c,vec3(.78,.695,.545),surround);
 c=mix(c,vec3(.35,.315,.25),recess);c=mix(c,timber,hw111box(p,center,halfSize));
 vec3 glass=vec3(.185,.285,.295)+vec3(.025,.04,.045)*clamp(d.y/halfSize.y+.5,0.,1.);
 c=mix(c,glass,pane);
 float mullion=max(hw111edge(d.x,0.,.035),hw111edge(d.y,.20*halfSize.y,.045));
 c=mix(c,timber,pane*mullion);
 float sill=hw111box(p,vec2(center.x,center.y-halfSize.y-.20),vec2(halfSize.x+.26,.095));
 c=mix(c,vec3(.84,.755,.595),sill);
 float below=hw111box(p,vec2(center.x,center.y-halfSize.y-.33),vec2(halfSize.x+.20,.055));
 return mix(c,vec3(.39,.33,.245),below*.70);
}
vec3 hw111NorthBay(vec3 c,float u,float y,float a,float b){
 if(u<a||u>b)return c;
 float w=b-a,s=(u-a)/w;
 // Ownphoto three upright upper windows between the existing broad pilasters.
 for(int k=0;k<3;k++){
  float center=a+w*(.20+.30*float(k));
  c=hw111Window(c,vec2(u,y),vec2(center,9.40),vec2(.76,2.03),vec3(.76,.76,.685));
  // Only the visible tall lower glazed region. Unknown low thresholds/leaf
  // arrangements hidden by street furniture are not invented.
  c=hw111Window(c,vec2(u,y),vec2(center,3.17),vec2(.72,1.96),vec3(.56,.57,.50));
 }
 return c;
}
float hw111QEdge(float x,float center,float halfWidth){return 1.-smoothstep(halfWidth,halfWidth+.0025,abs(x-center));}
vec3 hw111SouthNearArch(vec3 c,float v,float y){
 // Independent original300S412 ownphoto412.jpg supports this positiveV bay.
 // Width/arch height are photo-proportioned on its actual chpa closure wall.
 vec2 q=vec2((v-35.)/15.7,(y+.485)/11.26);
 if(q.x<0.||q.x>1.||q.y<0.||q.y>1.)return c;
 vec3 stone=vec3(.71,.63,.49),dark=vec3(.15,.235,.255),light=vec3(.83,.745,.585);
 float course=1.-smoothstep(.018,.05,abs(mod(y+.275,.55)-.275));
 c=mix(stone,vec3(.40,.34,.25),course*.44);
 vec2 a=(q-vec2(.51,.58))/vec2(.34,.26);float r=length(a);
 float outer=step(.58,q.y)*(1.-smoothstep(1.,1.035,r));
 vec2 ai=(q-vec2(.51,.58))/vec2(.295,.212);float inside=step(.58,q.y)*(1.-smoothstep(1.,1.025,length(ai)));
 c=mix(c,light,outer*.8);c=mix(c,dark+vec3(.035,.055,.06)*q.y,inside);
 float archRing=max(hw111QEdge(r,.98,.018),hw111QEdge(r,.875,.014))*step(.58,q.y);
 c=mix(c,vec3(.41,.35,.25),archRing*.85);
 float straight=hw111box(q,vec2(.51,.405),vec2(.295,.155));
 c=mix(c,dark+vec3(.025,.045,.05)*q.y,straight);
 float paneX=max(hw111QEdge(q.x,.51,.006),max(hw111QEdge(q.x,.3625,.005),hw111QEdge(q.x,.6575,.005)));
 c=mix(c,vec3(.09,.14,.15),max(inside,straight)*paneX);
 float transom=hw111QEdge(q.y,.58,.012)*step(.18,q.x)*step(q.x,.84);
 c=mix(c,light,transom*.92);
 float band=max(hw111QEdge(q.y,.87,.009),max(hw111QEdge(q.y,.92,.009),hw111QEdge(q.y,.975,.008)));
 c=mix(c,vec3(.36,.30,.22),hw111QEdge(q.y,.852,.009)*.75);c=mix(c,light,band*.8);
 // The photographed lower opening is partly hidden: no new threshold or
 // precise bottom leaf count is claimed below the visible qY.25 field.
 return c;
}
vec3 hw111ArcadeBay(vec3 c,float v,float y,float a,float b){
 if(v<a||v>b||y<.35||y>10.7)return c;
 float center=(a+b)*.5,rx=(b-a)*.405,rise=min(rx,2.50),spring=5.55;
 float outer=step(spring,y)*(1.-smoothstep(1.,1.02,length(vec2((v-center)/(rx+.23),(y-spring)/(rise+.23)))));
 float inner=step(spring,y)*(1.-smoothstep(1.,1.02,length(vec2((v-center)/rx,(y-spring)/rise))));
 c=mix(c,vec3(.81,.72,.55),outer);
 vec3 glass=vec3(.16,.255,.28)+vec3(.03,.045,.045)*clamp(y/10.,0.,1.);
 c=mix(c,glass,inner);
 float lower=hw111box(vec2(v,y),vec2(center,3.59),vec2(rx,1.69));
 c=mix(c,glass,lower);
 float mullion=max(hw111edge(v,center,.040),max(hw111edge(v,center-rx*.5,.032),hw111edge(v,center+rx*.5,.032)));
 c=mix(c,vec3(.11,.155,.16),max(inner,lower)*mullion);
 c=mix(c,vec3(.80,.71,.54),hw111edge(y,spring,.12)*step(abs(v-center),rx+.25));
 float rim=abs(length(vec2((v-center)/(rx+.12),(y-spring)/(rise+.12)))-1.);
 c=mix(c,vec3(.43,.355,.255),(1.-smoothstep(.018,.04,rim))*step(spring,y));
 return c;
}
vec3 hw111TerminalWindow(vec3 c,float v,float y,float center,float head){
 return hw111Window(c,vec2(v,y),vec2(center,head-1.60),vec2(.69,1.60),vec3(.30,.225,.16));
}
vec3 hw111ClockPavilion(vec3 c,float v,float y){
 // Aktron own panorama: only the two narrow clock-storey windows are clear.
 c=hw111Window(c,vec2(v,y),vec2(85.84,13.35),vec2(.49,1.12),vec3(.28,.22,.17));
 c=hw111Window(c,vec2(v,y),vec2(92.94,13.35),vec2(.49,1.12),vec3(.28,.22,.17));
 float rad=length(vec2(v-89.39,y-13.35));
 c=mix(c,vec3(.39,.325,.24),1.-smoothstep(1.05,1.10,rad));
 c=mix(c,vec3(.84,.805,.66),1.-smoothstep(.86,.90,rad));
 float hands=max(hw111box(vec2(v,y),vec2(89.39,13.60),vec2(.035,.29)),hw111box(vec2(v,y),vec2(89.59,13.35),vec2(.22,.035)));
 c=mix(c,vec3(.18,.205,.18),hands);
 float layer=max(hw111edge(y,10.65,.13),max(hw111edge(y,11.30,.09),max(hw111edge(y,15.38,.15),hw111edge(y,16.65,.14))));
 c=mix(c,vec3(.82,.73,.555),layer*.90);
 c=mix(c,vec3(.38,.31,.22),hw111edge(y,15.10,.08)*.8);
 return c;
}
vec3 frankfurtHbfWings111(vec3 c,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-45422.)>.10||abs(frame.w-82.)<.1)return c;
 float u=frame.x,v=frame.y,y=frame.z,carrier=frame.w;
 float north=dot(normal.xz,vec2(-.52155757,.85321609));
 float streetFront=dot(normal.xz,vec2(.85321609,.52155757));
 if(abs(carrier-2.)<.1&&streetFront>.995&&u> -109.65&&u< -106.45&&v>=35.&&v<=50.7&&y>=-.485&&y<=10.82)return hw111SouthNearArch(c,v,y);

 // The original three-hall FRONT wings are distinct from Poststrasse and
 // the1924 rectangular-window end buildings. Counts/positions use the existing
 // clear wall bays and own panorama/aerial: explicit photo approximation.
 if((abs(carrier-2.)<.1||abs(carrier-1.)<.1||abs(carrier-5.)<.1||abs(carrier-6.)<.1)&&streetFront>.985&&u> -124.&&u< -70.&&abs(v)>27.8&&abs(v)<134.2&&y> -4.&&y<18.4){
  float courses=1.-smoothstep(.017,.045,abs(mod(y+.275,.55)-.275));
  c=mix(vec3(.70,.62,.48),vec3(.43,.36,.265),courses*.38);
  if(v< -28.&&v> -84.){
   c=hw111ArcadeBay(c,v,y,-79.120,-70.025);
   c=hw111ArcadeBay(c,v,y,-69.445,-62.349);
   c=hw111ArcadeBay(c,v,y,-57.922,-52.443);
   // Raw rear strip may share the known near082 bay, but the genuine082
   // final12v have already returned unchanged above; no duplicate marker.
   c=hw111ArcadeBay(c,v,y,-49.475,-35.098);
  }
  if(v>50.7&&v<82.9){
   c=hw111ArcadeBay(c,v,y,60.511,66.045);
   c=hw111ArcadeBay(c,v,y,69.056,74.330);
   c=hw111ArcadeBay(c,v,y,78.003,82.337);
  }
  // The southclock pavilion and the farther low rectangular wing are each
  // separate actualbody groups. No repeated central-door picture is used.
  if(v>=82.91&&v<=95.87)c=hw111ClockPavilion(c,v,y);
  if(v>95.87){
   c=hw111TerminalWindow(c,v,y,99.23,10.65);
   c=hw111TerminalWindow(c,v,y,109.39,10.65);
   c=hw111TerminalWindow(c,v,y,123.42,11.72);
  }
  // Northend geometry is likewise distinct; only bounded rectangular fronts,
  // stone courses/bands. No invented clock or unseen reverse-elevation doors.
  if(v< -104.){
   c=hw111TerminalWindow(c,v,y,-127.95,11.55);
   c=hw111TerminalWindow(c,v,y,-122.35,11.55);
   c=hw111TerminalWindow(c,v,y,-113.25,11.55);
   c=hw111TerminalWindow(c,v,y,-108.60,11.55);
  }
  float ledge=max(hw111edge(y,9.25,.11),max(hw111edge(y,9.72,.10),hw111edge(y,10.26,.12)));
  float top=step(84.,abs(v))*max(hw111edge(y,12.60,.11),hw111edge(y,13.20,.10));
  c=mix(c,vec3(.37,.30,.215),max(hw111edge(y,9.02,.08),top*.4)*.78);
  c=mix(c,vec3(.82,.735,.57),max(ledge,top)*.86);
  return c;
 }
 // These genuine northern street faces belong to the existing parent-residual
 // carrier2 or its rear small SOURCE0. Inner/courtyard parallel walls excluded.
 if((abs(carrier-2.)<.1||abs(carrier)<.1)&&north>.995&&v< -123.9&&v> -134.15&&u> -110.&&u<66.2&&y>-.68&&y<14.97){
  vec3 stone=vec3(.70,.625,.49);float course=1.-smoothstep(.016,.045,abs(mod(y+.285,.57)-.285));
  c=mix(stone,vec3(.49,.43,.33),course*.27);
  // Ownphoto portico-left northern clear wall has TWO red-brown window axes,
  // distinct from the western three-white-frame groups; do not wrap its corner.
  if(u>=-84.546&&u<=-76.065&&v> -132.56&&v< -132.40){
   for(int k=0;k<2;k++){
    float center=-84.546+8.481*(.28+.44*float(k));
    c=hw111Window(c,vec2(u,y),vec2(center,9.40),vec2(.79,2.03),vec3(.31,.225,.17));
    c=hw111Window(c,vec2(u,y),vec2(center,3.25),vec2(.83,2.04),vec3(.30,.23,.17));
   }
   c=mix(c,vec3(.82,.735,.565),hw111edge(y,6.43,.16)*.78);
  }
  // Photo-backed western repeated masonry bays. All bounds are global stationU
  // physical faces; the SOURCE boundary at20.891 does not restart the cadence.
  if(u>=-46.93&&u<=36.04){
   c=hw111NorthBay(c,u,y,-46.93,-38.39);c=hw111NorthBay(c,u,y,-36.23,-29.01);
   c=hw111NorthBay(c,u,y,-27.33,-19.88);c=hw111NorthBay(c,u,y,-18.08,-10.68);
   c=hw111NorthBay(c,u,y,-9.12,-1.60);c=hw111NorthBay(c,u,y,.20,7.59);
   c=hw111NorthBay(c,u,y,9.16,16.19);c=hw111NorthBay(c,u,y,17.52,26.95);
   c=hw111NorthBay(c,u,y,27.04,36.04);
   float belt=hw111edge(y,6.43,.16),underside=hw111edge(y,6.20,.075);
   c=mix(c,vec3(.38,.325,.24),underside*.80);c=mix(c,vec3(.83,.75,.595),belt*.90);
   // Exposed existing pilaster strips receive courses, not arbitrary outlines
   // around every triangulation polygon.
   float pier=step(-38.39,u)*step(u,-36.23)+step(-29.01,u)*step(u,-27.33)+step(-19.88,u)*step(u,-18.08)+step(-10.68,u)*step(u,-9.12)+step(-1.60,u)*step(u,.20)+step(7.59,u)*step(u,9.16)+step(16.19,u)*step(u,17.52);
   c=mix(c,vec3(.39,.33,.25),min(pier,1.)*course*.48);
  }
  // Northern entrance: four fluted-column surface reliefs on its specific
  // existing wall, not extruded cylinders or a false reconstructed portico.
  if(u>=-75.936&&u<=-55.715&&v< -133.5){
   float s=u+75.936;
   float recess=hw111box(vec2(s,y),vec2(10.1105,5.75),vec2(7.35,4.95));
   c=mix(c,vec3(.22,.235,.205),recess*.92);
   for(int k=0;k<4;k++){
    float axis=4.3+3.88*float(k),d=s-axis;
    float shaft=hw111box(vec2(d,y),vec2(0.,5.60),vec2(.49,4.48));
    float roundLight=sqrt(max(0.,1.-pow(d/.51,2.)));
    vec3 col=vec3(.56,.49,.365)+vec3(.24,.22,.17)*roundLight;
    float flute=1.-smoothstep(.018,.04,abs(mod(d+.075,.15)-.075));
    col=mix(col,vec3(.35,.29,.21),flute*.46);
    c=mix(c,col,shaft);
    float capital=hw111box(vec2(d,y),vec2(0.,10.25),vec2(.78,.27));
    float base=hw111box(vec2(d,y),vec2(0.,1.00),vec2(.70,.17));
    c=mix(c,vec3(.80,.71,.54),max(capital,base));
    c=mix(c,vec3(.36,.30,.22),hw111box(vec2(d,y),vec2(0.,10.57),vec2(.86,.075)));
   }
   // A shadow band on the genuine vertical cornice/fascia, no false horizontal
   // ceiling or lamps painted onto the wall, and no unsupported rooflights.
   c=mix(c,vec3(.19,.225,.20),hw111box(vec2(s,y),vec2(10.11,11.68),vec2(9.2,.42))*.92);
   c=mix(c,vec3(.80,.72,.55),hw111edge(y,12.30,.16)*.80);
  }
  float eaveShadow=hw111edge(y,12.74,.16),eave=hw111edge(y,13.12,.14),lip=hw111edge(y,13.55,.09);
  c=mix(c,vec3(.33,.29,.225),eaveShadow*.78);c=mix(c,vec3(.81,.73,.57),max(eave,lip)*.83);
  return c;
 }
 return c;
}
`;
export function hbfWings111PrivatePartition(source:string,key:string,city:string){
 if(city!=='frankfurt'||key!=='infill-frankfurt-hbf075')return source;
 const entry='vec3 paintedFacade(';
 if(source.split(entry).length!==2||source.includes('frankfurtHbfWings111(')||!source.includes('frankfurtHbfPrimary108('))throw Error('Hbf111 private entry certificate mismatch');
 return source.replace(entry,'vec3 hbf111PreviousPaintedFacade(')+HBF_WINGS111_GLSL+'\nvec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return frankfurtHbfWings111(hbf111PreviousPaintedFacade(base,p,normal,frame,family),p,normal,frame,family);}\n';
}
