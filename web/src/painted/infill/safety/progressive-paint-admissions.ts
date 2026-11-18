import type {ProgressiveAdmissionCommon} from '../../shared/progressive-admission-common';
type InfillResourceValue = Array<ProgressiveAdmissionCommon & {"surfaceFrames"?:Array<{"batchIndex":number;"edgeIndex"?:number;"facetCount"?:number;"family":number;"firstVertex":number;"height":number;"ringIndex"?:number;"semanticReason"?:string;"sourceEdge"?:number;"sourceOuterEdgeRange"?:[number,number];"uAxis":[number,number,number];"uOrigin":number;"vAxis":[number,number,number];"vOrigin":number;"vertexCount":number;"width":number;}>;}>;
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import {frozenPaintTableRowCounts} from '../../../safety/frozen-paint-tables';
export const INFILL_ADMISSIONS_RESOURCE={canonicalSHA256:'bf6c0c7678fb129cb3fbf9946a3ca9a491370a8489022e5c492ce7e8fd60f651',file:'painted/infill/safety/progressive-paint-admissions.ts',occurrence:0,codec:'json'} as const satisfies FrozenDataRef;
export function getPROGRESSIVE_ADMISSIONS(scope:FrozenDataScope):InfillResourceValue{return scope.borrow<InfillResourceValue,InfillResourceValue>(INFILL_ADMISSIONS_RESOURCE,value=>value);}
export const PROGRESSIVE_INPUT_SHA='bf6c0c7678fb129cb3fbf9946a3ca9a491370a8489022e5c492ce7e8fd60f651';
export function infillProgressiveAdmissionCounts(scope:FrozenDataScope){return frozenPaintTableRowCounts(INFILL_ADMISSIONS_RESOURCE.canonicalSHA256,INFILL_ADMISSIONS_RESOURCE.file,getPROGRESSIVE_ADMISSIONS(scope).length);}
