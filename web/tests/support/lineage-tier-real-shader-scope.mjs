import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

// Frozen current-4caae82-static-assets profiles. Tables stay outside Git; every
// byte used by a source producer is verified against this profile's descriptor.
export const PROFILE_SHA256=Object.freeze({
 berlin:'2ff316bb5f190ea87df919cf626f2ef8d2d87942766f667aa3967b2823db9ff6',
 frankfurt:'8835be2a4f2ae47649e6bc6fde4a62c1d3a548baebffa8fccc955987ee0bf8b1',
 bremen:'30579943d4046e83925b9f81de7bb2cdc0813f078ad5143560493f05214f632e',
 munich:'b389166bdfc91e48511a8916533d20da69511c425bd98844ed5f763ce21f15a5',
});
export const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');

export function realShaderScope(sites,city,production){
 const root=path.resolve(sites,'crimemaps-'+city[0].toUpperCase()+city.slice(1));
 const profileBytes=fs.readFileSync(path.join(root,'city-data-profile.json'));
 assert.equal(sha256(profileBytes),PROFILE_SHA256[city],'requires the verified 4caae82 '+city+' profile');
 const profile=JSON.parse(profileBytes);assert.equal(profile.city,city);
 const id=ref=>ref.file+'|'+ref.canonicalSHA256+'|'+(ref.occurrence??0);
 const routes=new Map(profile.routes.map(row=>[id(row),row])),values=new Map(),memos=new Map(),reads=[];
 // Version-one profiles project the four core families. Production resolves
 // unprojected infill/Bremen initializers to their canonical manifest SHA;
 // call that actual resolver, never alias one family's ref to another route.
 const binding=production.createCityFrozenProfile(production.frozenManifest,production.frozenDependencies,profile,city);
 const descriptors=new Map(binding.descriptors.map(row=>[row.sha256,row]));
 let pins=0,released=false,readBytes=0;
 function asset(spec){
  assert(Number.isSafeInteger(spec.bytes)&&spec.bytes>=0&&spec.bytes<=32*1024**2,'bounded shader table');
  const file=path.resolve(root,spec.path.replace(/^\//,''));assert(file.startsWith(root+path.sep),'profile path stays in city');
  assert.equal(fs.statSync(file).size,spec.bytes,'descriptor file size');
  const bytes=fs.readFileSync(file);assert.equal(sha256(bytes),spec.sha256,'descriptor SHA '+spec.path);return bytes;
 }
 function value(ref){
  assert(!released,'scope is live');const key=id(ref);if(values.has(key))return values.get(key);
  const route=routes.get(key);assert.equal(ref.codec??'json','json');
  assert(Object.values(production.frozenDependencies.initializers).some(refs=>(refs[ref.canonicalSHA256]?.[ref.file]??0)>(ref.occurrence??0)),'declared production initializer '+key);
  const resolved=binding.resolve(ref.canonicalSHA256,ref.file,ref.occurrence??0),d=descriptors.get(resolved);assert(d,'active production descriptor '+key);
  assert(d.bytes<=32*1024**2,'decoded shader table is bounded');
  let bytes;if(d.transport){const raw=asset(d.transport);assert(['gzip','identity'].includes(d.transport.encoding),'known transport encoding');bytes=d.transport.encoding==='gzip'?zlib.gunzipSync(raw,{maxOutputLength:d.bytes}):raw;}
  else bytes=asset(d);
  assert.equal(bytes.length,d.bytes);assert.equal(sha256(bytes),d.sha256,'decoded descriptor SHA');
  readBytes+=bytes.length;assert(readBytes<=64*1024**2,'one case reads at most 64 MiB of decoded tables');
  const result=JSON.parse(bytes.toString('utf8'));values.set(key,result);
  reads.push({file:ref.file,occurrence:ref.occurrence??0,canonicalSHA256:ref.canonicalSHA256,descriptorSHA256:d.sha256,selector:route?.selector??'canonical-unprojected',resolvedRawSHA256:resolved,bytes:d.bytes});return result;
 }
 const scope={
  async prepare(refs,signal){signal?.throwIfAborted();for(const ref of refs)value(ref);signal?.throwIfAborted();},
  async prepareSelection(ref,keys,signal){signal?.throwIfAborted();this.assertSelection(ref,keys);signal?.throwIfAborted();},
  assertSelection(ref,keys){const rows=value(ref);if(rows&&typeof rows==='object'&&!Array.isArray(rows))for(const key of keys)assert(key in rows,'selected frozen key '+key);},
  borrow(ref,read){return read(value(ref));},
  memo(key,create){assert(!released);if(!memos.has(key))memos.set(key,create());return memos.get(key);},
  retain(){assert(!released);pins++;let active=true;return()=>{if(active){active=false;pins--;}};},
  release(){assert.equal(pins,0,'no leaked scope consumer');released=true;values.clear();memos.clear();},
  get stats(){return{resources:values.size,pending:0,pins,ownerReleased:released,disposed:released};},
 };
 return{scope,reads,profileSHA256:sha256(profileBytes),get decodedBytes(){return readBytes;}};
}
