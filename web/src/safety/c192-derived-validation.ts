import type{BuildingComponent}from'./building-mesh-renderer';
import{boundedBufferSHA256}from'./s528-projection-sha256';
import{C192_PROJECTION_REGISTRY as registry}from'./c192-projection-pin';
import{C192_DERIVED_FIXTURES as fixtures}from'./c192-derived-normal-fixtures';
const digest=(v:unknown)=>boundedBufferSHA256(new TextEncoder().encode(JSON.stringify(v)));
const sha=(v:Float32Array|Uint32Array)=>boundedBufferSHA256(new Uint8Array(v.buffer,v.byteOffset,v.byteLength));
export const C192_DERIVED_NORMAL_ABSOLUTE_TOLERANCE=1e-6;
export function validateC192Derived(render:BuildingComponent){
 const pin=registry.targets.find(p=>p.objectId===render.objectId),fixture=fixtures.find(f=>f.objectId===render.objectId);
 if(!pin||!fixture||digest(fixture)!==pin.derivedFixtureSHA256)throw Error('C192 exact own fixture SHA drift');
 if(render.city!==pin.city||render.partId!==pin.partId||fixture.partId!==pin.partId||fixture.sourceLeafSHA256!==pin.sourceLeafSHA256||fixture.rawSignature!==pin.rawSignature||fixture.nodeDerivedSignature!==pin.expectedDerivedSignature||JSON.stringify(render.origin)!==JSON.stringify(pin.renderOrigin)||JSON.stringify(fixture.origin)!==JSON.stringify(pin.renderOrigin)||digest(render.componentGeometry)!==pin.sourceComponentGeometrySHA256||render.batches.length!==fixture.batches.length)throw Error('C192 derived identity/origin/geometry drift');
 let maxNormalAbsoluteDelta=0,differingNormalFloats=0,normalFloatsChecked=0;
 for(const[bi,b]of render.batches.entries()){
  const f=fixture.batches[bi];
  if(!(b.positions instanceof Float32Array)||!(b.normals instanceof Float32Array)||!(b.indices instanceof Uint32Array)||sha(b.positions)!==f.positionsSHA256||sha(b.indices)!==f.indicesSHA256)throw Error('C192 derived position/index byte drift');
  if(b.normals.length!==f.normals.length||sha(new Float32Array(f.normals))!==f.normalsSHA256)throw Error('C192 derived normal reference drift');
  for(let i=0;i<b.normals.length;i++){const v=b.normals[i],delta=Math.abs(v-f.normals[i]);if(!Number.isFinite(v)||delta>C192_DERIVED_NORMAL_ABSOLUTE_TOLERANCE)throw Error('C192 derived normal outside tolerance');normalFloatsChecked++;if(!Object.is(v,f.normals[i]))differingNormalFloats++;maxNormalAbsoluteDelta=Math.max(maxNormalAbsoluteDelta,delta);}
  for(let i=0;i<b.normals.length;i+=3)if(Math.abs(Math.hypot(...b.normals.slice(i,i+3))-1)>2e-6)throw Error('C192 derived normal not unit');
 }
 return{kind:'exact-derived-position-index-origin-geometry-and-bounded-normal' as const,normalAbsoluteTolerance:C192_DERIVED_NORMAL_ABSOLUTE_TOLERANCE,normalFloatsChecked,differingNormalFloats,maxNormalAbsoluteDelta,nodeReferenceSignature:fixture.nodeDerivedSignature};
}
