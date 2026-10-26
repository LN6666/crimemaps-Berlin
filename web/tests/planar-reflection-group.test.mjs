import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:[new URL('../src/safety/planar-reflection-group.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {planarReflectionGroup}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const pass={gl:{},mainMatrix:new Float64Array(16),clipPlaneWorldZ:0,maxTriangles:40000,maxDraws:48};
test('dedicated replacement and all paint providers share a single remaining budget',()=>{
 const seen=[];const source=(id,n,d,complete=true)=>({getPlanarReflectionRevision:()=>id,renderPlanarReflection:p=>{seen.push([id,p.maxTriangles,p.maxDraws]);return{triangles:n,draws:d,complete};}});
 const result=planarReflectionGroup(()=>[source('dedicated',28200,1),undefined,source('city',9000,12),source('tier',2400,6,false)]).renderPlanarReflection(pass);
 assert.deepEqual(seen,[['dedicated',40000,48],['city',11800,47],['tier',2800,35]]);assert.deepEqual(result,{triangles:39600,draws:19,complete:false});
});
test('late resident sources and material changes invalidate the capture revision',()=>{
 let current,revision='a';const group=planarReflectionGroup(()=>[current]);const initial=group.getPlanarReflectionRevision();current={getPlanarReflectionRevision:()=>revision,renderPlanarReflection:()=>({triangles:0,draws:0,complete:true})};
 assert.notEqual(group.getPlanarReflectionRevision(),initial);const loaded=group.getPlanarReflectionRevision();revision='b';assert.notEqual(group.getPlanarReflectionRevision(),loaded);assert.equal(group.getPlanarReflectionRevision(),group.getPlanarReflectionRevision());
});
test('a provider cannot silently overrun the capture budget',()=>{
 const group=planarReflectionGroup(()=>[{getPlanarReflectionRevision:()=>'',renderPlanarReflection:()=>({triangles:40001,draws:1,complete:true})}]);assert.throws(()=>group.renderPlanarReflection(pass),/budget/);
});
