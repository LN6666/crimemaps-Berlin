export const C446_FEATURE_GLSL=String.raw`
float c446Box(vec2 p,vec2 a,vec2 b){vec2 d=min(p-a,b-p);return smoothstep(-.025,.025,min(d.x,d.y));}
float c446Line(float a,float x,float w){return 1.-smoothstep(w,w+.035,abs(x-a));}
float c446Glass0(vec2 p,float y){return step(24.350,y)*smoothstep(-.04,.04,-1.0*((6.7814973)*(p.y-(27.6860093))-(1.7814856)*(p.x-(118.5012808))))*smoothstep(-.04,.04,-1.0*((2.0153274)*(p.y-(29.4674949))-(-7.6436398)*(p.x-(125.2827781))))*smoothstep(-.04,.04,-1.0*((-6.7800947)*(p.y-(21.8238551))-(-1.7925285)*(p.x-(127.2981055))))*smoothstep(-.04,.04,-1.0*((-2.0167301)*(p.y-(20.0313266))-(7.6546827)*(p.x-(120.5180108))));}
float c446Glass1(vec2 p,float y){return step(24.350,y)*smoothstep(-.04,.04,-1.0*((6.7675390)*(p.y-(30.6517757))-(1.8358179)*(p.x-(129.7477477))))*smoothstep(-.04,.04,-1.0*((2.0792362)*(p.y-(32.4875937))-(-7.6467434)*(p.x-(136.5152867))))*smoothstep(-.04,.04,-1.0*((-6.7675390)*(p.y-(24.8408503))-(-1.8358179)*(p.x-(138.5945229))))*smoothstep(-.04,.04,-1.0*((-2.0792362)*(p.y-(23.0050323))-(7.6467434)*(p.x-(131.8269839))));}
float c446Glass2(vec2 p,float y){return step(30.450,y)*smoothstep(-.04,.04,-1.0*((-7.6222567)*(p.y-(14.2551083))-(4.1710912)*(p.x-(108.6122834))))*smoothstep(-.04,.04,-1.0*((4.2375068)*(p.y-(18.4261995))-(7.7533666)*(p.x-(100.9900268))))*smoothstep(-.04,.04,-1.0*((7.6208540)*(p.y-(26.1795661))-(-4.1600483)*(p.x-(105.2275336))))*smoothstep(-.04,.04,-1.0*((-4.2361042)*(p.y-(22.0195178))-(-7.7644095)*(p.x-(112.8483876))));}
float c446Glass(vec2 p,float y){return max(c446Glass0(p,y),max(c446Glass1(p,y),c446Glass2(p,y)));}
vec3 c446Campus(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 bool hul=family<14801.5;bool sch=family>14801.5&&family<14803.5;bool clock=family>14803.5;bool roof=family<14800.5||(family>14801.5&&family<14802.5)||(family>14803.5&&family<14804.5);
 if(roof){
  if(clock){float seam=1.-smoothstep(.018,.06,abs(fract(f.x*.45)-.5));return vec3(.29,.47,.43)*(1.-seam*.08);}
  vec3 red=vec3(.61,.29,.19);float course=1.-smoothstep(.016,.045,abs(fract(f.y*1.8)-.5));red*=1.-.055*course;
  if(hul){float gl=c446Glass(f.xy,f.z);float mull=max(1.-smoothstep(.025,.065,abs(fract(f.x*.48)-.5)),1.-smoothstep(.025,.065,abs(fract(f.y*.48)-.5)));red=mix(red,mix(vec3(.37,.49,.48),vec3(.68,.71,.67),mull*.75),gl);}
  return red;
 }
 float u=f.x,y=f.y;vec2 world=f.z<1.5?vec2(f.x,f.w):vec2(f.w,f.x);
 if(clock){
  vec3 t=vec3(.53,.51,.45);float along=u-(f.z<1.5?8.1423872:33.3548591);
  float edging=smoothstep(2.8,3.4,abs(along));t=mix(t,vec3(.29,.30,.27),edging*.75);
  t=mix(t,vec3(.31,.33,.29),max(c446Line(38.,y,.3),c446Line(47.2,y,.3)));
  vec2 cc=vec2(along,y-42.3);float face=1.-smoothstep(2.4,2.5,length(cc));t=mix(t,vec3(.13,.17,.16),face);
  float hands=max(c446Box(cc,vec2(-.075,-.15),vec2(.075,1.8)),c446Box(cc,vec2(-1.4,-.075),vec2(.15,.075)));
  float rim=1.-smoothstep(.04,.10,abs(length(cc)-2.15));t=mix(t,vec3(.77,.72,.45),face*max(hands,rim));return t;
 }
 vec3 wall=hul?vec3(.70,.67,.57):vec3(.62,.595,.53);vec3 stone=hul?vec3(.56,.54,.47):vec3(.43,.44,.40);vec3 frame=vec3(.78,.79,.73);
 float baseH=hul?1.2:3.1;if(y<baseH)wall=stone;
 float period=hul?3.4:5.3;float center=hul?2.1:5.45;float row=hul?floor((y-center)/period+.5):floor((y-center)/period+.5);float cy=center+row*period;
 float ph=mod(u+1.4,hul?3.0:3.8)-(hul?1.5:1.9);float hh=hul?.75:1.45;float hw=hul?.48:.66;
 float glass=c446Box(vec2(ph,y-cy),vec2(-hw,-hh),vec2(hw,hh));float rim=c446Box(vec2(ph,y-cy),vec2(-hw-.10,-hh-.10),vec2(hw+.10,hh+.10));
 float windowZone=hul?step(1.,y)*(1.-step(20.0,y)):step(3.1,y)*(1.-step(18.,y));
 wall=mix(wall,frame,rim*windowZone);wall=mix(wall,vec3(.22,.30,.31),glass*windowZone);
 float mull=max(c446Line(0.,ph,.035),c446Line(cy,y,.035));wall=mix(wall,frame,glass*windowZone*mull);
 float band=hul?max(c446Line(1.2,y,.10),c446Line(20.2,y,.2)):max(c446Line(3.1,y,.15),max(c446Line(8.1,y,.12),c446Line(18.,y,.25)));
 wall=mix(wall,stone,band);
 if(hul&&y>24.2){float g=c446Glass(world,y);wall=mix(wall,vec3(.37,.47,.46),g);}
 // Schumann entrance centred under the western clock-tower axis, with no window sill.
 if(sch&&f.z>1.5&&f.z<2.5&&abs(u-33.3548591)<2.2&&y<5.1){float door=c446Box(vec2(u,y),vec2(33.3548591-1.5,0.),vec2(33.3548591+1.5,4.2));wall=mix(wall,vec3(.16,.20,.19),door);}
 return wall;
}
`;
export const C446_DISPATCH='if(family>=14800.&&family<=14805.)return c446Campus(base,p,normal,frame,family);';
export function c446MaterialFragment(source:string,city:string){if(city!=='dresden')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C446 dispatcher drift');return source.replace(anchor,C446_FEATURE_GLSL+'\n'+anchor+'if(family>=14800.&&family<=14805.)return c446Campus(base,p,normal,frame,family);');}
