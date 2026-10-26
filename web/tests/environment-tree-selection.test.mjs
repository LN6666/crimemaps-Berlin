import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety/environment-tree-selection.ts');
const bundle=await build({entryPoints:[source],bundle:true,write:false,platform:'node',format:'esm'});
const {selectEnvironmentTrees}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const R=6378137,rad=Math.PI/180,geo=(x,y)=>({lon:x/R/rad,lat:(2*Math.atan(Math.exp(y/R))-Math.PI/2)/rad});
const bounds=(a,b,c,d)=>{const low=geo(a,b),high=geo(c,d);return[low.lon,low.lat,high.lon,high.lat];};
const ground=bounds(0,0,1000,1000),candidate=(id,kind,x,y)=>({id,kind,...geo(x,y),evidence:{sourceId:id}});
const keys=result=>result.selected.map(c=>c.id);

test('shared budget selects across cells and native/row/wood, independent of input order',()=>{
 const input=[];
 for(let cell=0;cell<16;cell++) for(const kind of ['native','row','wood']) for(let i=0;i<40;i++)input.push(candidate(`${kind}:${cell}:${i}`,kind,80+(cell%4)*240,80+Math.floor(cell/4)*240));
 const before=JSON.stringify(input),a=selectEnvironmentTrees(input,ground,96),b=selectEnvironmentTrees([...input].reverse(),ground,96),c=selectEnvironmentTrees([...input.slice(701),...input.slice(0,701)],ground,96);
 assert.deepEqual(keys(a),keys(b));assert.deepEqual(keys(a),keys(c));assert.equal(a.selected.length,96);assert.deepEqual(a.selectedByKind,{native:32,row:32,wood:32});
 const perCell=new Map();for(const item of a.selected){const cell=item.id.split(':')[1];perCell.set(cell,(perCell.get(cell)||0)+1);assert.equal(item,input.find(p=>p.id===item.id));}
 assert.equal(perCell.size,16);assert.deepEqual([...new Set(perCell.values())],[6]);assert.equal(JSON.stringify(input),before);assert.ok(a.peakRetainedCandidates<=288);
});
test('ground candidates always precede overscan, even with reversed dense input and same grid cell',()=>{
 const inside=Array.from({length:40},(_,i)=>candidate(`ground:${i}`,'native',1,1)),outside=Array.from({length:200},(_,i)=>candidate(`overscan:${i}`,i%2?'row':'native',-1,-1));
 for(const input of [[...outside,...inside],[...inside,...outside].reverse()]){const a=selectEnvironmentTrees(input,ground,32);assert.equal(a.groundSelected,32);assert.equal(a.overscanSelected,0);}
 const borrowed=selectEnvironmentTrees([...outside,...inside.slice(0,4)],ground,32);assert.equal(borrowed.groundSelected,4);assert.equal(borrowed.overscanSelected,28);
});
test('one sparse kind borrows the complete capacity without arbitrary per-kind quotas',()=>{
 const input=Array.from({length:3000},(_,i)=>candidate(`tree:${i}`,'native',500,500));
 for(const cap of [512,2048]){const result=selectEnvironmentTrees(input,ground,cap);assert.equal(result.selected.length,cap);assert.equal(result.omitted,3000-cap);assert.deepEqual(result.selectedByKind,{native:cap,row:0,wood:0});assert.ok(result.peakRetainedCandidates<=cap);assert.deepEqual(keys(result),keys(selectEnvironmentTrees([...input].reverse(),ground,cap)));}
});
test('streamed candidates retain bounded original references including many overscan cells',()=>{
 function* stream(reverse=false){for(let k=0;k<12000;k++){const i=reverse?11999-k:k;yield candidate(`stream:${i}`,['native','row','wood'][i%3],-40000+(i%200)*500,-40000+Math.floor(i/200)*500);}}
 const a=selectEnvironmentTrees(stream(),ground,96),b=selectEnvironmentTrees(stream(true),ground,96);
 assert.equal(a.examined,12000);assert.equal(a.selected.length,96);assert.ok(a.peakRetainedCandidates<=288);assert.ok(a.occupiedRetainedCells<=288);assert.deepEqual(keys(a),keys(b));
});
test('row samples preserve independent display IDs and source evidence, and selection does not move candidates',()=>{
 const rows=Array.from({length:8},(_,i)=>({...candidate(`osm/way/1:row:${i}`,'row',100+i*10,100),sourceId:'osm/way/1',rowSample:i,role:'source-line-display-schematic-not-source-tree-point'}));
 const a=selectEnvironmentTrees(rows,ground,8);assert.equal(a.selected.length,8);assert.equal(new Set(a.selected.map(x=>x.rowSample)).size,8);assert.ok(a.selected.every(x=>rows.includes(x)&&x.sourceId==='osm/way/1'));
});
test('invalid coordinates are rejected without assets, callbacks or persistent state; zero capacity is empty',()=>{
 const valid=candidate('ok','native',10,10),input=[valid,{...valid,id:'bad',lon:NaN},{...valid,id:'badlat',lat:86},{...valid,id:'badkind',kind:'park'}];
 const a=selectEnvironmentTrees(input,ground,10);assert.equal(a.invalid,3);assert.deepEqual(a.selected,[valid]);assert.equal(a.omitted,0);assert.deepEqual(selectEnvironmentTrees(input,ground,0).selected,[]);assert.throws(()=>selectEnvironmentTrees([],ground,2049),/capacity/);assert.throws(()=>selectEnvironmentTrees([],[-1,0,-2,1],1),/bounds/);
});
test('one-instance view crossing world-grid axes keeps a finite stable grid',()=>{
 const input=[candidate('south-west','wood',-2,-2),candidate('north-east','wood',2,2)],box=bounds(-10,-10,10,10);
 const a=selectEnvironmentTrees(input,box,1),b=selectEnvironmentTrees([...input].reverse(),box,1);
 assert.ok(Number.isFinite(a.cellSizeMetres));assert.equal(a.selected.length,1);assert.deepEqual(keys(a),keys(b));
});
