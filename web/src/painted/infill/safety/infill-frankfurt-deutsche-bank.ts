import {prepareInfillDataResources,infillMetadataCandidate} from './infill-owner-preparation';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import {infillFrankfurtDeutscheBankMetadata} from './bremen-infill-owner-metadata';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getDB_DATA as __infillDataDependency0,DB_SHA} from './infill-frankfurt-deutsche-bank-data';

const unchanged=(c:BuildingComponent,source:any,signature:string)=>nativePaintSignature(c)===signature&&['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(source[k]))&&c.batches.length===source.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=source.batches[bi][k];return a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));




import * as __infillResourceDependency0 from './infill-frankfurt-deutsche-bank-data';
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[];
/** Borrow immutable source models directly; no scope-wide facade reservation. */
export function infillFrankfurtDeutscheBankReconstruction(components:BuildingComponent[],scope?:FrozenDataScope){
 if(scope?.stats.disposed)throw new DOMException("Frozen data scope was released","AbortError");
 if(!mayMatchInfillData(components))return infillFrankfurtDeutscheBankReconstructionCold(components);
 const models=__infillDataDependency0(scope).models;
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const colosseoReady=models.every(m=>{const rows=components.filter(c=>c.city==='frankfurt'&&c.objectId===m.identity.objectId&&c.partId===m.identity.partId);return rows.length===1&&unchanged(rows[0],m.source,m.identity.signature);});
 const groupMissing=models.some(m=>!components.some(c=>c.city==='frankfurt'&&c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
 if(groupMissing)return{components,stats}; // Incomplete streaming group: no replacement; target SHA gate remains unsatisfied.
 const mapped=components.map(c=>{if(c.city!=='frankfurt')return c;const model=models.find(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId);if(!model)return c;const source=model.source;
 const ready=colosseoReady&&components.filter(q=>q.city===c.city&&q.objectId===c.objectId&&q.partId===c.partId).length===1&&unchanged(c,source,model.identity.signature);
 if(!ready){stats.error='Frankfurt infill requires one unchanged exact native carrier per target';return c;}
 const batches=model.display.map(b=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]}));const vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:DB_SHA,vertices,triangles,geometryRole:'native-twin-towers-and-source-bound-local-podium-slope-display'});
 return{...c,batches,displayEstimates:{...c.displayEstimates,infillFrankfurtDeutscheBankExterior:{sourceRetained:true,patchSHA:DB_SHA,displayEstimate:true,surveyed:false,materialsComplete:true,fineTextureDeferred:true}}};});return{components:mapped,stats};
}
export function infillFrankfurtDeutscheBankIdentity(c:Identity,_scope?:FrozenDataScope){return infillFrankfurtDeutscheBankMetadata.infillFrankfurtDeutscheBankIdentity(c);}
export function infillFrankfurtDeutscheBankBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,_scope?:FrozenDataScope){return infillFrankfurtDeutscheBankMetadata.infillFrankfurtDeutscheBankBaseMaterials(components,paint,frames);}
export const infillDataFunctionArities={infillFrankfurtDeutscheBankIdentity:1,infillFrankfurtDeutscheBankReconstruction:1,infillFrankfurtDeutscheBankBaseMaterials:3} as const;
export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function infillFrankfurtDeutscheBankReconstructionCold(components:BuildingComponent[]){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
return {components:components,stats};}

const infillPreparationPairs=[["osm/way/174461751","osm/way/174461751/component/72e68a97feeab9a70905"],["osm/way/174461752","osm/way/174461752/component/89c43808797e3c3da7b5"],["osm/way/174461753","osm/way/174461753/component/6d299c87d73e87a70ad2"]] as const;
export function mayMatchInfillData(components:readonly BuildingComponent[]){return infillMetadataCandidate(components,infillFrankfurtDeutscheBankMetadata.infillFrankfurtDeutscheBankIdentity,infillPreparationPairs);}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=["infillFrankfurtDeutscheBankIdentity","infillFrankfurtDeutscheBankBaseMaterials"] as const;
