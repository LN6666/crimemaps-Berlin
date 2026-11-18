import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';

const source=await readFile(new URL('../src/safety/component-readback.ts',import.meta.url),'utf8');
const {code}=await transform(source,{loader:'ts',format:'esm',target:'es2022'});
const {copyBuildingComponentMetadata,copyBuildingComponentReadback}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function component(){
 const geometry={type:'Polygon',coordinates:[[[8,53],[8.001,53],[8,53.001],[8,53]]]};
 return{city:'bremen',objectId:'osm/way/1',partId:'osm/way/1/component/tiny',generation:7,origin:[8,53],componentGeometry:geometry,sourceFeature:{type:'Feature',id:1,geometry,properties:{name:'original',details:{levels:[2,3]}}},displayEstimates:{painted:true,details:{tiers:[1,2]}},paintOwner:'root500',sourceLeaf:'leaf-a',batches:[{positions:new Float32Array([-0,0,0,1,0,0,0,1,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),indices:new Uint32Array([0,1,2]),color:[.2,.3,.4],paint:new Float32Array([.1,.2,.3,7]),frames:new Float64Array([1,2,3,4,5])}]};
}

test('public component metadata keeps exactly the seven selection fields and isolates nested source metadata',()=>{
 assert.equal(copyBuildingComponentMetadata(undefined),undefined);assert.equal(copyBuildingComponentReadback(undefined),undefined);
 const original=component(),before=structuredClone(original),first=copyBuildingComponentMetadata(original),second=copyBuildingComponentMetadata(original);
 assert.deepEqual(Object.keys(first),['city','objectId','partId','generation','componentGeometry','sourceFeature','displayEstimates']);
 assert.deepEqual(first,{city:original.city,objectId:original.objectId,partId:original.partId,generation:7,componentGeometry:original.componentGeometry,sourceFeature:original.sourceFeature,displayEstimates:original.displayEstimates});
 assert.equal(Object.hasOwn(first,'batches'),false);assert.equal(Object.hasOwn(first,'origin'),false);
 first.componentGeometry.coordinates[0][0][0]=999;first.sourceFeature.properties.details.levels[0]=99;first.displayEstimates.details.tiers[0]=99;first.generation=100;
 assert.deepEqual(original,before);assert.deepEqual(second,copyBuildingComponentMetadata(before));
 assert.notStrictEqual(first.sourceFeature,original.sourceFeature);assert.notStrictEqual(first.componentGeometry,second.componentGeometry);
});

test('explicit full readbacks preserve all values and typed array types while each caller owns its arrays',()=>{
 const original=component(),before=structuredClone(original),first=copyBuildingComponentReadback(original),second=copyBuildingComponentReadback(original);
 assert.deepEqual(first,original);assert.deepEqual(Object.keys(first),Object.keys(original));assert.ok(Object.is(first.batches[0].positions[0],-0));
 for(const field of ['positions','normals','indices','paint','frames']){
  assert.equal(first.batches[0][field].constructor,original.batches[0][field].constructor,field);
  assert.notStrictEqual(first.batches[0][field].buffer,original.batches[0][field].buffer,field+' is detached from the resident buffer');
  assert.notStrictEqual(first.batches[0][field].buffer,second.batches[0][field].buffer,field+' is detached from another public readback');
  first.batches[0][field][0]=123;
 }
 first.batches[0].color[0]=9;first.origin[0]=9;first.sourceFeature.properties.name='changed';first.componentGeometry.coordinates[0][1][0]=9;
 assert.deepEqual(original,before);assert.deepEqual(second,before);
 original.batches.length=0;original.sourceFeature.properties.name='retired';
 assert.deepEqual(second,before,'a retained public full readback survives changes to its original owner');
});
