export const BREMEN_QUARTIER670_GLSL=String.raw`
float bq670line(float q,float width){return 1.-smoothstep(width,width+max(fwidth(q),.012),abs(q));}
float bq670hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 bq670concrete(float s,float y){vec3 c=vec3(.785,.795,.755);c+=vec3(.012)*sin(s*1.1+y*.63);float joints=max(bq670line(mod(s,2.7)-1.35,.009),bq670line(mod(y,3.652)-.02,.015));return c*(1.-joints*.19);}
void bq670window(inout vec3 c,float s,float y,float center,float halfw,float bottom,float top,float curtain){
 float sd=max(abs(s-center)-halfw,max(bottom-y,y-top));float aa=max(max(fwidth(s),fwidth(y)),.022);float inside=1.-smoothstep(-aa,aa,sd+.065);
 vec3 glass=mix(vec3(.16,.235,.235),vec3(.43,.535,.56),clamp((y-bottom)/max(top-bottom,.1),0.,1.));glass+=vec3(.018)*sin(s*.7-y*.25);
 if(curtain>.5){float side=step(halfw*.35,abs(s-center));glass=mix(glass,vec3(.62,.63,.57),side*.58);glass*=1.-.05*sin(s*15.);}
 float bar=bq670line(s-center,.035);if(halfw>1.4)bar=max(bar,max(bq670line(s-center-halfw*.5,.025),bq670line(s-center+halfw*.5,.025)));glass=mix(glass,vec3(.13,.17,.17),bar*.92);
 c=mix(c,glass,inside);float frame=1.-smoothstep(.025,.07+aa,abs(sd));c=mix(c,vec3(.19,.235,.23),frame*.92);
}
vec3 bremenQuartier670Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float s=frame.x,y=frame.y;vec3 c=base;
 if(family==46064.){c=vec3(.35,.565,.535);c+=vec3(.07,.075,.07)*(.5+.5*sin(p.x*.29+p.z*.33+y*.27));c*=.97+.03*sin(p.x*1.2-p.z*.6);return c;}
 if(family==46065.)return vec3(.54,.60,.575);
 if(family==46063.){c=vec3(.715,.735,.68);if(normal.y<-.2)c*=.80;float edge=bq670line(mod(y,3.652)-.07,.045);return mix(c,vec3(.59,.63,.59),edge*.5);}
 if(family==46061.){c=vec3(.52,.55,.53);float seam=max(bq670line(mod(p.x,1.4)-.7,.012),bq670line(mod(p.z,1.4)-.7,.012));return c*(1.-seam*.08);}
 c=bq670concrete(s,y);
 if(family==46066.)return c;
 if(y>18.18)return c;
 float f=clamp(floor((y+.025)/3.652),0.,4.);float bottom=f*3.652+.22;float top=(f+1.)*3.652-.15;
 if(family==46062.){
  if(frame.z<0.){
   float center=f==0.?2.9:f==1.?2.65:f==2.?-2.75:f==3.?2.8:-2.65;bq670window(c,s,y,center,.78,bottom,top,1.);
  }else{
   if(f==0.&&abs(s)<6.0){if(s>-.3){c=vec3(.11,.145,.135);c=mix(c,vec3(.27,.30,.26),clamp((s-.4)/5.5,0.,1.)*.25);}else{c=vec3(.56,.585,.55);float panel=max(bq670line(mod(y,.75)-.375,.015),bq670line(s+3.3,.025));c*=1.-panel*.26;}}
   else if(f<3.)bq670window(c,s,y,2.6,.88,bottom,top,0.);
  }return c;
 }
 // Long east/west elevations: floor-height glass and irregularly shifted opaque concrete fields.
 float pitch=68.62605611/12.;float bay=floor((s+33.9918432)/pitch);float q=mod(s+33.9918432,pitch)-pitch*.5;float pattern=mod(bay+f*2.+(frame.z<0.?1.:0.),4.);
 float halfw=pattern<.5?1.36:pattern<1.5?2.28:pattern<2.5?1.9:2.36;float shift=pattern<.5?.42:pattern<1.5?-.20:pattern<2.5?-.36:.10;
 bq670window(c,q,y,shift,halfw,bottom,top,step(2.5,pattern));
 // Restrained solid belts and fine metal mullions, never a uniform domestic grid.
 float belt=max(bq670line(y-f*3.652,.095),bq670line(y-(f+1.)*3.652,.095));c=mix(c,vec3(.74,.765,.72),belt);
 return c;
}
`;
