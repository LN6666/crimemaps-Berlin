import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const BREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS_RESOURCE={"canonicalSHA256":"0a8625e86da19b078fed94bc1085ba5888b2a707272c10451a47bd868c5beb96","file":"painted/bremen/safety/bremen-extra-held-source-snapshots.ts","occurrence":0,"codec":"json"} as const;
export function getBREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for BREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS');return (scope.borrow<any,any>(BREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS_RESOURCE,value=>value));}
