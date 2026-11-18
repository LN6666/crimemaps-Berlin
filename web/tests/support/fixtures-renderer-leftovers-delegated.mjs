// delegated500 material preflight over the flattened production factory, in
// its chunk-construction form.
//
// Coverage note (uncovered[32](3)): every ingress source group built here is an
// empty dependency group (parents:[]): only the parentless chunk-group path is
// exercised; retention and release of real source parent leases is covered by
// the manager suites, not by this fixture.
//
// A nonempty delegated batch now prepares its material inside a chunk
// construction: prepareBatches receives authoritative renderer chunk input
// (one ingress source group over the page chunk store, as the manager passes
// it) and the original publication plans. The store's construction production
// admits the material source text on the page ledger
// (waitForDelegatedSourceText) and runs the source build (builder,
// certification, CPU packing registration) through the store's production
// context.schedule/context.scheduleSteps on the shared context scheduler.
//
// The fixture's source-build cells sit exactly at that schedule call: a cell
// holds the production request until the test runs and opens it, then forwards
// it to the corresponding production schedule method. Step requests retain the
// real scheduleSteps iterator progression; they are not drained into one work.
// A production abort (supersession,
// hide, disable, destroy, release) forwards it at once, so the production
// schedule settles the aborted request and the construction releases its claim
// and scope pins itself. The second stage (the pending batch pump) runs on the
// renderer's own production program owner. Both share explicit preparation
// turns, so nothing runs on a real timer.
//
// Fixture boundaries, unchanged from the original fixture: the material-data
// imports (stand-ins and certification recorders), CPU packing (recorded; it
// registers its construction as the production packing does, without chunk
// groups), GPU upload and publication (recorded), and the facade source
// observation recorder.
//
// Cleanup (t.after) first retires whatever the test left (its pending
// constructions, queued batches, candidate and scope pins), then queues one more
// construction that is never opened and retires it through the production path
// alone: its admitted source text claim and its scope pins must come back. It
// ends with the production destroy(); once this fixture and every fixture created
// after it are torn down, the page ledger is back at its bytes from before them.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as harness from './fixtures-renderer-harness.mjs';
import * as cityFixtures from './fixtures-renderer-city.mjs';

const CATALOGS={berlin:['progressive-berlin-programs.ts','BERLIN_PROGRAM_GLSL_RESOURCE'],hannover:['f340-program822.ts','HANNOVER_PROGRAMS822_RESOURCE']},DEFAULT_CATALOG=['progressive-hamburg-programs.ts','HAMBURG_PROGRAM_GLSL_RESOURCE'];
const delegatedResource=(file,name)=>harness.evaluateTS(harness.sourceOf(fs.readFileSync(harness.web+'src/painted/delegated500/safety/'+file,'utf8'),name,{kind:'variable'}),{});
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};
const CONSTRUCTION_KEY='delegated500-construction:';
// Delegated fixtures alive in this process, in creation order. A test may hold
// several at once and their cleanups run in registration order, so the page
// ledger is compared once a fixture and every fixture created after it are torn
// down: against the bytes from before the earliest of them.
const liveFixtures=[];

/** Source-build cells at the construction's real schedule/scheduleSteps calls. */
export function constructionCells(turns){
 const cells=[];let cancellations=0,expected,owner;
 const api={
  cells,get cancellations(){return cancellations;},
  bindOwner(value){owner=value;},
  /** The queued request whose construction registers next. */
  expect(row){expected=row;},
  register(context,gl,work,options,schedule,resource){
   assert(gl,'construction source work is scheduled on the renderer context');assert.equal(options.phase,'source-build');assert(resource.startsWith(CONSTRUCTION_KEY));
   let settle;const request=new Promise(resolve=>settle=resolve);
   const cell={descriptor:{phase:options.phase,priority:options.priority,resource,
     // The production guard of this request: the shared scheduler job that
     // schedule/scheduleSteps creates runs while the production signal is live.
     current:()=>!context.signal.aborted},
    row:expected,gate:deferred(),ready:false,started:false,cancelled:false,forwarded:undefined,settled:false,
    forward(){
     if(!cell.forwarded){
      try{cell.forwarded=turns.turn(()=>schedule(gl,work,options));}catch(error){cell.forwarded=Promise.reject(error);}
      cell.forwarded.then(()=>{cell.settled=true;},()=>{cell.settled=true;});settle(cell.forwarded);
     }
     return cell.forwarded;
    }};
   expected=undefined;cells.push(cell);
   // (The listener returns nothing: Node's EventTarget rethrows a rejected
   // promise returned by a listener as an uncaught exception.)
   context.signal.addEventListener('abort',()=>{cell.forward();},{once:true});
   if(context.signal.aborted)cell.forward();
   cell.row?.registered.resolve(cell);
   return request;
  },
  /** Run one cell: the production source build on the shared scheduler turn,
   * then the production tail (prepareBatches assembly, setBatches and the
   * pump job) of the request it belongs to. */
  async run(cell=cells.at(-1)){
   assert(cell);assert.equal(cell.started,false);cell.started=true;await cell.gate.promise;
   if(!cell.descriptor.current()){await cell.forward().catch(()=>{});return false;}
   assert.equal(cell.cancelled,false,'a fixture cancellation follows a production retirement');
   // A source-build failure is reported once the renderer has handled it: the
   // production scheduler's original error, after the request's tail settled.
   try{const built=cell.forward();turns.drain();const [source,tail]=await Promise.allSettled([built,cell.row.after]);if(source.status==='rejected')throw source.reason;if(tail.status==='rejected')throw tail.reason;cell.ready=tail.value;return tail.value;}
   catch(error){cell.error=error;throw error;}
  },
  open(cell=cells.at(-1)){cell.gate.resolve();},
  /** The original fixture's scheduler cancellation: the program owner's cancel
   * (as the production release calls it); open cells are no longer runnable. */
  cancel(){cancellations++;for(const cell of cells)if(!cell.started)cell.cancelled=true;owner?.cancel();},
 };
 return api;
}

/** The construction's schedule and scheduleSteps share the original cell gate;
 * each forwards to its matching real method. Other calls remain the page store. */
function constructionStore(store,cells){
 const acquire=request=>typeof request.contentKey==='string'&&request.contentKey.startsWith(CONSTRUCTION_KEY)?store.acquire({...request,produce(context){const schedule=context.schedule,scheduleSteps=context.scheduleSteps;return request.produce({...context,schedule:(gl,work,options={})=>cells.register(context,gl,work,options,schedule,request.contentKey),scheduleSteps:(gl,step,options={})=>cells.register(context,gl,step,options,scheduleSteps,request.contentKey)});}}):store.acquire(request);
 return new Proxy(store,{get(target,key){return key==='acquire'?acquire:Reflect.get(target,key);}});
}

/** rewrite (probes only) edits one factory function's JavaScript text before evaluation. */
export async function delegatedPreflightFixture(t,city,{fixtureSource,tokenNames,packedFields,cleanupLog,rewrite={}}){
 const map=harness.fixtureMap(),flat=await harness.flattenRenderer('delegated500',{params:[map,city,{}],env:{...harness.browserGlobals(),delegated500ScopedFunctionArities:new Map()},imports:'light',rewrite});
 assert.deepEqual(flat.failures.map(row=>row.name+': '+String(row.error?.message??row.error)),[],'the delegated500 factory flattens without failed initializers');
 const ctx=flat.values,text=flat.text,runtime=flat.runtime,turns=harness.preparationTurns(),scheduler=constructionCells(turns),builds=[],certificates=[],calls=[],packs=[],oldPublished={old:true},richKeys=new Map([['exact','fixture']]);
 const gl={isContextLost:()=>false},pageStore=runtime.store.getPageChunkResourceStore();runtime.store.bindChunkResourceContext(gl,pageStore);
 const store=constructionStore(pageStore,scheduler);
 // The renderer's production program owner, its scheduler turns captured.
 const owner=ctx.programPreparation;ctx.programPreparation=new Proxy(owner,{get(target,key){const value=Reflect.get(target,key);return typeof value==='function'?(...args)=>turns.turn(()=>value.apply(target,args)):value;}});scheduler.bindOwner(ctx.programPreparation);
 const masks=()=>({detach(){},destroy(){}});
 // The factory's own Rathaus masks charge their CPU words on the page ledger.
 // The stand-in below replaces them, so they are destroyed first (otherwise they
 // would stay charged after the fixture); then the ledger baseline is read.
 ctx.rathausProxyMasks?.destroy?.();const lifetime={baseline:pageStore.budget.stats.bytes,done:false};liveFixtures.push(lifetime);
 Object.assign(ctx,{enabled:true,pageHidden:false,destroyed:false,gl,published:oldPublished,generation:5,committedGeneration:5,viewRevision:0,indices:new Uint32Array(3),loaded:new Map(),solarShadowAdmittedKeys:new Set(),rathausProxyMasks:masks(),createRathausProxyMasks:masks,materialSourceWorkRevision:0,materialRecipeRevision:0,materialSourceSettled:false,materialSourceFailure:undefined,cityPaintFragment:'',matrix:{old:true},paintMode:()=>2,paintOverride:()=>0,syncFacadeResources(){},paintSelection(){},releaseShadowGPU(){},updateSelectionData(){},admitShadow(){},updateSolarShadowIndices(){},paintProgramRuns:()=>[],gpuReady:()=>true,clearDelegated500PaintSourcesForScope(){},
  // Material-data imports keep the original fixture's values and recorders.
  f004Fragment645:source=>source,PARTIAL_GATE_MASK_GLSL:'/* fixture partial gate mask */',paintProgramKey:()=> 'fixture',paintProgramFragment:()=>'',paintProgramPartitionEnabled:()=>false,HC70_GLSL:'',SUPPLEMENT_BATCH1_GLSL:'',KO_PANTALEON_GATE_GLSL_SHA256:'fixture',KO_PANTALEON_GATE_GLSL:'fixture',KO_PANTALEON_ANNEX_GLSL_SHA256:'fixture',KO_PANTALEON_ANNEX_GLSL:'fixture',KO_LUDWIG_WORKSHOP_GLSL70_SHA256:'fixture',KO_LUDWIG_WORKSHOP_GLSL70:'fixture',KO_MESSETURM_CROWN_GLSL_SHA256:'fixture',KO_MESSETURM_CROWN_GLSL:'fixture',koPantaleonGateReady70:()=>false,koPantaleonAnnexReady70:()=>false,koLudwigWorkshopReady70:()=>false,koMesseturmCrownReady70:()=>false,fragment:(base,source)=>{certificates.push(['fragment',base,source]);return base+'|'+source;},berlinPaulLobeProgramsEqual:source=>{certificates.push(['paul',source]);return source.includes(fixtureSource);},berlinExactRichProgramKeys:source=>{certificates.push(['exact',source]);return richKeys;},berlinDistantContractAvailable:source=>{certificates.push(['distant',source]);return source===fixtureSource;}});
 for(const token of tokenNames)ctx[token]=token;
 // Prepared delegated data: the three declared tables over a tiny frozen store.
 const [catalogFile,catalogName]=CATALOGS[city]??DEFAULT_CATALOG,admissions=delegatedResource('progressive-paint-admissions.ts','PROGRESSIVE_ADMISSIONS_RESOURCE'),extra=delegatedResource('progressive-feature-cities.ts','PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE'),catalog=delegatedResource(catalogFile,catalogName),components=[{city,objectId:'osm/way/1',partId:'fixture-part'}];
 const {client,store:frozenStore}=cityFixtures.tinyFrozenData(runtime,'delegated500',city,[admissions,extra,catalog],[[],{city},{base:'fixture catalog marker'}],(sha,file)=>sha===admissions.canonicalSHA256&&file===admissions.file?{schemaVersion:1,kind:'object-rows',parts:[]}:undefined),frozen=runtime.scope.createFrozenDataScope(client),releaseScope=frozen.retain();frozen.release();
 Object.assign(ctx,{frozenData:client,preparedScope:frozen});
 const preparedData={scope:frozen,client,store:frozenStore,components,resources:{admissions,extra,catalog},release(){releaseScope();client.dispose();frozenStore.destroy();}};ctx.preparedDataFixture=preparedData;
 // The data/program preparation modules select model-data tables (frames,
 // F231 sources, program catalogs) the tiny store does not carry; their
 // stand-ins prepare the declared tiny tables in the given scope, honouring
 // its signal, as the originals do for theirs.
 const live=(scope,reader)=>{assert(scope,reader+' requires a prepared scope');assert.equal(scope.stats.disposed,false,reader+' reads a live prepared scope');return scope;};
 Object.assign(ctx,{
  async prepareDelegated500Data(rows,requestedCity,signal,scope){assert.equal(requestedCity,city);signal.throwIfAborted();if(!rows.length)return;await live(scope,'data preparation').prepareSelection(admissions,[...new Set(rows.map(row=>row.city+'|'+row.objectId))],signal);await scope.prepare([extra],signal);signal.throwIfAborted();},
  async prepareDelegated500Programs(rows,requestedCity,signal,scope){assert.equal(requestedCity,city);signal.throwIfAborted();if(!rows.length)return;await live(scope,'program preparation').prepare([catalog],signal);signal.throwIfAborted();},
  // Source bounds are model data: one synthetic bound covers every fixture
  // recipe and is read through the prepared catalog of the given scope.
  describeFacadePaintSourceBounds(requestedCity,_sourceKey,scope){assert.equal(requestedCity,city);return live(scope,'material bounds').borrow(catalog,record=>{assert.equal(record.base,'fixture catalog marker');return ctx.shaderSourceBounds(ctx.shaderSourceText(fixtureSource+'|new recipe',['fixture/delegated-material']));});},
 });
 const specializations=[],metadata=requestedCity=>{assert.equal(requestedCity,city);return{city,specialized:null,sourceSHA256:null,generatedSourceSHA256:null,sourceKind:null,fragmentBytes:null,fullFragmentBytes:null,baselinePreservedVerbatim:null};};
 const describe=(requestedCity,source,kind,scope)=>{assert.equal(requestedCity,city);assert.equal(typeof source,'string');const current=(ctx.committingPreparedData??ctx.residentPreparedData).scope;assert.equal(scope,current,'source observation receives the actual active data scope');assert.equal(scope.stats.disposed,false);const bytes=new TextEncoder().encode(source).byteLength,result={...metadata(requestedCity),sourceKind:kind,fragmentBytes:bytes,fullFragmentBytes:kind==='full'?bytes:null};specializations.push({scope,metadata:result});return result;};
 Object.assign(ctx,{facadePaintSpecializationForCity:metadata,describeFacadePaintSource:describe});
 for(const name of ['setEnabled','setPageHidden','destroy'])ctx[name]=harness.evaluateTS(harness.sourceOf(text,name,{kind:'method'}),ctx);
 ctx.capturePackedState=()=>Object.fromEntries(packedFields.map(key=>[key,ctx[key]]));ctx.restorePackedState=state=>Object.assign(ctx,state);
 // CPU packing is the recorded boundary: it receives the complete argument
 // tuple and, inside a chunk production, registers its construction (over the
 // retained construction input) exactly as the production packing does. Keep
 // the real generator as an explicit seam for tests of its internal boundaries;
 // ordinary preflight calls use this same recorder for sync and step entrypoints.
 const actualPackingSteps=ctx.packResidentBatchesSteps;
 const pack=(...args)=>{packs.push(args);if(ctx.tailError)throw ctx.tailError;ctx.generation=args[1];ctx.indices=new Uint32Array(args[0].length?3:0);ctx.loaded=new Map(args[0].map((row,index)=>[String(index),row]));if(ctx.preparingChunkProduction){const input=ctx.packingChunkInput;assert(input,'chunk production packs over its retained construction input');ctx.currentChunkConstruction={state:ctx.snapshotPackedResident(),components:args[0],shadowAdmission:args[2],groups:[],bindings:ctx.retainChunkBindings(input),closed:false,consumed:false};}return{args};};ctx.packBatches=pack;ctx.buildBatches=pack;ctx.packResidentBatches=pack;
 ctx.packResidentBatchesSteps=function*(...args){return pack(...args);};
 const preparedByRows=new WeakMap();
 const publish=(args)=>{const prepared=preparedByRows.get(args[0]);calls.push(prepared&&args.at(-1)!==prepared?[...args,prepared]:args);ctx.published=args[0];ctx.generation=args[1];ctx.indices=new Uint32Array(args[0].length?3:0);};
 // GPU upload and publication remain the recorded boundary.
 ctx.disposeGeometryCandidate=()=>{};ctx.prepareGeometryUpload=()=>{};
 ctx.publishPackedGeometry=value=>{ctx.restorePackedState(value.packed);publish(value.after.args);};ctx.finishResidentUpload=()=>{if(!ctx.indices.length)publish(packs.at(-1));};
 // An explicit empty batch retires through the production clearResidentBatches;
 // its publication is recorded.
 const clearResidentBatches=ctx.clearResidentBatches;ctx.clearResidentBatches=next=>{clearResidentBatches(next);publish([[],next]);};
 const builder=value=>()=>{builds.push(value);return value;};
 function replaceSource(build=builder(fixtureSource)){ctx.setMaterialSourceBuilder(build);}
 replaceSource();
 const ast=harness.ts.createSourceFile('renderer.ts',text,harness.ts.ScriptTarget.Latest,true);let arity;(function visit(node){if(harness.ts.isFunctionDeclaration(node)&&node.name?.text==='setBatches')arity=node.parameters.length;harness.ts.forEachChild(node,visit);})(ast);assert(arity);
 const args=(label='rows',generation=6)=>[[{...components[0],label}],generation,...Array.from({length:arity-2},(_,slot)=>({label,slot}))];
 // Ingress-selected renderer chunk input: one authoritative source group.
 let sequence=0;const chunkInput=rows=>({store,groups:[{contentKey:'fixture-source:'+city+':'+(++sequence),components:rows,parents:[],frame:runtime.chunkInput.rendererChunkFrame([13.4,52.5],'fixture-frame'),cohortKeys:[],materialAuthority:'fixture-material',recipeAuthority:'fixture-recipe',selectedLOD:0}],cohorts:[]});
 const receipts=[];
 // As the manager does: prepareBatches(components, signal, scope, demand,
 // chunkInput, the original publication plans), then setBatches with the same
 // plans and the receipt. The request is queued once its construction holds a
 // source-build cell (or rejects if prepareBatches fails before that).
 async function queue(input){
  const controller=new AbortController(),row={input,controller,prepared:undefined,registered:deferred(),after:undefined};receipts.push(row);scheduler.expect(row);
  const preparation={nextGeneration:input[1],shadowAdmission:input[2],nativeDisplay:input[3],partialGatePlan:input[4],s402Plan:input[5],s434Plan:input[6],s036Plan:input[7],s240Plan:input[8],f151Plan:input[9]};
  const receipt=ctx.prepareBatches(input[0],controller.signal,ctx.preparedScope,undefined,chunkInput(input[0]),preparation);
  row.after=receipt.then(prepared=>{row.prepared=prepared;input[input.length-1]=prepared;preparedByRows.set(input[0],prepared);turns.turn(()=>ctx.setBatches(...input));turns.drain();return true;},error=>{if(error?.name==='AbortError')return false;throw error;});
  row.after.catch(()=>{});
  const outcome=await Promise.race([row.registered.promise.then(()=>undefined),receipt.then(()=>undefined,error=>({error}))]);
  if(outcome){scheduler.expect(undefined);throw outcome.error;}
  return input;
 }
 const prepare=()=>turns.turn(()=>ctx.pumpPendingMaterialBatches()),consume=()=>Boolean(ctx.pendingGeometry);
 function publication(){if(ctx.pendingGeometry){const candidate=ctx.pendingGeometry;ctx.restorePackedResident(candidate.state);publish(packs.at(-1));candidate.abortCleanup?.();candidate.releaseScope?.();ctx.pendingGeometry=undefined;}}
 // hide/empty/release use the production transitions; release is the
 // production releaseGPU (its pending-work retirement and program owner cancel).
 function retire(action){if(action==='hide')ctx.setPageHidden(true);else if(action==='empty')turns.turn(()=>ctx.setBatches([],6));else{ctx.releaseGPU();scheduler.cancel();}}
 t.after(async()=>{
  // What cleanup faces: unsettled construction requests (claims and scope
  // pins), queued batches, an unpublished candidate and the live scope pins.
  const facing={city,cells:scheduler.cells.length,unsettledConstructions:scheduler.cells.filter(cell=>!cell.settled).length,preparing:!!ctx.dataPreparationPending,pendingMaterialBatches:!!ctx.pendingMaterialBatches,pendingGeometry:!!ctx.pendingGeometry,scopePins:frozen.stats.pins,ledgerBytes:pageStore.budget.stats.bytes};
  // Retire through the production paths before aborting their original
  // receipts, so no candidate listener outlives its real scope and snapshot.
  ctx.cancelPendingMaterialBatches();ctx.discardGeometryCandidate();ctx.clearDataPreparation();ctx.clearMaterialSource();
  assert.equal(ctx.pendingMaterialBatches,undefined);assert.equal(ctx.pendingGeometry,undefined);
  for(const {controller,prepared}of receipts){controller.abort();prepared?.release?.();}
  scheduler.cancel();for(const cell of scheduler.cells)cell.gate.resolve();await new Promise(resolve=>setImmediate(resolve));
  // Cleanup coverage: one construction queued and never opened (a live renderer
  // without a cached source failure only). Retiring the in-flight preparation
  // returns its admitted source text claim and its scope pins.
  if(!ctx.destroyed&&ctx.constructionSourceFailure===undefined){
   const input=args('cleanup-unopened',ctx.generation+1),warm=new AbortController();
   // Its data tables are prepared into the fixture scope first: the scope keeps
   // them until it is disposed, so they are not part of the construction.
   await ctx.prepareDelegated500Data(input[0],city,warm.signal,frozen,input[0]);await ctx.prepareDelegated500Programs(input[0],city,warm.signal,frozen);
   const before=pageStore.budget.stats.bytes,pins=frozen.stats.pins,opened=scheduler.cells.length;
   await queue(input);
   const cell=scheduler.cells.at(-1);assert.equal(scheduler.cells.length,opened+1,'the unopened construction registered its source-build cell');
   assert.equal(cell.started,false);assert.equal(cell.settled,false,'its construction is unsettled');
   assert(pageStore.budget.stats.bytes>before,'it holds its admitted source text claim');
   ctx.clearDataPreparation();turns.drain();await new Promise(resolve=>setImmediate(resolve));
   assert.equal(cell.settled,true,'the production abort settles the unopened construction');
   assert.equal(ctx.dataPreparationPending,undefined);
   assert.equal(pageStore.budget.stats.bytes,before,'its source text claim is returned');
   assert.equal(frozen.stats.pins,pins,'its scope pins are returned');
  }
  ctx.preparedDataFixture.release();
  cleanupLog?.({...facing,unsettledAfter:scheduler.cells.filter(cell=>!cell.settled).length,disposed:ctx.preparedDataFixture.scope.stats.disposed});
  assert.equal(ctx.preparedDataFixture.scope.stats.disposed,true,'cleanup releases every candidate and resident scope pin');
  // The production destroy returns everything the renderer still holds.
  ctx.destroy();turns.drain();await new Promise(resolve=>setImmediate(resolve));
  lifetime.done=true;let first=liveFixtures.length;while(first>0&&liveFixtures[first-1].done)first--;
  if(first<liveFixtures.length){const earliest=liveFixtures[first];liveFixtures.length=first;assert.equal(pageStore.budget.stats.bytes,earliest.baseline,'after destroy the page ledger is back at its bytes from before the fixture');}
 });
 return{provider:'delegated500',ctx,scheduler,builds,certificates,specializations,calls,packs,actualPackingSteps,oldPublished,richKeys,args,queue,prepare,consume,publication,replaceSource,builder,retire,turns,store:pageStore,get pending(){return ctx.pendingMaterialBatches??ctx.pendingGeometry;}};
}
