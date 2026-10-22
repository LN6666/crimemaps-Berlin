import {c323MaterialFragment} from './c323-feature-glsl';
export const C322_FEATURE_GLSL=`
float c322Box(vec2 p,vec2 halfSize){vec2 a=max(fwidth(p),vec2(.012));return (1.-smoothstep(halfSize.x-a.x,halfSize.x+a.x,abs(p.x)))*(1.-smoothstep(halfSize.y-a.y,halfSize.y+a.y,abs(p.y)));}
vec3 c322TriangleFront(vec3 base,vec4 f,float family){
 if(family==13331.)return vec3(.34,.36,.35);
 if(family==13332.){vec2 q=f.zw-vec2(10000.);return q.x<260.&&q.y<260.?vec3(.48,.26,.19):(q.y<200.||q.x<210.?vec3(.25,.27,.26):vec3(.43,.46,.44));}
 if(family==13333.)return vec3(.29,.32,.31);
 if(family==13334.)return vec3(.40,.48,.43);
 if(family==13337.)return base;
 if(family==13338.)return vec3(.78,.77,.71);
 if(family==13335.||family==13336.){
  float u=f.x,y=f.y;bool north=family==13335.;
  vec3 wall=north?vec3(.83,.76,.60):(u< -16.&&u> -28.?vec3(.74,.55,.49):vec3(.78,.77,.71));
  float v=mod(y,3.125)-1.65,ux=mod(u+1.35,2.7)-1.35;
  if(y>12.4)return wall;
  float win=c322Box(vec2(ux,v),vec2(.60,1.02));float frame=c322Box(vec2(ux,v),vec2(.73,1.14));
  vec3 outColor=mix(wall,wall*.85,frame);outColor=mix(outColor,vec3(.19,.26,.25),win);
  float cross=(1.-smoothstep(.025,.055,abs(ux)))+(1.-smoothstep(.025,.055,abs(v-.15)));
  outColor=mix(outColor,vec3(.67,.72,.65),clamp(cross,0.,1.)*win);
  float band=1.-smoothstep(.04,.09,abs(mod(y+.02,3.125)-.07));if(north&&y<3.1&&abs(u)<8.5){float du=u+6.4,pu=u-4.8;float lh=2.15+.45*sqrt(max(0.,1.-pow(du/.68,2.))),rh=2.+.65*sqrt(max(0.,1.-pow(pu/1.55,2.)));float left=(1.-smoothstep(.65,.71,abs(du)))*(1.-smoothstep(lh-.04,lh+.04,y)),right=(1.-smoothstep(1.52,1.58,abs(pu)))*(1.-smoothstep(rh-.04,rh+.04,y));if(abs(du)<.88||abs(pu)<1.75)outColor=mix(wall,vec3(.19,.18,.15),max(left,right));}return mix(outColor,wall*.88,band);
 }
 float u=f.x,y=f.y;vec3 stone=vec3(.76,.72,.60),trim=vec3(.84,.81,.71),glass=vec3(.18,.25,.25);
 if(y>12.45)return stone;
 float center=29.0;float central=1.-step(11.,abs(u-center));float local=u-center;
 vec3 col=mix(vec3(.80,.79,.66),stone,central);
 float rust=1.-smoothstep(.018,.055,abs(fract(y/.40)-.5));col=mix(col,col*.88,rust*.6);
 float floorId=floor(y/2.5),v=mod(y,2.5)-1.35;
 float bay=mod(local+1.22,2.44)-1.22;
 float head=floorId==1.||floorId==4.? .65+.34*sqrt(max(0.,1.-pow(bay/.65,2.))):.98;
 float opening=(1.-smoothstep(.57,.64,abs(bay)))*smoothstep(-1.02,-.96,v)*(1.-smoothstep(head-.04,head+.04,v));
 float border=c322Box(vec2(bay,v),vec2(.74,1.13));col=mix(col,trim,border);col=mix(col,glass,opening);
 float mullion=(1.-smoothstep(.025,.055,abs(bay)))+(1.-smoothstep(.025,.055,abs(v-.12)));col=mix(col,trim,clamp(mullion,0.,1.)*opening);
 float cornice=1.-smoothstep(.045,.10,abs(mod(y+.03,2.5)-.08));col=mix(col,trim,cornice);
 // The central ground-floor arch is an entrance, independent of window rhythm.
 if(abs(local)<1.6&&y<2.5){col=stone;float head=1.28+sqrt(max(0.,1.-pow(local/1.12,2.)))*.82;float door=(1.-smoothstep(1.08,1.15,abs(local)))*(1.-smoothstep(head-.04,head+.04,y));col=mix(col,vec3(.17,.19,.16),door);}
 return col;
}
`;
export function c322MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C322 dispatcher drift');return c323MaterialFragment(source.replace(anchor,C322_FEATURE_GLSL+'\n'+anchor+'if(family>=13330.&&family<=13338.)return c322TriangleFront(base,frame,family);'),city);}
