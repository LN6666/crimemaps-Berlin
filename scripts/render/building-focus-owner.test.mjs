import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildOwnerFocusMetadata} from './building-focus-owner.mjs';
function fixture(change=()=>{}){
 const profile={id:'owner-roof',city:'berlin',objectId:'osm/way/1',partId:'owner-roof-part',sourcePartId:'native-roof',number:'TEST',vertices:3,triangles:1,max_height_m:80};
 const value={schema_version:1,city:profile.city,components:[{city:profile.city,objectId:profile.objectId,partId:profile.partId,origin:[13,52],sourceFeature:{properties:{owner_shape_patch:{number:profile.number,sourcePartId:profile.sourcePartId,geometryRole:'owner-authorized-reconstruction'}}},batches:[{positions:[-4,0,3,9,80,-2,2,40,12],indices:[0,1,2]}]}]};
 change(value);const bytes=Buffer.from(JSON.stringify(value));return {profile:{...profile,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},bytes};
}
test('owner bounds include all vertices and full height, without copying geometry',()=>{
 const f=fixture(),row=buildOwnerFocusMetadata(f.profile,f.bytes);
 assert.deepEqual(row.components[0].box,[-4,0,-2,9,80,12]);assert.deepEqual(row.components[0].origin,[13,52]);
 assert.equal(row.sha256,f.profile.sha256);assert.equal('batches' in row.components[0],false);
});
test('source revision and owner identity must match',()=>{
 const f=fixture();assert.throws(()=>buildOwnerFocusMetadata({...f.profile,sha256:'0'.repeat(64)},f.bytes),/bytes\/hash/);
 assert.throws(()=>buildOwnerFocusMetadata({...f.profile,sourcePartId:'different'},f.bytes),/component binding/);
});
test('height, mesh count and out-of-range indices cannot produce admission metadata',()=>{
 for(const change of [v=>v.components[0].batches[0].positions[1]=-1,v=>v.components[0].batches[0].positions[4]=81,v=>v.components[0].batches[0].indices[2]=3]){
  const f=fixture(change);assert.throws(()=>buildOwnerFocusMetadata(f.profile,f.bytes),/height|indices/);
 }
 const f=fixture();assert.throws(()=>buildOwnerFocusMetadata({...f.profile,vertices:4},f.bytes),/counts/);
});
