import {createLazyCityMaterial} from './lazy-city-material';
type Fixture=typeof import('./c358-fixture')['C358_FIXTURE'];
let F:Fixture|undefined;
const C358_CITY='munich';
const exactOwner=(c:C)=>c.city===C358_CITY&&c.objectId==='osm/way/173135247'&&c.partId==='osm/way/173135247/component/d505d00db06f6ba8ee0c/owner-shape-C358';
const fixtureModule=createLazyCityMaterial<Fixture>('C358',async()=>(await import('./c358-fixture')).C358_FIXTURE);
/** Module preparation decided by the city alone, never by source rows: the City
 * manager awaits it before it takes any source lease or metadata charge
 * (DECISIONS 2026-11-02 03:25). Other cities never import the fixture. */
export async function prepareC358MaterialModule(city:string,signal:AbortSignal){
 signal.throwIfAborted();if(city!==C358_CITY)return;
 await fixtureModule.prepare(signal);signal.throwIfAborted();
}
/** The rows binding that stays after the source read. It is synchronous: no import
 * or other wait runs while the caller holds the source lease. Binding the exact
 * owner without a prepared module fails closed instead of importing late. */
export function bindC358MaterialRows(rows:readonly C[]){
 if(F||!rows.some(exactOwner))return;
 const value=fixtureModule.value();if(!value)throw Error('C358 material module was not prepared before its source lease');F=value;
}
/** Exact-owner preparation for callers that hold rows but no source lease: imports
 * only for the exact owner, then binds the same way as bindC358MaterialRows. */
export async function prepareC358MaterialBinding(rows:readonly C[],signal:AbortSignal){
 signal.throwIfAborted();
 if(F||!rows.some(exactOwner))return;
 await fixtureModule.prepare(signal);signal.throwIfAborted();bindC358MaterialRows(rows);
}
import type {C318Component as C,C318Context as X} from './c318-display';
const eq=(a:ArrayLike<number>,b:ArrayLike<number>)=>a.length===b.length&&Array.from(b).every((v,i)=>a[i]===v);
const patchMatch=(c:C)=>{const p=F?.patch;return !!p&&c.city===p.city&&c.objectId===p.objectId&&c.partId===p.partId&&eq(c.origin,p.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(p.componentGeometry)&&JSON.stringify(c.sourceFeature?.properties)===JSON.stringify(p.sourceFeature?.properties)&&c.batches.length===p.batches.length&&c.batches.every((b,i)=>eq(b.positions,p.batches[i].positions)&&eq(b.normals,p.batches[i].normals)&&eq(b.indices,p.batches[i].indices)&&eq(b.color,p.batches[i].color));};
export const c358HasMaterialBinding=(c:C)=>patchMatch(c);
export function applyC358MaterialFrames(rows:readonly C[],color:Float32Array,paint:Float32Array,x:X){const f=F;if(!f)return{painted:0,geometryAdded:0,ownerAuthorizedReconstruction:false,sourceArraysUnchanged:true};const gate=!x.signal?.aborted&&x.city==='munich'&&x.indexSHA===f.indexSHA&&x.sourcePBF===f.sourcePBF&&x.boundarySHA===f.boundarySHA&&x.sourceSnapshot===f.sourceSnapshot&&x.pathsReady.color;let at=0,painted=0;for(const c of rows){const enabled=gate&&patchMatch(c)&&x.materialReady(c);for(let bi=0;bi<c.batches.length;bi++)for(let i=0;i<c.batches[bi].positions.length;i+=3){if(enabled){color.set(f.patchColors[bi].slice(i/3*4,i/3*4+4),at*4);paint.set(f.patchFrames[bi].slice(i/3*5,i/3*5+5),at*5);if(f.patchColors[bi][i/3*4+3]>.5)painted++;}at++;}}return{painted:painted,geometryAdded:painted>0?f.newGeometryVertices:0,ownerAuthorizedReconstruction:painted>0,sourceArraysUnchanged:true};}
