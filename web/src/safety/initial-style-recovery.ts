import type {Map as MapLibreMap,StyleSpecification} from 'maplibre-gl';

type InitialStyleMap=Pick<MapLibreMap,'on'|'off'|'setStyle'|'style'>;

/** Before the first map load, MapLibre may lose a not-yet-serializable style.
 * Restore only that missing initial style; normal/custom-layer recovery owns all
 * later loads. A pending style object must not be overwritten merely because
 * getStyle() or isStyleLoaded() still reports it as unavailable. */
export function installInitialStyleRecovery(map:InitialStyleMap,initialStyle:StyleSpecification,onError:(error:unknown)=>void){
  let active=true,pendingLoss=false;
  let fallback:StyleSpecification|undefined=structuredClone(initialStyle);
  const lost=()=>{if(active)pendingLoss=true;};
  const restored=()=>{
    if(!active||!pendingLoss)return;
    pendingLoss=false;
    // `style` is the MapLibre-owned style object; undefined serialization is
    // not enough to distinguish a pending native restore from an absent style.
    if(map.style!=null||!fallback)return;
    try{map.setStyle(fallback,{diff:false});}catch(error){onError(error);}
  };
  const destroy=()=>{
    if(!active)return;
    active=false;pendingLoss=false;fallback=undefined;
    map.off('webglcontextlost',lost);map.off('webglcontextrestored',restored);
    map.off('load',destroy);map.off('remove',destroy);
  };
  map.on('webglcontextlost',lost);map.on('webglcontextrestored',restored);
  map.on('load',destroy);map.on('remove',destroy);
  return {destroy};
}
