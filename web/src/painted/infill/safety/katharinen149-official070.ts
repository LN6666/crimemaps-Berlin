import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {FRA149_OFFICIAL_SHA070 as SHA,FRA149_OFFICIAL_NATIVE070 as PINS,FRA149_OFFICIAL_DATA070 as DATA} from './katharinen149-official070-data';
type Group={inputs:BuildingComponent[];outputs:BuildingComponent[]};
type Owned={group:Group;fingerprint:string;paint:Float32Array;frames:Float32Array};
const owned=new WeakMap<BuildingComponent,Owned>(),cache=new WeakMap<BuildingComponent,Group>();
export const katharinenEast149Official070Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&PINS.some(p=>p.objectId===c.objectId&&p.partId===c.partId);
function exactNative(c:BuildingComponent,p:typeof PINS[number]){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&c.objectId===p.objectId&&c.partId===p.partId&&nativePaintSignature(c)===p.signature&&c.origin.length===2&&p.origin.every((v,i)=>Object.is(v,c.origin[i]))&&JSON.stringify(c.componentGeometry)===p.geometryJSON&&JSON.stringify(c.sourceFeature)===p.sourceFeatureJSON&&c.batches.length===p.batchRoles.length&&c.batches.every((b,i)=>(b.faceRole??null)===p.batchRoles[i])&&f.vertices===p.vertices&&f.indices===p.indices&&f.fingerprint===p.fingerprint;}catch{return false;}}
function exactOwned(c:BuildingComponent){const r=owned.get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}}
function completeOwned(targets:BuildingComponent[]){if(targets.length!==PINS.length)return false;const r=owned.get(targets[0]);return!!r&&PINS.every((p,i)=>targets.filter(c=>c.objectId===p.objectId&&c.partId===p.partId).length===1&&targets.includes(r.group.outputs[i])&&owned.get(r.group.outputs[i])?.group===r.group&&exactOwned(r.group.outputs[i]));}
/** Complete6 exact SOURCE only. The default parent becomes SOURCE-held while
 * five original part identities carry disjoint measured surface domains.
 * This private DISPLAY partition does not alter sourceFeature relationships.
 * No estimated7.5m shell, unmatched roof fill or invented courtyard floor. */
export function katharinenEast149Official070Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 let targets=components.filter(katharinenEast149Official070Identity);
 if(!targets.length)return{components,stats};
 if(completeOwned(targets))return{components,stats};
 // A later incomplete/mixed arrival must not retain a privately retired parent.
 // Restore only our authenticated private outputs to their original unchanged
 // SOURCE objects before evaluating the same strict complete native guard.
 for(const c of components)if(owned.has(c)&&!exactOwned(c)){stats.error='FRA149 changed private DISPLAY cannot restore or paint';return{components,stats};}
 const restored=components.map(c=>{const r=owned.get(c);if(!r)return c;const at=r.group.outputs.indexOf(c);return at<0?c:r.group.inputs[at];});
 if(restored.some((c,i)=>c!==components[i])){components=restored;targets=components.filter(katharinenEast149Official070Identity);}
 const inputs=PINS.map(p=>targets.filter(c=>c.objectId===p.objectId&&c.partId===p.partId));
 if(targets.length!==PINS.length||inputs.some(cs=>cs.length!==1)){stats.error='FRA149 requires all6 unique unchanged exact SOURCE carriers';return{components,stats};}
 const sources=inputs.map(cs=>cs[0]);if(!sources.every((c,i)=>exactNative(c,PINS[i]))){stats.error='FRA149 complete unchanged original SOURCE records required; public or mixed clones rejected';return{components,stats};}
 let group=cache.get(sources[0]);if(group&&!group.inputs.every((c,i)=>c===sources[i]))group=undefined;
 if(group&&!group.outputs.every(exactOwned)){stats.error='FRA149 cached private DISPLAY changed';return{components,stats};}
 if(!group){
  group={inputs:sources,outputs:[]};
  for(const c of sources){const entry=DATA[c.partId as keyof typeof DATA];
   const batches:MeshBatch[]=entry.batches.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color] as[number,number,number],faceRole:b.faceRole,materialName:b.geometryRole}));
   const held=c.objectId==='osm/way/28426245',out:BuildingComponent={...c,batches,displayEstimates:{...c.displayEstimates,katharinenEast149Official070:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,completeSourceGroup:6,sourceHeldParent:held,commonDatumAbsoluteM:100.672,officialBuildingIds:['Building_DEHE06200001bLVl','Building_DEHE06200001bNaf','Building_DEHE06200001bNap'],distinctOfficialGroundOffsetsPreserved:true,geometryRole:held?'SOURCE-held-default-parent':'original-official-surfaces-partitioned-within-original-part-footprint',unmatchedSourceRoofDomainNotFilledM2:76.6582268776941,glassOnlyOriginal7940MaterialTagDomain:true,unknownWallOpeningsNotInvented:true,actualVisualAccepted:false,quality500Accepted:false}}};
   owned.set(out,{group,fingerprint:ownerDisplayFingerprint(out).fingerprint,paint:new Float32Array(entry.batches.flatMap(b=>[...b.paint])),frames:new Float32Array(entry.batches.flatMap(b=>[...b.frames]))});group.outputs.push(out);
  }
  cache.set(sources[0],group);
 }
 for(let i=0;i<sources.length;i++){const c=sources[i],out=group.outputs[i],v=out.batches.reduce((n,b)=>n+b.positions.length/3,0),t=out.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=v;stats.triangles+=t;stats.originalVertices+=PINS[i].vertices;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:SHA,vertices:v,triangles:t,geometryRole:i===0?'SOURCE-held-default-parent':'original-measured-surfaces-in-disjoint-source-part-domain'});}
 const outputs=group.outputs;return{components:components.map(c=>{const at=sources.indexOf(c);return at<0?c:outputs[at];}),stats};
}
/** Final packed writer also requires all6 exact private outputs from one group.
 * Missing/mixed/forged groups cannot gain paint from a public ID or marker. */
export function katharinenEast149Official070BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(paint.length!==count*4||frames.length!==count*5)throw Error('FRA149 exact packed lengths required');
 for(const c of components)if(owned.has(c)&&!exactOwned(c))throw Error('FRA149 private DISPLAY changed before packed materials');
 const targets=components.filter(katharinenEast149Official070Identity);if(!completeOwned(targets))return{objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};
 let at=0,objects=0,vertices=0;for(const c of components){const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),r=owned.get(c);if(r&&targets.includes(c)){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}
