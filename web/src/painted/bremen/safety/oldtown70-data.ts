import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const BREMEN_OLDTOWN70_DATA_RESOURCE={"canonicalSHA256":"ef6445aecf74f314b2138f17dd415b507514d177476d3df2c992f4410a40d8ad","file":"painted/bremen/safety/oldtown70-data.ts","occurrence":0,"codec":"json"} as const;
export function getBREMEN_OLDTOWN70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for BREMEN_OLDTOWN70_DATA');return (scope.borrow<any,any>(BREMEN_OLDTOWN70_DATA_RESOURCE,value=>value));}
export const BREMEN_OLDTOWN70_SHA="ef6445aecf74f314b2138f17dd415b507514d177476d3df2c992f4410a40d8ad";
