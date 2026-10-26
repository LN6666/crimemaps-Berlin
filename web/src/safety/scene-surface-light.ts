/** Apply once AFTER all source colors, facade families and material masks.
 * Multiplicative luminance keeps native and reviewed RGB hues. Wall-foot shading
 * is an illustrative contact cue, not a measured ambient occlusion solution. */
export const SCENE_SURFACE_LIGHT_GLSL = `
uniform vec3 u_scene_sun_direction;
uniform float u_scene_daylight;
uniform float u_scene_light_enabled;
vec3 sceneSurfaceLight(vec3 base,vec3 normal,float height){
  if(u_scene_light_enabled<.5)return base;
  vec3 n=normalize(normal);
  float hemisphere=.06*clamp(n.y*.5+.5,0.,1.);
  float sunlight=.40*u_scene_daylight*max(0.,dot(n,u_scene_sun_direction));
  float luminance=.56+hemisphere+sunlight;
  float foot=1.-.14*exp(-max(0.,height)/1.15)*(1.-abs(n.y));
  return base*luminance*foot;
}`;

export type SceneLightUniforms = {direction: readonly [number, number, number]; daylight: number;enabled?:boolean};
/** No allocations or uniform lookup in the draw path after first program use. */
export function createSceneLightUniforms() {
  const locations = new WeakMap<WebGLProgram, {direction: WebGLUniformLocation | null; daylight: WebGLUniformLocation | null;enabled:WebGLUniformLocation|null}>();
  return (gl: WebGL2RenderingContext, program: WebGLProgram, light: SceneLightUniforms, enabled = true) => {
    let row = locations.get(program);
    if (!row) {
      row = {direction: gl.getUniformLocation(program, 'u_scene_sun_direction'), daylight: gl.getUniformLocation(program, 'u_scene_daylight'),enabled:gl.getUniformLocation(program,'u_scene_light_enabled')};
      locations.set(program, row);
    }
    gl.uniform3f(row.direction, light.direction[0], light.direction[1], light.direction[2]);
    gl.uniform1f(row.daylight, light.daylight);
    gl.uniform1f(row.enabled, !enabled||light.enabled===false?0:1);
  };
}
