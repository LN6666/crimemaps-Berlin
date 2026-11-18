import type {BuildingComponent,Identity,MeshBatch} from '../../../safety/building-mesh-types';
import {F033_IDS,ownerF033Identity} from './owner-f033-identities';
export {F033_IDS,ownerF033Identity} from './owner-f033-identities';
type Batch=MeshBatch&{positions:number[];normals:number[];indices:number[];color:number[];frames:number[];paint:number[];writeMask:boolean[];role:number;geometryRole?:string;sourceEvidence?:string};
export const F033_RECONSTRUCTION_SHA="6e9b72aedf1cf42b6ad87ad953e40349373584058ab68e18441f1db2380be7e4";
export function ownerF033BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='berlin'&&ownerF033Identity(c)&&!!c.displayEstimates?.F033Exterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){const a=b as Batch;for(let j=0;j<count;j++)if(a.writeMask[j]){paint.set(a.paint.slice(j*4,j*4+4),4*(offset+j));frames.set(a.frames.slice(j*5,j*5+5),5*(offset+j));vertices++;}}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
