import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const F260_ACCEPTED_RESTORE_SHA="8d40ec6862cdfdf644e66571205506114f4af870a097e51e4ffba18947bea186";
export const F260_ACCEPTED_RESTORE_DATA_RESOURCE={"canonicalSHA256":"8d40ec6862cdfdf644e66571205506114f4af870a097e51e4ffba18947bea186","file":"painted/bremen/safety/f260-accepted-restore-data.ts","occurrence":0,"codec":"json"} as const;
export function getF260_ACCEPTED_RESTORE_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for F260_ACCEPTED_RESTORE_DATA');return (scope.borrow<any,any>(F260_ACCEPTED_RESTORE_DATA_RESOURCE,value=>value));}
