import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';


const IDS=[{"city": "frankfurt", "objectId": "osm/way/11527403", "partId": "osm/way/11527403/component/fee6c96118bb2d2026ed", "signature": "9e8e305f"}, {"city": "frankfurt", "objectId": "osm/way/1333665177", "partId": "osm/way/1333665177/component/99431b409b420a8d7aaf", "signature": "6575e5e1"}, {"city": "frankfurt", "objectId": "osm/way/1333665178", "partId": "osm/way/1333665178/component/d0bb3638297923b38320", "signature": "10c25968"}, {"city": "frankfurt", "objectId": "osm/way/1333665179", "partId": "osm/way/1333665179/component/8d793be1b44c3c28f21f", "signature": "4930fa3e"}];
export const infillSilberturmIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
const equalSource=(c:BuildingComponent,s:any)=>nativePaintSignature(c)===s.geometrySignature&&JSON.stringify(c.origin)===JSON.stringify(s.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(s.componentGeometry)&&JSON.stringify(c.sourceFeature)===JSON.stringify(s.sourceFeature)&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=s.batches[bi][k];return a?.length===e?.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"f79b08c9af2ee2f68d27faec7de0c3720fd797ce6f9a03e5afe926eb123f51af",file:"painted/infill/safety/infill-silberturm-full051-reconstruction.ts",occurrence:0,codec:'json'},{canonicalSHA256:"75ca031fc03795f03e4ead934e2b1fe932ae9b6fb117477198a7f30d4a913d29",file:"painted/infill/safety/infill-silberturm-full051-reconstruction.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-silberturm-full051-reconstruction.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_SOURCE=scopedInfillValue<Record<string,any>>(()=>scope.borrow<Record<string,any>,Record<string,any>>(infillOwnDataRefs[0],value=>value));
const __infillRead_DISPLAY=scopedInfillValue<Record<string,any>>(()=>scope.borrow<Record<string,any>,Record<string,any>>(infillOwnDataRefs[1],value=>value));

function infillSourceReadyForDisplay(components:BuildingComponent[]):boolean{
    const stats: OwnerReconstructionStats = { objects: 0, vertices: 0, triangles: 0, originalVertices: 0, sourceRetained: true, actualVisualAccepted: false, components: [] };
    const cs = components.filter(c => c.city === 'frankfurt' && infillSilberturmIdentity(c));
    if (!cs.length)
        return false;
    if (IDS.some(i => cs.filter(c => c.objectId === i.objectId && c.partId === i.partId).length !== 1)) {
        stats.error = 'Silberturm full native group required exactly once';
        return false;
    }
    if (cs.every(c => !!c.displayEstimates?.infillSilberturm))
        return false;
    if (cs.some(c => !!c.displayEstimates?.infillSilberturm) || cs.some(c => !equalSource(c, __infillRead_SOURCE()[c.partId]))) {
        stats.error = 'Silberturm source group mismatch';
        return false;
    }

return true;
}
function silberturmFullReconstruction051(components:BuildingComponent[]){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};const cs=components.filter(c=>c.city==='frankfurt'&&infillSilberturmIdentity(c));if(!cs.length)return{components,stats};if(IDS.some(i=>cs.filter(c=>c.objectId===i.objectId&&c.partId===i.partId).length!==1)){stats.error='Silberturm full native group required exactly once';return{components,stats};}if(cs.every(c=>!!c.displayEstimates?.infillSilberturm))return{components,stats};if(cs.some(c=>!!c.displayEstimates?.infillSilberturm)||cs.some(c=>!equalSource(c,__infillRead_SOURCE()[c.partId]))){stats.error='Silberturm source group mismatch';return{components,stats};}return{components:components.map(c=>{if(c.city!=='frankfurt'||!infillSilberturmIdentity(c))return c;const batches=__infillRead_DISPLAY()[c.partId].map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],frames:[...b.frames],paint:[...b.paint]}));const vertices=batches.reduce((s:number,b:any)=>s+b.positions.length/3,0),triangles=batches.reduce((s:number,b:any)=>s+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((s,b)=>s+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:"75ca031fc03795f03e4ead934e2b1fe932ae9b6fb117477198a7f30d4a913d29",vertices,triangles,geometryRole:'owner-authorized-reconstruction'});return{...c,batches,displayEstimates:{...c.displayEstimates,infillSilberturm:true,dimensionsPhotoApproximate:true,sourceRetained:true}};}),stats};}

return {infillSourceReadyForDisplay,get SOURCE(){return __infillRead_SOURCE();},get DISPLAY(){return __infillRead_DISPLAY();},silberturmFullReconstruction051};
});}
function getSOURCE(scope:FrozenDataScope|undefined){return getInfillData(scope).SOURCE;}
function getDISPLAY(scope:FrozenDataScope|undefined){return getInfillData(scope).DISPLAY;}
export function silberturmFullReconstruction051(...args:[...Parameters<ReturnType<typeof getInfillData>['silberturmFullReconstruction051']>,scope?:FrozenDataScope]){if(!mayMatchInfillData(args[0])){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};return{components:args[0],stats};}const scope=args[1] as FrozenDataScope|undefined;return getInfillData(scope).silberturmFullReconstruction051(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['silberturmFullReconstruction051']>);}
export const infillDataFunctionArities={"silberturmFullReconstruction051":1} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

export const mayMatchInfillData=(components:readonly BuildingComponent[]):boolean=>components.some(c=>c.city==='frankfurt'&&infillSilberturmIdentity(c));
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();if(!mayMatchInfillData(components))return;
 await scope.prepare([infillOwnDataRefs[0]],signal);signal.throwIfAborted();
 if(getInfillData(scope).infillSourceReadyForDisplay(components as BuildingComponent[]))await scope.prepare([infillOwnDataRefs[1]],signal);
 signal.throwIfAborted();
}
