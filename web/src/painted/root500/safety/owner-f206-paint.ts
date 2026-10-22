export const OWNER_F206_PAINT_GLSL=`
float fk206Line(float x,float period,float width){return 1.-smoothstep(width,width+max(fwidth(x),.005),abs(mod(x+period*.5,period)-period*.5));}
vec3 frauenkopfRecovery197(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float x=frame.x,y=frame.y,z=frame.z,k=frame.w;
if(abs(k-1.)<.4){float joint=fk206Line(y,2.2,.008);return mix(vec3(.75,.75,.68),vec3(.58,.59,.54),joint*.22)+sin(x*14.+y*.13)*.005;}
if(abs(k-2.)<.4){vec3 glass=vec3(.14,.23,.25)+sin(x*3.4)*.025;if(y<20.)return glass;float vertical=fk206Line(x,6.2831853/36.,.005);vec3 wall=vec3(.72,.73,.68);float windows=step(34.10,y)*step(y,36.90);return mix(wall,mix(glass,vec3(.60,.65,.63),vertical),windows);}
if(abs(k-3.)<.4){vec3 concrete=normal.y<-.15?vec3(.40,.43,.41):vec3(.68,.69,.62);return concrete;}
if(abs(k-4.)<.4){float red=1.;if((y>=152.5&&y<162.5)||(y>=172.5&&y<177.4)||(y>=182.4&&y<187.4))red=0.;return mix(vec3(.88,.88,.82),vec3(.76,.12,.085),red);}
if(abs(k-5.)<.4)return vec3(.70,.75,.72);
if(abs(k-6.)<.4)return vec3(.24,.28,.28);
if(abs(k-7.)<.4)return vec3(.83,.83,.77);
if(abs(k-8.)<.4){vec3 wall=vec3(.85,.84,.77);float windows=max(step(.55,y)*step(y,2.12),step(2.75,y)*step(y,4.16));float bays=step(.30,mod(x,2.7))*step(mod(x,2.7),2.3);float mullion=fk206Line(x,1.35,.045);vec3 glazing=mix(vec3(.16,.25,.29),vec3(.61,.64,.62),mullion);wall=mix(wall,glazing,windows*bays);float vent=1.-smoothstep(.09,.12,length(vec2(mod(x+1.8,3.6)-1.8,y-4.57)));return mix(wall,vec3(.28,.31,.29),vent);}
if(abs(k-9.)<.4)return mix(vec3(.40,.44,.41),vec3(.25,.29,.28),fk206Line(x,.72,.015)*.4);
return base;}
`;
