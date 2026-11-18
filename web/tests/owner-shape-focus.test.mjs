import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProductionModule} from './support/core3-runtime.mjs';
const {OWNER_SHAPE_PATCH_PROFILES}=loadProductionModule(new URL('../src/painted/root500/safety/owner-shape-patch-profiles.ts',import.meta.url));
const {ownerShapePatchFocusComponents}=loadProductionModule(new URL('../src/painted/root500/safety/owner-shape-patch-display.ts',import.meta.url));
const {projectBuildingFocusCohort}=loadProductionModule(new URL('../src/safety/building-focus-admission.ts',import.meta.url));
test('every actual owner profile has complete source-bound projection metadata',()=>{
 assert.equal(OWNER_SHAPE_PATCH_PROFILES.length,31);
 const mainMatrix=new Float64Array(16);mainMatrix[0]=1;mainMatrix[5]=1;mainMatrix[15]=1;
 const frame={revision:1,cameraKey:'test',mainMatrix,mercator:true,viewport:{cssWidth:1000,cssHeight:600,drawingBufferWidth:1000,drawingBufferHeight:600}};
 for(const profile of OWNER_SHAPE_PATCH_PROFILES){
  const components=ownerShapePatchFocusComponents(profile);
  assert.equal(components.length,1);assert.equal(components[0].objectId,profile.objectId);
  assert(components[0].box.every(Number.isFinite));assert(components[0].box[4]<=profile.max_height_m+1e-5);
  assert(projectBuildingFocusCohort(frame,components),'full model bounds project through the real admission projector');
 }
});
test('old bounds cannot be applied to a different owner source revision',()=>{
 const profile=OWNER_SHAPE_PATCH_PROFILES[0];
 assert.throws(()=>ownerShapePatchFocusComponents({...profile,sha256:'0'.repeat(64)}),/source mismatch/);
 assert.throws(()=>ownerShapePatchFocusComponents({...profile,partId:'other-part'}),/source mismatch/);
});
for(const [provider,count] of [['city',95],['tier300',8]])test(`${provider} owner metadata covers its actual provider profiles`,()=>{
 const module=loadProductionModule(new URL('../src/painted/'+provider+'/safety/owner-shape-patch-display.ts',import.meta.url));
 const cities=['berlin','bremen','cologne','dortmund','dresden','dusseldorf','essen','frankfurt','hamburg','hannover','leipzig','munich','nuremberg','stuttgart'];
 let observed=0;
 for(const city of cities)for(const profile of module.ownerShapePatchProfiles(city)){
  const rows=module.ownerShapePatchFocusComponents(profile);assert.equal(rows.length,1);assert.equal(rows[0].partId,profile.partId);
  assert(rows[0].box.every(Number.isFinite));assert(rows[0].box[4]<=profile.max_height_m+1e-5);observed++;
  assert.throws(()=>module.ownerShapePatchFocusComponents({...profile,sha256:'0'.repeat(64)}),/source mismatch/);
 }
 assert.equal(observed,count);
});
