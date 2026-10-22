export const OWNER_F193_FOOT_PAINT_GLSL=`
vec3 fernsehturmFootRecovery195(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
float u=frame.x,y=frame.y,e=frame.z,k=frame.w;
if(abs(k-9.)<.4){float seam=1.-smoothstep(.025,.045,abs(mod(u+frame.z*.17,.65)-.325));return mix(vec3(.31,.35,.33),vec3(.19,.23,.22),seam*.45);}
if(abs(k-8.)>.4)return base;
vec3 wall=vec3(.86,.85,.79);float glass=0.,door=0.,fullGlass=0.;
// Finite source-edge assignments: west restaurant terrace, near-shaft entrance, rear/service and NE operations bar.
if((e>9.5&&e<10.5)||(e>12.5&&e<16.5)){glass=step(.18,y)*step(y,2.20);fullGlass=1.;}
if(e>7.5&&e<8.5){glass=step(.08,y)*step(y,2.22);door=step(.95,u)*step(u,3.65)*step(y,2.18);fullGlass=1.;}
if(e>16.5&&e<22.5){glass=step(1.02,y)*step(y,2.08)*step(.48,mod(u,2.45))*step(mod(u,2.45),2.10);}
if(e>22.5&&e<30.5){glass=step(1.04,y)*step(y,2.08)*step(.38,mod(u,2.65))*step(mod(u,2.65),2.28);}
vec3 glazing=mix(vec3(.12,.22,.24),vec3(.25,.34,.31),.4+.24*sin(u*.43));float mullion=1.-smoothstep(.035,.065,abs(mod(u+1.05,1.4)-.7));float rail=1.-smoothstep(.025,.055,abs(y-1.85));glazing=mix(glazing,vec3(.57,.60,.58),max(mullion,rail)*.85);wall=mix(wall,glazing,glass);if(door>.5){float split=1.-smoothstep(.025,.055,abs(u-2.3));wall=mix(glazing,vec3(.63,.65,.61),split);float circle=1.-smoothstep(.81,.86,length(vec2(u-2.3,y-1.17)));wall=mix(wall,vec3(.16,.22,.21),circle*.38);}
float sill=1.-smoothstep(.04,.07,abs(y-.12));wall=mix(wall,vec3(.36,.39,.36),sill*.75);if(y>2.28)wall=vec3(.73,.75,.69);return wall;}
`;
