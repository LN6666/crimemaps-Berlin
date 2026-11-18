import {resourceContentKey} from './support/resource-content-key.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import {constructionHarness,evaluate,component} from './fixtures/bremen-renderer-construction-harness.mjs';

function assertPublishedComponent(actual,expected){
 assert.deepEqual(actual,expected);if(!expected)return;
 for(const name of ['sourceFeature','componentGeometry','batches','origin','box'])assert.strictEqual(actual[name],expected[name],name+' retains its canonical reference');
 for(let i=0;i<expected.batches.length;i++)for(const name of ['positions','normals','indices','color'])assert.strictEqual(actual.batches[i][name],expected.batches[i][name],name+' retains its canonical buffer');
}
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/painted/bremen/safety');
const refKey=ref=>JSON.stringify([ref.canonicalSHA256,ref.file,ref.occurrence,ref.codec]);
const read=name=>fs.readFileSync(path.join(safety,name+'.ts'),'utf8');
const parse=(name,source=read(name))=>ts.createSourceFile(name+'.ts',source,ts.ScriptTarget.Latest,true);

const zeroStats=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,components:[],sourceRetained:true,actualVisualAccepted:false});

// Only identity-bearing local code, the complete owner/stage modules, and their
// tiny code-only resource facades are evaluated. Frozen table readers cannot run.
function integration({demand=false}={}){
 const allowedRefs=new Set(),modelValues=new Map(),resourceByFile=new Map(),modelGetters=[],modelPreparations=[],protectedRows=[];
 const h=constructionHarness(undefined,{resourceValue(ref){assert.ok(allowedRefs.has(refKey(ref)),'unregistered model ref '+ref.file);modelPreparations.push(ref);if(demand){assert.ok(modelValues.has(refKey(ref)),'unexpected demand resource '+ref.file);return modelValues.get(refKey(ref));}return Object.freeze({});}});
 const stageAST=parse('bremen-recipe-stages'),moduleNames=stageAST.statements.filter(ts.isImportDeclaration).map(n=>n.moduleSpecifier.text).filter(n=>n.startsWith('./')).map(n=>n.slice(2));
 const changed=new Set(moduleNames.filter(name=>read(name).includes("'./bremen-identity-metadata'")||read(name).includes('"./bremen-identity-metadata"')));
 assert.ok(changed.has('infill-f288-original'),'final F288 identity metadata was not published');
 const cache=new Map(),loaded=[],legacy=new Map();
 const nativeSignature=evaluate(fs.readFileSync(path.resolve(safety,'../../root500/safety/progressive-native-signature.ts'),'utf8'),id=>{throw Error('Unexpected native signature import '+id);});
 const shader=h.dependency('./facade-paint-fragment');
 Object.assign(shader,{FACADE_PAINT_FRAGMENT_SCOPE_RESOURCES:[h.resourceRefs[0]],MODULE_SCOPE_RESOURCES:[h.resourceRefs[0]],MODULE_SCOPE_CITIES:[],MODULE_SCOPE_ARITY:{paintProgramPartitionEnabled:1,paintProgramFragment:2,facadePaintFragmentForCity:1,facadePaintSpecializationForCity:1,paintProgramKey:2,genericBerlinOwnerExclusionCertified:2,genericDusseldorfProgramCertified:2}});
 const frame=h.dependency('./facade-paint-frame');Object.assign(frame,{FACADE_PAINT_FRAME_SCOPE_RESOURCES:[h.resourceRefs[1]],MODULE_SCOPE_RESOURCES:[h.resourceRefs[1]],MODULE_SCOPE_CITIES:[],MODULE_SCOPE_ARITY:{facadePaintData:1}});
 function fallback(id){
  if(id==='./progressive-paint'||id==='./facade-paint-fragment'||id==='./facade-paint-frame')return h.dependency(id);
  if(!legacy.has(id)){const base=h.dependency(id);legacy.set(id,new Proxy({}, {get(_target,key){if(key==='__esModule')return false;if(key==='MODULE_SCOPE_ARITY')return{};if(key==='MODULE_SCOPE_CITIES'||String(key).endsWith('_SCOPE_RESOURCES'))return[];if(String(key).endsWith('_SHA')||String(key).endsWith('_SHA256'))return'0'.repeat(64);if(demand){const name=String(key);if(name==='prepareOwnerReconstructionComponents')return async(rows,signal)=>{signal.throwIfAborted();return{components:rows,stats:zeroStats()};};if(name==='ownerRecoveredSourceComponents'||name.endsWith('RemoveDuplicateNativeParts'))return rows=>rows;if(name==='prepareOwnerRecoveredSourceComponents')return async()=>{};if(name==='ownerReconstructionBaseMaterials'||/Materials/.test(name))return()=>{};if(/Reconstruction$|Reframe$|Repaint$|^silberturmFullReconstruction/.test(name))return rows=>({components:rows,stats:zeroStats()});}return base[key];}}));}
  return legacy.get(id);
 }
 if(demand){const actualFrame=evaluate(read('facade-paint-frame'),id=>id==='./progressive-paint'?h.progressive:fallback(id));for(const[key,value]of Object.entries(actualFrame))if(key.startsWith('MODULE_SCOPE_')||key==='FACADE_PAINT_FRAME_SCOPE_RESOURCES')frame[key]=value;}
 function load(name){
  if(['progressive-paint','facade-paint-fragment','facade-paint-frame'].includes(name))return fallback('./'+name);
  if(cache.has(name))return cache.get(name).exports;
  const text=read(name),record={exports:{}};cache.set(name,record);loaded.push(name);
  const require=id=>{
   if(id==='./bremen-identity-metadata'||id==='./bremen-identity-projections'||id==='./bremen-recipe-stages'||id==='./bremen-ag70-identities'||id==='./bremen-ag70-metadata'||id==='./bremen-demand-metadata'||id==='./bremen-recipe-demand'||id==='./bremen-certificate-group-ledger'||id==='./bremen-held-source-certificates')return load(id.slice(2));
   if(id==='./progressive-paint'||id==='./facade-paint-fragment'||id==='./facade-paint-frame')return fallback(id);
   if(demand&&id==='./progressive-native-signature')return nativeSignature;
   const local=id.startsWith('./')?id.slice(2):undefined;
   if(local&&changed.has(local))return load(local);
   if(local&&fs.existsSync(path.join(safety,local+'.ts'))){const candidate=read(local);if(candidate.includes('export function get')&&candidate.includes('FrozenDataScope'))return loadResource(local,candidate);}
   return fallback(id);
  };
  record.exports=evaluate(text,require);return record.exports;
 }
 function loadResource(name,text){
  if(cache.has(name))return cache.get(name).exports;
  const value=evaluate(text,id=>fallback(id));
  for(const[key,entry]of Object.entries(value)){
   if(!demand&&key.startsWith('get')&&typeof entry==='function')value[key]=()=>{modelGetters.push(name+'.'+key);throw Error('Identity consumer used model getter '+name+'.'+key);};
   else if(entry&&typeof entry==='object'&&typeof entry.canonicalSHA256==='string'){allowedRefs.add(refKey(entry));resourceByFile.set(entry.file,entry);}
  }
  cache.set(name,{exports:value});return value;
 }
 const stages=load('bremen-recipe-stages'),owner=load('owner-reconstruction'),metadata=load('bremen-identity-metadata'),projections=load('bremen-identity-projections');
 const catalog=projections.BREMEN_IDENTITY_PROJECTIONS;
 assert.ok(catalog&&projections.BREMEN_IDENTITY_CANDIDATES,'final static projections missing');
 for(const name of changed){const namespace=load(name),identityExports={};for(const key of Object.keys(catalog))if(typeof namespace[key]==='function')identityExports[key]=namespace[key];h.overrideDependency('./'+name,demand?namespace:identityExports);for(const ref of namespace.MODULE_SCOPE_RESOURCES??[]){allowedRefs.add(refKey(ref));resourceByFile.set(ref.file,ref);}}
 h.overrideDependency('./bremen-recipe-stages',stages);
 // Reconstruction/material algorithms are boundaries in this identity test;
 // the actual whole owner module supplies the exact predicate consumer.
 h.overrideDependency('./owner-reconstruction',demand?{ownerReconstructionIdentity:owner.ownerReconstructionIdentity,prepareBremenOwnerReconstructionComponents:owner.prepareBremenOwnerReconstructionComponents,ownerReconstructionBaseMaterials:owner.ownerReconstructionBaseMaterials,BREMEN_MATERIAL_SCOPE_CONSUMERS:owner.BREMEN_MATERIAL_SCOPE_CONSUMERS}:{ownerReconstructionIdentity:owner.ownerReconstructionIdentity});
 h.overrideDependency('./owner-display-budget',{fitOwnerDisplayBudget(components,_cap,options){for(const c of components)protectedRows.push({component:c,protected:options.protected(c)});return{components,vertices:options.vertices,indices:options.indices,diagnostic:{}};}});
 const f288=load('infill-f288-original');
 const untouched=()=>{assert.deepEqual(modelGetters,[]);assert.deepEqual(modelPreparations,[]);assert.ok(h.clients.every(c=>c.modelBorrows===0));assert.equal(h.gpu.compiles,0);};
 let demandFixture;
 if(demand){demandFixture=configureDemandFixture({h,load,resourceByFile,modelValues,nativeSignature});}
 return{h,owner,stages,metadata,catalog,f288,loaded,protectedRows,untouched,modelGetters,modelPreparations,demandFixture};
}

function configureDemandFixture({h,load,resourceByFile,modelValues,nativeSignature}){
 const metadata=load('bremen-demand-metadata');assert.equal(metadata.BREMEN_DEMAND_METADATA_STATUS.complete,true);
 const data=metadata.BREMEN_DEMAND_METADATA,ledgerModule=load('bremen-certificate-group-ledger'),ledger=ledgerModule.getBremenCertificateLedger();assert.equal(ledger.groups.length,46);
 const native=identity=>{const c=withIdentity(identity);return{...c,sourceFeature:{...c.sourceFeature,id:identity.objectId}};};
 const batch=(scale=1)=>({positions:[0,0,0,scale,0,0,0,scale,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.4,.5,.6],paint:[.25,.35,.45,7,.25,.35,.45,7,.25,.35,.45,7],frames:Array.from({length:15},(_,i)=>i)});
 const global=data.oldtown.models.findIndex(m=>m.targetId==='BR-OT-B03D');assert.equal(global,3);assert.equal(data.oldtown.models[global].requiredNativeGroup.length,0);assert.equal(data.oldtown.models[global].geometryReadyForPreview,true);
 const derivedIdentity=data.oldtown.models[global].displays[0],derivedSource=native(derivedIdentity);
 const oldtown={sourceAuthoritySHA256:data.oldtown.sourceAuthoritySHA256,frozenExcluded:[],models:data.oldtown.models.map((m,index)=>({...structuredClone(m),sourceBinding:{...structuredClone(m.sourceBinding),sourceRecordSHA256:'e'.repeat(64)},componentGeometry:structuredClone(derivedSource.componentGeometry),sourceFeature:structuredClone(derivedSource.sourceFeature),displays:m.displays.map(d=>({...d,origin:[8,53],batches:index===global?[batch()]:[]}))}))};
 const groups=data.europa.groups.map((g,index)=>({...structuredClone(g),queueId:'tiny-europa-'+index,geometryReadyForPreview:true,requiredNativeGroup:g.models.map(m=>({...m.identity})),models:g.models.map(m=>{const c=native(m.identity);return{...structuredClone(m),identity:{...m.identity,signature:nativeSignature.nativePaintSignature(c)},source:structuredClone(c),display:[batch(2)]};})}));
 assert.ok(groups.every((g,index)=>JSON.stringify(g.models.map(m=>({objectId:m.identity.objectId,partId:m.identity.partId})))===JSON.stringify(data.europa.groups[index].models.map(m=>m.identity))));
 const market={models:data.market.models.map(m=>structuredClone(m)),sourceAuthoritySHA256:data.oldtown.sourceAuthoritySHA256};assert.equal(market.models.length,2);assert.equal(market.models[0].identity.objectId,'osm/way/163740904');assert.equal(market.models[1].identity.objectId,derivedIdentity.objectId);
 const ref=filename=>{const value=resourceByFile.get('painted/bremen/safety/'+filename);assert.ok(value,'actual resource metadata '+filename);return value;};
 const refs={oldtown:ref('oldtown70-data.ts'),market:ref('market-cap-data.ts'),europa:ref('europahafenkopf70-data.ts')};
 modelValues.set(refKey(refs.oldtown),oldtown);modelValues.set(refKey(refs.market),market);modelValues.set(refKey(refs.europa),{groups});
 const plan=ledgerModule.planBremenCertificateGroups([{...derivedIdentity,city:'bremen'}]);assert.deepEqual(plan.groups.map(g=>g.key),['delegate:market','availability:oldtown-derived:3']);assert.ok(plan.groups.every(g=>g.held.length===0&&g.parents.length===0&&g.snapshotSlots.length===0));
 const runtime=load('bremen-owner-runtime').createBremenOwnerRuntime({acquire(){throw Error('legacy runtime acquisition outside the batch scope');},dispose(){}});
 for(const[key,value]of Object.entries(runtime))if(typeof value==='function'&&key!=='createBatchScope')h.ownerRuntime[key]=value;
 const certificateInputs=[],prepareCertificates=h.ownerRuntime.prepareBatchCertificates;h.ownerRuntime.prepareBatchCertificates=async(scope,rows,signal)=>{certificateInputs.push(rows.map(c=>({objectId:c.objectId,partId:c.partId,x:c.batches[0]?.positions[3]})));return prepareCertificates(scope,rows,signal);};
 h.overrideDependency('./bremen-certificate-group-ledger',ledgerModule);
 return{data,refs,derivedIdentity,native,known:groups[0].models.map(m=>native(m.identity)),plan,runtime,ledgerModule,certificateInputs};
}

function samples(fixture){
 const source=fixture.catalog.infillF288OriginalIdentity?.rows[0],derived=fixture.catalog.infillF288OriginalDerivedIdentity?.rows[0];
 assert.ok(source&&derived,'F288 SOURCE/DERIVED static samples missing');
 return{source,derived,unknown:{city:'bremen',objectId:'osm/way/999999999999999999',partId:'osm/way/999999999999999999/component/unmatched'}};
}
function withIdentity(identity){const c=component(1);return{...c,...identity,city:'bremen'};}

test('actual whole owner identity and changed predicates preserve city-agnostic F288 contracts without models',()=>{
 const f=integration(),{source,derived,unknown}=samples(f);
 for(const city of ['essen','bremen',undefined,'foreign']){
  const s={objectId:source.objectId,partId:source.partId,...(city===undefined?{}:{city})},d={objectId:derived.objectId,partId:derived.partId,...(city===undefined?{}:{city})};
  assert.equal(f.f288.infillF288OriginalIdentity(s),true);assert.equal(f.owner.ownerReconstructionIdentity(s),true);assert.equal(f.metadata.bremenIdentityMatches('infillF288OriginalIdentity',s),true);
  assert.equal(f.f288.infillF288OriginalDerivedIdentity(d),true);assert.equal(f.f288.infillF288OriginalIdentity(d),false);
 }
 assert.equal(f.f288.infillF288OriginalIdentity({objectId:source.objectId,city:'bremen'}),false);
 assert.equal(f.owner.ownerReconstructionIdentity({objectId:source.objectId,city:'bremen'}),false);
 assert.equal(f.owner.ownerReconstructionIdentity(unknown),false);assert.equal(f.owner.ownerReconstructionIdentity({...unknown,city:'foreign'}),false);
 assert.equal(f.metadata.bremenIdentityCandidate('infill-f288-original',unknown),false);
 assert.ok(f.loaded.includes('owner-reconstruction'));assert.ok(f.loaded.includes('bremen-recipe-stages'));f.untouched();assert.equal(f.h.clients.length,0);
});

test('actual renderer prepare/commit budget consumes the real owner identity for unknown and F288 SOURCE rows',async()=>{
 const f=integration(),{source,unknown}=samples(f),h=f.h;
 await h.environment(async()=>{
  const r=h.create();assert.equal(r.stats.progressivePaintDiagnostics.state,'unprepared');assert.equal(h.clients.length,0);f.untouched();r.setEnabled(true);r.layer.onAdd({},h.gl);
  for(const name of ['progressivePaintRejections','progressiveRenderStatus','isProgressivelyPainted','isRejectedProgressivePaint'])assert.ok(h.progressive.MODULE_SCOPE_METADATA_FUNCTIONS.includes(name));assert.ok(f.f288.MODULE_SCOPE_METADATA_FUNCTIONS.includes('infillF288OriginalSerializeDerivedReadback'));
  const diagnosticScope=h.newScope();await f.stages.prepareBremenFunctions(diagnosticScope,[h.progressive.progressivePaintRejections,h.progressive.progressiveRenderStatus,h.progressive.isProgressivelyPainted,h.progressive.isRejectedProgressivePaint,f.f288.infillF288OriginalSerializeDerivedReadback],[unknown],new AbortController().signal);assert.equal(h.clients[0].acquires,0);assert.equal(diagnosticScope.stats.resources,0);diagnosticScope.release();
  for(const [identity,expected,generation]of [[unknown,false,1],[source,true,2]]){
   const rows=[withIdentity(identity)],batch=await r.prepareBatches(rows,new AbortController().signal,undefined,undefined,undefined,undefined,h.chunkInput(rows));h.commit(r,batch,generation);batch.release();
   assert.notEqual(r.getRevision().generation,generation,'registration cannot publish before the actual context scheduler');await h.settle(r);
   assert.strictEqual(r.borrowSurfaceComponent(rows[0]).batches[0].positions,rows[0].batches[0].positions);assert.equal(f.protectedRows.at(-1).protected,expected);assert.equal(r.stats.progressivePaintDiagnostics.generation,generation);h.ownerRuntime.hasPreparedCertificateGroup=()=>false;assert.equal(r.getMarketCapGroupReadback().state,'unavailable');assert.equal(r.getBremenWholeDisplayCertificate(rows[0]),null);assert.equal(r.stats.progressivePaintDiagnostics.state,'available');h.ownerRuntime.hasPreparedCertificateGroup=()=>true;assert.deepEqual(f.modelGetters,[]);assert.deepEqual(f.modelPreparations,[]);assert.ok(h.clients.every(client=>client.modelBorrows===0));assert.ok(h.gpu.sourceBuilds>0);
  }
  r.setBatches([],3);assert.equal(r.stats.progressivePaintDiagnostics.state,'unprepared');assert.equal(r.stats.progressivePaintAdmissions,undefined);assert.ok(h.scopes.every(scope=>scope.stats.disposed));assert.ok(h.scopes.every(scope=>scope.stats.pins===0));r.destroy();h.releaseChunkSources();assert.deepEqual(f.modelGetters,[]);assert.deepEqual(f.modelPreparations,[]);assert.ok(h.clients.every(client=>client.modelBorrows===0));
 });
});

test('actual manager commit transfers the same scope through renderer preparation, identity protection and failure-to-2D cleanup',async()=>{
 const f=integration({demand:true}),{unknown}=samples(f),h=f.h,d=f.demandFixture;
 await h.environment(async()=>{
  const r=h.create(),scopeTransfers=[],preparations=[],commits=[],publicationView=new AbortController();r.layer.onAdd({},h.gl);
  const createScope=h.ownerRuntime.createBatchScope;h.ownerRuntime.createBatchScope=()=>{const scope=createScope();scopeTransfers.push(scope);return scope;};
  const renderer={async prepareBatches(...args){const scope=args[4];assert.strictEqual(scope,scopeTransfers.at(-1),'manager supplies its exact batch scope');const batch=await r.prepareBatches(...args);assert.strictEqual(batch.scope,scope);preparations.push(batch);return batch;},setBatches(...args){const prepared=args.at(-1);assert.strictEqual(prepared.scope,scopeTransfers.at(-1),'the same scope reaches the actual commit');commits.push({scope:prepared.scope,input:args[0]});return r.setBatches(...args);},isPickReady:()=>r.isPickReady(),setEnabled:value=>r.setEnabled(value),getRevision:()=>r.getRevision(),getDrawReadiness:()=>r.getDrawReadiness(),cancelCandidate:generation=>r.cancelCandidate(generation),getComponent:identity=>r.getComponent(identity)};
  const noop=()=>{},plan=()=>({hiddenOutlines:[],groups:[],errors:[]});
  const v={signal:publicationView.signal,ticket:1,revision:1,destroyed:false,suspended:false,city:'bremen',mobile:false,renderer,ownerRuntime:h.ownerRuntime,pendingCommits:new Set(),activePreparationScope:undefined,releaseAggregatePrepared:noop,noAggregatePrepared:noop,pendingPreparations:new Set(),prepareInfillFrankfurtLowOfficeBulk70Reconstruction:async()=>{},
   current(signal,ticket){signal.throwIfAborted();assert.equal(ticket,v.revision);},THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:100000,mobile:100000},chosen:[],results:[],retainedShardCost:new WeakMap(),shadowByShard:new WeakMap(),ownerProfileByComponent:new WeakMap(),sourceLeafByFeature:new WeakMap(),manifestSHA:'tiny-index',manifest:{source_pbf_sha256:'tiny-pbf',city_boundary:{sha256:'tiny-boundary'},source_snapshot:'tiny-source'},options:{awaitPaintInitialization:p=>p,onNativeGroupDisplay:noop},
   prepareBremenFunctions:f.stages.prepareBremenFunctions,bremenScopedCall:f.stages.bremenScopedCall,bremenAcceptedCohortSelection:{diagnostic:()=>({})},s434CohortSelection:{diagnostic:()=>({})},ownerShapePatchDisplayRows:input=>input,ownerShapePatchMetadata:()=>({}),nativePartDisplayPlan:plan,verifiedInteriorSourceHolds:()=>[],sourceEdgeAssemblyDisplayPlan:plan,s020RelationOutlineDisplayPlan:plan,s020FullOriginalBatchRouteReady:()=>true,progressiveAdmission:()=>undefined,mergeShadowAdmissions:()=>undefined,partialGateDisplayPlan:()=>({}),s402ConnectorPlan:()=>({}),s036NorthCofacePlan:()=>({}),s240BaseCofacePlan:()=>({}),f151CrownPlan:()=>({}),
   generation:0,lastPackedComponents:undefined,lastPackedAggregateProfile:undefined,lastPackedAggregateDiagnostic:undefined,duplicatePackSkips:0,sameStageComponents:()=>false,s434Aggregate:{packing:()=>undefined,update:noop},map:{getBounds:()=>({getWest:()=>7,getSouth:()=>52,getEast:()=>9,getNorth:()=>54}),getZoom:()=>18},firstDrawPending:true,finished:true,drawn:async()=>{},announce:noop,
  };
  for(const name of ['scopeOriginal_prepareBremenAcceptedCohortSelection','scopeOriginal_partialGateDisplayPlan','scopeOriginal_s020RelationOutlineDisplayPlan','scopeOriginal_s020FullOriginalBatchRouteReady'])v[name]=noop;
  v.scopeOriginal_progressiveAdmission=h.progressive.progressiveAdmission;
  const managerFile=path.join(safety,'three-dimensional-map.ts'),managerText=fs.readFileSync(managerFile,'utf8'),managerAst=ts.createSourceFile(managerFile,managerText,ts.ScriptTarget.Latest,true);let commitNode;
  const find=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(managerAst)==='commit')commitNode=node.initializer;ts.forEachChild(node,find);};find(managerAst);assert.ok(commitNode,'actual production manager commit');
  Object.assign(v,{resourceContentKey},h.dependency('./bremen-display-derivations'),h.dependency('../../../safety/renderer-chunk-input'));
  const compiled=ts.transpileModule('('+commitNode.getText(managerAst)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const env=new Proxy(v,{has:()=>true,get:(o,key)=>key===Symbol.unscopables?undefined:key in o?o[key]:key in globalThis?globalThis[key]:/^[A-Z][A-Z0-9_]+$/.test(String(key))?[]:undefined,set:(o,key,value)=>(o[key]=value,true)});
  Object.assign(v,{session:undefined,detailBindings:new Map(),adoptedDetailResources:new Map(),lastHandoffTicket:-1});
  // The commit's page-store source leases and their chunk input: the actual
  // manager helpers over the harness page store (the renderer packs exactly that input).
  Object.assign(v,{resources:h.page.store,sourceCandidates:new Map(),sourceResourceByFeature:new WeakMap(),sourceOwnerKey:'bremen:identity-fixture',sourceAbsentPatches:[],stagedExplicitSources:[],stagedExplicitGeneration:undefined,stagedExplicitCurrent:undefined,lastHandoffGeneration:undefined,bremenFiniteCohortDiagnostic:undefined,retainRendererChunkInput:h.runtime.retainRendererChunkInput});
  for(const name of ['sourceContentKey','sourceResourceKey','sourceResourceKeys','sourceChunkDemand','sourceChunkInput','sourceAbsentDisplay','bindDerivedChunkInput','retireChunkInput','stageExplicitSources']){
   let found;const findFunction=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node;ts.forEachChild(node,findFunction);};findFunction(managerAst);assert.ok(found,'actual production manager '+name);
   v[name]=new Function('env','with(env){return '+ts.transpileModule('('+found.getText(managerAst)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText+'}')(env);
  }
  for(const name of ['captureDetailSubset','validateDetail','adoptDetail','settleDetail']){
   let found;const findHelper=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(managerAst)===name)found=node.initializer;ts.forEachChild(node,findHelper);};findHelper(managerAst);assert.ok(found,'actual production manager '+name);
   v[name]=new Function('env','with(env){return '+ts.transpileModule('('+found.getText(managerAst)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText+'}')(env);
  }
  const commitAttempt=new Function('env','with(env){return '+compiled+'}')(env);
  const viewportText=fs.readFileSync(path.resolve(safety,'../../../safety/viewport-request.ts'),'utf8'),publicationModule={exports:{}};let publicationClock=1000;
  new Function('performance','module','exports',ts.transpileModule(viewportText,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)({now:()=>publicationClock+=100},publicationModule,publicationModule.exports);
  const publication=publicationModule.exports.createViewportRequestContinuation(()=>false).publication(v.signal,()=>v.current(v.signal,v.ticket));
  const commit=()=>publication.finish(commitAttempt);
  // One ready page-store source lease per merged leaf, as the manager's readers hold.
  const merge=async rows=>{v.results=[rows];v.chosen=[{id:'tiny-shard-'+rows[0].objectId,tile_key:'tiny-shard-'+rows[0].objectId,sha256:'tiny-leaf',bytes:1,lod:1}];v.retainedShardCost.set(rows,100);for(const lease of v.sourceCandidates.values())lease.release();v.sourceCandidates.clear();const leaf=v.chosen[0],key=v.sourceResourceKey(leaf),lease=h.page.store.acquire({contentKey:key,role:'candidate',allowRecent:false,estimate:{category:'metadata',bytes:256,precision:'estimate'},produce:()=>({contentKey:v.sourceContentKey(leaf),resourceKey:key,components:rows,recipeAuthority:'tiny-recipe',materialAuthority:'tiny-material',selectedLOD:'tiny'}),costs:value=>({category:'metadata',bytes:256,precision:'estimate',identity:value})});v.sourceCandidates.set(key,lease);await lease.ready;};
  const expected=extra=>[...h.resourceRefs,d.refs.oldtown,d.refs.market,...extra].map(refKey).sort();
  const acquired=index=>h.clients[index].refs.map(refKey).sort();
  await merge([d.native(unknown)]);await commit();assert.equal(r.getRevision().generation,0,'actual manager registers a candidate before renderer publication');await h.settle(r);assert.equal(preparations.length,1);assert.equal(commits.length,1);assert.strictEqual(commits[0].scope,scopeTransfers[0]);assert.equal(f.protectedRows.find(row=>row.component.objectId===unknown.objectId).protected,false);assert.equal(r.stats.progressivePaintDiagnostics.generation,1);assert.deepEqual(acquired(0),expected([]),'unknown batch keeps only necessary global-derived models');
  const globalDisplay=r.getComponent(d.derivedIdentity);assert.ok(globalDisplay,'actual ready B03D with no native requirements generates 905');assert.equal(r.getSourceComponent(d.derivedIdentity),undefined);assert.equal(r.getDerivedDisplayReadback(d.derivedIdentity).sourceAbsent,true);assert.equal(r.stats.ownerAuthorizedReconstruction.objects,1);
  for(const group of d.plan.groups)assert.equal(h.ownerRuntime.hasPreparedCertificateGroup(scopeTransfers[0],group.key),true);
  await merge(d.known);await commit();assert.equal(r.getRevision().generation,1,'a newer attempt keeps the successful generation until publication');await h.settle(r);assert.equal(preparations.length,2);assert.equal(commits.length,2);assert.deepEqual(acquired(1),expected([d.refs.europa]),'known complete group adds exactly its canonical Europa model resource');assert.equal(r.stats.ownerAuthorizedReconstruction.objects,3);
  assert.equal(d.certificateInputs[0].length,3);assert.equal(d.certificateInputs[1].length,5);for(const c of d.known){const rows=d.certificateInputs[1].filter(row=>row.objectId===c.objectId&&row.partId===c.partId);assert.deepEqual(rows.map(row=>row.x),[1,2],'certificate selection sees original source plus reconstructed display');}
  for(const c of d.known){assert.equal(r.borrowSurfaceComponent(c).batches[0].positions[3],2);assert.equal(c.batches[0].positions[3],1);assert.equal(f.protectedRows.filter(row=>row.component.objectId===c.objectId).at(-1).protected,true);}
  for(const client of h.clients){assert.equal(new Set(client.refs.map(refKey)).size,client.acquires,'same-scope resource union acquires each binding once');assert.ok(client.prepareRequests.filter(refs=>refs.some(ref=>refKey(ref)===refKey(d.refs.oldtown))).length>1,'later material/certificate demand reuses the oldtown lease');}
  // The resident is now one page-store chunk per published source group; recovery
  // re-uploads each chunk's five buffers once (no repacking, no reacquisition).
  const residentChunks=r.getProgramPreparationStats()[0].resourceResidency.geometry.main.chunks;assert.ok(residentChunks>=1);
  const resident=r.borrowSurfaceComponent(d.known[0]),before=h.clients[1].acquires,beforeUploads=h.uploads.length;h.handlers.get('webglcontextlost')();h.handlers.get('webglcontextrestored')();await h.settle(r,()=>r.stats.contextRecovery.successes===1&&!r.stats.geometryPreparation.pending);assert.equal(h.uploads.length,beforeUploads+5*residentChunks,'each resident chunk re-uploads its five buffers once');assert.equal(r.getProgramPreparationStats()[0].resourceResidency.geometry.main.chunks,residentChunks);assertPublishedComponent(r.borrowSurfaceComponent(d.known[0]),resident);assert.equal(h.clients[1].acquires,before);assert.equal(h.ownerRuntime.hasPreparedCertificateGroup(scopeTransfers[1],d.plan.groups[0].key),true);
  const prepareCertificates=h.ownerRuntime.prepareBatchCertificates;h.ownerRuntime.prepareBatchCertificates=async(...args)=>{await prepareCertificates(...args);publicationView.abort(new DOMException('tiny cancelled staging','AbortError'));args[2].throwIfAborted();};
  await merge(d.known);await assert.rejects(commit(),{name:'AbortError'});h.ownerRuntime.prepareBatchCertificates=prepareCertificates;assert.equal(commits.length,2,'cancelled prepared data cannot publish');assertPublishedComponent(r.borrowSurfaceComponent(d.known[0]),resident);assert.equal(r.stats.progressivePaintDiagnostics.state,'available');assert.equal(r.stats.progressivePaintDiagnostics.generation,2);assert.equal(scopeTransfers[2].stats.disposed,true);assert.deepEqual(acquired(2),expected([d.refs.europa]));assert.equal(h.clients[2].releases,h.clients[2].acquires);assert.equal(h.ownerRuntime.hasPreparedCertificateGroup(scopeTransfers[2],d.plan.groups[0].key),false);
  assert.ok(preparations.every(batch=>batch.input===undefined),'actual manager finally clears prepared arrays');
  r.setBatches([],++v.generation);v.releaseAggregatePrepared();await publication.close();assert.equal(r.stats.progressivePaintDiagnostics.state,'unprepared');assert.equal(r.stats.paintProgramPartitions.baseFragmentBytes,0);assert.equal(r.getComponent(d.known[0]),undefined);assert.ok(h.scopes.every(scope=>scope.stats.disposed));assert.ok(h.scopes.every(scope=>scope.stats.pins===0));assert.ok(h.clients.every(client=>client.releases===client.acquires));assert.ok(h.gpu.sourceBuilds>0);r.destroy();d.runtime.dispose();
 });
});
