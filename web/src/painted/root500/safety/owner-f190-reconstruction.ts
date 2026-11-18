import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import {getRoot500Data as __root500Dependency0,root500DataRefs as __root500DependencyRefs0} from './owner-f190-data';

import type {BuildingComponent,Identity} from '../../../safety/building-mesh-types';
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
export const ownerF190Identity=(c:Identity)=>c.objectId==='osm/way/107760990'&&c.partId==='osm/way/107760990/component/b8a5b39679652dae93ff';
export const F190_RECONSTRUCTION_SHA='4c6688c43cb2ce83ac9889cb68d221361bd93385060b8544198d3b514f4ad57b';
export function ownerF190Reconstruction(components:BuildingComponent[],$scope?:FrozenDataScope){if(!mayMatchRoot500Data(components)){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};return{components:components.map(component=>component),stats:stats};}let __root500DataCell:ReturnType<typeof getRoot500Data>|undefined;const __root500Data=()=>__root500DataCell??=(getRoot500Data($scope));
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const drawable=components.map(c=>{if(c.city!=='stuttgart'||!ownerF190Identity(c))return c;
 if(nativePaintSignature(c)!=='a448a03d'){stats.error='Original F190 signature changed; reconstruction withheld';return c;}
 stats.objects++;stats.vertices+=180;stats.triangles+=98;stats.originalVertices+=100;
 stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:F190_RECONSTRUCTION_SHA,vertices:180,triangles:98,geometryRole:'owner-authorized-reconstruction'});
 return {...c,batches:__root500Data().F190_BATCHES,displayEstimates:{...c.displayEstimates,ownerAuthorizedReconstruction:{sourceFootprintRetained:true,originalHeightM:22.5,displayHeightM:40,dimensions:'Published nominal cube height40m; perimeter railing rises photo-estimated0.95m above roof; not surveyed',actualVisualAccepted:false}}};});return{components:drawable,stats};
}
export function ownerF190BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,$scope?:FrozenDataScope){if(__root500Demand.length&&!components.some(component=>__root500Demand.some(identity=>identity.objectId===component.objectId&&(identity.partId===null||identity.partId===component.partId))))return ;let __root500DataCell:ReturnType<typeof getRoot500Data>|undefined;const __root500Data=()=>__root500DataCell??=(getRoot500Data($scope));let offset=0;for(const c of components)for(const [bi,b]of c.batches.entries()){const count=b.positions.length/3;if(c.city==='stuttgart'&&ownerF190Identity(c)&&c.displayEstimates?.ownerAuthorizedReconstruction){if(__root500Data().F190_FRAME_ROWS[bi].length!==count*5)throw Error('F190 frames mismatch');for(let i=0;i<count;i++)paint.set(bi===0?[.63,.65,.62,2]:[.71,.72,.69,2],(offset+i)*4);frames.set(__root500Data().F190_FRAME_ROWS[bi],offset*5);}offset+=count;}}
const __root500MemoKey={};
const __root500Demand:readonly {objectId:string;partId:string|null}[]=[{"objectId":"osm/way/107760990","partId":"osm/way/107760990/component/b8a5b39679652dae93ff"}];
const __root500OwnRefs:readonly FrozenDataRef[]=[];
export const root500DataRefs:readonly FrozenDataRef[]=[...__root500OwnRefs,...__root500DependencyRefs0];
export const root500DataFunctionArities:Record<string,number>={"ownerF190Reconstruction":1,"ownerF190BaseMaterials":3};
export function mayMatchRoot500Data(components:readonly {city:string;objectId?:string;partId?:string;origin?:readonly number[]}[]){return components.some(component=>["stuttgart"].includes(component.city)&&__root500Demand.some(identity=>identity.objectId===component.objectId&&(identity.partId===null||identity.partId===component.partId)));}
export async function prepareRoot500Data(components:readonly {city:string;objectId?:string;partId?:string;origin?:readonly number[]}[],signal:AbortSignal,scope:FrozenDataScope){signal.throwIfAborted();if(mayMatchRoot500Data(components))await scope.prepare(root500DataRefs,signal);}
export function getRoot500Data(scope?:FrozenDataScope){if(!scope)throw Error('owner-f190-reconstruction.ts requires a prepared FrozenDataScope');return scope.memo(__root500MemoKey,()=>{
const F190_BATCHES=__root500Dependency0(scope).F190_BATCHES;
const F190_FRAME_ROWS=__root500Dependency0(scope).F190_FRAME_ROWS;

return {F190_BATCHES,F190_FRAME_ROWS,ownerF190Reconstruction:((...args:any[]):any=>ownerF190Reconstruction(args[0],scope)),ownerF190BaseMaterials:((...args:any[]):any=>ownerF190BaseMaterials(args[0],args[1],args[2],scope))};
});}
