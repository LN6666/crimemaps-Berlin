/** Canonical building mesh data contracts. Kept separate from the renderer
 * implementation so source ingestion needs no city implementation/data graph. */
export type Identity={objectId:string;partId:string};
export type Polygon={type:'Polygon';coordinates:number[][][]};
export type SourceFeature={type:'Feature';geometry:unknown;properties:Record<string,unknown>|null;id?:unknown};
export type MeshBatch={positions:number[]|Float32Array;normals:number[]|Float32Array;indices:number[]|Uint32Array;color:number[]|Float32Array;faceRole?:'wall'|'roof'|'mixed';materialName?:string};
export type BuildingComponent=Identity&{city:string;origin:[number,number];componentGeometry:Polygon;sourceFeature:SourceFeature;batches:MeshBatch[];displayEstimates?:Record<string,unknown>};
