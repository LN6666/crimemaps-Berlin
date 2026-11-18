import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const ORGANISTEN_SHA="87dbcf745ad540985c830f366f32c6bd2458792af5407583fcb9a65d2dea65e1";
export const ORGANISTEN_DATA_RESOURCE={"canonicalSHA256":"87dbcf745ad540985c830f366f32c6bd2458792af5407583fcb9a65d2dea65e1","file":"painted/bremen/safety/organisten-data.ts","occurrence":0,"codec":"json"} as const;
export function getORGANISTEN_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for ORGANISTEN_DATA');return (scope.borrow<any,any>(ORGANISTEN_DATA_RESOURCE,value=>value));}
