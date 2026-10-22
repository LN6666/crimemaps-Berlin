import {readFrozenTable} from '../../../safety/frozen-paint-tables';
// Explicit derived-only request. Not a native BuildingComponent and not a SOURCE getter.
export type F082Batch={positions:number[];normals:number[];indices:number[];color:number[];frames:number[];paint:number[];writeMask:boolean[];role:number;geometryRole:string;sourceEvidence:string};
export type F082DerivedRequest={displayOnlyId:string;city:string;family:number;patchSHA256:string;origin:[number,number];referenceFootprint:{type:string;coordinates:number[][][]};referenceOriginalWay:string;sourceNativeGetterCount:number;sourceNativeGetters:never[];nativeSurfaceClaim:boolean;sourceArraysModified:boolean;geometryRole:string;originalSource:unknown;batches:F082Batch[];displayEstimates:Record<string,unknown>};
export const F082_DERIVED_PACK:F082DerivedRequest=readFrozenTable("91d0186a3537a5a37652b2131dd9d4967128f38f2f208b3a86a9aa45f196bf34");
export function getF082DerivedDisplayRequest(city:string):F082DerivedRequest|null{if(city!=="munich")return null;return structuredClone(F082_DERIVED_PACK);}
