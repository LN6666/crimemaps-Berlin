import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const SCHOOL70_SHA="0d6a49af641b4936275262127bdd1d239a1d108496be8fbd6126e66a60dc05f9";
export const SCHOOL70_DATA_RESOURCE={"canonicalSHA256":"0d6a49af641b4936275262127bdd1d239a1d108496be8fbd6126e66a60dc05f9","file":"painted/bremen/safety/school70-data.ts","occurrence":0,"codec":"json"} as const;
export function getSCHOOL70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for SCHOOL70_DATA');return (scope.borrow<any,any>(SCHOOL70_DATA_RESOURCE,value=>value));}
