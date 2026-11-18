import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const UTILITY70_DATA_RESOURCE={"canonicalSHA256":"9bf4e7e1d31589142b099f60054153bc39b65530beccb0bff45fb3e1f6178464","file":"painted/bremen/safety/utility-data.ts","occurrence":0,"codec":"json"} as const;
export function getUTILITY70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for UTILITY70_DATA');return (scope.borrow<any,any>(UTILITY70_DATA_RESOURCE,value=>value));}
export const UTILITY70_SHA="9bf4e7e1d31589142b099f60054153bc39b65530beccb0bff45fb3e1f6178464";
