import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const BREMEN_OLDTOWN_EXTRA4_DATA_RESOURCE={"canonicalSHA256":"035346d8e2f4bd84bb8bd071514642d6303fe5d45134d4a3b33213a36b69b425","file":"painted/bremen/safety/extra4-data.ts","occurrence":0,"codec":"json"} as const;
export function getBREMEN_OLDTOWN_EXTRA4_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for BREMEN_OLDTOWN_EXTRA4_DATA');return (scope.borrow<any,any>(BREMEN_OLDTOWN_EXTRA4_DATA_RESOURCE,value=>value));}
export const BREMEN_OLDTOWN_EXTRA4_SHA="035346d8e2f4bd84bb8bd071514642d6303fe5d45134d4a3b33213a36b69b425";
