import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {nullCityDataProfilePlugin} from './city-profile-test-plugin.mjs';

// delegated500's complete shader caller budget. The material preflight, caster
// classification and colour compiles admit the real 22-wrapper material chain,
// the 10-wrapper legacy partition and Berlin's distant transform before any paint
// builder runs, and the admitted path submits byte-identical shader text. The
// renderer's own declarations run against the real program preparation owner,
// prepared-source workspace, page ledger, facade template and specializer.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.join(web,'package.json')),ts=require('typescript'),{build}=require('esbuild');
const safety=path.join(web,'src/painted/delegated500/safety'),rendererText=fs.readFileSync(path.join(safety,'building-mesh-renderer.ts'),'utf8'),ast=ts.createSourceFile('building-mesh-renderer.ts',rendererText,ts.ScriptTarget.Latest,true);
const CITIES=['berlin','bremen','cologne','dortmund','dresden','dusseldorf','essen','frankfurt','hamburg','hannover','leipzig','munich','nuremberg','stuttgart'];
const DEFAULT_HELPER='vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}',WINDOW_HELPER='vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base*.97;}';
const MiB=1024*1024;

function declaration(name){
 const found=[];(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found.push(node.getText(ast));else if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name&&node.initializer)found.push(node.initializer.getText(ast));ts.forEachChild(node,visit);})(ast);
 assert.equal(found.length,1,'one renderer declaration '+name);return found[0];
}
// Declaration order matters only for initializers evaluated at fixture creation.
const RENDERER=['colourSpecializationFamilies','fragmentParts','fragment','VERTEX','DELEGATED_COLOUR_ATTRIBUTES','materialSourceBuilder','legacyPartitionFragment','pageBudget','programSources','clearProgramSources','createCasterPreparedSources','withPreparedData','withSourceContext','selectColourProgramConsumer','delegatedPaintBounds','materialBaseKey','materialPaintBounds','materialRebuildEstimate','materialTextRequirement','withMaterialTextCosts','colourSourceRecipe','colourProgramRecipe','compileGeometryProgram','compilePartitionProgram','ensureMaterialSourceWorkspace','releaseMaterialSourceClaim','materialSourceGate','batchSourceGate','casterSourceGate','sourceBudgetWaiting','materialSourceEstimate','admitMaterialSourceNow','f020PartitionFlags1679','buildMaterialSourceSteps','buildMaterialSource','prepareMaterialSource','clearMaterialSource','snapshotMaterial','restoreMaterial','clearMaterialSnapshot','prepareCasterClassification'];
const sources=new Map(RENDERER.map(name=>[name,declaration(name)]));
const imports=new Map();
for(const node of ast.statements)if(ts.isImportDeclaration(node)&&!node.importClause?.isTypeOnly){const bindings=node.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings))for(const element of bindings.elements)if(!element.isTypeOnly)imports.set(element.name.text,[node.moduleSpecifier.text,(element.propertyName??element.name).text]);}
// The renderer binds these through scopedValue; the fixture appends the same scope.
const BOUND=['currentPaintProgramGroups','importedDelegated_exactCurrentPaintProgramKeys','importedDelegated_facadePaintFragmentForCity','importedDelegated_paintProgramFragment','importedDelegated_paintProgramKey','importedDelegated_paintProgramPartitionEnabled','importedDelegated_specializeCurrentPaintProgram','importedDelegated_currentPaintProgramKey','importedDelegated_currentPaintProgramFamily','importedDelegated_berlinDistantPaintFragment','importedDelegated_berlinPaulLobeProgramsEqual','importedDelegated_berlinExactRichProgramKeys','importedDelegated_berlinDistantContractAvailable','importedDelegated_f004Fragment645','isProgramPreparationPending'];
const used=new Set(BOUND);for(const text of sources.values())for(const [word] of text.matchAll(/\b[A-Za-z_$][\w$]*\b/g))if(imports.has(word))used.add(word);
const RAW=[['f358Fragment604','f358-repair604'],['f358Rose612','f358-rose612'],['f342FoyerFragment615','f342-foyer615'],['f342GrottoFragment617','f342-grotto617'],['f342CascadeFragment618','f342-cascade618'],['f244Fragment619','f244-corners619'],['f244Fragment622','f244-main622'],['f244Fragment627','f244-level627'],['f235Fragment631','f235-upper631'],['f285Fragment634','f285-restoration634'],['f269Fragment640','f269-low-roof640'],['f004Fragment645','f004-detail645'],['f020Fragment652','f020-tower652'],['f020ChapelFragment654','f020-chapel654'],['f020ButtressFragment655','f020-buttress655'],['f020ApseFragment656','f020-apse656'],['f020NaveFragment657','f020-nave657'],['f020AnnexFragment658','f020-annex658'],['f020TurretFragment659','f020-turret659'],['f020StoneFragment660','f020-stone660'],['f025FigureFragment663','f025-figure663'],['f236PlatformsFragment681','f236-platforms681']];
const entry=[...[...used].map(name=>{const [specifier,imported]=imports.get(name);return 'export {'+imported+' as '+name+'} from '+JSON.stringify(specifier)+';';}),
 "export * as budgetModule from './delegated-shader-budget';",
 "export {createResourceBudget} from '../../../safety/render-runtime/resource-budget';",
 "export {createChunkResourceStore,bindChunkResourceContext,getPageChunkResourceStore} from '../../../safety/render-runtime/chunk-resource-store';",
 "export {createProgramPreparationOwner,createProgramSourceAuthority as createAuthority,LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES} from '../../../safety/render-runtime/program-preparation';",
 "export {countShaderSourceSyntax as countSyntax} from '../../../safety/render-runtime/shader-source-budget';",
 "export {PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE} from './progressive-feature-cities';",
 "export {HAMBURG_PROGRAM_GLSL_RESOURCE} from './progressive-hamburg-programs';",
 "export {BERLIN_PROGRAM_GLSL_RESOURCE} from './progressive-berlin-programs';",
 "export {PROGRESSIVE_FEATURE_GLSL} from './progressive-feature-glsl';",
 ...RAW.map(([name,file])=>'export {'+name+' as raw_'+name+'} from '+JSON.stringify('./'+file)+';')].join('\n');
const bundled=await build({stdin:{contents:entry,resolveDir:safety,sourcefile:'delegated500-shader-budget-fixture.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,logLevel:'error',plugins:[nullCityDataProfilePlugin]});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64')),B=m.budgetModule;
const raw=Object.fromEntries(RAW.map(([name])=>[name,m['raw_'+name]]));
// The renderer's original nested expressions, copied verbatim as the reference path.
const originalMaterial=(base,city)=>raw.f236PlatformsFragment681(raw.f025FigureFragment663(raw.f020StoneFragment660(raw.f020TurretFragment659(raw.f020AnnexFragment658(raw.f020NaveFragment657(raw.f020ApseFragment656(raw.f020ButtressFragment655(raw.f020ChapelFragment654(raw.f020Fragment652(raw.f004Fragment645(raw.f269Fragment640(raw.f285Fragment634(raw.f235Fragment631(raw.f244Fragment627(raw.f244Fragment622(raw.f244Fragment619(raw.f342CascadeFragment618(raw.f342GrottoFragment617(raw.f342FoyerFragment615(raw.f358Rose612(raw.f358Fragment604(base,city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city);
const originalLegacy=(base,city)=>raw.f025FigureFragment663(raw.f020StoneFragment660(raw.f020TurretFragment659(raw.f020AnnexFragment658(raw.f020NaveFragment657(raw.f020ApseFragment656(raw.f020ButtressFragment655(raw.f020ChapelFragment654(raw.f020Fragment652(raw.f004Fragment645(base,city),city),city),city),city),city),city),city),city),city);

const COLOGNE_EXTRA=['vec3 delegatedBudgetKeep1003(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base*.8;}',
 'vec3 delegatedBudgetCut1004(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(frame.x<0.)discard;return base*.6;}',
 'vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1003.)return delegatedBudgetKeep1003(base,p,normal,frame,family);if(family==1004.)return delegatedBudgetCut1004(base,p,normal,frame,family);return progressiveFeatureDispatch(base,p,normal,frame,family);}'].join('\n');
const HAMBURG_PROGRAMS={base:'vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}',
 f1100:'vec3 delegatedBudgetHamburg1100(vec3 base){return base*.7;}\nvec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1100.)return delegatedBudgetHamburg1100(base);return base;}'};
// Every Berlin partition key reads the full feature source, which carries the
// f004645 and f020 anchors, so all ten legacy hooks really transform it.
const BERLIN_PROGRAMS=new Proxy({},{get:()=>m.PROGRESSIVE_FEATURE_GLSL});
function frozenScope({extra={},hamburg={},berlin={}}={}){
 let pins=0;const values=new Map([[m.PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE.file,extra],[m.HAMBURG_PROGRAM_GLSL_RESOURCE.file,hamburg],[m.BERLIN_PROGRAM_GLSL_RESOURCE.file,berlin]]);
 return{borrow(ref,read){assert(values.has(ref.file),'fixture scope holds '+ref.file);return read(values.get(ref.file));},assertSelection(){},retain(){pins++;let done=false;return()=>{if(!done){done=true;pins--;}};},get stats(){return{resources:values.size,pending:0,pins,ownerReleased:false,disposed:false};}};
}
function fakeGL(){
 let id=0;const linked=[];
 const gl={VERTEX_SHADER:0x8B31,FRAGMENT_SHADER:0x8B30,COMPILE_STATUS:0x8B81,LINK_STATUS:0x8B82,isContextLost:()=>false,getExtension:()=>null,
  createShader:type=>({id:++id,type}),shaderSource(shader,source){shader.source=source;},compileShader(){},getShaderParameter:()=>true,getShaderInfoLog:()=>'',
  createProgram:()=>({id:++id,shaders:[]}),attachShader(program,shader){program.shaders.push(shader);},bindAttribLocation(){},detachShader(){},deleteShader(){},deleteProgram(program){program.deleted=true;},
  linkProgram(program){linked.push({program,vertex:program.shaders.find(row=>row.type===0x8B31)?.source,fragment:program.shaders.find(row=>row.type===0x8B30)?.source});},getProgramParameter:()=>true,getProgramInfoLog:()=>''};
 return{gl,linked};
}
const scopeProxy=state=>new Proxy(state,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
function evaluate(name,state){const js=ts.transpileModule('('+sources.get(name)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'');return Function('scope','with(scope){return '+js+'}')(scopeProxy(state));}
const FLAGS=['hc70ProgramReady','hc70PantaleonGateProgramReady','hc70PantaleonAnnexProgramReady','hc70LudwigWorkshopProgramReady','hc70MesseturmCrownProgramReady','supplementBatch1Ready','f004645Available','f020Whole1679Available','f020Chapel1679Available','f269640Available','f285634Available','f235631Available','f244627Available','f244622Available','f244619Available','f358604Available','f238Body595Available','f358Normal579Available','f346562Available','f355Clip559Available','sharedPaulLobeRichProgram','distantMaterialAvailable'];
function rendererFixture({city,scope,limitBytes=512*MiB}){
 const budget=m.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,16*MiB)}),{gl,linked}=fakeGL();m.bindChunkResourceContext(gl,m.createChunkResourceStore({budget}));
 const counts={paint:0,assemblies:0,specializations:0,work:0,repaints:0},data={city,scope,signal:new AbortController().signal},S={};
 const scoped=(fn,arity)=>(...args)=>{const owner=S.committingPreparedData??S.residentPreparedData;if(!owner)throw Error('fixture source call requires prepared data');const values=args.slice(0,arity);while(values.length<arity)values.push(undefined);return fn(...values,owner.scope);};
 const counted=(key,fn)=>(...args)=>{counts[key]++;return fn(...args);};
 const owner=m.createProgramPreparationOwner('delegated500 budget test',()=>{counts.repaints++;});
 Object.assign(S,m,Object.fromEntries(FLAGS.map(name=>[name,false])),{
  // The source ledger is the context's bound store; reading the resident
  // geometry store at construction would fix a store before any context exists.
  linkedPaint:m.currentPaintProgramGroups('delegated500',city),exactCurrentPaintProgramKeys:m.importedDelegated_exactCurrentPaintProgramKeys,
  city,berlinCurrent:city==='berlin',gl,residentGeometry:{get store(){throw Error('delegated500 source budget must not read the resident geometry store');}},map:{triggerRepaint(){counts.repaints++;}},
  programPreparation:new Proxy(owner,{get:(target,key)=>key==='work'?(context,recipe)=>{counts.work++;return target.work(context,recipe);}:target[key]}),
  delegatedColourSourceAuthority:m.createAuthority({inputs:['delegated500-budget-test-colour'],builders:[m.withResidentReflectionClip]}),
  delegatedPreparedSourceAuthority:m.createAuthority({inputs:['delegated500-budget-test-prepared'],builders:[B.createContextPreparedSourceWorkspace]}),
  facadePaintFragmentForCity:counted('paint',scoped(m.importedDelegated_facadePaintFragmentForCity,1)),paintProgramFragment:counted('paint',scoped(m.importedDelegated_paintProgramFragment,2)),
  paintProgramKey:scoped(m.importedDelegated_paintProgramKey,2),paintProgramPartitionEnabled:m.importedDelegated_paintProgramPartitionEnabled,
  specializeCurrentPaintProgram:counted('specializations',m.importedDelegated_specializeCurrentPaintProgram),currentPaintProgramKey:m.importedDelegated_currentPaintProgramKey,currentPaintProgramFamily:m.importedDelegated_currentPaintProgramFamily,
  berlinDistantPaintFragment:m.importedDelegated_berlinDistantPaintFragment,berlinPaulLobeProgramsEqual:m.importedDelegated_berlinPaulLobeProgramsEqual,berlinExactRichProgramKeys:m.importedDelegated_berlinExactRichProgramKeys,berlinDistantContractAvailable:m.importedDelegated_berlinDistantContractAvailable,
  f004Fragment645:m.importedDelegated_f004Fragment645,koPantaleonGateReady70:()=>false,koPantaleonAnnexReady70:()=>false,koLudwigWorkshopReady70:()=>false,koMesseturmCrownReady70:()=>false,
  currentFacadePaintFragment:()=>{throw Error('the fixture never emits the default facade paint');},BERLIN_FULL_CURRENT_CAPTURE_KEY:'berlin-full-current',
  destroyed:false,pageHidden:false,enabled:true,committingPreparedData:undefined,residentPreparedData:data,pendingGeometry:undefined,residentLifecycleRevision:0,
  materialRecipeRevision:1,materialSourceWorkRevision:1,materialSourceSettled:false,materialSourceFailure:undefined,cityPaintFragment:'',cityPaintFragmentBytes:0,cityPaintFragmentClaim:undefined,progressiveShaderSpecialization:undefined,
  specializeHamburgPartitions:city==='hamburg',currentFamilyPrograms:false,partitionEnabled:false,legacySolarPartitions:false,exactRichProgramKeys:new Map(),casterBase:new Map(),casterFailures:new Map(),casterAnalysisPending:new Set(),casterFamily0:undefined,solarDepthHelper:undefined,
  sourceBudgetWake:new AbortController(),materialRebuildIdentities:undefined,paintBoundCache:new WeakMap(),colourAssemblyBounds:new WeakMap(),programSourcesRevision:undefined,programSourceUTF8Bytes:0,
  baseSurfaceFragment:DEFAULT_HELPER,surfaceFragment:WINDOW_HELPER,diffuseFragment:undefined,textureShaderFailure:undefined,diffuseShaderFailure:undefined,
  mainKeys:new Set(),captureKeys:new Set(),mainPaintProgramKeys:()=>new Set(S.mainKeys),activeCaptureProgramKeys:()=>new Set(S.captureKeys),materialProgramDemandCurrent:()=>false,sceneIndexCount:()=>3,candidateCurrent:()=>false,
  sourceContextCurrent:(value,revision)=>!S.destroyed&&!S.pageHidden&&S.enabled&&S.residentPreparedData===value&&S.materialRecipeRevision===revision,
  solarCaptureDemandActive:()=>true,partitionRuns:[],programOverrideKey:()=>undefined,diagnostic557:false,compileStage557:undefined,currentLastFragmentBytes:0,currentInitialFragmentBytes:0,
 });
 for(const name of RENDERER)S[name]=evaluate(name,S);
 const original=S.fragment;S.fragment=counted('assemblies',original);S.casterPreparedSources=S.createCasterPreparedSources();
 return{S,budget,linked,counts,data,fragment:original};
}
async function until(attempt,turns=800){
 let last;for(let turn=0;turn<turns;turn++){try{const value=attempt();if(value!==undefined&&value!==false)return value;}catch(error){if(!m.isProgramPreparationPending(error))throw error;last=error;}await new Promise(resolve=>setTimeout(resolve,0));}
 throw Error('preparation did not settle: '+last);
}
const turn=()=>new Promise(resolve=>setTimeout(resolve,0));
// The explicit (non-pending) failure an attempt reports; an attempt that only waits fails the test.
async function untilFailure(attempt,turns=400){
 for(let i=0;i<turns;i++){try{attempt();}catch(error){if(!m.isProgramPreparationPending(error))return error;}await turn();}
 throw Error('the attempt kept waiting instead of reporting an explicit failure');
}
// Every tryReserve with its label, admission and byte delta on the ledger.
function spyTryReserve(budget){
 const original=budget.tryReserve,rows=[];
 budget.tryReserve=(costs,options)=>{const before=budget.stats.bytes,result=original(costs,options);rows.push({label:options?.label??'',ok:result.ok,delta:budget.stats.bytes-before});return result;};
 return{rows,restore(){budget.tryReserve=original;}};
}
// drainSourceWorkspaces: the settled text and its claim go; the recipe stays settled.
const drain=S=>{S.cityPaintFragment='';S.cityPaintFragmentBytes=0;S.releaseMaterialSourceClaim();};
function assertBound(bounds,text,label){
 assert(bounds.sourceCharactersUpperBound>=text.length,label+': '+text.length+' characters within '+bounds.sourceCharactersUpperBound);
 assert(bounds.paintSourceCharactersUpperBound>=text.length,label+' paint bound');assert(bounds.assemblyCharactersUpperBound>=bounds.sourceCharactersUpperBound,label+' envelope');
 const observed=m.countSyntax(text);for(const key of Object.keys(observed))assert(observed[key]<=bounds.syntaxUpperBound[key],label+' lexical '+key);
}
const clip=fragment=>m.withResidentReflectionClip(fragment);
const submitted=(linked,program)=>{const row=linked.find(value=>value.program===program);assert(row,'the granted program was linked');return row;};

test('every wrapper descriptor measures its own insertion and leaves every other city untouched',()=>{
 const material=B.DELEGATED_MATERIAL_SOURCE_WRAPPERS.map(row=>row.name),legacy=B.DELEGATED_LEGACY_PARTITION_WRAPPERS.map(row=>row.name);
 assert.deepEqual(material,RAW.map(([name])=>name),'the shared chain lists the original 22 wrappers innermost first');
 assert.deepEqual(legacy,material.slice(material.indexOf('f004Fragment645'),material.indexOf('f025FigureFragment663')+1));
 assert.equal(B.DELEGATED_MATERIAL_SOURCE_WRAPPERS.every((row,index)=>row.apply===raw[RAW[index][0]]),true,'descriptors call the real wrapper implementations');
 for(const row of [...B.DELEGATED_MATERIAL_SOURCE_WRAPPERS,...B.DELEGATED_BERLIN_DISTANT_WRAPPERS])for(const city of CITIES){
  const applies=B.delegatedWrapperApplies(row,city);
  for(const probe of row.probes){const output=row.apply(probe,city);if(applies)assert.notEqual(output,probe,row.name+' transforms its probe for '+city);else assert.equal(output,probe,row.name+' returns '+city+' unchanged');}
  if(applies)assert(B.delegatedWrapperGrowth(row,city).characters>0,row.name+' grows for '+city);
 }
 assert.throws(()=>B.delegatedWrapperGrowth({...B.DELEGATED_MATERIAL_SOURCE_WRAPPERS[0],probes:['vec3 unrelated(){return vec3(0.);}']},'hannover'),/no longer matches its budget probe/,'a changed anchor refuses instead of undercounting');
});

test('the shared chain reproduces the original nested strings for every wrapper group and stays inside its bounds',()=>{
 const scope=frozenScope({hamburg:HAMBURG_PROGRAMS,berlin:BERLIN_PROGRAMS});
 for(const [city,transforming] of Object.entries({berlin:9,hannover:4,dortmund:5,essen:1,bremen:1,cologne:0})){
  const base=m.importedDelegated_facadePaintFragmentForCity(city,scope),actual=B.applyDelegatedPaintWrappers(base,city,B.DELEGATED_MATERIAL_SOURCE_WRAPPERS);
  assert.equal(actual,originalMaterial(base,city),city+' material source is byte-identical');
  let value=base,applied=0;for(const row of B.DELEGATED_MATERIAL_SOURCE_WRAPPERS){const next=row.apply(value,city);if(next!==value)applied++;value=next;}
  assert.equal(applied,transforming,city+' wrappers that really transform the real source');
  assertBound(B.describeDelegatedWrappedPaintBounds(m.describeFacadePaintSourceBounds(city,undefined,scope),city,B.DELEGATED_MATERIAL_SOURCE_WRAPPERS),actual,city+' material');
 }
 for(const [city,key] of [['hamburg','base'],['hamburg','f1100'],['berlin',m.importedDelegated_paintProgramKey(1567,'berlin',scope)]]){
  const part=m.importedDelegated_paintProgramFragment(key,city,scope),actual=B.applyDelegatedPaintWrappers(part,city,B.DELEGATED_LEGACY_PARTITION_WRAPPERS);
  assert.equal(actual,originalLegacy(part,city),city+' '+key+' legacy partition is byte-identical');if(city==='berlin')assert.notEqual(actual,part,'all ten legacy hooks apply to the Berlin partition');
  assertBound(B.describeDelegatedWrappedPaintBounds(m.describeFacadePaintSourceBounds(city,key,scope),city,B.DELEGATED_LEGACY_PARTITION_WRAPPERS),actual,city+' '+key);
 }
 const material=B.describeDelegatedWrappedPaintBounds(m.describeFacadePaintSourceBounds('berlin',undefined,scope),'berlin',B.DELEGATED_MATERIAL_SOURCE_WRAPPERS);
 const berlin=B.applyDelegatedPaintWrappers(m.importedDelegated_facadePaintFragmentForCity('berlin',scope),'berlin',B.DELEGATED_MATERIAL_SOURCE_WRAPPERS),distant=m.importedDelegated_berlinDistantPaintFragment(berlin);
 assert(distant&&distant!==berlin,'the real Berlin source satisfies the distant contract');
 assertBound(B.describeDelegatedWrappedPaintBounds(B.existingShaderTextBounds(material),'berlin',B.DELEGATED_BERLIN_DISTANT_WRAPPERS),distant,'berlin distant');
 assert.equal(B.existingShaderTextBounds(material).assemblyCharactersUpperBound,material.sourceCharactersUpperBound,'held text carries no builder envelope');
});

test('per-family colour programs and caster classification share one admitted recipe and submit the original bytes',async()=>{
 const scope=frozenScope({extra:{cologne:COLOGNE_EXTRA}}),{S,budget,linked,counts,data,fragment}=rendererFixture({city:'cologne',scope});
 assert.equal(await until(()=>S.prepareMaterialSource()),true);assert.equal(counts.paint,1,'one admitted material build');
 const paint=S.cityPaintFragment;assert.equal(paint,originalMaterial(m.importedDelegated_facadePaintFragmentForCity('cologne',scope),'cologne'));
 assert(S.cityPaintFragmentClaim?.settled);assert.equal(budget.stats.bytes,2*paint.length,'only the settled retained material text stays charged');
 const k1003=S.currentPaintProgramKey(1003),k1004=S.currentPaintProgramKey(1004),expected=family=>m.importedDelegated_specializeCurrentPaintProgram(fragment(DEFAULT_HELPER,paint),family,false,true);
 // Family 0 first, then 1004; each classification is admitted by the workspace.
 S.partitionRuns=[{key:k1004,firstIndex:0,indexCount:3}];const assembliesBefore=counts.assemblies;
 assert.equal(await until(()=>S.prepareCasterClassification(DEFAULT_HELPER,k1004)),true);
 assert.equal(counts.assemblies-assembliesBefore,1,'one assembly shared by both classifications');
 const own=expected(1004);assert.equal(S.casterBase.get(k1004),own.depthEffects);assert.equal(S.casterFamily0,expected(0).depthEffects);
 const cached=S.casterPreparedSources.get(k1004);assert.equal(cached?.fragment,own.fragment,'an own caster retains its admitted specialized source');assert.equal(S.casterPreparedSources.budgetBytes,2*own.fragment.length);
 // The workspace claim inside a build adds no bytes beyond its program preflight.
 const reserve=budget.reserve.bind(budget),deltas=[];budget.reserve=(costs,options)=>{const before=budget.stats.bytes,value=reserve(costs,options);deltas.push(budget.stats.bytes-before);return value;};
 S.mainKeys=new Set([k1003,k1004]);const specializationsBefore=counts.specializations;
 const program1004=await until(()=>S.compileGeometryProgram(DEFAULT_HELPER,undefined,1004));
 assert.equal(submitted(linked,program1004).fragment,clip(own.fragment),'reused caster source submits the original bytes');assert.equal(submitted(linked,program1004).vertex,S.VERTEX);
 assert.equal(counts.specializations,specializationsBefore,'the classified source is consumed instead of specialized again');assert.equal(S.casterPreparedSources.size,0);assert.equal(S.casterPreparedSources.budgetBytes,0,'taking it returns its claim');
 const program1003=await until(()=>S.compileGeometryProgram(DEFAULT_HELPER,undefined,1003));
 assert.equal(submitted(linked,program1003).fragment,clip(expected(1003).fragment));
 S.captureKeys=new Set(['material:window']);const windowProgram=await until(()=>S.compileGeometryProgram(WINDOW_HELPER,undefined,0,false,true,'material:window'));
 assert.equal(submitted(linked,windowProgram).fragment,clip(m.importedDelegated_specializeCurrentPaintProgram(fragment(WINDOW_HELPER,paint),0,false,true).fragment),'a material helper recipe replaces the base and still matches');
 assert(deltas.length>0);assert.deepEqual(deltas.filter(value=>value!==0),[],'prepareSource reserves exactly the identities its ticket admitted');
 budget.reserve=reserve;
 const stats=S.programSources.preparedSourceStats;assert.equal(stats.builds,2,'base and window recipes each built once');assert(stats.hits>=2,'later families reuse the admitted base');
 S.clearMaterialSource();
 // DECISIONS 2026-11-02 03:25: every linked program stays charged at its policy estimate while it is held
 // (program1004, program1003 and the window program); clearing the material source returns everything else.
 const programBytes=budget.stats.categories.program?.bytes??0;assert.equal(programBytes,3*m.LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES,'the three held linked programs keep their policy estimate');
 assert.equal(S.programSources.preparedSourceStats.budget.ownedBytesEstimate,0,'clearing returns every workspace allocation');
 S.programSources.release();
 for(const [category,cost]of Object.entries(budget.stats.categories))if(category!=='program')assert.equal(cost.bytes,0,category+' is returned by workspace release');
 assert.equal(budget.stats.bytes,programBytes,'workspace release also returns pressure registry metadata');assert.equal(S.cityPaintFragment,'');
});

test('Hamburg rounded partitions preserve material bytes; review and shared partitions remain complete',async()=>{
 const hamburgScope=frozenScope({hamburg:HAMBURG_PROGRAMS}),hamburg=rendererFixture({city:'hamburg',scope:hamburgScope});
 assert.equal(await until(()=>hamburg.S.prepareMaterialSource()),true);assert.equal(hamburg.S.currentFamilyPrograms,false,'Hamburg keeps its certified legacy partitions');
 assert.equal(hamburg.S.cityPaintFragment,originalMaterial(m.importedDelegated_paintProgramFragment('base','hamburg',hamburgScope),'hamburg'));
 hamburg.S.mainKeys=new Set(['f1100']);const partition=await until(()=>hamburg.S.compilePartitionProgram(DEFAULT_HELPER,'f1100'));
 const original=hamburg.fragment(DEFAULT_HELPER,originalLegacy(m.importedDelegated_paintProgramFragment('f1100','hamburg',hamburgScope),'hamburg'));
 assert.equal(submitted(hamburg.linked,partition).fragment,clip(m.specializeRoundedPaintProgram(original,1100).fragment));
 assert(submitted(hamburg.linked,partition).fragment.includes('vec3 delegatedBudgetHamburg1100(vec3 base){return base*.7;}'),'material body stays byte-identical');
 const review=rendererFixture({city:'hamburg',scope:hamburgScope});review.S.specializeHamburgPartitions=false;
 assert.equal(await until(()=>review.S.prepareMaterialSource()),true);review.S.mainKeys=new Set(['f1100']);
 const reviewPartition=await until(()=>review.S.compilePartitionProgram(DEFAULT_HELPER,'f1100'));
 assert.equal(submitted(review.linked,reviewPartition).fragment,clip(original),'manual overrides retain the complete program');
 assert.deepEqual(hamburg.S.colourSpecializationFamilies('partition:delegated159-F57-173',0,false),[3289]);
 for(const key of ['base','delegated159-F059-256','supplement-hc70','F061-recovery279','shared577-4980'])assert.deepEqual(hamburg.S.colourSpecializationFamilies('partition:'+key,0,false),[],key+' keeps all families');
 assert.deepEqual(hamburg.S.colourSpecializationFamilies('partition:f1100',0,true),[]);
 const base=await until(()=>hamburg.S.compileGeometryProgram(DEFAULT_HELPER));
 assert.equal(submitted(hamburg.linked,base).fragment,clip(hamburg.fragment(DEFAULT_HELPER,hamburg.S.cityPaintFragment)));

 const hannoverScope=frozenScope(),hannover=rendererFixture({city:'hannover',scope:hannoverScope});
 assert.equal(await until(()=>hannover.S.prepareMaterialSource()),true);const hannoverPaint=hannover.S.cityPaintFragment,withoutHelper=hannover.fragment('',hannoverPaint);
 assert.equal(hannoverPaint,originalMaterial(m.importedDelegated_facadePaintFragmentForCity('hannover',hannoverScope),'hannover'));
 assert.equal(hannover.S.f358604Available,withoutHelper.includes(m.F358_TOKEN604));assert.equal(hannover.S.f346562Available,withoutHelper.includes(m.F346_ANNEX562_CLIP)&&withoutHelper.includes(m.F346_ANNEX562_GLSL));assert.equal(hannover.S.f355Clip559Available,withoutHelper.includes(m.F355_HIP559_CLIP));
 const hannoverBase=await until(()=>hannover.S.compileGeometryProgram(DEFAULT_HELPER));
 assert.equal(submitted(hannover.linked,hannoverBase).fragment,clip(m.importedDelegated_specializeCurrentPaintProgram(hannover.fragment(DEFAULT_HELPER,hannoverPaint),0,false,true).fragment));

 // Berlin starts from a settled, drained material state: the build admits and
 // retains its own rebuild before the workspace assembles the colour source.
 const berlinScope=frozenScope({berlin:BERLIN_PROGRAMS}),berlin=rendererFixture({city:'berlin',scope:berlinScope});
 Object.assign(berlin.S,{materialSourceSettled:true,currentFamilyPrograms:true,partitionEnabled:true,legacySolarPartitions:false});
 const berlinBase=await until(()=>berlin.S.compileGeometryProgram(DEFAULT_HELPER));const berlinPaint=berlin.S.cityPaintFragment;
 assert.equal(berlinPaint,originalMaterial(m.importedDelegated_facadePaintFragmentForCity('berlin',berlinScope),'berlin'));assert.equal(berlin.counts.paint,1);assert(berlin.S.cityPaintFragmentClaim?.settled,'the rebuilt Berlin paint is retained under its own claim');
 assert.equal(submitted(berlin.linked,berlinBase).fragment,clip(m.importedDelegated_specializeCurrentPaintProgram(berlin.fragment(DEFAULT_HELPER,berlinPaint),0,false,false).fragment));
 berlin.S.mainKeys=new Set([m.BERLIN_DISTANT_PAUL_LOBE_KEY]);const distant=await until(()=>berlin.S.compilePartitionProgram(DEFAULT_HELPER,m.BERLIN_DISTANT_PAUL_LOBE_KEY));
 assert.equal(submitted(berlin.linked,distant).fragment,clip(m.importedDelegated_specializeCurrentPaintProgram(berlin.fragment(DEFAULT_HELPER,m.importedDelegated_berlinDistantPaintFragment(berlinPaint)),m.BERLIN_DISTANT_PAUL_LOBE_FAMILY,false,false).fragment),'Berlin distant source is byte-identical');
 assert.equal(berlin.counts.paint,1,'the distant recipe derives from the retained paint instead of rebuilding it');
});

test('budget refusal runs no builder: valid work waits for availability and an unfit item fails explicitly',async()=>{
 const scope=frozenScope({extra:{cologne:COLOGNE_EXTRA}});
 // Material preflight: refused before the builder, nothing queued while blocked.
 const probe=rendererFixture({city:'cologne',scope}),estimate=probe.S.materialSourceEstimate(probe.data),required=B.delegatedCostBytes(B.delegatedSourceTextCosts(estimate,{retained:{},scratch:{}}));
 const limitBytes=512*MiB,waiting=rendererFixture({city:'cologne',scope,limitBytes}),{S,budget,counts}=waiting;
 let blocker=budget.reserve({category:'construction',bytes:limitBytes-required+1,precision:'estimate',identity:{},label:'fixture blocker'});
 assert.equal(S.prepareMaterialSource(),false);for(let i=0;i<5;i++)await turn();
 assert.equal(counts.paint,0,'refused admission never builds the paint');assert.equal(S.materialSourceGate.blocked,true);assert.equal(budget.stats.availabilityListeners,1,'one wake-up subscription, no timer');
 const work=counts.work;for(let i=0;i<3;i++){assert.equal(S.prepareMaterialSource(),false);await turn();}assert.equal(counts.work,work,'blocked preflight queues no further work');
 const repaints=counts.repaints;blocker.release();assert.equal(S.materialSourceGate.blocked,false);assert(counts.repaints>repaints,'availability wakes the renderer');
 assert.equal(await until(()=>S.prepareMaterialSource()),true);assert.equal(counts.paint,1);assert.equal(budget.stats.bytes,2*S.cityPaintFragment.length);

 // A material source larger than the whole page budget reports that it never fits.
 const unfit=rendererFixture({city:'cologne',scope,limitBytes:required-1});unfit.S.prepareMaterialSource();for(let i=0;i<5;i++)await turn();
 assert.throws(()=>unfit.S.prepareMaterialSource(),/page resource budget/);assert.equal(unfit.counts.paint,0);assert.equal(unfit.budget.stats.availabilityListeners,0,'an unfit item does not wait forever');

 // Colour compile: the ticket is refused before any assembly or specialization.
 S.mainKeys=new Set([S.currentPaintProgramKey(1004)]);
 const recipe=S.colourProgramRecipe(DEFAULT_HELPER,undefined,1004,false,false,undefined,S.colourSourceRecipe(DEFAULT_HELPER,undefined,waiting.data));
 const need=recipe.budget.sourceBytesUpperBound+B.delegatedCostBytes(recipe.budget.workspaceCosts);assert(need<=limitBytes-budget.stats.bytes,'fixture budget fits one program');
 blocker=budget.reserve({category:'construction',bytes:limitBytes-budget.stats.bytes-need+1,precision:'estimate',identity:{},label:'fixture blocker'});
 const assemblies=counts.assemblies,specializations=counts.specializations;
 for(let i=0;i<3;i++){assert.throws(()=>S.compileGeometryProgram(DEFAULT_HELPER,undefined,1004),error=>m.isProgramPreparationPending(error));await turn();}
 assert.equal(counts.assemblies,assemblies,'no assembly before program admission');assert.equal(counts.specializations,specializations);assert.equal(waiting.linked.length,0);
 blocker.release();const program=await until(()=>S.compileGeometryProgram(DEFAULT_HELPER,undefined,1004));
 assert.equal(submitted(waiting.linked,program).fragment,clip(m.importedDelegated_specializeCurrentPaintProgram(waiting.fragment(DEFAULT_HELPER,S.cityPaintFragment),1004,false,true).fragment));

 // Caster classification: the workspace refuses before assembly and waits.
 S.partitionRuns=[{key:S.currentPaintProgramKey(1003),firstIndex:0,indexCount:3}];S.clearProgramSources();
 const classification=S.programSources.programBudget(S.colourSourceRecipe(DEFAULT_HELPER,undefined,waiting.data),'',[],[0]);
 blocker=budget.reserve({category:'construction',bytes:limitBytes-budget.stats.bytes-B.delegatedCostBytes(classification.workspaceCosts)+1,precision:'estimate',identity:{},label:'fixture blocker'});
 const before=counts.assemblies,classified=[...S.casterBase];assert.equal(S.prepareCasterClassification(DEFAULT_HELPER,S.currentPaintProgramKey(1003)),false);for(let i=0;i<5;i++)await turn();
 assert.equal(counts.assemblies,before,'refused classification never assembles');assert.deepEqual([...S.casterBase],classified,'no classification is recorded without admission');assert.equal(S.casterSourceGate.blocked,true);
 const queued=counts.work;assert.equal(S.prepareCasterClassification(DEFAULT_HELPER,S.currentPaintProgramKey(1003)),false);assert.equal(counts.work,queued,'no work while blocked');
 blocker.release();assert.equal(await until(()=>S.prepareCasterClassification(DEFAULT_HELPER,S.currentPaintProgramKey(1003))),true);assert(S.casterBase.has(S.currentPaintProgramKey(1003)));

 // A single program larger than the page budget fails before compile.
 const small=rendererFixture({city:'cologne',scope,limitBytes:required+1});assert.equal(await until(()=>small.S.prepareMaterialSource()),true);
 const smallRecipe=small.S.colourProgramRecipe(DEFAULT_HELPER,undefined,0,false,false,undefined,small.S.colourSourceRecipe(DEFAULT_HELPER,undefined,small.data)),smallNeed=smallRecipe.budget.sourceBytesUpperBound+B.delegatedCostBytes(smallRecipe.budget.workspaceCosts);
 assert(smallNeed>required+1,'fixture program exceeds the small page budget');const smallAssemblies=small.counts.assemblies;
 assert.throws(()=>small.S.compileGeometryProgram(DEFAULT_HELPER),error=>error.name==='DelegatedShaderBudgetUnfitError');assert.equal(small.counts.assemblies,smallAssemblies);assert.equal(small.linked.length,0);
});

test('asynchronous admission waits on availability, aborts cleanly and every exit path returns its claim',async()=>{
 const budget=m.createResourceBudget({limitBytes:4*MiB,recentLimitBytes:MiB}),estimate={retainedCharactersUpperBound:256*1024,transientBytesUpperBound:MiB,label:'fixture source'};
 let blocker=budget.reserve({category:'construction',bytes:3*MiB,precision:'estimate',identity:{},label:'fixture blocker'});
 const aborted=new AbortController(),abortedWait=B.waitForDelegatedSourceText(budget,estimate,aborted.signal);await turn();
 assert.equal(budget.stats.availabilityListeners,1);aborted.abort(new DOMException('fixture cancel','AbortError'));await assert.rejects(abortedWait,/fixture cancel/);assert.equal(budget.stats.availabilityListeners,0,'abort removes the wake-up');
 let settled=false;const waiting=B.waitForDelegatedSourceText(budget,estimate,new AbortController().signal).then(claim=>{settled=true;return claim;});await turn();assert.equal(settled,false,'waits while refused');
 blocker.release();const claim=await waiting;assert.equal(claim.active,true);assert.equal(budget.stats.bytes,2*256*1024+MiB);
 claim.settle('x'.repeat(1000));assert.equal(budget.stats.bytes,2000,'settling keeps only the retained text');assert.throws(()=>B.admitDelegatedSourceText(budget,{...estimate,retainedCharactersUpperBound:8*MiB}),/page resource budget/);
 claim.release();claim.release();assert.equal(budget.stats.bytes,0);

 // Material snapshots: clearing returns the claim; restoring a returned claim drops its text.
 const scope=frozenScope({extra:{cologne:COLOGNE_EXTRA}}),{S,budget:ledger}=rendererFixture({city:'cologne',scope});assert.equal(await until(()=>S.prepareMaterialSource()),true);
 const snapshot=S.snapshotMaterial();S.cityPaintFragmentClaim.release();S.restoreMaterial(snapshot);assert.equal(S.cityPaintFragment,'','a returned claim no longer retains text');assert.equal(S.cityPaintFragmentClaim,undefined);
 assert.equal(ledger.stats.bytes,0);const text=S.ensureMaterialSourceWorkspace();assert(text.length>0);assert(S.cityPaintFragmentClaim?.settled);assert.equal(ledger.stats.bytes,2*text.length);
 const held=S.snapshotMaterial();S.clearMaterialSnapshot(held);assert.equal(ledger.stats.bytes,0,'clearing a snapshot returns its claim');
 // Drained text with its claim retired and the workspace released on destroy.
 S.cityPaintFragment='';S.cityPaintFragmentClaim=undefined;S.ensureMaterialSourceWorkspace();S.releaseMaterialSourceClaim();assert.equal(ledger.stats.bytes,0);
 S.programSources.release();assert.equal(S.programSources.preparedSourceStats.released,true);
});

test('a drained material text is preflighted with every colour program that reads it',async()=>{
 const scope=frozenScope({extra:{cologne:COLOGNE_EXTRA}});
 // The colour program alone, and the rebuild its build performs once the text is drained.
 const probe=rendererFixture({city:'cologne',scope});assert.equal(await until(()=>probe.S.prepareMaterialSource()),true);drain(probe.S);
 const alone=probe.S.colourProgramRecipe(DEFAULT_HELPER,undefined,0,false,false,undefined,probe.S.colourSourceRecipe(DEFAULT_HELPER,undefined,probe.data));
 // The program ticket includes its linked-program policy estimate (DECISIONS 2026-11-02 03:25), as the
 // delegated preflight now admits it with the source and workspace bounds.
 const ticket=alone.budget.sourceBytesUpperBound+B.delegatedCostBytes(alone.budget.workspaceCosts)+m.LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES,rebuild=B.delegatedCostBytes(probe.S.materialTextRequirement(probe.data).costs);
 const material=B.delegatedCostBytes(B.delegatedSourceTextCosts(probe.S.materialSourceEstimate(probe.data),{retained:{},scratch:{}}));
 assert(rebuild>0,'a drained text needs its rebuild');assert(material<ticket,'the material preflight is far smaller than one program');

 // Program plus rebuild never fitting the page: an explicit failure before any builder.
 const unfit=rendererFixture({city:'cologne',scope,limitBytes:ticket+Math.floor(rebuild/2)});
 assert.equal(await until(()=>unfit.S.prepareMaterialSource()),true);drain(unfit.S);const paints=unfit.counts.paint;
 assert.throws(()=>unfit.S.compileGeometryProgram(DEFAULT_HELPER),error=>error.name==='DelegatedShaderBudgetUnfitError'&&error.requiredBytes===ticket+rebuild,'the unfit check includes the drained rebuild');
 assert.equal(unfit.counts.paint,paints,'no rebuild');assert.equal(unfit.counts.assemblies,0);assert.equal(unfit.linked.length,0);assert.equal(unfit.budget.stats.bytes,0);assert.equal(unfit.budget.stats.availabilityListeners,0,'an unfit program does not wait');

 // Fits the page, but availability lies in [ticket, ticket+rebuild): the ticket
 // itself is refused, so no build is scheduled and no rebuild is ever attempted.
 const {S,budget,counts,linked,fragment}=rendererFixture({city:'cologne',scope});
 assert.equal(await until(()=>S.prepareMaterialSource()),true);const paint=S.cityPaintFragment;drain(S);
 const blocker=budget.reserve({category:'construction',bytes:512*MiB-ticket-Math.floor(rebuild/2),precision:'estimate',identity:{},label:'fixture blocker'});
 const spy=spyTryReserve(budget),paintsBefore=counts.paint;
 for(let i=0;i<20;i++){assert.throws(()=>S.compileGeometryProgram(DEFAULT_HELPER),error=>m.isProgramPreparationPending(error));await turn();}
 assert.equal(counts.paint,paintsBefore,'no rebuild while the ticket waits');assert.equal(counts.assemblies,0);
 assert.deepEqual(spy.rows.filter(row=>row.ok),[],'neither a ticket nor a rebuild is admitted');assert.equal(spy.rows.filter(row=>row.label.includes('material source rebuild')).length,0,'no build ran to attempt the rebuild');
 // Availability admits the ticket; the rebuild inside its build adds no bytes.
 spy.rows.length=0;blocker.release();
 const program=await until(()=>S.compileGeometryProgram(DEFAULT_HELPER));
 assert.equal(S.cityPaintFragment,paint,'the rebuilt text is the original material source');assert(S.cityPaintFragmentClaim?.settled);assert.equal(S.materialRebuildIdentities,undefined,'the rebuild consumed its identities');
 assert.deepEqual(spy.rows.filter(row=>row.label.includes('material source rebuild')).map(row=>[row.ok,row.delta]),[[true,0]],'the in-build rebuild deduplicates against its admitted ticket');
 assert.equal(submitted(linked,program).fragment,clip(m.importedDelegated_specializeCurrentPaintProgram(fragment(DEFAULT_HELPER,paint),0,false,true).fragment),'byte-identical program');
 spy.restore();

 // Berlin distant reads the same retained text: drained, its ticket carries the rebuild too.
 const berlinScope=frozenScope({berlin:BERLIN_PROGRAMS}),berlin=rendererFixture({city:'berlin',scope:berlinScope});
 assert.equal(await until(()=>berlin.S.prepareMaterialSource()),true);const berlinPaint=berlin.S.cityPaintFragment;drain(berlin.S);
 berlin.S.mainKeys=new Set([m.BERLIN_DISTANT_PAUL_LOBE_KEY]);const berlinSpy=spyTryReserve(berlin.budget);
 const distant=await until(()=>berlin.S.compilePartitionProgram(DEFAULT_HELPER,m.BERLIN_DISTANT_PAUL_LOBE_KEY));berlinSpy.restore();
 assert.deepEqual(berlinSpy.rows.filter(row=>row.label.includes('material source rebuild')).map(row=>[row.ok,row.delta]),[[true,0]],'the distant build rebuilds inside its admitted ticket');
 assert.equal(berlin.S.cityPaintFragment,berlinPaint);
 assert.equal(submitted(berlin.linked,distant).fragment,clip(m.importedDelegated_specializeCurrentPaintProgram(berlin.fragment(DEFAULT_HELPER,m.importedDelegated_berlinDistantPaintFragment(berlinPaint)),m.BERLIN_DISTANT_PAUL_LOBE_FAMILY,false,false).fragment),'Berlin distant source is byte-identical');
});

test('caster classification fails explicitly when it can never fit, and its refusal never blocks visible material work',async()=>{
 const scope=frozenScope({extra:{cologne:COLOGNE_EXTRA}});
 const probe=rendererFixture({city:'cologne',scope}),k1003=probe.S.currentPaintProgramKey(1003);
 const material=B.delegatedCostBytes(B.delegatedSourceTextCosts(probe.S.materialSourceEstimate(probe.data),{retained:{},scratch:{}}));
 const recipe=probe.S.colourSourceRecipe(DEFAULT_HELPER,undefined,probe.data),caster=B.delegatedCostBytes([...probe.S.programSources.programBudget(recipe,'',[],[0]).workspaceCosts,...probe.S.materialTextRequirement(probe.data).costs]);
 assert(material<caster,'the classification (workspace plus material rebuild) outgrows the material preflight');

 // Never fits: an explicit failure, no builder, no wake-up subscription.
 const unfit=rendererFixture({city:'cologne',scope,limitBytes:Math.floor((material+caster)/2)});unfit.S.partitionRuns=[{key:k1003,firstIndex:0,indexCount:3}];
 const failure=await untilFailure(()=>unfit.S.prepareCasterClassification(DEFAULT_HELPER,k1003));
 assert.match(String(failure),/DelegatedShaderBudgetUnfitError/);
 assert.equal(unfit.counts.assemblies,0);assert.equal(unfit.counts.paint,0,'no rebuild for a classification that never fits');assert.equal(unfit.S.casterSourceGate.waiting,false);assert.equal(unfit.budget.stats.availabilityListeners,0);assert.equal(unfit.S.casterBase.size,0);

 // Fits the page but not current availability: only the caster kind waits.
 const {S,budget,counts}=rendererFixture({city:'cologne',scope});S.partitionRuns=[{key:k1003,firstIndex:0,indexCount:3}];
 const blocker=budget.reserve({category:'construction',bytes:512*MiB-material-Math.floor((caster-material)/2),precision:'estimate',identity:{},label:'fixture blocker'});
 assert.equal(S.prepareCasterClassification(DEFAULT_HELPER,k1003),false);for(let i=0;i<5;i++)await turn();
 assert.equal(S.casterSourceGate.blocked,true);assert.equal(S.casterSourceGate.waiting,true);assert.equal(counts.assemblies,0);assert.equal(counts.paint,0);
 const work=counts.work;assert.equal(S.prepareCasterClassification(DEFAULT_HELPER,k1003),false);assert.equal(counts.work,work,'the refused classification queues nothing while it waits');
 // The visible material preflight still fits and completes with no release at all.
 assert.equal(S.materialSourceGate.blocked,false);assert.equal(await until(()=>S.prepareMaterialSource()),true);assert.equal(counts.paint,1,'material built while the caster waited');
 blocker.release();assert.equal(await until(()=>S.prepareCasterClassification(DEFAULT_HELPER,k1003)),true,'availability lets the classification finish');

 // A classification of a drained text preflights the rebuild with its workspace.
 const drained=rendererFixture({city:'cologne',scope});drained.S.partitionRuns=[{key:k1003,firstIndex:0,indexCount:3}];
 assert.equal(await until(()=>drained.S.prepareMaterialSource()),true);const paint=drained.S.cityPaintFragment;drain(drained.S);const spy=spyTryReserve(drained.budget);
 assert.equal(await until(()=>drained.S.prepareCasterClassification(DEFAULT_HELPER,k1003)),true);spy.restore();
 const preflight=spy.rows.filter(row=>row.label==='delegated500 caster classification'),rebuilds=spy.rows.filter(row=>row.label.includes('material source rebuild'));
 assert(preflight.length>=1&&preflight.every(row=>row.ok),'every classification is preflighted');assert(preflight[0].delta>0,'the first preflight claims the workspace and the rebuild');assert.deepEqual(rebuilds.map(row=>[row.ok,row.delta]),[[true,0]],'the rebuild inside the classification adds no bytes');
 assert.equal(drained.S.cityPaintFragment,paint);assert(drained.S.casterBase.has(drained.S.currentPaintProgramKey(0)));
});

test('Berlin packing reads its f020 1679 partition flags once, under the material claim',async()=>{
 const packing=declaration('packResidentBatchesSteps');
 assert.doesNotMatch(packing,/paintProgramFragment\(/,'packing builds no partition paint outside a claim');
 assert.equal(packing.match(/city==='berlin'&&f020Whole1679Available\)/g)?.length,8);assert.equal(packing.match(/city==='berlin'&&f020Chapel1679Available\)/g)?.length,1);
 const scope=frozenScope({berlin:BERLIN_PROGRAMS}),{S,budget,data}=rendererFixture({city:'berlin',scope});
 const key1567=m.importedDelegated_paintProgramKey(1567,'berlin',scope),key1679=m.importedDelegated_paintProgramKey(1679,'berlin',scope);
 // The original packing argument expressions, evaluated on the side.
 const partition=m.importedDelegated_paintProgramFragment(key1679,'berlin',scope),tower=raw.f020Fragment652(partition,'berlin'),chapel=raw.f020ChapelFragment654(tower,'berlin');
 const estimate=S.materialSourceEstimate(data,true),admitted=B.delegatedCostBytes(B.delegatedSourceTextCosts(estimate,{retained:{},scratch:{}}));
 assert(estimate.transientBytesUpperBound>=2*Math.max(partition.length+2*tower.length,partition.length+tower.length+2*chapel.length),'the packing envelope covers the partition and its f020652/654 chain');
 const seen=[],original=S.paintProgramFragment;S.paintProgramFragment=(key,city)=>{seen.push({key,bytes:budget.stats.bytes});return original(key,city);};
 try{
  const claim=S.admitMaterialSourceNow(data,S.batchSourceGate,'packing',true);assert(claim);S.withPreparedData(data,()=>S.buildMaterialSource(claim,true));
  assert.deepEqual(seen.map(row=>row.key),[key1567,key1679],'one f004 partition and one f020 partition paint');
  assert(seen.every(row=>row.bytes===admitted),'each partition paint is built under the unsettled material claim');
  assert.equal(S.f020Whole1679Available,partition.includes('vec3 f020WholeNative321('));assert.equal(S.f020Chapel1679Available,chapel.includes('vec3 f020Chapel654('));
  assert.equal(S.f020Whole1679Available,true,'the fixture partition carries the f020 anchor');assert(claim.settled);assert.equal(budget.stats.bytes,2*S.cityPaintFragment.length);
  // A resident preflight without packing builds no 1679 partition and keeps the packing flags.
  seen.length=0;S.f020Whole1679Available='kept';S.f020Chapel1679Available='kept';
  const resident=S.admitMaterialSourceNow(data,S.materialSourceGate,S.materialSourceWorkRevision);S.withPreparedData(data,()=>S.buildMaterialSource(resident));
  assert.deepEqual(seen.map(row=>row.key),[key1567]);assert.equal(S.f020Whole1679Available,'kept');assert.equal(S.f020Chapel1679Available,'kept');
 }finally{S.paintProgramFragment=original;}
});

test('wrapper chain envelopes keep the raw paint beside every later wrapper',()=>{
 const scope=frozenScope({hamburg:HAMBURG_PROGRAMS,berlin:BERLIN_PROGRAMS});
 // The declared envelope must cover, for each transforming wrapper, its input,
 // textCopies outputs and, after the first one, the raw paint still referenced.
 const check=(label,source,city,wrappers,bounds)=>{let value=source,applied=0;for(const row of wrappers){const next=row.apply(value,city);if(next===value)continue;const live=(applied?source.length:0)+value.length+row.textCopies*next.length;assert(bounds.assemblyCharactersUpperBound>=live,label+' '+row.name+': '+live+' live characters within '+bounds.assemblyCharactersUpperBound);applied++;value=next;}return applied;};
 for(const city of ['berlin','hannover','dortmund']){const base=m.importedDelegated_facadePaintFragmentForCity(city,scope);assert(check(city,base,city,B.DELEGATED_MATERIAL_SOURCE_WRAPPERS,B.describeDelegatedWrappedPaintBounds(m.describeFacadePaintSourceBounds(city,undefined,scope),city,B.DELEGATED_MATERIAL_SOURCE_WRAPPERS))>1,city+' applies several wrappers');}
 for(const family of [1567,1679]){const key=m.importedDelegated_paintProgramKey(family,'berlin',scope),part=m.importedDelegated_paintProgramFragment(key,'berlin',scope),partBounds=m.describeFacadePaintSourceBounds('berlin',key,scope);
  assert(check('berlin legacy '+family,part,'berlin',B.DELEGATED_LEGACY_PARTITION_WRAPPERS,B.describeDelegatedWrappedPaintBounds(partBounds,'berlin',B.DELEGATED_LEGACY_PARTITION_WRAPPERS))>1);
  assert.equal(check('berlin f020 '+family,part,'berlin',B.DELEGATED_F020_CHAPEL_WRAPPERS,B.describeDelegatedWrappedPaintBounds(partBounds,'berlin',B.DELEGATED_F020_CHAPEL_WRAPPERS)),2);}
 // The loop reproduces the nested calls exactly.
 const part=m.importedDelegated_paintProgramFragment(m.importedDelegated_paintProgramKey(1679,'berlin',scope),'berlin',scope);
 assert.equal(B.applyDelegatedPaintWrappers(part,'berlin',B.DELEGATED_F020_CHAPEL_WRAPPERS),raw.f020ChapelFragment654(raw.f020Fragment652(part,'berlin'),'berlin'));
});

test('the source workspace binds lazily to the ledger of its own WebGL context',async()=>{
 const scope=frozenScope({extra:{cologne:COLOGNE_EXTRA}}),{S,budget}=rendererFixture({city:'cologne',scope});
 // The fixture context is bound to its own store, not the page default.
 assert.notEqual(m.getPageChunkResourceStore().budget,budget);assert.equal(S.pageBudget(),budget,'source admissions use the context store ledger');
 const unused=S.programSources.preparedSourceStats;assert.equal(unused.builds,0);assert.equal(unused.budget.ownedBytesEstimate,0,'no workspace exists before first use');
 const context=S.gl;S.gl=undefined;assert.throws(()=>S.pageBudget(),/requires its WebGL context/);assert.doesNotThrow(()=>S.programSources.preparedSourceStats);S.programSources.clearPreparedSource();S.gl=context;
 assert.equal(await until(()=>S.prepareMaterialSource()),true);const paint=S.cityPaintFragment;
 assert(await until(()=>S.compileGeometryProgram(DEFAULT_HELPER)));
 assert.equal(S.programSources.preparedSourceStats.builds,1,'created on that ledger at first use');assert(budget.stats.bytes>2*paint.length,'its retained base is charged to the same ledger');
 S.programSources.release();assert.equal(S.programSources.preparedSourceStats.released,true);assert.throws(()=>S.programSources.prepareSource(S.colourSourceRecipe(DEFAULT_HELPER,undefined,{scope}),[0]),/released/);
});

function delegatedQueuedSelectionFixture(){
 const source=ts.createSourceFile('queued.ts','const queued='+declaration('compileGeometryProgram'),ts.ScriptTarget.Latest,true);let method;
 function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(source)==='resolveSource')method=node;ts.forEachChild(node,visit);}visit(source);assert(method);
 const first={id:'first'},second={id:'second'},events=[];
 const state={selected:{data:first,revision:1},select(){return {...state.selected};},
  ProgramPreparationPending:class extends Error{},VERTEX:'vertex',DELEGATED_COLOUR_ATTRIBUTES:['position'],helper:'helper',prune:false,paintFragment:undefined,currentFamily:0,families:[],city:'cologne',recipe:{resource:'colour:0'},
  withSourceContext(data,revision,run){const old=state.context;state.context={data,revision};try{return run();}finally{state.context=old;}},
  materialTextRequirement(data){events.push(['text',data.id]);return{costs:[{data}],heldBytes:0};},
  colourSourceRecipe(_helper,_paint,data){assert.equal(state.context.data,data);return{data,revision:state.context.revision};},
  programSources:{programBudget(recipe){return{recipe};}},withMaterialTextCosts(value,costs){return{...value,costs};},pageBudget(){return{};},
  assertDelegatedProgramBudgetFits(_budget,value){events.push(['admit',value.recipe.data.id]);},
  buildFor(consumer){events.push(['build',consumer.data.id]);return consumer.data;}
 };
 const js=ts.transpileModule('const queued={'+method.getText(source)+'};',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const queued=Function('state','with(state){'+js+';return queued;}')(state);
 return{state,first,second,events,resolve:()=>queued.resolveSource()};
}
test('delegated queued source rebinds both workspace and material rebuild to successor data',()=>{
 const {state,second,events,resolve}=delegatedQueuedSelectionFixture();state.selected={data:second,revision:2};
 const selected=resolve();assert.equal(selected.budget.recipe.data,second);assert.equal(selected.budget.recipe.revision,2);assert.equal(selected.budget.costs[0].data,second);
 assert.equal(selected.current(),true,'fresh selection wrappers keep the same data/revision identity');assert.equal(selected.build(),second);
 assert.deepEqual(events,[['text','second'],['admit','second'],['build','second']]);
});
test('delegated queued source rejects a replaced scene before building',()=>{
 const {state,second,events,resolve}=delegatedQueuedSelectionFixture(),selected=resolve();state.selected={data:second,revision:2};
 assert.equal(selected.current(),false);assert.throws(()=>selected.build(),state.ProgramPreparationPending);assert(!events.some(([phase])=>phase==='build'));
});
test('delegated queued source rejects a material revision change within the same scene',()=>{
 const {state,events,resolve}=delegatedQueuedSelectionFixture(),selected=resolve();state.selected.revision++;
 assert.equal(selected.current(),false);assert.throws(()=>selected.build(),state.ProgramPreparationPending);assert(!events.some(([phase])=>phase==='build'));
});
