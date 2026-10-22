import {readFrozenTable} from '../../../safety/frozen-paint-tables';
// Explicit derived-only request. Not a native BuildingComponent and not a SOURCE getter.
export type F068Batch={positions:number[];normals:number[];indices:number[];color:number[];frames:number[];paint:number[];writeMask:boolean[];role:number;geometryRole:string;sourceEvidence:string};
export type F068DerivedRequest={displayOnlyId:string;city:string;family:number;patchSHA256:string;origin:[number,number];referenceFootprint:{type:string;coordinates:number[][][]};referenceOriginalRelation:string;sourceNativeGetterCount:number;sourceNativeGetters:never[];nativeSurfaceClaim:boolean;sourceArraysModified:boolean;geometryRole:string;originalSource:unknown;batches:F068Batch[];displayEstimates:Record<string,unknown>};
export const F068_DERIVED_PACK:F068DerivedRequest=readFrozenTable("aa0b0665414590b08a88a1b59ad2dc1b01873bcc794353575b57a76d888356c4");
export function getF068DerivedDisplayRequest(city:string):F068DerivedRequest|null{if(city!=='munich')return null;return structuredClone(F068_DERIVED_PACK);}
