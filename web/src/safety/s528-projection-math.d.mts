import type {BuildingComponent} from './building-mesh-renderer';
export type ProjectionResult={optedIn:boolean;raw:BuildingComponent;render:BuildingComponent;rawSignature?:string;derivedSignature?:string;sourceLeafSHA256?:string;projection?:string};
export function makeAdapter(pins:readonly unknown[]):(c:BuildingComponent,context:{sourceLeafSHA256?:string;frozen?:boolean;hashBytes:(bytes:Uint8Array)=>string})=>ProjectionResult;
export function nativeSignature(c:BuildingComponent):string;
export function inverseGround(x:number,z:number,origin:number[]):{lon:number;lat:number;groundUpM:number;ellipsoidResidual:number};
