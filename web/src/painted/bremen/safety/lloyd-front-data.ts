import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const LLOYD_FRONT_SHA="4a733773715c075aeaa92a6ce9de1e486577be95770bb4a40f147f03bd1a3699";
export const LLOYD_FRONT_DATA_RESOURCE={"canonicalSHA256":"4a733773715c075aeaa92a6ce9de1e486577be95770bb4a40f147f03bd1a3699","file":"painted/bremen/safety/lloyd-front-data.ts","occurrence":0,"codec":"json"} as const;
export function getLLOYD_FRONT_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for LLOYD_FRONT_DATA');return (scope.borrow<any,any>(LLOYD_FRONT_DATA_RESOURCE,value=>value));}
