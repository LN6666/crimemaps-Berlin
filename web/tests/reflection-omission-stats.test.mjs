import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

// Fixed economy is the current capture policy, including legacy quality inputs.
// The explicit planner budgets below remain independent fixtures for omission
// selection and diagnostics; they do not restore a selectable quality preset.
const web=new URL('..',import.meta.url).pathname;
const bundle=await build({stdin:{contents:[
  'export * as planner from "./src/safety/resident-planar-reflection.ts";',
  'export * as group from "./src/safety/planar-reflection-group.ts";',
  'export * as capture from "./src/safety/render-runtime/resident-capture.ts";',
  'export {planarReflectionBudget} from "./src/safety/planar-building-reflection.ts";',
].join('\n'),resolveDir:web,loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false});
const {planner,group:{planarReflectionGroup},capture:{createResidentCaptureRuntime},planarReflectionBudget}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const identity=Float64Array.from({length:16},(_,i)=>i%5===0?1:0);
const box=[0,0,0,1,1,1],pass={gl:{},mainMatrix:identity,clipPlaneWorldZ:0,maxTriangles:40000,maxDraws:48};
const selection=r=>({plan:r.plan.map(({program,firstIndex,indexCount})=>({program,firstIndex,indexCount})),components:r.components,triangles:r.triangles,draws:r.draws,complete:r.complete,reason:r.reason,pending:r.pending});

test('legacy quality inputs use the fixed economy reflection budget',()=>{
  for(const quality of ['economy','balanced','detail']){
    assert.deepEqual(planarReflectionBudget(quality),{pixels:32768,maxDimension:512,maxTriangles:15000,maxDraws:24,fps:2},quality+' desktop');
    assert.deepEqual(planarReflectionBudget(quality,true),{pixels:16384,maxDimension:256,maxTriangles:30000,maxDraws:24,fps:2},quality+' mobile');
  }
});

test('the planner counts only whole components skipped for the pass budget',()=>{
  const p={},owner={};
  // Oversized first component skipped, later smaller one admitted (existing rule).
  const over=planner.planResidentReflection([{start:0,end:12,box},{start:12,end:18,box}],[{firstIndex:0,indexCount:18,program:p}],identity,2,1,18);
  assert.deepEqual(selection(over),{plan:[{program:p,firstIndex:12,indexCount:6}],components:[{start:12,end:18,box}],triangles:2,draws:1,complete:false,reason:'capture-budget',pending:undefined});
  assert.deepEqual(over.budgetOmitted,{components:1,triangles:4,draws:1});
  // A reserved missing-program component is pending, not omitted; the next one is omitted for budget.
  const reserved=planner.planResidentReflection([{start:0,end:6,box},{start:6,end:12,box}],[{firstIndex:0,indexCount:6,program:undefined},{firstIndex:6,indexCount:6,program:owner}],identity,2,2,12);
  assert.equal(reserved.reason,'missing-program');assert.equal(reserved.pending,true);assert.equal(reserved.plan.length,0);
  assert.deepEqual(reserved.budgetOmitted,{components:1,triangles:2,draws:1});
  // A component needing three run rows costs three draws when omitted.
  const runs=planner.planResidentReflection([{start:0,end:18,box}],[{firstIndex:0,indexCount:6,program:p},{firstIndex:6,indexCount:6,program:owner},{firstIndex:12,indexCount:6,program:p}],identity,100,2,18);
  assert.deepEqual(runs.budgetOmitted,{components:1,triangles:6,draws:3});
  // Culled, invalid and fitting components are never budget omissions.
  const culled=planner.planResidentReflection([{start:0,end:6,box:[5,0,0,6,1,1]}],[{firstIndex:0,indexCount:6,program:p}],identity,0,0,6);
  assert.equal(culled.complete,true);assert.deepEqual(culled.budgetOmitted,{components:0,triangles:0,draws:0});
  const invalid=planner.planResidentReflection([{start:1,end:6,box}],[{firstIndex:0,indexCount:6,program:p}],identity,0,0,6);
  assert.equal(invalid.reason,'invalid-component-range');assert.deepEqual(invalid.budgetOmitted,{components:0,triangles:0,draws:0});
  const fits=planner.planResidentReflection([{start:0,end:6,box}],[{firstIndex:0,indexCount:6,program:p}],identity,2,1,6);
  assert.equal(fits.complete,true);assert.deepEqual(fits.budgetOmitted,{components:0,triangles:0,draws:0});
});

// Resident providers plan inside their synchronous capture, as every painted
// renderer's renderPlanarReflection -> resident capture runtime does.
function resident(id,components,runs,indexCount,seen){
  return{getPlanarReflectionRevision:()=>id,renderPlanarReflection(p){
    seen?.push([id,p.maxTriangles,p.maxDraws]);
    const planned=planner.planResidentReflectionChunks([{components,runs,matrix:identity,indexCount,cull:false}],p.maxTriangles,p.maxDraws);
    return{triangles:planned.triangles,draws:planned.draws,complete:planned.complete,...(planned.reason?{reason:'plan:'+planned.reason}:{}),...(planned.pending?{pending:true}:{})};
  }};
}
const program={},singleRuns=n=>Array.from({length:n},(_,i)=>({firstIndex:i*6,indexCount:6,program})),singles=n=>Array.from({length:n},(_,i)=>({start:i*6,end:i*6+6,box}));

test('nested provider omissions keep the existing reason text and allowances',()=>{
  const seen=[],city=resident('city',singles(30),singleRuns(30),180,seen),bremen=resident('bremen',singles(40),singleRuns(40),240,seen);
  const painted=planarReflectionGroup(()=>[city,bremen],{labels:['city','bremen']}),outer=planarReflectionGroup(()=>[undefined,painted],{labels:['dedicated','painted']});
  const result=outer.renderPlanarReflection(pass);
  assert.deepEqual(seen,[['city',40000,48],['bremen',39940,18]],'allowances are the unchanged remaining budget');
  assert.deepEqual({triangles:result.triangles,draws:result.draws,complete:result.complete,pending:result.pending},{triangles:96,draws:48,complete:false,pending:undefined});
  assert.equal(result.reason,'source[1/painted]:source[1/bremen]:plan:capture-budget','reason format is unchanged');
  assert.deepEqual(result.budgetOmissions,[{source:'source[1/painted]:source[1/bremen]',components:22,triangles:44,draws:22}]);
  assert.deepEqual(painted.reflectionBudgetStats,{captures:1,pending:false,omissions:[{source:'source[1/bremen]',components:22,triangles:44,draws:22}]});
  assert.deepEqual(outer.reflectionBudgetStats,{captures:1,pending:false,omissions:result.budgetOmissions},'steady partial: pending stays false');
  // A fixed view and source give the same omission again; nothing retries to fill it.
  const again=outer.renderPlanarReflection(pass);
  assert.deepEqual({...again},{...result});assert.equal(outer.reflectionBudgetStats.captures,2);
  // Without omissions the result keeps its previous shape exactly.
  const roomy=planarReflectionGroup(()=>[resident('city',singles(2),singleRuns(2),12)],{labels:['city']}).renderPlanarReflection(pass);
  assert.deepEqual(roomy,{triangles:4,draws:2,complete:true});
});

// The r5-r7 Bremen shape (REPORT F4): one painted reason naming city and bremen,
// with painted-map.ts provider order and the main.ts outer labels.
test('city and bremen omitted in one painted group give two rows under the unchanged r5-r7 reason',()=>{
  const order=['root500','delegated500','tier300','church','city','bremen'],seen=[];
  const providers=order.map(id=>id==='city'?resident(id,singles(50),singleRuns(50),300,seen):id==='bremen'?resident(id,singles(20),singleRuns(20),120,seen):resident(id,singles(2),singleRuns(2),12,seen));
  const painted=planarReflectionGroup(()=>providers,{labels:order,requireAll:true}),outer=planarReflectionGroup(()=>[undefined,painted],{labels:['dedicated','painted']});
  const result=outer.renderPlanarReflection(pass);
  assert.deepEqual(seen.map(([id,,draws])=>[id,draws]),[['root500',48],['delegated500',46],['tier300',44],['church',42],['city',40],['bremen',0]],'allowances are the unchanged remaining budget');
  assert.deepEqual({triangles:result.triangles,draws:result.draws,complete:result.complete,pending:result.pending},{triangles:96,draws:48,complete:false,pending:undefined});
  assert.equal(result.reason,'source[1/painted]:source[4/city]:plan:capture-budget;source[5/bremen]:plan:capture-budget','the r5-r7 reason text is unchanged');
  assert.deepEqual(result.budgetOmissions,[{source:'source[1/painted]:source[4/city]',components:10,triangles:20,draws:10},{source:'source[1/painted]:source[5/bremen]',components:20,triangles:40,draws:20}]);
  assert.deepEqual(painted.reflectionBudgetStats,{captures:1,pending:false,omissions:[{source:'source[4/city]',components:10,triangles:20,draws:10},{source:'source[5/bremen]',components:20,triangles:40,draws:20}]});
  assert.deepEqual(outer.reflectionBudgetStats,{captures:1,pending:false,omissions:result.budgetOmissions},'designed steady partial: pending stays false');
});

test('an all-or-nothing dedicated source over its remaining allowance is one omitted component',()=>{
  const dedicated={getPlanarReflectionRevision:()=>'dedicated',getPlanarReflectionCost:()=>({triangles:28200,draws:1}),renderPlanarReflection:p=>p.maxTriangles<28200||p.maxDraws<1?{triangles:0,draws:0,complete:false,reason:'capture-budget'}:{triangles:28200,draws:1,complete:true}};
  const g=planarReflectionGroup(()=>[dedicated,resident('city',singles(2),singleRuns(2),12)],{labels:['dedicated','city']});
  const tight=g.renderPlanarReflection({...pass,maxTriangles:10000});
  assert.equal(tight.reason,'source[0/dedicated]:capture-budget');
  assert.deepEqual(tight.budgetOmissions,[{source:'source[0/dedicated]',components:1,triangles:28200,draws:1}]);
  const fits=g.renderPlanarReflection(pass);
  assert.deepEqual(fits,{triangles:28204,draws:3,complete:true});
});

test('pending captures report only rendered providers, and solar depth passes are not counted',()=>{
  const waiting={getPlanarReflectionRevision:()=>'w',renderPlanarReflection:()=>({triangles:0,draws:0,complete:false,pending:true,reason:'missing-program'})};
  let laterRenders=0;const later={getPlanarReflectionRevision:()=>'l',renderPlanarReflection(){laterRenders++;return{triangles:0,draws:0,complete:true};}};
  const g=planarReflectionGroup(()=>[resident('city',singles(60),singleRuns(60),360),waiting,later],{labels:['city','tier300','bremen']});
  const result=g.renderPlanarReflection(pass);
  assert.equal(result.pending,true);assert.equal(laterRenders,0);
  assert.deepEqual(result.budgetOmissions,[{source:'source[0/city]',components:12,triangles:24,draws:12}]);
  assert.deepEqual(g.reflectionBudgetStats,{captures:1,pending:true,omissions:result.budgetOmissions});
  const solar=planarReflectionGroup(()=>[resident('city',singles(60),singleRuns(60),360)],{labels:['city']}),depth=solar.renderPlanarReflection({...pass,purpose:'solar-depth'});
  assert.equal(depth.budgetOmissions,undefined);assert.deepEqual(solar.reflectionBudgetStats,{captures:0,pending:false,omissions:[]});
  assert.equal(globalThis[planner.RESIDENT_REFLECTION_BUDGET_TALLY],undefined,'no tally outlives a capture');
});

function fakeGL(){
  let draws=0;const constants={},uniform={};
  const named=name=>constants[name]??=Object.keys(constants).length+1;
  const gl=new Proxy({},{get(_target,key){
    if(key==='isContextLost')return()=>false;
    if(key==='getParameter')return parameter=>parameter===named('VIEWPORT')?new Int32Array([0,0,376,174]):null;
    if(key==='getUniformLocation')return()=>uniform;
    if(key==='getUniform')return()=>new Float32Array(16);
    if(key==='isEnabled')return()=>false;
    if(key==='drawElements')return()=>{draws++;};
    if(key==='draws')return draws;
    if(typeof key==='string'&&/^[A-Z][A-Z0-9_]*$/.test(key))return named(key);
    return()=>undefined;
  }});
  return gl;
}
function lease(gl){const value={released:false,state:'ready',context:gl,retain:()=>lease(gl),release(){value.released=true;}};return value;}
function runtimeProvider(id,gl,components,runs,indexCount){
  const chunk={vao:{id},components,runs,indexCount,anchor:[0,0],unit:1,opacity:1,cull:false,skipMasks:true,
    masks:{prepare:()=>({ready:true}),isResident:()=>true,withResidentMasks:(_g,_p,draw)=>{draw();return true;},residentRevision:'m'},
    bindingRevision:()=>'b',bindingsReady:()=>true,matrix:main=>new Float64Array(main),uniforms(){},resetClip(){},bind:(_program,draw)=>draw()};
  const runtime=createResidentCaptureRuntime({revision:()=>id,snapshot:()=>({status:'active',gl,publicationVersion:1,leases:[lease(gl)],chunks:[chunk]})});
  return{runtime,source:{getPlanarReflectionRevision:()=>id,renderPlanarReflection:p=>runtime.render(p)}};
}

test('the real resident capture runtime reports what it actually left out',()=>{
  const gl=fakeGL(),reflectionPass={...pass,gl,mainMatrix:identity};
  const multi=Array.from({length:20},(_,i)=>({start:i*18,end:i*18+18,box})),multiRuns=Array.from({length:60},(_,i)=>({firstIndex:i*6,indexCount:6,program:i%2?program:{}}));
  const city=runtimeProvider('city',gl,singles(40),singleRuns(40),240),bremen=runtimeProvider('bremen',gl,multi,multiRuns,360);
  // Direct runtime results without any group or tally.
  const direct=[city.runtime.render(reflectionPass),bremen.runtime.render({...reflectionPass,maxTriangles:40000-80,maxDraws:48-40})];
  const before=gl.draws;
  const result=planarReflectionGroup(()=>[city.source,bremen.source],{labels:['city','bremen']}).renderPlanarReflection(reflectionPass);
  assert.equal(gl.draws-before,result.draws,'the group draws exactly the planned rows');
  assert.deepEqual({triangles:result.triangles,draws:result.draws},{triangles:direct[0].triangles+direct[1].triangles,draws:direct[0].draws+direct[1].draws},'accounting does not change any provider result');
  assert.deepEqual({triangles:result.triangles,draws:result.draws,complete:result.complete},{triangles:92,draws:46,complete:false});
  assert.deepEqual(direct.map(r=>r.reason),[undefined,'plan:capture-budget']);
  assert.equal(result.reason,'source[1/bremen]:plan:capture-budget');
  assert.deepEqual(result.budgetOmissions,[{source:'source[1/bremen]',components:18,triangles:108,draws:54}]);
  assert(result.draws<=48&&result.triangles<=40000);
});
