export const BOUNDARY70_GLSL=`
float bf70Line(float d,float w){float a=max(fwidth(d),.015);return 1.-smoothstep(max(0.,w-a*.5),w+a*.5,abs(d));}
float bf70Repeat(float x,float pitch,float w){float a=max(fwidth(x)/pitch,.0001),h=w/pitch,d=abs(fract(x/pitch)-.5);return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h,0.,1.),smoothstep(.2,.7,a));}
float bf70Box(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.015));vec2 q=1.-smoothstep(h-a*.5,h+a*.5,abs(p-c));return q.x*q.y;}
vec3 bf70Aperture(vec3 c,vec2 p,vec2 centre,float halfWidth,float halfHeight,float french){
 float rim=bf70Box(p,centre,vec2(halfWidth+.105,halfHeight+.105));float pane=bf70Box(p,centre,vec2(halfWidth,halfHeight));c=mix(c,vec3(.85,.85,.79),rim);float mull=max(bf70Line(p.x-centre.x,.018),bf70Line(p.y-centre.y,.015));vec3 glass=mix(vec3(.20,.28,.30),vec3(.45,.48,.47),mull*.65);c=mix(c,glass,pane);
 float bal=bf70Box(p,centre+vec2(0.,-halfHeight+.38),vec2(halfWidth,.39))*french;float rail=max(bf70Repeat(p.x,.14,.012),max(bf70Line(p.y-centre.y+halfHeight-.75,.018),bf70Line(p.y-centre.y+halfHeight-.04,.018)));return mix(c,vec3(.73,.75,.71),bal*rail);
}
float bf70LongCentre(int k){return k==0?2.6:k==1?5.8:k==2?9.1:k==3?15.3:k==4?19.9:k==5?25.2:k==6?28.3:31.3;}
float of7Line(float x,float c,float w){float a=max(fwidth(x),.012);return 1.-smoothstep(max(0.,w-a*.5),w+a*.5,abs(x-c));}
float of7Box(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.012));vec2 q=1.-smoothstep(h-a*.5,h+a*.5,abs(p-c));return q.x*q.y;}
float of7Repeat(float x,float pitch,float w){float a=max(fwidth(x)/pitch,.0001),h=w/pitch,d=abs(fract(x/pitch)-.5);return mix(1.-smoothstep(max(0.,h-a*.5),h+a*.5,d),clamp(2.*h,0.,1.),smoothstep(.2,.7,a));}
float of7Mullion(float u,int k){return of7Line(u,k==0?0.:k==1?1.63:k==2?3.58:k==3?5.24:k==4?7.03:k==5?8.82:k==6?10.71:k==7?12.39:k==8?14.40:k==9?16.47:k==10?18.33:k==11?20.49:k==12?22.78:k==13?25.07:k==14?27.34:29.52,.028);}
vec3 paintOffice7aPhoto70(vec3 base,vec4 f,float family){
 if(family<47040.||family>47049.)return base;
 if(family==47041.)return vec3(.35,.34,.32);
 if(family==47042.)return vec3(.26,.25,.23);
 if(family==47045.){float h=clamp((f.y-4.005)/.86,0.,1.);return mix(vec3(.54,.66,.68),vec3(.78,.84,.83),h);}
 if(family==47046.)return vec3(.14,.17,.17);
 if(family==47047.){float pane=of7Box(vec2(0.,f.y),vec2(0.,5.36),vec2(1.,1.20));float bars=of7Repeat(f.z,1.05,.025);vec3 c=vec3(.56,.31,.22);return mix(c,mix(vec3(.28,.38,.38),vec3(.58,.63,.60),bars),pane);}
 float u=f.x,y=f.y,v=f.z;vec2 uv=f.xy;float mortar=max(of7Repeat(y,.077,.0035),of7Repeat(u+mod(floor(y/.077),2.)*.125,.25,.0035));vec3 c=mix(vec3(.56,.31,.22),vec3(.71,.55,.43),mortar*.30);
 c=mix(c,vec3(.22,.24,.23),of7Line(y,3.94,.045));c=mix(c,vec3(.22,.24,.23),of7Line(y,7.33,.042));
 if(family==47040.)return c;
 // Primary PLANGRAD office exterior: continuous southwest ground glazing with one black entry.
 float ground=family==47044.?of7Box(vec2(0.,y),vec2(0.,1.59),vec2(1.,1.44)):of7Box(uv,vec2(14.76,1.59),vec2(14.70,1.44));float upper=of7Box(uv,vec2(7.75,5.36),vec2(7.56,1.20));
 float panes=family==47043.?max(ground,upper):ground*smoothstep(5.6,5.8,v);
 float bar=0.;for(int k=0;k<16;k++)bar=max(bar,of7Mullion(u,k));
 if(family==47044.)bar=max(of7Line(v,6.05,.028),max(of7Line(v,8.57,.028),of7Line(v,10.96,.035)));
 float horizon=of7Line(y,.21,.044);float highlight=.5+.5*sin(u*.21);vec3 glass=mix(vec3(.25,.34,.34),vec3(.43,.49,.45),highlight*.45);glass=mix(glass,vec3(.51,.53,.46),1.-smoothstep(.85,1.12,y));glass=mix(glass,vec3(.51,.55,.53),max(bar,horizon));c=mix(c,glass,panes);
 if(family==47043.){float door=of7Box(uv,vec2(19.32,1.57),vec2(.60,1.42));c=mix(c,vec3(.065,.082,.078),door);float handle=of7Box(uv,vec2(18.89,1.38),vec2(.035,.23));c=mix(c,vec3(.78,.79,.73),handle);}
 return c;
}

vec3 paintBoundary70(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family<47000.||family>47059.)return base;
 if(family>=47040.&&family<=47049.)return paintOffice7aPhoto70(base,f,family);
 if(family==47042.||family==47012.)return vec3(.26,.25,.23);
 if(family==47041.)return vec3(.35,.34,.32);
 if(family==47040.)return vec3(.60,.56,.49)*(1.-.035*bf70Repeat(f.y,.32,.008));
 if(family==47010.){float moss=.5+.5*sin(f.x*.61+f.y*.3);return mix(vec3(.34,.35,.27),vec3(.41,.42,.32),moss*.35);}
 vec2 uv=f.xy;float y=f.y;vec3 c=vec3(.58,.31,.22);float mortar=max(bf70Repeat(y,.077,.004),bf70Repeat(f.x+mod(floor(y/.077),2.)*.125,.25,.004));c=mix(c,vec3(.66,.43,.32),mortar*.36);
 // The architect's fine bands sit at the four residential floor transitions above the garage plinth.
 float band=max(bf70Line(y-3.06,.042),max(bf70Line(y-6.18,.042),max(bf70Line(y-9.30,.042),bf70Line(y-12.42,.042))));c=mix(c,c*.82,band*.8);
 if(family==47009.||family==47003.||family==47006.||family==47007.)return c;
 if(y<2.8){if(family==47001.||family==47002.)c=mix(c,vec3(.58,.57,.52),1.-smoothstep(2.70,2.85,y));return c;}
 if(family==47000.||family==47002.){
  // Registered courtyard photograph has unequal gaps and two wide grouped casements, not a uniform grid.
  for(int row=0;row<4;row++){
   float cy=4.51+float(row)*3.12;
   for(int k=0;k<8;k++){
    if((family==47000.&&row<2&&k>=1&&k<=3)||(row==2&&(k==1||k==2))||(row==3&&(k==4||k==6)))continue;
    c=bf70Aperture(c,uv,vec2(bf70LongCentre(k),cy),.78,1.10,1.);
   }
   if(row==2)c=bf70Aperture(c,uv,vec2(7.43,cy),2.32,1.10,1.);
   if(row==3)c=bf70Aperture(c,uv,vec2(19.9,cy),2.35,1.10,1.);
  }
 }else if(family==47001.){
  for(int row=0;row<4;row++){
   float cy=4.51+float(row)*3.12;
   c=bf70Aperture(c,uv,vec2(2.25,cy),row==1?1.12:.62,1.10,1.);
   c=bf70Aperture(c,uv,vec2(6.20,cy),row==3?1.22:.70,1.10,1.);
   c=bf70Aperture(c,uv,vec2(10.10,cy),.61,1.10,1.);
  }
 }else if(family==47004.){
  // Three attached houses, two full garden-facing residential registers over the shared base.
  for(int house=0;house<3;house++)for(int row=0;row<2;row++){
   float q=float(house)*6.08,cy=4.51+float(row)*3.12;
   c=bf70Aperture(c,uv,vec2(q+2.05,cy),.52,1.11,row==1?1.:0.);
   c=bf70Aperture(c,uv,vec2(q+3.75,cy),.52,1.11,row==1?1.:0.);
   c=bf70Aperture(c,uv,vec2(q+5.48,cy),.54,1.11,row==1?1.:0.);
  }
 }
 return c;
}`;
