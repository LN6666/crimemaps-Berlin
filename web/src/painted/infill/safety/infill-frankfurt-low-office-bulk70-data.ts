import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {BULK70_IDENTITY_GROUPS} from './infill-frankfurt-low-office-bulk70-identities';
export {LOW_OFFICE_SHA} from './infill-frankfurt-low-office-bulk70-metadata';


const infillDataMemoKey=Object.freeze({});
const infillDemandMemoKey=Object.freeze({});
type BulkDemand={groups:readonly string[]|undefined};
const demandFor=(scope:FrozenDataScope)=>scope.memo<BulkDemand>(infillDemandMemoKey,()=>({groups:undefined}));
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"579c18a51df9cc16083ff4de6ca02e456692fefb5ce869bdee36b3a0fa63d66e",file:"painted/infill/safety/infill-frankfurt-low-office-bulk70-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey,infillDemandMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-low-office-bulk70-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_LOW_OFFICE_DATA=scopedInfillValue<any>(()=>{
 const groups=demandFor(scope).groups;
 scope.assertSelection(infillOwnDataRefs[0],groups??[]);
 return scope.borrow<any,any>(infillOwnDataRefs[0],value=>groups===undefined?value:{...value,groups:value.groups.filter((group:any)=>groups.includes(group.queueId))});
});

return {get LOW_OFFICE_DATA(){return __infillRead_LOW_OFFICE_DATA();}};
});}
export function getLOW_OFFICE_DATA(scope:FrozenDataScope|undefined){return getInfillData(scope).LOW_OFFICE_DATA;}
export const infillDataFunctionArities={"getLOW_OFFICE_DATA":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Select whole authored groups before any memoized reconstruction observes
 * them. The scope rejects later widening; each new view owns a new plan. */
export async function prepareInfillData(components:readonly {city?:string;objectId:string;partId:string}[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();
 const identities=new Set(components.filter(c=>c.city==='frankfurt').map(c=>JSON.stringify([c.objectId,c.partId])));
 const groups=BULK70_IDENTITY_GROUPS.filter(group=>group.identities.some(row=>identities.has(JSON.stringify([row.objectId,row.partId])))).map(group=>group.queueId);
 await scope.prepareSelection(infillOwnDataRefs[0],groups,signal);signal.throwIfAborted();
 const demand=demandFor(scope);demand.groups??=groups;
}

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
