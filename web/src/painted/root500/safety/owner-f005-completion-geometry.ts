import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';

export function getF005_COMPLETION_BATCH($scope?:FrozenDataScope){return getRoot500Data($scope).F005_COMPLETION_BATCH;}
const __root500MemoKey={};
const __root500Demand:readonly {objectId:string;partId:string|null}[]=[];
const __root500OwnRefs:readonly FrozenDataRef[]=[{"canonicalSHA256":"c19e221e213e99735f1fc13263d8c03fb18a3fbcc21c6b2f6f5b4c9f195f3569","file":"painted/root500/safety/owner-f005-completion-geometry.ts","occurrence":0,"codec":"json"}];
export const root500DataRefs:readonly FrozenDataRef[]=[...__root500OwnRefs];
export const root500DataFunctionArities:Record<string,number>={};
export function mayMatchRoot500Data(components:readonly {city:string;objectId?:string;partId?:string;origin?:readonly number[]}[]){return components.length>0;}
export async function prepareRoot500Data(components:readonly {city:string;objectId?:string;partId?:string;origin?:readonly number[]}[],signal:AbortSignal,scope:FrozenDataScope){signal.throwIfAborted();if(mayMatchRoot500Data(components))await scope.prepare(root500DataRefs,signal);}
export function getRoot500Data(scope?:FrozenDataScope){if(!scope)throw Error('owner-f005-completion-geometry.ts requires a prepared FrozenDataScope');return scope.memo(__root500MemoKey,()=>{

const F005_COMPLETION_BATCH=(scope.borrow<any,any>(__root500OwnRefs[0],value=>value)) as {"color":[number,number,number];"frames":Array<number>;"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;"role":number;"triangleCount":number;"vertexCount":number;"writeMask":Array<boolean>;};
return {F005_COMPLETION_BATCH};
});}
