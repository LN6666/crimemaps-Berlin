import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {TICKET148_SHA070 as SHA,TICKET148_NATIVE070 as PIN,TICKET148_COLOURS070 as DATA} from './ticket148-material070-data';
const owned=new WeakMap<BuildingComponent,{fingerprint:string;paint:Float32Array;frames:Float32Array}>(),cache=new WeakMap<BuildingComponent,BuildingComponent>();
export const domturmTicket148070Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&c.objectId===PIN.objectId&&c.partId===PIN.partId;
function exactNative(c:BuildingComponent){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&nativePaintSignature(c)===PIN.signature&&c.origin.length===2&&PIN.origin.every((v,i)=>Object.is(v,c.origin[i]))&&JSON.stringify(c.componentGeometry)===PIN.geometryJSON&&JSON.stringify(c.sourceFeature)===PIN.sourceFeatureJSON&&c.batches.length===PIN.batchRoles.length&&c.batches.every((b,i)=>(b.faceRole??null)===PIN.batchRoles[i])&&f.vertices===PIN.vertices&&f.indices===PIN.indices&&f.fingerprint===PIN.fingerprint;}catch{return false;}}
function exactOwned(c:BuildingComponent){const r=owned.get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}}
/** Material-only private clone of the exact native ticket ancillary. All51
 * SOURCE vertices, original hip, indices and source arrays remain identical.
 * No cathedral windows or invented ticket doors; no additional principal. */
export function domturmTicket148070Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},targets=components.filter(domturmTicket148070Identity);
 if(!targets.length)return{components,stats};if(targets.length!==1){stats.error='Domturm ticket ancillary measured partition duplicate exact SOURCE';return{components,stats};}
 const source=targets[0];if(owned.has(source)){if(!exactOwned(source))stats.error='Domturm ticket ancillary private DISPLAY changed';return{components,stats};}
 if(!exactNative(source)){stats.error='Domturm ticket ancillary measured partition unchanged exact SOURCE required';return{components,stats};}
 let out=cache.get(source);if(out&&!exactOwned(out)){stats.error='Domturm ticket ancillary cached DISPLAY changed';return{components,stats};}
 if(!out){
  out={...source,displayEstimates:{...source.displayEstimates,domturmTicket148070:{patchSHA:SHA,sourceRetained:true,geometryAltered:false,oneAncillaryTicketBooth:true,independentPrincipalAdded:false,actualHeightUnknown:true,originalHipAndAll51VerticesRetained:true,doorAndWindowOpeningsUnknown:true,materialEvidence:'onsite-report-sand-red-cladding-and-own-official-DOP-grey-hip',actualVisualAccepted:false,quality500Accepted:false}}};
  const pa:number[]=[],fr:number[]=[];for(const b of source.batches)for(let v=0;v<b.positions.length/3;v++){const roof=b.normals[v*3+1]>.35,family=roof?45336:45337,rgb=roof?DATA.roofRGB:DATA.wallRGB;pa.push(...rgb,2);fr.push(b.positions[v*3],roof?b.positions[v*3+2]:b.positions[v*3+1],3.5,1,family);}
  owned.set(out,{fingerprint:ownerDisplayFingerprint(out).fingerprint,paint:new Float32Array(pa),frames:new Float32Array(fr)});cache.set(source,out);
 }
 stats.objects=1;stats.vertices=out.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.triangles=out.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.originalVertices=PIN.vertices;stats.components.push({objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:stats.vertices,triangles:stats.triangles,geometryRole:'unchanged-native-hipped-ticket-ancillary-material-only'});
 return{components:components.map(c=>c===source?out!:c),stats};
}
/** Only private exact output can write packed45336/45337. Public IDs/markers cannot grant paint. */
export function domturmTicket148070BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(paint.length!==count*4||frames.length!==count*5)throw Error('Domturm ticket ancillary exact packed buffer lengths required');
 for(const c of components)if(owned.has(c)&&!exactOwned(c))throw Error('Domturm ticket ancillary private DISPLAY changed before materials');
 let at=0,objects=0,vertices=0;for(const c of components){const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),r=owned.get(c);if(r){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}
