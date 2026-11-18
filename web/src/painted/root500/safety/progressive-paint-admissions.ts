import type {ProgressiveAdmissionCommon} from '../../shared/progressive-admission-common';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import {frozenPaintTableRowCounts} from '../../../safety/frozen-paint-tables';

export const PROGRESSIVE_INPUT_SHA="2d556d4a2acaf18e4f59940bb24053f547e10f9c4fd0b251fbe302a2cfc86cd1";


type Root500ResourceValue=Array<ProgressiveAdmissionCommon & {"surfaceFrames"?:Array<{"batchIndex":number;"edgeIndex"?:number;"facetCount"?:number;"family":number;"firstVertex":number;"height":number;"ringIndex"?:number;"semanticReason"?:string;"sourceEdge"?:number;"sourceOuterEdgeRange"?:[number,number];"uAxis":[number,number,number];"uOrigin":number;"vAxis":[number,number,number];"vOrigin":number;"vertexCount":number;"width":number;}>;}>;
export const root500DataRefs=[{canonicalSHA256:"2d556d4a2acaf18e4f59940bb24053f547e10f9c4fd0b251fbe302a2cfc86cd1",file:"painted/root500/safety/progressive-paint-admissions.ts",occurrence:0,codec:'json'}] as const satisfies readonly FrozenDataRef[];
const root500DataKey=Object.freeze({});
export const root500DataFunctionArities={} as const;
export function mayMatchRoot500Data(components:readonly {city?:string}[]){return components.length>0;}
export async function prepareRoot500Data(components:readonly {city:string;objectId:string}[],signal:AbortSignal,scope:FrozenDataScope){
 signal.throwIfAborted();
 // An object's source and display parts are one admission unit. Empty demand
 // prepares an empty table without a network request in a partitioned profile.
 await scope.prepareSelection(root500DataRefs[0],[...new Set(components.map(c=>c.city+'|'+c.objectId))],signal);
 signal.throwIfAborted();getRoot500Data(scope);
}
export function getRoot500Data(scope?:FrozenDataScope){if(!scope)throw Error("progressive-paint-admissions requires a prepared FrozenDataScope");return scope.memo(root500DataKey,()=>{
 const PROGRESSIVE_ADMISSIONS=scope.borrow<unknown,Root500ResourceValue>(root500DataRefs[0],value=>value as Root500ResourceValue);

 const PROGRESSIVE_ADMISSION_COUNTS=frozenPaintTableRowCounts("2d556d4a2acaf18e4f59940bb24053f547e10f9c4fd0b251fbe302a2cfc86cd1","painted/root500/safety/progressive-paint-admissions.ts",PROGRESSIVE_ADMISSIONS.length);
 return{PROGRESSIVE_ADMISSIONS,PROGRESSIVE_ADMISSION_COUNTS};
});}
