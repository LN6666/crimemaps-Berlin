/** Local QA timings of source-owned public custom-layer callbacks only.
 * Includes synchronous driver/GC/waits; excludes SDK preparation and GPU completion. */
type LayerCode=0|1|2;
type RenderCallback=(...args:any[])=>any;
type NumericRow=[sequence:number,layerCode:LayerCode,startedMs:number,endedMs:number,elapsedMs:number,failed:0|1];
const local=typeof location!=='undefined'&&['127.0.0.1','localhost','[::1]','::1'].includes(location.hostname);
const flags=local?new URLSearchParams(location.search):undefined;
const enabled=Boolean(flags?.has('diagnostics')&&flags.get('qaPerf')==='1');
const limit=64,rows:NumericRow[]=[];
const totals=Array.from({length:3},()=>({samples:0,failed:0,totalElapsedMs:0,minElapsedMs:0,maxElapsedMs:0}));
// The rolling ring can turn over before a bounded observer reads it. Retain
// just the longest callback per category, with its original monotonic interval.
const longest:(NumericRow|undefined)[]=[undefined,undefined,undefined];
// Fixed provider vocabulary bounds retention even if callers pass arbitrary labels.
const providerNames=new Set(['city','root500','delegated500','tier300','church','infill','bremen','vehicles']);
const providerTimings=new Map<string,{totals:typeof totals;longest:typeof longest}>();
let sequence=0,evictedRows=0;
export const qaCustomLayerRenderTimingEnabled=()=>enabled;
export function withQaCustomLayerRenderTiming<T extends RenderCallback>(layerCode:LayerCode,callback:T,provider?:string):T{
 if(!enabled)return callback;
 const providerKey=provider&&providerNames.has(provider)?provider:'unknown';
 let account=providerTimings.get(providerKey);
 if(!account){account={totals:Array.from({length:3},()=>({samples:0,failed:0,totalElapsedMs:0,minElapsedMs:0,maxElapsedMs:0})),longest:[undefined,undefined,undefined]};providerTimings.set(providerKey,account);}
 const providerAccount=account;
 return function(this:unknown,...args:Parameters<T>){
  const startedMs=performance.now();let failed:0|1=1;
  try{const result=Reflect.apply(callback,this,args);failed=0;return result;}
  finally{
   const endedMs=performance.now(),elapsedMs=Math.max(0,endedMs-startedMs),total=totals[layerCode];
   total.samples++;total.failed+=failed;total.totalElapsedMs+=elapsedMs;
   total.minElapsedMs=total.samples===1?elapsedMs:Math.min(total.minElapsedMs,elapsedMs);total.maxElapsedMs=Math.max(total.maxElapsedMs,elapsedMs);
   const row:NumericRow=[++sequence,layerCode,startedMs,endedMs,elapsedMs,failed];
   const own=providerAccount.totals[layerCode];own.samples++;own.failed+=failed;own.totalElapsedMs+=elapsedMs;
   own.minElapsedMs=own.samples===1?elapsedMs:Math.min(own.minElapsedMs,elapsedMs);own.maxElapsedMs=Math.max(own.maxElapsedMs,elapsedMs);
   if(!providerAccount.longest[layerCode]||elapsedMs>providerAccount.longest[layerCode]![4])providerAccount.longest[layerCode]=row;
   rows.push(row);if(!longest[layerCode]||elapsedMs>longest[layerCode]![4])longest[layerCode]=row;
   if(rows.length>limit){rows.shift();evictedRows++;}
  }
 } as T;
}
export function qaCustomLayerRenderTiming(){
 if(!enabled)return undefined;
 return {source:'source-owned-public-custom-layer-render-callback',measurement:'callback synchronous elapsed including driver/GC; buildings are individual provider callbacks, not the whole scene; not GPU completion, exclusive CPU, SDK preparation or whole MapLibre RAF',capturedAtMonotonicMs:performance.now(),limit,evictedRows,rowFields:['sequence','layerCode','startedMs','endedMs','elapsedMs','failed'],layerCodes:{buildings:0,vehicles:1,buildingPreparation:2},totals:totals.map(t=>({...t,minElapsedMs:t.samples?t.minElapsedMs:null,maxElapsedMs:t.samples?t.maxElapsedMs:null})),rows:rows.map(r=>[...r]),longest:longest.map(r=>r?[...r]:null),providerTimings:[...providerTimings].map(([provider,account])=>({provider,totals:account.totals.map(t=>({...t,minElapsedMs:t.samples?t.minElapsedMs:null,maxElapsedMs:t.samples?t.maxElapsedMs:null})),longest:account.longest.map(r=>r?[...r]:null)})),wholeSdkRenderStartBoundary:'unsupported in installed MapLibre 6.11.1; no public renderstart',callsAreNotDraws:true};
}
