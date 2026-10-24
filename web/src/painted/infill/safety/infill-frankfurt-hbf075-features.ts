/** Private program must include unchanged F137_GLSL before this function.
 * Global/city programs already include it and must not include a duplicate.
 */
export const FRANKFURT_HBF075_GLSL=String.raw`
vec3 frankfurtHbf075(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family<45420.||family>45422.)return base;
 // Measured low-wing roofs/walls keep coherent DOP/photo base colours.
 // Unknown walls have no invented office or station window grid.
 if(family>45420.5)return base;
 vec3 c=frankfurtHauptbahnhofWhole137(base,p,normal,frame,6349.);
 float u=frame.x,v=frame.y,y=p.y;
 float front=dot(normal.xz,vec2(.85321609,.52155757));
 if(front<.96||u> -125.||abs(v)>28.2||y<0.||y>29.1)return c;
 // Photo-specific lower portal: radial voussoirs around three accepted arches.
 float portal=mod(v+9.,18.)-9.;float ringR=length(vec2(portal,y-5.));
 float ring=step(5.,y)*smoothstep(5.92,6.05,ringR)*(1.-smoothstep(7.05,7.20,ringR));
 float theta=atan(y-5.,portal);float sector=f137line(theta,.19634954,.0045);
 c=mix(c,vec3(.47,.41,.32),ring*sector*.64);
 float edge=max(1.-smoothstep(.025,.08,abs(ringR-6.10)),1.-smoothstep(.025,.08,abs(ringR-7.03)))*step(5.,y);
 c=mix(c,vec3(.78,.70,.55),edge*.46);
 // Recessed smooth pier panels surrounded by the photographed rusticated piers.
 float pierDist=min(min(abs(v-8.7),abs(v+8.7)),min(abs(v-26.2),abs(v+26.2)));
 float panel=(1.-smoothstep(.54,.62,pierDist))*step(1.1,y)*(1.-step(9.1,y));
 float topOrBottom=max(1.-smoothstep(.035,.09,abs(y-2.0)),max(1.-smoothstep(.035,.09,abs(y-4.5)),1.-smoothstep(.035,.09,abs(y-8.8))));
 float frameEdge=(1.-smoothstep(.025,.07,abs(pierDist-.57)));
 c=mix(c,vec3(.66,.57,.43),panel*.26);
 c=mix(c,vec3(.80,.71,.55),max(frameEdge*panel,topOrBottom*panel)*.55);
 return c;
}
`;
