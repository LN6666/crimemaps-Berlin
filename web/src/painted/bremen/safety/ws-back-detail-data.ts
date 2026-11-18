import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const WS_BACK_DETAIL_SHA="73e65f16971ed68a9255b738d56de1f311b664e54ee154aa82f8354c994c74f8";
export const WS_BACK_DETAIL_DATA_RESOURCE={"canonicalSHA256":"73e65f16971ed68a9255b738d56de1f311b664e54ee154aa82f8354c994c74f8","file":"painted/bremen/safety/ws-back-detail-data.ts","occurrence":0,"codec":"json"} as const;
export function getWS_BACK_DETAIL_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for WS_BACK_DETAIL_DATA');return (scope.borrow<any,any>(WS_BACK_DETAIL_DATA_RESOURCE,value=>value));}
