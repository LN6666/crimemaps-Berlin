export const C361_FEATURE_GLSL=`
float c361rect(vec2 q,vec2 h){float d=max(abs(q.x)-h.x,abs(q.y)-h.y);return 1.-smoothstep(-.035,.055+fwidth(d),d);}
float c361arch(vec2 q,float w,float bottom,float spring){float d=max(abs(q.x)-w,max(bottom-q.y,q.y-spring));float a=1.-smoothstep(-.03,.06+fwidth(d),d);float b=1.-smoothstep(w-.03,w+.06+fwidth(q.y),length(vec2(q.x,q.y-spring)));return max(a,b*step(spring,q.y));}
vec3 c361Lmu(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 if(family==13891.){
  vec3 wall=vec3(.81,.79,.69),trim=vec3(.89,.86,.75),dark=vec3(.19,.26,.24);float u=f.x,y=f.y;float bay=mod(u+1.8,3.6)-1.8;vec3 c=wall;
  for(int k=0;k<3;k++){float cy=5.0+float(k)*8.0;float h=k==0?1.75:1.45;float rim=c361rect(vec2(bay,y-cy),vec2(.77,h+.16));float glass=c361rect(vec2(bay,y-cy),vec2(.59,h));if(k==0&&abs(u)<5.4){rim=c361arch(vec2(bay,y),.89,.2,5.7);glass=c361arch(vec2(bay,y),.72,.2,5.7);}c=mix(c,trim,rim);c=mix(c,dark,glass);float bars=max(c361rect(vec2(bay,y-cy),vec2(.035,h)),c361rect(vec2(bay,y-cy),vec2(.65,.04)));if(k>0||abs(u)>=5.4)c=mix(c,trim*.78,bars*glass);}
  float band=max(1.-smoothstep(.08,.17,abs(y-8.6)),max(1.-smoothstep(.07,.16,abs(y-17.0)),1.-smoothstep(.12,.24,abs(y-25.4))));return mix(c,trim,band);
 }

 if(family==13758.){float rib=max(1.-smoothstep(.035,.095,abs(mod(f.x,1.6)-.8)),1.-smoothstep(.035,.095,abs(mod(f.z,3.0)-1.5)));return mix(vec3(.39,.52,.53),vec3(.21,.30,.30),rib*.8);}
 if(family==13757.){
  float a=atan(f.z,f.x);float ribs=pow(abs(cos(a*8.)),48.);float rings=max(1.-smoothstep(.035,.10,abs(f.y-27.2)),1.-smoothstep(.035,.10,abs(f.y-28.8)));
  return mix(vec3(.40,.53,.55),vec3(.23,.34,.35),max(ribs,rings)*.7);
 }
 if(family==13750.)return vec3(.83,.82,.75);
 if(family==13751.)return vec3(.55,.29,.19);
 if(family==13752.)return vec3(.79,.74,.57);
 if(family==13754.)return vec3(.35,.39,.38);
 if(family==13755.)return vec3(.36,.28,.23);
 float y=f.y;float u=f.x;float bay=mod(u+23.59,47.69/9.)-(47.69/18.);
 vec3 stone=y<8.5?vec3(.60,.58,.48):vec3(.82,.77,.60);
 float joints=1.-smoothstep(.018,.05+fwidth(y),abs(mod(y,.7)-.35));stone=mix(stone,vec3(.46,.45,.38),joints*.25*(1.-smoothstep(8.,8.5,y)));
 float arch0=c361arch(vec2(bay,y-3.6),1.75,-2.4,1.2);
 float rect1=c361rect(vec2(bay,y-12.9),vec2(1.65,2.35));
 float arch2=c361arch(vec2(bay,y-21.2),1.65,-2.7,1.05);
 float outer=max(arch0,max(rect1,arch2));
 float in0=c361arch(vec2(bay,y-3.6),1.43,-2.15,1.2);
 float in1=c361rect(vec2(bay,y-12.9),vec2(1.38,2.1));
 float in2=c361arch(vec2(bay,y-21.2),1.38,-2.45,1.05);
 float inside=max(in0,max(in1,in2));stone=mix(stone,vec3(.53,.51,.43),outer);stone=mix(stone,vec3(.20,.28,.27),inside);
 float bars=max(c361rect(vec2(bay,y-13.),vec2(.045,3.)),c361rect(vec2(bay,y-21.),vec2(.04,3.1)));
 bars=max(bars,c361rect(vec2(bay,y-12.7),vec2(1.5,.04)));bars=max(bars,c361rect(vec2(bay,y-21.),vec2(1.5,.04)));stone=mix(stone,vec3(.60,.63,.57),bars*inside);
 // Ground passage/door domain has no floating window sill.
 if(abs(u)<8.5&&y<5.8)stone=mix(stone,vec3(.13,.18,.16),in0);
 float band=max(1.-smoothstep(.08,.18,abs(y-8.5)),max(1.-smoothstep(.07,.18,abs(y-17.5)),1.-smoothstep(.08,.22,abs(y-25.3))));stone=mix(stone,vec3(.87,.83,.69),band*.75);
 return stone;
}`;
