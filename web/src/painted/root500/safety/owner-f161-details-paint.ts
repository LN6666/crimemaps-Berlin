export const F161_DETAILS_GLSL=`
float nk6424Hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
float nk6424Segment(vec3 p,vec3 a,vec3 b){vec3 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));}

float nk6424Pointed(vec2 p,vec4 b){float x=abs(p.x-b.x),r=b.w;float spring=b.z-1.7320508076*r;float cap=spring+sqrt(max(4.*r*r-(x+r)*(x+r),0.));return max(max(x-r,b.y-p.y),p.y-cap);}
float nk6424Round(vec2 p,vec4 b){float x=abs(p.x-b.x),r=b.w;float cap=b.z-r+sqrt(max(r*r-x*x,0.));return max(max(x-r,b.y-p.y),p.y-cap);}
vec3 nk6424SouthOpening(vec3 c,vec2 p,vec4 b,float door){
 float aa=max(max(fwidth(p.x),fwidth(p.y)),.008);float outer=door>1.5?nk6424Round(p,b):nk6424Pointed(p,b);
 float stone=1.-smoothstep(-aa,aa,outer);c=mix(c,vec3(.48,.30,.22),stone);
 vec4 inner=b+vec4(0.,.11,-.11,-.11);float inside=door>1.5?nk6424Round(p,inner):nk6424Pointed(p,inner);float mask=1.-smoothstep(-aa,aa,inside);
 vec2 q=vec2(p.x-b.x,p.y-b.y);vec3 fill;
 if(door>.5){float boards=1.-smoothstep(.012,.012+aa,abs(mod(q.x+.065,.13)-.065));fill=mix(vec3(.32,.17,.065),vec3(.19,.095,.035),boards*.65);float divide=1.-smoothstep(.014,.014+aa,abs(q.x));fill=mix(fill,vec3(.15,.085,.035),divide);float handle=1.-smoothstep(.04,.04+aa,length(q-vec2(.11,(b.z-b.y)*.49)));fill=mix(fill,vec3(.66,.57,.29),handle);}
 else {fill=vec3(.13,.21,.205);float reflection=.5+.5*sin(q.x*6.+q.y*1.8);fill=mix(fill,vec3(.28,.35,.32),reflection*.38);float mullion=min(abs(q.x),min(abs(q.x-b.w*.44),abs(q.x+b.w*.44)));float bars=1.-smoothstep(.025,.025+aa,mullion);float transom=1.-smoothstep(.028,.028+aa,abs(q.y-(b.z-b.y)*.58));float radius=b.w*.32;vec2 rose=q-vec2(0.,b.z-b.y-1.05*b.w);float ring=abs(length(rose)-radius);bars=max(bars,1.-smoothstep(.025,.025+aa,ring));fill=mix(fill,vec3(.48,.36,.25),max(bars,transom));}
 return mix(c,fill,mask);
}
vec3 nk6424South(vec3 base,vec2 p){vec3 c=base;
c=nk6424SouthOpening(c,p,vec4(7.38486,3.64646,6.25685,0.64854),0.0);
c=nk6424SouthOpening(c,p,vec4(4.39305,2.97371,6.26318,0.72419),0.0);
c=nk6424SouthOpening(c,p,vec4(1.57872,2.71583,6.17087,0.71106),0.0);
c=nk6424SouthOpening(c,p,vec4(7.38486,0.48039,3.12500,0.60048),1.0);
float sillAA=max(max(fwidth(p.x),fwidth(p.y)),.008);float sillD=max(abs(p.x-2.50971)-.86454,max(-p.y,p.y-0.19234));float sillMask=1.-smoothstep(-sillAA,sillAA,sillD);c=mix(c,vec3(.53,.50,.42),sillMask);
c=nk6424SouthOpening(c,p,vec4(2.50971,0.15734,2.41259,0.74454),2.0);
return c;}
vec3 nikolausDetails6424(vec3 base,vec4 frame){if(frame.w>99.5&&frame.w<100.5)return nk6424South(base,frame.xy);if(frame.w>100.5&&frame.w<101.5)return base;vec2 xz=frame.xy;float y=frame.z;vec2 t=vec2(1.,0.);
if(frame.w<1.5)t=vec2(0.4577274815,-0.8890925445);
else if(frame.w<2.5)t=vec2(-0.8837394687,-0.4679792211);
else if(frame.w<3.5)t=vec2(-0.8905880894,-0.4548107903);
else if(frame.w<4.5)t=vec2(-0.9294528265,0.3689409753);
else if(frame.w<5.5)t=vec2(-0.4601740120,0.8878287440);
else if(frame.w<6.5)t=vec2(0.3396932550,0.9405362792);
else if(frame.w<7.5)t=vec2(0.8881931204,0.4594703264);
float u=dot(xz,t),v=(y-7.5)*1.2616322667;float row=floor(v/.32);float column=floor((u+mod(row,2.)*.115)/.23);vec2 tile=vec2(fract((u+mod(row,2.)*.115)/.23),fract(v/.32));vec2 aa=max(fwidth(vec2(u/.23,v/.32)),vec2(.015));float grout=max(1.-smoothstep(.018,.018+aa.x,min(tile.x,1.-tile.x)),1.-smoothstep(.018,.018+aa.y,min(tile.y,1.-tile.y)));float tone=nk6424Hash(vec2(column,row));vec3 c=mix(vec3(.29,.13,.075),vec3(.43,.23,.13),tone*.58+.18);c=mix(c,vec3(.19,.095,.055),grout*.45);vec3 p=vec3(xz.x,y,xz.y);float ridge=100.;
ridge=min(ridge,nk6424Segment(p,vec3(-9.0260000229,7.5000000000,0.6570000052),vec3(-6.9684998989,13.3715372086,-3.3394999802)));
ridge=min(ridge,nk6424Segment(p,vec3(-4.9109997749,7.5000000000,-7.3359999657),vec3(-6.9684998989,13.3715372086,-3.3394999802)));
ridge=min(ridge,nk6424Segment(p,vec3(-6.9684998989,13.3715372086,-3.3394999802),vec3(-6.9684998989,13.3715372086,-3.3394999802)));
ridge=min(ridge,nk6424Segment(p,vec3(3.9049999714,7.5000000000,7.3359999657),vec3(4.1299161911,13.1522521973,2.5688221455)));
ridge=min(ridge,nk6424Segment(p,vec3(4.0661602020,13.3448143005,2.3699405193),vec3(4.1299161911,13.1522521973,2.5688221455)));
ridge=min(ridge,nk6424Segment(p,vec3(-6.9684998989,13.3715372086,-3.3394999802),vec3(4.0661602020,13.3448143005,2.3699405193)));
ridge=min(ridge,nk6424Segment(p,vec3(4.1299161911,13.1522521973,2.5688221455),vec3(7.2430000305,7.5000000000,6.0110001564)));
ridge=min(ridge,nk6424Segment(p,vec3(4.3940453529,13.0286903381,2.2657756805),vec3(9.0260000229,7.5000000000,2.5710000992)));
ridge=min(ridge,nk6424Segment(p,vec3(4.0661602020,13.3448143005,2.3699405193),vec3(4.3940453529,13.0286903381,2.2657756805)));
ridge=min(ridge,nk6424Segment(p,vec3(4.3940453529,13.0286903381,2.2657756805),vec3(7.8280000687,7.5000000000,-0.7459999919)));
float cap=1.-smoothstep(.065,.065+max(fwidth(ridge),.012),ridge);float capJoint=1.-smoothstep(.02,.02+max(fwidth(u),.01),abs(mod(u+.14,.28)-.14));c=mix(c,mix(vec3(.39,.19,.105),vec3(.20,.105,.065),capJoint*.40),cap);float eave=1.-smoothstep(.025,.025+max(fwidth(y),.01),abs(y-7.5));return mix(c,vec3(.22,.12,.075),eave*.45);}
`;
