import type {BuildingComponent} from './building-mesh-renderer';
import {ownerShapePatchProfile} from './owner-shape-patch-display';
/** User-authorized F46 reconstruction only. No native admissions or arrays are changed. */
export function applyF46RecoveryPaint(components:BuildingComponent[],colors:Float32Array,frames:Float32Array){
 const p=ownerShapePatchProfile('/safety/buildings3d/owner-shape-patches/F46-180.json');let at=0;
 for(const c of components){const m=c.sourceFeature.properties?.owner_shape_patch as {number?:string;geometryRole?:string}|undefined;
 const admitted=!!p&&c.city===p.city&&c.objectId===p.objectId&&c.partId===p.partId&&m?.number==='F46'&&m.geometryRole==='owner-authorized-reconstruction';
 for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3,at++)if(admitted){colors.set([...b.color,2],at*4);frames.set([b.positions[j],b.positions[j+2],80,51,3305],at*5);}
 }
 return {colors,frames};
}
export const F46_RECOVERY_SURFACE_GLSL=`
vec3 f46RecoverySurface177(vec3 base,vec3 p,vec3 n,vec4 frame){
 float aa=max(fwidth(p.y),.012);vec3 c=base;
 // Brick faces only; the portal, blind recesses, clock, and copper never acquire masonry windows.
 if(base.r>base.g*1.40&&base.r>.45){
  float row=floor(p.y/.24);float u=abs(n.x)>abs(n.z)?frame.y:frame.x;
  float horizontal=1.-smoothstep(.012,.012+aa,abs(mod(p.y+.12,.24)-.12));
  float vertical=1.-smoothstep(.012,.012+max(fwidth(u),.012),abs(mod(u+mod(row,2.)*.27+.27,.54)-.27));
  float lod=1.-smoothstep(.12,.36,max(fwidth(p.y),fwidth(u)));
  c*=1.-lod*.13*max(horizontal,vertical);c*=1.+lod*.025*sin(floor(u/.54)*19.+row*7.);
 }
 // Sparse standing seams run down actual sloped copper planes, not across walls.
 if(base.g>base.r*1.13&&n.y>.015){
  float u=abs(n.x)>abs(n.z)?frame.y:frame.x;
  float seam=1.-smoothstep(.018,.018+max(fwidth(u),.015),abs(mod(u+.55,1.1)-.55));
  c*=1.-seam*.13;
 }
 return c;
}
`;
