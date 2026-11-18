type Box=readonly[number,number,number,number];
export function createCertifiedGeographicBox(input:Readonly<{origin:readonly[number,number];scale:number;baseY:number;RAD:number;PI_DOUBLE:number}>):(box:readonly number[])=>Box|undefined;
