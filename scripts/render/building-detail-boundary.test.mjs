import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {simplifyBuildingDetailComponent,sameOrientedTriangleRows} from './building-detail-boundary.mjs';

const modulePath=process.env.CRIMEMAPS_MESHOPT_SIMPLIFIER;
let simplifier;
if(modulePath){const pkg=JSON.parse(await readFile(path.join(path.dirname(modulePath),'package.json'),'utf8'));assert.equal(pkg.name,'meshoptimizer');assert.equal(pkg.version,'1.3.0');({MeshoptSimplifier:simplifier}=await import(pathToFileURL(modulePath).href));await simplifier.ready;}
function batch(materialName,color){return{materialName,color,positions:[],normals:[],indices:[]};}
function triangle(batch,vertices,normal){for(const point of vertices){batch.indices.push(batch.positions.length/3);batch.positions.push(...point);batch.normals.push(...normal);}}
function finish(batch){return{...batch,positions:new Float32Array(batch.positions),normals:new Float32Array(batch.normals),indices:new Uint32Array(batch.indices)};}
function component(batches,holes=0){return{city:'bremen',objectId:'osm/way/1',partId:'synthetic-only',origin:[8.8,53.1],sourceFeature:{type:'Feature',properties:{building:'yes'},geometry:{type:'Polygon',coordinates:[[[8.8,53.1],[8.81,53.1],[8.81,53.11],[8.8,53.1]]]}},componentGeometry:{type:'Polygon',coordinates:Array.from({length:holes+1},()=>[[8.8,53.1],[8.81,53.1],[8.81,53.11],[8.8,53.1]])},batches};}
function prism(redundant=true){
  const outline=redundant?[[0,0],[.33,.001],[.66,0],[1,0],[1,1],[0,1]]:[[0,0],[1,0],[1,1],[0,1]],roof=batch('roof',[.6,.6,.6]),floor=batch('floor',[.3,.3,.3]),walls=batch('walls',[.8,.7,.6]);
  for(let i=0;i<outline.length;i++){
    const a=outline[i],b=outline[(i+1)%outline.length],a0=[a[0],0,a[1]],b0=[b[0],0,b[1]],a1=[a[0],1,a[1]],b1=[b[0],1,b[1]],normal=redundant&&i<3?[0,0,-1]:i===(redundant?3:1)?[1,0,0]:i===(redundant?4:2)?[0,0,1]:i===(redundant?5:3)?[-1,0,0]:[0,0,-1];
    triangle(roof,[[.5,1,.5],b1,a1],[0,1,0]);triangle(floor,[[.5,0,.5],a0,b0],[0,-1,0]);triangle(walls,[a0,b1,b0],normal);triangle(walls,[a0,a1,b1],normal);
  }
  return component([roof,floor,walls].map(finish));
}
function tuple(batch,index){const p=new Uint32Array(batch.positions.buffer,batch.positions.byteOffset,batch.positions.length),n=new Uint32Array(batch.normals.buffer,batch.normals.byteOffset,batch.normals.length);return [...p.subarray(index*3,index*3+3),...n.subarray(index*3,index*3+3)].join(',');}
function assertOriginalTuples(source,candidate){
  for(let b=0;b<source.batches.length;b++){const original=source.batches[b],output=candidate.batches[b],tuples=new Set(Array.from({length:original.positions.length/3},(_,i)=>tuple(original,i)));
    for(let i=0;i<output.positions.length/3;i++)assert(tuples.has(tuple(output,i)),'every position+normal remains an original branch tuple');
    for(const key of Object.keys(original).filter(key=>!['positions','normals','indices'].includes(key)))assert.equal(output[key],original[key]);
  }
  for(const key of Object.keys(source).filter(key=>key!=='batches'))assert.equal(candidate[key],source[key]);
}
function edges(candidate){const counts=new Map();for(const batch of candidate.batches)for(let i=0;i<batch.indices.length;i+=3){const ids=Array.from(batch.indices.subarray(i,i+3),id=>Array.from(batch.positions.subarray(id*3,id*3+3)).join(','));for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],key=a<b?`${a}|${b}`:`${b}|${a}`;counts.set(key,(counts.get(key)??0)+1);}}return counts;}

// Same construction as the canonical flat_mesh decoder: per-edge wall quads
// with outward normals but ring-direction winding, and a roof whose winding
// does not depend on the ring. Here the fan traverses ring edges backwards, so
// walls wind opposite to the roof although the surface is an ordinary open prism.
// The fan starts at a corner off the collinear edge, so no roof triangle is degenerate.
function flatExtrusion(ring,height=3){
  const roof=batch('flat-roof',[.6,.6,.6]),walls=batch('flat-walls',[.8,.7,.6]),n=ring.length;
  const area=ring.reduce((s,p,i)=>s+p[0]*ring[(i+1)%n][1]-ring[(i+1)%n][0]*p[1],0),normalSign=area>0?1:-1;
  for(const p of ring){roof.positions.push(p[0],height,p[1]);roof.normals.push(0,1,0);}
  for(let i=1;i+1<n;i++)roof.indices.push(0,i+1,i);
  for(let j=0;j<n;j++){const a=ring[j],b=ring[(j+1)%n],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),normal=[normalSign*dz/length,0,-normalSign*dx/length],base=walls.positions.length/3;
    walls.positions.push(a[0],0,a[1],b[0],0,b[1],b[0],height,b[1],a[0],height,a[1]);for(let k=0;k<4;k++)walls.normals.push(...normal);walls.indices.push(base,base+1,base+2,base,base+2,base+3);}
  return component([roof,walls].map(finish));
}
function windingSigns(candidate){
  return candidate.batches.map(batch=>{const signs=new Set();for(let i=0;i<batch.indices.length;i+=3){const [a,b,c]=[0,1,2].map(k=>Array.from(batch.positions.subarray(batch.indices[i+k]*3,batch.indices[i+k]*3+3))),u=b.map((v,k)=>v-a[k]),w=c.map((v,k)=>v-a[k]),geometric=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],attribute=Array.from(batch.normals.subarray(batch.indices[i]*3,batch.indices[i]*3+3));signs.add(Math.sign(geometric.reduce((s,v,k)=>s+v*attribute[k],0)));}return [...signs].sort().join(',');});
}
const patchFallbackMustNotRun={ready:Promise.resolve(),simplifyWithAttributes(){throw Error('coordinated collapse should decide this fixture');}};
// Pinwheel ring: its centre sees every ring edge, no ring vertex does, and each
// ring vertex lies at least 0.52 m from the chord of its two neighbours. A fan
// around the centre therefore admits no certified edge collapse, while removing
// the centre and re-triangulating the same polygon is exact.
const PINWHEEL=[[1,0],[.069,.188],[0,1],[-.188,.069],[-1,0],[-.069,-.188],[0,-1],[.188,-.069]];
function centreFan(ring,{height=3,walls=true,opposite=new Set()}={}){
  const roof=batch('fan-roof',[.6,.6,.6]),wall=batch('fan-walls',[.8,.7,.6]),n=ring.length;
  const area=ring.reduce((s,p,i)=>s+p[0]*ring[(i+1)%n][1]-ring[(i+1)%n][0]*p[1],0),normalSign=area>0?1:-1;
  roof.positions.push(0,height,0);roof.normals.push(0,1,0);for(const p of ring){roof.positions.push(p[0],height,p[1]);roof.normals.push(0,1,0);}
  // As in flat_mesh the fan runs against the ring, so walls and roof wind oppositely;
  // triangles named in `opposite` are additionally wound the other way inside the roof.
  for(let i=0;i<n;i++){const a=1+i,b=1+(i+1)%n;roof.indices.push(...(opposite.has(i)?[0,a,b]:[0,b,a]));}
  if(!walls)return component([finish(roof)]);
  for(let j=0;j<n;j++){const a=ring[j],b=ring[(j+1)%n],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),normal=[normalSign*dz/length,0,-normalSign*dx/length],base=wall.positions.length/3;
    wall.positions.push(a[0],0,a[1],b[0],0,b[1],b[0],height,b[1],a[0],height,a[1]);for(let k=0;k<4;k++)wall.normals.push(...normal);wall.indices.push(base,base+1,base+2,base,base+2,base+3);}
  return component([roof,wall].map(finish));
}
// Test-only patch simplifier: removes interior vertices and ear-clips the
// patch's boundary loop in the received (analysis-frame) orientation. `flip`
// returns every new triangle reversed to prove such output is rejected.
function earClipSimplifier({flip=false}={}){
  let calls=0;
  return {ready:Promise.resolve(),get calls(){return calls;},simplifyWithAttributes(indices,positions){
    calls++;const directed=new Set();for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++)directed.add(`${indices[i+k]},${indices[i+(k+1)%3]}`);
    const next=new Map();for(const key of directed){const [a,b]=key.split(',').map(Number);if(!directed.has(`${b},${a}`))next.set(a,b);}
    const loop=[];let at=next.keys().next().value;do{loop.push(at);at=next.get(at);}while(at!==loop[0]&&loop.length<=next.size);
    const xz=i=>[positions[i*3],positions[i*3+2]],orient=(a,b,c)=>{const [ax,az]=xz(a),[bx,bz]=xz(b),[cx,cz]=xz(c);return (bx-ax)*(cz-az)-(bz-az)*(cx-ax);};
    const sign=Math.sign(loop.reduce((s,id,i)=>{const [ax,az]=xz(id),[bx,bz]=xz(loop[(i+1)%loop.length]);return s+ax*bz-bx*az;},0));
    const inside=(p,a,b,c)=>[orient(a,b,p),orient(b,c,p),orient(c,a,p)].every(v=>Math.sign(v)===sign||v===0);
    const ring=[...loop],out=[];
    while(ring.length>3){let clipped=false;
      for(let i=0;i<ring.length&&!clipped;i++){const a=ring[(i+ring.length-1)%ring.length],b=ring[i],c=ring[(i+1)%ring.length];
        if(Math.sign(orient(a,b,c))!==sign||ring.some(p=>p!==a&&p!==b&&p!==c&&inside(p,a,b,c)))continue;
        out.push(...(flip?[b,a,c]:[a,b,c]));ring.splice(i,1);clipped=true;}
      assert(clipped,'fixture polygon must have an ear');
    }
    out.push(...(flip?[ring[1],ring[0],ring[2]]:ring));return [Uint32Array.from(out),0];
  }};
}
function weldedId(source,point){
  const seen=new Map();for(const b of source.batches)for(let i=0;i<b.positions.length;i+=3){const key=Array.from(new Uint32Array(b.positions.buffer,b.positions.byteOffset+i*4,3)).join(',');if(!seen.has(key))seen.set(key,seen.size);}
  return seen.get(Array.from(new Uint32Array(new Float32Array(point).buffer)).join(','));
}

test('walls wound opposite to the roof are analysed coherently and keep their original winding when an exactly collinear wall vertex collapses',async()=>{
  const source=flatExtrusion([[1,1],[1,0],[.5,0],[0,0],[0,1]]),before=source.batches.map(batch=>Array.from(batch.indices));
  assert.deepEqual(windingSigns(source).map(s=>s.split(',').length),[1,1],'each source batch has one consistent winding');
  assert.notEqual(windingSigns(source)[0],windingSigns(source)[1],'the fixture really has roof/wall winding disagreement');
  const result=await simplifyBuildingDetailComponent(source,{ratio:.65,maxErrorM:.08},{simplifier:patchFallbackMustNotRun});
  assert.equal(result.changed,true,result.reason);assert.equal(result.reason,'certified-coordinated-component-collapse');
  assert(result.stats.reorientedTriangles>0,'analysis reversed the minority winding class');assert(result.stats.coordinatedCollapses>=2,'top and bottom collinear vertices collapse');
  assert.equal(result.component.batches.reduce((n,b)=>n+b.indices.length/3,0),source.batches.reduce((n,b)=>n+b.indices.length/3,0)-3);
  assert.deepEqual(windingSigns(result.component),windingSigns(source),'every emitted triangle keeps its batch\'s original winding');
  assert(result.errorBoundM<=.08);assert.equal(result.normalDeviationRad,0);assert.equal(result.proof.topologyPreserved,true);assert.equal(result.proof.selfIntersectionsExcluded,true);
  assertOriginalTuples(source,result.component);assert.deepEqual(source.batches.map(batch=>Array.from(batch.indices)),before,'canonical arrays are untouched');
  assert(Array.isArray(result.collapseSequence)&&result.collapseSequence.length===result.stats.coordinatedCollapses);
  const corners=flatExtrusion([[0,0],[0,1],[1,1],[1,0]]),held=await simplifyBuildingDetailComponent(corners,{ratio:.65,maxErrorM:.25},{simplifier:{ready:Promise.resolve(),simplifyWithAttributes(){return [new Uint32Array(0),0];}}});
  assert.equal(held.changed,false,'a clockwise box whose every vertex is a normal-branch junction stays canonical');assert.equal(held.component,corners);assert.equal(held.reason,'no-certified-boundary-reduction');
});

test('an edge with three faces or a contradictory winding cycle still holds as nonmanifold',async()=>{
  const fan=batch('three-faces',[.5,.5,.5]);
  for(const tip of [[0,1,0],[0,-1,0],[0,0,1]])triangle(fan,[[-1,0,0],[1,0,0],tip],[0,0,1]);
  const result=await simplifyBuildingDetailComponent(component([finish(fan)]),{ratio:.65,maxErrorM:.08},{simplifier:patchFallbackMustNotRun});
  assert.equal(result.changed,false);assert.equal(result.reason,'component-nonmanifold-or-open-boundary-branch');
  // Five-triangle Moebius band: every edge has at most two faces, but the odd
  // adjacency cycle has no coherent orientation, so nothing may be re-oriented.
  const band=batch('moebius',[.5,.5,.5]),ring=[0,1,2,3,4].map(k=>[Math.cos(k*2*Math.PI/5),Math.sin(k*2*Math.PI/5),k%2?.3:-.3]);
  for(let k=0;k<5;k++){const pts=[k,(k+1)%5,(k+2)%5].map(i=>ring[i]),u=pts[1].map((v,a)=>v-pts[0][a]),w=pts[2].map((v,a)=>v-pts[0][a]),n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...n);triangle(band,pts,n.map(v=>v/l));}
  const twisted=component([finish(band)]),held=await simplifyBuildingDetailComponent(twisted,{ratio:.65,maxErrorM:.25},{simplifier:patchFallbackMustNotRun});
  assert.equal(held.changed,false);assert.equal(held.component,twisted);assert.equal(held.reason,'component-nonmanifold-or-open-boundary-branch');
});

test('a reverse-wound patch takes the patch path, restores its original winding and rejects analysis-frame flips',async()=>{
  const source=centreFan(PINWHEEL),before=source.batches.map(batch=>Array.from(batch.indices));
  assert.deepEqual(windingSigns(source).map(s=>s.split(',').length),[1,1],'each source batch has one consistent winding');
  const simplifier=earClipSimplifier(),result=await simplifyBuildingDetailComponent(source,{ratio:.65,maxErrorM:.08},{simplifier});
  assert.equal(result.changed,true,result.reason);assert.equal(result.reason,'certified-component-boundary-reduction');
  assert.equal(simplifier.calls,1,'only the roof patch has an unlocked vertex');assert(result.stats.reorientedTriangles===8,'the roof is the minority winding class');
  assert.equal(result.stats.coordinatedCollapses,0,'no fan-centre collapse is flip-free');assert.equal(result.stats.changedPatches,1);
  assert.equal(result.component.batches[0].indices.length/3,6,'the centre vertex is removed from the roof');assert.equal(result.component.batches[1],source.batches[1],'walls are untouched');
  assert.deepEqual(windingSigns(result.component),windingSigns(source),'the re-triangulated roof keeps the roof batch\'s original winding');
  assert.equal(result.proof.componentTopologyPreserved,true);assert.equal(result.proof.selfIntersectionsExcluded,true);assert(result.errorBoundM<=.08);assert.equal(result.normalDeviationRad,0);
  assert(edges(result.component).size>0&&[...edges(result.component).values()].every(count=>count<=2));
  assertOriginalTuples(source,result.component);assert.deepEqual(source.batches.map(batch=>Array.from(batch.indices)),before,'canonical arrays are untouched');
  const flipped=earClipSimplifier({flip:true}),rejected=await simplifyBuildingDetailComponent(source,{ratio:.65,maxErrorM:.08},{simplifier:flipped});
  assert.equal(flipped.calls,1);assert.equal(rejected.changed,false);assert.equal(rejected.component,source);
  assert.deepEqual(rejected.proof.patchOutcomes,{'patch-topology-hole-orientation-failed':1,'semantic-seams-and-holes-locked':8},'a flipped analysis-frame candidate never reaches emission');
  const mixed=centreFan(PINWHEEL,{walls:false,opposite:new Set([0,1])});
  assert.deepEqual(windingSigns(mixed),['-1,1'],'the roof batch itself mixes windings');
  const held=await simplifyBuildingDetailComponent(mixed,{ratio:.65,maxErrorM:.08},{simplifier:patchFallbackMustNotRun});
  assert.equal(held.changed,false);assert.equal(held.component,mixed);assert.equal(held.stats.reorientedTriangles,2);
  assert.deepEqual(held.proof.patchOutcomes,{'mixed-source-winding-patch':1},'one new triangulation cannot inherit two original windings');
});

test('emitted triangles must equal the analysis output with recorded reversals; orientation is never re-derived',()=>{
  // Coherently wound open-bottom box: roof 2 triangles (batch 0), walls 8 (batch 1).
  const rows=[[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]].map((ids,i)=>[i<2?0:1,ids]);
  assert.equal(sameOrientedTriangleRows(rows,rows),true);
  assert.equal(sameOrientedTriangleRows(rows.map(([b,[x,y,z]])=>[b,[y,z,x]]).reverse(),rows),true,'cyclic rotation and order do not matter');
  const flipped=rows.map((row,i)=>i===3?[row[0],[row[1][0],row[1][2],row[1][1]]]:row);
  assert.equal(sameOrientedTriangleRows(flipped,rows),false,'one flipped emitted triangle is rejected although the output stays coherently orientable');
  assert.equal(sameOrientedTriangleRows(rows.map((row,i)=>i===0?[1,row[1]]:row),rows),false,'a triangle moved to another batch is rejected');
  assert.equal(sameOrientedTriangleRows([...rows.slice(1),rows[2]],rows),false,'multiplicity is compared');
  assert.equal(sameOrientedTriangleRows(rows.map((row,i)=>i===0?[0,[4,5,undefined]]:row),rows),false,'an unmapped emitted vertex is rejected');
});

test('a coarse level replays the certified mid collapse sequence, re-certifies it, and rejects malformed seeds',async()=>{
  const source=flatExtrusion([[1,1],[1,0],[.75,0],[.5,0],[.25,0],[0,0],[0,1]]);
  const mid=await simplifyBuildingDetailComponent(source,{ratio:.65,maxErrorM:.08},{simplifier:patchFallbackMustNotRun});
  assert.equal(mid.changed,true,mid.reason);
  const work={errorSamples:0},coarse=await simplifyBuildingDetailComponent(source,{ratio:.35,maxErrorM:.25},{simplifier:patchFallbackMustNotRun,seed:mid.collapseSequence,work});
  assert.equal(coarse.changed,true,coarse.reason);assert.equal(coarse.stats.seededCollapses,mid.collapseSequence.length);assert.equal(coarse.proof.previousLevelSeedReplayed,true);
  assert(coarse.component.batches.reduce((n,b)=>n+b.indices.length,0)<=mid.component.batches.reduce((n,b)=>n+b.indices.length,0),'coarse never has more triangles than its seed level');
  assert.deepEqual(coarse.collapseSequence.slice(0,mid.collapseSequence.length),mid.collapseSequence);assert(coarse.errorBoundM<=.25);
  assert.deepEqual(windingSigns(coarse.component),windingSigns(source));assertOriginalTuples(source,coarse.component);assert(work.errorSamples>0,'replayed state was re-certified against the original');
  const unusable=await simplifyBuildingDetailComponent(source,{ratio:.35,maxErrorM:.25},{simplifier:patchFallbackMustNotRun,seed:[[100000,0]]});
  const fresh=await simplifyBuildingDetailComponent(source,{ratio:.35,maxErrorM:.25},{simplifier:patchFallbackMustNotRun});
  assert.equal(unusable.stats.seededCollapses,0);assert.deepEqual(unusable.component.batches.map(b=>Array.from(b.indices)),fresh.component.batches.map(b=>Array.from(b.indices)),'an inadmissible seed falls back to the unseeded search');
  await assert.rejects(simplifyBuildingDetailComponent(source,{ratio:.35,maxErrorM:.25},{simplifier:patchFallbackMustNotRun,seed:[[1.5,2]]}),/Invalid previous-level collapse seed/);
});

test('a replayed seed obeys the greedy guard: open-boundary vertices never move along interior edges and non-edges are refused',async()=>{
  // One planar wall split at y=0.2 above its open bottom. Lifting the bottom
  // centre V onto W along the interior edge V-W stays within 0.25 m and keeps
  // the disk topology, so only the open-boundary rule forbids that ground gap.
  const wall=batch('strip',[.8,.7,.6]),xs=[0,.5,1],ys=[0,.2,3],at=(i,j)=>[xs[i],ys[j],0];
  for(let j=0;j<2;j++)for(let i=0;i<2;i++){triangle(wall,[at(i,j),at(i+1,j),at(i+1,j+1)],[0,0,1]);triangle(wall,[at(i,j),at(i+1,j+1),at(i,j+1)],[0,0,1]);}
  const source=component([finish(wall)]),V=weldedId(source,at(1,0)),W=weldedId(source,at(1,1)),corner=weldedId(source,at(0,0)),far=weldedId(source,at(2,2));
  assert(Number.isSafeInteger(V)&&Number.isSafeInteger(W)&&V!==W);
  const fresh=await simplifyBuildingDetailComponent(source,{ratio:.35,maxErrorM:.25},{simplifier:patchFallbackMustNotRun});
  for(const seed of [[[V,W]],[[corner,far]]]){
    const seeded=await simplifyBuildingDetailComponent(source,{ratio:.35,maxErrorM:.25},{simplifier:patchFallbackMustNotRun,seed});
    assert.equal(seeded.stats.seededCollapses,0,`seed ${JSON.stringify(seed)} is refused before any replay`);
    assert.equal(seeded.reason,fresh.reason);assert.deepEqual(seeded.component.batches.map(b=>Array.from(b.indices)),fresh.component.batches.map(b=>Array.from(b.indices)),'a refused seed falls back to the unseeded search');
  }
  const lifted=at(1,1).map(Math.fround).join(',');
  assert(fresh.changed,fresh.reason);
  assert(![...edges(fresh.component)].some(([key,count])=>count===1&&key.split('|').includes(lifted)),'the unseeded search never moves the open bottom rim onto W');
});

test('closed extruded near-collinear outer chains reduce jointly without roof/wall cracks or changed normal branches',{skip:!modulePath},async()=>{
  const source=prism(),before=source.batches.map(batch=>Array.from(batch.positions));
  const result=await simplifyBuildingDetailComponent(source,{ratio:.65,maxErrorM:.08},{simplifier});
  assert.equal(result.changed,true,result.reason);assert(result.stats.coordinatedCollapses>0);assert(result.component.batches.reduce((n,b)=>n+b.indices.length/3,0)<24);
  assert(result.errorBoundM<=.08&&result.errorBoundM>=0);assert.equal(result.normalDeviationRad,0);
  assert.equal(result.proof.hausdorffBound,true);assert.equal(result.proof.topologyPreserved,true);assert.equal(result.proof.holesPreserved,true);assert.equal(result.proof.attributeBranchesPreserved,true);
  assert(result.stats.branchCertificates>0);assert.match(result.proof.metric,/per-original-batch-normal-branch/);assert.equal(result.proof.selfIntersectionsExcluded,true);
  assert([...edges(result.component).values()].every(count=>count===2),'the whole building remains a closed two-manifold');
  assertOriginalTuples(source,result.component);assert.deepEqual(source.batches.map(batch=>Array.from(batch.positions)),before);
});

test('courtyard hole edges, right-angle normal branches and separate materials are not crossed',{skip:!modulePath},async()=>{
  const ring=batch('holed-roof',[.5,.5,.5]),outer=[[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1]],inner=[[-.2,0,-.2],[.2,0,-.2],[.2,0,.2],[-.2,0,.2]];
  for(let i=0;i<4;i++){const j=(i+1)%4;triangle(ring,[outer[i],inner[j],inner[i]],[0,1,0]);triangle(ring,[outer[i],outer[j],inner[j]],[0,1,0]);}
  const holed=component([finish(ring)],1),held=await simplifyBuildingDetailComponent(holed,{ratio:.35,maxErrorM:.25},{simplifier,limits:{maxErrorSamples:1200}});
  if(!held.changed)assert.equal(held.component,holed);else{
    const outputEdges=edges(held.component);for(let i=0;i<4;i++){const a=inner[i].map(Math.fround).join(','),b=inner[(i+1)%4].map(Math.fround).join(','),key=a<b?`${a}|${b}`:`${b}|${a}`;assert(outputEdges.has(key),'original hole edge remains exact');}
    assertOriginalTuples(holed,held.component);
  }
  const cube=prism(false),result=await simplifyBuildingDetailComponent(cube,{ratio:.35,maxErrorM:.25},{simplifier});
  assertOriginalTuples(cube,result.component);if(result.changed)assert([...edges(result.component).values()].every(count=>count===2));
  const originalCorners=new Set([[0,0],[1,0],[1,1],[0,1]].flatMap(([x,z])=>[`${x},0,${z}`,`${x},1,${z}`]));
  const outputPoints=new Set(result.component.batches.flatMap(batch=>Array.from(batch.indices,id=>Array.from(batch.positions.subarray(id*3,id*3+3)).join(','))));
  for(const corner of originalCorners)assert(outputPoints.has(corner),'90-degree shared-chain junction remains');
});

test('unknown UV/frame attributes and protected components stay identical; waiting simplifier cancels',async()=>{
  const source=prism(),unknown={...source,batches:[{...source.batches[0],uv:new Float32Array(4)},...source.batches.slice(1)]},stub={ready:Promise.resolve(),simplifyWithAttributes(){throw Error('must not run');}};
  const result=await simplifyBuildingDetailComponent(unknown,{ratio:.65,maxErrorM:.08},{simplifier:stub});assert.equal(result.changed,false);assert.equal(result.component,unknown);assert.equal(result.reason,'unknown-uv-frame-or-material-attributes');
  const protectedResult=await simplifyBuildingDetailComponent(source,{ratio:.65,maxErrorM:.08},{simplifier:stub,protected:true});assert.equal(protectedResult.component,source);assert.equal(protectedResult.changed,false);
  const controller=new AbortController(),pending=simplifyBuildingDetailComponent(source,{ratio:.65,maxErrorM:.08},{simplifier:{...stub,ready:new Promise(()=>{})},signal:controller.signal});setImmediate(()=>controller.abort());await assert.rejects(pending,{name:'AbortError'});
});

test('certificate work is shared across components and levels instead of resetting the job cap',{skip:!modulePath},async()=>{
  const work={errorSamples:1994},source=prism(),options={simplifier,work,limits:{maxErrorSamples:2000}};
  const mid=await simplifyBuildingDetailComponent(source,{ratio:.65,maxErrorM:.08},options);assert.equal(mid.changed,false);assert.equal(mid.component,source);assert.equal(mid.reason,'surface-certificate-work-bound');assert.equal(work.errorSamples,2000);const intersections=work.intersectionTests;
  const coarse=await simplifyBuildingDetailComponent(source,{ratio:.35,maxErrorM:.25},options);assert.equal(coarse.changed,false);assert.equal(coarse.reason,'surface-certificate-work-bound');assert.equal(work.errorSamples,2000);assert(work.intersectionTests>intersections&&work.intersectionTests<=2000);
});

test('a nearby different material cannot hide removal of a large part of the original branch',{skip:!modulePath},async()=>{
  const red=batch('red',[1,0,0]),blue=batch('blue',[0,0,1]);
  for(const [surface,y] of [[red,0],[blue,.001]]){
    triangle(surface,[[0,y,0],[0,y,1],[1,y,0]],[0,1,0]);triangle(surface,[[1,y,0],[0,y,1],[1,y,1]],[0,1,0]);
  }
  const source=component([finish(red),finish(blue)]),result=await simplifyBuildingDetailComponent(source,{ratio:.65,maxErrorM:.08},{simplifier,limits:{maxErrorSamples:3000}});
  assert.equal(result.changed,false,'the close blue square cannot certify a missing red corner');assert.equal(result.component,source);assert(result.stats.certificateTriangleTests>0);
});

test('geometric crossings are withheld even when Euler and loop counts describe two valid disks',async()=>{
  const a=batch('horizontal',[1,0,0]),b=batch('vertical',[0,0,1]);
  triangle(a,[[-1,0,0],[0,0,1],[1,0,0]],[0,1,0]);triangle(b,[[0,-1,.2],[0,1,.2],[0,0,-.5]],[1,0,0]);
  const source=component([finish(a),finish(b)]),result=await simplifyBuildingDetailComponent(source,{ratio:.65,maxErrorM:.08},{simplifier:{ready:Promise.resolve(),simplifyWithAttributes(){throw Error('crossing source must not simplify');}}});
  assert.equal(result.changed,false);assert.equal(result.component,source);assert.equal(result.reason,'unproven-source-triangle-separation');
});

test('open-bottom courtyard preserves both lower global rims including the inner wall hole chain',{skip:!modulePath},async()=>{
  const outer=[[-2,-2],[-.66,-2],[.66,-2],[2,-2],[2,2],[-2,2]],inner=[[-1,-1],[-.33,-.999],[.33,-1],[1,-1],[1,1],[-1,1]],roof=batch('courtyard-roof',[.6,.6,.6]),walls=batch('courtyard-walls',[.8,.7,.6]);
  const at=(p,y)=>[p[0],y,p[1]];
  for(let i=0;i<outer.length;i++){
    const j=(i+1)%outer.length,a=outer[i],b=outer[j],c=inner[i],d=inner[j];
    triangle(roof,[at(a,1),at(c,1),at(d,1)],[0,1,0]);triangle(roof,[at(a,1),at(d,1),at(b,1)],[0,1,0]);
    const outside=i<3?[0,0,-1]:i===3?[1,0,0]:i===4?[0,0,1]:[-1,0,0],inside=outside.map(v=>-v);
    triangle(walls,[at(a,0),at(b,1),at(b,0)],outside);triangle(walls,[at(a,0),at(a,1),at(b,1)],outside);
    triangle(walls,[at(c,0),at(d,0),at(d,1)],inside);triangle(walls,[at(c,0),at(d,1),at(c,1)],inside);
  }
  const source=component([finish(roof),finish(walls)],1),sourceEdges=edges(source),rim=new Map([...sourceEdges].filter(([,count])=>count===1));
  assert.equal(rim.size,12,'outer and courtyard bottom rims are original open boundaries');
  const result=await simplifyBuildingDetailComponent(source,{ratio:.65,maxErrorM:.08},{simplifier});
  assert.equal(result.changed,true,'the closed upper exterior chain still admits certified simplification');
  const outputEdges=edges(result.component),outputRim=new Map([...outputEdges].filter(([,count])=>count===1));
  assert.deepEqual(outputRim,rim,'every original open-rim edge and multiplicity remains unchanged');
  assertOriginalTuples(source,result.component);if(result.changed)assert.equal(result.proof.holesPreserved,true);else assert.equal(result.component,source);
});
