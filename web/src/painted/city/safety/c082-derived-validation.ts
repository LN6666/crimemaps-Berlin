import type {BuildingComponent} from './building-mesh-renderer';
import {boundedBufferSHA256} from './s528-projection-sha256';
import {C082_PROJECTION_PIN as pin} from './c082-projection-pin';
import {C082_DERIVED_NORMAL_FIXTURE as fixture} from './c082-derived-normal-fixture';
const sha=(v:Float32Array|Uint32Array)=>boundedBufferSHA256(new Uint8Array(v.buffer,v.byteOffset,v.byteLength));
const digest=(v:unknown)=>boundedBufferSHA256(new TextEncoder().encode(JSON.stringify(v)));
// Absolute direction-component tolerance only; never used for native/raw source or positions.
export const C082_DERIVED_NORMAL_ABSOLUTE_TOLERANCE=1e-6;
export function validateC082Derived(render:BuildingComponent){
 if(digest(fixture)!=='9ff12d61e131189edc46eed57b770346bfddcf4bba144c43cd8effb62881a863')throw Error('C082 reference fixture SHA drift');
 if(render.objectId!==fixture.objectId||render.partId!==fixture.partId||render.city!==pin.city||fixture.sourceLeafSHA256!==pin.sourceLeafSHA256||fixture.rawSignature!==pin.rawSignature||fixture.nodeDerivedSignature!==pin.expectedDerivedSignature||JSON.stringify(render.origin)!==JSON.stringify(fixture.origin)||JSON.stringify(render.origin)!==JSON.stringify(pin.renderOrigin)||digest(render.componentGeometry)!==fixture.componentGeometrySHA256||render.batches.length!==fixture.batches.length)throw Error('C082 derived identity/origin/geometry drift');
 let maxNormalAbsoluteDelta=0,differingNormalFloats=0,normalFloatsChecked=0;
 for(const[bi,b]of render.batches.entries()){
  const f=fixture.batches[bi];
  if(!(b.positions instanceof Float32Array)||!(b.normals instanceof Float32Array)||!(b.indices instanceof Uint32Array)||sha(b.positions)!==f.positionsSHA256||sha(b.indices)!==f.indicesSHA256)throw Error('C082 derived position/index byte drift batch '+bi);
  if(b.normals.length!==f.normals.length||sha(new Float32Array(f.normals))!==f.normalsSHA256)throw Error('C082 derived normal count/reference drift batch '+bi);
  for(let i=0;i<b.normals.length;i++){
   const value=b.normals[i],delta=Math.abs(value-f.normals[i]);normalFloatsChecked++;
   if(!Number.isFinite(value)||delta>C082_DERIVED_NORMAL_ABSOLUTE_TOLERANCE)throw Error('C082 derived normal outside tolerance batch '+bi+' float '+i);
   if(!Object.is(value,f.normals[i]))differingNormalFloats++;maxNormalAbsoluteDelta=Math.max(maxNormalAbsoluteDelta,delta);
  }
  for(let i=0;i<b.normals.length;i+=3)if(Math.abs(Math.hypot(b.normals[i],b.normals[i+1],b.normals[i+2])-1)>2e-6)throw Error('C082 derived normal not unit direction batch '+bi+' vertex '+i/3);
 }
 return{kind:'exact-derived-position-index-origin-geometry-and-bounded-normal' as const,normalAbsoluteTolerance:C082_DERIVED_NORMAL_ABSOLUTE_TOLERANCE,normalFloatsChecked,differingNormalFloats,maxNormalAbsoluteDelta,nodeReferenceSignature:fixture.nodeDerivedSignature};
}
