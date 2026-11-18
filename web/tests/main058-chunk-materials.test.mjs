import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

// Exercise the actual owner reconstruction/material code. Only its immutable
// model tables are replaced with three tiny sources; no production asset loads.
const source=readFileSync(new URL('../src/painted/infill/safety/main11369-display058.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function fixture(){
 const batch=()=>({positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[1,1,1,1]});
 const sources=[0,1,2].map(i=>({city:'frankfurt',objectId:'fixture/'+i,partId:'part/'+i,origin:[8.68,50.11],componentGeometry:{type:'Polygon',coordinates:[]},sourceFeature:{type:'Feature',properties:{id:i}},batches:[batch(),batch()]}));
 const plans=sources.map((s,i)=>({...s,geometryChanged:i<2,frames:Array.from({length:30},(_,k)=>i*100+k),selected:[{vertex:4,family:i===0?45150:1}]}));
 const exports={};
 const dependencies={
  './main11369-source057':{MAIN11369_SOURCE057:sources},
  './main11369-display-data058':{MAIN11369_DISPLAY_SHA058:'fixture-patch',getMAIN11369_DISPLAY_DATA058:()=>plans},
  './infill-resource-header-metadata':{infillResourceIdentityCandidate:(_name,c)=>sources.some(s=>s.objectId===c.objectId&&s.partId===c.partId)},
  './infill-owner-preparation':{prepareInfillDataResources:()=>{throw Error('Unexpected asset preparation');}},
  './infill-data-contract':{scopedInfillValue:read=>{let cell;return()=>{if(!cell)cell={value:read()};return cell.value;};}},
 };
 new Function('require','exports',compiled)(name=>{assert(name in dependencies,'Unexpected dependency '+name);return dependencies[name];},exports);
 const cells=new Map(),scope={stats:{disposed:false},memo(key,make){if(!cells.has(key))cells.set(key,make());return cells.get(key);}};
 const owner=exports.getInfillData(scope);
 const apply=rows=>{const vertices=rows.reduce((sum,c)=>sum+c.batches.reduce((n,b)=>n+b.positions.length/3,0),0),paint=new Float32Array(vertices*4),frames=new Float32Array(vertices*5);owner.main11369Display058BaseMaterials(rows,paint,frames);return{paint,frames};};
 return{owner,sources,apply};
}

test('Main058 accepted three-carrier reconstruction has identical full and split material output',()=>{
 const h=fixture(),before=structuredClone(h.sources),result=h.owner.main11369Display058Reconstruction(h.sources);
 assert.equal(result.stats.error,undefined);assert.equal(result.stats.objects,2);
 const full=h.apply(result.components),split=result.components.map(c=>h.apply([c]));
 assert.deepEqual(new Float32Array(split.flatMap(x=>Array.from(x.paint))),full.paint);
 assert.deepEqual(new Float32Array(split.flatMap(x=>Array.from(x.frames))),full.frames);
 assert.deepEqual(h.sources,before,'source geometry and attributes remain unchanged');
});

test('Main058 incomplete source group remains native and cannot acquire derived materials',()=>{
 const h=fixture(),rows=h.sources.slice(0,2),result=h.owner.main11369Display058Reconstruction(rows);
 assert.equal(result.stats.objects,0);assert.deepEqual(result.components,rows);
 const output=h.apply(result.components);assert(output.paint.every(x=>x===0));assert(output.frames.every(x=>x===0));
});

test('Main058 split materials still reject altered privately owned geometry and duplicate carriers',()=>{
 const h=fixture(),rows=h.owner.main11369Display058Reconstruction(h.sources).components;
 assert.throws(()=>h.apply([rows[0],rows[0]]));
 rows[0].batches[1].positions[0]+=1;
 assert.throws(()=>h.apply([rows[0]]),/privately owned DISPLAY changed before materials/);
 assert.throws(()=>h.apply(rows),/privately owned DISPLAY changed before materials/);
});

test('Main058 full group does not authorize altered or duplicated native source members',()=>{
 for(const mode of ['altered','duplicate']){
  const h=fixture(),rows=structuredClone(h.sources);
  if(mode==='altered')rows[0].batches[1].positions[0]+=1;
  else rows.push(rows[0]);
  const result=h.owner.main11369Display058Reconstruction(rows);
  assert.match(result.stats.error,/exact native SOURCE duplicated or altered/);
  assert.equal(result.stats.objects,0);
 }
});
