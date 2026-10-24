import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {ecbEntranceAggregate073Reconstruction,ecbEntranceAggregate073BaseMaterials} from './ecb-entrance-aggregate073';
import {ECB_ENTRANCE_AGGREGATE_DATA073 as ORIGINAL_DATA} from './ecb-entrance-aggregate073-data';
import {ECB_LOOP_JUNCTION_SHA077 as SHA,ECB_LOOP_JUNCTION_DATA077 as DATA} from './ecb-loop-junction077-data';
type Owned={source:BuildingComponent;paint:Float32Array;frames:Float32Array};
const owned=new WeakMap<BuildingComponent,Owned>(),cache=new WeakMap<BuildingComponent,BuildingComponent>(),key=(c:Identity)=>c.objectId+'|'+c.partId;
const expected=new Map(ORIGINAL_DATA.map(d=>[key(d),{paint:new Float32Array(d.batches.flatMap(b=>[...b.paint])),frames:new Float32Array(d.batches.flatMap(b=>[...b.frames]))}]));
export const ecbLoopJunction077Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&c.objectId===DATA.targetObjectId&&c.partId===DATA.targetPartId;
function equal(a:unknown,b:unknown):boolean{if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&Object.is(a,b);if(b===null||typeof b!=='object')return a===b;if(Array.isArray(b)){if(!(Array.isArray(a)||ArrayBuffer.isView(a))||a instanceof DataView)return false;const q=a as ArrayLike<unknown>;return q.length===b.length&&b.every((v,i)=>equal(q[i],v));}if(!a||typeof a!=='object'||Array.isArray(a)||ArrayBuffer.isView(a))return false;const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ak=Object.keys(x).sort(),bk=Object.keys(y).sort();return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&equal(x[k],y[k]));}
function privateOriginal(c:BuildingComponent){try{const p=DATA.pins.find(p=>p.objectId===c.objectId&&p.partId===c.partId);if(!p||c.city!=='frankfurt'||!equal(c.origin,p.origin)||!equal(c.componentGeometry,p.componentGeometry)||!equal(c.sourceFeature,p.sourceFeature))return;const f=ownerDisplayFingerprint(c);if(f.vertices!==p.vertices||f.indices!==p.indices||f.fingerprint!==p.fingerprint)return;const paint=new Float32Array(f.vertices*4),frames=new Float32Array(f.vertices*5),proof=ecbEntranceAggregate073BaseMaterials([c],paint,frames),original=expected.get(key(c));if(proof.objects!==1||proof.vertices!==f.vertices||!original||!equal(paint,Array.from(original.paint))||!equal(frames,Array.from(original.frames)))return;return{paint,frames};}catch{return;}}
function exactOwned(c:BuildingComponent,r:Owned){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&ecbLoopJunction077Identity(c)&&c.sourceFeature===r.source.sourceFeature&&c.componentGeometry===r.source.componentGeometry&&equal(c.origin,r.source.origin)&&f.vertices===DATA.output.vertices&&f.indices===DATA.output.indices&&f.fingerprint===DATA.output.fingerprint&&!!privateOriginal(r.source)&&(c.displayEstimates?.ecbLoopJunction077 as{patchSHA?:string}|undefined)?.patchSHA===SHA;}catch{return false;}}
/** Calls the unchanged private073 press-footprint cut, then removes only the
 * duplicate0..17.5m part304 wall on the three exact shared SOURCE edges.
 * Original302 is the sole carrier there;304 roof20m and upper2.5m survive.
 * Missing/drifted302 restores full current073304, without undoing its entrance cut.
 */
export function ecbLoopJunction077Reconstruction(components:BuildingComponent[]){
 const invalid=new Set<BuildingComponent>();let privateError=false;
 const input=components.map(c=>{const r=owned.get(c);if(!r)return c;if(!exactOwned(c,r)){privateError=true;invalid.add(r.source);}return r.source;});
 const original=ecbEntranceAggregate073Reconstruction(input),stats:OwnerReconstructionStats={...original.stats,components:[...original.stats.components]};if(privateError)stats.error='ECB junction077 changed private DISPLAY restored original073 aggregate';
 const originals=DATA.pins.map(p=>original.components.filter(c=>c.objectId===p.objectId&&c.partId===p.partId));if(originals.some(cs=>cs.length!==1))return{components:original.components,stats};
 const proofs=originals.map(cs=>privateOriginal(cs[0]));if(proofs.some(p=>!p))return{components:original.components,stats};
 const source=originals.find(cs=>ecbLoopJunction077Identity(cs[0]))![0];if(invalid.has(source))return{components:original.components,stats};let out=cache.get(source);
 if(out&&!exactOwned(out,owned.get(out)!)){stats.error='ECB junction077 cached private DISPLAY changed';return{components:original.components,stats};}
 if(!out){
  const batches=source.batches.map((b,bi)=>DATA.edits.some(e=>e.batch===bi)?{...b,positions:Float32Array.from(b.positions)}:b);
  for(const e of DATA.edits){if(batches[e.batch].positions[e.vertex*3+1]!==e.oldHeight)throw Error('ECB junction077 original intersection vertex changed');batches[e.batch].positions[e.vertex*3+1]=e.newHeight;}
  out={...source,batches,displayEstimates:{...source.displayEstimates,ecbLoopJunction077:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,original073PatchSHA:DATA.original073PatchSHA256,geometryRole:DATA.geometryRole,onlySharedEdges:[2,3,4],removedDuplicateWallY:[0,17.5],preservedUpperWallY:[17.5,20],preservedRoofHeightM:20,original302PackedMaterialsUnchanged:true,loopPressAndEntranceCutUnchanged:true,actualVisualAccepted:false,quality500Accepted:false}}};const p=proofs[originals.findIndex(cs=>cs[0]===source)]!;owned.set(out,{source,paint:p.paint,frames:p.frames});cache.set(source,out);
 }
 const receipt={objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:DATA.output.vertices,triangles:DATA.output.indices/3,geometryRole:DATA.geometryRole},at=stats.components.findIndex(c=>c.objectId===source.objectId&&c.partId===source.partId);if(at>=0)stats.components[at]=receipt;else{stats.objects++;stats.vertices+=DATA.output.vertices;stats.triangles+=DATA.output.indices/3;stats.originalVertices+=DATA.pins.find(p=>p.partId===source.partId)!.sourceVertices;stats.components.push(receipt);}
 return{components:original.components.map(c=>c===source?out!:c),stats};
}
/** Original304 packed values transfer only from a genuine unmodified private073
 * aggregate. Public clones and metadata cannot authorize materials or clipping. */
export function ecbLoopJunction077BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){if(components.some(c=>owned.has(c))){const carrier=components.filter(c=>c.objectId===DATA.pins[0].objectId&&c.partId===DATA.pins[0].partId);if(carrier.length!==1||!privateOriginal(carrier[0]))throw Error('ECB junction077 exact private302 carrier required before materials');}const total=components.reduce((n,c)=>n+c.batches.reduce((n,b)=>n+b.positions.length/3,0),0);if(paint.length!==total*4||frames.length!==total*5)throw Error('ECB junction077 exact packed lengths required');let at=0,objects=0,vertices=0;for(const c of components){const r=owned.get(c),n=c.batches.reduce((s,b)=>s+b.positions.length/3,0);if(r){if(!exactOwned(c,r))throw Error('ECB junction077 changed private DISPLAY before materials');paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,actualVisualAccepted:false};}
