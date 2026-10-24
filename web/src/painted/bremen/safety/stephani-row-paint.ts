export const STEPHANI_ROW_BOUNDARY_GLSL=String.raw`
float srbLine(float x,float w){return 1.-smoothstep(w,w+max(fwidth(x),.012),abs(x));}
float srbRect(float s,float y,float hw,float lo,float hi){float d=max(abs(s)-hw,max(lo-y,y-hi));return 1.-smoothstep(-.025,.025+max(fwidth(s),fwidth(y)),d);}
vec3 srbBrick(vec3 colour,float s,float y){float row=floor(y/.095),ss=s+mod(row,2.)*.13;float mortar=max(srbLine(mod(ss,.27)-.135,.006),srbLine(mod(y,.095)-.0475,.004));return colour*(1.-mortar*.15)+vec3(.012)*sin(floor(ss/.27)*2.7+row*1.7);}
void srbWindow(inout vec3 c,float s,float y,float hw,float lo,float hi,vec3 trim,float crossLevel){float mask=srbRect(s,y,hw,lo,hi);vec3 glass=mix(vec3(.16,.22,.235),vec3(.39,.46,.46),clamp((y-lo)/max(hi-lo,.1),0.,1.));float sd=max(abs(s)-hw,max(lo-y,y-hi)),edge=1.-smoothstep(.02,.075+max(fwidth(s),fwidth(y)),abs(sd));c=mix(c,glass,mask);c=mix(c,trim,edge);float bars=max(srbLine(s,.028),srbLine(y-mix(lo,hi,crossLevel),.027));c=mix(c,trim,bars*mask);}
vec3 stephaniRowBoundaryPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float s=frame.x,y=frame.y,L=frame.z;vec3 c=srbBrick(base,s,y);
 if(family==47070.){
  float count=max(1.,floor(L/3.5+.5)),pitch=L/count,q=mod(s,pitch)-pitch*.5,hw=min(.61,max(0.,(pitch-.60)*.5));
  float level=floor(y/3.),mask=frame.w,allowed=level<.5?mod(mask,2.):floor(mask/2.);
  if(y>=0.&&level<1.5&&allowed>.5)srbWindow(c,q,y,hw,level*3.+.82,level*3.+2.52,vec3(.77,.765,.68),.64);
  return c;
 }
 if(family==47072.){
  c=srbBrick(vec3(.54,.345,.265),s,y);
  for(int j=0;j<3;j++){
   float centre=(.218+float(j)*.255)*L,q=s-centre;
   float infill=srbRect(q,y,.092*L,.30,1.48)+srbRect(q,y,.092*L,4.25,5.20);
   float chevron=abs(q)*.7071+y*.7071,courses=max(srbLine(mod(chevron,.18)-.09,.006),srbLine(mod(abs(q)*.7071-y*.7071,.30)-.15,.005));
   c=mix(c,c*(1.-courses*.15),clamp(infill,0.,1.));
   srbWindow(c,q,y,.080*L,1.65,4.10,vec3(.85,.85,.81),.52);srbWindow(c,q,y,.080*L,5.45,7.95,vec3(.85,.85,.81),.52);
  }
  srbWindow(c,s-.392*L,y,.054*L,8.55,11.10,vec3(.85,.85,.81),.52);srbWindow(c,s-.566*L,y,.054*L,8.55,11.10,vec3(.85,.85,.81),.52);
  float balcony=srbRect(s-.48*L,y,.222*L,8.42,8.55),rail=srbRect(s-.48*L,y,.222*L,8.55,9.65),bars=max(srbLine(mod(s,.16)-.08,.012),srbLine(y-9.63,.028));
  c=mix(c,vec3(.38,.37,.32),balcony);return mix(c,vec3(.31,.32,.285),rail*bars);
 }
 return base;
}
`;
