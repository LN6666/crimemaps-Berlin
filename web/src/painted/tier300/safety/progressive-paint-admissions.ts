import {frozenPaintTableRowCounts} from '../../../safety/frozen-paint-tables';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {ProgressiveAdmission} from './progressive-paint';
export const PROGRESSIVE_INPUT_SHA='ab07a37cd2caf09ad39126521c9331779ceea67b9524c9ccdbc7318c9d324932';
export const PROGRESSIVE_ADMISSIONS_RESOURCE:FrozenDataRef=Object.freeze({canonicalSHA256:PROGRESSIVE_INPUT_SHA,file:'painted/tier300/safety/progressive-paint-admissions.ts',occurrence:0,codec:'json'});
export function getPROGRESSIVE_ADMISSIONS(scope:FrozenDataScope):readonly ProgressiveAdmission[]{if(!scope)throw Error('Tier300 admissions require a prepared FrozenDataScope');return scope.borrow<readonly ProgressiveAdmission[],readonly ProgressiveAdmission[]>(PROGRESSIVE_ADMISSIONS_RESOURCE,rows=>rows);}
export function getPROGRESSIVE_ADMISSION_COUNTS(scope?:FrozenDataScope){const counts=frozenPaintTableRowCounts(PROGRESSIVE_INPUT_SHA,'painted/tier300/safety/progressive-paint-admissions.ts',0);if(counts.city!==undefined)return counts;if(!scope)return undefined;const count=getPROGRESSIVE_ADMISSIONS(scope).length;return{global:count,retained:count,city:undefined};}
