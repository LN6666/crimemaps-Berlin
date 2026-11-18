import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const STEPHANI_ROW_SHA="0094e759747bb4f00884a096948f56c7f72bb5b10394d94b0744f4ccf015bab4";
export const STEPHANI_ROW_DATA_RESOURCE={"canonicalSHA256":"0094e759747bb4f00884a096948f56c7f72bb5b10394d94b0744f4ccf015bab4","file":"painted/bremen/safety/stephani-row-data.ts","occurrence":0,"codec":"json"} as const;
export function getSTEPHANI_ROW_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for STEPHANI_ROW_DATA');return (scope.borrow<any,any>(STEPHANI_ROW_DATA_RESOURCE,value=>value));}
