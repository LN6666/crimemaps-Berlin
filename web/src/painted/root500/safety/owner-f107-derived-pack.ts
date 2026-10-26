import {readFrozenTableAsync} from '../../../safety/frozen-paint-tables';
// Explicit derived-only request. Not a native BuildingComponent and not a SOURCE getter.
export type F107Batch={positions:number[];normals:number[];indices:number[];color:number[];frames:number[];paint:number[];writeMask:boolean[];role:number;geometryRole:string;sourceEvidence:string};
export type F107DerivedRequest={displayOnlyId:string;city:string;family:number;patchSHA256:string;origin:[number,number];referenceFootprint:{type:string;coordinates:number[][][]};referenceOriginalRelation:string;sourceNativeGetterCount:number;sourceNativeGetters:never[];nativeSurfaceClaim:boolean;sourceArraysModified:boolean;geometryRole:string;originalSource:unknown;batches:F107Batch[];displayEstimates:Record<string,unknown>};
export const F107_DERIVED_PACK:F107DerivedRequest=(await readFrozenTableAsync("b77082bd9590550ecba2aa0010cbf65bf29bdbec00ca904119f3df6d9bfb223b","painted/root500/safety/owner-f107-derived-pack.ts",0));
export function getF107DerivedDisplayRequest(city:string):F107DerivedRequest|null{if(city!=="munich")return null;return structuredClone(F107_DERIVED_PACK);}
