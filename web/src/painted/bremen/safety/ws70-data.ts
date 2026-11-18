import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const WS70_SHA="45e7758d7b7369af6703b81bb9814d18548ff88de5f8e2ddaa41b652ebbe579f";
export const WS70_DATA_RESOURCE={"canonicalSHA256":"45e7758d7b7369af6703b81bb9814d18548ff88de5f8e2ddaa41b652ebbe579f","file":"painted/bremen/safety/ws70-data.ts","occurrence":0,"codec":"json"} as const;
export function getWS70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for WS70_DATA');return (scope.borrow<any,any>(WS70_DATA_RESOURCE,value=>value));}
