import type {BuildingComponent} from './building-mesh-renderer';
/** Two independent 32-bit byte accumulators over the actual GPU float32 representation. No BigInt or mesh/JSON clone. Not a cryptographic SHA. */
export function ownerDisplayFingerprint(c:BuildingComponent){
 let a=2166136261>>>0,b=2246822519>>>0;const scratch=new DataView(new ArrayBuffer(4));
 const byte=(v:number)=>{a=Math.imul(a^v,16777619)>>>0;b=Math.imul(b^v,3266489917)>>>0;};
 const word=(v:number)=>{let u=v&255;a=Math.imul(a^u,16777619)>>>0;b=Math.imul(b^u,3266489917)>>>0;u=(v>>>8)&255;a=Math.imul(a^u,16777619)>>>0;b=Math.imul(b^u,3266489917)>>>0;u=(v>>>16)&255;a=Math.imul(a^u,16777619)>>>0;b=Math.imul(b^u,3266489917)>>>0;u=v>>>24;a=Math.imul(a^u,16777619)>>>0;b=Math.imul(b^u,3266489917)>>>0;};
 const text=(s:string)=>{const bytes=new TextEncoder().encode(s);word(bytes.length);for(const v of bytes)byte(v);};
 const floating=(v:number)=>{if(!Number.isFinite(v)||!Number.isFinite(Math.fround(v)))throw new Error('Non-finite owner display fingerprint value');scratch.setFloat32(0,v,true);word(scratch.getUint32(0,true));};
 text(JSON.stringify([c.city,c.objectId,c.partId,c.origin,c.componentGeometry,c.sourceFeature]));word(c.batches.length);
 let vertices=0,indices=0;
 for(const batch of c.batches){const q=batch as unknown as Record<string,ArrayLike<number>|undefined>,n=batch.positions.length/3;if(!Number.isSafeInteger(n)||batch.normals.length!==batch.positions.length||batch.indices.length%3)throw new Error('Invalid owner display fingerprint batch counts');vertices+=n;indices+=batch.indices.length;
  text(JSON.stringify([(batch as any).role??null,(batch as any).geometryRole??null,(batch as any).sourceEvidence??null]));
  for(const field of ['positions','normals','indices','color','paint','frames','writeMask']){text(field);const values=q[field];if(values===undefined){word(0xffffffff);continue;}if(!Number.isSafeInteger(values.length)||values.length<0)throw new Error('Invalid owner display fingerprint array');if((field==='paint'&&values.length!==n*4)||(field==='frames'&&values.length!==n*5)||(field==='writeMask'&&values.length!==n))throw new Error('Invalid owner display fingerprint attribute count');word(values.length);
   for(let j=0;j<values.length;j++){const value=(values as any)[j];if(field==='indices'){if(!Number.isSafeInteger(value)||value<0||value>=n||value>0xffffffff)throw new Error('Invalid owner display fingerprint index');word(value);}else if(field==='writeMask'){if(typeof value!=='boolean')throw new Error('Invalid owner display fingerprint write mask');byte(value?1:0);}else floating(value);}
  }
 }
 if(!Number.isSafeInteger(vertices)||!Number.isSafeInteger(indices))throw new Error('Invalid owner display fingerprint totals');
 return{fingerprint:a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0'),vertices,indices};
}
