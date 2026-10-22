import {viewportQueryBounds,viewportBoxesOverlap,type ComponentViewportBox,type ComponentViewportCamera} from './three-dimensional-viewport';
export const validModelHeight=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e6;
/** Height is an admitted decoded display mesh bound, never an inferred native measurement.
 * Unknown/horizon descriptors cannot be culled by a finite ground rectangle. */
export function modelHeightQuery(descriptor:{bbox:ComponentViewportBox;max_height_m?:number},bounds:ComponentViewportBox,camera?:ComponentViewportCamera,cityHeightFallback?:number){
 if(!camera)return {matches:viewportBoxesOverlap(descriptor.bbox,bounds),verified:false,mode:'ground-only' as const};
 const own=validModelHeight(descriptor.max_height_m),height=own?descriptor.max_height_m:validModelHeight(cityHeightFallback)?cityHeightFallback:undefined;
 if(height===undefined)return {matches:true,verified:false,mode:'unknown-height' as const};
 const query=viewportQueryBounds(bounds,height*1.01+.1,camera);
 if(!query)return {matches:true,verified:false,mode:'horizon' as const};
 return {matches:viewportBoxesOverlap(descriptor.bbox,query),verified:true,mode:own?'own-height' as const:'city-height-fallback' as const};
}
