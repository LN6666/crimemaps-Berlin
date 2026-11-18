import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const OFFICE7A_CONTOUR_DATA_RESOURCE={"canonicalSHA256":"1a39115e9e9245ab1e27fe841b927cf6bc3c8164894e7069b15ffad0393e5d89","file":"painted/bremen/safety/office7a-contour-data.ts","occurrence":0,"codec":"json"} as const;
export function getOFFICE7A_CONTOUR_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for OFFICE7A_CONTOUR_DATA');return (scope.borrow<any,any>(OFFICE7A_CONTOUR_DATA_RESOURCE,value=>value));}
export const OFFICE7A_CONTOUR_SHA="1a39115e9e9245ab1e27fe841b927cf6bc3c8164894e7069b15ffad0393e5d89";
