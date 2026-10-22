import {c324MaterialFragment} from './c324-feature-glsl';
export const C323_FEATURE_GLSL=`
vec3 c323MuffatMaterial(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 vec3 ochre=vec3(.79,.62,.32),trim=vec3(.88,.73,.44),dark=vec3(.20,.24,.23);
 if(family==13340.)return ochre;
 if(family==13342.)return vec3(.61,.27,.15);
 if(family==13341.){
  if(f.y>45.)return vec3(.31,.36,.34);
  float band=1.-smoothstep(.14,.28,min(min(abs(f.y-10.),abs(f.y-12.)),min(abs(f.y-43.5),abs(f.y-44.7))));
  vec3 c=mix(ochre,trim,band);
  if(normal.z<-.6){float r=length(vec2((f.x-9.15)*.8,f.y-36.7));float medallion=1.-smoothstep(.09,.16,abs(r-.85));c=mix(c,trim,medallion);}
  return c;
 }
 if(family==13343.){
  if(f.x<0.||f.x>12.8||abs(f.z)>1.0)return ochre;
  float u=f.x,y=f.y;vec3 c=ochre;
  float band=1.-smoothstep(.04,.09,min(abs(y-3.65),abs(y-7.25)));c=mix(c,trim,band);
  // Three own-photo bays on the southern front; no window program on the chimney.
  float bay=mod(u-2.2+1.95,3.9)-1.95;float level=step(3.7,y),v=y-(level>.5?5.5:1.65);
  float radius=.78,head=.65+.65*sqrt(max(0.,1.-pow(bay/radius,2.)));
  float aa=max(.02,fwidth(bay));float win=(1.-smoothstep(radius-aa,radius+aa,abs(bay)))*smoothstep(-1.1,-1.04,v)*(1.-smoothstep(head-.04,head+.04,v));
  float border=(1.-smoothstep(.94,.99,abs(bay)))*smoothstep(-1.24,-1.18,v)*(1.-smoothstep(head+.10,head+.18,v));
  c=mix(c,trim,border);c=mix(c,dark,win);
  if(y<3.7&&abs(u-6.1)<1.02){float du=u-6.1,head=2.3+.65*sqrt(max(0.,1.-pow(du/.78,2.)));float door=(1.-smoothstep(.75,.81,abs(du)))*(1.-smoothstep(head-.04,head+.04,y));return mix(ochre,vec3(.29,.19,.14),door);}
  float cross=(1.-smoothstep(.025,.055,abs(bay)))+(1.-smoothstep(.025,.055,abs(v-.02)));return mix(c,vec3(.53,.33,.23),clamp(cross,0.,1.)*win);
 }
 return base;
}
`;
export function c323MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C323 dispatcher drift');return c324MaterialFragment(source.replace(anchor,C323_FEATURE_GLSL+'\n'+anchor+'if(family>=13340.&&family<=13343.)return c323MuffatMaterial(base,p,normal,frame,family);'),city);}
