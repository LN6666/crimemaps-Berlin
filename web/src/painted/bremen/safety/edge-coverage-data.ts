import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const EDGE_COVERAGE_SHA="0d2079d4f879271f759332da6b42f502e8c8ba981ab5239d6c7a298203562506";
export const EDGE_COVERAGE_DATA_RESOURCE={"canonicalSHA256":"0d2079d4f879271f759332da6b42f502e8c8ba981ab5239d6c7a298203562506","file":"painted/bremen/safety/edge-coverage-data.ts","occurrence":0,"codec":"json"} as const;
export function getEDGE_COVERAGE_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for EDGE_COVERAGE_DATA');return (scope.borrow<any,any>(EDGE_COVERAGE_DATA_RESOURCE,value=>value));}
