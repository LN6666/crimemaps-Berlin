import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const GLOCKE_KUESTER_SHA="d7b87596f02f16d7f485955191074b0a3e4a6b541e937236f35a10ccfbc5291f";
export const GLOCKE_KUESTER_DATA_RESOURCE={"canonicalSHA256":"d7b87596f02f16d7f485955191074b0a3e4a6b541e937236f35a10ccfbc5291f","file":"painted/bremen/safety/glocke-kuester-data.ts","occurrence":0,"codec":"json"} as const;
export function getGLOCKE_KUESTER_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for GLOCKE_KUESTER_DATA');return (scope.borrow<any,any>(GLOCKE_KUESTER_DATA_RESOURCE,value=>value));}
