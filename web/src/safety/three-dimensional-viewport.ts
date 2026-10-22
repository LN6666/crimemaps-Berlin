import type {BuildingComponent} from './building-mesh-renderer';
export type ComponentViewportBox=[number,number,number,number];
const records=new WeakMap<BuildingComponent,{bbox:ComponentViewportBox;vertices:number;maxHeightMetres:number}>();
export const viewportBoxesOverlap=(a:ComponentViewportBox,b:ComponentViewportBox)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
/** Same Mercator model transform as renderer, including native roof/eave positions.
 * Display-only admission. Never clips or changes source geometry, identity or tags. */
export function componentViewportRecord(c:BuildingComponent){
 const hit=records.get(c);if(hit)return hit;
 let x0=Infinity,z0=Infinity,x1=-Infinity,z1=-Infinity,vertices=0,maxHeight=0;
 for(const b of c.batches){vertices+=b.positions.length/3;for(let i=0;i<b.positions.length;i+=3){const x=b.positions[i],z=b.positions[i+2];maxHeight=Math.max(maxHeight,b.positions[i+1]);x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}}
 const rad=Math.PI/180,R=6378137*Math.cos(c.origin[1]*rad),oy=Math.log(Math.tan(Math.PI/4+c.origin[1]*rad/2)),pad=.1;
 const lon=(x:number)=>c.origin[0]+x/R/rad,lat=(z:number)=>(2*Math.atan(Math.exp(oy+z/R))-Math.PI/2)/rad;
 const bbox:ComponentViewportBox=[lon(x0-pad),lat(z0-pad),lon(x1+pad),lat(z1+pad)];
 if(!vertices||!Number.isSafeInteger(vertices)||!bbox.every(Number.isFinite))throw Error('Invalid native component display envelope');
 const record={bbox,vertices,maxHeightMetres:maxHeight*1.01+.1};records.set(c,record);return record;
}
export type ComponentViewportCamera={pitch:number;verticalFieldOfView:number;aspectRatio:number};
/** The view cone's maximum downward ray slope bounds the horizontal displacement
 * between an upper model vertex and that pixel's ground-plane intersection. */
export function viewportHeightOverscanMetres(height:number,camera:ComponentViewportCamera){
 if(!Number.isFinite(height)||height<0||![camera.pitch,camera.verticalFieldOfView,camera.aspectRatio].every(Number.isFinite)||Math.abs(camera.pitch)>85||camera.verticalFieldOfView<=0||camera.verticalFieldOfView>=180||camera.aspectRatio<=0)return Infinity;
 const rad=Math.PI/180,diagonalHalf=Math.atan(Math.tan(camera.verticalFieldOfView*rad/2)*Math.hypot(1,camera.aspectRatio)),angle=Math.abs(camera.pitch)*rad+diagonalHalf;
 // A horizon crossing cannot be finitely covered by a ground-plane rectangle.
 return angle>=Math.PI/2?Infinity:height*Math.tan(angle)+.1;
}
export function viewportQueryBounds(bounds:ComponentViewportBox,height:number,camera:ComponentViewportCamera):ComponentViewportBox|undefined{
 const metres=viewportHeightOverscanMetres(height,camera);if(!Number.isFinite(metres))return;
 const rad=Math.PI/180,latPad=metres/6378137/rad,cos=Math.cos(Math.min(85,Math.max(Math.abs(bounds[1]),Math.abs(bounds[3]))+latPad)*rad),lonPad=latPad/cos;
 return[Math.max(-180,bounds[0]-lonPad),Math.max(-85,bounds[1]-latPad),Math.min(180,bounds[2]+lonPad),Math.min(85,bounds[3]+latPad)];
}
export function viewportComponents(rows:readonly BuildingComponent[],bounds:ComponentViewportBox,camera?:ComponentViewportCamera){return rows.filter(c=>{const r=componentViewportRecord(c),query=camera?viewportQueryBounds(bounds,r.maxHeightMetres,camera):bounds;return !query||viewportBoxesOverlap(r.bbox,query);});}
export function viewportComponentDistance(c:BuildingComponent,bounds:ComponentViewportBox){const b=componentViewportRecord(c).bbox,lat=(bounds[1]+bounds[3])/2;return Math.hypot(((b[0]+b[2]-bounds[0]-bounds[2])/2)*Math.cos(lat*Math.PI/180),(b[1]+b[3]-bounds[1]-bounds[3])/2);}
