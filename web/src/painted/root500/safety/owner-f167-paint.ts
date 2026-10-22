export const F167_GLSL=`
float j167box(vec2 p,vec2 c,vec2 h){vec2 d=abs(p-c)-h;return 1.-smoothstep(-.015,max(.02,max(fwidth(p.x),fwidth(p.y))),max(d.x,d.y));}
float j167line(float x,float p,float w){return 1.-smoothstep(w,w+max(fwidth(x),.012),abs(mod(x+p*.5,p)-p*.5));}
float j167arch(vec2 p,float halfWidth,float bottom,float spring){float d=max(max(abs(p.x)-halfWidth,bottom-p.y),p.y-spring);if(p.y>spring)d=length(vec2(p.x,p.y-spring))-halfWidth;return 1.-smoothstep(-.02,max(.02,max(fwidth(p.x),fwidth(p.y))),d);}
vec3 j167opening(vec3 col,vec2 p,float w,float y0,float ys){float rim=j167arch(p,w+.18,y0-.18,ys);float pane=j167arch(p,w,y0,ys);col=mix(col,vec3(.39,.40,.37),rim);col=mix(col,vec3(.16,.22,.23),pane);float bar=max(j167line(p.x,w*.67,.035),j167line(p.y-y0,2.0,.035));return mix(col,vec3(.52,.51,.46),pane*bar);}
vec3 johannesDusseldorf167(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float u=frame.x,y=frame.y,v=frame.z,k=frame.w;vec3 col=base;
 if(abs(k-4.)<.5)return base;
 if(abs(k-3.)<.5){float tile=max(j167line(u,.32,.012),j167line(v+mod(floor(u/.32),2.)*.14,.28,.012));return mix(base,base*.70,tile*.55);}
 if(abs(k-5.)<.5){float a=atan(v,u+21.);float seam=max(j167line(a,6.2831853/8.,.006),j167line(y,2.,.016));return mix(base,vec3(.29,.46,.43),seam*.65);}
 float nU=abs(dot(normal,vec3(.69963721,0.,.71449827)));float x=nU>.7?v:u;float brick=max(j167line(y,.16,.008),j167line(x+mod(floor(y/.16),2.)*.165,.33,.009));col=mix(base,base*.71,brick*.60);
 if(abs(k-2.)<.5){vec2 q=vec2(nU>.7?v:u+21.,y);col=mix(col,vec3(.43,.43,.40),max(j167line(y-9.2,13.5,.16),1.-smoothstep(.25,.5,abs(abs(q.x)-4.3)))*.8);
  if(y>38.&&y<55.){float outer=j167arch(q,3.4,39.5,49.4),inside=j167arch(q,3.05,39.8,49.4);col=mix(col,vec3(.40,.41,.38),outer);col=mix(col,mix(vec3(.10,.13,.13),vec3(.22,.23,.21),j167line(y,.40,.06)),inside);}
  if(nU>.7&&y>46.5&&y<53.5){vec2 d=q-vec2(0,50.);float r=length(d),disc=1.-smoothstep(2.25,2.30,r);col=mix(col,vec3(.10,.13,.13),disc);float ang=atan(d.x,d.y),ticks=j167line(ang,6.2831853/12.,.022)*smoothstep(1.70,1.76,r)*(1.-smoothstep(2.05,2.10,r));col=mix(col,vec3(.92,.86,.64),ticks);float hands=max(j167box(d,vec2(0,.7),vec2(.055,.8)),j167box(d,vec2(.52,.06),vec2(.60,.055)));col=mix(col,vec3(.92,.86,.64),hands*disc);}
  if(nU>.7&&u< -24.){col=j167opening(col,q,1.55,.65,5.35);float rose=length(q-vec2(0,15.6));col=mix(col,vec3(.47,.47,.42),1.-smoothstep(3.7,3.8,rose));col=mix(col,vec3(.18,.25,.25),1.-smoothstep(3.25,3.31,rose));float petals=0.;for(int i=0;i<8;i++){float a=float(i)*.7853981634;petals=max(petals,1.-smoothstep(.62,.70,length(q-vec2(2.15*cos(a),15.6+2.15*sin(a)))));}float ring=1.-smoothstep(.09,.14,abs(rose-1.35));col=mix(col,vec3(.65,.63,.54),max(petals*.56,ring));}
  if(y>23.&&y<33.)col=j167opening(col,q,1.5,24.1,30.0);
  return col;
 }
 if(abs(k-1.)<.5){float xx=x;if(u>24.)xx=atan(v,u-25.)*9.3;float px=mod(xx+3.7,7.4)-3.7;vec2 q=vec2(px,y);if(y>3.5&&y<19.)col=j167opening(col,q,1.5,4.2,16.6);if(y>19.8&&y<24.7){vec2 small=vec2(mod(xx+.80,1.6)-.80,y);col=j167opening(col,small,.47,20.2,22.0);}col=mix(col,vec3(.43,.43,.40),max(j167line(y-3.2,15.6,.12),j167line(y-20.3,50.,.15))*.72);return col;}
 return col;
}
`;
