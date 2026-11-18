import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const BOUNDARY70_DATA_RESOURCE={"canonicalSHA256":"638776526482e43de8e820c2a085b64febcda3813e87b9d878d1cd15ecb20918","file":"painted/bremen/safety/boundary-data.ts","occurrence":0,"codec":"json"} as const;
export function getBOUNDARY70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for BOUNDARY70_DATA');return (scope.borrow<any,any>(BOUNDARY70_DATA_RESOURCE,value=>value));}
export const BOUNDARY70_SHA="638776526482e43de8e820c2a085b64febcda3813e87b9d878d1cd15ecb20918";
