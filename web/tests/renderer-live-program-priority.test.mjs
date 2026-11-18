import test from 'node:test';
import assert from 'node:assert/strict';
import {bind} from './support/renderers-city-tier-church-scope.mjs';

// Exercise the renderer's demand selectors and recipe entrypoints. A capture
// caller shares a pending program with main, so the caller's role alone cannot
// decide its scheduler priority. These checks do not simulate driver execution.
const key=family=>'k'+family;
const scope=()=>({stats:{disposed:false}});
const plan=id=>({id,identity:String(id),scope:scope(),legacy:false,preparedSourceStats:{released:false},programSourceInputs:['same source'],programSourceProvenance:[],describeSourceBounds:()=>({}),programBudget:()=>({}),prepareSource:()=>({fragment:'fragment'})});
const common=()=>({destroyed:false,pageHidden:false,enabled:true,gl:{isContextLost:()=>false},mainKeys:new Set([key(7)]),captureKeys:new Set([key(7)]),
 currentPaintProgramKey:key,familySurfaceHelper:'helper',baseSurfaceFragment:'helper',surfaceFragment:'window',diffuseFragment:'diffuse',paintMode:()=>2,landmarkVisible:false,facadeAttached:false,sceneIndexCount:()=>3,
 VERTEX:'vertex',city:'fixture',fragmentParts:()=>[],shaderSourceBoundPart:()=>({}),describeShaderAssemblyBounds:()=>({}),fragment:()=>'',withResidentReflectionClip:value=>value});

for(const provider of ['root500','infill'])test(provider+': a capture retry keeps matching candidate main priority, then drops it when the candidate leaves',()=>{
 const resident=plan(1),candidate=plan(2),state=common();
 Object.assign(state,{publishedProgramPlan:resident,residentProgramPlan:resident,pendingCandidate:undefined,transientGeometryDemand:undefined,geometryRecipeConsumers:new WeakMap(),
  legacyPartitionEnabled:false,partitionEnabled:true,gpuPreflightRequired:false,residentMainRequiredKeys:state.mainKeys,capturePaintKeys:()=>state.captureKeys,
  familyPaintRecipeKey:(_source,families)=>key(families[0]),pruneFamilySource:()=>false,pruneOwner6307Fragment:value=>value,COLOUR_PROGRAM_ATTRIBUTES:['a_position'],COLOUR_ASSEMBLY_AUTHORITY:{},withPlan:(_plan,work)=>work()});
 const S=bind(provider,['sameGeometryRecipe','liveGeometryRecipe','rememberGeometryRecipe','coordinateGeometryRecipe','geometryProgramDemand','geometryProgramRecipe'],state);
 const recipe=(sourcePlan,capture)=>S.geometryProgramRecipe('helper','partition:7',false,capture,[7],sourcePlan);
 const demand=(sourcePlan,capture)=>S.coordinateGeometryRecipe(sourcePlan,recipe(sourcePlan,capture));
 const active=demand(resident,true);assert.equal(active.priority,'visible','capture and main share the exact current recipe');
 S.mainKeys.clear();assert.equal(active.currentPriority(),'capture','the existing subscriber can downgrade without another compile');
 assert.equal(demand(resident,true).priority,'capture','former main does not leave a permanent priority');
 S.pendingCandidate={plan:candidate,scope:candidate.scope,closed:false,requiredMainKeys:new Set([key(7)]),requiredCaptureKeys:new Set()};
 assert.equal(demand(candidate,false).priority,'visible');
 assert.equal(demand(resident,true).priority,'visible','a resident capture retry cannot demote a matching candidate main');
 S.pendingCandidate.signal={aborted:true};
 assert.equal(demand(resident,true).priority,'capture','an aborted candidate no longer boosts the resident capture');
 S.captureKeys.clear();
 assert.equal(demand(resident,true).current(),false,'no main or capture consumer remains');
});

test('Tier300: capture retries follow resident and candidate main demand without widening the consumer guard',()=>{
 const resident=plan(1),candidate=plan(2),state=common();
 Object.assign(state,{residentData:{plan:resident},pendingData:undefined,packingPublishedMainDemand:undefined,mainFamilyProgramKeys:()=>state.mainKeys,activeCaptureProgramKeys:()=>state.captureKeys,
  tierProgramSourceAuthority:{},programPreparation:{acquireReadyProgram:()=>undefined,compile(_gl,recipe){state.recipe=recipe;return {};}}});
 const S=bind('tier300',['selectGeometryPlan','compileGeometryProgram'],state);
 const demand=()=>{S.compileGeometryProgram('helper',7,true);return S.recipe;};
 const active=demand();assert.equal(active.priority,'visible');S.mainKeys.clear();assert.equal(active.currentPriority(),'capture','current role changes without another compile');assert.equal(demand().priority,'capture');
 S.pendingData={plan:candidate,materialReady:true,closed:false,mainKeys:new Set([key(7)])};
 assert.equal(demand().priority,'visible');S.pendingData.closed=true;assert.equal(demand().priority,'capture');
 S.captureKeys.clear();assert.equal(demand().current(),false);
});

test('Church: only an actual current main demand boosts capture; its full-colour capture remains separate',()=>{
 const state=common();Object.assign(state,{pendingGeometry:undefined,candidateCurrent:value=>!value.closed,gpuGeneration:1,queueOnlyProgram:false,fullColourProgramKey:'full',
  mainPaintProgramKeys:()=>state.mainKeys,captureProgramKeys:()=>state.captureKeys,sourceWorkspace:{programBudget:()=>({})},colourAttributes:['a_position'],churchColourSourceAuthority:{},windowTexture:undefined,diffuseTexture:undefined});
 const S=bind('church',['colourProgramHasConsumer','colourProgramRecipe'],state);
 const demand=(full=false)=>S.colourProgramRecipe('helper',full?0:7,full,false,undefined,undefined,true,{});
 const active=demand();assert.equal(active.priority,'visible');S.mainKeys.clear();assert.equal(active.currentPriority(),'capture','current role changes without another compile');assert.equal(demand().priority,'capture');
 S.pendingGeometry={mainDemandKnown:true,mainKeys:new Set([key(7)]),materialKeys:new Set(),captureKeys:new Set(),closed:false};
 assert.equal(demand().priority,'visible');S.pendingGeometry.closed=true;assert.equal(demand().priority,'capture');
 S.captureKeys.add('full');assert.equal(demand(true).priority,'capture');assert.equal(demand(true).current(),true);
 S.captureKeys.clear();assert.equal(demand().current(),false);
});

test('Delegated500: the same family stays visible for live main, but offscreen and full-source capture cannot inherit it',()=>{
 const state=common(),resident=plan(1),material={currentFamilyPrograms:true,partitionEnabled:true,legacySolarPartitions:false,materialRecipeRevision:1};
 Object.assign(state,{...material,pendingGeometry:undefined,committingPreparedData:undefined,residentPreparedData:resident,candidateCurrent:value=>!value.closed,
  mainPaintProgramKeys:()=>state.mainKeys,activeCaptureProgramKeys:()=>state.captureKeys,materialProgramDemandCurrent:()=>false,textureShaderFailure:undefined,diffuseShaderFailure:undefined,
  currentPaintProgramFamily:value=>Number(value.slice(1)),BERLIN_FULL_CURRENT_CAPTURE_KEY:'full',BERLIN_DISTANT_PAUL_LOBE_KEY:'distant',BERLIN_DISTANT_PAUL_LOBE_FAMILY:99,
  berlinCurrent:false,delegatedColourSourceAuthority:{},delegatedPreparedSourceAuthority:{},sourceContextCurrent:()=>true});
 const S=bind('delegated500',['selectColourProgramConsumer','colourProgramRecipe'],state);
 const demand=(full=false)=>S.colourProgramRecipe('helper',undefined,full?0:7,full,true,undefined);
 const active=demand();assert.equal(active.priority,'visible');S.mainKeys.clear();assert.equal(active.currentPriority(),'capture','current role changes without another compile');assert.equal(demand().priority,'capture');
 S.pendingGeometry={mainDemandKnown:true,preparedData:plan(2),state:{material},mainKeys:new Set([key(7)]),materialKeys:new Set(),captureKeys:new Set(),closed:false};
 assert.equal(demand().priority,'visible');S.pendingGeometry.closed=true;assert.equal(demand().priority,'capture');
 S.captureKeys.add('full');assert.equal(demand(true).priority,'capture');assert.equal(demand(true).current(),true);
 S.captureKeys.clear();assert.equal(demand().current(),false);
});
