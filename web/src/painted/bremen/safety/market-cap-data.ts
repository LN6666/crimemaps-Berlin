import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const MARKET_CAP_SHA="2dcf01a1cc61e7b4d5b26aa4f7dfac1bcb58e6ed36011fae2b169f68c4adae43";
export const MARKET_CAP_DATA_RESOURCE={"canonicalSHA256":"2dcf01a1cc61e7b4d5b26aa4f7dfac1bcb58e6ed36011fae2b169f68c4adae43","file":"painted/bremen/safety/market-cap-data.ts","occurrence":0,"codec":"json"} as const;
export function getMARKET_CAP_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for MARKET_CAP_DATA');return (scope.borrow<any,any>(MARKET_CAP_DATA_RESOURCE,value=>value));}
