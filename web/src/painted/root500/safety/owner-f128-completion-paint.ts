export const F128_COMPLETION_GLSL=`// WR128 October2014 sourceappearance. Opaque graphics, original10m defaultnativeheight.
float f128c6406OldBox(vec2 q,vec2 h){vec2 d=abs(q)-h;float aa=max(max(fwidth(q.x),fwidth(q.y)),.008);return 1.0-smoothstep(0.0,aa,max(d.x,d.y));}
float f128c6406OldGrid(float x,float stepM,float widthM){float d=abs(mod(x+stepM*.5,stepM)-stepM*.5);return 1.0-smoothstep(widthM*.5,widthM*.5+max(fwidth(x),.008),d);}
vec3 f128c6406OldFacade(vec3 base,vec3 p,vec3 n,vec4 frame,float family){
 if(family!=4883.0)return base;vec2 q=frame.xy;bool north=q.x<180.0;float u=q.x-(north?100.0:200.0);float y=p.y;
 // CroppedEastface prefix only; no continuation into unseenEasternextent.
 if(!north&&u>19.5)return base;
 vec3 stone=vec3(.69,.66,.56);float row=floor(y/.30);float joints=max(f128c6406OldGrid(y,.30,.012),f128c6406OldGrid(u+mod(row,2.0)*.4,.8,.011));vec3 c=mix(stone,vec3(.56,.54,.46),joints*.30);
 if(y<1.8){
  // Glazing is opaque paint; structural stonecorner and mullion/transom rhythm.
  c=vec3(.20,.23,.22);float m=f128c6406OldGrid(u,2.2,.085);float tr=max(f128c6406OldGrid(y-.23,.67,.045),f128c6406OldBox(vec2(0,y-1.69),vec2(100,.07)));c=mix(c,vec3(.63,.64,.59),max(m,tr));
  float stile=f128c6406OldBox(vec2(u-3.3,y-.85),vec2(.045,.80));float doors=f128c6406OldBox(vec2(u-3.3,y-.83),vec2(1.08,.80));c=mix(c,vec3(.15,.18,.18),doors*.35);c=mix(c,vec3(.67,.67,.61),stile);c=mix(c,vec3(.76,.75,.65),f128c6406OldBox(vec2(u-3.3,y-.80),vec2(.22,.027)));
 }
 // Two photoobserved darkinscription-panel rows. Lettercontent remainsunknown.
 if(y>1.8){
  if(north){for(int i=0;i<5;i++){float x=3.54+7.09*float(i);float panel=max(f128c6406OldBox(vec2(u-x,y-6.50),vec2(2.84,.23)),f128c6406OldBox(vec2(u-x,y-4.0),vec2(2.84,.23)));c=mix(c,vec3(.28,.32,.32),panel);}}
  else{for(int i=0;i<5;i++){float x=2.1+4.25*float(i);float panel=max(f128c6406OldBox(vec2(u-x,y-6.50),vec2(1.65,.23)),f128c6406OldBox(vec2(u-x,y-4.0),vec2(1.65,.23)));c=mix(c,vec3(.28,.32,.32),panel);}}
 }
 // Exactoriginalsharp corner retained; stonepier wraps both independentlybound faces.
 c=mix(c,stone,f128c6406OldBox(vec2(u,y-.9),vec2(.38,.9)));
 return c;
}

float f128c6406Box(vec2 p,vec2 h){vec2 d=abs(p)-h;return 1.-smoothstep(0.,max(max(fwidth(p.x),fwidth(p.y)),.012),max(d.x,d.y));}
float f128c6406Line(float x,float stepM,float w){float d=abs(mod(x+.5*stepM,stepM)-.5*stepM);return 1.-smoothstep(w,w+max(fwidth(x),.008),d);}
vec3 wallrafComplete128(vec3 base,vec3 p,vec3 n,vec4 frame,float family){
 bool old=abs(family-4883.)<.25; if(!old&&abs(family-6406.)>.25)return base;
 float y=old?p.y:frame.w,u=0.,role=frame.z;vec2 localXZ=old?p.xz:frame.xy;float v=localXZ.y+.03301141304065345*localXZ.x;vec3 c=base;bool north=false,east=false,west=false;
 if(old){vec3 q=p;q.y*=10./24.;c=f128c6406OldFacade(base,q,n,frame,family);north=frame.x<180.;east=!north;u=frame.x-(north?100.:200.);}
 else{float joint=max(f128c6406Line(y,.30,.009),f128c6406Line(localXZ.x+localXZ.y+mod(floor(y/.30),2.)*.4,.8,.010));c=mix(vec3(.69,.66,.56),vec3(.54,.52,.45),joint*.30);west=abs(role-2.)<.25;u=26.43-v;
  // Four existing source-bound raised clerestory sides only; top/roof6405 remain frozen.
  if(abs(role-6.)<.25){float along=abs(n.x)>.7?v:localXZ.x;float metal=max(f128c6406Line(along,2.5,.035),max(f128c6406Line(y-24.10,.95,.035),step(y,24.12)));return mix(vec3(.11,.17,.19),vec3(.66,.68,.65),metal);}
  if(abs(role-5.)<.25){c=vec3(.19,.26,.27);float edge=max(f128c6406Line(localXZ.x,.9,.025),f128c6406Line(localXZ.y,1.1,.025));return mix(c,vec3(.62,.63,.59),edge);}
  if(west){for(int i=0;i<6;i++){float x=2.5+4.95*float(i);float panel=max(f128c6406Box(vec2(u-x,y-9.6),vec2(1.98,.55)),f128c6406Box(vec2(u-x,y-15.6),vec2(1.98,.55)));c=mix(c,vec3(.28,.32,.32),panel);}if(y<4.32){c=vec3(.18,.23,.23);c=mix(c,vec3(.67,.67,.61),max(f128c6406Line(u,2.2,.055),f128c6406Line(y-.55,1.6,.045)));}}
  // Direct west stepped-wing image: one tall slit on each of three recessed planes, not repeated cube windows.
  if(abs(role-3.)<.25){float center=v> -13.34?-9.98:(v> -20.07?-16.70:-23.67);float mask=f128c6406Box(vec2(v-center,y-10.3),vec2(.70,5.8));vec3 glass=mix(vec3(.11,.19,.23),vec3(.68,.69,.64),max(f128c6406Line(y-4.5,2.9,.05),f128c6406Line(v-center,1.35,.045)));c=mix(c,glass,mask);if(y<3.1)c=vec3(.22,.24,.23);float small=f128c6406Box(vec2(v-center,y-1.75),vec2(.64,.95));c=mix(c,vec3(.25,.31,.32),small);}
  // Source-bound recessed glazed stair connector described by the architectural inventory, visible between cube and offices.
  if(abs(role-4.)<.25&&localXZ.x> -8.7&&localXZ.x< -7.1&&v< -2.70&&v> -6.70&&y<22.3){c=mix(vec3(.14,.23,.27),vec3(.64,.66,.62),max(f128c6406Line(v+2.75,.96,.035),f128c6406Line(y,1.6,.035)));}
  // Direct east administrative face: four separated rectangular columns, lower layer differs. Other unobserved returns stay stone.
  if(abs(role-4.)<.25&&n.x>.7&&v< -5.){for(int r=0;r<3;r++)for(int k=0;k<4;k++){vec2 q=vec2(v-(-7.9-1.5*float(k)),y-(7.+4.4*float(r)));float m=f128c6406Box(q,vec2(.46,.95));vec3 glass=mix(vec3(.20,.29,.32),vec3(.69,.70,.65),f128c6406Box(vec2(0.,q.y),vec2(1.,.045)));c=mix(c,glass,m);}if(y<3.7){float m=f128c6406Box(vec2(v+10.5,y-1.8),vec2(2.5,1.65));c=mix(c,vec3(.17,.23,.25),m);}}
 }
 // Additional directly photographed cube corner window stack. Legacy stone/panels/glazing delegate remains byte-preserved elsewhere.
 float center=north?32.3:3.2;
 if(north||east||west){for(int i=0;i<3;i++){vec2 q=vec2(u-center,y-(7.0+6.0*float(i)));float m=f128c6406Box(q,vec2(2.35,1.70));vec3 glass=vec3(.12,.22,.28);float mull=max(f128c6406Box(vec2(q.x-1.55,0.),vec2(.045,10.)),f128c6406Box(vec2(q.x+1.55,0.),vec2(.045,10.)));float rail=0.;for(int k=0;k<3;k++)rail=max(rail,f128c6406Box(vec2(0.,q.y+1.1-.26*float(k)),vec2(2.3,.035)));glass=mix(glass,vec3(.73,.73,.67),max(mull,rail));c=mix(c,glass,m);}}
 // East old cropped tail now known stone, never preserve a white cutoff. Its original accepted portion still uses the exact old expression.
 if(east&&u>19.5){float joint=max(f128c6406Line(y,.30,.009),f128c6406Line(u+mod(floor(y/.30),2.)*.4,.8,.01));c=mix(vec3(.69,.66,.56),vec3(.54,.52,.45),joint*.30);if(y<4.32)c=mix(vec3(.18,.23,.23),vec3(.67,.67,.61),max(f128c6406Line(u,2.2,.055),f128c6406Line(y-.55,1.6,.045)));for(int i=4;i<7;i++){float x=2.1+4.25*float(i);float panel=max(f128c6406Box(vec2(u-x,y-15.6),vec2(1.65,.552)),f128c6406Box(vec2(u-x,y-9.6),vec2(1.65,.552)));c=mix(c,vec3(.28,.32,.32),panel);}}
 return c;
}
`;
