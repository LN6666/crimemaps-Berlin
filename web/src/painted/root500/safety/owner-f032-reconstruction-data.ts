import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';

import type {MeshBatch} from '../../../safety/building-mesh-types';
export function getF032_RECONSTRUCTION_BATCHES($scope?:FrozenDataScope){return getRoot500Data($scope).F032_RECONSTRUCTION_BATCHES;}
const __root500MemoKey={};
const __root500Demand:readonly {objectId:string;partId:string|null}[]=[];
const __root500OwnRefs:readonly FrozenDataRef[]=[{"canonicalSHA256":"a1c9423283ad7b9db8cf778f22ba6d90b96b33f2a4be22cf0a3384bfc78c167e","file":"painted/root500/safety/owner-f032-reconstruction-data.ts","occurrence":0,"codec":"json"}];
export const root500DataRefs:readonly FrozenDataRef[]=[...__root500OwnRefs];
export const root500DataFunctionArities:Record<string,number>={};
export function mayMatchRoot500Data(components:readonly {city:string;objectId?:string;partId?:string;origin?:readonly number[]}[]){return components.length>0;}
export async function prepareRoot500Data(components:readonly {city:string;objectId?:string;partId?:string;origin?:readonly number[]}[],signal:AbortSignal,scope:FrozenDataScope){signal.throwIfAborted();if(mayMatchRoot500Data(components))await scope.prepare(root500DataRefs,signal);}
export function getRoot500Data(scope?:FrozenDataScope){if(!scope)throw Error('owner-f032-reconstruction-data.ts requires a prepared FrozenDataScope');return scope.memo(__root500MemoKey,()=>{

const F032_RECONSTRUCTION_BATCHES:MeshBatch[]=(scope.borrow<any,any>(__root500OwnRefs[0],value=>value));
return {F032_RECONSTRUCTION_BATCHES};
});}
