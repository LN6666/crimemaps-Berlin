// Verbatim original accepted715/719 role12 and15 expressions; no new facade programme.
export const F260_ACCEPTED_RESTORE_ROLE_GLSL=String.raw`
if(role==12)return mix(vec3(.51,.51,.45),vec3(.75,.74,.66),clamp(n.y*.35+.55,0.,1.));
if(role==15)return mix(vec3(.40,.43,.38),vec3(.70,.71,.63),clamp(n.y*.35+.55,0.,1.));
`;
/** Inject only these absent roles into the existing F260 programme; all other shader bytes remain intact. */
export function withF260AcceptedRestoredRoles(glsl:string){
 const anchor='vec3 f260Station264(vec3 base,vec3 p,vec3 n,vec4 f,float family){',i=glsl.indexOf(anchor);if(i<0||glsl.indexOf(anchor,i+anchor.length)>=0)throw Error('F260 restore expected one exact original shader anchor');
 const role='int role=int(f.w+.5);',j=glsl.indexOf(role,i);if(j<0||j>i+250)throw Error('F260 restore original role declaration missing');const end=glsl.indexOf('\n}',j),body=glsl.slice(i,end<0?i+20000:end);if(body.includes('if(role==12)')||body.includes('if(role==15)'))throw Error('F260 restore refuses duplicate existing role programme');return glsl.slice(0,j+role.length)+F260_ACCEPTED_RESTORE_ROLE_GLSL+glsl.slice(j+role.length);
}
