export const F144_GLSL=String.raw`float f144line(float x,float period,float w){float d=abs(mod(x+period*.5,period)-period*.5);return 1.-smoothstep(w,w+.025,d);}
float f144rect(vec2 p,vec2 s){vec2 d=abs(p)-s;return 1.-smoothstep(-.015,.025,max(d.x,d.y));}
float f144pointed(vec2 p,float width,float spring,float rise){float q=abs(p.x)/width;float top=spring+rise*(1.-pow(clamp(q,0.,1.),.68));return (1.-smoothstep(width-.025,width+.025,abs(p.x)))*step(0.,p.y)*(1.-smoothstep(top-.025,top+.025,p.y));}
vec3 dreikoenigskircheWhole144(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6352.)>.25)return base;float u=frame.x,v=frame.y,role=frame.z,y=p.y;vec3 stone=vec3(.57,.40,.32),pale=vec3(.72,.68,.54),dark=vec3(.13,.18,.19);float courses=f144line(y,.32,.009),joints=f144line((abs(normal.z)>.6?u:v)+mod(floor(y/.32),2.)*.32,.64,.009);vec3 masonry=stone*(1.+.035*sin(u*3.1+v*1.7)*sin(y*4.3));masonry=mix(masonry,vec3(.64,.50,.40),max(courses,joints)*.48);
 if(role>8.5)return vec3(.65,.51,.25);if(role>7.5)return vec3(.16,.17,.17);if(role>6.5)return masonry*1.08;
 if(role>1.5&&role<2.5){float seams=max(f144line(u+v*.18,.3,.008),f144line(y,.24,.008));return vec3(.23,.26,.28)*(1.-.11*seams);}
 if(u< -18.1){
  float wallAxis=abs(normal.x)>.55?v-1.45:u+21.1;vec3 c=masonry;float pilaster=f144line(wallAxis,2.6,.13);c=mix(c,stone*.8,pilaster*.5);
  if(y>25.&&y<43.5){float bell=f144pointed(vec2(wallAxis,y-27.5),1.05,9.0,3.4);float split=max(f144line(wallAxis,.65,.055),f144line(y,.5,.025));c=mix(c,mix(dark,stone,split),bell);float edge=f144pointed(vec2(wallAxis,y-27.25),1.3,9.25,3.7)-bell;c=mix(c,stone*1.2,max(0.,edge));}
  if(y>45.&&y<55.){float lenXZ=length(normal.xz);vec2 tangent=vec2(-normal.z,normal.x)/max(.001,lenXZ);float s=dot(vec2(u+21.1,v-1.45),tangent);vec2 cp=vec2(s,y-49.0);float rad=length(cp),dial=1.-smoothstep(.98,1.05,rad),rim=1.-smoothstep(.08,.13,abs(rad-1.13));c=mix(c,stone*1.2,rim);c=mix(c,vec3(.37,.09,.08),dial);float ang=atan(cp.x,cp.y);float ticks=(1.-smoothstep(.04,.085,abs(sin(ang*6.))))*step(.72,rad)*dial;float hands=max(f144rect(cp-vec2(0.,.32),vec2(.035,.42)),f144rect(cp-vec2(.22,.04),vec2(.3,.035)));c=mix(c,vec3(.82,.69,.38),max(ticks,hands)*dial);float slit=f144pointed(vec2(s,y-52.2),.35,1.0,.7);c=mix(c,dark,slit);}
  if(y<24.){float big=f144pointed(vec2(wallAxis,y-12.),1.1,6.6,2.8);float mull=max(f144line(wallAxis,.62,.045),f144line(y,.65,.025));c=mix(c,mix(dark,stone,mull),big);}
  if(normal.x<-.7&&u< -23.3){vec2 dp=vec2(v-1.45,y-1.44);float door=f144pointed(dp,1.4,3.5,2.7);float transom=step(3.5,dp.y);float grill=max(f144line(v,.35,.022),f144line(y,.4,.022));vec3 wood=vec3(.14,.105,.08)*(1.-.08*f144line(v,.18,.006));wood=mix(wood,mix(dark,stone*.8,grill),transom);float middle=f144line(v-1.45,10.,.035);wood=mix(wood,vec3(.28,.26,.19),middle);float hinge=max(f144line(y-2.1,1.5,.045),f144line(v-1.45,.7,.024))*step(1.5,dp.y)*(1.-transom);wood=mix(wood,vec3(.26,.25,.20),hinge*.6);c=mix(c,wood,door);}
  return c;
 }
 vec3 c=pale*(1.+.025*sin(u*2.6+y*2.2));float trim=max(f144line(y,.32,.009),joints);c=mix(c,vec3(.77,.73,.61),trim*.30);float axis=abs(normal.z)>.6?u:v-.45;float cell=0.;
 if(abs(normal.z)>.6){float dist=1e4;for(int i=0;i<5;i++){float centerU=i==0?-14.1:(i==1?-9.3:(i==2?-1.7:(i==3?6.7:15.1)));float q=abs(u-centerU);if(q<dist){dist=q;cell=u-centerU;}}}else cell=mod(axis+3.,5.)-2.5;
 float win=f144pointed(vec2(cell,y-4.2),1.65,10.6,4.3);float outer=f144pointed(vec2(cell,y-3.95),1.92,10.85,4.6);float bars=max(f144line(cell,.74,.045),f144line(y,.8,.018));float tr=f144line(cell,.52,.02)*step(15.1,y);vec3 glass=mix(dark,vec3(.38,.39,.33),max(bars,tr));c=mix(c,stone,max(0.,outer-win));c=mix(c,glass,win);float plinth=1.-smoothstep(1.6,1.9,y);c=mix(c,masonry,plinth);float band=max(1.-smoothstep(.06,.11,abs(y-3.4)),1.-smoothstep(.08,.14,abs(y-21.5)));c=mix(c,stone,band);
 if(y>22.){c=masonry;float slit=max(f144pointed(vec2(cell,y-23.),.30,2.6,1.1),max(f144pointed(vec2(cell-.78,y-23.),.24,1.65,.75),f144pointed(vec2(cell+.78,y-23.),.24,1.65,.75)));c=mix(c,dark,slit);}
 return c;
}
`;
