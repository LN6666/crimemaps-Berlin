/** Report after the custom render callback returns: MapLibre must first invalidate its
 * state cache. Public errors stay observable and the owning loader reports/retries them. */
type ErrorSurface={fire?:(type:'error',event:{error:Error;layerId:string})=>unknown};
export function reportCustomLayerRenderError(map:ErrorSurface,layerId:string,error:unknown,onError?:((error:Error)=>void),isCurrent:()=>boolean=()=>true){
 const failure=new Error(`Custom layer ${layerId} render failed: ${String(error).slice(0,512)}`);
 queueMicrotask(()=>{if(!isCurrent())return;try{onError?.(failure);}finally{if(map.fire)map.fire('error',{error:failure,layerId});else console.error(failure);}});
}
