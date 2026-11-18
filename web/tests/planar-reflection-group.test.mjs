import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:[new URL('../src/safety/planar-reflection-group.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {planarReflectionGroup}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const pass={gl:{},mainMatrix:new Float64Array(16),clipPlaneWorldZ:0,maxTriangles:40000,maxDraws:48};
test('nested solar preparation identifies the failing provider and preserves its reason',()=>{
 const source=(status,reason)=>({prepareSolarShadow:()=>({status,ready:0,pending:Number(status==='pending'),failed:Number(status==='failed'),reason})});
 const providers=planarReflectionGroup(()=>[source('pending','upload'),source('failed','run-coverage')],{labels:['root500','city']});
 const scene=planarReflectionGroup(()=>[providers],{labels:['painted']});
 const result=scene.prepareSolarShadow();
 assert.equal(result.failed,1);
 assert.equal(result.pending,1);
 assert.equal(result.reason,'source[0/painted]:source[1/city]:run-coverage');
});
test('nested solar publication preserves captured child revisions and revokes replaced or stale children',()=>{
 const seen=new Map(),source=id=>({getPlanarReflectionRevision:()=>id,setSolarShadowPublication:value=>seen.set(id,value),renderPlanarReflection:()=>({triangles:1,draws:1,complete:true})});
 let child=source('original');const nested=planarReflectionGroup(()=>[child]),other=source('other');
 const group=planarReflectionGroup(()=>[other,nested]);
 const proof={sourceRevision:group.getSolarShadowRevision(),bounds:[0,0,0,1,1,1],direction:[0,1,0],targetSize:512,complete:true};
 group.setSolarShadowPublication(proof);
 assert.equal(seen.get('original').sourceRevision,'original');assert.equal(seen.get('other').sourceRevision,'other');
 assert.strictEqual(seen.get('original').bounds,proof.bounds);
 child=source('replacement');group.setSolarShadowPublication(proof);
 assert.equal(seen.get('original'),undefined);assert.equal(seen.get('replacement'),undefined);assert.equal(seen.get('other'),undefined);
 group.setSolarShadowPublication({...proof,sourceRevision:group.getSolarShadowRevision()});
 assert.equal(seen.get('replacement').sourceRevision,'replacement');
 group.setSolarShadowPublication(undefined);assert.equal(seen.get('replacement'),undefined);assert.equal(seen.get('other'),undefined);
});

test('dedicated replacement and all paint providers share a single remaining budget',()=>{
 const seen=[],preparing=[],budgets=[],projections=[];let compiles=0;const source=(id,n,d,complete=true)=>({getPlanarReflectionRevision:()=>id,setPlanarReflectionProjection:projection=>projections.push([id,projection]),...(id==='dedicated'?{getPlanarReflectionCost:()=>({triangles:n,draws:d})}:{preparePlanarReflection(p,budget){preparing.push([id,p.maxTriangles,p.maxDraws]);budgets.push(budget);const prepared=budget.compile(id,'resident',()=>{compiles++;return{};});return{status:prepared.status,ready:Number(prepared.status==='ready'),pending:Number(prepared.status==='pending'),failed:0,plannedTriangles:n,plannedDraws:d};}}),renderPlanarReflection:p=>{seen.push([id,p.maxTriangles,p.maxDraws]);return{triangles:n,draws:d,complete};}});
 const dedicated=source('dedicated',28200,1),city=source('city',9000,12),tier=source('tier',2400,6,false),nested=planarReflectionGroup(()=>[city,tier]),group=planarReflectionGroup(()=>[dedicated,undefined,nested]);
 const projection={mainMatrix:Float64Array.from({length:16},(_,i)=>i%5===0?1:0),sourceMainMatrix:Float64Array.from({length:16},(_,i)=>i%5===0?2:0),width:320,height:180};group.setPlanarReflectionProjection(projection);assert.deepEqual(projections.map(([id,value])=>[id,value===projection]),[['dedicated',true],['city',true],['tier',true]],'the exact mirror/source projection and offscreen size reach every nested provider');assert.equal(compiles,0);group.setPlanarReflectionProjection(undefined);assert(projections.slice(-3).every(([,value])=>value===undefined));
 const prepared=group.preparePlanarReflection(pass);assert.deepEqual(preparing,[['city',11800,47],['tier',2800,35]],'the dedicated all-or-nothing draw reserves its existing cost before nested providers prepare');assert.equal(compiles,1,'the entire group tree shares one actual compile budget');assert.strictEqual(budgets[0],budgets[1]);assert.deepEqual(prepared,{status:'pending',ready:1,pending:1,failed:0,plannedTriangles:39600,plannedDraws:19});
 const result=group.renderPlanarReflection(pass);
 assert.deepEqual(seen,[['dedicated',40000,48],['city',11800,47],['tier',2800,35]]);assert.deepEqual({triangles:result.triangles,draws:result.draws,complete:result.complete},{triangles:39600,draws:19,complete:false});
});
test('late resident sources and material changes invalidate the capture revision',()=>{
 let current,late,revision='a';const changes=[],group=planarReflectionGroup(()=>[current,late]);const initial=group.getPlanarReflectionRevision();current={setCaptureDemand:change=>changes.push(['initial',change.active]),getPlanarReflectionRevision:()=>revision,renderPlanarReflection:()=>({triangles:0,draws:0,complete:true})};
 assert.notEqual(group.getPlanarReflectionRevision(),initial);const loaded=group.getPlanarReflectionRevision();revision='b';assert.notEqual(group.getPlanarReflectionRevision(),loaded);assert.equal(group.getPlanarReflectionRevision(),group.getPlanarReflectionRevision());
 const demand={kind:'reflection',token:'pending-camera',active:true};group.setCaptureDemand(demand);late={...current,setCaptureDemand:change=>changes.push(['late',change.active])};group.setCaptureDemand(demand);current=undefined;group.setCaptureDemand(demand);group.setCaptureDemand({...demand,active:false});assert.deepEqual(changes,[['initial',true],['initial',true],['late',true],['late',true],['initial',false],['late',false]],'refresh reaches late providers and retirement still targets the removed original provider');
});
test('a provider cannot silently overrun the capture budget',()=>{
 const source={getPlanarReflectionRevision:()=>'',renderPlanarReflection:()=>({triangles:40001,draws:1,complete:true})};
 for(const [triangles,draws]of [[-1,1],[40001,1],[3,49]]){source.preparePlanarReflection=()=>({status:'ready',ready:1,pending:0,failed:0,plannedTriangles:triangles,plannedDraws:draws});assert.throws(()=>planarReflectionGroup(()=>[source]).preparePlanarReflection(pass),/Invalid reflection preparation cost|exceeded its capture budget/);}delete source.preparePlanarReflection;
 const inner=planarReflectionGroup(()=>[undefined,source]),group=planarReflectionGroup(()=>[undefined,inner]);assert.throws(()=>group.renderPlanarReflection(pass),/source\[1\]:.*source\[1\]:.*budget/);
 source.renderPlanarReflection=()=>{throw Error('resident draw failed');};assert.throws(()=>group.renderPlanarReflection(pass),/source\[1\]:.*source\[1\]:.*resident draw failed/);
});

test('recoverable pending propagates through nested providers and stops later unreserved draws',()=>{
 for(const reason of ['missing-program','geometry-unready','resident-mask-unready','texture-unready']){
  const seen=[];
  const source=(id,result)=>({getPlanarReflectionRevision:()=>id,renderPlanarReflection(p){seen.push([id,p.maxTriangles,p.maxDraws]);return result;}});
  const first=source('dedicated',{triangles:28200,draws:1,complete:true});
  const pending=source('pending',{triangles:1000,draws:2,complete:false,pending:true,reason});
  const later=source('later',{triangles:2000,draws:6,complete:true});
  const outerLater=source('outer-later',{triangles:800,draws:1,complete:true});
  const nested=planarReflectionGroup(()=>[pending,later]);
  const result=planarReflectionGroup(()=>[first,nested,outerLater]).renderPlanarReflection(pass);
  assert.deepEqual(seen,[['dedicated',40000,48],['pending',11800,47]],reason);
  assert.deepEqual({triangles:result.triangles,draws:result.draws,complete:result.complete,pending:result.pending},{triangles:29200,draws:3,complete:false,pending:true});
  assert.match(result.reason,/^source\[1\]:source\[0\]:/);
  assert(result.reason.includes(reason));assert(result.triangles<=pass.maxTriangles);assert(result.draws<=pass.maxDraws);
 }
});

test('a pending provider becoming ready restores the ordered single-capture budget',()=>{
 let ready=false;const seen=[];
 const source=(id,result)=>({getPlanarReflectionRevision:()=>id,renderPlanarReflection(p){seen.push([id,p.maxTriangles,p.maxDraws]);return result();}});
 const first=source('dedicated',()=>({triangles:28200,draws:1,complete:true}));
 const changing=source('changing',()=>ready?{triangles:9000,draws:40,complete:true}:{triangles:0,draws:0,complete:false,pending:true,reason:'missing-program'});
 const later=source('later',()=>({triangles:2800,draws:7,complete:true}));
 const group=planarReflectionGroup(()=>[first,changing,later]);
 assert.equal(group.renderPlanarReflection(pass).pending,true);
 assert.deepEqual(seen,[['dedicated',40000,48],['changing',11800,47]]);
 ready=true;seen.length=0;
 const result=group.renderPlanarReflection(pass);
 assert.deepEqual(seen,[['dedicated',40000,48],['changing',11800,47],['later',2800,7]],'a new capture starts with the original budget, without carrying draws across frames');
 assert.deepEqual({triangles:result.triangles,draws:result.draws,complete:result.complete},{triangles:40000,draws:48,complete:true});
 assert.equal(Boolean(result.pending),false);
});

test('pure budget partial stays incomplete without becoming pending or blocking remaining budget',()=>{
 const seen=[];
 const first={getPlanarReflectionRevision:()=> 'partial',renderPlanarReflection(p){seen.push(['partial',p.maxTriangles,p.maxDraws]);return{triangles:39999,draws:47,complete:false,reason:'plan:capture-budget'};}};
 const later={getPlanarReflectionRevision:()=> 'later',renderPlanarReflection(p){seen.push(['later',p.maxTriangles,p.maxDraws]);return{triangles:1,draws:1,complete:true};}};
 const result=planarReflectionGroup(()=>[first,later]).renderPlanarReflection(pass);
 assert.deepEqual(seen,[['partial',40000,48],['later',1,1]]);
 assert.deepEqual({triangles:result.triangles,draws:result.draws,complete:result.complete},{triangles:40000,draws:48,complete:false});
 assert.equal(Boolean(result.pending),false);assert.match(result.reason,/^source\[0\]:plan:capture-budget$/);
});

test('permanent structural failures do not imply recoverable pending',()=>{
 for(const reason of ['missing-matrix-uniform','run-coverage','invalid-geometry']){
  let laterCalls=0;
  const first={getPlanarReflectionRevision:()=> 'invalid',renderPlanarReflection:()=>({triangles:3,draws:1,complete:false,reason})};
  const later={getPlanarReflectionRevision:()=> 'later',renderPlanarReflection(){laterCalls++;return{triangles:2,draws:1,complete:true};}};
  const result=planarReflectionGroup(()=>[first,later]).renderPlanarReflection(pass);
  assert.equal(laterCalls,1,reason);assert.equal(Boolean(result.pending),false,reason);
  assert.deepEqual({triangles:result.triangles,draws:result.draws,complete:result.complete},{triangles:5,draws:2,complete:false});
  assert(result.reason.includes(reason));
 }
});

test('capture diagnostics preserve the first nested source reason and bound the aggregate without extra renders',()=>{
 let renders=0;
 const source=reason=>({getPlanarReflectionRevision:()=> 'r',renderPlanarReflection(){renders++;return{triangles:3,draws:1,complete:false,reason};}});
 const inner=planarReflectionGroup(()=>[undefined,source('resident-mask-unready')]);
 const outer=planarReflectionGroup(()=>[undefined,inner,source('missing-matrix-uniform')]);
 const result=outer.renderPlanarReflection(pass);
 assert.deepEqual({triangles:result.triangles,draws:result.draws,complete:result.complete},{triangles:6,draws:2,complete:false});
 assert.match(result.reason,/^source\[1\]:source\[1\]:resident-mask-unready/);assert.match(result.reason,/source\[2\]:missing-matrix-uniform/);assert.equal(renders,2);
 const many=planarReflectionGroup(()=>Array.from({length:10},(_,i)=>source('failure-'+i))).renderPlanarReflection(pass);
 assert.equal((many.reason.match(/source\[/g)??[]).length,8);assert.match(many.reason,/^source\[0\]:failure-0/);assert.doesNotMatch(many.reason,/source\[[89]\]/);assert.equal(renders,12);
 const long=planarReflectionGroup(()=>[source('first:'+('x'.repeat(2048))),source('second:'+('y'.repeat(2048))),source('third:'+('z'.repeat(2048)))]).renderPlanarReflection(pass);
 assert.match(long.reason,/^source\[0\]:first:/);assert(long.reason.length<=1024);assert.equal(renders,15);
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


test('a required provider not yet created is pending, never an inapplicable success',()=>{
 let late;const ready={getPlanarReflectionRevision:()=> 'ready',getSolarShadowCoverage:()=>({bounds:[0,0,0,1,1,1],triangles:3,draws:1,complete:true}),renderPlanarReflection:()=>({triangles:3,draws:1,complete:true})};
 const group=planarReflectionGroup(()=>[ready,late],{labels:['root500','delegated500'],requireAll:true});
 assert.equal(group.preparePlanarReflection(pass).status,'pending','a required missing provider also keeps reflection preparation pending');assert.equal(group.prepareSolarShadow().status,'pending');assert.equal(group.getSolarShadowCoverage().complete,false);
 assert.match(group.getSolarShadowCoverage().reason,/delegated500.*provider-not-created/);assert.equal(group.renderPlanarReflection(pass).complete,false);
 late=ready;assert.equal(group.preparePlanarReflection(pass).status,'ready');assert.equal(group.prepareSolarShadow().status,'ready');assert.equal(group.getSolarShadowCoverage().complete,true);
 assert.equal(group.renderPlanarReflection(pass).complete,true);
});
