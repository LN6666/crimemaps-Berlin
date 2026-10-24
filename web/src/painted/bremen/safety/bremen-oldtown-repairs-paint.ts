export const BREMEN_OLDTOWN_REPAIRS_GLSL=/*glsl*/`
float bor70Line(float x,float h){float a=max(fwidth(x),.008);return 1.-smoothstep(max(0.,h-a*.5),h+a*.5,abs(x));}
float bor70Rep(float x,float period,float h){float a=max(fwidth(x),.0001),d=abs(mod(x+period*.5,period)-period*.5);return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h/period,0.,1.),smoothstep(period*.18,period*.65,a));}
float bor70Box(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.01)),m=1.-smoothstep(h-a*.5,h+a*.5,abs(p-c));return m.x*m.y;}
float bor70Arch(vec2 p,float halfWidth,float spring,float rise,float bottom){float top=spring+rise*sqrt(max(0.,1.-p.x*p.x/(halfWidth*halfWidth)));float d=max(abs(p.x)-halfWidth,max(bottom-p.y,p.y-top));float a=max(fwidth(d),.012);return 1.-smoothstep(-a,a,d);}
vec3 bor70Brick(vec3 base,float u,float y,float pitch){float row=floor(y/pitch),joint=max(bor70Rep(y,pitch,.004),bor70Rep(u+mod(row,2.)*.125,.25,.004));float fine=1.-smoothstep(.07,.25,max(fwidth(u),fwidth(y)));float shade=(fract(sin(floor(u/.25)*6.1+row*17.2)*963.7)-.5)*.07*fine;return mix(base*(1.+shade),vec3(.46,.42,.36),joint*.32*fine);}
vec3 bor70Forum(vec3 base,vec4 f,float family){
 float u=f.x,y=f.y,pitch=1.39625,x=mod(u+pitch*.5,pitch)-pitch*.5;vec3 c=bor70Brick(vec3(.31,.29,.265),u,y,.075);
 if(family==46303.){
  float q=mod(u+1.68,3.36)-1.68,row=floor((y-.8)/3.55),v=mod(y-.8,3.55);float opening=bor70Box(vec2(q,v),vec2(0.,1.65),vec2(1.18,1.19));
  c=vec3(.86,.85,.79);vec3 glass=vec3(.32,.42,.45);float blind=step(.74,fract(sin(floor(u/3.36)*3.1+row*2.3)*43.7));glass=mix(glass,vec3(.68,.64,.41),blind*.88);
  c=mix(c,vec3(.42,.43,.39),bor70Box(vec2(q,v),vec2(0.,1.65),vec2(1.25,1.25)));c=mix(c,glass,opening);c=mix(c,vec3(.83,.85,.81),opening*bor70Line(q,.025));return mix(c,vec3(.39,.40,.37),1.-smoothstep(.65,.8,y));
 }
 if(family==46302.||family==46308.){
  // Historical vertical roof infill is slate/metal, not modern setback glazing.
  if(y>20.02){vec3 roof=vec3(.34,.35,.34);float seam=max(bor70Rep(u,.43,.010),bor70Rep(y,.27,.009));return roof*(1.-seam*.10);}
  float q=mod(u+1.78,3.56)-1.78;float v=mod(y-1.,4.65);c=vec3(.64,.59,.48)*(1.-.08*bor70Rep(y,.55,.009));
  float outline=bor70Arch(vec2(q,v),1.08,2.35,.72,.45),pane=bor70Arch(vec2(q,v),.91,2.35,.60,.61);c=mix(c,vec3(.76,.71,.60),outline);c=mix(c,vec3(.24,.30,.31),pane);
  c=mix(c,vec3(.66,.64,.55),pane*max(bor70Line(q,.035),bor70Line(v-1.5,.035)));c=mix(c,vec3(.64,.59,.48)*.76,max(bor70Rep(y-1.,4.65,.13),bor70Rep(y-1.22,4.65,.045)));return c;
 }
 if(family==46304.||y>20.45){
  // The two actual upper metal tiers have the same narrow bay cadence and pronounced curved spandrels.
  float v=mod(y-20.6,3.6);float pane=bor70Arch(vec2(x,v),.41,2.31,.15,.55);c=vec3(.76,.77,.73)*(1.-.12*bor70Rep(u,.11,.012));
  float top=.15*cos(x*6.283185/pitch);float band=bor70Box(vec2(x,v-top),vec2(0.,.21),vec2(pitch,.43));c=mix(c,vec3(.71,.72,.69)*(1.-.16*bor70Rep(u,.11,.012)),band);c=mix(c,vec3(.15,.19,.20),pane);return c;
 }
 // Five observed window registers. Nominal glass coverage is about34%, leaving deep brickwork visible.
 float row=floor((y-1.62)/3.94),v=mod(y-1.62,3.94);float bor70ActiveRows=step(0.,row)*step(row,4.);
 float reveal=bor70Arch(vec2(x,v),.49,2.12,.24,-.05)*bor70ActiveRows;
 float glass=bor70Arch(vec2(x,v),.40,2.12,.20,.03)*bor70ActiveRows;
 c=mix(c,bor70Brick(vec3(.145,.14,.13),u,y,.075),reveal);
 vec3 pane=vec3(.145,.195,.215);float topShadow=1.-smoothstep(1.90,2.28,v);pane*=.79+.21*topShadow;c=mix(c,pane,glass);
 float bronze=bor70Line(abs(x)-.402,.018)*glass;c=mix(c,vec3(.49,.47,.35),bronze);
 // Round brick cylinders are centred on the bay boundaries. Their curved shading is independent of the glass.
 float d=abs(abs(x)-pitch*.5),radius=.255;float cylinder=1.-smoothstep(radius-.02,radius+.02,d);
 float arc=sqrt(max(0.,1.-d*d/(radius*radius)));vec3 pier=bor70Brick(vec3(.365,.34,.30)*(.67+.43*arc),u,y,.075);c=mix(c,pier,cylinder);
 // The broad solid brick spandrel flows from the rounded jamb into a shallow wave; the coping is a narrow edge.
 float wave=.14*cos(x*6.283185/pitch),band=bor70Box(vec2(x,v-wave),vec2(0.,3.23),vec2(pitch,.60));
 vec3 spandrel=bor70Brick(vec3(.345,.32,.285)*(.88+.12*cos(x*6.283185/pitch)),u,y,.075);c=mix(c,spandrel,band);
 c=mix(c,vec3(.49,.465,.38),bor70Line(v-wave-3.82,.022));c=mix(c,vec3(.55,.53,.46),1.-smoothstep(.15,.24,y));
 if(family==46305.){
  // Photo-registered entrance spans the last9m next to the historical facade. Its centre is perimeter U28.76m.
  vec2 a=vec2(f.z,y);float portalField=bor70Box(a,vec2(0.,4.45),vec2(4.65,4.55));c=mix(c,bor70Brick(vec3(.29,.27,.24),u,y,.075),portalField);
  float outer=bor70Arch(a,4.45,3.40,5.35,0.),inner=bor70Arch(a,3.72,3.40,4.70,0.);
  float rad=length(vec2(a.x,(a.y-3.40)*4.45/5.35));float rings=bor70Rep(rad,.22,.024)*step(3.40,y);c=mix(c,vec3(.13,.135,.12),rings*max(0.,outer-inner)*.67);
  c=mix(c,vec3(.065,.078,.071),inner);float gate=max(bor70Rep(f.z,.24,.016),bor70Line(y-3.15,.030));c=mix(c,vec3(.19,.20,.17),gate*inner*.65);
 }
 return c;
}
vec3 bor70Landgericht(vec3 base,vec4 f,float family){
 float u=f.x,y=f.y,pitch=4.35,q=mod(u+pitch*.5,pitch)-pitch*.5;vec3 stone=vec3(.69,.65,.53),darkStone=vec3(.40,.39,.33),glass=vec3(.235,.29,.285);vec3 c=bor70Brick(base,u,y,.082);
 if(family==46354.||family==46353.){
  // Buchtstrasse former prison/courtyard wings retain lighter brick and restrained openings.
  float v=mod(y-1.,3.85);float opening=bor70Arch(vec2(q,v),.65,2.45,.42,.7);c=mix(c,stone,bor70Arch(vec2(q,v),.76,2.45,.51,.59));c=mix(c,glass,opening);float bars=max(bor70Rep(q,.30,.019),bor70Line(v-1.64,.025));c=mix(c,vec3(.38,.39,.34),bars*opening);c=mix(c,base*.76,bor70Rep(y,3.85,.11));return c;
 }
 // Red brick street wings alternate with golden-brick round towers; sandstone bands tie the block together.
 if(family==46352.){float belt=max(bor70Rep(y-2.1,4.6,.18),bor70Rep(y-2.47,4.6,.045));c=mix(c,darkStone,belt);float diamonds=bor70Line(abs(q)-abs(mod(y+1.2,4.6)-2.3)*.9,.045)*step(16.5,y)*step(y,20.5);c=mix(c,stone,diamonds*.65);}
 float pier=1.-smoothstep(.30,.44,abs(abs(q)-pitch*.5));float ashlar=max(bor70Rep(y,.64,.014),bor70Line(abs(q)-pitch*.5,.23));c=mix(c,stone*(1.-.10*ashlar),pier);
 // Ashlar ground storey and base; upper floors contain red panels, cross casements and paired arched heads.
 c=mix(c,mix(vec3(.50,.48,.39),vec3(.64,.60,.49),step(.52,fract(y/.65))),1.-smoothstep(5.8,6.0,y));
 float lower=bor70Arch(vec2(q,y),.92,3.85,.68,1.6),lowerTrim=bor70Arch(vec2(q,y),1.08,3.85,.83,1.43);c=mix(c,stone,lowerTrim);c=mix(c,glass,lower);
 float mid=bor70Box(vec2(q,y),vec2(0.,8.60),vec2(1.02,1.55)),midTrim=bor70Box(vec2(q,y),vec2(0.,8.60),vec2(1.16,1.68));c=mix(c,stone,midTrim);c=mix(c,glass,mid);
 // Carved segmental pediment above each middle-storey bay; low-frequency relief only.
 float ped=bor70Arch(vec2(q,y-10.35),1.22,.10,.70,0.)-bor70Arch(vec2(q,y-10.35),1.06,.10,.48,.12);c=mix(c,stone*.93,max(0.,ped));
 float upperOuter=bor70Arch(vec2(q,y),1.28,15.4,1.08,12.0);c=mix(c,stone,upperOuter);
 float left=bor70Arch(vec2(q+.55,y),.46,15.25,.65,12.2),right=bor70Arch(vec2(q-.55,y),.46,15.25,.65,12.2),upper=max(left,right);c=mix(c,glass,upper);
 float roundel=1.-smoothstep(.25,.32,length(vec2(q,(y-16.22)*1.08)));c=mix(c,vec3(.30,.34,.31),roundel);
 float bars=max(bor70Line(q,.043),max(bor70Line(y-3.15,.036),max(bor70Line(y-8.35,.045),bor70Line(y-13.45,.045))));c=mix(c,vec3(.49,.44,.31),max(max(lower,mid),upper)*bars);
 float course=max(bor70Line(y-5.8,.13),max(bor70Line(y-11.4,.12),bor70Line(y-17.35,.20)));c=mix(c,stone*.89,course);float balustrade=bor70Box(vec2(q,y),vec2(0.,6.1),vec2(1.32,.32));c=mix(c,mix(stone,vec3(.32,.31,.25),bor70Rep(q,.35,.065)),balustrade);
 // The four-bay ceremonial loggia has round ground arches; it is restricted to the west main-front carriers.
 if(family==46352.&&abs(f.z)<8.7&&y<5.6){float aq=mod(f.z,4.35)-2.175;float arcade=bor70Arch(vec2(aq,y),1.55,2.9,1.50,.35);float trim=bor70Arch(vec2(aq,y),1.74,2.9,1.65,.20);c=mix(c,stone,trim);c=mix(c,vec3(.105,.115,.10),arcade);}
 // Decorative cornice arcade below the real official eaves; no windows are painted onto any roof.
 float arcade=bor70Arch(vec2(mod(u+.38,.76)-.38,y-17.75),.22,.30,.22,0.);c=mix(c,vec3(.32,.30,.24),arcade*.7);return c;
}
vec3 infillBremenOldtownRepairsPaint(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family<46299.5||family>46399.5)return base;
 if(family==46301.||family==46351.){float close=1.-smoothstep(.25,.7,max(fwidth(p.x),fwidth(p.z)));float seam=max(bor70Rep(p.x+p.z*.18,.40,.012),bor70Rep(p.z,.24,.009));return base*(1.-seam*.095*close);}
 if(family==46306.){float joints=max(bor70Rep(p.x,2.4,.012),bor70Rep(p.z,2.4,.012));return base*(1.-joints*.10);}
 if(family==46307.||family==46357.)return base;
 return family<46349.5?bor70Forum(base,f,family):bor70Landgericht(base,f,family);
}
`;
