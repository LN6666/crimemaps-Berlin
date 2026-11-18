import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {InfillDataModule} from '../../infill/safety/infill-data-contract';
import {prepareInfillOwnerModule} from '../../infill/safety/infill-owner-preparation';
import {infillFrankfurtJunghof088Metadata} from '../../infill/safety/bremen-infill-owner-metadata';
import * as junghofData from './infill-frankfurt-junghof088-data';
import {getLOW_OFFICE_DATA,LOW_OFFICE_SHA} from './infill-frankfurt-junghof088-data';
type LowGroup={queueId:string;models:any[];requiredNativeGroup:string[];geometryReadyForPreview:boolean;materialsComplete:boolean;detail50Implemented?:boolean;proof?:any};
const unchanged=(c:BuildingComponent,s:any,sig:string)=>nativePaintSignature(c)===sig&&['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(s[k]))&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=s.batches[bi][k];return a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));
export const infillFrankfurtJunghof088Identity=(c:Identity,_scope?:FrozenDataScope)=>infillFrankfurtJunghof088Metadata.infillFrankfurtJunghof088Identity(c);
export function infillFrankfurtJunghof088Reconstruction(components:BuildingComponent[],selectedQueueIds?:string[],scope?:FrozenDataScope){
 const GROUPS:LowGroup[]=getLOW_OFFICE_DATA(scope).groups;
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 // Each independent group fails closed. An absent/changed sibling can never remove its SOURCE.
 const ready=GROUPS.filter(g=>(!selectedQueueIds||selectedQueueIds.includes(g.queueId))&&g.geometryReadyForPreview&&g.models.length===g.requiredNativeGroup.length&&g.models.every(m=>{const rows=components.filter(c=>c.city==='frankfurt'&&c.objectId===m.identity.objectId&&c.partId===m.identity.partId);return rows.length===1&&unchanged(rows[0],m.source,m.identity.signature);}));
 const mapped=components.map(c=>{if(c.city!=='frankfurt')return c;const group=ready.find(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));if(!group)return c;const m=group.models.find(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId)!;
 const batches:any[]=m.display.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]}));const vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:LOW_OFFICE_SHA,vertices,triangles,geometryRole:'source-bound-junghof088-officialouter+DOP-recess+photo-canopy'});
 return {...c,batches,displayEstimates:{...c.displayEstimates,infillFrankfurtJunghof088:{queueId:group.queueId,patchSHA:LOW_OFFICE_SHA,sourceRetained:true,officialGeometry:false,mixedOfficialAndObservedDOPRoof:true,inferredMissingRoofDimensions:true,verifiedPhysicalUnitPlaneClip:true,protectedNeighborsFrozen:true,geometryProof:group.proof,actualVisualAccepted:false,materialsComplete:group.materialsComplete,detail50Complete:!!group.detail50Implemented,detail70Complete:!!(group as any).detail70Implemented}}};});return {components:mapped,stats};
}
export function infillFrankfurtJunghof088BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillFrankfurtJunghof088;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}

export const infillDataRefs=[] as const;
export const infillDataMemoKeys=[] as const;
export const infillDataDependencies=():readonly InfillDataModule[]=>[junghofData];
export const infillDataFunctionArities={infillFrankfurtJunghof088Identity:1,infillFrankfurtJunghof088Reconstruction:2} as const;
export const mayMatchInfillData=(components:readonly BuildingComponent[])=>components.some(c=>c.city==='frankfurt'&&infillFrankfurtJunghof088Identity(c));
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();if(!mayMatchInfillData(components))return;
 // This original resource contains SOURCE and DISPLAY atomically. The unchanged
 // independent-group guard above still authorizes every DISPLAY use.
 await prepareInfillOwnerModule(junghofData,components,signal,scope);signal.throwIfAborted();
}
