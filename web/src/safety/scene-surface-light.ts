/** Apply once AFTER all source colors, facade families and material masks.
 * Source RGB is multiplied, never replaced: a restrained cool sky fill and warm
 * direct light separate unpainted faces without erasing reviewed materials.
 * Solar direction is computed elsewhere; fill and wall-foot contact are display
 * cues, not measured irradiance or ambient occlusion. Night fill is unchanged. */
export const SCENE_SURFACE_LIGHT_GLSL = `
uniform vec3 u_scene_sun_direction;
uniform float u_scene_daylight;
uniform float u_scene_light_enabled;
float sceneSurfaceChannel(float sky,float direct,float normalY,float facing,float day){
  float night=.56+.06*clamp(normalY*.5+.5,0.,1.);
  float skyLight=sky+.08*max(0.,normalY);
  return mix(night,skyLight,day)+direct*day*facing;
}
float sceneSurfaceContact(float normalY,float height,float day){
  return 1.-(.14+.04*day)*exp(-max(0.,height)/(1.15-.20*day))*(1.-abs(normalY));
}
vec3 sceneSurfaceLight(vec3 base,vec3 normal,float height){
  if(u_scene_light_enabled<.5)return base;
  vec3 n=normalize(normal);
  float day=clamp(u_scene_daylight,0.,1.);
  float facing=max(0.,dot(n,u_scene_sun_direction));
  vec3 light=vec3(sceneSurfaceChannel(.64,.28,n.y,facing,day),
                  sceneSurfaceChannel(.66,.25,n.y,facing,day),
                  sceneSurfaceChannel(.70,.20,n.y,facing,day));
  return base*light*sceneSurfaceContact(n.y,height,day);
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
