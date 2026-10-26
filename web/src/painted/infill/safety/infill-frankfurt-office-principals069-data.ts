import {readFrozenTableAsync} from '../../../safety/frozen-paint-tables';
type OfficeSurfaceFrame069={batchIndex:number;firstVertex:number;vertexCount:number;family:number;uAxis:number[];vAxis:number[];uOrigin:number;vOrigin:number;width:number;height:number};
export type OfficeNativeRow069={city:string;objectId:string;partId:string;name:string;origin:number[];componentGeometry:unknown;sourceFeature:unknown;signature:string;vertexCount:number;indexCount:number;batches:{positions:number[];normals:number[];indices:number[];color:number[];faceRole:string|null}[];admission:{surfaceFrames:OfficeSurfaceFrame069[]}};
export const FRANKFURT_OFFICE_PRINCIPALS_SHA069="7b61d50df767ddae85d0d124917eb18062824d1c33c3256be82f0cca42d35883";
export const FRANKFURT_OFFICE_PRINCIPALS_DATA069:OfficeNativeRow069[]=(await readFrozenTableAsync("105cec6479b4f08a501732b22abf2476db0aeabbfb8fb19431b8ff8c19f026f1","painted/infill/safety/infill-frankfurt-office-principals069-data.ts",0));
