import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';

const source=await readFile(new URL('../src/safety/progressive-frame-readback.ts',import.meta.url),'utf8');
const {code}=await transform(source,{loader:'ts',format:'esm',target:'es2022'});
const {countProgressiveFrameVertices,readProgressiveFrameBindings}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

// Original diagnostics: enumerate batch-local vertices and slice/reduce each
// position before spread min/max. These do not use the new interval/scan paths.
const originalCount=frames=>new Set((frames??[]).flatMap(f=>Array.from({length:f.vertexCount},(_,j)=>f.batchIndex+'|'+(f.firstVertex+j)))).size;
function originalBindings(component,frames){
  return (frames??[]).map(f=>{
    const b=component.batches[f.batchIndex],us=[],vs=[];
    for(let j=f.firstVertex;j<f.firstVertex+f.vertexCount;j++){
      const p=b.positions.slice(j*3,j*3+3);
      us.push(f.uAxis.reduce((a,v,k)=>a+v*p[k],0)-f.uOrigin);
      vs.push(f.vAxis.reduce((a,v,k)=>a+v*p[k],0)-f.vOrigin);
    }
    return {batchIndex:f.batchIndex,firstVertex:f.firstVertex,vertexCount:f.vertexCount,family:f.family,uRange:[Math.min(...us),Math.max(...us)],vRange:[Math.min(...vs),Math.max(...vs)],height:f.height,width:f.width,normal:Array.from(b.normals.slice(f.firstVertex*3,f.firstVertex*3+3))};
  });
}
function frame(overrides={}){
  const value={batchIndex:0,firstVertex:0,vertexCount:1,family:4111,uAxis:[1,0,0],vAxis:[0,1,0],uOrigin:0,vOrigin:0,height:2,width:3,...overrides};
  return Object.freeze({...value,uAxis:Object.freeze([...value.uAxis]),vAxis:Object.freeze([...value.vAxis])});
}

test('frame counts preserve the original batch-local union for empty, overlapping, adjacent and duplicate ranges',()=>{
  const cases=[
    ['undefined',undefined,0],
    ['empty',[],0],
    ['unsorted overlap',[{batchIndex:0,firstVertex:3,vertexCount:4},{batchIndex:0,firstVertex:1,vertexCount:4}],6],
    ['adjacent',[{batchIndex:0,firstVertex:0,vertexCount:2},{batchIndex:0,firstVertex:2,vertexCount:3}],5],
    ['duplicate',[{batchIndex:0,firstVertex:2,vertexCount:3},{batchIndex:0,firstVertex:2,vertexCount:3}],3],
    ['distinct batches',[{batchIndex:1,firstVertex:0,vertexCount:3},{batchIndex:0,firstVertex:2,vertexCount:3},{batchIndex:0,firstVertex:0,vertexCount:3}],8]
  ];
  for(const [label,ranges,expected]of cases){
    const frames=ranges&&Object.freeze(ranges.map(r=>Object.freeze({...r}))),before=frames&&[...frames];
    assert.equal(countProgressiveFrameVertices(frames),expected,label);
    assert.equal(countProgressiveFrameVertices(frames),originalCount(frames),label);
    assert.deepEqual(frames,before,label+' keeps frame order and values');
    frames?.forEach((f,i)=>assert.equal(f,before[i],label+' keeps frame identity'));
  }
});

test('frame readback keeps original values, order and inputs for Array and typed positions',()=>{
  for(const Position of [Array,Float32Array,Float64Array]){
    const component={batches:[
      {positions:Position.from([.1,2,3,4,-5,6,7,8,-9]),normals:Position.from([0,0,1,0,1,0,1,0,0])},
      {positions:Position.from([16777217,.25,-2,3,-4,.5]),normals:Position.from([-0,0,1,0,-1,0])}
    ]};
    const frames=Object.freeze([
      frame({batchIndex:1,vertexCount:2,family:4122,uAxis:[.5,1,-.25],vAxis:[-1,0,2],uOrigin:.125,vOrigin:-2}),
      frame({firstVertex:1,vertexCount:2,family:4112}),
      frame({vertexCount:2,family:4111}),
      frame({firstVertex:1,vertexCount:2,family:4112})
    ]),beforeComponent=structuredClone(component),beforeFrames=structuredClone(frames),positions=component.batches.map(b=>b.positions);
    const actual=readProgressiveFrameBindings(component,frames);
    assert.deepEqual(actual,originalBindings(component,frames),Position.name);
    assert.deepEqual(actual.map(f=>f.family),[4122,4112,4111,4112],'readback preserves caller order and duplicates');
    assert.ok(Object.is(actual[0].normal[0],-0),'normal readback preserves negative zero');
    assert.deepEqual(component,beforeComponent,Position.name+' source geometry is unchanged');
    assert.deepEqual(frames,beforeFrames,'frame metadata is unchanged');
    component.batches.forEach((b,i)=>assert.equal(b.positions,positions[i],'canonical positions keep their identity'));
  }
});

test('frame math preserves initial-zero reduction, floating-point order and NaN propagation',()=>{
  // Direct helper parity only: admission validation still decides which source
  // geometry may be rendered; this does not admit a NaN source component.
  const component={batches:[{positions:[-0,-0,-0,NaN,2,3,1e16,-1e16,1],normals:[-0,NaN,1,0,1,0,1,0,0]}]};
  const frames=Object.freeze([
    frame({uAxis:[1,1,1],vAxis:[1,1,1]}),
    frame({firstVertex:1,uAxis:[0,1,0],vAxis:[0,0,1]}),
    frame({firstVertex:2,uAxis:[1,1,1]})
  ]),before=structuredClone(component),actual=readProgressiveFrameBindings(component,frames);
  assert.deepEqual(actual,originalBindings(component,frames));
  assert.ok(Object.is(actual[0].uRange[0],0),'the original reduce starts at positive zero');
  assert.ok(Object.is(actual[0].normal[0],-0));
  assert.ok(Number.isNaN(actual[0].normal[1]));
  assert.ok([...actual[1].uRange,...actual[1].vRange].every(Number.isNaN),'zero axis coefficients still multiply NaN');
  assert.deepEqual(actual[2].uRange,[1,1],'left-to-right cancellation keeps the final unit');
  assert.deepEqual(component,before);
});

test('empty frame readback does not access component geometry',()=>{
  const component={get batches(){throw Error('empty frame readback must not touch geometry');}};
  assert.deepEqual(readProgressiveFrameBindings(component,undefined),[]);
  assert.deepEqual(readProgressiveFrameBindings(component,[]),[]);
});
