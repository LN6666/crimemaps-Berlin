import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import earcut from 'earcut';

const built=await build({stdin:{contents:"export {compactGreenGroundMesh} from './environment-ground-lod';",resolveDir:new URL('../src/safety/',import.meta.url).pathname},bundle:true,write:false,platform:'node',format:'esm'});
const {compactGreenGroundMesh}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const vertex=(x,z,role=4)=>[x,.01,z,0,1,0,role];
const quad=(x=0,role=4)=>[vertex(x,0,role),vertex(x+1,0,role),vertex(x+1,1,role),vertex(x,1,role)].flat();
const indices=[0,1,2,0,2,3];
function oriented(mesh){
  const values=Float32Array.from(mesh.positions),bits=new Uint32Array(values.buffer),rows=[];
  for(let i=0;i<mesh.indices.length;i+=3){
    const p=Array.from(mesh.indices).slice(i,i+3).map(v=>Array.from(bits.slice(v*7,v*7+7)).join(':'));
    rows.push([p.join('|'),[p[1],p[2],p[0]].join('|'),[p[2],p[0],p[1]].join('|')].sort()[0]);
  }
  return[...new Set(rows)];
}

test('cross-polygon welding saves referenced vertices; exact duplicate coverage also saves triangles',()=>{
  for(const [second,welded,triangles] of [[quad(1),6,4],[quad(),4,2]]){
    const mesh={positions:[...quad(),...second],indices:[...indices,...indices.map(i=>i+4)]},before=structuredClone(mesh);
    assert.equal(new Set(mesh.indices).size,8,'all input vertices are already referenced');
    const result=compactGreenGroundMesh(mesh);
    assert.equal(result.changed,true);assert.equal(result.stats.outputVertices,welded);assert.equal(result.stats.outputTriangles,triangles);
    assert.equal(result.stats.inputGPUBytes,272);assert.equal(result.stats.outputGPUBytes,welded===6?216:136);
    assert.deepEqual(oriented(result.mesh),oriented(mesh));assert.deepEqual(mesh,before);
    assert(result.stats.outputGPUBytes<result.stats.inputGPUBytes);assert.equal(result.proof.additionalPositionErrorM,0);
  }
});

test('hole triangles, original source geometry and first oriented coverage remain exact',()=>{
  const coordinates=[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[3,3],[3,7],[7,7],[7,3],[3,3]]];
  const source={geometry:{type:'Polygon',coordinates},properties:{sourceGeometry:structuredClone({type:'Polygon',coordinates}),osmTags:{landuse:'grass'}}};
  const before=structuredClone(source),xy=coordinates.flatMap(r=>r.slice(0,-1)).flat(),triangles=earcut(xy,[4],2);
  const positions=xy.flatMap((_,i)=>i%2?[]:vertex(xy[i],xy[i+1]));
  const mesh={positions:[...positions,...positions],indices:[...triangles,...triangles.map(i=>i+8)]};
  const result=compactGreenGroundMesh(mesh);
  assert.equal(result.stats.outputVertices,8);assert.equal(result.stats.outputTriangles,triangles.length/3);
  assert.deepEqual(oriented(result.mesh),oriented(mesh));assert.deepEqual(source,before);
  for(let i=0;i<result.mesh.indices.length;i+=3){
    const points=Array.from(result.mesh.indices).slice(i,i+3).map(v=>[result.mesh.positions[v*7],result.mesh.positions[v*7+2]]);
    const x=points.reduce((n,p)=>n+p[0],0)/3,z=points.reduce((n,p)=>n+p[1],0)/3;
    assert(!(x>3&&x<7&&z>3&&z<7),'no triangle is added to the source hole');
  }
});

test('material role, normal branch, opposite winding and negative zero are never conflated',()=>{
  const material={positions:[...quad(0,4),...quad(0,5)],indices:[...indices,...indices.map(i=>i+4)]};
  assert.equal(compactGreenGroundMesh(material).changed,false);
  const reversed={positions:[...quad(),...quad()],indices:[...indices,6,5,4,7,6,4]};
  const result=compactGreenGroundMesh(reversed);assert.equal(result.stats.outputVertices,4);assert.equal(result.stats.outputTriangles,4);
  assert.deepEqual(oriented(result.mesh),oriented(reversed));
  const signed={positions:[...vertex(-0,0),...vertex(0,0),...vertex(1,1)],indices:[0,1,2]};
  assert.equal(compactGreenGroundMesh(signed).changed,false);
  const normals={positions:[...quad(),...quad()],indices:[...indices,...indices.map(i=>i+4)]};
  for(let i=4;i<8;i++)normals.positions[i*7+4]=-1;
  assert.equal(compactGreenGroundMesh(normals).changed,false);
});

test('caps or non-reference-compact input fall back unchanged; invalid data, deadline and abort fail closed',()=>{
  const mesh={positions:[...quad(),...quad(1)],indices:[...indices,...indices.map(i=>i+4)]};
  const held=compactGreenGroundMesh(mesh,{maxVertices:4});assert.equal(held.changed,false);assert.equal(held.mesh,mesh);assert.equal(held.reason,'packed-cap');
  const unused={positions:[...quad(),...vertex(9,9)],indices};
  assert.equal(compactGreenGroundMesh(unused).reason,'input-not-reference-compact');
  assert.throws(()=>compactGreenGroundMesh({...mesh,indices:[-1,0,1]}),/index/);
  assert.throws(()=>compactGreenGroundMesh({...mesh,positions:mesh.positions.map((v,i)=>i===0?Infinity:v)}),/Float32/);
  assert.throws(()=>compactGreenGroundMesh(mesh,{maxVertices:20001}),/limits/);
  assert.throws(()=>compactGreenGroundMesh(mesh,{deadline:Date.now()-1}),/deadline/);
  const controller=new AbortController();controller.abort();assert.throws(()=>compactGreenGroundMesh(mesh,{signal:controller.signal}),{name:'AbortError'});
});
