import {c335MaterialFragment} from './c335-feature-glsl';
export const C334_FEATURE_GLSL=`vec3 c334Hall(vec3 base,vec3 p,vec3 normal,vec4 f,float family){float u=f.x,n=f.z,y=p.y;vec3 pale=vec3(.85,.84,.77);
 if(family==13451.){float a=atan(n+16.67579382462074,u-1.956700108742388);float seam=1.-smoothstep(.015,.015+max(.01,fwidth(a)*24.),abs(sin(a*24.)));if(length(vec2(u-1.956700108742388,n+16.67579382462074))<12.2&&y>21.)return mix(vec3(.43,.64,.55),vec3(.34,.51,.45),seam*.35);float v=abs(normal.x)>.6?n:u;float line=1.-smoothstep(.018,.018+max(.02,fwidth(v)),abs(mod(v+.35,.7)-.35));return vec3(.43,.64,.55)*(1.-line*.09);}
 if(family==13453.){float a=atan(n+16.67579382462074,u-1.956700108742388);float post=smoothstep(.07,.18,abs(sin(a*4.)));return mix(vec3(.40,.60,.51),vec3(.16,.26,.23),post);}
 if(family==13454.){float line=(1.-smoothstep(.015,.015+max(.025,fwidth(u)),abs(mod(u+.09,.18)-.09)))*.035;return pale*(1.-line);}
 vec3 c=pale;
 if(family==13452.){float band=1.-smoothstep(.16,.3,min(abs(y-21.7),abs(y-17.4)));c*=1.-band*.10;if(n< -20.5&&y<7.){float d=min(abs(u+2.5),abs(u-7.));if(d<1.0&&y<5.0+sqrt(max(0.,1.-d*d)))c=vec3(.23,.25,.21);}return c;}
 bool front=dot(normal,vec3(-.1557914,0.,-.98779))>.8;
 if(front&&n< -22.5&&abs(u-1.956700108742388)>13.){float q=mod(u+1.4,4.2);if(y<4.4)c=vec3(.61,.30,.23);if(q>.55&&q<3.55&&y>4.7&&y<6.8){c=vec3(.29,.39,.39);float grid=abs(y-5.75)<.05||abs(q-2.05)<.05?1.:0.;c=mix(c,pale,grid);}}
 if(y<.45)c*=.84;return c;}
`;
export function c334MaterialFragment(source:string,city:string){if(city!=='munich')return source;const name=source.includes('vec3 progressiveFeatureDispatchCity(')?'progressiveFeatureDispatchCity':'progressiveFeatureDispatch';const anchor='vec3 '+name+'(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';if(source.split(anchor).length!==2)throw Error('C334 dispatcher drift');return c335MaterialFragment(source.replace(anchor,C334_FEATURE_GLSL+'\n'+anchor+'if(family>=13450.&&family<=13454.)return c334Hall(base,p,normal,frame,family);'),city);}
