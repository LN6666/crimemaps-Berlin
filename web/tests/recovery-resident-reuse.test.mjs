import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const web=path.resolve(process.env.RECOVERY_REUSE_SOURCE_ROOT??fileURLToPath(new URL('../',import.meta.url)));
const providers=['root500','delegated500','tier300','church','city','infill','bremen'];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function collect(ast,predicate){const result=[];function visit(node){if(predicate(node))result.push(node);ts.forEachChild(node,visit);}visit(ast);return result;}
function compile(source,env){const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const exports={};const scope=new Proxy({...env,exports},{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k]});Function('scope',`with(scope){${js}}`)(scope);return exports;}
function helper(){const p=path.join(web,'src/safety/recovery-resident-reuse.ts');return fs.existsSync(p)?compile(fs.readFileSync(p,'utf8'),{}):{};}
const emptyPlan=()=>({hiddenOutlines:[],groups:[],errors:[],held:[]});
const selection=(candidates)=>({candidates,requiredLeafIds:[],protectedCacheKeys:[],budgets:{maxVisible:128,maxBytes:8388608,vertexCap:200000,retainedCap:1e6,maxCache:24,maxCacheBytes:12582912,cacheRetainedCap:1e6},active:false,ready:true,complete:true,diagnostic:()=>undefined,viewportRows:(_all,rows)=>rows,priority:()=>0,note(){},reserveAfter:()=>({vertices:0,bytes:0}),completeInSource:()=>true,applySource:rows=>rows,sourceRows:rows=>rows,atomicRows:rows=>rows});

// Execute the real manager factory, including visible/admit/commit, requestMode,
// drawn and suspension/resumption. Only asset reads/renderer setup and imported
// geometry/material planners are isolated: the 7 full city catalogs and WebGL
// are unrelated to this lifecycle regression. No recovery predicate is copied.
function harness(provider){
 const filename=path.join(web,`src/painted/${provider}/safety/three-dimensional-map.ts`),text=fs.readFileSync(filename,'utf8'),ast=ts.createSourceFile(filename,text,ts.ScriptTarget.Latest,true);
 const f=collect(ast,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='installThreeDimensionalMap');assert.equal(f.length,1);
 const changes=[];const visibleNode=collect(f[0],n=>ts.isFunctionDeclaration(n)&&n.name?.text==='visible')[0];changes.push([visibleNode.body.getStart(ast)+1,visibleNode.body.getStart(ast)+1,'__fixture.pending++;try{']);changes.push([visibleNode.body.end-1,visibleNode.body.end-1,'}finally{__fixture.pending--;}']);
 for(const name of ['ensure','shard']){
  const nodes=collect(f[0],n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(nodes.length,1,name);
  const body=name==='ensure'?`{signal.throwIfAborted();if(!renderer){renderer=__fixture.renderer;options.onRenderer?.(renderer);}if(!manifest){manifest=__fixture.manifest;manifestSHA='fixture-index';boundary=__fixture.boundary;}}`:
   `{const rows=await __fixture.read(s,signal);current(signal,revision);retainedShardCost.set(rows,128);for(const c of rows)sourceLeafByFeature.set(c.sourceFeature,s.sha256);return rows;}`;
  changes.push([nodes[0].body.getStart(ast),nodes[0].body.end,body]);
 }
 // Expose just the current source identity and scalar counters to vary inputs;
 // this insertion leaves every production lifecycle function unchanged.
 const returned=f[0].body.statements.findLast(n=>ts.isReturnStatement(n));assert(returned);
 changes.push([returned.getStart(ast),returned.getStart(ast),`__fixture.inspect=()=>({visibleLoadsPending:__fixture.pending,generation,revision,mode,wantedMode,suspended,signal:request.signal});__fixture.changeSource=()=>{manifestSHA+='-changed';};`]);
 let source=text.slice(f[0].getStart(ast),f[0].end);for(const [start,end,replacement]of changes.sort((a,b)=>b[0]-a[0]))source=source.slice(0,start-f[0].getStart(ast))+replacement+source.slice(end-f[0].getStart(ast));
 const counts={reads:0,packs:0,prepares:0,repaints:0},states=[],handlers=new Map(),canvas={width:1000,height:600,clientWidth:1000,clientHeight:600};
 const view={bounds:[13,52,14,53],zoom:16,bearing:0,pitch:45,fov:45,center:{lng:13.5,lat:52.5},moving:false};
 const component={city:provider==='bremen'?'bremen':provider==='infill'?'frankfurt':'berlin',objectId:'osm/way/1',partId:'osm/way/1/component/fixture',componentGeometry:{type:'Polygon',coordinates:[[[13.4,52.4],[13.6,52.4],[13.5,52.6],[13.4,52.4]]]},sourceFeature:{properties:{}},batches:[{positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array(9),indices:new Uint16Array([0,1,2])}]};
 const rows=[component];let block,materialRevision=0,packedGeneration=0,enabled=false,loaded=[];
 const renderer={layer:{id:'fixture-'+provider},setBatches(next,g){counts.packs++;loaded=next;packedGeneration=g;},async prepareBatches(next){counts.prepares++;return {components:next};},setEnabled(value){enabled=value;},isPickReady:()=>enabled,getReadinessDiagnostic:()=>({ready:enabled}),getFrozenF231Metadata547:()=>[],get residentVertexCount(){return loaded.length*3;},getRevision:()=>({generation:packedGeneration,viewRevision:materialRevision}),getSourceComponent:()=>loaded[0],suspendSelection(){},setPageHidden(){},setReducedMotion(){},setOpacityContext(){},destroy(){loaded=[];},diagnosticScreenSamples:()=>[],get stats(){throw Error('recovery must not construct full renderer diagnostics');}};
 const map={on(event,fn){if(!handlers.has(event))handlers.set(event,new Set());handlers.get(event).add(fn);},off(event,fn){handlers.get(event)?.delete(fn);},emit(event){for(const fn of [...handlers.get(event)??[]])fn();},getBounds:()=>({getWest:()=>view.bounds[0],getSouth:()=>view.bounds[1],getEast:()=>view.bounds[2],getNorth:()=>view.bounds[3]}),getCenter:()=>view.center,getZoom:()=>view.zoom,getBearing:()=>view.bearing,getPitch:()=>view.pitch,getVerticalFieldOfView:()=>view.fov,getCanvas:()=>canvas,isMoving:()=>view.moving,getLayer:()=>false,removeLayer(){},triggerRepaint(){counts.repaints++;},stop(){},easeTo(){},getStyle:()=>({layers:[]})};
 const fixture={pending:0,s434Pending:false,modelVerified:true,renderer,manifest:{source_snapshot:'fixture',source_pbf_sha256:'source',city_boundary:{sha256:'boundary'},shards:[{id:'fixture',tile_key:'fixture',sha256:'leaf',bytes:100,vertices:3,bbox:[13,52,14,53],lod:1}]},boundary:{type:'Polygon',coordinates:[]},async read(_asset,signal){counts.reads++;if(block){const gate=block;block=undefined;gate.started.resolve();await Promise.race([gate.release.promise,new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}))]);}signal.throwIfAborted();return rows;}};
 const env={...helper(),location:{search:"",hostname:"test.invalid"},__fixture:fixture,matchMedia:()=>({matches:false}),pageIsHidden:()=>false,visibleReadinessDeadline:()=>()=>{},THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:1e6,mobile:1e6},estimateRetainedBuildingPayload:()=>({retainedPayloadEstimateBytes:64}),ownerShapePatchProfiles:()=>[],ownerShapePatchMetadata:()=>({components:[],geometryAdded:0}),ownerShapePatchDisplayRows:r=>r,c382BelowgroundDisplayRows:r=>r,modelHeightQuery:()=>({matches:true,verified:fixture.modelVerified}),viewportComponents:r=>r,componentViewportRecord:()=>({vertices:3}),viewportComponentDistance:()=>0,containsPosition:()=>true,sameStageComponents:(a,b)=>!!a&&a.length===b.length&&a.every((x,i)=>x===b[i]),paintIdentityOwner:()=>provider,createS434AggregateLifecycle:()=>({clear(){},packing:()=>undefined,update(){},get pending(){return fixture.s434Pending;}}),mergeShadowAdmissions:()=>undefined,shadowAdmissionForVisibleComponents:r=>r,verifiedInteriorSourceHolds:()=>[],progressiveAdmission:()=>undefined,prepareS528FormalDependency:()=>({candidates:r=>r,leafPriority:()=>0,componentPriority:()=>0,assertChosen(){},viewportRows:(_all,rows)=>rows,reserveAfter:()=>({vertices:0,bytes:0})}),s528DependencyCatalog:()=>[],f331CohortViewportRows277:(_all,rows)=>rows,f331CohortProfileSelected277:()=>false};
 for(const imp of ast.statements.filter(ts.isImportDeclaration))for(const e of imp.importClause?.namedBindings?.elements??[]){const name=e.name.text;if(name in env)continue;if(name.endsWith('VertexReservation'))env[name]=()=>0;else if(name.endsWith('PROFILES'))env[name]=[];else if(name.endsWith('CohortSelection')||name.includes('Residency70')||name==='prepareKOMesseturmSources70')env[name]=selection;else if(/Holds\d+$/.test(name))env[name]=()=>[];else if(/Plan\d+$/.test(name))env[name]=emptyPlan;else if(name.startsWith('supplement'))env[name]=rows=>rows;else if(name.endsWith('DisplayPlan')||name.endsWith('CofacePlan')||name.endsWith('ConnectorPlan')||name.endsWith('CrownPlan'))env[name]=emptyPlan;else if(name.endsWith('ParentReadiness'))env[name]=()=>({active:false,ready:true,entries:new Map()});else env[name]=()=>{throw Error('unisolated domain helper: '+name);};}
 const manager=compile(source,env).installThreeDimensionalMap({map,city:component.city,mobile:false,manageCamera:false,fetchBytes:()=>{throw Error('network forbidden');},onState:s=>states.push(s)});
 async function settle(){for(let i=0;i<200;i++){await new Promise(resolve=>setTimeout(resolve,1));if(fixture.inspect().visibleLoadsPending===0){await tick();return;}}throw Error('manager did not settle');}
 return {manager,map,view,canvas,counts,states,fixture,renderer,async start(){await manager.requestMode('3d',new AbortController().signal);assert.equal(loaded.length,1);assert.equal(manager.mode,'3d');},settle,materialChanged(){packedGeneration++;},blockNextRead(){block={started:deferred(),release:deferred()};return block;},recover(){manager.suspend({contextRecovery:true});manager.resume({contextRecovery:true});},get loaded(){return loaded;}};
}

for(const provider of providers){
 test(`${provider}: interrupted first preparation must finish through a fresh request`,async()=>{
  const h=harness(provider);try{const gate=h.blockNextRead(),initial=h.start().catch(error=>error);await gate.started.promise;const initialSignal=h.fixture.inspect().signal;h.manager.suspend({contextRecovery:true});assert(initialSignal.aborted);h.manager.resume({contextRecovery:true});gate.release.resolve();assert.equal((await initial).name,'AbortError');await h.settle();assert.equal(h.manager.mode,'3d');assert.equal(h.loaded.length,1);assert(h.counts.packs>0);}finally{h.manager.destroy();}
 });
 test(`${provider}: complete identical recovery reuses full/known-partial resident batch without pack/read`,async()=>{
  for(const coverageComplete of [true,false]){const h=harness(provider);h.fixture.modelVerified=coverageComplete;try{await h.start();assert.equal(h.states.at(-1).status,coverageComplete?'ready':'partial');const before={...h.counts},old=h.loaded,signal=h.fixture.inspect().signal;h.recover();await h.settle();assert.equal(h.counts.packs,before.packs);assert.equal(h.counts.prepares,before.prepares);assert.equal(h.counts.reads,before.reads);assert.equal(h.loaded,old);assert.equal(signal.aborted,false,'live material closures keep their valid source signal');assert.equal(h.manager.mode,'3d');assert(h.renderer.isPickReady());}finally{h.manager.destroy();}}
 });
 test(`${provider}: changed viewport/source/packed generation and ordinary resume refresh`,async()=>{
  const h=harness(provider);try{await h.start();for(const change of [()=>h.view.bounds[0]+=.001,()=>h.canvas.clientWidth+=1,()=>h.canvas.width+=1,()=>h.fixture.changeSource(),()=>h.materialChanged()]){h.manager.suspend({contextRecovery:true});change();const n=h.counts.packs;h.manager.resume({contextRecovery:true});await h.settle();assert(h.counts.packs>n,'changed recovery snapshot must repack');}const n=h.counts.packs;h.manager.suspend();h.manager.resume();await h.settle();assert(h.counts.packs>n,'ordinary suspension is not context-only reuse');}finally{h.manager.destroy();}
 });
 test(`${provider}: unfinished, cancelled and 2D re-entry never reuse stale batches`,async()=>{
  const h=harness(provider);try{await h.start();const gate=h.blockNextRead();h.map.emit('moveend');await gate.started.promise;const pendingSignal=h.fixture.inspect().signal;h.manager.suspend({contextRecovery:true});assert(pendingSignal.aborted);const n=h.counts.packs;h.manager.resume({contextRecovery:true});gate.release.resolve();await h.settle();assert(h.counts.packs>n);if(provider!=='church'){h.fixture.s434Pending=true;const pendingMaterialSignal=h.fixture.inspect().signal;h.manager.suspend({contextRecovery:true});assert(pendingMaterialSignal.aborted,'unfinished material plan cannot keep its request');h.fixture.s434Pending=false;const pendingMaterialPacks=h.counts.packs;h.manager.resume({contextRecovery:true});await h.settle();assert(h.counts.packs>pendingMaterialPacks);}await h.manager.requestMode('2d',new AbortController().signal);assert.equal(h.loaded.length,0);const empty=h.counts.packs;await h.start();assert(h.counts.packs>empty);h.map.emit('movestart');const cancelled=h.counts.packs;h.recover();await h.settle();assert(h.counts.packs>cancelled,'cancelled camera update invalidates completion');}finally{h.manager.destroy();}
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
function routingHarness(){
 const hooks={},sessions=[],providersSeen=[];
 const frozen={active:0,queued:0,pendingInitializers:0,activePhysicalBytes:0,declaredInFlightRawBytes:0,completedInitializers:5,parses:10};
 const renderer={setPageHidden(){},setReducedMotion(){},setOpacityContext(){},isPickReady:()=>true,get stats(){throw Error('routing must not read full diagnostics');}};
 const provider=(_name,options)=>{let mode='2d',signal;const record={suspend:[],resume:[]};providersSeen.push(record);return{async requestMode(next,external){signal=external;external.throwIfAborted();mode=next;options.onRenderer(renderer);options.onState({mode,status:'ready'});return{mode,status:'ready'};},get mode(){return mode;},get wantedMode(){return mode;},suspend(flags){record.suspend.push(flags);return flags?.contextRecovery===true&&!signal.aborted;},resume(flags){record.resume.push(flags);},setPageHidden(){},setReducedMotion(){},setOpacityContext(){},destroy(){}};};
 const painted=compile(factorySource('src/safety/painted-map.ts','__hooks.aggregateSignal=()=>request.signal;',true),{__hooks:hooks,__provider:provider,document:{hidden:false},location:{hostname:'test.invalid'},createSharedNativeSourcePool:()=>({client:()=>({}),destroy(){}}),planarReflectionGroup:()=>({}),assetRegistry:{},frozenPaintTableStats:()=>frozen,beginFrozenPaintTableInitialization:(_read,signal)=>{const session={signal,active:true,wait:p=>p,close(){this.active=false;}};sessions.push(session);return session;}}).installThreeDimensionalMap;
 const lazy=compile(factorySource('src/safety/three-dimensional-lazy.ts','__hooks.lazySignal=()=>modeRequest.signal;'),{__hooks:hooks,matchMedia:()=>({matches:false}),reichstagAppearanceVertexReservation:()=>0,checkedSceneEnvironment:x=>x}).installThreeDimensionalMap;
 const manager=lazy({map:{stop(){},easeTo(){}},city:'berlin',mobile:false,fetchBytes:()=>{throw Error('network forbidden');}},async()=>({installThreeDimensionalMap:painted}));
 return{manager,hooks,frozen,sessions,providersSeen,async start(){await manager.requestMode('3d',new AbortController().signal);assert.equal(manager.mode,'3d');assert.equal(providersSeen.length,5);assert.equal(sessions.length,1);}};
}

test('actual lazy + aggregate: quiet context recovery preserves both upstream signals and Frozen session',async()=>{
 const h=routingHarness();try{await h.start();const lazy=h.hooks.lazySignal(),aggregate=h.hooks.aggregateSignal(),session=h.sessions[0];assert.equal(h.manager.suspend({contextRecovery:true}),true);assert.equal(lazy.aborted,false);assert.equal(aggregate.aborted,false);assert.equal(session.active,true);h.manager.resume({contextRecovery:true});assert.equal(h.sessions.length,1);assert.equal(h.hooks.lazySignal(),lazy);assert.equal(h.hooks.aggregateSignal(),aggregate);for(const p of h.providersSeen){assert.equal(p.suspend.at(-1)?.contextRecovery,true);assert.equal(p.resume.at(-1)?.contextRecovery,true);}}finally{h.manager.destroy();}
});

test('actual lazy + aggregate: pending Frozen or ordinary pause still aborts and initializes',async()=>{
 for(const condition of ['active','queued','pendingInitializers','activePhysicalBytes','declaredInFlightRawBytes','ordinary']){
  const h=routingHarness();try{await h.start();const lazy=h.hooks.lazySignal(),aggregate=h.hooks.aggregateSignal();if(condition!=='ordinary')h.frozen[condition]=1;const flags=condition==='ordinary'?undefined:{contextRecovery:true};assert.equal(h.manager.suspend(flags),false,condition);assert(lazy.aborted,condition);assert(aggregate.aborted,condition);assert.equal(h.sessions[0].active,false);h.manager.resume(flags);assert.equal(h.sessions.length,2);assert.notEqual(h.hooks.aggregateSignal(),aggregate);for(const p of h.providersSeen){assert.equal(p.suspend.at(-1),undefined);assert.equal(p.resume.at(-1),undefined);}}finally{h.manager.destroy();}
 }
});

test('actual aggregate: Frozen parse generation change during pause rejects old residency',async()=>{
 const h=routingHarness();try{await h.start();const signal=h.hooks.aggregateSignal();assert.equal(h.manager.suspend({contextRecovery:true}),true);h.frozen.parses++;h.manager.resume({contextRecovery:true});assert(signal.aborted);assert.equal(h.sessions.length,2);for(const p of h.providersSeen)assert.equal(p.resume.at(-1),undefined);}finally{h.manager.destroy();}
});
