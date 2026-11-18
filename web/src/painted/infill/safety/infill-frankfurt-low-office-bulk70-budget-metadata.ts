import {LOW_OFFICE_SHA} from './infill-frankfurt-low-office-bulk70-metadata';
import {BULK70_IDENTITY_GROUPS} from './infill-frankfurt-low-office-bulk70-identities';
/** Exact original preview-ready catalogue, extracted after a second explicitly authorized
 * SHA/length-verified decode. This is a finite budget witness, not geometry or heap size. */
export const BULK70_BUDGET_INPUT={rawSHA256:"579c18a51df9cc16083ff4de6ca02e456692fefb5ce869bdee36b3a0fa63d66e",rawBytes:48529632,orderedIdentitySHA256:"974d9d426c80bb4e9e379fba4b8792a1f919c7b220aa80038679d2353650231a"} as const;
export const BULK70_BUDGET_GROUP_INDICES:readonly number[]=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79];
export const INFILL_BULK_BUDGET_CATALOGUE=Object.freeze({patchSHA256:LOW_OFFICE_SHA,models:101,vertices:246916,indices:241476});
export const infillBulkBudgetIdentity=(component:{objectId:string;partId:string})=>BULK70_BUDGET_GROUP_INDICES.some(index=>BULK70_IDENTITY_GROUPS[index].identities.some(identity=>component.objectId===identity.objectId&&component.partId===identity.partId));
