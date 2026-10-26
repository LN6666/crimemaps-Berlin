import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F140_IDS=[{"city":"frankfurt","objectId":"osm/way/72677586","partId":"osm/way/72677586/component/783d5e66bfa977327f32","signature":"c6f9bd9c"},{"city":"frankfurt","objectId":"osm/way/148834019","partId":"osm/way/148834019/component/a6a355f388fb9d6b6599","signature":"90693370"},{"city":"frankfurt","objectId":"osm/way/174500421","partId":"osm/way/174500421/component/f24018d16f09ae061d3f","signature":"89d84ae2"},{"city":"frankfurt","objectId":"osm/way/174500422","partId":"osm/way/174500422/component/4f43b89ed37fdba3496e","signature":"bfd29424"},{"city":"frankfurt","objectId":"osm/way/174500423","partId":"osm/way/174500423/component/5452542a181a3d1a26d8","signature":"71c970b0"},{"city":"frankfurt","objectId":"osm/way/174545092","partId":"osm/way/174545092/component/26d82b2e2253c5eddf8c","signature":"c7ee7d62"},{"city":"frankfurt","objectId":"osm/way/433226419","partId":"osm/way/433226419/component/97efa889c2d7f86aaba8","signature":"5fff03fc"},{"city":"frankfurt","objectId":"osm/way/1330475762","partId":"osm/way/1330475762/component/0aa64dad1dd7352aacf5","signature":"b00c5ef3"}];
const ownerF140OriginalIdentity=(c:Identity)=>F140_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
const F140_COURT_IDS=[{"city":"frankfurt","objectId":"osm/way/1544828418","partId":"osm/way/1544828418/component/a52b768e0f4228e93316","signature":"35b11d09"},{"city":"frankfurt","objectId":"osm/way/1544828419","partId":"osm/way/1544828419/component/7498eaa89b5c1f6e54ee","signature":"496c3c74"}];
const ownerF140Identity=(c:Identity)=>ownerF140OriginalIdentity(c)||F140_COURT_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
export {ownerF140Identity};
const reconstructionNeeded=(c:BuildingComponent)=>c.city==="frankfurt"&&ownerF140Identity(c);
const materialNeeded=(c:BuildingComponent)=>c.city==='frankfurt'&&((ownerF140OriginalIdentity(c)&&!!c.displayEstimates?.F140Exterior)||(F140_COURT_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId)&&!!c.displayEstimates?.F140Courtyard));
const needed=(c:BuildingComponent)=>reconstructionNeeded(c)||materialNeeded(c);
const route=createLazyOwnerRoute('ownerF140Reconstruction',needed,true,()=>import('./owner-f140-reconstruction').then(m=>({reconstruct:m.ownerF140Reconstruction,baseMaterials:m.ownerF140BaseMaterials})));
/** Prepare at the original chain position; preserve identity and material-marker guards. */
export function prepareOwnerF140Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF140Reconstruction=route.reconstruct;
export function ownerF140BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 if(!components.some(materialNeeded))return {objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
