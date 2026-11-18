import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const FLEMINGS70_SHA="4adf54b7d8947f77628a3a76054f3943ab910a26b5d1cfdf45bfbe44243407b8";
export const FLEMINGS70_DATA_RESOURCE={"canonicalSHA256":"4adf54b7d8947f77628a3a76054f3943ab910a26b5d1cfdf45bfbe44243407b8","file":"painted/bremen/safety/flemings70-data.ts","occurrence":0,"codec":"json"} as const;
export function getFLEMINGS70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for FLEMINGS70_DATA');return (scope.borrow<any,any>(FLEMINGS70_DATA_RESOURCE,value=>value));}
