import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const HBF_COURT_SHA="2411623fe8c003d280dbea5e4fdac410cdec34fb48a173a8e263d48fca160b14";
export const HBF_COURT_DATA_RESOURCE={"canonicalSHA256":"2411623fe8c003d280dbea5e4fdac410cdec34fb48a173a8e263d48fca160b14","file":"painted/bremen/safety/hbf-court-data.ts","occurrence":0,"codec":"json"} as const;
export function getHBF_COURT_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for HBF_COURT_DATA');return (scope.borrow<any,any>(HBF_COURT_DATA_RESOURCE,value=>value));}
