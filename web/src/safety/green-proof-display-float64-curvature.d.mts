import type {ResourceBudget} from './render-runtime/resource-budget';
type Box=readonly[number,number,number,number];
type Constants=Readonly<{origin:readonly[number,number];scale:number;baseY:number;RAD:number;PI_DOUBLE:number}>;
type Inputs=Readonly<{boundaryEdges:(box:readonly number[],visit:(ax:number,ay:number,bx:number,by:number)=>boolean)=>boolean;boundary:Readonly<{covers:(box:Box)=>boolean;vertices:number}>;constants:Constants;budget:ResourceBudget}>;
type ProofResult=Readonly<{accepted:boolean;reason:string;visits:number;maxDepth?:number;coverageQueries?:number;seriesIterations?:number;edgeCandidates?:number;sourceCoordinatesUnchanged?:true;sourceGeometryChanged?:false;ROOTAdoptionAuthorized?:false}>;
export const LIMITS:Readonly<{visits:4095;depth:18;coverageQueries:4095;seriesIterations:1441664;boundaryVertices:200000;reservationBytes:262144}>;
export function createDisplayFloat64CurvatureProof(inputs:Inputs):(points:readonly number[])=>ProofResult;
