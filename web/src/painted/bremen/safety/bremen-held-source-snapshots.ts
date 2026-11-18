import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const BREMEN_REPAIR_SOURCE_SNAPSHOTS_RESOURCE={"canonicalSHA256":"632ad739a017e77124bb28433fb72f756bdb6b24787967ca618a3f26f6c04a57","file":"painted/bremen/safety/bremen-held-source-snapshots.ts","occurrence":0,"codec":"json"} as const;
export function getBREMEN_REPAIR_SOURCE_SNAPSHOTS(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for BREMEN_REPAIR_SOURCE_SNAPSHOTS');return (scope.borrow<any,any>(BREMEN_REPAIR_SOURCE_SNAPSHOTS_RESOURCE,value=>value));}
