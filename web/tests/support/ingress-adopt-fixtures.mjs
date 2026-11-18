// Shared inputs for the ingress-adopt tests: the real frozen lease store, shared
// native source pool, building detail source, byte transport, page store and
// ledger bundled together, plus tiny synthetic tables, partitions, native shards
// and detail replacements. No product table, asset, browser or GPU is used.
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {source,MiB,copy,settle,NORMALIZE_EXPANSION,CLONE_HOLD_EXPANSION,valueEstimate} from './core-frozen-fixtures.mjs';

export {MiB,copy,settle,NORMALIZE_EXPANSION,CLONE_HOLD_EXPANSION};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const digest=n=>createHash('sha256').update(String(n)).digest('hex');

/** The real modules in one bundle, so every class (budget error, transport) is shared. */
export async function adoptRuntime({observeFrozenClone=false}={}){
 const plugins=observeFrozenClone?[{name:'observe-real-json-clone',setup(builder){
  builder.onResolve({filter:/^\.\/clone-frozen-json$/},()=>({path:'clone-observer',namespace:'clone-observer'}));
  builder.onLoad({filter:/.*/,namespace:'clone-observer'},()=>({loader:'js',resolveDir:source,contents:`import {cloneFrozenJSON as actual} from ${JSON.stringify(source+'/clone-frozen-json.ts')}; export function cloneFrozenJSON(value){globalThis[Symbol.for('crimemaps.test.frozenClone')]?.(value);return actual(value);}`}));
 }}]:[];
 const built=await build({stdin:{contents:[
  "export {createFrozenDataLeaseStore} from './frozen-data-lease-store';",
  "export {createSharedNativeSourcePool} from './shared-native-source';",
  "export {createBuildingDetailSource,DETAIL_GROUP_EXPANSION} from './building-detail-source';",
  "export {createResourceByteTransport,resourceByteAdmittedEnvelope} from './resource-byte-transport';",
  "export {createChunkResourceStore} from './render-runtime/chunk-resource-store';",
  "export {createResourceBudget,ResourceBudgetExceededError} from './render-runtime/resource-budget';",
  "export {estimateRetainedBuildingPayload} from './building-payload-cost';",
 ].join('\n'),resolveDir:source,sourcefile:'ingress-adopt-runtime.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,plugins});
 return import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n// ingress-adopt runtime').toString('base64'));
}
/** One page ledger and its chunk store. */
export function page(api,{limitBytes=64*MiB,recentLimitBytes=0}={}){const budget=api.createResourceBudget({limitBytes,recentLimitBytes});return{budget,store:api.createChunkResourceStore({budget})};}
/** A holder that leaves exactly `free` bytes of the page. */
export const blockerFor=(budget,free,label='other holder')=>budget.reserve({category:'construction',bytes:budget.stats.limitBytes-budget.stats.bytes-free,precision:'estimate',label});
/** A synchronous availability listener that, while armed, takes every free byte
 * of each wave (at most `cap` bytes in all), before any later listener runs. */
export function greedy(budget,{cap=Infinity,when=()=>true}={}){
 const taken=[];let armed=false,total=0;
 const off=budget.onAvailable(()=>{
  if(!armed||!when())return;const bytes=Math.min(budget.stats.availableBytes,cap-total);
  if(bytes>0){taken.push(budget.reserve({category:'construction',bytes,precision:'estimate',label:'greedy wake-wave reserver'}));total+=bytes;}
 });
 return{taken,arm(){armed=true;},disarm(){armed=false;},get bytes(){return taken.reduce((n,r)=>n+(r.active?r.bytes:0),0);},release(){for(const r of taken)r.release();taken.length=0;},off};
}
/** A network read that stays pending until settled; rejects on abort like fetch. */
export function network(){
 const reads=[];
 const read=(target,signal,max)=>new Promise((resolve,reject)=>{const row={target,signal,max,resolve,reject,done:false};reads.push(row);signal.addEventListener('abort',()=>{if(!row.done)reject(signal.reason);},{once:true});});
 return{reads,read,
  pending:()=>reads.filter(row=>!row.done&&!row.signal.aborted),
  deliver(target,bytes){const row=reads.find(r=>r.target===target&&!r.done&&!r.signal.aborted);if(!row)throw Error('No pending read of '+target);row.done=true;row.resolve(bytes);}};
}
function descriptorFor(raw){
 const sha256=hash(raw),physical=new Uint8Array(gzipSync(raw)),t=hash(physical);
 return{raw,physical,d:{path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:raw.length,transport:{path:`/safety/buildings3d/painted-tables/${t.slice(0,2)}/${t}.json.gz`,sha256:t,bytes:physical.length,encoding:'gzip'}}};
}
/** A gzip frozen table of `rows` rows: {name, rows:[{i,v}]}. */
export function rowTable(name,rows){
 const raw=new TextEncoder().encode(JSON.stringify({name,rows:Array.from({length:rows},(_,i)=>({i,v:digest(name+'-'+i)}))})),f=descriptorFor(raw);
 return{name,...f,path:f.d.transport.path};
}
/** A record-keys partition of one canonical table into parts of `sizes` keys each. */
export function recordPartition(name,sizes){
 const parts=sizes.map((count,p)=>{const value=Object.fromEntries(Array.from({length:count},(_,i)=>[`${name}-${p}-${i}`,digest(`${name}-${p}-${i}`)]));return{keys:Object.keys(value),...descriptorFor(new TextEncoder().encode(JSON.stringify(value)))};});
 const whole=descriptorFor(new TextEncoder().encode(JSON.stringify(Object.assign({},...parts.map(part=>JSON.parse(new TextDecoder().decode(part.raw)))))));
 const partition={schemaVersion:1,kind:'record-keys',parts:parts.map(part=>({descriptor:part.d,keys:part.keys}))};
 return{whole,parts,partition,expected:JSON.parse(new TextDecoder().decode(whole.raw))};
}
/** An object-rows partition of one canonical table of numeric rows
 * ({city, objectId, v:[numbers]}), parts of `sizes` rows each. Its settled
 * value estimate is below its raw bytes (8 B per number against about 18 JSON
 * characters) and its digits compress poorly, so a read's working set
 * (14d + 2P) exceeds its settle and clone phases (scheme H) by more than the
 * value: the shape that lets a refused second read of a part fail a
 * composition that wrongly counts it as its own (ingress-adopt-review IA-R5). */
export function numericRowsPartition(name,sizes,{numbers=24,city='bremen'}={}){
 let index=0;const all=[];
 const parts=sizes.map((count,p)=>{
  const rows=[],rowIndices=[];
  for(let i=0;i<count;i++){const h=digest(name+'-'+p+'-'+i),objectId=`${name}/${p}/${i}`;rows.push({city,objectId,v:Array.from({length:numbers},(_,k)=>Number.parseInt(digest(h+k).slice(0,13),16)/1e6)});rowIndices.push(index++);}
  all.push(...rows);
  return{keys:rows.map(row=>row.city+'|'+row.objectId),rowIndices,...descriptorFor(new TextEncoder().encode(JSON.stringify(rows)))};
 });
 const whole=descriptorFor(new TextEncoder().encode(JSON.stringify(all)));
 const partition={schemaVersion:1,kind:'object-rows',parts:parts.map(part=>({descriptor:part.d,keys:part.keys,rowIndices:part.rowIndices}))};
 return{whole,parts,partition,expected:JSON.parse(new TextDecoder().decode(whole.raw))};
}
/** The whole lease-store working set of one table read: binding 256, decoded
 * expansion (inflate d + NORMALIZE_EXPANSION d) and its minted two-copy read envelope. */
export const leaseNeed=f=>256+f.d.bytes+NORMALIZE_EXPANSION*f.d.bytes+2*f.physical.length;
/** Scheme H: the settle (256 + H d + 2E, the value beside the held normalize
 * H d and the first clone's room E) and clone (2E + H d) phases that follow the
 * read, H = CLONE_HOLD_EXPANSION; see leasePhases in core-frozen-fixtures.
 * wholeNeed is the least page one table acquisition completes on, from its
 * binding's queued estimate on. */
export const settleNeed=f=>256+CLONE_HOLD_EXPANSION*f.d.bytes+2*valueEstimate(f.raw);
export const cloneNeed=f=>2*valueEstimate(f.raw)+CLONE_HOLD_EXPANSION*f.d.bytes;
export const wholeNeed=f=>Math.max(leaseNeed(f),settleNeed(f),cloneNeed(f));
/** One map: a frozen lease store with its own byte transport over a shared page store. */
export function frozenMap(api,resources,name,{tables=[],partitions=[],city='bremen'}={}){
 const net=network(),file=key=>`painted/${city}/safety/ingress-adopt-${key}.ts`;
 const transport=api.createResourceByteTransport({namespace:JSON.stringify([city,null]),resourceStore:resources.store,read:net.read});
 const descriptors=[...tables.map(f=>f.d),...partitions.flatMap(p=>[p.whole.d,...p.parts.map(part=>part.d)])];
 const leases=api.createFrozenDataLeaseStore(descriptors,{resourceStore:resources.store});
 const selection={tables:[...tables.map(f=>f.d.sha256),...partitions.map(p=>p.whole.d.sha256)],initializers:Object.fromEntries([...tables.map(f=>[f.d.sha256,{[file(f.name)]:1}]),...partitions.map((p,i)=>[p.whole.d.sha256,{[file('partition-'+i)]:1}])])};
 const byWhole=new Map(partitions.map((p,i)=>[p.whole.d.sha256,{p,file:file('partition-'+i)}]));
 const client=leases.client({city,profileSHA256:null,provider:city,selection,resolve:sha=>sha,read:transport.readBytes,acquireBytes:transport.acquireBytes,
  partition:(sha,f,occurrence)=>{const row=byWhole.get(sha);return row&&row.file===f&&occurrence===0?row.p.partition:undefined;}});
 return{name,net,transport,leases,client,
  ref:f=>({canonicalSHA256:f.d.sha256,file:file(f.name),occurrence:0,codec:'json'}),
  partitionRef:(i=0)=>({canonicalSHA256:partitions[i].whole.d.sha256,file:file('partition-'+i),occurrence:0,codec:'json'}),
  deliver:f=>net.deliver(f.d.transport.path,copy(f.physical)),
  destroy(){leases.destroy();transport.destroy();}};
}
/** Every lease store and transport drained and the page ledger back at `baseline`. */
export async function drained(assert,resources,maps,baseline=0){
 for(let i=0;i<4;i++)await settle();
 resources.store.evictRecent();
 for(const m of maps){for(const key of ['entries','valueCells','waiters','leases','active','queued'])assert.equal(m.leases.stats[key],0,m.name+' '+key+' must drain');assert.equal(m.transport.stats.consumers,0,m.name+' transport consumers');}
 assert.equal(resources.budget.stats.bytes,baseline,'every claim returned to the page ledger');assert.equal(resources.budget.stats.availabilityListeners,0,'no wake-up subscription remains');
}
export async function until(predicate,label,turns=200){for(let i=0;i<turns;i++){if(predicate())return;await settle();}throw Error('Condition not reached: '+label);}
/** Test-side guard only: a stalled wait fails the test instead of hanging it. */
export function deadline(promise,label='ingress-adopt operation stalled',ms=4000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),ms);})]).finally(()=>clearTimeout(timer));}
/** Resolves 'pending' unless the promise settled within a few turns. */
export async function state(promise,turns=20){let result='pending';promise.then(()=>{result='fulfilled';},error=>{result='rejected:'+error?.name;});for(let i=0;i<turns;i++)await settle();return result;}

// Native shard and building detail replacement fixtures (synthetic, tiny).
function nativeComponent(city,id){
 const geometry={type:'Polygon',coordinates:[[[13,52],[13.001,52],[13.001,52.001],[13,52]]]};
 return{city,objectId:id,partId:id+'/component/test',origin:[13,52],componentGeometry:geometry,sourceFeature:{type:'Feature',id,geometry,properties:{name:'native'}},batches:[{positions:[0,100,0,1,100,0,0,100,1],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.4,.5,.6]}]};
}
/** A plain native shard and its descriptor. */
export function nativeShard(city='berlin',count=4,path='/safety/buildings3d/ingress-adopt.json'){
 const value={schema_version:1,city,components:Array.from({length:count},(_,i)=>nativeComponent(city,'osm/way/'+(i+1))),shadow_profile:{schema_version:1,city,status:'display-schematic'},shadow_admitted_component_indices:[0]};
 const bytes=new TextEncoder().encode(JSON.stringify(value));
 return{bytes,descriptor:{path,bytes:bytes.length,sha256:hash(bytes)}};
}
const sha=digit=>digit.repeat(64);
const detailBindings={sourcePBFSHA256:sha('3'),boundarySHA256:sha('4'),compilerSHA256:sha('5'),sourceSnapshot:'synthetic-source',materialSHA256:sha('6'),producerSHA256:sha('7'),protectionSHA256:sha('8'),sourceEquivalenceSHA256:sha('9')};
function detailComponent(id){
 const geometry={type:'Polygon',coordinates:[[[13,52],[13.001,52],[13,52.001],[13,52]]]};
 return{city:'berlin',objectId:`osm/way/${id}`,partId:`component/${id}`,origin:[13,52],componentGeometry:geometry,
  sourceFeature:{type:'Feature',id:`osm/way/${id}`,geometry,properties:{name:'Synthetic source',height:'8'}},
  batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.5,.6,.7]}]};
}
/** A plain display-variant replacement: its document bytes and selected resource. */
export function detailVariant(key='ingress-adopt'){
 const header={schema:'crimemaps-building-detail-replacement-v1',level:'coarse',canonicalIndexSHA256:sha('1'),canonicalLeafSHA256:sha('2'),geometrySHA256:sha('c'),
  materialSHA256:detailBindings.materialSHA256,sourceEquivalenceSHA256:detailBindings.sourceEquivalenceSHA256,producerSHA256:detailBindings.producerSHA256,protectionSHA256:detailBindings.protectionSHA256};
 const document={schema_version:1,city:'berlin',components:[detailComponent(1),detailComponent(2)],detail_variant:header};
 const physical=new TextEncoder().encode(JSON.stringify(document));
 const descriptor={path:'/safety/buildings3d/detail/ingress-adopt.json',bytes:physical.byteLength,sha256:hash(physical)};
 const components=[1,2].map(id=>({objectId:`osm/way/${id}`,partId:`component/${id}`,origin:[13,52],box:[0,0,0,1,1,0],protected:false}));
 return{physical,resource:{key:key+'-'+descriptor.sha256,city:'berlin',level:'coarse',descriptor,geometrySHA256:sha('c'),canonicalIndexSHA256:sha('1'),canonicalLeafSHA256:sha('2'),bindings:detailBindings,vertices:6,triangles:2,componentCount:2,components}};
}
