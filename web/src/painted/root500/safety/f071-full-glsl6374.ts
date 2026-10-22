/** F071: source-bound roof supplements and directly photographed visible elevations. */
export const F071_FULL_GLSL6374=String.raw`
float f071HeightLegacyRect71(vec2 q,vec2 c,vec2 h){vec2 a=max(fwidth(q),vec2(.0012));vec2 m=1.-smoothstep(h-a,h+a,abs(q-c));return m.x*m.y;}
float f071HeightLegacyArch71(vec2 q,vec2 c,float r,float spring,float bottom){float a=max(fwidth(q.x),.0012);float x=abs(q.x-c.x);float top=spring+sqrt(max(0.,r*r-x*x));return (1.-smoothstep(r-a,r+a,x))*smoothstep(bottom-a,bottom+a,q.y)*(1.-smoothstep(top-a,top+a,q.y));}
vec3 f071HeightLegacyNationalmuseum(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family!=4964.&&family!=4965.)return base;
 vec2 q=vec2(frame.x/frame.w,frame.y/frame.z);vec3 stone=vec3(.72,.70,.63),joint=vec3(.56,.55,.50),dark=vec3(.105,.125,.12),edge=vec3(.55,.54,.48);
 // The entire selected museum is a uniform default7.5m shell. Facade stage proportions are photo-estimated, not real storey heights.
 float course=1.-smoothstep(.015,.035,abs(fract(q.y*29.)-.5));float stagger=mod(floor(q.y*29.),2.)*.5;float vertical=1.-smoothstep(.015,.035,abs(fract(frame.x/1.1+stagger)-.5));vec3 c=mix(stone,joint,.22*max(course,vertical));
 if(family==4964.){
  // Paired source64/65 share one common metric U frame; no seam resets the five-axis composition.
  for(int k=0;k<3;k++){float y=k==0?.205:(k==1?.58:.745);c=mix(c,stone*1.10,f071HeightLegacyRect71(q,vec2(.5,y),vec2(.50,.013)));c=mix(c,edge,f071HeightLegacyRect71(q,vec2(.5,y-.018),vec2(.5,.003)));}
  for(int j=0;j<5;j++){
   float x=.10+float(j)*.20;
   c=mix(c,stone*.90,f071HeightLegacyRect71(q,vec2(x,.40),vec2(.063,.151)));
   c=mix(c,dark,f071HeightLegacyRect71(q,vec2(x,.40),vec2(.046,.126)));
   c=mix(c,stone*.85,f071HeightLegacyRect71(q,vec2(x,.40),vec2(.003,.126)));
   c=mix(c,stone*.85,f071HeightLegacyRect71(q,vec2(x,.40),vec2(.046,.004)));
   c=mix(c,stone*.90,f071HeightLegacyRect71(q,vec2(x,.663),vec2(.062,.061)));
   c=mix(c,dark,f071HeightLegacyRect71(q,vec2(x,.663),vec2(.043,.043)));
   c=mix(c,stone*.85,f071HeightLegacyRect71(q,vec2(x,.663),vec2(.003,.043)));
  }
  for(int j=0;j<6;j++){float x=float(j)*.20;c=mix(c,stone*1.05,f071HeightLegacyRect71(q,vec2(x,.47),vec2(.012,.24)));c=mix(c,edge,f071HeightLegacyRect71(q,vec2(x+.015,.47),vec2(.003,.24)));}
  for(int j=0;j<2;j++){
   float x=j==0?.255:.745;float outer=f071HeightLegacyArch71(q,vec2(x,0.),.092,.115,.008);float inner=f071HeightLegacyArch71(q,vec2(x,0.),.066,.115,.01);c=mix(c,stone*.90,outer);c=mix(c,dark,inner);
   // Fine radial joints describe masonry only; they do not create an opening or a new arch carrier.
   vec2 d=q-vec2(x,.115);float radial=step(.93,fract((atan(d.y,d.x)+3.141593)*7.));c=mix(c,edge,outer*(1.-inner)*radial*.35);
  }
  for(int j=0;j<3;j++){float x=.20+float(j)*.30;float outer=f071HeightLegacyArch71(q,vec2(x,0.),.106,.875,.77);float inner=f071HeightLegacyArch71(q,vec2(x,0.),.078,.875,.78);c=mix(c,stone*.96,outer);c=mix(c,dark*.85,inner);}
 }else{
  // Two individually registered polygon facets of the attached eastern bay; other facets and cupola remain neutral.
  for(int j=0;j<3;j++){float y=.18+float(j)*.25;c=mix(c,stone*.94,f071HeightLegacyRect71(q,vec2(.5,y),vec2(.31,.107)));c=mix(c,dark,f071HeightLegacyRect71(q,vec2(.5,y),vec2(.23,.084)));c=mix(c,stone*.85,f071HeightLegacyRect71(q,vec2(.5,y),vec2(.014,.084)));}
  for(int j=0;j<4;j++){float y=.055+float(j)*.25;c=mix(c,stone*1.06,f071HeightLegacyRect71(q,vec2(.5,y),vec2(.5,.012)));}
  if(normal.z<-.8){float d=length((q-vec2(.5,.89))/vec2(.14,.055));c=mix(c,stone*.87,1.-smoothstep(1.,1.08,d));c=mix(c,dark,1.-smoothstep(.70,.78,d));}
  c=mix(c,stone*1.03,max(f071HeightLegacyRect71(q,vec2(.035,.5),vec2(.035,.49)),f071HeightLegacyRect71(q,vec2(.965,.5),vec2(.035,.49))));
 }
 return c;
}

float bnmBox071(vec2 q,vec2 h){return 1.0-smoothstep(0.0,.035,max(abs(q.x)-h.x,abs(q.y)-h.y));}
float bnmArch071(vec2 q,float w,float h){float r=w;float d=max(abs(q.x)-w,max(-q.y,q.y-(h-r)));if(q.y>h-r)d=max(abs(q.x)-w,length(vec2(q.x,q.y-h+r))-r);return 1.0-smoothstep(0.,.035,d);}
vec3 bnmWindow071(vec3 c,vec2 q,float w,float h,float arched){float outer=mix(bnmBox071(q-vec2(0.,h*.5),vec2(w+.10,h*.5+.10)),bnmArch071(q+vec2(0.,.08),w+.10,h+.18),arched);float inner=mix(bnmBox071(q-vec2(0.,h*.5),vec2(w,h*.5)),bnmArch071(q,w,h),arched);c=mix(c,vec3(.88,.86,.76),outer);vec3 glass=mix(vec3(.14,.19,.20),vec3(.25,.32,.34),clamp(q.y/h,0.,1.));float bars=1.-smoothstep(.025,.045,min(abs(q.x),abs(fract(q.y/.35+.5)-.5)*.35));glass=mix(glass,vec3(.38,.36,.29),bars);return mix(c,glass,inner);}

//443: bounded north-court domains, direct Google3D user views. Counts/heights are photo estimates.
vec3 bnmCourtSmallWindow443(vec3 c,vec2 q,float hw,float hh){
 float outer=bnmBox071(q,vec2(hw+.09,hh+.075));
 float inner=bnmBox071(q,vec2(hw,hh));
 c=mix(c,vec3(.89,.88,.81),outer);
 vec3 glass=mix(vec3(.12,.17,.17),vec3(.22,.28,.28),clamp(q.y/(hh*2.)+.5,0.,1.));
 float bars=max(bnmBox071(q,vec2(.025,hh)),bnmBox071(q,vec2(hw,.025)));
 glass=mix(glass,vec3(.83,.83,.77),bars);
 return mix(c,glass,inner);
}

vec3 nationalmuseumWhole071(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family==4964.||family==4965.)return f071HeightLegacyNationalmuseum(base,p,normal,frame,family);
 float role=floor(frame.w+.0001);p.y=(role==0.||role>=40.)?p.y*(7.5/13.5):p.y-6.;vec3 stone=vec3(.79,.78,.70);float weather=.012*sin(p.x*1.7+p.y*.8)*sin(p.z*2.1);stone+=weather;
 if(role==31.){vec2 q=vec2(frame.x,p.y-frame.y);vec3 c=vec3(.80,.78,.68);return bnmWindow071(c,q-vec2(0.,.15),.40,1.05,0.);}
 if(role==10.){vec2 uv=p.xz;float row=floor(uv.y/.31);float mortar=1.-smoothstep(.015,.035,min(abs(fract(uv.y/.31)-.5)*.31,abs(fract(uv.x/.22+mod(row,2.)*.5)-.5)*.22));vec3 c=vec3(.61,.265,.135)+.022*sin(uv.x*2.4)*sin(uv.y*3.1);c=mix(c,vec3(.36,.24,.17),mortar*.28);float flatRoofMask=step(0.,dot(p.xz,vec2(-7.875194250,-28.948687773))+863.547498104)*step(0.,dot(p.xz,vec2(-7.159267500,4.342303166))+433.846263048)*step(0.,dot(p.xz,vec2(8.018379600,27.822905471))+-626.313729406)*step(0.,dot(p.xz,vec2(7.016082150,-3.216520864))+-208.633075552);return mix(c,vec3(.48,.49,.44),flatRoofMask);}
 if(role==11.){float grid=1.-smoothstep(.025,.055,min(abs(fract(p.x/.85)-.5)*.85,abs(fract(p.z/.85)-.5)*.85));return mix(vec3(.29,.44,.45),vec3(.58,.61,.56),grid);}
 if(role==21.){float seam=1.-smoothstep(.015,.04,abs(fract((p.x+p.z)/.55)-.5)*.55);return mix(vec3(.28,.47,.39)+.024*sin(p.y*4.),vec3(.19,.34,.29),seam*.55);}
 if(role==22.){vec3 c=vec3(.77,.76,.65);float gap=bnmBox071(vec2(frame.z,p.y-(p.y>32.?34.2:28.7)),vec2(.38,p.y>32.?.66:1.7));return mix(c,vec3(.13,.18,.16),gap);}
 if(role==20.){vec3 c=stone;float u=frame.z;float band=1.-smoothstep(.07,.12,min(abs(p.y-12.),min(abs(p.y-19.8),abs(p.y-21.6))));c=mix(c,vec3(.88,.85,.72),band);c=bnmWindow071(c,vec2(u,p.y-13.2),.48,2.4,1.);vec2 q=vec2(u,p.y-20.5);float r=length(q);c=mix(c,vec3(.60,.54,.36),1.-smoothstep(1.3,1.4,r));c=mix(c,vec3(.12,.17,.15),1.-smoothstep(1.15,1.23,r));float hands=max(bnmBox071(q-vec2(.0,.34),vec2(.028,.37)),bnmBox071(vec2(q.x*.8-q.y*.6,q.x*.6+q.y*.8)-vec2(0.,.28),vec2(.025,.3)));c=mix(c,vec3(.87,.74,.30),hands*(1.-step(1.1,r)));return c;}
 if(role==30.){vec3 c=stone;float edge=1.-smoothstep(.06,.13,abs(p.y-7.65));c=mix(c,vec3(.90,.87,.75),edge);return c;}
 vec3 c=stone;float band=1.-smoothstep(.04,.09,min(abs(p.y-.55),min(abs(p.y-3.0),abs(p.y-7.35))));c=mix(c,vec3(.88,.86,.76),band*.60);
 float n=floor(fract(frame.w)*1000.+.5);float ux=(fract(clamp(frame.z,0.,.99999)*max(1.,n))-.5);

 if(role==56.){
  float U=clamp(frame.z,0.,1.);
  {float qx=(U-0.140000)*17.772984572;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.50),.61,.69);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-4.33),.61,.75);}
  {float qx=(U-0.380000)*17.772984572;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.50),.61,.69);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-4.33),.61,.75);}
  {float qx=(U-0.620000)*17.772984572;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.50),.61,.69);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-4.33),.61,.75);}
  {float qx=(U-0.860000)*17.772984572;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.50),.61,.69);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-4.33),.61,.75);}
  return c;
 }

 if(role==57.){
  float U=clamp(frame.z,0.,1.);
  {float qx=(U-0.070000)*43.363022139;c=bnmWindow071(c,vec2(qx,p.y-.65),.91,2.65,1.);c=bnmWindow071(c,vec2(qx-.46,p.y-4.55),.32,1.80,0.);c=bnmWindow071(c,vec2(qx+.46,p.y-4.55),.32,1.80,0.);}
  {float qx=(U-0.190000)*43.363022139;c=bnmWindow071(c,vec2(qx,p.y-.65),.91,2.65,1.);c=bnmWindow071(c,vec2(qx-.46,p.y-4.55),.32,1.80,0.);c=bnmWindow071(c,vec2(qx+.46,p.y-4.55),.32,1.80,0.);}
  {float qx=(U-0.310000)*43.363022139;c=bnmWindow071(c,vec2(qx,p.y-.65),.91,2.65,1.);c=bnmWindow071(c,vec2(qx-.46,p.y-4.55),.32,1.80,0.);c=bnmWindow071(c,vec2(qx+.46,p.y-4.55),.32,1.80,0.);}
  {float qx=(U-0.430000)*43.363022139;c=bnmWindow071(c,vec2(qx,p.y-.65),.91,2.65,1.);c=bnmWindow071(c,vec2(qx-.46,p.y-4.55),.32,1.80,0.);c=bnmWindow071(c,vec2(qx+.46,p.y-4.55),.32,1.80,0.);}
  {float qx=(U-0.570000)*43.363022139;c=bnmWindow071(c,vec2(qx,p.y-.65),.91,2.65,1.);c=bnmWindow071(c,vec2(qx-.46,p.y-4.55),.32,1.80,0.);c=bnmWindow071(c,vec2(qx+.46,p.y-4.55),.32,1.80,0.);}
  {float qx=(U-0.690000)*43.363022139;c=bnmWindow071(c,vec2(qx,p.y-.65),.91,2.65,1.);c=bnmWindow071(c,vec2(qx-.46,p.y-4.55),.32,1.80,0.);c=bnmWindow071(c,vec2(qx+.46,p.y-4.55),.32,1.80,0.);}
  {float qx=(U-0.810000)*43.363022139;c=bnmWindow071(c,vec2(qx,p.y-.65),.91,2.65,1.);c=bnmWindow071(c,vec2(qx-.46,p.y-4.55),.32,1.80,0.);c=bnmWindow071(c,vec2(qx+.46,p.y-4.55),.32,1.80,0.);}
  {float qx=(U-0.930000)*43.363022139;c=bnmWindow071(c,vec2(qx,p.y-.65),.91,2.65,1.);c=bnmWindow071(c,vec2(qx-.46,p.y-4.55),.32,1.80,0.);c=bnmWindow071(c,vec2(qx+.46,p.y-4.55),.32,1.80,0.);}
  // Central axis stays masonry; no arbitrary ninth bay at U=.5.
  float cornice=bnmBox071(vec2(0.,p.y-4.1),vec2(1.,.07));c=mix(c,vec3(.88,.85,.75),cornice);
  return c;
 }

 if(role==58.){
  float U=clamp(frame.z,0.,1.);
  {float qx=(U-0.140000)*17.572995246;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.50),.61,.69);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-4.33),.61,.75);}
  {float qx=(U-0.380000)*17.572995246;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.50),.61,.69);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-4.33),.61,.75);}
  {float qx=(U-0.620000)*17.572995246;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.50),.61,.69);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-4.33),.61,.75);}
  {float qx=(U-0.860000)*17.572995246;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.50),.61,.69);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-4.33),.61,.75);}
  return c;
 }

 if(role==59.){
  float U=clamp(frame.z,0.,1.);
  // Lower north street-wing court face: smaller white-framed rectangular windows in two rows.
  c=vec3(.73,.69,.59)+weather;
  {float qx=(U-0.055000)*43.286532047;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.65),.48,.52);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-5.55),.48,.52);}
  {float qx=(U-0.144000)*43.286532047;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.65),.48,.52);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-5.55),.48,.52);}
  {float qx=(U-0.233000)*43.286532047;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.65),.48,.52);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-5.55),.48,.52);}
  {float qx=(U-0.322000)*43.286532047;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.65),.48,.52);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-5.55),.48,.52);}
  {float qx=(U-0.411000)*43.286532047;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.65),.48,.52);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-5.55),.48,.52);}
  {float qx=(U-0.500000)*43.286532047;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.65),.48,.52);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-5.55),.48,.52);}
  {float qx=(U-0.589000)*43.286532047;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.65),.48,.52);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-5.55),.48,.52);}
  {float qx=(U-0.678000)*43.286532047;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.65),.48,.52);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-5.55),.48,.52);}
  {float qx=(U-0.767000)*43.286532047;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.65),.48,.52);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-5.55),.48,.52);}
  {float qx=(U-0.856000)*43.286532047;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.65),.48,.52);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-5.55),.48,.52);}
  {float qx=(U-0.945000)*43.286532047;c=bnmCourtSmallWindow443(c,vec2(qx,p.y-1.65),.48,.52);c=bnmCourtSmallWindow443(c,vec2(qx,p.y-5.55),.48,.52);}
  return c;
 }

 //442: individually registered missing window groups, continuous U over round and stepped native walls.
 if(role==50.||role==54.){float qx=ux*(role==54.?4.1:4.4);c=bnmWindow071(c,vec2(qx,p.y-.20),.52,.65,0.);c=bnmWindow071(c,vec2(qx,p.y-1.35),.88,4.35,role==54.?1.:0.);float sill=bnmBox071(vec2(qx,p.y-1.26),vec2(1.05,.09));c=mix(c,vec3(.87,.84,.73),sill);}
 if(role==51.){float qx=ux*2.7;c=bnmWindow071(c,vec2(qx,p.y-4.65),.42,1.5,0.);float lower=(fract(clamp(frame.z,0.,.99999)*2.)-.5)*6.2;c=bnmWindow071(c,vec2(lower,p.y-1.05),1.30,2.45,1.);c=bnmWindow071(c,vec2(lower,p.y-.15),.45,.55,0.);}
 if(role==52.){float qx=ux*3.65;c=bnmWindow071(c,vec2(qx,p.y-.20),.52,.60,0.);c=bnmWindow071(c,vec2(qx,p.y-1.25),.80,2.70,1.);c=bnmWindow071(c,vec2(qx,p.y-4.75),.48,1.55,0.);}
 if(role==53.){float qx=ux*3.65;c=bnmWindow071(c,vec2(qx,p.y-4.60),.45,1.5,0.);float lower=(fract(clamp(frame.z,0.,.99999)*3.)-.5)*5.9;c=bnmWindow071(c,vec2(lower,p.y-.55),.95,2.60,1.);}
 if(role==55.){float qx=ux*4.25;c=bnmWindow071(c,vec2(qx,p.y-.85),.43,1.30,0.);c=bnmWindow071(c,vec2(qx,p.y-3.20),.43,1.40,0.);c=bnmWindow071(c,vec2(qx,p.y-5.40),.48,1.50,1.);}
//443: Eastern enclosed Kanonenhof. Photo-estimated individual wall schedules; not a copied whole-building grid.
// Insert after role55 branch, before existing role40 branch in nationalmuseumWhole071.
 if(role==60.){
  {float qx=(frame.z-0.18000000)*10.203089705;
   c=bnmWindow071(c,vec2(qx,p.y-.48),.68,2.18,1.);
   c=bnmWindow071(c,vec2(qx,p.y-3.22),.56,3.02,0.);
  }
  {float qx=(frame.z-0.50000000)*10.203089705;
   c=bnmWindow071(c,vec2(qx,p.y-.48),.68,2.18,1.);
   c=bnmWindow071(c,vec2(qx,p.y-3.22),.56,3.02,0.);
  }
  {float qx=(frame.z-0.82000000)*10.203089705;
   c=bnmWindow071(c,vec2(qx,p.y-.48),.68,2.18,1.);
   c=bnmWindow071(c,vec2(qx,p.y-3.22),.56,3.02,0.);
  }
 }
 if(role==61.){
  {float qx=(frame.z-0.50000000)*3.231562092;
   c=bnmWindow071(c,vec2(qx,p.y-3.28),.38,2.65,0.);
  }
 }
 if(role==62.){
  {float qx=(frame.z-0.50000000)*4.642642247;
   c=bnmWindow071(c,vec2(qx,p.y-.48),.68,2.18,1.);
   c=bnmWindow071(c,vec2(qx,p.y-3.22),.56,3.02,0.);
  }
 }
 if(role==63.){
  {float qx=(frame.z-0.50000000)*6.242291761;
   c=bnmWindow071(c,vec2(qx,p.y-3.28),.38,2.65,0.);
  }
 }
 if(role==64.){
  {float qx=(frame.z-0.13000000)*19.624255526;
   c=bnmWindow071(c,vec2(qx,p.y-.72),.90,2.56,1.);
   c=bnmWindow071(c,vec2(qx-.46,p.y-4.55),.31,1.52,0.);
   c=bnmWindow071(c,vec2(qx+.46,p.y-4.55),.31,1.52,0.);
  }
  {float qx=(frame.z-0.38000000)*19.624255526;
   c=bnmWindow071(c,vec2(qx,p.y-.72),.90,2.56,1.);
   c=bnmWindow071(c,vec2(qx-.46,p.y-4.55),.31,1.52,0.);
   c=bnmWindow071(c,vec2(qx+.46,p.y-4.55),.31,1.52,0.);
  }
  {float qx=(frame.z-0.62000000)*19.624255526;
   c=bnmWindow071(c,vec2(qx,p.y-.72),.90,2.56,1.);
   c=bnmWindow071(c,vec2(qx-.46,p.y-4.55),.31,1.52,0.);
   c=bnmWindow071(c,vec2(qx+.46,p.y-4.55),.31,1.52,0.);
  }
  {float qx=(frame.z-0.87000000)*19.624255526;
   c=bnmWindow071(c,vec2(qx,p.y-.72),.90,2.56,1.);
   c=bnmWindow071(c,vec2(qx-.46,p.y-4.55),.31,1.52,0.);
   c=bnmWindow071(c,vec2(qx+.46,p.y-4.55),.31,1.52,0.);
  }
 }
 if(role==65.){
  {float qx=(frame.z-0.50000000)*4.396433736;
   c=bnmWindow071(c,vec2(qx,p.y-1.35),.47,1.22,0.);
   c=bnmWindow071(c,vec2(qx,p.y-4.42),.40,1.12,0.);
  }
 }
 if(role==66.){
  {float qx=(frame.z-0.10000000)*19.219545530;
   c=bnmWindow071(c,vec2(qx,p.y-1.38),.47,1.24,0.);
   c=bnmWindow071(c,vec2(qx,p.y-4.42),.39,1.10,0.);
  }
  {float qx=(frame.z-0.30000000)*19.219545530;
   c=bnmWindow071(c,vec2(qx,p.y-1.38),.47,1.24,0.);
   c=bnmWindow071(c,vec2(qx,p.y-4.42),.39,1.10,0.);
  }
  {float qx=(frame.z-0.50000000)*19.219545530;
   c=bnmWindow071(c,vec2(qx,p.y-1.38),.47,1.24,0.);
   c=bnmWindow071(c,vec2(qx,p.y-4.42),.39,1.10,0.);
  }
  {float qx=(frame.z-0.70000000)*19.219545530;
   c=bnmWindow071(c,vec2(qx,p.y-1.38),.47,1.24,0.);
   c=bnmWindow071(c,vec2(qx,p.y-4.42),.39,1.10,0.);
  }
  {float qx=(frame.z-0.90000000)*19.219545530;
   c=bnmWindow071(c,vec2(qx,p.y-1.38),.47,1.24,0.);
   c=bnmWindow071(c,vec2(qx,p.y-4.42),.39,1.10,0.);
  }
 }

 if(role==40.||role==41.){float w=.26;float qx=ux*3.6;c=bnmWindow071(c,vec2(qx,p.y-.9),w,.95,1.);c=bnmWindow071(c,vec2(qx,p.y-3.45),w,1.35,0.);c=bnmWindow071(c,vec2(qx,p.y-5.72),w,.95,0.);}
 if(role==42.||role==43.){float qx=ux*3.5;c=bnmWindow071(c,vec2(qx,p.y-.65),.72,2.35,1.);c=bnmWindow071(c,vec2(qx,p.y-4.65),.46,1.65,0.);}
 if(role==48.){float qx=ux*5.1;c=bnmWindow071(c,vec2(qx,p.y-.16),.57,.58,0.);c=bnmWindow071(c,vec2(qx,p.y-1.3),.88,2.8,1.);c=bnmWindow071(c,vec2(qx-.47,p.y-4.85),.32,1.9,0.);c=bnmWindow071(c,vec2(qx+.47,p.y-4.85),.32,1.9,0.);float pilaster=bnmBox071(vec2(abs(qx)-2.3,p.y-3.75),vec2(.12,2.9));c=mix(c,vec3(.88,.85,.74),pilaster);float cornice=1.-smoothstep(.04,.08,min(abs(p.y-1.05),min(abs(p.y-4.5),abs(p.y-7.15))));c=mix(c,vec3(.88,.86,.75),cornice);}
 if(role==47.){float qx=ux*4.5;c=bnmWindow071(c,vec2(qx,p.y-.75),.42,1.3,0.);c=bnmWindow071(c,vec2(qx,p.y-3.15),.42,1.4,0.);c=bnmWindow071(c,vec2(qx,p.y-5.45),.48,1.45,1.);}
 if(role==46.){float qx=(frame.z-.5)*9.4;c=bnmWindow071(c,vec2(qx,p.y-.45),1.65,2.55,1.);c=bnmWindow071(c,vec2(qx-.95,p.y-3.6),.55,1.4,0.);c=bnmWindow071(c,vec2(qx+.95,p.y-3.6),.55,1.4,0.);c=bnmWindow071(c,vec2(qx-.95,p.y-5.75),.55,.95,0.);c=bnmWindow071(c,vec2(qx+.95,p.y-5.75),.55,.95,0.);}
 if(role==44.){float qx=ux*4.1;c=bnmWindow071(c,vec2(qx,p.y-1.1),.92,4.5,1.);float basecourse=1.-smoothstep(.02,.045,abs(fract(p.y/.45)-.5)*.45);c=mix(c,vec3(.69,.68,.61),basecourse*.08);}
 return c;
}
`;
