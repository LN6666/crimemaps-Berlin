/** Target-scoped tier-100 color zones for Christianskirken's mapped building.
 * The church photograph supports pale walls and a slightly darker pale-gray flat roof.
 * Every surface represented by this target geometry is included; no geometry is added
 * for architectural parts missing from the white model.
 */
export const BERLIN_CHRISTIANSKIRKEN_GLSL = `
vec3 fpBerlinChristianskirken(vec3 base,vec3 normal){
  float ny=normal.y;
  if(ny>.72){
    // Keep the broad, genuinely flat native roof readable without inventing ridges.
    return mix(base,vec3(.75,.77,.76),.92);
  }
  if(abs(ny)<.18){
    // Photo-supported white/light-gray cladding on the low church volumes.
    return mix(base,vec3(.89,.90,.88),.88);
  }
  return base;
}
`;
