import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import {getRoot500Data as __root500Dependency0,root500DataRefs as __root500DependencyRefs0} from './owner-f032-frame-data';
import {getRoot500Data as __root500Dependency1,root500DataRefs as __root500DependencyRefs1} from './owner-f032-reconstruction-data';

import type {BuildingComponent,Identity} from '../../../safety/building-mesh-types';
import {nativePaintSignature} from './progressive-native-signature';
export const ownerF032Identity=(c:Identity)=>c.objectId==='osm/way/43000923'&&c.partId==='osm/way/43000923/component/0cd335c1c1044c09c23d';
export const F032_RECONSTRUCTION_SHA='1013d75e1b05e8ac9776ab9b56022b81fc66a89703a91bf4b2ac69ae059e3d27';
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
export type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
export function ownerF032Reconstruction(components:BuildingComponent[],$scope?:FrozenDataScope){if(!mayMatchRoot500Data(components)){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};return{components:components.map(component=>component),stats:stats};}let __root500DataCell:ReturnType<typeof getRoot500Data>|undefined;const __root500Data=()=>__root500DataCell??=(getRoot500Data($scope));
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const drawable=components.map(c=>{
  if(c.city!=='berlin'||!ownerF032Identity(c))return c;
  if(nativePaintSignature(c)!=='20976902'){stats.error='Original F032 signature changed; reconstruction withheld';return c;}
  stats.objects++;stats.originalVertices=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
  stats.vertices=__root500Data().F032_RECONSTRUCTION_BATCHES.reduce((n,b)=>n+b.positions.length/3,0);
  stats.triangles=__root500Data().F032_RECONSTRUCTION_BATCHES.reduce((n,b)=>n+b.indices.length/3,0);
  stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:F032_RECONSTRUCTION_SHA,vertices:stats.vertices,triangles:stats.triangles,geometryRole:'owner-authorized-reconstruction'});
  return {...c,batches:__root500Data().F032_RECONSTRUCTION_BATCHES,displayEstimates:{...c.displayEstimates,ownerAuthorizedReconstruction:{sourceBuildingId:'DEBE01YYK0000047',officialModelMaxHeightM:29.457,officialDatumShiftM:.002,restoredTowerMaxHeightM:65,upperTowerDimensions:'photo-approximate, not surveyed',actualVisualAccepted:false}}};
 });
 return {components:drawable,stats};
}
export function ownerF032BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,$scope?:FrozenDataScope){if(__root500Demand.length&&!components.some(component=>__root500Demand.some(identity=>identity.objectId===component.objectId&&(identity.partId===null||identity.partId===component.partId))))return ;let __root500DataCell:ReturnType<typeof getRoot500Data>|undefined;const __root500Data=()=>__root500DataCell??=(getRoot500Data($scope));
 let offset=0;
 for(const c of components)for(const [bi,batch] of c.batches.entries()){
  if(c.city==='berlin'&&ownerF032Identity(c)&&c.displayEstimates?.ownerAuthorizedReconstruction){
   for(let v=0;v<batch.positions.length/3;v++){
    paint.set([...batch.color,2],(offset+v)*4);
    frames.fill(0,(offset+v)*5,(offset+v+1)*5);
   }
   for(const f of __root500Data().F032_RECONSTRUCTION_FRAMES){if(f.batchIndex!==bi)continue;for(let v=f.firstVertex;v<f.firstVertex+f.vertexCount;v++){const u=f.uAxis.reduce((n,a,j)=>n+a*batch.positions[v*3+j],0)-f.uOrigin;frames.set([u,batch.positions[v*3+1],f.height,f.width,f.family],(offset+v)*5);}}
  }
  offset+=batch.positions.length/3;
 }
}
const __root500MemoKey={};
const __root500Demand:readonly {objectId:string;partId:string|null}[]=[{"objectId":"osm/way/43000923","partId":"osm/way/43000923/component/0cd335c1c1044c09c23d"}];
const __root500OwnRefs:readonly FrozenDataRef[]=[];
export const root500DataRefs:readonly FrozenDataRef[]=[...__root500OwnRefs,...__root500DependencyRefs0,...__root500DependencyRefs1];
export const root500DataFunctionArities:Record<string,number>={"ownerF032Reconstruction":1,"ownerF032BaseMaterials":3};
export function mayMatchRoot500Data(components:readonly {city:string;objectId?:string;partId?:string;origin?:readonly number[]}[]){return components.some(component=>["berlin"].includes(component.city)&&__root500Demand.some(identity=>identity.objectId===component.objectId&&(identity.partId===null||identity.partId===component.partId)));}
export async function prepareRoot500Data(components:readonly {city:string;objectId?:string;partId?:string;origin?:readonly number[]}[],signal:AbortSignal,scope:FrozenDataScope){signal.throwIfAborted();if(mayMatchRoot500Data(components))await scope.prepare(root500DataRefs,signal);}
export function getRoot500Data(scope?:FrozenDataScope){if(!scope)throw Error('owner-f032-reconstruction.ts requires a prepared FrozenDataScope');return scope.memo(__root500MemoKey,()=>{
const F032_RECONSTRUCTION_FRAMES=__root500Dependency0(scope).F032_RECONSTRUCTION_FRAMES;
const F032_RECONSTRUCTION_BATCHES=__root500Dependency1(scope).F032_RECONSTRUCTION_BATCHES;

return {F032_RECONSTRUCTION_FRAMES,F032_RECONSTRUCTION_BATCHES,ownerF032Reconstruction:((...args:any[]):any=>ownerF032Reconstruction(args[0],scope)),ownerF032BaseMaterials:((...args:any[]):any=>ownerF032BaseMaterials(args[0],args[1],args[2],scope))};
});}
