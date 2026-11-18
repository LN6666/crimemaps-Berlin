import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const EDGE70_DATA_RESOURCE={"canonicalSHA256":"90275a03d334b78ef282d2a8bcfc8b2d163c0642e9b54c7054abade1274bcd97","file":"painted/bremen/safety/bremen-db70-data.ts","occurrence":0,"codec":"json"} as const;
export function getEDGE70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for EDGE70_DATA');return (scope.borrow<any,any>(EDGE70_DATA_RESOURCE,value=>value));}
export const EDGE70_SHA="90275a03d334b78ef282d2a8bcfc8b2d163c0642e9b54c7054abade1274bcd97";
