import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {TRIANON_DATA,TRIANON_SHA} from './infill-frankfurt-trianon-data';
const MODELS=TRIANON_DATA.models.map(data=>({data,sha:TRIANON_SHA}));
const unchanged=(c:BuildingComponent,source:any,signature:string)=>nativePaintSignature(c)===signature&&['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(source[k]))&&c.batches.length===source.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=source.batches[bi][k];return a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));
export const infillFrankfurtTrianonIdentity=(c:Identity)=>MODELS.some(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);
export function infillFrankfurtTrianonReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const colosseoReady=MODELS.every(m=>{const rows=components.filter(c=>c.city==='frankfurt'&&c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);return rows.length===1&&unchanged(rows[0],m.data.source,m.data.identity.signature);});
 const groupMissing=MODELS.some(m=>!components.some(c=>c.city==='frankfurt'&&c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId));
 if(groupMissing)return{components,stats}; // Incomplete streaming group: no replacement; target SHA gate remains unsatisfied.
 const mapped=components.map(c=>{if(c.city!=='frankfurt')return c;const model=MODELS.find(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);if(!model)return c;const source=model.data.source;
 const ready=colosseoReady&&components.filter(q=>q.city===c.city&&q.objectId===c.objectId&&q.partId===c.partId).length===1&&unchanged(c,source,model.data.identity.signature);
 if(!ready){stats.error='Frankfurt infill requires one unchanged exact native carrier per target';return c;}
 const batches=model.data.display.map(b=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]}));const vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:model.sha,vertices,triangles,geometryRole:'native-source-bound-trianon-crown-display-and-materials'});
 return{...c,batches,displayEstimates:{...c.displayEstimates,infillFrankfurtTrianonExterior:{sourceRetained:true,patchSHA:model.sha,displayEstimate:true,surveyed:false,materialsComplete:true,fineTextureDeferred:true}}};});return{components:mapped,stats};
}
export function infillFrankfurtTrianonBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&infillFrankfurtTrianonIdentity(c)&&!!c.displayEstimates?.infillFrankfurtTrianonExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
