export const F137_GLSL=String.raw`float f137halfIntegral(float t,float a,float b){float q=clamp((t-a)/(b-a),0.,1.);return min(t,a)+(b-a)*(q-q*q*q+.5*q*q*q*q);}
float f137jointIntegral(float x,float a,float b){float t=fract(x);return floor(x)*(a+b)+f137halfIntegral(t,a,b)+.5*(a+b)-f137halfIntegral(1.-t,a,b);}
float f137line(float x,float period,float w){float phase=x/period,width=max(fwidth(phase),.00001),center=fract(phase),a=w/period,b=(w+.025)/period;return clamp((f137jointIntegral(center+.5*width,a,b)-f137jointIntegral(center-.5*width,a,b))/width,0.,1.);}
float f137rect(vec2 p,vec2 s){vec2 d=abs(p)-s;return 1.-smoothstep(-.02,.03,max(d.x,d.y));}
float f137arch(vec2 p,float r,float h){float low=f137rect(p-vec2(0.,h*.5),vec2(r,h*.5));float cap=(1.-smoothstep(r-.025,r+.025,length(p-vec2(0.,h))))*step(h,p.y);return max(low,cap);}
vec3 frankfurtHauptbahnhofWhole137(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6349.)>.25)return base;float u=frame.x,v=frame.y,y=p.y,role=frame.z;
 float nU=dot(normal.xz,vec2(-.85321609,-.52155757)),nV=dot(normal.xz,vec2(.52155757,-.85321609));
 vec3 stone=vec3(.69,.61,.47),dark=vec3(.15,.24,.29),glass=vec3(.25,.39,.48),metal=vec3(.56,.63,.62);
 if(role>10.5)return metal;if(role>9.5)return vec3(.95,.96,.92);if(role>8.5)return vec3(.84,.025,.04);if(role>7.5)return dark;
 if(role>6.5)return stone*(.98+.025*sin(u*3.7+y*1.8));if(role>5.5)return vec3(.27,.42,.35)*(1.+.045*sin(v*2.7+y*1.3));
 if(role>4.5){float axis=abs(nU)>.65?v:u;float win=f137arch(vec2(mod(axis+2.,4.)-2.,y-1.3),.67,2.5);float joints=max(f137line(y,.4,.013),f137line(axis+mod(floor(y/.4),2.)*.4,.8,.013));return mix(stone*(1.-joints*.15),dark,win);}
 if(role>3.5){
  if(abs(nU)>.65){float grid=max(f137line(v,1.3,.04),f137line(y,1.4,.04));float ribs=f137line(v,7.,.07);return mix(glass,metal,max(grid,ribs));}
  float grid=max(f137line(u,4.5,.08),f137line(y,3.,.08));return mix(vec3(.68,.66,.56),vec3(.39,.43,.39),grid*.6);
 }
 if(role>2.5){float cv=abs(v)>84.?sign(v)*100.5:(v>28.?56.3:(v< -28.?-56.3:0.));float width=abs(v)>84.?10.:17.;float glazed=1.-smoothstep(width-.08,width+.08,abs(v-cv));float paneGrid=max(f137line(u,1.15,.026),f137line(v,.95,.026));float ribs=f137line(u+74.,17.,.07);vec3 cream=vec3(.79,.79,.70)*(1.-.045*f137line(u,.6,.012));vec3 pane=mix(vec3(.33,.44,.45),metal,paneGrid*.8);return mix(mix(cream,pane,glazed),metal,ribs*.65);}
 if(role>1.5){float seams=max(f137line(u,.48,.011),f137line(v,.36,.01));return vec3(.29,.32,.30)*(1.-.11*seams);}
 float axis=abs(nU)>.6?v:u;float course=f137line(y,.5,.015),blocks=f137line(axis+mod(floor(y/.5),2.)*.6,1.2,.012);float weatherTone=.02*sin(u*4.7+v*2.1)*sin(y*2.9);vec3 c=stone+weatherTone;c=mix(c,vec3(.48,.43,.34),max(course,blocks)*.38);
 float street=step(.65,-nU);float central=step(abs(v),26.2)*street*step(110.,-u);float crown=13.+16.*sqrt(max(0.,1.-(v/28.)*(v/28.)));float highglass=central*step(10.5,y)*(1.-smoothstep(crown-1.55,crown-1.35,y));float grid=max(f137line(v,2.5,.055),f137line(y,2.2,.055));c=mix(c,mix(glass,metal,grid),highglass);float archPiers=max(1.-smoothstep(.55,.75,abs(v-8.7)),1.-smoothstep(.55,.75,abs(v+8.7)))*central*step(10.5,y);c=mix(c,stone*1.03,archPiers);
 float entrance=f137arch(vec2(mod(v+9.,18.)-9.,y),6.0,5.0)*central;float doorgrid=max(f137line(v,1.25,.045),f137line(y,2.6,.045));c=mix(c,mix(dark,metal,doorgrid),entrance);
 if(central<.5&&!(u< -110.&&abs(v)<28.)){float xx=mod(axis+2.75,5.5)-2.75;float low=f137arch(vec2(xx,y-1.4),1.1,3.7);float high=f137rect(vec2(xx,mod(y-8.,4.5)-2.25),vec2(.88,1.4))*step(8.8,y);float frames=max(f137line(xx,.55,.025),f137line(y,.85,.025));c=mix(c,mix(glass,metal,frames),max(low,high));}
 for(int k=0;k<3;k++){float belt=1.-smoothstep(.08,.16,abs(y-(9.8+float(k)*.4)));c=mix(c,stone*1.13,belt*.8);}
 return c;
}
`;
