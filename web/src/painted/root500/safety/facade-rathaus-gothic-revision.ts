/** Source-bound Neues Rathaus Neo-Gothic surface painter.
 * Only current NR drawing functions are candidates for replacement.
 * Canonical765-word MD remains unchanged; Hamburg/Frauenkirche stay frozen.
 * Owner fresh Google Maps pixels are ROOT-REPORTED, not personally inspected
 * by this worker: pointed passages, dense vertical piers, two figure/canopy
 * tiers, crocketed hood moulds, eastern five-bay loggia and filigree tower.
 * Required globals: fpInside/fpStroke/fpRepeatStroke/fpLayer/fpBoxSdf,
 * foRect/foTriangle. Existing source-bound frames/vertices remain unchanged.
 */
export const RATHAUS_GOTHIC_REVISION_GLSL = `
float grPointed(vec2 q,vec2 h){
 h=max(h,vec2(.025));float capH=min(h.y*.55,h.x*1.56),spring=h.y-capH;
 float lowerH=(spring+h.y)*.5;
 float lower=foRect(q-vec2(0.,(spring-h.y)*.5),vec2(h.x,lowerH));
 vec2 a=vec2(q.x,(q.y-spring)*1.7320508*h.x/max(capH,.02));
 float arc=max(length(a+vec2(h.x,0.)),length(a-vec2(h.x,0.)))-2.*h.x;
 return max(lower,fpInside(max(arc,max(spring-q.y,q.y-h.y))));
}
vec3 grStone(vec3 base,vec2 uv,float warm){
 vec3 pale=mix(vec3(.72,.74,.70),vec3(.73,.68,.58),warm*.70);
 vec3 wall=mix(base,pale,.84);
 // Fine ashlar, subdued weathering. Relief carries contrast, not coarse grid.
 float bed=fpRepeatStroke(uv.y,.72,.008),joint=fpRepeatStroke(uv.x+mod(floor(uv.y/.72),2.)*.7,1.4,.009);
 wall=fpLayer(wall,max(bed,joint),vec3(.43,.47,.44),.13);
 return wall*(.991+.009*sin(uv.x*.18)*sin(uv.y*.43));
}
vec3 grBand(vec3 wall,vec2 uv,float y,float thick){
 wall=fpLayer(wall,fpStroke(uv.y-y,thick),vec3(.58,.62,.58),.75);
 wall=fpLayer(wall,fpStroke(uv.y-y-thick,.035),vec3(.87,.87,.77),.93);
 return fpLayer(wall,fpStroke(uv.y-y+thick,.040),vec3(.34,.40,.38),.56);
}
vec3 grBlindTracery(vec3 wall,vec2 q,vec2 h){
 float panel=foRect(q,h),edge=max(fpStroke(abs(q.x)-h.x,.035)*step(abs(q.y),h.y),fpStroke(abs(q.y)-h.y,.035)*step(abs(q.x),h.x));
 wall=fpLayer(wall,edge,vec3(.49,.55,.50),.41);
 float stem=fpStroke(q.x,.055),curve=fpStroke(length(q-vec2(0.,h.y*.30))-min(h.x*.38,h.y*.23),.055);
 float diagonals=max(fpStroke(q.x-q.y*.29,.024),fpStroke(q.x+q.y*.29,.024));
 return fpLayer(wall,max(stem,max(curve,diagonals))*panel,vec3(.30,.36,.32),.72);
}
vec3 grOgeeHood(vec3 wall,vec2 q,float halfWidth,float top,float rise,float ornate){
 float t=clamp(abs(q.x)/max(halfWidth,.05),0.,1.);
 // Slender double-curved/pointed hood OUTLINE, not a broad triangular pediment.
 float line=top+rise*(pow(1.-t,.66)+.075*sin(t*6.2831853));
 float extent=step(abs(q.x),halfWidth*1.06),hood=fpStroke(q.y-line,.13)*extent;
 wall=fpLayer(wall,hood,vec3(.84,.86,.76),.97);
 wall=fpLayer(wall,fpStroke(q.y-line+.19,.085)*extent,vec3(.25,.29,.27),.82);
 for(int j=1;j<5;j++){
  float tt=float(j)/5.,xx=halfWidth*tt,yy=top+rise*(pow(1.-tt,.66)+.075*sin(tt*6.2831853));
  float bud=max(fpInside(length(q-vec2(xx,yy+.09))-.10),fpInside(length(q-vec2(-xx,yy+.09))-.10));
  wall=fpLayer(wall,bud*ornate,vec3(.81,.84,.72),.86);
 }
 float finial=foRect(q-vec2(0.,top+rise+.13),vec2(.055,.21));
 return fpLayer(wall,finial*ornate,vec3(.83,.86,.73),.91);
}
vec3 grGroupedLight(vec3 wall,vec2 q,vec2 h,float ornate){
 float surround=foRect(q,h+vec2(.22));
 wall=fpLayer(wall,foRect(q-vec2(.12,-.08),h+vec2(.33)),vec3(.25,.30,.27),.76);
 wall=fpLayer(wall,surround,vec3(.86,.85,.77),.98);
 // Two locally grouped rectangular casements with strong middle mullion;
 // pointed/ogee hoods and blind tracery live outside their glazing.
 for(int j=0;j<2;j++){
  vec2 p=q-vec2(float(j*2-1)*h.x*.53,0.);vec2 r=vec2(h.x*.43,h.y);
  float light=foRect(p,r),shadow=foRect(p-vec2(.06,-.045),r+vec2(.10));
  wall=fpLayer(wall,shadow,vec3(.27,.32,.30),.34);
  wall=fpLayer(wall,light,vec3(.24,.30,.33),.91);
  float bars=max(fpStroke(p.x,.047),max(fpStroke(p.y-r.y*.16,.048),fpStroke(p.y+r.y*.35,.030)))*light;
  wall=fpLayer(wall,bars,vec3(.62,.65,.59),.96);
 }
 float mid=foRect(q,vec2(.075,h.y+.08));wall=fpLayer(wall,mid,vec3(.84,.85,.76),.95);
 float sill=fpStroke(q.y+h.y+.17,.085)*step(abs(q.x),h.x+.25);
 wall=fpLayer(wall,sill,vec3(.83,.85,.74),.95);
 wall=grBlindTracery(wall,q-vec2(0.,-h.y-.48),vec2(h.x*.95,.26));
 wall=grBlindTracery(wall,q-vec2(0.,h.y+.40),vec2(h.x*.79,.24));
 return grOgeeHood(wall,q,h.x*1.11,h.y+.23,min(h.x*.78,1.35),ornate);
}
vec3 grPier(vec3 wall,vec2 q,float halfWidth,float H){
 float pier=foRect(q,vec2(halfWidth,H*.47));
 wall=fpLayer(wall,foRect(q-vec2(.12,-.06),vec2(halfWidth+.13,H*.47)),vec3(.25,.30,.27),.78);
 wall=fpLayer(wall,pier,vec3(.79,.81,.74),.97);
 // Clustered engaged shafts: grooves are solid masonry shadows, never glass.
 for(int shaft=0;shaft<3;shaft++){
  float xx=float(shaft-1)*halfWidth*.60;
  wall=fpLayer(wall,fpStroke(q.x-xx-.075,.065)*pier,vec3(.31,.38,.33),.85);
  wall=fpLayer(wall,fpStroke(q.x-xx+.035,.055)*pier,vec3(.93,.92,.82),.98);
 }
 return wall;
}
vec3 grCanopyFigure(vec3 wall,vec2 q,float width,float height,float ornate){
 float head=fpInside(length(q-vec2(0.,height*.24))-width*.19);
 float robe=foTriangle(q-vec2(0.,-height*.11),width*.36,height*.77);
 float arms=foRect(q-vec2(0.,height*.025),vec2(width*.39,height*.09));
 float pedestal=foRect(q-vec2(0.,-height*.49),vec2(width*.49,height*.065));
 float body=max(head,max(robe,max(arms,pedestal)));
 float niche=grPointed(q-vec2(0.,height*.12),vec2(width*.60,height*.67));
 wall=fpLayer(wall,niche,vec3(.28,.33,.29),.86);
 wall=fpLayer(wall,foRect(q-vec2(.10,-.08),vec2(width*.40,height*.48)),vec3(.16,.21,.18),.58);
 wall=fpLayer(wall,body,vec3(.80,.82,.72),.93);
 wall=fpLayer(wall,fpStroke(q.x+width*.045,width*.045)*body,vec3(.94,.93,.81),.71);
 // Narrow pointed canopy, crockets and flanking miniature pinnacle stems.
 wall=grOgeeHood(wall,q,width*.70,height*.56,height*.58,ornate);
 float spires=max(foRect(q-vec2(width*.77,height*.59),vec2(.042,height*.26)),foRect(q+vec2(width*.77,-height*.59),vec2(.042,height*.26)));
 return fpLayer(wall,spires*ornate,vec3(.84,.87,.74),.86);
}
vec3 grShield(vec3 wall,vec2 q,float size){
 vec2 p=q/max(size,.08);float shield=foRect(p-vec2(0.,.06),vec2(.25,.28));
 shield=max(shield,foTriangle(vec2(p.x,-p.y-.25),.25,.34));
 wall=fpLayer(wall,shield,vec3(.70,.72,.59),.88);
 return fpLayer(wall,fpStroke(p.x,.040)*shield,vec3(.38,.47,.38),.54);
}
vec3 grEquestrianRelief(vec3 wall,vec2 q,float size){
 vec2 p=q/max(size,.10);
 float torso=fpInside(length((p-vec2(0.,-.02))/vec2(.54,.20))-1.);
 float neck=foRect(p-vec2(.38,.18),vec2(.11,.28));float head=fpInside(length((p-vec2(.47,.42))/vec2(.22,.12))-1.);
 float legs=max(foRect(p-vec2(-.31,-.33),vec2(.035,.28)),foRect(p-vec2(.32,-.32),vec2(.035,.27)));
 float rider=max(foRect(p-vec2(-.02,.29),vec2(.075,.20)),fpInside(length(p-vec2(-.02,.54))-.085));
 float plinth=foRect(p-vec2(0.,-.66),vec2(.61,.06));float figure=max(torso,max(neck,max(head,max(legs,max(rider,plinth)))));
 return fpLayer(wall,figure,vec3(.50,.54,.46),.75);
}
vec3 grDragonRelief(vec3 wall,vec2 q,float size){
 vec2 p=q/max(size,.10);float head=foTriangle(p-vec2(.0,.18),.31,.30);
 float body=fpStroke(length(p-vec2(.10,-.12))-.38,.063)*step(p.y,.19);
 float wing=foTriangle(p-vec2(-.24,.03),.29,.46),eye=fpInside(length(p-vec2(.03,.29))-.032);
 wall=fpLayer(wall,max(head,max(body,wing)),vec3(.65,.70,.59),.61);
 return fpLayer(wall,eye,vec3(.28,.36,.30),.68);
}
vec3 grShopArcade(vec3 wall,vec2 q,vec2 h){
 float arch=grPointed(q,h),outer=grPointed(q,h+vec2(.17)),shadow=grPointed(q-vec2(.10,-.05),h+vec2(.25));
 wall=fpLayer(wall,shadow,vec3(.24,.29,.27),.52);
 wall=fpLayer(wall,max(0.,outer-arch),vec3(.79,.81,.70),.96);
 // Passage/shop recess is dark and not pane-grid-filled like an upper window.
 wall=fpLayer(wall,arch,vec3(.16,.21,.20),.94);
 float lowerDoor=foRect(q-vec2(0.,-h.y*.38),vec2(h.x*.70,h.y*.49))*arch;
 return fpLayer(wall,lowerDoor,vec3(.26,.29,.25),.34);
}
vec3 grFiveBayLoggia(vec3 wall,vec2 uv,float W,float H){
 vec2 center=vec2(W*.775,H*.60),h=vec2(W*.086,H*.087),q=uv-center;
 float recess=foRect(q,h);wall=fpLayer(wall,recess,vec3(.18,.23,.21),.94);
 for(int j=0;j<6;j++){
  float x=-h.x+float(j)*(2.*h.x/5.);float post=foRect(q-vec2(x,0.),vec2(.075,h.y*1.04));
  wall=fpLayer(wall,post,vec3(.83,.84,.73),.96);
 }
 float balustrade=foRect(q-vec2(0.,-h.y*.83),vec2(h.x,.26));
 wall=fpLayer(wall,balustrade,vec3(.79,.82,.68),.95);
 wall=grBlindTracery(wall,q-vec2(0.,-h.y*.83),vec2(h.x,.21));
 return grOgeeHood(wall,q,h.x*1.08,h.y+.18,min(H*.12,3.1),1.);
}
// Optional independently source-bound eastern risalit/loggia field. This
// prevents fitting the five-bay feature to arbitrary small return faces.
vec3 grRathausLoggia(vec3 base,vec2 uv,float W,float H,vec3 normal){
 vec3 wall=grStone(base,uv,1.);if(W<.04||H<.04||abs(normal.y)>.12)return base;
 if(uv.y<0.||uv.y>H)return wall;
 float margin=W*.075,bay=(W-2.*margin)/5.,x=uv.x-margin;
 if(x>=0.&&x<=W-2.*margin){
  float qX=mod(x,bay)-bay*.5;
  wall=grShopArcade(wall,vec2(qX,uv.y-H*.16),vec2(bay*.31,H*.115));
  wall=grGroupedLight(wall,vec2(qX,uv.y-H*.43),vec2(bay*.26,H*.085),1.);
  wall=grCanopyFigure(wall,vec2(qX+bay*.42,uv.y-H*.34),min(bay*.28,.78),H*.062,1.);
 }
 vec2 q=uv-vec2(W*.5,H*.67),h=vec2(W*.42,H*.085);
 float recess=foRect(q,h);wall=fpLayer(wall,recess,vec3(.18,.24,.22),.94);
 for(int j=0;j<6;j++)wall=fpLayer(wall,foRect(q-vec2(-h.x+float(j)*2.*h.x/5.,0.),vec2(.07,h.y*1.03)),vec3(.84,.85,.73),.95);
 wall=grBlindTracery(wall,q-vec2(0.,-h.y*.84),vec2(h.x,.23));
 wall=grBand(wall,uv,H*.31,.15);wall=grBand(wall,uv,H*.56,.17);
 return grOgeeHood(wall,q,h.x*1.08,h.y+.20,min(H*.19,4.3),1.);
}
vec3 grRathausFront(vec3 base,vec2 uv,float W,float H,vec3 normal){
 if(W<.04||H<.04||abs(normal.y)>.12)return base;
 float warm=normal.x>.66?1.:step(W*.56,uv.x);
 vec3 wall=grStone(base,uv,warm);
 if(uv.y<0.||uv.y>H)return wall;
 bool south=normal.z<-.66,north=normal.z>.66;
 // North's present fine layout is source-limited; no invented dense front copy.
 if(north){float margin=min(1.,W*.08),count=max(1.,floor((W-2.*margin)/4.8)),bay=(W-2.*margin)/count,x=uv.x-margin;if(x>=0.&&x<=W-2.*margin)for(int k=0;k<3;k++){vec2 q=vec2(mod(x,bay)-bay*.5,uv.y-H*(.19+float(k)*.27)),h=vec2(bay*.20,H*.075);float opening=foRect(q,h),surround=foRect(q,h+vec2(.10));wall=fpLayer(wall,surround,vec3(.79,.79,.72),.9);wall=fpLayer(wall,opening,vec3(.17,.22,.24),.93);wall=fpLayer(wall,max(fpStroke(q.x,.035),fpStroke(q.y,.04))*opening,vec3(.67,.65,.55),.88);}return grBand(wall,uv,H*.95,.14);}
 float boundary=south&&W>55.?W*.56:W,origin=uv.x<boundary?0.:boundary,span=uv.x<boundary?boundary:W-boundary;
 float nominal=uv.x<boundary?4.2:4.8,count=max(1.,floor(span/nominal)),bay=span/count;
 float x=uv.x-origin,at=floor(x/bay),qX=mod(x,bay)-bay*.5;
 if(x<0.||x>span)return wall;
 wall=grBand(wall,uv,H*.055,.11);wall=grBand(wall,uv,H*.30,.13);
 wall=grBand(wall,uv,H*.56,.16);wall=grBand(wall,uv,H*.84,.18);wall=grBand(wall,uv,H*.98,.18);
 if(south){
  wall=grShopArcade(wall,vec2(qX,uv.y-H*.16),vec2(bay*.31,H*.115));
  wall=grShield(wall,vec2(qX+bay*.40,uv.y-H*.27),min(bay*.33,1.0));
 }
 // Dense vertical masonry is drawn BEFORE glass; the solid piers do not turn
 // into a window stencil or replace alternate actual opening groups.
 vec2 pierQ=vec2(qX-bay*.44,uv.y-H*.54);wall=grPier(wall,pierQ,min(bay*.10,.45),H*.83);
 for(int tier=0;tier<2;tier++){
  float lightY=H*(.435+float(tier)*.27);
  wall=grGroupedLight(wall,vec2(qX,uv.y-lightY),vec2(bay*.255,H*(tier==0?.078:.067)),1.);
  float figureY=lightY-H*.012;
  wall=grCanopyFigure(wall,vec2(qX+bay*.43,uv.y-figureY),min(bay*.30,1.25),H*.090,1.);
 }
 // Small blind tracery field +discrete narrow pinnacles, not broad pediments.
 wall=grBlindTracery(wall,vec2(qX,uv.y-H*.90),vec2(bay*.27,H*.028));
 float pinnacle=foRect(vec2(qX-bay*.43,uv.y-H*.955),vec2(.052,H*.043));
 wall=fpLayer(wall,pinnacle,vec3(.83,.86,.73),.77);
 if(south&&W>55.){
  wall=grFiveBayLoggia(wall,uv,W,H);
  wall=grEquestrianRelief(wall,uv-vec2(W*.56,H*.31),min(H*.09,2.8));
 }
 return wall;
}
vec3 grRectGrid(vec3 wall,vec2 q,vec2 h,float columns,float rows){
 float window=foRect(q,h),outer=foRect(q,h+vec2(.15));wall=fpLayer(wall,outer,vec3(.83,.84,.74),.92);
 wall=fpLayer(wall,window,vec3(.25,.31,.32),.92);
 float grid=max(fpRepeatStroke(q.x+h.x,2.*h.x/max(columns,1.),.05),fpRepeatStroke(q.y+h.y,2.*h.y/max(rows,1.),.040))*window;
 return fpLayer(wall,grid,vec3(.61,.49,.39),.95);
}
vec3 grRathausCourt(vec3 base,vec2 uv,float W,float H,bool stair){
 vec3 wall=grStone(base,uv,0.);if(uv.y<0.||uv.y>H)return wall;
 if(stair){
  for(int j=0;j<3;j++){
   float y=H*(.21+float(j)*.275);vec2 q=vec2(uv.x-W*.5,uv.y-y),h=vec2(W*.31,H*.064);
   float arcade=grPointed(q,h),outer=grPointed(q,h+vec2(.15));wall=fpLayer(wall,max(0.,outer-arcade),vec3(.83,.85,.73),.94);
   wall=fpLayer(wall,arcade,vec3(.20,.26,.23),.91);
   wall=grBand(wall,uv,y-H*.085,.14);
   wall=grBlindTracery(wall,q-vec2(0.,-H*.10),vec2(W*.31,H*.028));
   wall=grCanopyFigure(wall,q-vec2(W*.39,0.),W*.12,H*.06,1.);
  }
  return wall;
 }
 // The separately bound library elevation carries FOUR large rectangular lights.
 float margin=W*.10,bay=(W-2.*margin)/4.,x=uv.x-margin;
 if(x>=0.&&x<=W-2.*margin){
  float qX=mod(x,bay)-bay*.5;
  wall=grRectGrid(wall,vec2(qX,uv.y-H*.66),vec2(bay*.31,H*.25),3.,6.);
  wall=grShopArcade(wall,vec2(qX,uv.y-H*.18),vec2(bay*.28,H*.10));
  wall=grCanopyFigure(wall,vec2(qX+bay*.43,uv.y-H*.46),min(bay*.25,.78),H*.062,1.);
 }
 wall=grBand(wall,uv,H*.32,.13);return grBand(wall,uv,H*.97,.16);
}
vec3 grClock(vec3 wall,vec2 q,float r){
 float d=length(q),dial=fpInside(d-r);wall=fpLayer(wall,dial,vec3(.16,.25,.32),.97);
 wall=fpLayer(wall,fpStroke(d-r,.075),vec3(.83,.75,.47),.93);
 float marks=fpRepeatStroke(atan(q.y,q.x),6.2831853/12.,.030)*fpInside(abs(d-r*.78)-r*.09);
 wall=fpLayer(wall,marks*dial,vec3(.87,.78,.48),.96);
 float hands=max(fpStroke(q.x,.047)*foRect(q-vec2(0.,r*.18),vec2(.065,r*.42)),fpStroke(q.y-q.x*.37,.045)*foRect(q-vec2(r*.15,0.),vec2(r*.34,r*.16)));
 return fpLayer(wall,hands*dial,vec3(.90,.80,.48),.98);
}
vec3 grGlockenspiel(vec3 wall,vec2 q,float width,float height){
 // One localized two-stage open display with curved/crocketed canopy.
 float recess=foRect(q,vec2(width,height));wall=fpLayer(wall,recess,vec3(.17,.25,.24),.95);
 for(int tier=0;tier<2;tier++){
  float yy=float(tier*2-1)*height*.46;
  for(int j=0;j<5;j++)wall=grCanopyFigure(wall,q-vec2(float(j-2)*width*.33,yy),width*.13,height*.24,0.);
 }
 float frame=max(fpStroke(abs(q.x)-width,.10),max(fpStroke(q.y,.12),fpStroke(abs(q.y)-height,.13)))*recess;
 wall=fpLayer(wall,frame,vec3(.42,.59,.51),.94);
 return grOgeeHood(wall,q,width*1.11,height+.08,min(width*.60,1.6),1.);
}
vec3 grTower(vec3 base,vec2 uv,float W,float H,vec3 normal){
 vec3 wall=grStone(base,uv,0.);float x=uv.x-W*.5,y=uv.y;
 bool front=normal.x*(-.30)+normal.z*(-.954)>.90;
 if(uv.y<0.||uv.y>H)return wall;
 // Existing current source-bound tier locations retained from fmRathausTower;
 // they are display parameters, not raw tag-derived measured architecture.
 wall=grPier(wall,vec2(uv.x-W*.08,y-H*.50),W*.030,H);
 wall=grPier(wall,vec2(uv.x-W*.92,y-H*.50),W*.030,H);
 if(H<=40.5){
  if(front){wall=grShopArcade(wall,vec2(x,y-4.8),vec2(min(W*.26,2.6),4.));
   wall=grCanopyFigure(wall,vec2(x,y-14.),min(W*.24,2.0),2.0,1.);
   float balcony=foRect(vec2(x,y-23.5),vec2(W*.37,1.0));wall=fpLayer(wall,balcony,vec3(.76,.80,.68),.92);
   wall=grBlindTracery(wall,vec2(x,y-23.5),vec2(W*.36,.84));
  }
  wall=grBand(wall,uv,27.,.19);
 }else if(H<60.5){
  wall=grBand(wall,uv,48.,.19);wall=grBand(wall,uv,59.,.25);
  wall=grClock(wall,vec2(x,y-54.5),min(W*.22,1.75));
  // Blind filigree between clock and corners is masonry, not extra glazing.
  for(int j=0;j<2;j++)wall=grBlindTracery(wall,vec2(x+float(j*2-1)*W*.32,y-54.),vec2(W*.09,2.3));
 }else{
  for(int j=0;j<3;j++){
   vec2 q=vec2(x+float(j-1)*W*.20,y-64.5),h=vec2(min(W*.073,.42),3.7);
   float light=grPointed(q,h),outer=grPointed(q,h+vec2(.10));wall=fpLayer(wall,max(0.,outer-light),vec3(.81,.84,.71),.94);
   wall=fpLayer(wall,light,vec3(.19,.26,.23),.90);
  }
  wall=grBand(wall,uv,69.,.23);
 }
 if(front&&y>30.&&y<46.)wall=grGlockenspiel(wall,vec2(x,y-37.),W*.32,6.7);
 return wall;
}
vec3 grRathausTower(vec3 base,vec2 uv,float W,float H,vec3 normal){return grTower(base,uv,W,H,normal);}
`;
