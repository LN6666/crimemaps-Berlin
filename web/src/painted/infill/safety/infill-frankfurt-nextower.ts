import {prepareInfillDataResources,infillMetadataCandidate} from './infill-owner-preparation';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import {infillFrankfurtNextowerMetadata} from './bremen-infill-owner-metadata';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getNEXTOWER_DATA as __infillDataDependency0,NEXTOWER_SHA} from './infill-frankfurt-nextower-data';

const unchanged=(c:BuildingComponent,source:any,signature:string)=>nativePaintSignature(c)===signature&&['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(source[k]))&&c.batches.length===source.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=source.batches[bi][k];return a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));




import * as __infillResourceDependency0 from './infill-frankfurt-nextower-data';
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[];
/** Borrow immutable source models directly; no scope-wide facade reservation. */
export function infillFrankfurtNextowerReconstruction(components:BuildingComponent[],scope?:FrozenDataScope){
 if(scope?.stats.disposed)throw new DOMException("Frozen data scope was released","AbortError");
 if(!mayMatchInfillData(components))return infillFrankfurtNextowerReconstructionCold(components);
 const models=__infillDataDependency0(scope).models;
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const colosseoReady=models.every(m=>{const rows=components.filter(c=>c.city==='frankfurt'&&c.objectId===m.identity.objectId&&c.partId===m.identity.partId);return rows.length===1&&unchanged(rows[0],m.source,m.identity.signature);});
 const groupMissing=models.some(m=>!components.some(c=>c.city==='frankfurt'&&c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
 if(groupMissing)return{components,stats};
 const mapped=components.map(c=>{if(c.city!=='frankfurt')return c;const model=models.find(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId);if(!model)return c;const source=model.source;
 const ready=colosseoReady&&components.filter(q=>q.city===c.city&&q.objectId===c.objectId&&q.partId===c.partId).length===1&&unchanged(c,source,model.identity.signature);
 if(!ready){stats.error='Frankfurt infill requires one unchanged exact native carrier per target';return c;}
 const batches=model.display.map(b=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]}));const vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:NEXTOWER_SHA,vertices,triangles,geometryRole:'source-bound-official-sevenparts-with-suspended-true-part-display'});
 return{...c,batches,displayEstimates:{...c.displayEstimates,infillFrankfurtNextowerExterior:{sourceRetained:true,patchSHA:NEXTOWER_SHA,displayEstimate:true,surveyed:false,materialsComplete:true,fineTextureDeferred:false,detailLevelIntent:0.5,officialGeometryRetained:true,photoEstimatedCantileverFloor:true}}};});return{components:mapped,stats};
}
export function infillFrankfurtNextowerIdentity(c:Identity,_scope?:FrozenDataScope){return infillFrankfurtNextowerMetadata.infillFrankfurtNextowerIdentity(c);}
export function infillFrankfurtNextowerBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,_scope?:FrozenDataScope){return infillFrankfurtNextowerMetadata.infillFrankfurtNextowerBaseMaterials(components,paint,frames);}
export const infillDataFunctionArities={infillFrankfurtNextowerIdentity:1,infillFrankfurtNextowerReconstruction:1,infillFrankfurtNextowerBaseMaterials:3} as const;
export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function infillFrankfurtNextowerReconstructionCold(components:BuildingComponent[]){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
return {components:components,stats};}

const infillPreparationPairs=[["osm/way/42927746","osm/way/42927746/component/dd94663131cbb4ca6052"]] as const;
export function mayMatchInfillData(components:readonly BuildingComponent[]){return infillMetadataCandidate(components,infillFrankfurtNextowerMetadata.infillFrankfurtNextowerIdentity,infillPreparationPairs);}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=["infillFrankfurtNextowerIdentity","infillFrankfurtNextowerBaseMaterials"] as const;
