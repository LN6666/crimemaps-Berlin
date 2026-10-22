import {c333MaterialFragment} from './c333-feature-glsl';
export const C332_FEATURE_GLSL=`float c332pdm76box(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.006));vec2 z=1.-smoothstep(h-a,h+a,abs(p-c));return z.x*z.y;}
float c332pdm76line(float x,float pitch,float hw){float a=max(fwidth(x),.004);float d=abs(mod(x+pitch*.5,pitch)-pitch*.5);return 1.-smoothstep(hw-a,hw+a,d);}
vec3 c332OriginalFull500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family<13433.75||family>13436.25)return base;vec2 q=vec2(frame.x,p.y);vec3 concrete=vec3(.76,.76,.73);float joint=max(c332pdm76line(q.x,4.60,.009),c332pdm76line(q.y,2.25,.009));vec3 c=mix(concrete,vec3(.56,.57,.55),joint*.42);
 vec2 tie=vec2(mod(q.x+1.15,2.30)-1.15,mod(q.y+1.125,2.25)-1.125);float radius=length(tie);float hole=1.-smoothstep(.018-max(fwidth(radius),.003),.018+max(fwidth(radius),.003),radius);c=mix(c,vec3(.51,.52,.50),hole*.67);
 if(abs(family-13436.)<.25){
  // Original portico roofparts are solid0..18m extrusions: only the photographed upper edge is colored.
  if(frame.w<70.&&p.y<17.65)return base;return c;
 }
 vec3 glass=vec3(.31,.39,.36);vec3 steel=vec3(.13,.16,.15);
 if(abs(family-13434.)<.25){
  // Westwall: three broad white panels, six-pane/two-row low glass bands; photo proportions, not a survey.
  float bay=frame.w/3.;float u=mod(q.x,bay)-bay*.5;float low=c332pdm76box(vec2(u,q.y),vec2(0.,4.10),vec2(bay*.43,3.10));
  c=mix(c,vec3(.83,.82,.77),c332pdm76box(vec2(u,q.y),vec2(0.,4.10),vec2(bay*.43+.13,3.23)));c=mix(c,glass,low);
  float grid=max(c332pdm76line(u+bay*.43,bay*.86/6.,.045),c332pdm76box(q,vec2(frame.w*.5,4.20),vec2(frame.w,.055)));c=mix(c,steel,low*grid);
  float slit=1.-smoothstep(.34-max(fwidth(u),.006),.34+max(fwidth(u),.006),abs(abs(u)-bay*.5));c=mix(c,vec3(.20,.25,.23),slit*step(.30,q.y));c=mix(c,steel,slit*c332pdm76line(q.y,3.0,.045));
 }else{
  // SE loggia-back full glass and the short photographed ESE return lower band. Opaque original surfaces stay opaque.
  float top=frame.w>22.5?17.40:6.80;float bottom=.45;float mask=c332pdm76box(q,vec2(frame.w*.5,(top+bottom)*.5),vec2(frame.w*.5-.18,(top-bottom)*.5));c=mix(c,glass,mask);
  float bars=max(c332pdm76line(q.x,frame.w>22.5?1.98:1.52,.044),max(c332pdm76box(q,vec2(frame.w*.5,3.75),vec2(frame.w,.045)),c332pdm76box(q,vec2(frame.w*.5,7.85),vec2(frame.w,.045))));
  if(frame.w>22.5)bars=max(bars,c332pdm76box(q,vec2(frame.w*.5,12.20),vec2(frame.w,.045)));c=mix(c,steel,mask*bars);
  float door=c332pdm76box(q,vec2(frame.w*.53,1.65),vec2(.85,1.20));c=mix(c,vec3(.23,.29,.27),door*mask);c=mix(c,steel,door*mask*c332pdm76box(q,vec2(frame.w*.53,1.65),vec2(.035,1.20)));
 }
 return c;
}

float c332Edge(vec2 p,vec2 a,vec2 b){vec2 d=b-a;float h=clamp(dot(p-a,d)/dot(d,d),0.,1.);return length(p-a-d*h);}
float c332Triangle(vec2 p,vec2 a,vec2 b,vec2 c){float x=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);float y=(c.x-b.x)*(p.y-b.y)-(c.y-b.y)*(p.x-b.x);float z=(a.x-c.x)*(p.y-c.y)-(a.y-c.y)*(p.x-c.x);return (x>=0.&&y>=0.&&z>=0.)||(x<=0.&&y<=0.&&z<=0.)?1.:0.;}
vec3 c332Museum(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family>=13434.)return c332OriginalFull500(base,p,normal,f,family);
 if(family==13432.)return vec3(.33,.34,.32);
 if(family==13433.){float a=atan(f.z,f.x);float r=length(f.xz);float spokes=1.-smoothstep(.025,.025+max(.01,fwidth(a)*28.),abs(sin(a*28.)));float rings=1.-smoothstep(.035,.035+max(.02,fwidth(r)),abs(mod(r+1.,2.)-1.));return mix(vec3(.43,.58,.61),vec3(.67,.72,.70),max(spokes,rings)*.7);}
 if(family==13431.){float u=f.x,n=f.z;if(abs(n)>24.)return vec3(.47,.48,.43);float grid=max(1.-smoothstep(.055,.055+max(.02,fwidth(u)),abs(mod(u+2.4,4.8)-2.4)),1.-smoothstep(.055,.055+max(.02,fwidth(n)),abs(mod(n+1.6,3.2)-1.6)));vec3 c=mix(vec3(.69,.79,.76),vec3(.49,.57,.54),grid*.65);vec2 q=vec2(u,n);vec2 a=vec2(-47.941,27.53),b=vec2(-47.232,-3.002),e=vec2(-14.844,-1.059),aa=vec2(14.994,.711),bb=vec2(39.321,-21.621),ee=vec2(16.179,-12.389);float tri=max(c332Triangle(q,a,b,e),c332Triangle(q,aa,bb,ee));float edge=min(min(c332Edge(q,a,b),c332Edge(q,b,e)),min(c332Edge(q,a,e),min(min(c332Edge(q,aa,bb),c332Edge(q,bb,ee)),c332Edge(q,aa,ee))));c=mix(c,vec3(.77,.84,.80),tri*.82);c=mix(c,vec3(.40,.45,.42),1.-smoothstep(.35,.65+max(fwidth(u),fwidth(n)),edge));return c;}
 return vec3(.76,.76,.73);
}
`;
export function c332MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C332 dispatcher drift');return c333MaterialFragment(source.replace(anchor,C332_FEATURE_GLSL+'\n'+anchor+'if(family>=13430.&&family<=13436.)return c332Museum(base,p,normal,frame,family);'),city);}
