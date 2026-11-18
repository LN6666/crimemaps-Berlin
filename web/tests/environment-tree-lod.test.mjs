import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
const dir=new URL('../src/safety/',import.meta.url);
async function module(name){const result=await build({entryPoints:[new URL(name,dir).pathname],bundle:true,write:false,platform:'node',format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const lod=await module('environment-tree-lod.ts'),data=await module('environment-scene-data.ts');
const matrix=(scale=.04)=>[scale,0,0,0,0,.01,0,0,0,0,1,0,0,0,0,1];
test('near mesh generator remains byte-for-byte the accepted source; far preserves trunk, five roles and bounds',async()=>{
 const source=await fs.readFile(new URL('environment-scene-data.ts',dir),'utf8');
 const accepted=source.slice(source.indexOf('export function lowPolyTreeMesh'),source.indexOf('let cachedFarTreeDisplayMesh'));
 assert.equal(createHash('sha256').update(accepted).digest('hex'),'212cd37ea1e625ce44fbd54803e63b3e31ee1ad02d65de420218f9a0017877dc');
 const near=data.lowPolyTreeMesh(),far=data.farLowPolyTreeMesh();assert.equal(near.triangles,112);assert.equal(far.triangles,52);assert.equal(far,data.farLowPolyTreeMesh());
 assert.deepEqual(far.positions.slice(0,24*7),near.positions.slice(0,24*7));assert.deepEqual(far.indices.slice(0,36),near.indices.slice(0,36));
 const bounds=new Map();for(let i=0;i<near.positions.length;i+=7){const role=near.positions[i+6],b=bounds.get(role)??[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];for(let j=0;j<3;j++){b[j]=Math.min(b[j],near.positions[i+j]);b[j+3]=Math.max(b[j+3],near.positions[i+j]);}bounds.set(role,b);}
 const roles=new Set();let top=0;for(let i=0;i<far.positions.length;i+=7){const p=far.positions.slice(i,i+7),b=bounds.get(p[6]);roles.add(p[6]);assert(p.every(Number.isFinite));for(let j=0;j<3;j++)assert(p[j]>=b[j]-1e-6&&p[j]<=b[j+3]+1e-6);assert(Math.abs(Math.hypot(...p.slice(3,6))-1)<1e-6);assert(Math.hypot(p[0],p[2])*3*1.08<=near.horizontalRadiusMetres+1e-6);top=Math.max(top,p[1]);}
 assert.equal(top,1);assert.equal(roles.size,6);assert.equal(far.horizontalRadiusMetres,near.horizontalRadiusMetres);assert(far.horizontalRadiusMetres+.08<5);assert(far.indices.every(i=>i<far.vertices));
});
test('12/16 CSS pixel hysteresis keeps the initial middle tier near and rejects near-plane/invalid projections',()=>{
 assert.equal(lod.treeSurfaceLOD(undefined,14),'near');assert.equal(lod.treeSurfaceLOD('near',12),'far');assert.equal(lod.treeSurfaceLOD('far',15.999),'far');assert.equal(lod.treeSurfaceLOD('far',16),'near');
 assert.equal(lod.projectedTreeCrownPixels(matrix(),0,0,7,3,100,100),12);
 assert.equal(lod.projectedTreeCrownPixels(matrix(),0,0,7,3,200,100),24);
 const invalid=matrix();invalid[15]=0;assert.equal(lod.projectedTreeCrownPixels(invalid,0,0,7,3,100,100),Infinity);invalid[15]=1;invalid[0]=NaN;assert.equal(lod.projectedTreeCrownPixels(invalid,0,0,7,3,100,100),Infinity);
});
test('camera/CSS/selection cache does no repeated evaluation and retains only current per-ID hysteresis',()=>{
 const state=lod.createEnvironmentTreeLOD(2,3),trees=new Float32Array([0,0,7,20,0,7]);state.setSelected(['a','b']);assert(state.update(matrix(.04),100,100,trees));assert.equal(state.far,2);
 const flags=state.farFlags,evaluations=state.evaluations;assert.equal(state.update(matrix(.04),100,100,trees),false);assert.equal(state.evaluations,evaluations);assert.equal(state.farFlags,flags);
 assert.equal(state.update(matrix(.045),100,100,trees),false);assert.equal(state.far,2,'middle band retains far');assert(state.update(matrix(.045),200,100,trees));assert.equal(state.near,2,'CSS resize promotes without changing physical viewport');
 state.update(matrix(.04),100,100,trees);state.setSelected(['b','c']);state.update(matrix(.045),100,100,trees);assert.deepEqual(Array.from(state.farFlags),[1,0],'surviving b stays far; new c starts middle near');assert.equal(state.stateCount,2);
 state.setSelected([]);assert.equal(state.stateCount,0);state.update(matrix(),100,100,trees);assert.equal(state.near+state.far,0);
 state.setSelected(['a']);state.update(matrix(),100,100,trees);state.clear();assert.equal(state.stateCount,0);assert.equal(state.near+state.far,0);assert.deepEqual(Array.from(state.farFlags),[0,0]);assert.throws(()=>state.setSelected(['a','b','c']),/Invalid/);assert.throws(()=>state.setSelected(['a','a']),/Invalid/);
});
