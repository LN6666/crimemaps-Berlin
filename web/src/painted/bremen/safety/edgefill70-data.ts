import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const EDGEFILL70_SHA="a0a61f98df7e2f2648275d313bfaeeeaa22ada5503612da2165aade1338e1080";
export const EDGEFILL70_DATA_RESOURCE={"canonicalSHA256":"a0a61f98df7e2f2648275d313bfaeeeaa22ada5503612da2165aade1338e1080","file":"painted/bremen/safety/edgefill70-data.ts","occurrence":0,"codec":"json"} as const;
export function getEDGEFILL70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for EDGEFILL70_DATA');return (scope.borrow<any,any>(EDGEFILL70_DATA_RESOURCE,value=>value));}
