import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const key=row=>row.objectId+'|'+row.partId;
function fixture(number){
 const row=id=>({city:'munich',objectId:'osm/way/'+id,partId:'part/'+id,origin:[11.5,48.1],componentGeometry:{type:'Polygon',coordinates:[]},sourceFeature:{properties:{}},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.2,.3,.4]}],proof:{sourceSHA256:'native-source'}});
 const native=[row(1),row(2)],added=[row(3)],data={native,added,indexSHA:'index',sourcePBF:'pbf',boundarySHA:'boundary',sourceSnapshot:'snapshot'},cohort={native,added};
 const metadata={CITY_DATA_MASKS:{['c'+number]:{}},CITY_DATA_COHORTS:{['c'+number]:cohort},cityCohortIdentity(_name,value,onlyAdded=false){return(onlyAdded?added:[...native,...added]).some(row=>key(row)===key(value));},cityAppearanceVertexReservations:()=>({c311:3,c312:3})};
 const source=fs.readFileSync(new URL(`../src/painted/city/safety/c${number}-display.ts`,import.meta.url),'utf8'),js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};
 Function('exports','require',js)(exports,name=>{
  if(name==='./city-data-metadata')return metadata;
  assert.equal(name,`./c${number}-fixture`);return{['getC'+number+'_FIXTURE']:()=>data};
 });
 const memo=new Map(),scope={memo(key,create){if(!memo.has(key))memo.set(key,create());return memo.get(key);}};
 const context={city:'munich',indexSHA:'index',sourcePBF:'pbf',boundarySHA:'boundary',sourceSnapshot:'snapshot',leafSHA:()=> 'native-source',materialReady:()=>true,pathsReady:{color:true,shadow:true,pick:true}};
 return{api:exports,native,added,scope,context};
}

for(const number of ['311','312'])test('C'+number+' borrows validated immutable additions and full neighbours cannot promote an incomplete visible source admission',()=>{
 const f=fixture(number),borrow=f.api['borrowC'+number+'DisplayComponents'],create=f.api['createC'+number+'DisplayComponents'];
 assert.strictEqual(borrow(f.native,f.context,f.scope),f.added,'borrow retains the exact prepared source rows for an admitted copy producer');
 const copy=create(f.native,f.context,f.scope);assert.deepEqual(copy,f.added);assert.notStrictEqual(copy,f.added,'the original public creation contract still returns an independent copy');
 assert.deepEqual(borrow(f.native,{...f.context,sourceAdmission:new Set([key(f.native[0])])},f.scope),[],'complete physical neighbours do not replace missing visible source proof');
 assert.strictEqual(borrow(f.native,{...f.context,sourceAdmission:new Set(f.native.map(key))},f.scope),f.added);
 assert.deepEqual(borrow(f.native,{...f.context,leafSHA:()=> 'wrong-source'},f.scope),[],'the original source hash check remains mandatory');
});
