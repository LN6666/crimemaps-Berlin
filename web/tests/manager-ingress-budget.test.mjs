import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,webcrypto} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// Bootstrap ingress of all seven managers: index.json, city boundary and
// partition pages. The managers' own ensure(), read and parse helpers, request
// semaphore and destroy() run from their actual source text against the real
// page ledger, chunk store and byte transport. Only the network bytes, the
// renderer's boundary sink and the partition owner are fixtures.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),src=(...parts)=>path.join(web,'src',...parts);
// Optional negative control: <root>/<family>.ts replaces only the manager source.
const managerRoot=process.env.MANAGER_INGRESS_SOURCE_ROOT;
const managerFile=family=>managerRoot?path.join(managerRoot,family+'.ts'):src('painted',family,'safety','three-dimensional-map.ts');
// Optional negative control for the registry guard: a substitute page asset registry.
const registryFile=process.env.MANAGER_INGRESS_REGISTRY??src('safety','paint-asset-registry.json');
const families=['root500','infill','bremen','city','tier300','church','delegated500'];
const MiB=1024**2;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const flush=async(rounds=8)=>{for(let i=0;i<rounds;i++)await tick();};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const state=async promise=>{let value='pending';promise.then(()=>{value='fulfilled';},()=>{value='rejected';});await tick();return value;};
// Bounded fixture wait (event-loop turns, no timer) for a state the fixture drives.
const until=async(predicate,rounds=400)=>{for(let i=0;i<rounds;i++){if(predicate())return;await tick();}assert.fail('bounded fixture event did not occur');};
// A promise's outcome within bounded turns: 'fulfilled', the error name, or 'pending'.
// A regression that leaves work waiting fails its assertion instead of hanging.
async function outcomeOf(promise,rounds=400){let value='pending';promise.then(()=>{value='fulfilled';},error=>{value=error?.name??String(error);});for(let i=0;i<rounds&&value==='pending';i++)await tick();return value;}

// CommonJS view of the actual TypeScript runtime, cached before execution so the
// store/program-preparation function cycle resolves like the bundled page.
function loader(){
 const cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  new Function('require','module','exports',compiled.outputText)(request=>{
   assert.ok(request.startsWith('.'),'runtime dependency must be local: '+request);
   const base=path.resolve(path.dirname(file),request);
   for(const candidate of [base+'.ts',path.join(base,'index.ts')])if(fs.existsSync(candidate))return load(candidate);
   throw Error('Unresolved '+request+' from '+file);
  },module,module.exports);
  return module.exports;
 }
 return load;
}
const load=loader();
// One page's shared bootstrap module. Its solar boundary admission is a no-allocation
// double here; manager-ensure-admission.test.mjs runs the real index admission.
const budgetFile=src('safety','render-runtime','resource-budget.ts'),solarFile=src('safety','solar-shadow-admission.ts');
// Per page: an index counts as cached once its admission was awaited, as the
// managers check before they await it and before they commit.
const solarDouble=()=>{const cached=new Set();return{admitSolarShadowBoundary:async value=>{cached.add(value.boundarySHA256);return{boundarySHA256:value.boundarySHA256};},tryAdmitSolarShadowBoundary:value=>{cached.add(value.boundarySHA256);return{boundarySHA256:value.boundarySHA256};},onSolarShadowBoundaryCached:()=>()=>{},currentSolarShadowBoundary:sha=>cached.has(sha)?{boundarySHA256:sha}:undefined,solarShadowBoundaryIndexBytes:()=>0,SOLAR_BOUNDARY_INDEX_MODEL:{wrapperEstimateBytes:0}};};
function pageAdmission(){load(budgetFile);const solar=solarDouble(),cache=new Map([[solarFile,{exports:solar}]]);const scoped=file=>{if(cache.has(file))return cache.get(file).exports;if(file===budgetFile)return load(file);const module={exports:{}};cache.set(file,module);const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});new Function('require','module','exports',compiled.outputText)(request=>{const base=path.resolve(path.dirname(file),request);for(const candidate of [base+'.ts',path.join(base,'index.ts')])if(fs.existsSync(candidate))return scoped(candidate);throw Error('Unresolved '+request+' from '+file);},module,module.exports);return module.exports;};return{...scoped(src('safety','manager-ensure-admission.ts')),solar};}
const {createResourceBudget,ResourceBudgetExceededError}=load(src('safety','render-runtime','resource-budget.ts'));
const {createChunkResourceStore}=load(src('safety','render-runtime','chunk-resource-store.ts'));
const {createResourceByteTransport,resourceByteReadEnvelope,resourceByteAdmittedEnvelope}=load(src('safety','resource-byte-transport.ts'));
// The managers' own lifecycle collaborators, so destroy/suspend/hide run as on the page.
const {createRecoveryResidentReuse}=load(src('safety','recovery-resident-reuse.ts'));
const {createViewportRequestContinuation}=load(src('safety','viewport-request.ts'));
// One frozen implementation may be re-exported by a family; follow it to the source text.
function familySource(family,name){
 let file=src('painted',family,'safety',name);
 for(let hops=0;hops<4;hops++){const text=fs.readFileSync(file,'utf8'),match=text.match(/^export \* from '([^']+)';\s*$/m);if(!match||text.replace(/^\/\/.*$/mg,'').trim()!==match[0].trim())return text;file=path.resolve(path.dirname(file),match[1]+'.ts');}
 throw Error('Re-export chain too long for '+family+' '+name);
}

// Instrumented globals: the order of admission, SHA copies, text decoding and
// JSON parsing is observed without touching process-wide globals.
const view=budget=>{const s=budget.stats,c=name=>s.categories[name]?.bytes??0;return{bytes:s.bytes,read:c('read'),construction:c('construction'),inflate:c('inflate'),decoded:c('decoded'),metadata:c('metadata'),recent:s.recentBytes,reservations:s.reservations,listeners:s.availabilityListeners};};
function instruments(events,budget){
 const Decoder=class extends TextDecoder{decode(input,options){events.push(['decode',input.byteLength,view(budget)]);return super.decode(input,options);}};
 return{
  crypto:{subtle:{digest:async(algorithm,data)=>{events.push(['digest',data.byteLength,view(budget)]);return webcrypto.subtle.digest(algorithm,data);}}},
  TextDecoder:Decoder,
  JSON:{parse:(text,reviver)=>{events.push(['parse',text.length,view(budget)]);return JSON.parse(text,reviver);},stringify:JSON.stringify},
 };
}
const strictScope=values=>new Proxy(values,{has:()=>true,get:(target,key)=>{if(key===Symbol.unscopables)return undefined;if(key in target)return target[key];if(key in globalThis)return globalThis[key];throw new ReferenceError('Missing manager fixture binding: '+String(key));},set:(target,key,value)=>(target[key]=value,true)});
const inert=new Proxy(function(){},{get:(_target,key)=>key===Symbol.toPrimitive?()=>0:key==='then'?undefined:inert,apply:()=>inert,construct:()=>inert});
const looseScope=values=>new Proxy(values,{has:()=>true,get:(target,key)=>{if(key===Symbol.unscopables)return undefined;if(key in target)return target[key];if(key in globalThis)return globalThis[key];return inert;},set:(target,key,value)=>(target[key]=value,true)});
function scoped(text,scope){
 const js=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports={};
 Function('scope','exports','with(scope){'+js+'}')(scope,exports);return exports;
}

// The manager source: module-level validation/parse helpers, the request
// semaphore and ledger helpers inside installThreeDimensionalMap, ensure() and
// the returned destroy() method, all verbatim.
const MODULE_NAMES=['HASH','pathValid','assetValid','bboxValid','parseManifest','parseBoundary','decoded','checkedBytes','checked','BOOTSTRAP_JSON_EXPANSION','bootstrapParseCosts','bootstrapRetainedCost'];
const INSTALL_NAMES=['fetchLifetime','queue','pump','scheduled','fetchBounded','bootstrapPressure','unfitBootstrap','admitBootstrap','acquireBounded','parseBootstrap','ensure'];
const declared=(node,names)=>ts.isFunctionDeclaration(node)?names.includes(node.name?.text):ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>ts.isIdentifier(item.name)&&names.includes(item.name.text));
const sources=new Map();
for(const family of families){
 const file=managerFile(family),text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 assert.equal(ast.parseDiagnostics.length,0,family);
 const install=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='installThreeDimensionalMap');assert(install?.body,family);
 const moduleParts=ast.statements.filter(node=>declared(node,MODULE_NAMES)),installParts=install.body.statements.filter(node=>declared(node,INSTALL_NAMES));
 const found=name=>[...moduleParts,...installParts].some(node=>declared(node,[name]));
 for(const name of [...MODULE_NAMES,...INSTALL_NAMES.filter(name=>name!=='fetchLifetime')])assert(found(name),family+' declares '+name);
 const ensure=installParts.find(node=>ts.isFunctionDeclaration(node)&&node.name.text==='ensure');
 const returned=install.body.statements.findLast(node=>ts.isReturnStatement(node)&&node.expression&&ts.isObjectLiteralExpression(node.expression));
 const method=name=>returned.expression.properties.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(ast)===name);
 const destroy=method('destroy'),suspend=method('suspend'),setPageHidden=method('setPageHidden');assert(destroy&&suspend&&setPageHidden,family);
 // root500 and infill route page visibility through their install-level setWorkHidden().
 const workHidden=install.body.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='setWorkHidden');
 const compile=code=>ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 sources.set(family,{text,ensure,ast,
  body:compile([...moduleParts,...installParts].map(node=>node.getText(ast)).join('\n')+'\nreturn {ensure,queue,stats:()=>({active,peak,queued:queue.length})};'),
  destroy:compile('return ({'+destroy.getText(ast)+'}).destroy;'),
  suspend:compile('return ({'+suspend.getText(ast)+'}).suspend;'),
  setPageHidden:compile((workHidden?workHidden.getText(ast)+'\n':'')+'return ({'+setPageHidden.getText(ast)+'}).setPageHidden;')});
}

function familyModules(family,scope){
 const gzip=scoped(familySource(family,'bounded-3d-gzip.ts'),scope);
 return{decodeBounded3DAssetJSON:gzip.decodeBounded3DAssetJSON,
  estimateRetainedBuildingPayload:load(src('painted',family,'safety','building-payload-cost.ts')).estimateRetainedBuildingPayload,
  validModelHeight:load(src('painted',family,'safety','three-dimensional-query.ts')).validModelHeight};
}

// Synthetic but schema-valid bootstrap documents. A long boundary ring gives the
// boundary parse a working set larger than its two-copy read envelope.
const encode=value=>new TextEncoder().encode(JSON.stringify(value));
const SOURCE=sha('fixture source pbf');
function documents({shards=1,partitioned=false,boundaryPoints}={}){
 const ring=boundaryPoints===undefined?[[13.3,52.4],[13.5,52.4],[13.5,52.6],[13.3,52.6],[13.3,52.4]]:[...Array.from({length:boundaryPoints},(_,i)=>[13.3+(i%1000)*1e-4,52.4+Math.floor(i/1000)*1e-4]),[13.3,52.4]];
 const boundary=encode({type:'FeatureCollection',city:'berlin',source_pbf_sha256:SOURCE,features:[{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[ring]}}]});
 const pageRaw=encode({schema_version:1,city:'berlin',source_pbf_sha256:SOURCE,bbox_kind:'compiled-mesh-ground-envelope',shards:[{id:'leaf',tile_key:'leaf',path:'/safety/buildings3d/berlin/leaf.json',sha256:sha('leaf'),bytes:100,vertices:3,bbox:[13.3,52.4,13.4,52.5],lod:1}]});
 const page=new Uint8Array(gzipSync(pageRaw));
 const shardRows=Array.from({length:shards},(_,i)=>({id:'shard-'+i,tile_key:'tile-'+i,path:'/safety/buildings3d/berlin/shard-'+String(i).padStart(6,'0')+'.json',sha256:sha('shard '+i),bytes:1000+i,vertices:3,bbox:[13.3,52.4,13.31,52.41],lod:1}));
 const pageAsset={id:'partition-1',bbox:[13.3,52.4,13.5,52.6],path:'/safety/buildings3d/berlin/partition-1.json.gz',sha256:sha(page),bytes:page.byteLength,compression:'gzip',uncompressed_bytes:pageRaw.byteLength,uncompressed_sha256:sha(pageRaw)};
 const index=encode({schema_version:1,city:'berlin',source_snapshot:'fixture snapshot',source_pbf_sha256:SOURCE,compiler_sha256:sha('compiler'),
  city_boundary:{path:'/safety/buildings3d/berlin/city-boundary.json',sha256:sha(boundary),bytes:boundary.byteLength},
  ...(partitioned?{index_type:'partitioned-city3d-v1',partitions:[pageAsset]}:{shards:shardRows})});
 return{index,boundary,page,pageRaw,pageAsset,files:new Map([['/safety/buildings3d/index.json',index],['/safety/buildings3d/berlin/city-boundary.json',boundary],[pageAsset.path,page]])};
}
// The raw network edge: records ledger state at the instant a read starts. A
// held path answers only after release(), or rejects when its signal aborts.
function network(budget,files,events,{hold=new Set()}={}){
 const calls=[],starts=new EventTarget();
 const read=(name,requestPath,signal,max)=>{
  const call={name,path:requestPath,signal,max,at:view(budget),gate:deferred()};calls.push(call);starts.dispatchEvent(new Event(requestPath));events.push(['read',requestPath,call.at]);
  const bytes=files.get(requestPath);
  if(!hold.has(requestPath))call.gate.resolve();
  return new Promise((resolve,reject)=>{
   const abort=()=>reject(signal.reason??new DOMException('Aborted','AbortError'));
   if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});
   call.gate.promise.then(()=>{signal.removeEventListener('abort',abort);if(signal.aborted)abort();else if(!bytes)reject(TypeError('Fixture network has no '+requestPath));else resolve(bytes.slice());},reject);
  });
 };
 function whenStarted(requestPath){
  if(calls.some(call=>call.path===requestPath))return Promise.resolve();
  return new Promise(resolve=>starts.addEventListener(requestPath,resolve,{once:true}));
 }
 return{calls,read,hold,whenStarted};
}

// One page: ledger, chunk store, network edge and optionally the byte transport.
// painted-map gives every manager of a page the same ledger, store and transport.
function pageFixture({transport=false,limitBytes=64*MiB,shards,partitioned,hold,boundaryPoints,namespace='fixture-page'}={}){
 const events=[],budget=createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,8*MiB)}),store=createChunkResourceStore({budget});
 const docs=documents({shards,partitioned,boundaryPoints}),net=network(budget,docs.files,events,{hold});
 const page=transport?createResourceByteTransport({namespace,resourceStore:store,read:(requestPath,signal,max)=>net.read('transport',requestPath,signal,max)}):undefined;
 return{events,budget,store,docs,net,page,admission:pageAdmission()};
}
function manager(family,{shared,...settings}={}){
 const {events,budget,store,docs,net,page,admission}=shared??pageFixture({...settings,namespace:'fixture-'+family});
 const scope={events,renderer:{layer:{id:'fixture-'+family},destroy(){events.push(['renderer.destroy']);},setEnabled(){},setPageHidden(){},setSolarShadowBoundary(value){events.push(['solar-boundary',value.boundarySHA256,view(budget)]);}},
  manifest:undefined,manifestSHA:undefined,boundary:undefined,partitions:undefined,partitionOptions:undefined,bootstrapRetained:undefined,facadeHelpers:undefined,
  destroyed:false,active:0,peak:0,city:'berlin',mobile:false,resources:store,resourceStore:store,ResourceBudgetExceededError,resourceByteReadEnvelope,resourceByteAdmittedEnvelope,
  acquireManagerBootstrap:admission.acquireManagerBootstrap,ManagerAdmissionRetry:admission.ManagerAdmissionRetry,retryManagerAdmission:admission.retryManagerAdmission,admitSolarShadowBoundary:admission.solar.admitSolarShadowBoundary,currentSolarShadowBoundary:admission.solar.currentSolarShadowBoundary,
  // The state requestMode() establishes before it awaits ensure(own.signal):
  // request=own, a 3D preparing ticket and the mode intent's real continuation;
  // camera, visible-load and aggregate work are idle during bootstrap.
  request:new AbortController(),preparingTicket:1,wantedMode:'3d',pageHidden:false,documentHidden:false,viewportVisible:true,suspended:false,
  cameraMotionTicket:undefined,ownCameraStartingTicket:undefined,visibleLoadsPending:0,s434Aggregate:{pending:false,clear(){}},
  recoveryResident:createRecoveryResidentReuse(()=>undefined),modeRequests:createViewportRequestContinuation(()=>false),
  installThreeDimensionalPartitions(options){scope.partitionOptions=options;return{fixture:'partition owner',clear(){}};}};
 Object.assign(scope,instruments(events,budget));Object.assign(scope,familyModules(family,scope));
 if(page)scope.options={acquireBytes:page.acquireBytes,fetchBytes:(requestPath,signal,max)=>{events.push(['compat-read',requestPath]);return page.readBytes(requestPath,signal,max);}};
 else scope.options={fetchBytes:(requestPath,signal,max)=>net.read('raw',requestPath,signal,max)};
 const {body,destroy,suspend,setPageHidden}=sources.get(family),api=new Function('env','with(env){'+body+'}')(strictScope(scope));
 scope.queue=api.queue;
 // Returned lifecycle methods run verbatim; what they reach beyond this fixture
 // (map, renderer pipeline, source pools) is inert.
 const lifecycle=code=>new Function('env','with(env){'+code+'}')(looseScope(scope));
 return{family,events,budget,store,docs,net,scope,page,
  ensure:signal=>api.ensure(signal),stats:api.stats,
  destroy:()=>lifecycle(destroy)(),suspend:settings=>lifecycle(suspend)(settings),setPageHidden:value=>lifecycle(setPageHidden)(value),
  readPage:signal=>scope.partitionOptions.read(docs.pageAsset,signal)};
}
const kinds=events=>events.map(([kind,detail])=>kind==='read'||kind==='compat-read'?kind+' '+detail:kind);
const retained=(m,value)=>m.scope.estimateRetainedBuildingPayload(value).retainedPayloadEstimateBytes;

test('the seven managers carry one identical ingress implementation and keep the renderer branch first',()=>{
 const normalized=family=>{
  const {ast,ensure,text}=sources.get(family),pick=names=>[...ast.statements,...ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='installThreeDimensionalMap').body.statements].filter(node=>declared(node,names)).map(node=>node.getText(ast)).join('\n');
  assert(ts.isIfStatement(ensure.body.statements[0])&&ensure.body.statements[0].expression.getText(ast)==='!renderer',family+' renderer creation stays ensure statement 0');
  assert(text.includes('manifest=value;renderer!.setSolarShadowBoundary({geometry:boundary,boundarySHA256:value.city_boundary.sha256});'),family);
  return pick(['BOOTSTRAP_JSON_EXPANSION','bootstrapParseCosts','bootstrapRetainedCost','bootstrapPressure','unfitBootstrap','admitBootstrap','acquireBounded','parseBootstrap'])+'\n'+ensure.body.statements.slice(1).map(node=>node.getText(ast)).join('\n');
 };
 const reference=normalized('root500').replaceAll('resources.budget','STORE.budget');
 for(const family of families)assert.equal(normalized(family).replaceAll(/\bresources?(?:Store)?\.budget/g,'STORE.budget'),reference,family+' ingress differs from root500');
});

test('raw reader: each read envelope and parse working set is admitted before its bytes, copies, text or graph exist',async()=>{
 for(const family of families){
  const m=manager(family),signal=new AbortController().signal;
  await m.ensure(signal);
  const {index,boundary}=m.docs,reads=m.net.calls;
  assert.deepEqual(reads.map(call=>[call.path,call.max]),[['/safety/buildings3d/index.json',MiB],['/safety/buildings3d/berlin/city-boundary.json',4*MiB]],family);
  assert.deepEqual([reads[0].at.read,reads[0].at.reservations],[2*MiB,1],family+' two-copy index envelope precedes the read');
  const manifestCost=retained(m,m.scope.manifest);
  assert.deepEqual([reads[1].at.read,reads[1].at.metadata,reads[1].at.construction,reads[1].at.decoded],[8*MiB,manifestCost,0,0],family+' boundary envelope beside only the retained manifest');
  assert.deepEqual(kinds(m.events),['read /safety/buildings3d/index.json','digest','decode','parse','read /safety/buildings3d/berlin/city-boundary.json','digest','decode','parse','solar-boundary'],family);
  const [,indexDigestBytes,atIndex]=m.events[1],[,,atBoundary]=m.events[5];
  assert.equal(indexDigestBytes,index.byteLength,family+' manifest SHA reads its own copy');
  assert.deepEqual([atIndex.read,atIndex.construction,atIndex.decoded],[index.byteLength,4*index.byteLength,24*index.byteLength+64],family+' manifest working set admitted before the SHA copy');
  assert.deepEqual([atBoundary.read,atBoundary.construction,atBoundary.decoded,atBoundary.metadata],[boundary.byteLength,4*boundary.byteLength,24*boundary.byteLength+64,manifestCost],family+' boundary working set admitted before checked()');
  assert(atIndex.decoded>=retained(m,JSON.parse(new TextDecoder().decode(index))),family+' parse bound covers the parsed manifest');
  assert(atBoundary.decoded>=retained(m,JSON.parse(new TextDecoder().decode(boundary))),family+' parse bound covers the parsed boundary');
  assert.equal(m.scope.manifestSHA,sha(index),family);assert.equal(m.scope.manifest.city,'berlin');assert.equal(m.scope.boundary.type,'Polygon',family);
  const boundaryCost=retained(m,m.scope.boundary);
  assert.deepEqual(view(m.budget),{bytes:manifestCost+boundaryCost,read:0,construction:0,inflate:0,decoded:0,metadata:manifestCost+boundaryCost,recent:0,reservations:1,listeners:0},family+' only the retained estimate stays charged');
  assert.equal(m.scope.bootstrapRetained.bytes,manifestCost+boundaryCost,family);
  assert.equal(m.events.at(-1)[2].bytes,manifestCost+boundaryCost,family+' renderer receives a boundary already charged once');
  m.destroy();assert.equal(m.scope.bootstrapRetained,undefined,family);assert.deepEqual(view(m.budget),{bytes:0,read:0,construction:0,inflate:0,decoded:0,metadata:0,recent:0,reservations:0,listeners:0},family+' destroy returns the retained claim');
 }
});

test('page transport: bootstrap reads use exact transport leases, never a second envelope or the compatibility reader',async()=>{
 for(const family of families){
  const m=manager(family,{transport:true,partitioned:true}),signal=new AbortController().signal;
  await m.ensure(signal);
  const {index,boundary,page,pageRaw}=m.docs;
  assert.deepEqual(m.net.calls.map(call=>[call.name,call.path,call.at.read]),[['transport','/safety/buildings3d/index.json',2*MiB],['transport','/safety/buildings3d/berlin/city-boundary.json',8*MiB+index.byteLength]],family+' the transport alone admits each two-copy envelope; the released index is its bounded recent copy');
  assert(!m.events.some(([kind])=>kind==='compat-read'),family+' compatibility readBytes is not used');
  const atIndex=m.events.find(([kind])=>kind==='digest')[2];
  assert.deepEqual([atIndex.read,atIndex.construction,atIndex.decoded],[index.byteLength,4*index.byteLength,24*index.byteLength+64],family+' exact transport lease beside the admitted working set');
  const manifestCost=retained(m,m.scope.manifest),boundaryCost=retained(m,m.scope.boundary);
  assert.deepEqual(view(m.budget),{bytes:index.byteLength+manifestCost+boundaryCost,read:index.byteLength,construction:0,inflate:0,decoded:0,metadata:manifestCost+boundaryCost,recent:index.byteLength,reservations:2,listeners:0},family+' boundary bytes left with their lease; the small index is only the bounded recent copy');
  assert.equal(typeof m.scope.partitionOptions.read,'function',family);
  m.events.length=0;
  const {value:parsed,claim}=await m.readPage(signal);
  assert.deepEqual(parsed,JSON.parse(new TextDecoder().decode(pageRaw)),family);
  assert.deepEqual(kinds(m.events),['read '+m.docs.pageAsset.path,'digest','digest','decode','parse'],family+' physical SHA, raw SHA, text and parse follow admission');
  const atPage=m.events[1][2];
  assert.deepEqual([atPage.read-index.byteLength,atPage.inflate,atPage.construction,atPage.decoded],[page.byteLength,page.byteLength+3*pageRaw.byteLength,2*page.byteLength+2*pageRaw.byteLength,24*pageRaw.byteLength+64],family+' gzip page working set admitted before inflation');
  const working=page.byteLength+3*pageRaw.byteLength+2*page.byteLength+2*pageRaw.byteLength+24*pageRaw.byteLength+64;
  assert.deepEqual(view(m.budget),{bytes:index.byteLength+page.byteLength+manifestCost+boundaryCost+working,read:index.byteLength+page.byteLength,construction:2*page.byteLength+2*pageRaw.byteLength,inflate:page.byteLength+3*pageRaw.byteLength,decoded:24*pageRaw.byteLength+64,metadata:manifestCost+boundaryCost,recent:index.byteLength+page.byteLength,reservations:4,listeners:0},family+' hand-off: read() returns the page with the claim holding its working set; the raw page read is returned (only the bounded recent copy stays)');
  claim.release();
  assert.deepEqual(view(m.budget),{bytes:index.byteLength+page.byteLength+manifestCost+boundaryCost,read:index.byteLength+page.byteLength,construction:0,inflate:0,decoded:0,metadata:manifestCost+boundaryCost,recent:index.byteLength+page.byteLength,reservations:3,listeners:0},family+' the partition owner that receives the claim decides its lifetime (partition-page-lease.test.mjs)');
  m.destroy();m.page.destroy();assert.equal(m.budget.stats.bytes,0,family);assert.equal(boundary.byteLength>0,true);
 }
});

test('an invalidated request cancels the in-flight read and returns every claim on both paths',{timeout:30_000},async()=>{
 for(const transport of [false,true])for(const family of families){
  const label=family+(transport?' transport':' raw');
  const m=manager(family,{transport,hold:new Set(['/safety/buildings3d/index.json'])}),controller=new AbortController();
  const running=m.ensure(controller.signal);
  await Promise.race([m.net.whenStarted('/safety/buildings3d/index.json'),running.then(()=>assert.fail(label+' finished before the held manifest read'))]);
  assert.equal(m.net.calls.length,1,label);assert(m.budget.stats.bytes>=2*MiB,label+' envelope held while reading');
  controller.abort();await assert.rejects(running,{name:'AbortError'});await flush();
  assert(m.net.calls[0].signal.aborted,label+' network read is cancelled');
  assert.deepEqual(view(m.budget),{bytes:0,read:0,construction:0,inflate:0,decoded:0,metadata:0,recent:0,reservations:0,listeners:0},label);
  assert.equal(m.scope.manifest,undefined,label);assert.equal(m.scope.bootstrapRetained,undefined,label);assert.equal(m.stats().active,0,label);
  // A boundary invalidated mid-read also returns the manifest's retained estimate.
  const n=manager(family,{transport,hold:new Set(['/safety/buildings3d/berlin/city-boundary.json'])}),next=new AbortController(),pending=n.ensure(next.signal);
  await Promise.race([n.net.whenStarted('/safety/buildings3d/berlin/city-boundary.json'),pending.then(()=>assert.fail(label+' finished before the held boundary read'))]);
  assert.equal(n.net.calls.length,2,label);assert(n.budget.stats.categories.metadata?.bytes>0,label+' manifest estimate held during the boundary read');
  next.abort();await assert.rejects(pending,{name:'AbortError'});await flush();
  assert.equal(n.budget.stats.categories.metadata?.bytes??0,0,label);assert.equal(n.budget.stats.categories.construction?.bytes??0,0,label);assert.equal(n.budget.stats.reservations,transport?1:0,label+' only the bounded transport recent index copy may remain');
  assert.equal(n.scope.manifest,undefined,label);n.page?.destroy();assert.equal(n.budget.stats.bytes,0,label);
 }
});

test('valid work waits on availability with its signal and resumes; an invalidated waiter leaves no listener or claim',async()=>{
 for(const family of families){
  // Read envelope wait (raw path). The ledger can hold the 8 MiB boundary envelope later.
  const m=manager(family,{limitBytes:10*MiB}),blocker=m.budget.reserve({category:'construction',bytes:9*MiB,precision:'estimate'},{label:'fixture blocker'});
  const running=m.ensure(new AbortController().signal);await flush();
  assert.equal(await state(running),'pending',family);assert.equal(m.net.calls.length,0,family+' no read before admission');assert.equal(m.budget.stats.availabilityListeners,1,family);
  blocker.release();await running;assert.equal(m.net.calls.length,2,family);assert.equal(m.budget.stats.availabilityListeners,0,family);assert.ok(m.scope.manifest,family);
  const n=manager(family,{limitBytes:10*MiB}),held=n.budget.reserve({category:'construction',bytes:9*MiB,precision:'estimate'}),controller=new AbortController(),waiting=n.ensure(controller.signal);await flush();
  assert.equal(n.budget.stats.availabilityListeners,1,family);controller.abort();await assert.rejects(waiting,{name:'AbortError'});
  assert.deepEqual([n.budget.stats.bytes,n.budget.stats.reservations,n.budget.stats.availabilityListeners,n.net.calls.length],[9*MiB,1,0,0],family+' cancelled waiter returns everything');held.release();
  // Parse working set wait: the read fits, its larger working set waits for capacity.
  for(const transport of [false,true]){
   const p=manager(family,{transport,limitBytes:16*MiB,shards:700}),N=p.docs.index.byteLength,work=28*N+64,gate=p.budget.reserve({category:'construction',bytes:16*MiB-2*MiB-N-1024,precision:'estimate'});
   assert(N>150_000&&N<MiB&&work>2*MiB,family+' fixture index needs a working set larger than its envelope');
   const pending=p.ensure(new AbortController().signal);await flush(16);
   assert.equal(await state(pending),'pending',family);assert.equal(p.net.calls.length,1,family);assert(!p.events.some(([kind])=>kind==='digest'),family+' no SHA copy before admission');
   assert.deepEqual([p.budget.stats.categories.read?.bytes??0,p.budget.stats.availabilityListeners],[transport?p.docs.index.byteLength:0,1],family+' the refused working set returned its exact read and waits holding nothing; only the transport\'s bounded recent copy stays');
   gate.release();await pending;assert.ok(p.scope.manifest,family);assert.equal(p.scope.manifest.shards.length,700,family);assert.equal(p.budget.stats.availabilityListeners,0,family);p.page?.destroy();
  }
 }
});

test('a read or working set larger than the page ledger reports not-fit at once with no read, copy or claim',async()=>{
 for(const transport of [false,true])for(const family of families){
  const label=family+(transport?' transport':' raw');
  const m=manager(family,{transport,limitBytes:1.5*MiB});
  await assert.rejects(m.ensure(new AbortController().signal),error=>error instanceof ResourceBudgetExceededError,label);
  assert.equal(m.net.calls.length,0,label+' no network read');assert.deepEqual(view(m.budget),{bytes:0,read:0,construction:0,inflate:0,decoded:0,metadata:0,recent:0,reservations:0,listeners:0},label);
  const n=manager(family,{transport,limitBytes:4*MiB,shards:700});
  await assert.rejects(n.ensure(new AbortController().signal),error=>error instanceof ResourceBudgetExceededError&&error.capacity===4*MiB,label);
  assert.equal(n.net.calls.length,1,label);assert(!n.events.some(([kind])=>kind==='digest'||kind==='decode'||kind==='parse'),label+' no SHA copy, text or parse');
  assert.deepEqual([n.budget.stats.categories.construction?.bytes??0,n.budget.stats.categories.decoded?.bytes??0,n.budget.stats.availabilityListeners,n.budget.stats.reservations],[0,0,0,transport?1:0],label);
  assert.equal(n.scope.manifest,undefined,label);n.page?.destroy();assert.equal(n.budget.stats.bytes,0,label);
 }
});

test('partition pages: cancellation returns the page claim and a corrupted page releases everything',async()=>{
 for(const transport of [false,true])for(const family of families){
  const label=family+(transport?' transport':' raw');
  const m=manager(family,{transport,partitioned:true});await m.ensure(new AbortController().signal);
  const before=view(m.budget),pagePath=m.docs.pageAsset.path;
  m.net.calls.length=0;m.net.hold.add(pagePath);
  const controller=new AbortController(),reading=m.readPage(controller.signal);await flush();
  assert.equal(m.net.calls.length,1,label);assert.equal(m.net.calls[0].at.read-before.read,2*MiB,label+' two-copy page envelope admitted before the read');
  controller.abort();await assert.rejects(reading,{name:'AbortError'});await flush();
  assert(m.net.calls[0].signal.aborted,label+' page read cancelled');
  assert.deepEqual(view(m.budget),before,label+' cancelled page read returns its envelope');
  m.net.hold.delete(pagePath);const corrupt=m.docs.files.get(pagePath).slice();corrupt[corrupt.length-1]^=0xff;m.docs.files.set(pagePath,corrupt);
  await assert.rejects(m.readPage(new AbortController().signal),/hash mismatch/,label);await flush();
  const after=view(m.budget);
  assert.deepEqual([after.construction,after.inflate,after.decoded,after.metadata,after.listeners],[0,0,0,before.metadata,0],label+' a rejected page leaves no working set');
  assert(!m.events.slice(-3).some(([kind])=>kind==='decode'||kind==='parse'),label+' a corrupted page is never decoded');
  m.destroy();m.page?.destroy();assert.equal(m.budget.stats.bytes,0,label);
 }
});

test('a rejected boundary or manifest leaves no retained estimate and no published manifest',async()=>{
 for(const family of families){
  const m=manager(family),bad=m.docs.boundary.slice();bad[0]^=0x01;m.docs.files.set('/safety/buildings3d/berlin/city-boundary.json',bad);
  await assert.rejects(m.ensure(new AbortController().signal),/hash mismatch/,family);
  assert.deepEqual(view(m.budget),{bytes:0,read:0,construction:0,inflate:0,decoded:0,metadata:0,recent:0,reservations:0,listeners:0},family);
  assert.equal(m.scope.manifest,undefined,family);assert.equal(m.scope.boundary,undefined,family);assert.equal(m.scope.bootstrapRetained,undefined,family);
  const n=manager(family);n.docs.files.set('/safety/buildings3d/index.json',encode({schema_version:1,city:'hamburg'}));
  await assert.rejects(n.ensure(new AbortController().signal),/Invalid city3D manifest/,family);
  assert.equal(n.budget.stats.bytes,0,family);assert.equal(n.net.calls.length,1,family+' no boundary read for an invalid manifest');
 }
});

// Retained estimates of one family's parsed fixture documents, from its own parse.
async function parsedEstimates(family,settings){
 const probe=manager(family,settings);await probe.ensure(new AbortController().signal);
 const value={manifest:retained(probe,probe.scope.manifest),boundary:retained(probe,probe.scope.boundary),boundaryBytes:probe.docs.boundary.byteLength};
 probe.destroy();probe.page?.destroy();return value;
}

test('a boundary read envelope that cannot fit beside the same request\'s manifest estimate reports not-fit at once on both paths',{timeout:30_000},async()=>{
 for(const family of families){
  const {manifest:M}=await parsedEstimates(family,{shards:700});
  for(const transport of [false,true]){
   const label=family+(transport?' transport':' raw');
   // The 8 MiB boundary envelope and the whole index stage each fit this ledger,
   // but the envelope cannot coexist with the manifest estimate this request
   // holds: only this request could return that capacity, so a wait never ends.
   const limitBytes=8*MiB+Math.floor(M/2),m=manager(family,{transport,limitBytes,shards:700}),controller=new AbortController();
   const registered=deferred(),waiting=Symbol('ledger capacity wait'),onAvailable=m.budget.onAvailable;
   m.budget.onAvailable=(...args)=>{const remove=onAvailable(...args);registered.resolve(waiting);return remove;};
   const running=m.ensure(controller.signal).then(()=>undefined,error=>error);
   const outcome=await Promise.race([running,registered.promise]);
   if(outcome===waiting){controller.abort();await running;assert.fail(label+' the boundary read waited for capacity only this request could return');}
   assert(outcome instanceof ResourceBudgetExceededError,label+' typed not-fit');
   assert.deepEqual([outcome.capacity,outcome.required,outcome.shortfallBytes,outcome.constraint],[limitBytes,M+8*MiB,M+8*MiB-limitBytes,'total'],label+' the envelope beside the held estimate exceeds the whole ledger');
   assert.deepEqual(m.net.calls.map(call=>call.path),['/safety/buildings3d/index.json'],label+' no boundary network read');
   assert.deepEqual(kinds(m.events),['read /safety/buildings3d/index.json','digest','decode','parse'],label+' no boundary SHA copy, text or parse');
   const settled=view(m.budget);
   assert.deepEqual([settled.metadata,settled.construction,settled.decoded,settled.inflate,settled.listeners,settled.read],[0,0,0,0,0,settled.recent],label+' the manifest estimate is returned; at most the bounded recent index copy stays');
   assert.equal(m.scope.manifest,undefined,label);assert.equal(m.scope.bootstrapRetained,undefined,label);
   m.page?.destroy();assert.equal(m.budget.stats.bytes,0,label);
  }
 }
});

test('destroy, a context-loss suspend and page hiding abort ensure() through the request it runs under and return every bootstrap claim',async()=>{
 for(const transport of [false,true])for(const family of families){
  const label=family+(transport?' transport':' raw');
  // destroy() while the index read envelope waits for capacity.
  const a=manager(family,{transport,limitBytes:10*MiB}),blocker=a.budget.reserve({category:'mask',bytes:9*MiB,precision:'estimate'},{label:'fixture blocker'});
  const waiting=a.ensure(a.scope.request.signal);await flush();
  assert.equal(await state(waiting),'pending',label);assert.deepEqual([a.net.calls.length,a.budget.stats.availabilityListeners],[0,1],label+' the read envelope waits on availability');
  a.destroy();assert.equal(await outcomeOf(waiting),'AbortError',label+' destroy aborts the waiting ensure');await flush();
  assert.deepEqual(view(a.budget),{bytes:9*MiB,read:0,construction:0,inflate:0,decoded:0,metadata:0,recent:0,reservations:1,listeners:0},label+' destroy during the envelope wait leaves only the blocker');
  assert.equal(a.net.calls.length,0,label+' no read starts after destroy');assert.equal(a.scope.manifest,undefined,label);assert.equal(a.scope.bootstrapRetained,undefined,label);
  blocker.release();a.page?.destroy();
  // destroy() while the boundary read is in flight beside the held manifest estimate.
  const b=manager(family,{transport,hold:new Set(['/safety/buildings3d/berlin/city-boundary.json'])}),reading=b.ensure(b.scope.request.signal);
  await until(()=>b.net.calls.length===2);assert(b.budget.stats.categories.metadata?.bytes>0,label+' manifest estimate held during the boundary read');
  b.destroy();assert.equal(await outcomeOf(reading),'AbortError',label+' destroy aborts the reading ensure');await flush();
  assert(b.net.calls[1].signal.aborted,label+' boundary network read cancelled');
  let settled=view(b.budget);
  assert.deepEqual([settled.metadata,settled.construction,settled.decoded,settled.inflate,settled.listeners,settled.read],[0,0,0,0,0,settled.recent],label+' destroy during the boundary read leaves at most the bounded recent index copy');
  assert.equal(b.scope.manifest,undefined,label);assert.equal(b.scope.bootstrapRetained,undefined,label);
  b.page?.destroy();assert.equal(b.budget.stats.bytes,0,label);
  // A context-loss suspend and page hiding while the boundary parse working set waits.
  for(const [interruption,interrupt] of [['suspend',m=>assert.equal(m.suspend({contextRecovery:true}),false,label+' work in preparation is never kept across context loss')],['hidden',m=>m.setPageHidden(true)]]){
   const m=manager(family,{transport,limitBytes:32*MiB,boundaryPoints:40_000}),B=m.docs.boundary.byteLength,work=28*B+64;
   const gate=m.budget.reserve({category:'mask',bytes:20*MiB,precision:'estimate'},{label:'fixture gate'});
   assert(work>12*MiB&&B+work<31*MiB,label+' fixture boundary working set waits beside the gate yet fits the whole ledger');
   const running=m.ensure(m.scope.request.signal);
   await until(()=>m.net.calls.length===1&&m.budget.stats.availabilityListeners===1);
   assert.deepEqual(kinds(m.events),['read /safety/buildings3d/index.json','digest','decode','parse'],label+' '+interruption+': the boundary stage (read envelope and working set) waits before its read, holding nothing');
   assert.equal(await state(running),'pending',label+' '+interruption);
   interrupt(m);assert.equal(await outcomeOf(running),'AbortError',label+' '+interruption+' aborts the waiting ensure');await flush();
   settled=view(m.budget);
   assert.deepEqual([settled.bytes-settled.recent,settled.metadata,settled.construction,settled.decoded,settled.inflate,settled.listeners],[20*MiB,0,0,0,0,0],label+' '+interruption+' leaves only the gate and at most the recent index copy');
   assert.equal(m.scope.manifest,undefined,label);assert.equal(m.scope.bootstrapRetained,undefined,label);
   assert.equal(kinds(m.events).length,4,label+' '+interruption+': the boundary is never read, copied, decoded or parsed');
   gate.release();m.page?.destroy();assert.equal(m.budget.stats.bytes,0,label);
  }
 }
});

test('managers sharing one page ledger and transport read each bootstrap file once and share one parsed estimate',async()=>{
 const shared=pageFixture({transport:true,shards:700,hold:new Set(['/safety/buildings3d/berlin/city-boundary.json'])}),all=families.map(family=>manager(family,{shared}));
 const running=Promise.all(all.map(m=>m.ensure(m.scope.request.signal)));
 // All seven wait for the one shared production; only its manager reads.
 await until(()=>shared.net.calls.length===2&&shared.page.stats.consumers===1);
 shared.net.calls[1].gate.resolve();assert.equal(await outcomeOf(running),'fulfilled','all seven managers complete');
 assert.deepEqual(shared.net.calls.map(call=>call.path),['/safety/buildings3d/index.json','/safety/buildings3d/berlin/city-boundary.json'],'one network read per bootstrap file for seven managers');
 const metadata=retained(all[0],all[0].scope.manifest)+retained(all[0],all[0].scope.boundary);
 for(const m of all){assert.equal(m.scope.manifest,all[0].scope.manifest,m.family+' one parsed manifest');assert.equal(m.scope.bootstrapRetained.bytes,metadata,m.family);}
 const settled=view(shared.budget);
 // One shared parse (manager-ensure-admission), charged once for seven managers.
 assert.deepEqual([settled.metadata,settled.construction,settled.decoded,settled.inflate,settled.listeners,settled.read],[metadata,0,0,0,0,settled.recent],'the shared parsed pair charged once; shared reads leave at most the bounded recent index copy');
 for(const m of all)m.destroy();
 assert.equal(shared.budget.stats.categories.metadata?.bytes??0,0,'every teardown returns its retained estimate');
 shared.page.destroy();assert.equal(shared.budget.stats.bytes,0);
});

// F1: with private copies each manager held its own manifest estimate while it
// waited for its boundary working set; when free capacity fell in
// [working set - the other manifests, working set) neither could proceed. The page
// shares one bootstrap production (manager-ensure-admission), so both complete.
test('managers that each hold a manifest estimate do not wait on one another for their boundary working sets',async()=>{
 const settings={shards:700,boundaryPoints:40_000},estimates=await Promise.all(['root500','infill'].map(family=>parsedEstimates(family,settings)));
 const B=estimates[0].boundaryBytes,work=28*B+64,held=estimates[0].manifest+estimates[1].manifest;
 const limitBytes=held+B+work-Math.floor(Math.min(estimates[0].manifest,estimates[1].manifest)/2)+4096;
 const shared=pageFixture({transport:true,limitBytes,...settings}),pair=['root500','infill'].map(family=>manager(family,{shared}));
 const outcomes=pair.map(()=>'pending'),running=pair.map((m,i)=>m.ensure(m.scope.request.signal).then(()=>{outcomes[i]='fulfilled';},error=>{outcomes[i]=error;}));
 try{
  await until(()=>!outcomes.includes('pending')).catch(()=>{});
  assert.deepEqual([...outcomes],['fulfilled','fulfilled'],'neither manager may wait for capacity the other holds while it waits; ledger '+JSON.stringify(view(shared.budget)));
 }finally{for(const m of pair)m.scope.request.abort();await Promise.all(running);for(const m of pair)m.destroy();shared.page.destroy();}
});

// F4 guard. painted-map hands every manager the page transport's acquireBytes
// unmapped, while the manager's fetchBytes resolves a path through the page
// asset registry. Bootstrap reads (the index path, and the city boundary and
// partition pages the data pipeline places in the city's buildings3d folder)
// reach the URL the mapped reader would only while the registry remaps none of
// them; this turns that implicit dependency into a failing check.
const CITIES=['berlin','hamburg','munich','cologne','frankfurt','dusseldorf','stuttgart','leipzig','dortmund','bremen','essen','dresden','hannover','nuremberg'];
test('the page asset registry remaps no bootstrap path, so the unmapped transport reads the URL the mapped reader would',()=>{
 const registry=JSON.parse(fs.readFileSync(registryFile,'utf8')),bootstrap=new RegExp('^/safety/buildings3d/(?:index\\.json$|(?:'+CITIES.join('|')+')/)');
 // The guarded shape is the one every bootstrap read above uses.
 for(const key of documents({partitioned:true}).files.keys())assert(bootstrap.test(key),key);
 for(const [provider,table] of Object.entries(registry))
  assert.deepEqual(Object.keys(table).filter(key=>bootstrap.test(key)),[],provider+' remaps a bootstrap path that its unmapped transport read would bypass');
});
