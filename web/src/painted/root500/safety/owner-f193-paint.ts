export const OWNER_F193_PAINT_GLSL = `
float ft193Line(float x,float pitch,float w){return 1.-smoothstep(w,w+max(fwidth(x),.006),abs(mod(x+pitch*.5,pitch)-pitch*.5));}
float ft193Edge(float x,float w){return 1.-smoothstep(w,w+max(fwidth(x),.008),abs(x));}
vec3 fernsehturmRecovery185(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float x=frame.x,y=frame.y,z=frame.z,k=frame.w;
if(abs(k-1.)<.4){float casting=ft193Line(x*5.4,1.12,.008),grain=sin(x*18.+y*.17)*.008;return mix(vec3(.79,.78,.72)+grain,vec3(.67,.67,.62),casting*.17);}
if(abs(k-2.)<.4){float circ=6.2831853/48.,joint=ft193Line(x,circ,.0009);vec3 metal=mix(vec3(.79,.81,.80),vec3(.50,.56,.57),joint*.33);float windowMask=0.;for(int j=0;j<4;j++){float center=139.80+float(j)*2.8;windowMask=max(windowMask,1.-smoothstep(.65,.69,abs(y-center)));}vec3 glass=mix(vec3(.10,.19,.23),vec3(.28,.39,.41),.35+.30*cos(x*2.0+y*.14));float mullion=ft193Line(x,circ,.0043);glass=mix(glass,vec3(.48,.54,.54),mullion);metal=mix(metal,glass,windowMask);float sill=0.;for(int j=0;j<4;j++){float center=139.80+float(j)*2.8;sill=max(sill,ft193Edge(abs(y-center)-.69,.035));}metal=mix(metal,vec3(.33,.39,.40),sill*.7);if(y<139.2&&normal.y<-.2)metal=vec3(.18,.23,.24);return metal;}
if(abs(k-3.)<.4){float join=max(ft193Line(x,.72,.012),ft193Line(z,.72,.012));return mix(vec3(.64,.67,.64),vec3(.46,.51,.49),join*.28);}
if(abs(k-4.)<.4){float band=floor((y-161.)/(56./9.));return mod(band,2.)<.5?vec3(.77,.10,.075):vec3(.87,.88,.83);}
if(abs(k-5.)<.4)return vec3(.74,.78,.76);
if(abs(k-6.)<.4)return vec3(.27,.31,.30);
if(abs(k-7.)<.4)return vec3(.80,.80,.71);
return base;}
`;
