import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {adoptRuntime,page,blockerFor,network,until,deadline,settle,MiB} from './support/ingress-adopt-fixtures.mjs';
import {groupedVariant,groupedNear} from './support/ingress-adopt-groups.mjs';

// calibrate-native (2026-11-02): the native source and building detail group
// working-set coefficients, read from the real modules, and the call chain that
// applies them on the real building detail source, native pool, byte transport,
// page store and ledger. Network reads stay pending until a case settles them.
const api=await adoptRuntime();
const real=await (async()=>{
 const built=await build({stdin:{contents:["export {NATIVE_SOURCE_EXPANSION,NATIVE_SOURCE_VERTEX_BYTES} from './shared-native-source';",
  "export {DETAIL_GROUP_EXPANSION,DETAIL_VARIANT_EXPANSION} from './building-detail-source';",
  "export {BUILDING_DETAIL_GROUP_RAW_LIMIT,BUILDING_DETAIL_GROUP_WIRE_LIMIT} from './building-detail-demand';",
  "export {createResourceBudget} from './render-runtime/resource-budget';"].join('\n'),
  resolveDir:fileURLToPath(new URL('../src/safety/',import.meta.url)),sourcefile:'calnative-coefficients.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false});
 return import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n// calnative coefficients').toString('base64'));
})();
const signal=()=>new AbortController().signal;
const zero={bytes:0,exactBytes:0,estimatedBytes:0};
const category=(budget,name)=>({...(budget.stats.categories[name]??zero)});
const VERTICES=200000;

test('the calibrated coefficients: native 40 per raw byte plus 48 per capped vertex, group metadata 10, display variant unchanged at 40',()=>{
 // Values from the calibrate-native measurements (results/native-summary.json,
 // native-fix-summary.json, groups-summary.json, groups-held-summary.json):
 // native k <= 31.16 (a residual after the fixed VERTICES*48 term, for leaves
 // shaped like the 4caae82 producer's), group k <= 6.69 (substitute documents,
 // gzip), each ceil(k x 1.25 + 1).
 assert.equal(real.NATIVE_SOURCE_EXPANSION,Math.ceil(31.16*1.25+1));
 assert.equal(real.NATIVE_SOURCE_VERTEX_BYTES,12+12+6*4,'positions, normals and at most six Uint32 indices per vertex');
 assert.equal(real.DETAIL_GROUP_EXPANSION,Math.ceil(6.69*1.25+1));
 assert.equal(real.DETAIL_VARIANT_EXPANSION,40,'not recalibrated (no display-variant documents measured)');
});

test('a group metadata read admits its envelope, its inflate estimate and DETAIL_GROUP_EXPANSION per raw byte, once',async()=>{
 const resources=page(api),{budget}=resources,v=groupedVariant('calnative-groups'),net=network(),G=v.groups.byteLength;
 const bytes=api.createResourceByteTransport({namespace:'calnative-detail',resourceStore:resources.store,read:net.read});
 const source=api.createBuildingDetailSource({city:'berlin',resourceStore:resources.store,readBytes:net.read,acquireBytes:bytes.acquireBytes,
  readCanonical:async()=>assert.fail('display variants never read the canonical leaf')});
 const pending=source.acquire(v.resource,{signal:signal()});
 await until(()=>net.reads.length===1,'the variant read starts');
 net.deliver(v.resource.descriptor.path,new Uint8Array(v.physical));
 await until(()=>net.reads.length===2,'the group read starts');
 assert.equal(net.reads[1].target,v.resource.groupMetadata.path);
 const during=budget.stats.bytes;
 net.deliver(v.resource.groupMetadata.path,new Uint8Array(v.groups));
 const lease=await deadline(pending);
 const groupBytes=api.estimateRetainedBuildingPayload(lease.value.groups).estimatedJsContainerBytes;
 // Plain JSON group document: no inflate; the minted two-copy envelope 2G.
 assert.equal(during,budget.stats.bytes-groupBytes+real.DETAIL_GROUP_EXPANSION*G+2*G,'the ledger held the retained variant and exactly one group working set');
 assert.equal(source.stats.capacityWaits,0);assert.equal(source.stats.unadmittedDeliveries,0);
 lease.release();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.availabilityListeners,0);
});

// A near pass reads its canonical leaf through the native pool; once the leaf is
// handed over, a holder leaves exactly `free` bytes for the group admission.
async function nearWithFree(label,free){
 const resources=page(api),{budget}=resources,n=groupedNear('calnative-near-'+label),net=network(),G=n.groups.byteLength;
 const pool=api.createSharedNativeSourcePool({resourceStore:resources.store,read:net.read}),client=pool.client('berlin');
 let holder,armed=true;
 const source=api.createBuildingDetailSource({city:'berlin',resourceStore:resources.store,readBytes:net.read,
  readCanonical:async(asset,signal,cap)=>{const result=await client.read(asset,signal,cap);if(armed){armed=false;holder=blockerFor(budget,free(G));}return result;}});
 const pending=source.acquire(n.resource,{signal:signal()});
 await until(()=>net.reads.length===1,'the canonical read starts');
 // While the canonical leaf parses, its claim is the calibrated native working set.
 assert.equal(category(budget,'normalize').bytes,n.resource.descriptor.bytes*real.NATIVE_SOURCE_EXPANSION+VERTICES*real.NATIVE_SOURCE_VERTEX_BYTES,'native normalize claim');
 net.deliver(n.resource.descriptor.path,new Uint8Array(n.canonical));
 return{resources,budget,n,net,G,pool,source,pending,holder:()=>holder};
}
// Without a transport the group read pre-charges its two-copy envelope (2G); a
// plain document has no inflate; metadata is DETAIL_GROUP_EXPANSION per raw byte.
const groupNeed=G=>2*G+real.DETAIL_GROUP_EXPANSION*G;

test('near pass: a group read whose calibrated working set is exactly free is admitted without waiting',async()=>{
 const r=await nearWithFree('exact',groupNeed);
 await until(()=>r.net.reads.length===2,'the group read starts');
 assert.equal(r.source.stats.capacityWaits,0,'admitted at DETAIL_GROUP_EXPANSION, not at the former 40 (which needs '+(42*r.G)+' bytes)');
 r.net.deliver(r.n.resource.groupMetadata.path,new Uint8Array(r.n.groups));
 const lease=await deadline(r.pending);
 assert.equal(lease.value.groups.packingGroups.length,2);
 lease.release();r.holder().release();r.pool.destroy();r.resources.store.evictRecent();
 assert.equal(r.budget.stats.bytes,0);assert.equal(r.budget.stats.availabilityListeners,0);
});

test('near pass: one byte short of the calibrated group working set waits holding only its descriptor, then reads once',async()=>{
 const r=await nearWithFree('short',G=>groupNeed(G)-1);
 await until(()=>r.source.stats.capacityWaits===1,'the group admission is refused and waits');for(let i=0;i<6;i++)await settle();
 assert.equal(r.net.reads.length,1,'no group read was started');
 assert.equal(r.budget.stats.availabilityListeners,1,'one wake-up subscribed, no timer');
 r.holder().release();
 await until(()=>r.net.reads.length===2,'the pass starts again with the canonical read');
 r.net.deliver(r.n.resource.descriptor.path,new Uint8Array(r.n.canonical));
 await until(()=>r.net.reads.length===3,'then the group read');
 r.net.deliver(r.n.resource.groupMetadata.path,new Uint8Array(r.n.groups));
 const lease=await deadline(r.pending);
 assert.equal(lease.value.groups.packingGroups.length,2);assert.equal(r.source.stats.capacityWaits,1);
 lease.release();r.pool.destroy();r.resources.store.evictRecent();
 assert.equal(r.budget.stats.bytes,0);assert.equal(r.budget.stats.availabilityListeners,0);
});

test('the largest admissible native and group working sets fit both page profiles (1.5 GB desktop, 256 MiB mobile)',()=>{
 const desktop=real.createResourceBudget({profile:'desktop'}).stats.limitBytes,mobile=real.createResourceBudget({profile:'mobile'}).stats.limitBytes;
 assert.equal(desktop,1_500_000_000);assert.equal(mobile,256*MiB);
 // Ledger arithmetic: the most the page can be asked to admit per read under the
 // validation caps. It is not a physical guarantee for a leaf or document denser
 // or larger than the measured ones (the coefficients are calibrated on 4caae82
 // leaves and substitute group documents).
 // Native: transport and raw are each at most 1 MiB (validate); two-copy envelope, inflate, normalize.
 const native=2*MiB+MiB+MiB*real.NATIVE_SOURCE_EXPANSION+VERTICES*real.NATIVE_SOURCE_VERTEX_BYTES;
 // Group metadata: wire <= 500000, raw <= 8 MiB; two-copy envelope, inflate estimate 2d+P, metadata.
 const W=real.BUILDING_DETAIL_GROUP_WIRE_LIMIT,R=real.BUILDING_DETAIL_GROUP_RAW_LIMIT,group=2*W+2*R+W+R*real.DETAIL_GROUP_EXPANSION;
 assert.ok(native<=mobile,'native '+native);assert.ok(group<=mobile,'group '+group);
 assert.ok(2*W+2*R+W+R*40>mobile,'at the former 40 a group document at the raw limit could not fit a mobile page');
});
