import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build,transform} from 'esbuild';
import ts from 'typescript';
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),d=path.join(web,'src/painted/church/safety');
const bundle=await build({stdin:{contents:"export * from './src/painted/church/safety/berlin-church-program-sharing';export {currentPaintProgramGroups} from './src/safety/current-paint-program-groups';export {withResidentReflectionClip} from './src/safety/resident-planar-reflection';export {currentPaintProgramKey} from './src/painted/delegated500/safety/current-paint-program';export {createProgramPreparationOwner} from './src/safety/render-runtime/program-preparation';export {createResourceBudget} from './src/safety/render-runtime/resource-budget';",resolveDir:web,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('the incremental comparison consumes one exact family per admission and publishes only a complete match',()=>{
 const comparison=api.createBerlinChurchProgramComparison(),visited=[];
 for(const family of api.BERLIN_CHURCH_SHARED_FAMILIES){assert.equal(comparison.nextFamily,family);visited.push(family);const result=comparison.accept('same complete submitted fragment');assert.equal(result,family===211?true:undefined);}
 assert.deepEqual(visited,[...api.BERLIN_CHURCH_SHARED_FAMILIES]);assert.equal(comparison.nextFamily,undefined);assert.throws(()=>comparison.accept('late fragment'),/closed/);comparison.clear();
});
test('incremental mismatch and cancellation never publish a shared key or reuse a previous comparison',()=>{
 const changed=api.createBerlinChurchProgramComparison();assert.equal(changed.accept('outer masks + material + reflection'),undefined);assert.equal(changed.accept('changed outer mask + material + reflection'),false);assert.equal(changed.nextFamily,undefined);assert.throws(()=>changed.accept('old fragment'),/closed/);
 const cancelled=api.createBerlinChurchProgramComparison();cancelled.accept('old material');cancelled.clear();assert.equal(cancelled.nextFamily,undefined);assert.throws(()=>cancelled.accept('old material'),/closed/);
 const fresh=api.createBerlinChurchProgramComparison();assert.equal(fresh.nextFamily,200);assert.equal(fresh.accept('new material'),undefined);fresh.clear();
 const empty=api.createBerlinChurchProgramComparison();assert.equal(empty.accept(''),false);assert.equal(empty.nextFamily,undefined);
});
test('all ten observed families share only after complete submitted fragments match',()=>{
 const visited=[];assert(api.berlinChurchProgramsEqual(family=>{visited.push(family);return 'complete vertex-interface + masks + material + light + reflection';}));
 assert.deepEqual(visited,[200,201,202,203,204,205,208,209,210,211]);
 for(const family of visited){const key='current-family:'+family;assert.equal(api.berlinChurchProgramKey(key,true),'current-family:200');assert.equal(api.berlinChurchProgramKey(key,false),key);}
 assert(!api.berlinChurchProgramsEqual(family=>'common body'+(family===209?'changed outer discard':'')));
 assert(!api.berlinChurchProgramsEqual(()=>''));
});
test('unreviewed families and malformed keys always retain independent programs',()=>{
 for(const key of ['current-family:0','current-family:199','current-family:206','current-family:207','current-family:212','current-family:200.1','current-family:0200','current-family:NaN','base']){
  assert(!api.isSharedBerlinChurchFamily(key));assert.equal(api.berlinChurchProgramKey(key,true),key);
 }
});
test('canonical ownership stores one program and deletion occurs once without altering draw families',()=>{
 const draws=[208,203,205,201,200,202,204,211,210,209],programs=new Map(),compiled=[],drawn=[];
 for(const family of draws){const key=api.berlinChurchProgramKey('current-family:'+family,true);if(!programs.has(key)){programs.set(key,{key});compiled.push(key);}drawn.push({family,program:programs.get(key)});}
 assert.deepEqual(compiled,['current-family:200']);assert.deepEqual(drawn.map(row=>row.family),draws);assert(drawn.every(row=>row.program===drawn[0].program));
 const deleted=[];for(const p of programs.values())deleted.push(p);programs.clear();assert.equal(deleted.length,1);
});
async function rendererComparison(t){
 const source=fs.readFileSync(path.join(d,'building-mesh-renderer.ts'),'utf8');
 const ast=ts.createSourceFile('church-renderer.ts',source,ts.ScriptTarget.Latest,true);
 const names=['prepareBerlinFamilyComparison','clearBerlinProgramComparison','publishBerlinFamilySharing',
  'compileGeometryProgram','colourProgramRecipe','colourAttributes','mainFamilyProgramKey','mainPaintProgramKeys'];
 const bindings=new Map();
 function visit(node){
  if(names.includes(node.name?.text)){
   if(ts.isFunctionDeclaration(node))bindings.set(node.name.text,node.getText(ast));
   if(ts.isVariableDeclaration(node))bindings.set(node.name.text,'const '+node.getText(ast)+';');
  }
  ts.forEachChild(node,visit);
 }
 visit(ast);
 assert.deepEqual([...bindings.keys()].sort(),[...names].sort());
 const exports={},reads=[];
 const expose='Object.assign(exports,{prepare:prepareBerlinFamilyComparison,clear:clearBerlinProgramComparison,compile:compileGeometryProgram,programKeys:mainPaintProgramKeys});';
 const built=await transform([...bindings.values(),expose].join('\n'),{loader:'ts',format:'cjs'});
 // The comparison builds each family through the renderer's own prepared
 // source recipe/workspace (the same path compileGeometryProgram submits), on
 // its geometry store's budget, and only while a shared Berlin family is still
 // demanded. Fixture-installed family handles are returned through the owner's
 // releaseProgram seam, which is recorded here.
 const released=[],owner=api.createProgramPreparationOwner('church comparison fixture',()=>{}),budget=api.createResourceBudget({limitBytes:1<<20,recentLimitBytes:0}),demand={runs:[{key:api.currentPaintProgramKey(208),firstIndex:0,indexCount:3}]};
 const programPreparation=new Proxy(owner,{get(target,key){if(key==='releaseProgram')return(_gl,program)=>{released.push(program);};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
 const values={berlinSharedFamilyPrograms:undefined,gl:{isContextLost:()=>false,deleteProgram:()=>assert.fail('family programs are released through the preparation owner')},destroyed:false,pageHidden:false,enabled:true,gpuGeneration:1,berlinProgramComparison:undefined,berlinComparisonFamily:undefined,berlinComparisonResult:undefined,berlinComparisonStep:0,berlinComparisonSourceReservation:undefined,berlinComparisonCharacters:0,berlinComparisonUTF8Bytes:0,programPreparation,
  geometryOwner:{store:{budget}},utf8ByteLength:text=>Buffer.byteLength(text),mainPaintDemand:()=>demand,overrideProgramKey:()=>undefined,reflectionCaptureKeys:()=>new Set(),isSharedBerlinChurchFamily:api.isSharedBerlinChurchFamily,withResidentReflectionClip:text=>text+'|reflection-clip',
  churchSourceRecipe(helper,queue){assert.equal(helper,'original helper');assert.equal(queue,false);return{sourceKey:'paint',sourceBounds:{sourceCharactersUpperBound:64}};},
  sourceWorkspace:{prepareSource(recipe,families){assert.equal(recipe.sourceKey,'paint');assert.equal(families.length,1);reads.push(families[0]);return{fragment:'exact submitted fragment'};}},createBerlinChurchProgramComparison:api.createBerlinChurchProgramComparison,currentPaintProgramKey:api.currentPaintProgramKey,BERLIN_CHURCH_SHARED_FAMILIES:api.BERLIN_CHURCH_SHARED_FAMILIES,familyPrograms:new Map(),familyFailures:new Map(),reflectionResidentRevision:0,captureInvalidations:0,captureRuntime:{invalidate(){values.captureInvalidations++;}},familySurfaceHelper:'original helper',map:{triggerRepaint(){}}};
 const proxy=new Proxy(values,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k==='exports'?exports:k in o?o[k]:globalThis[k],set:(o,k,v)=>{o[k]=v;return true;}});
 Function('scope','with(scope){'+built.code+'}')(proxy);
 t.after(()=>{values.destroyed=true;exports.clear();owner.dispose();});
 return{...exports,values,reads,released,owner,budget};
}
async function until(predicate){const end=Date.now()+1000;while(!predicate()){assert(Date.now()<end,'actual comparison admission did not settle');await new Promise(resolve=>setTimeout(resolve,1));}}
test('the actual renderer schedules one comparison source per turn and shares only after all ten work results are consumed',async t=>{
 const f=await rendererComparison(t);assert.deepEqual(f.reads,[]);
 const retained={family:208},redundant={family:209},unreviewed={family:206};
 for(const program of [retained,redundant,unreviewed])f.values.familyPrograms.set(api.currentPaintProgramKey(program.family),program);
 f.values.familyFailures.set(api.currentPaintProgramKey(209),'old independent-family failure');
 for(let i=0;i<api.BERLIN_CHURCH_SHARED_FAMILIES.length;i++){
  assert.equal(f.prepare(),false);assert.equal(f.reads.length,i,'source building must wait for scheduler admission');
  await until(()=>f.owner.stats.pending===0);assert.deepEqual(f.reads,api.BERLIN_CHURCH_SHARED_FAMILIES.slice(0,i+1));assert.equal(f.values.berlinSharedFamilyPrograms,undefined,'unconsumed work cannot publish equivalence');
  assert.equal(f.prepare(),i===9);assert.equal(f.values.berlinSharedFamilyPrograms,i===9?true:undefined);
  if(i<9){assert.equal(f.values.familyPrograms.size,3);assert.deepEqual(f.released,[]);}
 }
 assert.equal(f.owner.stats.phaseTimings['source-build'].calls,10);
 assert.deepEqual([...f.values.familyPrograms],[['current-family:206',unreviewed],['current-family:200',retained]]);
 assert.deepEqual(f.released,[redundant],'the actual publication releases each redundant program once');
 assert.equal(f.values.familyFailures.has(api.currentPaintProgramKey(209)),false);
 assert.equal(f.values.captureInvalidations,1);assert.equal(f.values.reflectionResidentRevision,1);
 assert.equal(f.budget.stats.bytes,0,'comparison output and retained first source are released after publication');
});
test('a hidden or replaced actual renderer comparison cannot build or publish its queued old source',async t=>{
 const f=await rendererComparison(t);f.prepare();f.values.pageHidden=true;f.owner.cancel();f.clear();await until(()=>f.owner.stats.pending===0);assert.deepEqual(f.reads,[]);assert.equal(f.values.berlinSharedFamilyPrograms,undefined);
 f.values.pageHidden=false;f.prepare();f.values.gpuGeneration++;await until(()=>f.owner.stats.pending===0);assert.deepEqual(f.reads,[]);assert.equal(f.values.berlinSharedFamilyPrograms,undefined);f.clear();
});
test('renderer compiles the checked fragment and uses canonical ownership for visible, main and reflection paths',async()=>{
 const source=fs.readFileSync(path.join(d,'building-mesh-renderer.ts'),'utf8');await transform(source,{loader:'ts',format:'esm'});
 // The comparison and the compiler submit the same prepared, reflection-clipped
 // fragment of the same church source recipe.
 assert(source.includes('const recipe=churchSourceRecipe(familySurfaceHelper,false)'));
 assert(source.includes('const submitted=withResidentReflectionClip(sourceWorkspace.prepareSource(recipe,[family]).fragment)'));
 assert(source.includes('const result=probe.accept(submitted)'));
 assert(source.includes('const queue=fullColour?false:queueMode,sourceRecipe=churchSourceRecipe(helper,queue)'));
 // The submitted fragment, vertex interface, and city-specific canonical keys
 // are exercised against the live renderer closures in the following test.
 // One canonical key resolver for visible demand, the main draw and reflection.
 assert(source.includes('const asked=demand.override??run.key,key=mainFamilyProgramKey(asked)'));
 assert(source.includes('visible=mainPaintProgramKeys(demand)'));
 assert(source.includes('for(const run of runs){if(gl!.isContextLost()){mainDrawComplete=false;return;}const key=mainFamilyProgramKey(override??run.key);'));
 assert(source.includes('familyRuns.map(run=>{const key=mainFamilyProgramKey(override??run.key);return{'));
 assert(source.includes('program:mainFamilyProgramKey(override??run.key)'));
 assert(!source.includes('canonicalFamilyProgramKey('),'no second canonical-key resolver');
 assert(source.includes('for(const p of familyPrograms.values())programPreparation.releaseProgram(gl,p)'));
});
test('the church compiler submits the compared Berlin fragment and the complete Hamburg family group',async t=>{
 const fixture=await rendererComparison(t),v=fixture.values,key=api.currentPaintProgramKey;
 const vertex='fixture vertex',raw='precision mediump float;void main(){ }',clipped=api.withResidentReflectionClip(raw);
 const budgeted=[],built=[],compared=[];
 Object.assign(v,{city:'berlin',VERTEX:vertex,queueOnlyProgram:false,berlinChurchProgramKey:api.berlinChurchProgramKey,
  linkedPaint:api.currentPaintProgramGroups('church','berlin'),withResidentReflectionClip:api.withResidentReflectionClip,
  churchSourceRecipe(helper,queue){
   assert.equal(helper,'original helper');
   return {sourceKey:queue?'queue':'paint',sourceBounds:{sourceCharactersUpperBound:1024}};
  },
  sourceWorkspace:{
   programBudget(recipe,_vertex,_attributes,families){budgeted.push([recipe.sourceKey,...families]);return {};},
   prepareSource(recipe,families){built.push([recipe.sourceKey,...families]);return {fragment:raw};},
  },
  createBerlinChurchProgramComparison(){
   const probe=api.createBerlinChurchProgramComparison();
   return {get nextFamily(){return probe.nextFamily;},accept(fragment){compared.push(fragment);return probe.accept(fragment);},clear(){probe.clear();}};
  },
 });
 const demand={runs:[208,209,206].map(family=>({key:key(family)}))};
 assert.deepEqual([...fixture.programKeys(demand)],[key(208),key(209),key(206)]);
 for(let i=0;i<api.BERLIN_CHURCH_SHARED_FAMILIES.length;i++){
  fixture.prepare();
  await until(()=>fixture.owner.stats.pending===0);
  fixture.prepare();
 }
 assert.deepEqual(built,api.BERLIN_CHURCH_SHARED_FAMILIES.map(family=>['paint',family]));
 assert.deepEqual(compared,api.BERLIN_CHURCH_SHARED_FAMILIES.map(()=>clipped));
 const verified=fixture.programKeys(demand);
 assert.deepEqual([...verified],[key(200),key(206)]);
 assert.equal(verified.requested.get(key(200)),key(208));
 v.programPreparation={compile(_gl,recipe){return recipe.build();}};
 function submit(family,requestedFamily,fullColour=false,queue=false){
  const program=fixture.compile('original helper',family,requestedFamily,fullColour,queue);
  assert.equal(program.vertex,vertex);
  assert.deepEqual(program.attributes,['a_position','a_normal','a_color','a_selected','a_paint_frame','a_paint_family']);
  assert.equal(program.fragment,clipped);
  return program;
 }
 assert.equal(submit(200,208).fragment,compared[0]);
 assert.deepEqual(budgeted.at(-1),['paint',200]);
 assert.deepEqual(built.at(-1),budgeted.at(-1));
 v.city='hamburg';v.linkedPaint=api.currentPaintProgramGroups('church','hamburg');
 assert.deepEqual([...fixture.programKeys({runs:[{key:key(101)},{key:key(111)}]})],[key(100)]);
 submit(100,101);
 assert.deepEqual(budgeted.at(-1),['paint',100,101,102,111,112]);
 assert.deepEqual(built.at(-1),budgeted.at(-1));
 for(const [full,queue,recipe] of [[true,false,'paint'],[false,true,'queue']]){
  submit(0,0,full,queue);
  assert.deepEqual(budgeted.at(-1),[recipe]);
  assert.deepEqual(built.at(-1),budgeted.at(-1));
 }
});
// A locally supplied actual Berlin assembly module enables the source-data-bound
// check without committing generated city payloads or private machine paths.
if(process.env.CRIMEMAPS_CHURCH_ASSEMBLED_REVIEW_MODULE)test('actual Berlin submitted fragments remain byte-identical to the previous material pipeline',async()=>{
 const {assembledReview}=await import(pathToFileURL(process.env.CRIMEMAPS_CHURCH_ASSEMBLED_REVIEW_MODULE));
 const fragments=new Map();for(const family of api.BERLIN_CHURCH_SHARED_FAMILIES){const row=assembledReview(family);assert.equal(row.fragment,row.candidateFragment);assert.equal(row.fragment.length,71292);fragments.set(family,row.fragment);}
 assert(api.berlinChurchProgramsEqual(family=>fragments.get(family)));
});
