import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';

const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(web,'package.json')),ts=require('typescript');
const base=path.join(web,'src/painted/bremen/safety');
const [planSource,facadeSource]=await Promise.all(['bremen-prepared-program-plan.ts','facade-paint-fragment.ts'].map(name=>readFile(path.join(base,name),'utf8')));
const [root500PlanSource,infillPlanSource]=await Promise.all(['root500','infill'].map(provider=>readFile(path.join(web,'src/painted',provider,'safety',provider+'-prepared-program-plan.ts'),'utf8')));
function load(source,deps={},bindings={}){
 const module={exports:{}},js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 Function('require','module','exports',...Object.keys(bindings),js)(name=>{assert(name in deps,'Unexpected plan fixture import '+name);return deps[name];},module,module.exports,...Object.values(bindings));return module.exports;
}
// The prepared-source leaf graph (family program, shader source budget, UTF-8 length) is loaded through
// its real relative imports, not a hand-maintained require map.
const leafModules=createSourceModules({allow:id=>['safety/family-paint-program','safety/prepared-source','safety/render-runtime/resource-budget','safety/render-runtime/pressure-availability','safety/render-runtime/shader-source-budget','safety/utf8-byte-length'].includes(id)});
const familyModule=leafModules.load('safety/family-paint-program'),preparedSourceModule=leafModules.load('safety/prepared-source'),utf8Module=leafModules.load('safety/utf8-byte-length');
const familySource='#version 300 es\nprecision highp float;out vec4 color;\nvec3 plain(vec3 base){return base*.5;}vec3 cutout(vec3 base){discard;return base*.25;}\nvec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1001.)return plain(base);if(family==1002.)return cutout(base);return base;}\nvoid main(){color=vec4(paintedFacade(vec3(1.),vec3(0.),vec3(0.,1.,0.),vec4(0.),1001.),1.);}';
const facadeAst=ts.createSourceFile('facade.ts',facadeSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const recipe=facadeAst.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createRecipe');
function functionText(name,nodes=recipe.body.statements){const node=nodes.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert(node,'Missing actual function '+name);return node.getText(facadeAst).replace(/^export /,'');}
function sourceCaches(scope){
 const maps=recipe.body.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(declaration=>declaration.name.getText(facadeAst)==='partitionFragments'));
 assert(maps,'Missing admitted source cache state');
 const source=[maps.getText(facadeAst),...['scopeValue','_scope_partitionFragments','_scope_cityPaintFragments','clearPreparedProgramSources'].map(name=>functionText(name)),
  'return {partition:_scope_partitionFragments,city:_scope_cityPaintFragments,clear:clearPreparedProgramSources};'].join('\n');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return Function('scope',js)(scope);
}
function fixture({partition=true,fail}={}){
 const calls=[],dataMemo=new Map([['validated-model',{complete:true}]]),lifetime={pins:1,releases:0,retains:0,disposed:false};
 const scope={memo(){throw Error('Source caches must not enter frozen data memo');},retain(){lifetime.retains++;},release(){lifetime.releases++;},get stats(){return{disposed:lifetime.disposed};}};
 const caches=sourceCaches(scope),failures={...fail};
 const observations=facadeAst.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(declaration=>declaration.name.getText(facadeAst)==='sourceObservations'));assert(observations,'actual source observation state');
 const description=load([observations.getText(facadeAst),...['describeExistingFacadeSource','facadeSourceDescription','facadePaintSpecializationForCity','describeFacadePaintSource'].map(name=>functionText(name,facadeAst.statements).replace(/^function (facadePaintSpecializationForCity|describeFacadePaintSource)\(/,'export function $1('))].join('\n'),{},{...utf8Module,PROGRESSIVE_FEATURE_SHA:'source',PROGRESSIVE_CITY_SOURCE_FULL_SHA:'generated'});
 const take=(kind,args)=>{calls.push({kind,args});if(failures[kind]){failures[kind]--;throw Error('fixture '+kind);}};
 const facade={
  paintProgramPartitionEnabled(...args){take('partition',args);return typeof partition==='function'?partition(...args):partition;},
  paintProgramFragment(key,city,scope){caches.partition().set(key,'family:'+city+':'+key+'\n汉😀');take('family',[key,city,scope]);return caches.partition().get(key);},
  facadePaintFragmentForCity(city,scope){caches.city().set(city,'city:'+city+'\n汉😀');take('city',[city,scope]);return caches.city().get(city);},
  facadePaintSpecializationForCity(city,scope){take('specialization',[city,scope]);return description.facadePaintSpecializationForCity(city,scope);},
  describeFacadePaintSource(city,source,kind,scope){take('description',[city,source,kind,scope]);return description.describeFacadePaintSource(city,source,kind,scope);},
  clearBremenPreparedProgramSources(current){take('clear',[current]);if(!current.stats.disposed)caches.clear();},
 };
 const facadeAuthority=facade.BREMEN_FACADE_PROGRAM_SOURCE_AUTHORITY=Object.freeze({kind:'immutable-program-source',inputs:Object.freeze(['facade-fixture-source-v1']),builders:Object.freeze([facade.paintProgramPartitionEnabled,facade.paintProgramFragment,facade.facadePaintFragmentForCity])});
 const create=load(planSource,{'./facade-paint-fragment':facade,'../../../safety/prepared-source':preparedSourceModule,'../../../safety/utf8-byte-length':utf8Module}).createBremenPreparedProgramPlan;
 const options={scope,city:'bremen',generation:4,revision:8,profileInputs:['paint'],sourceInputs:['recipe-sha'],materialInputs:[17]};
 return{create,options,scope,caches,calls,lifetime,dataMemo,description,facadeAuthority,facade};
}

test('prepared program plan: cold creation snapshots lightweight identity without building or retaining data',()=>{
 const f=fixture(),opaque={toJSON(){throw Error('Do not serialize model tokens');}},symbol=Symbol('source');
 f.options.sourceInputs=[opaque,symbol,symbol,0,-0,null,undefined];
 const plan=f.create(f.options),inputs=[...plan.inputs];
 assert.equal(f.calls.length,0);assert.equal(plan.specialization,undefined);assert.equal(plan.sourceCharacters,0);assert.equal(plan.sourcesBuilt,0);
 const metadata=f.description.facadePaintSpecializationForCity('bremen',f.scope);assert.equal(metadata.fragmentBytes,null);assert.equal(metadata.fullFragmentBytes,null);assert.equal(metadata.specialized,null);assert.equal(metadata.sourceKind,null);assert.equal(f.calls.length,0,'querying unknown source metrics does not construct a fallback');
 assert(plan.inputs.every(value=>typeof value==='string'));assert(Object.isFrozen(plan.inputs));
 assert(plan.inputs.includes('number:0'));assert(plan.inputs.includes('number:-0'));
 assert.equal(inputs.filter(value=>value==='symbol:0').length,2);
 assert.equal(plan.identity,plan.identity);assert.equal(plan.inputs,plan.inputs);
 f.options.sourceInputs.push('later');f.options.materialInputs[0]=99;assert.deepEqual(plan.inputs,inputs);
 const next=f.create({...f.options,revision:9});assert.notEqual(next.identity,plan.identity);assert.notDeepEqual(next.inputs,plan.inputs);
 plan.release();plan.release();next.release();assert.deepEqual(plan.inputs,[]);assert.equal(f.calls.length,0);
 assert.equal(f.lifetime.retains,0);assert.equal(f.lifetime.releases,0);assert.equal(f.lifetime.pins,1);
});

test('prepared program plan: provenance separates immutable source content from batch lifetime without a cold source build',()=>{
 let partition=true;const f=fixture({partition:()=>partition}),otherLifetime={disposed:false,releases:0};
 const otherScope={memo(){throw Error('Content identity must not borrow data');},release(){otherLifetime.releases++;},get stats(){return{disposed:otherLifetime.disposed};}};
 const first=f.create({...f.options,profileInputs:[{}],sourceInputs:[new Map(),[]],materialInputs:[{}]}),
  next=f.create({...f.options,scope:otherScope,generation:91,revision:213,profileInputs:[{}],sourceInputs:[new Map(),[]],materialInputs:[{}]});
 assert.equal(f.calls.length,0,'creating plans does not ask the facade for metadata or source');
 assert.notEqual(first.identity,next.identity);assert.notDeepEqual(first.inputs,next.inputs);
 const inputs=first.programSourceInputs,provenance=first.programSourceProvenance;
 assert.deepEqual(next.programSourceInputs,inputs);assert.equal(next.programSourceProvenance,provenance);
 assert.equal(first.programSourceInputs,inputs);assert.equal(provenance[0],f.facadeAuthority);
 assert.equal(provenance[1].builders[0],preparedSourceModule.createPreparedSourceWorkspace);
 assert.deepEqual(provenance[1].inputs,['bremen-prepared-source-abi-v1']);
 assert(Object.isFrozen(inputs));assert(Object.isFrozen(provenance));
 for(const authority of provenance){assert.equal(authority.kind,'immutable-program-source');assert(Object.isFrozen(authority));assert(Object.isFrozen(authority.inputs));assert(Object.isFrozen(authority.builders));}
 const anotherCity=f.create({...f.options,city:'hamburg'});assert.notDeepEqual(anotherCity.programSourceInputs,inputs);
 partition=false;const citySource=f.create({...f.options,scope:otherScope});assert.notDeepEqual(citySource.programSourceInputs,inputs);
 assert.deepEqual(next.programSourceInputs,inputs,'an established plan keeps its actual partition choice');
 assert(f.calls.every(call=>call.kind==='partition'),'content getters do not assemble or describe raw GLSL');
 assert.equal(first.sourcesBuilt,0);assert.equal(next.sourcesBuilt,0);assert.equal(first.preparedSourceStats.builds,0);
 first.release();f.lifetime.disposed=true;
 assert.throws(()=>first.programSourceInputs,{name:'AbortError'});assert.throws(()=>first.programSourceProvenance,{name:'AbortError'});
 assert.equal(otherLifetime.disposed,false);assert.equal(otherLifetime.releases,0);
 assert.equal(next.programSourceProvenance,provenance);assert.deepEqual(next.programSourceInputs,inputs);
 assert.equal(next.fragment('owner17'),'family:bremen:owner17\n汉😀','releasing the old plan leaves the new scoped source usable');
 assert.equal(f.calls.find(call=>call.kind==='family').args[2],otherScope);
 otherLifetime.disposed=true;assert.throws(()=>next.programSourceInputs,{name:'AbortError'});assert.throws(()=>next.programSourceProvenance,{name:'AbortError'});
 next.release();anotherCity.release();citySource.release();assert.equal(otherLifetime.releases,0);
 for(const [provider,source,exportName,authorityName] of [
  ['root500',root500PlanSource,'createRoot500PreparedProgramPlan','ROOT500_FACADE_PROGRAM_SOURCE_AUTHORITY'],
  ['infill',infillPlanSource,'createInfillPreparedProgramPlan','INFILL_FACADE_PROGRAM_SOURCE_AUTHORITY'],
 ]){
  let legacy=true,expectedPartitionScope;const f=fixture({partition:(city,scope)=>{if(provider==='infill')assert.equal(scope,expectedPartitionScope,'infill '+city+' partition query keeps the exact prepared scope');return legacy;}}),lifetime={disposed:false,releases:0};
  const scope={memo(){throw Error('Content identity must not borrow data');},release(){lifetime.releases++;},get stats(){return{disposed:lifetime.disposed};}};
  const facade={...f.facade,clearRoot500PaintSources:f.facade.clearBremenPreparedProgramSources,clearInfillPaintSources:f.facade.clearBremenPreparedProgramSources,
   async prepareRoot500ProgramData(...args){f.calls.push({kind:'prepare',args});}};
  const authority=facade[authorityName]=Object.freeze({kind:'immutable-program-source',inputs:Object.freeze([provider+'-fixture-source-v1']),builders:Object.freeze([facade.paintProgramPartitionEnabled,facade.paintProgramFragment,facade.facadePaintFragmentForCity])});
  const create=load(source,{'./facade-paint-fragment':facade,'../../../safety/prepared-source':preparedSourceModule,'../../../safety/utf8-byte-length':utf8Module})[exportName];
  const make=options=>{expectedPartitionScope=options.scope;return create(options);};
  const original=make({city:'bremen',scope:f.scope,identity:'original-generation',id:1}),fresh=make({city:'bremen',scope,identity:'new-generation',id:99});
  const inputs=original.programSourceInputs,provenance=original.programSourceProvenance;
  assert.deepEqual(fresh.programSourceInputs,inputs,provider+' content is independent of batch identity/scope');assert.equal(fresh.programSourceProvenance,provenance);
  assert.equal(provenance[0],authority);assert.deepEqual(provenance[1].inputs,[provider+'-prepared-source-abi-v1']);assert.equal(provenance[1].builders[0],preparedSourceModule.createPreparedSourceWorkspace);
  assert(Object.isFrozen(inputs));assert(Object.isFrozen(provenance));for(const item of provenance){assert(Object.isFrozen(item));assert(Object.isFrozen(item.inputs));assert(Object.isFrozen(item.builders));}
  const anotherCity=make({city:'frankfurt',scope:f.scope,identity:'another-city',id:100});assert.notDeepEqual(anotherCity.programSourceInputs,inputs);
  if(provider==='infill')assert.equal(f.calls.find(call=>call.kind==='partition'&&call.args[0]==='frankfurt').args[1],f.scope);
  legacy=false;const anotherPartition=make({city:'bremen',scope,identity:'another-partition',id:101});assert.notDeepEqual(anotherPartition.programSourceInputs,inputs);
  assert(f.calls.every(call=>call.kind==='partition'||call.kind==='specialization'),provider+' metadata does not assemble or describe raw GLSL');
  assert.equal(original.preparedSourceStats.builds,0);assert.equal(fresh.preparedSourceStats.builds,0);
  original.release();f.lifetime.disposed=true;
  assert.throws(()=>original.programSourceInputs,{name:'AbortError'});assert.throws(()=>original.programSourceProvenance,{name:'AbortError'});
  assert.equal(lifetime.disposed,false);assert.equal(lifetime.releases,0);assert.deepEqual(fresh.programSourceInputs,inputs);assert.equal(fresh.programSourceProvenance,provenance);
  const built=fresh.prepareSource({sourceKey:'owner17',inputs:['tiny-material'],assemble:paint=>familySource+'\n/*'+paint+'*/'},[1001]);
  assert(built.fragment.includes('vec3 plain('));assert.equal(f.calls.find(call=>call.kind==='family').args[2],scope);
  lifetime.disposed=true;assert.throws(()=>fresh.programSourceInputs,{name:'AbortError'});assert.throws(()=>fresh.programSourceProvenance,{name:'AbortError'});
  fresh.release();anotherCity.release();anotherPartition.release();assert.equal(lifetime.releases,0);
 }
});

test('prepared program plan: admitted partition builds preserve source arguments and retain only scalar diagnostics',()=>{
 const f=fixture(),plan=f.create(f.options);
 assert.equal(plan.partitionEnabled,true);assert.equal(plan.partitionEnabled,true);
 assert.deepEqual(f.calls.map(call=>call.kind),['partition']);assert.equal(plan.specialization,undefined);
 const first=plan.fragment('owner17');assert.equal(first,'family:bremen:owner17\n汉😀');
 assert.equal(plan.sourceCharacters,first.length);assert.notEqual(plan.sourceCharacters,Buffer.byteLength(first));assert.equal(plan.sourcesBuilt,1);
 assert.deepEqual(f.calls.map(call=>call.kind),['partition','family','description','clear']);
 assert.deepEqual(f.calls[1].args,['owner17','bremen',f.scope]);assert.deepEqual(f.calls[2].args,['bremen',first,'partition',f.scope]);
 assert.equal(f.caches.partition().size,0);assert.equal(f.caches.city().size,0);
 assert.deepEqual(plan.specialization,{city:'bremen',specialized:null,sourceSHA256:'source',generatedSourceSHA256:'generated',sourceKind:'partition',fragmentBytes:Buffer.byteLength(first),fullFragmentBytes:null,baselinePreservedVerbatim:null});
 assert(Object.isFrozen(plan.specialization));assert.equal(plan.fragment(),'family:bremen:base\n汉😀');
 assert.equal(f.calls.filter(call=>call.kind==='description').length,2,'each actually built source refreshes its scalar byte observation');assert.equal(plan.sourcesBuilt,2);
 assert.equal(f.dataMemo.get('validated-model').complete,true);plan.release();
});

test('prepared program plan: nonpartition city uses the original city getter inside source build',()=>{
 const f=fixture({partition:false}),plan=f.create({...f.options,city:'fixture-city'});
 assert.equal(f.calls.length,0);assert.equal(plan.fragment('ignored-family'),'city:fixture-city\n汉😀');
 assert.deepEqual(f.calls.map(call=>call.kind),['partition','city','description','clear']);
 assert.deepEqual(f.calls[1].args,['fixture-city',f.scope]);assert.equal(f.caches.city().size,0);plan.release();
});

test('prepared program plan: failed family builds or source descriptions clear both actual facade caches and can retry',()=>{
 for(const failed of ['family','description']){
  const f=fixture({fail:{[failed]:1}}),plan=f.create(f.options);
  assert.throws(()=>plan.fragment('owner17'),new RegExp('fixture '+failed));
  assert.equal(f.caches.partition().size,0);assert.equal(f.caches.city().size,0);
  assert.equal(plan.sourcesBuilt,0);assert.equal(plan.sourceCharacters,0);assert.equal(plan.specialization,undefined);
  assert.equal(plan.fragment('owner17'),'family:bremen:owner17\n汉😀');assert.equal(plan.sourcesBuilt,1);
  assert.equal(f.dataMemo.get('validated-model').complete,true);plan.release();
 }
});

test('prepared program plan: release revokes deferred builders while a fresh plan reuses the externally pinned scope',()=>{
 const f=fixture(),plan=f.create(f.options),deferredBuild=()=>plan.fragment('owner17');
 deferredBuild();plan.release();const afterRelease=f.calls.length;
 assert.equal(plan.released,true);assert.equal(plan.specialization,undefined);assert.equal(plan.sourceCharacters,0);assert.equal(plan.sourcesBuilt,0);
 assert.throws(deferredBuild,{name:'AbortError'});assert.throws(()=>plan.partitionEnabled,{name:'AbortError'});assert.equal(f.calls.length,afterRelease);
 assert.equal(f.lifetime.retains,0);assert.equal(f.lifetime.releases,0);assert.equal(f.lifetime.disposed,false);
 const restored=f.create(f.options);assert.equal(restored.fragment('owner17'),'family:bremen:owner17\n汉😀');assert.equal(f.dataMemo.get('validated-model').complete,true);
 f.lifetime.disposed=true;assert.throws(()=>restored.fragment('owner17'),{name:'AbortError'});restored.release();
});

test('prepared Bremen plan reuses one source analysis across colour/depth families and drops it at clear/release',()=>{
 const f=fixture(),plan=f.create(f.options),recipe={sourceKey:'owner17',inputs:['material-v1'],assemble:paint=>familySource+'\n/*'+paint+'*/'};
 const plain=plan.prepareSource(recipe,[1001]),cutout=plan.prepareSource(recipe,[1002]),again=plan.prepareSource(recipe,[1001]);
 assert(plain.fragment.includes('vec3 plain(')&&!plain.fragment.includes('vec3 cutout('));assert.equal(plain.depthEffects,false);
 assert(cutout.fragment.includes('vec3 cutout(')&&!cutout.fragment.includes('vec3 plain('));assert.equal(cutout.depthEffects,true);assert.deepEqual(again,plain);assert.notStrictEqual(again,plain);
 assert.equal(plan.sourcesBuilt,1);assert.equal(plan.preparedSourceStats.builds,1);assert.equal(plan.preparedSourceStats.analyses,1);assert.equal(plan.preparedSourceStats.hits,2);
 assert.equal(f.calls.filter(call=>call.kind==='family').length,1);assert.equal(f.calls.filter(call=>call.kind==='description').length,1);
 assert.equal(f.caches.partition().size,0);assert.equal(f.caches.city().size,0,'the reusable analysis does not retain a second facade source map');
 const scalar=plan.preparedSourceStats;assert(Object.isFrozen(scalar));assert.equal(JSON.stringify(scalar).includes('vec3'),false);
 plan.clearPreparedSource();assert.equal(plan.preparedSourceStats.sourceCharacters,0);assert.equal(plan.preparedSourceStats.clears,1);assert.equal(plan.released,false);assert.equal(f.lifetime.releases,0);
 plan.prepareSource(recipe,[1002]);assert.equal(plan.preparedSourceStats.builds,2);assert.equal(plan.preparedSourceStats.analyses,2);assert.equal(f.calls.filter(call=>call.kind==='description').length,2,'a rebuilt source refreshes scalar diagnostics without constructing any sibling source');
 plan.release();plan.release();assert.equal(plan.preparedSourceStats.sourceCharacters,0);assert.equal(plan.preparedSourceStats.released,true);assert.throws(()=>plan.prepareSource(recipe,[1001]),{name:'AbortError'});
 assert.equal(f.lifetime.retains,0);assert.equal(f.lifetime.releases,0);assert.equal(f.dataMemo.get('validated-model').complete,true);
});
test('prepared Bremen source changes rebuild, assembly failures clear scratch and disposed scopes revoke current analysis',()=>{
 const f=fixture(),plan=f.create(f.options),assemble=paint=>familySource.replace('base*.5',paint.includes('owner18')?'base*.75':'base*.5')+'\n/*'+paint+'*/';
 const first=plan.prepareSource({sourceKey:'owner17',inputs:['material'],assemble},[1001]),changed=plan.prepareSource({sourceKey:'owner18',inputs:['material'],assemble},[1001]);
 assert(first.fragment.includes('base*.5'));assert(changed.fragment.includes('base*.75'));assert.equal(plan.preparedSourceStats.builds,2);assert.equal(plan.preparedSourceStats.analyses,2);assert.equal(plan.preparedSourceStats.replacements,1);
 assert.throws(()=>plan.prepareSource({sourceKey:'broken',inputs:[],assemble:()=>{throw Error('tiny assembly failure');}},[1001]),/tiny assembly failure/);
 assert.equal(plan.preparedSourceStats.sourceCharacters,0);assert.equal(f.caches.partition().size,0);assert.equal(f.caches.city().size,0);
 plan.prepareSource({sourceKey:'owner17',inputs:['material'],assemble},[1001]);f.lifetime.disposed=true;
 assert.throws(()=>plan.prepareSource({sourceKey:'owner17',inputs:['material'],assemble},[1001]),{name:'AbortError'});assert.equal(plan.preparedSourceStats.sourceCharacters,0);plan.release();assert.equal(plan.preparedSourceStats.released,true);
});

test('prepared program plan: fallback is an uncached deferred original builder and cache cleanup leaves data memo intact',()=>{
 assert(!facadeAst.statements.some(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(declaration=>declaration.name.getText(facadeAst)==='FACADE_PAINT_FRAGMENT_GLSL')),'No module-level complete fallback shader');
 const builder=functionText('getFacadePaintFragmentGLSL',facadeAst.statements),calls=[];
 const api=load(builder.replace(/^function /,'export function '),{},
  {createRecipe:()=>({makeFacadePaintFragment:(...args)=>{calls.push(args);return args.join('|');}}),fullProgressiveCompatibility:source=>'compatible:'+source,PROGRESSIVE_FEATURE_GLSL:'original progressive'});
 assert.equal(calls.length,0);assert.equal(api.getFacadePaintFragmentGLSL(),'compatible:original progressive|progressiveFeatureDispatch');
 assert.equal(api.getFacadePaintFragmentGLSL(),'compatible:original progressive|progressiveFeatureDispatch');assert.equal(calls.length,2);
 const f=fixture(),clear=functionText('clearBremenPreparedProgramSources',facadeAst.statements);
 const clearApi=load(clear.replace(/^function /,'export function '),{},{recipe:scope=>{assert.equal(scope,f.scope);return{clearPreparedProgramSources:f.caches.clear};}});
 f.caches.partition().set('family','source');f.caches.city().set('bremen','source');clearApi.clearBremenPreparedProgramSources(f.scope);
 assert.equal(f.caches.partition().size,0);assert.equal(f.caches.city().size,0);assert.equal(f.dataMemo.get('validated-model').complete,true);
 f.lifetime.disposed=true;clearApi.clearBremenPreparedProgramSources(f.scope);
});
