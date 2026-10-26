import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const C=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const S=process.env.PROJECTED_DETAIL_TEST_BASE??C;
const ts=createRequire(path.join(S,'web/package.json'))('typescript');
const source=fs.readFileSync(path.join(C,'web/src/safety/projected-detail-policy.ts'),'utf8');
const exports={};new Function('exports',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(exports);
const {classifyProjectedDetail:choose}=exports;
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const viewport={cssWidth:1000,cssHeight:500,drawingBufferWidth:2000,drawingBufferHeight:1000};
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-9,`${actual} ≠ ${expected}`);
// 90-degree vertical FOV, aspect 2, near 1, far 101, looking down -Z.
const perspective=[.5,0,0,0,0,1,0,0,0,0,-1.02,-1,0,0,-2.02,0];

test('known orthographic and perspective sizes follow the renderer column-major MVP',()=>{
 const ortho=choose([-.1,0,0,.1,.2,0],identity,viewport);close(ortho.cssExtentPx,100);close(ortho.drawingBufferExtentPx,200);
 const near=choose([-1,0,-10,1,2,-10],perspective,viewport),far=choose([-1,0,-20,1,2,-20],perspective,viewport);close(near.cssExtentPx,50);close(far.cssExtentPx,25);assert.equal(near.quality,'detail');assert.equal(far.quality,'distant');
 // Rotation swaps the box's projected axes; translation does not change extent.
 const rotate=[0,1,0,0,-1,0,0,0,0,0,1,0,.3,-.2,0,1];close(choose([-.2,0,0,.2,.1,0],rotate,viewport).cssExtentPx,100);
});

test('DPR and quality buffer changes do not change CSS hysteresis; actual pixel extent follows the buffer',()=>{
 const box=[-.02,0,0,.02,.01,0],one=choose(box,identity,{...viewport,drawingBufferWidth:1000,drawingBufferHeight:500}),three=choose(box,identity,{...viewport,drawingBufferWidth:3000,drawingBufferHeight:1500}),scaled=choose(box,identity,{...viewport,drawingBufferWidth:750,drawingBufferHeight:375});
 assert.equal(one.quality,'distant');assert.equal(three.quality,one.quality);assert.equal(scaled.quality,one.quality);close(one.cssExtentPx,20);close(three.cssExtentPx,20);close(one.drawingBufferExtentPx,20);close(three.drawingBufferExtentPx,60);close(scaled.drawingBufferExtentPx,15);
 const resized=choose(box,identity,{cssWidth:3000,cssHeight:1500,drawingBufferWidth:3000,drawingBufferHeight:1500});close(resized.cssExtentPx,60);assert.equal(resized.quality,'detail');
});

test('near-plane crossing, behind-camera and selected objects always retain detail',()=>{
 for(const box of [[-.001,0,-2,.001,.001,-.5],[-.001,0,1,.001,.001,2],[-.001,0,-1,.001,.001,-1]]){const result=choose(box,perspective,viewport,'distant');assert.equal(result.quality,'detail');assert.equal(result.reason,'near-plane');assert.equal(result.cssExtentPx,null);}
 const selected=choose([0,0,0,.0001,.0001,0],identity,viewport,'distant',true);assert.equal(selected.quality,'detail');assert.equal(selected.reason,'selected');
});

test('uncertain projections retain detail and offscreen size is not mistaken for occlusion',()=>{
 const box=[0,0,0,.02,.02,0];for(const [b,m,v] of [[box,undefined,viewport],[[0,0,0,-1,1,1],identity,viewport],[box,identity.map((n,i)=>i===0?NaN:n),viewport],[box,identity,{...viewport,drawingBufferWidth:0}]]){const result=choose(b,m,v,'distant');assert.equal(result.quality,'detail');assert.equal(result.reason,'invalid');}
 const offscreen=[...identity];offscreen[12]=5;const result=choose([-.2,0,0,.2,.2,0],offscreen,viewport,'distant');close(result.cssExtentPx,200);assert.equal(result.quality,'detail');
 // An elevated component is measured over the renderer's full birth sweep.
 close(choose([0,.5,0,.001,.6,0],identity,viewport).cssExtentPx,150);
});

test('hysteresis changes quality only at separate entry/exit thresholds',()=>{
 const at=(pixels,previous)=>choose([-pixels/1000,0,0,pixels/1000,0,0],identity,viewport,previous).quality;
 let quality='detail';const seen=[];for(const px of [60,40,32,33,47,48,47,40,31]){quality=at(px,quality);seen.push(quality);}assert.deepEqual(seen,['detail','detail','distant','distant','distant','detail','detail','detail','distant']);
 assert.equal(at(40,undefined),'detail');assert.equal(choose([0,0,0,.001,.001,0],identity,viewport,'distant',false,{enterDistantCssPx:48,enterDetailCssPx:32}).quality,'detail');
});
