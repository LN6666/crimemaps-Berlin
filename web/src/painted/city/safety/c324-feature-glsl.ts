import {c325MaterialFragment} from './c325-feature-glsl';
export const C324_FEATURE_GLSL=`
float c324Arch(float u,float y,float center,float bottom,float width,float height){float x=(u-center)/width;float head=bottom+height-width+width*sqrt(max(0.,1.-x*x));return (1.-smoothstep(.96,1.04,abs(x)))*smoothstep(bottom,bottom+.08,y)*(1.-smoothstep(head-.06,head+.06,y));}
vec3 c324Benno(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 vec3 stone=vec3(.76,.73,.66),light=vec3(.85,.82,.75),dark=vec3(.18,.22,.22);float u=f.x,y=f.y;bool front=normal.x*(-.676)+normal.z*(-.737)>.7;
 if(family==13351.)return vec3(.58,.31,.20);
 float mortar=(1.-smoothstep(.015,.015+max(.02,fwidth(y/.75)),abs(fract(y/.75)-.5)))*.035*(1.-smoothstep(.10,.30,fwidth(y/.75)));vec3 c=stone*(1.-mortar);
 if(family==13350.&&front&&abs(f.z)<12.&&abs(u)<3.2&&y<8.5){float door=c324Arch(u,y,0.,0.,2.4,7.5);return mix(c,vec3(.25,.23,.18),door);}
 if(family==13352.&&front&&abs(u)<5.4&&y>17.&&y<30.){
  vec2 q=vec2(u,y-24.);float r=length(q);float ring=1.-smoothstep(.13,.23,abs(r-4.6));float glass=1.-smoothstep(1.20,1.32,r);
  for(int i=0;i<8;i++){float a=float(i)*.78539816;glass=max(glass,1.-smoothstep(.73,.83,length(q-2.9*vec2(cos(a),sin(a)))));}
  c=mix(c,light,ring);return mix(c,dark,glass);
 }
 if(family==13353.||family==13354.){
  float band=1.-smoothstep(.10,.22,min(min(abs(y-12.),abs(y-24.)),min(abs(y-36.),abs(y-46.5))));c=mix(c,light,band);
  if(y>39.&&y<45.){float belfry=0.;for(int i=0;i<4;i++){float x=-2.7+1.8*float(i);belfry=max(belfry,c324Arch(u,y,x,39.5,.54,4.0));}c=mix(c,dark,belfry);}
  if(front&&abs(u)<2.5&&abs(y-32.0)<2.5){vec2 q=vec2(u,y-32.);float r=length(q);float rim=1.-smoothstep(.10,.18,abs(r-2.05));float face=1.-smoothstep(1.95,2.02,r);vec3 field=family==13353.?vec3(.85,.83,.73):vec3(.42,.57,.57);c=mix(c,field,face);c=mix(c,vec3(.69,.55,.25),rim);float angle=atan(q.y,q.x);float ticks=(1.-smoothstep(.035,.075,abs(fract(angle/6.2831853*12.)-.5)))*smoothstep(1.55,1.65,r)*face;c=mix(c,vec3(.61,.48,.21),ticks);}
  return c;
 }
 if(family==13355.){float paired=max(c324Arch(u,y,-.70,49.0,.43,2.6),c324Arch(u,y,.70,49.0,.43,2.6));return mix(c,dark,paired);}
 if(family==13356.){float band=1.-smoothstep(.10,.22,min(abs(y-28.),abs(y-39.6)));return mix(c,light,band);}
 return c;
}
`;
export function c324MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C324 dispatcher drift');return c325MaterialFragment(source.replace(anchor,C324_FEATURE_GLSL+'\n'+anchor+'if(family>=13350.&&family<=13356.)return c324Benno(base,p,normal,frame,family);'),city);}
