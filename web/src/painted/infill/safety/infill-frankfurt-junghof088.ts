import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {nativePaintSignature} from './progressive-native-signature';
import {LOW_OFFICE_DATA,LOW_OFFICE_SHA} from './infill-frankfurt-junghof088-data';
type LowGroup={queueId:string;models:any[];requiredNativeGroup:string[];geometryReadyForPreview:boolean;materialsComplete:boolean;detail50Implemented?:boolean;proof?:any};
const GROUPS:LowGroup[]=LOW_OFFICE_DATA.groups;
// Private provenance only: public ids/receipts or copied DISPLAY arrays grant no access.
const roof062Owned=new WeakMap<BuildingComponent,{source:BuildingComponent;model:any;fingerprint:string}>();
const unchanged=(c:BuildingComponent,s:any,sig:string)=>nativePaintSignature(c)===sig&&['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(s[k]))&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=s.batches[bi][k];return a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));
export const infillFrankfurtJunghof088Identity=(c:Identity)=>GROUPS.some(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
export function infillFrankfurtJunghof088Reconstruction(components:BuildingComponent[],selectedQueueIds?:string[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 // Each independent group fails closed. An absent/changed sibling can never remove its SOURCE.
 const ready=GROUPS.filter(g=>(!selectedQueueIds||selectedQueueIds.includes(g.queueId))&&g.geometryReadyForPreview&&g.models.length===g.requiredNativeGroup.length&&g.models.every(m=>{const rows=components.filter(c=>c.city==='frankfurt'&&c.objectId===m.identity.objectId&&c.partId===m.identity.partId);return rows.length===1&&unchanged(rows[0],m.source,m.identity.signature);}));
 const mapped=components.map(c=>{if(c.city!=='frankfurt')return c;const group=ready.find(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));if(!group)return c;const m=group.models.find(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId)!;
 const batches:any[]=m.display.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]}));const vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:LOW_OFFICE_SHA,vertices,triangles,geometryRole:'source-bound-junghof088-officialouter+DOP-recess+photo-canopy'});
 const out:BuildingComponent={...c,batches,displayEstimates:{...c.displayEstimates,infillFrankfurtJunghof088:{queueId:group.queueId,patchSHA:LOW_OFFICE_SHA,sourceRetained:true,officialGeometry:false,mixedOfficialAndObservedDOPRoof:true,inferredMissingRoofDimensions:true,verifiedPhysicalUnitPlaneClip:true,protectedNeighborsFrozen:true,geometryProof:group.proof,actualVisualAccepted:false,materialsComplete:group.materialsComplete,detail50Complete:!!group.detail50Implemented,detail70Complete:!!(group as any).detail70Implemented}}};
 roof062Owned.set(out,{source:c,model:m,fingerprint:ownerDisplayFingerprint(out).fingerprint});return out;
 });return {components:mapped,stats};
}
export function infillFrankfurtJunghof088BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillFrankfurtJunghof088;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}

/** Only final packed frame attributes change. SOURCE, private DISPLAY arrays, RGBA,
 * owner SHA and finite output fingerprints are unchanged. Call after all materials. */
export function infillFrankfurtJunghof088RoofMaterialFrames062(components:BuildingComponent[],frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
 if(frames.length!==total*5)throw Error('Junghof062 packed frame length mismatch');
 const empty={objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};
 const group=GROUPS.find(g=>g.queueId==='FRA-LOW-088');if(!group)return empty;
 const complete=group.models.every(m=>{const rows=components.filter(c=>c.city==='frankfurt'&&c.objectId===m.identity.objectId&&c.partId===m.identity.partId);
  if(rows.length!==1)return false;const c=rows[0],r=roof062Owned.get(c);if(!r||r.model!==m)return false;
  try{return unchanged(r.source,m.source,m.identity.signature)&&ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}});
 if(!complete)return empty;
 // Reject an unrelated material override atomically before writing any marker.
 let offset=0;
 for(const c of components)for(const b of c.batches){const n=b.positions.length/3;
  if(roof062Owned.has(c)){const own=(b as unknown as {frames:number[]}).frames;
   for(let j=0;j<n*5;j++)if(!Object.is(frames[offset*5+j],Math.fround(own[j])))return empty;}
  offset+=n;}
 const origin=[8.6743334,50.11330495],merc=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
 const unit=40075016.686*Math.cos(origin[1]*Math.PI/180);let at=0,objects=0,vertices=0;
 for(const c of components){const family=c.objectId==='osm/way/72897066'?45210:c.objectId==='osm/way/247834199'?45211:0;
  const owned=roof062Owned.has(c);let count=0;
  for(const b of c.batches){const n=b.positions.length/3,own=(b as unknown as {frames:number[]}).frames;
   if(owned&&family){const marks=new Set<number>();
    for(let t=0;t<b.indices.length;t+=3){const ix=Array.from(b.indices.slice(t,t+3));
     const exact=ix.every(i=>Math.abs(b.normals[i*3])<1e-6&&b.normals[i*3+1]>.999999&&Math.abs(b.normals[i*3+2])<1e-6&&own[i*5+4]===34349&&
       (Math.abs(b.positions[i*3+1]-34.857)<1e-5||Math.abs(b.positions[i*3+1]-34.370)<1e-5));
     if(exact)for(const i of ix)marks.add(i);}
    const localUnit=40075016.686*Math.cos(c.origin[1]*Math.PI/180),scale=unit/localUnit;
    const east=(c.origin[0]-origin[0])/360*unit,north=(merc(c.origin[1])-merc(origin[1]))/(2*Math.PI)*unit;
    for(const i of marks){const j=(at+i)*5;frames[j]=own[i*5]*scale+east;frames[j+2]=own[i*5+2]*scale+north;frames[j+4]=family;count++;}
   }at+=n;
  }if(count){objects++;vertices+=count;}
 }return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}
