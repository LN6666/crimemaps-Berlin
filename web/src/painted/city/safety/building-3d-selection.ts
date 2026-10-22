/** Renderer contract: identities refer to loaded source-owned components, never an inferred tenant/floor. */
export type ScreenPoint={x:number;y:number};
export type RendererRevision={generation:number;viewRevision:number};
export type BuildingIdentity={objectId:string;partId:string};
export type PolygonFootprint={type:'Polygon';coordinates:number[][][]};
export type SourceBuildingFeature={type:'Feature';geometry:unknown;properties:Record<string,unknown>|null;id?:unknown};
export type LoadedBuildingComponent=BuildingIdentity&{
 generation:number;
 /** A single original/clipped polygon component, including its holes. No merged MultiPolygon. */
 componentGeometry:PolygonFootprint;
 sourceFeature:SourceBuildingFeature;
 /** Renderer display estimates remain separate from actual source properties. */
 displayEstimates?:Record<string,unknown>;
 /** Set by source-city admission/clip; this adapter never generates a city bounding box. */
 city:string;
};
export type BuildingSurfaceHit=BuildingIdentity&RendererRevision&{
 hitLngLat:[number,number];hitAltitudeM:number;surface:'wall'|'roof';distance:number;
 /** Actual render pass context, not an SDK ground-feature visibility guess. */
 opacityContext:'normal'|'route-selection';surfaceOpacity:number;occludesGround:boolean;
};
export interface BuildingPickProvider {
 getRevision():RendererRevision;
 /** False while current camera/paint matrices have not been rendered; never treat this as an empty hit. */
 isPickReady():boolean;
 /** Public ray/triangle renderer hit in CSS screen pixels; no ground footprint inference. */
 pick(point:ScreenPoint,signal?:AbortSignal):BuildingSurfaceHit|undefined|Promise<BuildingSurfaceHit|undefined>;
 /** Only current, already loaded native components; must not trigger a fetch. */
 getComponent(identity:BuildingIdentity):LoadedBuildingComponent|undefined;
 setSelection(identity:BuildingIdentity):void;
 clearSelection():void;
 /** Clear/reapply shader flags while preserving the renderer's chosen identity. */
 suspendSelection():void;
 resumeSelection():void;
}
export type ResolvedBuildingHit={hit:BuildingSurfaceHit;component:LoadedBuildingComponent;inspectionFeature:SourceBuildingFeature;footprint:PolygonFootprint};
const ID_LIMIT=256,POSITION_LIMIT=20000;
const identityValid=(id:BuildingIdentity)=>typeof id.objectId==='string'&&/^osm\/(node|way|relation)\/[1-9]\d*$/.test(id.objectId)&&id.objectId.length<=ID_LIMIT&&typeof id.partId==='string'&&id.partId.length>0&&id.partId.length<=ID_LIMIT;
const revisionValid=(r:RendererRevision)=>Number.isSafeInteger(r.generation)&&r.generation>=0&&Number.isSafeInteger(r.viewRevision)&&r.viewRevision>=0;
const revisionEqual=(a:RendererRevision,b:RendererRevision)=>a.generation===b.generation&&a.viewRevision===b.viewRevision;
function validFootprint(g:PolygonFootprint){
 if(g?.type!=='Polygon'||!Array.isArray(g.coordinates)||!g.coordinates.length)return false;let positions=0;
 for(const ring of g.coordinates){if(!Array.isArray(ring)||ring.length<4)return false;for(const p of ring){if(++positions>POSITION_LIMIT||!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>90)return false;}const first=ring[0],last=ring[ring.length-1];if(first[0]!==last[0]||first[1]!==last[1])return false;}return true;
}
/** Resolve by current mesh identity. Deliberately has no ground-event longitude/latitude input. */
export function resolveBuildingSurfaceHit(provider:BuildingPickProvider,hit:BuildingSurfaceHit|undefined,city:string,expected:RendererRevision):ResolvedBuildingHit|undefined{
 if(!provider.isPickReady()||!hit||!identityValid(hit)||!revisionValid(hit)||!revisionValid(expected)||!revisionEqual(hit,expected)||!revisionEqual(provider.getRevision(),expected))return;
 if(!Array.isArray(hit.hitLngLat)||hit.hitLngLat.length!==2||!hit.hitLngLat.every(Number.isFinite)||Math.abs(hit.hitLngLat[0])>180||Math.abs(hit.hitLngLat[1])>90||!Number.isFinite(hit.hitAltitudeM)||!Number.isFinite(hit.distance)||hit.distance<0||!['wall','roof'].includes(hit.surface)||!['normal','route-selection'].includes(hit.opacityContext)||!Number.isFinite(hit.surfaceOpacity)||hit.surfaceOpacity<=0||hit.surfaceOpacity>1||typeof hit.occludesGround!=='boolean')return;
 const component=provider.getComponent({objectId:hit.objectId,partId:hit.partId});
 if(!component||component.city!==city||component.generation!==expected.generation||component.objectId!==hit.objectId||component.partId!==hit.partId||!validFootprint(component.componentGeometry)||component.sourceFeature?.type!=='Feature')return;
 // Preserve original source metadata and source ID. Geometry alone is replaced by the exact picked component.
 const inspectionFeature={...component.sourceFeature,geometry:component.componentGeometry,properties:component.sourceFeature.properties};
 return {hit,component,inspectionFeature,footprint:component.componentGeometry};
}
/** One outstanding pick and one selected component. No source fetching, full-scene scan or new caches. */
export function installBuilding3dSelection(provider:BuildingPickProvider,city:string,onSelection:(selection:ResolvedBuildingHit)=>void){
 let destroyed=false,ticket=0,request:AbortController|undefined,selected:BuildingIdentity|undefined,candidate:ResolvedBuildingHit|undefined;let probeStatus:'idle'|'none'|'surface'|'not-ready'|'stale'|'cancelled'|'invalid'|'error'='idle';
 function cancel(){ticket++;probeStatus='cancelled';candidate=undefined;request?.abort();request=undefined;}
 function clear(){cancel();selected=undefined;provider.clearSelection();}
 return {
  /** Probe is side-effect-free for selection and panels; root applies existing visible-marker priority first. */
  async probe(point:ScreenPoint):Promise<ResolvedBuildingHit|undefined>{
   if(destroyed)return;if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.y<0){probeStatus='invalid';return;}
   cancel();if(!provider.isPickReady()){probeStatus='not-ready';return;}const current=++ticket,abort=new AbortController();request=abort;const before=provider.getRevision();
   try{const hit=await provider.pick(point,abort.signal);if(destroyed||abort.signal.aborted||current!==ticket)return;if(!provider.isPickReady()||!revisionEqual(provider.getRevision(),before)){probeStatus='stale';return;}if(!hit){probeStatus='none';return;}candidate=resolveBuildingSurfaceHit(provider,hit,city,before);probeStatus=candidate?'surface':'invalid';return candidate;
   }catch(error){if(abort.signal.aborted||destroyed)return;probeStatus='error';throw error;}finally{if(request===abort)request=undefined;}
  },
  /** Commit re-resolves the current mesh; it never trusts a result retained through a dataset/camera change. */
  select(result:ResolvedBuildingHit):ResolvedBuildingHit|undefined{
   if(destroyed||result!==candidate)return;const fresh=resolveBuildingSurfaceHit(provider,result.hit,city,result.hit);if(!fresh)return;
   provider.setSelection({objectId:fresh.hit.objectId,partId:fresh.hit.partId});selected={objectId:fresh.hit.objectId,partId:fresh.hit.partId};onSelection(fresh);return fresh;
  },
  async pick(point:ScreenPoint):Promise<ResolvedBuildingHit|undefined>{const result=await this.probe(point);return result?this.select(result):undefined;},
  /** Camera motion cancels an unfinished ray only; a committed selection remains selected. */
  cancelPending(){if(!destroyed)cancel();},
  /** 2D/scene transition preserves the chosen identity and caller-owned native footprint/details. */
  suspend(){if(destroyed)return;cancel();provider.suspendSelection();},
  resume(){if(destroyed)return;cancel();provider.resumeSelection();},
  /** Destructive invalidation is for explicit city/dataset change, not camera motion. */
  invalidate(){if(destroyed)return;clear();},
  clear(){if(!destroyed)clear();},
  get probeStatus(){return probeStatus;},
  get selected(){return selected?{...selected}:undefined;},
  destroy(){if(destroyed)return;destroyed=true;clear();}
 };
}

/** Screen annotations remain visible priorities; hidden ground lines cannot capture an opaque front surface. */
export function building3dClickPriority(dimension:'2d'|'3d',visibleAnnotationHit:boolean,hit:ResolvedBuildingHit|undefined):'legacy'|'building-first'|'visible-ground-first'{
 if(dimension==='2d'||visibleAnnotationHit||!hit)return 'legacy';
 return hit.hit.occludesGround?'building-first':'visible-ground-first';
}
