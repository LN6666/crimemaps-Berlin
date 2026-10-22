import type {Map as LibreMap} from 'maplibre-gl';
/** Opt-in, rate-limited public-API diagnostics. No tile download, hidden state, style or feature changes. */
export function createShopQueryDiagnostics(map:LibreMap,host:HTMLElement,sourceId:string,enabled:boolean){
 let last=-Infinity;const put=(key:string,value:unknown)=>host.setAttribute('data-shop-debug-'+key,typeof value==='string'?value:JSON.stringify(value));
 return (now=performance.now())=>{if(!enabled||now-last<2000)return;last=now;
  try{put('source-exists',!!map.getSource(sourceId));put('source-loaded',map.isSourceLoaded(sourceId));put('all-tiles-loaded',map.areTilesLoaded());}catch{put('load-state-error',true);}
  const counts:Record<string,number|string>={};for(const layer of ['pois','buildings','streets','street_labels']){
   try{counts[layer]=map.querySourceFeatures(sourceId,{sourceLayer:layer}).length;}catch{counts[layer]='error';}
  }put('source-query-counts',counts);
  try{const style=map.getStyle(),spec=style.sources[sourceId];put('style-source-id',sourceId);put('source-spec',spec?{type:spec.type,...('url'in spec?{url:spec.url}:{}),...('minzoom'in spec?{minzoom:spec.minzoom}:{}),...('maxzoom'in spec?{maxzoom:spec.maxzoom}:{}),...('tiles'in spec?{tileTemplates:spec.tiles?.length??0}:{}),...('encoding'in spec?{encoding:spec.encoding}:{})}:null);const rendered:Record<string,number|string>={};for(const id of ['basemap-vector-buildings','basemap-vector-streets','basemap-vector-street-labels']){if(!map.getLayer(id)){rendered[id]='absent';continue;}rendered[id]=map.queryRenderedFeatures({layers:[id]}).length;}put('rendered-query-counts',rendered);}catch{put('style-query-error',true);}
 };
}
