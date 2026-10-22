export const OWNER_F180_PAINT_GLSL=`
float th180Box(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;return 1.-smoothstep(-.015,.015,max(d.x,d.y));}
vec3 tonhalleRecovery180(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float x=frame.x,y=frame.y,z=frame.z,k=frame.w;vec2 q=vec2(x,z);float r=length(q),angle=atan(z,x),tau=6.28318530718;
 if(k<.5){
 // Existing source50-segment dome; physical radial copper standing seams follow native curvature, no invented roof waves.
 vec3 c=vec3(.65,.76,.69);float phase=fract(angle/tau*64.+.5)-.5,dist=abs(phase)*tau/64.*r;float seam=1.-smoothstep(.025,.070,dist);c=mix(c,vec3(.39,.52,.47),seam*.62);float panel=1.-smoothstep(.02,.05,abs(mod(y-20.,2.2)-1.1));c=mix(c,vec3(.52,.65,.58),panel*.12);return c;
 }
 if(k<1.5){vec3 c=vec3(.44,.34,.31);float seam=max(1.-smoothstep(.015,.04,abs(mod(x,.60)-.30)),1.-smoothstep(.015,.04,abs(mod(z,.40)-.20)));return mix(c,vec3(.36,.29,.27),seam*.18);}
 if(k>4.5&&k<5.5)return vec3(.19,.21,.21); // Exact physical entrance canopy: metal roof/underside and thin posts, no windows.
 if(k>6.5){vec3 c=vec3(.68,.65,.55);float line=1.-smoothstep(.015,.035,abs(mod(y,.55)-.275));return mix(c,vec3(.52,.51,.44),line*.23);} // Muschelkalk corner pavilions/plinth.
 if(k>2.5&&k<3.5){vec3 c=vec3(.40,.41,.39);float seam=1.-smoothstep(.012,.035,abs(mod(angle/tau*24.,1.)-.5));return mix(c,vec3(.30,.31,.30),seam*.2);} // Native annular flat roof outside copper dome, kept gray.
 vec3 c=vec3(.42,.25,.20);float along=abs(normal.x)>.7?z:x;
 float bed=1.-smoothstep(.010,.025,abs(mod(y,.14)-.07));float brick=1.-smoothstep(.012,.028,abs(mod(along+mod(floor(y/.14),2.)*.17,.34)-.17));c=mix(c,vec3(.63,.57,.45),max(bed,brick*.7)*.24);
 if(k>3.5&&k<4.5){
 // Circular brick drum: independent continuous angular coordinates, matching all27 original polygon faces without per-face pattern resets.
 float period=tau*24./60.,cell=mod(angle*24.+period*.5,period)-period*.5;float pane=step(5.65,y)*step(y,15.9-abs(cell)/.94*1.55)*step(abs(cell),.94);float surround=step(5.45,y)*step(y,16.16-abs(cell)/1.08*1.55)*step(abs(cell),1.08);c=mix(c,vec3(.29,.22,.19),surround);c=mix(c,vec3(.25,.34,.35),pane);
 float bar=1.-smoothstep(.025,.06,abs(cell));for(int j=0;j<5;j++)bar=max(bar,1.-smoothstep(.025,.055,abs(y-(6.6+float(j)*1.9))));c=mix(c,vec3(.39,.43,.41),bar*pane);
 float pier=step(.96,abs(cell))*step(5.2,y)*step(y,18.1);c=mix(c,vec3(.47,.30,.23),pier*.66);float contact=(1.-smoothstep(.06,.18,abs(abs(cell)-1.06)))*step(5.2,y)*step(y,18.1);c=mix(c,vec3(.25,.18,.15),contact*.48);
 // Photographed herringbone upper brick band and continuous dark coping, all solid.
 if(y>17.8){float chevron=1.-smoothstep(.025,.07,abs(mod(angle*24.+abs(mod(y-17.8,.52)-.26),.55)-.275));c=mix(c,vec3(.57,.39,.29),chevron*.27);}if(y>19.65)c=vec3(.23,.22,.19);return c;
 }
 // Original low platform perimeter: no glass painted on solid southern/service faces or limestone corner pavilions.
 if(y<1.05){vec3 stone=vec3(.66,.64,.54);float joint=1.-smoothstep(.02,.05,abs(mod(y,.45)-.225));return mix(stone,vec3(.53,.52,.45),joint*.3);}
 if(k<2.5){float period=3.2,cell=mod(along+1.6,period)-1.6;float pane=th180Box(vec2(cell,y),vec2(0.,2.85),vec2(.88,1.53));c=mix(c,vec3(.19,.25,.25),pane);float bars=th180Box(vec2(cell,y),vec2(0.,2.85),vec2(.035,1.53));for(int i=0;i<3;i++)bars=max(bars,th180Box(vec2(cell,y),vec2(0.,1.85+float(i)*1.03),vec2(.88,.045)));c=mix(c,vec3(.28,.32,.30),bars*pane);float shadow=th180Box(vec2(cell,y),vec2(1.07,2.8),vec2(.13,1.9));c=mix(c,vec3(.27,.19,.16),shadow*.55);}
 else if(z< -28.){for(int i=0;i<4;i++){float xx=-18.+float(i)*12.;float pane=th180Box(vec2(x,y),vec2(xx,2.6),vec2(.66,.42));c=mix(c,vec3(.20,.25,.24),pane);float bars=(1.-smoothstep(.025,.05,abs(mod(x,.23)-.115)))*pane;c=mix(c,vec3(.43,.45,.41),bars);}}
 if(y>4.73)c=mix(c,vec3(.68,.65,.53),.72);return c;
}
`;
