/** Selected Reichstag MD composition on existing native/dedicated surfaces only. */
export const REICHSTAG_FACADE_GLSL=`
vec3 rrStone(vec3 base,vec2 uv){vec3 c=mix(base,vec3(.73,.70,.61),.66);float y=fpRepeatStroke(uv.y,.58,.021),x=fpRepeatStroke(uv.x+mod(floor(uv.y/.58),2.)*1.1,2.2,.018);c=fpLayer(c,max(x,y),vec3(.43,.42,.36),.28);return fpLayer(c,fpRepeatStroke(uv.y+.045,.58,.013),vec3(.88,.84,.73),.30);}
vec3 rrBand(vec3 c,vec2 uv){for(int k=0;k<3;k++){float y=k==0?3.65:k==1?15.42:19.23;c=fpLayer(c,fpStroke(uv.y-y,k==0?.18:.11),vec3(.84,.80,.69),.90);c=fpLayer(c,fpStroke(uv.y-y-.23,.045),vec3(.38,.37,.32),.66);}return c;}
vec3 rrWing(vec3 c,vec2 uv,float W){float bay=W/5.,x=(floor(uv.x/bay)+.5)*bay;c=foHallArch(c,uv-vec2(x,9.05),vec2(min(1.55,bay*.28),4.5),.42);c=foRomanAedicule(c,uv-vec2(x,17.25),vec2(min(1.22,bay*.23),1.35),0.);float pier=fpRepeatStroke(uv.x,bay,.15)*foRect(uv-vec2(uv.x,10.),vec2(1.,6.2));c=fpLayer(c,pier,vec3(.84,.79,.67),.64);if(uv.y<3.3)c=foRectCasement(c,uv-vec2(x,1.75),vec2(.65,.73),0.);return rrBand(c,uv);}
vec3 rrTower(vec3 c,vec2 uv,float W){if(uv.x<0.||uv.x>W)return c;if(uv.y<11.){c=foRomanAedicule(c,uv-vec2(W*.5,7.5),vec2(min(1.65,W*.22),2.7),0.);return rrBand(c,uv);}if(uv.y>21.13)return c;c=foHallArch(c,uv-vec2(W*.5,15.45),vec2(W*.29,4.05),.42);return c;}
// Elevation-specific compositions share continuous paint UV across central facets.
vec3 rrQuiet(vec3 c,vec2 uv,float W,float family,vec3 normal){
 bool east=family==203.&&normal.x>.9&&abs(W-27.54100927)<.01;
 bool side=family==203.&&abs(normal.z)>.9&&W>17.7&&W<18.2;
 if(east){float bay=W/3.,x=(floor(uv.x/bay)+.5)*bay;
 c=foEntranceArcade(c,uv-vec2(x,6.9),vec2(bay*.35,6.9),0.);
 for(int j=0;j<3;j++)c=foRectCasement(c,uv-vec2(x+(float(j)-1.)*1.4,17.3),vec2(.48,2.0),.1);
 for(int i=0;i<4;i++)c=foOrderColumn(c,uv-vec2(clamp(float(i)*bay,.52,W-.52),11.2),7.7,.43,1.);
 return rrBand(c,uv);}
 if(side){c=foEntranceArcade(c,uv-vec2(W*.5,5.0),vec2(2.0,5.0),1.);
 for(int i=0;i<3;i++)c=foRectCasement(c,uv-vec2(W*(.32+float(i)*.18),16.3),vec2(.85,2.4),.2);
 for(int i=0;i<4;i++)c=foOrderColumn(c,uv-vec2(W*(.19+float(i)*.205),11.5),7.0,.38,1.);
 vec2 q=uv-vec2(W*.5,20.0);float outer=foTriangle(q,W*.49,4.7),inner=foTriangle(q+vec2(0.,.14),W*.45,4.1);
 c=fpLayer(c,outer,vec3(.77,.74,.65),.95);c=fpLayer(c,max(0.,outer-inner),vec3(.90,.85,.74),.95);return rrBand(c,uv);}
 float count=family==203.&&normal.x>.9&&W>26.?5.:max(1.,floor(W/4.1)),bay=W/count,x=(floor(uv.x/bay)+.5)*bay;
 c=foRectCasement(c,uv-vec2(x,2.0),vec2(min(.72,bay*.2),.95),0.);
 c=foRectCasement(c,uv-vec2(x,6.25),vec2(min(.85,bay*.22),1.1),.1);
 c=foRectCasement(c,uv-vec2(x,10.15),vec2(min(.85,bay*.22),1.1),.1);
 c=foRomanAedicule(c,uv-vec2(x,16.8),vec2(min(1.0,bay*.25),1.7),0.);
 if(family==203.)c=foOrderColumn(c,uv-vec2(round(uv.x/bay)*bay,11.5),7.0,.31,1.);
 return rrBand(c,uv);
}
vec3 rrEastCorner(vec3 c,vec2 uv,float W){
 c=foHallArch(c,uv-vec2(W*.5,16.1),vec2(W*.27,4.2),.45);
 c=foEntranceArcade(c,uv-vec2(W*.5,6.4),vec2(1.65,3.8),1.);
 vec2 q=uv-vec2(W*.5,11.1);float outer=foTriangle(q,2.4,2.0),inner=foTriangle(q+vec2(0.,.12),2.05,1.6);
 c=fpLayer(c,outer,vec3(.74,.70,.60),.96);c=fpLayer(c,max(0.,outer-inner),vec3(.90,.84,.72),.95);
 for(int i=0;i<2;i++)c=foOrderColumn(c,uv-vec2(i==0?W*.12:W*.88,11.6),7.5,.43,1.);
 return rrBand(c,uv);
}
float rrRoofBox(vec2 uv,vec4 b){return foRect(uv-(b.xy+b.zw)*.5,(b.zw-b.xy)*.5);}
vec3 rrRoof(vec2 uv){vec3 c=vec3(.73,.73,.67);float glass=0.;
 // Independent glazing fields border the two original court holes and flank the dome.
 for(int i=0;i<2;i++){float u=i==0?11.:76.;for(int j=0;j<2;j++){float v=j==0?22.:88.;glass=max(glass,rrRoofBox(uv,vec4(u,v,u+17.,v+28.)));}}
 glass=max(glass,rrRoofBox(uv,vec4(26.,7.,78.,21.)));glass=max(glass,rrRoofBox(uv,vec4(26.,118.,78.,132.)));
 glass=max(glass,rrRoofBox(uv,vec4(10.,51.,30.,85.)));glass=max(glass,rrRoofBox(uv,vec4(74.,51.,94.,85.)));
 c=fpLayer(c,max(fpRepeatStroke(uv.x,2.4,.024),fpRepeatStroke(uv.y,3.6,.025)),vec3(.47,.49,.47),.28);
 c=fpLayer(c,glass,mix(vec3(.25,.44,.50),vec3(.60,.76,.75),.5+.25*sin(uv.x*.18+uv.y*.09)),.96);
 float grid=max(fpRepeatStroke(uv.x,1.6,.045),fpRepeatStroke(uv.y,2.8,.055));
 c=fpLayer(c,grid*glass,vec3(.79,.80,.70),.92);return c;}
vec3 rrDome(vec2 uv,float H,vec3 normal){float angle=uv.x*6.2831853,y=clamp(uv.y/H,0.,1.);vec3 c=mix(vec3(.30,.42,.46),vec3(.67,.77,.79),y);float reflection=.5+.5*sin(angle*2.+y*3.);c=mix(c,vec3(.76,.82,.81),reflection*.18);c=mix(vec3(.21,.26,.27),c,smoothstep(4./17.-.01,4./17.+.01,y));float ramp=max(fpRepeatStroke(y-uv.x*.5,.5,.004),fpRepeatStroke(y+uv.x*.5,.5,.004))*step(4./17.,y);c=fpLayer(c,ramp,vec3(.30,.36,.36),.12);float ribs=fpRepeatStroke(uv.x,1./24.,.0010),rings=fpRepeatStroke(y,1./17.,.0038);c=fpLayer(c,max(ribs,rings),vec3(.72,.75,.73),.94);c=fpLayer(c,fpRepeatStroke(uv.x+.002,1./24.,.0007),vec3(.25,.29,.29),.67);float vents=step(y,4./17.)*fpRepeatStroke(y,1./17.,.006);c=fpLayer(c,vents,vec3(.38,.43,.44),.62);float opening=smoothstep(.977,.99,y)*step(.45,normal.y);return fpLayer(c,opening,vec3(.17,.23,.24),.93);}
vec3 rrCrown(vec3 c,vec2 uv,float W,float H){if(uv.x<0.||uv.x>W||uv.y<0.||uv.y>H)return c;float bay=W/3.,x=(floor(uv.x/bay)+.5)*bay;c=foHallArch(c,uv-vec2(x,H*.52),vec2(bay*.27,H*.29),.22);float px=round(uv.x/bay)*bay;c=foOrderColumn(c,uv-vec2(px,H*.50),H*.35,.20,0.);c=fpLayer(c,fpStroke(uv.y-H*.90,.19),vec3(.84,.80,.68),.94);return fpLayer(c,fpStroke(uv.y-H*.94,.06),vec3(.39,.39,.33),.76);}
vec3 rrPortal(vec3 base,vec2 uv,float W){vec3 c=rrStone(base,uv);float glass=foRect(uv-vec2(W*.5,9.3),vec2(W*.44,6.0));c=fpLayer(c,glass,vec3(.21,.29,.31),.96);float transom=max(fpRepeatStroke(uv.x,4.0,.037),fpRepeatStroke(uv.y,3.2,.033))*glass;c=fpLayer(c,transom,vec3(.54,.59,.58),.60);const float columnU[6]=float[6](27.203963,21.923882,16.653845,11.373808,6.093727,0.813690);for(int i=0;i<6;i++)c=foOrderColumn(c,uv-vec2(columnU[i],9.6),6.25,.94,1.);c=fpLayer(c,fpStroke(uv.y-16.25,.16),vec3(.83,.78,.66),.95);if(uv.y>17.8){vec2 q=uv-vec2(W*.5,20.25);float outer=foTriangle(q,W*.47,4.6),inner=foTriangle(q+vec2(0.,.14),W*.435,4.08);c=fpLayer(c,outer,vec3(.77,.73,.63),.83);c=fpLayer(c,max(0.,outer-inner),vec3(.90,.84,.70),.90);c=fpLayer(c,fpStroke(uv.y-18.0,.11)*step(abs(uv.x-W*.5),W*.48),vec3(.37,.37,.32),.72);}return c;}
vec3 rrPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){vec2 uv=frame.xy;float H=frame.z,W=frame.w;if(family==210.)return rrCrown(rrStone(base,uv),uv,W,H);if(family==211.)return frame.w<1.5?mix(base,vec3(.46,.57,.59),.64):base;if(family==209.)return rrDome(uv,H,normal);if(family==207.){vec3 c=mix(base,vec3(.30,.43,.47),.38);return fpLayer(c,max(fpRepeatStroke(uv.x,1.25,.023),fpRepeatStroke(uv.y,1.9,.022)),vec3(.65,.68,.65),.65);}if(family==206.)return mix(base,vec3(.31,.34,.28),.45);if(family==208.)return rrRoof(uv);if(family==202.)return rrPortal(base,uv,W);vec3 c=rrStone(base,uv);if(family==205.||uv.y<0.||uv.y>H||W<2.)return c;if(family==203.&&normal.x>.9&&W>12.3&&W<12.5)return rrEastCorner(c,uv,W);if(family==200.)return rrWing(c,uv,W);if(family==201.)return rrTower(c,uv,W);return rrQuiet(c,uv,W,family,normal);}
`;
