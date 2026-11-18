/** Report after the custom render callback returns: MapLibre must first invalidate its
 * state cache. Public errors stay observable and the owning loader reports/retries them. */
type ErrorSurface={fire?:(type:'error',event:{error:Error;layerId:string})=>unknown};
/** A custom render that throws aborts MapLibre's whole frame. Keep the failure inside the
 * layer: a lost context belongs to the recovery path; any other failure skips this layer's
 * draw for the frame and is reported once per message. */
export function guardCustomLayerRender<Args extends unknown[]>(map:object,layerId:string,render:(...args:Args)=>void,isLost:()=>boolean){
 const reported=new Set<string>();
 return (...args:Args)=>{try{render(...args);}catch(error){if(isLost())return;const message=String(error).slice(0,512);if(reported.has(message))return;reported.add(message);reportCustomLayerRenderError(map as ErrorSurface,layerId,error);}};
}
export function reportCustomLayerRenderError(map:ErrorSurface,layerId:string,error:unknown,onError?:((error:Error)=>void),isCurrent:()=>boolean=()=>true){
 const failure=new Error(`Custom layer ${layerId} render failed: ${String(error).slice(0,512)}`);
 queueMicrotask(()=>{if(!isCurrent())return;try{onError?.(failure);}finally{if(map.fire)map.fire('error',{error:failure,layerId});else console.error(failure);}});
}
