/** Existing wall/roof/source colours stay intact; official CC0 windows are a display overlay only. */
export function openFacadeSurfaceFragment(existing:string){
 if(!existing.includes('vec3 sourceFacade('))throw Error('Expected source material facade function');
 return `uniform sampler2D u_source_window_texture;
uniform float u_source_window_ready;
`+existing.replace('vec3 sourceFacade(','vec3 sourceFacadeFallback(')+`
vec3 sourceFacade(vec3 base,vec3 p,vec3 normal,float material,float hasWindows){
 vec3 wallBase=sourceFacadeFallback(base,p,normal,material,u_source_window_ready>.5?0.:hasWindows);
 if(u_source_window_ready<.5)return wallBase;
 float wall=1.-smoothstep(.18,.42,abs(normal.y));
 vec2 metres=vec2(abs(normal.x)>abs(normal.z)?p.z:p.x,p.y);
 float detail=1.-smoothstep(.35,.8,max(length(fwidth(metres)),.0001));
 // Official style repeat is2.5m. Arrangement is schematic, never source floors/tenants.
 vec2 uv=(metres-vec2(0.,.65))/2.5;
 vec4 windows=texture(u_source_window_texture,uv);
 float coverage=windows.a*wall*hasWindows*detail*step(.8,p.y);
 float light=.63+.37*max(0.,dot(normalize(normal),normalize(vec3(-.35,.8,.4))));
 return mix(wallBase,windows.rgb*light,coverage);
}
`;
}
