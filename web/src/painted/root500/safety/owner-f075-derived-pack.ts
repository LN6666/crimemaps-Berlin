import {readFrozenTable} from '../../../safety/frozen-paint-tables';
// Explicit derived-only request. Not a native BuildingComponent and not a SOURCE getter.
export type F075Batch={positions:number[];normals:number[];indices:number[];color:number[];frames:number[];paint:number[];writeMask:boolean[];role:number;geometryRole:string;sourceEvidence:string};
export type F075DerivedRequest={displayOnlyId:string;city:string;family:number;patchSHA256:string;origin:[number,number];referenceFootprint:{type:string;coordinates:number[][][]};referenceOriginalRelation:string;sourceNativeGetterCount:number;sourceNativeGetters:never[];nativeSurfaceClaim:boolean;sourceArraysModified:boolean;geometryRole:string;originalSource:unknown;batches:F075Batch[];displayEstimates:Record<string,unknown>};
export const F075_DERIVED_PACK:F075DerivedRequest=readFrozenTable("a949900a993f60bf6f25e8d68e32c6be6bab10b0143174fb4ee84e8bd5ec400f");
export function getF075DerivedDisplayRequest(city:string):F075DerivedRequest|null{if(city!=="munich")return null;return structuredClone(F075_DERIVED_PACK);}
