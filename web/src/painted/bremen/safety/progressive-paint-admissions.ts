import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const PROGRESSIVE_ADMISSIONS_RESOURCE={"canonicalSHA256":"d94bfab58ea8a0cecba91b0180cc362dc4f3e963c00b5a03dba0a56326afbe83","file":"painted/bremen/safety/progressive-paint-admissions.ts","occurrence":0,"codec":"json"} as const;
export function getPROGRESSIVE_ADMISSIONS(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for PROGRESSIVE_ADMISSIONS');return (scope.borrow<any,any>(PROGRESSIVE_ADMISSIONS_RESOURCE,value=>value)) as readonly import('./progressive-paint').ProgressiveAdmission[];}
export const PROGRESSIVE_INPUT_SHA="978fba4201ed4025234ef48c001a91ff20719951ed62197ab67b435c559becef";
