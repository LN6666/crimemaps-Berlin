export const C369_FEATURE_GLSL=`
vec3 c369Remaining(vec4 f,float family){
 if(family==13790.)return vec3(.87,.85,.77);
 if(family==13791.)return vec3(.80,.75,.70);
 bool mariannen=family==13792.;float rows=mariannen?4.:5.;float fh=f.w/rows;float row=floor(f.y/fh);float yy=mod(f.y,fh)-fh*.53;float pitch=mariannen?3.05:3.2;float bay=mod(f.x+pitch*.5,pitch)-pitch*.5;
 vec3 c=mariannen?vec3(.87,.85,.77):vec3(.80,.75,.70);if(row<1.)c=mariannen?vec3(.59,.55,.46):vec3(.60,.59,.54);
 float joint=1.-smoothstep(.018,.055,abs(mod(f.y,.50)-.25));c=mix(c,vec3(.44,.43,.38),joint*(row<1.?.28:.10));
 bool arched=(!mariannen&&row==2.)||(mariannen&&row==3.&&abs(f.x)<4.6);
 float outer=arched?c361arch(vec2(bay,yy),.91,-fh*.35,fh*.08):c361rect(vec2(bay,yy),vec2(.91,fh*.35));
 float inside=arched?c361arch(vec2(bay,yy),.73,-fh*.30,fh*.08):c361rect(vec2(bay,yy),vec2(.73,fh*.30));
 c=mix(c,vec3(.94,.92,.84),outer);c=mix(c,vec3(.24,.32,.34),inside);
 float bars=max(c361rect(vec2(bay,yy),vec2(.035,fh*.36)),c361rect(vec2(bay,yy-.20),vec2(.8,.035)));c=mix(c,vec3(.91,.91,.85),bars*inside);
 float band=1.-smoothstep(.045,.11,abs(mod(f.y,fh)));c=mix(c,vec3(.73,.70,.62),band*.65);
 if(!mariannen){float edge=max(1.-smoothstep(.10,.20,abs(f.x-2.2)),1.-smoothstep(.10,.20,abs(f.x+2.2)));c=mix(c,vec3(.90,.87,.81),edge*.65*step(fh,f.y));}
 return c;
}`;
