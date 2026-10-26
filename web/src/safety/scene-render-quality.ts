export type SceneQuality = 'economy'|'balanced'|'detail';
type QualityMap={getPixelRatio():number;setPixelRatio(value:number):void;getCanvas():HTMLCanvasElement;on(event:string,fn:()=>void):unknown;off(event:string,fn:()=>void):unknown};
/** Render-target budget only. It never changes source geometry, counts or layers. */
export function scenePixelRatio(quality:SceneQuality,deviceRatio:number,width:number,height:number,moving=false) {
  const device=Number.isFinite(deviceRatio)&&deviceRatio>0?deviceRatio:1;
  const ceiling=quality==='detail'?2:quality==='balanced'?(moving?1.25:1.5):1;
  const pixels=quality==='detail'?12_000_000:quality==='balanced'?6_000_000:3_000_000;
  return Math.max(.5,Math.min(device,ceiling,Math.sqrt(pixels/Math.max(1,width*height))));
}
export function installSceneRenderQuality(map:QualityMap,initial:SceneQuality='balanced') {
  let quality=initial,moving=false,destroyed=false,applying=false;
  // MapLibre setPixelRatio synchronously resizes and emits synthetic movement events.
  const apply=()=>{if(destroyed||applying)return;const r=map.getCanvas().getBoundingClientRect(),ratio=scenePixelRatio(quality,devicePixelRatio,r.width,r.height);if(Math.abs(map.getPixelRatio()-ratio)>.005){applying=true;try{map.setPixelRatio(ratio);}finally{applying=false;}}};
  // DPR writes on movement events cause resize to emit another movement cycle,
  // which cancels camera-owned 3D transitions in other map listeners.
  const started=()=>{if(applying)return;moving=true;},ended=()=>{if(applying)return;moving=false;};
  map.on('movestart',started);map.on('moveend',ended);window.addEventListener('resize',apply);apply();
  return {setQuality(value:SceneQuality){if(value===quality)return;quality=value;apply();},get stats(){const c=map.getCanvas(),r=c.getBoundingClientRect();return{quality,requestedRatio:map.getPixelRatio(),canvasWidth:c.width,canvasHeight:c.height,cssWidth:r.width,cssHeight:r.height,moving,geometryUnchanged:true};},destroy(){if(destroyed)return;destroyed=true;map.off('movestart',started);map.off('moveend',ended);window.removeEventListener('resize',apply);}};
}
