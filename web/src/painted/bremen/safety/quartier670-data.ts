import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const QUARTIER670_SHA="bfe66902444e69cb87432c30d092772d28d1e77816ced14eaafee1fcbd0f39c4";
export const QUARTIER670_DATA_RESOURCE={"canonicalSHA256":"bfe66902444e69cb87432c30d092772d28d1e77816ced14eaafee1fcbd0f39c4","file":"painted/bremen/safety/quartier670-data.ts","occurrence":0,"codec":"json"} as const;
export function getQUARTIER670_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for QUARTIER670_DATA');return (scope.borrow<any,any>(QUARTIER670_DATA_RESOURCE,value=>value));}
