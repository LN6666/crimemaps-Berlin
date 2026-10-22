import {RATHAUS_GOTHIC_REVISION_GLSL} from './facade-rathaus-gothic-revision';
import {RATHAUS_ROOF_PAINT_GLSL} from './facade-rathaus-roof-paint';
/** Munich-only component drawing from the two canonical detailed MD records.
 * Surface assignment stays separate; these functions never create geometry.
 * IDs 120–139 are reserved for these samples. Hamburg functions remain unchanged.
 */
export const MUNICH_FACADE_GLSL=`
${RATHAUS_GOTHIC_REVISION_GLSL}
${RATHAUS_ROOF_PAINT_GLSL}
vec3 fmStoneGrid(vec3 wall,vec2 q,vec2 h,float columns,float rows){
 float glass=foRect(q,h),outer=foRect(q,h+vec2(.14));
 wall=fpLayer(wall,outer,vec3(.77,.74,.66),.94);
 wall=fpLayer(wall,glass,vec3(.12,.16,.19),.96);
 float vertical=fpRepeatStroke(q.x+h.x,2.*h.x/max(columns,1.),.05),horizontal=fpRepeatStroke(q.y+h.y,2.*h.y/max(rows,1.),.045);
 wall=fpLayer(wall,max(vertical,horizontal)*glass,vec3(.54,.45,.37),.95);
 return fpLayer(wall,fpStroke(q.y+h.y+.18,.08)*step(abs(q.x),h.x+.23),vec3(.81,.77,.66),.9);
}
// Tall rectangular lower glazing with a short pointed head, independent of Hamburg primitives.
vec3 fmLancet(vec3 wall,vec2 q,vec2 h,float columns){
 float archRatio=clamp(h.x*1.35/max(h.y,.1),.16,.48);
 float opening=fpWindowShape(q,h,archRatio,1.),outer=fpWindowShape(q,h+vec2(.16),archRatio,1.);
 wall=fpLayer(wall,outer,vec3(.79,.76,.66),.95);wall=fpLayer(wall,opening,vec3(.12,.16,.19),.96);
 float spring=h.y*(1.-archRatio),grid=max(fpRepeatStroke(q.x+h.x,2.*h.x/max(columns,1.),.043),fpRepeatStroke(q.y+h.y,max(.65,h.y/4.),.035));
 float lower=1.-smoothstep(spring-.10,spring+.08,q.y);
 float t=clamp((q.y-spring)/max(h.y-spring,.1),0.,1.);
 float branches=max(fpStroke(q.x-h.x*.72*(1.-t),.043),fpStroke(q.x+h.x*.72*(1.-t),.043));
 float circle=fpStroke(length(q-vec2(0.,spring+h.x*.31))-h.x*.24,.035);
 wall=fpLayer(wall,(grid*lower+max(branches,circle)*(1.-lower))*opening,vec3(.71,.68,.59),.94);
 return fpLayer(wall,fpStroke(q.y+h.y+.19,.065)*step(abs(q.x),h.x+.23),vec3(.83,.78,.66),.94);
}
vec3 fmClock(vec3 wall,vec2 q,float r,bool pale){
 float d=length(q),dial=fpInside(d-r),rim=fpStroke(d-r,.09);
 wall=fpLayer(wall,dial,pale?vec3(.81,.78,.63):vec3(.14,.21,.27),.97);
 wall=fpLayer(wall,rim,vec3(.77,.67,.40),.96);
 float ticks=fpRepeatStroke(atan(q.y,q.x),6.2831853/12.,.035)*fpInside(abs(d-r*.80)-r*.12)*dial;
 wall=fpLayer(wall,ticks,pale?vec3(.25,.24,.20):vec3(.90,.77,.43),.96);
 float hands=max(fpStroke(q.x,.055)*fpInside(abs(q.y+r*.19)-r*.39),fpStroke(q.y-q.x*.42,.06)*fpInside(abs(q.x-r*.2)-r*.38));
 return fpLayer(wall,hands*dial,vec3(.90,.75,.34),.98);
}
vec3 fmShield(vec3 wall,vec2 q,float scale){
 vec2 p=q/max(scale,.02);float body=fpInside(max(abs(p.x)-.28,abs(p.y+.08)-.36));
 float tip=foTriangle(vec2(p.x,-p.y-.43),.28,.3);wall=fpLayer(wall,max(body,tip),vec3(.63,.58,.47),.83);
 return fpLayer(wall,fpStroke(p.x,.055)*body,vec3(.31,.34,.29),.8);
}
vec3 fmPointedPortal(vec3 wall,vec2 q,vec2 h,bool ornate){
 float opening=fpWindowShape(q,h,.94,1.),outer=fpWindowShape(q,h+vec2(.25),.94,1.);
 wall=fpLayer(wall,outer,vec3(.78,.74,.63),.95);wall=fpLayer(wall,opening,vec3(.24,.18,.14),.96);
 float door=foRect(q-vec2(0.,-h.y*.34),vec2(h.x*.72,h.y*.58))*opening;
 wall=fpLayer(wall,door,vec3(.30,.20,.14),.94);
 wall=fpLayer(wall,max(fpStroke(q.x,.06),fpRepeatStroke(q.y,1.3,.027))*door,vec3(.52,.42,.29),.8);
 if(ornate){float medallion=fpStroke(length(q-vec2(0.,-h.y*.34))-h.x*.35,.04)*door;wall=fpLayer(wall,medallion,vec3(.67,.56,.39),.9);wall=foReliefCrown(wall,q-vec2(0.,h.y*.95),h.x*1.18,h.y*.28);}
 return wall;
}
vec3 fmFrauenWall(vec3 base,vec2 uv,float W,float H,vec3 normal,float id){
 vec3 wall=fpSurfaceOnly(mix(base,vec3(.52,.34,.27),.78),uv,1.);
 if(id==124.&&(uv.y>H||uv.y<0.))return wall;
 wall=flBelt(wall,uv,min(1.8,H*.08),.11);wall=flBelt(wall,uv,H-.6,.18);
 float west=normal.x<-.78?1.:0.,north=normal.z>.72?1.:0.;
 // Broad shafts remain masonry: the openings are local sparse fields, never storey grids.
 if(id==125.&&uv.y<60.){
  float x=uv.x-W*.5;wall=flBelt(wall,uv,20.,.15);wall=flBelt(wall,uv,40.,.15);
  float corner=max(fpStroke(uv.x-.22,.10),fpStroke(uv.x-W+.22,.10));wall=fpLayer(wall,corner,vec3(.65,.49,.37),.36);
  if(W>4.){wall=foRectCasement(wall,vec2(x,uv.y-27.),vec2(.33,.65),0.);wall=fmLancet(wall,vec2(x,uv.y-48.),vec2(.43,.92),2.);}
  return wall;
 }
 if(id==126.||id==125.&&uv.y>=60.){
  // Original octagonal upper stages: clock below the belfry, then a short round-headed collar.
  float x=uv.x-W*.5;wall=flBelt(wall,uv,60.5,.18);wall=flBelt(wall,uv,89.0,.15);
  wall=fmClock(wall,vec2(x,uv.y-71.),min(W*.29,1.4),true);
  if(uv.y>75.&&uv.y<88.5)wall=fmLancet(wall,vec2(x,uv.y-82.),vec2(min(W*.31,1.5),5.8),2.);
  wall=foRoundedArcade(wall,vec2(x,uv.y-89.8),vec2(min(W*.22,.8),.45),0.);
  return wall;
 }
 if(west>.5&&W<20.){
  wall=fmLancet(wall,vec2(uv.x-W*.5,uv.y-H*.65),vec2(min(W*.20,2.6),H*.22),4.);
  wall=fmPointedPortal(wall,vec2(uv.x-W*.5,uv.y-H*.18),vec2(min(W*.17,2.0),H*.13),true);
  return wall;
 }
 float margin=min(2.,W*.16),count=max(1.,floor((W-2.*margin)/7.8)),bay=(W-2.*margin)/count,x=uv.x-margin;
 if(x>=0.&&x<=W-2.*margin){
  float index=floor(x/bay);vec2 q=vec2(mod(x,bay)-bay*.5,uv.y-H*.60);
  // North is only partly observed. Keep known masonry intervals; do not copy southern plaques.
  bool portal=W>35.&&(index==1.||index==count-2.);
  if(portal){wall=fmPointedPortal(wall,vec2(q.x,uv.y-H*.16),vec2(min(1.4,bay*.2),H*.13),north<.5);if(north<.5&&index==count-2.){float panel=foRect(vec2(q.x,uv.y-H*.33),vec2(bay*.18,.85));wall=fpLayer(wall,panel,vec3(.80,.74,.60),.91);wall=fpLayer(wall,fpStroke(q.x+(uv.y-H*.33)*.65,.025)*panel,vec3(.36,.31,.25),.87);}}
  else wall=fmLancet(wall,q,vec2(min(bay*.22,2.05),H*.31),4.);
  if(north<.5&&!portal){vec2 plaque=vec2(q.x+bay*.28,uv.y-H*.09);wall=fpLayer(wall,foRect(plaque,vec2(.48,.66)),vec3(.60,.57,.50),.70);wall=foReliefCrown(wall,plaque,.33,.30);}
 }
 return wall;
}
vec3 fmFrauenRoof(vec3 base,vec2 uv,float W,float H,bool copper){
 if(copper){vec3 roof=mix(base,vec3(.40,.61,.49),.82);roof=fpLayer(roof,fpRepeatStroke(uv.x,1.3,.03),vec3(.23,.42,.34),.55);return roof;}
 vec3 roof=mix(base,vec3(.58,.28,.20),.88);
 roof=fpLayer(roof,max(fpRepeatStroke(uv.y,.34,.012),fpRepeatStroke(uv.x+mod(floor(uv.y/.34),2.)*.17,.34,.007)),vec3(.32,.20,.16),.34);
 // Tiny dark dormer mouths with shallow tile hoods; no lancet windows on roof planes.
 if(W>25.&&H>7.){float bay=6.6,row=H/3.2;vec2 q=vec2(mod(uv.x+floor(uv.y/row)*bay*.45,bay)-bay*.5,mod(uv.y,row)-row*.58);float mouth=foRect(q,vec2(.46,.20)),hood=foRect(q-vec2(0.,.24),vec2(.62,.11));roof=fpLayer(roof,hood,vec3(.70,.38,.25),.84);roof=fpLayer(roof,mouth,vec3(.20,.18,.15),.93);}
 return roof;
}
vec3 fmRathausWall(vec3 base,vec2 uv,float W,float H,vec3 normal,float id){
 bool south=normal.z<-.66, north=normal.z>.66;
 bool east=normal.x>.66;
 float warm=(east||south&&uv.x/W>.56)?1.:0.;
 vec3 wall=fpSurfaceOnly(mix(base,mix(vec3(.70,.68,.60),vec3(.62,.49,.35),warm),.78),uv,2.);
 wall=flBelt(wall,uv,H*.055,.11);wall=flBelt(wall,uv,H*.31,.15);wall=flBelt(wall,uv,H*.57,.16);wall=flBelt(wall,uv,H*.83,.18);wall=flBelt(wall,uv,H*.976,.17);
 if(north){float margin=min(1.,W*.08),count=max(1.,floor((W-2.*margin)/4.6)),bay=(W-2.*margin)/count,x=uv.x-margin;if(x>=0.&&x<=W-2.*margin)for(int row=0;row<3;row++)wall=fmStoneGrid(wall,vec2(mod(x,bay)-bay*.5,uv.y-H*(.19+float(row)*.27)),vec2(bay*.20,H*.075),2.,2.);return wall;}
 if(id==121.){
  // A court-specific high library-light group above smaller lower openings.
  float margin=W*.10,bay=(W-2.*margin)/4.,x=uv.x-margin;
  if(x>=0.&&x<=W-2.*margin){vec2 q=vec2(mod(x,bay)-bay*.5,uv.y-H*.66);wall=fmStoneGrid(wall,q,vec2(bay*.31,H*.26),3.,6.);wall=foRoundedArcade(wall,vec2(q.x,uv.y-H*.19),vec2(bay*.28,H*.115),0.);wall=foNicheStatue(wall,vec2(q.x+bay*.45,uv.y-H*.50),vec2(.34,1.2),0.);}
  return wall;
 }
 float boundary=south?W*.56:W*.5,left=uv.x<boundary?0.:boundary,span=uv.x<boundary?boundary:W-boundary;
 float pitch=uv.x<boundary?4.7:5.35,count=max(1.,floor(span/pitch)),bay=span/count,x=uv.x-left,index=floor(x/bay);vec2 q=vec2(mod(x,bay)-bay*.5,uv.y-H*.18);
 if(south)wall=fmLancet(wall,q,vec2(bay*.30,H*.12),3.);else wall=fmPointedPortal(wall,q,vec2(bay*.22,H*.10),false);
 for(int tier=0;tier<2;tier++){
  float cy=H*(.44+float(tier)*.265);vec2 v=vec2(q.x,uv.y-cy);
  wall=fmStoneGrid(wall,v,vec2(bay*.26,H*.092),2.,2.);
  float hood=fpStroke(v.y-H*.092-.28+abs(v.x)*.18,.07)*step(abs(v.x),bay*.31);wall=fpLayer(wall,hood,vec3(.84,.81,.70),.94);
  wall=foNicheStatue(wall,vec2(q.x+bay*.44,uv.y-H*(.37+float(tier)*.26)),vec2(.30,H*.042),0.);
 }
 if(south&&uv.x>W*.68&&uv.x<W*.87){vec2 loggia=vec2(uv.x-W*.775,uv.y-H*.59);vec2 h=vec2(W*.092,H*.094);float shade=foRect(loggia,h);wall=fpLayer(wall,shade,vec3(.19,.19,.17),.90);float posts=fpRepeatStroke(loggia.x+h.x,2.*h.x/5.,.065)*shade;wall=fpLayer(wall,posts,vec3(.82,.78,.66),.95);wall=fpLayer(wall,fpStroke(loggia.y+h.y,.13)*step(abs(loggia.x),h.x),vec3(.76,.73,.63),.97);}
 wall=fmShield(wall,vec2(q.x,uv.y-H*.32),.75);
 return wall;
}

vec3 fmRathausCourt(vec3 base,vec2 uv,float W,float H,bool stair){
 vec3 wall=fpSurfaceOnly(mix(base,vec3(.69,.67,.59),.78),uv,2.);
 if(uv.y>H||uv.y<0.)return wall;
 if(stair){for(int k=0;k<3;k++){float y=H*(.20+float(k)*.28);wall=foRoundedArcade(wall,vec2(uv.x-W*.5,uv.y-y),vec2(W*.33,H*.065),0.);wall=flBelt(wall,uv,y-H*.08,.15);wall=foReliefCrown(wall,vec2(uv.x-W*.5,uv.y-y-H*.08),W*.30,H*.03);}return wall;}
 float margin=min(1.,W*.12),count=max(1.,floor((W-2.*margin)/4.7)),bay=(W-2.*margin)/count,x=uv.x-margin;
 if(x>=0.&&x<=W-2.*margin){vec2 q=vec2(mod(x,bay)-bay*.5,uv.y-H*.18);wall=foRoundedArcade(wall,q,vec2(bay*.25,H*.11),0.);for(int k=0;k<2;k++)wall=fmStoneGrid(wall,vec2(q.x,uv.y-H*(.45+float(k)*.28)),vec2(bay*.23,H*.09),2.,3.);}
 wall=flBelt(wall,uv,H*.32,.12);wall=flBelt(wall,uv,H*.72,.13);return flBelt(wall,uv,H*.96,.16);
}
vec3 fmRathausTower(vec3 base,vec2 uv,float W,float H,vec3 normal){
 vec3 wall=fpSurfaceOnly(mix(base,vec3(.69,.67,.59),.82),uv,2.);float x=uv.x-W*.5,y=uv.y;
 bool front=normal.x*(-.30)+normal.z*(-.954)>.90;
 float corner=max(fpStroke(uv.x-.23,.13),fpStroke(uv.x-W+.23,.13));wall=fpLayer(wall,corner,vec3(.81,.78,.68),.8);
 if(H<=40.5){
  if(front){wall=fmPointedPortal(wall,vec2(x,y-4.8),vec2(min(W*.26,2.6),4.),true);
   wall=foReliefCrown(wall,vec2(x,y-14.),min(W*.27,2.6),2.2);
   float balcony=foRect(vec2(x,y-23.5),vec2(W*.38,1.25));wall=fpLayer(wall,balcony,vec3(.42,.43,.38),.85);wall=fpLayer(wall,fpRepeatStroke(x,.70,.05)*balcony,vec3(.84,.79,.65),.94);
  }
  wall=flBelt(wall,uv,27.,.20);
 }else if(H<60.5){
  wall=flBelt(wall,uv,48.,.17);wall=flBelt(wall,uv,59.,.24);
  if(front)wall=fmClock(wall,vec2(x,y-54.5),min(W*.21,1.6),false);
  else if(y>48.&&y<58.)wall=fmLancet(wall,vec2(x,y-53.),vec2(min(W*.16,1.0),3.2),2.);
 }else{
  wall=fmLancet(wall,vec2(x,y-64.5),vec2(min(W*.27,1.3),3.7),2.);wall=flBelt(wall,uv,69.0,.23);
 }
 // One localized two-stage open display, not a glass grid around the tower.
 if(front&&y>30.&&y<44.2){vec2 q=vec2(x,y-37.);vec2 h=vec2(W*.34,6.7);float enclosure=foRect(q,h);wall=fpLayer(wall,enclosure,vec3(.20,.30,.27),.94);float copper=max(fpStroke(abs(q.x)-h.x,.12),max(fpStroke(q.y,.12),fpStroke(abs(q.y)-h.y,.16)))*enclosure;wall=fpLayer(wall,copper,vec3(.43,.62,.48),.95);for(int k=0;k<5;k++)for(int tier=0;tier<2;tier++)wall=foNicheStatue(wall,q-vec2(float(k-2)*h.x*.35,float(tier)*6.-3.),vec2(.19,.75),0.);}
 return wall;
}
vec3 fmPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float id){
 if(id==171.)return grRathausLoggia(base,frame.xy,frame.w,frame.z,normal);
 if(id==133.){vec2 q=vec2(frame.x-frame.w*.5,frame.y);float t=clamp(q.y/frame.z,0.,1.),w=frame.w*(1.-t);vec3 stone=grStone(base,frame.xy,0.);float ribs=max(fpStroke(abs(q.x)-w*.47,.055),fpStroke(abs(q.x)-w*.22,.035));stone=fpLayer(stone,ribs,vec3(.85,.83,.75),.92);float crossed=fpStroke(abs(q.x)-abs(t-.5)*frame.w*.35,.028);stone=fpLayer(stone,crossed,vec3(.42,.45,.43),.67);if(t<.58)stone=grBlindTracery(stone,vec2(q.x,q.y-frame.z*.26),vec2(frame.w*.18,frame.z*.18));return stone;}
 if(id==120.)return grRathausFront(base,frame.xy,frame.w,frame.z,normal);
 if(id==139.)return nrPaintedRoof(base,frame.xy);
 if(id==137.){vec3 stone=grStone(base,frame.xy,0.);if(abs(normal.y)>.12)return stone;
  float w=frame.w,x=frame.x-w*.5;
  // Verified solid decorative members: clustered stone ribs and blind panels only.
  float ribs=max(fpRepeatStroke(frame.x,max(.3,w/3.),.075),fpStroke(x,.09));
  stone=fpLayer(stone,ribs,vec3(.29,.35,.30),.78);
  stone=fpLayer(stone,fpRepeatStroke(frame.x+.10,max(.3,w/3.),.06),vec3(.91,.90,.80),.94);
  for(int tier=0;tier<2;tier++){float yy=frame.z*(.43+float(tier)*.27);stone=grCanopyFigure(stone,vec2(x,frame.y-yy),min(w*.36,1.1),min(frame.z*.09,2.7),1.);}
  return grBand(stone,frame.xy,frame.z-.30,.12); }
 if(id==138.)return fpLayer(mix(base,vec3(.41,.59,.48),.80),fpRepeatStroke(frame.x,.65,.018),vec3(.24,.39,.32),.36);
 if(id==122.||id==123.)return grRathausTower(base,frame.xy,frame.w,frame.z,normal);
 if(id==134.||id==136.)return grRathausCourt(base,frame.xy,frame.w,frame.z,id==136.);
 if(id==135.)return fpSurfaceOnly(mix(base,vec3(.70,.67,.59),.78),frame.xy,2.);
 if(id==130.)return fpSurfaceOnly(mix(base,vec3(.52,.34,.27),.78),frame.xy,1.);
 if(id==131.){vec3 wall=fpSurfaceOnly(mix(base,vec3(.52,.34,.27),.78),frame.xy,1.);if(normal.x<-.78)return fmPointedPortal(wall,vec2(frame.x-frame.w*.5,frame.y-5.),vec2(min(frame.w*.2,2.2),4.),true);return wall;}
 if(id==132.)return base;
 if(id==127.||id==128.)return fmFrauenRoof(base,frame.xy,frame.w,frame.z,id==128.);
 if(id>=124.&&id<=126.)return fmFrauenWall(base,frame.xy,frame.w,frame.z,normal,id);
 if(id==129.){vec3 roof=mix(base,vec3(.30,.28,.25),.82);return fpLayer(roof,fpRepeatStroke(frame.x,.70,.016),vec3(.18,.18,.17),.34);}
 return fmRathausWall(base,frame.xy,frame.w,frame.z,normal,id);
}
`;
