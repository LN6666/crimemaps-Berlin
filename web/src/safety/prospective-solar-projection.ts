import {modelProjectionAtOrigin, type ModelViewProjectionSnapshot} from './model-view-projection';
import {sceneSolarShadowProjection} from './scene-solar-shadow';
import type {SceneQuality} from './scene-environment-quality';

export type SolarWorldBounds = readonly [number,number,number,number,number,number];
export type ProspectiveSolarComponent = Readonly<{
 origin:readonly [number,number];
 /** Canonical native metres, east/up/north, including all indexed triangles. */
 box:SolarWorldBounds;
}>;
export type ProspectiveSolarProjection = Readonly<{
 /** WORLD-Mercator east/south/up. The capture must include this envelope. */
 requiredCoverageBounds:SolarWorldBounds;
 /** Actual capture may use a smaller target; that only tightens this estimate. */
 targetSizeUpperBound:number;
 frame:Pick<ModelViewProjectionSnapshot,'mainMatrix'|'viewport'|'mercator'>;
 project:(origin:readonly [number,number])=>ReturnType<typeof modelProjectionAtOrigin>;
}>;

function validBounds(bounds:SolarWorldBounds|undefined):bounds is SolarWorldBounds {
 return !!bounds&&bounds.length===6&&bounds.every(Number.isFinite)&&[0,1,2].every(i=>bounds[i]<=bounds[i+3]);
}

/** Pure envelope union. This does not certify source/caster completeness or
 * make an unavailable capture ready. Caller keeps its original readiness gate. */
export function mergeSceneSolarCoverageBounds(actual:SolarWorldBounds|undefined,required:SolarWorldBounds):SolarWorldBounds|undefined {
 if(!validBounds(required)||actual&&!validBounds(actual))return;
 if(!actual)return Object.freeze([...required]) as SolarWorldBounds;
 return Object.freeze([Math.min(actual[0],required[0]),Math.min(actual[1],required[1]),Math.min(actual[2],required[2]),
  Math.max(actual[3],required[3]),Math.max(actual[4],required[4]),Math.max(actual[5],required[5])]) as SolarWorldBounds;
}

export function sceneSolarCoverageContains(actual:SolarWorldBounds|undefined,required:SolarWorldBounds):boolean {
 return validBounds(actual)&&validBounds(required)&&[0,1,2].every(i=>actual[i]<=required[i]&&actual[i+3]>=required[i+3]);
}

/** Compute once at source adoption. No light/quality, GL or retained models.
 * Return order is WORLD-Mercator [minEast,minSouth,minUp,maxEast,maxSouth,maxUp]. */
export function buildingDetailSolarCoverageBounds(components:readonly ProspectiveSolarComponent[],maximumGeometryErrorM:number):SolarWorldBounds|undefined {
 const error=maximumGeometryErrorM;
 if(!Array.isArray(components)||!components.length||components.length>20000||!Number.isFinite(error)||error<0||error>.25)return;
 const bounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
 for(const component of components){
  const {origin,box}=component;
  if(origin.length!==2||!origin.every(Number.isFinite)||Math.abs(origin[0])>180||Math.abs(origin[1])>85||!validBounds(box))return;
  const latitude=origin[1]*Math.PI/180,unit=2*Math.PI*6378137*Math.cos(latitude);
  const ox=(origin[0]+180)/360,oy=(1-Math.log(Math.tan(Math.PI/4+latitude/2))/Math.PI)/2;
  if(!Number.isFinite(unit)||unit<=0||!Number.isFinite(oy))return;
  const local=[ox+(box[0]-error)/unit,oy-(box[5]+error)/unit,(Math.min(0,box[1])-error)/unit,
   ox+(box[3]+error)/unit,oy-(box[2]-error)/unit,(Math.max(0,box[4])+error)/unit];
  for(let axis=0;axis<3;axis++){bounds[axis]=Math.min(bounds[axis],local[axis]);bounds[axis+3]=Math.max(bounds[axis+3],local[axis+3]);}
 }
 const required=Object.freeze(bounds) as unknown as SolarWorldBounds;
 return validBounds(required)?required:undefined;
}

/** No GL, store, observer or source production. Uses the same native metre
 * transform and light fitting as the real capture, retaining binary64 origins.
 *
 * CONTRACT: before using this frame to admit a display LOD, the compositor must
 * carry requiredCoverageBounds into the actual solar capture's bounds and its
 * content revision. A frame fitted to a larger old scene is not sufficient.
 * Union with a complete actual caster envelope is safe: its axis radii can only
 * grow. Fitting at the requested upper target size is at least as strict as a
 * device-clamped smaller target. Unknown coverage stays canonical at caller.
 */
export function createProspectiveSceneSolarProjection(options:{
 components:readonly ProspectiveSolarComponent[];
 direction:readonly [number,number,number];
 quality:SceneQuality;
 mobile?:boolean;
 maximumGeometryErrorM:number;
 /** A compositor-verified epoch. The caller must carry the resulting union
  * into the actual capture; supplying bounds alone does not certify readiness. */
 sceneCoverageBounds?:SolarWorldBounds;
}):ProspectiveSolarProjection|undefined {
 const {components,direction,quality,maximumGeometryErrorM:error}=options;
 if(direction.length!==3||!direction.every(Number.isFinite)||direction[1]<=0)return;
 const requested=['economy','balanced','detail'].includes(quality)?512:0;
 if(!requested)return;
 const size=Math.min(requested,options.mobile?1024:2048);
 const leaf=buildingDetailSolarCoverageBounds(components,error);
 if(!leaf)return;
 const required=options.sceneCoverageBounds===undefined?leaf:mergeSceneSolarCoverageBounds(options.sceneCoverageBounds,leaf);
 if(!required)return;
 const fitted=sceneSolarShadowProjection(required,direction,size);
 const frame=Object.freeze({mainMatrix:fitted.matrix,mercator:true,
  viewport:Object.freeze({cssWidth:size,cssHeight:size,drawingBufferWidth:size,drawingBufferHeight:size})});
 // This closure retains only a 16-number projection/viewport, not components.
 const project=(origin:readonly [number,number])=>modelProjectionAtOrigin(frame,origin);
 return Object.freeze({requiredCoverageBounds:required,targetSizeUpperBound:size,frame,project});
}
