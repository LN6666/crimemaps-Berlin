export const OWNER_F197_PAINT_GLSL=String.raw`
float l197Box(vec2 p,vec2 h){return 1.-smoothstep(-.025,.025,max(abs(p.x)-h.x,abs(p.y)-h.y));}
vec3 l197Glazing(vec3 c,vec2 q,vec2 h){float trim=l197Box(q,h+.11),glass=l197Box(q,h);c=mix(c,vec3(.88,.86,.77),trim);c=mix(c,vec3(.28,.35,.37),glass);float bars=max(1.-smoothstep(.025,.05,abs(mod(q.x+.25,.50)-.25)),1.-smoothstep(.025,.05,abs(mod(q.y+.47,.94)-.47)));return mix(c,vec3(.89,.88,.79),bars*glass);}
vec3 lindenMuseumRecovery187(vec3 base,vec3 p,vec3 normal,vec4 f,float family){float u=f.x,y=f.y,v=f.z,k=f.w;vec3 plaster=vec3(.86,.82,.72),stone=vec3(.64,.60,.50);vec3 c=plaster;
 if(k<.5){float tile=max(step(.94,fract(u/.26)),step(.91,fract(y/.18)));return mix(vec3(.41,.22,.17),vec3(.29,.15,.12),tile*.42);}
 if(abs(k-4.)<.5)return mix(vec3(.35,.38,.38),vec3(.55,.57,.55),step(.98,fract(u/.80))*.35);
 if(abs(k-5.)<.5)return vec3(.33,.49,.43);
 if(abs(k-6.)<.5)return vec3(.60,.58,.51);
 if(abs(k-7.)<.5){c=l197Glazing(vec3(.20,.22,.20),vec2(u,y-3.4),vec2(1.6,2.3));return c;}
 if(y<2.4){float joint=max(step(.94,fract(y/.42)),step(.98,fract(u/1.15+floor(y/.42)*.5)));c=mix(stone,stone*.72,joint*.4);}else if(y<4.)c=mix(plaster,stone,step(.94,fract(y/.45))*.55);
 if(abs(k-2.)<.5){float s=abs(dot(normal.xz,vec2(.9428649,-.3331753)))>.7?u-9.2:v-12.5;float bay=mod(s+1.15,2.3)-1.15;return l197Glazing(c,vec2(bay,y-19.4),vec2(.57,1.65));}
 if(abs(k-3.)<.5){float bay=mod(u+1.0,6.)-3.;float front=1.-smoothstep(.2,.4,abs(v-.8));c=mix(c,plaster,front);return l197Glazing(c,vec2(bay,y-18.8),vec2(.65,1.));}
 float axis=abs(dot(normal.xz,vec2(.9428649,-.3331753)))>.7?u:v;float bay=mod(axis+2.1,4.2)-2.1;if(abs(k-8.)<.5){c=l197Glazing(c,vec2(bay,y-4.8),vec2(.72,1.45));if(y<2.2)c=l197Glazing(c,vec2(bay,y-1.1),vec2(.72,.65));return c;}
 float tier=y<3.8?1.5:y<8.?6.:y<12.?10.:14.;vec2 halfSize=y<3.8?vec2(.75,.68):vec2(.87,1.55);c=l197Glazing(c,vec2(bay,y-tier),halfSize);
 float band=max(1.-smoothstep(.04,.09,abs(y-3.7)),1.-smoothstep(.06,.13,abs(y-16.8)));c=mix(c,stone,band*.70);float dentil=step(.35,fract(axis/.45))*(1.-smoothstep(.06,.12,abs(y-16.6)));c=mix(c,stone,dentil*.5);
 // Registered Hegelplatz arch around original entrance node, with recessed glazed doorway already cut in geometry.
 if(abs(v)<.5&&abs(u)<2.5&&y<6.5){float r=length(vec2(u,(y-4.4))),arch=step(1.75,r)*(1.-smoothstep(2.1,2.2,r))*step(4.4,y);float jamb=(1.-smoothstep(.16,.23,abs(abs(u)-1.98)))*step(y,4.5);c=mix(c,vec3(.60,.57,.48),max(arch,jamb));}return c;
}
`;
