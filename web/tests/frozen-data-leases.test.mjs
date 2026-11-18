import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {NORMALIZE_EXPANSION} from './support/core-frozen-fixtures.mjs';
import {encodeCityTable,partitionCityTable} from '../../scripts/city-data-shards.mjs';

// Compile only the resource core and its small helpers. All payloads below are
// synthetic in-memory bytes; no product table, asset, browser or GPU is opened.
const web=fileURLToPath(new URL('../',import.meta.url)),source=path.join(web,'src/safety');
const core=await readFile(path.join(source,'frozen-data-lease-store.ts'),'utf8');
const built=await build({stdin:{contents:core+"\nexport {createFrozenDataScope} from './frozen-data-scope';\nexport {createChunkResourceStore} from './render-runtime/chunk-resource-store';\nexport {createResourceBudget} from './render-runtime/resource-budget';\nexport {estimateRetainedBuildingPayload} from './building-payload-cost';",resolveDir:source,sourcefile:'frozen-data-lease-store.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false});
const {createFrozenDataLeaseStore,createFrozenDataScope,createChunkResourceStore,createResourceBudget,estimateRetainedBuildingPayload}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const profileSHA256='a'.repeat(64),city='bremen',provider='bremen';
const file=name=>`painted/bremen/safety/lease-${name}.ts`;
const signal=()=>new AbortController().signal;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const deadline=async promise=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Lease deadline: pending work did not drain')),2000))]);}finally{clearTimeout(timer);}};
function fixture(text,{gzip=false}={}){
 const raw=typeof text==='string'?new TextEncoder().encode(text):new Uint8Array(text),sha256=hash(raw),d={path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:raw.length};
 const physical=gzip?new Uint8Array(gzipSync(raw)):raw;
 if(gzip){const transportSHA=hash(physical);d.transport={path:`/safety/buildings3d/painted-tables/${transportSHA.slice(0,2)}/${transportSHA}.json.gz`,sha256:transportSHA,bytes:physical.length,encoding:'gzip'};}
 return{d,raw,physical};
}
const ref=(f,name='data',occurrence=0)=>({canonicalSHA256:f.d.sha256,file:file(name),occurrence,codec:'json'});
const selection=bindings=>({tables:[...new Set(bindings.map(({f})=>f.d.sha256))],initializers:bindings.reduce((out,{f,file:name,count=1})=>{(out[f.d.sha256]??={})[name]=count;return out;},{})});
const config=(bindings,read,extra={})=>({city,profileSHA256,provider,selection:selection(bindings),resolve:sha=>sha,read,...extra});
const one=(f,name='data')=>[{f,file:file(name)}];
const readFixture=f=>async(p,s,max)=>{s.throwIfAborted();assert.equal(p,f.d.transport?.path??f.d.path);assert.equal(max,f.physical.length);return f.physical;};
function empty(store){const stats=store.stats;for(const key of ['entries','valueCells','waiters','leases','active','queued','logicalBytesWithLiveLease'])assert.equal(stats[key],0,key+' must drain');}
const rejectsReleased=lease=>{assert.throws(()=>lease.borrow(()=>null),/releas|dispos|inactive|expired/i);assert.throws(()=>lease.retain(),/releas|dispos|inactive|expired/i);};

test('ready frozen reads avoid completion objects and keep the last value through a throwing callback',async()=>{
 const budget=createResourceBudget(),resources=createChunkResourceStore({budget,recentMaxEntries:0});
 const f=fixture('{"items":[1,2,3]}'),store=createFrozenDataLeaseStore([f.d],{resourceStore:resources}),client=store.client(config(one(f),readFixture(f)));
 const lease=await client.acquire(ref(f),signal()),baseline=budget.stats.bytes;
 const OriginalPromise=globalThis.Promise,OriginalException=globalThis.DOMException;let completions=0,exceptions=0;
 // Observe only this synchronous read interval; ingress still used the real
 // asynchronous store and no promise/error implementation is substituted.
 globalThis.Promise=new Proxy(OriginalPromise,{construct(target,args,newTarget){completions++;return Reflect.construct(target,args,newTarget);}});
 globalThis.DOMException=new Proxy(OriginalException,{construct(target,args,newTarget){exceptions++;return Reflect.construct(target,args,newTarget);}});
 try{for(let i=0;i<8;i++)assert.equal(lease.borrow(value=>value.items[0]),1);}
 finally{globalThis.Promise=OriginalPromise;globalThis.DOMException=OriginalException;}
 assert.equal(completions,0);assert.equal(exceptions,0);assert.equal(budget.stats.bytes,baseline);
 const cause=Error('reader failed');
 assert.throws(()=>lease.borrow(value=>{lease.release();client.dispose();assert.equal(value.items[2],3);assert.equal(budget.stats.bytes,baseline);throw cause;}),error=>error===cause);
 assert.equal(budget.stats.bytes,0);rejectsReleased(lease);empty(store);store.destroy();resources.destroy();
});

const partitionRows='[{"city":"bremen","objectId":"a","partId":"a-first","value":-0},{"city":"bremen","objectId":"b","partId":"b-only","value":0.1234567890123456},{"city":"bremen","objectId":"a","partId":"a-second","value":2},{"city":"bremen","objectId":"c","partId":"c-only","value":3}]';
function partitionFixture(read,resourceStore){
 const raw=Buffer.from(partitionRows),whole=encodeCityTable(raw),{partition,assets}=partitionCityTable(raw,{kind:'object-rows',targetBytes:2}),f={d:whole.descriptor},reference=ref(f,'partition'),reads=[];
 const descriptors=[...new Map([whole,...assets].map(asset=>[asset.descriptor.sha256,asset.descriptor])).values()],payloads=new Map(assets.map(asset=>[asset.descriptor.transport.path,asset.packed]));
 const store=createFrozenDataLeaseStore(descriptors,{resourceStore});
 const reader=async(p,s,max)=>{const bytes=payloads.get(p);assert(bytes,'Selected demands must read a declared part, never the whole table');assert.equal(max,bytes.length);reads.push(p);return read?read(p,s,bytes):bytes;};
 const makeClient=()=>store.client(config(one(f,'partition'),reader,{partition:(sha,name,occurrence)=>sha===reference.canonicalSHA256&&name===reference.file&&occurrence===0?partition:undefined}));
 return{store,client:makeClient(),makeClient,reference,partition,assets,payloads,reads};
}

for(const kind of ['model-envelope','group-envelope'])for(const fault of ['envelope','target-key','target-order'])test(`${kind} rejects verified ${fault} mismatches before publishing selected models`,async t=>{
 const group=count=>Array.from({length:count},(_,i)=>({objectId:'osm/way/'+(100+i),partId:'synthetic-'+i,sourceLeafSHA256:'b'.repeat(64)})),raw=Buffer.from(JSON.stringify({schemaVersion:1,city:'bremen',proof:{original:'quoted 引用'},models:[{targetId:'BR-OT-B07',requiredNativeGroup:group(7),geometry:{positions:['NEGATIVE_ZERO',0.1234567890123456,1]}},{targetId:'BR-OT-B09',requiredNativeGroup:group(1),geometry:{positions:[2,3,4]}}],origin:[8.125,53.5]}).replace('"NEGATIVE_ZERO"','-0'));
 const adapted=kind==='group-envelope'?Buffer.from(raw.toString().replaceAll('\"models\"','\"groups\"').replaceAll('\"targetId\"','\"queueId\"')):raw;
 const whole=encodeCityTable(adapted),product=partitionCityTable(adapted,{kind}),partition=structuredClone(product.partition);assert.equal(product.assets.length,1);
 const value=JSON.parse(product.assets[0].raw),rows=value[kind==='group-envelope'?'groups':'models'],identityField=kind==='group-envelope'?'queueId':'targetId';
 if(fault==='envelope')value.proof.original='different envelope';else if(fault==='target-key')rows[1][identityField]='BR-OT-undeclared';else rows.reverse();
 const changed=fixture(JSON.stringify(value),{gzip:true});partition.parts[0].descriptor=changed.d;
 const reference={canonicalSHA256:whole.descriptor.sha256,file:'painted/bremen/safety/repairs-data.ts',occurrence:0,codec:'json'},store=createFrozenDataLeaseStore([whole.descriptor,changed.d]),reads=[];
 const client=store.client(config([{f:{d:whole.descriptor},file:reference.file}],async(...args)=>{reads.push(args[0]);return readFixture(changed)(...args);},{partition:(sha,name,occurrence)=>sha===reference.canonicalSHA256&&name===reference.file&&occurrence===0?partition:undefined}));t.after(()=>{client.dispose();store.destroy();});
 await assert.rejects(client.acquire(reference,signal()),fault==='envelope'?/model envelope metadata mismatch/:/model partition target binding mismatch/);
 assert.deepEqual(reads,[changed.d.transport.path],'the verified part is checked without fetching the complete model table');assert.equal(store.stats.reads,1);assert.equal(store.stats.parses,1);await tick();empty(store);assert.equal(store.stats.releasedValues,1);
});

test('selected group envelopes read only demanded complete groups and release their parts',async t=>{
 const raw=Buffer.from(JSON.stringify({SOURCEImmutable:true,selectedCount:2,groups:[{queueId:'a',models:[{partId:'a1'},{partId:'a2'}],requiredNativeGroup:['a1','a2']},{queueId:'b',models:[{partId:'b1'}],requiredNativeGroup:['b1']}]}));
 const whole=encodeCityTable(raw),{partition,assets}=partitionCityTable(raw,{kind:'group-envelope',targetBytes:2}),f={d:whole.descriptor},reference=ref(f,'groups');
 const store=createFrozenDataLeaseStore([whole.descriptor,...assets.map(a=>a.descriptor)]),reads=[];
 const payloads=new Map(assets.map(a=>[a.descriptor.transport.path,a.packed]));
 const client=store.client(config(one(f,'groups'),async(p,s,max)=>{s.throwIfAborted();const bytes=payloads.get(p);assert(bytes,'Never fetch the whole table');assert.equal(max,bytes.length);reads.push(p);return bytes;},{partition:()=>partition}));
 t.after(()=>{client.dispose();store.destroy();});
 const scope=createFrozenDataScope(client);await scope.prepareSelection(reference,['a'],signal());
 scope.assertSelection(reference,['a']);assert.throws(()=>scope.assertSelection(reference,['b']));
 const value=scope.borrow(reference,x=>x);assert.deepEqual(value.groups.map(g=>g.queueId),['a']);assert.deepEqual(value.groups[0].requiredNativeGroup,['a1','a2']);assert.equal(value.groups[0].models.length,2);
 assert.equal(value.SOURCEImmutable,true);assert.equal(value.selectedCount,2);assert.deepEqual(reads,[assets[0].descriptor.transport.path]);
 await assert.rejects(scope.prepareSelection(reference,['a','b'],signal()),/cannot widen/);
 scope.release();await tick();empty(store);
});

test('selected object cohorts share actual parts; retained overlap survives release and reacquires only after the final grant',async t=>{
 const f=partitionFixture();t.after(()=>f.store.destroy());
 const absent=await f.client.acquire(f.reference,signal(),[]),unknown=await f.client.acquire(f.reference,signal(),['bremen|unpainted']);
 assert.deepEqual(absent.borrow(value=>value),[]);assert.deepEqual(unknown.borrow(value=>value),[]);assert.equal(f.reads.length,0);absent.release();unknown.release();empty(f.store);
 const own=await f.client.acquire(f.reference,signal(),['bremen|a']),overlap=await f.client.acquire(f.reference,signal(),['bremen|a','bremen|b']);
 assert.deepEqual(own.borrow(rows=>rows.map(row=>row.partId)),['a-first','a-second']);
 assert.deepEqual(overlap.borrow(rows=>rows.map(row=>row.partId)),['a-first','b-only','a-second']);
 own.borrow(rows=>{assert(Object.is(rows[0].value,-0));overlap.borrow(other=>assert.equal(other[0],rows[0],'overlap preserves the existing parsed row alias'));});
 assert.equal(f.reads.length,2);assert.equal(f.store.stats.valueCells,2);assert(f.store.stats.peakConcurrency<=2);
 const retained=own.retain();own.release();overlap.release();assert.equal(f.store.stats.valueCells,1);assert.equal(retained.borrow(rows=>rows.length),2);
 retained.release();await tick();empty(f.store);rejectsReleased(own);rejectsReleased(overlap);rejectsReleased(retained);
 const fresh=await f.client.acquire(f.reference,signal(),['bremen|a']);assert.equal(f.reads.length,3);assert.deepEqual(fresh.borrow(rows=>rows.map(row=>row.partId)),['a-first','a-second']);fresh.release();await tick();empty(f.store);
});

test('cancelling one overlapping partition demand preserves the other demand and the existing two-way queue',async t=>{
 const gates=new Map(),started=new Map(),signals=new Map();
 const f=partitionFixture(async(path,signal,bytes)=>{signals.set(path,signal);started.get(path)?.resolve();await gates.get(path).promise;return bytes;});t.after(()=>f.store.destroy());
 for(const asset of f.assets){gates.set(asset.descriptor.transport.path,deferred());started.set(asset.descriptor.transport.path,deferred());}
 const [a,b,c]=f.assets.map(asset=>asset.descriptor.transport.path),peer=f.makeClient(),own=new AbortController();
 const cancelled=f.client.acquire(f.reference,own.signal,['bremen|a','bremen|b']),waiting=assert.rejects(cancelled,{name:'AbortError'}),active=peer.acquire(f.reference,signal(),['bremen|b','bremen|c']);
 await Promise.all([started.get(a).promise,started.get(b).promise]);assert.equal(f.store.stats.active,2);assert.equal(f.store.stats.queued,1);
 own.abort();await deadline(waiting);assert.equal(signals.get(a).aborted,true);assert.equal(signals.get(b).aborted,false);
 gates.get(b).resolve();await deadline(started.get(c).promise);gates.get(c).resolve();const lease=await deadline(active);
 assert.deepEqual(lease.borrow(rows=>rows.map(row=>row.partId)),['b-only','c-only']);assert.equal(f.reads.length,3);assert.equal(f.store.stats.parses,2);assert.equal(f.store.stats.peakConcurrency,2);
 gates.get(a).resolve();await tick();await tick();lease.release();await tick();empty(f.store);
});

test('a corrupt selected part rolls back sibling grants and a clean retry re-verifies the same complete demand',async t=>{
 let corrupt=true,badPath;const f=partitionFixture(async(path,_signal,bytes)=>corrupt&&path===badPath?new Uint8Array(bytes.length):bytes);t.after(()=>f.store.destroy());badPath=f.assets[1].descriptor.transport.path;
 await assert.rejects(f.client.acquire(f.reference,signal(),['bremen|a','bremen|b']),/hash mismatch/);await tick();for(const key of ['entries','valueCells','waiters','leases','queued','logicalBytesWithLiveLease'])assert.equal(f.store.stats[key],0,key+' rolls back without retaining sibling data');
 corrupt=false;const lease=await f.client.acquire(f.reference,signal(),['bremen|a','bremen|b']);assert.deepEqual(lease.borrow(rows=>rows.map(row=>row.partId)),['a-first','b-only','a-second']);assert.equal(f.reads.length,4);lease.release();await tick();empty(f.store);
});

test('released composite results are collectible while their fulfilled demand and released grants remain referenced',{skip:typeof globalThis.gc!=='function'?'Run with --expose-gc for composite retention':false},async t=>{
 const f=partitionFixture();t.after(()=>f.store.destroy());const promise=f.client.acquire(f.reference,signal(),['bremen|a','bremen|b']),lease=await promise;let weak;
 lease.borrow(rows=>{weak=new WeakRef(rows);});const retained=lease.retain();lease.release();assert.equal(retained.borrow(rows=>rows.length),3);retained.release();await tick();empty(f.store);
 for(let attempt=0;attempt<8;attempt++){globalThis.gc();await tick();}
 assert.equal(weak.deref(),undefined,'Released combined promises/grants must not retain composed result arrays');assert.equal(await promise,lease);rejectsReleased(lease);rejectsReleased(retained);
});

for(const gzip of [false,true])test(`verified ${gzip?'gzip':'raw'} JSON preserves native values and reports resolved identity`,async t=>{
 const f=fixture('{"negativeZero":-0,"precise":0.1234567890123456,"items":[1,2,3]}',{gzip}),store=createFrozenDataLeaseStore([f.d]),client=store.client(config(one(f),readFixture(f)));t.after(()=>client.dispose());
 const lease=await deadline(client.acquire(ref(f),signal()));
 for(const [key,value]of Object.entries({city,profileSHA256,canonicalSHA256:f.d.sha256,resolvedRawSHA256:f.d.sha256,file:file('data'),occurrence:0,codec:'json'}))assert.equal(lease.identity[key],value,key);
 lease.borrow(value=>{assert(Object.is(value.negativeZero,-0));assert.equal(value.precise,0.1234567890123456);assert.deepEqual(value.items,[1,2,3]);});
 assert.equal(store.stats.reads,1);assert.equal(store.stats.parses,1);assert.equal(store.stats.valueCells,1);assert.equal(store.stats.leases,1);assert.equal(store.stats.logicalBytesWithLiveLease,f.d.bytes);
 assert.match(JSON.stringify(store.stats),/not[- ](?:retained[- ])?heap|notHeap|notRetainedHeap/i,'Diagnostics must identify logical/input bytes rather than measured heap');
 lease.release();lease.release();rejectsReleased(lease);empty(store);assert.equal(store.stats.releasedValues,1);
});

test('two clients coalesce one identity; retain and ready leases survive acquire-signal cancellation',async t=>{
 const f=fixture('{"items":[1]}'),store=createFrozenDataLeaseStore([f.d]),gate=deferred();let reads=0;
 const read=async()=>{reads++;return gate.promise;},a=store.client(config(one(f),read)),b=store.client(config(one(f),read));t.after(()=>{a.dispose();b.dispose();});
 const controller=new AbortController(),pa=a.acquire(ref(f),controller.signal),pb=b.acquire(ref(f),signal());await tick();assert.equal(reads,1);assert.equal(store.stats.waiters,2);gate.resolve(f.physical);
 const [first,second]=await deadline(Promise.all([pa,pb]));assert.equal(store.stats.parses,1);assert.equal(store.stats.valueCells,1);assert.equal(store.stats.leases,2);assert.equal(store.stats.logicalBytesWithLiveLease,f.d.bytes);
 controller.abort();assert.equal(first.borrow(value=>value.items[0]),1);let firstValue;first.borrow(value=>firstValue=value);second.borrow(value=>assert.equal(value,firstValue));firstValue=undefined;
 const retained=first.retain();assert.equal(store.stats.leases,3);first.release();rejectsReleased(first);second.release();assert.equal(store.stats.valueCells,1);assert.equal(retained.borrow(value=>value.items[0]),1);retained.release();empty(store);
});

test('file and occurrence are separate value identities even for the same raw SHA',async t=>{
 const f=fixture('{"items":[1]}'),store=createFrozenDataLeaseStore([f.d]),bindings=[{f,file:file('a'),count:2},{f,file:file('b')}],client=store.client(config(bindings,readFixture(f)));t.after(()=>client.dispose());
 const leases=await deadline(Promise.all([client.acquire(ref(f,'a',0),signal()),client.acquire(ref(f,'a',1),signal()),client.acquire(ref(f,'b',0),signal())]));
 assert.equal(store.stats.valueCells,3);assert.equal(store.stats.parses,1);assert.equal(store.stats.logicalBytesWithLiveLease,3*f.d.bytes);
 leases[0].borrow(value=>value.items[0]=99);assert.equal(leases[1].borrow(value=>value.items[0]),1);assert.equal(leases[2].borrow(value=>value.items[0]),1);
 for(const lease of leases)lease.release();empty(store);
});

test('profile resolution uses selected raw identity and rejects unselected file/occurrence/codec before I/O',async t=>{
 const canonical=fixture('{"city":"canonical"}'),selected=fixture('{"city":"bremen"}'),other=fixture('{"city":"other"}'),store=createFrozenDataLeaseStore([selected.d,other.d]);let reads=0;
 const client=store.client(config(one(selected),async(...args)=>{reads++;return readFixture(selected)(...args);},{resolve:(sha,name,occurrence)=>sha===canonical.d.sha256&&name===file('data')&&occurrence===0?selected.d.sha256:sha}));t.after(()=>client.dispose());
 const lease=await client.acquire(ref(canonical),signal());assert.equal(lease.identity.canonicalSHA256,canonical.d.sha256);assert.equal(lease.identity.resolvedRawSHA256,selected.d.sha256);assert.equal(lease.borrow(value=>value.city),'bremen');lease.release();
 const before=reads;for(const invalid of [ref(other),ref(selected,'wrong'),ref(selected,'data',1),{...ref(selected),occurrence:-1},{...ref(selected),codec:'unrecognized'}])await assert.rejects(async()=>client.acquire(invalid,signal()));
 assert.equal(reads,before);empty(store);
});

test('city and profile bindings isolate cells even when raw/file/occurrence are identical',async t=>{
 const f=fixture('{"items":[1]}'),store=createFrozenDataLeaseStore([f.d]);
 const clients=[store.client(config(one(f),readFixture(f))),store.client(config(one(f),readFixture(f),{city:'hamburg'})),store.client(config(one(f),readFixture(f),{profileSHA256:'b'.repeat(64)}))];t.after(()=>clients.forEach(client=>client.dispose()));
 const leases=await Promise.all(clients.map(client=>client.acquire(ref(f),signal())));assert.equal(store.stats.valueCells,3);assert.equal(store.stats.parses,1);leases[0].borrow(value=>value.items[0]=99);for(const lease of leases.slice(1))assert.equal(lease.borrow(value=>value.items[0]),1);leases.forEach(lease=>lease.release());empty(store);
});

test('different canonical bindings remain separate even when a profile resolves both to the same raw descriptor',async t=>{
 const selected=fixture('{"items":[1]}'),canonicalA=fixture('{"binding":"a"}'),canonicalB=fixture('{"binding":"b"}'),store=createFrozenDataLeaseStore([selected.d]);
 const client=store.client(config(one(selected),readFixture(selected),{resolve:()=>selected.d.sha256}));t.after(()=>client.dispose());
 const leases=await Promise.all([client.acquire(ref(canonicalA),signal()),client.acquire(ref(canonicalB),signal())]);assert.equal(store.stats.valueCells,2);assert.equal(store.stats.parses,1);assert.notEqual(leases[0].identity.canonicalSHA256,leases[1].identity.canonicalSHA256);leases[0].borrow(value=>value.items[0]=99);assert.equal(leases[1].borrow(value=>value.items[0]),1);leases.forEach(lease=>lease.release());empty(store);
});

test('one cancelled waiter does not abort the other client sharing its pending input',async t=>{
 const f=fixture('{"ok":true}'),store=createFrozenDataLeaseStore([f.d]),gate=deferred();let readSignal;
 const read=async(_p,s)=>{readSignal=s;return gate.promise;},a=store.client(config(one(f),read)),b=store.client(config(one(f),read));t.after(()=>{a.dispose();b.dispose();});
 const controller=new AbortController(),cancelled=a.acquire(ref(f),controller.signal),active=b.acquire(ref(f),signal());await tick();controller.abort();await assert.rejects(cancelled,{name:'AbortError'});assert.equal(readSignal.aborted,false);assert.equal(store.stats.waiters,1);gate.resolve(f.physical);
 const lease=await deadline(active);assert.equal(lease.borrow(value=>value.ok),true);assert.equal(store.stats.reads,1);lease.release();empty(store);
});

test('last-waiter cancellation rejects immediately but holds actual reader work until drain; late data cannot publish',async t=>{
 const f=fixture('{"ok":true}'),store=createFrozenDataLeaseStore([f.d]),gate=deferred();let oldSignal;
 const old=store.client(config(one(f),async(_p,s)=>{oldSignal=s;return gate.promise;})),retry=store.client(config(one(f),readFixture(f)));t.after(()=>{old.dispose();retry.dispose();});
 const controller=new AbortController(),pending=old.acquire(ref(f),controller.signal);await tick();controller.abort();await assert.rejects(pending,{name:'AbortError'});assert(oldSignal.aborted);await tick();for(const key of ['entries','valueCells','waiters','leases','queued','logicalBytesWithLiveLease'])assert.equal(store.stats[key],0,key);assert.equal(store.stats.active,1,'Unsettled physical work continues to own its concurrency slot');
 const lease=await deadline(retry.acquire(ref(f),signal()));assert.equal(lease.borrow(value=>value.ok),true);assert.equal(store.stats.parses,1);gate.resolve(f.physical);await tick();await tick();assert.equal(store.stats.parses,1);assert.equal(store.stats.leases,1);lease.release();empty(store);
});

test('an already-aborted acquire starts no I/O and creates no entry',async t=>{
 const f=fixture('{"ok":true}'),store=createFrozenDataLeaseStore([f.d]);let calls=0;const client=store.client(config(one(f),async()=>{calls++;return f.physical;}));t.after(()=>client.dispose());
 const controller=new AbortController();controller.abort();await assert.rejects(async()=>client.acquire(ref(f),controller.signal),{name:'AbortError'});assert.equal(calls,0);empty(store);
});

test('last release clears the value cell; reacquire performs a new read and a new native parse',async t=>{
 const f=fixture('{"items":[1]}'),store=createFrozenDataLeaseStore([f.d]),client=store.client(config(one(f),readFixture(f)));t.after(()=>client.dispose());
 const lease=await client.acquire(ref(f),signal());lease.borrow(value=>value.items[0]=99);lease.release();assert.equal(store.stats.valueCells,0);await tick();empty(store);assert.equal(store.stats.releasedValues,1);
 const next=await client.acquire(ref(f),signal());assert.equal(next.borrow(value=>value.items[0]),1);assert.equal(store.stats.reads,2);assert.equal(store.stats.parses,2);assert.equal(store.stats.cumulativeLogicalJSONBytes,2*f.d.bytes);next.release();await tick();empty(store);assert.equal(store.stats.releasedValues,2);
});

test('released parsed data is collectible while fulfilled acquire promises and released leases remain referenced',{skip:typeof globalThis.gc!=='function'?'Run with --expose-gc for the value-retention assertion':false},async t=>{
 const f=fixture('{"items":[1,2,3]}'),store=createFrozenDataLeaseStore([f.d]),client=store.client(config(one(f),readFixture(f)));t.after(()=>client.dispose());
 const completedAcquire=client.acquire(ref(f),signal()),lease=await completedAcquire;let weak;lease.borrow(value=>{weak=new WeakRef(value);});lease.release();assert.equal(store.stats.valueCells,0);await tick();empty(store);
 // Do not dereference weak between collections: that itself pins the target
 // for the current JavaScript job. Keep both fulfilled promise and lease alive.
 await tick();for(let attempt=0;attempt<8;attempt++){globalThis.gc();await tick();}
 assert.equal(weak.deref(),undefined,'A resolved pending promise or released lease must not retain the parsed value');assert.equal(await completedAcquire,lease);rejectsReleased(lease);
});

test('client disposal invalidates only its own ready leases and is idempotent',async t=>{
 const f=fixture('{"ok":true}'),store=createFrozenDataLeaseStore([f.d]),a=store.client(config(one(f),readFixture(f))),b=store.client(config(one(f),readFixture(f)));t.after(()=>{a.dispose();b.dispose();});
 const [first,second]=await Promise.all([a.acquire(ref(f),signal()),b.acquire(ref(f),signal())]),retained=first.retain();a.dispose();a.dispose();rejectsReleased(first);rejectsReleased(retained);assert.equal(second.borrow(value=>value.ok),true);assert.equal(store.stats.leases,1);await assert.rejects(async()=>a.acquire(ref(f),signal()));b.dispose();rejectsReleased(second);empty(store);
});

test('disposing one pending client preserves the other client and disposing the last cancels its input',async t=>{
 const f=fixture('{"ok":true}'),store=createFrozenDataLeaseStore([f.d]),gate=deferred();let inputSignal;const read=async(_p,s)=>{inputSignal=s;return gate.promise;};
 const a=store.client(config(one(f),read)),b=store.client(config(one(f),read));t.after(()=>{a.dispose();b.dispose();});
 const first=a.acquire(ref(f),signal()),second=b.acquire(ref(f),signal());await tick();a.dispose();await assert.rejects(first);assert.equal(inputSignal.aborted,false);b.dispose();await assert.rejects(second);assert.equal(inputSignal.aborted,true);gate.resolve(f.physical);await tick();empty(store);
});

for(const failure of ['size','hash'])test(`a ${failure} failure does not cache or poison the same identity's retry`,async t=>{
 const f=fixture('{"ok":true}'),store=createFrozenDataLeaseStore([f.d]);let attempts=0;
 const client=store.client(config(one(f),async()=>{if(++attempts===1)return failure==='size'?f.physical.slice(1):new Uint8Array(f.physical.length);return f.physical;}));t.after(()=>client.dispose());
 await assert.rejects(client.acquire(ref(f),signal()),new RegExp(failure==='size'?'byte|size|length':'hash','i'));await tick();empty(store);assert.equal(store.stats.parses,0);
 const lease=await deadline(client.acquire(ref(f),signal()));assert.equal(lease.borrow(value=>value.ok),true);assert.equal(attempts,2);assert.equal(store.stats.parses,1);lease.release();empty(store);
});

test('valid physical gzip bytes still require the independent declared raw SHA',async t=>{
 const compressed=fixture('{"value":1}',{gzip:true}),expected=fixture('{"value":2}'),bad={...expected,d:{...expected.d,transport:compressed.d.transport},physical:compressed.physical},store=createFrozenDataLeaseStore([bad.d]),client=store.client(config(one(bad),readFixture(bad)));t.after(()=>client.dispose());
 await assert.rejects(client.acquire(ref(bad),signal()),/hash/i);await tick();assert.equal(store.stats.parses,0);empty(store);
});

for(const [failure,payload]of [['UTF-8',new Uint8Array([0xc3,0x28])],['JSON','{"unclosed":']])test(`verified malformed ${failure} is rejected on every retry without blocking another resource`,async t=>{
 // A payload with a descriptor bound to malformed bytes cannot become valid
 // under the same SHA. Retry must re-attempt/reject, then let other work drain.
 const bad=fixture(payload),good=fixture('{"ok":true}'),store=createFrozenDataLeaseStore([bad.d,good.d]),bindings=[{f:bad,file:file('bad')},{f:good,file:file('good')}];
 const client=store.client(config(bindings,async p=>p===bad.d.path?bad.physical:good.physical));t.after(()=>client.dispose());
 for(let attempt=1;attempt<=2;attempt++){await assert.rejects(client.acquire(ref(bad,'bad'),signal()));await tick();empty(store);assert.equal(store.stats.reads,attempt);}
 const lease=await deadline(client.acquire(ref(good,'good'),signal()));assert.equal(lease.borrow(value=>value.ok),true);lease.release();empty(store);
});

test('bounded concurrent work drains every queued identity and releases every value',async t=>{
 const fixtures=Array.from({length:8},(_,index)=>fixture(JSON.stringify({index}))),store=createFrozenDataLeaseStore(fixtures.map(f=>f.d)),bindings=fixtures.map((f,index)=>({f,file:file(index)})),gates=fixtures.map(()=>deferred());let active=0,peak=0,started=0;
 const byPath=new Map(fixtures.map((f,index)=>[f.d.path,index]));const client=store.client(config(bindings,async p=>{const index=byPath.get(p);started++;active++;peak=Math.max(peak,active);try{return await gates[index].promise;}finally{active--;}}));t.after(()=>client.dispose());
 const pending=fixtures.map((f,index)=>client.acquire(ref(f,index),signal()));await tick();assert.equal(started,2);assert.equal(store.stats.active,2);assert.equal(store.stats.queued,6);
 assert.equal(store.resources.budget.stats.categories.normalize.bytes,(fixtures[0].d.bytes+fixtures[1].d.bytes)*NORMALIZE_EXPANSION,'queued identities reserve descriptors until they enter the existing two-way ingress');
 gates.forEach((gate,index)=>gate.resolve(fixtures[index].physical));const leases=await deadline(Promise.all(pending));assert.equal(peak,2);assert.equal(store.stats.active,0);assert.equal(store.stats.queued,0);assert.equal(store.stats.reads,8);assert.equal(store.stats.parses,8);assert.equal(store.stats.valueCells,8);leases.forEach((lease,index)=>{assert.equal(lease.borrow(value=>value.index),index);lease.release();});empty(store);
});

test('frozen transport admission shares backing allocation and independent single-ref roles outlive client disposal',async()=>{
 const f=fixture('{"items":[1,2,3]}'),backing=new Uint8Array(f.physical.length+48),bytes=backing.subarray(16,16+f.physical.length);bytes.set(f.physical);
 const budget=createResourceBudget(),resources=createChunkResourceStore({budget}),store=createFrozenDataLeaseStore([f.d],{resourceStore:resources});let releases=0;
 const transport=budget.reserve({category:'read',bytes:backing.byteLength,precision:'exact',identity:backing.buffer});
 const client=store.client(config(one(f),async()=>assert.fail('byte lease must take priority'),{acquireBytes:async()=>{
  assert(budget.stats.categories.normalize.bytes>0,'parse expansion was admitted before reading');return{bytes,release(){releases++;assert.equal(budget.stats.categories.read.bytes,backing.byteLength);transport.release();}};
 }}));
 const original=await client.acquire(ref(f),signal()),selected=original.retainResource('selected');assert.equal(releases,1);assert.equal(budget.stats.categories.read?.bytes??0,0);
 client.dispose();store.destroy();rejectsReleased(original);assert.equal(selected.state,'ready');assert(budget.stats.bytes>0,'single-ref role owns only this binding');
 const independent=selected.retain('picking');selected.release();assert(independent.value);independent.release();assert.equal(budget.stats.bytes,0);resources.destroy();
});

test('frozen over-budget demand does not call its reader and reentrant release keeps a borrow charged',async()=>{
 const f=fixture('{"items":[1]}'),small=createResourceBudget({limitBytes:8,recentLimitBytes:0}),bounded=createChunkResourceStore({budget:small}),refused=createFrozenDataLeaseStore([f.d],{resourceStore:bounded});let reads=0;
 await assert.rejects(refused.client(config(one(f),async()=>{reads++;return f.physical;})).acquire(ref(f),signal()),/Resource budget/);assert.equal(reads,0);assert.equal(small.stats.bytes,0);refused.destroy();bounded.destroy();
 const budget=createResourceBudget(),resources=createChunkResourceStore({budget}),store=createFrozenDataLeaseStore([f.d],{resourceStore:resources}),client=store.client(config(one(f),readFixture(f))),lease=await client.acquire(ref(f),signal());
 lease.borrow(value=>{lease.release();client.dispose();assert.equal(value.items[0],1);assert(budget.stats.bytes>0,'borrow is its own temporary dependency');});assert.equal(budget.stats.bytes,0);store.destroy();resources.destroy();
});

test('frozen scope reserves private construction and transfers one exact ref independently of material scope',async()=>{
 const geometry=fixture('{"positions":[1,2,3]}'),material=fixture('{"paint":"accepted"}'),budget=createResourceBudget(),resources=createChunkResourceStore({budget}),store=createFrozenDataLeaseStore([geometry.d,material.d],{resourceStore:resources});
 const client=store.client(config([{f:geometry,file:file('geometry')},{f:material,file:file('material')}],async path=>path===geometry.d.path?geometry.physical:material.physical)),scope=createFrozenDataScope(client),geometryRef=ref(geometry,'geometry'),materialRef=ref(material,'material'),memoKey={};
 await scope.prepare([geometryRef,materialRef],signal());const before=budget.stats.bytes;
 const prepared=scope.memo(memoKey,()=>{assert(budget.stats.categories.construction.bytes>0,'admission precedes factory');return scope.borrow(geometryRef,value=>({lookup:new Map([['row',value.positions]]),positions:new Float32Array(value.positions)}));});
 assert(prepared.lookup instanceof Map);assert(budget.stats.bytes>before);const parent=scope.retainResource(geometryRef,'dependency');
 scope.retirePrepared([geometryRef],[memoKey]);assert.equal(budget.stats.categories.construction?.bytes??0,0);assert.throws(()=>scope.borrow(geometryRef,value=>value),/not prepared/);assert.equal(scope.borrow(materialRef,value=>value.paint),'accepted');
 scope.release();client.dispose();store.destroy();assert(parent.value,'derived parent survives whole scope/client release');assert(budget.stats.bytes>0);parent.release();assert.equal(budget.stats.bytes,0);resources.destroy();
});

test('frozen composition exposes all selected binding ancestors to the page recent envelope',async()=>{
 const budget=createResourceBudget(),resources=createChunkResourceStore({budget}),f=partitionFixture(undefined,resources),lease=await f.client.acquire(f.reference,signal(),['bremen|a','bremen|b']),parent=lease.retainResource('dependency');
 const child=resources.acquire({contentKey:'frozen-composite-parent-envelope-boundary',role:'main',parents:[parent],allowRecent:true,estimate:{category:'metadata',bytes:1,precision:'estimate'},produce:()=>({boundary:true}),costs:value=>({category:'metadata',bytes:1,precision:'estimate',identity:value})});
 await child.ready;lease.release();parent.release();f.client.dispose();f.store.destroy();assert(budget.stats.bytes>0);
 child.release();assert(budget.stats.recentBytes>0);assert.equal(budget.stats.recentBytes,budget.stats.bytes,'cache ownership includes the composition and all private selected source rows');
 resources.evictRecent();assert.equal(budget.stats.bytes,0);empty(f.store);resources.destroy();
});

test('pure resource memo retires its scope claim after the named consumer while an exact external parent survives',async()=>{
 const material=fixture('{"paint":"accepted"}'),budget=createResourceBudget(),resources=createChunkResourceStore({budget}),store=createFrozenDataLeaseStore([material.d],{resourceStore:resources}),client=store.client(config(one(material),readFixture(material))),scope=createFrozenDataScope(client),key=Symbol('pure recovered source');let builds=0;
 await scope.prepare([ref(material)],signal());
 const request={contentKey:'pure-recovered-source-fixture-v1',estimate:{category:'construction',bytes:4096,precision:'estimate'},produce(){builds++;assert(budget.stats.categories.construction.bytes>=4096,'pure construction is admitted before the factory');return{record:{objectId:'synthetic-source'},recovered:{positions:new Float32Array([1,2,3])},signature:'fixture'};},costs(value){const cost=estimateRetainedBuildingPayload(value);return[{category:'decoded',bytes:value.recovered.positions.buffer.byteLength,precision:'exact',identity:value.recovered.positions.buffer},{category:'metadata',bytes:cost.estimatedJsContainerBytes,precision:'estimate',identity:value}];}};
 const value=scope.resourceMemo(key,request);assert.equal(scope.resourceMemo(key,{...request,produce:()=>assert.fail('ready pure entry must be reused')}),value);assert.equal(builds,1);
 const consumer=scope.retainPrepared([],[key]);scope.retirePrepared([],[key]);const parent=scope.retainMemoResource(key,'dependency');assert.equal(parent.context,undefined);assert.equal(parent.epoch,undefined);
 consumer();assert.throws(()=>scope.retainMemoResource(key,'main'),/unprepared/);assert.equal(scope.borrow(ref(material),value=>value.paint),'accepted');scope.release();client.dispose();store.destroy();
 assert.equal(scope.stats.disposed,true);assert.equal(parent.value,value);assert.equal(budget.stats.bytes,estimateRetainedBuildingPayload(value).retainedPayloadEstimateBytes,'only the pure entry remains; unrelated material scope has retired');
 parent.release();assert.equal(budget.stats.bytes,0);resources.destroy();
});

test('pure resource memo preserves synchronous producer causes and rejects pending production without a false ready lease',async()=>{
 const budget=createResourceBudget(),resources=createChunkResourceStore({budget}),store=createFrozenDataLeaseStore([],{resourceStore:resources}),client=store.client(config([],async()=>assert.fail('pure entry must not read a table'))),scope=createFrozenDataScope(client),cause=Error('original pure producer cause');
 assert.throws(()=>scope.resourceMemo('failed',{contentKey:'pure-failed-fixture',estimate:{category:'construction',bytes:128,precision:'estimate'},produce(){throw cause;}}),error=>error===cause);assert.equal(budget.stats.bytes,0);assert.throws(()=>scope.retainMemoResource('failed','dependency'),/unprepared/);
 const gate=deferred();assert.throws(()=>scope.resourceMemo('pending',{contentKey:'pure-pending-fixture',estimate:{category:'construction',bytes:128,precision:'estimate'},produce:()=>gate.promise}),/synchronous ready CPU production/);assert.throws(()=>scope.retainMemoResource('pending','dependency'),/unprepared/);
 gate.resolve({late:true});await tick();assert.equal(budget.stats.bytes,0);scope.release();client.dispose();store.destroy();resources.destroy();
});
