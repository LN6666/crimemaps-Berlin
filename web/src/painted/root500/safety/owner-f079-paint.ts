export const F079_GLSL=String.raw`vec3 olympiaturmWhole079(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6339.)>.25)return base;
 float angle=frame.x,y=frame.y,role=frame.w;
 vec3 concrete=vec3(.70,.685,.615),steel=vec3(.49,.52,.51);
 if(role<1.5){float seam=1.-smoothstep(.014,.055,abs(mod(y+1.9,3.8)-1.9));return concrete*(1.-.055*seam+.012*sin(angle*5.+y*.02));}
 if(role<2.5)return vec3(.61,.635,.60)*mix(.82,1.,smoothstep(-.2,.5,normal.y));
 if(role<3.5){
  // Four localizedinneroperationslevels behindopenouterantenna decks.
  float x=mod(angle*6.2+1.65,3.3)-1.65;float yy=mod(y-148.,4.8);
  float aperture=(1.-smoothstep(.45,.49,abs(x)))*step(1.2,yy)*step(yy,3.3);
  return mix(concrete,vec3(.19,.23,.225),aperture);
 }
 if(role<4.5){
  // Restaurant181 and enclosedviewingdrum, distinctfromplainstem.
  float div=1.-smoothstep(.012,.035,abs(mod(angle*14.15+0.8,1.6)-.8));
  float sill=1.-smoothstep(.03,.085,abs(mod(y-177.,3.9)-1.95));
  vec3 glass=vec3(.20,.28,.29)*(1.+.10*sin(angle*3.+.5));
  float blind=step(.4,sin(angle*4.+floor((y-177.)/3.9)*.7));
  glass=mix(glass,vec3(.49,.405,.29),blind*.48);
  return mix(glass,vec3(.77,.78,.72),max(div,sill));
 }
 if(role<5.5)return steel;
 if(role<6.5)return vec3(.72,.73,.69);
 if(role<7.5){float stripe=mod(floor((291.28-y)/5.2),2.);return mix(vec3(.62,.13,.10),vec3(.86,.86,.80),stripe);}
 if(role<8.5)return vec3(.64,.66,.61);
 if(role<9.5)return abs(normal.y)>.7?vec3(.38,.40,.39):vec3(.64,.63,.57);
 if(role>10.5)return vec3(.80,.80,.745);
 return concrete*mix(.80,.96,smoothstep(-.6,.3,normal.y));
}
`;
