import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const KUNSTHALLE70_SHA="444673e70bee245d85318b8f980e34f83ec5315a58017c03cfd8468cb9eb7fce";
export const KUNSTHALLE70_DATA_RESOURCE={"canonicalSHA256":"444673e70bee245d85318b8f980e34f83ec5315a58017c03cfd8468cb9eb7fce","file":"painted/bremen/safety/kunsthalle70-data.ts","occurrence":0,"codec":"json"} as const;
export function getKUNSTHALLE70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for KUNSTHALLE70_DATA');return (scope.borrow<any,any>(KUNSTHALLE70_DATA_RESOURCE,value=>value));}
