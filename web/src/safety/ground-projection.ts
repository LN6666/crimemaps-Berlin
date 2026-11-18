import {createCertifiedGeographicBox} from './green-proof-geographic-interval.mjs';
type Box=readonly[number,number,number,number];
type Geographic=(box:readonly number[])=>Box;
type CertifiedGeographic=(box:readonly number[])=>Box|undefined;
type Context=Readonly<{boundarySHA256:string;certified:()=>CertifiedGeographic;constants:Readonly<{origin:readonly[number,number];scale:number;baseY:number;RAD:number;PI_DOUBLE:number}>}>;
const contexts=new WeakMap<Geographic,Context>(),SHA=/^[a-f0-9]{64}$/;
/** Own both callbacks and their exact constants; caller properties cannot grant
 * deeper proof. Importantly there is no type/runtime import of solar admission. */
export function createGroundProjection(origin:readonly[number,number],boundarySHA256?:string){
 const frozenOrigin=Object.freeze([origin[0],origin[1]] as const),RAD=Math.PI/180,R=6378137;
 const scale=R*Math.cos(frozenOrigin[1]*RAD),baseY=Math.log(Math.tan(Math.PI/4+frozenOrigin[1]*RAD/2));
 const geographic:Geographic=box=>[
  frozenOrigin[0]+box[0]/scale/RAD,(2*Math.atan(Math.exp(baseY+box[1]/scale))-Math.PI/2)/RAD,
  frozenOrigin[0]+box[2]/scale/RAD,(2*Math.atan(Math.exp(baseY+box[3]/scale))-Math.PI/2)/RAD];
 const local=(p:readonly number[])=>[
  Math.fround((p[0]-frozenOrigin[0])*RAD*scale),
  Math.fround((Math.log(Math.tan(Math.PI/4+p[1]*RAD/2))-baseY)*scale)];
 if(typeof boundarySHA256==='string'&&SHA.test(boundarySHA256)){
  if(frozenOrigin.every(Number.isFinite)&&Math.abs(frozenOrigin[0])<=180&&Math.abs(frozenOrigin[1])<=85&&scale>=1&&scale<=1e8&&baseY>=.7&&baseY<=2){
   const certified=()=>createCertifiedGeographicBox({origin:frozenOrigin,scale,baseY,RAD,PI_DOUBLE:Math.PI});
   contexts.set(geographic,Object.freeze({boundarySHA256,certified,constants:Object.freeze({origin:frozenOrigin,scale,baseY,RAD,PI_DOUBLE:Math.PI})}));
  }
 }
 return Object.freeze({origin:frozenOrigin,local,geographic});
}
export function certifiedGroundProjection(boundarySHA256:string,geographic:Geographic):(()=>CertifiedGeographic)|undefined{
 const found=contexts.get(geographic);return found?.boundarySHA256===boundarySHA256?found.certified:undefined;
}

/** Exact constants only for the internally registered callback and boundary. */
export function certifiedGroundProjectionConstants(boundarySHA256:string,geographic:Geographic){const found=contexts.get(geographic);return found?.boundarySHA256===boundarySHA256?found.constants:undefined;}
