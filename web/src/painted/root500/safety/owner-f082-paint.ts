export const F082_GLSL=String.raw`float f082rect(vec2 p,vec2 size){vec2 d=abs(p)-size;return 1.-smoothstep(-.012,.026,max(d.x,d.y));}
float f082line(float x,float period,float w){float d=abs(mod(x+period*.5,period)-period*.5);return 1.-smoothstep(w,w+.018,d);}
vec3 lustheimWhole082(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6340.)>.25)return base;
 float u=frame.x,v=frame.y,role=frame.z,y=p.y;
 vec3 yellow=vec3(.88,.81,.59),cream=vec3(.95,.93,.83),glass=vec3(.14,.19,.19),brown=vec3(.25,.13,.075);
 if(role>11.5){if(dot(normal.xz,vec2(.018,.999838))>-.7)return cream;float dx=min(abs(v-.78),abs(v+.78));float pane=f082rect(vec2(dx,y-14.93),vec2(.52,.58));float bars=max(f082line(v,.39,.028),f082line(y-.05,.52,.022));return mix(cream,mix(glass,brown,bars),pane);}
 if(role>10.5){float panel=f082line(u,1.6,.12);float medallion=1.-smoothstep(.30,.35,length(vec2(mod(u+.8,1.6)-.8,(y-12.27)*1.2)));return mix(vec3(.79,.73,.55),cream,max(panel*.35,medallion*.65));}
 if(role>9.5){
  float dx=min(abs(u+4.),min(abs(u),abs(u-4.)));float nV=dot(normal.xz,vec2(-.999838,.018));if(abs(nV)<.6)dx=min(abs(v+2.1),abs(v-2.1));
  float surround=f082rect(vec2(dx,y-17.50),vec2(1.10,1.20)),window=f082rect(vec2(dx,y-17.50),vec2(.85,.94));
  vec3 c=mix(yellow,cream,surround);vec3 wc=mix(glass,cream,1.-smoothstep(17.0,17.08,y));float bars=max(f082line(dx,.57,.032),f082line(y-17.5,.63,.026));return mix(c,mix(wc,brown,bars),window);
 }
 if(role>7.5&&role<8.5)return vec3(.57,.54,.31);
 if(role>6.5&&role<7.5)return vec3(.25,.32,.28);
 if(role>5.5&&role<6.5)return vec3(.57,.56,.49)*(1.-.10*f082line(y,.18,.014));
 if(role>2.5&&role<3.5)return cream*(1.-.045*f082line(y,.48,.012));
 if(role>1.5&&role<2.5){float tile=f082line(y,.14,.014),joint=f082line(u+v+mod(floor(y/.14),2.)*.12,.29,.015);return vec3(.58,.245,.135)*(1.-.14*tile-.08*joint+.035*sin(u*1.7+v));}
 float nU=dot(normal.xz,vec2(.018,.999838)),nV=dot(normal.xz,vec2(-.999838,.018));
 bool mainFace=abs(nV)>.75;bool endFace=abs(nU)>.8&&abs(u)>23.8;
 float axis=mainFace?u:v;float dx=100.;bool wing=abs(u)>8.45;
 if(mainFace){if(wing){float au=abs(u);dx=min(min(abs(au-10.6),abs(au-14.5)),min(abs(au-18.4),abs(au-22.25)));}else dx=abs(abs(u)-6.2);}
 else if(endFace)dx=min(abs(v),min(abs(v-7.),abs(v+7.)));
 vec3 c=yellow;
 float pier=mainFace?(wing?min(abs(mod(abs(u)-8.7,3.9)),abs(mod(abs(u)-8.7,3.9)-3.9)):min(abs(abs(u)-3.3),abs(abs(u)-7.9))):min(abs(v+10.6),min(abs(v-10.6),min(abs(v-3.5),abs(v+3.5))));
 c=mix(c,cream,1.-smoothstep(.13,.23,pier));
 if(y<1.10){float joint=max(f082line(y,.18,.012),f082line(axis+mod(floor(y/.18),2.)*.4,.8,.012));c=vec3(.69,.63,.45)*(1.-.12*joint);float basement=f082rect(vec2(dx,y-.31),vec2(.36,.20));return mix(c,mix(glass,vec3(.3,.3,.27),f082line(axis,.12,.016)),basement);}
 float panel=f082rect(vec2(dx,y-6.0),vec2(1.28,4.45));c=mix(c,cream,panel);
 float lowerFrame=f082rect(vec2(dx,y-3.15),vec2(.88,1.85));float lower=f082rect(vec2(dx,y-3.15),vec2(.65,1.60));
 float upperFrame=f082rect(vec2(dx,y-8.55),vec2(.90,1.65));float upper=f082rect(vec2(dx,y-8.55),vec2(.67,1.42));
 c=mix(c,vec3(.75,.69,.48),max(lowerFrame,upperFrame));float grid=max(f082line(axis,.47,.026),f082line(y,.62,.025));vec3 wc=mix(glass,brown,grid);c=mix(c,wc,lower);vec3 upperC=mix(cream,wc,smoothstep(8.6,8.68,y));c=mix(c,upperC,upper);
 // Actual ground-window alternating shallow triangular and segmental hood forms.
 float hood=max(0.,1.-dx/1.28);float pediment=step(5.10,y)*step(y,5.10+.60*hood)*step(dx,1.28);c=mix(c,vec3(.84,.79,.61),pediment);
 c=mix(c,cream,max(1.-smoothstep(.03,.07,abs(y-5.1)),1.-smoothstep(.04,.08,abs(y-11.2))));
 if(mainFace&&!wing){
  float door=(1.-smoothstep(.98,1.04,abs(u)))*step(1.08,y)*step(y,4.65);float arch=(1.-smoothstep(1.,1.05,length(vec2(u,(y-4.65)*1.0))))*step(4.65,y);float opening=max(door,arch);c=mix(c,mix(vec3(.13,.105,.075),brown,.20*f082line(u,.28,.016)),opening);
  float rr=length(vec2(u,y-8.65));float ring=1.-smoothstep(.08,.15,abs(rr-1.32));c=mix(c,cream,ring);float roundglass=1.-smoothstep(1.15,1.20,rr);float bars=max(f082line(u,.58,.035),f082line(y-8.65,.6,.03));c=mix(c,mix(glass,brown,bars),roundglass);
 }
 if(endFace&&u>23.8&&abs(v)<2.25&&y>6.4&&y<10.5){
  vec2 q=vec2(v,(y-8.55));float r=length(q);float arc=(1.-smoothstep(.035,.08,abs(r-1.65)))*step(-1.15,q.y);float rays=0.;for(int i=0;i<7;i++){float a=-2.7+float(i)*.42;vec2 d=vec2(cos(a),sin(a));float t=dot(q,d);float off=abs(q.x*d.y-q.y*d.x);rays=max(rays,(1.-smoothstep(.02,.04,off))*step(.20,t)*step(t,1.3));}c=mix(cream,vec3(.65,.49,.43),max(arc,rays)*.60);
 }
 return c;
}
`;
