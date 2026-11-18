import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import {getRoot500Data as __root500Dependency0,root500DataRefs as __root500DependencyRefs0} from './owner-f135-garden-data';

import type {BuildingComponent,Identity} from '../../../safety/building-mesh-types';
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
export const ownerF135GardenIdentity=(c:Identity)=>c.objectId==='osm/way/232461876'&&c.partId==='osm/way/232461876/component/81f7486b51fa0e51c16d';
export const F135_GARDEN_SHA='ab953b932388369bd07253d0d4a5dc3d89aabd275970e6304dd40c0b74a91a43';
export function ownerF135GardenReconstruction(components:BuildingComponent[],$scope?:FrozenDataScope){if(!mayMatchRoot500Data(components)){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};return{components:components.map(component=>component),stats:stats};}let __root500DataCell:ReturnType<typeof getRoot500Data>|undefined;const __root500Data=()=>__root500DataCell??=(getRoot500Data($scope));
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const drawable=components.map(c=>{if(c.city!=='frankfurt'||!ownerF135GardenIdentity(c))return c;if(nativePaintSignature(c)!=='43d743b1'){stats.error='Original Garden source changed; correction withheld';return c;}
 const triangles=__root500Data().F135_GARDEN_BATCHES.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=110;stats.originalVertices+=110;stats.triangles+=triangles;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:F135_GARDEN_SHA,vertices:110,triangles,geometryRole:'owner-authorized-reconstruction'});
 return {...c,batches:__root500Data().F135_GARDEN_BATCHES,displayEstimates:{...c.displayEstimates,ownerAuthorizedReconstruction:{sourceFootprintRetained:true,sourceArraysRetained:true,originalHeightM:7.5,displayHeightM:15.5,dimensions:'Photo-estimated relative height; not surveyed',existingWindowLayoutPreserved:true,actualVisualAccepted:false}}};});return{components:drawable,stats};
}
export function ownerF135GardenMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,$scope?:FrozenDataScope){if(__root500Demand.length&&!components.some(component=>__root500Demand.some(identity=>identity.objectId===component.objectId&&(identity.partId===null||identity.partId===component.partId))))return ;let __root500DataCell:ReturnType<typeof getRoot500Data>|undefined;const __root500Data=()=>__root500DataCell??=(getRoot500Data($scope));let offset=0;for(const c of components)for(const [bi,b]of c.batches.entries()){const count=b.positions.length/3;if(c.city==='frankfurt'&&ownerF135GardenIdentity(c)&&c.displayEstimates?.ownerAuthorizedReconstruction){for(let j=0;j<count;j++)paint.set([...b.color,2],(offset+j)*4);frames.set(__root500Data().F135_GARDEN_FRAMES[bi],offset*5);}offset+=count;}}
const __root500MemoKey={};
const __root500Demand:readonly {objectId:string;partId:string|null}[]=[{"objectId":"osm/way/232461876","partId":"osm/way/232461876/component/81f7486b51fa0e51c16d"}];
const __root500OwnRefs:readonly FrozenDataRef[]=[];
export const root500DataRefs:readonly FrozenDataRef[]=[...__root500OwnRefs,...__root500DependencyRefs0];
export const root500DataFunctionArities:Record<string,number>={"ownerF135GardenReconstruction":1,"ownerF135GardenMaterials":3};
export function mayMatchRoot500Data(components:readonly {city:string;objectId?:string;partId?:string;origin?:readonly number[]}[]){return components.some(component=>["frankfurt"].includes(component.city)&&__root500Demand.some(identity=>identity.objectId===component.objectId&&(identity.partId===null||identity.partId===component.partId)));}
export async function prepareRoot500Data(components:readonly {city:string;objectId?:string;partId?:string;origin?:readonly number[]}[],signal:AbortSignal,scope:FrozenDataScope){signal.throwIfAborted();if(mayMatchRoot500Data(components))await scope.prepare(root500DataRefs,signal);}
export function getRoot500Data(scope?:FrozenDataScope){if(!scope)throw Error('owner-f135-garden.ts requires a prepared FrozenDataScope');return scope.memo(__root500MemoKey,()=>{
const F135_GARDEN_BATCHES=__root500Dependency0(scope).F135_GARDEN_BATCHES;
const F135_GARDEN_FRAMES=__root500Dependency0(scope).F135_GARDEN_FRAMES;

return {F135_GARDEN_BATCHES,F135_GARDEN_FRAMES,ownerF135GardenReconstruction:((...args:any[]):any=>ownerF135GardenReconstruction(args[0],scope)),ownerF135GardenMaterials:((...args:any[]):any=>ownerF135GardenMaterials(args[0],args[1],args[2],scope))};
});}
