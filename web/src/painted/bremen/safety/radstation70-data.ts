import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const RADSTATION70_SHA="7ae3ecb975fc7cbcb35f3500c8ec6255dc804f012ce63c9635c266aae0c3acd4";
export const RADSTATION70_DATA_RESOURCE={"canonicalSHA256":"7ae3ecb975fc7cbcb35f3500c8ec6255dc804f012ce63c9635c266aae0c3acd4","file":"painted/bremen/safety/radstation70-data.ts","occurrence":0,"codec":"json"} as const;
export function getRADSTATION70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for RADSTATION70_DATA');return (scope.borrow<any,any>(RADSTATION70_DATA_RESOURCE,value=>value));}
