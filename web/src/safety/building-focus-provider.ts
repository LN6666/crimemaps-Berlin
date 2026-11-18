import {selectBuildingFocusSources,type BuildingFocusReplacement,type BuildingFocusSelection} from './building-focus-selection';
import {projectBuildingFocusCohort,remainingBuildingFocusGrace,type BuildingFocusAdmission,type BuildingFocusCost,type BuildingFocusPlan} from './building-focus-admission';
import {buildingFocusRegion,BUILDING_FOCUS_DISPLAY_GRACE_MS,BUILDING_FOCUS_EXIT_IDLE_MS,type BuildingFocusRect,type BuildingFocusSize} from './building-focus-window';
import type {BuildingFocusLocatedLeaf} from './building-focus-closure';
import type {createBuildingFocusIndexResolver} from './building-focus-catalog';
import {projectedGroundFootprint,type ModelViewProjectionSnapshot} from './model-view-projection';
import type {ChunkCacheRetention,ChunkResourceStore} from './render-runtime/chunk-resource-types';
import type {BuildingDetailComponent,BuildingDetailDemandIndex,BuildingDetailLevel,BuildingDetailResource} from './building-detail-demand';

/** `bbox` [west,south,east,north] and `max_height_m` are the leaf's own index
 * extent, where the provider's index carries them. */
type FocusLeaf=Readonly<{id:string;sha256:string;bytes:number;vertices:number;bbox?:readonly number[];max_height_m?:number}>;
export type BuildingFocusDetailBinding=Readonly<{index:BuildingDetailDemandIndex;resource:BuildingDetailResource}>;
/** The subset of the provider's detail runtime the focus integration uses. */
export type BuildingFocusDetailRuntime=Readonly<{
 focusRepresentations(index:BuildingDetailDemandIndex,previousLevel?:BuildingDetailLevel):{detail:BuildingDetailResource;peripheral:BuildingDetailResource;level(level:BuildingDetailLevel):BuildingDetailResource|undefined};
 pinFocusLevels(rows:readonly {index:BuildingDetailDemandIndex;level:BuildingDetailLevel}[]):void;
 /** The provider's stale-demand error (answered by planning again). */
 staleFocusDemand?(preparedKey:string,currentKey:string|undefined):Error;
}>;
const LEVELS:readonly BuildingDetailLevel[]=['near','mid','coarse'];
/** Owner decisions 2026-11-14: the geographic scale compares only ground area
 * per CSS pixel (zoom and pitch) against a FIXED anchor, never a first-frame
 * reference, so where the view entered 3D never changes admission; screen size
 * never changes the allowance. The anchor is the default 3D view (owner, evening
 * of 2026-11-14: "默认 3D 视角满额"): MapLibre zoom 15 at pitch 45 degrees,
 * the camera every provider eases to when 3D is entered at zoom 15 or closer.
 * That view keeps the full allowance on every screen, and so does every view
 * showing no more ground per CSS pixel (closer zooms, lower pitches). Zoom 14.5
 * at the same pitch gets half; pitch beyond 45 lowers it only as much as the
 * real ground footprint of the screen grows. Entering 3D at 13 <= zoom < 15
 * eases to pitch 30 instead: that view keeps the full allowance from about zoom
 * 14.74 (zoom 14.5: 72 %). The app's maximum pitch is MapLibre's default 60, so
 * the horizon fallback below is not reached in normal use. Padding and roll,
 * which this camera model ignores, are never set by the app. */
export const BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_ZOOM=15;
export const BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_PITCH=45;
/** Within this relative margin of the anchor a view counts as the anchor: the
 * two footprints come from independent computations (MapLibre's matrix and the
 * camera model below; the published CSS size can differ from MapLibre's camera
 * size by a pixel, up to 0.5 % for a 200 px tall map), and rounding must not
 * cost the default view a unit. At zoom 15 it covers pitches up to about 45.3. */
export const BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_TOLERANCE=.01;
/** MapLibre's default vertical field of view, 2*atan(1/3) in degrees. */
const MAPLIBRE_DEFAULT_FOV_DEG=2*Math.atan(1/3)*180/Math.PI;
const EARTH_CIRCUMFERENCE_M=2*Math.PI*6378137,MAPLIBRE_TILE_CSS_PX=512;
/** Ground area one CSS pixel of `rect` covers under a MapLibre camera with this
 * vertical field of view and pitch, relative to a top-down view at the same
 * zoom (1 at pitch 0). The camera is MapLibre's mercator pinhole: it looks at
 * the centre of the viewport from 0.5/tan(fov/2) * height CSS px (no padding,
 * no roll, no terrain; bearing does not change the area). undefined when a
 * corner of `rect` is on or above the horizon, or the input is not usable. */
export function buildingFocusPitchFootprintFactor(viewport:BuildingFocusSize,rect:BuildingFocusRect,fovDeg:number,pitchDeg:number):number|undefined{
 const {width,height}=viewport;
 if(![width,height,fovDeg,pitchDeg,rect.left,rect.top,rect.right,rect.bottom].every(Number.isFinite)||width<=0||height<=0||fovDeg<=0||fovDeg>=180||pitchDeg<0||pitchDeg>=90||rect.right<=rect.left||rect.bottom<=rect.top)return;
 const rad=Math.PI/180,distance=height/2/Math.tan(fovDeg*rad/2),sin=Math.sin(pitchDeg*rad),cos=Math.cos(pitchDeg*rad),points:[number,number][]=[];
 for(const [x,y] of [[rect.left,rect.top],[rect.right,rect.top],[rect.right,rect.bottom],[rect.left,rect.bottom]]){
  // Ray through the CSS pixel (screen x right, y down) meeting the ground
  // plane; ground units are top-down CSS pixels at the same zoom (x east, y north).
  const sx=x-width/2,sy=y-height/2,denominator=distance*cos+sy*sin;
  if(!(denominator>1e-9*distance))return;
  const t=distance*cos/denominator;
  points.push([t*sx,-distance*sin+t*(distance*sin-sy*cos)]);
 }
 let twice=0;for(let i=0;i<4;i++){const [x0,y0]=points[i],[x1,y1]=points[(i+1)%4];twice+=x0*y1-x1*y0;}
 const factor=Math.abs(twice)/2/((rect.right-rect.left)*(rect.bottom-rect.top));
 return Number.isFinite(factor)&&factor>0?factor:undefined;
}
/** Ground area (m^2) per CSS px^2 of the whole screen in the anchor view
 * (zoom 15, pitch 45) at this latitude. The footprint of a screen rectangle
 * depends only on its vertical extent (its width cancels out), so this is the
 * same for every screen size and shape, like the view's own measurement. */
export function buildingFocusAnchorGroundPerCssPixel(latitude:number,fovDeg:number):number{
 const whole=(fov:number)=>buildingFocusPitchFootprintFactor({width:1,height:1},{left:0,top:0,right:1,bottom:1},fov,BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_PITCH);
 // A field of view so wide that the anchor view reaches the horizon (MapLibre
 // allows up to 150 degrees) falls back to MapLibre's default camera.
 const factor=whole(fovDeg)??whole(MAPLIBRE_DEFAULT_FOV_DEG)!;
 return topDownGroundPerCssPixel(BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_ZOOM,latitude)*factor;
}
/** Ground area (m^2) one CSS pixel covers in a top-down MapLibre view. */
export function topDownGroundPerCssPixel(zoom:number,latitude:number){
 const metres=EARTH_CIRCUMFERENCE_M*Math.cos(latitude*Math.PI/180)/(MAPLIBRE_TILE_CSS_PX*2**zoom);
 return metres*metres;
}
/** Ground area per CSS px^2 of the whole screen, measured on the ground plane
 * under the exact main matrix; only when a screen corner is above the horizon
 * the map bounds box is used. The whole screen and not the focus core: a core
 * is shorter than its screen on large screens, and its share of the screen
 * height depends on the screen's shape and on the window's first measured
 * size, so measuring the core made a 21:9 screen get less than a 16:9 one.
 * Measured over the whole height, every screen at the same zoom, pitch and
 * field of view gets the same allowance, as the owner decided. */
export function buildingFocusGroundPerCssPixel(frame:ModelViewProjectionSnapshot,bounds:readonly [number,number,number,number]):{value:number;latitude:number;exact:boolean}{
 const window=frame.buildingFocus!,{width,height}=window.viewport;
 const footprint=projectedGroundFootprint(frame,{left:0,top:0,right:width,bottom:height});
 if(footprint&&width>0&&height>0)return{value:footprint.area/(width*height),latitude:footprint.latitude,exact:true};
 const [west,south,east,north]=bounds,metresPerDegree=Math.PI/180*6378137,latitude=(south+north)/2;
 const box=Math.max(Number.EPSILON,(east-west)*(north-south)*Math.cos(latitude*Math.PI/180)*metresPerDegree*metresPerDegree);
 return{value:box/(window.viewport.width*window.viewport.height),latitude,exact:false};
}
/** coverageRatio for planBuildingFocusAdmission (scale = min(1, 1/ratio)):
 * the view's ground area per CSS pixel relative to the anchor view's. */
export function buildingFocusCoverageRatio(groundPerCssPixel:number,anchorGroundPerCssPixel:number){
 const ratio=groundPerCssPixel/anchorGroundPerCssPixel;
 if(!Number.isFinite(ratio)||ratio<=0)throw Error('Invalid building focus geographic coverage');
 return ratio<=1+BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_TOLERANCE?Math.min(ratio,1):ratio;
}
/** The camera the providers hand to their display admission (viewportComponents). */
export type BuildingFocusCamera=Readonly<{pitch:number;verticalFieldOfView:number;aspectRatio:number}>;
/** Share of a leaf's components that the providers' display admission counts
 * as in view, from the producer-bound component boxes alone. It repeats that
 * test (viewportComponents): a component's ground box, padded by 0.1 m,
 * against the map bounds widened by the camera's height overscan for that
 * component; when the view cone reaches the horizon every component counts.
 *
 * The providers cap DISPLAYED vertices: only in-view components of a loaded
 * leaf are charged there. A plan that charged whole leaves against the same
 * cap would load far fewer leaves than the display can show. */
export function buildingFocusViewShare(components:readonly Pick<BuildingDetailComponent,'origin'|'box'>[],bounds:readonly [number,number,number,number],camera:BuildingFocusCamera):number{
 if(!components.length)return 1;
 const rad=Math.PI/180,usable=bounds.every(Number.isFinite)&&[camera.pitch,camera.verticalFieldOfView,camera.aspectRatio].every(Number.isFinite)&&Math.abs(camera.pitch)<=85&&camera.verticalFieldOfView>0&&camera.verticalFieldOfView<180&&camera.aspectRatio>0;
 const angle=usable?Math.abs(camera.pitch)*rad+Math.atan(Math.tan(camera.verticalFieldOfView*rad/2)*Math.hypot(1,camera.aspectRatio)):Infinity;
 // A horizon crossing cannot be covered by a finite ground rectangle.
 if(!(angle<Math.PI/2))return 1;
 const slope=Math.tan(angle),latitudeLimit=Math.max(Math.abs(bounds[1]),Math.abs(bounds[3]));
 let inView=0;
 for(const component of components){
  const [longitude,latitude]=component.origin,box=component.box,radius=6378137*Math.cos(latitude*rad),originY=Math.log(Math.tan(Math.PI/4+latitude*rad/2));
  const lon=(x:number)=>longitude+x/radius/rad,lat=(z:number)=>(2*Math.atan(Math.exp(originY+z/radius))-Math.PI/2)/rad;
  const metres=(Math.max(0,box[4])*1.01+.1)*slope+.1,latPad=metres/6378137/rad,lonPad=latPad/Math.cos(Math.min(85,latitudeLimit+latPad)*rad);
  if(lon(box[0]-.1)<=Math.min(180,bounds[2]+lonPad)&&lon(box[3]+.1)>=Math.max(-180,bounds[0]-lonPad)&&lat(box[2]-.1)<=Math.min(85,bounds[3]+latPad)&&lat(box[5]+.1)>=Math.max(-85,bounds[1]-latPad))inView++;
 }
 return inView/components.length;
}
/** True when nothing of a leaf can be on screen: its own index extent (ground
 * box and full height, slightly enlarged) has no part inside the view. Every
 * component lies inside that extent (the candidate query already relies on
 * it), so such a leaf could only ever be classified 'outside': its metadata
 * need not be read at all. A leaf without a usable extent, or whose extent
 * cannot be projected, is never skipped. */
export function buildingFocusLeafOffScreen(frame:ModelViewProjectionSnapshot,leaf:Pick<FocusLeaf,'bbox'|'max_height_m'>):boolean{
 const bbox=leaf.bbox,height=leaf.max_height_m,window=frame.buildingFocus;
 if(!window||!bbox||bbox.length!==4||!bbox.every(Number.isFinite)||bbox[0]>bbox[2]||bbox[1]>bbox[3]||Math.abs(bbox[1])>=85||Math.abs(bbox[3])>=85||typeof height!=='number'||!Number.isFinite(height)||height<0)return false;
 const rad=Math.PI/180,longitude=(bbox[0]+bbox[2])/2,latitude=(bbox[1]+bbox[3])/2,radius=6378137*Math.cos(latitude*rad),mercator=(value:number)=>Math.log(Math.tan(Math.PI/4+value*rad/2)),originY=mercator(latitude);
 const x=(value:number)=>(value-longitude)*rad*radius,z=(value:number)=>(mercator(value)-originY)*radius;
 const rect=projectBuildingFocusCohort(frame,[{origin:[longitude,latitude],box:[x(bbox[0])-1,0,z(bbox[1])-1,x(bbox[2])+1,height*1.01+.2,z(bbox[3])+1]}]);
 return !!rect&&buildingFocusRegion(window,rect)==='outside';
}
const isLevel=(value:unknown):value is BuildingDetailLevel=>LEVELS.includes(value as BuildingDetailLevel);
const displaySetCache=new WeakMap<readonly unknown[],Map<string,readonly (readonly string[])[]>>();
/** Leaf SHA sets of display profiles (native part, source-edge assembly,
 * relation outline) compiled for exactly this city and canonical index: the
 * outline leaf and every leaf holding one of its parts. Cached per profile list. */
export function buildingFocusDisplayLeafSets(profiles:readonly unknown[],city:string,indexSHA:string):readonly (readonly string[])[]{
 let byIndex=displaySetCache.get(profiles);if(!byIndex){byIndex=new Map();displaySetCache.set(profiles,byIndex);}
 const id=city+'|'+indexSHA,cached=byIndex.get(id);if(cached)return cached;
 const sets:string[][]=[];
 for(const profile of profiles){
  const p=profile as {city?:unknown;indexSHA?:unknown}|undefined;if(!p||p.city!==city||p.indexSHA!==indexSHA)continue;
  const shas=new Set<string>(),walk=(value:unknown):void=>{if(Array.isArray(value)){value.forEach(walk);return;}if(!value||typeof value!=='object')return;for(const [field,item] of Object.entries(value)){if(field==='leafSHA'){if(typeof item==='string'&&/^[a-f0-9]{64}$/.test(item))shas.add(item);}else walk(item);}};
  walk(profile);if(shas.size>1)sets.push([...shas].sort());
 }
 const frozen=Object.freeze(sets.map(set=>Object.freeze(set)));byIndex.set(id,frozen);return frozen;
}
/** Atomic display cohorts of the canonical leaves (by SHA) of every display
 * set that a candidate touches. A member outside the descriptor window is not
 * on screen, so a partial set ties only what can be shown together. */
export function buildingFocusDisplayCohorts<T extends {sha256:string}>(sets:readonly (readonly string[])[],chosen:readonly T[],canonical:readonly T[]):T[][]{
 const bySHA=new Map(canonical.map(leaf=>[leaf.sha256,leaf])),touched=new Set(chosen.map(leaf=>leaf.sha256)),seen=new Set<string>(),cohorts:T[][]=[];
 for(const set of sets){
  if(!set.some(sha=>touched.has(sha)))continue;
  const members=set.flatMap(sha=>{const leaf=bySHA.get(sha);return leaf?[leaf]:[];});
  const id=members.map(leaf=>leaf.sha256).join(',');if(members.length<2||seen.has(id))continue;seen.add(id);cohorts.push(members);
 }
 return cohorts;
}

/** How long the latest plan's leaf metadata stays leased without another plan
 * (implementation value: the page store's longest idle tier). */
export const BUILDING_FOCUS_METADATA_IDLE_MS=20_000;
/** One manager's focus memory: the representations it last admitted (what is
 * on screen), at most one timer that re-plans when a grace hold ends, and the
 * page-store leases of its latest plan's leaf metadata. It owns no geometry
 * and no cache of its own: the metadata stays charged to the page ledger and
 * is given back at the next plan (after the new plan's leases are taken, so a
 * document both plans need is never re-read), after a quiet period, and
 * whenever the display is cleared. */
export function createBuildingFocusState(options:{refresh():void;detailRuntime?:BuildingFocusDetailRuntime}){
 let admissions:readonly BuildingFocusAdmission[]=[],timer:ReturnType<typeof setTimeout>|undefined,deadline:number|undefined,destroyed=false,plans=0,holdsStarted=0,timerFires=0;
 let releaseMetadata:(()=>void)|undefined,metadataTimer:ReturnType<typeof setTimeout>|undefined,epoch=0,metadataAdoptions=0,metadataReleases=0;
 const dropMetadata=()=>{if(metadataTimer!==undefined)clearTimeout(metadataTimer);metadataTimer=undefined;const release=releaseMetadata;releaseMetadata=undefined;if(release){metadataReleases++;release();}};
 const clearTimer=()=>{if(timer!==undefined)clearTimeout(timer);timer=undefined;deadline=undefined;};
 const schedule=(at:number|undefined,now:number)=>{
  clearTimer();if(destroyed||at===undefined||!Number.isFinite(at))return;
  deadline=at;timer=setTimeout(()=>{timer=undefined;deadline=undefined;if(destroyed)return;timerFires++;options.refresh();},Math.min(20_000,Math.max(0,Math.ceil(at-now)))+1);
 };
 return{
  get admissions(){return admissions;},
  /** Changes whenever the display is cleared: a plan that began before must
   * not leave its metadata behind. */
  get epoch(){return epoch;},
  retainMetadata(release:()=>void,startedEpoch:number){
   if(destroyed||startedEpoch!==epoch){release();return;}
   const previous=releaseMetadata;releaseMetadata=release;metadataAdoptions++;
   if(previous){metadataReleases++;previous();}
   if(metadataTimer!==undefined)clearTimeout(metadataTimer);
   metadataTimer=setTimeout(()=>{metadataTimer=undefined;dropMetadata();},BUILDING_FOCUS_METADATA_IDLE_MS);
  },
  commit(plan:BuildingFocusPlan,now:number){
   plans++;const before=new Set(admissions.filter(row=>row.grace).map(row=>row.key));
   holdsStarted+=plan.admitted.filter(row=>row.grace&&!before.has(row.key)).length;
   admissions=plan.admitted;schedule(plan.nextGraceDeadline,now);
  },
  /** Camera movement empties the wanted set: core sources keep the confirmed
   * exit grace (less any grace already spent on screen) while it is empty. */
  moveStarted(store:ChunkResourceStore,now=performance.now()){
   applyExitGrace(store,admissions.filter(row=>row.region==='core'),now);
  },
  /** The display was cleared (the providers call this for the overview and
   * for 2D): nothing is on screen any more, so nothing may be held for grace. */
  reset(){clearTimer();admissions=[];options.detailRuntime?.pinFocusLevels([]);epoch++;dropMetadata();},
  destroy(){destroyed=true;clearTimer();admissions=[];options.detailRuntime?.pinFocusLevels([]);epoch++;dropMetadata();},
  get stats(){return{plans,admitted:admissions.length,held:admissions.filter(row=>row.grace).length,holdsStarted,timerFires,nextGraceDeadline:deadline??null,metadataHeld:releaseMetadata!==undefined,metadataAdoptions,metadataReleases};},
 };
}
export type BuildingFocusState=ReturnType<typeof createBuildingFocusState>;

/** Exact retired core representations get the confirmed exit tiers; a cohort
 * that already spent part of its grace on screen keeps only the remainder. */
export function applyExitGrace(store:ChunkResourceStore,rows:readonly BuildingFocusAdmission[],now:number){
 const groups=new Map<string,{tiers:Readonly<Record<ChunkCacheRetention,number>>;keys:string[]}>();
 for(const row of rows){
  const tiers=remainingBuildingFocusGrace(BUILDING_FOCUS_EXIT_IDLE_MS,row,now),id=JSON.stringify(tiers),group=groups.get(id)??{tiers,keys:[]};
  group.keys.push(row.cost.resourceKey);groups.set(id,group);
 }
 for(const {tiers,keys} of groups.values())store.setIdleRetention(keys,tiers,{exclusiveDependents:true});
}

/** The one focus integration every provider uses, before any geometry read.
 * Selects whole dependency cohorts, binds exactly the admitted representation
 * (detail, the real peripheral level, or a still loadable previous one) to the
 * provider's detail binding map, pins non-ordinary levels in the detail runtime
 * so loading/validation/publication agree, applies the exit grace to retired
 * core representations and schedules the next grace re-plan. */
export async function applyBuildingFocus<T extends FocusLeaf>(options:{
 provider:string;
 state:BuildingFocusState;
 resolver:ReturnType<typeof createBuildingFocusIndexResolver>;
 frame:ModelViewProjectionSnapshot|undefined;
 /** Current map bounds [west,south,east,north]. */
 bounds:readonly [number,number,number,number];
 /** The same camera the provider passes to its display admission. */
 camera:BuildingFocusCamera;
 chosen:readonly T[];
 canonical:readonly T[];
 externalSources?:readonly {leaf:T;bounds:BuildingFocusRect;replaces?:readonly BuildingFocusReplacement[];objectId?:string}[];
 ownerCohorts:readonly (readonly T[])[];
 /** Display profile lists (each a module constant, cached by identity) whose
  * outline and part leaves must be shown together, bound by city and canonical index SHA. */
 display?:Readonly<{lists:readonly (readonly unknown[])[];city:string;indexSHA:string}>;
 ownerObjects?:readonly (readonly {objectId:string;partId?:string}[])[];
 resolveDescriptors?(requests:readonly BuildingFocusLocatedLeaf[],signal:AbortSignal):Promise<ReadonlyMap<string,T>>;
 budget:Readonly<{maxVisible:number;maxBytes:number;maxVertices:number}>;
 resourceStore:ChunkResourceStore;
 signal:AbortSignal;
 /** Provider detail integration; absent when the provider has no runtime. */
 detail?:Readonly<{
  runtime:BuildingFocusDetailRuntime;
  bindings:Map<T,BuildingFocusDetailBinding>;
  /** Resolve and source-bind the index of a leaf without a binding yet;
   * undefined for a canonical-only leaf. */
  resolve(leaf:T):Promise<BuildingDetailDemandIndex|undefined>;
  previousLevel(leaf:T):BuildingDetailLevel|undefined;
  /** Leaves that never take a detail binding (owner reconstructions). */
  skip?(leaf:T):boolean;
 }>;
 /** The provider's own acquisition key for a leaf and binding. */
 resourceKey(leaf:T,binding:BuildingFocusDetailBinding|undefined):string;
 now?:number;
}):Promise<{chosen:T[];partial:boolean;selection:BuildingFocusSelection<T>;
 /** Candidates whose metadata was not read: nothing of them can be on screen. */
 offScreen:number}>{
 const frame=options.frame;if(!frame?.buildingFocus)throw Error(options.provider+' focus requires a current model-view frame');
 // The screen's real ground footprint per CSS pixel: rotation never changes it
 // and pitch only as much as the visible ground really grows (the map bounds
 // box overstated both). It is compared with the whole screen in the default
 // 3D view (zoom 15, pitch 45), so that view keeps the full allowance.
 const ground=buildingFocusGroundPerCssPixel(frame,options.bounds);
 const now=options.now??performance.now(),detail=options.detail,epoch=options.state.epoch;
 // Bytes and the unit are the whole leaf (it is loaded whole); vertices are
 // the in-view share, the quantity the provider's display cap really limits.
 const cost=(leaf:T,binding:BuildingFocusDetailBinding|undefined,share:number):BuildingFocusCost=>({resourceKey:options.resourceKey(leaf,binding),bytes:binding?.resource.descriptor.bytes??leaf.bytes,vertices:Math.ceil((binding?.resource.vertices??leaf.vertices)*share),painted:true,...(binding?{pin:binding.resource.level}:{})});
 const describe=async(leaf:T,previous?:BuildingFocusCost,components?:readonly Pick<BuildingDetailComponent,'origin'|'box'>[])=>{
  const share=components?buildingFocusViewShare(components,options.bounds,options.camera):1;
  let binding:BuildingFocusDetailBinding|undefined;
  if(detail&&!detail.skip?.(leaf)){
   const index=detail.bindings.get(leaf)?.index??await detail.resolve(leaf);options.signal.throwIfAborted();
   if(index){
    const representations=detail.runtime.focusRepresentations(index,detail.previousLevel(leaf));
    binding={index,resource:representations.detail};detail.bindings.set(leaf,binding);
    const ordinary=cost(leaf,binding,share),coarse=cost(leaf,{index,resource:representations.peripheral},share);
    let retained:BuildingFocusCost|undefined;
    if(previous&&previous.resourceKey!==ordinary.resourceKey&&previous.resourceKey!==coarse.resourceKey&&isLevel(previous.pin)){
     const resource=representations.level(previous.pin),candidate=resource&&cost(leaf,{index,resource},share);
     if(candidate&&candidate.resourceKey===previous.resourceKey)retained=candidate;
    }
    return{detail:ordinary,coarse,...(retained?{retained}:{})};
   }
  }
  // Canonical-only leaf: the complete canonical leaf is the real white-mesh
  // representation for core and periphery alike; no simplified LOD is invented.
  const only=cost(leaf,undefined,share);return{detail:only,coarse:only};
 };
 // The candidate query is a ground rectangle around a pitched view: many of
 // its leaves lie beside or behind what the screen shows. They would only be
 // classified 'outside', so their metadata (a document, usually also a lookup
 // page) is not read. One of them that a visible building depends on is still
 // brought in whole, as a dependency or cohort member of that building.
 const external=new Set((options.externalSources??[]).map(row=>row.leaf));
 const candidates=options.chosen.filter(leaf=>external.has(leaf)||!buildingFocusLeafOffScreen(frame,leaf));
 const display=options.display,atomicCohorts=display?buildingFocusDisplayCohorts(display.lists.flatMap(list=>buildingFocusDisplayLeafSets(list,display.city,display.indexSHA)),candidates,options.canonical):[];
 const selection=await selectBuildingFocusSources({resolver:options.resolver,candidates,canonicalLeaves:options.canonical,externalSources:options.externalSources,ownerCohorts:options.ownerCohorts,atomicCohorts,ownerObjects:options.ownerObjects,resolveDescriptors:options.resolveDescriptors,frame,describe,previous:options.state.admissions,
  maxVisible:options.budget.maxVisible,maxBytes:options.budget.maxBytes,maxVertices:options.budget.maxVertices,
  coverageRatio:buildingFocusCoverageRatio(ground.value,buildingFocusAnchorGroundPerCssPixel(ground.latitude,options.camera.verticalFieldOfView)),signal:options.signal,now,holdMs:BUILDING_FOCUS_DISPLAY_GRACE_MS,
  retainMetadata:release=>options.state.retainMetadata(release,epoch)});
 options.signal.throwIfAborted();
 const pins:{index:BuildingDetailDemandIndex;level:BuildingDetailLevel}[]=[];
 const chosen=selection.sources.map(row=>{
  const binding=detail?.bindings.get(row.leaf);
  if(binding&&row.resourceKey!==row.detail.resourceKey){
   if(!isLevel(row.cost.pin))throw Error(options.provider+' focus representation has no detail level');
   // Demands are read live: a pick or a selection made while this plan was
   // being prepared can take the planned level away. That is a stale plan,
   // which the provider answers by planning again, not a failure.
   const resource=detail!.runtime.focusRepresentations(binding.index,detail!.previousLevel(row.leaf)).level(row.cost.pin);
   if(!resource)throw detail!.runtime.staleFocusDemand?.(row.resourceKey,undefined)??Error(options.provider+' focus representation is no longer available');
   detail!.bindings.set(row.leaf,{index:binding.index,resource});pins.push({index:binding.index,level:row.cost.pin});
   const acquired=options.resourceKey(row.leaf,detail!.bindings.get(row.leaf));
   if(acquired!==row.resourceKey)throw detail!.runtime.staleFocusDemand?.(row.resourceKey,acquired)??Error(options.provider+' focus acquisition mismatch');
  }
  if(options.resourceKey(row.leaf,detail?.bindings.get(row.leaf))!==row.resourceKey)throw Error(options.provider+' focus acquisition mismatch');
  return row.leaf;
 });
 detail?.runtime.pinFocusLevels(pins);
 // Metadata/selection can take time. Use the commit clock for remaining
 // retention and timers, preserving the plan's original absolute deadlines.
 const committedAt=options.now??performance.now();
 applyExitGrace(options.resourceStore,selection.plan.retired.filter(row=>row.region==='core'),committedAt);
 options.state.commit(selection.plan,committedAt);
 return{chosen,partial:selection.partial,selection,offScreen:options.chosen.length-candidates.length};
}

type NativeRow=Readonly<{objectId:string;partId:string;nativeLeafSHA256:string}>;
/** Owner reconstruction -> native parts it needs at display time: its
 * sourcePartId, explicit replacesNative rows bound to one native leaf, and
 * requiredNative rows (strict reconstructions shown only beside those parts). */
export function ownerFocusReplacements(profile:Readonly<{objectId:string;sourcePartId?:string;replacesNative?:readonly NativeRow[];requiredNative?:readonly NativeRow[]}>):readonly BuildingFocusReplacement[]{
 const rows=[...(profile.replacesNative??[]),...(profile.requiredNative??[])].map(row=>({objectId:row.objectId,partId:row.partId,nativeLeafSHA256:row.nativeLeafSHA256}));
 return Object.freeze([...(profile.sourcePartId?[{objectId:profile.objectId,partId:profile.sourcePartId}]:[]),...new Map(rows.map(row=>[JSON.stringify(row),row])).values()]);
}
