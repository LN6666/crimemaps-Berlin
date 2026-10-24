export const INFILL_MAIN_TOWER_PODIUM_GLSL=/*glsl*/`
vec3 infillMainTowerPodiumPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family>30099.5&&family<30100.5&&abs(normal.y)<.15){float u=abs(normal.x)>abs(normal.z)?p.z:p.x;vec2 q=fract(vec2(u/3.0,p.y/3.6));float opening=step(.22,q.x)*step(q.x,.78)*step(.23,q.y)*step(q.y,.82);return mix(base,vec3(.20,.29,.32),opening);}
 return base;
}
`;
