/** Photo-supported stone tone for St. Agnes. It colors existing vertical faces only. */
export const COLOGNE_ST_AGNES_GLSL = `
vec3 fpCologneStAgnes(vec3 base,vec3 p,vec3 normal,vec4 frame,float layoutId){
 // The OSM church parts with roof:material=slate have a documented dark slate roof.
 if(layoutId>=300.2&&abs(normal.y)>.35)return vec3(.25,.27,.29);
 // Other source components do not identify their roof color; preserve their native roof color.
 if(abs(normal.y)>.35)return base;
 // The street photograph and local description support warm sandstone/tuff masonry.
 // The photograph shows the tower's exposed stone warmer/darker than the broad church body.
 return layoutId>=300.05&&layoutId<300.2?vec3(.65,.48,.34):vec3(.73,.62,.49);
}
`;
