import {resourceContentKey} from './support/resource-content-key.mjs';
import {nullCityDataProfilePlugin} from './city-profile-test-plugin.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,webcrypto} from 'node:crypto';
import {build} from 'esbuild';
import ts from 'typescript';
import {createRuntimeLoader,createFixtureNativeSources} from './support/fixtures-managers-a-runtime.mjs';
import {bulk70PreimportRows} from './support/f5bremen-bulk70-preimport.mjs';

// P1-8. A 3D readiness timeout that rolls the page back to 2D must be explicit
// (trilingual notice with an in-page "Retry 3D"), keep the camera, period,
// filters and selection, and no late callback of an older request may switch
// the page back to 3D or show an obsolete notice. The real compositor, lazy
// adapter, 3D controls, recovery notice and main.ts callbacks run unchanged; the
// selected owners run their actual shared readiness code with only
// transport and GPU isolated. Optional root: run the same assertions against
// another web/ tree (negative control).
const web=path.resolve(process.env.THREE_D_FALLBACK_WEB_ROOT??fileURLToPath(new URL('../',import.meta.url)));
const src=relative=>path.join(web,'src',relative);
const read=relative=>fs.readFileSync(src(relative),'utf8');
// The actual page ledger/chunk store of the same tree: each page gets one store,
// the lease store keeps its cells there and every owner receives that store.
const runtime=createRuntimeLoader(web);
// The manager's derived binding uses the same actual authority graph as its
// source leases. These plain native fixtures produce no derived recipe rows.
const rendererChunkInputs=runtime.load(src('safety/renderer-chunk-input.ts'));
const bremenDisplayDerivations=runtime.load(src('painted/bremen/safety/bremen-display-derivations.ts'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function settle(rounds=16){for(let i=0;i<rounds;i++)await tick();}
async function until(predicate,label,limit=4000){const end=Date.now()+limit;while(!predicate()){if(Date.now()>end)throw Error('timed out waiting for '+label);await new Promise(resolve=>setTimeout(resolve,2));}}
const deferred=()=>{let resolve,reject;const promise=new Promise((done,fail)=>{resolve=done;reject=fail;});return{promise,resolve,reject};};
const COPY={
 zh:{message:'3D细节未能完成加载，当前已保留2D地图。公告、筛选和当前位置仍可使用。',retry:'重试3D'},
 en:{message:'The 3D detail could not finish loading. The 2D map has been kept. Reports, filters and the current position remain available.',retry:'Retry 3D'},
 de:{message:'Die 3D-Details konnten nicht vollständig geladen werden. Die 2D-Karte wurde beibehalten. Meldungen, Filter und die aktuelle Position bleiben nutzbar.',retry:'3D erneut versuchen'},
};

class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.hidden=false;this.textContent='';this.disabled=false;this.onclick=null;this.onchange=null;this.className='';this.type='';this.focusCount=0;}
 append(...items){for(const item of items){if(item&&typeof item==='object'){if(item.parent&&item.parent!==this)item.parent.children=item.parent.children.filter(c=>c!==item);item.parent=this;}if(!this.children.includes(item))this.children.push(item);}}
 contains(node){return node===this||this.children.some(child=>child===node||child?.contains?.(node));}
 prepend(...items){for(const item of items.reverse()){if(item&&typeof item==='object')item.parent=this;this.children.unshift(item);}}
 setAttribute(k,v){this.attrs[k]=String(v);}
 getAttribute(k){return this.attrs[k];}
 remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 replaceChildren(...items){this.children=[];this.append(...items);}
 focus(){if(this.disabled||this.hidden)return;this.focusCount++;globalThis.document.activeElement=this;}
}
function installPage(t){
 const keys=['document','location','history','matchMedia'],saved=Object.fromEntries(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const record={reloads:0,urls:[]};
 const location={hostname:'test.invalid',search:'',href:'https://example.test/crimemaps-Munich/map/?lang=zh&month=2026-10&view=3d',reload(){record.reloads++;}};
 const values={document:{hidden:false,activeElement:undefined,createElement:tag=>new Element(tag),createTextNode:text=>({text}),addEventListener(){},removeEventListener(){}},location,
  history:{replaceState(_state,_title,url){record.urls.push(String(url));location.href=new URL(String(url),location.href).href;}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
 for(const k of keys)Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:values[k]});
 t.after(()=>{for(const k of keys){if(saved[k])Object.defineProperty(globalThis,k,saved[k]);else delete globalThis[k];}});
 return record;
}

async function bundle(relative,plugins=[]){const result=await build({entryPoints:[src(relative)],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',plugins:[nullCityDataProfilePlugin,...plugins]});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const providerKey='__threeDFallbackProvider'+Math.random().toString(16).slice(2);
const compositorPlugin={name:'fallback-compositor-fixture',setup(b){
 b.onResolve({filter:/^\.\/planar-reflection-group$/},()=>({path:'reflection',namespace:'fixture'}));
 b.onResolve({filter:/^\.\/paint-ownership$/},()=>({path:'ownership',namespace:'fixture'}));
 b.onResolve({filter:/^\.\/paint-asset-registry\.json$/},()=>({path:'assets',namespace:'fixture'}));
 b.onResolve({filter:/^\.\/frozen-paint-tables$/},()=>({path:'frozen',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path:p})=>({contents:{reflection:'export const planarReflectionGroup=()=>({});',ownership:'export const paintOwner=()=>"city";',assets:'export default {};',
  frozen:'export const beginFrozenPaintTableInitialization=()=>({active:true,wait:p=>p,settled:()=>Promise.resolve(),close(){}});export const frozenPaintTableStats=()=>({});export const createFrozenDataResourceOwner=()=>({client:provider=>({provider,dispose(){}}),stats:{active:0,queued:0,waiters:0},destroy(){}});'}[p],loader:'js'}));
 b.onResolve({filter:/painted\/[^/]+\/safety\/(?:three-dimensional-map|building-mesh-renderer)$/},args=>({path:args.path,namespace:'provider'}));
 b.onLoad({filter:/.*/,namespace:'provider'},args=>({contents:`export const installThreeDimensionalMap=options=>globalThis[${JSON.stringify(providerKey)}](${JSON.stringify(args.path.split('/painted/')[1].split('/')[0])},options);`,loader:'js'}));
}};
// The lazy adapter always receives the compositor through loadModule here.
const lazyPlugin={name:'fallback-lazy-fixture',setup(b){b.onResolve({filter:/^\.\/three-dimensional-map$/},()=>({path:'owner',namespace:'lazy'}));b.onLoad({filter:/.*/,namespace:'lazy'},()=>({contents:'export const installThreeDimensionalMap=()=>{throw Error("tests pass loadModule");};',loader:'js'}));}};
const {installThreeDimensionalMap:installCompositor}=await bundle('safety/painted-map.ts',[compositorPlugin]);
const {installThreeDimensionalMap:installLazy}=await bundle('safety/three-dimensional-lazy.ts',[lazyPlugin]);
const {installThreeDimensionalControls}=await bundle('safety/three-dimensional-controls.ts');
const notice=await bundle('safety/map-recovery-notice.ts');

function collect(node,predicate,out=[]){if(predicate(node))out.push(node);ts.forEachChild(node,child=>{collect(child,predicate,out);});return out;}
function evaluate(source,scope){
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};
 const proxy=new Proxy(scope,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k==='exports'?exports:k in o?o[k]:globalThis[k],set:(o,k,v)=>{o[k]=v;return true;}});
 Function('scope',`with(scope){${js}}`)(proxy);return exports;
}
const residentReuse=evaluate(read('safety/recovery-resident-reuse.ts'),{});
const componentReadback=evaluate(read('safety/component-readback.ts'),{});
const residentDrawAst=ts.createSourceFile('resident-draw-readiness.ts',read('safety/resident-draw-readiness.ts'),ts.ScriptTarget.Latest,true);
const residentDrawSource=residentDrawAst.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(residentDrawAst)).join('\n');
const {createFrozenDataScope}=await bundle('safety/frozen-data-scope.ts');
const leaseAst=ts.createSourceFile('frozen-data-lease-store.ts',read('safety/frozen-data-lease-store.ts'),ts.ScriptTarget.Latest,true);
const {createFrozenDataLeaseStore}=evaluate(leaseAst.statements.filter(node=>!ts.isImportDeclaration(node)).map(node=>node.getText(leaseAst)).join('\n'),{crypto:webcrypto,...runtime.leaseStoreBindings(),getPageChunkResourceStore(){throw Error('fallback fixture passes its page store explicitly');},inflateBounded3DGzip(){throw Error('fallback fixture uses plain JSON');}});
function tinyResource(provider,component,resourceStore){
 const identity={city:component.city,objectId:component.objectId,partId:component.partId};
 const catalog=(suffix,value)=>{const bytes=new TextEncoder().encode(JSON.stringify(value)),sha=createHash('sha256').update(bytes).digest('hex');return{value,bytes,ref:{canonicalSHA256:sha,file:`painted/${provider}/safety/fallback-resident-fixture${suffix}.ts`,occurrence:0,codec:'json'},descriptor:{path:`/safety/buildings3d/painted-tables/${sha.slice(0,2)}/${sha}.json`,sha256:sha,bytes:bytes.byteLength}};};
 const catalogs=[catalog('',[identity]),catalog('-next',[{...identity,catalog:'next'}])],store=createFrozenDataLeaseStore(catalogs.map(row=>row.descriptor),{resourceStore}),leases=[],scopes=[];
 let selected=catalogs[0],hold;
 const lookup=(sha,file,occurrence)=>{const found=catalogs.find(row=>row.ref.canonicalSHA256===sha);assert(found,'unexpected fixture resource');assert.deepEqual([file,occurrence],[found.ref.file,0]);return found;};
 const data=store.client({city:component.city,profileSHA256:null,provider,selection:{tables:catalogs.map(row=>row.ref.canonicalSHA256),initializers:Object.fromEntries(catalogs.map(row=>[row.ref.canonicalSHA256,{[row.ref.file]:1}]))},resolve(sha,file,occurrence){return lookup(sha,file,occurrence).ref.canonicalSHA256;},partition(sha,file,occurrence){return{schemaVersion:1,kind:'object-rows',parts:[{descriptor:lookup(sha,file,occurrence).descriptor,keys:[component.city+'|'+component.objectId],rowIndices:[0]}]};},async read(resource,signal,max){
  signal.throwIfAborted();const found=catalogs.find(row=>row.descriptor.path===resource);assert(found);assert.equal(max,found.bytes.byteLength);
  if(hold&&found===catalogs[1]){const gate=hold;gate.signal=signal;gate.started.resolve();try{await new Promise((resolve,reject)=>{const cleanup=()=>signal.removeEventListener('abort',cancel),cancel=()=>{cleanup();reject(signal.reason);};signal.addEventListener('abort',cancel,{once:true});gate.release.promise.then(()=>{cleanup();resolve();},error=>{cleanup();reject(error);});if(signal.aborted)cancel();});}finally{if(hold===gate)hold=undefined;}}
  signal.throwIfAborted();return found.bytes.slice();
 }});
 const client={async acquire(input,signal,keys){const found=lookup(input.canonicalSHA256,input.file,input.occurrence);assert.deepEqual(input,found.ref);const lease=await data.acquire(input,signal,keys);assert.deepEqual(lease.identity,{...found.ref,city:component.city,profileSHA256:null,resolvedRawSHA256:found.ref.canonicalSHA256});leases.push(lease);return lease;},get resources(){return data.resources;},dispose:()=>data.dispose()};
 return{client,scopes,get stats(){return store.stats;},createScope(input=client){assert.equal(input,client);const scope=createFrozenDataScope(input);scopes.push(scope);return scope;},blockNextPreparation(){assert.equal(hold,undefined);selected=catalogs[1];return hold={started:deferred(),release:deferred(),signal:undefined};},async prepare(scope,signal,demand){const current=selected;if(demand===undefined)await scope.prepare([current.ref],signal);else{assert(Array.isArray(demand),'scoped preparation receives the manager demand');assert(demand.some(row=>row.city===component.city&&row.objectId===component.objectId&&row.partId===component.partId),'supplied demand retains the current input identity');await scope.prepareSelection(current.ref,demand.map(row=>row.city+'|'+row.objectId),signal);}assert.deepEqual(scope.borrow(current.ref,row=>row),current.value);},assertReleased(){assert.equal(store.stats.leases,0,'no resource lease survives rollback or destruction');assert.equal(store.stats.valueCells,0,'rollback clears the parsed resource cell');for(const scope of scopes){assert.equal(scope.stats.pins,0);assert.equal(scope.stats.disposed,true);assert.throws(()=>scope.borrow(catalogs[0].ref,row=>row),{name:'AbortError'});}for(const lease of leases){assert.throws(()=>lease.borrow(row=>row),/Frozen data lease was released/);assert.throws(()=>lease.retain(),/Frozen data lease was released/);}}};
}
const managerDataDemand=Object.assign({},...['city/safety/city-data-metadata.ts','delegated500/safety/delegated500-data-demand.ts'].map(relative=>evaluate(read('painted/'+relative),{})));
// Synthetic planners have no registered model resources. Keep the real scoped
// dispatch and cancellation checks without importing Bremen's model modules.
const recipeStagesAst=ts.createSourceFile('bremen-recipe-stages.ts',read('painted/bremen/safety/bremen-recipe-stages.ts'),ts.ScriptTarget.Latest,true);
const demandAst=ts.createSourceFile('bremen-recipe-demand.ts',read('painted/bremen/safety/bremen-recipe-demand.ts'),ts.ScriptTarget.Latest,true);
const demandContext=demandAst.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='withBremenRecipeDemand');assert(demandContext);
const recipeStages=evaluate('let activeBatch;\n'+demandContext.getText(demandAst)+'\n'+recipeStagesAst.statements.filter(n=>ts.isFunctionDeclaration(n)&&['bremenScopedCall','selectBremenResources','prepareBremenFunctions'].includes(n.name?.text)).map(n=>n.getText(recipeStagesAst)).join('\n'),{calls:new Map(),localMaterialCalls:new Map(),infillCalls:new Map()});
const viewportRequest=fs.existsSync(src('safety/viewport-request.ts'))?evaluate(read('safety/viewport-request.ts'),{}):{};
const emptyPlan=()=>({hiddenOutlines:[],groups:[],errors:[],held:[]});
const selection=candidates=>({candidates,requiredLeafIds:[],protectedCacheKeys:[],budgets:{maxVisible:128,maxBytes:8388608,vertexCap:200000,retainedCap:1e6,maxCache:24,maxCacheBytes:12582912,cacheRetainedCap:1e6},active:false,ready:true,complete:true,diagnostic:()=>undefined,viewportRows:(_all,rows)=>rows,priority:()=>0,note(){},reserveAfter:()=>({vertices:0,bytes:0}),completeInSource:()=>true,applySource:rows=>rows,sourceRows:rows=>rows,atomicRows:rows=>rows});
const ENSURE='{signal.throwIfAborted();if(!renderer){renderer=__fixture.renderer;options.onRenderer?.(renderer);}if(!manifest){manifest=__fixture.manifest;manifestSHA="fixture-index";boundary=__fixture.boundary;}}';
// shard: the fixture leaf read (failure injection) runs first under the request
// signal; the manager's own shard body then takes the leaf from its page-store
// source leases, produced through the fixture native source client.
const SHARD_READ='await __fixture.read(s,signal);current(signal,revision);';
// Imported planners on the owners' own source production path: no fixture leaf
// has an owner patch, shadow admission or material/owner route.
// bulk70PreimportRows is the Bremen manager's actual module-level row builder.
const sourcePlanners={ownerShapePatchProfile:()=>undefined,shadowAdmissionForDecodedShard:()=>undefined,prepareInlineCityMaterials:async()=>{},prepareC358MaterialBinding:async()=>{},prepareC358MaterialModule:async()=>{},bindC358MaterialRows:()=>{},prepareNonBerlinOwnerRoutes:async()=>{},prepareBremenInfillOwnerRouteModules:async()=>{},prepareInfillFrankfurtLowOfficeBulk70Reconstruction:async()=>{},bulk70PreimportRows};
// The actual owner factory: requestMode, visible/commit, drawn() and its
// shared readiness helper, moveCamera, rollback and resume are executed as written.
// Only manifest/shard reads, renderer construction and geometry planners are fixtures.
function realProvider(provider,{city,ready,preparing,failure,store=runtime.createPageResources().store}){
 const filename=src(`painted/${provider}/safety/three-dimensional-map.ts`),text=fs.readFileSync(filename,'utf8'),ast=ts.createSourceFile(filename,text,ts.ScriptTarget.Latest,true);
 const owners=collect(ast,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='installThreeDimensionalMap');assert.equal(owners.length,1,provider);
 const owner=owners[0],start=owner.getStart(ast),edits=[];
 for(const name of ['ensure','shard']){const nodes=collect(owner,n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(nodes.length,1,provider+' '+name);if(name==='ensure')edits.push([nodes[0].body.getStart(ast),nodes[0].body.end,ENSURE]);else edits.push([nodes[0].body.getStart(ast)+1,nodes[0].body.getStart(ast)+1,SHARD_READ]);}
 let source=text.slice(start,owner.end);for(const [a,b,body] of edits.sort((x,y)=>y[0]-x[0]))source=source.slice(0,a-start)+body+source.slice(b-start);
 const deadlines=[],component={city,objectId:'osm/way/'+provider,partId:'osm/way/'+provider+'/component/fixture',origin:[11.575,48.135],componentGeometry:{type:'Polygon',coordinates:[[[11.57,48.13],[11.58,48.13],[11.575,48.14],[11.57,48.13]]]},sourceFeature:{properties:{}},batches:[{positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array(9),indices:new Uint16Array([0,1,2])}]};
 const rows=[component],resources=tinyResource(provider,component,store),scopes=resources.scopes,nativeSources=createFixtureNativeSources({store,city,owner:provider,rows:()=>rows});let enabled=false,loaded=[],generation=0,readError,residentScope,releaseResidentScope,pendingDataSignal,renderMap;
 // This renderer publishes at setBatches; a candidate the owner cancels after a
 // failed draw is recorded and the owner's own rollback clears its rows.
 const cancelledCandidates=[];
 const createBatchScope=()=>resources.createScope();
 const clearResidentScope=()=>{const release=releaseResidentScope;releaseResidentScope=undefined;residentScope=undefined;release?.();};
 const renderer={layer:{id:'fixture-'+provider},setBatches(next,g,...args){const prepared=['city','delegated500','root500','tier300','infill','bremen'].includes(provider)?args.at(-1):undefined,release=next.length&&prepared?.scope&&residentScope!==prepared.scope?prepared.scope.retain():undefined;loaded=next;generation=g;if(release){clearResidentScope();residentScope=prepared.scope;releaseResidentScope=release;}else if(!next.length)clearResidentScope();if(prepared?.signal===pendingDataSignal||!next.length)pendingDataSignal=undefined;renderMap.triggerRepaint();},async prepareBatches(next,signal,wait,_admission,providedScope,demand,...trailing){signal.throwIfAborted();let chunkDependencies=runtime.retainRendererChunkInput(provider==='root500'?demand:['infill','bremen'].includes(provider)?trailing[0]:['city','tier300','delegated500'].includes(provider)?providedScope:provider==='church'?wait:undefined);if(provider==='church'){let released=false;const release=()=>{if(released)return;released=true;signal.removeEventListener('abort',release);const held=chunkDependencies;chunkDependencies=undefined;held?.release();};signal.addEventListener('abort',release,{once:true});return{input:next,signal,get chunkInput(){return chunkDependencies;},releaseChunkDependencies:release,release};}if(!['city','delegated500','infill','tier300'].includes(provider)){assert(wait===undefined||typeof wait==='function','third prepareBatches argument is the initialization wait');if(provider==='bremen')assert(providedScope,'Bremen commit provides its batch scope');else assert(providedScope===undefined||Array.isArray(providedScope),'root500 fifth argument is optional demand; the renderer owns its scope');}if(provider==='tier300'){assert(wait&&typeof wait.prepareSelection==='function','Tier300 supplies its real batch scope');assert(next.every(row=>_admission?.includes(row)),'Tier300 forwards every merged input in its demand');pendingDataSignal=signal;}else if(['city','delegated500'].includes(provider)){assert(wait&&typeof wait.prepareSelection==='function',provider+' supplies its real batch scope');assert(Array.isArray(_admission),provider+' supplies complete manager demand');assert(next.every(row=>_admission.some(identity=>identity.city===row.city&&identity.objectId===row.objectId&&identity.partId===row.partId)),provider+' forwards every merged input in its demand');pendingDataSignal=signal;}const suppliedDemand=provider==='root500'?providedScope:['infill','bremen'].includes(provider)?demand:_admission;if(suppliedDemand!==undefined&&['root500','infill','bremen'].includes(provider)){assert(Array.isArray(suppliedDemand),provider+' forwards its declared demand');assert(next.every(row=>suppliedDemand.some(identity=>identity.city===row.city&&identity.objectId===row.objectId&&identity.partId===row.partId)),provider+' preserves every input identity in demand');}const scope=provider==='root500'?createBatchScope():['city','delegated500','infill','tier300'].includes(provider)?wait:providedScope??createBatchScope();assert.equal(scope.stats.disposed,false);try{await resources.prepare(scope,signal,suppliedDemand);signal.throwIfAborted();}catch(error){chunkDependencies?.release();if(pendingDataSignal===signal)pendingDataSignal=undefined;if(provider==='root500')scope.release();throw error;}let preparedReleased=false;const prepared={identity:provider+':fixture',city:component.city,signal,input:next,source:next,sourceLoaded:new Map(next.map(row=>[row.objectId+'|'+row.partId,row])),sourceComponents:next,displayComponents:next,components:next,reconstructed:{components:next,stats:{components:next}},stats:{components:next},originalSourceVertices:3,originalSourceIndices:3,sourceVertices:3,sourceIndices:3,scope,programPlan:{release(){}},chunkInput:chunkDependencies,releaseChunkDependencies(){chunkDependencies?.release();},refreshChunkInput(input){signal.throwIfAborted();if(scope.stats.disposed)throw new DOMException('Fixture prepared source is unavailable','AbortError');const next=runtime.retainRendererChunkInput(input),previous=chunkDependencies;chunkDependencies=next;prepared.chunkInput=next;previous?.release();},release:()=>{chunkDependencies?.release();if(provider==='city'){if(preparedReleased)return;preparedReleased=true;if(pendingDataSignal===signal)pendingDataSignal=undefined;renderMap.triggerRepaint();}else scope.release();}};return prepared;},setEnabled(value){if(value===enabled)return;enabled=value;renderMap.triggerRepaint();},isPickReady:()=>enabled&&ready()&&(!pendingDataSignal||pendingDataSignal.aborted),getDrawReadiness:()=>({ready:enabled&&ready()&&(!pendingDataSignal||pendingDataSignal.aborted),preparing:preparing()||!!pendingDataSignal&&!pendingDataSignal.aborted,failure:failure()}),getReadinessDiagnostic:()=>({ready:enabled&&ready()&&(!pendingDataSignal||pendingDataSignal.aborted)}),getFrozenF231Metadata547:()=>[],get residentVertexCount(){return loaded.length*3;},getRevision:()=>({generation,viewRevision:0}),getSourceComponent:()=>loaded[0],getSurfaceComponent:()=>undefined,suspendSelection(){},resumeSelection(){},cancelPreparation(signal){if(pendingDataSignal===signal){pendingDataSignal=undefined;renderMap.triggerRepaint();}},cancelCandidate(g){cancelledCandidates.push(g);},setPageHidden(){},setReducedMotion(){},setOpacityContext(){},setSolarShadowBoundary(){},destroy(){loaded=[];clearResidentScope();},diagnosticScreenSamples:()=>[],get stats(){return{};}};
 const borrowFixtureComponent=identity=>identity?loaded.find(row=>row.objectId===identity.objectId&&row.partId===identity.partId):loaded[0];
 Object.assign(renderer,{borrowSourceComponent:borrowFixtureComponent,borrowSurfaceComponent:borrowFixtureComponent,borrowAddedDisplayComponent:()=>undefined,getSourceComponent:identity=>componentReadback.copyBuildingComponentReadback(borrowFixtureComponent(identity)),getSurfaceComponent:identity=>componentReadback.copyBuildingComponentReadback(borrowFixtureComponent(identity)),getComponent:identity=>componentReadback.copyBuildingComponentMetadata(borrowFixtureComponent(identity)),getAddedDisplayComponent:()=>undefined});
 const fixture={renderer,manifest:{source_snapshot:'fixture',source_pbf_sha256:'source',city_boundary:{sha256:'boundary'},compiler_sha256:'compiler',shards:[{id:'fixture-'+provider,tile_key:'fixture-'+provider,sha256:'leaf-'+provider,bytes:100,vertices:3,bbox:[11.5,48.1,11.6,48.2],lod:1}]},boundary:{type:'Polygon',coordinates:[]},async read(_asset,signal){signal.throwIfAborted();if(readError){const error=readError;readError=undefined;throw error;}return rows;}};
 const env={resourceContentKey,...residentReuse,...viewportRequest,...recipeStages,...managerDataDemand,...runtime.managerErrorClasses(),...rendererChunkInputs,...bremenDisplayDerivations,...sourcePlanners,createFrozenDataScope:client=>resources.createScope(client),scopedProgressiveAdmission:()=>undefined,scopedC311HasMaterialBinding:()=>false,scopedC312HasMaterialBinding:()=>false,scopedC313HasMaterialBinding:()=>false,prepareDelegated500Data:async(demand,city,signal,scope,raw)=>{assert.equal(city,component.city);assert(raw.every(row=>demand.some(identity=>identity.city===row.city&&identity.objectId===row.objectId&&identity.partId===row.partId)));assert.deepEqual(managerDataDemand.delegated500DemandClosure(raw).identities,demand);await resources.prepare(scope,signal,demand);},prepareDelegated500Programs:async(demand,city,signal,scope)=>{assert.equal(city,component.city);assert(scope.stats.resources>0,'program preparation uses the already prepared data scope');await resources.prepare(scope,signal,demand);},createBremenOwnerRuntime:()=>({createBatchScope,prepare:async()=>{},clearResident(){},dispose(){}}),scopeOriginal_prepareBremenAcceptedCohortSelection:selection,scopeOriginal_partialGateDisplayPlan:emptyPlan,scopeOriginal_s020RelationOutlineDisplayPlan:emptyPlan,scopeOriginal_s020FullOriginalBatchRouteReady:()=>false,scopeOriginal_progressiveAdmission:()=>undefined,location:{search:'',hostname:'test.invalid'},__fixture:fixture,matchMedia:()=>({matches:false}),pageIsHidden:()=>false,
  // The owner chooses the budget; the recorder only exposes it and fires its timeout.
  visibleReadinessDeadline:(ms,onTimeout,onResume)=>{const d={ms,onTimeout,onResume,cancelled:false};deadlines.push(d);return()=>{d.cancelled=true;};},
  THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:1e6,mobile:1e6},estimateRetainedBuildingPayload:()=>({retainedPayloadEstimateBytes:64}),ownerShapePatchProfiles:()=>[],ownerShapePatchMetadata:()=>({components:[],geometryAdded:0}),ownerShapePatchDisplayRows:r=>r,prepareSourceRoleDisplay:async()=>{},sourceRoleDisplayProfile:()=>undefined,c382BelowgroundDisplayRows:r=>r,modelHeightQuery:()=>({matches:true,verified:true}),viewportComponents:r=>r,componentViewportRecord:()=>({vertices:3}),viewportComponentDistance:()=>0,containsPosition:()=>true,sameStageComponents:(a,b)=>!!a&&a.length===b.length&&a.every((x,i)=>x===b[i]),paintIdentityOwner:()=>provider,createS434AggregateLifecycle:()=>({clear(){},packing:()=>undefined,update(){},get pending(){return false;}}),mergeShadowAdmissions:()=>undefined,shadowAdmissionForVisibleComponents:r=>r,verifiedInteriorSourceHolds:()=>[],progressiveAdmission:()=>undefined,prepareS528FormalDependency:()=>({candidates:r=>r,leafPriority:()=>0,componentPriority:()=>0,assertChosen(){},viewportRows:(_all,rows)=>rows,reserveAfter:()=>({vertices:0,bytes:0})}),s528DependencyCatalog:()=>[],f331CohortViewportRows277:(_all,rows)=>rows,f331CohortProfileSelected277:()=>false};
 // Execute the real helper against the very same deadline recorder as moveCamera.
 // Its preparation/drawing decision and error handling are never stubbed.
 Object.assign(env,evaluate(residentDrawSource,{pageIsHidden:env.pageIsHidden,visibleReadinessDeadline:env.visibleReadinessDeadline}));
 for(const imp of ast.statements.filter(ts.isImportDeclaration))for(const e of imp.importClause?.namedBindings?.elements??[]){const name=e.name.text;if(name in env)continue;if(name.endsWith('VertexReservation'))env[name]=()=>0;else if(name.endsWith('PROFILES'))env[name]=[];else if(name.endsWith('CohortSelection')||name.includes('Residency70')||name==='prepareKOMesseturmSources70')env[name]=selection;else if(/Holds\d+$/.test(name))env[name]=()=>[];else if(/Plan\d+$/.test(name))env[name]=emptyPlan;else if(name.startsWith('supplement'))env[name]=r=>r;else if(name.endsWith('DisplayPlan')||name.endsWith('CofacePlan')||name.endsWith('ConnectorPlan')||name.endsWith('CrownPlan'))env[name]=emptyPlan;else if(name.endsWith('ParentReadiness'))env[name]=()=>({active:false,ready:true,entries:new Map()});else env[name]=()=>{throw Error('unisolated domain helper: '+name);};}
 const install=evaluate(source,env).installThreeDimensionalMap;
 return{install:options=>{renderMap=options.map;assert(options.resourceStore===undefined||options.resourceStore===store,'the owner receives the page store of its Frozen and source fixtures');return install({...options,resourceStore:store,nativeSources,frozenData:resources.client});},deadlines,scopes,resources,get enabled(){return enabled;},get loaded(){return loaded;},get residentScope(){return residentScope;},get generation(){return generation;},get pendingPreparationSignal(){return pendingDataSignal;},failNextRead(error){readError=error;},
  fire(ms){const due=deadlines.filter(d=>d.ms===ms&&!d.cancelled);for(const d of due){d.cancelled=true;d.onTimeout();}return due.length;}};
}
// Plain owners for the remaining providers; hooks model a late completion that
// ignores cancellation and a rollback that is still pending.
function stubProvider(options,hooks={}){
 let mode='2d',wantedMode='2d',lateUsed=false,rollbackUsed=false;
 return{
  async requestMode(next,signal){
   wantedMode=next;signal.throwIfAborted();
   if(next==='3d'&&hooks.late&&!lateUsed){lateUsed=true;hooks.late.started=true;await hooks.late.gate.promise;mode='3d';options.onState?.({mode,status:'ready'});return{mode,status:'ready'};}
   if(next==='2d'&&hooks.rollback&&!rollbackUsed&&mode==='3d'){rollbackUsed=true;hooks.rollback.started=true;await hooks.rollback.gate.promise;signal.throwIfAborted();}
   await tick();signal.throwIfAborted();mode=next;options.onState?.({mode,status:'ready'});return{mode,status:'ready'};
  },
  get mode(){return mode;},get wantedMode(){return wantedMode;},get renderer(){return undefined;},
  cacheStats:()=>({mode,wantedMode}),destroy(){},suspend(){return false;},resume(){},setPageHidden(){},setViewportVisible(){},setReducedMotion(){},setOpacityContext(){},
 };
}

// main.ts: the real onState, controls requestMode and notice retry callbacks and
// the two functions they call, evaluated against this page's live bindings.
const mainText=read('safety/main.ts'),mainAst=ts.createSourceFile('main.ts',mainText,ts.ScriptTarget.Latest,true);
function mainFunction(name){const nodes=mainAst.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(nodes.length,1,'actual main.ts function '+name);return nodes[0].getText(mainAst);}
function mainOption(callee,property){const found=collect(mainAst,n=>ts.isCallExpression(n)&&n.expression.getText(mainAst)===callee&&!!n.arguments[0]&&ts.isObjectLiteralExpression(n.arguments[0])).flatMap(c=>c.arguments[0].properties.filter(p=>ts.isPropertyAssignment(p)&&p.name.getText(mainAst)===property));assert.equal(found.length,1,'actual main.ts '+callee+' '+property);return found[0].initializer.getText(mainAst);}
// An option may name a top-level main.ts function (the controls now pass
// requestThreeDimensionalMode) instead of an inline arrow; that actual function
// is evaluated against the same live bindings.
function mainGlue(live){
 const options=[['onState','installThreeDimensionalMap','onState'],['requestMode','installThreeDimensionalControls','requestMode'],['onRetryThreeD','mountMapRecoveryNotice','onRetryThreeD']].map(([key,callee,property])=>[key,mainOption(callee,property)]);
 const named=options.map(([,text])=>text).filter(text=>/^[A-Za-z_$][\w$]*$/.test(text));
 return evaluate([mainFunction('reportThreeDimensionalState'),mainFunction('retryThreeDimensionalMap'),...named.map(mainFunction),...options.map(([key,text])=>'exports.'+key+'='+text+';')].join('\n'),live);
}

async function page(t,{city='munich',slow='church',locale='zh',withPage=true,stubs={},cameraEvents=false,preparing=false}={}){
 const record=installPage(t);
 const view={bounds:[11.55,48.12,11.6,48.15],zoom:16,bearing:-25,pitch:0,fov:36.87,center:{lng:11.5755,lat:48.1374},moving:false},canvas={width:1000,height:600,clientWidth:1000,clientHeight:600};
 const camera=[],handlers=new Map();
 const map={on(e,fn){if(!handlers.has(e))handlers.set(e,new Set());handlers.get(e).add(fn);},off(e,fn){handlers.get(e)?.delete(fn);},emit(e){for(const fn of [...handlers.get(e)??[]])fn();},
  getBounds:()=>({getWest:()=>view.bounds[0],getSouth:()=>view.bounds[1],getEast:()=>view.bounds[2],getNorth:()=>view.bounds[3]}),getCenter:()=>({...view.center}),getZoom:()=>view.zoom,getBearing:()=>view.bearing,getPitch:()=>view.pitch,getVerticalFieldOfView:()=>view.fov,getCanvas:()=>canvas,isMoving:()=>view.moving,getRoll:()=>0,getCenterElevation:()=>0,getProjection:()=>({type:'mercator'}),getPadding:()=>({top:0,right:0,bottom:0,left:0}),
  getLayer:()=>false,addLayer(){},removeLayer(){},triggerRepaint(){queueMicrotask(()=>map.emit('render'));},getStyle:()=>({layers:[]}),
  stop(){camera.push(['stop']);},easeTo(options){camera.push(['easeTo',{...options}]);const ownMove=cameraEvents&&options.pitch>0;if(ownMove){view.moving=true;map.emit('movestart');}for(const k of ['pitch','center','zoom','bearing'])if(k in options)view[k]=options[k];if(ownMove)queueMicrotask(()=>{view.moving=false;map.emit('moveend');});},
  jumpTo(o){camera.push(['jumpTo',o]);},flyTo(o){camera.push(['flyTo',o]);},setCenter(o){camera.push(['setCenter',o]);},setZoom(o){camera.push(['setZoom',o]);},setBearing(o){camera.push(['setBearing',o]);},setPitch(o){camera.push(['setPitch',o]);}};
 const readiness=new Map([[slow,false]]),preparations=new Map([[slow,preparing]]),failures=new Map(),real=new Map(),managers=new Map(),calls=new Map();
 globalThis[providerKey]=(provider,options)=>{
  let manager;if(provider==='city'||provider===slow){const owner=realProvider(provider,{city,ready:()=>readiness.get(provider)??true,preparing:()=>preparations.get(provider)??false,failure:()=>failures.get(provider),store:options.resourceStore});real.set(provider,owner);manager=owner.install(options);}else manager=stubProvider(options,stubs[provider]);
  const count={'2d':0,'3d':0},requestMode=manager.requestMode;manager.requestMode=(next,signal)=>{count[next]++;return requestMode(next,signal);};
  managers.set(provider,manager);calls.set(provider,count);return manager;
 };
 t.after(()=>{delete globalThis[providerKey];});
 const states=[],loads=[];
 const live={mapGPUUnavailable:false,mapRecoveryNotice:undefined,threeDimensionalControls:undefined,threeDimensional:undefined,
  building3dInteraction:{suspended:0,resumed:0,suspend(){this.suspended++;},resume(){this.resumed++;}},threeDimensionalRecovery:{retry(){}},threeDimensionalPreparation:undefined,ensureBuildingInformation:async()=>{},dedicatedAppearance:{retry(){}},
  sceneControls:{setMode(){}},threeDimensionalScenery:{setMode(){}},syncEnvironmentMode(){},buildingSolarShadow:{setMode(){}},localPalaceGarden:undefined,syncDedicatedAppearanceMode(){},
  selected:{type:'report',ids:['fixture-report']},period:'2026-10',category:'gewalt'};
 const glue=withPage?mainGlue(live):undefined;
 const host=new Element('controls'),filters=new Element('mobile-filter-content'),dimensions=new Element('geography-dimensions');host.append(filters);
 if(withPage)live.mapRecoveryNotice=notice.mountMapRecoveryNotice({host,locale,onReports(){record.reports=(record.reports??0)+1;},onRetry(){record.gpuRetries=(record.gpuRetries??0)+1;},onRetryThreeD:glue.onRetryThreeD});
 const lazy=live.threeDimensional=installLazy({map,city,mobile:false,resourceStore:runtime.createPageResources().store,fetchBytes:async()=>{throw Error('network forbidden');},onState:state=>{states.push(state);glue?.onState(state);}},async()=>{loads.push(1);return{installThreeDimensionalMap:installCompositor};});
 if(withPage)live.threeDimensionalControls=installThreeDimensionalControls({host:dimensions,noticeHost:filters,statusHost:host,locale,requestMode:glue.requestMode});
 t.after(async()=>{live.threeDimensionalControls?.destroy();lazy.destroy();live.mapRecoveryNotice?.destroy();await settle(2);for(const [provider,owner]of real){for(const scope of owner.scopes){assert.equal(scope.stats.pins,0,provider+' releases every batch pin on destroy');assert.equal(scope.stats.disposed,true,provider+' releases preparation ownership on destroy');}owner.resources.assertReleased();}});
 const n=withPage?host.children[0]:undefined,group=live.threeDimensionalControls?.element.children[0],feedback=filters.children.find(c=>c.className==='three-dimensional-feedback');
 return{record,view,camera,map,readiness,preparing:preparations,failures,real,managers,calls,states,loads,live,lazy,host,filters,
  notice:n&&{root:n,message:n.children[0],reports:n.children[1],retry:n.children[2],retryThreeD:n.children[3]},flat:group?.children[0],three:group?.children[1],controlsStatus:feedback?.children[0],controlsRetry:feedback?.children[1],
  get controls(){return live.threeDimensionalControls.state;},
  threeDCalls:()=>Object.fromEntries([...calls].map(([p,c])=>[p,c['3d']])),deadlineCount:()=>[...real.values()].reduce((n,o)=>n+o.deadlines.length,0),
  budgets:provider=>real.get(provider).deadlines.map(d=>d.ms),
  waitDeadline:async(provider,ms)=>{
   await until(()=>real.get(provider)?.deadlines.some(d=>d.ms===ms&&!d.cancelled),provider+' '+ms+' ms readiness deadline');
   if(['city','delegated500'].includes(provider)){
    const owner=real.get(provider),nonemptyScope=()=>owner.scopes.some(scope=>!scope.stats.disposed&&(scope.stats.pending>0||scope.stats.resources>0));
    // These managers start the absolute draw budget before asynchronous data
    // preparation. Observe its real read, without moving or recreating that budget.
    await until(()=>owner.resources.stats.reads>0&&nonemptyScope(),provider+' real resource probe read');
    assert(nonemptyScope(),'readiness observes a nonempty pending or resident resource scope');
   }else if(['root500','tier300','infill','bremen'].includes(provider)){
    // Their commit also starts the absolute draw budget before its asynchronous
    // Frozen preparation, which now acquires through the page store; observe the
    // resident scope within that same pending budget (it is never fired here).
    await until(()=>real.get(provider).resources.stats.leases>0,provider+' resident resource scope');
    assert(real.get(provider).resources.stats.leases>0,'readiness observes a nonempty resident resource scope');
    assert(real.get(provider).deadlines.some(d=>d.ms===ms&&!d.cancelled),provider+' observes the scope inside its pending '+ms+' ms budget');
   }
  },
  cameraView:()=>({center:{...view.center},zoom:view.zoom,bearing:view.bearing})};
}
const MOVES=['jumpTo','flyTo','setCenter','setZoom','setBearing','setPitch'];

for(const {city,slow,budget} of [{city:'munich',slow:'church',budget:15000},{city:'frankfurt',slow:'infill',budget:8000},{city:'bremen',slow:'delegated500',budget:15000}])
 test(`compositor ${city}: the ${slow} explicit renderer failure after the ${budget} ms observation threshold rolls every owner back to 2D once, reports the fallback and keeps 2D wanted`,async t=>{
  const p=await page(t,{city,slow,withPage:false,preparing:true});
  const request=p.lazy.requestMode('3d',new AbortController().signal);
  await p.waitDeadline(slow,budget);await settle();
  const started=p.real.get(slow).deadlines.slice();
  if(slow==='infill')assert.equal(p.managers.get(slow).getDrawReadinessDiagnostic().stage,'preparing');
  p.preparing.set(slow,false);p.map.emit('render');await settle();
  assert.deepEqual(p.real.get(slow).deadlines,started,'preparation and drawing share the original absolute visible deadline');
  assert(started.some(d=>d.ms===budget&&!d.cancelled),'leaving preparation does not cancel the original deadline');
  if(slow==='infill')assert.equal(p.managers.get(slow).getDrawReadinessDiagnostic().stage,'drawing');
  // Budgets are the owners' own and unchanged: city camera 2 s and draw 15 s,
  // the slow owner counts preparation and drawing in its original draw budget.
  assert.deepEqual(p.budgets(slow).filter(ms=>ms!==budget),[]);
  assert(p.budgets('city').includes(2000)&&p.budgets('city').every(ms=>ms===2000||ms===15000),JSON.stringify(p.budgets('city')));
  assert.equal(p.lazy.mode,'3d','the city owner reached 3D before the supplement timed out');
  const view=p.cameraView(),moves=p.camera.length;
  assert.deepEqual(p.camera,[['easeTo',{pitch:45,duration:300}]]);
  assert(p.real.get(slow).fire(budget)>0);await settle();assert.equal(p.states.filter(s=>s.fallback).length,0,'crossing the threshold does not roll back');p.failures.set(slow,'Fixture terminal draw failure');p.map.emit('render');
  await assert.rejects(request,/Fixture terminal draw failure/);await settle();
  const fallback={reason:'error',provider:slow};
  assert.deepEqual(p.states.filter(s=>s.status==='error'),[{mode:'2d',status:'error',fallback}],'one explicit fallback, published after the rollback');
  assert.deepEqual(p.states.at(-1),{mode:'2d',status:'error',fallback});
  assert.equal(p.lazy.mode,'2d');assert.equal(p.lazy.wantedMode,'2d','the failed 3D request is no longer wanted');
  if(slow==='infill'){const cached=p.managers.get(slow).getDrawReadinessDiagnostic();assert.equal(cached.phase,'error');assert.equal(cached.stage,'drawing');assert.equal(cached.reason,'Error: Fixture terminal draw failure');assert(Number.isFinite(cached.recordedAtMs));assert.equal(cached.performanceTimeOriginMs,performance.timeOrigin);assert(p.lazy.getManagerDrawReadiness().some(row=>row.provider===slow&&row.record.recordedAtMs===cached.recordedAtMs));}
  assert.deepEqual(p.lazy.cacheStats().threeDFallback,fallback);
  for(const [provider,manager] of p.managers){assert.equal(manager.mode,'2d',provider);assert.equal(manager.wantedMode,'2d',provider);}
  for(const [provider,owner] of p.real){assert.equal(owner.enabled,false,provider+' renderer disabled');owner.resources.assertReleased();}
  // Camera: only the 2D pitch reset; centre, zoom and bearing stay where the user is.
  assert.deepEqual(p.camera.slice(moves),[['stop'],['easeTo',{pitch:0,duration:220}]]);assert.deepEqual(p.cameraView(),view);assert(!p.camera.some(([k])=>MOVES.includes(k)));
  // A later ordinary or context-only resume (pageshow, GPU restore) must not reissue it.
  const calls=p.threeDCalls(),deadlines=p.deadlineCount(),count=p.states.length;
  p.lazy.suspend();p.lazy.resume();await settle();await new Promise(resolve=>setTimeout(resolve,80));
  p.lazy.suspend({contextRecovery:true});p.lazy.resume({contextRecovery:true});await settle();await new Promise(resolve=>setTimeout(resolve,80));
  assert.deepEqual(p.threeDCalls(),calls,'no owner receives a new 3D request after resume');assert.equal(p.deadlineCount(),deadlines,'no owner starts a new 3D readiness wait');
  assert.equal(p.lazy.mode,'2d');assert.equal(p.lazy.wantedMode,'2d');assert(!p.states.slice(count).some(s=>s.mode==='3d'));
  assert.deepEqual(p.camera.slice(moves),[['stop'],['easeTo',{pitch:0,duration:220}]]);
  const diagnostic=p.lazy.cacheStats(),failure=p.lazy.getDrawReadinessSnapshot().failure;
  assert(failure,'ordinary/BFcache suspension did not accept a context recovery baseline');
  assert.equal(p.lazy.beginContextRecovery(),true,'lazy forwards a completed fallback to the actual compositor');
  assert.equal(p.lazy.getDrawReadinessSnapshot().ready,true);assert.equal(p.lazy.getDrawReadinessSnapshot().failure,undefined);
  assert.strictEqual(p.lazy.cacheStats().threeDFallback,diagnostic.threeDFallback);assert.equal(p.lazy.cacheStats().lastError,diagnostic.lastError);
 });

for(const {city,slow,budget} of [{city:'munich',slow:'church',budget:15000},{city:'frankfurt',slow:'infill',budget:8000}])
test(`compositor ${slow}: slow preparation continues past ${budget} ms and eventually succeeds`,async t=>{
 const p=await page(t,{city,slow,withPage:false,preparing:true});
 const request=p.lazy.requestMode('3d',new AbortController().signal);
 await p.waitDeadline(slow,budget);await settle();assert(p.real.get(slow).fire(budget)>0);await settle();
 assert.equal(p.states.filter(s=>s.fallback).length,0);assert.equal(p.lazy.wantedMode,'3d');
 p.preparing.set(slow,false);p.readiness.set(slow,true);p.map.emit('render');await request;
 assert.equal(p.lazy.mode,'3d');assert.equal(p.lazy.wantedMode,'3d');
 const diagnostic=p.managers.get(slow).getDrawReadinessDiagnostic();assert.equal(diagnostic.phase,'ready');assert(diagnostic.threshold);assert.equal(diagnostic.threshold.continuing,false);
});

test('compositor infill: a renderer preparation failure rejects immediately with its actual reason',async t=>{
 const p=await page(t,{city:'frankfurt',slow:'infill',withPage:false,preparing:true}),reason='Fixture shader compilation failed';
 const request=p.lazy.requestMode('3d',new AbortController().signal),failed=assert.rejects(request,error=>error.message===reason);
 await p.waitDeadline('infill',8000);await settle();
 p.failures.set('infill',reason);p.map.emit('render');await failed;await settle();
 assert(p.real.get('infill').deadlines.every(d=>d.cancelled),'failure settles without firing or extending the readiness deadline');
 const cached=p.managers.get('infill').getDrawReadinessDiagnostic();
 assert.equal(cached.phase,'error');assert.equal(cached.stage,'preparing');assert.equal(cached.reason,'Error: '+reason);
 assert.deepEqual(cached.renderer,{ready:false});
 assert.deepEqual(p.states.filter(s=>s.fallback),[{mode:'2d',status:'error',fallback:{reason:'error',provider:'infill'}}]);
 assert.equal(p.lazy.mode,'2d');assert.equal(p.lazy.wantedMode,'2d');
});

test('tier300: an actual pending candidate failure releases its scope and preserves the previous resident batch',async t=>{
 const view={bounds:[11.55,48.12,11.6,48.15],center:{lng:11.5755,lat:48.1374}},canvas={width:1000,height:600,clientWidth:1000,clientHeight:600},handlers=new Map(),states=[];
 const map={on(event,callback){if(!handlers.has(event))handlers.set(event,new Set());handlers.get(event).add(callback);},off(event,callback){handlers.get(event)?.delete(callback);},emit(event){for(const callback of [...handlers.get(event)??[]])callback();},getBounds:()=>({getWest:()=>view.bounds[0],getSouth:()=>view.bounds[1],getEast:()=>view.bounds[2],getNorth:()=>view.bounds[3]}),getCenter:()=>view.center,getZoom:()=>16,getBearing:()=>0,getPitch:()=>45,getVerticalFieldOfView:()=>36.87,getCanvas:()=>canvas,isMoving:()=>false,getLayer:()=>false,removeLayer(){},triggerRepaint(){queueMicrotask(()=>map.emit('render'));},getStyle:()=>({layers:[]})};
 let candidateFailure;const owner=realProvider('tier300',{city:'munich',ready:()=>true,preparing:()=>false,failure:()=>candidateFailure}),manager=owner.install({map,city:'munich',mobile:false,manageCamera:false,fetchBytes:async()=>{throw Error('network forbidden');},onState:state=>states.push(state)});
 let gate;t.after(async()=>{manager.destroy();gate?.release.resolve();await settle(2);owner.resources.assertReleased();owner.resources.client.dispose();});
 await manager.requestMode('3d',new AbortController().signal);
 const previous={rows:owner.loaded,scope:owner.residentScope,generation:owner.generation,pins:owner.residentScope.stats.pins};
 assert(previous.rows.length>0);assert.equal(previous.scope.stats.ownerReleased,true);assert(previous.pins>0);assert(manager.renderer.isPickReady());
 gate=owner.resources.blockNextPreparation();view.bounds[0]+=.001;map.emit('movestart');map.emit('resize');map.emit('moveend');await until(()=>gate.signal!==undefined,'Tier300 pending candidate resource read');
 const candidate=owner.scopes.at(-1),preparationSignal=owner.pendingPreparationSignal;assert.notEqual(candidate,previous.scope);assert.equal(candidate.stats.pending,1);assert.equal(candidate.stats.resources,0);assert.equal(owner.loaded,previous.rows);assert.equal(preparationSignal.aborted,false);
 await until(()=>owner.deadlines.some(deadline=>deadline.ms===15000&&!deadline.cancelled),'Tier300 15000ms readiness deadline');assert(owner.deadlines.every(deadline=>deadline.ms===15000));assert(owner.fire(15000)>0);await settle();assert.equal(preparationSignal.aborted,false);gate.release.reject(Error('Fixture pending candidate failed'));map.emit('render');
 await until(()=>candidate.stats.disposed&&states.some(state=>state.mode==='3d'&&state.status==='error'),'Tier300 candidate timeout cleanup');await settle();
 assert.deepEqual(candidate.stats,{resources:0,pending:0,pins:0,ownerReleased:true,disposed:true});assert.equal(gate.signal.aborted,false,'the catalog read already failed; this is not timeout cancellation');assert(states.some(state=>state.status==='error'));
 assert.equal(owner.residentScope,previous.scope);assert.equal(owner.loaded,previous.rows);assert.equal(owner.generation,previous.generation);assert.equal(previous.scope.stats.disposed,false);assert.equal(previous.scope.stats.pins,previous.pins);assert(manager.renderer.isPickReady(),'the old resident becomes pickable after the failed candidate retires');
 assert.equal(owner.resources.stats.valueCells,1);assert.equal(owner.resources.stats.leases,1);assert.equal(owner.resources.stats.active,0);assert.equal(owner.resources.stats.waiters,0);
 assert.equal(manager.mode,'3d');assert.equal(manager.wantedMode,'3d');
 gate.release.resolve();await settle();assert.equal(owner.loaded,previous.rows);assert.equal(owner.generation,previous.generation,'late cancelled input cannot publish a new batch');
});

test('page: the actual failure fallback is explained once in the recovery notice while the controls keep the usable 2D map',async t=>{
 const p=await page(t);
 p.three.onclick();
 await p.waitDeadline('church',15000);
 assert.deepEqual(p.controls,{mode:'2d',status:'loading'});assert.equal(p.notice.root.hidden,true);
 const view=p.cameraView(),moves=p.camera.length,selected=p.live.selected,urls=p.record.urls.length;
 p.real.get('church').fire(15000);p.failures.set('church','Fixture terminal draw failure');p.map.emit('render');
 await until(()=>!p.notice.root.hidden,'fallback notice');await settle();
 // Notice: explicit copy, perceivable status, one keyboard-operable retry.
 assert.equal(p.notice.root.dataset.state,'three-d-fallback');
 assert.equal(p.notice.message.textContent,COPY.zh.message);
 assert.equal(p.notice.message.attrs.role,'status');assert.equal(p.notice.message.attrs['aria-live'],'polite');
 assert.equal(p.notice.retryThreeD.tag,'button');assert.equal(p.notice.retryThreeD.type,'button');assert.equal(p.notice.retryThreeD.textContent,COPY.zh.retry);
 assert.equal(p.notice.retryThreeD.hidden,false);assert.equal(p.notice.retryThreeD.disabled,false);
 assert.equal(p.notice.reports.hidden,true);assert.equal(p.notice.retry.hidden,true,'not the GPU reload path');
 assert.equal(p.host.children[0],p.notice.root,'top of the controls column, outside the collapsible filters');
 // Controls: the usable 2D view, no duplicate generic error or second retry.
 assert.deepEqual(p.controls,{mode:'2d',status:'ready'});assert.equal(p.controlsStatus.textContent,'');assert.equal(p.controlsRetry.hidden,true);
 assert.equal(p.three.disabled,false);assert.equal(p.flat.disabled,false);assert.equal(p.three.attrs['aria-pressed'],'false');
 assert.equal(p.states.filter(s=>s.fallback).length,1);
 // Camera, period, filters and selection: no reload or recovery snapshot, only the 2D pitch reset.
 assert.deepEqual(p.camera.slice(moves),[['stop'],['easeTo',{pitch:0,duration:220}]]);assert.deepEqual(p.cameraView(),view);assert(!p.camera.some(([k])=>MOVES.includes(k)));
 assert.equal(p.record.reloads,0);assert(!p.record.urls.some(url=>url.includes('#cm-map-retry=')));
 const url=new URL(p.record.urls.at(-1));assert.equal(url.searchParams.get('view'),null);assert.equal(url.searchParams.get('month'),'2026-10');assert.equal(url.searchParams.get('lang'),'zh');
 assert(p.record.urls.length>urls);assert.equal(p.live.selected,selected);assert.deepEqual(p.live.selected,{type:'report',ids:['fixture-report']});
 assert.equal(p.live.period,'2026-10');assert.equal(p.live.category,'gewalt');
 assert.equal(p.live.building3dInteraction.suspended,1,'3D building picking is suspended as for any 2D view');
});

test('page: "Retry 3D" re-requests 3D in place through the controls ticket, keeps focus and only tilts the camera',async t=>{
 const p=await page(t);
 p.three.onclick();await p.waitDeadline('church',15000);p.real.get('church').fire(15000);p.failures.set('church','Fixture terminal draw failure');p.map.emit('render');
 await until(()=>!p.notice.root.hidden,'fallback notice');await settle();
 const before=p.threeDCalls(),view=p.cameraView(),moves=p.camera.length;
 p.failures.delete('church');p.readiness.set('church',true);
 p.notice.retryThreeD.onclick();
 assert.equal(p.notice.root.hidden,true,'the notice leaves as the new request starts');
 assert.deepEqual(p.controls,{mode:'2d',status:'loading'});
 assert.equal(globalThis.document.activeElement,p.flat,'focus stays in the mode group while 3D is busy');
 p.notice.retryThreeD.onclick();
 await until(()=>p.controls.status!=='loading','retried 3D request');await settle();
 assert.deepEqual(p.controls,{mode:'3d',status:'ready'});
 assert.equal(p.lazy.mode,'3d');assert.equal(p.lazy.wantedMode,'3d');assert.equal(p.lazy.cacheStats().threeDFallback,undefined);
 assert.equal(p.notice.root.hidden,true);
 for(const [provider,count] of Object.entries(before))assert.equal(p.threeDCalls()[provider],count+1,provider+' receives exactly one new 3D request');
 assert.equal(p.loads.length,1,'the loaded 3D owner is reused');assert.equal(p.record.reloads,0);assert.equal(p.record.gpuRetries,undefined);
 assert.deepEqual(p.camera.slice(moves),[['easeTo',{pitch:45,duration:300}]]);assert.deepEqual(p.cameraView(),view);
 assert.equal(new URL(p.record.urls.at(-1)).searchParams.get('view'),'3d');
 assert.equal(p.live.building3dInteraction.resumed,1);
});

const VIEWPORT_PROVIDERS=[
 {provider:'root500',city:'munich',budget:15000},{provider:'delegated500',city:'bremen',budget:15000},
 {provider:'tier300',city:'munich',budget:15000},{provider:'church',city:'munich',budget:15000},
 {provider:'city',city:'munich',budget:15000},{provider:'infill',city:'frankfurt',budget:8000},{provider:'bremen',city:'bremen',budget:8000},
];
for(const {provider,city,budget} of VIEWPORT_PROVIDERS){
test(`page ${provider}: resize during preparation completes the original 3D intent for the latest viewport`,async t=>{
 const p=await page(t,{city,slow:provider});
 p.three.onclick();await p.waitDeadline(provider,budget);
 const originalCalls=p.threeDCalls();
 // MapLibre.resize emits this sequence when its camera is otherwise stationary.
 for(let view=0;view<3;view++){
  p.map.emit('movestart');p.view.bounds[0]+=.001;p.map.emit('resize');p.map.emit('moveend');await settle();
  assert.equal(p.lazy.wantedMode,'3d');assert.equal(p.notice.root.hidden,true);
  assert.equal(p.controls.status,'loading','an obsolete viewport is not complete quality');
 }
 p.readiness.set(provider,true);p.map.emit('render');
 await until(()=>p.controls.status==='ready','resized 3D request');await settle();
 assert.deepEqual(p.controls,{mode:'3d',status:'ready'});assert.equal(p.lazy.mode,'3d');
 assert.equal(p.states.filter(s=>s.fallback).length,0);
 assert.equal(p.threeDCalls()[provider],originalCalls[provider],'moveend must not spawn a competing mode request');
 for(const [provider,calls] of p.calls){assert.equal(calls['2d'],0,provider+' must not roll back');assert.equal(p.managers.get(provider).mode,'3d');}
 assert.equal(new URL(p.record.urls.at(-1)).searchParams.get('view'),'3d');
});

test(`page ${provider}: repeated movement waits for moveend, and explicit 2D cancels the pending intent`,async t=>{
 const p=await page(t,{city,slow:provider});
 p.three.onclick();await p.waitDeadline(provider,budget);
 const deadlines=p.deadlineCount(),calls=p.threeDCalls()[provider];
 p.view.moving=true;p.map.emit('movestart');await settle();
 p.view.bounds[0]+=.002;p.map.emit('movestart');await settle();
 assert.equal(p.deadlineCount(),deadlines,'no new preparation while the viewport is still moving');
 assert.equal(p.threeDCalls()[provider],calls);
 p.flat.onclick();await until(()=>p.controls.status==='ready','explicit 2D while awaiting moveend');
 const count=p.states.length;p.readiness.set(provider,true);p.view.moving=false;p.map.emit('moveend');p.map.emit('render');await settle();
 assert.deepEqual(p.controls,{mode:'2d',status:'ready'});assert.equal(p.lazy.wantedMode,'2d');
 assert.equal(p.notice.root.hidden,true);assert(!p.states.slice(count).some(s=>s.mode==='3d'));
 for(const owner of p.real.values())owner.resources.assertReleased();
});

for(const cancel of ['parent abort','destroy'])test(`provider intent ${provider}: ${cancel} settles promptly while waiting for moveend`,async t=>{
 const p=await page(t,{city,slow:provider,withPage:false}),external=new AbortController();
 const request=p.lazy.requestMode('3d',external.signal),rejected=assert.rejects(request,error=>error.name==='AbortError');
 await p.waitDeadline(provider,budget);p.view.moving=true;p.map.emit('movestart');await settle();
 if(cancel==='destroy')p.lazy.destroy();else external.abort();
 await rejected;const count=p.states.length,deadlines=p.real.get(provider).deadlines.length;
 p.readiness.set(provider,true);p.view.moving=false;p.map.emit('moveend');p.map.emit('render');await settle();
 assert.equal(p.states.filter(s=>s.fallback).length,0);
 assert.equal(p.real.get(provider).deadlines.length,deadlines,'a later moveend cannot restart the cancelled provider');
 if(cancel==='destroy')assert.equal(p.states.length,count);
 else{
  await p.lazy.requestMode('3d',new AbortController().signal);
  assert.equal(p.lazy.mode,'3d','a fresh parent intent can prepare again after cancellation');
  assert.equal(p.lazy.wantedMode,'3d');
 }
});

for(const error of [Error('Fixture source failed'),new DOMException('Fixture unexpected transport abort','AbortError')])test(`compositor ${provider}: current ${error.name} after resize remains a real failure`,async t=>{
 const p=await page(t,{city,slow:provider,withPage:false});
 const request=p.lazy.requestMode('3d',new AbortController().signal),failed=assert.rejects(request,value=>value===error);
 await p.waitDeadline(provider,budget);p.real.get(provider).failNextRead(error);
 p.map.emit('movestart');p.map.emit('resize');p.map.emit('moveend');await failed;
 assert.equal(p.lazy.wantedMode,'2d');
 assert.deepEqual(p.states.filter(s=>s.fallback).map(s=>s.fallback),[{reason:'error',provider}]);
});

test(`compositor ${provider}: slow drawing after resize remains live and eventually succeeds`,async t=>{
 const p=await page(t,{city,slow:provider,withPage:false});
 const request=p.lazy.requestMode('3d',new AbortController().signal);
 await p.waitDeadline(provider,budget);
 p.map.emit('movestart');p.map.emit('resize');p.map.emit('moveend');await settle();
 await p.waitDeadline(provider,budget);assert(p.real.get(provider).fire(budget)>0);await settle();
 assert.equal(p.states.filter(s=>s.fallback).length,0);p.readiness.set(provider,true);p.map.emit('render');await request;assert.equal(p.lazy.wantedMode,'3d');
});

}

test('city: its own camera movement keeps one intent; a later external resize refreshes the viewport',async t=>{
 const p=await page(t,{city:'munich',slow:'church',cameraEvents:true});
 // resize() during an already moving camera only emits resize, not another movestart.
 p.map.on('movestart',()=>{if(p.view.moving)p.map.emit('resize');});
 p.three.onclick();await p.waitDeadline('church',15000);
 assert.equal(p.threeDCalls().city,1);
 assert.deepEqual(p.camera,[['easeTo',{pitch:45,duration:300}]]);
 assert.equal(p.real.get('city').deadlines.filter(d=>d.ms===2000).length,1);
 p.map.emit('movestart');p.view.bounds[0]+=.003;p.map.emit('resize');p.map.emit('moveend');await settle();
 assert.equal(p.lazy.wantedMode,'3d');assert.equal(p.notice.root.hidden,true);
 p.failures.delete('church');p.readiness.set('church',true);p.map.emit('render');
 await until(()=>p.controls.status==='ready','city camera and external resize');await settle();
 assert.deepEqual(p.controls,{mode:'3d',status:'ready'});assert.equal(p.states.filter(s=>s.fallback).length,0);
 assert.equal(p.threeDCalls().city,1,'external viewport refresh must not request another mode/camera movement');
 assert.deepEqual(p.camera,[['easeTo',{pitch:45,duration:300}]]);
});

// F029 now prepares in the merged scoped batch, after shard validation.
// bremen-staged-batches.test.mjs covers recovery/reconstruction order, awaiting
// the prepared batch before publish, cancelled scopes and superseded late results.
// root500-owner-data-scope.test.mjs covers F029 identity/material boundaries.

test('page: a late completion of a superseded 3D request cannot switch the page back to 3D',async t=>{
 const late={gate:deferred(),started:false},p=await page(t,{stubs:{tier300:{late}}});
 p.failures.delete('church');p.readiness.set('church',true);
 p.three.onclick();
 await until(()=>late.started,'pending supplement');
 p.flat.onclick();
 await until(()=>p.controls.status!=='loading','2D request');await settle();
 assert.deepEqual(p.controls,{mode:'2d',status:'ready'});assert.equal(p.lazy.mode,'2d');
 const moves=p.camera.length,count=p.states.length;
 late.gate.resolve();await settle(24);
 assert.equal(p.lazy.mode,'2d');assert.equal(p.lazy.wantedMode,'2d');assert.deepEqual(p.controls,{mode:'2d',status:'ready'});
 assert(!p.states.slice(count).some(s=>s.mode==='3d'),'no late 3D state is published');
 assert(!p.camera.slice(moves).some(([k,o])=>k==='easeTo'&&o.pitch>0),'no late 3D tilt');
 assert.equal(p.notice.root.hidden,true,'a cancelled request is not a fallback');
 assert.equal(p.live.building3dInteraction.resumed,0);
});

test('page: a fallback of an older request never appears once a newer request has started',async t=>{
 const rollback={gate:deferred(),started:false},p=await page(t,{stubs:{tier300:{rollback}}});
 p.three.onclick();await p.waitDeadline('church',15000);
 p.real.get('church').fire(15000);p.failures.set('church','Fixture terminal draw failure');p.map.emit('render');
 await until(()=>rollback.started,'pending rollback');
 assert.deepEqual(p.controls,{mode:'2d',status:'loading'});
 p.flat.onclick();
 await until(()=>p.controls.status!=='loading','newer 2D request');await settle();
 rollback.gate.resolve();await settle(24);
 assert.equal(p.states.filter(s=>s.fallback).length,0,'the superseded rollback publishes nothing');
 assert.equal(p.notice.root.hidden,true);assert.deepEqual(p.controls,{mode:'2d',status:'ready'});
 assert.equal(p.lazy.mode,'2d');assert.equal(p.lazy.cacheStats().threeDFallback,undefined);
});

test('lazy: a failed 3D owner load reports one fallback and keeps 2D wanted across resume',async t=>{
 installPage(t);
 const states=[];let loads=0;
 const lazy=installLazy({map:{stop(){},easeTo(){}},city:'munich',mobile:false,fetchBytes:async()=>{throw Error('network forbidden');},onState:s=>states.push(s)},async()=>{loads++;throw TypeError('Failed to fetch dynamically imported module');});
 t.after(()=>lazy.destroy());
 assert.equal(lazy.getFrozenDataResourceStats(),undefined);assert.equal(loads,0,'reading resource stats must not initialize 3D');
 assert.equal(lazy.getManagerDrawReadiness(),undefined);assert.equal(loads,0,'reading cached readiness must not initialize 3D');
 await assert.rejects(lazy.requestMode('3d',new AbortController().signal),/Failed to fetch dynamically imported module/);
 assert.deepEqual(states,[{mode:'2d',status:'error',fallback:{reason:'error',provider:'initialization'}}]);
 assert.equal(lazy.mode,'2d');assert.equal(lazy.wantedMode,'2d');
 lazy.suspend();lazy.resume();await settle();
 assert.equal(loads,1,'resume must not reissue the failed request');assert.equal(states.length,1);
 const error=lazy.getDrawReadinessSnapshot().failure;assert.match(error,/Failed to fetch dynamically imported module/);
 assert.equal(lazy.beginContextRecovery(),true);assert.equal(lazy.getDrawReadinessSnapshot().ready,true);
 lazy.suspend({contextRecovery:true});lazy.resume({contextRecovery:true});assert.equal(lazy.getDrawReadinessSnapshot().ready,true,'suspension does not erase the accepted completed request');
 const retry=lazy.requestMode('3d',new AbortController().signal);
 assert.equal(lazy.beginContextRecovery(),false,'an unfinished lazy load cannot be accepted as an old 2D fallback');
 assert.equal(lazy.getDrawReadinessSnapshot().ready,false);await assert.rejects(retry,/Failed to fetch dynamically imported module/);
 assert.equal(lazy.getDrawReadinessSnapshot().failure,error,'a new equal-text failure is not covered by the previous request baseline');assert.equal(loads,2);
});

for(const locale of ['zh','en','de'])test(`notice ${locale}: explicit 3D fallback copy and button; GPU recovery takes precedence and the fallback returns after it`,t=>{
 installPage(t);
 const host=new Element('host');let retries=0,gpu=0,reports=0;
 const n=notice.mountMapRecoveryNotice({host,locale,onReports:()=>reports++,onRetry:()=>gpu++,onRetryThreeD:()=>retries++});
 const root=host.children[0],[message,read,retry,retryThreeD]=root.children;
 assert.equal(root.hidden,true);assert.equal(retryThreeD.hidden,true);assert.equal(retryThreeD.type,'button');
 n.setThreeDFallback(true);
 assert.equal(root.hidden,false);assert.equal(root.dataset.state,'three-d-fallback');assert.equal(message.textContent,COPY[locale].message);
 assert.equal(retryThreeD.textContent,COPY[locale].retry);assert.equal(retryThreeD.hidden,false);assert.equal(read.hidden,true);assert.equal(retry.hidden,true);
 n.update('waiting');
 assert.equal(root.dataset.state,'waiting');assert.notEqual(message.textContent,COPY[locale].message);assert.equal(retryThreeD.hidden,true);assert.equal(read.hidden,false);
 retryThreeD.onclick();assert.equal(retries,0,'no 3D retry while the map is paused');
 n.update('failed');assert.equal(retry.hidden,false);assert.equal(retryThreeD.hidden,true);
 n.update('ready');
 assert.equal(root.hidden,false,'the unresolved fallback remains explained after GPU recovery');assert.equal(message.textContent,COPY[locale].message);
 retryThreeD.onclick();retryThreeD.onclick();
 assert.equal(retries,1);assert.equal(root.hidden,true);assert.equal(gpu,0);assert.equal(reports,0);
 n.setThreeDFallback(true);assert.equal(root.hidden,false);n.setThreeDFallback(false);assert.equal(root.hidden,true);
 n.destroy();assert.equal(root.removed,true);assert.equal(retryThreeD.onclick,null);n.setThreeDFallback(true);assert.equal(root.hidden,true);
});

test('notice copy: three distinct complete sentences per locale and the GPU recovery copy is unchanged',t=>{
 installPage(t);
 const texts={};
 for(const locale of ['zh','en','de']){const host=new Element('host'),n=notice.mountMapRecoveryNotice({host,locale,onReports(){},onRetry(){},onRetryThreeD(){}});n.setThreeDFallback(true);texts[locale]=host.children[0].children[0].textContent;n.update('failed');texts[locale+'-failed']=host.children[0].children[0].textContent;n.destroy();}
 assert.equal(new Set(['zh','en','de'].map(l=>texts[l])).size,3);
 for(const locale of ['zh','en','de'])assert.equal(texts[locale],COPY[locale].message);
 assert.equal(texts['zh-failed'],'地图未能恢复。公告、筛选和统计仍可使用。可主动重新以2D打开地图，保留位置、时段、筛选和选择。');
});

test('readiness budgets are unchanged in every owner: draw 15 s (8 s infill and bremen), camera 2 s',()=>{
 const draw={root500:15000,delegated500:15000,tier300:15000,church:15000,city:15000,infill:8000,bremen:8000};
 for(const [provider,ms] of Object.entries(draw)){
  const filename=`painted/${provider}/safety/three-dimensional-map.ts`,text=read(filename),ast=ts.createSourceFile(filename,text,ts.ScriptTarget.Latest,true);
  const imports=ast.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text==='../../../safety/resident-draw-readiness');
  assert.equal(imports.length,1,provider+' imports the shared helper');
  assert(imports[0].importClause.namedBindings.elements.some(n=>n.name.text==='waitForResidentDraw'),provider+' binds the shared helper');
  const drawn=collect(ast,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='drawn');assert.equal(drawn.length,1,provider);
  const calls=collect(drawn[0],n=>ts.isCallExpression(n)&&n.expression.getText(ast)==='waitForResidentDraw');assert.equal(calls.length,1,provider+' delegates draw readiness');
  const options=calls[0].arguments[0];assert(ts.isObjectLiteralExpression(options));
  const budget=options.properties.find(n=>ts.isPropertyAssignment(n)&&n.name.getText(ast)==='drawTimeoutMs');
  assert(budget&&ts.isNumericLiteral(budget.initializer),provider+' declares its original draw budget');assert.equal(Number(budget.initializer.text),ms,provider);
  assert(!options.properties.some(n=>n.name?.getText(ast)==='totalTimeoutMs'),provider+' cannot extend its original deadline');
  const direct=collect(ast,n=>ts.isCallExpression(n)&&n.expression.getText(ast)==='visibleReadinessDeadline');
  assert.deepEqual(direct,[],provider+' has no direct cancelling readiness deadline');const camera=collect(ast,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='moveCamera')[0];assert(camera.getText(ast).includes('drawTimeoutMs:2000'),provider+' retains camera timing as an observation threshold');
 }
});
