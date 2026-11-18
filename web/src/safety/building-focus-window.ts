/** Screen-space policy only. Consumers must apply it before source acquisition,
 * and release retired detail leases; hiding already loaded meshes is insufficient. */
export type BuildingFocusSize=Readonly<{width:number;height:number}>;
export type BuildingFocusRect=Readonly<{left:number;top:number;right:number;bottom:number}>;
export type BuildingFocusWindow=Readonly<{
  viewport:BuildingFocusSize;reference:BuildingFocusSize;core:BuildingFocusRect;
  coreAreaRatio:number;
}>;
export const BUILDING_FOCUS_EDGE_DENSITY=.05;
// Owner-selected focus-exit grace: ceil(original seconds / 1.25).
export const BUILDING_FOCUS_EXIT_IDLE_MS=Object.freeze({refetch:8_000,redecode:11_000,reupload:14_000,rebuild:16_000});
/** Implementation interpretation of the confirmed exit grace (not a separate
 * owner number): it starts when a cohort leaves the core. While the cohort is
 * still on screen its displayed representation stays for the first (refetch)
 * tier; afterwards only the remaining part of each tier is cache retention, so
 * no resource outlives 8/11/14/16 s from its core exit. */
export const BUILDING_FOCUS_DISPLAY_GRACE_MS=BUILDING_FOCUS_EXIT_IDLE_MS.refetch;
// A page opened directly on a display wall must not adopt the entire wall as
// its reference. CSS pixels, independent of device pixel ratio or physical size.
export const BUILDING_FOCUS_REFERENCE_LIMIT=Object.freeze({width:1280,height:720});
const validSize=(v:BuildingFocusSize)=>Number.isFinite(v.width)&&Number.isFinite(v.height)&&v.width>0&&v.height>0;

/** Capture the first usable map size once. Resizing cannot ratchet up the
 * reference, and a temporarily hidden/zero-sized map cannot reset it. */
export function createBuildingFocusWindow(){
  let reference:BuildingFocusSize|undefined;
  return {
    measure(size:BuildingFocusSize):BuildingFocusWindow|undefined{
      if(!validSize(size))return undefined;
      reference??=Object.freeze({width:Math.min(size.width,BUILDING_FOCUS_REFERENCE_LIMIT.width),height:Math.min(size.height,BUILDING_FOCUS_REFERENCE_LIMIT.height)});
      // Area rule: viewport 2x -> core 1x; 4x -> 2x; 8x -> 4x.
      // Keep the reference aspect where it fits, then fit extreme aspect ratios
      // without losing the requested area or extending beyond the viewport.
      const viewportArea=size.width*size.height,referenceArea=reference.width*reference.height;
      if(!Number.isFinite(viewportArea))return undefined;
      const area=Math.min(viewportArea,Math.max(referenceArea,viewportArea/2));
      let width=Math.sqrt(area*reference.width/reference.height),height=area/width;
      if(width>size.width){width=size.width;height=area/width;}
      if(height>size.height){height=size.height;width=area/height;}
      const left=(size.width-width)/2,top=(size.height-height)/2;
      return Object.freeze({viewport:Object.freeze({...size}),reference,core:Object.freeze({left,top,right:left+width,bottom:top+height}),coreAreaRatio:area/referenceArea});
    },
  };
}

/** Unknown projection is explicit: callers must preserve existing demand or
 * defer, never accidentally treat an invalid bounding box as a core admission. */
export function buildingFocusRegion(window:BuildingFocusWindow,box:BuildingFocusRect):'core'|'peripheral'|'outside'|'unknown'{
  if(![box.left,box.top,box.right,box.bottom].every(Number.isFinite)||box.left>box.right||box.top>box.bottom)return 'unknown';
  const intersects=(r:BuildingFocusRect)=>box.right>=r.left&&box.left<=r.right&&box.bottom>=r.top&&box.top<=r.bottom;
  if(!intersects({left:0,top:0,right:window.viewport.width,bottom:window.viewport.height}))return 'outside';
  return intersects(window.core)?'core':'peripheral';
}

/** Linear rectangular bands: 100% at the core boundary, the configured minimum
 * only at the viewport edge. A cohort uses its closest projected extent. */
export function buildingFocusDensity(window:BuildingFocusWindow,box:BuildingFocusRect,edgeDensity=BUILDING_FOCUS_EDGE_DENSITY):number|undefined{
  if(!Number.isFinite(edgeDensity)||edgeDensity<0||edgeDensity>1)throw Error('Invalid focus edge density');
  const region=buildingFocusRegion(window,box);
  if(region==='unknown')return undefined;if(region==='outside')return 0;if(region==='core')return 1;
  const cx=window.viewport.width/2,cy=window.viewport.height/2;
  const x=Math.max(box.left,Math.min(cx,box.right)),y=Math.max(box.top,Math.min(cy,box.bottom));
  const halfWidth=(window.core.right-window.core.left)/2,halfHeight=(window.core.bottom-window.core.top)/2;
  const axis=(distance:number,halfCore:number,halfViewport:number)=>distance<=halfCore?0:(distance-halfCore)/Math.max(Number.EPSILON,halfViewport-halfCore);
  const t=Math.min(1,Math.max(0,axis(Math.abs(x-cx),halfWidth,cx),axis(Math.abs(y-cy),halfHeight,cy)));
  return 1-(1-edgeDensity)*t;
}
