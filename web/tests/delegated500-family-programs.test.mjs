import test from 'node:test';
import assert from 'node:assert/strict';
import {createDelegatedFixture,declaration,rendererText,DEFAULT_HELPER} from './support/fixtures-delegated-renderer.mjs';
// Cities other than Berlin and Hamburg used to compile one whole-city delegated500
// programme (up to ~840k GLSL characters). On ANGLE Metal its first draw blocks the
// GPU thread past Chrome's watchdog. They now use bounded per-family programmes.
//
// The renderer's own caster, capture-demand, material-source and colour-program
// declarations run against the production program preparation owner, context
// scheduler, page ResourceBudget, prepared-source workspace, fragment shell,
// specializer and capture runtime (support/fixtures-delegated-renderer.mjs).
// Only the facade paint below and the published one-chunk scene are fixture data.
const source=`vec3 kept(vec3 base,float family){return base*.3;}
vec3 cut(vec3 base,float family){if(base.r<0.)discard;return base*.4;}
vec3 cutAgain(vec3 base,float family){if(base.g<0.)discard;return base*.5;}
vec3 progressiveFeatureDispatch(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1003.)return kept(base,family);if(family==1004.)return cut(base,family);if(family==1005.)return cutAgain(base,family);return base;}
vec3 progressiveFeatureDispatchCityLegacy500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return progressiveFeatureDispatch(base,p,normal,frame,family);}
vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return progressiveFeatureDispatchCityLegacy500(base,p,normal,frame,family);}
vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family>=1000.)return progressiveFeatureDispatchCity(base,p,normal,frame,floor(family+.5));return base;}`;
const key=family=>'current-family:'+family;
async function familyCity(families=[0,1003,1004],city='cologne',paint=source){
 const f=await createDelegatedFixture({city,paint}),S=f.S;
 f.setScene(families.map((family,i)=>({objectId:'owner-'+i,partId:String(i),start:i*3,end:i*3+3,firstVertex:i*3,lastVertex:i*3+3,box:[-.1,0,-.1,.1,.1,.1],family})),families.map((family,i)=>({firstIndex:i*3,indexCount:3,key:key(family)})));
 // The resident base program the renderer draws and casts family 0 with.
 S.program=f.until(()=>S.compileGeometryProgram(DEFAULT_HELPER));
 S.setCaptureDemand({kind:'solar',token:'family-programs-solar',active:true});
 Object.assign(S,{casterVisibleKnown:true,partitionPending:false,casterRetry:false});S.map.repaints=0;
 // Every program source the owner builds from now on, with the renderer call that requested it.
 const builtBefore=f.events.length,programsBefore=f.driver.programs.length;
 const builds=()=>f.events.slice(builtBefore).map(e=>({family:e.args[2]??0,unpruned:!!e.args[3],requiredCapture:!!e.args[4],demandKey:e.args[5]}));
 const compiled={get length(){return builds().length;},map:fn=>builds().map(fn)};
 Object.assign(f,{values:S,text:rendererText,
  prepareAll(){for(let frame=0;frame<100;frame++){const result=S.prepareSolarShadow();f.advancePreparation();if(result.status!=='pending')return result;S.drawFrame++;}assert.fail('actual async depth preparation did not finish');},
  preparationDriver:{get programs(){return f.driver.programs.slice(programsBefore);},set fail(value){f.driver.fail=value;},get fail(){return f.driver.fail;}}});
 return{f,compiled};
}
test('non-Berlin family cities never compile a whole-city depth program and cast with family programs',async()=>{
 const {f,compiled}=await familyCity();
 assert.equal(f.values.casterProgram(key(1004)),undefined,'a discarding family cannot cast before its own program exists');
 assert.equal(f.prepareAll().status,'ready','the real capture runtime publishes the complete caster set');
 assert.deepEqual(compiled.map(c=>[c.family,c.unpruned,c.requiredCapture]),[[1004,false,true]]);assert(!f.values.partitionPrograms.has(f.values.BERLIN_FULL_CURRENT_CAPTURE_KEY),'no whole-city capture recipe is created outside Berlin');
 assert.equal(f.values.casterProgram(key(0)),f.values.program);assert.equal(f.values.casterProgram(key(1003)),f.values.program,'a family without depth effects casts like family 0');
 assert.equal(f.values.casterProgram(key(1004)).metadata[2],1004);
 assert.equal(f.values.casterProgram(key(1004)),f.values.partitionPrograms.get(key(1004)),'capture borrows the ordinary family colour grant');assert.equal(f.preparationDriver.programs.length,1);
 const runs=f.values.residentCaptureState(1,true).runs;assert.deepEqual(runs.map(r=>r.program),[f.values.program,f.values.program,f.values.casterProgram(key(1004))]);
});
test('casters share context admission, wait for visible demand, and publish only after link and the next draw turn',async()=>{
 const {f,compiled}=await familyCity([1004,1005]);
 f.values.partitionPending=true;f.values.casterVisibleKnown=false;f.values.prepareSolarShadow();f.advancePreparation();assert.equal(compiled.length,0,'one ordinary draw must report visible demand first');
 f.values.partitionPending=false;f.values.casterVisibleKnown=true;f.values.prepareSolarShadow();assert.equal(compiled.length,0,'submission yields before shader construction');f.advancePreparation();assert.equal(compiled.length,0,'depth classification is admitted separately from compilation');
 for(let turn=0;compiled.length===0&&turn<20;turn++){f.values.drawFrame++;f.values.prepareSolarShadow();f.advancePreparation();}assert.equal(compiled.length,1,'at most one actual program before the next draw');assert.equal(f.values.casterProgram(key(1004)),undefined,'ready owner value still needs a matching provider consumption turn');
 f.values.drawFrame++;f.values.prepareSolarShadow();assert(f.values.casterProgram(key(1004)));assert.equal(compiled.length,1);assert.equal(f.prepareAll().status,'ready');assert.deepEqual(compiled.map(c=>c.family),[1004,1005]);
 const revision=f.values.solarDepthRevision;f.values.drawFrame++;f.values.prepareSolarShadow();assert.equal(compiled.length,2);assert.equal(f.values.solarDepthRevision,revision,'complete casters do not churn the revision');
});
test('caster failures are recorded once; GPU-owner cancellation allows a clean retry while CPU classification survives',async()=>{
 const {f,compiled}=await familyCity();f.preparationDriver.fail=true;f.prepareAll();f.values.drawFrame++;f.values.prepareSolarShadow();assert.equal(compiled.length,1);assert.equal(f.values.casterFailures.size,1);assert.equal(f.values.casterProgram(key(1004)),undefined);
 f.values.programPreparation.cancel();f.values.releaseSolarDepth();assert.equal(f.values.casterFailures.size,0);assert(f.values.casterBase.size>0,'the CPU-only caster classification survives a GPU release');f.values.drawFrame++;f.prepareAll();assert.equal(compiled.length,2,'a released GPU generation may retry');
});
test('the shared compiler refuses a whole-city depth program outside Berlin',async()=>{
 const {f}=await familyCity();assert.equal(f.values.materialSourceSettled,true,'the material source is settled, so the refusal is not a pending wait');
 assert.throws(()=>f.values.compileGeometryProgram('helper',source,0,true),/never a whole-city program/);
});
test('Berlin keeps its distinct full-colour capture recipe, distant simplification and exact rich sharing only for itself',async()=>{
 const {f,compiled}=await familyCity([0,1004],'berlin'),text=f.text;
 const familyColour={kind:'specialized-family-colour'};f.values.partitionPrograms.set(key(1004),familyColour);
 assert.equal(f.prepareAll().status,'ready');const full=f.values.partitionPrograms.get(f.values.BERLIN_FULL_CURRENT_CAPTURE_KEY);
 assert(full);assert.notEqual(full,familyColour);assert.deepEqual(compiled.map(c=>[c.family,c.unpruned,c.requiredCapture,c.demandKey]),[[0,true,true,f.values.BERLIN_FULL_CURRENT_CAPTURE_KEY]]);
 const runs=f.values.residentCaptureState(1,true).runs;assert.deepEqual(runs.map(run=>[run.firstIndex,run.indexCount,run.program]),[[0,f.values.indices.length,full]]);
 f.values.releaseSolarDepth();assert.equal(f.values.partitionPrograms.get(f.values.BERLIN_FULL_CURRENT_CAPTURE_KEY),full,'capture cancellation preserves the owning canonical colour grant');assert(!full.deleted);assert.equal(f.prepareAll().status,'ready');assert.equal(f.preparationDriver.programs.length,1);
 assert(text.includes("const berlinCurrent=city==='berlin';let currentFamilyPrograms=berlinCurrent;"));assert(declaration('buildMaterialSourceSteps').includes('currentFamilyPrograms=berlinCurrent||!paintProgramPartitionEnabled(city)'));
 assert.equal(f.values.richPaintProgramKey(key(4529)),key(4529),'Berlin does not adopt a Dortmund family alias');
 // The full capture run now covers the published scene index count.
 assert(text.includes('if(solarDepth&&berlinCurrent&&paintMode()>1.5)runs=[{firstIndex:0,indexCount:sceneIndexCount(),program:partitionPrograms.get(BERLIN_FULL_CURRENT_CAPTURE_KEY)}]'));
 assert(text.includes('if(!berlinCurrent&&!legacySolarPartitions)return prepareFamilyCasters(helper,budget);'));
 // Specialization moved into the admitted prepared-source workspace.
 assert(text.includes("resource:'caster-source:'+analysisKey,revision,phase:'source-build'"));
});
test('Dortmund shares a declared family group without Berlin capture or loss of any member shader branch',async()=>{
 const families=[4528,4529,4532];
 const paint=source.replaceAll('1003','4528').replaceAll('1004','4529').replaceAll('1005','4532');
 const {f}=await familyCity(families,'dortmund',paint),{S}=f;
 assert.equal(S.sharedPaulLobeRichProgram,false);
 assert.equal(S.distantMaterialAvailable,false);
 for(const family of families)assert.equal(S.richPaintProgramKey(key(family)),key(4528));
 const projection=new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 for(let turn=0;turn<20&&!S.partitionPrograms.has(key(4528));turn++){
  S.frameNo++;
  S.render(f.gl,{defaultProjectionData:{mainMatrix:projection}});
  f.advancePreparation();
 }
 const program=S.partitionPrograms.get(key(4528));
 assert(program);
 assert.deepEqual([...S.partitionPrograms.keys()],[key(4528)]);
 for(const branch of ['kept(', 'cut(', 'cutAgain('])assert(program.fragment.includes(branch),branch);
 assert.deepEqual(S.partitionRuns.map(run=>run.key),families.map(key));
 assert.equal(S.partitionPrograms.has(S.BERLIN_FULL_CURRENT_CAPTURE_KEY),false);
});
test('missing own casters wake another frame, settle to ready, and never start before visible demand is reported',async()=>{
 const {f,compiled}=await familyCity([1004,1005]);assert.equal(f.values.prepareSolarShadow().status,'pending');assert(f.values.casterRetry);assert(f.values.map.repaints>0);f.advancePreparation();assert.equal(compiled.length,0,'first admitted slot only analyses source');
 f.values.drawFrame++;assert.equal(f.prepareAll().status,'ready');assert.equal(compiled.length,2);assert.equal(f.values.casterProgram(key(1004)).metadata[2],1004);assert.equal(f.values.casterProgram(key(1005)).metadata[2],1005);
 f.values.casterRetry=false;const repaints=f.values.map.repaints;f.values.drawFrame++;assert.equal(f.values.prepareSolarShadow().status,'ready');assert.equal(f.values.map.repaints,repaints,'no repaint once every own caster exists');assert.equal(f.values.casterRetry,false);
 f.values.partitionPrograms.clear();f.values.casterVisibleKnown=false;f.values.drawFrame++;f.values.prepareSolarShadow();f.advancePreparation();assert.equal(compiled.length,2,'no caster before a partition draw reports visible needs');assert(f.values.map.repaints>repaints);
});

test('Essen exact cohort shares one rich program only after full source equality, preserving original family attributes',async()=>{
 const cohort=Array.from({length:26},(_,i)=>1603+i),paint=source.replace('if(family==1003.)return kept(base,family);','if(family>=1603.&&family<=1628.)return kept(base,family);');
 const f=await createDelegatedFixture({city:'essen',paint}),{S}=f,projection=new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 const rows=cohort.map((family,i)=>({objectId:'owner-'+i,partId:String(i),start:i*3,end:i*3+3,firstVertex:i,lastVertex:i+1,box:[-.1,0,-.1,.1,.1,.1],family}));
 f.setScene(rows,cohort.map((family,i)=>({firstIndex:i*3,indexCount:3,key:key(family)})));
 S.program=f.until(()=>S.compileGeometryProgram(DEFAULT_HELPER));
 assert.equal(S.exactRichProgramKeys.size,26);assert.equal(S.sharedPaulLobeRichProgram,false);assert.equal(S.distantMaterialAvailable,false);
 for(const family of cohort)assert.equal(S.richPaintProgramKey(key(family)),key(1603));
 const before=f.events.length;
 for(let i=0;i<10;i++){S.frameNo++;S.render(f.gl,{defaultProjectionData:{mainMatrix:projection}});f.advancePreparation();}
 assert.deepEqual([...S.partitionPrograms.keys()],[key(1603)],'all visible original families use one fully equal rich executable');
 assert.deepEqual(f.events.slice(before).map(e=>e.family),[1603]);
 assert.deepEqual(S.partitionRuns.map(r=>r.key),cohort.map(key),'geometry/draw runs retain the original family identity');
 const changed=paint.replace('if(family>=1603.', 'if(family==1615.)return vec3(.123);if(family>=1603.');
 const other=await createDelegatedFixture({city:'essen',paint:changed});other.setScene(rows,cohort.map((family,i)=>({firstIndex:i*3,indexCount:3,key:key(family)})));other.S.program=other.until(()=>other.S.compileGeometryProgram(DEFAULT_HELPER));assert.equal(other.S.exactRichProgramKeys.size,0,'a changed member keeps separate original program keys');
});

for(const depthEffects of [false,true]){
 test(`Essen solar capture uses the prepared caster when the shared colour program is absent (${depthEffects?'discarding paint':'colour-only paint'})`,async()=>{
  const families=[1626,1628];
  const paint=source.replace('if(family==1003.)return kept(base,family);',
   `if(family>=1603.&&family<=1628.)return ${depthEffects?'cut':'kept'}(base,family);`);
  const {f,compiled}=await familyCity(families,'essen',paint),{S}=f;
  for(const family of families)assert.equal(S.richPaintProgramKey(key(family)),key(1603));
  assert.equal(S.partitionPrograms.has(key(1603)),false);
  assert.equal(f.prepareAll().status,'ready');
  assert.equal(S.solarCoverage().complete,true);
  assert.deepEqual(compiled.map(c=>c.family),depthEffects?families:[]);
  const runs=S.residentCaptureState(1,true).runs;
  assert.deepEqual(runs.map(run=>run.program),depthEffects?families.map(family=>S.partitionPrograms.get(key(family))):families.map(()=>S.program));
  assert.equal(S.partitionPrograms.has(key(1603)),false);
 });
}
