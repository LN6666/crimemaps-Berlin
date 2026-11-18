import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const BREMEN_OLDTOWN_CHURCHES_SHA="8a1fa75e91344bc55c4e77f2852f626d15d8251d11feb572b5b48ad18e35e203";
export const BREMEN_OLDTOWN_CHURCHES_DATA_RESOURCE={"canonicalSHA256":"8a1fa75e91344bc55c4e77f2852f626d15d8251d11feb572b5b48ad18e35e203","file":"painted/bremen/safety/churches-data.ts","occurrence":0,"codec":"json"} as const;
export function getBREMEN_OLDTOWN_CHURCHES_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for BREMEN_OLDTOWN_CHURCHES_DATA');return (scope.borrow<any,any>(BREMEN_OLDTOWN_CHURCHES_DATA_RESOURCE,value=>value));}
