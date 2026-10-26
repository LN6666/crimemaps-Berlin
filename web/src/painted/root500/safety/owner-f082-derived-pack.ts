import {repositoryCity} from '../../../safety/deployment';
import {readFrozenTableAsync} from '../../../safety/frozen-paint-tables';
// Explicit derived-only request. Not a native BuildingComponent and not a SOURCE getter.
export type F082Batch={positions:number[];normals:number[];indices:number[];color:number[];frames:number[];paint:number[];writeMask:boolean[];role:number;geometryRole:string;sourceEvidence:string};
export type F082DerivedRequest={displayOnlyId:string;city:string;family:number;patchSHA256:string;origin:[number,number];referenceFootprint:{type:string;coordinates:number[][][]};referenceOriginalWay:string;sourceNativeGetterCount:number;sourceNativeGetters:never[];nativeSurfaceClaim:boolean;sourceArraysModified:boolean;geometryRole:string;originalSource:unknown;batches:F082Batch[];displayEstimates:Record<string,unknown>};
// Small identity metadata is available without parsing a foreign city's model.
export const F082_DERIVED_HEADER={displayOnlyId:'derived/f082/schloss-lustheim/original-way-23152070',patchSHA256:'781ebaeb245e97318dfa35c06dcceb15c9c0545c45093d3e3a8ffec0e84144b9'} as const;
export const F082_DERIVED_PACK:F082DerivedRequest|null=repositoryCity==='munich'?(await readFrozenTableAsync("91d0186a3537a5a37652b2131dd9d4967128f38f2f208b3a86a9aa45f196bf34","painted/root500/safety/owner-f082-derived-pack.ts",0)):null;
if(F082_DERIVED_PACK&&(F082_DERIVED_PACK.displayOnlyId!==F082_DERIVED_HEADER.displayOnlyId||F082_DERIVED_PACK.patchSHA256!==F082_DERIVED_HEADER.patchSHA256))throw Error('F082 derived identity header mismatch');
export function getF082DerivedDisplayRequest(city:string):F082DerivedRequest|null{if(city!=="munich"||!F082_DERIVED_PACK)return null;return structuredClone(F082_DERIVED_PACK);}
