import {readFrozenTableAsync} from '../../../safety/frozen-paint-tables';
/** Exact original SOURCE pins and SOURCE-clipped official/photo DISPLAY. */
export type Groups144146Native073={objectId:string;partId:string;city:string;origin:[number,number];geometryJSON:string;sourceFeatureJSON:string;signature:string;fingerprint:string;vertices:number;indices:number;batches:{positions:number[];normals:number[];indices:number[];color:number[];faceRole:string|null}[]};
export type Groups144146Model073={objectId:string;partId:string;origin:[number,number];datumAbsoluteM:number;group:string;batches:{positions:number[];normals:number[];indices:number[];color:[number,number,number];paint:number[];frames:number[];faceRole:'mixed';geometryRole:string}[]};
export const FRANKFURT_GROUPS144146_SHA073="dbd96e4217bc72335414916fab50b3669af420cfa4c5e020137c60bd7ad752d1";
export const FRANKFURT_GROUPS144146_NATIVE073:Groups144146Native073[]=(await readFrozenTableAsync("bf14b4159a54ec060cb42fff468d2298982cfa02f7b8181dc88343559096c6ca","painted/infill/safety/frankfurt-groups144146-official073-data.ts",0));
export const FRANKFURT_GROUPS144146_DATA073:Groups144146Model073[]=(await readFrozenTableAsync("e4fd8288fc7fc75d46cdb7103bb677e50987b050911300d7e770369c36aef89e","painted/infill/safety/frankfurt-groups144146-official073-data.ts",0));
