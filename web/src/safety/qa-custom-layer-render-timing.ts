/** Local QA timings of source-owned public custom-layer render callbacks only.
 * Includes synchronous driver/GC/waits; excludes SDK preparation and GPU completion. */
type LayerCode=0|1;
type RenderCallback=(...args:any[])=>any;
type NumericRow=[sequence:number,layerCode:LayerCode,startedMs:number,endedMs:number,elapsedMs:number,failed:0|1];
const local=typeof location!=='undefined'&&['127.0.0.1','localhost','[::1]','::1'].includes(location.hostname);
const flags=local?new URLSearchParams(location.search):undefined;
const enabled=Boolean(flags?.has('diagnostics')&&flags.get('qaPerf')==='1');
const limit=64,rows:NumericRow[]=[];
const totals=[{samples:0,failed:0,totalElapsedMs:0,minElapsedMs:0,maxElapsedMs:0},{samples:0,failed:0,totalElapsedMs:0,minElapsedMs:0,maxElapsedMs:0}];
let sequence=0,evictedRows=0;
export const qaCustomLayerRenderTimingEnabled=()=>enabled;
export function withQaCustomLayerRenderTiming<T extends RenderCallback>(layerCode:LayerCode,callback:T):T{
 if(!enabled)return callback;
 return function(this:unknown,...args:Parameters<T>){
  const startedMs=performance.now();let failed:0|1=1;
  try{const result=Reflect.apply(callback,this,args);failed=0;return result;}
  finally{
   const endedMs=performance.now(),elapsedMs=Math.max(0,endedMs-startedMs),total=totals[layerCode];
   total.samples++;total.failed+=failed;total.totalElapsedMs+=elapsedMs;
   total.minElapsedMs=total.samples===1?elapsedMs:Math.min(total.minElapsedMs,elapsedMs);total.maxElapsedMs=Math.max(total.maxElapsedMs,elapsedMs);
   rows.push([++sequence,layerCode,startedMs,endedMs,elapsedMs,failed]);if(rows.length>limit){rows.shift();evictedRows++;}
  }
 } as T;
}
export function qaCustomLayerRenderTiming(){
 if(!enabled)return undefined;
 return {source:'source-owned-public-custom-layer-render-callback',measurement:'callback synchronous elapsed including driver/GC; not GPU completion, exclusive CPU, SDK preparation or whole MapLibre RAF',capturedAtMonotonicMs:performance.now(),limit,evictedRows,rowFields:['sequence','layerCode','startedMs','endedMs','elapsedMs','failed'],layerCodes:{buildings:0,vehicles:1},totals:totals.map(t=>({...t,minElapsedMs:t.samples?t.minElapsedMs:null,maxElapsedMs:t.samples?t.maxElapsedMs:null})),rows:rows.map(r=>[...r]),wholeSdkRenderStartBoundary:'unsupported in installed MapLibre 6.11.1; no public renderstart',callsAreNotDraws:true};
}
