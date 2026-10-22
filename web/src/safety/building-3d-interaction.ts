import {installBuilding3dSelection,type BuildingPickProvider,type ResolvedBuildingHit,type ScreenPoint} from './building-3d-selection';
import {appendBuildingShopChoices,type BuildingShopRecord} from './building-shop-choices';
type Locale='zh'|'en'|'de';
export type BuildingInspection={inspect(feature:unknown,point?:number[]):{panel:HTMLElement;geometry:unknown}|undefined;clear():void};
export function installBuilding3dInteraction<T extends BuildingShopRecord>(options:{provider:BuildingPickProvider;city:string;locale:Locale;inspection:BuildingInspection;loadedShopRecords:()=>readonly T[];onChooseShop:(record:T)=>void;onSurfaceLocation:(point:[number,number])=>void;onBuildingPanel?:(result:ResolvedBuildingHit,panel:HTMLElement)=>void}){
 const selection=installBuilding3dSelection(options.provider,options.city,result=>{
  // Do not pass ground e.lngLat to the component geometry helper: walls lie on footprint edges.
  options.onSurfaceLocation(result.hit.hitLngLat);
  const view=options.inspection.inspect(result.inspectionFeature);
  if(!view)return;
  appendBuildingShopChoices(view.panel,result.footprint,options.loadedShopRecords(),options.locale,record=>{selection.clear();options.onChooseShop(record);});
  options.onBuildingPanel?.(result,view.panel);
 });
 return {
  /** Root calls this before area lookup, then preserves the accepted visible POI/report/route priority. */
  probe:(point:ScreenPoint)=>selection.probe(point),
  show:(result:ResolvedBuildingHit)=>selection.select(result),
  async inspectAt(point:ScreenPoint){const result=await selection.probe(point);return result?!!selection.select(result):false;},
  /** A renderer surface location, never a manufactured ground/event coordinate. */
  surfaceLocation(result:ResolvedBuildingHit):[number,number]{return [...result.hit.hitLngLat];},
  cancelPending(){selection.cancelPending();},
  suspend(){selection.suspend();},
  resume(){selection.resume();},
  clear(){selection.clear();options.inspection.clear();},
  invalidate(){selection.invalidate();options.inspection.clear();},
  /** Ground fallback is valid only after an actual completed empty ray test. */
  get probeStatus(){return selection.probeStatus;},
  get selected(){return selection.selected;},
  destroy(){selection.destroy();}
 };
}
