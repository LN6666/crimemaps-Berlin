// Stage-2 managers ingress harness: the seven managers' own module helpers, their
// ledger helpers inside installThreeDimensionalMap, ensure(), readAsset() and
// destroy() run from their actual source text against the actual page ledger,
// chunk store, byte transport, manager-ensure-admission and solar-shadow-admission
// modules. Only network bytes, the renderer's boundary sink and the partition owner
// are fixtures. (Adapted from manager-ensure-admission.test.mjs, plus the
// caller-admitted transport helpers the managers now use.)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,webcrypto} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

export const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const src=(...parts)=>path.join(web,'src',...parts);
export const families=['root500','infill','bremen','city','tier300','church','delegated500'];
export const MiB=1024**2;
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const tick=()=>new Promise(resolve=>setImmediate(resolve));
export const flush=async(rounds=8)=>{for(let i=0;i<rounds;i++)await tick();};
export const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
export const until=async(predicate,rounds=400)=>{for(let i=0;i<rounds;i++){if(predicate())return;await tick();}assert.fail('bounded fixture event did not occur');};
export async function outcomeOf(promise,rounds=400){let value='pending';promise.then(()=>{value='fulfilled';},error=>{value=error?.name??String(error);});for(let i=0;i<rounds&&value==='pending';i++)await tick();return value;}

function loader(seed=new Map()){
 const cache=new Map(seed);
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  new Function('require','module','exports',compiled.outputText)(request=>{
   assert.ok(request.startsWith('.'),'runtime dependency must be local: '+request);
   const base=path.resolve(path.dirname(file),request);
   for(const candidate of [...(base.endsWith('.mjs')?[base]:[]),base+'.ts',path.join(base,'index.ts')])if(fs.existsSync(candidate))return load(candidate);
   throw Error('Unresolved '+request+' from '+file);
  },module,module.exports);
  return module.exports;
 }
 load.cache=cache;return load;
}
export const load=loader();
const budgetFile=src('safety','render-runtime','resource-budget.ts');
export const budgetModule=load(budgetFile);
export const {createResourceBudget,ResourceBudgetExceededError}=budgetModule;
export const {createChunkResourceStore}=load(src('safety','render-runtime','chunk-resource-store.ts'));
export const transportModule=load(src('safety','resource-byte-transport.ts'));
export const {createResourceByteTransport,resourceByteReadEnvelope,resourceByteAdmittedEnvelope,ResourceByteDeliveryRefusedError}=transportModule;
const {createRecoveryResidentReuse}=load(src('safety','recovery-resident-reuse.ts'));
const {createViewportRequestContinuation}=load(src('safety','viewport-request.ts'));
export const {environmentJsonReadCosts}=load(src('safety','environment-resource-budget.ts'));
export const sum=costs=>costs.reduce((total,cost)=>total+cost.bytes,0);
/** One page's own admission and solar module instances over the shared ledger module. */
export function pageModules(){const fresh=loader(new Map([[budgetFile,load.cache.get(budgetFile)]]));return{admission:fresh(src('safety','manager-ensure-admission.ts')),solar:fresh(src('safety','solar-shadow-admission.ts'))};}
export const view=budget=>{const s=budget.stats,c=name=>s.categories[name]?.bytes??0;return{bytes:s.bytes,read:c('read'),construction:c('construction'),inflate:c('inflate'),decoded:c('decoded'),metadata:c('metadata'),shadow:c('shadow'),recent:s.recentBytes,reservations:s.reservations,listeners:s.availabilityListeners};};

const MODULE_NAMES=['HASH','pathValid','assetValid','bboxValid','parseManifest','parseBoundary','decoded','checkedBytes','checked','BOOTSTRAP_JSON_EXPANSION','bootstrapParseCosts','bootstrapRetainedCost'];
const INSTALL_NAMES=['fetchLifetime','queue','pump','scheduled','fetchBounded','bootstrapPressure','unfitBootstrap','admitBootstrap','acquireBounded','parseBootstrap','ensure'];
export const declared=(node,names)=>ts.isFunctionDeclaration(node)?names.includes(node.name?.text):ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>ts.isIdentifier(item.name)&&names.includes(item.name.text));
const compile=code=>ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
export const sources=new Map();
for(const family of families){
 const file=src('painted',family,'safety','three-dimensional-map.ts'),text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 const install=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='installThreeDimensionalMap');
 const parts=[...ast.statements.filter(node=>declared(node,MODULE_NAMES)),...install.body.statements.filter(node=>declared(node,INSTALL_NAMES))];
 const returned=install.body.statements.findLast(node=>ts.isReturnStatement(node)&&node.expression&&ts.isObjectLiteralExpression(node.expression));
 const method=name=>returned.expression.properties.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(ast)===name);
 sources.set(family,{text,ast,install,parts,
  lifetime:parts.some(node=>declared(node,['fetchLifetime'])),readAssetText:method('readAsset').getText(ast),
  body:compile(parts.map(node=>node.getText(ast)).join('\n')+(parts.some(node=>declared(node,['fetchLifetime']))?'\nexposeLifetime(fetchLifetime);':'')+'\nconst methods=({'+method('readAsset').getText(ast)+'});\nreturn {ensure,readAsset:methods.readAsset,acquireBounded,parseBootstrap,stats:()=>({active,peak,queued:queue.length})};'),
  destroy:compile('return ({'+method('destroy').getText(ast)+'}).destroy;')});
}
function familyModules(family){
 return{decodeBounded3DAssetJSON:load(src('painted',family,'safety','bounded-3d-gzip.ts')).decodeBounded3DAssetJSON,
  estimateRetainedBuildingPayload:load(src('painted',family,'safety','building-payload-cost.ts')).estimateRetainedBuildingPayload,
  validModelHeight:load(src('painted',family,'safety','three-dimensional-query.ts')).validModelHeight};
}
const strictScope=values=>new Proxy(values,{has:()=>true,get:(target,key)=>{if(key===Symbol.unscopables)return undefined;if(key in target)return target[key];if(key in globalThis)return globalThis[key];throw new ReferenceError('Missing manager fixture binding: '+String(key));},set:(target,key,value)=>(target[key]=value,true)});
const inert=new Proxy(function(){},{get:(_target,key)=>key===Symbol.toPrimitive?()=>0:key==='then'?undefined:inert,apply:()=>inert,construct:()=>inert});
const looseScope=values=>new Proxy(values,{has:()=>true,get:(target,key)=>{if(key===Symbol.unscopables)return undefined;if(key in target)return target[key];if(key in globalThis)return globalThis[key];return inert;},set:(target,key,value)=>(target[key]=value,true)});
const instruments=(events,budget)=>({
 crypto:{subtle:{digest:async(algorithm,data)=>{events.push(['digest',data.byteLength,view(budget)]);return webcrypto.subtle.digest(algorithm,data);}}},
 TextDecoder:class extends TextDecoder{decode(input,options){events.push(['decode',input.byteLength,view(budget)]);return super.decode(input,options);}},
 JSON:{parse:(text,reviver)=>{events.push(['parse',text.length,view(budget)]);return JSON.parse(text,reviver);},stringify:JSON.stringify},
});
export const encode=value=>new TextEncoder().encode(JSON.stringify(value));
const SOURCE=sha('fixture source pbf');
const ring=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
export function documents({shards=1,partitioned=false,boundaryPoints}={}){
 const points=boundaryPoints===undefined?ring(13.3,52.4,13.5,52.6):[...Array.from({length:boundaryPoints},(_,i)=>[13.3+(i%1000)*1e-4,52.4+Math.floor(i/1000)*1e-4]),[13.3,52.4]];
 const boundary=encode({type:'FeatureCollection',city:'berlin',source_pbf_sha256:SOURCE,features:[{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[points]}}]});
 const pageRaw=encode({schema_version:1,city:'berlin',source_pbf_sha256:SOURCE,city_boundary_sha256:sha(boundary),bbox_kind:'compiled-mesh-ground-envelope',shards:[{id:'leaf',tile_key:'leaf',path:'/safety/buildings3d/berlin/leaf.json',sha256:sha('leaf'),bytes:100,vertices:3,bbox:[13.3,52.4,13.4,52.5],lod:1}]});
 const page=new Uint8Array(gzipSync(pageRaw));
 const shardRows=Array.from({length:shards},(_,i)=>({id:'shard-'+i,tile_key:'tile-'+i,path:'/safety/buildings3d/berlin/shard-'+String(i).padStart(6,'0')+'.json',sha256:sha('shard '+i),bytes:1000+i,vertices:3,bbox:[13.3,52.4,13.31,52.41],lod:1}));
 const pageAsset={id:'partition-1',bbox:[13.3,52.4,13.5,52.6],path:'/safety/buildings3d/berlin/partition-1.json.gz',sha256:sha(page),bytes:page.byteLength,compression:'gzip',uncompressed_bytes:pageRaw.byteLength,uncompressed_sha256:sha(pageRaw)};
 const profileRaw=encode({schema_version:1,city:'berlin',profile:'fixture environment asset',values:Array.from({length:64},(_,i)=>i)}),profile=new Uint8Array(gzipSync(profileRaw));
 const profileAsset={path:'/safety/environment/water/profile.json.gz',sha256:sha(profile),bytes:profile.byteLength,compression:'gzip',uncompressed_bytes:profileRaw.byteLength,uncompressed_sha256:sha(profileRaw)};
 const index=encode({schema_version:1,city:'berlin',source_snapshot:'fixture snapshot',source_pbf_sha256:SOURCE,compiler_sha256:sha('compiler'),
  city_boundary:{path:'/safety/buildings3d/berlin/city-boundary.json',sha256:sha(boundary),bytes:boundary.byteLength},
  ...(partitioned?{index_type:'partitioned-city3d-v1',partitions:[pageAsset]}:{shards:shardRows})});
 return{index,boundary,page,pageRaw,pageAsset,profile,profileRaw,profileAsset,files:new Map([['/safety/buildings3d/index.json',index],['/safety/buildings3d/berlin/city-boundary.json',boundary],[pageAsset.path,page],[profileAsset.path,profile]])};
}
/** The raw network edge: records the ledger at the instant a read starts; a held
 * path answers only after its gate resolves, or rejects when its signal aborts. */
export function network(budget,files,events,{hold=new Set()}={}){
 const calls=[];
 const read=(name,requestPath,signal,max)=>{
  const call={name,path:requestPath,signal,max,at:view(budget),gate:deferred()};calls.push(call);events.push(['read',requestPath,call.at]);
  const bytes=files.get(requestPath);if(!hold.has(requestPath))call.gate.resolve();
  return new Promise((resolve,reject)=>{
   const abort=()=>reject(signal.reason??new DOMException('Aborted','AbortError'));
   if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});
   call.gate.promise.then(()=>{signal.removeEventListener('abort',abort);if(signal.aborted)abort();else if(!bytes)reject(TypeError('Fixture network has no '+requestPath));else resolve(bytes.slice());},reject);
  });
 };
 return{calls,read,hold};
}
export function pageFixture({transport=false,limitBytes=64*MiB,shards,partitioned,hold,boundaryPoints,namespace='fixture-page'}={}){
 const events=[],budget=createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,8*MiB)}),store=createChunkResourceStore({budget});
 const docs=documents({shards,partitioned,boundaryPoints}),net=network(budget,docs.files,events,{hold}),modules=pageModules();
 const page=transport?createResourceByteTransport({namespace,resourceStore:store,read:(requestPath,signal,max)=>net.read('transport',requestPath,signal,max)}):undefined;
 return{events,budget,store,docs,net,page,modules};
}
/** One manager over a page fixture. `acquireBytes` replaces the page transport's
 * (e.g. a recording or refusing double); the transport stays the compatibility reader. */
export function manager(family,{shared,partitionOwner,acquireBytes,...settings}={}){
 const fixture=shared??pageFixture({...settings,namespace:'fixture-'+family}),{events,budget,store,docs,net,page,modules}=fixture,{solar,admission}=modules;
 const scope={events,
  renderer:{layer:{id:'fixture-'+family},destroy(){},setEnabled(){},setPageHidden(){},
   setSolarShadowBoundary(value){const cached=solar.currentSolarShadowBoundary(value.boundarySHA256),before=view(budget),prepared=solar.prepareSolarShadowBoundary(value,{budget});events.push(['solar-boundary',value.boundarySHA256,before,!!cached&&prepared===cached]);}},
  manifest:undefined,manifestSHA:undefined,boundary:undefined,partitions:undefined,partitionOptions:undefined,bootstrapRetained:undefined,facadeHelpers:undefined,
  destroyed:false,active:0,peak:0,city:'berlin',mobile:false,resources:store,resourceStore:store,ResourceBudgetExceededError,resourceByteReadEnvelope,resourceByteAdmittedEnvelope,
  acquireManagerBootstrap:admission.acquireManagerBootstrap,ManagerAdmissionRetry:admission.ManagerAdmissionRetry,retryManagerAdmission:admission.retryManagerAdmission,admitSolarShadowBoundary:solar.admitSolarShadowBoundary,currentSolarShadowBoundary:solar.currentSolarShadowBoundary,
  exposeLifetime(controller){scope.fetchLifetime=controller;},
  request:new AbortController(),preparingTicket:1,wantedMode:'3d',pageHidden:false,documentHidden:false,viewportVisible:true,suspended:false,
  cameraMotionTicket:undefined,ownCameraStartingTicket:undefined,visibleLoadsPending:0,s434Aggregate:{pending:false,clear(){}},
  recoveryResident:createRecoveryResidentReuse(()=>undefined),modeRequests:createViewportRequestContinuation(()=>false),
  installThreeDimensionalPartitions(options){scope.partitionOptions=options;return partitionOwner?partitionOwner(options):{fixture:'partition owner',clear(){}};}};
 Object.assign(scope,instruments(events,budget),familyModules(family));
 scope.options=page?{acquireBytes:acquireBytes??page.acquireBytes,fetchBytes:(requestPath,signal,max)=>{events.push(['compat-read',requestPath]);return page.readBytes(requestPath,signal,max);}}:{...(acquireBytes?{acquireBytes}:{}),fetchBytes:(requestPath,signal,max)=>net.read('raw',requestPath,signal,max)};
 const {body,destroy}=sources.get(family),api=new Function('env','with(env){'+body+'}')(strictScope(scope));
 scope.queue=[];
 const lifecycle=code=>new Function('env','with(env){'+code+'}')(looseScope(scope));
 return{family,fixture,events,budget,store,docs,net,scope,page,modules,api,
  ensure:signal=>api.ensure(signal),stats:api.stats,destroy:()=>lifecycle(destroy)(),
  readAsset:(asset,signal,max,admission)=>api.readAsset(asset,signal,max,admission),
  readPage:signal=>scope.partitionOptions.read(docs.pageAsset,signal)};
}
export const retained=(m,value)=>m.scope.estimateRetainedBuildingPayload(value).retainedPayloadEstimateBytes;
