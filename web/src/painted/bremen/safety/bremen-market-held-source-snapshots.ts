import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const BREMEN_MARKET_HELD_SOURCE_SNAPSHOTS_RESOURCE={"canonicalSHA256":"5ed07b348ef4ca342dcbcf8a56f8551e0a546aa803fb9fd9385e6d2072b06c63","file":"painted/bremen/safety/bremen-market-held-source-snapshots.ts","occurrence":0,"codec":"json"} as const;
export function getBREMEN_MARKET_HELD_SOURCE_SNAPSHOTS(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for BREMEN_MARKET_HELD_SOURCE_SNAPSHOTS');return (scope.borrow<any,any>(BREMEN_MARKET_HELD_SOURCE_SNAPSHOTS_RESOURCE,value=>value));}
