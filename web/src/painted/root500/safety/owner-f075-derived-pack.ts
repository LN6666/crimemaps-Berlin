import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';

// Explicit derived-only request. Not a native BuildingComponent and not a SOURCE getter.
export type F075Batch={positions:number[];normals:number[];indices:number[];color:number[];frames:number[];paint:number[];writeMask:boolean[];role:number;geometryRole:string;sourceEvidence:string};
export type F075DerivedRequest={displayOnlyId:string;city:string;family:number;patchSHA256:string;origin:[number,number];referenceFootprint:{type:string;coordinates:number[][][]};referenceOriginalRelation:string;sourceNativeGetterCount:number;sourceNativeGetters:never[];nativeSurfaceClaim:boolean;sourceArraysModified:boolean;geometryRole:string;originalSource:unknown;batches:F075Batch[];displayEstimates:Record<string,unknown>};

export function getF075DerivedDisplayRequest(city:string,scope?:FrozenDataScope):F075DerivedRequest|null{if(city!=="munich")return null;return structuredClone(getRoot500Data(scope).F075_DERIVED_PACK);}

type Root500ResourceValue=F075DerivedRequest;
export const root500DataRefs=[{canonicalSHA256:"a949900a993f60bf6f25e8d68e32c6be6bab10b0143174fb4ee84e8bd5ec400f",file:"painted/root500/safety/owner-f075-derived-pack.ts",occurrence:0,codec:'json'}] as const satisfies readonly FrozenDataRef[];
const root500DataKey=Object.freeze({});
export const root500DataFunctionArities={getF075DerivedDisplayRequest:1} as const;
export function mayMatchRoot500Data(components:readonly {city?:string}[]){return components.some(c=>c.city==='munich');}
export async function prepareRoot500Data(components:readonly {city?:string}[],signal:AbortSignal,scope:FrozenDataScope){signal.throwIfAborted();if(!mayMatchRoot500Data(components))return;await scope.prepare(root500DataRefs,signal);signal.throwIfAborted();getRoot500Data(scope);}
export function getRoot500Data(scope?:FrozenDataScope){if(!scope)throw Error("owner-f075-derived-pack requires a prepared FrozenDataScope");return scope.memo(root500DataKey,()=>{
 const F075_DERIVED_PACK=scope.borrow<unknown,Root500ResourceValue>(root500DataRefs[0],value=>value as Root500ResourceValue);


 if(F075_DERIVED_PACK.displayOnlyId!==F075_DERIVED_HEADER.displayOnlyId||F075_DERIVED_PACK.patchSHA256!==F075_DERIVED_HEADER.patchSHA256||F075_DERIVED_PACK.city!==F075_DERIVED_HEADER.city)throw Error('F075 derived identity header mismatch');
 return{F075_DERIVED_PACK};
});}

/** Hash-bound cold identity only; source a949900a993f60bf6f25e8d68e32c6be6bab10b0143174fb4ee84e8bd5ec400f. */
export const F075_DERIVED_HEADER={"displayOnlyId":"derived/f075/altes-schloss-schleissheim/original-relation-87558","patchSHA256":"373bd964430fb0a0a3bf66582bd7e18a5e64c1e63e35d89f5da1339482b83039","city":"munich"} as const;
