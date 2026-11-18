import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// The verified solar boundary index (shared by the environment and every
// building renderer) is admitted on the page ResourceBudget before its single
// index buffer is allocated, exposes its costs under per-index identities so
// owners deduplicate, and answers covers() against an independent segment
// clipping reference using per-ring bucket arrays.
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=file=>fs.readFile(path.join(web,file),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const FAMILIES=['city','delegated500','root500','church','infill','bremen','tier300'];
const entry=`export * from './solar-shadow-admission';export {createResourceBudget,getPageResourceBudget,ResourceBudgetExceededError} from './render-runtime/resource-budget';`;
const built=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022'});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=solar-boundary-under-test.mjs').toString('base64'));
const MiB=1024*1024,WRAPPER=m.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
let shaSerial=0;const nextSha=()=>(++shaSerial).toString(16).padStart(64,'0');
const ledger=(limitBytes=64*MiB)=>m.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,MiB)});

// Former per-ring index with independent parametric segment/rectangle clipping.
// Unlike the production separating-axis test, this intersects parameter ranges.
function referencePrepare(value){
 if(!value||!/^[a-f0-9]{64}$/.test(value.boundarySHA256)||!value.geometry||!['Polygon','MultiPolygon'].includes(value.geometry.type))throw Error('Invalid verified solar boundary');
 const overlap=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
 const bucket=(y,box)=>Math.max(0,Math.min(63,Math.floor((y-box[1])/Math.max(1e-12,box[3]-box[1])*64)));
 let vertices=0,entries=0,edges=0,rings=0;
 const source=value.geometry.type==='Polygon'?[value.geometry.coordinates]:value.geometry.coordinates;
 if(!source.length||source.length>10000)throw Error('Invalid solar boundary polygons');
 const polygons=source.map(polygon=>{
  if(!Array.isArray(polygon)||!polygon.length)throw Error('Invalid solar boundary polygon');
  return polygon.map(points=>{
   if(!Array.isArray(points)||points.length<4)throw Error('Invalid solar boundary ring');
   const first=points[0],last=points[points.length-1];if(first[0]!==last[0]||first[1]!==last[1])throw Error('Open solar boundary ring');
   let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
   for(const p of points){if(!Array.isArray(p)||p.length<2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>85||++vertices>200000)throw Error('Solar boundary vertex budget');west=Math.min(west,p[0]);east=Math.max(east,p[0]);south=Math.min(south,p[1]);north=Math.max(north,p[1]);}
   const box=[west,south,east,north],edgeArray=new Float64Array((points.length-1)*4),buckets=Array.from({length:64},()=>[]);
   for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];edgeArray.set([a[0],a[1],b[0],b[1]],i*4);const lo=bucket(Math.min(a[1],b[1]),box),hi=bucket(Math.max(a[1],b[1]),box);for(let j=lo;j<=hi;j++)buckets[j].push(i);}
   rings++;edges+=points.length-1;entries+=buckets.reduce((n,row)=>n+row.length,0);
   return {box,edges:edgeArray,buckets};
  });
 });
 const inRing=(ring,x,y)=>{
  if(x<=ring.box[0]||x>=ring.box[2]||y<=ring.box[1]||y>=ring.box[3])return false;
  let inside=false;for(const id of ring.buckets[bucket(y,ring.box)]){const at=id*4,ax=ring.edges[at],ay=ring.edges[at+1],bx=ring.edges[at+2],by=ring.edges[at+3];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;}return inside;
 };
 const contains=(x,y)=>polygons.some(p=>inRing(p[0],x,y)&&!p.slice(1).some(r=>inRing(r,x,y)));
 const covers=box=>{
  if(box.length!==4||!box.every(Number.isFinite)||box[0]>=box[2]||box[1]>=box[3])return false;
  if(!contains(box[0],box[1])||!contains(box[2],box[1])||!contains(box[2],box[3])||!contains(box[0],box[3]))return false;
  for(const polygon of polygons)for(const ring of polygon){
   if(!overlap(box,ring.box))continue;
   const seen=new Set(),lo=bucket(box[1],ring.box),hi=bucket(box[3],ring.box);
   for(let j=lo;j<=hi;j++)for(const id of ring.buckets[j]){
    if(seen.has(id))continue;seen.add(id);const at=id*4,ax=ring.edges[at],ay=ring.edges[at+1],bx=ring.edges[at+2],by=ring.edges[at+3];
    let enter=0,leave=1;
    for(const [start,delta,low,high] of [[ax,bx-ax,box[0],box[2]],[ay,by-ay,box[1],box[3]]]){
     if(delta===0){if(start<low||start>high){enter=1;leave=0;break;}continue;}
     const a=(low-start)/delta,b=(high-start)/delta;
     enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));
    }
    if(enter<=leave)return false;
   }
  }
  return true;
 };
 return {covers,vertices,entries,edges,rings,polygons:polygons.length};
}
const expectedBytes=ref=>8*(4*ref.edges+4*ref.rings)+4*(65*ref.rings+ref.entries+ref.polygons+1);

function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const square=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
function star(rand,cx,cy,radius,n){
 const angles=Array.from({length:n},()=>rand()*Math.PI*2).sort((a,b)=>a-b),ring=angles.map(a=>{const r=radius*(.3+.7*rand());return[cx+r*Math.cos(a),cy+r*Math.sin(a)];});
 if(rand()<.2)ring.splice(1,0,[...ring[0]]);// duplicated vertex
 if(rand()<.2){const p=ring[ring.length-1];ring.push([p[0]+radius*.1,p[1]]);}// horizontal edge
 ring.push([...ring[0]]);return ring;
}
function geometry(rand,kind){
 const cx=-170+(kind===2?320:340)*rand(),cy=-80+160*rand(),R=.001+2*rand();
 if(kind===0)return{type:'Polygon',coordinates:[square(cx-R,cy-R*.5,cx+R,cy+R*.5)]};
 if(kind===1)return{type:'Polygon',coordinates:[star(rand,cx,cy,R,3+Math.floor(rand()*40)),...Array.from({length:Math.floor(rand()*3)},()=>star(rand,cx+(rand()-.5)*R*.6,cy+(rand()-.5)*R*.6,R*.2,3+Math.floor(rand()*10)))]};
 if(kind===2)return{type:'MultiPolygon',coordinates:Array.from({length:2+Math.floor(rand()*3)},(_,i)=>[star(rand,cx+i*R*2.2,cy,R,3+Math.floor(rand()*25)),...(rand()<.5?[square(cx+i*R*2.2-R*.1,cy-R*.1,cx+i*R*2.2+R*.1,cy+R*.1)]:[])])};
 // Nearly flat ring: north-south span close to the 1e-12 bucket floor.
 return{type:'Polygon',coordinates:[[[cx-R,cy],[cx+R,cy],[cx+R,cy+1e-13],[cx-R,cy+2e-13],[cx-R,cy]]]};
}
function boxes(rand,geom,count){
 const points=geom.coordinates.flat(geom.type==='Polygon'?1:2),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),w=Math.max(x1-x0,1e-9),h=Math.max(y1-y0,1e-9),result=[];
 for(let i=0;i<count;i++){
  const cx=x0-w*.2+rand()*w*1.4,cy=y0-h*.2+rand()*h*1.4,bw=w*Math.pow(10,-4*rand()),bh=h*Math.pow(10,-4*rand());
  result.push([cx-bw/2,cy-bh/2,cx+bw/2,cy+bh/2]);
 }
 for(const p of points.slice(0,8)){result.push([p[0],p[1],p[0]+w*.01,p[1]+h*.01]);result.push([p[0]-w*.01,p[1]-h*.01,p[0],p[1]]);}
 result.push([x0,y0,x1,y1],[x0+w*.4,y0+h*.4,x0+w*.6,y0+h*.6],[1,1,1,1],[2,0,1,3],[0,0,Infinity,1],[NaN,0,1,1]);
 return result;
}

test('covers() matches independent segment clipping on randomized boundaries and boxes',t=>{
 const rand=random(20261101),budget=ledger();let compared=0,covered=0;
 for(let g=0;g<80;g++){
  const geom=geometry(rand,g%4),sha=nextSha(),ref=referencePrepare({boundarySHA256:sha,geometry:geom}),prepared=m.prepareSolarShadowBoundary({boundarySHA256:sha,geometry:geom},{budget});
  assert.equal(prepared.vertices,ref.vertices);assert.equal(prepared.boundarySHA256,sha);
  for(const box of boxes(rand,geom,150)){const expected=ref.covers(box);assert.equal(prepared.covers(box),expected,JSON.stringify({g,box}));compared++;if(expected)covered++;}
 }
 assert.ok(compared>12000&&covered>500,'both covered and rejected boxes are exercised: '+covered+'/'+compared);
 t.diagnostic('covered '+covered+' of '+compared+' compared boxes');
});

test('invalid boundaries throw the same errors without admission or cache entries',()=>{
 const budget=ledger(),ring=square(0,0,1,1),big=Array.from({length:200001},(_,i)=>[i/200001,Math.sin(i)*10]);big[big.length-1]=[...big[0]];
 const cases=[
  {boundarySHA256:'x',geometry:{type:'Polygon',coordinates:[ring]}},
  {boundarySHA256:'a'.repeat(64),geometry:{type:'Point',coordinates:[ring]}},
  {geometry:{type:'MultiPolygon',coordinates:[]}},
  {geometry:{type:'Polygon',coordinates:[]}},
  {geometry:{type:'Polygon',coordinates:'abc'}},
  {geometry:{type:'MultiPolygon'}},
  {geometry:{type:'Polygon',coordinates:[ring.slice(0,3)]}},
  {geometry:{type:'Polygon',coordinates:[[...ring.slice(0,4),[0.5,0.5]]]}},
  {geometry:{type:'Polygon',coordinates:[[[0,0],[181,0],[1,1],[0,1],[0,0]]]}},
  {geometry:{type:'Polygon',coordinates:[[[0,0],[1,NaN],[1,1],[0,1],[0,0]]]}},
  {geometry:{type:'MultiPolygon',coordinates:[[ring],[[[0,0],[1,0],[0,86],[0,0]]]]}},
  {geometry:{type:'Polygon',coordinates:[big]}},
 ];
 for(const value of cases){
  const input={boundarySHA256:value.boundarySHA256??nextSha(),geometry:value.geometry};
  let expected;try{referencePrepare(input);}catch(error){expected=error;}
  assert.ok(expected,'reference rejects '+JSON.stringify(input).slice(0,80));
  assert.throws(()=>m.prepareSolarShadowBoundary(input,{budget}),error=>error.constructor===expected.constructor&&error.message===expected.message);
  if(/^[a-f0-9]{64}$/.test(input.boundarySHA256))assert.equal(m.currentSolarShadowBoundary(input.boundarySHA256),undefined);
 }
 assert.equal(budget.stats.reservations,0,'nothing is admitted for an invalid boundary');assert.equal(budget.stats.pressureEvents,0);
});

test('the exact single-buffer index is admitted before it is allocated, and a strict refusal allocates and caches nothing',()=>{
 const geom={type:'MultiPolygon',coordinates:[[square(13.3,52.4,13.5,52.6),square(13.35,52.45,13.4,52.5)],[square(13.6,52.4,13.7,52.5)]]},sha=nextSha(),ref=referencePrepare({boundarySHA256:sha,geometry:geom});
 const bytes=expectedBytes(ref);assert.equal(m.solarShadowBoundaryIndexBytes({boundarySHA256:sha,geometry:geom}),bytes);
 const Original=globalThis.ArrayBuffer,built=[],budget=ledger(MiB),blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-bytes,precision:'exact'});
 globalThis.ArrayBuffer=new Proxy(Original,{construct(target,args){built.push({bytes:args[0],charged:budget.stats.categories.shadow?.exactBytes??0});return Reflect.construct(target,args);}});
 try{
  assert.throws(()=>m.prepareSolarShadowBoundary({boundarySHA256:sha,geometry:geom},{budget,whenRefused:'throw'}),m.ResourceBudgetExceededError);
  assert.equal(built.length,0,'a refused index allocates no buffer');assert.equal(m.currentSolarShadowBoundary(sha),undefined);assert.equal(budget.stats.reservations,1);
  blocker.release();
  const prepared=m.prepareSolarShadowBoundary({boundarySHA256:sha,geometry:geom},{budget});
  assert.deepEqual(built,[{bytes,charged:bytes}],'one exact buffer, charged before construction');
  assert.equal(m.currentSolarShadowBoundary(sha),prepared);
  const costs=m.solarShadowBoundaryCosts(prepared);
  assert.equal(costs.length,2);assert.deepEqual(costs.map(c=>[c.category,c.bytes,c.precision]),[['shadow',bytes,'exact'],['shadow',WRAPPER,'estimate']]);
  assert.ok(costs.every(c=>typeof c.identity==='object'&&c.identity!==null));assert.notEqual(costs[0].identity,costs[1].identity);
  assert.equal(budget.stats.bytes,bytes+WRAPPER);assert.equal(budget.stats.exactBytes,bytes);
  assert.equal(m.prepareSolarShadowBoundary({boundarySHA256:sha,geometry:geom},{budget}),prepared,'a cached hash is never re-admitted');
  assert.equal(built.length,1);assert.equal(budget.stats.reservations,1);
 }finally{globalThis.ArrayBuffer=Original;}
 assert.deepEqual(m.solarShadowBoundaryCosts(undefined),[]);assert.deepEqual(m.solarShadowBoundaryCosts({boundarySHA256:sha,covers:()=>false,vertices:0}),[]);
});

test('environment and building holders deduplicate by identity and keep the index charged after cache eviction',()=>{
 const budget=ledger(),geom=sha=>({boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[square(13.3,52.4,13.5,52.6)]}});
 const a=nextSha(),b=nextSha(),c=nextSha(),prepared=m.prepareSolarShadowBoundary(geom(a),{budget}),own=budget.stats.bytes;
 const environment=budget.reserve(m.solarShadowBoundaryCosts(prepared)),building=budget.reserve(m.solarShadowBoundaryCosts(m.prepareSolarShadowBoundary(geom(a),{budget})));
 assert.equal(budget.stats.bytes,own,'module cache, environment and building claims count the index once');assert.equal(budget.stats.allocations,2);
 m.prepareSolarShadowBoundary(geom(b),{budget});m.prepareSolarShadowBoundary(geom(a),{budget});m.prepareSolarShadowBoundary(geom(c),{budget});
 assert.equal(m.currentSolarShadowBoundary(a),undefined,'FIFO eviction: a cache hit does not reorder');assert.ok(m.currentSolarShadowBoundary(b));assert.ok(m.currentSolarShadowBoundary(c));
 assert.equal(budget.stats.bytes,own*3,'evicted index stays charged by its live holders');
 environment.release();assert.equal(budget.stats.bytes,own*3,'the building still holds it');
 building.release();assert.equal(budget.stats.bytes,own*2,'released by its last holder');
 const stats=m.solarShadowBoundaryCacheStats();assert.equal(stats.entries,2);assert.equal(stats.maxEntries,2);
});

test('an index larger than the whole ledger is reported unfit and never waits',async()=>{
 const budget=ledger(2048),sha=nextSha(),value={boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[square(0,0,1,1)]}};
 assert.throws(()=>m.prepareSolarShadowBoundary(value,{budget}),error=>error instanceof m.SolarShadowBoundaryUnfitError&&error.code==='SOLAR_BOUNDARY_UNFIT'&&error.retryable===false&&error.limitBytes===2048&&error.requiredBytes===m.solarShadowBoundaryIndexBytes(value)+WRAPPER);
 await assert.rejects(m.admitSolarShadowBoundary(value,{budget,signal:new AbortController().signal}),m.SolarShadowBoundaryUnfitError);
 assert.equal(budget.stats.availabilityListeners,0);assert.equal(budget.stats.reservations,0);assert.equal(m.currentSolarShadowBoundary(sha),undefined);
});

test('a pending admission waits for one ledger wake-up; an aborted one reserves and caches nothing',async()=>{
 const budget=ledger(MiB),sha=nextSha(),value={boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[square(13.3,52.4,13.5,52.6),square(13.35,52.45,13.4,52.5)]}};
 const bytes=m.solarShadowBoundaryIndexBytes(value),blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-100,precision:'exact'});
 const cancelled=new AbortController(),first=m.admitSolarShadowBoundary(value,{budget,signal:cancelled.signal});
 assert.equal(budget.stats.availabilityListeners,1,'waits on the ledger, not a timer');
 cancelled.abort();await assert.rejects(first,{name:'AbortError'});
 assert.equal(budget.stats.availabilityListeners,0);assert.equal(budget.stats.reservations,1);assert.equal(m.currentSolarShadowBoundary(sha),undefined);
 const second=m.admitSolarShadowBoundary(value,{budget,signal:new AbortController().signal});
 assert.equal(budget.stats.availabilityListeners,1);
 blocker.release();
 const prepared=await second;
 assert.equal(m.currentSolarShadowBoundary(sha),prepared);assert.equal(budget.stats.bytes,bytes+WRAPPER);assert.equal(budget.stats.availabilityListeners,0);
 assert.equal(prepared.covers([13.31,52.41,13.32,52.42]),true);assert.equal(prepared.covers([13.36,52.46,13.37,52.47]),false);
});

test('a refused legacy synchronous preparation is built over budget, reported, and charged at the first wake-up that can hold it',async()=>{
 const geom={type:'MultiPolygon',coordinates:[[square(13.3,52.4,13.5,52.6),square(13.35,52.45,13.4,52.5)],[square(13.6,52.4,13.7,52.5)]]},sha=nextSha(),value={boundarySHA256:sha,geometry:geom},ref=referencePrepare(value);
 const bytes=m.solarShadowBoundaryIndexBytes(value),required=bytes+WRAPPER,budget=ledger(MiB),blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-bytes,precision:'exact'});
 const before=m.solarShadowBoundaryCacheStats(),Original=globalThis.ArrayBuffer,built=[];
 globalThis.ArrayBuffer=new Proxy(Original,{construct(target,args){built.push({bytes:args[0],charged:budget.stats.categories.shadow?.bytes??0});return Reflect.construct(target,args);}});
 let prepared;
 try{prepared=m.prepareSolarShadowBoundary(value,{budget});}finally{globalThis.ArrayBuffer=Original;}
 assert.deepEqual(built,[{bytes,charged:0}],'a caller that cannot wait still gets its one exact buffer, without a claim');
 assert.equal(m.currentSolarShadowBoundary(sha),prepared);
 for(const box of [[13.31,52.41,13.32,52.42],[13.36,52.46,13.37,52.47],[13.61,52.41,13.62,52.42],[13.2,52.3,13.8,52.7]])assert.equal(prepared.covers(box),ref.covers(box));
 let stats=m.solarShadowBoundaryCacheStats();
 assert.equal(stats.overBudgetPreparations,before.overBudgetPreparations+1);assert.equal(stats.unchargedBytes-before.unchargedBytes,required);assert.equal(stats.pendingCharges-before.pendingCharges,1);
 assert.match(stats.lastOverBudget,/built over budget by a synchronous caller/);
 assert.equal(budget.stats.categories.shadow,undefined,'nothing is charged while the ledger cannot hold it');assert.equal(budget.stats.availabilityListeners,1,'one ledger wake-up registration, no timer');
 const pressure=budget.stats.pressureEvents,deferred=stats.deferredWakeups;
 assert.equal(blocker.adjust({category:'texture',bytes:blocker.bytes-1,precision:'exact'}),true);await flush();
 stats=m.solarShadowBoundaryCacheStats();
 assert.equal(stats.deferredWakeups,deferred+1,'a wake-up that cannot hold the index keeps waiting');assert.equal(budget.stats.pressureEvents,pressure,'and never runs the pressure evictors');
 assert.equal(budget.stats.availabilityListeners,1);assert.equal(stats.lateCharges,before.lateCharges);
 blocker.release();await flush();
 stats=m.solarShadowBoundaryCacheStats();
 assert.equal(stats.lateCharges,before.lateCharges+1);assert.equal(stats.unchargedBytes,before.unchargedBytes);assert.equal(stats.pendingCharges,before.pendingCharges);
 assert.equal(budget.stats.bytes,required);assert.equal(budget.stats.categories.shadow.exactBytes,bytes);assert.equal(budget.stats.availabilityListeners,0);
 const holder=budget.reserve(m.solarShadowBoundaryCosts(prepared));assert.equal(budget.stats.bytes,required,'a holder of the same costs is deduplicated against the late charge');holder.release();
 assert.equal(m.prepareSolarShadowBoundary(value,{budget}),prepared,'the cached index is reused, never rebuilt');
 assert.throws(()=>m.prepareSolarShadowBoundary({boundarySHA256:nextSha(),geometry:geom},{budget,whenRefused:'later'}),TypeError);
});

test('dropping an uncharged index from the cache cancels its pending charge',async()=>{
 const budget=ledger(MiB),value={boundarySHA256:nextSha(),geometry:{type:'Polygon',coordinates:[star(random(7),13.4,52.5,.1,300)]}},bigBytes=m.solarShadowBoundaryIndexBytes(value)+WRAPPER;
 const small=()=>({boundarySHA256:nextSha(),geometry:{type:'Polygon',coordinates:[square(13.3,52.4,13.5,52.6)]}}),smallBytes=m.solarShadowBoundaryIndexBytes(small())+WRAPPER;
 assert.ok(bigBytes>3*smallBytes,bigBytes+' vs '+smallBytes);
 const blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-2*smallBytes-10,precision:'exact'}),before=m.solarShadowBoundaryCacheStats();
 m.prepareSolarShadowBoundary(value,{budget});assert.equal(budget.stats.availabilityListeners,1);
 m.prepareSolarShadowBoundary(small(),{budget});m.prepareSolarShadowBoundary(small(),{budget});
 assert.equal(m.currentSolarShadowBoundary(value.boundarySHA256),undefined,'FIFO eviction of the over-budget index');
 assert.equal(budget.stats.availabilityListeners,0,'its pending charge left the ledger with it');
 blocker.release();await flush();
 const stats=m.solarShadowBoundaryCacheStats();assert.equal(stats.lateCharges,before.lateCharges,'an evicted index is never charged later');assert.equal(stats.pendingCharges,0);assert.equal(stats.unchargedBytes,0);
 assert.equal(budget.stats.bytes,2*smallBytes);
});

// The 3D entries commit their manifest before a synchronous boundary setter and
// never retry a committed manifest, so a throwing preparation would leave that 3D
// instance without solar shadows (and a partitioned city without its loader)
// until it is rebuilt. Every production preparation therefore keeps the
// non-throwing default, and a caller that can wait awaits admitSolarShadowBoundary
// before it commits. Neither form of that call-site fix is pinned as source text.
const productionSources=async()=>{const root=path.join(web,'src'),rows=[];for(const name of await fs.readdir(root,{recursive:true}))if(/\.(?:ts|tsx|mts)$/.test(name))rows.push(path.join(root,name));return rows.sort();};
function bodyAfter(source,pattern){const match=pattern.exec(source);if(!match)return undefined;let end=match.index+match[0].length,depth=1;for(;depth&&end<source.length;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}return source.slice(match.index,end);}
test('no production preparation opts into the strict refusal, and a full page ledger cannot break the legacy 3D entry order',async t=>{
 const own=path.join(safety,'solar-shadow-admission.ts'),strict=[],callers=[];
 for(const file of await productionSources()){
  if(file===own)continue;
  const text=await fs.readFile(file,'utf8'),name=path.relative(web,file);
  if(/\bwhenRefused\b/.test(text))strict.push(name);
  if(/\bprepareSolarShadowBoundary\s*\(/.test(text))callers.push(name);
 }
 assert.deepEqual(strict,[],'production preparations keep the non-throwing default; a caller that can wait uses admitSolarShadowBoundary');
 let legacy=0;
 for(const family of FAMILIES){
  const map=await read(`src/painted/${family}/safety/three-dimensional-map.ts`),renderer=await read(`src/painted/${family}/safety/building-mesh-renderer.ts`);
  const setter=bodyAfter(renderer,/\bsetSolarShadowBoundary\s*\(\s*value\s*:[^)]*\)\s*\{/);
  assert.ok(setter&&/\bprepareSolarShadowBoundary\s*\(/.test(setter),family+' prepares its boundary through the shared module, which the replica below calls');
  assert.ok(callers.includes(`src/painted/${family}/safety/building-mesh-renderer.ts`),family+' renderer is seen by the production scan');
  const ensure=bodyAfter(map,/\basync function ensure\s*\(\s*signal\s*:\s*AbortSignal\s*\)\s*\{/)??'',commit=ensure.indexOf('manifest=value;'),setAt=commit<0?-1:ensure.indexOf('setSolarShadowBoundary(',commit);
  const admitsFirst=commit>=0&&/\badmitSolarShadowBoundary\s*\(/.test(ensure.slice(0,commit));
  if(!admitsFirst&&setAt>commit&&/\bif\s*\(\s*manifest\s*\)\s*return\s*;/.test(ensure)&&!/\bmanifest\s*=\s*undefined\b/.test(map))legacy++;
 }
 t.diagnostic('3D entries that commit the manifest before a synchronous boundary and never retry it: '+legacy+' of '+FAMILIES.length+'; production preparation call sites: '+callers.length);
 const page=m.getPageResourceBudget(),geom={type:'Polygon',coordinates:[square(13.3,52.4,13.5,52.6),square(13.35,52.45,13.4,52.5)]},sha=nextSha(),bytes=m.solarShadowBoundaryIndexBytes({boundarySHA256:sha,geometry:geom});
 const blocker=page.reserve({category:'texture',bytes:page.stats.availableBytes-100,precision:'exact'});
 // Replica of ensure()'s commit order and of the renderers' one-line setter.
 let manifest,partitions,solarBoundary;
 const renderer={setSolarShadowBoundary(value){const next=m.prepareSolarShadowBoundary(value);solarBoundary=next;}};
 const ensure=value=>{if(manifest)return;manifest=value;renderer.setSolarShadowBoundary({geometry:geom,boundarySHA256:value.city_boundary.sha256});if(value.index_type==='partitioned-city3d-v1')partitions=value.partitions.map(p=>p.id);};
 const manifestValue={index_type:'partitioned-city3d-v1',partitions:[{id:'p0'},{id:'p1'}],city_boundary:{sha256:sha}};
 assert.doesNotThrow(()=>ensure(manifestValue),'the first 3D entry under a full page ledger does not fail');
 assert.deepEqual(partitions,['p0','p1'],'the partition loader is installed');assert.equal(solarBoundary,m.currentSolarShadowBoundary(sha),'the solar boundary is set');
 assert.equal(solarBoundary.covers([13.31,52.41,13.32,52.42]),true);assert.equal(solarBoundary.covers([13.36,52.46,13.37,52.47]),false);
 ensure(manifestValue);assert.deepEqual(partitions,['p0','p1']);
 assert.equal(page.stats.categories.shadow,undefined);assert.equal(page.stats.availabilityListeners,1);
 blocker.release();await flush();
 assert.equal(page.stats.categories.shadow?.exactBytes,bytes,'the index is charged on the page ledger as soon as it fits');assert.equal(page.stats.availabilityListeners,0);
});

test('a waiting admission sizes the boundary once and asks the ledger again only at a wake-up that can hold it',async()=>{
 const budget=ledger(MiB),sha=nextSha(),coords=[square(13.3,52.4,13.5,52.6),square(13.35,52.45,13.4,52.5)];let reads=0;
 const value={boundarySHA256:sha,geometry:{type:'Polygon',get coordinates(){reads++;return coords;}}};
 const required=m.solarShadowBoundaryIndexBytes({boundarySHA256:sha,geometry:{type:'Polygon',coordinates:coords}})+WRAPPER;
 const blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-100,precision:'exact'});
 const pending=m.admitSolarShadowBoundary(value,{budget,signal:new AbortController().signal});
 assert.equal(reads,1,'validated and sized once before waiting');assert.equal(budget.stats.availabilityListeners,1);
 const pressure=budget.stats.pressureEvents,deferred=m.solarShadowBoundaryCacheStats().deferredWakeups;
 for(let i=0;i<5;i++){assert.equal(blocker.adjust({category:'texture',bytes:blocker.bytes-10,precision:'exact'}),true);await flush();}
 assert.equal(reads,1,'futile wake-ups never re-plan');assert.equal(budget.stats.pressureEvents,pressure,'or run the pressure evictors');
 assert.equal(m.solarShadowBoundaryCacheStats().deferredWakeups,deferred+5);assert.equal(budget.stats.availabilityListeners,1);
 blocker.release();const prepared=await pending;
 assert.equal(reads,1);assert.equal(budget.stats.bytes,required);assert.equal(m.currentSolarShadowBoundary(sha),prepared);assert.equal(budget.stats.availabilityListeners,0);
});

test('a waiting admission counts pressure-reclaimable recent bytes, so a reclaimable wave lets its retry evict',async()=>{
 const budget=m.createResourceBudget({limitBytes:MiB,recentLimitBytes:MiB}),sha=nextSha(),value={boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[square(13.3,52.4,13.5,52.6)]}};
 const required=m.solarShadowBoundaryIndexBytes(value)+WRAPPER,idle=budget.reserve({category:'texture',bytes:2*required,precision:'exact'},{recent:true});
 const blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-100,precision:'exact'});
 const pending=m.admitSolarShadowBoundary(value,{budget,signal:new AbortController().signal});
 assert.equal(budget.stats.availabilityListeners,1);
 const off=budget.onPressure(()=>idle.release());
 assert.equal(budget.notifyReclaimable(),true,'an idle lease became reclaimable without a byte drop');
 const prepared=await pending;off();
 assert.equal(idle.active,false,'the woken retry evicted the idle recent claim');assert.equal(m.currentSolarShadowBoundary(sha),prepared);assert.equal(budget.stats.availabilityListeners,0);
 blocker.release();
});

 test('diagonal segment envelopes do not reject safe boxes; edge contacts and enclosed holes stay refused',()=>{
 const budget=ledger();
 const triangle=m.prepareSolarShadowBoundary({boundarySHA256:nextSha(),geometry:{type:'Polygon',coordinates:[[[0,0],[10,0],[0,10],[0,0]]]}},{budget});
 assert.equal(triangle.covers([1,1,2,2]),true);
 assert.equal(triangle.covers([4,4,5,5]),false);
 assert.equal(triangle.covers([4,4,6,6]),false);
 const hole=m.prepareSolarShadowBoundary({boundarySHA256:nextSha(),geometry:{type:'Polygon',coordinates:[square(0,0,10,10),square(4,4,6,6)]}},{budget});
 assert.equal(hole.covers([3,3,7,7]),false);
 assert.equal(hole.covers([1,1,3,3]),true);
 });

test('bounded projected triangle proof accepts diagonal interior and refuses holes, contact and exhaustion',()=>{
 const budget=ledger(),identity=b=>b;
 const triangle=m.prepareSolarShadowBoundary({boundarySHA256:nextSha(),geometry:{type:'Polygon',coordinates:[[[0,0],[10,0],[0,10],[0,0]]]}},{budget});
 assert.equal(triangle.covers([1,1,8,8]),false);
 assert.equal(m.coversProjectedGroundTriangle(triangle,identity,1,1,8,1,1,8),true);
 assert.equal(m.coversProjectedGroundTriangle(triangle,identity,1,1,9,1,1,9),false);
 const hole=m.prepareSolarShadowBoundary({boundarySHA256:nextSha(),geometry:{type:'Polygon',coordinates:[square(0,0,10,10),square(4,4,5,5)]}},{budget});
 assert.equal(m.coversProjectedGroundTriangle(hole,identity,1,1,9,1,5,9),false);
 let calls=0;
 assert.equal(m.coversProjectedGroundTriangle({...triangle,covers:()=>{calls++;return false;}},identity,1,1,8,1,1,8),false);
 assert(calls<=255);
});
