import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const EUROPAHAFENKOPF70_SHA="9395db16785881813bb5c4b2362375d35fead6ee653a613d18792c07f6c57a51";
export const EUROPAHAFENKOPF70_DATA_RESOURCE={"canonicalSHA256":"9395db16785881813bb5c4b2362375d35fead6ee653a613d18792c07f6c57a51","file":"painted/bremen/safety/europahafenkopf70-data.ts","occurrence":0,"codec":"json"} as const;
export function getEUROPAHAFENKOPF70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for EUROPAHAFENKOPF70_DATA');return (scope.borrow<any,any>(EUROPAHAFENKOPF70_DATA_RESOURCE,value=>value));}
