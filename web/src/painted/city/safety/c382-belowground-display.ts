import {C382_FIXTURE as F} from './c382-fixture';
import type {C318Component as C} from './c318-display';
type Context={city:string,indexSHA:string,sourcePBF:string,boundarySHA:string,sourceSnapshot:string,leafSHA:(c:C)=>string|undefined};
const eq=(a:ArrayLike<number>,b:ArrayLike<number>)=>a.length===b.length&&Array.from(b).every((v,i)=>a[i]===v);
export function c382BelowgroundDisplayRows<T extends C>(rows:readonly T[],x:Context):T[]{
 const gate=x.city==='munich'&&x.indexSHA===F.indexSHA&&x.sourcePBF===F.sourcePBF&&x.boundarySHA===F.boundarySHA&&x.sourceSnapshot===F.sourceSnapshot;
 if(!gate)return [...rows];
 return rows.filter(c=>!F.native.some(p=>c.city===p.city&&c.objectId===p.objectId&&c.partId===p.partId&&x.leafSHA(c)===p.proof.sourceSHA256&&eq(c.origin,p.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(p.componentGeometry)&&JSON.stringify(c.sourceFeature?.properties)===JSON.stringify(p.sourceFeature?.properties)&&c.sourceFeature?.properties?.layer==='-1'&&c.sourceFeature?.properties?.level==='-1'&&c.batches.length===p.batches.length&&c.batches.every((b,i)=>eq(b.positions,p.batches[i].positions)&&eq(b.normals,p.batches[i].normals)&&eq(b.indices,p.batches[i].indices)&&eq(b.color,p.batches[i].color))));
}
