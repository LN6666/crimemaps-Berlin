import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const KARSTADT70_DATA_RESOURCE={"canonicalSHA256":"0a1ca52b26563b9363eeb622396941f4ebdb3fc0336c7aa204f4381fd2d2f06a","file":"painted/bremen/safety/karstadt-data.ts","occurrence":0,"codec":"json"} as const;
export function getKARSTADT70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for KARSTADT70_DATA');return (scope.borrow<any,any>(KARSTADT70_DATA_RESOURCE,value=>value));}
export const KARSTADT70_SHA="0a1ca52b26563b9363eeb622396941f4ebdb3fc0336c7aa204f4381fd2d2f06a";
