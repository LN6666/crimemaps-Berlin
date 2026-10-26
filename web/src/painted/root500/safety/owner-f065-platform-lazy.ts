import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F065_PLATFORM_IDS=[{"city": "munich", "objectId": "osm/way/276228778", "partId": "osm/way/276228778/component/4334c623c6f5ccc9b5ec", "signature": "600131f5"}, {"city": "munich", "objectId": "osm/way/276228779", "partId": "osm/way/276228779/component/c22e3c06d1939aa971be", "signature": "b34ef80c"}, {"city": "munich", "objectId": "osm/way/276228780", "partId": "osm/way/276228780/component/9c6d0f80f00a88f8157a", "signature": "b79ccfab"}, {"city": "munich", "objectId": "osm/way/276522311", "partId": "osm/way/276522311/component/603f8b5b78436fcbdd6a", "signature": "1d73fa1a"}, {"city": "munich", "objectId": "osm/way/276522312", "partId": "osm/way/276522312/component/ef198d448058b8e59476", "signature": "b39cb068"}, {"city": "munich", "objectId": "osm/way/276522314", "partId": "osm/way/276522314/component/5defa8f68eea31d458b2", "signature": "4583799e"}, {"city": "munich", "objectId": "osm/way/276522315", "partId": "osm/way/276522315/component/8e6fcaa30216c23d718a", "signature": "da37f4a9"}, {"city": "munich", "objectId": "osm/way/276522316", "partId": "osm/way/276522316/component/9de093e63272e1e9781d", "signature": "78da7aec"}, {"city": "munich", "objectId": "osm/way/276770402", "partId": "osm/way/276770402/component/3a9bae81338639c1a7b9", "signature": "103b3c66"}, {"city": "munich", "objectId": "osm/way/276770403", "partId": "osm/way/276770403/component/2fc1a6a900f34d9c987e", "signature": "a95c3ddb"}, {"city": "munich", "objectId": "osm/way/276522313", "partId": "osm/way/276522313/component/09b9c792ff3777e06d06", "signature": "c79cb28d"}];
const ownerF065PlatformIdentity=(c:Identity)=>F065_PLATFORM_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
export {ownerF065PlatformIdentity};
const reconstructionNeeded=(c:BuildingComponent)=>c.city==="munich"&&ownerF065PlatformIdentity(c);
const materialNeeded=(c:BuildingComponent)=>c.city==='munich'&&ownerF065PlatformIdentity(c)&&!!c.displayEstimates?.F065PlatformExterior;
const needed=(c:BuildingComponent)=>reconstructionNeeded(c)||materialNeeded(c);
const route=createLazyOwnerRoute('ownerF065PlatformReconstruction',needed,true,()=>import('./owner-f065-platform-reconstruction').then(m=>({reconstruct:m.ownerF065PlatformReconstruction,baseMaterials:m.ownerF065PlatformBaseMaterials})));
/** Prepare at the original chain position; preserve identity and material-marker guards. */
export function prepareOwnerF065PlatformReconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF065PlatformReconstruction=route.reconstruct;
export function ownerF065PlatformBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 if(!components.some(materialNeeded))return {objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
