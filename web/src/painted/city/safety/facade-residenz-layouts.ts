/** Individual Munich Residenz MD interpretation; primitives shared, compositions independent.
 * All relief, stairs and terrace hierarchy below are surface paint, not displaced geometry.
 * Unknown bay counts/portal anchors are schematic and remain declared in the source review.
 */
export const RESIDENZ_FACADE_GLSL=`
const vec4 frRoofEdges[131]=vec4[131](vec4(65.309997,-67.698997,60.584999,-66.329002),vec4(60.584999,-66.329002,30.084999,-57.523998),vec4(30.084999,-57.523998,28.443001,-63.068001),vec4(28.443001,-63.068001,25.865000,-62.321998),vec4(25.864999,-62.321999,23.028000,-61.498001),vec4(23.028000,-61.498001,31.117001,-33.201000),vec4(31.117001,-33.201000,32.535999,-33.401001),vec4(32.535999,-33.401001,34.415001,-33.680000),vec4(34.415001,-33.680000,71.928002,-44.577999),vec4(71.928002,-44.577999,78.399002,-22.214001),vec4(78.399002,-22.214001,83.464996,-4.659000),vec4(83.464997,-4.659000,85.730004,3.334000),vec4(85.730003,3.334000,86.279999,5.226000),vec4(86.279999,5.226000,86.977997,7.631000),vec4(86.977997,7.631000,87.342003,8.866999),vec4(87.342003,8.867000,93.441002,29.216000),vec4(93.441002,29.215999,109.441002,24.361999),vec4(109.441002,24.362000,108.519997,21.334000),vec4(108.519997,21.334000,127.069001,15.969001),vec4(127.069001,15.969000,129.074997,22.892999),vec4(129.074997,22.893000,135.181000,43.999001),vec4(135.181000,43.999000,116.981003,49.319999),vec4(116.981003,49.319999,116.223999,46.737999),vec4(116.223999,46.737998,81.125000,57.056999),vec4(81.125000,57.056999,52.606998,65.050003),vec4(52.606999,65.050003,53.209000,67.654999),vec4(53.209000,67.654999,36.904000,72.574997),vec4(36.904000,72.574997,39.006001,79.800003),vec4(39.006000,79.800003,16.721000,86.245003),vec4(16.721000,86.245003,-5.861000,92.524002),vec4(-5.861000,92.524002,-7.651000,86.056000),vec4(-7.651000,86.056000,-23.867000,90.498001),vec4(-23.867000,90.498001,-25.010999,87.157997),vec4(-25.011000,87.157998,-89.310997,106.516999),vec4(-89.310997,106.516998,-88.954002,107.730003),vec4(-88.954002,107.730004,-99.947998,111.193001),vec4(-99.947999,111.193001,-105.668000,112.985000),vec4(-105.667999,112.985000,-107.079002,113.430000),vec4(-107.079003,113.430000,-109.709000,94.483001),vec4(-109.708999,94.483001,-114.291999,61.076000),vec4(-114.292000,61.076001,-115.258003,56.022000),vec4(-115.258003,56.021999,-122.061996,12.685000),vec4(-122.061996,12.685000,-128.509994,-32.321998),vec4(-128.509995,-32.321999,-130.100007,-43.363998),vec4(-130.100006,-43.363998,-135.181000,-77.383003),vec4(-135.181000,-77.383003,-107.658997,-86.098999),vec4(-107.658997,-86.098999,-76.467003,-94.681999),vec4(-76.467003,-94.681999,-17.396999,-113.428001),vec4(-17.397000,-113.428001,-11.484001,-92.077003),vec4(-11.484000,-92.077004,2.652000,-95.996002),vec4(2.652000,-95.996002,9.003000,-97.753998),vec4(9.003000,-97.753998,54.813999,-110.432999),vec4(54.813999,-110.432998,58.452999,-91.987999),vec4(58.452999,-91.987999,61.409999,-81.601997),vec4(61.409999,-81.601997,65.309997,-67.698997),vec4(-84.958000,86.879998,-30.188999,70.026001),vec4(-93.939003,56.456001,-84.958001,86.879997),vec4(-103.387002,27.357000,-93.939004,56.456001),vec4(-74.647003,19.253000,-103.387001,27.357000),vec4(-48.247002,11.182000,-74.647003,19.253001),vec4(-39.340000,40.169998,-48.247002,11.182000),vec4(-30.188999,70.026001,-39.340000,40.169998),vec4(-118.934998,-46.270001,-115.769997,-36.328999),vec4(-121.742997,-57.646999,-118.934998,-46.270000),vec4(-101.107002,-64.092003,-121.742996,-57.647000),vec4(-70.070999,-73.777000,-101.107002,-64.092002),vec4(-61.417000,-76.482002,-70.071000,-73.777001),vec4(-57.867000,-65.483002,-61.417000,-76.482002),vec4(-54.806000,-55.375999,-57.867001,-65.483001),vec4(-65.882004,-51.546002,-54.806000,-55.376000),vec4(-67.650001,-50.933998,-65.882003,-51.546001),vec4(-115.769996,-36.328998,-67.650001,-50.933998),vec4(-56.863998,-14.143000,-110.415001,2.933000),vec4(-55.132999,-14.622000,-56.863998,-14.142999),vec4(-53.187000,-7.987000,-55.132999,-14.622000),vec4(-51.715999,-2.878000,-53.187000,-7.987000),vec4(-78.918999,5.215000,-51.716000,-2.878000),vec4(-108.929000,14.232001,-78.918998,5.215001),vec4(-109.366997,10.715000,-108.929001,14.232000),vec4(-110.415001,2.933000,-109.366997,10.715000),vec4(-27.424999,36.797001,-18.830999,64.994003),vec4(-35.945999,10.703000,-27.424999,36.797001),vec4(-34.089001,10.102000,-35.945999,10.703000),vec4(-32.477001,9.579000,-34.089001,10.102000),vec4(-18.474001,5.527000,-32.477001,9.579000),vec4(40.811001,-11.650000,-18.474001,5.527000),vec4(59.909000,-17.193001,40.811001,-11.650000),vec4(67.902001,10.948000,59.909001,-17.193001),vec4(68.638001,13.498000,67.902000,10.948000),vec4(75.070999,35.338001,68.638000,13.498000),vec4(46.115002,44.410999,75.070999,35.338001),vec4(29.653999,49.564999,46.115002,44.410999),vec4(-7.948000,61.264999,29.653999,49.564998),vec4(-14.025000,63.157001,-7.948000,61.264999),vec4(-17.917000,64.271004,-14.025000,63.157002),vec4(-18.830999,64.994003,-17.917000,64.271003),vec4(-37.252998,-6.919000,-28.361000,-0.918000),vec4(-38.917000,-12.362000,-37.252998,-6.919000),vec4(-41.242001,-19.464001,-38.917000,-12.362001),vec4(-9.739001,-76.670998,-41.242001,-19.464001),vec4(-2.280000,-79.098000,-9.739000,-76.670998),vec4(3.521000,-80.989998,-2.280000,-79.098000),vec4(8.468000,-78.274002,3.521000,-80.989998),vec4(13.356000,-75.601998,8.468000,-78.274002),vec4(15.206000,-68.365997,13.356000,-75.601997),vec4(16.766001,-62.287998,15.206000,-68.365998),vec4(-14.626000,-4.848000,16.766001,-62.287998),vec4(-21.475000,-2.889000,-14.626000,-4.848000),vec4(-28.361000,-0.918000,-21.475000,-2.889000),vec4(-50.943001,-44.799999,-48.209999,-33.591000),vec4(-48.209999,-33.591000,-40.499000,-48.151001),vec4(-40.499001,-48.151001,-50.943001,-44.799999),vec4(-46.173999,-56.287998,-35.952999,-59.650001),vec4(-35.952999,-59.650002,-22.040001,-88.781998),vec4(-22.040000,-88.781997,-37.757999,-83.873001),vec4(-37.758000,-83.873001,-37.194000,-81.891998),vec4(-37.194000,-81.891998,-44.361999,-79.454002),vec4(-44.362000,-79.454003,-43.173001,-75.724999),vec4(-43.173000,-75.724998,-40.105999,-76.660003),vec4(-40.105999,-76.660003,-38.754002,-72.017998),vec4(-38.754002,-72.017998,-37.624001,-68.154999),vec4(-37.624001,-68.154999,-41.116001,-67.120003),vec4(-41.116001,-67.120003,-39.868000,-62.812001),vec4(-39.868000,-62.812001,-47.459999,-60.463002),vec4(-47.459999,-60.463001,-46.174000,-56.287998),vec4(-56.202999,-18.284000,-61.908001,-36.606998),vec4(-61.908001,-36.606998,-64.025001,-35.962002),vec4(-64.025001,-35.962002,-91.049003,-27.702000),vec4(-91.049004,-27.702000,-85.432999,-9.345000),vec4(-85.432998,-9.345000,-58.244999,-17.650000),vec4(-58.244999,-17.650000,-56.202999,-18.284001));
float frSeg(vec2 p,vec4 edge){vec2 a=edge.xy,b=edge.zw,v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(.001,dot(v,v)),0.,1.));}
vec3 frBands(vec3 c,vec2 uv,float H){float y=uv.y;float line=max(fpStroke(y-H*.09,H*.009),max(fpStroke(y-H*.43,H*.015),fpStroke(y-H*.94,H*.018)));c=fpLayer(c,line,vec3(.80,.77,.67),.93);return fpLayer(c,max(fpStroke(y-H*.45,H*.005),fpStroke(y-H*.968,H*.007)),vec3(.36,.35,.31),.65);}
vec3 frRusticate(vec3 c,vec2 uv){float row=floor(uv.y/.25),joint=max(fpRepeatStroke(uv.y,.25,.011),fpRepeatStroke(uv.x+mod(row,2.)*1.15,2.3,.016));c=fpLayer(c,joint,vec3(.40,.37,.30),.53);return fpLayer(c,fpRepeatStroke(uv.y+.032,.25,.007),vec3(.88,.83,.70),.55);}
vec3 frPilaster(vec3 c,vec2 q,float H,float r){float shaft=foRect(q,vec2(r,H*.34));c=fpLayer(c,foRect(q-vec2(r*.55,-H*.008),vec2(r*1.3,H*.35)),vec3(.40,.39,.33),.38);c=fpLayer(c,shaft,vec3(.82,.78,.66),.82);float cap=foRect(q-vec2(0.,H*.36),vec2(r*1.55,H*.023));float base=foRect(q+vec2(0.,H*.36),vec2(r*1.40,H*.019));return fpLayer(c,max(cap,base),vec3(.92,.85,.72),.93);}
vec3 frArch(vec3 c,vec2 q,vec2 h,float stone){float ratio=clamp(h.x/h.y,.12,.94),inside=fpWindowShape(q,h,ratio,0.),outer=fpWindowShape(q,h+vec2(.10),ratio,0.);c=foHallArch(c,q,h,.28);float spring=h.y*(1.-ratio);vec2 aq=q-vec2(0.,spring);float voussoir=fpRepeatStroke(atan(aq.y,aq.x),3.14159265/9.,.020)*step(0.,aq.y)*max(0.,outer-inside);return fpLayer(c,voussoir,vec3(.37,.34,.28),stone*.80);}
vec3 frSouth(vec3 c,vec2 uv,float W,float H){c=frRusticate(c,uv);float margin=W*.025,bay=(W-2.*margin)/23.,cx=margin+(floor((uv.x-margin)/bay)+.5)*bay;bool valid=uv.x>margin&&uv.x<W-margin;float dmin=min(abs(uv.x-W*.445),min(abs(uv.x-W*.5),abs(uv.x-W*.555)));if(valid){if(dmin>1.65)c=frArch(c,vec2(uv.x-cx,uv.y-H*.255),vec2(min(1.25,bay*.26),H*.115),1.);c=frArch(c,vec2(uv.x-cx,uv.y-H*.595),vec2(min(1.26,bay*.27),H*.14),1.);}
 for(int j=0;j<3;j++){float x=W*(.445+.055*float(j));vec2 q=uv-vec2(x,H*.23);float shape=fpWindowShape(q,vec2(1.62,H*.19),.62,0.);c=foEntranceArcade(c,q,vec2(1.62,H*.23),1.);c=fpLayer(c,shape,vec3(.29,.12,.10),.98);c=fpLayer(c,max(fpStroke(q.x,.025),fpRepeatStroke(q.y,.43,.021))*shape,vec3(.13,.095,.07),.90);}
 float lo=W*.25,hi=W*.75;if(uv.x>lo&&uv.x<hi){float topBay=(hi-lo)/11.,tx=lo+(floor((uv.x-lo)/topBay)+.5)*topBay;c=frArch(c,vec2(uv.x-tx,uv.y-H*.85),vec2(topBay*.22,H*.079),1.);float px=lo+round((uv.x-lo)/topBay)*topBay;c=frPilaster(c,vec2(uv.x-px,uv.y-H*.85),H*.20,.15);}
 else{float bal=fpRepeatStroke(uv.x,.85,.12)*foRect(uv-vec2(uv.x,H*.858),vec2(1.,H*.025));c=fpLayer(c,bal,vec3(.84,.80,.67),.95);c=fpLayer(c,fpStroke(uv.y-H*.9,H*.009),vec3(.86,.81,.68),.90);}
 c=frBands(c,uv,H);float steps=max(fpStroke(uv.y-H*.025,H*.009),fpStroke(uv.y-H*.052,H*.008));c=fpLayer(c,steps,vec3(.74,.70,.61),.92);float modillions=fpRepeatStroke(uv.x,.6,.12)*foRect(uv-vec2(uv.x,H*.973),vec2(1.,H*.009));return fpLayer(c,modillions,vec3(.45,.42,.34),.78);}
vec3 frPlainWindows(vec3 c,vec2 uv,float W,float H,float pitch,float tier){float margin=min(1.,W*.12),count=max(1.,floor((W-2.*margin)/pitch)),bay=(W-2.*margin)/count,x=uv.x-margin;if(x<0.||x>W-2.*margin)return c;float cx=margin+(floor(x/bay)+.5)*bay;for(int k=0;k<3;k++){if(float(k)>=tier)break;float y=H*(tier>2.5?.21+.29*float(k):.25+.40*float(k));c=foRectCasement(c,uv-vec2(cx,y),vec2(min(bay*.23,1.1),H*(tier>2.5?.080:.125)),.20);}return frBands(c,uv,H);}
vec3 frWest(vec3 c,vec2 uv,float W,float H){float portalDistance=min(abs(uv.x-W*.34),abs(uv.x-W*.75));if(portalDistance>2.6)c=frPlainWindows(c,uv,W,H,5.7,3.);for(int k=0;k<2;k++){float x=W*(k==0?.34:.75);vec2 q=uv-vec2(x,H*.235);c=foEntranceArcade(c,q,vec2(1.82,H*.235),1.);float wood=fpWindowShape(q,vec2(1.64,H*.19),.70,0.);c=fpLayer(c,wood,vec3(.23,.19,.14),.95);for(int s=0;s<2;s++){vec2 l=uv-vec2(x+(s==0?-2.4:2.4),H*.10);float bronze=max(foRect(l,vec2(.48,H*.035)),fpInside(length(l-vec2(0.,H*.047))-.29));c=fpLayer(c,bronze,vec3(.19,.27,.22),.92);}c=fpLayer(c,foRect(uv-vec2(x,H*.48),vec2(2.35,H*.035)),vec3(.78,.73,.62),.95);}return c;}
vec3 frNorth(vec3 c,vec2 uv,float W,float H){
 // The shared central projection is already the complete nine-bay field.
 float bay=W/9.,cx=(floor(uv.x/bay)+.5)*bay;
 c=foEntranceArcade(c,uv-vec2(cx,H*.205),vec2(bay*.31,H*.205),0.);
 c=foRectCasement(c,uv-vec2(cx,H*.63),vec2(bay*.24,H*.18),.2);
 c=foOrderColumn(c,uv-vec2(round(uv.x/bay)*bay,H*.62),H*.25,max(.14,bay*.075),1.);
 c=fpLayer(c,fpStroke(uv.y-H*.40,H*.02),vec3(.84,.79,.66),.96);
 c=fpLayer(c,fpStroke(uv.y-H*.91,H*.018),vec3(.86,.81,.70),.96);return c;}

vec3 frKaiser(vec3 c,vec2 uv,float W,float H){c=frPlainWindows(c,uv,W,H,4.3,3.);float bay=max(2.,W/max(1.,floor(W/4.3))),x=mod(uv.x+bay*.5,bay)-bay*.5;c=frPilaster(c,vec2(x,uv.y-H*.5),H,.15);float ring=step(1.5,mod(floor(uv.x/bay),3.))*fpStroke(length(vec2(x/(bay*.16),(uv.y-H*.88)/(H*.034)))-1.,.10);c=fpLayer(c,ring,vec3(.50,.47,.40),.86);return c;}
vec3 frGallery(vec3 c,vec2 uv,float W,float H){float bay=W/7.,cx=(floor(uv.x/bay)+.5)*bay;c=frArch(c,uv-vec2(cx,H*.61),vec2(bay*.22,H*.24),.25);c=fpLayer(c,fpStroke(uv.y-H*.34,H*.015),vec3(.79,.75,.65),.95);return frBands(c,uv,H);}
vec3 frApotheke(vec3 c,vec2 uv,float W,float H){
 float bay=W/max(1.,floor(W/6.2)),cx=(floor(uv.x/bay)+.5)*bay;
 c=foEntranceArcade(c,uv-vec2(cx,H*.22),vec2(bay*.32,H*.22),0.);
 // Ordered arcade piers have capitals and bases, distinct from the glazed upper storeys.
 float px=round(uv.x/bay)*bay;
 c=frPilaster(c,uv-vec2(px,H*.22),H*.60,min(.22,bay*.035));
 c=foRectCasement(c,uv-vec2(cx,H*.59),vec2(bay*.23,H*.12),.25);
 c=foRectCasement(c,uv-vec2(cx,H*.85),vec2(bay*.19,H*.066),.25);
 return frBands(c,uv,H);
}
vec3 frNorthCourt(vec3 c,vec2 uv,float W,float H){
 c=frApotheke(c,uv,W,H);
 // One photographed exterior flight: high at westU69, low at eastU95.
 float t=clamp((uv.x-69.)/26.,0.,1.);
 float tread=H*(.53-.48*t),span=step(69.,uv.x)*step(uv.x,95.);
 float flight=foRect(vec2(0.,uv.y-tread+H*.035),vec2(1.,H*.035))*span;
 c=fpLayer(c,flight,vec3(.75,.70,.59),.99);
 c=fpLayer(c,fpRepeatStroke(uv.x-69.,.70,.026)*flight,vec3(.34,.33,.28),.95);
 float parapet=foRect(vec2(0.,uv.y-tread-H*.048),vec2(1.,H*.045))*span;
 c=fpLayer(c,parapet,vec3(.82,.77,.65),.97);
 c=fpLayer(c,fpRepeatStroke(uv.x-69.,.86,.055)*parapet,vec3(.42,.40,.33),.82);
 c=fpLayer(c,fpStroke(uv.y-tread-H*.09,.045)*span,vec3(.94,.86,.70),.98);
 c=fpLayer(c,fpStroke(uv.y-tread+H*.07,.040)*span,vec3(.30,.30,.26),.75);
 float landing=foRect(uv-vec2(68.,H*.53),vec2(1.15,H*.035));
 return fpLayer(c,landing,vec3(.85,.79,.66),.98);
}
const float frRoofFamilies[131]=float[131](182.0,182.0,183.0,182.0,182.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,182.0,183.0,182.0,182.0,183.0,182.0,183.0,182.1,182.1,183.0,182.0,183.0,182.0,183.0,182.0,182.0,182.0,181.0,181.0,181.0,181.0,181.0,181.0,181.0,180.0,180.0,180.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,184.0,184.0,184.0,184.0,184.0,184.0,184.0,185.0,185.0,185.0,185.0,185.0,185.0,185.0,185.0,185.0,185.0,186.0,186.0,186.0,186.0,186.0,186.0,186.0,186.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,189.0,189.0,189.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,191.0,191.0,191.0,191.0,191.0,191.0);
// Same material on coincident native glass/roof fragments prevents depth flicker.
const vec2 frGlassRing[10]=vec2[10](vec2(5.742094,-18.729474),vec2(16.357167,-13.753507),vec2(22.827236,-15.790648),vec2(25.486576,-20.866800),vec2(28.131059,-25.942948),vec2(26.972240,-31.753797),vec2(15.800043,-37.442188),vec2(9.114552,-35.393922),vec2(6.692919,-30.774190),vec2(3.833015,-25.330694));
bool frGlassCovered(vec2 p){bool inside=false;for(int i=0,j=9;i<10;j=i++){vec2 a=frGlassRing[i],b=frGlassRing[j];if((a.y>p.y)!=(b.y>p.y)){float x=(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x;if(p.x<x)inside=!inside;}}return inside;}
vec3 frGlassRoof(vec2 uv){return fpLayer(vec3(.60,.69,.70),max(fpRepeatStroke(uv.x,2.1,.05),fpRepeatStroke(uv.y,2.7,.05)),vec3(.40,.46,.45),.94);}
vec3 frRoof(vec3 base,vec2 xz,float family){
 if(frGlassCovered(xz))return frGlassRoof(xz);
 float d1=1e6,d2=1e6;int near=0;
 for(int i=0;i<131;i++){float d=frSeg(xz,frRoofEdges[i]);if(d<d1){d1=d;near=i;}}
 float field=frRoofFamilies[near];
 bool south=field==180.;bool dark=(field>181.9&&field<182.2)||field==183.||field==187.;
 vec3 c=south?vec3(.39,.51,.44):dark?vec3(.32,.34,.35):vec3(.65,.32,.23);
 // Existing sloped carriers already receive native-normal lighting. Only the
 // uncovered flat parent needs a painted ridge, paired with a parallel eave.
 if(family==199.){vec4 edge=frRoofEdges[near];vec2 axis=normalize(edge.zw-edge.xy);
  for(int i=0;i<131;i++){if(i==near)continue;vec4 other=frRoofEdges[i];vec2 tangent=normalize(other.zw-other.xy);
   float across=abs(dot(other.xy-edge.xy,vec2(-axis.y,axis.x)));
   if(abs(dot(axis,tangent))>.985&&across>3.)d2=min(d2,frSeg(xz,other));}
  if(d2<40.){float slope=d1/max(.2,d1+d2);c*=.80+.24*sin(slope*3.14159265);
   c=fpLayer(c,fpStroke(d1-d2,.11),c*1.16,.48);
   c=fpLayer(c,fpStroke(d1-d2-.22,.10),c*.73,.28);}}
 vec2 tile=vec2(.95622569*xz.x-.29263018*xz.y,.29263018*xz.x+.95622569*xz.y);
 float spacing=south?.75:dark?.52:.45;
 float row=fpRepeatStroke(tile.y,spacing,.020),col=fpRepeatStroke(tile.x+mod(floor(tile.y/spacing),2.)*.18,south?2.:dark?.9:.70,.009);
 c=fpLayer(c,max(row,col),c*.57,.48);c=fpLayer(c,fpStroke(d1-.18,.12),c*.48,.62);
 float lights=max(foRect(xz-vec2(-80.,95.),vec2(1.7,.95)),foRect(xz-vec2(-60.,89.),vec2(1.4,.9)));
 return fpLayer(c,lights,vec3(.33,.39,.40),.95);
}

vec3 frClock(vec3 c,vec2 uv,float W,float H,vec3 normal){if(uv.y>H*.87)return vec3(.36,.51,.43);if(normal.z<-.6){vec2 q=uv-vec2(W*.5,H*.78);float r=min(W*.26,1.15),dial=fpInside(length(q)-r);c=fpLayer(c,fpStroke(length(q)-r,.06),vec3(.74,.64,.38),.95);c=fpLayer(c,dial,vec3(.20,.22,.21),.97);float tick=fpRepeatStroke(atan(q.y,q.x),6.2831853/12.,.03)*fpInside(abs(length(q)-r*.78)-r*.11);c=fpLayer(c,tick,vec3(.84,.73,.46),.95);float hands=max(fpStroke(q.x,.028)*foRect(q-vec2(0.,r*.23),vec2(.06,r*.42)),fpStroke(q.y-q.x*.40,.027)*foRect(q-vec2(r*.21,0.),vec2(r*.40,r*.22)));c=fpLayer(c,hands*dial,vec3(.88,.75,.46),.98);}return c;}
// Fragment-level recovery only for already admitted original walls whose shared
// vertices cannot hold different facade grammars. Unmatched fragments stay solid.
const vec4 frWallFields[131]=vec4[131](vec4(-0.96044297,0.27847674,-81.57912449,4.91960336),vec4(-0.96076546,0.27736209,-76.60512545,31.74552091),vec4(-0.28398194,-0.95882963,46.61211738,5.78205175),vec4(-0.96059026,0.27796825,-44.85297167,2.6837676),vec4(-0.96031428,0.2789202,-42.22139281,2.95424106),vec4(0.27485128,0.96148675,-52.80023795,29.43046366),vec4(0.99021284,-0.13956554,35.44616891,1.43302396),vec4(0.98915543,-0.14687252,37.0888495,1.89960199),vec4(0.96029736,-0.27897847,42.44462935,39.06394224),vec4(0.27794757,0.96059625,-22.82924562,23.28137184),vec4(0.27726432,0.96079368,0.39417414,18.27135327),vec4(0.27263864,0.96211651,18.27328219,8.3077257),vec4(0.27914026,0.96025034,27.13217005,1.97031924),vec4(0.27872629,0.96037058,29.06740062,2.50424186),vec4(0.28250686,0.95926528,31.89203391,1.28848569),vec4(0.28710167,0.95790012,33.56973482,21.24334223),vec4(0.95693281,-0.2903095,80.9350781,16.72008723),vec4(-0.29099969,-0.95672315,-55.15498692,3.16496981),vec4(0.96062578,-0.27784549,98.31955032,19.30929199),vec4(0.27827323,0.96050196,50.69815634,7.20873053),vec4(0.27790567,0.96060837,57.86188097,21.9714939),vec4(-0.95982024,0.28061558,-117.40265485,18.96188073),vec4(-0.28134247,-0.95960743,-80.23956194,2.69068439),vec4(-0.95939683,0.28205979,-98.3220263,36.58444339),vec4(-0.96289417,0.26987925,-62.71628981,29.61696344),vec4(0.22516075,0.97432163,75.224656,2.67365072),vec4(-0.95736452,0.28888265,-31.39605296,17.03113082),vec4(0.27935175,0.96018884,79.99489855,7.52456791),vec4(-0.96063241,0.27782255,-15.300187525392264,46.6357085343503),vec4(-0.96063241,0.27782255,-15.300187525392264,46.6357085343503),vec4(-0.26672143,-0.96377367,-87.60894234,6.71112165),vec4(-0.96446948,0.26419429,30.11465962,16.81338901),vec4(-0.32403408,-0.94604541,-77.8814971,3.53049011),vec4(-0.95754301,0.28829047,49.07592736,67.15102816),vec4(0.28233259,0.95931658,76.9681173,1.26444709),vec4(-0.95380141,0.3004378,117.2106178,11.52650389),vec4(-0.95426603,0.29895877,128.61910219,5.99413691),vec4(-0.95369521,0.30077473,134.75809821,1.47951158),vec4(-0.1457033918,-0.9893283184,-96.61773763,192.87126426),vec4(-0.1457033918,-0.9893283184,-96.61773763,192.87126426),vec4(-0.1457033918,-0.9893283184,-96.61773763,192.87126426),vec4(-0.1457033918,-0.9893283184,-96.61773763,192.87126426),vec4(-0.1457033918,-0.9893283184,-96.61773763,192.87126426),vec4(-0.1457033918,-0.9893283184,-96.61773763,192.87126426),vec4(-0.1457033918,-0.9893283184,-96.61773763,192.87126426),vec4(0.9562256936,-0.2926301812,-106.618943,123.17594182),vec4(0.9562256936,-0.2926301812,-106.618943,123.17594182),vec4(0.9562256936,-0.2926301812,-106.618943,123.17594182),vec4(0.26689649,0.9637252,-113.95662162,22.15465349),vec4(0.96365259,-0.26715855,13.53257191,14.66918714),vec4(0.96375901,-0.26677437,28.16516191,6.58982196),vec4(0.96376855,-0.26673992,34.75170217,47.5331956),vec4(0.19355826,0.98108878,-97.73487405,18.8005408),vec4(0.2738282,0.96177862,-72.46601155,10.79874448),vec4(0.27008956,0.9628352,-61.98307609,14.43964639),vec4(0.95576922,-0.29411767,-106.75318353,57.30358332),vec4(0.28311694,0.9590854,27.55040332,31.72188428),vec4(0.30881475,0.95112221,-5.90758052,30.5943871),vec4(-0.96246851,0.27139337,77.07052677,29.86071491),vec4(-0.9563077,0.29236209,49.40817191,27.60617908),vec4(-0.29371282,-0.95589371,-26.84358602,30.32554541),vec4(-0.29304829,-0.95609764,-58.10485997,31.22693905),vec4(0.3033738,0.95287163,-80.17113327,10.432677),vec4(0.23962299,0.97086602,-85.13993322,11.71840264),vec4(-0.95452928,0.29811719,77.40266595,21.61902673),vec4(-0.95460033,0.29788958,44.91239961,32.5120388),vec4(-0.95446029,0.298338,35.80259993,9.06690351),vec4(-0.30715438,-0.9516597,80.09163658,11.55770339),vec4(-0.2898576,-0.95706978,68.88463133,10.56036082),vec4(0.94509162,-0.3268055,-45.41901283,11.71950298),vec4(0.94498539,-0.32711252,-47.26711468,1.870926),vec4(0.95689636,-0.2904296,-100.22887209,50.28757244),vec4(-0.95273517,0.30380207,49.87965852,56.20764749),vec4(-0.96378062,0.26669629,49.23648348,1.79605083),vec4(-0.28143795,-0.95957943,22.63300135,6.91448728),vec4(-0.27668322,-0.96096118,17.07459545,5.31655186),vec4(0.95848223,-0.28515227,-77.12952698,28.38132859),vec4(0.95770323,-0.28775774,-108.41702466,31.33538768),vec4(0.12358213,0.99233435,-2.88294405,3.54416856),vec4(0.13346545,0.99105347,-11.82982796,7.85225049),vec4(0.29154359,0.95655754,27.20286595,29.47758095),vec4(0.31041857,0.95059998,-0.98403389,27.45003312),vec4(-0.95141357,0.30791593,35.54330464,1.95183094),vec4(-0.95119007,0.30860566,33.84793475,1.69471861),vec4(-0.96059173,0.27796316,19.28227498,14.57747319),vec4(-0.96049694,0.27829055,-42.44092617,61.72325937),vec4(-0.96036749,0.27873695,-62.32698084,19.88613712),vec4(-0.2732264,-0.96194976,-29.08404525,29.25412745),vec4(-0.27730781,-0.96078113,-32.00247746,2.65409063),vec4(-0.28254908,-0.95925284,-55.10932001,22.76772101),vec4(0.95425219,-0.29900294,30.7263222,30.34417708),vec4(0.95431584,-0.29879974,13.4892726,17.24900888),vec4(0.95484524,-0.29710362,-25.79116301,39.38020274),vec4(0.95479525,-0.29726423,-32.16532055,6.36471499),vec4(0.9613932,-0.27517834,-34.91127002,4.0482918),vec4(0.78428939,-0.62039515,-55.09091777,1.16538559),vec4(0.82889616,0.55940249,-34.74937336,10.72751773),vec4(0.29235713,0.95630921,-23.19955717,5.69167404),vec4(0.31112485,0.95036905,-31.32939508,7.47288672),vec4(-0.48237895,0.87596264,-62.46304068,65.3075763),vec4(-0.95092808,0.30941201,-22.30575514,7.84391641),vec4(-0.95071207,0.3100751,-28.46043861,6.10174214),vec4(-0.87657889,-0.4812582,30.24713507,5.64353144),vec4(-0.87745577,-0.47965756,24.54377048,5.57065064),vec4(-0.24769886,-0.96883707,62.46900386,7.46874811),vec4(-0.24860549,-0.96860483,56.16433593,6.27500395),vec4(0.47957127,-0.87750293,-2.76007538,65.45846869),vec4(0.96144444,-0.27499924,-19.85254703,7.12365651),vec4(0.96139212,-0.2751821,-27.01342489,7.16252975),vec4(0.2368825,0.97153831,-55.59242077,11.5373728),vec4(0.46801868,-0.88371857,7.1218101,16.47583498),vec4(-0.95218775,0.30551348,23.85187265,10.96842531),vec4(0.94993042,-0.3124615,-26.27425457,10.75973611),vec4(0.43095892,-0.90237155,38.3321983,32.28381512),vec4(-0.95452972,0.29811576,-5.42947718,16.46674602),vec4(0.27382256,0.96178023,-91.00638609,2.05972503),vec4(-0.94673747,0.32200646,8.8432011,7.57126393),vec4(0.30378314,0.95274121,-89.17552945,3.91397358),vec4(0.95653738,-0.29160972,-19.21444287,3.20635805),vec4(0.27963381,0.96010673,-84.81677863,4.8348853),vec4(0.28075394,0.95977978,-80.00175663,4.02488054),vec4(-0.95877349,0.28417142,16.70519163,3.64215387),vec4(0.27825304,0.96050781,-75.90993896,4.4851301),vec4(-0.95531807,0.29557975,19.52066519,7.94709041),vec4(0.29437503,0.95568998,-71.75492322,4.36857467),vec4(-0.29728099,-0.95479004,34.16546438,19.19060456),vec4(-0.95658672,0.29144783,48.55134158,2.21307752),vec4(-0.95632518,0.29230489,50.71685202,28.25817268),vec4(0.2925483,0.95625075,-53.12628894,19.1968471),vec4(0.9563756,-0.29213987,-78.97598847,28.4281611),vec4(0.9550275,-0.29651725,-50.39204611,2.13815814));
const float frWallFamilies[131]=float[131](182.0,182.0,183.0,182.0,182.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,182.0,183.0,182.0,182.0,183.0,182.0,183.0,182.1,182.1,183.0,182.0,183.0,182.0,183.0,182.0,182.0,182.0,181.0,181.0,181.0,181.0,181.0,181.0,181.0,180.0,180.0,180.0,183.0,183.0,183.0,183.0,183.0,183.0,183.0,184.0,184.0,184.0,184.0,184.0,184.0,184.0,185.0,185.0,185.0,185.0,185.0,185.0,185.0,185.0,185.0,185.0,186.0,186.0,186.0,186.0,186.0,186.0,186.0,186.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,187.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,188.0,189.0,189.0,189.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,190.0,191.0,191.0,191.0,191.0,191.0,191.0);
// Independent window tiers, projecting caps and recessed reveals on the low garden wing.
// Counts and two southern court portal positions are photographic drawing estimates.
vec3 frCuvillies(vec2 uv,float W,float H,float family){
 vec3 c=vec3(.81,.77,.66);float margin=.65;
 float count=family==232.?max(1.,floor(W/3.25)):max(1.,floor(W/5.0));
 float bay=(W-2.*margin)/count,cx=margin+(floor((uv.x-margin)/bay)+.5)*bay;
 c=fpLayer(c,fpRepeatStroke(uv.y,H*.043,H*.0012),vec3(.53,.49,.40),.34);
 c=fpLayer(c,foRect(uv-vec2(W*.5,H*.035),vec2(W*.5,H*.035)),vec3(.62,.58,.48),.78);
 float portal=family==233.?min(abs(uv.x-4.8),abs(uv.x-10.2)):1000.;
 if(uv.x>margin&&uv.x<W-margin){
  // A lower window has a sill and glazing; keep the photographed discrete portal zones free.
  if(portal>1.8)c=foRectCasement(c,uv-vec2(cx,H*.185),vec2(bay*.20,H*.115),.18);
  vec2 q=uv-vec2(cx,H*.545);vec2 h=vec2(bay*.205,H*.125);
  c=fpLayer(c,foRect(q-vec2(.07,-.07),h+vec2(.12,.10)),vec3(.39,.37,.31),.60);
  c=foRectCasement(c,q,h,.22);
  vec2 hood=uv-vec2(cx,H*.705);
  float cap=foTriangle(hood,bay*.29,H*.045);
  c=fpLayer(c,foTriangle(hood-vec2(.05,-.07),bay*.30,H*.045),vec3(.40,.38,.31),.84);
  c=fpLayer(c,cap,vec3(.91,.86,.73),.98);
  c=fpLayer(c,foTriangle(hood-vec2(0.,H*.005),bay*.23,H*.029),vec3(.70,.65,.53),.96);
  c=fpLayer(c,foRect(hood+vec2(0.,H*.04),vec2(bay*.29,H*.009)),vec3(.94,.89,.76),.98);
  c=foRectCasement(c,uv-vec2(cx,H*.835),vec2(bay*.17,H*.055),.14);
 }
 if(family==233.)for(int i=0;i<2;i++){
  float x=i==0?4.8:10.2;
  c=foEntranceArcade(c,uv-vec2(x,H*.185),vec2(1.55,H*.185),0.);
  // Entrance-only piers; no window hood, raised sill or glazing in these passage voids.
  c=frPilaster(c,uv-vec2(x-1.76,H*.19),H*.51,.16);
  c=frPilaster(c,uv-vec2(x+1.76,H*.19),H*.51,.16);
 }
 for(int k=0;k<3;k++){
  float y=H*(k==0?.34:k==1?.755:.958);
  c=fpLayer(c,fpStroke(uv.y-y,H*.012),vec3(.91,.86,.73),.98);
  c=fpLayer(c,fpStroke(uv.y-y-H*.016,H*.005),vec3(.38,.36,.30),.76);
 }
 return c;
}
vec4 frRecoverWall(vec4 frame,vec3 normal,out float family){
 vec2 xz=vec2(frame.x,frame.w);float nearest=1.0;int chosen=-1;
 for(int i=0;i<131;i++){vec4 edge=frRoofEdges[i];vec2 tangent=normalize(edge.zw-edge.xy);
  float alignment=abs(dot(normalize(normal.xz),vec2(-tangent.y,tangent.x)));
  float d=frSeg(xz,edge);if(alignment>.995&&d<nearest){nearest=d;chosen=i;}}
 if(chosen<0){family=194.;return frame;}
 if(chosen==8){family=232.;return vec4(dot(vec2(.96029736,-.27897847),xz)-42.44462935,frame.y,7.5,39.06394224);}
 if(chosen==9){family=232.;return vec4(dot(vec2(.27794757,.96059625),xz)+22.82924562,frame.y,7.5,23.28137184);}
 if(chosen>=87&&chosen<=89){family=233.;return vec4(dot(vec2(.277309657691,.960780596053),xz)-.094642842386,frame.y,7.5,54.675336139);}
 if(chosen>=90&&chosen<=94){family=230.;return vec4(dot(vec2(.95484524,-.29710362),xz)+36.2031203403,frame.y,7.5,97.3847643237);}
 vec4 field=frWallFields[chosen];family=frWallFamilies[chosen];
 return vec4(dot(field.xy,xz)-field.z,frame.y,frame.z,field.w);
}
vec3 frPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==195.)frame=frRecoverWall(frame,normal,family);vec2 uv=frame.xy;float H=frame.z,W=frame.w;if(family==230.)return frNorthCourt(vec3(.78,.74,.63),uv,W,H);if(family==232.||family==233.)return frCuvillies(uv,W,H,family);if(family==197.)return frGlassRoof(uv);if(family>=198.)return frRoof(base,uv,family);if(family==193.)return vec3(.36,.51,.43);if(family==192.)return frClock(vec3(.81,.80,.72),uv,W,H,normal);vec3 c=family==180.?vec3(.73,.68,.55):family==187.||(family>181.9&&family<182.2)?vec3(.78,.74,.63):family==184.?vec3(.85,.82,.74):vec3(.81,.80,.74);if(family==194.||uv.y>H+.01||uv.y<0.||W<2.5)return c;if(family==180.)return frSouth(c,uv,W,H);if(family==181.)return frWest(c,uv,W,H);if(family>182.05&&family<182.2)return frNorth(c,uv,W,H);if(family==182.)return frPlainWindows(c,uv,W,H,5.6,3.);if(family==184.)return frKaiser(c,uv,W,H);if(family==185.)return normal.x<-.65?frGallery(c,uv,W,H):frPlainWindows(c,uv,W,H,4.8,3.);if(family==187.)return normal.z<-.65?frApotheke(c,uv,W,H):frPlainWindows(c,uv,W,H,5.5,3.);if(family==188.){c=frPlainWindows(c,uv,W,H,4.8,3.);return fpLayer(c,fpRepeatStroke(uv.x,4.8,.06)*fpStroke(uv.y-H*.94,H*.015),vec3(.57,.56,.50),.70);}if(family==189.)return frPlainWindows(c,uv,W,H,4.2,2.);if(family==191.){c=frPlainWindows(c,uv,W,H,4.5,2.);if(normal.x<-.65){vec2 q=uv-vec2(W*.50,H*.21);float grotto=foRect(q,vec2(min(W*.24,3.5),H*.13));c=fpLayer(c,grotto,vec3(.40,.42,.34),.95);c=fpLayer(c,fpRepeatStroke(length(q*vec2(.5,1.)),.31,.025)*grotto,vec3(.70,.68,.54),.72);}return c;}return frPlainWindows(c,uv,W,H,family==186.?4.2:5.6,3.);}

// Independently described theatres and church: entrance voids never use window primitives.
vec3 ftRectEntrance(vec3 c,vec2 q,vec2 h){float outer=foRect(q,h+vec2(.10,.04));c=fpLayer(c,outer,vec3(.47,.45,.40),.97);c=fpLayer(c,foRect(q,h),vec3(.13,.19,.20),.99);return fpLayer(c,fpStroke(q.x,.035)*foRect(q,h),vec3(.44,.48,.46),.8);}
// Nationaltheater roof coordinates: s runs from the entrance to backstage; t crosses the hall.
// These are painted slope fields on the admitted native flat roof, not displaced geometry.
vec3 ftNationalRoof(vec2 xz){
 float s=.9623908165*xz.x-.2716687622*xz.y;
 float t=-.2716687622*xz.x-.9623908165*xz.y-148.8781839462;
 float cross=t-18.35;
 vec3 copper=vec3(.52,.66,.55),weathered=vec3(.58,.57,.40);
 float central=foRect(vec2(s-73.,cross),vec2(37.,17.5));
 // Lower perimeter roof: hips meet the front/rear ridges, with no arbitrary diagonal grid.
 float hip=min(min(s-9.4,120.4-s),min(t+10.04,46.81-t));
 vec3 c=mix(weathered,copper,clamp(.42+(s-9.)/250.,.42,.82));
 c*=cross<0.?1.04:.83;
 float lowerSeam=(s<30.||s>110.)?fpRepeatStroke(t,1.05,.028):fpRepeatStroke(s,1.05,.028);
 c=fpLayer(c,lowerSeam,vec3(.31,.43,.35),.55);
 c=fpLayer(c,fpStroke(hip,.13),vec3(.79,.80,.66),.9);
 // Raised central hall footprint, double-pitched faces and continuous longitudinal ridge.
 vec3 upper=copper*(cross<0.?1.10:.77);
 upper=fpLayer(upper,fpRepeatStroke(s,1.05,.024),vec3(.31,.45,.37),.65);
 upper=fpLayer(upper,fpStroke(cross,.14),vec3(.82,.85,.71),.98);
 upper=fpLayer(upper,fpStroke(abs(cross)-17.5,.20),vec3(.27,.35,.29),.95);
 upper=fpLayer(upper,fpStroke(s-36.,.14),vec3(.85,.86,.73),.94);
 upper=fpLayer(upper,fpStroke(s-110.,.14),vec3(.32,.40,.33),.95);
 // Cast shadow beneath the raised hall gives the flat carrier a legible offset.
 float shadow=foRect(vec2(s-74.1,cross-1.0),vec2(38.,18.5))*(1.-central);
 c=fpLayer(c,shadow,vec3(.22,.29,.27),.72);
 c=fpLayer(c,central,upper,1.);
 // No clerestory windows on this flat roof: the compiled source lacks the raised hall walls.
 // Lower front portico's own ridge and triangular hip junctions.
 float front=foRect(vec2(s-20.,cross),vec2(16.,18.2));
 c=fpLayer(c,front*fpStroke(cross,.15),vec3(.84,.84,.69),.98);
 float diagonal=abs(cross)-max(0.,s-5.)*1.03;
 c=fpLayer(c,front*fpStroke(diagonal,.11),vec3(.33,.43,.35),.95);
 // Real panel changes in the rear copper roof, independently bounded fields.
 c=fpLayer(c,central*fpStroke(s-82.,.10),vec3(.75,.77,.63),.9);
 return c;
}
vec3 ftModernRoof(vec2 xz){
 float along=.9623908165*xz.x-.2716687622*xz.y;
 float across=-.2716687622*xz.x-.9623908165*xz.y-148.8781839462;
 vec2 q=vec2(along-59.,across+38.5);
 // Painted central stage block and lower surrounding pitched roofs; native silhouette stays flat.
 float stage=foRect(q,vec2(24.,13.));
 vec3 tile=vec3(.66,.31,.22)*(q.y<0.?1.06:.78);
 float tileLines=max(fpRepeatStroke(across,.43,.014),fpRepeatStroke(along+mod(floor(across/.43),2.)*.3,.75,.012));
 tile=fpLayer(tile,tileLines,vec3(.31,.16,.13),.45);
 float contact=foRect(q-vec2(.8,.8),vec2(25.,14.))*(1.-stage);
 tile=fpLayer(tile,contact,vec3(.23,.20,.17),.75);
 vec3 top=fpLayer(vec3(.70,.34,.23)*(q.y<0.?1.03:.75),tileLines,vec3(.34,.17,.13),.48);
 top=fpLayer(top,fpStroke(q.y,.09),vec3(.88,.53,.35),.9);
 top=fpLayer(top,fpStroke(abs(q.y)-13.,.12),vec3(.86,.78,.65),.98);
 tile=fpLayer(tile,stage,top,1.);
 float hip=abs(q.y)-max(0.,24.-abs(q.x));
 tile=fpLayer(tile,fpStroke(hip,.065)*stage,vec3(.38,.20,.15),.85);
 return tile;
}
vec3 ftEnsembleRoof(vec2 xz,float family){
 if(family==221.)return ftNationalRoof(xz);
 if(family==223.)return ftModernRoof(xz);
 vec2 uv=vec2(.95622569*xz.x-.29263018*xz.y,.29263018*xz.x+.95622569*xz.y);
 if(family==227.)return fpLayer(vec3(.30,.32,.33),fpRepeatStroke(uv.x,.65,.018),vec3(.18,.20,.21),.50);
 vec3 c=family==223.?vec3(.66,.32,.23):vec3(.28,.31,.33);
 float stepY=family==223.?.45:.55;
 return fpLayer(c,max(fpRepeatStroke(uv.y,stepY,.02),fpRepeatStroke(uv.x+mod(floor(uv.y/stepY),2.)*.3,.9,.014)),c*.55,.55);
}
vec3 ftPediment(vec3 c,vec2 uv,vec2 center,float width,float height){
 float border=foTriangle(uv-center,width,height);
 c=fpLayer(c,border,vec3(.88,.85,.74),.99);
 c=fpLayer(c,foTriangle(uv-center-vec2(0.,.015*height),width*.89,height*.73),vec3(.38,.43,.40),.98);
 return c;
}
vec3 ftEnsemble(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){vec2 uv=frame.xy;float H=frame.z,W=frame.w;if(family==221.||family==223.||family==225.||family==227.)return ftEnsembleRoof(uv,family);vec3 c=family==222.?vec3(.80,.78,.72):vec3(.79,.75,.65);if(W<1.4)return c;
 if(family==230.)return frNorthCourt(vec3(.78,.74,.63),uv,W,H);
 if(family==232.||family==233.)return frCuvillies(uv,W,H,family);
 if(family==226.||family==229.){c=fpLayer(c,fpStroke(uv.y-H*.95,H*.025),vec3(.34,.33,.29),.8);return c;}
 if(family==220.||family==228.){
  bool front=family==220.&&normal.x<-.8;
  if(front&&W>12.){
   // Eight Corinthian principal columns (LMU source), floor-reaching shaded porch; no window primitive.
   c=fpLayer(c,foRect(uv-vec2(W*.5,H*.335),vec2(W*.46,H*.285)),vec3(.16,.21,.21),.99);
   for(int i=0;i<5;i++){float x=W*(.16+float(i)*.17);c=ftRectEntrance(c,uv-vec2(x,H*.28),vec2(W*.032,H*.22));}
   for(int i=0;i<8;i++){float x=W*(.045+float(i)*.13);c=foOrderColumn(c,uv-vec2(x,H*.34),H*.305,min(W*.0085,H*.04),1.);}
   c=fpLayer(c,foRect(uv-vec2(W*.5,H*.635),vec2(W*.49,H*.035)),vec3(.87,.83,.72),.99);
   c=fpLayer(c,fpStroke(uv.y-H*.607,H*.009),vec3(.36,.38,.33),.98);
   // Separate upper hall and lower projecting portico pediments.
   c=ftPediment(c,uv,vec2(W*.5,H*.89),W*.42,H*.20);
   c=fpLayer(c,foRect(uv-vec2(W*.5,H*.78),vec2(W*.42,H*.022)),vec3(.88,.84,.72),.99);
   c=ftPediment(c,uv,vec2(W*.5,H*.695),W*.49,H*.18);
   float stairs=foRect(uv-vec2(W*.5,H*.025),vec2(W*.49,H*.025));
   c=fpLayer(c,stairs,vec3(.64,.63,.55),1.);
   return fpLayer(c,fpRepeatStroke(uv.y,H*.009,H*.0018)*stairs,vec3(.30,.33,.30),.90);
  }
  if(family==228.){
   c=frArch(c,uv-vec2(W*.5,H*.71),vec2(W*.22,H*.16),.2);
   c=foRectCasement(c,uv-vec2(W*.5,H*.32),vec2(W*.16,H*.10),.18);
   c=fpLayer(c,fpStroke(uv.y-H*.49,H*.012),vec3(.88,.85,.75),.96);
   return fpLayer(c,fpStroke(uv.y-H*.96,H*.02),vec3(.43,.45,.39),.94);
  }
  float bay=W/max(1.,floor(W/5.8)),cx=(floor(uv.x/bay)+.5)*bay;
  // Distinct source-visible side levels: lower arches/service doors and upper rectangular windows.
  c=foRectCasement(c,uv-vec2(cx,H*.44),vec2(bay*.19,H*.085),.16);
  c=foRectCasement(c,uv-vec2(cx,H*.65),vec2(bay*.19,H*.085),.16);
  c=foRectCasement(c,uv-vec2(cx,H*.85),vec2(bay*.19,H*.065),.16);
  if(mod(floor(uv.x/bay),4.)==1.)c=ftRectEntrance(c,uv-vec2(cx,H*.115),vec2(bay*.23,H*.115));
  else c=frArch(c,uv-vec2(cx,H*.17),vec2(bay*.24,H*.11),.20);
  float pilaster=fpRepeatStroke(uv.x,bay,bay*.055)*foRect(uv-vec2(W*.5,H*.51),vec2(W*.5,H*.44));
  c=fpLayer(c,pilaster,vec3(.87,.83,.74),.9);
  c=fpLayer(c,max(fpStroke(uv.y-H*.32,H*.014),fpStroke(uv.y-H*.76,H*.012)),vec3(.88,.85,.74),.96);
  return fpLayer(c,fpStroke(uv.y-H*.96,H*.017),vec3(.41,.43,.37),.92);
 }
 if(family==222.){if(normal.x<-.8){float glazed=foRect(uv-vec2(W*.5,H*.40),vec2(W*.45,H*.35));c=fpLayer(c,glazed,vec3(.22,.32,.34),.98);c=fpLayer(c,max(fpRepeatStroke(uv.x,2.4,.045),fpStroke(uv.y-H*.47,.05))*glazed,vec3(.64,.67,.64),.96);float bay=W/5.,cx=(floor(uv.x/bay)+.5)*bay;c=ftRectEntrance(c,uv-vec2(cx,H*.13),vec2(bay*.31,H*.13));return fpLayer(c,foRect(uv-vec2(W*.5,H*.81),vec2(W*.32,H*.014)),vec3(.54,.10,.08),.9);}return frPlainWindows(c,uv,W,H,6.2,2.);}
 // Church east has its own original gable frame, one doorway and four glazed flank windows.
 if(normal.x>.8){
  // The parent envelope's first0.643m lies outside the church projection.
  if(uv.x<0.||uv.x>W||uv.y<0.||uv.y>H)return vec3(.78,.69,.51);
  vec2 a=uv/vec2(W,H);float gable=1.-.797*abs(a.x-.5);
  c=vec3(.78,.69,.51);
  float courses=fpRepeatStroke(uv.y,H*.035,H*.0008);
  float joints=fpRepeatStroke(uv.x+mod(floor(uv.y/(H*.035)),2.)*.55,1.1,.012);
  c=fpLayer(c,max(courses,joints),vec3(.59,.53,.41),.22);
  for(int i=0;i<4;i++){
   float px=i==0?.025:i==1?.29:i==2?.71:.975;
   float division=fpStroke(a.x-px,.009)*step(a.y,gable-.06);
   c=fpLayer(c,division,vec3(.90,.82,.65),.9);
   c=fpLayer(c,fpStroke(a.x-px-.012,.003)*step(a.y,gable-.06),vec3(.44,.40,.31),.52);
  }
  c=fpLayer(c,fpStroke(a.y-.438,.006),vec3(.88,.80,.64),.9);
  for(int i=0;i<2;i++){
   float x=i==0?.17:.83;
   c=frArch(c,uv-vec2(W*x,H*.535),vec2(W*.047,H*.145),.45);
   c=frArch(c,uv-vec2(W*x,H*.205),vec2(W*.042,H*.105),.45);
  }
  // Nested stone arches frame the entrance. Only door leaf and threshold inside, no window bars.
  vec2 door=uv-vec2(W*.5,H*.205);
  float ratio=clamp((W*.105)/(H*.185),.12,.94);
  c=fpLayer(c,fpWindowShape(door,vec2(W*.105,H*.185),ratio,0.),vec3(.91,.82,.65),.98);
  c=fpLayer(c,fpWindowShape(door,vec2(W*.092,H*.177),ratio,0.),vec3(.50,.44,.32),.98);
  c=foEntranceArcade(c,door,vec2(W*.080,H*.165),1.);
  // Narrow engaged portal shafts and a stepped threshold belong to this door alone.
  for(int i=0;i<2;i++){
   float shaftX=W*(i==0?.392:.608);vec2 sq=uv-vec2(shaftX,H*.205);
   c=fpLayer(c,foRect(sq,vec2(W*.006,H*.155)),vec3(.90,.81,.63),.98);
   c=fpLayer(c,foRect(sq-vec2(W*.005,0.),vec2(W*.002,H*.155)),vec3(.45,.40,.30),.65);
   c=fpLayer(c,max(foRect(sq-vec2(0.,H*.157),vec2(W*.010,H*.012)),foRect(sq+vec2(0.,H*.157),vec2(W*.010,H*.010))),vec3(.92,.84,.66),.98);
  }
  float churchSteps=foRect(uv-vec2(W*.5,H*.02),vec2(W*.135,H*.02));
  c=fpLayer(c,churchSteps,vec3(.77,.71,.57),.98);
  c=fpLayer(c,fpRepeatStroke(uv.y,H*.010,H*.0015)*churchSteps,vec3(.40,.38,.30),.80);
  vec2 hood=uv-vec2(W*.5,H*.43);
  float hoodOuter=foTriangle(hood,W*.135,H*.12);
  float hoodInner=foTriangle(hood-vec2(0.,H*.005),W*.11,H*.084);
  c=fpLayer(c,max(0.,hoodOuter-hoodInner),vec3(.91,.83,.66),.98);
  c=fpLayer(c,fpStroke(abs(hood.x)/(W*.135)+hood.y/(H*.12)-.5,.045)*hoodOuter,vec3(.40,.37,.28),.60);
  // Rose has dressed stone rings and radial tracery, separate from the portal.
  vec2 r=uv-vec2(W*.5,H*.68);float radius=min(W*.065,H*.130),rr=length(r);
  c=fpLayer(c,fpInside(rr-radius*1.17),vec3(.92,.84,.66),.99);
  c=fpLayer(c,fpInside(rr-radius*1.03),vec3(.50,.46,.35),.99);
  c=fpLayer(c,fpInside(rr-radius),vec3(.16,.23,.24),.99);
  float spokes=fpRepeatStroke(atan(r.y,r.x),6.2831853/12.,.028);
  float tracery=max(spokes,fpStroke(rr-radius*.34,radius*.045))*fpInside(rr-radius);
  c=fpLayer(c,tracery,vec3(.86,.79,.62),.96);
  c=fpLayer(c,fpInside(rr-radius*.10),vec3(.89,.81,.64),.96);
  // Small blind arches follow both sloping gable eaves, rather than a horizontal stripe.
  float corbelBase=H*(gable-.055),cell=W*.022;
  vec2 cq=vec2(mod(uv.x,cell)-cell*.5,uv.y-corbelBase+H*.019);
  float blind=fpStroke(length(cq/vec2(cell*.43,H*.023))-1.,.13)*step(0.,cq.y);
  c=fpLayer(c,blind*step(a.y,gable-.025),vec3(.39,.36,.28),.70);
  c=fpLayer(c,fpStroke(a.y-gable+.026,.005),vec3(.93,.85,.67),.97);
  c=fpLayer(c,fpStroke(a.y-gable+.044,.003),vec3(.41,.37,.28),.70);
  return c;
 }
 // North flank is reference-visible glazing. Unverified south/west returns stay masonry.
 if(normal.z<.9){c=vec3(.78,.69,.51);return fpLayer(c,fpRepeatStroke(uv.y,.36,.012),vec3(.56,.50,.39),.25);}
 float bay=W/max(1.,floor(W/5.2)),cx=(floor(uv.x/bay)+.5)*bay;c=frArch(c,uv-vec2(cx,H*.56),vec2(bay*.26,H*.25),.25);c=fpLayer(c,fpStroke(uv.y-H*.92,H*.016),vec3(.87,.82,.70),.95);return c;
}
`;
