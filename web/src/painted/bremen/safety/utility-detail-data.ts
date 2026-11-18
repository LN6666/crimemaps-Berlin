import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const UTILITY_DETAIL_DATA_RESOURCE={"canonicalSHA256":"40fb41923c0b602e80ea48e3fcbd944f4814c1d23873eadf77283ca84908a934","file":"painted/bremen/safety/utility-detail-data.ts","occurrence":0,"codec":"json"} as const;
export function getUTILITY_DETAIL_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for UTILITY_DETAIL_DATA');return (scope.borrow<any,any>(UTILITY_DETAIL_DATA_RESOURCE,value=>value));}
export const UTILITY_DETAIL_SHA="40fb41923c0b602e80ea48e3fcbd944f4814c1d23873eadf77283ca84908a934";
