import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const GLOCKE_DETAIL_SHA="98ad9a1680e113e84b7b9e0d267779f7b9b816f4cf14f3f0e2272a2460f833b9";
export const GLOCKE_DETAIL_DATA_RESOURCE={"canonicalSHA256":"98ad9a1680e113e84b7b9e0d267779f7b9b816f4cf14f3f0e2272a2460f833b9","file":"painted/bremen/safety/glocke-detail-data.ts","occurrence":0,"codec":"json"} as const;
export function getGLOCKE_DETAIL_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for GLOCKE_DETAIL_DATA');return (scope.borrow<any,any>(GLOCKE_DETAIL_DATA_RESOURCE,value=>value));}
