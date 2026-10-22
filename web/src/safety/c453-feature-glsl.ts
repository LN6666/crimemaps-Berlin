export const C453_FEATURE_GLSL=String.raw`
float c453Box(vec2 p,vec2 a,vec2 b){vec2 d=min(p-a,b-p);return smoothstep(-.025,.025,min(d.x,d.y));}
float c453Line(float a,float x,float w){return 1.-smoothstep(w,w+.035,abs(x-a));}
float c453Green0(vec2 p){float hits=0.;if((p.y>12.9414608)!=(p.y>13.8108939))hits+=step(p.x,(126.0981186)+(p.y-(12.9414608))*(4.0180687)/(0.8694331));if((p.y>13.8108939)!=(p.y>18.6165783))hits+=step(p.x,(130.1161873)+(p.y-(13.8108939))*(22.3751169)/(4.8056844));if((p.y>18.6165783)!=(p.y>58.2536900))hits+=step(p.x,(152.4913042)+(p.y-(18.6165783))*(-8.5349566)/(39.6371117));if((p.y>58.2536900)!=(p.y>52.5900405))hits+=step(p.x,(143.9563476)+(p.y-(58.2536900))*(-26.3028978)/(-5.6636495));if((p.y>52.5900405)!=(p.y>52.2401966))hits+=step(p.x,(117.6534499)+(p.y-(52.5900405))*(0.0726649)/(-0.3498440));if((p.y>52.2401966)!=(p.y>12.9414608))hits+=step(p.x,(117.7261147)+(p.y-(52.2401966))*(8.3720038)/(-39.2987357));return mod(hits,2.);}
float c453Green1(vec2 p){float hits=0.;if((p.y>52.5900405)!=(p.y>58.2536900))hits+=step(p.x,(117.6534499)+(p.y-(52.5900405))*(26.3028978)/(5.6636495));if((p.y>58.2536900)!=(p.y>42.2964536))hits+=step(p.x,(143.9563476)+(p.y-(58.2536900))*(3.4382797)/(-15.9572364));if((p.y>42.2964536)!=(p.y>18.6165783))hits+=step(p.x,(147.3946273)+(p.y-(42.2964536))*(5.0966769)/(-23.6798753));if((p.y>18.6165783)!=(p.y>13.8108939))hits+=step(p.x,(152.4913042)+(p.y-(18.6165783))*(-22.3751169)/(-4.8056844));if((p.y>13.8108939)!=(p.y>12.9414608))hits+=step(p.x,(130.1161873)+(p.y-(13.8108939))*(-4.0180687)/(-0.8694331));if((p.y>12.9414608)!=(p.y>52.2401966))hits+=step(p.x,(126.0981186)+(p.y-(12.9414608))*(-8.3720038)/(39.2987357));if((p.y>52.2401966)!=(p.y>52.5900405))hits+=step(p.x,(117.7261147)+(p.y-(52.2401966))*(-0.0726649)/(0.3498440));return mod(hits,2.);}
float c453Green2(vec2 p){float hits=0.;if((p.y>37.4797263)!=(p.y>42.2964536))hits+=step(p.x,(125.0209130)+(p.y-(37.4797263))*(22.3737142)/(4.8167273));if((p.y>42.2964536)!=(p.y>18.6165783))hits+=step(p.x,(147.3946273)+(p.y-(42.2964536))*(5.0966769)/(-23.6798753));if((p.y>18.6165783)!=(p.y>13.8108939))hits+=step(p.x,(152.4913042)+(p.y-(18.6165783))*(-22.3751169)/(-4.8056844));if((p.y>13.8108939)!=(p.y>37.4797263))hits+=step(p.x,(130.1161873)+(p.y-(13.8108939))*(-5.0952743)/(23.6688324));return mod(hits,2.);}
float c453Green0Union(vec2 p){return max(c453Green0(p),max(c453Green1(p),c453Green2(p)));}
float c453Green(vec2 p){return max(c453Green0Union(p),max(max(c453Green0Union(p+vec2(.13,0.)),c453Green0Union(p-vec2(.13,0.))),max(c453Green0Union(p+vec2(0.,.13)),c453Green0Union(p-vec2(0.,.13)))));}
vec3 c453Industrial(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 bool sac=family<15501.5;bool roof=family<15500.5||(family>15501.5&&family<15502.5);
 if(roof){float seam=1.-smoothstep(.018,.055,abs(fract(f.x*.38)-.5));return(sac?vec3(.51,.53,.50):vec3(.33,.35,.34))*(1.-.045*seam);}
 float u=f.x,y=f.y;vec2 world=f.z<1.5?vec2(f.x,f.w):vec2(f.w,f.x);
 if(sac){
  float ph=mod(u+2.6,5.2)-2.6;float pier=smoothstep(1.80,1.9,abs(ph));vec3 col=mix(vec3(.76,.67,.49),vec3(.55,.31,.24),pier);
  float cy=y<2.5?1.35:3.85;float hh=y<2.5?.85:1.1;float roundedTop=cy+hh-.18*pow(ph/1.5,2.);float win=(1.-smoothstep(1.43,1.48,abs(ph)))*step(cy-hh,y)*(1.-smoothstep(roundedTop-.025,roundedTop+.025,y));
  float trim=(1.-smoothstep(1.58,1.64,abs(ph)))*step(cy-hh-.11,y)*(1.-step(roundedTop+.12,y));col=mix(col,vec3(.79,.70,.53),trim);col=mix(col,vec3(.28,.39,.40),win);
  float mull=max(c453Line(0.,mod(ph+.75,.75),.025),c453Line(0.,mod(y,.65),.025));col=mix(col,vec3(.82,.83,.75),win*mull);
  col=mix(col,vec3(.65,.60,.49),c453Line(2.55,y,.12));if(y<.45)col=vec3(.57,.54,.46);return col;
 }
 float metal=c453Green(world);if(metal>.5){float rib=c453Line(0.,mod(u,.85),.025);return vec3(.22,.30,.22)*(1.-rib*.16);}
 vec3 plaster=vec3(.76,.73,.65),stone=vec3(.64,.61,.52),white=vec3(.84,.84,.76),glass=vec3(.23,.32,.34);vec3 col=y<.7?stone:plaster;
 float ph=mod(u+1.6,3.2)-1.6;float cy=2.+floor((y-2.)/3.8+.5)*3.8;float pane=c453Box(vec2(ph,y-cy),vec2(-.58,-1.15),vec2(.58,1.15)),rim=c453Box(vec2(ph,y-cy),vec2(-.69,-1.27),vec2(.69,1.27));float zone=step(.7,y)*(1.-step(11.1,y));col=mix(col,white,rim*zone);col=mix(col,glass,pane*zone);col=mix(col,white,pane*zone*max(c453Line(0.,ph,.04),c453Line(cy,y,.04)));
 // Photo-supported ground-level recesses on the south frontage, represented on retained walls.
 if(f.z<.5&&y<3.5){float recess=c453Box(vec2(ph,y),vec2(-1.10,0.),vec2(1.10,3.25));col=mix(col,vec3(.28,.29,.25),recess);}
 return col;
}
`;
export const C453_DISPATCH='if(family>=15500.&&family<=15503.)return c453Industrial(base,p,normal,frame,family);';
export function c453MaterialFragment(source:string,city:string){if(city!=='dresden')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C453 dispatcher drift');return source.replace(anchor,C453_FEATURE_GLSL+'\n'+anchor+'if(family>=15500.&&family<=15503.)return c453Industrial(base,p,normal,frame,family);');}
