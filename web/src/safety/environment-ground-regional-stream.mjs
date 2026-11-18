/** Bounded metadata traversal for staged regional coverage composition.
 * No model/leaf read, rendering, publication, timer or residency-budget change.
 * The injected reader verifies actual wire/raw bytes and owns its resource
 * claims. Each result MUST include release(); it must release reader caches as
 * well as its admitted claims. next()/return() acknowledges the previous item:
 * downstream must first retire its only GPU chunk and drop its metadata refs.
 * An early return/error/cancel never supplies a closed receipt.
 *
 * Root inspection is the frozen browser-v2 implementation. The private page /
 * cohort validators below preserve its exact schema, asset and cost checks;
 * this separate API changes traversal/lease lifetime, not the strict selector.
 */
import {inspectRegionalGroundManifest,REGIONAL_GROUND_LIMITS} from './environment-ground-regional.mjs';
export {REGIONAL_GROUND_LIMITS};
const SHA=/^[a-f0-9]{64}$/, ID=/^[A-Za-z0-9:._-]{1,256}$/;
const SOURCE_ID=/^osm\/(node|way|relation)\/[1-9]\d*$/;
const assetFields=['path','sha256','bytes','compression','uncompressed_bytes','uncompressed_sha256'];
function invalid(message){throw Error('Invalid regional green metadata: '+message);}
function record(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
function integer(v,min=0,max=Number.MAX_SAFE_INTEGER){return Number.isSafeInteger(v)&&v>=min&&v<=max;}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function checkpoint(signal){signal?.throwIfAborted();}
function hash(v){return typeof v==='string'&&SHA.test(v);}
function bbox(v){return Array.isArray(v)&&v.length===4&&v.every(Number.isFinite)&&v[0]>=-180&&v[2]<=180&&v[1]>=-85&&v[3]<=85&&v[0]<=v[2]&&v[1]<=v[3];}
function copyBox(v){if(!bbox(v))invalid('bbox');return Object.freeze([...v]);}
function intersects(a,b){return a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];}
function union(boxes){return [Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))];}
function rawBytes(asset){return asset.uncompressed_bytes??asset.bytes;}
function asset(v,city){
  if(!record(v)||typeof v.path!=='string'||!v.path.startsWith('/safety/environment/'+city+'/')||
     /[\\%?#\0]/.test(v.path)||v.path.split('/').some((p,i)=>i>0&&(!p||p==='.'||p==='..'))||
     !hash(v.sha256)||!integer(v.bytes,1,REGIONAL_GROUND_LIMITS.metadataAssetBytes))invalid('asset identity/path/size');
  if(v.compression!==undefined&&v.compression!=='gzip')invalid('asset compression');
  if(v.compression==='gzip'){
    if(!integer(v.uncompressed_bytes,1,REGIONAL_GROUND_LIMITS.metadataAssetBytes)||!hash(v.uncompressed_sha256))invalid('gzip raw identity');
  }else if(v.uncompressed_bytes!==undefined||v.uncompressed_sha256!==undefined){
    if(v.uncompressed_bytes!==v.bytes||v.uncompressed_sha256!==v.sha256)invalid('uncompressed asset identity');
  }
  return Object.freeze(Object.fromEntries(assetFields.filter(k=>v[k]!==undefined).map(k=>[k,v[k]])));
}
function sameAsset(a,b){return assetFields.every(k=>a[k]===b[k]);}
function source(v,expected,schema){
  if(!record(v)||v.schema!==schema||v.schema_version!==1||v.city!==expected.city||
     v.source_pbf_sha256!==expected.source_pbf_sha256||v.source_snapshot!==expected.source_snapshot||
     v.source_boundary_sha256!==expected.source_boundary_sha256)invalid('city/source/boundary/snapshot binding');
}
function sourceBinding(v){
  if(!record(v)||typeof v.city!=='string'||!/^[a-z][a-z0-9-]*$/.test(v.city)||
     !hash(v.source_pbf_sha256)||!hash(v.source_boundary_sha256)||typeof v.source_snapshot!=='string'||
     !v.source_snapshot||v.source_snapshot.length>128)invalid('expected source binding');
  return Object.freeze({city:v.city,source_pbf_sha256:v.source_pbf_sha256,
    source_snapshot:v.source_snapshot,source_boundary_sha256:v.source_boundary_sha256});
}

function header(value,city){
  if(!record(value)||typeof value.id!=='string'||!ID.test(value.id)||!integer(value.feature_count,1,10000)||
     !integer(value.vertices,3,REGIONAL_GROUND_LIMITS.vertices)||!integer(value.index_count,3,REGIONAL_GROUND_LIMITS.indices)||value.index_count%3||
     !integer(value.raw_bytes,1,REGIONAL_GROUND_LIMITS.rawBytes)||!integer(value.leaves,1,REGIONAL_GROUND_LIMITS.leaves))invalid('cohort header/counts');
  return Object.freeze({id:value.id,bbox:copyBox(value.bbox),feature_count:value.feature_count,vertices:value.vertices,
    index_count:value.index_count,raw_bytes:value.raw_bytes,leaves:value.leaves,metadata:asset(value.metadata,city)});
}
function page(value,descriptor,root,signal){
  source(value,root.binding,'environment-ground-regional-page-v1');
  if(!Array.isArray(value.cohorts)||!value.cohorts.length||value.cohorts.length>10000)invalid('page cohorts');
  const ids=new Set(),paths=new Set();
  const result=value.cohorts.map(v=>{
    checkpoint(signal);const h=header(v,root.binding.city);
    if(ids.has(h.id)||paths.has(h.metadata.path))invalid('duplicate cohort id/metadata');ids.add(h.id);paths.add(h.metadata.path);return h;
  });
  if(!same(union(result.map(h=>h.bbox)),descriptor.bbox))invalid('page bbox does not cover its exact cohort union');
  return result;
}
function cohort(value,h,root){
  source(value,root.binding,'environment-ground-regional-cohort-v1');
  const c=value.counts;
  if(value.id!==h.id||!bbox(value.bbox)||!same(value.bbox,h.bbox)||!record(c)||c.features!==h.feature_count||
     c.vertices!==h.vertices||c.indices!==h.index_count||c.rawBytes!==h.raw_bytes||c.leaves!==h.leaves||
     !Array.isArray(value.source_feature_ids)||value.source_feature_ids.length!==h.feature_count||
     value.source_feature_ids.some(id=>typeof id!=='string'||!SOURCE_ID.test(id))||
     new Set(value.source_feature_ids).size!==value.source_feature_ids.length)invalid('cohort source IDs/counts/header');
  const ids=Object.freeze([...value.source_feature_ids]);
  if(!Array.isArray(value.canonical_ground_tiles)||!value.canonical_ground_tiles.length||value.canonical_ground_tiles.length>32)invalid('canonical cohort closure');
  const paths=new Set();let features=0;
  const canonical=value.canonical_ground_tiles.map(v=>{
    const a=asset(v,root.binding.city);
    if(paths.has(a.path)||typeof v.id!=='string'||!v.id||typeof v.tile_key!=='string'||!v.tile_key||!bbox(v.bbox)||
       !integer(v.feature_count,1,h.feature_count)||!record(v.kinds)||v.kinds.green!==v.feature_count||
       Object.keys(v.kinds).some(k=>k!=='green'&&v.kinds[k]!==0))invalid('canonical green tile identity');
    paths.add(a.path);features+=v.feature_count;
    return Object.freeze({...a,id:v.id,tile_key:v.tile_key,bbox:copyBox(v.bbox),feature_count:v.feature_count,kinds:Object.freeze({green:v.feature_count})});
  });
  const packed=value.ground_far_mesh===undefined?undefined:asset(value.ground_far_mesh,root.binding.city);
  if(packed&&paths.has(packed.path))invalid('canonical/packed asset collision');
  const assets=packed?[...canonical,packed]:canonical;
  if(features!==h.feature_count||assets.length!==h.leaves||assets.reduce((n,a)=>n+rawBytes(a),0)!==h.raw_bytes)invalid('canonical/packed cost closure');
  if(!same(union(canonical.map(a=>a.bbox)),h.bbox))invalid('canonical tile bbox union differs from actual cohort bbox');
  const provenance=asset(value.provenance,root.binding.city);
  if(value.source_feature_bindings_sha256!==provenance.sha256||paths.has(provenance.path)||packed?.path===provenance.path)invalid('source occurrence provenance binding');
  return Object.freeze({...h,source_feature_ids:ids,canonical_ground_tiles:Object.freeze(canonical),
    ...(packed?{ground_far_mesh:packed}:{}),provenance,source_feature_bindings_sha256:provenance.sha256});
}

const addTotals=(a,h)=>{a.vertices+=h.vertices;a.indices+=h.index_count;a.rawBytes+=h.raw_bytes;a.leaves+=h.leaves;a.features+=h.feature_count;};
const emptyTotals=()=>({vertices:0,indices:0,rawBytes:0,leaves:0,features:0});
function abortError(signal){return signal?.reason??new DOMException('Regional traversal cancelled','AbortError');}

// Charge conservative decoded-payload bytes for every retained metadata lease.
// The admitted reader separately charges parser/JS allocations; these counters
// are policy accounting, not heap measurements. Cumulative transfer has no cap.
function leases(readMetadata,signal){
  const live=new Set();let docs=0,bytes=0,peakDocs=0,peakBytes=0,reads=0,transferred=0;
  let closed=false;
  async function acquire(a,city){
    checkpoint(signal);if(closed)throw abortError(signal);
    const checked=asset(a,city),n=rawBytes(checked);
    if(docs+1>REGIONAL_GROUND_LIMITS.pages||bytes+n>REGIONAL_GROUND_LIMITS.metadataBytes)
      invalid('active metadata lease budget');
    docs++;bytes+=n;peakDocs=Math.max(peakDocs,docs);peakBytes=Math.max(peakBytes,bytes);
    let releasing,readerResult;
    const lease={value:undefined,identity:checked,release(){
      if(releasing)return releasing;
      lease.value=undefined;
      return releasing=(async()=>{try{if(readerResult)await readerResult.release();}
        finally{live.delete(lease);docs--;bytes-=n;readerResult=undefined;}})();
    }};
    live.add(lease);
    let removeAbort=()=>{},cancelled=false;
    const pending=Promise.resolve().then(()=>readMetadata(checked,signal));
    const aborted=new Promise((_,reject)=>{
      if(!signal)return;
      const onAbort=()=>{cancelled=true;reject(abortError(signal));};
      if(signal.aborted)onAbort();else{signal.addEventListener('abort',onAbort,{once:true});removeAbort=()=>signal.removeEventListener('abort',onAbort);}
    });
    try{
      const result=await Promise.race([pending,aborted]);checkpoint(signal);
      if(!result)invalid('required metadata unavailable: '+checked.path);
      // Release is required even when the value or identity fails validation.
      if(typeof result.release!=='function')invalid('reader result requires release hook');
      readerResult=result;
      if(!record(result)||!sameAsset(asset(result.identity,city),checked))invalid('actual metadata identity mismatch');
      lease.value=result.value;reads++;transferred+=n;return lease;
    }catch(error){
      if((cancelled||signal?.aborted)&&!readerResult){
        // Readers must honour AbortSignal. Even a late noncompliant success is
        // released exactly once and is never used as traversal evidence.
        void pending.then(async result=>{if(result&&typeof result.release==='function')await result.release();},()=>{}).catch(()=>{});
      }
      await lease.release();throw error;
    }finally{removeAbort();}
  }
  return {acquire,async close(){closed=true;await Promise.all([...live].map(v=>v.release()));},
    stats(){return {metadataReads:reads,metadataTransferredBytes:transferred,peakActiveMetadataDocs:peakDocs,peakActiveMetadataBytes:peakBytes,activeMetadataDocs:docs,activeMetadataBytes:bytes};}};
}

// Same canonical JSON contract as groundOverviewJSON, including -0. The
// catalog is <=1MiB metadata, never source-feature/geometry payloads.
function canonical(value){
  if(value===null)return 'null';
  if(typeof value==='number'){if(!Number.isFinite(value))invalid('nonfinite canonical JSON');return Object.is(value,-0)?'-0':String(value);}
  if(typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(record(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  invalid('non-JSON canonical value');
}
async function digest(value){
  const raw=new TextEncoder().encode(canonical(value));
  const result=await globalThis.crypto.subtle.digest('SHA-256',raw);
  return [...new Uint8Array(result)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
const catalogFields=['schema','schema_version','city','source_pbf_sha256','source_snapshot','source_boundary_sha256',
  'city_boundary','source_index','discovery','status','discovery_complete','cohort_catalog_complete','catalog_closed',
  'source_coverage_complete','counts','pages','held_pages'];
async function partitionProof(value,proofAsset,root,rootValue,expected,signal){
  source(value,root.binding,'environment-ground-source-partition-proof-v1');
  if(!sameAsset(asset(value.source_index,root.binding.city),root.source_index)||
    canonical(value.discovery)!==canonical(root.discovery)||canonical(value.counts)!==canonical(rootValue.counts))invalid('source partition discovery/count/index conflict');
  if(!hash(expected.regional_implementation_sha256)||!hash(expected.exact_geometry_producer_sha256)||
    value.regional_implementation_sha256!==expected.regional_implementation_sha256||
    value.exact_geometry_producer_sha256!==expected.exact_geometry_producer_sha256)invalid('source partition implementation identity');
  const c=value.catalog_digest,m=value.membership;
  if(!record(c)||c.algorithm!=='ground-overview-canonical-json-v1/sha256'||!hash(c.sha256)||
    !record(m)||m.algorithm!=='sha256/ground-overview-canonical-json-lines-v1'||
    m.order!=='features.id SQLite BINARY ascending'||m.rows!==root.counts.uniqueGreen||
    m.representedRows!==root.counts.representedGreen||!hash(m.sha256))invalid('source partition membership/count proof');
  const projection=Object.fromEntries(catalogFields.map(k=>[k,rootValue[k]]));
  if(await digest(projection)!==c.sha256)invalid('source partition catalog digest conflict');
  checkpoint(signal);
  // The verified producer exporter streams SQLite PK membership, verifies the
  // metadata-ID -> exact cohort assignment bijection and publishes its digest.
  // Runtime pins that real proof; it does NOT independently rescan source IDs.
  return Object.freeze({proofSHA256:proofAsset.sha256,regional_implementation_sha256:value.regional_implementation_sha256,
    exact_geometry_producer_sha256:value.exact_geometry_producer_sha256,
    catalog_digest:Object.freeze({...c}),membership:Object.freeze({...m}),
    authority:'verified-producer-terminal-sqlite-membership',runtimeMembershipRescanned:false});
}

/**
 * readMetadata(asset, signal) => {value, identity: ACTUALLY verified Asset,
 *                               release: () => void | Promise<void>}
 *
 * Returns a real async iterator. A yielded item keeps only root + current page
 * + current cohort metadata live (<=16 docs / 2MiB total, each <=1MiB).
 * Consumer next()/return() is the ACK; it may be called only after downstream
 * has retired its single GPU chunk and released decoded geometry. No aggregate
 * viewport geometry cap is applied; EACH cohort retains 20k/60k/32/4MiB.
 *
 * rootAsset is the current verified manifest identity. expected also supplies
 * the PUBLIC source-partition proof Asset / actual regional implementation pin.
 * Only done.value.closed can authorize a downstream staged coverage commit.
 */
export function streamRegionalGroundCohorts(rootAsset,expected,viewport,{readMetadata,signal}={}){
  if(!bbox(viewport)||typeof readMetadata!=='function')invalid('viewport/verified releasing reader');
  const ownViewport=Object.freeze([...viewport]),scope=leases(readMetadata,signal);
  let finished=false,returning;
  async function* walk(){
    let rootLease,proofLease,pageLease,cohortLease,rootValue,root;
    const totals=emptyTotals();let sequence=0,catalogCohorts=0,catalogFeatures=0,selectedPages=0,lastId;
    try{
      checkpoint(signal);
      const binding=sourceBinding(expected),manifest=asset(rootAsset,binding.city);
      rootLease=await scope.acquire(manifest,binding.city);rootValue=rootLease.value;
      root=inspectRegionalGroundManifest(rootValue,expected,{signal});
      const held=!root.sourceCoverageComplete;
      if(held&&(!root.catalogClosed||!root.discoveryComplete||!root.cohortCatalogComplete||
        root.counts.processedDescriptors!==root.counts.inputDescriptors||root.counts.pendingGreen||root.counts.heldDescriptors||
        !root.counts.heldGreen||!root.representedCountDeclared||!root.heldPages.length))invalid('source catalog not closed');
      const proofAsset=asset(rootValue.source_partition_proof,binding.city);
      if(!expected.source_partition_proof||!sameAsset(proofAsset,asset(expected.source_partition_proof,binding.city)))invalid('source partition proof Asset differs');
      proofLease=await scope.acquire(proofAsset,binding.city);
      const proof=await partitionProof(proofLease.value,proofAsset,root,rootValue,expected,signal);
      await proofLease.release();proofLease=undefined;
      for(const descriptor of root.pages){
        checkpoint(signal);if(!intersects(descriptor.bbox,ownViewport))continue;
        selectedPages++;
        pageLease=await scope.acquire(descriptor.asset,binding.city);
        const headers=page(pageLease.value,descriptor,root,signal);
        for(const h of headers){
          checkpoint(signal);
          // Producer catalog SQL ORDER BY id gives a constant-space duplicate
          // witness across page boundaries. Never sort a received page.
          if(lastId!==undefined&&h.id<=lastId)invalid('duplicate or unordered cohort id across pages');lastId=h.id;
          catalogCohorts++;catalogFeatures+=h.feature_count;
          if(catalogCohorts>root.counts.cohorts||catalogFeatures>root.counts.representedGreen)invalid('page/root represented counts');
          if(!intersects(h.bbox,ownViewport))continue;
          cohortLease=await scope.acquire(h.metadata,binding.city);
          let checked=cohort(cohortLease.value,h,root);
          if(checked.source_feature_ids.some((id,i,ids)=>i>0&&ids[i-1]>=id))invalid('source IDs not in original strict ASCII order');
          addTotals(totals,h);
          yield Object.freeze({kind:'cohort',sequence:sequence++,pageId:descriptor.id,rootSHA256:manifest.sha256,
            sourcePartitionProofSHA256:proofAsset.sha256,binding:root.binding,cohort:checked});
          checked=undefined;
          await cohortLease.release();cohortLease=undefined;
        }
        await pageLease.release();pageLease=undefined;
      }
      checkpoint(signal);
      if(selectedPages===root.pages.length&&(catalogCohorts!==root.counts.cohorts||catalogFeatures!==root.counts.representedGreen))invalid('complete catalog count closure');
      return Object.freeze({schema:'F-regional-ground-stream-closure-v1',closed:true,
        status:held?'partial-source-held':'complete',coverageComplete:!held,sourceCoverageComplete:!held,
        root:manifest,sourcePartitionProof:proofAsset,sourcePartition:proof,binding:root.binding,viewport:ownViewport,
        chunkCount:sequence,totals:Object.freeze({...totals}),selectedPages,sourceHeldGreen:root.counts.heldGreen,
        representedSourceGreen:root.counts.representedGreen,
        heldCountScope:'global-pinned-catalog; viewport-held-membership-not-read',
        geometryDecoded:false,fullCityOverviewRenderingAccepted:false,
        ...scope.stats(),activeMetadataDocs:0,activeMetadataBytes:0});
    }finally{
      rootValue=undefined;root=undefined;
      try{await scope.close();}finally{finished=true;signal?.removeEventListener('abort',onAbort);}
    }
  }
  const inner=walk();
  function onAbort(){if(!finished&&!returning)returning=inner.return().catch(()=>{});}
  signal?.addEventListener('abort',onAbort,{once:true});
  return {
    [Symbol.asyncIterator](){return this;},
    async next(){checkpoint(signal);return inner.next();},
    async return(){
      // Ignore a caller-supplied return value: no early cancellation can create
      // a helper-authored closed receipt. Await reader releases in finally.
      try{return await inner.return();}finally{await scope.close();finished=true;signal?.removeEventListener('abort',onAbort);}
    },
    async throw(error){try{return await inner.throw(error);}finally{await scope.close();}},
  };
}
