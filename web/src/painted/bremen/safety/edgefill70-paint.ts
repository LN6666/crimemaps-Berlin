export const BREMEN_EDGEFILL70_GLSL=String.raw`
float bef70line(float x,float w){return 1.-smoothstep(w,w+max(fwidth(x),.012),abs(x));}
float bef70rect(float s,float y,float hw,float lo,float hi){float d=max(abs(s)-hw,max(lo-y,y-hi));return 1.-smoothstep(-.025,.025+max(fwidth(s),fwidth(y)),d);}
vec3 bef70brick(vec3 colour,float s,float y){float row=floor(y/.095),ss=s+mod(row,2.)*.13;float mortar=max(bef70line(mod(ss,.27)-.135,.006),bef70line(mod(y,.095)-.0475,.004));return colour*(1.-mortar*.15)+vec3(.012)*sin(floor(ss/.27)*2.7+row*1.7);}
void bef70window(inout vec3 c,float s,float y,float hw,float lo,float hi,vec3 trim,float panes){float mask=bef70rect(s,y,hw,lo,hi);vec3 glass=mix(vec3(.16,.22,.235),vec3(.39,.46,.46),clamp((y-lo)/max(hi-lo,.1),0.,1.));float sd=max(abs(s)-hw,max(lo-y,y-hi)),edge=1.-smoothstep(.02,.075+max(fwidth(s),fwidth(y)),abs(sd));c=mix(c,glass,mask);c=mix(c,trim,edge);if(mask>.1){float bars=bef70line(s,.028);if(panes>.5)bars=max(bars,bef70line(y-mix(lo,hi,.64),.027));if(panes>1.5)bars=max(bars,max(bef70line(s-hw*.5,.019),bef70line(s+hw*.5,.019)));c=mix(c,trim,bars*mask);}}
vec3 bremenEdgefill70Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float s=frame.x,y=frame.y,q;vec3 c=base;
 if(family==46703.)return vec3(.37,.31,.31)*(1.-bef70line(mod(s,.48)-.24,.013)*.16);
 if(family==46704.){float path=step(.15,sin(p.x*.10)+.55*cos(p.z*.15));return mix(vec3(.39,.43,.22),vec3(.10,.48,.68),path);}
 if(family==46705.)return vec3(.56,.55,.50);
 if(family==46700.){
  c=vec3(.42,.265,.295);q=mod(s+1.85,3.7)-1.85;
  if(y<11.3){float wave=.5+.5*sin(s*95.);c*=.76+.24*wave;float levels=bef70line(mod(y,3.1)-1.55,.055),seam=bef70line(mod(s,1.23)-.615,.014);c=mix(c,vec3(.24,.22,.225),levels*.65);c*=1.-seam*.20;return c;}
  if(y<16.0){c=vec3(.20,.235,.205);float col=bef70line(q,.19);c=mix(c,vec3(.65,.635,.56),col);float mesh=bef70line(mod(s,.055)-.0275,.008)*.13;return c+vec3(mesh);}
  float fy=floor((y-16.)/3.52)*3.52+16.;bef70window(c,q,y,1.27,fy+.35,fy+3.12,vec3(.16,.17,.17),0.);float panel=max(bef70line(mod(s,1.85)-.925,.010),bef70line(y-fy,.014));c*=1.-panel*.22;
  float rail=bef70rect(q,y,1.23,fy+.38,fy+1.38),bars=max(bef70line(mod(s,.135)-.0675,.012),bef70line(y-fy-1.36,.035));return mix(c,vec3(.105,.13,.135),rail*bars);
 }
 if(family==46761.||family==46781.){float seam=bef70line(mod(s,.34)-.17,.015),tile=bef70line(mod(y,.25)-.125,.009);return base*(1.-max(seam,tile)*.12);}
 // Small-office appearance is limited to evidenced pale material, roof seams and plinth: no fabricated fine openings.
 if(family==46760.||family==46780.){c=base;float course=bef70line(mod(y,.54)-.27,.009),panel=bef70line(mod(s,2.0)-1.,.012);c*=1.-max(course,panel)*.075;if(y<.45)c*=.78;return c;}
 if(family==46801.||family==46825.)return base*(1.-max(bef70line(mod(p.x,1.1)-.55,.012),bef70line(mod(p.z,1.6)-.8,.013))*.12);
 if(family==46804.){c=vec3(.25,.37,.37);float mull=max(bef70line(mod(s,1.3)-.65,.035),bef70line(mod(y,1.62)-.81,.045));return mix(c,vec3(.48,.54,.49),mull);}
 if(family==46805.)return base*(1.-bef70line(mod(y,.45)-.225,.01)*.08);
 if(family==46800.){
  c=bef70brick(vec3(.255,.26,.235),s,y);q=mod(s+1.8,3.6)-1.8;
  if(y>=17.1){c=vec3(.29,.355,.35);float frames=max(bef70line(mod(s,.9)-.45,.037),bef70line(y-18.55,.035));return mix(c,vec3(.76,.77,.70),frames);}
  if(y<3.45){bef70window(c,q,y,1.46,.34,3.10,vec3(.78,.79,.74),0.);return c;}
  float fy=floor((y-3.45)/3.4)*3.4+3.45;bef70window(c,q,y,1.02,fy+.38,fy+2.80,vec3(.82,.83,.77),1.);float sill=bef70line(y-fy-.30,.045)*step(abs(q),1.13);return mix(c,vec3(.77,.78,.71),sill);
 }
 if(family==46823.){c=y>22.0?vec3(.42,.46,.43):vec3(.29,.43,.35);float rib=bef70line(mod(s,.48)-.24,.025);return c*(1.-rib*.18);}
 if(family==46821.){c=vec3(.37,.305,.255);float courses=max(bef70line(mod(s,.29)-.145,.012),bef70line(mod(y,.22)-.11,.009));return c*(1.-courses*.14);}
 if(family==46824.){c=vec3(.59,.36,.33);q=mod(s+1.85,3.7)-1.85;float fy=floor(y/3.22)*3.22;bef70window(c,q,y,1.31,fy+.31,fy+2.87,vec3(.33,.36,.33),0.);float stone=max(bef70line(mod(s,.92)-.46,.008),bef70line(mod(y,.64)-.32,.009));return c*(1.-stone*.09);}
 if(family==46820.){
  c=bef70brick(vec3(.37,.255,.23),s,y);q=mod(s+1.82,3.64)-1.82;float fy=y<4.9?0.:4.9;bef70window(c,q,y,.76,fy+.81,fy+3.70,vec3(.83,.815,.73),2.);
  float band=max(bef70line(y-4.65,.11),bef70line(y-8.70,.10));c=mix(c,vec3(.64,.565,.43),band*.60);
  float pediment=1.-smoothstep(.045,.10+fwidth(s),abs(y-(fy+4.26-abs(q)*.58)));pediment*=step(abs(q),1.0)*step(fy+3.70,y);return mix(c,vec3(.71,.64,.50),pediment);
 }
 if(family==46841.||family==46861.||family==46881.){float tile=max(bef70line(mod(s,.29)-.145,.012),bef70line(mod(y,.23)-.115,.009));return base*(1.-tile*.13);}
 if(family==46880.){c=bef70brick(vec3(.62,.39,.31),s,y);q=mod(s+1.6,3.2)-1.6;float fy=floor(y/3.15)*3.15;if(y<16.0){bef70window(c,q,y,.69,fy+.66,fy+2.63,vec3(.81,.80,.72),1.);float rail=bef70rect(q,y,.82,fy+.45,fy+1.25);float bars=max(bef70line(mod(s,.16)-.08,.011),bef70line(y-fy-1.21,.031));c=mix(c,vec3(.30,.32,.29),rail*bars);}return c;}
 if(family==46840.||family==46860.){
  c=bef70brick(base,s,y);q=mod(s+1.75,3.5)-1.75;if(y<6.7){float fy=floor(y/3.0)*3.;bef70window(c,q,y,.61,fy+.82,fy+2.52,vec3(.77,.765,.68),1.);}return c;
 }
 return c;
}
`;
