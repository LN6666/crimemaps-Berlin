import type {BuildingComponent} from './building-mesh-renderer';
import {boundedBufferSHA256} from './s528-projection-sha256';
import {nativePaintSignature} from './progressive-native-signature';
// Diagnostic only: no alternate admission, quantization, rounding or expected-hash update.
const MAX_VALUES=50000;
let firstFailureJSON:string|undefined;
export function getC082FirstSignatureFailure(){return firstFailureJSON;}
function snapshot(c:BuildingComponent){
 let total=0;
 const batches=c.batches.map((b,batchIndex)=>({batchIndex,fields:Object.fromEntries((['positions','normals','indices'] as const).map(field=>{
  const a=b[field];if(!(a instanceof Float32Array||a instanceof Uint32Array))throw Error('C082 diagnostic typed source buffer required');const bytes=new Uint8Array(a.buffer,a.byteOffset,a.byteLength),dv=new DataView(a.buffer,a.byteOffset,a.byteLength);
  if((total+=a.length)>MAX_VALUES)throw Error('C082 diagnostic value bound exceeded');
  // Explicit little-endian bit words preserve signed zero and exact Float32 representation.
  const bits=Array.from({length:a.length},(_,i)=>dv.getUint32(i*4,true).toString(16).padStart(8,'0'));
  return[field,{length:a.length,byteLength:a.byteLength,sha256:boundedBufferSHA256(bytes),values:Array.from(a),uint32LEHex:bits}];
 }))}));
 return{origin:[...c.origin],componentGeometrySHA256:boundedBufferSHA256(new TextEncoder().encode(JSON.stringify(c.componentGeometry))),signature:nativePaintSignature(c),batches};
}
export function c082SignatureDrift(raw:BuildingComponent,derived:BuildingComponent,expectedDerivedSignature:string,sourceLeafSHA256:string):Error{
 // Called only after exactRaw + original admission + source-frame checks have passed.
 const actualDerivedSignature=nativePaintSignature(derived);
 if(firstFailureJSON===undefined){
  const report={schemaVersion:1,stage:'after-exact-raw-and-admission-before-packing',objectId:raw.objectId,partId:raw.partId,sourceLeafSHA256,expectedDerivedSignature,actualDerivedSignature,raw:snapshot(raw),derived:snapshot(derived),rawArraysRetained:raw.batches.every((b,i)=>b.positions!==derived.batches[i].positions&&b.normals!==derived.batches[i].normals&&b.indices===derived.batches[i].indices),failClosed:true};
  firstFailureJSON=JSON.stringify(report);
  // Retain the first failure even if caller converts the Error to a plain string.
  // A string snapshot cannot subsequently alias or mutate source/derived typed arrays.
  Object.defineProperty(globalThis,'__C082_FIRST_SIGNATURE_FAILURE_JSON__',{value:firstFailureJSON,writable:false,configurable:true,enumerable:false});
 }
 const error=Error(`C082 derived signature drift expected=${expectedDerivedSignature} actual=${actualDerivedSignature}; diagnostic=globalThis.__C082_FIRST_SIGNATURE_FAILURE_JSON__`);
 Object.defineProperty(error,'c082SignatureDiagnosticJSON',{value:firstFailureJSON,enumerable:true});
 return error;
}
