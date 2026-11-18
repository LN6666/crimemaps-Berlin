import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import {repositoryCity} from '../../../safety/deployment';

// Explicit derived-only request. Not a native BuildingComponent and not a SOURCE getter.
export type F082Batch={positions:number[];normals:number[];indices:number[];color:number[];frames:number[];paint:number[];writeMask:boolean[];role:number;geometryRole:string;sourceEvidence:string};
export type F082DerivedRequest={displayOnlyId:string;city:string;family:number;patchSHA256:string;origin:[number,number];referenceFootprint:{type:string;coordinates:number[][][]};referenceOriginalWay:string;sourceNativeGetterCount:number;sourceNativeGetters:never[];nativeSurfaceClaim:boolean;sourceArraysModified:boolean;geometryRole:string;originalSource:unknown;batches:F082Batch[];displayEstimates:Record<string,unknown>};
// Small identity metadata is available without parsing a foreign city's model.
export const F082_DERIVED_HEADER={displayOnlyId:'derived/f082/schloss-lustheim/original-way-23152070',patchSHA256:'781ebaeb245e97318dfa35c06dcceb15c9c0545c45093d3e3a8ffec0e84144b9'} as const;


export function getF082DerivedDisplayRequest(city:string,scope?:FrozenDataScope):F082DerivedRequest|null{if(city!=="munich"||repositoryCity!=='munich')return null;return structuredClone(getRoot500Data(scope).F082_DERIVED_PACK);}

type Root500ResourceValue=F082DerivedRequest|null;
export const root500DataRefs=[{canonicalSHA256:"91d0186a3537a5a37652b2131dd9d4967128f38f2f208b3a86a9aa45f196bf34",file:"painted/root500/safety/owner-f082-derived-pack.ts",occurrence:0,codec:'json'}] as const satisfies readonly FrozenDataRef[];
const root500DataKey=Object.freeze({});
export const root500DataFunctionArities={getF082DerivedDisplayRequest:1} as const;
export function mayMatchRoot500Data(components:readonly {city?:string}[]){return components.some(c=>c.city==='munich')&&repositoryCity==='munich';}
export async function prepareRoot500Data(components:readonly {city?:string}[],signal:AbortSignal,scope:FrozenDataScope){signal.throwIfAborted();if(!mayMatchRoot500Data(components))return;await scope.prepare(root500DataRefs,signal);signal.throwIfAborted();getRoot500Data(scope);}
export function getRoot500Data(scope?:FrozenDataScope){if(repositoryCity!=='munich')return{F082_DERIVED_PACK:null};if(!scope)throw Error("owner-f082-derived-pack requires a prepared FrozenDataScope");return scope.memo(root500DataKey,()=>{
 const F082_DERIVED_PACK=scope.borrow<unknown,Root500ResourceValue>(root500DataRefs[0],value=>value as Root500ResourceValue);
 if(F082_DERIVED_PACK&&(F082_DERIVED_PACK.displayOnlyId!==F082_DERIVED_HEADER.displayOnlyId||F082_DERIVED_PACK.patchSHA256!==F082_DERIVED_HEADER.patchSHA256))throw Error('F082 derived identity header mismatch');

 return{F082_DERIVED_PACK};
});}
