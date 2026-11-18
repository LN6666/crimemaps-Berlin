import {resourceContentKey,decodeResourceContentKey} from './support/resource-content-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,webcrypto} from 'node:crypto';
import ts from 'typescript';
import {createRuntimeLoader,createFixtureNativeSources} from './support/fixtures-managers-a-runtime.mjs';
import {loadProductionModule as loadFocusModule} from './support/core3-runtime.mjs';
import {bulk70PreimportRows} from './support/f5bremen-bulk70-preimport.mjs';

const web=path.resolve(process.env.RECOVERY_REUSE_SOURCE_ROOT??fileURLToPath(new URL('../',import.meta.url)));
// The actual page ledger/chunk store of the same tree: the lease store keeps its
// cells there and every manager receives that page store, as painted-map passes it.
const runtime=createRuntimeLoader(web);
// Plain native fixture rows still pass through the actual manager authority adapter.
const rendererChunkInputs=runtime.load(path.join(web,'src/safety/renderer-chunk-input.ts'));
const bremenDisplayDerivations=runtime.load(path.join(web,'src/painted/bremen/safety/bremen-display-derivations.ts'));
const providers=['root500','delegated500','tier300','church','city','infill','bremen'];
const residentDrawReadinessSource=fs.readFileSync(path.join(web,'src/safety/resident-draw-readiness.ts'),'utf8');
const {createVisiblePreparationGate}=compile(fs.readFileSync(new URL('../src/safety/visible-preparation-gate.ts',import.meta.url),'utf8'),{});
const projectedDetail=compile(fs.readFileSync(new URL('../src/safety/projected-detail-policy.ts',import.meta.url),'utf8'),{});
const {createModelViewProjection}=compile(fs.readFileSync(new URL('../src/safety/model-view-projection.ts',import.meta.url),'utf8'),{require:name=>{if(name==='./projected-detail-policy')return projectedDetail;if(name==='./building-focus-window')return runtime.load(path.join(web,'src/safety/building-focus-window.ts'));throw Error('Unexpected projection dependency: '+name);}});
const componentReadback=compile(fs.readFileSync(new URL('../src/safety/component-readback.ts',import.meta.url),'utf8'),{});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function collect(ast,predicate){const result=[];function visit(node){if(predicate(node))result.push(node);ts.forEachChild(node,visit);}visit(ast);return result;}
function compile(source,env){const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const exports={};const scope=new Proxy({...env,exports},{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k]});Function('scope',`with(scope){${js}}`)(scope);return exports;}
function helper(){return Object.assign({},...['recovery-resident-reuse.ts','viewport-request.ts','frozen-data-scope.ts'].map(name=>{const p=path.join(web,'src/safety',name);return fs.existsSync(p)?compile(fs.readFileSync(p,'utf8'),name==='frozen-data-scope.ts'?{require:runtime.scopeRequire()}:{}):{};}));}
const leaseAst=ts.createSourceFile('frozen-data-lease-store.ts',fs.readFileSync(path.join(web,'src/safety/frozen-data-lease-store.ts'),'utf8'),ts.ScriptTarget.Latest,true);
const {createFrozenDataLeaseStore}=compile(leaseAst.statements.filter(node=>!ts.isImportDeclaration(node)).map(node=>node.getText(leaseAst)).join('\n'),{crypto:webcrypto,...runtime.leaseStoreBindings(),getPageChunkResourceStore(){throw Error('recovery fixture passes its page store explicitly');},inflateBounded3DGzip(){throw Error('recovery fixture uses plain JSON');}});
function tinyResource(provider,component,resourceStore){
 const value=[{city:component.city,objectId:component.objectId,partId:component.partId}],bytes=new TextEncoder().encode(JSON.stringify(value)),sha=createHash('sha256').update(bytes).digest('hex');
 const ref={canonicalSHA256:sha,file:`painted/${provider}/safety/recovery-resident-fixture.ts`,occurrence:0,codec:'json'},descriptor={path:`/safety/buildings3d/painted-tables/${sha.slice(0,2)}/${sha}.json`,sha256:sha,bytes:bytes.byteLength};
 const store=createFrozenDataLeaseStore([descriptor],{resourceStore}),leases=[],scopes=[];
 const data=store.client({city:component.city,profileSHA256:null,provider,selection:{tables:[sha],initializers:{[sha]:{[ref.file]:1}}},resolve(canonical,file,occurrence){assert.deepEqual([canonical,file,occurrence],[sha,ref.file,0]);return sha;},partition(){return{schemaVersion:1,kind:'object-rows',parts:[{descriptor,keys:[component.city+'|'+component.objectId],rowIndices:[0]}]};},async read(resource,signal,max){signal.throwIfAborted();assert.equal(resource,descriptor.path);assert.equal(max,bytes.byteLength);return bytes.slice();}});
 const client={async acquire(input,signal,keys){assert.deepEqual(input,ref);const lease=await data.acquire(input,signal,keys);assert.deepEqual(lease.identity,{...ref,city:component.city,profileSHA256:null,resolvedRawSHA256:sha});leases.push(lease);return lease;},get resources(){return data.resources;},dispose:()=>data.dispose()};
 const {createFrozenDataScope}=helper();
 return{client,ref,scopes,get stats(){return store.stats;},createScope(input=client){assert.equal(input,client);const scope=createFrozenDataScope(input);scopes.push(scope);return scope;},async prepare(scope,signal,demand){if(demand===undefined)await scope.prepare([ref],signal);else{assert(Array.isArray(demand),'scoped preparation receives the manager demand');if(demand.length===0)return;assert(demand.some(row=>row.city===component.city&&row.objectId===component.objectId&&row.partId===component.partId),'supplied demand retains the current input identity');await scope.prepareSelection(ref,demand.map(row=>row.city+'|'+row.objectId),signal);}assert.deepEqual(scope.borrow(ref,row=>row),value);},assertReleased(){assert.equal(store.stats.leases,0,'no resource lease survives retirement');assert.equal(store.stats.valueCells,0,'retirement clears the parsed resource cell');for(const scope of scopes){assert.equal(scope.stats.pins,0);assert.equal(scope.stats.disposed,true);assert.throws(()=>scope.borrow(ref,row=>row),{name:'AbortError'});}for(const lease of leases){assert.throws(()=>lease.borrow(row=>row),/Frozen data lease was released/);assert.throws(()=>lease.retain(),/Frozen data lease was released/);}}};
}
const managerDataDemand=Object.assign({},...['city/safety/city-data-metadata.ts','delegated500/safety/delegated500-data-demand.ts'].map(relative=>compile(fs.readFileSync(path.join(web,'src/painted',relative),'utf8'),{})));
const recipeAst=ts.createSourceFile('bremen-recipe-stages.ts',fs.readFileSync(path.join(web,'src/painted/bremen/safety/bremen-recipe-stages.ts'),'utf8'),ts.ScriptTarget.Latest,true);
const demandAst=ts.createSourceFile('bremen-recipe-demand.ts',fs.readFileSync(path.join(web,'src/painted/bremen/safety/bremen-recipe-demand.ts'),'utf8'),ts.ScriptTarget.Latest,true);
const {withBremenRecipeDemand}=compile('let activeBatch;\n'+demandAst.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='withBremenRecipeDemand').getText(demandAst),{});
const recipeStages=compile(recipeAst.statements.filter(node=>ts.isFunctionDeclaration(node)&&['bremenScopedCall','prepareBremenFunctions','selectBremenResources'].includes(node.name?.text)).map(node=>node.getText(recipeAst)).join('\n'),{calls:new Map(),localMaterialCalls:new Map(),infillCalls:new Map(),withBremenRecipeDemand});
const emptyPlan=()=>({hiddenOutlines:[],groups:[],errors:[],held:[]});
// bulk70PreimportRows is the actual Bremen manager's module-level pre-import row
// builder over the actual Bulk70 identity catalogue (support/f5bremen-bulk70-preimport.mjs).
// Imported planners on the manager's own source production path (owner patch,
// shadow admission, inline/C358/owner-route material preparation): no fixture
// leaf has a profile, shadow or material route, exactly like the other planners.
const sourcePlanners={ownerShapePatchProfile:()=>undefined,shadowAdmissionForDecodedShard:()=>undefined,prepareInlineCityMaterials:async()=>{},prepareC358MaterialBinding:async()=>{},prepareC358MaterialModule:async()=>{},bindC358MaterialRows:()=>{},prepareNonBerlinOwnerRoutes:async()=>{},prepareBremenInfillOwnerRouteModules:async()=>{},prepareInfillFrankfurtLowOfficeBulk70Reconstruction:async()=>{},bulk70PreimportRows};
const selection=(candidates)=>({candidates,requiredLeafGroups:[],requiredLeafIds:[],protectedCacheKeys:[],budgets:{maxVisible:128,maxBytes:8388608,vertexCap:200000,retainedCap:1e6,maxCache:24,maxCacheBytes:12582912,cacheRetainedCap:1e6},active:false,ready:true,complete:true,diagnostic:()=>undefined,viewportRows:(_all,rows)=>rows,priority:()=>0,note(){},reserveAfter:()=>({vertices:0,bytes:0}),completeInSource:()=>true,applySource:rows=>rows,sourceRows:rows=>rows,atomicRows:rows=>rows});

// Execute the real manager factory, including visible/admit/commit, requestMode,
// drawn and suspension/resumption. Only asset reads/renderer setup and imported
// geometry/material planners are isolated: the 7 full city catalogs and WebGL
// are unrelated to this lifecycle regression. No recovery predicate is copied.
function harness(provider,managerOptions={},fixtureOptions={}){
 const filename=path.join(web,`src/painted/${provider}/safety/three-dimensional-map.ts`),text=fs.readFileSync(filename,'utf8'),ast=ts.createSourceFile(filename,text,ts.ScriptTarget.Latest,true);
 const f=collect(ast,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='installThreeDimensionalMap');assert.equal(f.length,1);
 const changes=[];const visibleNode=collect(f[0],n=>ts.isFunctionDeclaration(n)&&n.name?.text==='visible')[0];changes.push([visibleNode.body.getStart(ast)+1,visibleNode.body.getStart(ast)+1,'__fixture.pending++;try{']);changes.push([visibleNode.body.end-1,visibleNode.body.end-1,'}finally{__fixture.pending--;}']);
 for(const name of ['ensure','shard']){
  const nodes=collect(f[0],n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(nodes.length,1,name);
  // ensure: index/boundary bootstrap and renderer construction are fixtures.
  // shard: the counted, gated fixture leaf read runs first under the request
  // signal; the manager's own shard body then takes the leaf from its page-store
  // source leases (produced through the fixture native source client).
  if(name==='ensure')changes.push([nodes[0].body.getStart(ast),nodes[0].body.end,`{signal.throwIfAborted();if(!renderer){renderer=__fixture.renderer;options.onRenderer?.(renderer);}if(!manifest){manifest=__fixture.manifest;manifestSHA='fixture-index';boundary=__fixture.boundary;}}`]);
  else changes.push([nodes[0].body.getStart(ast)+1,nodes[0].body.getStart(ast)+1,'await __fixture.read(s,signal);current(signal,revision);']);
 }
 // Expose just the current source identity and scalar counters to vary inputs;
 // this insertion leaves every production lifecycle function unchanged.
 const returned=f[0].body.statements.findLast(n=>ts.isReturnStatement(n));assert(returned);
 changes.push([returned.getStart(ast),returned.getStart(ast),`__fixture.inspect=()=>({visibleLoadsPending:__fixture.pending,generation,revision,mode,wantedMode,suspended,lastError,signal:request.signal});__fixture.changeSource=()=>{manifestSHA+='-changed';};`]);
 let source=text.slice(f[0].getStart(ast),f[0].end);for(const [start,end,replacement]of changes.sort((a,b)=>b[0]-a[0]))source=source.slice(0,start-f[0].getStart(ast))+replacement+source.slice(end-f[0].getStart(ast));
 const counts={reads:0,packs:0,prepares:0,repaints:0},states=[],handlers=new Map(),canvas={width:1000,height:600,clientWidth:1000,clientHeight:600};
 const view={bounds:[13,52,14,53],zoom:16,bearing:0,pitch:45,fov:45,center:{lng:13.5,lat:52.5},moving:false};
 const component={city:provider==='bremen'?'bremen':provider==='infill'?'frankfurt':'berlin',objectId:'osm/way/1',partId:'osm/way/1/component/fixture',origin:[13.5,52.5],componentGeometry:{type:'Polygon',coordinates:[[[13.4,52.4],[13.6,52.4],[13.5,52.6],[13.4,52.4]]]},sourceFeature:{properties:{}},batches:[{positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array(9),indices:new Uint16Array([0,1,2])}]};
 const page=runtime.createPageResources(fixtureOptions.focus?{recentLimitBytes:fixtureOptions.recentLimitBytes??1024**2}:{}),rows=[component],resources=tinyResource(provider,component,page.store),frozenData=resources.client,nativeSources=createFixtureNativeSources({store:page.store,city:component.city,owner:provider,rows:()=>rows});let block,materialRevision=0,packedGeneration=0,enabled=false,loaded=[],residentScope,releaseResidentScope,pendingDataSignal;const cancelledCandidates=[];
 const createBatchScope=()=>resources.createScope();
 const clearResidentScope=()=>{const release=releaseResidentScope;residentScope=undefined;releaseResidentScope=undefined;release?.();};
 const renderer={layer:{id:'fixture-'+provider},setBatches(next,g,...args){const prepared=['city','delegated500','root500','tier300','infill','bremen'].includes(provider)?args.at(-1):undefined,release=next.length&&prepared?.scope&&residentScope!==prepared.scope?prepared.scope.retain():undefined;counts.packs++;loaded=next;packedGeneration=g;if(release){clearResidentScope();residentScope=prepared.scope;releaseResidentScope=release;}else if(!next.length)clearResidentScope();if(prepared?.signal===pendingDataSignal||!next.length)pendingDataSignal=undefined;map.triggerRepaint();},async prepareBatches(next,signal,wait,_admission,providedScope,demand,...trailing){counts.prepares++;signal.throwIfAborted();let chunkDependencies=runtime.retainRendererChunkInput(provider==='root500'?demand:['infill','bremen'].includes(provider)?trailing[0]:['city','tier300','delegated500'].includes(provider)?providedScope:provider==='church'?wait:undefined);if(provider==='church'){let released=false;const release=()=>{if(released)return;released=true;signal.removeEventListener('abort',release);const held=chunkDependencies;chunkDependencies=undefined;held?.release();};signal.addEventListener('abort',release,{once:true});return{input:next,signal,get chunkInput(){return chunkDependencies;},releaseChunkDependencies:release,release};}if(provider==='tier300'){assert(wait&&typeof wait.prepareSelection==='function','Tier300 supplies its real batch scope');assert(next.every(row=>_admission?.includes(row)),'Tier300 forwards every merged input in its demand');pendingDataSignal=signal;}else if(['city','delegated500'].includes(provider)){assert(wait&&typeof wait.prepareSelection==='function',provider+' supplies its real batch scope');assert(Array.isArray(_admission),provider+' supplies complete manager demand');assert(next.every(row=>_admission.some(identity=>identity.city===row.city&&identity.objectId===row.objectId&&identity.partId===row.partId)),provider+' forwards every merged input in its demand');pendingDataSignal=signal;}const suppliedDemand=provider==='root500'?providedScope:['infill','bremen'].includes(provider)?demand:_admission;if(suppliedDemand!==undefined&&['root500','infill','bremen'].includes(provider)){assert(Array.isArray(suppliedDemand),provider+' forwards its declared demand');assert(next.every(row=>suppliedDemand.some(identity=>identity.city===row.city&&identity.objectId===row.objectId&&identity.partId===row.partId)),provider+' preserves every input identity in demand');}const scope=provider==='root500'?createBatchScope():['city','delegated500','infill','tier300'].includes(provider)?wait:providedScope??createBatchScope();try{await resources.prepare(scope,signal,suppliedDemand);signal.throwIfAborted();}catch(error){chunkDependencies?.release();if(provider==='root500')scope.release();throw error;}const stats={objects:next.length,vertices:next.length*3,triangles:next.length,originalVertices:next.length*3,geometryAdded:0,components:[]};let preparedReleased=false;const prepared={identity:provider+':fixture:'+counts.prepares,city:component.city,signal,input:next,source:next,sourceLoaded:new Map(next.map(row=>[row.objectId+'|'+row.partId,row])),components:next,sourceComponents:next,displayComponents:next,reconstructed:{components:next,stats},stats,originalSourceVertices:next.length*3,originalSourceIndices:next.length*3,sourceVertices:next.length*3,sourceIndices:next.length*3,scope,programPlan:{release(){}},chunkInput:chunkDependencies,releaseChunkDependencies(){chunkDependencies?.release();},refreshChunkInput(input){signal.throwIfAborted();if(scope.stats.disposed)throw new DOMException('Fixture prepared source is unavailable','AbortError');const next=runtime.retainRendererChunkInput(input),previous=chunkDependencies;chunkDependencies=next;prepared.chunkInput=next;previous?.release();},release(){chunkDependencies?.release();if(provider==='city'){if(preparedReleased)return;preparedReleased=true;if(pendingDataSignal===signal)pendingDataSignal=undefined;map.triggerRepaint();return;}prepared.input=[];prepared.source=[];prepared.sourceLoaded=new Map();prepared.components=[];prepared.sourceComponents=[];prepared.displayComponents=[];prepared.reconstructed={components:[],stats:{...stats,components:[]}};prepared.stats={...stats,components:[]};scope.release();}};return prepared;},setEnabled(value){if(value===enabled)return;enabled=value;map.triggerRepaint();},isPickReady:()=>enabled&&(!pendingDataSignal||pendingDataSignal.aborted),getDrawReadiness:()=>({ready:enabled&&(!pendingDataSignal||pendingDataSignal.aborted),preparing:!!pendingDataSignal&&!pendingDataSignal.aborted}),getReadinessDiagnostic:()=>({ready:enabled&&(!pendingDataSignal||pendingDataSignal.aborted)}),getFrozenF231Metadata547:()=>[],get residentVertexCount(){return loaded.length*3;},getRevision:()=>({generation:packedGeneration,viewRevision:materialRevision}),getSourceComponent:()=>loaded[0],suspendSelection(){},cancelCandidate(g){cancelledCandidates.push(g);},setPageHidden(){},setReducedMotion(){},setOpacityContext(){},destroy(){loaded=[];clearResidentScope();},diagnosticScreenSamples:()=>[],get stats(){throw Error('recovery must not construct full renderer diagnostics');}};
 const borrowFixtureComponent=identity=>identity?loaded.find(row=>row.objectId===identity.objectId&&row.partId===identity.partId):loaded[0];
 Object.assign(renderer,{borrowSourceComponent:borrowFixtureComponent,borrowSurfaceComponent:borrowFixtureComponent,borrowAddedDisplayComponent:()=>undefined,getSourceComponent:identity=>componentReadback.copyBuildingComponentReadback(borrowFixtureComponent(identity)),getSurfaceComponent:identity=>componentReadback.copyBuildingComponentReadback(borrowFixtureComponent(identity)),getComponent:identity=>componentReadback.copyBuildingComponentMetadata(borrowFixtureComponent(identity)),getAddedDisplayComponent:()=>undefined});
 const map={on(event,fn){if(!handlers.has(event))handlers.set(event,new Set());handlers.get(event).add(fn);},off(event,fn){handlers.get(event)?.delete(fn);},emit(event){for(const fn of [...handlers.get(event)??[]])fn();},getBounds:()=>({getWest:()=>view.bounds[0],getSouth:()=>view.bounds[1],getEast:()=>view.bounds[2],getNorth:()=>view.bounds[3]}),getCenter:()=>view.center,getZoom:()=>view.zoom,getBearing:()=>view.bearing,getPitch:()=>view.pitch,getVerticalFieldOfView:()=>view.fov,getCanvas:()=>canvas,isMoving:()=>view.moving,getLayer:()=>false,removeLayer(){},triggerRepaint(){counts.repaints++;queueMicrotask(()=>map.emit('render'));},stop(){},easeTo(){},getStyle:()=>({layers:[]})};
 const fixture={pending:0,s434Pending:false,s434Updates:[],modelVerified:true,renderer,manifest:{source_snapshot:'fixture',source_pbf_sha256:'source',city_boundary:{sha256:'boundary'},compiler_sha256:'compiler',shards:[{id:'fixture',tile_key:'fixture',sha256:'leaf',bytes:100,vertices:3,bbox:[13,52,14,53],lod:1}]},boundary:{type:'Polygon',coordinates:[]},async read(_asset,signal){counts.reads++;if(fixture.readOverride)return fixture.readOverride(_asset,signal,rows);if(block){const gate=block;block=undefined;gate.started.resolve();await Promise.race([gate.release.promise,new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}))]);}signal.throwIfAborted();return rows;}};
 const visibility={pageIsHidden:()=>fixtureOptions.hidden===true,visibleReadinessDeadline:()=>()=>{}};
 const {waitForResidentDraw}=compile(residentDrawReadinessSource,{require:specifier=>{assert.equal(specifier,'./visible-readiness-deadline');return visibility;}});
 if(fixtureOptions.focus)fixture.manifest.shards[0].sha256='a'.repeat(64);
 const env={...loadFocusModule(new URL('../src/safety/building-focus-selection.ts',import.meta.url)),...loadFocusModule(new URL('../src/safety/building-focus-window.ts',import.meta.url)),...loadFocusModule(new URL('../src/safety/building-focus-admission.ts',import.meta.url)),...loadFocusModule(new URL('../src/safety/building-focus-provider.ts',import.meta.url)),resourceContentKey,...helper(),...recipeStages,...managerDataDemand,...visibility,...runtime.managerErrorClasses(),...rendererChunkInputs,...bremenDisplayDerivations,waitForResidentDraw,createFrozenDataScope:client=>resources.createScope(client),scopedProgressiveAdmission:()=>undefined,scopedC311HasMaterialBinding:()=>false,scopedC312HasMaterialBinding:()=>false,scopedC313HasMaterialBinding:()=>false,prepareDelegated500Data:async(demand,city,signal,scope,raw)=>{assert.equal(city,component.city);assert(raw.every(row=>demand.some(identity=>identity.city===row.city&&identity.objectId===row.objectId&&identity.partId===row.partId)));assert.deepEqual(managerDataDemand.delegated500DemandClosure(raw).identities,demand);await resources.prepare(scope,signal,demand);},prepareDelegated500Programs:async(demand,city,signal,scope)=>{assert.equal(city,component.city);assert(scope.stats.resources>0,'program preparation uses the already prepared data scope');await resources.prepare(scope,signal,demand);},createBremenOwnerRuntime:()=>({createBatchScope,prepare:async()=>{},clearResident(){},dispose(){}}),scopeOriginal_prepareBremenAcceptedCohortSelection:selection,scopeOriginal_partialGateDisplayPlan:emptyPlan,scopeOriginal_s020RelationOutlineDisplayPlan:emptyPlan,scopeOriginal_s020FullOriginalBatchRouteReady:()=>false,scopeOriginal_progressiveAdmission:()=>undefined,prepareSourceRoleDisplay:async()=>{},sourceRoleDisplayProfile:()=>undefined,...sourcePlanners,location:{search:"",hostname:"test.invalid"},__fixture:fixture,matchMedia:()=>({matches:false}),THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:1e6,mobile:1e6},estimateRetainedBuildingPayload:()=>({retainedPayloadEstimateBytes:64}),ownerShapePatchProfiles:()=>[],ownerShapePatchMetadata:()=>({components:[],geometryAdded:0}),ownerShapePatchDisplayRows:r=>r,c382BelowgroundDisplayRows:r=>r,modelHeightQuery:()=>({matches:true,verified:fixture.modelVerified}),viewportComponents:r=>r,componentViewportRecord:()=>({vertices:3}),viewportComponentDistance:()=>0,containsPosition:()=>true,sameStageComponents:(a,b)=>!!a&&a.length===b.length&&a.every((x,i)=>x===b[i]),paintIdentityOwner:()=>provider,createS434AggregateLifecycle:()=>({clear(){},packing:()=>undefined,update(_rows,options){fixture.s434Updates.push(options);},get pending(){return fixture.s434Pending;}}),mergeShadowAdmissions:()=>undefined,shadowAdmissionForVisibleComponents:r=>r,verifiedInteriorSourceHolds:()=>[],progressiveAdmission:()=>undefined,prepareS528FormalDependency:()=>({requiredLeafIds:[],candidates:r=>r,leafPriority:()=>0,componentPriority:()=>0,assertChosen(){},viewportRows:(_all,rows)=>rows,reserveAfter:()=>({vertices:0,bytes:0})}),s528DependencyCatalog:()=>[],f331FocusCohorts277:()=>[],f331CohortViewportRows277:(_all,rows)=>rows,f331CohortProfileSelected277:()=>false};
 for(const imp of ast.statements.filter(ts.isImportDeclaration))for(const e of imp.importClause?.namedBindings?.elements??[]){const name=e.name.text;if(name in env)continue;if(name.endsWith('VertexReservation'))env[name]=()=>0;else if(name.endsWith('PROFILES'))env[name]=[];else if(name.endsWith('CohortSelection')||name.includes('Residency70')||name==='prepareKOMesseturmSources70')env[name]=selection;else if(/Holds\d+$/.test(name))env[name]=()=>[];else if(/Plan\d+$/.test(name))env[name]=emptyPlan;else if(name.startsWith('supplement'))env[name]=rows=>rows;else if(name.endsWith('DisplayPlan')||name.endsWith('CofacePlan')||name.endsWith('ConnectorPlan')||name.endsWith('CrownPlan'))env[name]=emptyPlan;else if(name.endsWith('ParentReadiness'))env[name]=()=>({active:false,ready:true,entries:new Map()});else env[name]=()=>{throw Error('unisolated domain helper: '+name);};}
 const manager=compile(source,env).installThreeDimensionalMap({map,city:component.city,mobile:false,manageCamera:false,fetchBytes:()=>{throw Error('network forbidden');},onState:s=>states.push(s),frozenData,resourceStore:page.store,nativeSources,...managerOptions});
 async function settle(limit=200){for(let i=0;i<limit;i++){await new Promise(resolve=>setTimeout(resolve,1));if(fixture.inspect().visibleLoadsPending===0){await tick();return;}}throw Error('manager did not settle');}
 return {manager,map,view,canvas,counts,states,fixture,renderer,resources,resourceStore:page.store,nativeSources,async start(){await manager.requestMode('3d',new AbortController().signal);assert.equal(loaded.length,1);assert.equal(manager.mode,'3d');assert.strictEqual(renderer.borrowSourceComponent(component).sourceFeature,component.sourceFeature,'internal source borrowing retains the WeakMap feature key');assert.notStrictEqual(renderer.getSourceComponent(component).sourceFeature,component.sourceFeature,'public full readback is independently copied');const {contentKey,resourceKey,...binding}=manager.getSourceBinding(component)??{};assert.deepEqual(binding,{city:component.city,objectId:component.objectId,partId:component.partId,sourcePBF:'source',boundarySHA:'boundary',nativeLeafSHA:'leaf'},'the real manager resolves the pinned leaf through its internal source borrow');assertPublishedSourceContent(contentKey,resourceKey,nativeSources.ownerKey);if(['city','delegated500','root500','tier300','infill','bremen'].includes(provider))assert(resources.stats.leases>0,'resident batch retains a nonempty resource scope');},settle,materialChanged(){packedGeneration++;},blockNextRead(){block={started:deferred(),release:deferred()};return block;},recover(){manager.suspend({contextRecovery:true});manager.resume({contextRecovery:true});},get loaded(){return loaded;}};
}

// The binding also names the published page-store source content of that leaf
// (and, for the source-owner managers, the owner-scoped resource of it).
function assertPublishedSourceContent(contentKey,resourceKey,ownerKey){
 assert.equal(typeof contentKey,'string','the source binding names its published source content');const content=JSON.parse(contentKey);assert.equal(content[0],'building-source-v1');
 for(const value of ['fixture-index','source','boundary','fixture','leaf'])assert(content.includes(value),'published source content is bound to '+value);
 if(resourceKey!==undefined)assert.deepEqual(decodeResourceContentKey(resourceKey),['provider-source-owner-v2',ownerKey,contentKey],'the owner resource wraps exactly that content');
}
function assertRefreshed(provider,h,before,label,requiresPack=false){assert(h.counts.reads>before.reads,label+' starts a fresh current request');if(requiresPack||!['city','delegated500'].includes(provider))assert(h.counts.packs>before.packs,label+' repacks changed resident state');assert(h.loaded.length>0);assert(h.renderer.isPickReady(),label+' leaves a drawable resident batch');}

for(const provider of providers){
 test(`${provider}: interrupted first preparation must finish through a fresh request`,async()=>{
  const h=harness(provider);try{const gate=h.blockNextRead(),initial=h.start().catch(error=>error);await gate.started.promise;const initialSignal=h.fixture.inspect().signal;h.manager.suspend({contextRecovery:true});assert(initialSignal.aborted);h.manager.resume({contextRecovery:true});gate.release.resolve();assert.equal((await initial).name,'AbortError');await h.settle();assert.equal(h.manager.mode,'3d');assert.equal(h.loaded.length,1);assert(h.counts.packs>0);}finally{h.manager.destroy();}
 });
 test(`${provider}: complete identical recovery reuses full/known-partial resident batch without pack/read`,async()=>{
  for(const coverageComplete of [true,false]){const h=harness(provider);h.fixture.modelVerified=coverageComplete;try{await h.start();assert.equal(h.states.at(-1).status,coverageComplete?'ready':'partial');const before={...h.counts},resourceBefore=h.resources.stats,old=h.loaded,signal=h.fixture.inspect().signal;h.recover();await h.settle();assert.equal(h.counts.packs,before.packs);assert.equal(h.counts.prepares,before.prepares);assert.equal(h.counts.reads,before.reads);for(const key of ['acquisitions','reads','parses'])assert.equal(h.resources.stats[key],resourceBefore[key],'identical recovery does not '+key+' a resource');assert.equal(h.loaded,old);assert.equal(signal.aborted,false,'live material closures keep their valid source signal');assert.equal(h.manager.mode,'3d');assert(h.renderer.isPickReady());}finally{h.manager.destroy();h.resources.assertReleased();}}
 });
 test(`${provider}: changed viewport/source/packed generation and ordinary resume refresh`,async()=>{
  const h=harness(provider);try{
   await h.start();
   for(const [reason,change]of [['bounds',()=>h.view.bounds[0]+=.001],['CSS canvas size',()=>h.canvas.clientWidth+=1],['physical canvas size',()=>h.canvas.width+=1],['manifest source',()=>h.fixture.changeSource()],['renderer generation',()=>h.materialChanged()]]){
    h.manager.suspend({contextRecovery:true});change();const before={...h.counts};h.manager.resume({contextRecovery:true});await h.settle();assertRefreshed(provider,h,before,'changed recovery snapshot: '+reason,reason==='renderer generation');
   }
   const before={...h.counts};h.manager.suspend();h.manager.resume();await h.settle();assertRefreshed(provider,h,before,'ordinary suspension is not context-only reuse');
  }finally{h.manager.destroy();}
 });
 test(`${provider}: unfinished, cancelled and 2D re-entry never reuse stale batches`,async()=>{
  const h=harness(provider);try{
   await h.start();const gate=h.blockNextRead();h.map.emit('moveend');await gate.started.promise;const pendingSignal=h.fixture.inspect().signal;h.manager.suspend({contextRecovery:true});assert(pendingSignal.aborted);
   const before={...h.counts};h.manager.resume({contextRecovery:true});gate.release.resolve();await h.settle();assertRefreshed(provider,h,before,'unfinished source request');
   if(provider!=='church'){
    h.fixture.s434Pending=true;const pendingMaterialSignal=h.fixture.inspect().signal;h.manager.suspend({contextRecovery:true});assert(pendingMaterialSignal.aborted,'unfinished material plan cannot keep its request');h.fixture.s434Pending=false;
    const pendingMaterial={...h.counts};h.manager.resume({contextRecovery:true});await h.settle();assertRefreshed(provider,h,pendingMaterial,'unfinished material plan');
   }
   await h.manager.requestMode('2d',new AbortController().signal);assert.equal(h.loaded.length,0);h.resources.assertReleased();const empty=h.counts.packs,reads=h.resources.stats.reads;await h.start();assert(h.counts.packs>empty);
   if(['city','delegated500','root500','tier300','infill','bremen'].includes(provider))assert(h.resources.stats.reads>reads,'3D re-entry legitimately reacquires the released resource');
   h.map.emit('movestart');const cancelled={...h.counts};h.recover();await h.settle();assertRefreshed(provider,h,cancelled,'cancelled camera update invalidates completion');
  }finally{h.manager.destroy();h.resources.assertReleased();}
 });
}


function factorySource(relative,hook,dynamic=false){
 const text=fs.readFileSync(path.join(web,relative),'utf8'),ast=ts.createSourceFile(relative,text,ts.ScriptTarget.Latest,true),fn=collect(ast,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='installThreeDimensionalMap')[0];assert(fn);
 const start=fn.getStart(ast),returned=fn.body.statements.findLast(ts.isReturnStatement),edits=[[returned.getStart(ast),returned.getStart(ast),hook]];
 if(dynamic)for(const node of collect(fn,n=>ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword)){
  const spec=node.arguments[0].text,match=spec.match(/painted\/([^/]+)\/safety\/(three-dimensional-map|building-mesh-renderer)$/);assert(match,spec);
  edits.push([node.getStart(ast),node.end,match[2]==='three-dimensional-map'?`Promise.resolve({installThreeDimensionalMap:options=>__provider(${JSON.stringify(match[1])},options)})`:'Promise.resolve({})']);
 }
 let source=text.slice(start,fn.end);for(const [a,b,change]of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,a-start)+change+source.slice(b-start);return source;
}
// The compositor's own runtime imports (page store, byte transport, detail and
// solar planners, scene environment): actual modules. Providers, Frozen tables,
// reflection group, shared native pool and the asset registry stay fixtures.
let compositorBindings;
const compositorRuntime=()=>compositorBindings??=runtime.importBindings('safety/painted-map.ts',{skip:['./frozen-paint-tables','./planar-reflection-group','./shared-native-source','./paint-asset-registry.json']});
function routingHarness(city='berlin'){
 // One harness is one page: the lazy adapter takes the actual page store
 // singleton of its own page owner and hands it to the compositor.
 const pageOwner={},pageStore=options=>runtime.chunkResourceStore.getPageChunkResourceStore(options,pageOwner);
 const resources={active:0,queued:0,waiters:0};
 const hooks={},sessions=[],providersSeen=[];
 const frozen={active:0,queued:0,pendingInitializers:0,activePhysicalBytes:0,declaredInFlightRawBytes:0,completedInitializers:5,parses:10};
 const renderer={setPageHidden(){},setReducedMotion(){},setOpacityContext(){},isPickReady:()=>true,get stats(){throw Error('routing must not read full diagnostics');}};
 const provider=(_name,options)=>{let mode='2d',signal;const record={name:_name,hidden:[],viewport:[],suspend:[],resume:[],prepare:options.runVisiblePreparation};providersSeen.push(record);return{async requestMode(next,external){signal=external;external.throwIfAborted();mode=next;options.onRenderer(renderer);options.onState({mode,status:'ready'});return{mode,status:'ready'};},get mode(){return mode;},get wantedMode(){return mode;},suspend(flags){record.suspend.push(flags);return flags?.contextRecovery===true&&!signal.aborted;},resume(flags){record.resume.push(flags);},setPageHidden(value){record.hidden.push(value);},...(_name==='root500'?{setViewportVisible(value){record.viewport.push(value);}}:{}),setReducedMotion(){},setOpacityContext(){},destroy(){}};};
 const painted=compile(factorySource('src/safety/painted-map.ts','__hooks.aggregateSignal=()=>request.signal;',true),{...compositorRuntime(),getPageChunkResourceStore:pageStore,cityCacheIdleTiers:runtime.load(path.join(web,'src/safety/city-cache-retention.ts')).cityCacheIdleTiers,buildingDetailCatalog:undefined,buildingFocusRegistry:undefined,createBuildingFocusRegistry:runtime.load(path.join(web,'src/safety/building-focus-registry.ts')).createBuildingFocusRegistry,__hooks:hooks,__provider:provider,document:{hidden:false},location:{hostname:'test.invalid'},createVisiblePreparationGate,createModelViewProjection,createSharedNativeSourcePool:()=>({client:()=>({}),destroy(){}}),planarReflectionGroup:()=>({}),assetRegistry:{},frozenPaintTableStats:()=>frozen,profileSHA256:null,createFrozenDataResourceOwner:()=>({client:provider=>({provider,dispose(){}}),stats:resources,destroy(){}}),beginFrozenPaintTableInitialization:(_read,signal)=>{const session={signal,active:true,wait:p=>p,settled:()=>Promise.resolve(),close(){this.active=false;}};sessions.push(session);return session;}}).installThreeDimensionalMap;
 const lazy=compile(factorySource('src/safety/three-dimensional-lazy.ts','__hooks.lazySignal=()=>modeRequest.signal;'),{__hooks:hooks,document:{hidden:false},matchMedia:()=>({matches:false}),reichstagAppearanceVertexReservation:()=>0,checkedSceneEnvironment:x=>x,getPageChunkResourceStore:pageStore,cityCacheIdleTiers:runtime.load(path.join(web,'src/safety/city-cache-retention.ts')).cityCacheIdleTiers}).installThreeDimensionalMap;
  const frames=new Set(),map={stop(){},easeTo(){},getCenter:()=>({lng:13,lat:52}),getPadding:()=>({top:0,right:0,bottom:0,left:0}),getCanvas:()=>({clientWidth:800,clientHeight:600,width:800,height:600}),getZoom:()=>17,getBearing:()=>0,getPitch:()=>45,getRoll:()=>0,getVerticalFieldOfView:()=>36.87,getCenterElevation:()=>0,getProjection:()=>({type:'mercator'}),on:(_type,fn)=>frames.add(fn),off:(_type,fn)=>frames.delete(fn),triggerRepaint:()=>queueMicrotask(()=>{for(const fn of [...frames])fn();})};
 const manager=lazy({map,city,mobile:false,fetchBytes:()=>{throw Error('network forbidden');}},async()=>({installThreeDimensionalMap:painted}));
 return{manager,hooks,frozen,resources,sessions,providersSeen,async start(){await manager.requestMode('3d',new AbortController().signal);assert.equal(manager.mode,'3d');assert.equal(providersSeen.length,5);assert.equal(sessions.length,1);}};
}

test('actual lazy + aggregate: offscreen state survives delayed installation and independent document changes',async()=>{
 const h=routingHarness();try{
  h.manager.setViewportVisible(false);h.manager.setPageHidden(false);
  assert.equal(h.providersSeen.length,0);assert.equal(h.sessions.length,0);
  await h.start();const root=h.providersSeen.find(p=>p.name==='root500');
  assert.equal(root.hidden.at(-1),false);assert.equal(root.viewport.at(-1),false);
  assert(h.providersSeen.filter(p=>p!==root).every(p=>p.hidden.at(-1)===true));
  h.manager.setPageHidden(true);h.manager.setPageHidden(false);
  assert.equal(root.viewport.at(-1),false);
  assert(h.providersSeen.filter(p=>p!==root).every(p=>p.hidden.at(-1)===true));
  h.manager.setViewportVisible(true);
  assert(h.providersSeen.every(p=>p.hidden.at(-1)===false));
 }finally{h.manager.destroy();}
});

test('actual lazy + aggregate: quiet context recovery preserves both upstream signals and Frozen session',async()=>{
 const h=routingHarness();try{await h.start();const lazy=h.hooks.lazySignal(),aggregate=h.hooks.aggregateSignal(),session=h.sessions[0];assert.equal(h.manager.suspend({contextRecovery:true}),true);assert.equal(lazy.aborted,false);assert.equal(aggregate.aborted,false);assert.equal(session.active,true);h.manager.resume({contextRecovery:true});assert.equal(h.sessions.length,1);assert.equal(h.hooks.lazySignal(),lazy);assert.equal(h.hooks.aggregateSignal(),aggregate);for(const p of h.providersSeen){assert.equal(p.suspend.at(-1)?.contextRecovery,true);assert.equal(p.resume.at(-1)?.contextRecovery,true);}}finally{h.manager.destroy();}
});

test('actual lazy + aggregate: pending Frozen or ordinary pause still aborts and initializes',async()=>{
 for(const condition of ['active','queued','pendingInitializers','activePhysicalBytes','declaredInFlightRawBytes','resources.active','resources.queued','resources.waiters','ordinary']){
  const h=routingHarness();try{await h.start();const lazy=h.hooks.lazySignal(),aggregate=h.hooks.aggregateSignal();if(condition.startsWith('resources.'))h.resources[condition.slice('resources.'.length)]=1;else if(condition!=='ordinary')h.frozen[condition]=1;const flags=condition==='ordinary'?undefined:{contextRecovery:true};assert.equal(h.manager.suspend(flags),false,condition);assert(lazy.aborted,condition);assert(aggregate.aborted,condition);assert.equal(h.sessions[0].active,false);h.manager.resume(flags);assert.equal(h.sessions.length,2);assert.notEqual(h.hooks.aggregateSignal(),aggregate);for(const p of h.providersSeen){assert.equal(p.suspend.at(-1),undefined);assert.equal(p.resume.at(-1),undefined);}}finally{h.manager.destroy();}
 }
});

test('actual aggregate: Frozen parse generation change during pause rejects old residency',async()=>{
 const h=routingHarness();try{await h.start();const signal=h.hooks.aggregateSignal();assert.equal(h.manager.suspend({contextRecovery:true}),true);h.frozen.parses++;h.manager.resume({contextRecovery:true});assert(signal.aborted);assert.equal(h.sessions.length,2);for(const p of h.providersSeen)assert.equal(p.resume.at(-1),undefined);}finally{h.manager.destroy();}
});


// The same real manager factories exercise the new page gate. The gate itself is
// not stubbed; only the existing bounded source/renderer fixture is controlled.
test('page preparation: all seven moveend paths queue before reads and coalesce to latest view',async()=>{
 const gate=createVisiblePreparationGate(),hs=providers.map(provider=>harness(provider,{runVisiblePreparation:(signal,work)=>gate.run(provider,signal,work)}));
 const hold=deferred();let occupied;
 try{
  for(const h of hs)await h.start();
  const old=hs.map(h=>({reads:h.counts.reads,loaded:h.loaded}));occupied=gate.run('city',new AbortController().signal,()=>hold.promise);await tick();
  for(let version=0;version<2;version++)for(const h of hs){h.map.emit('movestart');h.view.center={lng:13.5+version*.01,lat:52.5};h.map.emit('moveend');}
  await tick();assert.equal(gate.stats.queued,7);
  hs.forEach((h,i)=>{assert.equal(h.counts.reads,old[i].reads,'queued provider must not admit a source leaf');assert.equal(h.loaded,old[i].loaded,'old display stays usable');});
  hold.resolve();await occupied;await Promise.all(hs.map(h=>h.settle(2000)));
  hs.forEach((h,i)=>{assert.equal(h.counts.reads,old[i].reads+1,'only latest view is read');assert.equal(h.loaded.length,1);assert.equal(h.loaded[0].objectId,'osm/way/1');});
  assert(gate.idle);assert.equal(gate.stats.peakActive,1);assert.equal(gate.stats.peakQueued,7);
 }finally{hold.resolve();hs.forEach(h=>h.manager.destroy());gate.destroy();await occupied;}
});
for(const provider of providers){
 test(`${provider}: queued preparation cannot reuse recovery; 2D and destroy cancel pending work`,async()=>{
  const gate=createVisiblePreparationGate(),h=harness(provider,{runVisiblePreparation:(signal,work)=>gate.run(provider,signal,work)}),hold=deferred();let occupied;
  try{
   await h.start();occupied=gate.run('city',new AbortController().signal,()=>hold.promise);await tick();const reads=h.counts.reads;
   h.map.emit('movestart');h.map.emit('moveend');await tick();assert.equal(gate.stats.queued,1);assert.equal(h.counts.reads,reads);
   assert.equal(h.manager.suspend({contextRecovery:true}),false);assert(h.fixture.inspect().signal.aborted);assert.equal(gate.stats.queued,0);
   h.manager.resume({contextRecovery:true});await tick();assert.equal(gate.stats.queued,1);assert.equal(h.counts.reads,reads);
   await h.manager.requestMode('2d',new AbortController().signal);assert.equal(gate.stats.queued,0);assert.equal(h.loaded.length,0);
   const next=h.manager.requestMode('3d',new AbortController().signal).catch(e=>e);await tick();assert.equal(gate.stats.queued,1);h.manager.destroy();assert.equal((await next).name,'AbortError');assert.equal(gate.stats.queued,0);
  }finally{hold.resolve();h.manager.destroy();gate.destroy();await occupied;}
 });
 test(`${provider}: source failure drains the second real reader before next provider enters`,async()=>{
  const gate=createVisiblePreparationGate(),h=harness(provider,{runVisiblePreparation:(signal,work)=>gate.run(provider,signal,work)}),slow=deferred(),started=deferred();let next;
  try{
   await h.start();const packs=h.counts.packs;h.fixture.manifest.shards.push({...h.fixture.manifest.shards[0],id:'slow',tile_key:'slow'});
   h.fixture.readOverride=async(asset,_signal,rows)=>{if(asset.id!=='slow')throw Error('fixture source failure');started.resolve();await slow.promise;return rows;};
   h.map.emit('movestart');h.map.emit('moveend');await started.promise;let entered=false;
   next=gate.run(provider==='city'?'church':'city',new AbortController().signal,async()=>{entered=true;});await tick();
   assert.equal(entered,false,'a fail-fast reader rejection must not release active preparation');assert.equal(gate.stats.active,1);
   slow.resolve();await next;await h.settle();assert.equal(h.counts.packs,packs,'failed request cannot publish a late batch');assert(h.states.some(s=>s.status==='error'));assert(gate.idle);
  }finally{slow.resolve();h.manager.destroy();gate.destroy();await next;}
 });
}
// DECISIONS 2026-11-02 01:35: lineage A keeps the atomic cohort, so staged CPU
// preparation starts only after every selected leaf is read. The failure is
// therefore injected while the final staged preparation is in flight: the gate
// stays held until that preparation drains, and nothing is committed late.
test('root500: failed reader drains unawaited staged preparation and suppresses late commit',async()=>{
 const gate=createVisiblePreparationGate(),h=harness('root500',{runVisiblePreparation:(signal,work)=>gate.run('root500',signal,work)}),prepared=deferred(),prepareStarted=deferred(),secondReader=deferred();let next,secondReadStarted=false,stagedFailure;
 try{
  await h.start();const packs=h.counts.packs;h.fixture.manifest.shards.push({...h.fixture.manifest.shards[0],id:'slow',tile_key:'slow'});
  h.fixture.readOverride=async(asset,_signal,rows)=>{if(asset.id!=='slow')return rows;secondReadStarted=true;await secondReader.promise;return rows;};
  const prepareBatches=h.renderer.prepareBatches;h.renderer.prepareBatches=async(...args)=>{prepareStarted.resolve();await prepared.promise;if(stagedFailure)throw stagedFailure;return prepareBatches(...args);};
  let preparationStarted=false;void prepareStarted.promise.then(()=>{preparationStarted=true;});
  // A different admission needs new CPU preparation rather than the exact resident reuse path.
  h.view.bounds[0]+=.001;h.map.emit('movestart');h.map.emit('moveend');await waitForPublication(()=>secondReadStarted,'root500 second reader start');
  for(let i=0;i<4;i++)await tick();assert.equal(preparationStarted,false,'the atomic cohort stages nothing while a selected leaf is still being read');
  secondReader.resolve();await waitForPublication(()=>preparationStarted,'root500 final staged CPU preparation after its last reader');
  let entered=false;next=gate.run('church',new AbortController().signal,async()=>{entered=true;});await tick();assert.equal(entered,false,'the in-flight staged preparation keeps the gate');assert.equal(gate.stats.active,1);
  stagedFailure=Error('staged source failure');prepared.resolve();await next;await h.settle();assert.equal(h.counts.packs,packs,'the failed staged preparation commits nothing');assert(h.states.some(s=>s.status==='error'));assert(gate.idle);
 }finally{prepared.resolve();secondReader.resolve();h.manager.destroy();gate.destroy();await next?.catch(error=>{if(error?.name!=='AbortError')throw error;});}
});
test('actual aggregate: active preparation rejects Frozen resident recovery even with idle transport',async()=>{
 const h=routingHarness(),hold=deferred();let work;
 try{await h.start();assert(h.providersSeen.every(p=>typeof p.prepare==='function'));const signal=h.hooks.aggregateSignal();work=h.providersSeen[0].prepare(signal,()=>hold.promise).catch(e=>e);await tick();assert.equal(h.manager.suspend({contextRecovery:true}),false);assert(signal.aborted);assert.equal(h.sessions[0].active,false);hold.resolve();assert.equal((await work).name,'AbortError');}
 finally{hold.resolve();h.manager.destroy();await work;}
});


const publicationProviders=['city','delegated500','tier300','church'];
const waitForPublication=async(predicate,label)=>{for(let i=0;i<200;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,1));}throw Error('Missing publication: '+label);};
for(const provider of publicationProviders){
 test(`${provider}: initially hidden 3D intent waits without reads until show`,async()=>{
  const visibility={hidden:true},h=harness(provider,{},visibility);try{
   const initial=h.start();await tick();assert.equal(h.counts.reads,0);assert.equal(h.counts.packs,0);
   visibility.hidden=false;h.manager.setPageHidden(false);await initial;
   assert.equal(h.manager.mode,'3d');assert.equal(h.manager.wantedMode,'3d');assert(h.loaded.length);
  }finally{h.manager.destroy();}
 });
 test(`${provider}: hidden first preparation keeps its mode intent and only publishes after show`,async()=>{
  const h=harness(provider);try{
   const blocked=h.blockNextRead();let settled=false;
   const initial=h.start().then(()=>{settled=true;return undefined;},error=>{settled=true;return error;});await blocked.started.promise;
   h.manager.setPageHidden(true);blocked.release.resolve();await tick();
   assert.equal(h.counts.packs,0,'hidden obsolete preparation publishes no batch');
   assert.equal(settled,false,'visibility supersession preserves the original mode intent');
   h.map.emit('movestart');h.map.emit('moveend');await tick();
   assert.equal(h.counts.packs,0,'hidden map events cannot restart preparation');
   h.manager.setPageHidden(false);assert.equal(await initial,undefined);await h.settle();
   assert.equal(h.manager.wantedMode,'3d');assert.equal(h.manager.mode,'3d');assert(h.loaded.length);
   assert(!h.states.some(state=>state.status==='error'),'visibility is not a real failure');
  }finally{h.manager.destroy();}
 });
 test(`${provider}: hide retires pending publication without clearing resident rows and show refreshes once`,async()=>{
  const h=harness(provider);try{
   await h.start();const resident=h.loaded,before={...h.counts};
   const blocked=h.blockNextRead();h.map.emit('movestart');h.map.emit('moveend');await blocked.started.promise;
   h.manager.setPageHidden(true);assert.equal(h.loaded,resident,'hide preserves the published resident batch');
   blocked.release.resolve();await h.settle();await new Promise(resolve=>setTimeout(resolve,60));
   assert.equal(h.counts.packs,before.packs,'late work and publication timers stay retired while hidden');
   const reads=h.counts.reads;h.map.emit('movestart');h.map.emit('moveend');await tick();
   assert.equal(h.counts.reads,reads,'hidden movement cannot fetch another view');
   h.manager.setPageHidden(false);h.manager.setPageHidden(false);await h.settle();
   assert.equal(h.counts.reads,reads+1,'one show starts one current visible refresh');assert(h.counts.packs>before.packs);
   assert.equal(h.manager.wantedMode,'3d');assert(!h.states.some(state=>state.status==='error'));
  }finally{h.manager.destroy();}
 });
 test(`${provider}: hidden 2D request completes and later show cannot restart 3D`,async()=>{
  const h=harness(provider);try{
   await h.start();h.manager.setPageHidden(true);
   await h.manager.requestMode('2d',new AbortController().signal);const reads=h.counts.reads,packs=h.counts.packs;
   assert.equal(h.manager.mode,'2d');assert.equal(h.manager.wantedMode,'2d');assert.equal(h.loaded.length,0);
   h.manager.setPageHidden(false);h.map.emit('moveend');await tick();
   assert.equal(h.counts.reads,reads);assert.equal(h.counts.packs,packs,'show does not revive a cancelled 3D intent');
  }finally{h.manager.destroy();}
 });
}
for(const provider of ['city','delegated500','tier300'])test(`${provider}: the final publication retires the prior same-view aggregate but keeps its completed resident callback`,async()=>{
 const h=harness(provider);try{
  await h.start();h.fixture.manifest.shards.push({...h.fixture.manifest.shards[0],id:'second',tile_key:'second'});
  const blocked=h.blockNextRead(),before=h.counts.packs,updates=h.fixture.s434Updates.length;
  h.map.emit('movestart');h.map.emit('moveend');await blocked.started.promise;
  await waitForPublication(()=>h.counts.packs>before,'intermediate '+provider);
  const intermediate=h.fixture.s434Updates.at(-1),ticket=h.fixture.inspect().revision;
  assert(h.fixture.s434Updates.length>updates);assert.equal(intermediate.signal.aborted,false);
  blocked.release.resolve();await h.settle();const final=h.fixture.s434Updates.at(-1);
  assert.notEqual(final,intermediate);assert.equal(h.fixture.inspect().revision,ticket,'stage and finish share the same view');
  assert.equal(intermediate.signal.aborted,true,'a new publication retires the prior aggregate attempt');
  assert.equal(final.signal.aborted,false,'close keeps a completed resident publication current');
  // A repack may now re-prepare its CPU batch before packing (delegated500
  // prepares the aggregate's chunk input asynchronously); city and tier300
  // still pack synchronously. A callback starts its repack synchronously, and
  // retired callbacks are observed after the same bounded quiet period the
  // hide test uses, so a late asynchronous repack cannot pass unseen.
  const quiet=()=>new Promise(resolve=>setTimeout(resolve,60));
  const packed=h.counts.packs,prepares=h.counts.prepares;intermediate.onChange('ready');assert.equal(h.counts.prepares,prepares,'old same-view aggregate cannot start a repack');await quiet();assert.equal(h.counts.packs,packed,'old same-view aggregate cannot repack');
  final.onChange('ready');assert(h.counts.packs===packed+1||h.counts.prepares>prepares,'current completed aggregate starts its repack synchronously');await waitForPublication(()=>h.counts.packs>packed,'current aggregate repack '+provider);await quiet();assert.equal(h.counts.packs,packed+1,'current completed aggregate can still repack');
  h.manager.setPageHidden(true);const retired=h.counts.packs,retiredPrepares=h.counts.prepares;final.onChange('ready');assert.equal(h.counts.prepares,retiredPrepares,'hidden view cannot start a repack');await quiet();assert.equal(h.counts.packs,retired,'hidden view retires its aggregate callback');
 }finally{h.manager.destroy();}
});

test('lazy entry selects the city cache policy before any 3D provider is loaded',()=>{
 for(const city of ['berlin','bremen','cologne','dortmund','dresden','dusseldorf','essen','frankfurt','hamburg','hannover','leipzig','munich','nuremberg','stuttgart']){
  const h=routingHarness(city);
  try{
   assert.equal(h.providersSeen.length,0);
   assert.deepEqual(Object.values(h.manager.resourceStore.stats.cacheIdleTiersMs),['cologne','frankfurt'].includes(city)?[7000,9000,12000,14000]:[10000,13000,17000,20000],city);
  }finally{h.manager.destroy();h.manager.resourceStore.destroy();}
 }
});


for(const provider of ['church','root500','city','tier300','infill','bremen','delegated500'])for(const recentLimitBytes of [0,1024**2])test(`${provider} focus selection respects ${recentLimitBytes} bytes of existing recent-cache allowance`,async()=>{
 const {createBuildingFocusWindow}=loadFocusModule(new URL('../src/safety/building-focus-window.ts',import.meta.url));
 // A geographically consistent top-down MapLibre zoom-16 frame centred on the fixture
 // component: the focus scale is anchored at the ground resolution of the default 3D view (zoom 15, pitch 45); this top-down zoom-16 frame is far below it, so the full allowance applies.
 const worldSize=512*2**16,cx=(13.5+180)/360,cy=(1-Math.log(Math.tan(Math.PI/4+52.5*Math.PI/360))/Math.PI)/2;
 const win=createBuildingFocusWindow();const mainMatrix=new Float64Array(16);mainMatrix[0]=worldSize/500;mainMatrix[5]=-worldSize/300;mainMatrix[10]=1e-9;mainMatrix[12]=-cx*worldSize/500;mainMatrix[13]=cy*worldSize/300;mainMatrix[15]=1;const centreX=mainMatrix[12];
 const frame={revision:1,cameraKey:'focus-fixture',mercator:true,mainMatrix,viewport:{cssWidth:1000,cssHeight:600,drawingBufferWidth:1000,drawingBufferHeight:600},buildingFocus:win.measure({width:1000,height:600})};
 let metadataReads=0,metadataReleased=0;
 const resolver={async acquireLeaf(leaf,signal){signal.throwIfAborted();metadataReads++;return{value:{leaf:{...leaf,key:JSON.stringify([leaf.id,leaf.sha256]),partition:null},components:[{objectId:'osm/way/1',partId:'osm/way/1/component/fixture',origin:[13.5,52.5],box:[0,0,0,1,1,1]}],sourceObjectDependencies:[],dependencyLocators:[]},release(){metadataReleased++;}};}};
 const h=harness(provider,{buildingFocus:{enabled:true,forIndex:()=>resolver},getModelViewProjection:()=>frame},{focus:true,recentLimitBytes});
 try{
  await h.manager.requestMode('3d',new AbortController().signal);assert.equal(h.loaded.length,1);assert(metadataReads>0);assert.equal(metadataReads-metadataReleased,1,'the manager keeps exactly its latest plan\u2019s metadata and has returned every earlier one');const reads=h.counts.reads,productions=h.nativeSources.stats.productions;
  mainMatrix[12]=centreX-2;frame.cameraKey='outside';frame.revision++;h.view.bounds[0]+=.001;
  h.map.emit('movestart');h.map.emit('moveend');await h.settle();
  assert.equal(h.loaded.length,0,JSON.stringify({states:h.states,detail:h.fixture.inspect().lastError}));assert.equal(h.counts.reads,reads,'excluded source never reaches the real manager shard reader');assert.equal(metadataReads-metadataReleased,1);
  if(recentLimitBytes)assert(h.resourceStore.stats.recent>0,'exited core source survives the publication as a bounded recent entry');else assert.equal(h.resourceStore.stats.recent,0,'focus grace cannot bypass a zero cache budget');
  mainMatrix[12]=centreX;frame.cameraKey='returned';frame.revision++;h.view.bounds[0]-=.001;h.map.emit('movestart');h.map.emit('moveend');await h.settle();assert.equal(h.loaded.length,1);
  if(recentLimitBytes)assert.equal(h.nativeSources.stats.productions,productions,'return during grace reuses the actual decoded source');else assert(h.nativeSources.stats.productions>productions,'without a cache allowance the source must be reacquired');
  h.manager.destroy();assert.equal(metadataReleased,metadataReads,'destroying the manager returns all focus metadata');
 }finally{h.manager.destroy();h.resourceStore.destroy();h.resources.assertReleased();}
});
