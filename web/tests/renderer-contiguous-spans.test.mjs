import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

const built=await build({entryPoints:[fileURLToPath(new URL('../src/safety/renderer-chunk-input.ts',import.meta.url))],bundle:true,platform:'node',format:'esm',write:false});
const {appendContiguousRendererSpan}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const compact=rows=>{const result=[];for(const row of rows)appendContiguousRendererSpan(result,row);return result;};
// Expand the actual clipped index addresses, including buffer identity and
// publication order. This is the observable input to a material draw range.
function addressed(rows,start,end){
 const result=[];
 for(const row of rows)for(let i=Math.max(start,row.firstIndex);i<Math.min(end,row.firstIndex+row.indexCount);i++)result.push([row.chunk.id,row.localFirstIndex+i-row.firstIndex]);
 return result;
}

test('contiguous components use one mapping without changing clipped material or visibility ranges',()=>{
 const chunk={id:'a'},rows=Array.from({length:1000},(_,i)=>({chunk,firstIndex:i*6,indexCount:6,localFirstIndex:300+i*6}));
 const saved=structuredClone(rows),merged=compact(rows);
 assert.equal(merged.length,1);
 for(const [start,end] of [[0,6000],[3,12],[5979,6000],[300,301],[6000,6006],[-3,7]])assert.deepEqual(addressed(merged,start,end),addressed(rows,start,end));
 assert.deepEqual(rows,saved,'source component records remain unchanged');
});

test('buffer boundaries, omitted physical indices and interleaved publication order remain boundaries',()=>{
 const a={id:'a'},b={id:'b'},rows=[
  {chunk:a,firstIndex:0,indexCount:6,localFirstIndex:0},
  {chunk:a,firstIndex:6,indexCount:3,localFirstIndex:12},
  {chunk:b,firstIndex:9,indexCount:6,localFirstIndex:0},
  {chunk:a,firstIndex:15,indexCount:3,localFirstIndex:15},
  {chunk:a,firstIndex:18,indexCount:6,localFirstIndex:18},
 ];
 const merged=compact(rows);assert.equal(merged.length,4);
 for(let first=0;first<=24;first++)for(let last=first;last<=24;last++)assert.deepEqual(addressed(merged,first,last),addressed(rows,first,last));
});

test('logical gaps and empty ranges are not merged away',()=>{
 const chunk={id:'a'},rows=[{chunk,firstIndex:0,indexCount:3,localFirstIndex:0},{chunk,firstIndex:6,indexCount:3,localFirstIndex:3},{chunk,firstIndex:9,indexCount:0,localFirstIndex:6},{chunk,firstIndex:9,indexCount:3,localFirstIndex:6}];
 const merged=compact(rows);assert.equal(merged.length,4);assert.deepEqual(addressed(merged,0,15),addressed(rows,0,15));
});
