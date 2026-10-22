export const OWNER_F177_PAINT_GLSL=`
float lm177Box(vec2 p,vec2 c,vec2 h){vec2 d=abs(p-c)-h;return 1.-smoothstep(-.015,.015,max(d.x,d.y));}
float lm177Arch(vec2 q,float w,float bottom,float spring,float top){float side=step(abs(q.x),w);float arch=top-(top-spring)*pow(abs(q.x)/w,1.45);return side*step(bottom,q.y)*step(q.y,arch);}
vec3 lambertusRecovery177(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float u=frame.x,y=frame.y,v=frame.z,k=frame.w;
 if(k<.5||k>2.5&&k<3.5){vec3 c=vec3(.24,.26,.27);float course=1.-smoothstep(.009,.025,abs(mod(y,.23)-.115)),seam=1.-smoothstep(.012,.035,abs(mod(u+mod(floor(y/.23),2.)*.19,.38)-.19));c=mix(c,vec3(.14,.16,.17),max(course,seam*.65)*.30);
 // Clock at four slate-tower base faces: mapped in tower coordinates, never painted on nave roofs.
 if(k>2.5&&u< -16.5&&y>33.4&&y<38.8){float dx=u+22.3,dz=v-.65;float along=abs(dx)>abs(dz)?dz:dx;vec2 q=vec2(along,y-35.65);float r=length(q);if(r<1.18){c=vec3(.065,.075,.07);if(r>1.02)c=vec3(.74,.71,.57);float tick=step(.88,r)*(1.-smoothstep(.055,.10,abs(sin(atan(q.x,q.y)*6.))));c=mix(c,vec3(.81,.77,.58),tick);float hands=max(lm177Box(q,vec2(.0,.34),vec2(.045,.45)),lm177Box(q,vec2(.25,.02),vec2(.30,.045)));c=mix(c,vec3(.80,.76,.52),hands);}}
 return c;}
 if(k>3.5&&k<4.5)return vec3(.38,.44,.37);
 float along=abs(normal.x*.92498+normal.z*.38001)>.72?v:u;vec3 c=k>1.5&&k<2.5?vec3(.60,.56,.45):vec3(.48,.27,.19);float bed=1.-smoothstep(.008,.022,abs(mod(y,.13)-.065)),joint=1.-smoothstep(.009,.023,abs(mod(along+mod(floor(y/.13),2.)*.14,.28)-.14));c=mix(c,vec3(.66,.59,.45),max(bed,joint*.65)*.24);
 if(k>1.5&&k<2.5){
  // Five masonry tower stages, tuff facing and paired pointed belfry openings.
  if(u< -19.2){for(int j=0;j<4;j++){float yy=6.5+float(j)*6.4;if(abs(y-yy)<.13)c=vec3(.73,.68,.54);}float dx=u+22.3,dz=v-.65;float t=abs(dx)>abs(dz)?dz:dx;float q=abs(t)-1.50;float pane=lm177Arch(vec2(q,y),.64,26.1,30.4,31.5);float surround=lm177Arch(vec2(q,y),.82,25.9,30.5,31.8);c=mix(c,vec3(.70,.65,.51),surround);c=mix(c,vec3(.09,.11,.10),pane);float louvers=1.-smoothstep(.025,.06,abs(mod(y,.28)-.14));c=mix(c,vec3(.31,.32,.27),pane*louvers*.8);float lower=lm177Arch(vec2(t,y),1.2,2.,5.3,7.4);c=mix(c,vec3(.22,.17,.12),lower);if(abs(t)>3.5)c=mix(c,vec3(.35,.34,.30),step(.55,fract(y/.65))*.55);}
  else if(y>28.2){float l=1.-smoothstep(.02,.05,abs(mod(y,.25)-.125));c=mix(vec3(.12,.15,.15),vec3(.36,.35,.30),l);}
 return c;}
 // Original south sacristy: three lower pointed windows, restricted to the actual outer south wall.
 float centre=0.,w=1.25,bottom=3.6,spring=16.5,top=19.5;bool windows=false;
 if(k>4.5){if(v< -20.8&&u>4.7&&u<17.){centre=6.35+floor((u-4.7)/4.15)*4.15;along=u;bottom=3.0;spring=7.0;top=9.0;w=.88;windows=true;}}
 else if(v>14.8&&u> -17.9&&u<17.3){centre=-14.1+floor((u+17.9)/5.25)*5.25;along=u;windows=true;}
 else if(v< -12.5&&v> -15.5&&u> -17.8&&u<3.8){centre=-14.15+floor((u+17.8)/5.65)*5.65;along=u;bottom=y<10.0?3.:11.;spring=y<10.0?7.0:16.5;top=y<10.0?9.3:19.5;w=y<10.0?1.15:1.35;windows=true;}
 else if(u>17.0&&k<1.5){along=atan(v-1.,u-14.)*12.0;centre=floor((along+2.)/4.)*4.;w=1.05;bottom=3.6;spring=16.3;top=19.5;windows=true;}
 else if(u< -18.0&&u> -19.7&&abs(v)>6.){along=v;centre=v>0.?10.7:-9.5;w=1.2;bottom=3.7;spring=16.5;top=19.5;windows=true;}
 if(windows){vec2 q=vec2(along-centre,y);float stone=lm177Arch(q,w+.19,bottom-.2,spring+.1,top+.25),glass=lm177Arch(q,w,bottom,spring,top);c=mix(c,vec3(.73,.68,.51),stone);c=mix(c,vec3(.14,.20,.19),glass);float bar=1.-smoothstep(.025,.065,abs(q.x));bar=max(bar,1.-smoothstep(.025,.055,abs(abs(q.x)-w*.51)));bar=max(bar,1.-smoothstep(.025,.065,abs(mod(y-bottom,1.72)-.86)));float rosette=abs(length(vec2(q.x,y-(spring+.70)))-w*.49);bar=max(bar,1.-smoothstep(.025,.075,rosette));c=mix(c,vec3(.69,.65,.51),bar*glass);}
 // Stone strings follow original solid perimeter; no windows on buttress return faces.
 if(y<.85)c=vec3(.32,.31,.27);if(abs(y-10.15)<.12||abs(y-20.65)<.11)c=mix(c,vec3(.69,.63,.47),.86);return c;
}
`;
