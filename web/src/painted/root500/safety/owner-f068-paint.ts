export const F068_GLSL=String.raw`float f068line(float x,float spacing,float halfwidth){float d=abs(mod(x+spacing*.5,spacing)-spacing*.5);return 1.-smoothstep(halfwidth,halfwidth+.025,d);}
float f068rect(vec2 p,vec2 size){vec2 d=abs(p)-size;return 1.-smoothstep(-.015,.025,max(d.x,d.y));}
vec3 neuePinakothekWhole068(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6337.)>.25)return base;
 float u=frame.x,v=frame.y,role=frame.z,y=p.y;
 vec3 stone=vec3(.68,.645,.535),glass=vec3(.16,.24,.255),metal=vec3(.29,.34,.335);
 float course=f068line(y,.56,.015),joint=f068line(u+v+mod(floor(y/.56),2.)*.56,1.28,.014);
 stone*=1.-.10*course-.055*joint;
 if(role>10.5)return vec3(.70,.68,.60)*(1.-.045*joint);
 if(role>9.5)return stone;
 if(role>7.5&&role<8.5)return vec3(.13,.16,.145)*(1.+.09*sin(u*2.));
 if(role>6.5&&role<7.5)return vec3(.37,.385,.35)*(1.-.08*f068line(y,.17,.015));
 if(role>5.5&&role<6.5)return metal*(1.-.12*f068line(u,.65,.02));
 if(role>4.5&&role<5.5)return vec3(.72,.70,.635)*(1.-.055*f068line(y,.62,.016));
 if(role>3.5&&role<4.5)return vec3(.29,.39,.415)*(1.-.40*max(f068line(u,1.6,.035),f068line(v,1.2,.03)));
 if(role>2.5&&role<3.5)return vec3(.46,.48,.455)*(1.-.07*f068line(u,1.4,.022));
 if(role>1.5&&role<2.5){
  if(y<1.36)return vec3(.35,.36,.32);
  float grid=max(f068line(u-5.3,1.01,.026),f068line(y-1.36,.91,.022));
  // Paired round-head upper tracery in the glass: decorative framing, not apertures in stone roof.
  float xx=mod(u-5.3,2.02)-1.01;
  float arch=1.-smoothstep(.026,.060,abs(length(vec2(xx,y-11.5))-.85));
  arch*=step(11.5,y);
  float door=f068rect(vec2(u-15.4,y-2.65),vec2(1.1,1.27));
  vec3 c=glass*(1.+.09*sin(u*.73)+.025*sin(y*1.5));c=mix(c,vec3(.09,.13,.125),door*.55);
  return mix(c,vec3(.08,.095,.083),max(grid,arch));
 }
 float nU=dot(normal.xz,vec2(.92098,-.38999));float nV=dot(normal.xz,vec2(.38999,.92098));
 bool southKnown=nV<-.7&&v< -44.&&u> -32.&&u< -9.;
 bool sideKnown=nV<-.7&&v> -33.&&v< -29.&&u>49.&&u<64.;
 bool courtKnown=role>8.5&&nU<-.6;
 float win=0.;
 if(southKnown||sideKnown||courtKnown){
  float axis=courtKnown?v:u;float xx=mod(axis+2.5,5.)-2.5;
  float yy=mod(y-2.,5.3);
  float lower=f068rect(vec2(xx,yy-1.65),vec2(1.0,1.55));
  float cap=(1.-smoothstep(.98,1.04,length(vec2(xx,yy-3.2))))*step(3.2,yy);
  win=max(lower,cap)*step(2.,y)*step(y,13.1);
  float grid=max(f068line(xx,.67,.035),f068line(y,.95,.03));
  stone=mix(stone,mix(glass,vec3(.075,.087,.078),grid),win);
 }
 // Source-photo narrow projected glazed bay beside the entrance left side wall.
 if(nU>.8&&u>5.&&u<5.6&&v> -34.5&&v< -32.4&&y>2.&&y<14.4){
  float bars=max(f068line(v,.7,.035),f068line(y,1.05,.035));return mix(glass,vec3(.10,.13,.12),bars);
 }
 return stone;
}
`;
