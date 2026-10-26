type Fixture=typeof import('./c358-fixture')['C358_FIXTURE'];
let F:Fixture|undefined;
/** The existing visible-shard loader prepares this one exact owner's material
 * table before its synchronous binding/paint calls. Other cities never import it. */
export async function prepareC358MaterialBinding(rows:readonly C[],signal:AbortSignal){
 signal.throwIfAborted();
 if(F||!rows.some(c=>c.city==='munich'&&c.objectId==='osm/way/173135247'&&c.partId==='osm/way/173135247/component/d505d00db06f6ba8ee0c/owner-shape-C358'))return;
 const module=await import('./c358-fixture');signal.throwIfAborted();F=module.C358_FIXTURE;
}
import type {C318Component as C,C318Context as X} from './c318-display';
const eq=(a:ArrayLike<number>,b:ArrayLike<number>)=>a.length===b.length&&Array.from(b).every((v,i)=>a[i]===v);
const patchMatch=(c:C)=>{const p=F?.patch;return !!p&&c.city===p.city&&c.objectId===p.objectId&&c.partId===p.partId&&eq(c.origin,p.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(p.componentGeometry)&&JSON.stringify(c.sourceFeature?.properties)===JSON.stringify(p.sourceFeature?.properties)&&c.batches.length===p.batches.length&&c.batches.every((b,i)=>eq(b.positions,p.batches[i].positions)&&eq(b.normals,p.batches[i].normals)&&eq(b.indices,p.batches[i].indices)&&eq(b.color,p.batches[i].color));};
export const c358HasMaterialBinding=(c:C)=>patchMatch(c);
export function applyC358MaterialFrames(rows:readonly C[],color:Float32Array,paint:Float32Array,x:X){const f=F;if(!f)return{painted:0,geometryAdded:0,ownerAuthorizedReconstruction:false,sourceArraysUnchanged:true};const gate=!x.signal?.aborted&&x.city==='munich'&&x.indexSHA===f.indexSHA&&x.sourcePBF===f.sourcePBF&&x.boundarySHA===f.boundarySHA&&x.sourceSnapshot===f.sourceSnapshot&&x.pathsReady.color;let at=0,painted=0;for(const c of rows){const enabled=gate&&patchMatch(c)&&x.materialReady(c);for(let bi=0;bi<c.batches.length;bi++)for(let i=0;i<c.batches[bi].positions.length;i+=3){if(enabled){color.set(f.patchColors[bi].slice(i/3*4,i/3*4+4),at*4);paint.set(f.patchFrames[bi].slice(i/3*5,i/3*5+5),at*5);if(f.patchColors[bi][i/3*4+3]>.5)painted++;}at++;}}return{painted:painted,geometryAdded:painted>0?f.newGeometryVertices:0,ownerAuthorizedReconstruction:painted>0,sourceArraysUnchanged:true};}
