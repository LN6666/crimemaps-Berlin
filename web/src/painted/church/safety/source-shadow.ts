/** Fixed schematic sunlight. Admission belongs to the offline native city compiler.
 * Original source geometry/tags and the actual roof/wall picking triangles are unchanged. */
export const SOURCE_SHADOW_DESCRIPTION={zh:'阴影采用固定方向的示意光照。',en:'Shadows use a fixed illustrative light direction.',de:'Die Schatten verwenden eine feste, schematische Lichtrichtung.'} as const;
export const SOURCE_SHADOW_VECTOR=[.35,.22] as const;
export type SourceShadowAdmission={schema_version:1;city:string;objectId:string;partId:string;source_boundary_sha256:string;fixed_vector:[number,number];swept_bbox:[number,number,number,number];swept_bbox_actual_city_covered:true;includes_growth_zero_to_one:true;triangle_count:number;status:'display-schematic'};
const cityIDs=new Set(['berlin','hamburg','munich','cologne','frankfurt','dusseldorf','stuttgart','leipzig','dortmund','bremen','essen','dresden','hannover','nuremberg']);
/** Fail closed unless the current hash-checked mesh asset carries its exact city gate. */
export function isSourceShadowAdmitted(value:unknown,context:{city:string;objectId:string;partId:string;boundarySHA256:string;triangleCount:number}):value is SourceShadowAdmission{
 const p=value as SourceShadowAdmission|undefined;
 return !!p&&cityIDs.has(context.city)&&p.schema_version===1&&p.city===context.city&&p.objectId===context.objectId&&p.partId===context.partId&&/^[a-f0-9]{64}$/.test(context.boundarySHA256)&&p.source_boundary_sha256===context.boundarySHA256&&p.status==='display-schematic'&&p.swept_bbox_actual_city_covered===true&&p.includes_growth_zero_to_one===true&&Array.isArray(p.fixed_vector)&&p.fixed_vector.length===2&&p.fixed_vector.every((v,i)=>v===SOURCE_SHADOW_VECTOR[i])&&Array.isArray(p.swept_bbox)&&p.swept_bbox.length===4&&p.swept_bbox.every(Number.isFinite)&&p.swept_bbox[0]>=-180&&p.swept_bbox[2]<=180&&p.swept_bbox[1]>=-85&&p.swept_bbox[3]<=85&&p.swept_bbox[0]<=p.swept_bbox[2]&&p.swept_bbox[1]<=p.swept_bbox[3]&&Number.isSafeInteger(context.triangleCount)&&context.triangleCount>0&&p.triangle_count===context.triangleCount;
}
/** Offline helper. Renderer xEast/yUp/zNorth uses the same local Mercator scale.
 * City compiler must cover the returned rectangle with the exact municipal polygon.
 * Axis monotonic inverse Mercator proves every projected triangle and growth phase lies inside it. */
export function sourceShadowSweptBBox(origin:[number,number],batches:readonly{positions:ArrayLike<number>}[]):[number,number,number,number]{
 if(origin.length!==2||!origin.every(Number.isFinite)||Math.abs(origin[0])>180||Math.abs(origin[1])>85)throw Error('Invalid native shadow origin');
 const rad=Math.PI/180,R=6378137*Math.cos(origin[1]*rad),originY=Math.log(Math.tan(Math.PI/4+origin[1]*rad/2));
 let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity,count=0;
 for(const b of batches){if(b.positions.length%3)throw Error('Invalid mesh positions');for(let i=0;i<b.positions.length;i+=3){const x=b.positions[i],y=b.positions[i+1],z=b.positions[i+2];if(![x,y,z].every(Number.isFinite)||y<0)throw Error('Unknown below-ground shadow height');if(++count>200000)throw Error('Shadow vertex budget exceeded');for(const g of [0,1]){const lon=origin[0]+(x+SOURCE_SHADOW_VECTOR[0]*y*g)/R/rad,lat=(2*Math.atan(Math.exp(originY+(z+SOURCE_SHADOW_VECTOR[1]*y*g)/R))-Math.PI/2)/rad;west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat);}}}
 if(!count||west< -180||east>180||south< -85||north>85)throw Error('Invalid shadow geographic bounds');return[west,south,east,north];
}
/** Hide schematic shadows while buildings are faded for routes or election layers. */
export function sourceShadowOpacity(surfaceOpacity:number,context:'normal'|'route-selection'){
 return context==='normal'&&Number.isFinite(surfaceOpacity)&&surfaceOpacity>=.99&&surfaceOpacity<=1?.08:0;
}
export const SOURCE_SHADOW_VERTEX_GLSL=`#version 300 es
precision highp float;
in vec3 a_position;in float a_selected;uniform mat4 u_matrix;out float v_growth;
void main(){float growth=mod(a_selected,2.);v_growth=growth;vec3 p=vec3(a_position.x+.35*a_position.y*growth,.015,a_position.z+.22*a_position.y*growth);gl_Position=u_matrix*vec4(p,1.);}`;
export const SOURCE_SHADOW_FRAGMENT_GLSL=`#version 300 es
precision mediump float;in float v_growth;uniform float u_shadow_opacity;out vec4 color;
void main(){color=vec4(.12,.14,.16,u_shadow_opacity*v_growth);}`;
