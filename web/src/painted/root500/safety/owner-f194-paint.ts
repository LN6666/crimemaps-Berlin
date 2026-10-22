export const OWNER_F194_PAINT_GLSL=String.raw`
float j194Box(vec2 p,vec2 h){return 1.-smoothstep(-.035,.035,max(abs(p.x)-h.x,abs(p.y)-h.y));}
float j194Point(vec2 p,float w,float h){float top=h*.5-w*.50+sqrt(max(0.,w*w-p.x*p.x));return (1.-smoothstep(w*.48,w*.53,abs(p.x)))*(1.-smoothstep(top-.03,top+.03,p.y))*(1.-smoothstep(h*.5,h*.5+.05,-p.y));}
float j194Window(vec2 q,float w,float h){float outer=j194Point(q,w,h),inner=j194Point(q,w-.16,h-.22);return outer*.45+inner*.55;}
vec3 johanneskircheRecovery194(vec3 base,vec3 p,vec3 normal,vec4 f,float family){float u=f.x,y=f.y,v=f.z,k=f.w;vec3 stone=vec3(.69,.62,.50),dark=vec3(.12,.16,.15),trim=vec3(.79,.72,.58);float course=step(.955,fract(y/.32)),joint=step(.975,fract(u/.75+floor(y/.32)*.5));vec3 c=mix(stone,stone*.71,max(course,joint)*.36);
 if(k<.5){float tiles=max(step(.94,fract(u/.32)),step(.93,fract(y/.19)));return mix(vec3(.48,.20,.12),vec3(.33,.14,.10),tiles*.52);}
 if(abs(k-8.)<.5)return vec3(.46,.45,.40);
 if(abs(k-4.)<.5)return vec3(.36,.37,.34);
 if(abs(k-5.)<.5||abs(k-6.)<.5)return mix(c,trim,.10);
 if(abs(k-2.)<.5){float side=abs(dot(normal.xz,vec2(-.8989716,-.438)))>.65?u-15.936:v+.373;float bay=mod(side+1.05,2.1)-1.05;float upper=j194Point(vec2(bay,y-25.6),.64,6.2);c=mix(c,dark,upper);float mull=step(abs(bay),.045)*upper;c=mix(c,trim,mull);float band=max(1.-smoothstep(.05,.13,abs(y-23.3)),1.-smoothstep(.05,.13,abs(y-29.7)));return mix(c,trim,band*.7);}
 if(abs(k-3.)<.5){float side=abs(dot(normal.xz,vec2(-.8989716,-.438)))>.65?u-15.936:v+.373;float clock=1.-smoothstep(1.20,1.26,length(vec2(side,y-19.6)));float rim=clock*(smoothstep(1.06,1.15,length(vec2(side,y-19.6))));c=mix(c,vec3(.15,.19,.17),clock);c=mix(c,vec3(.78,.67,.40),rim);float hands=(1.-smoothstep(.035,.07,abs(side)))*step(y-19.6,1.0)*step(-.15,y-19.6)+(1.-smoothstep(.035,.07,abs(y-19.6-side*.45)))*step(-.8,side)*step(side,.1);c=mix(c,vec3(.84,.75,.48),min(1.,hands)*clock);float portal=j194Point(vec2(side,y-2.6),1.4,4.9);return mix(c,vec3(.23,.20,.15),portal);}
 // Source footprint axis registers paired Gothic side windows at lower aisles and clerestory.
 float bay=mod(u+2.35,4.7)-2.35;float low=j194Window(vec2(bay,y-4.1),.86,4.8),upper=j194Window(vec2(bay,y-10.4),.65,3.0);float mask=max(low,upper);c=mix(c,dark,mask);float tracery=step(abs(bay),.035)*mask+step(abs(y-4.3),.035)*low;c=mix(c,trim,min(1.,tracery));
 // End gables / polygonal choir receive a rose and tall lancets in their local transverse coordinate.
 if(abs(normal.x*(-.438)+normal.z*.8989716)>.72){float r=length(vec2(v,y-15.2)),rose=(1.-smoothstep(1.35,1.43,r))*smoothstep(.35,.42,r);c=mix(c,dark,rose);float roselines=max(1.-smoothstep(.035,.07,abs(v)),1.-smoothstep(.035,.07,abs(y-15.2)));c=mix(c,trim,rose*roselines);float lancet=j194Window(vec2(mod(v+1.35,2.7)-1.35,y-7.),.80,6.5);c=mix(c,dark,lancet);if(u>18.)c=mix(c,vec3(.24,.21,.16),j194Point(vec2(v,y-2.),1.6,3.7));}return c;
}
`;
