import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const OFFICIAL_OPENINGS_SHA="58c778db0227ea02fc67b656985dafa8eff51185591b50c088de3edfe6699363";
export const OFFICIAL_OPENINGS_DATA_RESOURCE={"canonicalSHA256":"58c778db0227ea02fc67b656985dafa8eff51185591b50c088de3edfe6699363","file":"painted/bremen/safety/official-openings-data.ts","occurrence":0,"codec":"json"} as const;
export function getOFFICIAL_OPENINGS_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for OFFICIAL_OPENINGS_DATA');return (scope.borrow<any,any>(OFFICIAL_OPENINGS_DATA_RESOURCE,value=>value));}
