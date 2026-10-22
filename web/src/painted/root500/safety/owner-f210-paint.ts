export const OWNER_F210_PAINT_GLSL=String.raw`
float court210Box(vec2 p,vec2 h){return 1.-smoothstep(-.025,.025,max(abs(p.x)-h.x,abs(p.y)-h.y));}
vec3 court210Window(vec3 c,float a,float y,float center,float halfh){float rim=court210Box(vec2(a,y-center),vec2(1.02,halfh+.18)),g=court210Box(vec2(a,y-center),vec2(.82,halfh));c=mix(c,vec3(.65,.60,.48),rim);c=mix(c,vec3(.12,.18,.18),g);float bars=max(1.-smoothstep(.035,.065,abs(a)),1.-smoothstep(.04,.07,abs(mod(y-center+.65,1.3)-.65)));return mix(c,vec3(.71,.67,.55),bars*g);}
vec3 bundesverwaltungsgericht210(vec3 base,vec3 p,vec3 normal,vec4 f,float family){float u=f.x,y=f.y,v=f.z,k=f.w;vec3 stone=vec3(.76,.71,.60),c=stone;
 if(k>4.5&&k<5.5){float axis=abs(normal.x)>abs(normal.z)?v:u;float seam=1.-smoothstep(.015,.06,abs(mod(axis,.85)-.425));float plate=1.-smoothstep(.025,.065,abs(mod(y,1.6)-.8));return mix(vec3(.28,.48,.42),vec3(.17,.31,.28),max(seam,plate)*.43);}
 if(k<.5){float axis=abs(normal.x)>abs(normal.z)?v:u;float seam=1.-smoothstep(.015,.055,abs(mod(axis,.72)-.36));return k>.1?mix(vec3(.44,.44,.43),vec3(.32,.32,.31),seam*.42):mix(vec3(.37,.47,.43),vec3(.24,.32,.30),seam*.42);}
 if(k>7.5&&k<8.5){if(abs(normal.y)>.2)return k>8.1?vec3(.412,.412,.412):vec3(.29,.46,.40);float line=1.-smoothstep(.02,.065,abs(y-25.15));float relief=0.;float station=k>8.1?u-1.0:v-.87;for(int j=0;j<7;j++){float a=-7.5+2.5*float(j),h=1.5-abs(a)*.07;vec2 q=vec2(station-a,y-(k>8.1?24.7:26.));float head=1.-smoothstep(.18,.25,length(q-vec2(0.,h)));float body=court210Box(q-vec2(0.,h*.46),vec2(.34,h*.36));float gesture=court210Box(vec2(q.x+.65*q.y-.5,q.y-h*.65),vec2(.52,.10));relief=max(relief,max(head,max(body,gesture)));}return mix(stone,vec3(.57,.53,.44),max(line*.5,relief*.4));}
 if(k>6.5){float groove=1.-smoothstep(.025,.08,abs(mod(u+v,.18)-.09));return mix(stone,vec3(.57,.53,.43),groove*.15);}
 if(k>3.5&&k<4.5){float carving=1.-smoothstep(.02,.055,abs(mod(y,.29)-.145));return mix(stone,vec3(.60,.55,.45),carving*.12);}
 if(k>5.5){float groove=1.-smoothstep(.02,.055,abs(mod(y,.42)-.21));return mix(vec3(.25,.42,.37),vec3(.16,.26,.23),groove*.25);}
 if(k>2.5&&k<3.5){float border=step(y,25.4);float relief=court210Box(vec2(u,y-27.5),vec2(10.,1.1));return mix(stone,vec3(.59,.55,.46),max(border*.4,relief*.35));}
 if(k>1.5&&k<2.5){float fluting=1.-smoothstep(.01,.05,abs(mod(u+v,.24)-.12));float cap=step(22.1,y);return mix(stone,vec3(.54,.50,.41),fluting*.12+cap*.07);}
 float faceU=abs(normal.x*.9664+normal.z*.2570); // replaced constants in generator
 float axis=faceU>.65?v:u;float a=mod(axis+2.1,4.2)-2.1;float joints=1.-smoothstep(.025,.065,abs(mod(y,.68)-.34));c=mix(stone,vec3(.55,.51,.43),joints*(y<5.?.45:.18));
 if(y>36.&&y<44.&&abs(u)<11.&&abs(v)<11.){float bay=mod(axis+2.1,4.2)-2.1;return court210Window(c,bay,y,40.,2.5);}
 if(y>24.){float band=1.-smoothstep(.1,.2,abs(mod(y-25.,2.8)-1.4));return mix(c,vec3(.60,.56,.46),band*.30);}
 bool front=u>37.&&abs(v)<13.4;bool south=v< -60.&&abs(u)<12.5;bool north=v>60.&&abs(u)<13.;
 if(front){float bay=mod(v+2.38,4.76)-2.38;if(y<5.4){float door=step(abs(bay),.92)*step(.2,y);return mix(c,vec3(.08,.13,.11),door);}c=court210Window(c,bay,y,11.3,3.3);c=court210Window(c,bay,y,19.,2.5);return c;}
 if(south&&abs(u)<1.4&&y<7.){float arch=step(abs(u),1.15)*step(y,5.+sqrt(max(0.,1.-u*u/1.33))*1.4);return mix(c,vec3(.08,.13,.12),arch);}
 if(north||south){c=court210Window(c,a,y,16.8,3.9);if(!south||abs(u)>3.)c=court210Window(c,a,y,5.9,1.7);return c;}
 c=court210Window(c,a,y,7.5,1.65);c=court210Window(c,a,y,15.,2.2);c=court210Window(c,a,y,21.1,1.45);return c;
}`;
