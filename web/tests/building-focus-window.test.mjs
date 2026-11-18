import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const code=stripTypeScriptTypes(await readFile(new URL('../src/safety/building-focus-window.ts',import.meta.url),'utf8'),{mode:'strip'});
const {createBuildingFocusWindow,buildingFocusRegion,buildingFocusDensity}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const dimensions=w=>({width:w.core.right-w.core.left,height:w.core.bottom-w.core.top});
test('core growth follows viewport area rather than width and height separately',()=>{
 const policy=createBuildingFocusWindow();policy.measure({width:1000,height:600});
 for(const areaScale of [1,2,4,8,16,128]){
  const scale=Math.sqrt(areaScale),w=policy.measure({width:1000*scale,height:600*scale}),d=dimensions(w);
  assert(Math.abs(d.width*d.height/600000-Math.max(1,areaScale/2))<1e-9);
  assert(Math.abs(w.core.left+w.core.right-w.viewport.width)<1e-8);assert(Math.abs(w.core.top+w.core.bottom-w.viewport.height)<1e-8);
 }
});
test('wall and extreme aspect ratios keep the area rule and remain inside the screen',()=>{
 for(const size of [{width:30720,height:8640},{width:64000,height:600},{width:300,height:32000}]){
  const p=createBuildingFocusWindow();p.measure({width:1000,height:600});const w=p.measure(size),d=dimensions(w);
  assert(Math.abs(d.width*d.height-size.width*size.height/2)<1e-6);
  assert(w.core.left>=0&&w.core.top>=0&&w.core.right<=size.width&&w.core.bottom<=size.height);
 }
});
test('resize cycles and hidden windows cannot inflate the captured reference',()=>{
 const p=createBuildingFocusWindow();assert.equal(p.measure({width:0,height:0}),undefined);
 const first=p.measure({width:1000,height:600});p.measure({width:16000,height:9600});
 assert.equal(p.measure({width:NaN,height:1}),undefined);assert.equal(p.measure({width:1,height:Infinity}),undefined);
 assert.deepEqual(p.measure({width:1000,height:600}),first);
 assert.deepEqual(dimensions(p.measure({width:300,height:200})),{width:300,height:200});
 assert.deepEqual(p.measure({width:1000,height:600}),first);
});
test('moving geometry changes region under a stationary core and unknown projections stay explicit',()=>{
 const p=createBuildingFocusWindow();p.measure({width:1000,height:600});const w=p.measure({width:4000,height:2400});
 assert.equal(buildingFocusRegion(w,{left:1950,top:1150,right:2050,bottom:1250}),'core');
 assert.equal(buildingFocusRegion(w,{left:50,top:50,right:150,bottom:150}),'peripheral');
 assert.equal(buildingFocusRegion(w,{left:-200,top:50,right:-100,bottom:150}),'outside');
 assert.equal(buildingFocusRegion(w,{left:NaN,top:0,right:1,bottom:1}),'unknown');
 assert.equal(buildingFocusRegion(w,{left:2,top:0,right:1,bottom:1}),'unknown');
});

test('density decreases linearly across the entire outer band, reaching minimum only at screen edge',()=>{
 const p=createBuildingFocusWindow();p.measure({width:1000,height:600});const w=p.measure({width:4000,height:2400});
 const midY=1200,margin=w.viewport.width-w.core.right;
 for(const t of [0,.25,.5,.75,1]){
  const x=w.core.right+t*margin,box={left:x,right:x,top:midY,bottom:midY};
  assert(Math.abs(buildingFocusDensity(w,box,.05)-(1-.95*t))<1e-12);
 }
 assert.equal(buildingFocusDensity(w,{left:NaN,right:1,top:0,bottom:1}),undefined);
 assert.throws(()=>buildingFocusDensity(w,w.core,-1),/density/);
});
