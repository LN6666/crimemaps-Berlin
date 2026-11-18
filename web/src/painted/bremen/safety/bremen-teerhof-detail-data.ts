import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const TEERHOF_DETAIL_SHA="2a60ccf38ce284436446e15697f3d0ecd4c7248944d8dc5e88349f1867110d2a";
export const TEERHOF_DETAIL_DATA_RESOURCE={"canonicalSHA256":"2a60ccf38ce284436446e15697f3d0ecd4c7248944d8dc5e88349f1867110d2a","file":"painted/bremen/safety/bremen-teerhof-detail-data.ts","occurrence":0,"codec":"json"} as const;
export function getTEERHOF_DETAIL_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for TEERHOF_DETAIL_DATA');return (scope.borrow<any,any>(TEERHOF_DETAIL_DATA_RESOURCE,value=>value));}
