import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProductionModule} from './support/core3-runtime.mjs';
const {f331FocusCohorts277}=loadProductionModule(new URL('../src/painted/delegated500/safety/f331-source-cohort277.ts',import.meta.url));
const patch={id:'F331-SourceRemainder',path:'/safety/buildings3d/owner-shape-patches/F331-SourceRemainder-276.json',sha256:'2ddc82e38afb0a8465ef91665a8920490be05d5dbbdf348974de5999db934992',bytes:67148,vertices:516};
const leaves=['1004d56a6ae81279cc4b754ff0557844dbc1a916ff595e03d8914f5149df963a','5197a457f2c7a95f35ca5440c3dbf2b33c8f85eef6773b08c1cf87d90eddf548'].map((sha256,i)=>({id:'source-'+i,path:'/source-'+i,sha256,bytes:100,vertices:100}));
test('F331 remainder brings both exact native sources into the atomic focus group',()=>{
 assert.deepEqual(f331FocusCohorts277('dresden',[patch],[...leaves,patch]),[[patch,...leaves]]);
 assert.deepEqual(f331FocusCohorts277('berlin',[patch],[]),[]);
 assert.deepEqual(f331FocusCohorts277('dresden',[],leaves),[]);
 assert.deepEqual(f331FocusCohorts277('dresden',[{...patch,sha256:'0'.repeat(64)}],leaves),[],'unmatched source cannot claim the pinned exception');
});
test('missing or ambiguous F331 original sources fail before sparse selection',()=>{
 assert.throws(()=>f331FocusCohorts277('dresden',[patch],[leaves[0]]),/missing or ambiguous/);
 assert.throws(()=>f331FocusCohorts277('dresden',[patch],[...leaves,{...leaves[0],id:'alias'}]),/missing or ambiguous/);
});
const {ownerShapePatchFocusComponents}=loadProductionModule(new URL('../src/painted/delegated500/safety/owner-shape-patch-focus-binding.ts',import.meta.url));
test('delegated pre-load bounds preserve the pinned underground atrium',()=>{
 const profile={id:'F061-RearCourt829',city:'hamburg',sha256:'c3a9c6c61ba72fc5bbfca2f9808b8421b3b2e83896ffc6118589313ef36626a4',objectId:'osm/way/45574500',partId:'osm/way/45574500/component/0e5473b3818ee68de406/owner-photoapprox-rear-atrium829'};
 const rows=ownerShapePatchFocusComponents(profile);assert.equal(rows[0].box[1],-3.35);assert.equal(rows[0].box[4],.2);
 assert.throws(()=>ownerShapePatchFocusComponents({...profile,sha256:'0'.repeat(64)}),/source mismatch/);
});
