import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';

// Explicit derived-only request. Not a native BuildingComponent and not a SOURCE getter.
export type F107Batch={positions:number[];normals:number[];indices:number[];color:number[];frames:number[];paint:number[];writeMask:boolean[];role:number;geometryRole:string;sourceEvidence:string};
export type F107DerivedRequest={displayOnlyId:string;city:string;family:number;patchSHA256:string;origin:[number,number];referenceFootprint:{type:string;coordinates:number[][][]};referenceOriginalRelation:string;sourceNativeGetterCount:number;sourceNativeGetters:never[];nativeSurfaceClaim:boolean;sourceArraysModified:boolean;geometryRole:string;originalSource:unknown;batches:F107Batch[];displayEstimates:Record<string,unknown>};

export function getF107DerivedDisplayRequest(city:string,scope?:FrozenDataScope):F107DerivedRequest|null{if(city!=="munich")return null;return structuredClone(getRoot500Data(scope).F107_DERIVED_PACK);}

type Root500ResourceValue=F107DerivedRequest;
export const root500DataRefs=[{canonicalSHA256:"b77082bd9590550ecba2aa0010cbf65bf29bdbec00ca904119f3df6d9bfb223b",file:"painted/root500/safety/owner-f107-derived-pack.ts",occurrence:0,codec:'json'}] as const satisfies readonly FrozenDataRef[];
const root500DataKey=Object.freeze({});
export const root500DataFunctionArities={getF107DerivedDisplayRequest:1} as const;
export function mayMatchRoot500Data(components:readonly {city?:string}[]){return components.some(c=>c.city==='munich');}
export async function prepareRoot500Data(components:readonly {city?:string}[],signal:AbortSignal,scope:FrozenDataScope){signal.throwIfAborted();if(!mayMatchRoot500Data(components))return;await scope.prepare(root500DataRefs,signal);signal.throwIfAborted();getRoot500Data(scope);}
export function getRoot500Data(scope?:FrozenDataScope){if(!scope)throw Error("owner-f107-derived-pack requires a prepared FrozenDataScope");return scope.memo(root500DataKey,()=>{
 const F107_DERIVED_PACK=scope.borrow<unknown,Root500ResourceValue>(root500DataRefs[0],value=>value as Root500ResourceValue);


 if(F107_DERIVED_PACK.displayOnlyId!==F107_DERIVED_HEADER.displayOnlyId||F107_DERIVED_PACK.patchSHA256!==F107_DERIVED_HEADER.patchSHA256||F107_DERIVED_PACK.city!==F107_DERIVED_HEADER.city)throw Error('F107 derived identity header mismatch');
 return{F107_DERIVED_PACK};
});}

/** Hash-bound cold identity only; source b77082bd9590550ecba2aa0010cbf65bf29bdbec00ca904119f3df6d9bfb223b. */
export const F107_DERIVED_HEADER={"displayOnlyId":"derived/f107/neues-schloss-schleissheim/original-way-7920443","patchSHA256":"43f09cfed8d061a75168a3e48628182dd427ac8fa0d1a9eb02e24c9ddd2d915c","city":"munich"} as const;
