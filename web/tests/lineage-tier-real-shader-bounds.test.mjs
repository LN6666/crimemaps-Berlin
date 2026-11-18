import test from 'node:test';
import assert from 'node:assert/strict';
import {realShaderScope,sha256} from './support/lineage-tier-real-shader-scope.mjs';

// Opt-in evidence test. No data path means SKIP, never a real-data pass. An
// explicitly supplied but absent/stale/malformed data set is an actual failure.
// Example (ROOT serializes this command with heavy-lock):
// CRIMEMAPS_REAL_SHADER_SITES=/.../current-4caae82-static-assets/sites \
//   node --test --test-concurrency=1 web/tests/lineage-tier-real-shader-bounds.test.mjs
// This records shaderSource strings through fake GL. It is neither GPU driver
// compilation nor physical-memory/visual acceptance, and covers four recipes,
// not every program in every city.
const sites=process.env.CRIMEMAPS_REAL_SHADER_SITES;
const CASES=[{provider:'root500',city:'berlin'},{provider:'infill',city:'frankfurt'},{provider:'bremen',city:'bremen'},{provider:'tier300',city:'munich'}];
const MiB=1024**2;

for(const selected of CASES)test(`${selected.provider}: real frozen ${selected.city} source fits the actual caller/assembly/submitted bounds`,{skip:!sites?'CRIMEMAPS_REAL_SHADER_SITES not supplied; real-data verification NOT RUN':false},async t=>{
 try{
 const {rendererSourceRuntime,shaderRecordingGL}=await import('./support/lineage-tier-real-shader-runtime.mjs');
 const {provider,city}=selected,{module:M,names,evaluate,helper}=await rendererSourceRuntime(provider);
 const data=realShaderScope(sites,city,M),budget=M.createResourceBudget({limitBytes:704*MiB,recentLimitBytes:0}),store=M.createChunkResourceStore({budget}),{gl,submitted,linked}=shaderRecordingGL();
 M.bindChunkResourceContext(gl,store);
 const owner=M.createProgramPreparationOwner(provider+' actual-source-bound',()=>{});
 const original=M.createPlan({scope:data.scope,city,budget,id:1,identity:'real-bounds:'+city,generation:1,revision:1,profileInputs:[data.profileSHA256],sourceInputs:[],materialInputs:[]});
 const assemblies=[],preflights=[],recipes=[];let finalRecipe;
 const observedRecipes=new WeakSet();
 const plan=new Proxy(original,{get(target,key){
  if(key==='programBudget')return(recipe,...args)=>{
   assert(recipe.sourceBounds,'actual caller supplies its complete descriptor');
   if(!observedRecipes.has(recipe)){
    observedRecipes.add(recipe);const assemble=recipe.assemble;
    recipe.assemble=paint=>{
     const bounds=recipe.sourceBounds;assert(paint.length>0,'nonempty real paint source');assert(paint.length<=bounds.paintSourceCharactersUpperBound,'paint producer fits pre-build bound');
     const source=assemble(paint);assert(source.length<=bounds.sourceCharactersUpperBound,'actual shell/prune/clip assembly fits pre-build bound');
     M.validateShaderSourceSyntax(source,bounds.syntaxUpperBound);
     assemblies.push({paintCharacters:paint.length,paintSHA256:sha256(paint),assembledCharacters:source.length,assembledSHA256:sha256(source),pruneRequested:recipe.inputs[2]===true,bounds});return source;
    };
   }
   const result=target.programBudget(recipe,...args);preflights.push({built:assemblies.length,budget:result});recipes.push(recipe);return result;
  };
  return Reflect.get(target,key,target);
 }});
 const S={...M,city,gl,baseSurfaceFragment:undefined,surfaceFragment:undefined,diffuseFragment:undefined,
  publishedProgramPlan:plan,residentProgramPlan:plan,residentData:{plan},pendingCandidate:undefined,
  currentDataScope:data.scope,committingScope:data.scope,legacyPartitionEnabled:provider==='tier300'?false:provider==='bremen'?plan.partitionEnabled:plan.legacy,
  sourcePlanIdentity:undefined,cityPaintFragment:'',lastFamilyFragmentCharacters:0,progressiveShaderSpecialization:undefined,
  geometryProgramDemand:()=>true,geometryProgramConsumer:()=>plan,selectGeometryPlan:()=>plan,
  clearMaterialSource:()=>plan.clearPreparedSource(),
  programPreparation:{acquireReadyProgram(context,recipe){finalRecipe=recipe;return owner.acquireReadyProgram(context,recipe);},compile(context,recipe){finalRecipe=recipe;return owner.compile(context,recipe);}},
 };
 if(provider==='root500')S.pruneOwner6307Fragment=M.importedRoot500_pruneOwner6307Fragment;
 for(const name of names)S[name]=evaluate(name,S);
 try{
  plan.prepareMetadata?.();if(provider==='root500')await plan.preparePrograms(['base'],new AbortController().signal);
  const deadline=performance.now()+10000;let compiled;
  while(!compiled){
   try{
    if(provider==='tier300')compiled=S.compileGeometryProgram(helper,0,false,plan);
    else{const recipe=S.geometryProgramRecipe(helper,'base',true,false,[0],plan);finalRecipe=recipe;compiled=owner.acquireReadyProgram(gl,recipe)??owner.compile(gl,recipe);}
   }catch(error){if(!M.isProgramPreparationPending(error))throw error;}
   if(!compiled){assert(performance.now()<deadline,'bounded actual program preparation must settle');await new Promise(resolve=>setTimeout(resolve,0));}
  }
  assert(data.reads.length>0,'case consumed verified external frozen data');assert(preflights.length>0);assert.equal(preflights[0].built,0,'caller describes/adopts its bound before source emission');
  assert(assemblies.length>0,'actual prepared workspace emitted source');assert(linked.length>0);
  const vertex=submitted.find(row=>row.type===gl.VERTEX_SHADER)?.source,fragment=submitted.find(row=>row.type===gl.FRAGMENT_SHADER)?.source;
  assert(vertex?.length>0&&fragment?.length>0,'actual program owner submitted both shaders');assert.match(fragment,/void\s+main\s*\(/);assert.match(fragment,/u_resident_reflection_clip/);
  const bounds=recipes.at(-1).sourceBounds;assert(fragment.length<=bounds.sourceCharactersUpperBound,'final specialized/clipped fragment is inside the caller bound');
  // The production descriptor counts UTF16 logical source and attribute text.
  const attributes=provider==='bremen'?S.COLOUR_ATTRIBUTES:provider==='tier300'?['a_position','a_normal','a_color','a_selected','a_paint_frame','a_paint_family','a_progressive_color']:S.COLOUR_PROGRAM_ATTRIBUTES;
  const submittedLogicalBytes=2*(vertex.length+fragment.length+attributes.reduce((sum,name)=>sum+name.length,0));
  assert(Number.isSafeInteger(submittedLogicalBytes)&&submittedLogicalBytes>0);assert(submittedLogicalBytes<=finalRecipe.budget.sourceBytesUpperBound,'shaderSource pair fits the actual program ticket');
  if(provider!=='tier300')assert(assemblies.some(row=>row.pruneRequested),'lineage case exercised owner pruning');
  t.diagnostic(JSON.stringify({provider,city,evidence:'real-data/offline-shaderSource-not-GPU',profileSHA256:data.profileSHA256,reads:data.reads,decodedBytes:data.decodedBytes,assemblies:assemblies.map(({bounds,...row})=>({...row,boundCharacters:bounds.sourceCharactersUpperBound,paintBoundCharacters:bounds.paintSourceCharactersUpperBound})),submitted:{vertexCharacters:vertex.length,fragmentCharacters:fragment.length,vertexSHA256:sha256(vertex),fragmentSHA256:sha256(fragment),logicalBytes:submittedLogicalBytes,boundBytes:finalRecipe.budget.sourceBytesUpperBound}}));
 }finally{plan.release();owner.dispose();store.evictRecent?.();data.scope.release();}
 }catch(error){
  // TAP must never serialize a data: import URL or an attached giant bundle.
  // Keep the real failure and a bounded trace; sourceURL gives named frames.
  const message=String(error?.message??error).replace(/data:[^\s)]+/g,'[inline module]').slice(0,1800);
  const failure=new Error(`${selected.provider}/${selected.city}: ${error?.name??'Error'}: ${message}`);
  const trace=String(error?.stack??'').slice(0,4000).replace(/data:[^\s)]+/g,'[inline module]').split('\n').slice(1,7).map(line=>line.slice(0,320));
  failure.stack=failure.name+': '+failure.message+'\n'+trace.join('\n');throw failure;
 }
});
