import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const EURO_GABLE_SHA="851e18fe7e916984621223e0e1afd0f35ab05bd21eed68c44668576bd5eb16ae";
export const EURO_GABLE_DATA_RESOURCE={"canonicalSHA256":"851e18fe7e916984621223e0e1afd0f35ab05bd21eed68c44668576bd5eb16ae","file":"painted/bremen/safety/euro-gable-data.ts","occurrence":0,"codec":"json"} as const;
export function getEURO_GABLE_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for EURO_GABLE_DATA');return (scope.borrow<any,any>(EURO_GABLE_DATA_RESOURCE,value=>value));}
