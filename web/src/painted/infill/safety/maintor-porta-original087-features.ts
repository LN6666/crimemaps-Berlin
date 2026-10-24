export const MAINTOR_PORTA_ORIGINAL_GLSL087=String.raw`float c178Line(float x,float pitch,float width){float d=min(mod(x,pitch),pitch-mod(x,pitch));return 1.-smoothstep(width,width+max(fwidth(x),.012),d);}
vec3 c178MainTorPorta(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec2 uv=frame.xy;float u=uv.x,y=uv.y,pitch=frame.w/max(1.,floor(frame.w/2.5+.5));vec3 stone=vec3(.77,.76,.70),dark=vec3(.17,.21,.23);
 if(family>11788.5)return vec3(.37,.39,.38);
 // Existing CPU source-perimeter width identifies only own tower/back cofaces. No family or UV changes.
 bool confirmedTowerBack=family>11782.5&&family<11783.5&&abs(frame.w-111.16503513)<.01;
 if(family>11782.5&&!confirmedTowerBack)return stone;
 float x=abs(mod(u+pitch*.5,pitch)-pitch*.5),yy=mod(y-.4,3.5);float opening=(1.-smoothstep(.65,.70,x))*step(.14,yy)*(1.-step(2.90,yy));vec3 c=mix(stone,dark,opening);float rim=(1.-smoothstep(.75,.80,x))*step(.07,yy)*(1.-step(3.,yy));c=mix(c,vec3(.46,.47,.44),max(0.,rim-opening)*.6);if(y<3.1){float pillar=c178Line(u,pitch,.19);c=mix(vec3(.23,.29,.30),stone,pillar);}if(family>11780.5&&y>66.){float vent=step(67.,y)*(1.-step(68.1,y))*(1.-c178Line(y,.18,.025));c=mix(stone,vec3(.27,.29,.28),vent*.8);}return c;
}
`;
export const MAINTOR_PORTA_ORIGINAL_GUARD087=" if(family==11780.||family==11781.||family==11783.||family==11789.)return c178MainTorPorta(base,p,normal,frame,family);\n";
export function mainTorPortaOriginal087PartitionSource(source:string,key:string,city:string){
 if(city==='frankfurt'&&key==='infill-maintor-porta-original087')return source;
 const defs=source.split(MAINTOR_PORTA_ORIGINAL_GLSL087).length-1,calls=source.split(MAINTOR_PORTA_ORIGINAL_GUARD087).length-1;
 if(defs>1||calls>1)throw Error('C178087 duplicate private source/guard');
 const scoped=source.replace(MAINTOR_PORTA_ORIGINAL_GLSL087,'').replace(MAINTOR_PORTA_ORIGINAL_GUARD087,'');
 if(/\b(?:c178MainTorPorta|c178Line)\s*\(/.test(scoped))throw Error('C178087 leaked outside original private partition');
 return scoped;
}
