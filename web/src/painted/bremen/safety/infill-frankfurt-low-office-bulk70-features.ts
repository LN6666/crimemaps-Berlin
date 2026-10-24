export const infillFrankfurtLowOfficeBulk70OwnerPaintGLSL=/*glsl*/`

float emp011line(float d,float w){float a=max(fwidth(d),.012);return 1.-smoothstep(w-a,w+a,abs(d));}
vec3 infillEmporium011Paint(vec3 base,vec3 p,vec3 n,vec4 f,float family){
 if(family<34039.5||family>34043.5||abs(n.y)>.5)return base;
 vec2 local=f.xz;float u=dot(local,normalize(vec2(n.z+.000001,-n.x+.000001))),y=p.y;
 vec3 stone=vec3(.80,.78,.70),glass=vec3(.29,.40,.44),trim=vec3(.64,.66,.63);
 float course=emp011line(mod(y,.62)-.31,.008),seam=emp011line(mod(u+floor(y/.62)*.5,1.05)-.525,.008);
 vec3 c=stone*(1.-max(course,seam)*.075);
 // Photo confirms a grey checker-stone ground plinth rather than floor-to-ceiling blue glass.
 if(y<4.5){float tile=mod(floor((u+18.)/2.0)+floor(y/1.08),4.);c=mix(vec3(.55,.56,.53),vec3(.69,.70,.67),step(1.5,tile));return c;}
 float ux=mod(u+.825,1.65)-.825,fy=mod(y-4.9,3.35);float d=max(abs(ux)-.49,max(.28-fy,fy-2.64));
 float mask=1.-smoothstep(-.025,.025,d);float surround=(1.-smoothstep(-.025,.025,d-.09))-mask;
 c=mix(c,trim,surround*.75);
 float bay=floor((u+.825)/1.65),level=floor((y-4.9)/3.35);float blind=step(.32,fract(sin(bay*13.37+level*7.31)*43758.5453));
 vec3 pane=mix(glass,vec3(.39,.41,.39),blind*.9);
 pane*=1.-emp011line(mod(y,.105)-.0525,.014)*blind*.35;
 pane=mix(pane,vec3(.63,.67,.65),emp011line(ux,.018)*.70);
 float reveal=emp011line(d+.045,.024);pane=mix(pane,pane*.68,reveal*.65);
 c=mix(c,pane,mask);
 c=mix(c,stone*.74,emp011line(fy-.18,.045)*step(abs(ux),.57));
 return c;
}


float fea012line(float d,float w){float a=max(fwidth(d),.012);return 1.-smoothstep(w-a,w+a,abs(d));}
vec3 infillFEA36_012Paint(vec3 base,vec3 p,vec3 n,vec4 f,float family){
 if(family<34043.5||family>34047.5||abs(n.y)>.5)return base;
 float u=dot(f.xz,normalize(vec2(n.z+.000001,-n.x+.000001))),y=p.y;
 // Individual panes reflect sky most strongly above the tree line; do not paint a fake neighboring tower reflection.
 vec3 glass=mix(vec3(.25,.39,.43),vec3(.29,.47,.66),smoothstep(3.,15.,y));
 float pane=floor((u+.68)/1.36),lev=floor(y/3.8);glass*=.96+.045*sin(pane*1.81+lev*.93);
 float upright=fea012line(mod(u+.68,1.36)-.68,.028);
 float midrail=fea012line(mod(y-.88,3.8)-1.90,.025);
 float slabrail=fea012line(mod(y,3.8)-1.90,.065);
 vec3 c=mix(glass,vec3(.59,.64,.64),max(upright,midrail)*.92);
 c=mix(c,vec3(.14,.19,.21),slabrail*.87);
 float reveal=fea012line(mod(u+.68,1.36)-.63,.015);c=mix(c,glass*.68,reveal*.6);
 if(y<.40)c=vec3(.46,.49,.47);
 return c;
}


float fra3150Line(float x,float period,float halfWidth){float a=max(fwidth(x),.002);float d=abs(fract(x/period+.5)-.5)*period;return 1.-smoothstep(halfWidth-a,halfWidth+a,d);}
float fra3150Box(float x,float lo,float hi){float a=max(fwidth(x),.008);return smoothstep(lo-a,lo+a,x)*(1.-smoothstep(hi-a,hi+a,x));}
vec3 frankfurtAppearance031050(vec3 base,vec3 p,vec3 normal,float family){
 if(abs(normal.y)>.5)return base;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001)));
 // City Haus II: architect's actual facade photo shows small reflective square
 // curtain panes, dark bronze thin mullions and dark soffits; no stone floor grid.
 if(family>34139.5&&family<34143.5){
  float mull=max(fra3150Line(u,1.38,.035),fra3150Line(p.y-.18,1.46,.035));
  float variation=.018*sin(floor(u/1.38)*1.73+floor((p.y-.18)/1.46)*.71);
  vec3 glass=vec3(.30,.43,.48)+variation;
  return mix(glass,vec3(.17,.16,.145),mull);
 }
 // Occidens: supplier's real image has discrete tall dark-framed punched
 // windows in substantial cream natural stone piers/spandrels.
 if(family>34143.5&&family<34147.5){
  float cx=mod(u+1.20,2.40),cy=mod(p.y-.55,3.75);
  float opening=fra3150Box(cx,.45,1.95)*fra3150Box(cy,.65,3.25);
  float inner=fra3150Box(cx,.50,1.90)*fra3150Box(cy,.70,3.20);
  vec3 stone=vec3(.82,.80,.72);
  float joints=max(fra3150Line(p.y,.75,.006),fra3150Line(u,1.20,.006));
  stone=mix(stone,stone*.89,joints*.28);
  vec3 col=mix(stone,vec3(.22,.23,.22),opening);
  col=mix(col,vec3(.29,.39,.43),inner);
  col=mix(col,vec3(.50,.52,.49),fra3150Line(cx-1.20,2.40,.022)*inner*.55);
  // Actual supplier photograph: the sharp Bockenheimer/Barckhaus corner
  // replaces the stone vertical pier with continuous corner glazing above the
  // lower entrance storey. Locate this on the official DISPLAY corner only;
  // do not repeat corner glass at every window or every component origin.
  // Corner (-23.313,22.821) is an actual DISPLAY vertex of 298724535.
  float cornerDist=length(p.xz-vec2(-23.313,22.821));
  float ca=max(fwidth(cornerDist),.015);
  float corner=(1.-smoothstep(3.55-ca,3.55+ca,cornerDist))*fra3150Box(p.y,6.0,30.6);
  float cornerSlab=fra3150Line(p.y-.55,3.75,.115);
  vec3 cornerGlass=vec3(.27,.40,.47);
  // Fine vertical frame at the physical corner and quarter-panel secondary
  // mullions preserve the narrow frame proportions in the real photograph.
  float cornerPost=1.-smoothstep(.055,.085,cornerDist);
  float secondary=fra3150Line(u,1.20,.018);
  vec3 cornerCol=mix(cornerGlass,vec3(.80,.79,.72),cornerSlab);
  cornerCol=mix(cornerCol,vec3(.18,.21,.22),max(cornerPost,secondary*(1.-cornerSlab)));
  return mix(col,cornerCol,corner);
 }
 // Westend Sky: project actual skyline photograph + MOW facade specification.
 // Thin repeated vertical pale/aluminium ribs, paired panes and dark glazing;
 // heavier horizontal band occurs at real slab rows, not thick all-grid stone.
 if(family>34183.5&&family<34187.5){
  float rib=fra3150Line(u,1.42,.065),slab=fra3150Line(p.y-.18,3.50,.095);
  float paired=fra3150Line(u+.71,1.42,.016);
  vec3 col=mix(vec3(.26,.34,.36),vec3(.72,.73,.69),max(rib,slab));
  return mix(col,vec3(.47,.52,.52),paired*(1.-rib)*.55);
 }
 return base;
}


float gentle3840Line(float x,float period,float width){float a=max(fwidth(x),.002),d=abs(fract(x/period+.5)-.5)*period;return 1.-smoothstep(width-a,width+a,d);}
float gentle3840Box(float x,float lo,float hi){float a=max(fwidth(x),.008);return smoothstep(lo-a,lo+a,x)*(1.-smoothstep(hi-a,hi+a,x));}
vec3 frankfurtGentle038040(vec3 base,vec3 p,vec3 normal,float family){
 bool exact=(family>34147.5&&family<34151.5)||(family>34155.5&&family<34159.5);
 if(!exact||abs(normal.y)>.5)return base;
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001)));
 // Kestate actual estate photo: long ribbons separated by solid white-stone
 // spandrels, large solid piers at divisions, thin dark window frames.
 float y=mod(p.y-.55,3.35),run=mod(u+4.15,8.30);
 float ribbon=gentle3840Box(y,.57,2.67)*gentle3840Box(run,.27,8.03);
 vec3 stone=vec3(.88,.87,.82),glass=vec3(.29,.39,.42);
 float panel=max(gentle3840Line(u,1.035,.006),gentle3840Line(p.y,.67,.006));
 stone=mix(stone,stone*.88,panel*.30);
 vec3 col=mix(stone,glass,ribbon);
 float mull=gentle3840Line(u,1.035,.026)*ribbon;
 col=mix(col,vec3(.14,.17,.18),mull);
 // Photo explicitly shows several lowered charcoal external Venetian blinds.
 // Individual lowered bays are representative, not an asserted exact schedule.
 float selected=step(.74,fract(sin(floor(u/2.07)*37.31+floor((p.y-.55)/3.35)*11.7)*43758.54));
 float blind=selected*ribbon*gentle3840Box(y,1.05,2.67);
 col=mix(col,mix(vec3(.29,.31,.30),vec3(.46,.48,.46),gentle3840Line(p.y,.095,.014)),blind*.92);
 // Ground glazing uses the same actual photo proportion; exact door position
 // and steps remain separate geometry work, not fabricated repetitive doors.
 if(p.y<3.7){float entry=gentle3840Box(y,.20,3.0)*gentle3840Box(run,.45,7.85);col=mix(stone,glass*.86,entry);col=mix(col,vec3(.13,.16,.16),gentle3840Line(u,1.035,.032)*entry);}
 return col;
}

// Villa May: photo-grounded opaque plaster with isolated tall openings; dimensions are photo estimates.
float fra039Box(vec2 p,vec2 h){vec2 a=max(fwidth(p),vec2(.012));vec2 q=1.-smoothstep(h-a,h+a,abs(p));return q.x*q.y;}
vec3 fra039VillaMay(vec3 base,vec3 p,vec3 n){
 if(abs(n.y)>.5)return base;
 vec3 wall=vec3(.83,.82,.77),trim=vec3(.94,.93,.88),glass=vec3(.32,.39,.42);
 float u=dot(p.xz,normalize(vec2(n.z+.000001,-n.x+.000001)));
 float floorH=5.05,cy=mod(p.y-1.1,floorH)-floorH*.5;
 float cx=mod(u+1.90,3.80)-1.90;
 float opening=fra039Box(vec2(cx,cy),vec2(.66,1.55))*step(p.y,16.5);
 float surround=fra039Box(vec2(cx,cy),vec2(.87,1.76))*step(p.y,16.5);
 vec3 col=mix(wall,trim,surround);col=mix(col,glass,opening);
 float mull=(1.-smoothstep(.025,.055,abs(cx)))*opening;
 float trans=(1.-smoothstep(.025,.06,abs(cy-.48)))*opening;
 col=mix(col,trim,max(mull,trans));
 float cornice=1.-smoothstep(.05,.14,abs(mod(p.y-.60,floorH)-.12));
 col=mix(col,trim,cornice*.8);
 float plinth=1.-smoothstep(1.0,1.25,p.y);col=mix(col,wall*.78,plinth);
 // Main south facade's raised pilaster bays, not glass curtain wall.
 if(n.z<-.70){float pilaster=1.-smoothstep(.10,.19,abs(mod(u+1.9,3.8)-1.9));col=mix(col,trim,pilaster*(1.-opening)*.45);}
 return col;
}


float lin024edge(float d,float w){float a=max(fwidth(d),.012);return 1.-smoothstep(w-a,w+a,abs(d));}
vec3 infillLinden15_024Paint(vec3 base,vec3 p,vec3 n,vec4 f,float family){
 if(family<34091.5||family>34095.5||abs(n.y)>.5)return base;
 float u=dot(f.xz,normalize(vec2(n.z+.000001,-n.x+.000001))),y=p.y;
 float story=2.82, floorId=floor(max(y-3.0,0.)/story),v=mod(y-3.,story);
 // Silver composite opaque end-wall panels with fine open joints, never a glass grid.
 vec3 silver=vec3(.76,.78,.77);
 float joint=max(lin024edge(mod(u+.6,1.2)-.6,.014),lin024edge(mod(y,1.41)-.705,.014));
 vec3 c=mix(silver,vec3(.48,.51,.51),joint*.55);
 // Street east face is broad ribbons; returns have a narrower inset ribbon bounded by opaque corners.
 bool front=n.x>.65; bool rear=n.x<-.65;
 float inset=1.;
 if(!front&&!rear)inset=step(.9,abs(u))*step(abs(u),6.2);
 if(y>=3.0&&y<20.0&&inset>.5){
  float spandrel=step(2.05,v);
  vec3 glazing=vec3(.25,.32,.34);
  float mullion=lin024edge(mod(u+.57,1.14)-.57,.025);
  c=mix(glazing,vec3(.66,.69,.68),mullion*.85);
  vec3 band=(floorId==0.||floorId==4.)?silver:vec3(.16,.20,.21);
  c=mix(c,band,spandrel);
  // External louvre blinds are horizontal, varied by complete bay rather than random speckle.
  float blind=step(.42,sin(floor((u+.57)/1.14)*1.7+floorId*2.3));
  float slat=lin024edge(mod(v,.11)-.055,.012);
  if(v<2.05)c=mix(c,vec3(.39,.42,.41),blind*(.18+.48*slat));
 }
 // Recessed glazed ground floor with pale rectangular piers, as photographed.
 if(y<3.0){c=vec3(.14,.20,.20);float pier=lin024edge(mod(u+1.71,3.42)-1.71,.15);c=mix(c,silver,pier);if(y<.20)c=vec3(.52,.54,.52);}
 if(y>20.0)c=silver;
 return c;
}


float sav026line(float d,float w){float a=max(fwidth(d),.012);return 1.-smoothstep(w-a,w+a,abs(d));}
vec3 infillSavigny43_026Paint(vec3 base,vec3 p,vec3 n,vec4 f,float family){
 if(family<34099.5||family>34103.5||abs(n.y)>.5)return base;
 float u=dot(f.xz,normalize(vec2(n.z+.000001,-n.x+.000001))),y=p.y;
 vec3 wall=vec3(.89,.89,.85),glass=vec3(.13,.19,.20),edge=vec3(.38,.40,.37);float ux=mod(u+.925,1.85)-.925;
 float d=max(abs(ux)-.50,max(.55-y,y-15.6));
 // Broad pale parapet separates the upper horizontal ribbon from the tall lower window columns.
 if(y>16.6){float panel=mod(u+1.65,3.3)-1.65;d=max(abs(panel)-1.37,max(16.85-y,y-18.25));}
 float g=1.-smoothstep(-.025,.025,d),reveal=(1.-smoothstep(-.025,.025,d-.065))-g;vec3 c=mix(wall,edge,reveal*.8);
 vec3 pane=glass;float bands=sav026line(mod(y-1.55,3.5)-1.75,.31);pane=mix(pane,vec3(.075,.095,.10),bands*.9);
 pane=mix(pane,vec3(.30,.34,.33),sav026line(ux,.012)*.55);
 if(y<16.6&&mod(y,3.5)>2.8)pane=mix(pane,vec3(.24,.26,.24),sav026line(mod(y,.12)-.06,.014)*.45);
 c=mix(c,pane,g);c*=1.-sav026line(y-15.95,.035)*.08;
 return c;
}


float ml61049Line(float x,float period,float halfWidth){float a=max(fwidth(x),.002),d=abs(fract(x/period+.5)-.5)*period;return 1.-smoothstep(halfWidth-a,halfWidth+a,d);}
float ml61049Box(float x,float lo,float hi){float a=max(fwidth(x),.008);return smoothstep(lo-a,lo+a,x)*(1.-smoothstep(hi-a,hi+a,x));}
vec3 frankfurtML61049(vec3 base,vec3 p,vec3 normal,float family){
 if(family<34191.5||family>34195.5||abs(normal.y)>.5)return base;
 vec2 n=normalize(normal.xz);float u=dot(p.xz,vec2(n.y,-n.x));
 float ne=step(.85,dot(n,normalize(vec2(.75,.66))));
 // Owner expressly states NE party side is closed metal panels, no windows.
 if(ne>.5){float seams=max(ml61049Line(u,1.35,.009),ml61049Line(p.y,1.25,.009));return mix(vec3(.59,.62,.60),vec3(.46,.49,.48),seams*.65);}
 float front=step(.80,dot(n,normalize(vec2(.66,-.75))));
 // Pale gray-green broad metal fins separate paired narrow blue panes.
 float pier=ml61049Line(u,1.35,.18),inner=ml61049Line(u+.675,1.35,.024);
 float floorBand=ml61049Line(p.y-.32,3.8,.12),transom=ml61049Line(p.y-1.72,3.8,.022);
 vec3 metal=mix(vec3(.54,.61,.58),vec3(.65,.70,.69),1.-front);
 vec3 glass=mix(vec3(.30,.42,.47),vec3(.29,.44,.50),front);
 float variation=.012*sin(floor(u/1.35)*1.7+floor(p.y/3.8)*.8);
 vec3 col=mix(glass+variation,metal,max(pier,floorBand));
 col=mix(col,vec3(.72,.74,.72),max(inner,transom)*(1.-pier)*.70);
 float lip=ml61049Line(u+.205,1.35,.024)*(1.-pier);
 col=mix(col,glass*.65,lip*.65);
 // Entrance zone identified in owner photo is double height with very fine
 // glazing, metallic piers and dark entry portal. No repeated invented doors.
 if(front>.5&&p.y<7.3){
  float column=ml61049Line(u,5.40,.13),clearFrames=max(ml61049Line(u,1.35,.025),ml61049Line(p.y,3.65,.025));
  col=mix(vec3(.32,.44,.46),vec3(.66,.70,.69),max(column,clearFrames));
 }
 return col;
}


float ontano031Line(float x,float spacing,float width){float aa=max(fwidth(x),.008);float d=abs(mod(x+.5*spacing,spacing)-.5*spacing);return 1.-smoothstep(width,width+aa,d);}
float ontano031Box(float x,float lo,float hi){float aa=max(fwidth(x),.012);return smoothstep(lo-aa,lo+aa,x)*(1.-smoothstep(hi-aa,hi+aa,x));}
vec3 ontano031(vec3 base,vec3 p,vec3 n,float family){
 if(family<34119.5||family>34123.5||abs(n.y)>.15)return base;
 // Confirmed Erlenstrasse street frontage only. Native common frame has Z=north.
 float front=step(.97,dot(normalize(n.xz),normalize(vec2(.366,-.931))));
 // The return/courtyard elevations are not documented by this street photo.
 if(front<.5)return base;
 float u=dot(p.xz,normalize(vec2(.931,.366)))+1690.;
 // Actual facade is large framed glazed fields in beige coarse stone, not all-over small square glass.
 vec3 stone=vec3(.70,.67,.57),glass=vec3(.24,.43,.45),frame=vec3(.25,.29,.28);
 float stoneGrain=.5+.5*sin(u*39.7)*sin(p.y*43.1);stone=mix(stone*.96,stone*1.025,stoneGrain);
 float block=mod(u,10.8),largeField=ontano031Box(block,.48,10.32)*ontano031Box(p.y,7.3,20.75);
 float glassVariation=.5+.5*sin(u*.10+p.y*.035);vec3 panel=mix(glass,vec3(.34,.51,.52),glassVariation*.38);
 // Silver outer casement, narrow mullions, dark gaskets and broad turquoise spandrel rows.
 float vertical=ontano031Line(u-.48,1.35,.030),rail=ontano031Line(p.y-7.3,3.36,.052);
 panel=mix(panel,frame,max(vertical,rail));
 float edge=max(ontano031Line(block-.48,9.84,.10),max(ontano031Line(p.y-7.3,13.45,.10),ontano031Line(block-.44,9.92,.020)));
 panel=mix(panel,vec3(.64,.67,.64),edge*.78);
 float lip=ontano031Line(u-.53,1.35,.012);panel=mix(panel,vec3(.66,.70,.68),lip*.28);
 vec3 color=mix(stone,panel,largeField);
 // Tenant installation photo confirms separate ground/first-level openings with solid stone piers,
 // white aluminium framing and a low transom. Temporary delivery opening is NOT a permanent door.
 if(p.y<7.3){float row=mod(p.y-.30,3.5),bay=mod(u,2.7);float opening=ontano031Box(row,.18,3.05)*ontano031Box(bay,.25,2.45);vec3 groundGlass=glass*.86;float narrow=ontano031Line(u,1.35,.045),transom=ontano031Line(row-.90,3.5,.048);groundGlass=mix(groundGlass,vec3(.67,.70,.68),max(narrow,transom));color=mix(stone,groundGlass,opening);}
 return color;
}

float fraLOBLine(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtLowOfficeBulk70Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family<33999.5||family>34379.5)return base;
 p.xz=frame.xz;
 if(normal.y<-.5)return base;
 if(normal.y>.5){
  float edge=max(0.,frame.w-2.),aa=max(fwidth(edge),.025),coping=(normal.y>.995&&!((family>34127.5&&family<34131.5)||(family>34223.5&&family<34227.5)))?1.-smoothstep(.12-aa,.36+aa,edge):0.;
  if(base.b>base.r*1.10&&base.r<.39){float cell=1.-(1.-fraLOBLine(p.x*.84+p.z*.54,1.4,.025))*(1.-fraLOBLine(p.x*.54-p.z*.84,2.1,.025));return mix(mix(base,base*1.16,cell*.55),vec3(.73,.74,.69),coping*.8);}
  bool planted=(base.g>base.b*1.12&&base.b<.48&&base.r<.67);
  float joint=planted?0.:fraLOBLine(p.x*.86+p.z*.51,2.8,.018);
  return mix(mix(base,base*.88,joint*.50),vec3(.77,.78,.72),coping*.78);
 }
 // FRA-LOW-007: Genealogist's own 2011 street photographs show white plaster,
 // sparse vertical glazing strips, a red attic band and a rounded glazed corner.
 // Replace the formerly shared curtain-wall grid for this exact building family.
 if(family>34023.5&&family<34027.5){
  vec3 plaster=vec3(.86,.85,.80),metal=vec3(.29,.32,.34),glass007=vec3(.43,.50,.54);
  float h=p.y,aa007=max(fwidth(h),.025);
  if(h<1.05)return mix(vec3(.48,.46,.42),vec3(.59,.57,.52),fraLOBLine(p.x+p.z,1.1,.018)*.3);
  if(h>19.35)return vec3(.24,.25,.25);
  float along007=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001)));
  bool roundedCorner007=p.z< -9.0&&p.x<3.2&&p.x> -3.7;
  bool attic007=h>16.65;
  if(attic007){
   vec3 atticWall=vec3(.59,.23,.20);
   float opening=1.-smoothstep(.59,.66,abs(mod(along007+1.5,2.95)-1.475));
   opening*=smoothstep(16.94,17.03,h)*(1.-smoothstep(18.90,19.00,h));
   float frame007=max(smoothstep(.52,.59,abs(mod(along007+1.5,2.95)-1.475)),max(1.-smoothstep(17.03,17.12,h),smoothstep(18.80,18.90,h)));
   return mix(atticWall,mix(glass007,vec3(.57,.60,.61),frame007),opening);
  }
  float strip007=roundedCorner007?1.:1.-smoothstep(1.02,1.12,abs(mod(along007+.7,6.0)-3.0));
  float floor007=fraLOBLine(h-1.05,3.85,.095);
  float post007=fraLOBLine(along007,roundedCorner007?1.24:1.05,.052)*strip007;
  float stripEdge007=roundedCorner007?0.:smoothstep(.94,1.02,abs(mod(along007+.7,6.0)-3.0))*strip007;
  float spandrel007=1.-smoothstep(.38,.46,abs(mod(h-1.05,3.85)-.62));
  vec3 window007=mix(glass007,metal*.89,spandrel007*.75);
  window007=mix(window007,vec3(.58,.61,.61),max(max(floor007,post007),stripEdge007));
  float nested007=fraLOBLine(along007+.055,roundedCorner007?1.24:1.05,.013)*strip007;
  window007=mix(window007,metal,nested007*.7);
  float sill007=fraLOBLine(h-.96,3.85,.025)*strip007;
  window007=mix(window007,vec3(.65,.66,.63),sill007*.8);
  float rail007=max(fraLOBLine(h-2.05,3.85,.022),fraLOBLine(h-2.19,3.85,.017))*strip007;
  window007=mix(window007,vec3(.69,.71,.69),rail007*.78);
  return mix(plaster,window007,strip007);
 }
 // FRA-LOW-009: occupying association's own captioned photograph,
 // Glastechnische Berichte65(1992), p125: ribbons on the long frontage,
 // predominantly solid end wall with one narrow vertical stair-window strip.
 if(family>34031.5&&family<34035.5){
  vec3 wall009=base,glass009=vec3(.32,.37,.38),frame009=vec3(.69,.70,.67);
  float h=p.y,along009=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001)));
  bool long009=abs(dot(normal.xz,vec2(.944,-.330)))>.85;
  float row009=mod(h-.32,3.56);
  float ribbon009=smoothstep(1.08,1.16,row009)*(1.-smoothstep(2.67,2.75,row009));
  if(h>21.40||h<.35)return wall009*.83;
  if(long009){
   float post009=fraLOBLine(along009,1.37,.035);
   vec3 glazing009=mix(glass009,frame009,post009);
   float inner009=fraLOBLine(along009+.39,1.37,.012);
   glazing009=mix(glazing009,frame009*.88,inner009*.32);
   float sill009=fraLOBLine(row009-1.10,3.56,.026);
   vec3 result009=mix(wall009,glazing009,ribbon009);
   result009=mix(result009,wall009*1.10,sill009*.70);
   if(h<3.15)result009=mix(wall009*.88,glass009*.80,1.-fraLOBLine(along009,5.5,.30));
   return result009;
  }
  float slit009=1.-smoothstep(.63,.72,abs(along009-.2));
  float horizontal009=fraLOBLine(h-.35,3.56,.055);
  return mix(wall009,mix(glass009,frame009,horizontal009),slit009);
 }
 if(family>34119.5&&family<34123.5)return ontano031(base,p,normal,family);
 if(family>34039.5&&family<34043.5)return infillEmporium011Paint(base,p,normal,frame,family);
 if(family>34043.5&&family<34047.5)return infillFEA36_012Paint(base,p,normal,frame,family);
 if(family>34091.5&&family<34095.5)return infillLinden15_024Paint(base,p,normal,frame,family);
 if(family>34099.5&&family<34103.5)return infillSavigny43_026Paint(base,p,normal,frame,family);
 if(family>34191.5&&family<34195.5)return frankfurtML61049(base,p,normal,family);
 if((family>34139.5&&family<34147.5)||(family>34183.5&&family<34187.5))return frankfurtAppearance031050(base,p,normal,family);
 if((family>34147.5&&family<34151.5)||(family>34155.5&&family<34159.5))return frankfurtGentle038040(base,p,normal,family);
 if(family>34223.5&&family<34227.5)return fra039VillaMay(base,p,normal);
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001)));
 float pier=fraLOBLine(u,2.05,frame.w>.5?.07:.26),floorBand=fraLOBLine(p.y-1.05,3.40,frame.w>.5?.10:.21);
 vec3 glass=vec3(.27,.36,.39);
 float opaque=1.-(1.-pier)*(1.-floorBand);
 vec3 col=mix(glass,base,opaque);
 // Nested inner frame/reveal sits inside the existing representative window opening.
 float reveal=fraLOBLine(u+.055,2.05,frame.w>.5?.025:.305)*(1.-pier);
 float innerPost=fraLOBLine(u+1.025,2.05,.025)*(1.-pier);
 float transom=fraLOBLine(p.y-.50,3.40,.025)*(1.-opaque);
 col=mix(col,glass*.72,reveal*.45*(1.-opaque));
 col=mix(col,vec3(.57,.63,.62),max(innerPost,transom)*.58);
 // Sill undershadow is bounded to the opening, not a solid black stripe across stone piers.
 float sill=fraLOBLine(p.y-.79,3.40,.045)*(1.-pier),sillHighlight=fraLOBLine(p.y-.84,3.40,.018)*(1.-pier);
 col=mix(col,base*.72,sill*.48);col=mix(col,base*1.05,sillHighlight*.52);
 float course=fraLOBLine(p.y,.68,.008),stoneJoint=fraLOBLine(u+floor(p.y/.68)*.71,1.42,.008);
 col=mix(col,base*.89,max(course,stoneJoint)*opaque*.30);
 if(p.y<.28)col=base*.78;
 return col;
}
`;
