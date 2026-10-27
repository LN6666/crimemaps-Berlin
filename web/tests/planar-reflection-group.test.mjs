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

test('solar group unions world bounds and exact resident budgets, preserving optional source readiness',()=>{
 const a={getPlanarReflectionRevision:()=> 'camera-a',getSolarShadowRevision:()=> 'source-a',getSolarShadowCoverage:()=>({bounds:[.1,.2,0,.4,.6,.01],triangles:70,draws:68,complete:true}),renderPlanarReflection:()=>({triangles:0,draws:0,complete:true})};
 const b={...a,getSolarShadowRevision:()=> 'source-b',getSolarShadowCoverage:()=>({bounds:[.3,.1,-.01,.8,.7,.03],triangles:10,draws:8,complete:true})};const group=planarReflectionGroup(()=>[a,b,undefined]);assert.deepEqual(group.getSolarShadowCoverage(),{bounds:[.1,.1,-.01,.8,.7,.03],triangles:80,draws:76,complete:true});assert.equal(group.getSolarShadowRevision(),'["source-a","source-b",null]');
 b.getSolarShadowCoverage=()=>undefined;assert.equal(group.getSolarShadowCoverage().triangles,70);delete b.getSolarShadowCoverage;assert.equal(group.getSolarShadowCoverage().complete,false);
 assert.equal(planarReflectionGroup(()=>[]).getSolarShadowCoverage(),undefined);assert.equal(planarReflectionGroup(()=>[b]).getSolarShadowCoverage().complete,false);
});
test('invalid solar source metadata or pending coverage does not become a complete group',()=>{
 const source={getPlanarReflectionRevision:()=> 'x',renderPlanarReflection:()=>({triangles:0,draws:0,complete:true}),getSolarShadowCoverage:()=>({bounds:[0,0,0,1,1,1],triangles:3,draws:1,complete:false})};const group=planarReflectionGroup(()=>[source]);assert.equal(group.getSolarShadowCoverage().complete,false);source.getSolarShadowCoverage=()=>({bounds:[2,0,0,1,1,1],triangles:3,draws:1,complete:true});assert.equal(group.getSolarShadowCoverage().complete,false);
});

test('solar group reports bounded nested source indices using one existing coverage read',()=>{
 let reads=0;const source={getPlanarReflectionRevision:()=> 'x',renderPlanarReflection:()=>({triangles:0,draws:0,complete:true}),getSolarShadowCoverage(){reads++;return{bounds:[0,0,0,1,1,1],triangles:3,draws:1,complete:false,reason:'missing-program'};}};
 const nested=planarReflectionGroup(()=>[undefined,source]),outer=planarReflectionGroup(()=>[undefined,nested]);assert.equal(outer.getSolarShadowCoverage().reason,'source[1]:source[1]:missing-program');assert.equal(reads,1);source.getSolarShadowCoverage=()=>({bounds:[0,0,0,1,1,1],triangles:3,draws:1,complete:false,reason:'x'.repeat(2000)});assert(nested.getSolarShadowCoverage().reason.length<=523);
});

test('solar preparation forwards once to each available actual source without touching reflection',()=>{let prepared=0,reflected=0;const source={prepareSolarShadow(){prepared++;},getPlanarReflectionRevision:()=> 'r',renderPlanarReflection(){reflected++;return{triangles:0,draws:0,complete:true};}};const group=planarReflectionGroup(()=>[undefined,source]);group.prepareSolarShadow();assert.equal(prepared,1);assert.equal(reflected,0);});
