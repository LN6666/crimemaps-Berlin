import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';

// Explicit derived-only request. Not a native BuildingComponent and not a SOURCE getter.
export type F068Batch={positions:number[];normals:number[];indices:number[];color:number[];frames:number[];paint:number[];writeMask:boolean[];role:number;geometryRole:string;sourceEvidence:string};
export type F068DerivedRequest={displayOnlyId:string;city:string;family:number;patchSHA256:string;origin:[number,number];referenceFootprint:{type:string;coordinates:number[][][]};referenceOriginalRelation:string;sourceNativeGetterCount:number;sourceNativeGetters:never[];nativeSurfaceClaim:boolean;sourceArraysModified:boolean;geometryRole:string;originalSource:unknown;batches:F068Batch[];displayEstimates:Record<string,unknown>};

export function getF068DerivedDisplayRequest(city:string,scope?:FrozenDataScope):F068DerivedRequest|null{if(city!=='munich')return null;return structuredClone(getRoot500Data(scope).F068_DERIVED_PACK);}

type Root500ResourceValue=F068DerivedRequest;
export const root500DataRefs=[{canonicalSHA256:"aa0b0665414590b08a88a1b59ad2dc1b01873bcc794353575b57a76d888356c4",file:"painted/root500/safety/owner-f068-derived-pack.ts",occurrence:0,codec:'json'}] as const satisfies readonly FrozenDataRef[];
const root500DataKey=Object.freeze({});
export const root500DataFunctionArities={getF068DerivedDisplayRequest:1} as const;
export function mayMatchRoot500Data(components:readonly {city?:string}[]){return components.some(c=>c.city==='munich');}
export async function prepareRoot500Data(components:readonly {city?:string}[],signal:AbortSignal,scope:FrozenDataScope){signal.throwIfAborted();if(!mayMatchRoot500Data(components))return;await scope.prepare(root500DataRefs,signal);signal.throwIfAborted();getRoot500Data(scope);}
export function getRoot500Data(scope?:FrozenDataScope){if(!scope)throw Error("owner-f068-derived-pack requires a prepared FrozenDataScope");return scope.memo(root500DataKey,()=>{
 const F068_DERIVED_PACK=scope.borrow<unknown,Root500ResourceValue>(root500DataRefs[0],value=>value as Root500ResourceValue);


 if(F068_DERIVED_PACK.displayOnlyId!==F068_DERIVED_HEADER.displayOnlyId||F068_DERIVED_PACK.patchSHA256!==F068_DERIVED_HEADER.patchSHA256||F068_DERIVED_PACK.city!==F068_DERIVED_HEADER.city)throw Error('F068 derived identity header mismatch');
 return{F068_DERIVED_PACK};
});}

/** Hash-bound cold identity only; source aa0b0665414590b08a88a1b59ad2dc1b01873bcc794353575b57a76d888356c4. */
export const F068_DERIVED_HEADER={"displayOnlyId":"derived/f068/neue-pinakothek/original-relation-1644123","patchSHA256":"3f0fcf5af0b52659efe634a6573cde4c4ea68e632794a51c6e6af55cdec014c2","city":"munich"} as const;
