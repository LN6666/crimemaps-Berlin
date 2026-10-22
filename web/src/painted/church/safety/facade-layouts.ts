import {REICHSTAG_FACADE_GLSL} from './facade-reichstag-layouts';
import {RESIDENZ_FACADE_GLSL} from './facade-residenz-layouts';
import {uploadElbRoofPaint} from './facade-elbphilharmonie-frame';
import {FACADE_ELBPHILHARMONIE_GLSL} from './facade-elbphilharmonie-layouts';
import {uploadPetriPaint} from './facade-petri-frame';
import {uploadRathausRoofPaint} from './facade-rathaus-roof-paint';
import {HAMBURG_CHURCH_FACADE_GLSL} from './facade-hamburg-church-layouts';
import {MUNICH_FACADE_GLSL} from './facade-munich-layouts';
import {BERLIN_ALTE_NAZARETH_GLSL} from './facade-berlin-alte-nazarethkirche';
import {BERLIN_ST_PETER_UND_PAUL_GLSL} from './facade-berlin-st-peter-und-paul';
import {BERLIN_ECB_GLSL} from './facade-berlin-evangeliums-christen-baptistengemeinde';
import {BERLIN_AUGUSTANA_GLSL} from './facade-berlin-augustanakirche';
import {BERLIN_DORFKIRCHE_ZEHLENDORF_GLSL} from './facade-berlin-dorfkirche-zehlendorf';
import {BERLIN_ST_CHRISTOPHORUS_GLSL} from './facade-berlin-st-christophorus';
import {BERLIN_ST_BENEDIKT_GLSL} from './facade-berlin-st-benedikt';
import {BERLIN_PAULUS_GEMEINDE_GLSL} from './facade-berlin-paulusgemeinde';
import {BERLIN_ST_ANGSAR_GLSL,BERLIN_ST_ANGSAR_TOWER_GLSL} from './facade-berlin-st-ansgar';
import {BERLIN_ALT_LIETZOW_GLSL} from './facade-berlin-alt-lietzow';
import {BERLIN_CHRISTIANSKIRKEN_GLSL} from './facade-berlin-christianskirken';
import {BERLIN_KATHARINENSTIFT_GLSL} from './facade-berlin-katharinenstift';
import {COLOGNE_ST_AGNES_GLSL} from './facade-cologne-st-agnes';
/** Each named layout interprets its canonical architectural MD; shared functions draw components, not whole-building stencils. */
type Band={range:[number,number];pitch:number;kind:number;size:[number,number];center?:number;variant?:number};
type Layout={name:string;material:number;colour:[number,number,number];mix:number;bands:Band[]};
export const FACADE_LAYOUTS:Layout[]=[
 {name:'Rathaus front: rusticated arches, aedicules, paired attic lights',material:2,colour:[.73,.68,.59],mix:.62,bands:[
  {range:[.015,.075],pitch:4.8,kind:2,size:[.18,.31]},
  {range:[.12,.35],pitch:4.8,kind:1,size:[.29,.43]},
  {range:[.44,.68],pitch:4.8,kind:3,size:[.23,.39],variant:0},
  {range:[.835,.93],pitch:2.4,kind:2,size:[.27,.36]},
 ]},
 {name:'Rathaus court: six divided arches and one high central oval',material:2,colour:[.72,.68,.59],mix:.60,bands:[]},
 {name:'Rathaus street returns: local opening groups and blind intervals',material:2,colour:[.72,.67,.58],mix:.58,bands:[
  {range:[.02,.08],pitch:5.8,kind:2,size:[.17,.32]},
  {range:[.13,.36],pitch:5.8,kind:1,size:[.25,.42]},
  {range:[.46,.69],pitch:5.8,kind:9,size:[.21,.39],variant:3},
  {range:[.835,.93],pitch:2.9,kind:2,size:[.25,.34]},
 ]},
 {name:'Rathaus solid tower shaft; clocks admitted on source tower only',material:2,colour:[.71,.67,.59],mix:.58,bands:[]},
 {name:'Church nave, single lancet tier',material:1,colour:[.52,.32,.24],mix:.32,bands:[
  {range:[.25,.90],pitch:7.5,kind:5,size:[.23,.40]},
 ]},
 {name:'Church stone/brick tower, sparse openings',material:1,colour:[.52,.33,.25],mix:.26,bands:[
  {range:[.02,.18],pitch:0,kind:1,size:[.17,.38]},
  {range:[.68,.91],pitch:0,kind:5,size:[.12,.40]},
 ]},
 {name:'Warehouse brick base and glass upper facade',material:6,colour:[.41,.28,.23],mix:.33,bands:[
  {range:[.02,.11],pitch:5.5,kind:6,size:[.25,.33]},
  {range:[.14,.23],pitch:5.5,kind:6,size:[.25,.33]},
  {range:[.26,.34],pitch:5.5,kind:6,size:[.25,.33]},
 ]},
 {name:'Rathaus source tower: fixed clock field, portal, balcony, heraldry',material:2,colour:[.71,.67,.59],mix:.58,bands:[]},
 {name:'Börse front: five-bay portico and independently ordered pavilions',material:2,colour:[.76,.71,.61],mix:.65,bands:[]},
 {name:'Börse court and returns: hall arches, links and blind piers',material:2,colour:[.75,.71,.63],mix:.63,bands:[]},
 {name:'Börse three hipped hall roof zones on original flat roof',material:2,colour:[.47,.65,.57],mix:.78,bands:[]},
 {name:'Rathaus front copper slope and observed small ornamented dormers',material:2,colour:[.44,.65,.57],mix:.74,bands:[]},
 {name:'Rathaus court copper slope and four three-light dormer gables',material:2,colour:[.44,.65,.57],mix:.74,bands:[]},
];
const profiles=new Float32Array(14*4),colours=new Float32Array(14*4),bands=new Float32Array(64*4),modules=new Float32Array(64*4);let row=0;
FACADE_LAYOUTS.forEach((p,i)=>{profiles.set([row,p.bands.length,p.material,p.mix],i*4);colours.set([...p.colour,0],i*4);for(const b of p.bands){bands.set([...b.range,b.pitch,b.kind],row*4);modules.set([...b.size,b.center??.5,b.variant??0],row*4);row++;}});
const uploaded=new WeakSet<WebGLProgram>();
export function uploadFacadeLayouts(gl:WebGL2RenderingContext,p:WebGLProgram){uploadRathausRoofPaint(gl,p);uploadElbRoofPaint(gl,p);uploadPetriPaint(gl,p);if(uploaded.has(p))return;for(const [name,data]of [['u_facade_profiles',profiles],['u_facade_colours',colours],['u_facade_bands',bands],['u_facade_modules',modules]]as const){const loc=gl.getUniformLocation(p,name+'[0]');if(loc)gl.uniform4fv(loc,data);}uploaded.add(p);}

export const FACADE_LAYOUT_GLSL=`
uniform vec4 u_facade_profiles[14];uniform vec4 u_facade_colours[14];
uniform vec4 u_facade_bands[64];uniform vec4 u_facade_modules[64];
${BERLIN_ALTE_NAZARETH_GLSL}
${BERLIN_ST_PETER_UND_PAUL_GLSL}
${BERLIN_ECB_GLSL}
${BERLIN_AUGUSTANA_GLSL}
${BERLIN_DORFKIRCHE_ZEHLENDORF_GLSL}
${BERLIN_ST_CHRISTOPHORUS_GLSL}
${BERLIN_ST_BENEDIKT_GLSL}
${BERLIN_PAULUS_GEMEINDE_GLSL}
${BERLIN_ST_ANGSAR_GLSL}
${BERLIN_ST_ANGSAR_TOWER_GLSL}
${BERLIN_ALT_LIETZOW_GLSL}
${BERLIN_CHRISTIANSKIRKEN_GLSL}
${BERLIN_KATHARINENSTIFT_GLSL}
${COLOGNE_ST_AGNES_GLSL}
vec3 fpSurfaceOnly(vec3 base,vec2 uv,float material){
 vec3 c=base;
 if(material==1.||material==6.){float h=.28;float joints=max(fpRepeatStroke(uv.y,h,.008),fpRepeatStroke(uv.x+mod(floor(uv.y/h),2.)*.36,.72,.009));c=mix(c,c*.77,joints*.43);}
 else if(material==2.){float joints=max(fpRepeatStroke(uv.y,.68,.010),fpRepeatStroke(uv.x+mod(floor(uv.y/.68),2.)*.65,1.3,.011));c=mix(c,c*.79,joints*.25);}
 else if(material==5.){float beams=max(fpRepeatStroke(uv.x,2.6,.12),fpRepeatStroke(uv.y,3.6,.14));c=mix(c,vec3(.22,.17,.12),beams*.8);}
 else if(material==7.)return fpGlassFacade(base,uv.x,uv.y,30.,30.,1.);
 return c*(.994+.006*sin(uv.x*3.7)*sin(uv.y*5.1));
}
vec3 flBelt(vec3 wall,vec2 uv,float y,float thickness){
 wall=fpLayer(wall,fpStroke(uv.y-y,thickness),vec3(.49,.46,.40),.72);
 wall=fpLayer(wall,fpStroke(uv.y-y-thickness*.9,thickness*.44),vec3(.86,.80,.68),.92);
 return fpLayer(wall,fpStroke(uv.y-y+thickness*.9,thickness*.24),vec3(.38,.36,.32),.52);
}
vec3 flRustication(vec3 wall,vec2 uv,float H){
 float mask=1.-smoothstep(H*.34,H*.36,uv.y);
 float bed=fpRepeatStroke(uv.y,.48,.032),joints=fpRepeatStroke(uv.x+mod(floor(uv.y/.48),2.)*.85,1.7,.019);
 wall=fpLayer(wall,max(bed,joints)*mask,vec3(.47,.45,.40),.44);
 return fpLayer(wall,fpRepeatStroke(uv.y-.055,.48,.015)*mask,vec3(.83,.77,.66),.64);
}
vec3 flRathausOrnament(vec3 wall,vec2 uv,float W,float H,float pitch){
 float margin=min(1.1,W*.07),count=max(1.,floor((W-2.*margin)/pitch)),bay=(W-2.*margin)/count;
 float x=uv.x-margin,local=mod(x,bay)-bay*.5;
 if(x>=0.&&x<=W-2.*margin){
  // The figure is on the interbay pier, outside the tall window's aedicule.
  float pier=mod(x+bay*.5,bay)-bay*.5;
  wall=foNicheStatue(wall,vec2(pier,uv.y-H*.565),vec2(min(.46,bay*.085),H*.074),.0);
  wall=foReliefCrown(wall,vec2(local,uv.y-H*.748),min(bay*.31,1.35),H*.027);
  float pediment=foTriangle(vec2(local,uv.y-H*.79),bay*.35,H*.025);
  wall=fpLayer(wall,pediment,vec3(.76,.70,.60),.72);
 }
 wall=flBelt(wall,uv,H*.095,.13);wall=flBelt(wall,uv,H*.37,.17);
 wall=flBelt(wall,uv,H*.81,.20);wall=flBelt(wall,uv,H*.966,.22);
 float dentils=fpRepeatStroke(uv.x,.50,.085)*fpStroke(uv.y-H*.947,.095);
 return fpLayer(wall,dentils,vec3(.52,.49,.42),.63);
}
vec3 flRathausCourt(vec3 wall,vec2 uv,float W,float H){
 wall=flRustication(wall,uv,H);
 float full=step(38.,W),margin=min(1.3,W*.04),count=full>.5?7.:max(2.,floor((W-2.*margin)/6.9));
 float bay=(W-2.*margin)/count,x=uv.x-margin,index=floor(x/bay),qx=mod(x,bay)-bay*.5;
 if(x>=0.&&x<=W-2.*margin){
  if(full>.5&&index==3.){
   wall=foOvalLight(wall,vec2(qx,uv.y-H*.73),vec2(bay*.20,H*.073));
   wall=foRectCasement(wall,vec2(qx,uv.y-H*.39),vec2(bay*.20,H*.13),1.);
   wall=foReliefCrown(wall,vec2(qx,uv.y-H*.535),bay*.29,H*.045);
  }else{
   wall=foHallArch(wall,vec2(qx,uv.y-H*.535),vec2(min(bay*.285,2.5),H*.235),1.);
   wall=foReliefCrown(wall,vec2(qx,uv.y-H*.86),bay*.31,H*.037);
  }
  float pier=mod(x+bay*.5,bay)-bay*.5;
  wall=foNicheStatue(wall,vec2(pier,uv.y-H*.565),vec2(min(bay*.085,.55),H*.092),0.);
  wall=foRectCasement(wall,vec2(qx,uv.y-H*.10),vec2(bay*.19,H*.027),0.);
 }
 wall=flBelt(wall,uv,H*.205,.16);wall=flBelt(wall,uv,H*.92,.22);wall=flBelt(wall,uv,H*.975,.13);
 // Round corner turret form is tonal relief on the original corner panels.
 float edge=min(uv.x,W-uv.x),corner=1.-smoothstep(.3,1.25,edge);
 wall=fpLayer(wall,corner,vec3(.83,.76,.63),.24);
 return wall;
}
// Zone grammar: a portico, blind pier, projecting pavilion, linking wing or terminal pavilion.
vec4 flBorseZone(float x,float W){
 if(W<25.)return vec4(.04,.96,W>13.?3.:1.,1.);
 if(x<.11)return vec4(.015,.105,3.,1.);
 if(x<.27)return vec4(.12,.26,4.,0.);
 if(x<.34)return vec4(.28,.335,1.,1.);
 if(x<.385)return vec4(.34,.385,0.,0.);
 if(x<.615)return vec4(.385,.615,5.,1.);
 if(x<.66)return vec4(.615,.66,0.,0.);
 if(x<.73)return vec4(.665,.72,1.,1.);
 if(x<.89)return vec4(.74,.88,4.,0.);
 return vec4(.895,.985,3.,1.);
}
vec3 flBorseFront(vec3 wall,vec2 uv,float W,float H){
 float xn=uv.x/W;vec4 zone=flBorseZone(xn,W);
 if(zone.z>.5&&xn>=zone.x&&xn<=zone.y){
  float sectionW=(zone.y-zone.x)*W,bay=sectionW/zone.z,x=(xn-zone.x)*W;
  float qx=mod(x,bay)-bay*.5;
  for(int i=0;i<2;i++){
   float center=H*(i==0?.275:.68),halfH=H*.159;
   wall=foHallArch(wall,vec2(qx,uv.y-center),vec2(min(bay*.30,2.65),halfH),0.);
   // One independent shaft between adjacent openings, with its own storey capital and base.
   float columnQ=mod(x+bay*.5,bay)-bay*.5;
   float radius=min(.38,bay*.071);
   if(zone.w>.5)wall=foOrderColumn(wall,vec2(columnQ,uv.y-center),H*.185,radius,1.);
   else{
    float pilaster=foRect(vec2(columnQ,uv.y-center),vec2(radius*.78,H*.168));
    wall=fpLayer(wall,pilaster,vec3(.85,.79,.67),.78);
   }
   if(i==1){float baluster=fpRepeatStroke(qx,.43,.055)*foRect(vec2(qx,uv.y-(center-halfH-H*.025)),vec2(bay*.32,H*.027));wall=fpLayer(wall,baluster,vec3(.69,.64,.54),.80);}
  }
 }else{
  float panelCenter=(zone.x+zone.y)*.5*W;
  float panel=foRect(vec2(uv.x-panelCenter,uv.y-H*.68),vec2(max(.2,(zone.y-zone.x)*W*.27),H*.125));
  wall=fpLayer(wall,panel,vec3(.79,.74,.63),.38);
  float edge=fpStroke(abs(uv.x-panelCenter)-(zone.y-zone.x)*W*.27,.06)*fpInside(abs(uv.y-H*.68)-H*.125);
  wall=fpLayer(wall,edge,vec3(.55,.52,.45),.45);
 }
 wall=flBelt(wall,uv,H*.075,H*.012);wall=flBelt(wall,uv,H*.48,H*.027);wall=flBelt(wall,uv,H*.915,H*.027);
 wall=flBelt(wall,uv,H*.97,H*.012);
 float dentils=fpRepeatStroke(uv.x,.48,.075)*fpStroke(uv.y-H*.902,H*.010);
 wall=fpLayer(wall,dentils,vec3(.49,.47,.41),.61);
 // Inscription stays on the entablature; isolated roofline groups flank the centre.
 if(xn>.415&&xn<.585){float lettering=fpRepeatStroke(uv.x,.46,.065)*fpStroke(uv.y-H*.505,H*.012);wall=fpLayer(wall,lettering,vec3(.72,.61,.37),.76);}
 for(int k=0;k<2;k++){float x=W*(k==0?.375:.625);wall=foReliefCrown(wall,vec2(uv.x-x,uv.y-H*.953),min(1.8,W*.025),H*.048);}
 return wall;
}
vec3 flBorseCourt(vec3 wall,vec2 uv,float W,float H){
 // Tall hall lights remain a single opening; shorter links get an independent arcade rhythm.
 float margin=min(1.1,W*.035),count=max(1.,floor((W-2.*margin)/7.8)),bay=(W-2.*margin)/count;
 float x=uv.x-margin,index=floor(x/bay),qx=mod(x,bay)-bay*.5;
 if(x>=0.&&x<=W-2.*margin){
  bool blind=mod(index,5.)==4.;
  if(!blind){wall=foHallArch(wall,vec2(qx,uv.y-H*.48),vec2(min(bay*.29,2.25),H*.32),.45);}
  else{wall=foReliefCrown(wall,vec2(qx,uv.y-H*.58),bay*.19,H*.070);}
  float pier=mod(x+bay*.5,bay)-bay*.5;
  float pilaster=foRect(vec2(pier,uv.y-H*.49),vec2(min(.28,bay*.05),H*.37));
  wall=fpLayer(wall,pilaster,vec3(.83,.77,.66),.65);
 }
 wall=flBelt(wall,uv,H*.08,H*.014);wall=flBelt(wall,uv,H*.88,H*.029);wall=flBelt(wall,uv,H*.964,H*.012);
 return wall;
}
vec3 flBorseRoof(vec3 base,vec2 uv,float W,float H){
 vec2 st=vec2(uv.x/W,uv.y/H);vec3 roof=mix(base,vec3(.48,.47,.41),.72);
 // Three separately bounded hall roofs, not oval domes. Lower connectors remain grey-brown.
 for(int i=0;i<3;i++){
  // Fit each zone to the native stepped footprint in its exact edge-aligned U/V frame.
  // Main hall depth excludes the two long courtyard connector fingers.
  vec4 hall=i==0?vec4(.1565,.5748,.1255,.3032):i==1?vec4(.4977,.5748,.1292,.3032):vec4(.8355,.5748,.1338,.3032);
  vec2 q=st-hall.xy,r=hall.zw;
  float body=foRect(q,r),hip=clamp(min((r.x-abs(q.x))/r.x,(r.y-abs(q.y))/r.y),0.,1.);
  float plane=q.x<0.?1.:0.;vec3 copper=mix(vec3(.35,.55,.50),vec3(.65,.76,.64),plane*.68+hip*.17);
  roof=fpLayer(roof,body,copper,.96);
  float seams=fpRepeatStroke(q.y*H,.85,.015)*body;roof=fpLayer(roof,seams,vec3(.25,.43,.39),.37);
  float ridge=fpStroke(q.x,.0014)*fpInside(abs(q.y)-r.y*.64);
  float hips=fpStroke(abs(q.x)/r.x+abs(q.y)/r.y-1.,.010)*body;
  roof=fpLayer(roof,max(ridge,hips),vec3(.77,.83,.70),.78);
  float light=foRect(q-vec2(.040,.04),vec2(.020,.115));roof=fpLayer(roof,light,vec3(.33,.40,.39),.88);
  float lightBars=max(fpRepeatStroke(q.y*H,.85,.028),fpStroke(q.x-.04,.002))*light;
  roof=fpLayer(roof,lightBars,vec3(.72,.76,.68),.80);
 }
 return roof;
}
vec3 flRathausRoof(vec3 base,vec2 uv,float W,float H,bool court){
 vec3 roof=mix(base,vec3(.44,.65,.57),.70);
 // UV y follows the original slope; long copper seams run upslope.
 roof=fpLayer(roof,fpRepeatStroke(uv.x,.70,.018),vec3(.25,.45,.40),.40);
 roof=fpLayer(roof,fpRepeatStroke(uv.y,2.8,.011),vec3(.62,.74,.63),.25);
 float count=court?4.:clamp(floor(W/6.0),3.,18.),margin=W*.05,bay=(W-2.*margin)/count,x=uv.x-margin;
 if(x>=0.&&x<=W-2.*margin){
  vec2 q=vec2(mod(x,bay)-bay*.5,uv.y-H*.24);float width=min(bay*.27,court?2.1:1.2),height=min(H*.26,court?3.3:1.9);
  float body=foRect(q-vec2(0.,-height*.13),vec2(width,height*.57));
  float gable=foTriangle(q-vec2(0.,height*.57),width*1.07,height*.58);
  roof=fpLayer(roof,max(body,gable),vec3(.67,.63,.54),.94);
  float reveal=fpStroke(abs(q.x)-width,.07)*body;roof=fpLayer(roof,reveal,vec3(.40,.38,.33),.72);
  for(int k=0;k<3;k++)roof=foRectCasement(roof,q-vec2(float(k-1)*width*.57,-height*.13),vec2(width*.19,height*.36),0.);
  roof=foReliefCrown(roof,q-vec2(0.,height*.74),width*.67,height*.18);
  float cap=fpStroke(q.y-(height*.95-abs(q.x)*height*.27/max(width,.1)),.07)*step(abs(q.x),width*1.07);
  roof=fpLayer(roof,cap,vec3(.85,.77,.64),.93);
  float finial=foRect(q-vec2(0.,height*1.07),vec2(.07,height*.12));roof=fpLayer(roof,finial,vec3(.62,.58,.48),.85);
 }
 return roof;
}
vec3 flClock(vec3 wall,vec2 q,float r){
 float field=foRect(q,vec2(r*1.31));wall=fpLayer(wall,field,vec3(.54,.44,.31),.75);
 float square=fpStroke(max(abs(q.x),abs(q.y))-r*1.31,.07);wall=fpLayer(wall,square,vec3(.81,.68,.43),.94);
 float d=length(q),dial=fpInside(d-r),rim=fpStroke(d-r,.10);
 wall=fpLayer(wall,dial,vec3(.26,.13,.12),.96);wall=fpLayer(wall,rim,vec3(.83,.69,.37),.96);
 float angle=atan(q.y,q.x),tick=fpRepeatStroke(angle,6.2831853/12.,.036)*fpInside(abs(d-r*.78)-r*.12);
 wall=fpLayer(wall,tick*dial,vec3(.90,.76,.43),.98);
 float hands=max(fpStroke(q.x,.044)*fpInside(abs(q.y+r*.17)-r*.39),fpStroke(q.y-q.x*.36,.047)*fpInside(abs(q.x-r*.19)-r*.40));
 return fpLayer(wall,hands*dial,vec3(.92,.79,.45),.98);
}
${REICHSTAG_FACADE_GLSL}
${RESIDENZ_FACADE_GLSL}
${MUNICH_FACADE_GLSL}
${FACADE_ELBPHILHARMONIE_GLSL}
${HAMBURG_CHURCH_FACADE_GLSL}
vec3 fpLayoutFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float layoutId){
 if(layoutId>=300.&&layoutId<301.)return fpCologneStAgnes(base,p,normal,frame,layoutId);
 if(layoutId==291.||layoutId==292.)return fpBerlinKatharinenstift(base,normal,frame,layoutId);
 if(layoutId==299.)return fpBerlinChristianskirken(base,normal);
 if(floor(layoutId)==289.)return fpBerlinAltLietzow(base,p,normal,frame,layoutId);
 if(layoutId==285.)return fpBerlinStAnsgar(base,normal,frame);
 if(layoutId==284.||floor(layoutId)==288.)return hcPaint(base,p,normal,frame,layoutId);
 if(layoutId==281.||layoutId==282.)return fpStBenedikt(base,normal,frame,layoutId);
 if(layoutId==283.)return fpBerlinPaulusGemeinde(base,normal,frame);
 if(layoutId==262.)return fpAlteNazareth(base,p,normal,frame);
 if(layoutId==263.)return fpStPeterNave(base,p,normal,frame);
 if(layoutId==264.)return fpStPeterTower(base,p,normal,frame);
 if(layoutId==265.)return fpStPeterDome(base,p,normal,frame);
 if(layoutId==266.)return fpStPeterGreenTower(base,p,normal,frame);
 if(layoutId==267.)return fpEvangeliumsChristen(base,p,normal,frame);
 if(layoutId==268.)return fpAugustana(base,normal,frame);
 if(layoutId==269.)return fpDorfkircheZehlendorf(base,normal,frame);
 if(layoutId>=270.&&layoutId<=277.)return fpStChristophorus(base,p,normal,frame,layoutId);
 if(layoutId>=200.&&layoutId<=211.)return rrPaint(base,p,normal,frame,layoutId);
 if(layoutId>=220.&&layoutId<=233.)return ftEnsemble(base,p,normal,frame,layoutId);
 if(layoutId>=180.&&layoutId<=199.)return frPaint(base,p,normal,frame,layoutId);
 if(layoutId>=240.&&layoutId<=261.)return hcPaint(base,p,normal,frame,layoutId);
 if(layoutId>=140.&&layoutId<=149.)return fePaint(base,p,normal,frame,layoutId);
 if(layoutId>=150.&&layoutId<170.)return hcPaint(base,p,normal,frame,layoutId);
 if((layoutId>=120.&&layoutId<=139.)||layoutId==171.)return fmPaint(base,p,normal,frame,layoutId);
 int id=int(clamp(layoutId-100.,0.,12.));vec4 profile=u_facade_profiles[id];vec2 uv=frame.xy;float W=frame.w,H=frame.z;
 if(id==10)return flBorseRoof(base,uv,W,H);
 if(id==11||id==12)return flRathausRoof(base,uv,W,H,id==12);
 vec3 wall=mix(base,u_facade_colours[id].rgb,profile.w);wall=fpSurfaceOnly(wall,uv,profile.z);
 // Frame height is the native eave height. Original gable vertices remain in place and receive stone only.
 if(uv.y>H||uv.y<0.)return wall;
 if(id==1)return flRathausCourt(wall,uv,W,H);
 if(id==8)return flBorseFront(wall,uv,W,H);
 if(id==9)return flBorseCourt(wall,uv,W,H);
 if(id==0||id==2)wall=flRustication(wall,uv,H);
 float footing=1.-smoothstep(.035,.09,uv.y/H);wall=mix(wall,wall*.82,footing*.42);
 for(int k=0;k<8;k++){if(float(k)>=profile.y)break;int at=int(profile.x)+k;vec4 band=u_facade_bands[at],module=u_facade_modules[at];
  float lo=band.x*H,hi=band.y*H,span=hi-lo;
  if(uv.y<lo-.8||uv.y>hi+.8)continue;
  float margin=min(1.1,W*.07),count=band.z<=0.?1.:max(1.,floor((W-2.*margin)/band.z)),bay=(W-2.*margin)/count;
  float x=uv.x-margin;if(x<0.||x>W-2.*margin)continue;float cx=(floor(x/bay)+.5)*bay;
  vec2 q=vec2(x-cx,uv.y-(lo+module.z*span)),size=vec2(min(bay*module.x,2.4),min(span*module.y,3.0));
  float kind=band.w,variant=module.w;
  if(band.w>8.5){float alternate=mod(floor(x/bay),3.);kind=alternate<1.5?3.:0.;variant=mod(floor(x/bay),2.);}
  wall=facadeOpening(wall,q,size,kind,variant);
 }
 if(id==0||id==2)wall=flRathausOrnament(wall,uv,W,H,id==0?4.8:5.8);
 float edge=max(fpStroke(uv.x-.16,.10),fpStroke(uv.x-(W-.16),.10));wall=mix(wall,wall*1.10,edge*.6);
 if(id==3||id==7){
  // No ordinary windows on the solid tower. Portal and compact relief only on the entrance face.
  if(normal.x*.68+normal.z*.73>.52)wall=foPortalHeraldry(wall,vec2(uv.x-W*.5,uv.y),W,H);
  wall=flBelt(wall,uv,H*.44,.15);wall=flBelt(wall,uv,H*.78,.20);
  if(id==7){wall=flClock(wall,vec2(uv.x-W*.5,p.y-58.),min(2.4,W*.24));wall=foReliefCrown(wall,vec2(uv.x-W*.5,p.y-49.),min(W*.20,1.8),1.4);}
 }
 if(id==6){float glassRise=smoothstep(.355,.37,uv.y/H);wall=mix(wall,fpGlassFacade(base,uv.x,uv.y,W,H,1.),glassRise);}
 return wall;
}
`;
