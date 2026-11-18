type Box=readonly[number,number,number,number];
export function analyzeIntervalSubdivision(boundary:Readonly<{covers:(box:Box)=>boolean}>,geographic:(box:readonly number[])=>Box|undefined,points:readonly number[]):Readonly<{allBoxesCovered:boolean;geographicProjectionCertified?:boolean;visits:number;reason:string}>;
