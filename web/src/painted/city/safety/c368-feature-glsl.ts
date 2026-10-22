export const C368_FEATURE_GLSL=`
vec3 c368Courtyard(vec4 f,float family){
 if(family==13780.)return vec3(.64,.32,.22);
 if(family==13781.)return vec3(.34,.33,.31);
 if(family==13782.)return vec3(.86,.84,.76);
 bool west=f.z>20.;float rows=west?5.:4.;float fh=f.w/rows;float yy=mod(f.y,fh)-fh*.53;float pitch=west?3.4:3.;float bay=mod(f.x+pitch*.5,pitch)-pitch*.5;
 vec3 wall=west?vec3(.88,.83,.67):vec3(.86,.85,.79);bool ground=f.y<fh;
 if(ground)wall=vec3(.51,.50,.44);
 float joint=1.-smoothstep(.018,.055,abs(mod(f.y,.52)-.26));wall=mix(wall,vec3(.40,.40,.35),joint*(ground?.25:.12));
 float outer=c361rect(vec2(bay,yy),vec2(.91,fh*.35));float inside=c361rect(vec2(bay,yy),vec2(.74,fh*.30));wall=mix(wall,vec3(.94,.91,.82),outer);wall=mix(wall,vec3(.25,.34,.36),inside);
 float mull=max(c361rect(vec2(bay,yy),vec2(.035,fh*.34)),c361rect(vec2(bay,yy-.24),vec2(.84,.035)));wall=mix(wall,vec3(.90,.90,.82),mull*inside);
 float band=1.-smoothstep(.045,.11,abs(mod(f.y,fh)));wall=mix(wall,vec3(.76,.74,.65),band*.7);
 // Only the photographed central upper-front column motif, not entrances.
 if(!west&&f.y>f.w*.76){float col=max(1.-smoothstep(.13,.23,abs(f.x-3.8)),1.-smoothstep(.13,.23,abs(f.x+3.8)));wall=mix(wall,vec3(.92,.89,.80),col);}
 return wall;
}`;
